//! Rules-v6 commands. Historical adapters remain unchanged and cannot decode these.
use super::{Command as Legacy, MemoError};

pub const MAX_QUANTITY: u8 = 64;
pub const MEMO_ADAPTER_VERSION: u8 = 4;
const AUTO: u32 = 0x00ff_ffff;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Command {
    Legacy(Legacy),
    Fire {
        cannon: u32,
        angle: u16,
        quantity: u8,
    },
    Move {
        cannon: u32,
        cell: u32,
    },
    New {
        angle: u16,
        quantity: u8,
        cell: Option<u32>,
    },
}

fn bounded(command: Command) -> Result<Command, MemoError> {
    let (cannon, quantity, cell) = match command {
        Command::Legacy(_) => return Ok(command),
        Command::Fire {
            cannon, quantity, ..
        } => (cannon, quantity, None),
        Command::Move { cannon, cell } => (cannon, 1, Some(cell)),
        Command::New { quantity, cell, .. } => (1, quantity, cell),
    };
    if cannon == 0
        || !(1..=MAX_QUANTITY).contains(&quantity)
        || cell.is_some_and(|c| c >= 1_000_000)
    {
        return Err(MemoError::ReservedBits);
    }
    Ok(command)
}

/// Exact eight-byte numeric/blob form. Cannon IDs retain all 32 bits.
pub fn encode(command: Command) -> Result<[u8; 8], MemoError> {
    bounded(command)?;
    Ok(match command {
        Command::Legacy(c) => super::encode(c),
        Command::Fire {
            cannon,
            angle,
            quantity,
        } => {
            let c = cannon.to_be_bytes();
            let a = angle.to_be_bytes();
            [0xf6, c[0], c[1], c[2], c[3], a[0], a[1], quantity]
        }
        Command::Move { cannon, cell } => {
            let c = cannon.to_be_bytes();
            let d = cell.to_be_bytes();
            [0xd6, c[0], c[1], c[2], c[3], d[1], d[2], d[3]]
        }
        Command::New {
            angle,
            quantity,
            cell,
        } => {
            let a = angle.to_be_bytes();
            let d = cell.unwrap_or(AUTO).to_be_bytes();
            [0xc6, a[0], a[1], quantity, d[1], d[2], d[3], 0]
        }
    })
}

pub fn decode(bytes: &[u8]) -> Result<Command, MemoError> {
    if bytes.len() != 8 {
        return Err(MemoError::Length);
    }
    bounded(match bytes[0] {
        0xf6 => Command::Fire {
            cannon: u32::from_be_bytes(bytes[1..5].try_into().unwrap()),
            angle: u16::from_be_bytes([bytes[5], bytes[6]]),
            quantity: bytes[7],
        },
        0xd6 => Command::Move {
            cannon: u32::from_be_bytes(bytes[1..5].try_into().unwrap()),
            cell: u32::from_be_bytes([0, bytes[5], bytes[6], bytes[7]]),
        },
        0xc6 if bytes[7] == 0 => {
            let cell = u32::from_be_bytes([0, bytes[4], bytes[5], bytes[6]]);
            Command::New {
                angle: u16::from_be_bytes([bytes[1], bytes[2]]),
                quantity: bytes[3],
                cell: (cell != AUTO).then_some(cell),
            }
        }
        0xc6 => return Err(MemoError::ReservedBits),
        _ => Command::Legacy(super::decode(bytes)?),
    })
}

