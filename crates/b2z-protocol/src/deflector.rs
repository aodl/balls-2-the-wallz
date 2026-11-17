//! Adapter7 only. Historical codecs never accept these commands.
use crate::{v6, war_cry, MemoError};
pub const MEMO_ADAPTER_VERSION: u8 = 7;
include!("deflector_orientation_generated.rs");
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Command {
    Deflect { cell: u32, orientation: u8 },
    Existing(v6::Command),
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Annotated {
    pub command: Command,
    pub cry: String,
}
pub fn encode(c: Command) -> Result<[u8; 8], MemoError> {
    match c {
        Command::Existing(c) => v6::encode(c),
        Command::Deflect { cell, orientation } => {
            if cell >= 1000000 || orientation > 3 {
                return Err(MemoError::ReservedBits);
            }
            Ok([
                0xb7,
                (cell >> 16) as u8,
                (cell >> 8) as u8,
                cell as u8,
                orientation,
                0,
                0,
                0,
            ])
        }
    }
}
pub fn decode(b: &[u8]) -> Result<Command, MemoError> {
    if b.len() != 8 {
        return Err(MemoError::Length);
    }
    if b[0] != 0xb7 {
        return v6::decode(b).map(Command::Existing);
    }
    if b[5..].iter().any(|x| *x != 0) {
        return Err(MemoError::ReservedBits);
    }
    let c = Command::Deflect {
        cell: u32::from(b[1]) * 65536 + u32::from(b[2]) * 256 + u32::from(b[3]),
        orientation: b[4],
    };
    encode(c)?;
    Ok(c)
}
pub fn parse_text(b: &[u8]) -> Result<Annotated, MemoError> {
    if b.is_empty() || b.len() > 32 {
        return Err(MemoError::Length);
    }
    if matches!(b[0], b'D' | b'd') {
        let s = std::str::from_utf8(b).map_err(|_| MemoError::Text)?;
        let p: Vec<_> = s.split(' ').collect();
        if p.len() != 3
            || p[0] != "DEFLECT"
            || p[1].is_empty()
            || p[1].len() > 6
            || !p[1].bytes().all(|x| x.is_ascii_digit())
            || p[1].len() > 1 && p[1].starts_with('0')
        {
            return Err(MemoError::Text);
        }
        let cell = p[1].parse::<u32>().map_err(|_| MemoError::Text)?;
        let orientation = ORIENTATIONS
            .iter()
            .position(|o| *o == p[2])
            .ok_or(MemoError::Text)? as u8;
        let command = Command::Deflect { cell, orientation };
        encode(command)?;
        return Ok(Annotated {
            command,
            cry: String::new(),
        });
    }
    let a = war_cry::parse_text(b)?;
    Ok(Annotated {
        command: Command::Existing(a.command),
        cry: a.cry,
    })
}
pub fn decode_ledger(numeric: u64, blob: Option<&[u8]>) -> Result<Annotated, MemoError> {
    match blob {
        None => Ok(Annotated {
            command: decode(&numeric.to_be_bytes())?,
            cry: String::new(),
        }),
        Some(b) if b.len() == 8 && matches!(b[0], 0xb7 | 0xc6 | 0xd6 | 0xf6 | 0x42) => {
            Ok(Annotated {
                command: decode(b)?,
                cry: String::new(),
            })
        }
        Some(b) => parse_text(b),
    }
}
