//! ICP account-index adapter v1. Trusts the configured index for account history
//! contents AND completeness. No global-ledger scanning or archive traversal.
use candid::{CandidType, Deserialize, Nat, Principal};
use dtr_host::Input;
use dtr_wire::{hash, hex, unhex, Int, Result};
use ic_ledger_types::{AccountIdentifier, Subaccount};
use serde::Serialize;

const INVALID_MEMO: [u8; 8] = [0; 8];
pub const PAGE: u64 = 64;
pub const MAX_PENDING: usize = 256;
pub const FALLBACK_SECONDS: u64 = 60;
pub const INDEX_ID: &str = "qhbym-qaaaa-aaaaa-aaafq-cai";
pub const LEDGER_ID: &str = "ryjl3-tyaaa-aaaaa-aaaba-cai";

#[derive(Clone, CandidType, Deserialize)]
pub enum StartingPolicy {
    FromBeginning,
}
#[derive(Clone, CandidType, Deserialize)]
pub struct IndexConfig {
    pub network: String,
    pub ledger: Principal,
    pub index: Principal,
    pub receiving_subaccount: u64,
    pub event_horizon: Option<Principal>,
    /// Explicitly process existing history too; never silently skip a funded account.
    pub starting_policy: StartingPolicy,
}
// Private durable counters/positions are decimal strings, so every nat64 value
// survives the canonical JSON codec's safe-number restriction without rounding.
mod u64_string {
    pub fn serialize<S: serde::Serializer>(
        value: &u64,
        serializer: S,
    ) -> std::result::Result<S::Ok, S::Error> {
        serializer.serialize_str(&value.to_string())
    }
    pub fn deserialize<'de, D: serde::Deserializer<'de>>(
        deserializer: D,
    ) -> std::result::Result<u64, D::Error> {
        let text = <String as serde::Deserialize>::deserialize(deserializer)?;
        let value = text.parse::<u64>().map_err(serde::de::Error::custom)?;
        if value.to_string() != text {
            return Err(serde::de::Error::custom("noncanonical durable u64"));
        }
        Ok(value)
    }
}
#[derive(Clone, Debug, Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Row {
    #[serde(with = "u64_string")]
    pub id: u64,
    pub payload: Option<String>,
    pub digest: String,
}
#[derive(Clone, Debug, Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Pending {
    #[serde(with = "u64_string")]
    pub high: u64,
    #[serde(with = "u64_string")]
    pub oldest: u64,
    #[serde(with = "u64_string")]
    pub before: u64,
    pub complete: bool,
    pub rows: Vec<Row>, // descending until atomically admitted oldest first
}
#[derive(Clone, Debug, Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SourceState {
    pub network: String,
    pub ledger: String,
    pub index: String,
    #[serde(with = "u64_string")]
    pub receiving_subaccount: u64,
    pub recipient_hex: String,
    pub event_horizon: Option<String>,
    #[serde(with = "u64_string")]
    pub cursor: u64, // exclusive admitted global transaction position, never index tip
    pub binding_checked: bool,
    pub pending: Option<Pending>,
    #[serde(with = "u64_string")]
    pub nonce: u64,
    pub in_flight: bool,
    #[serde(with = "u64_string")]
    pub started_at: u64,
    pub requested: bool,
    pub wake_scheduled: bool,
    #[serde(with = "u64_string")]
    pub retry_until: u64,
    #[serde(with = "u64_string")]
    pub index_calls: u64,
    pub last_error: Option<String>,
}
#[derive(Clone, CandidType, Deserialize)]
pub struct SourceStatus {
    pub network: String,
    pub ledger: Principal,
    pub index: Principal,
    pub recipient_account: Vec<u8>,
    pub receiving_subaccount: u64,
    pub event_horizon: Option<Principal>,
    pub admitted_to_exclusive: u64,
    pub binding_checked: bool,
    pub pending_records: u32,
    pub scan_in_flight: bool,
    pub reconciliation_requested: bool,
    pub index_calls: u64,
    pub last_error: Option<String>,
}
pub fn receiving_account(owner: Principal, n: u64) -> AccountIdentifier {
    let mut bytes = [0; 32];
    bytes[24..].copy_from_slice(&n.to_be_bytes());
    AccountIdentifier::new(&owner, &Subaccount(bytes))
}
pub fn identity_bytes(
    network: &str,
    ledger: Principal,
    index: Principal,
    owner: Principal,
    subaccount: u64,
    recipient: &str,
) -> Result<Vec<u8>> {
    candid::encode_args((
        "BTZ-ICP-INDEX-01",
        network,
        ledger,
        index,
        owner,
        subaccount,
        recipient,
    ))
    .map_err(|e| e.to_string())
}
impl SourceState {
    pub fn configured(config: IndexConfig, owner: Principal) -> Result<(Self, String)> {
        if !matches!(config.network.as_str(), "ic" | "pocketic-local")
            || config.index == Principal::anonymous()
            || config.ledger == Principal::anonymous()
            || config.event_horizon == Some(Principal::anonymous())
        {
            return Err("index configuration".into());
        }
        if config.network == "ic"
            && (config.index.to_text() != INDEX_ID || config.ledger.to_text() != LEDGER_ID)
        {
            return Err("mainnet requires reviewed official ICP ledger and index".into());
        }
        let recipient = receiving_account(owner, config.receiving_subaccount);
        let identity = identity_bytes(
            &config.network,
            config.ledger,
            config.index,
            owner,
            config.receiving_subaccount,
            &recipient.to_string(),
        )?;
        Ok((
            Self {
                network: config.network,
                ledger: config.ledger.to_text(),
                index: config.index.to_text(),
                receiving_subaccount: config.receiving_subaccount,
                recipient_hex: recipient.to_string(),
                event_horizon: config.event_horizon.map(|p| p.to_text()),
                cursor: 0,
                binding_checked: false,
                pending: None,
                nonce: 0,
                in_flight: false,
                started_at: 0,
                requested: true,
                wake_scheduled: false,
                retry_until: 0,
                index_calls: 0,
                last_error: None,
            },
            hash(&identity),
        ))
    }
    pub fn validate(&self) -> Result<()> {
        if !matches!(self.network.as_str(), "ic" | "pocketic-local") {
            return Err("source network".into());
        }
        for p in [&self.ledger, &self.index] {
            if Principal::from_text(p).map_err(|e| e.to_string())? == Principal::anonymous() {
                return Err("source principal".into());
            }
        }
        account(&self.recipient_hex)?;
        if let Some(p) = &self.event_horizon {
            Principal::from_text(p).map_err(|e| e.to_string())?;
        }
        if let Some(p) = &self.pending {
            if p.rows.is_empty()
                || p.rows.len() > MAX_PENDING
                || p.high != p.rows[0].id
                || p.before != p.rows.last().unwrap().id
                || p.oldest > p.before
                || p.before < self.cursor
            {
                return Err("pending range bounds".into());
            }
            let mut prior = None;
            for row in &p.rows {
                if prior.is_some_and(|id| row.id >= id) || row.id < self.cursor {
                    return Err("pending order".into());
                }
                prior = Some(row.id);
                unhex(&row.digest)?;
            }
        }
        Ok(())
    }
    pub fn status(&self) -> Result<SourceStatus> {
        Ok(SourceStatus {
            network: self.network.clone(),
            ledger: Principal::from_text(&self.ledger).map_err(|e| e.to_string())?,
            index: Principal::from_text(&self.index).map_err(|e| e.to_string())?,
            recipient_account: account(&self.recipient_hex)?.as_bytes().to_vec(),
            receiving_subaccount: self.receiving_subaccount,
            event_horizon: self
                .event_horizon
                .as_ref()
                .map(Principal::from_text)
                .transpose()
                .map_err(|e| e.to_string())?,
            admitted_to_exclusive: self.cursor,
            binding_checked: self.binding_checked,
            pending_records: self.pending.as_ref().map_or(0, |p| p.rows.len() as u32),
            scan_in_flight: self.in_flight,
            reconciliation_requested: self.requested || self.wake_scheduled,
            index_calls: self.index_calls,
            last_error: self.last_error.clone(),
        })
    }
    /// Called on a clone. Failure leaves the durable download cursor unchanged.
    pub fn page(&mut self, response: History) -> Result<()> {
        if response.transactions.len() > PAGE as usize {
            return Err("oversize index page".into());
        }
        let prior_pending = self.pending.as_ref();
        let before = prior_pending.map(|p| p.before);
        let mut prior = before;
        for row in &response.transactions {
            if prior.is_some_and(|id| row.id >= id) || row.id == u64::MAX {
                return Err("non-descending index page / position overflow".into());
            }
            prior = Some(row.id);
        }
        let Some(oldest) = response.oldest_tx_id else {
            if !response.transactions.is_empty() || self.pending.is_some() || self.cursor != 0 {
                return Err("inconsistent empty history".into());
            }
            return Ok(());
        };
        if self.pending.as_ref().is_some_and(|p| p.oldest != oldest) {
            return Err("index oldest changed during pass".into());
        }
        if response.transactions.is_empty() {
            return Err("index omitted expected history".into());
        }
        if response.transactions.last().unwrap().id < oldest {
            return Err("history below oldest".into());
        }
        let recipient = account(&self.recipient_hex)?;
        let mut pending = self.pending.clone();
        for tx in response.transactions {
            if tx.id < self.cursor {
                if let Some(p) = &mut pending {
                    p.complete = true;
                }
                break;
            }
            let row = Row {
                id: tx.id,
                payload: classify(&tx.transaction, &recipient)?,
                digest: hash(&candid::encode_one(&tx).map_err(|e| e.to_string())?),
            };
            let p = pending.get_or_insert_with(|| Pending {
                high: row.id,
                oldest,
                before: row.id,
                complete: false,
                rows: Vec::new(),
            });
            if p.rows.len() >= MAX_PENDING {
                return Err("INDEX_BACKLOG_CAPACITY: pending range exceeds 256; no payments admitted or discarded".into());
            }
            p.before = row.id;
            p.rows.push(row);
            if tx.id == oldest {
                p.complete = true;
                break;
            }
        }
        self.pending = pending;
        Ok(())
    }
    pub fn admission(&self, previous_anchor: &str) -> Result<(u64, Vec<Input>, String)> {
        let p = self
            .pending
            .as_ref()
            .filter(|p| p.complete)
            .ok_or("range not complete")?;
        let end = p.high.checked_add(1).ok_or("position overflow")?;
        let mut bytes = b"BTZ-ICP-INDEX-ANCHOR-01".to_vec();
        bytes.extend(unhex(previous_anchor)?);
        let mut inputs = Vec::new();
        for row in p.rows.iter().rev() {
            bytes.extend(row.id.to_be_bytes());
            bytes.extend(unhex(&row.digest)?);
            if let Some(payload) = &row.payload {
                inputs.push(Input {
                    position: Int(row.id.into()),
                    payload_hex: payload.clone(),
                });
            }
        }
        Ok((end, inputs, hash(&bytes)))
    }
}

