//! B2Z memo codec only; no prices, physics, IC calls, or principal inference.
#![forbid(unsafe_code)]
pub mod v6;

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
    Text,
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
    if bytes[..3] != LEGACY_BINARY_MAGIC {
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
/// Account-index adapter v3; source identity and canonical game input encoding stay unchanged.
pub const MEMO_ADAPTER_VERSION: u8 = 3;
/// Historic binary magic is protocol identity, not current branding.
const LEGACY_BINARY_MAGIC: [u8; 3] = [0x42, 0x54, 0x5a];
pub fn parse_text(bytes: &[u8]) -> Result<Command, MemoError> {
    parse_text_epoch(bytes, true)
}
fn parse_text_epoch(bytes: &[u8], prefix_free: bool) -> Result<Command, MemoError> {
    if bytes.is_empty() || bytes.len() > 32 {
        return Err(MemoError::Length);
    }
    if !bytes.iter().all(|b| (32..=126).contains(b)) {
        return Err(MemoError::Text);
    }
    let text = std::str::from_utf8(bytes)
        .map_err(|_| MemoError::Text)?
        .trim_matches(' ');
    // Published S15 prefix remains readable, but new commands need no prefix.
    let body = if text
        .get(..4)
        .is_some_and(|p| p.eq_ignore_ascii_case("BTZ "))
    {
        &text[4..]
    } else if prefix_free {
        text
    } else {
        return Err(MemoError::Text);
    };
    let mut parts = body.split(' ');
    let (Some(op), Some(number), None) = (parts.next(), parts.next(), parts.next()) else {
        return Err(MemoError::Text);
    };
    let decimal = |s: &str| -> Result<u32, MemoError> {
        if s.is_empty() || !s.bytes().all(|b| b.is_ascii_digit()) {
            return Err(MemoError::Text);
        }
        s.bytes().try_fold(0u32, |n, b| {
            n.checked_mul(10)
                .and_then(|n| n.checked_add(u32::from(b - b'0')))
                .ok_or(MemoError::Text)
        })
    };
    if op.eq_ignore_ascii_case("MOVE") {
        return decimal(number).map(Command::Move);
    }
    if !op.eq_ignore_ascii_case("ANGLE") {
        return Err(MemoError::Text);
    }
    let mut numbers = number.split('.');
    let whole = decimal(numbers.next().ok_or(MemoError::Text)?)?;
    let fraction = match numbers.next() {
        None => 0,
        Some(s) if s.len() == 1 => decimal(s)? * 10,
        Some(s) if s.len() == 2 => decimal(s)?,
        _ => return Err(MemoError::Text),
    };
    if numbers.next().is_some() || whole > 359 {
        return Err(MemoError::Text);
    }
    let centidegrees = whole * 100 + fraction;
    Ok(Command::Angle(
        ((u64::from(centidegrees) * 65536 + 18000) / 36000 % 65536) as u16,
    ))
}
pub fn decode_blob(bytes: &[u8]) -> Result<Command, MemoError> {
    if bytes.len() == 8 && bytes[..3] == LEGACY_BINARY_MAGIC {
        decode(bytes)
    } else {
        parse_text(bytes)
    }
}
pub fn decode_ledger(legacy: u64, blob: Option<&[u8]>) -> Result<Command, MemoError> {
    match blob {
        Some(bytes) => decode_blob(bytes),
        None => decode(&legacy.to_be_bytes()),
    }
}
/// S15 raw-history adapter retains its grammar and original classifier.
pub fn decode_ledger_v2(legacy: u64, blob: Option<&[u8]>) -> Result<Command, MemoError> {
    match blob {
        Some(bytes) if bytes.len() == 8 && bytes[3] != b' ' => decode(bytes),
        Some(bytes) => parse_text_epoch(bytes, false),
        None => decode(&legacy.to_be_bytes()),
    }
}
/// Historical raw-history replay. Never reinterpret already normalized pending/committed inputs.
pub fn decode_ledger_v1(legacy: u64, blob: Option<&[u8]>) -> Result<Command, MemoError> {
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
    fn shared_text_normalization_fixtures() {
        for line in concat!(
            include_str!("../../../tests/fixtures/text-memos.tsv"),
            include_str!("../../../tests/fixtures/text-memos-v3.tsv")
        )
        .lines()
        .filter(|l| !l.starts_with('#') && !l.is_empty())
        {
            let p: Vec<_> = line.split('\t').collect();
            let legacy = p[2].parse::<u64>().unwrap();
            let blob = if p[1] == "-" {
                None
            } else {
                Some(
                    (0..p[1].len())
                        .step_by(2)
                        .map(|i| u8::from_str_radix(&p[1][i..i + 2], 16).unwrap())
                        .collect::<Vec<_>>(),
                )
            };
            let actual = decode_ledger(legacy, blob.as_deref()).map(|c| {
                encode(c)
                    .iter()
                    .map(|b| format!("{b:02x}"))
                    .collect::<String>()
            });
            if p[3] == "INVALID" {
                assert!(actual.is_err(), "{}", p[0]);
            } else {
                assert_eq!(actual.unwrap(), p[3], "{}", p[0]);
            }
        }
        assert_eq!(MEMO_ADAPTER_VERSION, 3);
        assert!(decode_ledger_v1(0, Some(b"BTZ ANGLE 37.5")).is_err());
        assert_eq!(
            decode_ledger_v1(1, Some(&encode(Command::Move(0)))),
            Err(MemoError::MixedFields)
        );
    }
    #[test]
    fn historical_v2_rejects_prefix_free_text() {
        for text in ["ANGLE 0", "ANGLE 12", "ANGLE 37.5", "MOVE 123"] {
            assert!(decode_ledger_v2(0, Some(text.as_bytes())).is_err());
        }
        assert_eq!(
            decode_ledger_v2(123, Some(b"BTZ ANGLE 37.5")),
            decode_ledger(123, Some(b"ANGLE 37.5"))
        );
        assert!(decode_ledger_v2(numeric(Command::Angle(0)), Some(b"")).is_err());
    }
    #[test]
    fn every_centidegree_uses_integer_mapping() {
        for c in 0..36000u64 {
            let text = format!("ANGLE {}.{:02}", c / 100, c % 100);
            assert_eq!(
                parse_text(text.as_bytes()),
                Ok(Command::Angle(((c * 65536 + 18000) / 36000 % 65536) as u16))
            );
        }
    }
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
    fn blob_precedence_and_historical_decoder() {
        assert_eq!(
            decode_ledger(1, Some(&encode(Command::Move(0)))),
            Ok(Command::Move(0))
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
