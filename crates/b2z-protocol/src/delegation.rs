//! Versioned application authorization, never a Ledger allowance or transfer API.
use sha2::{Digest, Sha224};
pub const ADAPTER_VERSION: u8 = 5;
pub const MAX_MEMO: usize = 32;
pub const LIFETIME_NS: u64 = 604_800_000_000_000;
pub const MAGIC: &[u8; 8] = b"B2ZPAY05";
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum AuthorizationMemo {
    Grant(Vec<u8>),
    Revoke,
}
fn spender_ok(p: &[u8]) -> bool {
    p.len() == 29 && p[28] == 2
}
pub fn encode_authorization(m: &AuthorizationMemo) -> Result<Vec<u8>, String> {
    let mut b = vec![0xb2, 0xd1];
    match m {
        AuthorizationMemo::Grant(p) => {
            if !spender_ok(p) {
                return Err("AUTH_PRINCIPAL".into());
            }
            b.push(p.len() as u8);
            b.extend(p);
        }
        AuthorizationMemo::Revoke => b.push(0x80),
    };
    Ok(b)
}
pub fn decode_authorization(b: &[u8]) -> Result<Option<AuthorizationMemo>, String> {
    if b.first() != Some(&0xb2) {
        return Ok(None);
    }
    if b.len() < 3 || b[1] != 0xd1 {
        return Err("AUTH_MEMO_VERSION".into());
    }
    if b[2] == 0x80 {
        return if b.len() == 3 {
            Ok(Some(AuthorizationMemo::Revoke))
        } else {
            Err("AUTH_MEMO_LENGTH".into())
        };
    }
    if b.len() != 32 || b[2] != 29 || !spender_ok(&b[3..]) {
        return Err("AUTH_MEMO_LENGTH".into());
    }
    Ok(Some(AuthorizationMemo::Grant(b[3..].to_vec())))
}
pub fn crc32(b: &[u8]) -> u32 {
    let mut c = !0u32;
    for v in b {
        c ^= u32::from(*v);
        for _ in 0..8 {
            c = (c >> 1) ^ if c & 1 != 0 { 0xedb88320 } else { 0 };
        }
    }
    !c
}
pub fn account_id(owner: &[u8], subaccount: &[u8; 32]) -> Result<[u8; 32], String> {
    if owner.len() > 29 {
        return Err("ACCOUNT_PRINCIPAL".into());
    }
    let mut h = Sha224::new();
    h.update(b"\x0Aaccount-id");
    h.update(owner);
    h.update(subaccount);
    let hash = h.finalize();
    let mut out = [0; 32];
    out[..4].copy_from_slice(&crc32(&hash).to_be_bytes());
    out[4..].copy_from_slice(&hash);
    Ok(out)
}
pub fn account_ok(a: &[u8; 32]) -> bool {
    a[..4] == crc32(&a[4..]).to_be_bytes()
}
/// All immutable transfer fields are retained; flags make missing/present explicit.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Payment {
    pub from: [u8; 32],
    pub spender: Option<[u8; 32]>,
    pub to: [u8; 32],
    pub amount: u64,
    pub fee: u64,
    pub position: u64,
    pub ledger_time_ns: u64,
    pub created_at_ns: Option<u64>,
    pub legacy_memo: u64,
    pub memo: Option<Vec<u8>>,
    pub raw_digest: [u8; 32],
}
impl Payment {
    pub fn encode(&self) -> Result<Vec<u8>, String> {
        if !account_ok(&self.from)
            || !account_ok(&self.to)
            || self.spender.as_ref().is_some_and(|s| !account_ok(s))
            || self.memo.as_ref().is_some_and(|m| m.len() > MAX_MEMO)
        {
            return Err("AUTH_PAYMENT_FIELDS".into());
        }
        let mut b = MAGIC.to_vec();
        b.push(
            u8::from(self.spender.is_some())
                | u8::from(self.memo.is_some()) << 1
                | u8::from(self.created_at_ns.is_some()) << 2,
        );
        b.extend(self.from);
        b.extend(self.spender.unwrap_or([0; 32]));
        b.extend(self.to);
        for n in [
            self.amount,
            self.fee,
            self.position,
            self.ledger_time_ns,
            self.created_at_ns.unwrap_or(0),
            self.legacy_memo,
        ] {
            b.extend(n.to_be_bytes());
        }
        let memo = self.memo.as_deref().unwrap_or(&[]);
        b.push(memo.len() as u8);
        b.extend(memo);
        b.extend(self.raw_digest);
        Ok(b)
    }
    pub fn decode(b: &[u8]) -> Result<Self, String> {
        if b.len() < 186 || b.len() > 218 || &b[..8] != MAGIC || b[8] & !7 != 0 {
            return Err("AUTH_PAYMENT_ENVELOPE".into());
        }
        let flags = b[8];
        let arr =
            |i| <[u8; 32]>::try_from(&b[i..i + 32]).map_err(|_| "AUTH_PAYMENT_ARRAY".to_string());
        let n = |i| u64::from_be_bytes(b[i..i + 8].try_into().unwrap());
        let len = usize::from(b[153]);
        if b.len() != 186 + len
            || len > MAX_MEMO
            || flags & 1 == 0 && b[41..73] != [0; 32]
            || flags & 2 == 0 && len != 0
            || flags & 4 == 0 && n(137) != 0
        {
            return Err("AUTH_PAYMENT_CANONICAL".into());
        }
        let p = Self {
            from: arr(9)?,
            spender: if flags & 1 != 0 { Some(arr(41)?) } else { None },
            to: arr(73)?,
            amount: n(105),
            fee: n(113),
            position: n(121),
            ledger_time_ns: n(129),
            created_at_ns: if flags & 4 != 0 { Some(n(137)) } else { None },
            legacy_memo: n(145),
            memo: if flags & 2 != 0 {
                Some(b[154..154 + len].to_vec())
            } else {
                None
            },
            raw_digest: arr(154 + len)?,
        };
        if p.encode()? != b {
            return Err("AUTH_PAYMENT_CANONICAL".into());
        }
        Ok(p)
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn grant_and_revoke_are_domain_separated_and_bounded() {
        let mut p = vec![7; 29];
        p[28] = 2;
        let m = AuthorizationMemo::Grant(p);
        let b = encode_authorization(&m).unwrap();
        assert_eq!(b.len(), 32);
        assert_eq!(decode_authorization(&b).unwrap(), Some(m));
        assert_eq!(
            decode_authorization(&[0xb2, 0xd1, 0x80]).unwrap(),
            Some(AuthorizationMemo::Revoke)
        );
        for bad in [
            vec![0xb2],
            vec![0xb2, 0xd2, 0x80],
            vec![0xb2, 0xd1, 0x80, 0],
        ] {
            assert!(decode_authorization(&bad).is_err());
        }
        assert_eq!(decode_authorization(b"FIRE 1 0 1").unwrap(), None);
    }
    #[test]
    fn envelope_roundtrip_is_exact_and_flags_cannot_hide_spender() {
        let a = account_id(&[1; 29], &[0; 32]).unwrap();
        let p = Payment {
            from: a,
            to: a,
            spender: Some(a),
            amount: 1,
            fee: 10000,
            position: 9,
            ledger_time_ns: 100,
            created_at_ns: Some(99),
            legacy_memo: 0,
            memo: Some(b"FIRE 1 0 1".to_vec()),
            raw_digest: [3; 32],
        };
        let mut b = p.encode().unwrap();
        assert_eq!(Payment::decode(&b).unwrap(), p);
        b[8] &= !1;
        assert!(Payment::decode(&b).is_err());
    }
}
