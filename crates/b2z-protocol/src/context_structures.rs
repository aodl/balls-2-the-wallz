//! Rules13 adapter8. Ledger structure operations require canonical text.
use crate::{deflector, war_cry, MemoError};
include!("context_structures_generated.rs");

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Command {
    Existing(deflector::Command),
    Reorient { id: u32, orientation: u8 },
    Move { id: u32, cell: u32 },
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Annotated {
    pub command: Command,
    pub cry: String,
}

pub fn encode(command: Command) -> Result<[u8; 8], MemoError> {
    let mut bytes = [0; 8];
    let id = match command {
        Command::Existing(c) => return deflector::encode(c),
        Command::Reorient { id, orientation } if orientation < 4 => {
            bytes[0] = 0xb8;
            bytes[5] = orientation;
            id
        }
        Command::Move { id, cell } if cell < 1_000_000 => {
            bytes[0] = 0xb9;
            bytes[5..].copy_from_slice(&cell.to_be_bytes()[1..]);
            id
        }
        _ => return Err(MemoError::ReservedBits),
    };
    if id == 0 {
        return Err(MemoError::ReservedBits);
    }
    bytes[1..5].copy_from_slice(&id.to_be_bytes());
    Ok(bytes)
}

pub fn decode(bytes: &[u8]) -> Result<Command, MemoError> {
    if bytes.len() != 8 {
        return Err(MemoError::Length);
    }
    if !matches!(bytes[0], 0xb8 | 0xb9) {
        return deflector::decode(bytes).map(Command::Existing);
    }
    let id = u32::from_be_bytes([bytes[1], bytes[2], bytes[3], bytes[4]]);
    let command = match bytes[0] {
        0xb8 if bytes[6] == 0 && bytes[7] == 0 => Command::Reorient {
            id,
            orientation: bytes[5],
        },
        0xb9 => Command::Move {
            id,
            cell: u32::from_be_bytes([0, bytes[5], bytes[6], bytes[7]]),
        },
        _ => return Err(MemoError::ReservedBits),
    };
    encode(command)?;
    Ok(command)
}

fn decimal(text: &str, width: usize) -> Result<u32, MemoError> {
    if text.is_empty()
        || text.len() > width
        || text.len() > 1 && text.starts_with('0')
        || !text.bytes().all(|b| b.is_ascii_digit())
    {
        return Err(MemoError::Text);
    }
    text.parse().map_err(|_| MemoError::Text)
}

fn orientation(text: &str) -> Result<u8, MemoError> {
    SCREEN_ORIENTATION_CODES
        .iter()
        .find_map(|(name, code)| (*name == text).then_some(*code))
        .ok_or(MemoError::Text)
}

pub fn parse_text(bytes: &[u8]) -> Result<Annotated, MemoError> {
    if bytes.is_empty() || bytes.len() > 32 {
        return Err(MemoError::Length);
    }
    if !matches!(bytes[0], b'D' | b'd') {
        let annotation = war_cry::parse_text(bytes)?;
        return Ok(Annotated {
            command: Command::Existing(deflector::Command::Existing(annotation.command)),
            cry: annotation.cry,
        });
    }
    let text = std::str::from_utf8(bytes).map_err(|_| MemoError::Text)?;
    let mut fields = text.split(' ');
    let (verb, first, second, extra) = (fields.next(), fields.next(), fields.next(), fields.next());
    let command = match (verb, first, second, extra) {
        (Some("DEFLECT"), Some(site), Some(direction), None) => {
            Command::Existing(deflector::Command::Deflect {
                cell: decimal(site, 6)?,
                orientation: orientation(direction)?,
            })
        }
        (Some("DROT"), Some(id), Some(direction), None) => Command::Reorient {
            id: decimal(id, 10)?,
            orientation: orientation(direction)?,
        },
        (Some("DMOVE"), Some(id), Some(site), None) => Command::Move {
            id: decimal(id, 10)?,
            cell: decimal(site, 6)?,
        },
        _ => return Err(MemoError::Text),
    };
    encode(command)?;
    Ok(Annotated {
        command,
        cry: String::new(),
    })
}

pub fn decode_ledger(numeric: u64, blob: Option<&[u8]>) -> Result<Annotated, MemoError> {
    match blob {
        None => existing_binary(&numeric.to_be_bytes()),
        Some(bytes) if bytes.len() == 8 && matches!(bytes[0], 0xc6 | 0xd6 | 0xf6 | 0x42) => {
            existing_binary(bytes)
        }
        Some(bytes) => parse_text(bytes),
    }
}

fn existing_binary(bytes: &[u8]) -> Result<Annotated, MemoError> {
    let command = crate::v6::decode(bytes)?;
    Ok(Annotated {
        command: Command::Existing(deflector::Command::Existing(command)),
        cry: String::new(),
    })
}
