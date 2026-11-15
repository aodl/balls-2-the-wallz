//! Memo adapter6; existing v3/v4 entry points remain byte-for-byte compatible.
use crate::{v6, MemoError};
pub const MEMO_ADAPTER_VERSION: u8 = 6;
pub const MEMO_LIMIT: usize = 32;
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Annotated {
    pub command: v6::Command,
    pub cry: String,
}
pub fn validate(text: &str) -> Result<(), MemoError> {
    if text.is_empty()
        || text.chars().any(|c| {
            matches!(c as u32, 0..=31 | 127..=159 | 0x2028..=0x202e | 0x2066..=0x2069) || c == '|'
        })
    {
        return Err(MemoError::Text);
    }
    Ok(())
}
pub fn parse_text(bytes: &[u8]) -> Result<Annotated, MemoError> {
    if bytes.is_empty() || bytes.len() > MEMO_LIMIT {
        return Err(MemoError::Length);
    }
    let text = std::str::from_utf8(bytes).map_err(|_| MemoError::Text)?;
    let Some((directive, cry)) = text.split_once('|') else {
        return Ok(Annotated {
            command: v6::parse_text(bytes)?,
            cry: String::new(),
        });
    };
    validate(cry)?;
    let command = v6::parse_text(directive.as_bytes())?;
    if !matches!(command, v6::Command::Fire { .. } | v6::Command::New { .. }) {
        return Err(MemoError::Text);
    }
    Ok(Annotated {
        command,
        cry: cry.to_owned(),
    })
}
pub fn decode_ledger(legacy: u64, blob: Option<&[u8]>) -> Result<Annotated, MemoError> {
    match blob {
        Some(b) if !(b.len() == 8 && matches!(b[0], 0xc6 | 0xd6 | 0xf6 | 0x42)) => parse_text(b),
        _ => Ok(Annotated {
            command: v6::decode_ledger(legacy, blob)?,
            cry: String::new(),
        }),
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn suffix_is_new_capability_only() {
        let b = "FIRE 1 0 1|é😀".as_bytes();
        assert!(v6::parse_text(b).is_err());
        assert_eq!(parse_text(b).unwrap().cry, "é😀");
        for s in [
            "FIRE 1 0 1|",
            "MOVE 1 2|hi",
            "ANGLE 0|hi",
            "FIRE 1 0 1|a|b",
            "FIRE 1 0 1|a\nb",
            "FIRE 1 0 1|a\u{202e}b",
        ] {
            assert!(parse_text(s.as_bytes()).is_err(), "{s}");
        }
        assert!(parse_text(&[255]).is_err());
        assert!(parse_text(b"FIRE 1 217.5 1|aaaaaaaaaaaaaaaaaa").is_err());
        assert_eq!(
            parse_text(b"FIRE 1 217.5 1|aaaaaaaaaaaaaaaaa")
                .unwrap()
                .cry
                .len(),
            17
        );
        assert_eq!(parse_text(b"FIRE 1 0 1").unwrap().cry, "");
    }
}
