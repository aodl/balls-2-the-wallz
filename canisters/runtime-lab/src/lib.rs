//! Current runtime/certification laboratory with one local-only ICP ledger ingestion path.
//! It has no transfer, payout, production admission, or mainnet configuration path.
#![forbid(unsafe_code)]
mod source;
use btz_native::{host::BtzHostKernel, world::World};
use candid::{CandidType, Principal};
use dtr_host::observation::{publication, Publication, CHUNK, MAX_ARTIFACT};
use dtr_host::{Action, Coordinator, Identity};
use dtr_wire::{decode, encode, hash, hex, unhex, Int, Result as AppResult};
use ic_cdk::call::Call;
use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager, VirtualMemory},
    DefaultMemoryImpl, StableBTreeMap, StableCell,
};
use serde::{Deserialize, Serialize};
use source::{IndexConfig, PokeMatch, SourceState, SourceStatus};
use std::cell::RefCell;
use std::time::Duration;
const ROOT_LIMIT: usize = 256 * 1024;
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
    static POKE_POLICY:RefCell<Option<(Principal,u64)>>=const { RefCell::new(None) };
    static WAKE_TIMER:RefCell<Option<ic_cdk_timers::TimerId>>=const { RefCell::new(None) };
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
fn authorized() -> AppResult<()> {
    if !ic_cdk::api::is_controller(&ic_cdk::api::msg_caller()) {
        return Err("controller only".into());
    }
    Ok(())
}
fn describe(bytes: &[u8]) -> AppResult<Blob> {
    if bytes.len() > MAX_ARTIFACT {
        return Err("laboratory artifact capacity".into());
    }
    Ok(Blob {
        length: bytes.len(),
        sha256: hash(bytes),
    })
}
fn number(value: &Int) -> AppResult<u64> {
    value
        .0
        .to_string()
        .parse()
        .map_err(|_| "unsigned 64-bit field".into())
}
fn publication_segment(publication: &Publication) -> AppResult<Option<u64>> {
    publication.head.segment_id.as_ref().map(number).transpose()
}
fn reconcile_completed_segments(run: &mut RunState, publication: &Publication) -> AppResult<bool> {
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
fn validate_run(run: &RunState) -> AppResult<()> {
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
fn validate_retention(retention: &RetentionState, current: &Publication) -> AppResult<()> {
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
fn root() -> AppResult<Root> {
    let bytes = ROOT.with(|c| c.borrow().get().clone());
    if bytes.is_empty() || bytes.len() > ROOT_LIMIT {
        return Err("missing/oversize root; no genesis fallback".into());
    }
    let r: Root = decode(&bytes)?;
    if r.version != 7 || r.revision > (1u64 << 53) - 1 || r.image.length > MAX_ARTIFACT {
        return Err(
            "incompatible index application schema; no implicit lab-state migration".into(),
        );
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
fn read_blob(slot: u64, b: &Blob) -> AppResult<Vec<u8>> {
    if slot >= 4 || b.length > MAX_ARTIFACT {
        return Err("blob bounds".into());
    }
    let mut out = Vec::with_capacity(b.length);
    BLOBS.with(|m| -> AppResult<()> {
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
fn retained_key(segment_id: u64, offset: u64) -> AppResult<u64> {
    if offset >= RETAINED_STRIDE {
        return Err("retained storage offset".into());
    }
    segment_id
        .checked_mul(RETAINED_STRIDE)
        .and_then(|base| base.checked_add(offset))
        .ok_or_else(|| "retained storage key".into())
}
fn read_retained_bytes(meta: &RetainedMeta, offset: u64, length: usize) -> AppResult<Vec<u8>> {
    if length > MAX_ARTIFACT.max(dtr_host::observation::MAX_PUBLICATION) {
        return Err("retained blob bounds".into());
    }
    let mut out = Vec::with_capacity(length);
    RETAINED.with(|map| -> AppResult<()> {
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
fn retained_publication_bytes(meta: &RetainedMeta) -> AppResult<Vec<u8>> {
    let bytes = read_retained_bytes(meta, 0, meta.publication_length)?;
    if hash(&bytes) != meta.publication_hash {
        return Err("retained publication integrity".into());
    }
    Ok(bytes)
}
fn publication_size(bytes: &[u8], publication: &Publication) -> AppResult<usize> {
    publication
        .artifacts
        .iter()
        .try_fold(bytes.len(), |total, artifact| {
            total
                .checked_add(artifact.length)
                .ok_or("publication byte count".into())
        })
}
fn retained_meta(bytes: &[u8], publication: &Publication) -> AppResult<RetainedMeta> {
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
        version: 7,
        revision: r.revision,
        publication_hash: r.publication_hash.clone(),
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
fn host(r: &Root) -> AppResult<Coordinator<BtzHostKernel>> {
    let host = Coordinator::restore(&read_blob(0, &r.image)?, &r.image.sha256, BtzHostKernel)?;
    if number(&host.record.inbox.cursor)? != r.source.cursor {
        return Err("index source/coordinator divergence".into());
    }
    Ok(host)
}
fn persist(
    h: &Coordinator<BtzHostKernel>,
    old: Option<&Root>,
    source: SourceState,
    run: RunState,
) -> AppResult<Root> {
    persist_inner(h, old, source, run, true)
}

fn persist_inner(
    h: &Coordinator<BtzHostKernel>,
    old: Option<&Root>,
    source: SourceState,
    run: RunState,
    update_certified_data: bool,
) -> AppResult<Root> {
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
        version: 7,
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
fn save_root_only(r: &Root) -> AppResult<()> {
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
fn install_source_timer() {
    ic_cdk_timers::set_timer(Duration::from_secs(source::FALLBACK_SECONDS), async {
        install_source_timer(); // independent of any await or poke retry chain
        let _ = request_reconciliation();
    });
}
fn cache_poke_policy(source: &SourceState) {
    POKE_POLICY.with(|p| {
        *p.borrow_mut() = source
            .event_horizon
            .as_ref()
            .and_then(|p| Principal::from_text(p).ok())
            .map(|p| (p, source.receiving_subaccount))
    });
}
fn clear_run_timer() {
    RUN_TIMER.with(|timer| {
        if let Some(timer) = timer.borrow_mut().take() {
            ic_cdk_timers::clear_timer(timer);
        }
    });
}
fn stop_run_after_error(generation: u64, error: String) -> AppResult<()> {
    let mut r = root()?;
    if r.run.running && r.run.generation == generation {
        r.run.running = false;
        r.run.last_error = Some(error);
        save_root_only(&r)?;
    }
    Ok(())
}
fn autonomous_once(generation: u64) -> AppResult<()> {
    autonomous_once_inner(generation, true)
}
fn autonomous_once_inner(generation: u64, certify: bool) -> AppResult<()> {
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

    persist_inner(&h, Some(&r), r.source.clone(), run, certify)?;
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
#[ic_cdk::init]
fn init(initial_world: Vec<u8>, logical_start: u64, config: IndexConfig) {
    if ROOT.with(|c| !c.borrow().get().is_empty()) {
        ic_cdk::trap("refusing initialization over durable root");
    }
    let initialize = || -> AppResult<()> {
        let w = World::decode(&initial_world)?;
        if !w.time.0.is_integer() || w.time.0.to_integer() != Int(logical_start.into()).0 {
            return Err("genesis logical time".into());
        }
        let (source, source_id) = SourceState::configured(config, ic_cdk::api::canister_self())?;
        let mut identity = btz_native::identity()?;
        identity["source_id"] = serde_json::Value::String(source_id);
        let identity: Identity = serde_json::from_value(identity).map_err(|e| e.to_string())?;
        let h = Coordinator::create(
            &initial_world,
            identity,
            logical_start,
            0,
            "00".repeat(32),
            BtzHostKernel,
        )?;
        let r = persist(&h, None, source, RunState::default())?;
        cache_poke_policy(&r.source);
        install_source_timer();
        request_reconciliation()?;
        Ok(())
    };
    if let Err(e) = initialize() {
        ic_cdk::trap(&e);
    }
}
#[ic_cdk::post_upgrade]
fn post_upgrade() {
    let verify = || -> AppResult<()> {
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
        reconcile_completed_segments(&mut r.run, &view.data)?;
        r.source.in_flight = false;
        r.source.started_at = 0;
        r.source.wake_scheduled = false;
        r.source.requested = true;
        r.source.nonce = r
            .source
            .nonce
            .checked_add(1)
            .ok_or("source nonce exhausted")?;

        if r.run.running {
            r.run.generation = r
                .run
                .generation
                .checked_add(1)
                .ok_or("autonomous generation exhausted")?;
            r.run.last_error = None;
        }
        save_root_only(&r)?;
        ic_cdk::api::certified_data_set(unhex(&r.publication_hash)?);
        cache_poke_policy(&r.source);
        install_source_timer();
        request_reconciliation()?;
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
/// Hash this descriptor and compare with the certified publication's source_id.
#[ic_cdk::query]
fn source_descriptor() -> std::result::Result<Vec<u8>, String> {
    let s = root()?.source;
    source::identity_bytes(
        &s.network,
        Principal::from_text(s.ledger).map_err(|e| e.to_string())?,
        Principal::from_text(s.index).map_err(|e| e.to_string())?,
        ic_cdk::api::canister_self(),
        s.receiving_subaccount,
        &s.recipient_hex,
    )
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
    save_root_only(&r)?;
    install_run_timer(&r.run);
    request_reconciliation()?;
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
// Public controller APIs only pause/resume autonomous execution. Explicit
// coordinator actions are test-only and cannot admit external payment proofs.
#[cfg(feature = "test-hooks")]
#[ic_cdk::update]
fn test_apply(
    expected_revision: u64,
    canonical_action: Vec<u8>,
) -> std::result::Result<Status, String> {
    authorized()?;
    if canonical_action.len() > 65536 {
        return Err("test action capacity".into());
    }
    let r = root()?;
    if r.revision != expected_revision || r.run.running {
        return Err("stale revision / running".into());
    }
    let action: Action = decode(&canonical_action)?;
    if matches!(action, Action::Ingest { .. } | Action::IngestOrdered { .. }) {
        return Err("index owns input admission".into());
    }
    let mut h = host(&r)?;
    h.apply(action)?;
    Ok(status(&persist(
        &h,
        Some(&r),
        r.source.clone(),
        r.run.clone(),
    )?))
}

fn request_reconciliation() -> AppResult<()> {
    let mut r = root()?;
    r.source.requested = true;
    let schedule = !r.source.in_flight && !r.source.wake_scheduled;
    if schedule {
        r.source.wake_scheduled = true;
    }
    save_root_only(&r)?;
    if schedule {
        schedule_reconciliation();
    }
    Ok(())
}
fn schedule_reconciliation() {
    let timer = ic_cdk_timers::set_timer(Duration::ZERO, async {
        WAKE_TIMER.with(|t| t.borrow_mut().take());
        let _ = reconcile().await;
    });
    WAKE_TIMER.with(|t| *t.borrow_mut() = Some(timer));
}
#[derive(Clone)]
struct Lease {
    nonce: u64,
    index: Principal,
    before: Option<u64>,
}
fn matches_lease(source: &SourceState, lease: &Lease) -> bool {
    source.in_flight && source.nonce == lease.nonce && source.index == lease.index.to_text()
}
fn begin_reconciliation() -> AppResult<Option<Lease>> {
    let mut r = root()?;
    r.source.wake_scheduled = false;
    let now = ic_cdk::api::time() / 1_000_000_000;
    if r.source.in_flight && now.saturating_sub(r.source.started_at) < SCAN_LEASE_SECONDS {
        return Ok(None);
    }
    r.source.in_flight = true;
    r.source.started_at = now;
    r.source.requested = false;
    r.source.nonce = r
        .source
        .nonce
        .checked_add(1)
        .ok_or("source nonce exhausted")?;
    let lease = Lease {
        nonce: r.source.nonce,
        index: Principal::from_text(&r.source.index).map_err(|e| e.to_string())?,
        before: r.source.pending.as_ref().map(|p| p.before),
    };
    save_root_only(&r)?;
    Ok(Some(lease))
}
fn reconciliation_failed(lease: &Lease, error: String) -> AppResult<()> {
    let mut r = root()?;
    if !matches_lease(&r.source, lease) {
        return Ok(());
    }
    r.source.in_flight = false;
    r.source.started_at = 0;
    r.source.last_error = Some(error.chars().take(1024).collect());
    // Preserve pending range, nonce fence and a poke received during await.
    let requested = r.source.requested;
    save_root_only(&r)?;
    if requested {
        request_reconciliation()?;
    }
    Ok(())
}
fn finish_page(lease: &Lease, page: Option<source::History>) -> AppResult<()> {
    let mut r = root()?;
    if !matches_lease(&r.source, lease) {
        return Ok(());
    }
    let mut next = r.source.clone();
    if let Some(page) = page {
        next.page(page)?;
        r.source = next.clone();
        save_root_only(&r)?; // download survives admission backpressure
    }
    if next.pending.as_ref().is_some_and(|p| p.complete) {
        let mut h = host(&r)?;
        let (end, inputs, anchor) = next.admission(&h.record.inbox.source_anchor)?;
        h.apply(Action::IngestOrdered {
            start: Int(next.cursor.into()),
            end: Int(end.into()),
            inputs,
            anchor,
        })?;
        next.cursor = end;
        next.pending = None;
        next.in_flight = false;
        next.started_at = 0;
        next.last_error = None;
        r = persist(&h, Some(&r), next, r.run.clone())?;
    } else {
        next.in_flight = false;
        next.started_at = 0;
        next.last_error = None;
        r.source = next;
        save_root_only(&r)?;
    }
    if r.source.requested || r.source.pending.is_some() {
        request_reconciliation()?;
    }
    Ok(())
}
async fn reconcile() -> AppResult<()> {
    let Some(lease) = begin_reconciliation()? else {
        return Ok(());
    };
    let operation = async {
        let mut r = root()?;
        if !r.source.binding_checked {
            let response = Call::bounded_wait(lease.index, "ledger_id")
                .change_timeout(SCAN_CALL_TIMEOUT_SECONDS)
                .await
                .map_err(|e| format!("index ledger binding call: {e}"))?;
            let actual: Principal = response
                .candid()
                .map_err(|e| format!("index ledger binding decode: {e}"))?;
            r = root()?;
            if !matches_lease(&r.source, &lease) {
                return Ok(());
            }
            if actual.to_text() != r.source.ledger {
                return Err("index ledger_id mismatch".into());
            }
            r.source.binding_checked = true;
            save_root_only(&r)?;
        }
        r = root()?;
        if !matches_lease(&r.source, &lease) {
            return Ok(());
        }
        if r.source.pending.as_ref().is_some_and(|p| p.complete) {
            return finish_page(&lease, None);
        }
        r.source.index_calls = r
            .source
            .index_calls
            .checked_add(1)
            .ok_or("index call counter")?;
        r.source.started_at = ic_cdk::api::time() / 1_000_000_000;
        save_root_only(&r)?;
        let response = Call::bounded_wait(lease.index, "get_account_identifier_transactions")
            .change_timeout(SCAN_CALL_TIMEOUT_SECONDS)
            .with_arg(source::HistoryArgs {
                account_identifier: r.source.recipient_hex,
                start: lease.before,
                max_results: source::PAGE,
            })
            .await
            .map_err(|e| format!("index unavailable: {e}"))?;
        let result: source::HistoryResult = response
            .candid()
            .map_err(|e| format!("index response decode: {e}"))?;
        let page = result.map_err(|e| format!("index error: {}", e.message))?;
        finish_page(&lease, Some(page))
    }
    .await;
    if let Err(error) = operation {
        reconciliation_failed(&lease, error)?;
    }
    Ok(())
}
// CDK runs the guard before Candid argument decoding. Bound ingress bytes too;
// receipt/decoding still costs cycles. No custom Candid decoder is used.
fn poke_guard() -> std::result::Result<(), String> {
    let caller = ic_cdk::api::msg_caller();
    if !POKE_POLICY.with(|p| p.borrow().is_some_and(|(sender, _)| sender == caller)) {
        return Err("pokes disabled or unauthorized sender".into());
    }
    if ic_cdk::api::msg_arg_data().len() > 32768 {
        return Err("poke payload bound".into());
    }
    Ok(())
}
#[ic_cdk::update(guard = "poke_guard")]
fn poke(matches: Vec<PokeMatch>) {
    let target = POKE_POLICY.with(|p| p.borrow().map(|(_, target)| target));
    if !target.is_some_and(|target| source::matching_poke(&matches, target)) {
        return;
    }
    let wake = || -> AppResult<()> {
        let mut r = root()?;
        let now = ic_cdk::api::time() / 1_000_000_000;
        if now >= r.source.retry_until {
            r.source.retry_until = now.saturating_add(60);
            save_root_only(&r)?;
            // One fixed bounded retry burst per minute, never one chain per poke.
            for seconds in [2, 10] {
                ic_cdk_timers::set_timer(Duration::from_secs(seconds), async {
                    let _ = request_reconciliation();
                });
            }
        }
        request_reconciliation()
    };
    if let Err(e) = wake() {
        ic_cdk::trap(&e);
    }
}

ic_cdk::export_candid!();
#[cfg(test)]
mod tests {
    #[test]
    fn print_generated_candid() {
        println!(
            "DTR_RUNTIME_CANDID_BEGIN\n{}\nDTR_RUNTIME_CANDID_END",
            super::__export_service()
        );
        #[cfg(not(feature = "test-hooks"))]
        candid_parser::utils::service_equal(
            candid_parser::utils::CandidSource::Text(&super::__export_service()),
            candid_parser::utils::CandidSource::Text(include_str!("../runtime-lab.did")),
        )
        .unwrap();
    }
}