// Exact official ICP index types; pinned upstream DID is retained in interfaces/.
#[derive(Clone, CandidType, Deserialize)]
pub struct HistoryArgs {
    pub account_identifier: String,
    pub start: Option<u64>,
    pub max_results: u64,
}
#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct Tokens {
    pub e8s: u64,
}
#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct Timestamp {
    pub timestamp_nanos: u64,
}
#[derive(Clone, Debug, CandidType, Deserialize)]
pub enum Operation {
    Approve {
        fee: Tokens,
        from: String,
        allowance: Tokens,
        expires_at: Option<Timestamp>,
        spender: String,
        expected_allowance: Option<Tokens>,
    },
    Burn {
        from: String,
        amount: Tokens,
        spender: Option<String>,
    },
    Mint {
        to: String,
        amount: Tokens,
    },
    Transfer {
        to: String,
        fee: Tokens,
        from: String,
        amount: Tokens,
        spender: Option<String>,
    },
}
#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct Transaction {
    pub memo: u64,
    pub icrc1_memo: Option<Vec<u8>>,
    pub operation: Operation,
    pub created_at_time: Option<Timestamp>,
    pub timestamp: Option<Timestamp>,
}
#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct TransactionWithId {
    pub id: u64,
    pub transaction: Transaction,
}
#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct History {
    pub balance: u64,
    pub transactions: Vec<TransactionWithId>,
    pub oldest_tx_id: Option<u64>,
}
#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct IndexError {
    pub message: String,
}
pub type HistoryResult = std::result::Result<History, IndexError>;

