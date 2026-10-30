//! Authoritative B2Z host with one account-index adapter and certified observation.
//! No wallet or payout implementation. B2Z-owned prelaunch operating funding is separate.
#![forbid(unsafe_code)]
mod funding;
mod operation_kernel;
mod pace;
mod source;
mod transition;
use b2z_native::world::World;
use candid::{CandidType, Principal};
use dtr_host::observation::{publication, Publication, CHUNK, MAX_ARTIFACT};
use dtr_host::{Action, Coordinator, Identity, MAX_IMAGE};
use dtr_wire::{decode, encode, hash, hex, unhex, Int, Result as AppResult};
use ic_cdk::call::Call;
use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager, VirtualMemory},
    DefaultMemoryImpl, StableBTreeMap, StableCell,
};
use operation_kernel::OperationKernel as B2zHostKernel;
use serde::{Deserialize, Serialize};
use source::{IndexConfig, PokeMatch, SourceState, SourceStatus};
use std::cell::{Cell, RefCell};
use std::time::Duration;
const ROOT_LIMIT: usize = 256 * 1024;
const CHUNKS: u64 = (MAX_ARTIFACT / CHUNK) as u64;
const IMAGE_CHUNKS: u64 = MAX_IMAGE.div_ceil(CHUNK) as u64;
// Preserve slots 0..=3 exactly. Larger coordinator images continue in a new,
// disjoint range after the three public artifact slots.
const IMAGE_OVERFLOW_BASE: u64 = 4 * CHUNKS;
const PUBLICATION_CHUNKS: u64 = dtr_host::observation::MAX_PUBLICATION.div_ceil(CHUNK) as u64;
const RETAINED_STRIDE: u64 = PUBLICATION_CHUNKS + 3 * CHUNKS;
// Normal produces a publication every two seconds. Keep a bounded recovery
// window beyond the measured multi-second authenticated retrieval delays.
const RETAINED_SEGMENTS: usize = 16;
const RETAINED_BYTES: usize = 8 * 1024 * 1024;
const ARTIFACT_BUNDLE_BYTES: usize = 1024 * 1024;
const SCAN_CALL_TIMEOUT_SECONDS: u32 = 30;
const SCAN_LEASE_SECONDS: u64 = 45;
type Memory = VirtualMemory<DefaultMemoryImpl>;
#[derive(Clone, Default, CandidType, Deserialize)]
struct DriverMetrics {
    messages: u64,
    seal_instructions: u64,
    step_instructions: u64,
    publish_instructions: u64,
    persist_instructions: u64,
    last_seal_instructions: u64,
    last_step_instructions: u64,
    last_publish_instructions: u64,
    last_persist_instructions: u64,
    last_instructions: u64,
    max_instructions: u64,
    max_actions: u32,
}
thread_local! {
    static PACE:RefCell<pace::Clock>=RefCell::new(pace::Clock::default());
    static DRIVER:RefCell<DriverMetrics>=RefCell::new(DriverMetrics::default());
    // Recomputed from the authoritative coordinator on upgrade; never a durable game field.
    static ARENA_IDLE:Cell<bool>=const { Cell::new(false) };
    static MANAGER:RefCell<MemoryManager<DefaultMemoryImpl>>=RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
    // This is a NEW laboratory schema, not an in-place migration of arena-lab v4.
    static ROOT:RefCell<StableCell<Vec<u8>,Memory>>=RefCell::new(StableCell::init(memory(0),Vec::new()));
    static BLOBS:RefCell<StableBTreeMap<u64,Vec<u8>,Memory>>=RefCell::new(StableBTreeMap::init(memory(1)));
    static RETAINED:RefCell<StableBTreeMap<u64,Vec<u8>,Memory>>=RefCell::new(StableBTreeMap::init(memory(2)));
    static RUN_TIMER:RefCell<Option<ic_cdk_timers::TimerId>>=const { RefCell::new(None) };
    static POKE_POLICY:RefCell<Option<(Principal,u64)>>=const { RefCell::new(None) };
    static WAKE_TIMER:RefCell<Option<ic_cdk_timers::TimerId>>=const { RefCell::new(None) };
}
#[cfg(feature = "test-hooks")]
thread_local! {
    static TRAP_NEXT_INDEX_REPLY:std::cell::Cell<bool>=const { std::cell::Cell::new(false) };
}
/// Authorized fault injection only; absent from normal Wasm/Candid. The flag is
/// consumed BEFORE the await, so callback rollback cannot arm another trap.
#[cfg(feature = "test-hooks")]
#[ic_cdk::update]
fn test_trap_next_index_reply() {
    assert!(ic_cdk::api::is_controller(&ic_cdk::api::msg_caller()));
    TRAP_NEXT_INDEX_REPLY.with(|flag| flag.set(true));
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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    world_transition: Option<transition::Transition>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    million_transition: Option<transition::Transition>,
}
#[derive(Clone, CandidType, Deserialize)]
struct RunConfig {
    segment_ticks: u64,
    pacing_seconds: u32,
    work_budget: u32,
}
#[derive(CandidType, Deserialize)]
struct RunStatus {
    pace: pace::Hint,
    running: bool,
    idle: bool,
    world_transition: bool,
    generation: u64,
    segment_ticks: u64,
    publication_ticks: u64,
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
struct ObservationBundle {
    observation: Observation,
    artifacts: Vec<Vec<u8>>,
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
fn describe_image(bytes: &[u8]) -> AppResult<Blob> {
    if bytes.len() > MAX_IMAGE {
        return Err("coordinator image capacity".into());
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
fn active_transition(r: &Root) -> AppResult<Option<&transition::Transition>> {
    let old = r.world_transition.as_ref().filter(|t| t.holding());
    let million = r.million_transition.as_ref().filter(|t| t.holding());
    match (old, million) {
        (Some(_), Some(_)) => Err("multiple active world transitions".into()),
        (Some(t), None) | (None, Some(t)) => Ok(Some(t)),
        (None, None) => Ok(None),
    }
}
fn active_transition_mut(r: &mut Root) -> AppResult<Option<&mut transition::Transition>> {
    let old = r.world_transition.as_ref().is_some_and(|t| t.holding());
    let million = r.million_transition.as_ref().is_some_and(|t| t.holding());
    match (old, million) {
        (true, true) => Err("multiple active world transitions".into()),
        (true, false) => Ok(r.world_transition.as_mut()),
        (false, true) => Ok(r.million_transition.as_mut()),
        (false, false) => Ok(None),
    }
}
fn transition_evidence<'a>(
    r: &'a Root,
    transition_hash: &str,
) -> AppResult<&'a transition::Transition> {
    let matches = [r.world_transition.as_ref(), r.million_transition.as_ref()]
        .into_iter()
        .flatten()
        .filter(|t| t.phase == "complete" && t.transition_hash.as_deref() == Some(transition_hash))
        .collect::<Vec<_>>();
    if matches.len() != 1 {
        return Err("epoch missing unique application transition evidence".into());
    }
    Ok(matches[0])
}
fn publication_segment(publication: &Publication) -> AppResult<Option<u64>> {
    publication.head.segment_id.as_ref().map(number).transpose()
}
fn reconcile_completed_segments(run: &mut RunState, publication: &Publication) -> AppResult<bool> {
    let mut committed = publication_segment(publication)?
        .map(|segment| segment.checked_add(1).ok_or("autonomous segment counter"))
        .transpose()?
        .unwrap_or(0);
    let epoch_checkpoints = match publication.version {
        6 => 0,
        7 => 1,
        8 => 2,
        _ => return Err("publication version".into()),
    };
    committed = committed
        .checked_sub(epoch_checkpoints)
        .ok_or("epoch ordinal")?;
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
    if let Some(t) = &r.world_transition {
        t.validate()?;
    }
    if let Some(t) = &r.million_transition {
        t.validate()?;
        if r.world_transition
            .as_ref()
            .is_none_or(|old| old.phase != "complete")
        {
            return Err("million transition requires completed torus epoch".into());
        }
    }
    active_transition(&r)?;
    if r.version != 7 || r.revision > (1u64 << 53) - 1 || r.image.length > MAX_IMAGE {
        return Err(
            "incompatible index application schema; no implicit lab-state migration".into(),
        );
    }
    r.source.validate()?;
    let pb = unhex(&r.publication_hex)?;
    let p: Publication = decode(&pb)?;
    if hash(&pb) != r.publication_hash
        || !matches!(p.version, 6..=8)
        || p.render_format.is_some()
        || p.chunk_bytes != CHUNK
        || p.artifacts.len() != 3
    {
        return Err("publication root mismatch".into());
    }
    if let Some(e) = &p.epoch {
        let t = transition_evidence(&r, &e.transition_hash)?;
        if t.transition_hash.as_ref() != Some(&e.transition_hash)
            || hash(&unhex(
                t.metadata_hex
                    .as_ref()
                    .ok_or("missing application metadata")?,
            )?) != e.metadata_hash
        {
            return Err("application transition metadata commitment".into());
        }
    } else if [r.world_transition.as_ref(), r.million_transition.as_ref()]
        .into_iter()
        .flatten()
        .any(|t| t.phase == "complete")
    {
        return Err("transition missing authenticated epoch".into());
    }
    validate_run(&r.run)?;
    validate_retention(&r.retention, &p)?;
    Ok(r)
}
fn read_blob(slot: u64, b: &Blob) -> AppResult<Vec<u8>> {
    if slot >= 4 || b.length > if slot == 0 { MAX_IMAGE } else { MAX_ARTIFACT } {
        return Err("blob bounds".into());
    }
    let mut out = Vec::with_capacity(b.length);
    BLOBS.with(|m| -> AppResult<()> {
        let m = m.borrow();
        for index in 0..b.length.div_ceil(CHUNK) {
            let bytes = m
                .get(&blob_key(slot, index as u64)?)
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
fn blob_key(slot: u64, chunk: u64) -> AppResult<u64> {
    let capacity = if slot == 0 { IMAGE_CHUNKS } else { CHUNKS };
    if slot >= 4 || chunk >= capacity {
        return Err("stable blob key bounds".into());
    }
    if slot == 0 && chunk >= CHUNKS {
        IMAGE_OVERFLOW_BASE
            .checked_add(chunk - CHUNKS)
            .ok_or_else(|| "stable blob key".into())
    } else {
        slot.checked_mul(CHUNKS)
            .and_then(|base| base.checked_add(chunk))
            .ok_or_else(|| "stable blob key".into())
    }
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
            pace: PACE.with(|p| p.borrow().hint()),
            running: r.run.running,
            idle: r.run.running && ARENA_IDLE.with(Cell::get),
            world_transition: active_transition(r).is_ok_and(|t| t.is_some()),
            generation: r.run.generation,
            segment_ticks: r.run.segment_ticks,
            publication_ticks: PACE.with(|p| p.borrow().publication_ticks(r.run.segment_ticks)),
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
fn host(r: &Root) -> AppResult<Coordinator<B2zHostKernel>> {
    let host = Coordinator::restore(
        &read_blob(0, &r.image)?,
        &r.image.sha256,
        B2zHostKernel::default(),
    )?;
    if number(&host.record.inbox.cursor)? != r.source.cursor {
        return Err("index source/coordinator divergence".into());
    }
    Ok(host)
}
/// No empty logical-time production. In-flight stages and every queued payment
/// (including malformed/underfunded ones) must finish before idling.
fn needs_simulation(h: &Coordinator<B2zHostKernel>) -> AppResult<bool> {
    if h.record.journal.stage.is_some() || !h.record.inbox.pending.is_empty() {
        return Ok(true);
    }
    let w = World::decode(&unhex(&h.record.journal.head.state_hex)?)?;
    Ok(!w.cannons.is_empty() || !w.balls.is_empty() || !w.pending.is_empty())
}

fn runtime_needs_simulation(
    h: &Coordinator<B2zHostKernel>,
    t: Option<&transition::Transition>,
) -> AppResult<bool> {
    if t.is_some_and(|t| t.holding()) {
        let pending_world_work = if t.is_some_and(|t| t.version == 2) {
            !World::decode(&unhex(&h.record.journal.head.state_hex)?)?
                .pending
                .is_empty()
        } else {
            false
        };
        return Ok(h.record.journal.stage.is_some()
            || !h.record.inbox.pending.is_empty()
            || h.record.inbox.cursor != h.record.inbox.retired_to
            || h.record.journal.head.seal.is_none()
            || pending_world_work);
    }
    needs_simulation(h)
}

fn persist(
    h: &Coordinator<B2zHostKernel>,
    old: Option<&Root>,
    source: SourceState,
    run: RunState,
) -> AppResult<Root> {
    persist_inner(h, old, source, run, true)
}

fn persist_inner(
    h: &Coordinator<B2zHostKernel>,
    old: Option<&Root>,
    source: SourceState,
    run: RunState,
    update_certified_data: bool,
) -> AppResult<Root> {
    let transition = old.map(active_transition).transpose()?.flatten();
    let idle = !runtime_needs_simulation(h, transition)?;
    let image = h.snapshot()?;
    let image_descriptor = describe_image(&image)?;
    let view = publication(&h.record)?;
    #[cfg(feature = "test-hooks")]
    let publication_changed = old.is_some_and(|r| r.publication_hash != view.sha256);
    let mut retention = old.map(|root| root.retention.clone()).unwrap_or_default();
    let mut retained_writes = Vec::<(u64, Vec<u8>)>::new();
    let mut evicted = Vec::<RetainedMeta>::new();
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
        evicted.push(entry);
    }
    retained_writes.retain(|(key, _)| {
        !evicted
            .iter()
            .any(|entry| entry.segment_id == key / RETAINED_STRIDE)
    });
    let r = Root {
        version: 7,
        revision: h.record.revision,
        image: image_descriptor,
        publication_hex: hex(&view.bytes),
        publication_hash: view.sha256,
        source,
        run,
        retention,
        world_transition: old.and_then(|r| r.world_transition.clone()),
        million_transition: old.and_then(|r| r.million_transition.clone()),
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
    #[cfg(feature = "test-hooks")]
    persistence_fault("before-write", publication_changed);
    BLOBS.with(|m| {
        let mut m = m.borrow_mut();
        for (slot, bytes) in writes {
            let previous_length = if slot == 0 {
                old.map_or(0, |r| r.image.length)
            } else {
                old_descriptors
                    .as_ref()
                    .map_or(0, |a| a[slot as usize - 1].length)
            };
            let count = bytes.len().div_ceil(CHUNK);
            for (i, chunk) in bytes.chunks(CHUNK).enumerate() {
                m.insert(
                    blob_key(slot, i as u64).expect("validated blob size"),
                    chunk.to_vec(),
                );
            }
            for i in count..previous_length.div_ceil(CHUNK) {
                m.remove(&blob_key(slot, i as u64).expect("validated previous blob size"));
            }
            #[cfg(feature = "test-hooks")]
            if slot == 0 {
                persistence_fault("after-image", publication_changed);
            }
        }
    });
    #[cfg(feature = "test-hooks")]
    persistence_fault("after-current", publication_changed);
    RETAINED.with(|map| {
        let mut map = map.borrow_mut();
        for entry in evicted {
            // The metadata describes every allocated key; unused capacity has no keys.
            for chunk in 0..entry.publication_length.div_ceil(CHUNK) {
                map.remove(
                    &retained_key(entry.segment_id, chunk as u64).expect("validated retained key"),
                );
            }
            for (kind, length) in entry.artifact_lengths.iter().enumerate() {
                for chunk in 0..length.div_ceil(CHUNK) {
                    map.remove(
                        &retained_key(
                            entry.segment_id,
                            PUBLICATION_CHUNKS + kind as u64 * CHUNKS + chunk as u64,
                        )
                        .expect("validated retained key"),
                    );
                }
            }
        }
        for (key, bytes) in retained_writes {
            map.insert(key, bytes);
        }
    });
    #[cfg(feature = "test-hooks")]
    persistence_fault("after-retained", publication_changed);
    ROOT.with(|c| {
        c.borrow_mut().set(root_bytes);
    });
    #[cfg(feature = "test-hooks")]
    persistence_fault("after-root", publication_changed);
    ARENA_IDLE.with(|flag| flag.set(idle));
    if update_certified_data {
        ic_cdk::api::certified_data_set(certified_root);
        #[cfg(feature = "test-hooks")]
        persistence_fault("after-certification", publication_changed);
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
fn refresh_pace() {
    PACE.with(|p| {
        p.borrow_mut()
            .refresh(ic_cdk::api::canister_liquid_cycle_balance())
    });
}
fn autonomous_once_inner(generation: u64, certify: bool) -> AppResult<()> {
    let r = root()?;
    if !r.run.running || r.run.generation != generation {
        return Ok(());
    }
    refresh_pace();
    if !PACE.with(|p| p.borrow().hint().admission_open) {
        return Ok(());
    }
    let now = ic_cdk::api::time();
    let mut h = host(&r)?;
    if !runtime_needs_simulation(&h, active_transition(&r)?)? {
        ARENA_IDLE.with(|f| f.set(true));
        clear_run_timer();
        return Ok(());
    }
    let mut run = r.run.clone();
    let publication_ticks = PACE.with(|p| p.borrow().publication_ticks(run.segment_ticks));
    let mut actions = 0u32;
    let mut work = 0u64;
    if h.record.journal.stage.is_none()
        && PACE.with(|p| p.borrow_mut().wait(now, publication_ticks)) > 0
    {
        return Ok(());
    }
    let mut phases = [0u64; 3];
    while actions < (pace::MAX_ACTIONS as u32)
        && work < pace::MAX_WORK
        && (actions == 0 || ic_cdk::api::performance_counter(0) < pace::INSTRUCTION_YIELD)
    {
        let before = ic_cdk::api::performance_counter(0);
        let phase = h
            .record
            .journal
            .stage
            .as_ref()
            .map(|s| (s.phase.clone(), s.ready_hash.clone()));
        let index;
        match phase {
            None => {
                index = 0;
                PACE.with(|p| p.borrow_mut().batch_started = now);
                let end = number(&h.record.journal.head.logical_end)?
                    .checked_add(publication_ticks)
                    .ok_or("logical time")?;
                h.apply(Action::Seal {
                    logical_end: Int(end.into()),
                })?;
                run.current_segment_work = 0;
            }
            Some((phase, _)) if phase == "running" => {
                index = 1;
                let budget = u64::from(run.work_budget)
                    .min(pace::MAX_WORK - work)
                    .min(512);
                let progress = h
                    .apply(Action::Step {
                        budget: budget as usize,
                    })?
                    .ok_or("kernel progress")?;
                let used = progress.used as u64;
                work += used;
                run.current_segment_work = run
                    .current_segment_work
                    .checked_add(used)
                    .ok_or("work overflow")?;
                run.total_work = run.total_work.checked_add(used).ok_or("work overflow")?;
            }
            Some((phase, ready)) if phase == "ready" => {
                index = 2;
                let seal = &h.record.journal.stage.as_ref().unwrap().seal;
                let ordinary = seal.input_count == 0;
                let completed_ticks = number(&seal.logical_end)?
                    .checked_sub(number(&seal.logical_start)?)
                    .ok_or("logical segment order")?;
                h.apply(Action::Publish {
                    manifest_hash: ready.ok_or("ready manifest")?,
                })?;
                run.completed_segments = run
                    .completed_segments
                    .checked_add(1)
                    .ok_or("segment counter")?;
                run.last_segment_work = run.current_segment_work;
                run.max_segment_work = run.max_segment_work.max(run.current_segment_work);
                run.current_segment_work = 0;
                PACE.with(|p| p.borrow_mut().published(now, completed_ticks, ordinary));
            }
            _ => return Err("coordinator phase".into()),
        }
        actions += 1;
        phases[index] += ic_cdk::api::performance_counter(0) - before;
        if index == 2 {
            break;
        }
    }
    if actions == 0 {
        return Ok(());
    }
    run.callback_count = run
        .callback_count
        .checked_add(1)
        .ok_or("callback counter")?;
    run.last_error = None;
    let before_persist = ic_cdk::api::performance_counter(0);
    persist_inner(&h, Some(&r), r.source.clone(), run, certify)?;
    let instructions = ic_cdk::api::performance_counter(0);
    let persist_instructions = instructions - before_persist;
    DRIVER.with(|d| {
        let mut d = d.borrow_mut();
        d.messages += 1;
        d.seal_instructions += phases[0];
        d.step_instructions += phases[1];
        d.publish_instructions += phases[2];
        d.persist_instructions += persist_instructions;
        d.last_seal_instructions = phases[0];
        d.last_step_instructions = phases[1];
        d.last_publish_instructions = phases[2];
        d.last_persist_instructions = persist_instructions;
        d.last_instructions = instructions;
        d.max_instructions = d.max_instructions.max(instructions);
        d.max_actions = d.max_actions.max(actions);
    });
    if ARENA_IDLE.with(Cell::get) {
        clear_run_timer();
    }
    Ok(())
}
fn run_delay(run: &RunState) -> Duration {
    if !PACE.with(|p| p.borrow().hint().admission_open) {
        return Duration::from_secs(60);
    }
    let wait = PACE.with(|p| {
        let mut p = p.borrow_mut();
        let ticks = p.publication_ticks(run.segment_ticks);
        p.scheduled_wait(ic_cdk::api::time(), ticks)
    });
    Duration::from_nanos(wait.max(1_000_000))
}
fn arm_run_timer(generation: u64, delay: Duration) {
    let timer = ic_cdk_timers::set_timer(delay, async move {
        RUN_TIMER.with(|t| t.borrow_mut().take());
        let Ok(r) = root() else {
            return;
        };
        if !r.run.running || r.run.generation != generation {
            return;
        }
        // A bounded continuation is armed before work; no parallel driver or missed-time replay.
        arm_run_timer(generation, Duration::from_millis(50));
        if let Err(e) = autonomous_once(generation) {
            let _ = stop_run_after_error(generation, e);
            clear_run_timer();
            return;
        }
        if let Ok(next) = root() {
            clear_run_timer();
            if next.run.running && !ARENA_IDLE.with(Cell::get) {
                arm_run_timer(generation, run_delay(&next.run));
            }
        }
    });
    RUN_TIMER.with(|t| *t.borrow_mut() = Some(timer));
}
fn install_run_timer(run: &RunState) {
    clear_run_timer();
    refresh_pace();
    if run.running && !ARENA_IDLE.with(Cell::get) {
        arm_run_timer(run.generation, run_delay(run));
    }
}
#[derive(CandidType, Deserialize)]
struct RuntimeDiagnostics {
    liquid_cycles: candid::Nat,
    total_cycles: candid::Nat,
    metrics: DriverMetrics,
    phase_action_limit: u32,
    message_work_limit: u64,
    instruction_yield: u64,
}
#[ic_cdk::query]
fn controller_funding() -> std::result::Result<funding::State, String> {
    authorized()?;
    funding::read()
}
#[ic_cdk::update]
fn set_funding_paused(paused: bool) -> std::result::Result<funding::State, String> {
    authorized()?;
    funding::pause(paused)
}
#[cfg(feature = "test-hooks")]
thread_local! { static PERSISTENCE_FAULT: RefCell<Option<String>> = const { RefCell::new(None) }; }
#[cfg(feature = "test-hooks")]
fn persistence_fault(point: &str, publication_changed: bool) {
    PERSISTENCE_FAULT.with(|fault| {
        let armed = fault.borrow();
        let triggered = armed.as_ref().is_some_and(|armed| {
            armed == &format!("persistence:{point}")
                || (publication_changed && armed == &format!("persistence-publish:{point}"))
        });
        if triggered {
            ic_cdk::trap(format!("B2Z_PERSISTENCE_FAULT {point}"));
        }
    });
}
#[cfg(feature = "test-hooks")]
#[ic_cdk::update]
fn test_funding_fault(point: String) -> std::result::Result<(), String> {
    authorized()?;
    if point == "persistence:clear" {
        PERSISTENCE_FAULT.with(|f| *f.borrow_mut() = None);
        return Ok(());
    }
    if let Some(stage) = point
        .strip_prefix("persistence:")
        .or_else(|| point.strip_prefix("persistence-publish:"))
    {
        if ![
            "before-write",
            "after-image",
            "after-current",
            "after-retained",
            "after-root",
            "after-certification",
        ]
        .contains(&stage)
        {
            return Err("unknown persistence fault".into());
        }
        PERSISTENCE_FAULT.with(|f| *f.borrow_mut() = Some(point));
        return Ok(());
    }
    funding::set_fault(point)
}
#[ic_cdk::query]
fn controller_runtime() -> std::result::Result<RuntimeDiagnostics, String> {
    authorized()?;
    Ok(RuntimeDiagnostics {
        liquid_cycles: ic_cdk::api::canister_liquid_cycle_balance().into(),
        total_cycles: ic_cdk::api::canister_cycle_balance().into(),
        metrics: DRIVER.with(|d| d.borrow().clone()),
        phase_action_limit: pace::MAX_ACTIONS as u32,
        message_work_limit: pace::MAX_WORK,
        instruction_yield: pace::INSTRUCTION_YIELD,
    })
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
        let mut identity = if w.version == 5 {
            b2z_native::million_identity()?
        } else if w.torus() {
            b2z_native::torus_identity()?
        } else {
            b2z_native::identity()?
        };
        identity["source_id"] = serde_json::Value::String(source_id);
        let identity: Identity = serde_json::from_value(identity).map_err(|e| e.to_string())?;
        let h = Coordinator::create(
            &initial_world,
            identity,
            logical_start,
            0,
            "00".repeat(32),
            B2zHostKernel::default(),
        )?;
        let r = persist(&h, None, source, RunState::default())?;
        cache_poke_policy(&r.source);
        refresh_pace();
        install_source_timer();
        request_reconciliation()?;
        funding::initialize()?;
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
        let idle = !runtime_needs_simulation(&h, active_transition(&r)?)?;
        ARENA_IDLE.with(|flag| flag.set(idle));
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
        refresh_pace();
        install_source_timer();
        request_reconciliation()?;
        install_run_timer(&r.run);
        funding::initialize()?;
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
/// Returns one atomic certified snapshot and its small public artifacts. The
/// byte cap keeps the query bounded; clients retain the chunked fallback.
#[ic_cdk::query]
fn observation_bundle() -> std::result::Result<ObservationBundle, String> {
    let r = root()?;
    let publication_bytes = unhex(&r.publication_hex)?;
    let publication: Publication = decode(&publication_bytes)?;
    let total = publication
        .artifacts
        .iter()
        .try_fold(0usize, |sum, descriptor| {
            sum.checked_add(descriptor.length)
                .ok_or("artifact bundle byte count")
        })?;
    if total > ARTIFACT_BUNDLE_BYTES {
        return Err("artifact bundle capacity".into());
    }
    let artifacts = publication
        .artifacts
        .iter()
        .enumerate()
        .map(|(kind, descriptor)| {
            let bytes = read_blob(
                kind as u64 + 1,
                &Blob {
                    length: descriptor.length,
                    sha256: descriptor.sha256.clone(),
                },
            )?;
            for (index, expected) in descriptor.chunks.iter().enumerate() {
                let start = index * CHUNK;
                let end = (start + CHUNK).min(bytes.len());
                if hash(&bytes[start..end]) != *expected {
                    return Err("artifact bundle integrity".into());
                }
            }
            Ok(bytes)
        })
        .collect::<AppResult<Vec<_>>>()?;
    Ok(ObservationBundle {
        observation: Observation {
            publication: publication_bytes,
            certificate: ic_cdk::api::data_certificate(),
        },
        artifacts,
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
/// One bounded query avoids three independent artifact round trips for ordinary
/// small publications. Larger publications retain the existing chunk fallback.
#[ic_cdk::query]
fn artifact_bundle(
    segment_id: u64,
    expected_publication: String,
) -> std::result::Result<Vec<Vec<u8>>, String> {
    let r = root()?;
    let current_bytes = unhex(&r.publication_hex)?;
    let current: Publication = decode(&current_bytes)?;
    let current_segment = publication_segment(&current)?;
    let (publication, retained) = if current_segment == Some(segment_id) {
        if expected_publication != r.publication_hash {
            return Err("stale observation publication".into());
        }
        (current, false)
    } else {
        let meta = r
            .retention
            .history
            .iter()
            .find(|entry| entry.segment_id == segment_id)
            .ok_or("publication unavailable: snapshot resync required")?;
        if expected_publication != meta.publication_hash {
            return Err("stale retained publication".into());
        }
        (decode(&retained_publication_bytes(meta)?)?, true)
    };
    let total = publication
        .artifacts
        .iter()
        .try_fold(0usize, |sum, descriptor| {
            sum.checked_add(descriptor.length)
                .ok_or("artifact bundle byte count")
        })?;
    if total > ARTIFACT_BUNDLE_BYTES {
        return Err("artifact bundle capacity".into());
    }
    publication
        .artifacts
        .iter()
        .enumerate()
        .map(|(kind, descriptor)| {
            let mut artifact = Vec::with_capacity(descriptor.length);
            for (index, expected) in descriptor.chunks.iter().enumerate() {
                let bytes = if retained {
                    let key = retained_key(
                        segment_id,
                        PUBLICATION_CHUNKS + kind as u64 * CHUNKS + index as u64,
                    )?;
                    RETAINED
                        .with(|map| map.borrow().get(&key))
                        .ok_or("missing retained chunk")?
                } else {
                    BLOBS
                        .with(|map| {
                            map.borrow()
                                .get(&((kind as u64 + 1) * CHUNKS + index as u64))
                        })
                        .ok_or("missing public chunk")?
                };
                if bytes.len() != CHUNK.min(descriptor.length - index * CHUNK)
                    || hash(&bytes) != *expected
                {
                    return Err("artifact bundle integrity".into());
                }
                artifact.extend(bytes);
            }
            if artifact.len() != descriptor.length || hash(&artifact) != descriptor.sha256 {
                return Err("artifact bundle integrity".into());
            }
            Ok(artifact)
        })
        .collect()
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
    let h = host(&r)?;
    let world = World::decode(&unhex(&h.record.journal.head.state_hex)?)?;
    let current: Publication = decode(&unhex(&r.publication_hex)?)?;
    reconcile_completed_segments(&mut r.run, &current)?;
    let requested = RunState {
        // One v5 tick can contain up to 64 balls × ~32 verified crossings.
        // Keep that worst-case event artifact below DTR's fixed 1 MiB bound.
        segment_ticks: if world.version == 5 {
            1
        } else {
            config.segment_ticks
        },
        pacing_seconds: config.pacing_seconds,
        work_budget: config.work_budget,
        ..r.run.clone()
    };
    validate_run(&requested)?;
    if r.run.running {
        if r.run.segment_ticks != requested.segment_ticks
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
// Disposable-only cycle-policy probe. Excluded from the normal module.
#[cfg(feature = "test-hooks")]
#[ic_cdk::update]
fn test_liquid_budget(target: u64) -> std::result::Result<Status, String> {
    authorized()?;
    let r = root()?;
    if r.source.network != "pocketic-local" {
        return Err("disposable only".into());
    }
    let liquid = ic_cdk::api::canister_liquid_cycle_balance();
    ic_cdk::api::cycles_burn(liquid.saturating_sub(u128::from(target)));
    refresh_pace();
    install_run_timer(&r.run);
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
    let now = ic_cdk::api::time() / 1_000_000_000;
    let expired = now.saturating_sub(r.source.started_at) >= SCAN_LEASE_SECONDS;
    let schedule = (!r.source.in_flight || expired) && !r.source.wake_scheduled;
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
    refresh_pace();
    let mut r = root()?;
    if ic_cdk::api::canister_liquid_cycle_balance() < pace::INDEX_FLOOR {
        r.source.wake_scheduled = false;
        r.source.requested = true;
        save_root_only(&r)?;
        return Ok(None);
    }
    r.source.wake_scheduled = false;
    let transition_phase = active_transition(&r)?.map(|t| t.phase.clone());
    let transition_cutover = active_transition(&r)?
        .filter(|t| t.phase == "drain")
        .and_then(|t| t.ledger_cutover.as_ref())
        .map(number)
        .transpose()?;
    if transition_phase.as_deref() == Some("ready") {
        save_root_only(&r)?;
        return Ok(None);
    }
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
        before: r
            .source
            .pending
            .as_ref()
            .map(|p| p.before)
            .or(transition_cutover),
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
        let cutover = active_transition(&r)?
            .filter(|t| t.phase == "drain")
            .map(|t| number(t.ledger_cutover.as_ref().ok_or("Ledger cutover")?))
            .transpose()?;
        if let Some(cutover) = cutover {
            if page.transactions.iter().any(|tx| tx.id >= cutover) {
                return Err("Index exceeded reviewed cutover".into());
            }
            if page.transactions.is_empty() && next.pending.is_none() {
                transition::validate_empty_account_page(next.cursor, page.oldest_tx_id, cutover)?;
                next.in_flight = false;
                next.started_at = 0;
                next.last_error = None;
                r.source = next;
                active_transition_mut(&mut r)?
                    .ok_or("missing active cutover")?
                    .phase = "ready".into();
                save_root_only(&r)?;
                return Ok(());
            }
        }
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
        next.admitted(end)?;
        next.in_flight = false;
        next.started_at = 0;
        next.last_error = None;
        r = persist(&h, Some(&r), next, r.run.clone())?;
        if RUN_TIMER.with(|slot| slot.borrow().is_none()) {
            install_run_timer(&r.run);
        }
    } else {
        next.in_flight = false;
        next.started_at = 0;
        next.last_error = None;
        r.source = next;
        save_root_only(&r)?;
    }
    if active_transition(&r)?.is_some_and(|t| t.phase == "drain") && r.source.pending.is_none() {
        active_transition_mut(&mut r)?
            .ok_or("missing active cutover")?
            .phase = "ready".into();
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
        if active_transition(&r)?.is_some_and(|t| t.phase == "ledger" || t.phase == "index") {
            return measure_cutover(&lease).await;
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
        #[cfg(feature = "test-hooks")]
        let trap_after_reply = TRAP_NEXT_INDEX_REPLY.with(|flag| flag.replace(false));
        let response = Call::bounded_wait(lease.index, "get_account_identifier_transactions")
            .change_timeout(SCAN_CALL_TIMEOUT_SECONDS)
            .with_arg(source::HistoryArgs {
                account_identifier: r.source.recipient_hex,
                start: lease.before,
                max_results: source::PAGE,
            })
            .await
            .map_err(|e| format!("index unavailable: {e}"))?;
        #[cfg(feature = "test-hooks")]
        if trap_after_reply {
            ic_cdk::trap("S14 injected B2Z response-handler trap after index await");
        }
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
// These two metadata-only queries establish a global barrier; account history
// still comes exclusively from the existing configured Index account endpoint.
#[derive(CandidType, Deserialize)]
struct LedgerTipArgs {
    start: u64,
    length: u64,
}
#[derive(CandidType, Deserialize)]
struct LedgerTip {
    chain_length: u64,
}
#[derive(CandidType, Deserialize)]
struct IndexWatermark {
    num_blocks_synced: u64,
}
async fn measure_cutover(lease: &Lease) -> AppResult<()> {
    let r = root()?;
    let t = active_transition(&r)?.ok_or("missing world cutover")?;
    let phase = t.phase.clone();
    let observed = if phase == "ledger" {
        let ledger = Principal::from_text(&r.source.ledger).map_err(|e| e.to_string())?;
        let response = Call::bounded_wait(ledger, "query_blocks")
            .change_timeout(SCAN_CALL_TIMEOUT_SECONDS)
            .with_arg(LedgerTipArgs {
                start: 0,
                length: 0,
            })
            .await
            .map_err(|e| format!("Ledger cutover query: {e}"))?;
        response
            .candid::<LedgerTip>()
            .map_err(|e| format!("Ledger cutover decode: {e}"))?
            .chain_length
    } else if phase == "index" {
        let response = Call::bounded_wait(lease.index, "status")
            .change_timeout(SCAN_CALL_TIMEOUT_SECONDS)
            .await
            .map_err(|e| format!("Index sync query: {e}"))?;
        response
            .candid::<IndexWatermark>()
            .map_err(|e| format!("Index sync decode: {e}"))?
            .num_blocks_synced
    } else {
        return Err("world cutover measurement phase".into());
    };
    let mut r = root()?;
    if !matches_lease(&r.source, lease) {
        return Ok(());
    }
    let source_cursor = r.source.cursor;
    let t = active_transition_mut(&mut r)?.ok_or("missing world cutover")?;
    if t.phase != phase {
        return Err("world cutover phase changed".into());
    }
    let advanced = if phase == "ledger" {
        if observed < source_cursor {
            return Err("Ledger tip below admitted account cursor".into());
        }
        t.ledger_cutover = Some(Int(observed.into()));
        t.phase = "index".into();
        true
    } else {
        t.index_synced = Some(Int(observed.into()));
        if observed >= number(t.ledger_cutover.as_ref().ok_or("Ledger cutover")?)? {
            t.phase = "drain".into();
            true
        } else {
            false
        }
    };
    r.source.in_flight = false;
    r.source.started_at = 0;
    r.source.last_error = None;
    r.source.requested = false;
    save_root_only(&r)?;
    if advanced {
        request_reconciliation()?;
    }
    Ok(())
}
/// Begins only the reviewed v3→v4 cutover. Never accepts state, identities or a
/// caller-supplied Ledger height. The fenced worker obtains its own watermarks.
#[ic_cdk::update]
fn prepare_torus_transition() -> std::result::Result<Vec<u8>, String> {
    authorized()?;
    if ic_cdk::api::canister_liquid_cycle_balance() < transition::MIN_LIQUID_CYCLES {
        return Err("insufficient liquid cycles for safe transition".into());
    }
    let mut r = root()?;
    let h = host(&r)?;
    if let Some(t) = &r.world_transition {
        return encode(t);
    }
    let w = World::decode(&unhex(&h.record.journal.head.state_hex)?)?;
    if w.version != 3 || w.width != 16 || w.height != 8 || h.record.journal.epoch.is_some() {
        return Err("only reviewed v3 world can transition".into());
    }
    let expected = b2z_native::identity()?;
    let actual = serde_json::to_value(&h.record.journal.identity).map_err(|e| e.to_string())?;
    if ["rules_hash", "config_hash", "schema_hash"]
        .iter()
        .any(|k| actual[k] != expected[k])
    {
        return Err("unexpected old world identity".into());
    }
    if r.source.in_flight || r.source.pending.is_some() {
        return Err("finish existing source reconciliation before cutover".into());
    }
    r.world_transition = Some(transition::Transition::new());
    save_root_only(&r)?;
    ARENA_IDLE.with(|f| {
        f.set(
            !runtime_needs_simulation(&h, active_transition(&r).expect("validated transition"))
                .expect("validated runtime"),
        )
    });
    install_run_timer(&r.run);
    request_reconciliation()?;
    encode(r.world_transition.as_ref().unwrap())
}
#[ic_cdk::query]
fn torus_transition_status() -> std::result::Result<Vec<u8>, String> {
    authorized()?;
    encode(&root()?.world_transition)
}
/// Derive the new world from the actual durable committed state, once. Expected
/// manifest protects against a stale operator view; there is no arbitrary replacement.
#[ic_cdk::update]
fn commit_torus_transition(
    expected_previous_manifest: String,
) -> std::result::Result<Vec<u8>, String> {
    authorized()?;
    if unhex(&expected_previous_manifest)?.len() != 32 {
        return Err("expected manifest hash".into());
    }
    let mut r = root()?;
    let mut h = host(&r)?;
    let t = r
        .world_transition
        .as_ref()
        .ok_or("prepare reviewed cutover first")?;
    if t.phase == "complete" {
        let e = h
            .record
            .journal
            .epoch
            .as_ref()
            .ok_or("completed transition missing epoch")?;
        if t.transition_hash.as_ref() != Some(&e.transition_hash) {
            return Err("torus transition has been superseded".into());
        }
        e.validate()?;
        let previous_manifest = if let Some(manifest) = &t.previous_manifest {
            manifest.clone()
        } else {
            let previous: Publication = decode(&unhex(&e.previous_publication_hex)?)?;
            previous.head.manifest_hash
        };
        if previous_manifest != expected_previous_manifest {
            return Err("conflicting transition retry".into());
        }
        return encode(&r.world_transition);
    }
    if h.record.journal.epoch.is_some() {
        return Err("unexpected authenticated epoch before torus transition".into());
    }
    if ic_cdk::api::canister_liquid_cycle_balance() < transition::MIN_LIQUID_CYCLES {
        return Err("insufficient liquid cycles for safe transition".into());
    }
    if h.record.journal.head.manifest_hash != expected_previous_manifest {
        return Err("old committed manifest changed".into());
    }
    let (output, metadata, identity) = transition::candidate(&h, t, &r.source)?;
    let epoch = h.prepare_transition(identity, &output, hash(&metadata))?;
    h.apply(Action::Transition {
        epoch: Box::new(epoch.clone()),
        state_hex: hex(&output.state),
        event_hex: hex(&output.events),
        score_hex: hex(&output.scores),
    })?;
    let t = r.world_transition.as_mut().unwrap();
    t.phase = "complete".into();
    t.metadata_hex = Some(hex(&metadata));
    t.transition_hash = Some(epoch.transition_hash);
    t.previous_manifest = Some(expected_previous_manifest);
    r.source.requested = true;
    r = persist(&h, Some(&r), r.source.clone(), r.run.clone())?;
    refresh_pace();
    install_run_timer(&r.run);
    request_reconciliation()?;
    encode(&r.world_transition)
}

/// Begins only the reviewed v4→v5 cutover. The existing v3→v4 evidence is
/// retained independently, and the worker obtains fresh global watermarks.
#[ic_cdk::update]
fn prepare_million_transition() -> std::result::Result<Vec<u8>, String> {
    authorized()?;
    if ic_cdk::api::canister_liquid_cycle_balance() < transition::MIN_LIQUID_CYCLES {
        return Err("insufficient liquid cycles for safe transition".into());
    }
    let mut r = root()?;
    let h = host(&r)?;
    if let Some(t) = &r.million_transition {
        return encode(t);
    }
    if active_transition(&r)?.is_some() {
        return Err("finish existing world transition first".into());
    }
    let old_transition = r
        .world_transition
        .as_ref()
        .filter(|t| t.phase == "complete")
        .ok_or("authenticated v4 transition evidence required")?;
    let old_epoch = h
        .record
        .journal
        .epoch
        .as_ref()
        .filter(|e| old_transition.transition_hash.as_ref() == Some(&e.transition_hash))
        .ok_or("current v4 epoch does not match application evidence")?;
    old_epoch.validate()?;
    let w = World::decode(&unhex(&h.record.journal.head.state_hex)?)?;
    if w.version != 4 || w.width != 32 || w.height != 32 {
        return Err("only reviewed v4 torus can transition".into());
    }
    let expected = b2z_native::torus_identity()?;
    let actual = serde_json::to_value(&h.record.journal.identity).map_err(|e| e.to_string())?;
    if ["rules_hash", "config_hash", "schema_hash"]
        .iter()
        .any(|k| actual[*k] != expected[*k])
    {
        return Err("unexpected v4 world identity".into());
    }
    if r.source.in_flight || r.source.pending.is_some() {
        return Err("finish existing source reconciliation before cutover".into());
    }
    r.million_transition = Some(transition::Transition::million());
    save_root_only(&r)?;
    ARENA_IDLE.with(|f| {
        f.set(
            !runtime_needs_simulation(&h, active_transition(&r).expect("validated transition"))
                .expect("validated runtime"),
        )
    });
    install_run_timer(&r.run);
    request_reconciliation()?;
    encode(r.million_transition.as_ref().unwrap())
}

#[ic_cdk::query]
fn million_transition_status() -> std::result::Result<Vec<u8>, String> {
    authorized()?;
    encode(&root()?.million_transition)
}

/// Commit the reviewed compact 1000×1000 state through DTR's generic next
/// epoch operation. No state or identity is accepted from the caller.
#[ic_cdk::update]
fn commit_million_transition(
    expected_previous_manifest: String,
) -> std::result::Result<Vec<u8>, String> {
    authorized()?;
    if unhex(&expected_previous_manifest)?.len() != 32 {
        return Err("expected manifest hash".into());
    }
    let mut r = root()?;
    let mut h = host(&r)?;
    let t = r
        .million_transition
        .as_ref()
        .ok_or("prepare reviewed million-cell cutover first")?;
    if t.phase == "complete" {
        let e = h
            .record
            .journal
            .epoch
            .as_ref()
            .ok_or("completed transition missing epoch")?;
        if t.transition_hash.as_ref() != Some(&e.transition_hash)
            || t.previous_manifest.as_deref() != Some(&expected_previous_manifest)
        {
            return Err("conflicting transition retry".into());
        }
        e.validate()?;
        return encode(&r.million_transition);
    }
    if ic_cdk::api::canister_liquid_cycle_balance() < transition::MIN_LIQUID_CYCLES {
        return Err("insufficient liquid cycles for safe transition".into());
    }
    if h.record.journal.head.manifest_hash != expected_previous_manifest {
        return Err("old committed manifest changed".into());
    }
    let (output, metadata, identity) = transition::million_candidate(&h, t, &r.source)?;
    let epoch = h.prepare_transition(identity, &output, hash(&metadata))?;
    h.apply(Action::Transition {
        epoch: Box::new(epoch.clone()),
        state_hex: hex(&output.state),
        event_hex: hex(&output.events),
        score_hex: hex(&output.scores),
    })?;
    let t = r.million_transition.as_mut().unwrap();
    t.phase = "complete".into();
    t.metadata_hex = Some(hex(&metadata));
    t.transition_hash = Some(epoch.transition_hash);
    t.previous_manifest = Some(expected_previous_manifest);
    // V5 publishes one logical tick at a time so a maximum-population motion
    // artifact remains bounded without changing any mode's tick rate.
    r.run.segment_ticks = 1;
    r.source.requested = true;
    r = persist(&h, Some(&r), r.source.clone(), r.run.clone())?;
    refresh_pace();
    install_run_timer(&r.run);
    request_reconciliation()?;
    encode(&r.million_transition)
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
    use super::*;
    #[test]
    fn coordinator_image_overflow_preserves_existing_blob_slots() {
        assert_eq!(blob_key(0, 0).unwrap(), 0);
        assert_eq!(blob_key(0, CHUNKS - 1).unwrap(), CHUNKS - 1);
        assert_eq!(blob_key(1, 0).unwrap(), CHUNKS);
        assert_eq!(blob_key(3, CHUNKS - 1).unwrap(), IMAGE_OVERFLOW_BASE - 1);
        assert_eq!(blob_key(0, CHUNKS).unwrap(), IMAGE_OVERFLOW_BASE);
        assert_eq!(
            blob_key(0, IMAGE_CHUNKS - 1).unwrap(),
            IMAGE_OVERFLOW_BASE + IMAGE_CHUNKS - CHUNKS - 1
        );
        assert!(blob_key(0, IMAGE_CHUNKS).is_err());
        assert!(blob_key(1, CHUNKS).is_err());
    }

    fn empty_host() -> Coordinator<B2zHostKernel> {
        let fixture: serde_json::Value =
            serde_json::from_str(include_str!("../../../tests/fixtures/b2z-v3-golden.json"))
                .unwrap();
        let mut w =
            World::decode(&unhex(fixture["cases"][0]["initial_hex"].as_str().unwrap()).unwrap())
                .unwrap();
        w.cannons.clear();
        w.balls.clear();
        w.pending.clear();
        w.cells.fill(0);
        w.time = dtr_wire::Rat::new(0.into(), 1.into()).unwrap();
        let mut identity = b2z_native::identity().unwrap();
        identity["source_id"] = serde_json::Value::String("00".repeat(32));
        Coordinator::create(
            &w.encode().unwrap(),
            serde_json::from_value(identity).unwrap(),
            0,
            0,
            "00".repeat(32),
            B2zHostKernel::default(),
        )
        .unwrap()
    }
    #[test]
    fn empty_history_idles_but_inflight_stage_and_rejected_payment_need_work() {
        let mut h = empty_host();
        assert!(!needs_simulation(&h).unwrap());
        h.apply(Action::IngestOrdered {
            start: Int(0.into()),
            end: Int(1.into()),
            inputs: vec![dtr_host::Input {
                position: Int(0.into()),
                payload_hex: hex(&[
                    b"BTZPAY02".as_slice(),
                    &[1; 32],
                    &1u64.to_be_bytes(),
                    &[0; 8],
                ]
                .concat()),
            }],
            anchor: "11".repeat(32),
        })
        .unwrap();
        assert!(needs_simulation(&h).unwrap());
        h.apply(Action::Seal {
            logical_end: Int(2.into()),
        })
        .unwrap();
        assert!(needs_simulation(&h).unwrap());
        while h.record.journal.stage.as_ref().unwrap().phase == "running" {
            h.apply(Action::Step { budget: 512 }).unwrap();
        }
        assert!(needs_simulation(&h).unwrap());
        let manifest_hash = h
            .record
            .journal
            .stage
            .as_ref()
            .unwrap()
            .ready_hash
            .clone()
            .unwrap();
        h.apply(Action::Publish { manifest_hash }).unwrap();
        assert!(!needs_simulation(&h).unwrap());
        assert!(h.record.journal.head.segment_id.is_some());
    }
    #[test]
    fn stable_storage_only_contains_described_chunks_after_resize_and_eviction() {
        use ic_stable_structures::Memory as _;
        use std::collections::{BTreeMap, BTreeSet};
        fn reopen(backing: &DefaultMemoryImpl) {
            // Host tests share an Rc-backed memory; the Wasm alias is a Copy handle.
            #[cfg(not(target_arch = "wasm32"))]
            let manager = MemoryManager::init(backing.clone());
            #[cfg(target_arch = "wasm32")]
            let manager = MemoryManager::init(*backing);
            MANAGER.with(|m| *m.borrow_mut() = manager);
            ROOT.with(|r| *r.borrow_mut() = StableCell::init(memory(0), Vec::new()));
            BLOBS.with(|m| *m.borrow_mut() = StableBTreeMap::init(memory(1)));
            RETAINED.with(|m| *m.borrow_mut() = StableBTreeMap::init(memory(2)));
        }
        let backing = DefaultMemoryImpl::default();
        reopen(&backing);
        let mut h = empty_host();
        let (source, _) = SourceState::configured(
            IndexConfig {
                network: "pocketic-local".into(),
                ledger: Principal::self_authenticating([1; 32]),
                index: Principal::self_authenticating([2; 32]),
                receiving_subaccount: 0,
                event_horizon: None,
                starting_policy: source::StartingPolicy::FromBeginning,
            },
            Principal::self_authenticating([3; 32]),
        )
        .unwrap();
        let mut source = source;
        let payload_hex = hex(&[
            b"BTZPAY02".as_slice(),
            &[1; 32],
            &1u64.to_be_bytes(),
            &[0; 8],
        ]
        .concat());
        h.apply(Action::IngestOrdered {
            start: Int(0.into()),
            end: Int(128.into()),
            inputs: (0..128)
                .map(|n| dtr_host::Input {
                    position: Int(n.into()),
                    payload_hex: payload_hex.clone(),
                })
                .collect(),
            anchor: "11".repeat(32),
        })
        .unwrap();
        source.cursor = 128;
        let mut r = persist_inner(&h, None, source, RunState::default(), false).unwrap();
        assert!(r.image.length > CHUNK, "exercise allocated chunk shrink");
        let mut expected = BTreeMap::new();
        let mut settled_pages = 0;
        for ordinal in 1..=48 {
            let end = ordinal * 2;
            h.apply(Action::Seal {
                logical_end: Int(end.into()),
            })
            .unwrap();
            r = persist_inner(&h, Some(&r), r.source.clone(), r.run.clone(), false).unwrap();
            while h.record.journal.stage.as_ref().unwrap().phase == "running" {
                h.apply(Action::Step { budget: 512 }).unwrap();
                r = persist_inner(&h, Some(&r), r.source.clone(), r.run.clone(), false).unwrap();
            }
            let manifest_hash = h
                .record
                .journal
                .stage
                .as_ref()
                .unwrap()
                .ready_hash
                .clone()
                .unwrap();
            h.apply(Action::Publish { manifest_hash }).unwrap();
            r = persist_inner(&h, Some(&r), r.source.clone(), r.run.clone(), false).unwrap();
            let view = publication(&h.record).unwrap();
            let segment = publication_segment(&view.data).unwrap().unwrap();
            expected.insert(segment, (view.bytes.clone(), view.artifacts.clone()));
            assert_eq!(r.retention.history.len(), (ordinal - 1).min(15));
            if ordinal == 8 {
                assert_eq!(r.retention.history.len(), 7);
            }
            let allocated = r.image.length.div_ceil(CHUNK)
                + view
                    .data
                    .artifacts
                    .iter()
                    .map(|a| a.length.div_ceil(CHUNK))
                    .sum::<usize>();
            assert_eq!(BLOBS.with(|m| m.borrow().len()), allocated as u64);
            for (kind, bytes) in view.artifacts.iter().enumerate() {
                assert_eq!(
                    read_blob(kind as u64 + 1, &describe(bytes).unwrap()).unwrap(),
                    *bytes
                );
            }
            let retained = r
                .retention
                .history
                .iter()
                .map(|m| {
                    m.publication_length.div_ceil(CHUNK)
                        + m.artifact_lengths
                            .iter()
                            .map(|n| n.div_ceil(CHUNK))
                            .sum::<usize>()
                })
                .sum::<usize>();
            assert_eq!(RETAINED.with(|m| m.borrow().len()), retained as u64);
            let mut expected_keys = BTreeSet::new();
            for meta in &r.retention.history {
                let bytes = retained_publication_bytes(meta).unwrap();
                assert_eq!(hash(&bytes), meta.publication_hash);
                let (original, artifacts) = &expected[&meta.segment_id];
                assert_eq!(&bytes, original);
                for chunk in 0..meta.publication_length.div_ceil(CHUNK) {
                    expected_keys.insert(retained_key(meta.segment_id, chunk as u64).unwrap());
                }
                let catalog: Publication = decode(&bytes).unwrap();
                for (kind, artifact) in catalog.artifacts.iter().enumerate() {
                    let mut actual = Vec::new();
                    for chunk in 0..artifact.chunks.len() {
                        let key = retained_key(
                            meta.segment_id,
                            PUBLICATION_CHUNKS + kind as u64 * CHUNKS + chunk as u64,
                        )
                        .unwrap();
                        expected_keys.insert(key);
                        let bytes = RETAINED.with(|m| m.borrow().get(&key).unwrap());
                        assert_eq!(hash(&bytes), artifact.chunks[chunk]);
                        actual.extend(bytes);
                    }
                    assert_eq!(hash(&actual), artifact.sha256);
                    assert_eq!(actual, artifacts[kind]);
                }
            }
            assert_eq!(
                RETAINED.with(|m| m.borrow().keys().collect::<BTreeSet<_>>()),
                expected_keys
            );
            if ordinal > RETAINED_SEGMENTS {
                let oldest = r.retention.history.first().unwrap().segment_id;
                assert!(oldest > 0, "genuine eviction, not just eight publications");
                assert!(
                    RETAINED.with(|m| m.borrow().keys().all(|key| key / RETAINED_STRIDE >= oldest))
                );
            }
            assert!(ROOT.with(|c| c.borrow().get().len()) <= ROOT_LIMIT);
            assert!(r.image.length <= MAX_ARTIFACT);
            assert!(
                r.retention.history.iter().map(|m| m.bytes).sum::<usize>()
                    + publication_size(&view.bytes, &view.data).unwrap()
                    <= RETAINED_BYTES
            );
            assert!(
                backing.size() * 65536 <= 64 * 1024 * 1024,
                "bounded physical stable allocation for this fixture"
            );
            if ordinal == 32 {
                settled_pages = backing.size();
            }
        }
        assert_eq!(r.retention.history.len(), 15);
        assert_eq!(
            backing.size(),
            settled_pages,
            "eviction reuses allocated pages"
        );
        assert!(r.image.length < CHUNK, "obsolete image chunks removed");
        let current = publication(&h.record).unwrap().data;
        let mut over_budget = r.retention.clone();
        for meta in &mut over_budget.history {
            meta.artifact_lengths = [MAX_ARTIFACT; 3];
            meta.bytes = meta.publication_length + 3 * MAX_ARTIFACT;
        }
        assert_eq!(
            validate_retention(&over_budget, &current).unwrap_err(),
            "retention bounds"
        );
        let mut too_many = r.retention.clone();
        too_many
            .history
            .push(too_many.history.last().unwrap().clone());
        assert_eq!(
            validate_retention(&too_many, &current).unwrap_err(),
            "retention count"
        );
        let original_root = ROOT.with(|c| c.borrow().get().clone());
        ROOT.with(|c| c.borrow_mut().set(vec![0; ROOT_LIMIT + 1]));
        assert_eq!(
            root().err().unwrap(),
            "missing/oversize root; no genesis fallback"
        );
        ROOT.with(|c| c.borrow_mut().set(original_root.clone()));
        reopen(&backing);
        let recovered = root().unwrap();
        let restored = host(&recovered).unwrap();
        assert_eq!(ROOT.with(|c| c.borrow().get().clone()), original_root);
        assert_eq!(
            publication(&restored.record).unwrap().bytes,
            publication(&h.record).unwrap().bytes
        );
        assert_eq!(recovered.retention.history.len(), 15);
        for meta in &recovered.retention.history {
            assert_eq!(
                retained_publication_bytes(meta).unwrap(),
                expected[&meta.segment_id].0
            );
        }
    }
    #[test]
    fn transition_metadata_is_bound_and_does_not_forge_source_progress() {
        let initial = empty_host();
        let mut w = World::decode(&unhex(&initial.record.journal.head.state_hex).unwrap()).unwrap();
        w.width = 16;
        w.height = 8;
        w.cells = vec![0; 128];
        let mut h = Coordinator::create(
            &w.encode().unwrap(),
            initial.record.journal.identity,
            0,
            0,
            "00".repeat(32),
            B2zHostKernel::default(),
        )
        .unwrap();
        h.apply(Action::Seal {
            logical_end: Int(2.into()),
        })
        .unwrap();
        loop {
            let p = h.apply(Action::Step { budget: 512 }).unwrap().unwrap();
            if p.complete {
                break;
            }
        }
        let m = h
            .record
            .journal
            .stage
            .as_ref()
            .unwrap()
            .ready_hash
            .clone()
            .unwrap();
        h.apply(Action::Publish { manifest_hash: m }).unwrap();
        let (mut source, _) = source::SourceState::configured(
            source::IndexConfig {
                network: "pocketic-local".into(),
                ledger: Principal::self_authenticating([1; 32]),
                index: Principal::self_authenticating([2; 32]),
                receiving_subaccount: 0,
                event_horizon: None,
                starting_policy: source::StartingPolicy::FromBeginning,
            },
            Principal::self_authenticating([3; 32]),
        )
        .unwrap();
        source.binding_checked = true;
        let mut t = transition::Transition {
            version: 1,
            phase: "ready".into(),
            ledger_cutover: Some(Int(100.into())),
            index_synced: Some(Int(100.into())),
            metadata_hex: None,
            transition_hash: None,
            previous_manifest: None,
        };
        let (output, metadata, identity) = transition::candidate(&h, &t, &source).unwrap();
        let old = World::decode(&unhex(&h.record.journal.head.state_hex).unwrap()).unwrap();
        let new = World::decode(&output.state).unwrap();
        assert_eq!(new.time, old.time);
        assert_eq!(new.received_e8s, old.received_e8s);
        assert_eq!(new.credits, old.credits);
        let proof: serde_json::Value = decode(&metadata).unwrap();
        assert_eq!(proof["source_cursor"], serde_json::json!(Int(0.into())));
        let epoch = h
            .prepare_transition(identity, &output, hash(&metadata))
            .unwrap();
        assert_eq!(epoch.source_cursor, Int(0.into()));
        t.index_synced = Some(Int(99.into()));
        assert!(transition::candidate(&h, &t, &source).is_err());
        t.index_synced = Some(Int(100.into()));
        source.in_flight = true;
        assert!(transition::candidate(&h, &t, &source).is_err());
    }

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