pub fn parse_text(bytes: &[u8]) -> Result<Command, MemoError> {
    if bytes.is_empty() || bytes.len() > 32 {
        return Err(MemoError::Length);
    }
    if !bytes.iter().all(|b| (32..=126).contains(b)) {
        return Err(MemoError::Text);
    }
    let text = std::str::from_utf8(bytes)
        .map_err(|_| MemoError::Text)?
        .trim_matches(' ');
    let body = if text
        .get(..4)
        .is_some_and(|p| p.eq_ignore_ascii_case("BTZ "))
    {
        &text[4..]
    } else {
        text
    };
    let p: Vec<_> = body.split(' ').collect();
    let number = |s: &str| -> Result<u32, MemoError> {
        if s.is_empty() || !s.bytes().all(|b| b.is_ascii_digit()) {
            return Err(MemoError::Text);
        }
        s.parse().map_err(|_| MemoError::Text)
    };
    let quantity = |s: &str| -> Result<u8, MemoError> {
        u8::try_from(number(s)?).map_err(|_| MemoError::Text)
    };
    let angle = |s: &str| -> Result<u16, MemoError> {
        match super::parse_text(format!("ANGLE {s}").as_bytes())? {
            Legacy::Angle(a) => Ok(a),
            _ => Err(MemoError::Text),
        }
    };
    bounded(match p.as_slice() {
        [op, cannon, a, q] if op.eq_ignore_ascii_case("FIRE") => Command::Fire {
            cannon: number(cannon)?,
            angle: angle(a)?,
            quantity: quantity(q)?,
        },
        [op, cannon, cell] if op.eq_ignore_ascii_case("MOVE") => Command::Move {
            cannon: number(cannon)?,
            cell: number(cell)?,
        },
        [op, a, q] if op.eq_ignore_ascii_case("NEW") => Command::New {
            angle: angle(a)?,
            quantity: quantity(q)?,
            cell: None,
        },
        [op, a, q, cell] if op.eq_ignore_ascii_case("NEW") => Command::New {
            angle: angle(a)?,
            quantity: quantity(q)?,
            cell: Some(number(cell)?),
        },
        _ => Command::Legacy(super::parse_text(bytes)?),
    })
}

pub fn decode_ledger(legacy: u64, blob: Option<&[u8]>) -> Result<Command, MemoError> {
    match blob {
        Some(b)
            if b.len() == 8
                && (matches!(b[0], 0xc6 | 0xd6 | 0xf6) || b[..3] == [0x42, 0x54, 0x5a]) =>
        {
            decode(b)
        }
        Some(b) => parse_text(b),
        None => decode(&legacy.to_be_bytes()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn shared_vectors_preserve_legacy_and_full_width_targets() {
        for line in include_str!("../../../tests/fixtures/memos-v6.tsv")
            .lines()
            .filter(|l| !l.starts_with('#') && !l.is_empty())
        {
            let (text, expected) = line.split_once('\t').unwrap();
            let result = parse_text(text.as_bytes());
            if expected == "INVALID" {
                assert!(result.is_err(), "{text}");
                continue;
            }
            let command = result.unwrap();
            let bytes = encode(command).unwrap();
            let hex: String = bytes.iter().map(|b| format!("{b:02x}")).collect();
            assert_eq!(hex, expected, "{text}");
            assert_eq!(decode(&bytes).unwrap(), command);
            assert_eq!(
                decode_ledger(u64::MAX, Some(text.as_bytes())).unwrap(),
                command
            );
            assert_eq!(
                decode_ledger(u64::from_be_bytes(bytes), None).unwrap(),
                command
            );
            if !matches!(command, Command::Legacy(_)) {
                assert!(super::super::decode(&bytes).is_err());
            }
        }
    }
    #[test]
    fn malformed_present_blob_never_falls_back() {
        assert!(decode_ledger(super::super::numeric(Legacy::Angle(0)), Some(b"")).is_err());
        for bytes in [
            [0xf6, 0, 0, 0, 0, 0, 0, 1],
            [0xf6, 0, 0, 0, 1, 0, 0, 0],
            [0xc6, 0, 0, 1, 0xff, 0xff, 0xff, 1],
            [0xd6, 0, 0, 0, 1, 0xff, 0xff, 0xff],
        ] {
            assert!(decode(&bytes).is_err());
        }
    }
}
