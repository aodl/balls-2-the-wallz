//! BTZ memo codec only; no prices, physics, IC calls, or principal inference.
#![forbid(unsafe_code)]

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Command {
    Angle(u16),
    Move(u32),
}
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MemoError {
    Length,
    Magic,
    VersionOpcode,
    ReservedBits,
    MixedFields,
}

pub fn encode(command: Command) -> [u8; 8] {
    let (tag, payload) = match command {
        Command::Angle(v) => (0x11, u32::from(v)),
        Command::Move(v) => (0x12, v),
    };
    let p = payload.to_be_bytes();
    [0x42, 0x54, 0x5a, tag, p[0], p[1], p[2], p[3]]
}
pub fn decode(bytes: &[u8]) -> Result<Command, MemoError> {
    if bytes.len() != 8 {
        return Err(MemoError::Length);
    }
    if bytes[..3] != [0x42, 0x54, 0x5a] {
        return Err(MemoError::Magic);
    }
    let value = u32::from_be_bytes([bytes[4], bytes[5], bytes[6], bytes[7]]);
    match bytes[3] {
        0x11 => u16::try_from(value)
            .map(Command::Angle)
            .map_err(|_| MemoError::ReservedBits),
        0x12 => Ok(Command::Move(value)),
        _ => Err(MemoError::VersionOpcode),
    }
}
pub fn numeric(command: Command) -> u64 {
    u64::from_be_bytes(encode(command))
}
pub fn decode_ledger(legacy: u64, blob: Option<&[u8]>) -> Result<Command, MemoError> {
    match blob {
        Some(_) if legacy != 0 => Err(MemoError::MixedFields),
        Some(bytes) => decode(bytes),
        None => decode(&legacy.to_be_bytes()),
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn every_angle_roundtrips() {
        for n in 0..=u16::MAX {
            let c = Command::Angle(n);
            assert_eq!(decode(&encode(c)), Ok(c));
        }
    }
    #[test]
    fn moves_roundtrip() {
        for n in [0, 1, 65_535, 65_536, u32::MAX] {
            let c = Command::Move(n);
            assert_eq!(decode(&encode(c)), Ok(c));
        }
    }
    #[test]
    fn wire_routes_agree() {
        let c = Command::Angle(16384);
        assert_eq!(decode_ledger(numeric(c), None), Ok(c));
        assert_eq!(decode_ledger(0, Some(&encode(c))), Ok(c));
    }
    #[test]
    fn rejects_ambiguous_fields() {
        assert_eq!(
            decode_ledger(1, Some(&encode(Command::Move(0)))),
            Err(MemoError::MixedFields)
        );
    }
    #[test]
    fn malformed_blob_never_falls_back() {
        assert_eq!(decode_ledger(0, Some(&[])), Err(MemoError::Length));
    }
    #[test]
    fn angles_require_zero_reserved_bits() {
        assert_eq!(
            decode(&[0x42, 0x54, 0x5a, 0x11, 0, 1, 0, 0]),
            Err(MemoError::ReservedBits)
        );
    }
    #[test]
    fn rejects_bad_headers() {
        for t in [0, 0x10, 0x13, 0x21, 255] {
            assert_eq!(
                decode(&[0x42, 0x54, 0x5a, t, 0, 0, 0, 0]),
                Err(MemoError::VersionOpcode)
            );
        }
    }
    #[test]
    fn vectors_from_shared_fixture() {
        for line in include_str!("../../../tests/fixtures/memos.tsv")
            .lines()
            .filter(|l| !l.starts_with('#') && !l.is_empty())
        {
            let p: Vec<_> = line.split('\t').collect();
            let n: u32 = p[1].parse().unwrap();
            let c = if p[0] == "angle" {
                Command::Angle(u16::try_from(n).unwrap())
            } else {
                Command::Move(n)
            };
            assert_eq!(numeric(c).to_string(), p[3]);
            let encoded: String = encode(c).iter().map(|b| format!("{b:02x}")).collect();
            assert_eq!(encoded, p[2]);
        }
    }
}
