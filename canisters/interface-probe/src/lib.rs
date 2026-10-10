//! Disposable, controller-only interface experiment. NEVER an arena or treasury.
//! No token/cycles transfer endpoints. No mainnet deployment is authorized by S01.
use candid::{CandidType, Principal};
use ic_cdk::call::Call;
use serde::Deserialize;
use std::cell::RefCell;

const COOLDOWN_NS: u64 = 30_000_000_000;
#[derive(Clone)]
struct Config {
    ledger: Principal,
    index: Option<Principal>,
    next_call_at: u64,
}
thread_local! {
    static CONFIG: RefCell<Option<Config>> = const { RefCell::new(None) };
}
#[derive(CandidType, Deserialize)]
struct GetBlocksArgs { start: u64, length: u64 }
#[derive(CandidType, Deserialize)]
struct WireTransaction { memo: u64, icrc1_memo: Option<Vec<u8>> }
#[derive(CandidType, Deserialize)]
struct WireBlock { transaction: WireTransaction }
#[derive(CandidType, Deserialize)]
struct WireArchive { start: u64, length: u64 }
// Candid record-width subtyping intentionally decodes only the fields this probe inspects.
// This does NOT verify encoded hashes, certificates, operations or archive completeness.
#[derive(CandidType, Deserialize)]
struct WirePage {
    chain_length: u64,
    first_block_index: u64,
    blocks: Vec<WireBlock>,
    archived_blocks: Vec<WireArchive>,
}
#[derive(CandidType, Deserialize)]
struct IndexStatus { num_blocks_synced: u64 }
#[derive(CandidType)]
struct Info {
    checkpoint: String,
    mode: String,
    ledger: Option<Principal>,
    index: Option<Principal>,
    certified: bool,
}
#[derive(CandidType)]
struct MemoObservation { legacy: u64, icrc_blob: Option<Vec<u8>> }
#[derive(CandidType)]
struct LedgerObservation {
    chain_length: u64,
    first_returned: Option<u64>,
    returned_blocks: u64,
    archive_ranges: u64,
    memos: Vec<MemoObservation>,
}
#[derive(CandidType)]
struct IndexObservation { ledger: Principal, num_blocks_synced: u64 }

#[ic_cdk::init]
fn init(ledger: Principal, index: Option<Principal>) {
    if ledger == Principal::anonymous() || ledger == Principal::management_canister() {
        ic_cdk::trap("a ledger canister principal is required");
    }
    CONFIG.with(|c| *c.borrow_mut() = Some(Config { ledger, index, next_call_at: 0 }));
}
// The probe has no durable user state. Upgrades require explicit constructor-equivalent configuration.
#[ic_cdk::post_upgrade]
fn post_upgrade(ledger: Principal, index: Option<Principal>) { init(ledger, index); }

fn authorize_and_reserve() -> Result<Config, String> {
    let caller = ic_cdk::api::msg_caller();
    if !ic_cdk::api::is_controller(&caller) { return Err("controller only".into()); }
    let now = ic_cdk::api::time();
    CONFIG.with(|slot| {
        let mut state = slot.borrow_mut();
        let config = state.as_mut().ok_or("probe not initialized")?;
        if now < config.next_call_at { return Err("probe cooldown".into()); }
        config.next_call_at = now.checked_add(COOLDOWN_NS).ok_or("clock overflow")?;
        Ok(config.clone())
    })
}
#[ic_cdk::query]
fn info() -> Info {
    CONFIG.with(|slot| {
        let config = slot.borrow();
        Info {
            checkpoint: "S01".into(),
            mode: "disposable interface probe; no payments; uncertified".into(),
            ledger: config.as_ref().map(|c| c.ledger),
            index: config.as_ref().and_then(|c| c.index),
            certified: false,
        }
    })
}
#[ic_cdk::update]
async fn probe_ledger(start: u64, length: u64) -> Result<LedgerObservation, String> {
    if length == 0 || length > 8 || start.checked_add(length).is_none() {
        return Err("request must contain 1..8 blocks without overflow".into());
    }
    let config = authorize_and_reserve()?;
    let page: WirePage = Call::bounded_wait(config.ledger, "query_blocks")
        .with_arg(GetBlocksArgs { start, length })
        .change_timeout(20)
        .await.map_err(|e| format!("ledger call failed: {e:?}"))?
        .candid().map_err(|e| format!("Candid decode failed: {e:?}"))?;
    if page.blocks.len() > 8 || page.archived_blocks.len() > 8 {
        return Err("unexpected response size".into());
    }
    let first_returned = if page.blocks.is_empty() { None } else { Some(page.first_block_index) };
    let returned_blocks = page.blocks.len() as u64;
    let memos = page.blocks.into_iter().map(|block| MemoObservation {
        legacy: block.transaction.memo,
        icrc_blob: block.transaction.icrc1_memo,
    }).collect();
    Ok(LedgerObservation {
        chain_length: page.chain_length,
        first_returned,
        returned_blocks,
        archive_ranges: page.archived_blocks.len() as u64,
        memos,
    })
}
#[ic_cdk::update]
async fn probe_index() -> Result<IndexObservation, String> {
    let config = authorize_and_reserve()?;
    let index = config.index.ok_or("no index configured")?;
    let ledger: Principal = Call::bounded_wait(index, "ledger_id")
        .change_timeout(20).await.map_err(|e| format!("index ledger-id call: {e:?}"))?
        .candid().map_err(|e| format!("index ledger-id decode: {e:?}"))?;
    if ledger != config.ledger { return Err("index points to a different ledger".into()); }
    let status: IndexStatus = Call::bounded_wait(index, "status")
        .change_timeout(20).await.map_err(|e| format!("index status call: {e:?}"))?
        .candid().map_err(|e| format!("index status decode: {e:?}"))?;
    Ok(IndexObservation { ledger, num_blocks_synced: status.num_blocks_synced })
}
ic_cdk::export_candid!();

#[cfg(test)]
mod tests {
    #[test]
    fn service_has_only_probe_exports() {
        let service = super::__export_service();
        for method in ["info", "probe_ledger", "probe_index"] { assert!(service.contains(method)); }
        for method in ["icrc1_transfer", "icrc2_transfer_from", "deposit_cycles"] { assert!(!service.contains(method)); }
    }
}
