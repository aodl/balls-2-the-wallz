//! Exact typed boundary for the pinned ICP ledger `query_blocks` path.
//!
//! The upstream `ic-ledger-types` operation enum intentionally lags the pinned
//! ledger DID's `spender` fields, so this module declares that response shape
//! exactly and uses the library only for canonical account validation.
use candid::{CandidType, Deserialize, Int as CandidInt, Principal};
use dtr_wire::{hash, hex, unhex, Result};
use ic_ledger_types::AccountIdentifier;
use serde::Serialize;

pub const LOCAL_NETWORK: &str = "pocketic-local";
pub const MAX_PAGE: u16 = 64;
const INVALID_MEMO: [u8; 8] = [0; 8];

#[derive(Clone, CandidType, Deserialize)]
pub struct LedgerConfig {
    pub network: String,
    pub ledger: Principal,
    pub recipient_account: Vec<u8>,
    pub page_limit: u16,
    pub fallback_seconds: u32,
    pub hint_principal: Option<Principal>,
}

#[derive(Clone, Debug, Default, Serialize, serde::Deserialize)]
#[serde(tag = "mode", rename_all = "snake_case", deny_unknown_fields)]
pub enum SourceState {
    #[default]
    Synthetic,
    Ledger(LedgerSource),
}

#[derive(Clone, Debug, Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct LedgerSource {
    pub network: String,
    pub ledger: String,
    pub recipient_hex: String,
    pub page_limit: u16,
    pub fallback_seconds: u32,
    pub hint_principal: Option<String>,
    pub cursor: u64,
    pub generation: u64,
    pub scan_nonce: u64,
    pub in_flight: bool,
    pub wake_scheduled: bool,
    pub dirty: bool,
    pub last_error: Option<String>,
    pub last_chain_length: Option<u64>,
    pub ledger_calls: u64,
    pub archive_calls: u64,
}

#[derive(Clone, CandidType, Deserialize)]
pub struct SourceStatus {
    pub mode: String,
    pub network: Option<String>,
    pub ledger: Option<Principal>,
    pub recipient_account: Option<Vec<u8>>,
    pub verified_source_watermark: Option<u64>,
    pub generation: Option<u64>,
    pub scan_in_flight: bool,
    pub hint_pending: bool,
    pub last_error: Option<String>,
    pub ledger_calls: u64,
    pub archive_calls: u64,
}

impl SourceState {
    pub fn configured(config: LedgerConfig, cursor: u64) -> Result<(Self, String)> {
        if config.network != LOCAL_NETWORK {
            return Err("runtime-lab ledger mode is confined to pocketic-local".into());
        }
        if config.ledger == Principal::anonymous()
            || !(1..=MAX_PAGE).contains(&config.page_limit)
            || !(1..=3600).contains(&config.fallback_seconds)
        {
            return Err("ledger source configuration bounds".into());
        }
        let recipient = account(&config.recipient_account)?;
        let mut identity = b"DTRICP-SOURCE-01".to_vec();
        identity.extend_from_slice(config.network.as_bytes());
        identity.extend_from_slice(config.ledger.as_slice());
        identity.extend_from_slice(recipient.as_bytes());
        let source_id = hash(&identity);
        Ok((
            Self::Ledger(LedgerSource {
                network: config.network,
                ledger: config.ledger.to_text(),
                recipient_hex: hex(recipient.as_bytes()),
                page_limit: config.page_limit,
                fallback_seconds: config.fallback_seconds,
                hint_principal: config.hint_principal.map(|p| p.to_text()),
                cursor,
                generation: 1,
                scan_nonce: 0,
                in_flight: false,
                wake_scheduled: false,
                dirty: true,
                last_error: None,
                last_chain_length: None,
                ledger_calls: 0,
                archive_calls: 0,
            }),
            source_id,
        ))
    }

    pub fn status(&self) -> Result<SourceStatus> {
        match self {
            Self::Synthetic => Ok(SourceStatus {
                mode: "synthetic".into(),
                network: None,
                ledger: None,
                recipient_account: None,
                verified_source_watermark: None,
                generation: None,
                scan_in_flight: false,
                hint_pending: false,
                last_error: None,
                ledger_calls: 0,
                archive_calls: 0,
            }),
            Self::Ledger(source) => Ok(SourceStatus {
                mode: "ledger".into(),
                network: Some(source.network.clone()),
                ledger: Some(source.principal()?),
                recipient_account: Some(unhex(&source.recipient_hex)?),
                verified_source_watermark: Some(source.cursor),
                generation: Some(source.generation),
                scan_in_flight: source.in_flight,
                hint_pending: source.dirty || source.wake_scheduled,
                last_error: source.last_error.clone(),
                ledger_calls: source.ledger_calls,
                archive_calls: source.archive_calls,
            }),
        }
    }

