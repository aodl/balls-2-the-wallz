//! Proposed adapter9. Retains adapter8 binary directive semantics.
use crate::{context_structures as context, deflector, v6, war_cry, MemoError};

pub const MEMO_ADAPTER_VERSION: u8 = 9;
pub const NORMALIZED_PAYMENT: &[u8; 8] = b"BTZPAY06";

fn payable(command: context::Command) -> bool {
    !matches!(
        command,
        context::Command::Existing(deflector::Command::Existing(v6::Command::Legacy(_)))
    )
}

pub fn parse_text(bytes: &[u8]) -> Result<context::Annotated, MemoError> {
    if bytes.is_empty() || bytes.len() > war_cry::MEMO_LIMIT {
        return Err(MemoError::Length);
    }
    let text = std::str::from_utf8(bytes).map_err(|_| MemoError::Text)?;
    let Some((directive, shout)) = text.split_once('|') else {
        return context::parse_text(bytes);
    };
    let mut parsed = context::parse_text(directive.as_bytes())?;
    if !payable(parsed.command) {
        return Err(MemoError::Text);
    }
    war_cry::validate(shout)?;
    parsed.cry = shout.to_owned();
    Ok(parsed)
}

pub fn decode_ledger(numeric: u64, blob: Option<&[u8]>) -> Result<context::Annotated, MemoError> {
    match blob {
        Some(bytes) if !(bytes.len() == 8 && matches!(bytes[0], 0xc6 | 0xd6 | 0xf6 | 0x42)) => {
            parse_text(bytes)
        }
        _ => context::decode_ledger(numeric, blob),
    }
}

pub fn annotation(bytes: &[u8]) -> Result<&str, MemoError> {
    if !(57..=88).contains(&bytes.len())
        || !bytes.starts_with(NORMALIZED_PAYMENT)
        || usize::from(bytes[56]) != bytes.len() - 57
    {
        return Err(MemoError::Length);
    }
    if bytes.len() == 57 {
        // A bare invalid command still needs a receipt after normalization.
        return Ok("");
    }
    if !payable(context::decode(&bytes[48..56])?) {
        return Err(MemoError::Text);
    }
    let shout = std::str::from_utf8(&bytes[57..]).map_err(|_| MemoError::Text)?;
    war_cry::validate(shout)?;
    Ok(shout)
}

pub fn semantic_payment(bytes: &[u8]) -> Result<[u8; 56], MemoError> {
    annotation(bytes)?;
    let mut result = [0; 56];
    result.copy_from_slice(&bytes[..56]);
    result[7] = b'2';
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn shared_shout_text_fixtures_keep_directives_and_seed_bytes() {
        for row in include_str!("../../../tests/fixtures/shout-annotation.tsv").lines() {
            let (expected, text) = row.split_once('\t').unwrap();
            let parsed = parse_text(text.as_bytes());
            if expected == "reject" {
                assert!(parsed.is_err(), "{text}");
                continue;
            }
            let (directive, suffix) = text.split_once('|').unwrap();
            let parsed = parsed.unwrap();
            assert_eq!(
                parsed.command,
                context::parse_text(directive.as_bytes()).unwrap().command
            );
            assert_eq!(parsed.cry, suffix);
            if !text.starts_with("FIRE ") && !text.starts_with("NEW ") {
                assert!(context::parse_text(text.as_bytes()).is_err());
            }
            let mut envelope = NORMALIZED_PAYMENT.to_vec();
            envelope.extend([0x7f; 32]);
            envelope.extend(10_000u64.to_be_bytes());
            envelope.extend(context::encode(parsed.command).unwrap());
            envelope.push(suffix.len() as u8);
            envelope.extend(suffix.as_bytes());
            assert_eq!(annotation(&envelope).unwrap(), suffix);
            let hash_input = semantic_payment(&envelope).unwrap();
            assert_eq!(&hash_input[..8], b"BTZPAY02");
            assert_eq!(&hash_input[8..], &envelope[8..56]);
        }
    }
}
