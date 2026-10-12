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
const PUBLICATION_CHUNKS: u64 = dtr_host::observation::MAX_PUBLICATION.div_ceil(CHUNK) as u64;
const RETAINED_STRIDE: u64 = PUBLICATION_CHUNKS + 3 * CHUNKS;
const RETAINED_SEGMENTS: usize = 3;
const RETAINED_BYTES: usize = 8 * 1024 * 1024;
const SCAN_CALL_TIMEOUT_SECONDS: u32 = 30;
const SCAN_LEASE_SECONDS: u64 = 45;
type Memory = VirtualMemory<DefaultMemoryImpl>;
thread_local! {
    static MANAGER:RefCell<MemoryManager<DefaultMemoryImpl>>=RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
    // This is a NEW laboratory schema, not an in-place migration of arena-lab v4.
    static ROOT:RefCell<StableCell<Vec<u8>,Memory>>=RefCell::new(StableCell::init(memory(0),Vec::new()));
    static BLOBS:RefCell<StableBTreeMap<u64,Vec<u8>,Memory>>=RefCell::new(StableBTreeMap::init(memory(1)));
    static RETAINED:RefCell<StableBTreeMap<u64,Vec<u8>,Memory>>=RefCell::new(StableBTreeMap::init(memory(2)));
    static RUN_TIMER:RefCell<Option<ic_cdk_timers::TimerId>>=const { RefCell::new(None) };
    #[cfg(feature = "test-hooks")]
    static TEST_SCAN_FAULT:RefCell<Option<u8>>=const { RefCell::new(None) };
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
#[derive(Clone, Default, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct RetentionState {
    history: Vec<RetainedMeta>,
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct RetainedMeta {
    segment_id: u64,
    publication_hash: String,
    publication_length: usize,
    artifact_lengths: [usize; 3],
    bytes: usize,
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct RunState {
    running: bool,
    generation: u64,
    segment_ticks: u64,
    pacing_seconds: u32,
    work_budget: u32,
    callback_count: u64,
    completed_segments: u64,
    current_segment_work: u64,
    last_segment_work: u64,
    total_work: u64,
    max_segment_work: u64,
    last_error: Option<String>,
}
impl Default for RunState {
    fn default() -> Self {
        Self {
            running: false,
            generation: 0,
            segment_ticks: 2,
            pacing_seconds: 1,
            work_budget: 100_000,
            callback_count: 0,
            completed_segments: 0,
            current_segment_work: 0,
            last_segment_work: 0,
            total_work: 0,
            max_segment_work: 0,
            last_error: None,
        }
    }
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
    #[serde(default)]
    run: RunState,
    #[serde(default)]
    retention: RetentionState,
}
#[derive(Clone, CandidType, Deserialize)]
struct RunConfig {
    segment_ticks: u64,
    pacing_seconds: u32,
    work_budget: u32,
}
#[derive(CandidType, Deserialize)]
struct RunStatus {
    running: bool,
    generation: u64,
    segment_ticks: u64,
    pacing_seconds: u32,
    work_budget: u32,
    callback_count: u64,
    completed_segments: u64,
    current_segment_work: u64,
    last_segment_work: u64,
    total_work: u64,
    max_segment_work: u64,
    last_error: Option<String>,
}
#[derive(CandidType, Deserialize)]
struct RetainedEntry {
    segment_id: u64,
    publication_hash: String,
    bytes: u64,
    current: bool,
}
#[derive(CandidType, Deserialize)]
struct RetentionStatus {
    max_segments: u16,
    max_bytes: u64,
    retained_bytes: u64,
    entries: Vec<RetainedEntry>,
}
#[derive(CandidType, Deserialize)]
struct Status {
    version: u32,
    revision: u64,
    publication_hash: String,
    synthetic_inputs_only: bool,
    source: SourceStatus,
    run: RunStatus,
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
#[cfg(feature = "test-hooks")]
#[derive(CandidType, Deserialize)]
struct TestScanState {
    nonce: u64,
    cursor: u64,
    started_at_seconds: u64,
    expired: bool,
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
fn number(value: &Int) -> Result<u64> {
    value
        .0
        .to_string()
        .parse()
        .map_err(|_| "unsigned 64-bit field".into())
}
fn publication_segment(publication: &Publication) -> Result<Option<u64>> {
    publication.head.segment_id.as_ref().map(number).transpose()
}
fn reconcile_completed_segments(run: &mut RunState, publication: &Publication) -> Result<bool> {
    let committed = publication_segment(publication)?
        .map(|segment| segment.checked_add(1).ok_or("autonomous segment counter"))
        .transpose()?
        .unwrap_or(0);
    if run.completed_segments > committed {
        return Err("autonomous/publication segment divergence".into());
    }
    let changed = run.completed_segments != committed;
    run.completed_segments = committed;
    Ok(changed)
}
fn validate_run(run: &RunState) -> Result<()> {
    if run.segment_ticks == 0
        || run.segment_ticks > 64
        || run.pacing_seconds == 0
        || run.pacing_seconds > 60
        || run.work_budget == 0
        || run.work_budget > 100_000
    {
        return Err("autonomous run configuration bounds".into());
    }
    Ok(())
}
fn validate_retention(retention: &RetentionState, current: &Publication) -> Result<()> {
    if retention.history.len() >= RETAINED_SEGMENTS {
        return Err("retention count".into());
    }
    let current_segment = publication_segment(current)?;
    let mut previous = None;
    let mut bytes = 0usize;
    for entry in &retention.history {
        if entry.publication_hash.len() != 64
            || unhex(&entry.publication_hash)?.len() != 32
            || entry.publication_length > dtr_host::observation::MAX_PUBLICATION
            || entry
                .artifact_lengths
                .iter()
                .any(|length| *length > MAX_ARTIFACT)
            || entry.bytes
                != entry.publication_length + entry.artifact_lengths.iter().copied().sum::<usize>()
            || previous.is_some_and(|prior| entry.segment_id != prior + 1)
        {
            return Err("retention metadata".into());
        }
        previous = Some(entry.segment_id);
        bytes = bytes
            .checked_add(entry.bytes)
            .ok_or("retention byte count")?;
    }
    if let (Some(last), Some(current)) = (previous, current_segment) {
        if last.checked_add(1) != Some(current) {
            return Err("retention continuity".into());
        }
    }
    let current_size =
        current
            .artifacts
            .iter()
            .try_fold(encode(current)?.len(), |total, artifact| {
                total
                    .checked_add(artifact.length)
                    .ok_or("retention byte count")
            })?;
    if bytes
        .checked_add(current_size)
        .ok_or("retention byte count")?
        > RETAINED_BYTES
    {
        return Err("retention bounds".into());
    }
    Ok(())
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
    validate_run(&r.run)?;
    validate_retention(&r.retention, &p)?;
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
fn retained_key(segment_id: u64, offset: u64) -> Result<u64> {
    if offset >= RETAINED_STRIDE {
        return Err("retained storage offset".into());
    }
    segment_id
        .checked_mul(RETAINED_STRIDE)
        .and_then(|base| base.checked_add(offset))
        .ok_or_else(|| "retained storage key".into())
}
fn read_retained_bytes(meta: &RetainedMeta, offset: u64, length: usize) -> Result<Vec<u8>> {
    if length > MAX_ARTIFACT.max(dtr_host::observation::MAX_PUBLICATION) {
        return Err("retained blob bounds".into());
    }
    let mut out = Vec::with_capacity(length);
    RETAINED.with(|map| -> Result<()> {
        let map = map.borrow();
        for chunk in 0..length.div_ceil(CHUNK) {
            let key = retained_key(meta.segment_id, offset + chunk as u64)?;
            let bytes = map.get(&key).ok_or("missing retained chunk")?;
            if bytes.len() != CHUNK.min(length - chunk * CHUNK) {
                return Err("retained chunk length".into());
            }
            out.extend(bytes);
        }
        Ok(())
    })?;
    Ok(out)
}
fn retained_publication_bytes(meta: &RetainedMeta) -> Result<Vec<u8>> {
    let bytes = read_retained_bytes(meta, 0, meta.publication_length)?;
    if hash(&bytes) != meta.publication_hash {
        return Err("retained publication integrity".into());
    }
    Ok(bytes)
}
fn publication_size(bytes: &[u8], publication: &Publication) -> Result<usize> {
    publication
        .artifacts
        .iter()
        .try_fold(bytes.len(), |total, artifact| {
            total
                .checked_add(artifact.length)
                .ok_or("publication byte count".into())
        })
}
fn retained_meta(bytes: &[u8], publication: &Publication) -> Result<RetainedMeta> {
    let segment_id =
        publication_segment(publication)?.ok_or("genesis is not a completed segment")?;
    let artifact_lengths: [usize; 3] = publication
        .artifacts
        .iter()
        .map(|artifact| artifact.length)
        .collect::<Vec<_>>()
        .try_into()
        .map_err(|_| "retained artifact count")?;
    Ok(RetainedMeta {
        segment_id,
        publication_hash: hash(bytes),
        publication_length: bytes.len(),
        artifact_lengths,
        bytes: publication_size(bytes, publication)?,
    })
}
fn status(r: &Root) -> Status {
    Status {
        version: 6,
        revision: r.revision,
        publication_hash: r.publication_hash.clone(),
        synthetic_inputs_only: matches!(r.source, SourceState::Synthetic),
        source: r.source.status().expect("validated durable source"),
        run: RunStatus {
            running: r.run.running,
            generation: r.run.generation,
            segment_ticks: r.run.segment_ticks,
            pacing_seconds: r.run.pacing_seconds,
            work_budget: r.run.work_budget,
            callback_count: r.run.callback_count,
            completed_segments: r.run.completed_segments,
            current_segment_work: r.run.current_segment_work,
            last_segment_work: r.run.last_segment_work,
            total_work: r.run.total_work,
            max_segment_work: r.run.max_segment_work,
            last_error: r.run.last_error.clone(),
        },
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
    run: RunState,
) -> Result<Root> {
    persist_inner(h, old, source, run, true)
}

fn persist_inner(
    h: &Coordinator<BtzHostKernel>,
    old: Option<&Root>,
    source: SourceState,
    run: RunState,
    update_certified_data: bool,
) -> Result<Root> {
    let image = h.snapshot()?;
    let image_descriptor = describe(&image)?;
    let view = publication(&h.record)?;
    let mut retention = old.map(|root| root.retention.clone()).unwrap_or_default();
    let mut retained_writes = Vec::<(u64, Vec<u8>)>::new();
    let mut evicted = Vec::<u64>::new();
    if let Some(old) = old.filter(|old| old.publication_hash != view.sha256) {
        let old_bytes = unhex(&old.publication_hex)?;
        let old_publication: Publication = decode(&old_bytes)?;
        if publication_segment(&old_publication)?.is_some() {
            let meta = retained_meta(&old_bytes, &old_publication)?;
            if retention
                .history
                .last()
                .is_some_and(|entry| entry.segment_id >= meta.segment_id)
            {
                return Err("retention publication order".into());
            }
            for (chunk, bytes) in old_bytes.chunks(CHUNK).enumerate() {
                retained_writes
                    .push((retained_key(meta.segment_id, chunk as u64)?, bytes.to_vec()));
            }
            for (kind, artifact) in old_publication.artifacts.iter().enumerate() {
                let bytes = read_blob(
                    kind as u64 + 1,
                    &Blob {
                        length: artifact.length,
                        sha256: artifact.sha256.clone(),
                    },
                )?;
                for (chunk, bytes) in bytes.chunks(CHUNK).enumerate() {
                    retained_writes.push((
                        retained_key(
                            meta.segment_id,
                            PUBLICATION_CHUNKS + kind as u64 * CHUNKS + chunk as u64,
                        )?,
                        bytes.to_vec(),
                    ));
                }
            }
            retention.history.push(meta);
        }
    }
    let current_size = publication_size(&view.bytes, &view.data)?;
    if current_size > RETAINED_BYTES {
        return Err("publication exceeds retention byte capacity".into());
    }
    let mut retained_size = retention
        .history
        .iter()
        .map(|entry| entry.bytes)
        .sum::<usize>();
    while retention.history.len() + 1 > RETAINED_SEGMENTS
        || retained_size
            .checked_add(current_size)
            .ok_or("retention byte count")?
            > RETAINED_BYTES
    {
        let entry = retention.history.remove(0);
        retained_size -= entry.bytes;
        evicted.push(entry.segment_id);
    }
    retained_writes.retain(|(key, _)| !evicted.contains(&(key / RETAINED_STRIDE)));
    let r = Root {
        version: 6,
        revision: h.record.revision,
        image: image_descriptor,
        publication_hex: hex(&view.bytes),
        publication_hash: view.sha256,
        source,
        run,
        retention,
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
    RETAINED.with(|map| {
        let mut map = map.borrow_mut();
        for segment in evicted {
            for offset in 0..RETAINED_STRIDE {
                map.remove(&retained_key(segment, offset).expect("validated retained key"));
            }
        }
        for (key, bytes) in retained_writes {
            map.insert(key, bytes);
        }
    });
    ROOT.with(|c| {
        c.borrow_mut().set(root_bytes);
    });
    if update_certified_data {
        ic_cdk::api::certified_data_set(certified_root);
    }
    Ok(r)
}
fn save_root_only(r: &Root) -> Result<()> {
    r.source.validate()?;
    validate_run(&r.run)?;
    let publication: Publication = decode(&unhex(&r.publication_hex)?)?;
    validate_retention(&r.retention, &publication)?;
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
            // Arm the next one-shot before the external await. If a response
            // callback traps and cancels this task, the fallback chain remains.
            if let Ok(root) = root() {
                install_source_timer(&root.source);
            }
            let _ = scan_ledger_inner().await;
        });
    }
}
fn clear_run_timer() {
    RUN_TIMER.with(|timer| {
        if let Some(timer) = timer.borrow_mut().take() {
            ic_cdk_timers::clear_timer(timer);
        }
    });
}
fn stop_run_after_error(generation: u64, error: String) -> Result<()> {
    let mut r = root()?;
    if r.run.running && r.run.generation == generation {
        r.run.running = false;
        r.run.last_error = Some(error);
        save_root_only(&r)?;
    }
    Ok(())
}
fn autonomous_once(generation: u64) -> Result<()> {
    let r = root()?;
    if !r.run.running || r.run.generation != generation {
        return Ok(());
    }
    let mut h = host(&r)?;
    let mut run = r.run.clone();
    run.callback_count = run
        .callback_count
        .checked_add(1)
        .ok_or("autonomous callback counter")?;
    let phase = h
        .record
        .journal
        .stage
        .as_ref()
        .map(|stage| (stage.phase.clone(), stage.ready_hash.clone()));
    match phase {
        None => {
            let logical_end = number(&h.record.journal.head.logical_end)?
                .checked_add(run.segment_ticks)
                .ok_or("autonomous logical time")?;
            h.apply(Action::Seal {
                logical_end: Int(logical_end.into()),
            })?;
            run.current_segment_work = 0;
        }
        Some((phase, _)) if phase == "running" => {
            let progress = h
                .apply(Action::Step {
                    budget: run.work_budget as usize,
                })?
                .ok_or("autonomous kernel progress")?;
            let used = progress.used as u64;
            run.current_segment_work = run
                .current_segment_work
                .checked_add(used)
                .ok_or("autonomous segment work")?;
            run.total_work = run
                .total_work
                .checked_add(used)
                .ok_or("autonomous total work")?;
        }
        Some((phase, ready)) if phase == "ready" => {
            h.apply(Action::Publish {
                manifest_hash: ready.ok_or("autonomous ready manifest")?,
            })?;
            run.completed_segments = run
                .completed_segments
                .checked_add(1)
                .ok_or("autonomous segment counter")?;
            run.last_segment_work = run.current_segment_work;
            run.max_segment_work = run.max_segment_work.max(run.current_segment_work);
            run.current_segment_work = 0;
        }
        Some(_) => return Err("autonomous coordinator phase".into()),
    }
    run.last_error = None;
    persist(&h, Some(&r), r.source.clone(), run)?;
    Ok(())
}
fn arm_run_timer(generation: u64, delay: Duration) {
    let timer = ic_cdk_timers::set_timer(delay, async move {
        // Rearm from the callback's current time before doing work. A delayed
        // callback therefore executes one bounded coordinator action instead
        // of replaying every missed wall-clock interval. There is no await in
        // the action, and the durable generation fences a stale callback.
        if let Ok(r) = root() {
            if r.run.running && r.run.generation == generation {
                arm_run_timer(
                    generation,
                    Duration::from_secs(u64::from(r.run.pacing_seconds)),
                );
            } else {
                return;
            }
        } else {
            return;
        }
        if let Err(error) = autonomous_once(generation) {
            let _ = stop_run_after_error(generation, error);
            clear_run_timer();
        }
    });
    RUN_TIMER.with(|slot| *slot.borrow_mut() = Some(timer));
}
fn install_run_timer(run: &RunState) {
    clear_run_timer();
    if run.running {
        arm_run_timer(
            run.generation,
            Duration::from_secs(u64::from(run.pacing_seconds)),
        );
    }
}
#[cfg_attr(not(feature = "canbench"), ic_cdk::init)]
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
        let root = persist(&h, None, source, RunState::default())?;
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
        let mut changed = false;
        changed |= reconcile_completed_segments(&mut r.run, &view.data)?;
        if let SourceState::Ledger(source) = &mut r.source {
            source.in_flight = false;
            source.scan_started_at_seconds = 0;
            source.wake_scheduled = false;
            source.dirty = true;
            source.scan_nonce = source
                .scan_nonce
                .checked_add(1)
                .ok_or("scan nonce exhausted")?;
            source.last_error = Some("upgrade interrupted or rescheduled ledger scan".into());
            changed = true;
        }
        if r.run.running {
            r.run.generation = r
                .run
                .generation
                .checked_add(1)
                .ok_or("autonomous generation exhausted")?;
            r.run.last_error = None;
            changed = true;
        }
        if changed {
            save_root_only(&r)?;
        }
        ic_cdk::api::certified_data_set(unhex(&r.publication_hash)?);
        install_source_timer(&r.source);
        install_run_timer(&r.run);
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
fn retention_status() -> std::result::Result<RetentionStatus, String> {
    let r = root()?;
    let current_bytes = unhex(&r.publication_hex)?;
    let current: Publication = decode(&current_bytes)?;
    let mut entries = r
        .retention
        .history
        .iter()
        .map(|entry| RetainedEntry {
            segment_id: entry.segment_id,
            publication_hash: entry.publication_hash.clone(),
            bytes: entry.bytes as u64,
            current: false,
        })
        .collect::<Vec<_>>();
    let mut retained_bytes = r
        .retention
        .history
        .iter()
        .map(|entry| entry.bytes)
        .sum::<usize>();
    if let Some(segment_id) = publication_segment(&current)? {
        let bytes = publication_size(&current_bytes, &current)?;
        retained_bytes = retained_bytes
            .checked_add(bytes)
            .ok_or("retention byte count")?;
        entries.push(RetainedEntry {
            segment_id,
            publication_hash: r.publication_hash,
            bytes: bytes as u64,
            current: true,
        });
    }
    Ok(RetentionStatus {
        max_segments: RETAINED_SEGMENTS as u16,
        max_bytes: RETAINED_BYTES as u64,
        retained_bytes: retained_bytes as u64,
        entries,
    })
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
fn retained_publication(segment_id: u64) -> std::result::Result<Vec<u8>, String> {
    let r = root()?;
    let current = unhex(&r.publication_hex)?;
    let publication: Publication = decode(&current)?;
    if publication_segment(&publication)? == Some(segment_id) {
        return Ok(current);
    }
    let meta = r
        .retention
        .history
        .iter()
        .find(|entry| entry.segment_id == segment_id)
        .ok_or("publication unavailable: snapshot resync required")?;
    retained_publication_bytes(meta)
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
#[ic_cdk::query]
fn retained_artifact_chunk(
    segment_id: u64,
    expected_publication: String,
    kind: u8,
    index: u16,
) -> std::result::Result<Vec<u8>, String> {
    let r = root()?;
    let current: Publication = decode(&unhex(&r.publication_hex)?)?;
    if publication_segment(&current)? == Some(segment_id) {
        return artifact_chunk(expected_publication, kind, index);
    }
    let meta = r
        .retention
        .history
        .iter()
        .find(|entry| entry.segment_id == segment_id)
        .ok_or("publication unavailable: snapshot resync required")?;
    if expected_publication != meta.publication_hash {
        return Err("stale retained publication".into());
    }
    let publication: Publication = decode(&retained_publication_bytes(meta)?)?;
    let descriptor = publication
        .artifacts
        .get(kind as usize)
        .ok_or("public artifact kind")?;
    if index as usize >= descriptor.chunks.len() {
        return Err("chunk bounds".into());
    }
    let key = retained_key(
        segment_id,
        PUBLICATION_CHUNKS + kind as u64 * CHUNKS + u64::from(index),
    )?;
    let bytes = RETAINED
        .with(|map| map.borrow().get(&key))
        .ok_or("missing retained chunk")?;
    if bytes.len() != CHUNK.min(descriptor.length - index as usize * CHUNK)
        || hash(&bytes) != descriptor.chunks[index as usize]
    {
        return Err("retained chunk integrity".into());
    }
    Ok(bytes)
}
#[ic_cdk::update]
fn start_autonomous(config: RunConfig) -> std::result::Result<Status, String> {
    authorized()?;
    let mut r = root()?;
    let current: Publication = decode(&unhex(&r.publication_hex)?)?;
    reconcile_completed_segments(&mut r.run, &current)?;
    let requested = RunState {
        segment_ticks: config.segment_ticks,
        pacing_seconds: config.pacing_seconds,
        work_budget: config.work_budget,
        ..r.run.clone()
    };
    validate_run(&requested)?;
    if r.run.running {
        if r.run.segment_ticks != config.segment_ticks
            || r.run.pacing_seconds != config.pacing_seconds
            || r.run.work_budget != config.work_budget
        {
            return Err("autonomous execution already running with different configuration".into());
        }
        return Ok(status(&r));
    }
    r.run = requested;
    r.run.running = true;
    r.run.generation = r
        .run
        .generation
        .checked_add(1)
        .ok_or("autonomous generation exhausted")?;
    r.run.last_error = None;
    let schedule_scan = match &mut r.source {
        SourceState::Synthetic => false,
        SourceState::Ledger(source) => {
            source.dirty = true;
            let schedule = !source.wake_scheduled;
            source.wake_scheduled = true;
            schedule
        }
    };
    save_root_only(&r)?;
    install_run_timer(&r.run);
    if schedule_scan {
        ic_cdk_timers::set_timer(Duration::ZERO, async {
            let _ = scan_ledger_inner().await;
        });
    }
    Ok(status(&r))
}
#[ic_cdk::update]
fn pause_autonomous() -> std::result::Result<Status, String> {
    authorized()?;
    let mut r = root()?;
    if !r.run.running {
        return Ok(status(&r));
    }
    r.run.running = false;
    r.run.generation = r
        .run
        .generation
        .checked_add(1)
        .ok_or("autonomous generation exhausted")?;
    save_root_only(&r)?;
    clear_run_timer();
    Ok(status(&r))
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
    if r.run.running
        && matches!(
            &a,
            Action::Seal { .. } | Action::Step { .. } | Action::Publish { .. }
        )
    {
        return Err("autonomous execution is active".into());
    }
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
    let next = persist(&h, Some(&r), r.source.clone(), r.run.clone())?;
    Ok(status(&next))
}

#[derive(Clone)]
struct ScanLease {
    ledger: Principal,
    generation: u64,
    nonce: u64,
    cursor: u64,
    page_limit: u16,
    #[cfg(feature = "test-hooks")]
    test_fault: Option<u8>,
}

fn lease_matches(source: &source::LedgerSource, lease: &ScanLease) -> bool {
    source.generation == lease.generation
        && source.scan_nonce == lease.nonce
        && source.cursor == lease.cursor
        && source.in_flight
        && source.ledger == lease.ledger.to_text()
}

fn scan_lease_expired(source: &source::LedgerSource, now_seconds: u64) -> bool {
    source.scan_started_at_seconds == 0
        || now_seconds.saturating_sub(source.scan_started_at_seconds) >= SCAN_LEASE_SECONDS
}

fn begin_scan() -> Result<std::result::Result<ScanLease, Status>> {
    let mut r = root()?;
    let now_seconds = ic_cdk::api::time() / 1_000_000_000;
    let source = match &mut r.source {
        SourceState::Synthetic => return Err("ledger source is not configured".into()),
        SourceState::Ledger(source) => source,
    };
    source.wake_scheduled = false;
    if source.in_flight {
        if !scan_lease_expired(source, now_seconds) {
            source.dirty = true;
            save_root_only(&r)?;
            return Ok(Err(status(&r)));
        }
        // The bounded call timeout is 30 seconds. After another 15 seconds,
        // an ordinary scan may replace a canceled/stuck lease. The nonce below
        // fences any late callback from the replacement operation.
        source.in_flight = false;
        source.scan_started_at_seconds = 0;
        source.dirty = true;
        source.last_error = Some("expired ledger scan lease recovered for retry".into());
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
    source.scan_started_at_seconds = now_seconds;
    let lease = ScanLease {
        ledger: source.principal()?,
        generation: source.generation,
        nonce: source.scan_nonce,
        cursor: source.cursor,
        page_limit: source.page_limit,
        #[cfg(feature = "test-hooks")]
        test_fault: TEST_SCAN_FAULT.with(|fault| fault.borrow_mut().take()),
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
    source.scan_started_at_seconds = 0;
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
    source.scan_started_at_seconds = 0;
    source.wake_scheduled = false;
    source.dirty = false;
    source.last_error = None;
    source.last_chain_length = Some(chain_length);
    save_root_only(&r)?;
    Ok(status(&r))
}
fn refresh_scan_lease(lease: &ScanLease) -> Result<std::result::Result<(), Status>> {
    let mut r = root()?;
    let source = match &mut r.source {
        SourceState::Ledger(source) if lease_matches(source, lease) => source,
        _ => return Ok(Err(status(&r))),
    };
    // A ledger-to-archive handoff is a second independently bounded call.
    // Refresh only the matching fenced operation after the ledger reply so a
    // legitimate two-call scan receives one lease window per remote call.
    source.scan_started_at_seconds = ic_cdk::api::time() / 1_000_000_000;
    save_root_only(&r)?;
    Ok(Ok(()))
}

fn finish_blocks(
    lease: &ScanLease,
    chain_length: u64,
    blocks: Vec<source::Block>,
    archived: bool,
) -> Result<Status> {
    match finish_blocks_inner(lease, chain_length, blocks, archived) {
        Ok(status) => Ok(status),
        Err(error) => finish_error(lease, error),
    }
}

fn finish_blocks_inner(
    lease: &ScanLease,
    chain_length: u64,
    blocks: Vec<source::Block>,
    archived: bool,
) -> Result<Status> {
    if blocks.is_empty() || blocks.len() > usize::from(lease.page_limit) {
        return Err("empty/oversize contiguous ledger response".into());
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
        return Err("ledger page extends beyond reported chain".into());
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
    #[cfg(feature = "test-hooks")]
    if lease.test_fault == Some(2) {
        return Err("test-only persistence-preparation capacity".into());
    }
    let mut next_source = r.source.clone();
    let next = match &mut next_source {
        SourceState::Ledger(source) if lease_matches(source, lease) => source,
        _ => return Ok(status(&r)),
    };
    next.cursor = end;
    next.in_flight = false;
    next.scan_started_at_seconds = 0;
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
    r = persist(&coordinator, Some(&r), next_source, r.run.clone())?;
    Ok(status(&r))
}

async fn scan_ledger_inner() -> Result<Status> {
    let lease = match begin_scan()? {
        Ok(lease) => lease,
        Err(status) => return Ok(status),
    };
    let response: QueryBlocksResponse = match Call::bounded_wait(lease.ledger, "query_blocks")
        .change_timeout(SCAN_CALL_TIMEOUT_SECONDS)
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
    #[cfg(feature = "test-hooks")]
    if lease.test_fault == Some(1) {
        ic_cdk::trap("intentional test-only trap after ledger response");
    }
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
            if let Err(status) = refresh_scan_lease(&lease)? {
                return Ok(status);
            }
            let response: QueryArchiveResult = match Call::bounded_wait(canister, &method)
                .change_timeout(SCAN_CALL_TIMEOUT_SECONDS)
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

#[cfg(feature = "test-hooks")]
#[ic_cdk::update]
fn test_fill_scan_backpressure() -> std::result::Result<Status, String> {
    authorized()?;
    let r = root()?;
    let SourceState::Ledger(source) = &r.source else {
        return Err("ledger source is not configured".into());
    };
    if source.in_flight || source.cursor != 0 {
        return Err("test backpressure setup requires an idle genesis source".into());
    }
    let mut h = host(&r)?;
    if !h.record.inbox.pending.is_empty() {
        return Err("test backpressure setup requires an empty inbox".into());
    }
    let mut payment = b"BTZPAY02".to_vec();
    payment.extend_from_slice(&[7; 32]);
    payment.extend_from_slice(&1_000_000_000u64.to_be_bytes());
    payment.extend_from_slice(&[0; 8]);
    let payment = hex(&payment);
    h.apply(Action::Ingest {
        start: Int(0u64.into()),
        records: vec![Some(payment.clone())],
        anchor: hash(&0u64.to_be_bytes()),
    })?;
    h.apply(Action::Seal {
        logical_end: Int(1u64.into()),
    })?;
    let mut start = 1u64;
    while start < 4096 {
        let length = (4096 - start).min(256) as usize;
        h.apply(Action::Ingest {
            start: Int(start.into()),
            records: vec![Some(payment.clone()); length],
            anchor: hash(&start.to_be_bytes()),
        })?;
        start += length as u64;
    }
    let mut next_source = r.source.clone();
    let SourceState::Ledger(source) = &mut next_source else {
        unreachable!()
    };
    source.cursor = 4096;
    let next = persist(&h, Some(&r), next_source, r.run.clone())?;
    Ok(status(&next))
}

#[cfg(feature = "test-hooks")]
#[ic_cdk::update]
fn test_arm_scan_fault(kind: u8) -> std::result::Result<Status, String> {
    authorized()?;
    if !matches!(kind, 1 | 2) {
        return Err("unknown test scan fault".into());
    }
    let r = root()?;
    let SourceState::Ledger(source) = &r.source else {
        return Err("ledger source is not configured".into());
    };
    if source.in_flight {
        return Err("cannot arm a scan fault while a scan is active".into());
    }
    TEST_SCAN_FAULT.with(|fault| -> Result<()> {
        let mut fault = fault.borrow_mut();
        if fault.is_some() {
            return Err("test scan fault is already armed".into());
        }
        *fault = Some(kind);
        Ok(())
    })?;
    Ok(status(&r))
}

#[cfg(feature = "test-hooks")]
#[ic_cdk::query]
fn test_source_anchor() -> std::result::Result<String, String> {
    authorized()?;
    Ok(host(&root()?)?.record.inbox.source_anchor)
}

#[cfg(feature = "test-hooks")]
#[ic_cdk::query]
fn test_scan_state() -> std::result::Result<TestScanState, String> {
    authorized()?;
    let r = root()?;
    let SourceState::Ledger(source) = &r.source else {
        return Err("ledger source is not configured".into());
    };
    Ok(TestScanState {
        nonce: source.scan_nonce,
        cursor: source.cursor,
        started_at_seconds: source.scan_started_at_seconds,
        expired: source.in_flight
            && scan_lease_expired(source, ic_cdk::api::time() / 1_000_000_000),
    })
}

#[cfg(feature = "test-hooks")]
#[ic_cdk::update]
fn test_stale_scan_completion_fence() -> std::result::Result<Status, String> {
    authorized()?;
    let mut r = root()?;
    let source = match &mut r.source {
        SourceState::Synthetic => return Err("ledger source is not configured".into()),
        SourceState::Ledger(source) => source,
    };
    if source.in_flight {
        return Err("test stale completion setup requires an idle source".into());
    }
    source.scan_nonce = source
        .scan_nonce
        .checked_add(1)
        .ok_or("scan nonce exhausted")?;
    source.in_flight = true;
    source.scan_started_at_seconds = ic_cdk::api::time() / 1_000_000_000;
    let stale = ScanLease {
        ledger: source.principal()?,
        generation: source.generation,
        nonce: source.scan_nonce,
        cursor: source.cursor,
        page_limit: source.page_limit,
        test_fault: None,
    };
    source.scan_nonce = source
        .scan_nonce
        .checked_add(1)
        .ok_or("scan nonce exhausted")?;
    save_root_only(&r)?;
    finish_tip(&stale, stale.cursor.saturating_add(99))
}
ic_cdk::export_candid!();

// These exports exist only in the dedicated benchmark Wasm. The normal and
// test-hook application modules do not contain canbench entry points.
#[cfg(feature = "canbench")]
mod benches {
    use super::*;
    use btz_native::{Cursor, Input as KernelInput};
    use canbench_rs::{bench, bench_fn, bench_scope, BenchResult};
    use ic_ledger_types::{AccountIdentifier, Subaccount};
    use serde::Deserialize;
    use std::hint::black_box;

    // The canbench macro emits the standard two-parameter Result spelling;
    // keep it distinct from dtr_wire's one-parameter alias imported above.
    type Result<T, E> = std::result::Result<T, E>;

    #[derive(Deserialize)]
    struct Fixtures {
        workloads: Vec<Workload>,
    }

    #[derive(Deserialize)]
    struct Workload {
        name: String,
        rules: serde_json::Value,
        logical_start: String,
        logical_end: String,
        initial_state_hex: String,
        inputs: Vec<FixtureInput>,
    }

    #[derive(Deserialize)]
    struct FixtureInput {
        position: String,
        payload_hex: String,
    }

    fn workload(name: &str) -> Workload {
        let fixtures: Fixtures =
            serde_json::from_str(include_str!("../../../benchmarks/s12/workloads.json"))
                .expect("valid S12 workload fixture");
        fixtures
            .workloads
            .into_iter()
            .find(|row| row.name == name)
            .expect("named S12 workload")
    }

    fn cursor(name: &str) -> Cursor {
        let row = workload(name);
        let mut context = row.rules;
        context["logical_start"] = serde_json::json!({"$integer": row.logical_start});
        context["logical_end"] = serde_json::json!({"$integer": row.logical_end});
        let inputs = row
            .inputs
            .into_iter()
            .map(|input| KernelInput {
                position: Int(input
                    .position
                    .parse::<u64>()
                    .expect("fixture position")
                    .into()),
                payload_hex: input.payload_hex,
            })
            .collect();
        Cursor::begin(
            &unhex(&row.initial_state_hex).expect("fixture state"),
            inputs,
            &context,
        )
        .expect("fixture cursor")
    }

    fn measure_kernel(name: &str) -> BenchResult {
        let mut cursor = cursor(name);
        bench_fn(|| {
            {
                let _scope = bench_scope("kernel_step");
                while !cursor.step(100_000).expect("kernel step").1 {}
            }
            {
                let _scope = bench_scope("result_serialization");
                black_box(cursor.result().expect("kernel result"));
            }
        })
    }

    fn coordinator_unsealed(name: &str) -> (Coordinator<BtzHostKernel>, u64) {
        let row = workload(name);
        let state = unhex(&row.initial_state_hex).expect("fixture state");
        let start = row.logical_start.parse::<u64>().expect("logical start");
        let end = row.logical_end.parse::<u64>().expect("logical end");
        let mut identity = btz_native::identity().expect("BTZ identity");
        identity["source_id"] = serde_json::Value::String("00".repeat(32));
        let identity: Identity = serde_json::from_value(identity).expect("typed identity");
        let mut host =
            Coordinator::create(&state, identity, start, 0, "00".repeat(32), BtzHostKernel)
                .expect("coordinator");
        if !row.inputs.is_empty() {
            host.apply(Action::Ingest {
                start: Int(0u64.into()),
                records: row
                    .inputs
                    .into_iter()
                    .map(|input| Some(input.payload_hex))
                    .collect(),
                anchor: "11".repeat(32),
            })
            .expect("fixture ingest");
        }
        (host, end)
    }

    fn coordinator_ready(name: &str) -> Coordinator<BtzHostKernel> {
        let (mut host, end) = coordinator_unsealed(name);
        host.apply(Action::Seal {
            logical_end: Int(end.into()),
        })
        .expect("fixture seal");
        host
    }

    fn complete(host: &mut Coordinator<BtzHostKernel>) {
        loop {
            let stage = host.record.journal.stage.as_ref().expect("active stage");
            if stage.phase == "ready" {
                break;
            }
            host.apply(Action::Step { budget: 100_000 })
                .expect("coordinator step");
        }
    }

    #[bench(raw)]
    fn kernel_small_reference() -> BenchResult {
        measure_kernel("small-reference")
    }

    #[bench(raw)]
    fn kernel_empty_motion() -> BenchResult {
        measure_kernel("empty-motion")
    }

    #[bench(raw)]
    fn kernel_ball_dense_medium() -> BenchResult {
        measure_kernel("ball-dense-medium")
    }

    #[bench(raw)]
    fn kernel_ball_dense_high() -> BenchResult {
        measure_kernel("ball-dense-high")
    }

    #[bench(raw)]
    fn kernel_many_cannon_frontier() -> BenchResult {
        measure_kernel("many-cannon-frontier")
    }

    #[bench(raw)]
    fn coordinator_ball_dense_medium() -> BenchResult {
        let mut host = coordinator_ready("ball-dense-medium");
        bench_fn(|| {
            {
                let _scope = bench_scope("coordinator_steps");
                complete(&mut host);
            }
            {
                let _scope = bench_scope("publication_commit");
                let manifest = host
                    .record
                    .journal
                    .stage
                    .as_ref()
                    .and_then(|stage| stage.ready_hash.clone())
                    .expect("ready manifest");
                host.apply(Action::Publish {
                    manifest_hash: manifest,
                })
                .expect("publish");
            }
        })
    }

    #[bench(raw)]
    fn coordinator_empty_motion() -> BenchResult {
        let mut host = coordinator_ready("empty-motion");
        bench_fn(|| {
            complete(&mut host);
            let manifest = host
                .record
                .journal
                .stage
                .as_ref()
                .and_then(|stage| stage.ready_hash.clone())
                .expect("ready manifest");
            host.apply(Action::Publish {
                manifest_hash: manifest,
            })
            .expect("publish");
        })
    }

    #[bench(raw)]
    fn coordinator_seal_medium() -> BenchResult {
        let (mut host, end) = coordinator_unsealed("ball-dense-medium");
        bench_fn(|| {
            host.apply(Action::Seal {
                logical_end: Int(end.into()),
            })
            .expect("seal");
        })
    }

    fn measure_step_and_persist(name: &str) -> BenchResult {
        let mut host = coordinator_ready(name);
        bench_fn(|| {
            host.apply(Action::Step { budget: 512 })
                .expect("bounded coordinator step");
            black_box(
                persist_inner(
                    &host,
                    None,
                    SourceState::Synthetic,
                    RunState::default(),
                    false,
                )
                .expect("bounded step persistence"),
            );
        })
    }

    #[bench(raw)]
    fn callback_step_persist_medium_512() -> BenchResult {
        measure_step_and_persist("ball-dense-medium")
    }

    #[bench(raw)]
    fn callback_step_persist_high_512() -> BenchResult {
        measure_step_and_persist("ball-dense-high")
    }

    #[bench(raw)]
    fn coordinator_ball_dense_high() -> BenchResult {
        let mut host = coordinator_ready("ball-dense-high");
        bench_fn(|| {
            complete(&mut host);
            let manifest = host
                .record
                .journal
                .stage
                .as_ref()
                .and_then(|stage| stage.ready_hash.clone())
                .expect("ready manifest");
            host.apply(Action::Publish {
                manifest_hash: manifest,
            })
            .expect("publish");
        })
    }

    #[bench(raw)]
    fn coordinator_many_cannon_frontier() -> BenchResult {
        let mut host = coordinator_ready("many-cannon-frontier");
        bench_fn(|| {
            complete(&mut host);
            let manifest = host
                .record
                .journal
                .stage
                .as_ref()
                .and_then(|stage| stage.ready_hash.clone())
                .expect("ready manifest");
            host.apply(Action::Publish {
                manifest_hash: manifest,
            })
            .expect("publish");
        })
    }

    fn measure_persistence(name: &str) -> BenchResult {
        let mut host = coordinator_ready(name);
        complete(&mut host);
        let manifest = host
            .record
            .journal
            .stage
            .as_ref()
            .and_then(|stage| stage.ready_hash.clone())
            .expect("ready manifest");
        host.apply(Action::Publish {
            manifest_hash: manifest,
        })
        .expect("publish");
        bench_fn(|| {
            // certified_data_set is update-only and cannot execute in canbench's
            // non-replicated query. Everything else is the production path.
            let _scope = bench_scope("snapshot_publication_stable_writes");
            black_box(
                persist_inner(
                    &host,
                    None,
                    SourceState::Synthetic,
                    RunState::default(),
                    false,
                )
                .expect("persist benchmark"),
            );
        })
    }

    #[bench(raw)]
    fn persistence_publication_small() -> BenchResult {
        measure_persistence("small-reference")
    }

    #[bench(raw)]
    fn persistence_publication_empty_motion() -> BenchResult {
        measure_persistence("empty-motion")
    }

    #[bench(raw)]
    fn persistence_publication_medium() -> BenchResult {
        measure_persistence("ball-dense-medium")
    }

    #[bench(raw)]
    fn persistence_publication_high() -> BenchResult {
        measure_persistence("ball-dense-high")
    }

    #[bench(raw)]
    fn persistence_publication_many_cannon() -> BenchResult {
        measure_persistence("many-cannon-frontier")
    }

    fn ledger_blocks(relevant: usize) -> (Vec<source::Block>, AccountIdentifier) {
        let recipient = AccountIdentifier::new(&Principal::from_slice(&[99]), &Subaccount([0; 32]));
        let other = AccountIdentifier::new(&Principal::from_slice(&[98]), &Subaccount([0; 32]));
        let mut blocks = Vec::with_capacity(64);
        for index in 0..64 {
            let from = AccountIdentifier::new(
                &Principal::from_slice(&[(index + 1) as u8]),
                &Subaccount([0; 32]),
            );
            blocks.push(source::Block {
                parent_hash: Some(vec![index as u8; 32]),
                transaction: source::Transaction {
                    memo: u64::from_be_bytes(*b"BTZ\x11\0\0\x40\0"),
                    icrc1_memo: None,
                    operation: Some(source::Operation::Transfer {
                        from: from.as_bytes().to_vec(),
                        to: if index < relevant { recipient } else { other }
                            .as_bytes()
                            .to_vec(),
                        amount: source::Tokens { e8s: 1_000_000_000 },
                        fee: source::Tokens { e8s: 10_000 },
                        spender: None,
                    }),
                    created_at_time: source::Timestamp {
                        timestamp_nanos: index as u64,
                    },
                },
                timestamp: source::Timestamp {
                    timestamp_nanos: index as u64,
                },
            });
        }
        (blocks, recipient)
    }

    fn measure_ledger_page(relevant: usize) -> BenchResult {
        let (blocks, recipient) = ledger_blocks(relevant);
        bench_fn(|| {
            black_box(
                source::records_and_anchor(&blocks, 0, &recipient, &"00".repeat(32))
                    .expect("ledger page"),
            );
        })
    }

    #[bench(raw)]
    fn ledger_page_all_irrelevant() -> BenchResult {
        measure_ledger_page(0)
    }

    #[bench(raw)]
    fn ledger_page_sparse_relevant() -> BenchResult {
        measure_ledger_page(1)
    }

    #[bench(raw)]
    fn ledger_page_all_relevant() -> BenchResult {
        measure_ledger_page(64)
    }
}

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
            #[cfg(feature = "test-hooks")]
            test_fault: None,
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

    #[test]
    fn scan_lease_recovery_is_bounded() {
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
            0,
        )
        .unwrap();
        let SourceState::Ledger(mut source) = state else {
            panic!("expected ledger source")
        };
        source.in_flight = true;
        source.scan_started_at_seconds = 1;
        assert!(!scan_lease_expired(&source, 1 + SCAN_LEASE_SECONDS - 1));
        assert!(scan_lease_expired(&source, 1 + SCAN_LEASE_SECONDS));
        source.scan_started_at_seconds = 0;
        assert!(scan_lease_expired(&source, 1));
    }
}