#[allow(non_camel_case_types)]
#[derive(Clone, Debug, CandidType, Deserialize)]
pub enum PokeTarget {
    subaccount(u64),
    neuron_nonce(u64),
}
#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct PokeMatch {
    pub target: PokeTarget,
    pub max_amount: Nat,
}
pub fn matching_poke(matches: &[PokeMatch], target: u64) -> bool {
    matches.len() <= 256
        && matches.iter().any(|p| {
            matches!(p.target,PokeTarget::subaccount(n) if n==target) && p.max_amount > 0u8
        })
}
fn account(text: &str) -> Result<AccountIdentifier> {
    AccountIdentifier::from_hex(text).map_err(|e| format!("index account: {e}"))
}
fn classify(tx: &Transaction, recipient: &AccountIdentifier) -> Result<Option<String>> {
    match &tx.operation {
        Operation::Transfer {
            from,
            to,
            amount,
            spender,
            ..
        } => {
            let from = account(from)?;
            let to = account(to)?;
            if let Some(s) = spender {
                account(s)?;
            }
            if &to != recipient || &from == recipient {
                return Ok(None);
            }
            let memo = if spender.is_some() {
                [0; 8]
            } else {
                normalized_memo(tx.memo, tx.icrc1_memo.as_deref())
            };
            let mut payload = b"BTZPAY02".to_vec();
            payload.extend(from.as_bytes());
            payload.extend(amount.e8s.to_be_bytes());
            payload.extend(memo);
            Ok(Some(hex(&payload)))
        }
        Operation::Mint { to, .. } => {
            account(to)?;
            Ok(None)
        }
        Operation::Burn { from, spender, .. } => {
            account(from)?;
            if let Some(s) = spender {
                account(s)?;
            }
            Ok(None)
        }
        Operation::Approve { from, spender, .. } => {
            account(from)?;
            account(spender)?;
            Ok(None)
        }
    }
}
fn normalized_memo(legacy: u64, blob: Option<&[u8]>) -> [u8; 8] {
    let candidate: [u8; 8] = match blob {
        Some(bytes) if legacy == 0 => match bytes.try_into() {
            Ok(value) => value,
            Err(_) => return INVALID_MEMO,
        },
        Some(_) => return INVALID_MEMO,
        None => legacy.to_be_bytes(),
    };
    let value = u32::from_be_bytes(candidate[4..].try_into().expect("four bytes"));
    if &candidate[..3] != b"BTZ"
        || !matches!(candidate[3], 0x11 | 0x12)
        || (candidate[3] == 0x11 && value > u32::from(u16::MAX))
    {
        INVALID_MEMO
    } else {
        candidate
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn owner() -> Principal {
        Principal::from_slice(&[7])
    }
    fn fresh() -> SourceState {
        SourceState::configured(
            IndexConfig {
                network: "pocketic-local".into(),
                ledger: Principal::from_slice(&[1]),
                index: Principal::from_slice(&[2]),
                receiving_subaccount: 0,
                event_horizon: Some(Principal::from_slice(&[3])),
                starting_policy: StartingPolicy::FromBeginning,
            },
            owner(),
        )
        .unwrap()
        .0
    }
    fn tx(id: u64) -> TransactionWithId {
        TransactionWithId {
            id,
            transaction: Transaction {
                memo: u64::from_be_bytes(*b"BTZ\x11\0\0\0\0"),
                icrc1_memo: None,
                operation: Operation::Transfer {
                    to: fresh().recipient_hex,
                    from: receiving_account(Principal::from_slice(&[8]), 0).to_string(),
                    amount: Tokens { e8s: 100_000_000 },
                    fee: Tokens { e8s: 10_000 },
                    spender: None,
                },
                created_at_time: None,
                timestamp: None,
            },
        }
    }
    fn page(ids: &[u64], oldest: Option<u64>) -> History {
        History {
            balance: 0,
            transactions: ids.iter().map(|id| tx(*id)).collect(),
            oldest_tx_id: oldest,
        }
    }
    #[test]
    fn sparse_pages_frozen_high_and_oldest_first() {
        let mut s = fresh();
        s.page(page(&[800, 109], Some(100))).unwrap();
        assert!(!s.pending.as_ref().unwrap().complete);
        assert!(s.admission(&"00".repeat(32)).is_err());
        // New arrival 900 belongs to next pass. Exclusive continuation is 109.
        s.page(page(&[100], Some(100))).unwrap();
        let (end, inputs, _) = s.admission(&"00".repeat(32)).unwrap();
        assert_eq!(end, 801);
        assert_eq!(
            inputs
                .iter()
                .map(|i| i.position.0.to_string())
                .collect::<Vec<_>>(),
            ["100", "109", "800"]
        );
        s.cursor = end;
        s.pending = None;
        s.page(page(&[900, 800, 109], Some(100))).unwrap();
        assert_eq!(s.admission(&"00".repeat(32)).unwrap().0, 901);
    }
    #[test]
    fn duplicate_nonadvancing_inconsistent_and_overflow_pages_rejected() {
        let mut s = fresh();
        for bad in [
            page(&[2, 2], Some(2)),
            page(&[1, 2], Some(1)),
            page(&[u64::MAX], Some(u64::MAX)),
            page(&[1], None),
            page(&[], Some(1)),
            page(&[1], Some(2)),
        ] {
            assert!(s.page(bad).is_err());
            assert!(s.pending.is_none());
            assert_eq!(s.cursor, 0);
        }
        s.page(page(&[800], Some(1))).unwrap();
        let before = serde_json::to_vec(&s).unwrap();
        for bad in [
            page(&[800], Some(1)),
            page(&[900], Some(1)),
            page(&[], Some(1)),
            page(&[799], Some(2)),
        ] {
            assert!(s.page(bad).is_err());
            assert_eq!(serde_json::to_vec(&s).unwrap(), before);
        }
    }
    #[test]
    fn durable_pending_and_capacity_never_advance_admission() {
        let mut s = fresh();
        for n in 0..4 {
            s.page(page(
                &(1..=64).rev().map(|i| i + 256 - n * 64).collect::<Vec<_>>(),
                Some(0),
            ))
            .unwrap();
        }
        let bytes = serde_json::to_vec(&s).unwrap();
        let mut restored: SourceState = serde_json::from_slice(&bytes).unwrap();
        restored.validate().unwrap();
        assert!(restored.page(page(&[64, 0], Some(0))).is_err());
        assert_eq!(restored.cursor, 0);
        assert_eq!(serde_json::to_vec(&restored).unwrap(), bytes);
    }
    #[test]
    fn empty_history_and_unchanged_account_are_safe() {
        let mut s = fresh();
        s.page(page(&[], None)).unwrap();
        assert!(s.pending.is_none());
        s.page(page(&[100], Some(100))).unwrap();
        s.cursor = 101;
        s.pending = None;
        s.page(page(&[100], Some(100))).unwrap();
        assert!(s.pending.is_none());
        assert_eq!(s.cursor, 101);
        assert!(s.page(page(&[], None)).is_err());
    }
    #[test]
    fn classification_preserves_memo_and_delegation_rules() {
        let recipient = receiving_account(owner(), 0);
        let mut t = tx(1).transaction;
        assert_eq!(
            unhex(&classify(&t, &recipient).unwrap().unwrap())
                .unwrap()
                .len(),
            56
        );
        t.icrc1_memo = Some(b"BTZ\x12\0\0\0\x01".to_vec());
        t.memo = 0;
        assert!(classify(&t, &recipient)
            .unwrap()
            .unwrap()
            .ends_with("42545a1200000001"));
        t.memo = 1;
        assert!(classify(&t, &recipient)
            .unwrap()
            .unwrap()
            .ends_with("0000000000000000"));
        t.memo = 0;
        t.icrc1_memo = None;
        if let Operation::Transfer { spender, .. } = &mut t.operation {
            *spender = Some(receiving_account(owner(), 2).to_string());
        }
        assert!(classify(&t, &recipient)
            .unwrap()
            .unwrap()
            .ends_with("0000000000000000"));
        if let Operation::Transfer { from, .. } = &mut t.operation {
            *from = recipient.to_string();
        }
        assert!(classify(&t, &recipient).unwrap().is_none());
        t.operation = Operation::Mint {
            to: recipient.to_string(),
            amount: Tokens { e8s: 1 },
        };
        assert!(classify(&t, &recipient).unwrap().is_none());
        t.operation = Operation::Transfer {
            to: "bad".into(),
            from: recipient.to_string(),
            amount: Tokens { e8s: 1 },
            fee: Tokens { e8s: 1 },
            spender: None,
        };
        assert!(classify(&t, &recipient).is_err());
    }
    #[test]
    fn full_nat64_source_positions_and_subaccounts_survive_durable_codec() {
        let (mut s, _) = SourceState::configured(
            IndexConfig {
                network: "pocketic-local".into(),
                ledger: Principal::from_slice(&[1]),
                index: Principal::from_slice(&[2]),
                receiving_subaccount: u64::MAX,
                event_horizon: None,
                starting_policy: StartingPolicy::FromBeginning,
            },
            owner(),
        )
        .unwrap();
        let mut record = tx(u64::MAX - 1);
        if let Operation::Transfer { to, .. } = &mut record.transaction.operation {
            *to = s.recipient_hex.clone();
        }
        s.page(History {
            balance: 0,
            transactions: vec![record],
            oldest_tx_id: Some(u64::MAX - 1),
        })
        .unwrap();
        let bytes = dtr_wire::encode(&s).unwrap();
        let restored: SourceState = dtr_wire::decode(&bytes).unwrap();
        restored.validate().unwrap();
        assert_eq!(restored.receiving_subaccount, u64::MAX);
        let (end, inputs, _) = restored.admission(&"00".repeat(32)).unwrap();
        assert_eq!(end, u64::MAX);
        assert_eq!(inputs[0].position.0.to_string(), (u64::MAX - 1).to_string());
        let bad = String::from_utf8(bytes)
            .unwrap()
            .replace(&format!("\"{}\"", u64::MAX), "\"018446744073709551615\"");
        assert!(dtr_wire::decode::<SourceState>(bad.as_bytes()).is_err());
    }
    #[test]
    fn exact_numeric_subaccount_derivation() {
        assert_eq!(
            receiving_account(owner(), 0),
            AccountIdentifier::new(&owner(), &ic_ledger_types::DEFAULT_SUBACCOUNT)
        );
        let mut raw = [0; 32];
        raw[31] = 7;
        assert_eq!(
            receiving_account(owner(), 7),
            AccountIdentifier::new(&owner(), &Subaccount(raw))
        );
        assert_ne!(receiving_account(owner(), 0), receiving_account(owner(), 7));
    }
    #[test]
    fn poke_target_positive_nat_and_bounded_vector() {
        let p = |target, amount| PokeMatch {
            target,
            max_amount: Nat::from(amount),
        };
        assert!(!matching_poke(&[], 0));
        for target in [PokeTarget::subaccount(1), PokeTarget::neuron_nonce(0)] {
            assert!(!matching_poke(&[p(target, 1u64)], 0));
        }
        assert!(!matching_poke(&[p(PokeTarget::subaccount(0), 0u64)], 0));
        assert!(matching_poke(&[p(PokeTarget::subaccount(0), 1u64)], 0));
        let huge = Nat::parse(b"18446744073709551616000000000000000").unwrap();
        assert!(matching_poke(
            &[PokeMatch {
                target: PokeTarget::subaccount(0),
                max_amount: huge
            }],
            0
        ));
        let duplicate = p(PokeTarget::subaccount(0), 1u64);
        assert!(matching_poke(&vec![duplicate.clone(); 256], 0));
        assert!(!matching_poke(&vec![duplicate; 257], 0));
    }
}
