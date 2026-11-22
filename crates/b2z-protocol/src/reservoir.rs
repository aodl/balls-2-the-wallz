//! Rules16 source adapter. New constructions are admitted only from canonical text.
use crate::{context_structures, shout, MemoError};

pub const MEMO_ADAPTER_VERSION: u8 = 10;
pub const NORMALIZED_PAYMENT: &[u8; 8] = b"BTZPAY07";
pub const OPCODE: u8 = 0xba;
pub const PRICE_E8S: u64 = 1_000_000;

pub fn decode_ledger(numeric: u64, blob: Option<&[u8]>) -> Result<([u8; 8], String), MemoError> {
    if let Some(bytes) = blob.and_then(|b| b.strip_prefix(b"RESERVOIR ")) {
        if bytes.is_empty()
            || bytes.len() > 6
            || bytes.len() > 1 && bytes[0] == b'0'
            || !bytes.iter().all(u8::is_ascii_digit)
        {
            return Err(MemoError::Text);
        }
        let cell = bytes
            .iter()
            .fold(0u32, |n, b| n * 10 + u32::from(*b - b'0'));
        let mut memo = [0; 8];
        memo[0] = OPCODE;
        memo[1..5].copy_from_slice(&cell.to_be_bytes());
        return Ok((memo, String::new()));
    }
    let parsed = shout::decode_ledger(numeric, blob)?;
    Ok((context_structures::encode(parsed.command)?, parsed.cry))
}

pub fn cell(memo: &[u8]) -> Result<Option<usize>, MemoError> {
    if memo.first() != Some(&OPCODE) {
        return Ok(None);
    }
    if memo.len() != 8 || memo[5..] != [0, 0, 0] {
        return Err(MemoError::Text);
    }
    let value = u32::from_be_bytes(memo[1..5].try_into().unwrap());
    if value >= 1_000_000 {
        return Err(MemoError::Text);
    }
    Ok(Some(value as usize))
}

pub fn predecessor_envelope(bytes: &[u8]) -> Result<Vec<u8>, MemoError> {
    if !(57..=88).contains(&bytes.len()) || !bytes.starts_with(NORMALIZED_PAYMENT) {
        return Err(MemoError::Length);
    }
    if cell(&bytes[48..56])?.is_some() && bytes.len() != 57 {
        return Err(MemoError::Text);
    }
    let mut legacy = bytes.to_vec();
    legacy[7] = b'6';
    shout::annotation(&legacy)?;
    Ok(legacy)
}
