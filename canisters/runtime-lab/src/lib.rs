//! Current runtime/certification laboratory with one local-only ICP ledger ingestion path.
//! It has no transfer, payout, production admission, or mainnet configuration path.
#![forbid(unsafe_code)]
mod source;
use btz_native::{host::BtzHostKernel, world::World};
use candid::{CandidType, Principal};
use dtr_host::observation::{publication, Publication, CHUNK, MAX_ARTIFACT};
use dtr_host::{Action, Coordinator, Identity};
use dtr_wire::{decode, encode, hash, hex, unhex, Int, Result};
use ic_cdk::call::Call;
use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager, VirtualMemory},
    DefaultMemoryImpl, StableBTreeMap, StableCell,
};
use serde::{Deserialize, Serialize};
use source::{
    GetBlocksArgs, LedgerConfig, PagePlan, QueryArchiveResult, QueryBlocksResponse, SourceState,
    SourceStatus,
};
use std::cell::RefCell;
use std::time::Duration;
const ROOT_LIMIT: usize = 65536;
const CHUNKS: u64 = (MAX_ARTIFACT / CHUNK) as u64;
type Memory = VirtualMemory<DefaultMemoryImpl>;
thread_local! {
    static MANAGER:RefCell<MemoryManager<DefaultMemoryImpl>>=RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
    // This is a NEW laboratory schema, not an in-place migration of arena-lab v4.
    static ROOT:RefCell<StableCell<Vec<u8>,Memory>>=RefCell::new(StableCell::init(memory(0),Vec::new()));
    static BLOBS:RefCell<StableBTreeMap<u64,Vec<u8>,Memory>>=RefCell::new(StableBTreeMap::init(memory(1)));
}
fn memory(id: u8) -> Memory {
    MANAGER.with(|m| m.borrow().get(MemoryId::new(id)))
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Blob {
    length: usize,
    sha256: String,
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Root {
    version: u32,
    revision: u64,
    image: Blob,
    publication_hex: String,
    publication_hash: String,
    #[serde(default)]
    source: SourceState,
}
#[derive(CandidType, Deserialize)]
struct Status {
    version: u32,
    revision: u64,
    publication_hash: String,
    synthetic_inputs_only: bool,
    source: SourceStatus,
}
#[derive(CandidType, Deserialize)]
struct Observation {
    publication: Vec<u8>,
    certificate: Option<Vec<u8>>,
}
#[derive(CandidType, Deserialize)]
struct ControllerWork {
    revision: u64,
    phase: Option<String>,
    ready_manifest: Option<String>,
    pending_inputs: u32,
    source_cursor: u64,
}
fn authorized() -> Result<()> {
    if !ic_cdk::api::is_controller(&ic_cdk::api::msg_caller()) {
        return Err("controller-only synthetic laboratory".into());
    }
    Ok(())
}
fn describe(bytes: &[u8]) -> Result<Blob> {
    if bytes.len() > MAX_ARTIFACT {
        return Err("laboratory artifact capacity".into());
    }
    Ok(Blob {
        length: bytes.len(),
        sha256: hash(bytes),
    })
}
fn root() -> Result<Root> {
    let bytes = ROOT.with(|c| c.borrow().get().clone());
    if bytes.is_empty() || bytes.len() > ROOT_LIMIT {
        return Err("missing/oversize root; no genesis fallback".into());
    }
    let r: Root = decode(&bytes)?;
    if r.version != 6 || r.revision > (1u64 << 53) - 1 || r.image.length > MAX_ARTIFACT {
        return Err("incompatible laboratory schema".into());
    }
    r.source.validate()?;
    let pb = unhex(&r.publication_hex)?;
    let p: Publication = decode(&pb)?;
    if hash(&pb) != r.publication_hash
        || p.version != 6
        || p.render_format.is_some()
        || p.chunk_bytes != CHUNK
        || p.artifacts.len() != 3
    {
        return Err("publication root mismatch".into());
    }
    Ok(r)
}
fn read_blob(slot: u64, b: &Blob) -> Result<Vec<u8>> {
    if slot >= 4 || b.length > MAX_ARTIFACT {
        return Err("blob bounds".into());
    }
    let mut out = Vec::with_capacity(b.length);
    BLOBS.with(|m| -> Result<()> {
        let m = m.borrow();
        for index in 0..b.length.div_ceil(CHUNK) {
            let bytes = m
                .get(&(slot * CHUNKS + index as u64))
                .ok_or("missing stable chunk")?;
            if bytes.len() != CHUNK.min(b.length - index * CHUNK) {
                return Err("stable chunk length".into());
            }
            out.extend(bytes);
        }
        Ok(())
    })?;
    if hash(&out) != b.sha256 {
        return Err("stable blob integrity".into());
    }
    Ok(out)
}
fn status(r: &Root) -> Status {
    Status {
        version: 6,
        revision: r.revision,
        publication_hash: r.publication_hash.clone(),
        synthetic_inputs_only: matches!(r.source, SourceState::Synthetic),
        source: r.source.status().expect("validated durable source"),
    }
}
fn host(r: &Root) -> Result<Coordinator<BtzHostKernel>> {
    let host = Coordinator::restore(&read_blob(0, &r.image)?, &r.image.sha256, BtzHostKernel)?;
    if let SourceState::Ledger(source) = &r.source {
        let cursor: u64 = host
            .record
            .inbox
            .cursor
            .0
            .to_string()
            .parse()
            .map_err(|_| "coordinator cursor is not u64")?;
        if cursor != source.cursor
            || host.record.inbox.source_id != host.record.journal.identity.source_id
        {
            return Err("ledger source/coordinator divergence".into());
        }
    }
    Ok(host)
}
fn persist(
    h: &Coordinator<BtzHostKernel>,
    old: Option<&Root>,
    source: SourceState,
) -> Result<Root> {
    let image = h.snapshot()?;
    let image_descriptor = describe(&image)?;
    let view = publication(&h.record)?;
    let r = Root {
        version: 6,
        revision: h.record.revision,
        image: image_descriptor,
        publication_hex: hex(&view.bytes),
        publication_hash: view.sha256,
        source,
    };
    let root_bytes = encode(&r)?;
    if root_bytes.len() > ROOT_LIMIT {
        return Err("root capacity".into());
    }
    let certified_root = unhex(&r.publication_hash)?;
    if certified_root.len() != 32 {
        return Err("certified root shape".into());
    }
    let old_descriptors = old
        .map(|r| decode::<Publication>(&unhex(&r.publication_hex)?))
        .transpose()?
        .map(|p| p.artifacts);
    let mut writes = vec![(0u64, image)];
    for (index, bytes) in view.artifacts.into_iter().enumerate() {
        describe(&bytes)?;
        let changed = old_descriptors
            .as_ref()
            .is_none_or(|a| a[index].sha256 != view.data.artifacts[index].sha256);
        if changed {
            writes.push((index as u64 + 1, bytes));
        }
    }
    // All Result-returning preparation above. No await after writes begin.
    // Stable-write/chunk allocations below must trap on failure, never return an error reply.
    // Any failure here must trap so the whole message, including certified_data, rolls back.
    BLOBS.with(|m| {
        let mut m = m.borrow_mut();
        for (slot, bytes) in writes {
            for i in 0..CHUNKS {
                let key = slot * CHUNKS + i;
                let at = i as usize * CHUNK;
                if at < bytes.len() {
                    m.insert(key, bytes[at..bytes.len().min(at + CHUNK)].to_vec());
                } else {
                    m.remove(&key);
                }
            }
        }
    });
    ROOT.with(|c| {
        c.borrow_mut().set(root_bytes);
    });
    ic_cdk::api::certified_data_set(certified_root);
    Ok(r)
}
fn save_root_only(r: &Root) -> Result<()> {
    r.source.validate()?;
    let bytes = encode(r)?;
    if bytes.len() > ROOT_LIMIT {
        return Err("root capacity".into());
    }
    // A stable write failure must trap so callers never observe an acknowledged partial write.
    ROOT.with(|cell| cell.borrow_mut().set(bytes));
    Ok(())
}
fn install_source_timer(source: &SourceState) {
    if let SourceState::Ledger(source) = source {
        let delay = Duration::from_secs(u64::from(source.fallback_seconds));
        ic_cdk_timers::set_timer(delay, async move {
            let _ = scan_ledger_inner().await;
            // A one-shot timer prevents a large test-clock jump (or a long
            // canister pause) from queuing every missed interval at once.
            // Re-arm only after the bounded scan has returned.
            if let Ok(root) = root() {
                install_source_timer(&root.source);
            }
        });
    }
}
#[ic_cdk::init]
fn init(
    initial_world: Vec<u8>,
    synthetic_source_id: String,
    source_from: u64,
    logical_start: u64,
    ledger: Option<LedgerConfig>,
) {
    if ROOT.with(|c| !c.borrow().get().is_empty()) {
        ic_cdk::trap("refusing initialization over durable root");
    }
    let initialize = || -> Result<()> {
        let w = World::decode(&initial_world)?;
        if !w.time.0.is_integer() || w.time.0.to_integer() != Int(logical_start.into()).0 {
            return Err("genesis logical time".into());
        }
        let (source, source_id) = match ledger {
            Some(config) => SourceState::configured(config, source_from)?,
            None => (SourceState::Synthetic, synthetic_source_id),
        };
        let mut identity = btz_native::identity()?;
        identity["source_id"] = serde_json::Value::String(source_id);
        let identity: Identity = serde_json::from_value(identity).map_err(|e| e.to_string())?;
        let h = Coordinator::create(
            &initial_world,
            identity,
            logical_start,
            source_from,
            "00".repeat(32),
            BtzHostKernel,
        )?;
        let root = persist(&h, None, source)?;
        install_source_timer(&root.source);
        Ok(())
    };
    if let Err(e) = initialize() {
        ic_cdk::trap(&e);
    }
}
#[ic_cdk::post_upgrade]
fn post_upgrade() {
    let verify = || -> Result<()> {
        let mut r = root()?;
        let h = host(&r)?;
        let view = publication(&h.record)?;
        if view.sha256 != r.publication_hash {
            return Err("durable host/publication divergence".into());
        }
        for (index, a) in view.data.artifacts.iter().enumerate() {
            read_blob(
                index as u64 + 1,
                &Blob {
                    length: a.length,
                    sha256: a.sha256.clone(),
                },
            )?;
        }
        if let SourceState::Ledger(source) = &mut r.source {
            source.in_flight = false;
            source.wake_scheduled = false;
            source.dirty = true;
            source.scan_nonce = source
                .scan_nonce
                .checked_add(1)
                .ok_or("scan nonce exhausted")?;
            source.last_error = Some("upgrade interrupted or rescheduled ledger scan".into());
            save_root_only(&r)?;
        }
        ic_cdk::api::certified_data_set(unhex(&r.publication_hash)?);
        install_source_timer(&r.source);
        Ok(())
    };
    if let Err(e) = verify() {
        ic_cdk::trap(&e);
    }
}
#[ic_cdk::query]
fn lab_status() -> std::result::Result<Status, String> {
    Ok(status(&root()?))
}
#[ic_cdk::query]
fn controller_work() -> std::result::Result<ControllerWork, String> {
    authorized()?;
    let r = root()?;
    let h = host(&r)?;
    let source_cursor = h
        .record
        .inbox
        .cursor
        .0
        .to_string()
        .parse()
        .map_err(|_| "coordinator cursor is not u64")?;
    let (phase, ready_manifest) = h
        .record
        .journal
        .stage
        .as_ref()
        .map_or((None, None), |stage| {
            (Some(stage.phase.clone()), stage.ready_hash.clone())
        });
    Ok(ControllerWork {
        revision: r.revision,
        phase,
        ready_manifest,
        pending_inputs: h.record.inbox.pending.len() as u32,
        source_cursor,
    })
}
#[ic_cdk::query]
fn observation() -> std::result::Result<Observation, String> {
    let r = root()?;
    Ok(Observation {
        publication: unhex(&r.publication_hex)?,
        certificate: ic_cdk::api::data_certificate(),
    })
}
#[ic_cdk::query]
fn artifact_chunk(
    expected_publication: String,
    kind: u8,
    index: u16,
) -> std::result::Result<Vec<u8>, String> {
    let r = root()?;
    if expected_publication != r.publication_hash {
        return Err("stale observation publication".into());
    }
    let p: Publication = decode(&unhex(&r.publication_hex)?)?;
    let a = p
        .artifacts
        .get(kind as usize)
        .ok_or("public artifact kind")?;
    if index as usize >= a.chunks.len() {
        return Err("chunk bounds".into());
    }
    // O(root + one chunk), never deserialize the hidden simulation cursor in a public chunk query.
    let bytes = BLOBS
        .with(|m| m.borrow().get(&((kind as u64 + 1) * CHUNKS + index as u64)))
        .ok_or("missing public chunk")?;
    if bytes.len() != CHUNK.min(a.length - index as usize * CHUNK)
        || hash(&bytes) != a.chunks[index as usize]
    {
        return Err("public chunk integrity".into());
    }
    Ok(bytes)
}
#[ic_cdk::update]
fn apply(expected_revision: u64, canonical_action: Vec<u8>) -> std::result::Result<Status, String> {
    authorized()?;
    if canonical_action.len() > 65536 {
        return Err("laboratory action capacity".into());
    }
    let r = root()?;
    if expected_revision != r.revision {
        return Err("stale laboratory revision".into());
    }
    let a: Action = decode(&canonical_action)?;
    if matches!(r.source, SourceState::Ledger(_)) && matches!(&a, Action::Ingest { .. }) {
        return Err("ledger-fed mode rejects generic synthetic ingestion".into());
    }
    if matches!(&a,Action::Step{budget}if *budget>100000) {
        return Err("laboratory step capacity".into());
    }
    let mut h = host(&r)?;
    h.apply(a)?;
    if h.record.revision == r.revision {
        return Ok(status(&r));
    }
    let next = persist(&h, Some(&r), r.source.clone())?;
    Ok(status(&next))
}

#[derive(Clone)]
struct ScanLease {
    ledger: Principal,
    generation: u64,
    nonce: u64,
    cursor: u64,
    page_limit: u16,
}

fn lease_matches(source: &source::LedgerSource, lease: &ScanLease) -> bool {
    source.generation == lease.generation
        && source.scan_nonce == lease.nonce
        && source.cursor == lease.cursor
        && source.in_flight
        && source.ledger == lease.ledger.to_text()
}

fn begin_scan() -> Result<std::result::Result<ScanLease, Status>> {
    let mut r = root()?;
    let source = match &mut r.source {
        SourceState::Synthetic => return Err("ledger source is not configured".into()),
        SourceState::Ledger(source) => source,
    };
    source.wake_scheduled = false;
    if source.in_flight {
        source.dirty = true;
        save_root_only(&r)?;
        return Ok(Err(status(&r)));
    }
    source.scan_nonce = source
        .scan_nonce
        .checked_add(1)
        .ok_or("scan nonce exhausted")?;
    source.ledger_calls = source
        .ledger_calls
        .checked_add(1)
        .ok_or("ledger call counter")?;
    source.in_flight = true;
    let lease = ScanLease {
        ledger: source.principal()?,
        generation: source.generation,
        nonce: source.scan_nonce,
        cursor: source.cursor,
        page_limit: source.page_limit,
    };
    save_root_only(&r)?;
    Ok(Ok(lease))
}

fn finish_error(lease: &ScanLease, error: String) -> Result<Status> {
    let mut r = root()?;
    let source = match &mut r.source {
        SourceState::Ledger(source) if lease_matches(source, lease) => source,
        _ => return Ok(status(&r)),
    };
    source.in_flight = false;
    source.wake_scheduled = false;
    source.dirty = true;
    source.last_error = Some(error);
    save_root_only(&r)?;
    Ok(status(&r))
}

fn finish_tip(lease: &ScanLease, chain_length: u64) -> Result<Status> {
    let mut r = root()?;
    let source = match &mut r.source {
        SourceState::Ledger(source) if lease_matches(source, lease) => source,
        _ => return Ok(status(&r)),
    };
    source.in_flight = false;
    source.wake_scheduled = false;
    source.dirty = false;
    source.last_error = None;
    source.last_chain_length = Some(chain_length);
    save_root_only(&r)?;
    Ok(status(&r))
}

fn finish_blocks(
    lease: &ScanLease,
    chain_length: u64,
    blocks: Vec<source::Block>,
    archived: bool,
) -> Result<Status> {
    if blocks.is_empty() || blocks.len() > usize::from(lease.page_limit) {
        return finish_error(lease, "empty/oversize contiguous ledger response".into());
    }
    let mut r = root()?;
    let current = match &r.source {
        SourceState::Ledger(source) if lease_matches(source, lease) => source.clone(),
        _ => return Ok(status(&r)),
    };
    let end = lease
        .cursor
        .checked_add(blocks.len() as u64)
        .ok_or("source cursor overflow")?;
    if end > chain_length {
        return finish_error(lease, "ledger page extends beyond reported chain".into());
    }
    let (records, anchor) = source::records_and_anchor(
        &blocks,
        lease.cursor,
        &current.recipient()?,
        &host(&r)?.record.inbox.source_anchor,
    )?;
    let mut coordinator = host(&r)?;
    coordinator.apply(Action::Ingest {
        start: Int(lease.cursor.into()),
        records,
        anchor,
    })?;
    let mut next_source = r.source.clone();
    let next = match &mut next_source {
        SourceState::Ledger(source) if lease_matches(source, lease) => source,
        _ => return Ok(status(&r)),
    };
    next.cursor = end;
    next.in_flight = false;
    next.wake_scheduled = false;
    next.dirty = end < chain_length;
    next.last_error = None;
    next.last_chain_length = Some(chain_length);
    if archived {
        next.archive_calls = next
            .archive_calls
            .checked_add(1)
            .ok_or("archive call counter")?;
    }
    r = persist(&coordinator, Some(&r), next_source)?;
    Ok(status(&r))
}

async fn scan_ledger_inner() -> Result<Status> {
    let lease = match begin_scan()? {
        Ok(lease) => lease,
        Err(status) => return Ok(status),
    };
    let response: QueryBlocksResponse = match Call::bounded_wait(lease.ledger, "query_blocks")
        .change_timeout(30)
        .with_arg(GetBlocksArgs {
            start: lease.cursor,
            length: u64::from(lease.page_limit),
        })
        .await
    {
        Ok(response) => match response.candid() {
            Ok(response) => response,
            Err(error) => {
                return finish_error(&lease, format!("ledger response decode: {error:?}"))
            }
        },
        Err(error) => return finish_error(&lease, format!("ledger call rejected: {error:?}")),
    };
    let plan = match source::plan(response, lease.cursor, lease.page_limit) {
        Ok(plan) => plan,
        Err(error) => return finish_error(&lease, error),
    };
    match plan {
        PagePlan::AtTip { chain_length } => finish_tip(&lease, chain_length),
        PagePlan::Direct {
            chain_length,
            blocks,
        } => finish_blocks(&lease, chain_length, blocks, false),
        PagePlan::Archive {
            chain_length,
            canister,
            method,
            start,
            length,
        } => {
            let response: QueryArchiveResult = match Call::bounded_wait(canister, &method)
                .change_timeout(30)
                .with_arg(GetBlocksArgs { start, length })
                .await
            {
                Ok(response) => match response.candid() {
                    Ok(response) => response,
                    Err(error) => {
                        return finish_error(&lease, format!("archive response decode: {error:?}"))
                    }
                },
                Err(error) => {
                    return finish_error(&lease, format!("archive call rejected: {error:?}"))
                }
            };
            match response {
                Ok(range) if start == lease.cursor && range.blocks.len() as u64 <= length => {
                    finish_blocks(&lease, chain_length, range.blocks, true)
                }
                Ok(_) => finish_error(
                    &lease,
                    "archive returned wrong/oversize contiguous range".into(),
                ),
                Err(error) => finish_error(&lease, format!("archive range rejected: {error:?}")),
            }
        }
    }
}

#[ic_cdk::update]
async fn sync_ledger() -> std::result::Result<Status, String> {
    authorized()?;
    scan_ledger_inner().await
}

#[ic_cdk::update]
fn ledger_hint() -> std::result::Result<Status, String> {
    let mut r = root()?;
    let source = match &mut r.source {
        SourceState::Synthetic => return Err("ledger source is not configured".into()),
        SourceState::Ledger(source) => source,
    };
    if let Some(expected) = &source.hint_principal {
        let expected = Principal::from_text(expected).map_err(|e| e.to_string())?;
        if ic_cdk::api::msg_caller() != expected
            && !ic_cdk::api::is_controller(&ic_cdk::api::msg_caller())
        {
            return Err("untrusted ledger hint caller".into());
        }
    }
    source.dirty = true;
    let schedule = !source.wake_scheduled;
    if schedule {
        source.wake_scheduled = true;
    }
    save_root_only(&r)?;
    if schedule {
        ic_cdk_timers::set_timer(Duration::ZERO, async {
            let _ = scan_ledger_inner().await;
        });
    }
    Ok(status(&r))
}

#[cfg(feature = "test-hooks")]
#[ic_cdk::update]
fn test_trap_after_root_write(expected_revision: u64) {
    if let Err(error) = authorized() {
        ic_cdk::trap(&error);
    }
    let mut r = root().unwrap_or_else(|error| ic_cdk::trap(&error));
    if r.revision != expected_revision {
        ic_cdk::trap("stale laboratory revision");
    }
    r.publication_hash = "ff".repeat(32);
    save_root_only(&r).unwrap_or_else(|error| ic_cdk::trap(&error));
    ic_cdk::trap("intentional test-only rollback after stable write");
}
ic_cdk::export_candid!();

#[cfg(test)]
mod tests {
    use super::*;
    use ic_ledger_types::{AccountIdentifier, DEFAULT_SUBACCOUNT};

    #[test]
    fn print_generated_candid() {
        let generated = super::__export_service();
        println!("DTR_RUNTIME_CANDID_BEGIN");
        println!("{generated}");
        println!("DTR_RUNTIME_CANDID_END");
        candid_parser::utils::service_equal(
            candid_parser::utils::CandidSource::Text(&generated),
            candid_parser::utils::CandidSource::Text(include_str!("../runtime-lab.did")),
        )
        .expect("generated and declared Candid differ semantically");
    }

    #[test]
    fn scan_lease_fences_every_await_identity() {
        let ledger = Principal::from_slice(&[1]);
        let recipient = AccountIdentifier::new(&Principal::from_slice(&[2]), &DEFAULT_SUBACCOUNT);
        let (state, _) = SourceState::configured(
            LedgerConfig {
                network: source::LOCAL_NETWORK.into(),
                ledger,
                recipient_account: recipient.as_bytes().to_vec(),
                page_limit: 4,
                fallback_seconds: 60,
                hint_principal: None,
            },
            7,
        )
        .unwrap();
        let SourceState::Ledger(mut source) = state else {
            panic!("expected ledger source")
        };
        source.in_flight = true;
        source.scan_nonce = 9;
        let lease = ScanLease {
            ledger,
            generation: source.generation,
            nonce: 9,
            cursor: 7,
            page_limit: 4,
        };
        assert!(lease_matches(&source, &lease));
        source.generation += 1;
        assert!(!lease_matches(&source, &lease));
        source.generation -= 1;
        source.scan_nonce += 1;
        assert!(!lease_matches(&source, &lease));
        source.scan_nonce -= 1;
        source.cursor += 1;
        assert!(!lease_matches(&source, &lease));
    }
}
