//! Disposable Wasm profiling. Spans belong to one message and never cross await.
use serde::Serialize;
use std::{cell::RefCell, collections::BTreeMap};

use super::{B2zHostKernel, Root, SourceState};
use b2z_native::world::World;
use dtr_host::{Action, Coordinator, Identity, Output};
use dtr_wire::{encode, hash, hex, Int, Rat, Result};

const SEED_TAG: &str = "B2Z_DISPOSABLE_RULES18_COST_SEED";

fn identity(mut value: serde_json::Value, source_id: &str) -> Result<Identity> {
    value["source_id"] = serde_json::Value::String(source_id.into());
    serde_json::from_value(value).map_err(|e| e.to_string().into())
}

/// Give the temporary account its own real DTR epoch and local source identity.
/// No production source, epoch, certificates or payment history are imported.
pub fn seed(
    mut w: World,
    logical_start: u64,
    source: &SourceState,
    source_id: &str,
) -> Result<Coordinator<B2zHostKernel>> {
    if w.version != 10 || source.network != "pocketic-local" {
        return Err("Rules18 profiling requires a disposable source".into());
    }
    let start = logical_start
        .checked_sub(1)
        .ok_or("profiling logical start")?;
    let mut predecessor = w.clone();
    predecessor.version = 9;
    predecessor.authorization = None;
    predecessor.balls.clear();
    predecessor.cannons.clear();
    predecessor.pending.clear();
    predecessor.reservoirs = Some(String::new());
    predecessor
        .deflectors
        .as_mut()
        .ok_or("missing predecessor deflectors")?
        .clear();
    predecessor.ownership = Some(b2z_native::world::ScaledOwnership::from_32x32(
        vec![0; 1024],
        predecessor.width,
        predecessor.height,
    )?);
    let state = predecessor
        .playability
        .as_mut()
        .ok_or("missing predecessor playability")?;
    state.players.clear();
    state.territories.clear();
    state.lifecycle.clear();
    predecessor.time = Rat::integer(start as i64);
    let mut h = Coordinator::create(
        &predecessor.encode()?,
        identity(b2z_native::economy17::identity(), source_id)?,
        start,
        0,
        "00".repeat(32),
        B2zHostKernel::default(),
    )?;
    h.apply(Action::Seal {
        logical_end: Int(logical_start.into()),
    })?;
    for _ in 0..8 {
        if h.apply(Action::Step { budget: 512 })?
            .ok_or("profiling predecessor step")?
            .complete
        {
            break;
        }
    }
    let manifest_hash = h
        .record
        .journal
        .stage
        .as_ref()
        .and_then(|s| s.ready_hash.clone())
        .ok_or("profiling predecessor incomplete")?;
    h.apply(Action::Publish { manifest_hash })?;
    w.authorization = Some(b2z_native::delegation_v18::Registry::empty(
        source.recipient_hex.clone(),
    )?);
    let output = Output {
        state: w.encode()?,
        events: dtr_wire::unhex(&h.record.journal.head.event_hex)?,
        scores: dtr_wire::unhex(&h.record.journal.head.score_hex)?,
    };
    let epoch = h.prepare_transition(
        identity(b2z_native::delegation_v18::identity(), source_id)?,
        &output,
        hash(&metadata(14)?),
    )?;
    h.apply(Action::Transition {
        epoch: Box::new(epoch),
        state_hex: hex(&output.state),
        event_hex: hex(&output.events),
        score_hex: hex(&output.scores),
    })?;
    Ok(h)
}

fn metadata(version: u32) -> Result<Vec<u8>> {
    encode(&serde_json::json!({"type": SEED_TAG, "version": version}))
}

pub fn bind_seed(r: &mut Root, h: &Coordinator<B2zHostKernel>) -> Result<()> {
    let epoch = h.record.journal.epoch.as_ref().ok_or("profiling epoch")?;
    let marker = |version| -> Result<_> {
        let bytes = metadata(version)?;
        Ok(Some(super::transition::Transition {
            version,
            phase: "complete".into(),
            ledger_cutover: Some(Int(0.into())),
            index_synced: Some(Int(0.into())),
            metadata_hex: Some(hex(&bytes)),
            transition_hash: Some(if version == 14 {
                epoch.transition_hash.clone()
            } else {
                hash(&bytes)
            }),
            previous_manifest: None,
        }))
    };
    // Explicit fixture milestones allow the ordinary installed module to check
    // capability binding and epoch commitment, including on upgrade.
    r.shout_transition = marker(10)?;
    r.spacing_transition = marker(11)?;
    r.reservoir_transition = marker(12)?;
    r.economy_transition = marker(13)?;
    r.delegation_transition = marker(14)?;
    r.run.completed_segments = 1;
    Ok(())
}

#[derive(Default, Serialize)]
struct Counter {
    calls: u64,
    instructions: u64,
    units: u64,
    bytes: u64,
}

thread_local! {
    static COUNTERS: RefCell<BTreeMap<&'static str, Counter>> = RefCell::default();
}

#[must_use]
pub struct Span {
    name: &'static str,
    start: u64,
}

pub fn span(name: &'static str) -> Span {
    Span {
        name,
        start: ic_cdk::api::performance_counter(0),
    }
}

impl Drop for Span {
    fn drop(&mut self) {
        let instructions = ic_cdk::api::performance_counter(0) - self.start;
        COUNTERS.with_borrow_mut(|counters| {
            let counter = counters.entry(self.name).or_default();
            counter.calls += 1;
            counter.instructions += instructions;
        });
    }
}

pub fn volume(name: &'static str, units: usize, bytes: usize) {
    COUNTERS.with_borrow_mut(|counters| {
        let counter = counters.entry(name).or_default();
        counter.units += units as u64;
        counter.bytes += bytes as u64;
    });
}

#[ic_cdk::query]
fn test_cost_profile() -> std::result::Result<String, String> {
    super::authorized()?;
    let root = super::root()?;
    serde_json::to_string(&serde_json::json!({
        "counters": COUNTERS.with_borrow(|c| serde_json::to_value(c).expect("bounded counters")),
        "stable_pages": ic_cdk::api::stable_size(),
        "coordinator_image_bytes": root.image.length,
    }))
    .map_err(|error| error.to_string())
}
