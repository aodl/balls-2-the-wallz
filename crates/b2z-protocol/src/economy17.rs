//! Rules17 Ledger envelope and exact purchase arithmetic.
pub use crate::economy17_generated::*;
use crate::{MemoError, reservoir};

pub const MEMO_ADAPTER_VERSION: u8 = 11;
pub const NORMALIZED_PAYMENT: &[u8; 8] = b"BTZPAY08";

/// Keep the exact Rules16 command and annotations. The last eight bytes are
/// the Ledger block timestamp, big endian. They are included in the source seal.
pub fn timestamped(predecessor: &[u8], recorded_ns: u64) -> Result<Vec<u8>, MemoError> {
    reservoir::predecessor_envelope(predecessor)?;
    if recorded_ns == 0 {
        return Err(MemoError::Text);
    }
    let mut out = predecessor.to_vec();
    out[..8].copy_from_slice(NORMALIZED_PAYMENT);
    out.extend(recorded_ns.to_be_bytes());
    Ok(out)
}

pub fn untimed(bytes: &[u8]) -> Result<(Vec<u8>, u64), MemoError> {
    if !(65..=96).contains(&bytes.len()) || !bytes.starts_with(NORMALIZED_PAYMENT) {
        return Err(MemoError::Length);
    }
    let (previous, time) = bytes.split_at(bytes.len() - 8);
    let recorded_ns = u64::from_be_bytes(time.try_into().unwrap());
    if recorded_ns == 0 {
        return Err(MemoError::Text);
    }
    let mut previous = previous.to_vec();
    previous[..8].copy_from_slice(reservoir::NORMALIZED_PAYMENT);
    reservoir::predecessor_envelope(&previous)?;
    Ok((previous, recorded_ns))
}

pub fn marginal(base: u64, multiplier: u32, existing: usize) -> Option<u64> {
    let n = u64::try_from(existing).ok()?.checked_add(1)?;
    if multiplier == 0 {
        return None;
    }
    base.checked_mul(multiplier.into())?
        .checked_mul(n)?
        .checked_mul(n)
}

/// Count payable balls without spending, using one tariff and a finite payment
/// budget. The included ball on a NEW is reflected in `existing` by the caller.
pub fn affordable_balls(mut budget: u64, multiplier: u32, existing: usize, limit: usize) -> usize {
    for i in 0..limit {
        let Some(rest) = existing
            .checked_add(i)
            .and_then(|n| marginal(BALL_BASE_E8S, multiplier, n))
            .and_then(|n| budget.checked_sub(n))
        else {
            return i;
        };
        budget = rest;
    }
    limit
}