    pub fn validate(&self) -> Result<()> {
        if let Self::Ledger(source) = self {
            if source.network != LOCAL_NETWORK
                || source.principal()? == Principal::anonymous()
                || !(1..=MAX_PAGE).contains(&source.page_limit)
                || !(1..=3600).contains(&source.fallback_seconds)
                || source.generation == 0
            {
                return Err("durable ledger source configuration".into());
            }
            account(&unhex(&source.recipient_hex)?)?;
            if let Some(principal) = &source.hint_principal {
                Principal::from_text(principal).map_err(|e| e.to_string())?;
            }
        }
        Ok(())
    }
}

impl LedgerSource {
    pub fn principal(&self) -> Result<Principal> {
        Principal::from_text(&self.ledger).map_err(|e| e.to_string())
    }

    pub fn recipient(&self) -> Result<AccountIdentifier> {
        account(&unhex(&self.recipient_hex)?)
    }
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct Tokens {
    pub e8s: u64,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct Timestamp {
    pub timestamp_nanos: u64,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub enum Operation {
    Mint {
        to: Vec<u8>,
        amount: Tokens,
    },
    Burn {
        from: Vec<u8>,
        spender: Option<Vec<u8>>,
        amount: Tokens,
    },
    Transfer {
        from: Vec<u8>,
        to: Vec<u8>,
        amount: Tokens,
        fee: Tokens,
        spender: Option<Vec<u8>>,
    },
    Approve {
        from: Vec<u8>,
        spender: Vec<u8>,
        allowance_e8s: CandidInt,
        allowance: Tokens,
        fee: Tokens,
        expires_at: Option<Timestamp>,
        expected_allowance: Option<Tokens>,
    },
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct Transaction {
    pub memo: u64,
    pub icrc1_memo: Option<Vec<u8>>,
    pub operation: Option<Operation>,
    pub created_at_time: Timestamp,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct Block {
    pub parent_hash: Option<Vec<u8>>,
    pub transaction: Transaction,
    pub timestamp: Timestamp,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct GetBlocksArgs {
    pub start: u64,
    pub length: u64,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct BlockRange {
    pub blocks: Vec<Block>,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub enum QueryArchiveError {
    BadFirstBlockIndex {
        requested_index: u64,
        first_valid_index: u64,
    },
    Other {
        error_code: u64,
        error_message: String,
    },
}

pub type QueryArchiveResult = std::result::Result<BlockRange, QueryArchiveError>;
candid::define_function!(pub QueryArchiveFn : (GetBlocksArgs) -> (QueryArchiveResult) query);

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct ArchivedBlocksRange {
    pub start: u64,
    pub length: u64,
    pub callback: QueryArchiveFn,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct QueryBlocksResponse {
    pub chain_length: u64,
    pub certificate: Option<Vec<u8>>,
    pub blocks: Vec<Block>,
    pub first_block_index: u64,
    pub archived_blocks: Vec<ArchivedBlocksRange>,
}

pub enum PagePlan {
    AtTip {
        chain_length: u64,
    },
    Direct {
        chain_length: u64,
        blocks: Vec<Block>,
    },
    Archive {
        chain_length: u64,
        canister: Principal,
        method: String,
        start: u64,
        length: u64,
    },
}

pub fn plan(response: QueryBlocksResponse, cursor: u64, page_limit: u16) -> Result<PagePlan> {
    if !(1..=MAX_PAGE).contains(&page_limit)
        || response.chain_length < cursor
        || response.blocks.len() > usize::from(page_limit)
        || response.archived_blocks.len() > usize::from(MAX_PAGE)
    {
        return Err("ledger page bounds".into());
    }
    if response.chain_length == cursor {
        if !response.blocks.is_empty() || !response.archived_blocks.is_empty() {
            return Err("ledger returned data beyond reported tip".into());
        }
        return Ok(PagePlan::AtTip {
            chain_length: response.chain_length,
        });
    }
    let request_end = cursor
        .checked_add(u64::from(page_limit))
        .ok_or("ledger request overflow")?
        .min(response.chain_length);
    let mut ranges: Vec<(u64, u64, bool, usize)> = Vec::new();
    if !response.blocks.is_empty() {
        let end = response
            .first_block_index
            .checked_add(response.blocks.len() as u64)
            .ok_or("direct range overflow")?;
        ranges.push((response.first_block_index, end, true, 0));
    }
    for (index, route) in response.archived_blocks.iter().enumerate() {
        let end = route
            .start
            .checked_add(route.length)
            .ok_or("archive range overflow")?;
        if route.length == 0 {
            return Err("empty archive route".into());
        }
        ranges.push((route.start, end, false, index));
    }
    ranges.sort_by_key(|row| row.0);
    let mut previous_end = cursor;
    for &(start, end, _, _) in &ranges {
        if start < cursor || end > request_end || end <= start || start < previous_end {
            return Err("overlapping/out-of-request ledger ranges".into());
        }
        previous_end = end;
    }
    let selected = ranges
        .into_iter()
        .find(|row| row.0 == cursor)
        .ok_or("no validated contiguous ledger prefix")?;
    if selected.2 {
        return Ok(PagePlan::Direct {
            chain_length: response.chain_length,
            blocks: response.blocks,
        });
    }
    let route = &response.archived_blocks[selected.3];
    let callback = route.callback.0.clone();
    if callback.principal == Principal::anonymous()
        || callback.method != "get_blocks"
        || callback.method.len() > 64
    {
        return Err("untrusted archive callback shape".into());
    }
    Ok(PagePlan::Archive {
        chain_length: response.chain_length,
        canister: callback.principal,
        method: callback.method,
        start: route.start,
        length: route.length.min(u64::from(page_limit)),
    })
}

pub fn records_and_anchor(
    blocks: &[Block],
    start: u64,
    recipient: &AccountIdentifier,
    previous_anchor: &str,
) -> Result<(Vec<Option<String>>, String)> {
    if blocks.is_empty() || blocks.len() > usize::from(MAX_PAGE) {
        return Err("ledger block page bounds".into());
    }
    let mut records = Vec::with_capacity(blocks.len());
    for block in blocks {
        if let Some(parent) = &block.parent_hash {
            if parent.len() != 32 {
                return Err("ledger parent hash length".into());
            }
        }
        records.push(classify(&block.transaction, recipient)?);
    }
    let mut anchor = b"DTRICP-ANCHOR-01".to_vec();
    anchor.extend_from_slice(&unhex(previous_anchor)?);
    anchor.extend_from_slice(&start.to_be_bytes());
    anchor.extend_from_slice(&(blocks.len() as u64).to_be_bytes());
    // Candid preserves the ledger's nat64 timestamps without routing them
    // through the project's intentionally JavaScript-safe JSON integer codec.
    anchor.extend_from_slice(
        &candid::encode_one(blocks.to_vec()).map_err(|error| error.to_string())?,
    );
    Ok((records, hash(&anchor)))
}

fn classify(transaction: &Transaction, recipient: &AccountIdentifier) -> Result<Option<String>> {
    let Some(operation) = &transaction.operation else {
        return Ok(None);
    };
    match operation {
        Operation::Mint { to, .. } => {
            account(to)?;
            Ok(None)
        }
        Operation::Burn { from, spender, .. } => {
            account(from)?;
            if let Some(spender) = spender {
                account(spender)?;
            }
            Ok(None)
        }
        Operation::Approve { from, spender, .. } => {
            account(from)?;
            account(spender)?;
            Ok(None)
        }
        Operation::Transfer {
            from,
            to,
            amount,
            spender,
            ..
        } => {
            let from = account(from)?;
            let to = account(to)?;
            let delegated = if let Some(spender) = spender {
                account(spender)?;
                true
            } else {
                false
            };
            if &to != recipient || &from == recipient {
                return Ok(None);
            }
            let memo = if delegated {
                INVALID_MEMO
            } else {
                normalized_memo(transaction.memo, transaction.icrc1_memo.as_deref())
            };
            let mut payload = b"BTZPAY02".to_vec();
            payload.extend_from_slice(from.as_bytes());
            payload.extend_from_slice(&amount.e8s.to_be_bytes());
            payload.extend_from_slice(&memo);
            Ok(Some(hex(&payload)))
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

fn account(bytes: &[u8]) -> Result<AccountIdentifier> {
    AccountIdentifier::from_slice(bytes).map_err(|e| format!("ledger account: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use ic_ledger_types::Subaccount;

    fn account_for(seed: u8) -> AccountIdentifier {
        AccountIdentifier::new(&Principal::from_slice(&[seed]), &Subaccount([0; 32]))
    }

    fn transfer(
        from: AccountIdentifier,
        to: AccountIdentifier,
        memo: u64,
        blob: Option<Vec<u8>>,
        spender: Option<AccountIdentifier>,
    ) -> Transaction {
        Transaction {
            memo,
            icrc1_memo: blob,
            operation: Some(Operation::Transfer {
                from: from.as_bytes().to_vec(),
                to: to.as_bytes().to_vec(),
                amount: Tokens { e8s: 123 },
                fee: Tokens { e8s: 10_000 },
                spender: spender.map(|a| a.as_bytes().to_vec()),
            }),
            created_at_time: Timestamp { timestamp_nanos: 1 },
        }
    }

    fn block() -> Block {
        Block {
            parent_hash: Some(vec![0; 32]),
            transaction: Transaction {
                memo: 0,
                icrc1_memo: None,
                operation: None,
                created_at_time: Timestamp { timestamp_nanos: 1 },
            },
            timestamp: Timestamp { timestamp_nanos: 1 },
        }
    }

    fn archive(start: u64, length: u64, method: &str) -> ArchivedBlocksRange {
        ArchivedBlocksRange {
            start,
            length,
            callback: QueryArchiveFn(candid::Func {
                principal: Principal::from_slice(&[42]),
                method: method.into(),
            }),
        }
    }

    #[test]
    fn valid_payment_is_exact_existing_envelope() {
        let from = account_for(1);
        let to = account_for(2);
        let memo = *b"BTZ\x11\0\0\x40\0";
        let payload = classify(&transfer(from, to, 0, Some(memo.to_vec()), None), &to)
            .unwrap()
            .unwrap();
        let bytes = unhex(&payload).unwrap();
        assert_eq!(&bytes[..8], b"BTZPAY02");
        assert_eq!(&bytes[8..40], from.as_bytes());
        assert_eq!(&bytes[40..48], &123u64.to_be_bytes());
        assert_eq!(&bytes[48..], &memo);
    }

    #[test]
    fn mixed_and_delegated_memos_cannot_issue_commands() {
        let from = account_for(1);
        let to = account_for(2);
        let spender = account_for(3);
        let memo = b"BTZ\x12\0\0\0\x01".to_vec();
        for tx in [
            transfer(from, to, 1, Some(memo.clone()), None),
            transfer(from, to, 0, Some(memo), Some(spender)),
        ] {
            let payload = unhex(&classify(&tx, &to).unwrap().unwrap()).unwrap();
            assert_eq!(&payload[48..], &INVALID_MEMO);
        }
    }

    #[test]
    fn irrelevant_transfer_advances_without_game_input() {
        let from = account_for(1);
        let recipient = account_for(2);
        let other = account_for(3);
        assert_eq!(
            classify(&transfer(from, other, 0, None, None), &recipient).unwrap(),
            None
        );
    }

    #[test]
    fn short_direct_page_is_a_prefix_not_a_tip_jump() {
        let page = plan(
            QueryBlocksResponse {
                chain_length: 12,
                certificate: None,
                blocks: vec![block(), block()],
                first_block_index: 5,
                archived_blocks: vec![],
            },
            5,
            4,
        )
        .unwrap();
        match page {
            PagePlan::Direct {
                chain_length,
                blocks,
            } => {
                assert_eq!(chain_length, 12);
                assert_eq!(blocks.len(), 2);
            }
            _ => panic!("expected direct prefix"),
        }
    }

    #[test]
    fn gaps_overlaps_and_untrusted_archive_methods_are_rejected() {
        let response = |direct_at, routes| QueryBlocksResponse {
            chain_length: 12,
            certificate: None,
            blocks: vec![block()],
            first_block_index: direct_at,
            archived_blocks: routes,
        };
        assert!(plan(response(6, vec![]), 5, 4).is_err());
        assert!(plan(response(6, vec![archive(5, 2, "get_blocks")]), 5, 4).is_err());
        assert!(plan(response(6, vec![archive(5, 1, "arbitrary")]), 5, 4).is_err());
    }
}
