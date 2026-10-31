//! Application-owned v5→v6 cutover and elapsed-time maintenance. DTR receives
//! explicit authenticated outputs; no synthetic Ledger positions or game clock.
use super::{number, source::SourceState, transition::Transition};
use b2z_native::{playability, world::World};
use dtr_host::{Coordinator, Identity, Kernel, Output};
use dtr_wire::{decode, encode, hash, unhex, Int, Result};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

/// Only the current context needs a root copy. Every retained lifecycle
/// checkpoint also carries this exact preimage in its own event artifact.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Context {
    pub transition_hash: String,
    pub metadata_hex: String,
}
impl Context {
    pub fn validate(&self) -> Result<()> {
        if unhex(&self.transition_hash)?.len() != 32 {
            return Err("lifecycle transition hash".into());
        }
        let bytes = unhex(&self.metadata_hex)?;
        if bytes.len() > 16 * 1024 {
            return Err("lifecycle metadata capacity".into());
        }
        let v: Value = decode(&bytes)?;
        if v.get("domain").and_then(Value::as_str) != Some("B2Z-LIFECYCLE-CONTEXT-01")
            || encode(&v)? != bytes
        {
            return Err("lifecycle context schema".into());
        }
        Ok(())
    }
}
/// Finite source demand captured when overdue maintenance begins. Incoming
/// hints coalesce until this already-dispatched/downloaded window is drained.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Barrier {
    pub began_ns: Int,
    pub source_high: Option<Int>,
    pub await_nonce: Option<Int>,
}
impl Barrier {
    pub fn new(source: &SourceState, now: u64) -> Self {
        Self {
            began_ns: Int(now.into()),
            source_high: source.pending.as_ref().map(|p| Int(p.high.into())),
            await_nonce: source.in_flight.then(|| Int(source.nonce.into())),
        }
    }
    pub fn validate(&self) -> Result<()> {
        number(&self.began_ns)?;
        self.cutover()?;
        if let Some(v) = &self.source_high {
            number(v)?;
        }
        if let Some(v) = &self.await_nonce {
            number(v)?;
        }
        Ok(())
    }
    pub fn cutover(&self) -> Result<Option<u64>> {
        self.source_high
            .as_ref()
            .map(|n| {
                number(n)?
                    .checked_add(1)
                    .ok_or_else(|| "lifecycle source fence overflow".into())
            })
            .transpose()
    }
    pub fn permits_scan(&self, source: &SourceState) -> Result<bool> {
        if let (Some(high), Some(p)) = (&self.source_high, &source.pending) {
            if p.high > number(high)? {
                return Err("lifecycle source window expanded".into());
            }
        }
        Ok(source.pending.is_some()
            || self.await_nonce.is_some()
            || self.cutover()?.is_some_and(|end| source.cursor < end))
    }
    pub fn reply(&mut self, nonce: u64, source: &SourceState) -> Result<()> {
        if self
            .await_nonce
            .as_ref()
            .is_some_and(|n| *n == Int(nonce.into()))
        {
            if let Some(p) = &source.pending {
                if self
                    .source_high
                    .as_ref()
                    .map(number)
                    .transpose()?
                    .is_some_and(|high| p.high > high)
                {
                    return Err("lifecycle source window expanded".into());
                }
                if self.source_high.is_none() {
                    self.source_high = Some(Int(p.high.into()));
                }
            }
            self.await_nonce = None;
        }
        Ok(())
    }
    pub fn ready(&self, source: &SourceState) -> Result<bool> {
        Ok(self.await_nonce.is_none()
            && !source.in_flight
            && source.pending.is_none()
            && self.cutover()?.is_none_or(|end| source.cursor >= end))
    }
}

pub fn rules_candidate<K: Kernel>(
    h: &Coordinator<K>,
    t: &Transition,
    source: &SourceState,
    observed_ns: u64,
) -> Result<(Output, Vec<u8>, Identity)> {
    t.validate()?;
    if t.version != 3
        || t.phase != "ready"
        || source.pending.is_some()
        || source.in_flight
        || !source.binding_checked
        || source.last_error.is_some()
        || source.memo_adapter_version != b2z_protocol::MEMO_ADAPTER_VERSION
    {
        return Err("v6 source cutover not drained".into());
    }
    let expected = b2z_native::million_identity()?;
    let actual = serde_json::to_value(&h.record.journal.identity).map_err(|e| e.to_string())?;
    if ["rules_hash", "config_hash", "schema_hash"]
        .iter()
        .any(|k| actual[*k] != expected[*k])
    {
        return Err("v6 requires exact v5 predecessor identity".into());
    }
    let old = World::decode(&unhex(&h.record.journal.head.state_hex)?)?;
    if old.version != 5
        || !old.time.0.is_integer()
        || old.time.0.to_integer() != h.record.journal.head.logical_end.0
        || !old.pending.is_empty()
        || Int(source.cursor.into()) != h.record.inbox.cursor
        || h.record.journal.stage.is_some()
        || !h.record.inbox.pending.is_empty()
        || h.record.inbox.cursor != h.record.inbox.retired_to
    {
        return Err("v6 requires committed gameplay/source boundary".into());
    }
    let next = playability::migrate(&old, observed_ns)?;
    let mut identity = playability::identity()?;
    identity["source_id"] = json!(h.record.journal.identity.source_id);
    let identity: Identity = serde_json::from_value(identity).map_err(|e| e.to_string())?;
    let state = next.encode()?;
    let metadata = json!({"version":3,"migration":"B2Z_PLAYABILITY_FROM_V5_01","old_identity":h.record.journal.identity,"new_identity":identity,
        "previous_state":hash(&old.encode()?),"new_state":hash(&state),"logical_boundary":old.time,"source_cursor":Int(source.cursor.into()),
        "ledger_cutover":t.ledger_cutover,"account_history_complete_through":t.ledger_cutover,"index_synced":t.index_synced,
        "source_anchor":h.record.inbox.source_anchor,"observed_ns":Int(observed_ns.into()),"memo_adapter_before":b2z_protocol::MEMO_ADAPTER_VERSION,"memo_adapter_after":b2z_protocol::v6::MEMO_ADAPTER_VERSION});
    let output = Output {
        state,
        events: encode(
            &json!({"version":6,"receipts":[],"events":[{"kind":"rules_activated","sequence":0,"time":old.time,"context":metadata}]}),
        )?,
        scores: encode(&json!({"version":6,"area_time":[]}))?,
    };
    Ok((output, encode(&metadata)?, identity))
}

use super::{
    ensure_run_timer, host, install_run_timer, pace, persist, request_reconciliation, root,
    save_root_only, Root,
};
use std::{cell::RefCell, time::Duration};
thread_local! { static TIMER:RefCell<Option<(ic_cdk_timers::TimerId,u64)>>=const {RefCell::new(None)}; }
fn clear_timer() {
    TIMER.with(|slot| {
        if let Some((id, _)) = slot.borrow_mut().take() {
            ic_cdk_timers::clear_timer(id);
        }
    });
}
fn arm(at: u64) {
    if TIMER.with(|slot| slot.borrow().as_ref().is_some_and(|(_, old)| *old == at)) {
        return;
    }
    clear_timer();
    let now = ic_cdk::api::time();
    let id = ic_cdk_timers::set_timer(
        Duration::from_nanos(at.saturating_sub(now).max(1_000_000)),
        async move {
            TIMER.with(|slot| slot.borrow_mut().take());
            // Same bounded recovery pattern as the existing autonomous driver.
            arm(ic_cdk::api::time().saturating_add(60_000_000_000));
            if let Err(e) = maintain() {
                if let Ok(mut r) = root() {
                    r.lifecycle_error = Some(e.chars().take(256).collect());
                    let _ = save_root_only(&r);
                }
            }
            if let Ok(r) = root() {
                let _ = install(&r);
            }
        },
    );
    TIMER.with(|slot| *slot.borrow_mut() = Some((id, at)));
}
fn install_world(r: &Root, w: &World) -> Result<()> {
    if w.version != 6 {
        clear_timer();
        return Ok(());
    }
    let now = ic_cdk::api::time();
    if let Some(next) = w
        .playability
        .as_ref()
        .ok_or("missing lifecycle state")?
        .lifecycle
        .iter()
        .filter_map(|l| l.deadline_ns.as_ref())
        .min()
    {
        let deadline = number(next)?;
        let at =
            if deadline <= now && (r.lifecycle_error.is_some() || r.source.last_error.is_some()) {
                now.saturating_add(60_000_000_000)
            } else if deadline <= now && r.lifecycle_barrier.is_some() {
                now.saturating_add(1_000_000_000)
            } else {
                deadline.max(now.saturating_add(1_000_000))
            };
        arm(at);
    } else {
        clear_timer();
    }
    Ok(())
}
pub fn install(r: &Root) -> Result<()> {
    if r.playability_transition
        .as_ref()
        .is_none_or(|t| t.phase != "complete")
    {
        return Ok(());
    }
    let h = host(r)?;
    let w = World::decode(&unhex(&h.record.journal.head.state_hex)?)?;
    install_world(r, &w)
}
#[cfg(target_arch = "wasm32")]
pub fn on_publication(r: &Root, h: &Coordinator<super::B2zHostKernel>) -> Result<()> {
    if r.playability_transition
        .as_ref()
        .is_none_or(|t| t.phase != "complete")
    {
        return Ok(());
    }
    let w = World::decode(&unhex(&h.record.journal.head.state_hex)?)?;
    install_world(r, &w)
}
#[cfg(not(target_arch = "wasm32"))]
pub fn on_publication(_r: &Root, _h: &Coordinator<super::B2zHostKernel>) -> Result<()> {
    Ok(())
}

fn maintain() -> Result<()> {
    let mut r = root()?;
    let mut h = host(&r)?;
    let w = World::decode(&unhex(&h.record.journal.head.state_hex)?)?;
    if w.version != 6 {
        return Ok(());
    }
    let now = ic_cdk::api::time();
    let due = w
        .playability
        .as_ref()
        .ok_or("missing lifecycle state")?
        .due(now);
    if due.is_empty() {
        if r.lifecycle_barrier.take().is_some() {
            r.lifecycle_error = None;
            save_root_only(&r)?;
            request_reconciliation()?;
            install_run_timer(&r.run);
        }
        return Ok(());
    }
    if ic_cdk::api::canister_liquid_cycle_balance() < pace::INDEX_FLOOR {
        return Err("lifecycle maintenance deferred below existing Index floor".into());
    }
    if r.lifecycle_barrier.is_none() {
        r.lifecycle_barrier = Some(Barrier::new(&r.source, now));
        save_root_only(&r)?;
        if r.lifecycle_barrier
            .as_ref()
            .unwrap()
            .permits_scan(&r.source)?
        {
            request_reconciliation()?;
        }
    }
    let barrier = r.lifecycle_barrier.as_ref().unwrap();
    if !barrier.ready(&r.source)? {
        ensure_run_timer(&r.run);
        return Ok(());
    }
    if h.record.journal.stage.is_some() || !h.record.inbox.pending.is_empty() {
        if let Some(error) = &r.run.last_error {
            return Err(format!("lifecycle waits for halted game work: {error}"));
        }
        ensure_run_timer(&r.run);
        return Ok(());
    }
    // One finite already-observed source window and admitted payments win first.
    // Time comes from this actual commit attempt, never a sender timestamp.
    let Some(expiry) = b2z_native::lifecycle_v6::expire(&w, now, &due)? else {
        return Ok(());
    };
    let output = Output {
        state: expiry.output.state,
        events: expiry.output.events,
        scores: expiry.output.scores,
    };
    let epoch = h.prepare_checkpoint(&output, hash(&expiry.metadata))?;
    let context = Context {
        transition_hash: epoch.transition_hash.clone(),
        metadata_hex: dtr_wire::hex(&expiry.metadata),
    };
    context.validate()?;
    h.apply(dtr_host::Action::Transition {
        epoch: Box::new(epoch),
        state_hex: dtr_wire::hex(&output.state),
        event_hex: dtr_wire::hex(&output.events),
        score_hex: dtr_wire::hex(&output.scores),
    })?;
    r.lifecycle_context = Some(context);
    r.lifecycle_barrier = None;
    r.lifecycle_error = None;
    r.source.requested = true;
    let next = persist(&h, Some(&r), r.source.clone(), r.run.clone())?;
    install_run_timer(&next.run);
    request_reconciliation()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::super::source::{IndexConfig, Pending, StartingPolicy};
    use super::*;
    use candid::Principal;
    fn source() -> SourceState {
        SourceState::configured(
            IndexConfig {
                network: "pocketic-local".into(),
                ledger: Principal::from_slice(&[1]),
                index: Principal::from_slice(&[2]),
                receiving_subaccount: 0,
                event_horizon: None,
                starting_policy: StartingPolicy::FromBeginning,
            },
            Principal::from_slice(&[3]),
        )
        .unwrap()
        .0
    }
    fn pending(high: u64) -> Pending {
        Pending {
            high,
            oldest: 0,
            before: high,
            complete: false,
            rows: vec![],
        }
    }
    #[test]
    fn expiry_barrier_follows_only_the_captured_finite_window() {
        let mut s = source();
        s.cursor = 10;
        s.nonce = 7;
        s.in_flight = true;
        let mut b = Barrier::new(&s, 9007199254740993);
        b.validate().unwrap();
        assert!(!b.ready(&s).unwrap());
        assert!(b.permits_scan(&s).unwrap());
        s.pending = Some(pending(2000));
        b.reply(6, &s).unwrap();
        assert!(b.source_high.is_none());
        b.reply(7, &s).unwrap();
        assert_eq!(b.cutover().unwrap(), Some(2001));
        // An oldest-window admission is not completion of the frozen high.
        s.pending = None;
        s.in_flight = false;
        s.cursor = 266;
        assert!(b.permits_scan(&s).unwrap());
        assert!(!b.ready(&s).unwrap());
        s.cursor = 2001;
        assert!(!b.permits_scan(&s).unwrap());
        assert!(b.ready(&s).unwrap());
        let bytes = encode(&b).unwrap();
        let recovered: Barrier = decode(&bytes).unwrap();
        assert_eq!(encode(&recovered).unwrap(), bytes);
        assert_eq!(number(&recovered.began_ns).unwrap(), 9007199254740993);
    }
    #[test]
    fn newer_pokes_or_responses_cannot_expand_a_known_expiry_window() {
        let mut s = source();
        s.pending = Some(pending(100));
        s.in_flight = true;
        s.nonce = 8;
        let mut b = Barrier::new(&s, 20);
        s.pending = Some(pending(101));
        let before = encode(&b).unwrap();
        assert!(b.permits_scan(&s).is_err());
        assert!(b.reply(8, &s).is_err());
        assert_eq!(encode(&b).unwrap(), before);
        s.pending = Some(pending(100));
        b.reply(8, &s).unwrap();
        assert_eq!(b.cutover().unwrap(), Some(101));
    }
    #[test]
    fn abandoned_query_on_upgrade_never_erases_durable_pending_data() {
        let mut s = source();
        s.pending = Some(pending(500));
        s.in_flight = true;
        s.nonce = 12;
        let mut b = Barrier::new(&s, 100);
        let pending = encode(&s.pending).unwrap();
        // post_upgrade invalidates the lost query, retaining its known high.
        s.in_flight = false;
        s.nonce += 1;
        b.await_nonce = None;
        assert_eq!(encode(&s.pending).unwrap(), pending);
        assert!(b.permits_scan(&s).unwrap());
        assert!(!b.ready(&s).unwrap());
        assert_eq!(b.cutover().unwrap(), Some(501));
        s.pending = None;
        s.cursor = 501;
        assert!(b.ready(&s).unwrap());
    }
    #[test]
    fn lifecycle_context_bounds_and_preimages_fail_closed() {
        let good = json!({"domain":"B2Z-LIFECYCLE-CONTEXT-01","version":1});
        let mut c = Context {
            transition_hash: "ab".repeat(32),
            metadata_hex: dtr_wire::hex(&encode(&good).unwrap()),
        };
        c.validate().unwrap();
        c.transition_hash = "ab".into();
        assert!(c.validate().is_err());
        c.transition_hash = "ab".repeat(32);
        c.metadata_hex = "00".repeat(16385);
        assert!(c.validate().is_err());
        c.metadata_hex = dtr_wire::hex(&encode(&json!({"domain":"wrong"})).unwrap());
        assert!(c.validate().is_err());
        let b = Barrier {
            began_ns: Int(0.into()),
            source_high: Some(Int(u64::MAX.into())),
            await_nonce: None,
        };
        assert!(b.validate().is_err());
    }
    #[derive(Clone, Copy)]
    struct ExplicitClock(u64);
    impl Kernel for ExplicitClock {
        fn begin(&self, s: &[u8], i: &[dtr_host::Input], seal: &dtr_host::Seal) -> Result<Vec<u8>> {
            dtr_host::Kernel::begin(&b2z_native::host::B2zHostKernel, s, i, seal)
        }
        fn validate_cursor(&self, b: &[u8], h: &str) -> Result<()> {
            dtr_host::Kernel::validate_cursor(&b2z_native::host::B2zHostKernel, b, h)
        }
        fn step(&self, b: &[u8], budget: usize) -> Result<(Vec<u8>, dtr_host::Progress)> {
            let session = b2z_native::host::ExecutionSession::restore(b, &hash(b), 0)?;
            let (next, p, _) = session.propose_step_at(budget, 0, self.0)?;
            Ok((next, p))
        }
        fn result(&self, b: &[u8]) -> Result<Output> {
            dtr_host::Kernel::result(&b2z_native::host::B2zHostKernel, b)
        }
    }
    fn ordinary<K: Kernel>(h: &mut Coordinator<K>) {
        let end = number(&h.record.journal.head.logical_end).unwrap() + 1;
        h.apply(dtr_host::Action::Seal {
            logical_end: Int(end.into()),
        })
        .unwrap();
        let mut n = 0;
        while !h
            .apply(dtr_host::Action::Step { budget: 512 })
            .unwrap()
            .unwrap()
            .complete
        {
            n += 1;
            assert!(n < 1000);
        }
        let manifest = h
            .record
            .journal
            .stage
            .as_ref()
            .unwrap()
            .ready_hash
            .clone()
            .unwrap();
        h.apply(dtr_host::Action::Publish {
            manifest_hash: manifest,
        })
        .unwrap();
    }
    fn apply_rules<K: Kernel>(
        h: &mut Coordinator<K>,
        out: &Output,
        metadata: &[u8],
        identity: Identity,
    ) {
        let e = h.prepare_transition(identity, out, hash(metadata)).unwrap();
        h.apply(dtr_host::Action::Transition {
            epoch: Box::new(e),
            state_hex: dtr_wire::hex(&out.state),
            event_hex: dtr_wire::hex(&out.events),
            score_hex: dtr_wire::hex(&out.scores),
        })
        .unwrap();
    }
    #[test]
    fn native_epoch_sequence_preserves_value_and_expires_without_ledger_or_logical_ticks() {
        use b2z_native::world::{Ball, Cannon, Credit};
        use dtr_wire::Rat;
        // Explicit synthetic starting checkpoint, not a Ledger or IC claim.
        let a = "01".repeat(32);
        let b = "02".repeat(32);
        let world = World {
            version: 3,
            width: 16,
            height: 8,
            cells: (0..128).map(|c| if c % 16 < 8 { 1 } else { 2 }).collect(),
            ownership: None,
            playability: None,
            cannons: vec![
                Cannon {
                    id: 1,
                    cell: 48,
                    account: a.clone(),
                    heading: None,
                },
                Cannon {
                    id: 2,
                    cell: 63,
                    account: b.clone(),
                    heading: None,
                },
            ],
            balls: vec![
                Ball {
                    id: 1,
                    owner: 1,
                    cell: 52,
                    x0: Int(4608.into()),
                    y0: Int(3584.into()),
                    vx: 1024,
                    vy: 0,
                },
                Ball {
                    id: 2,
                    owner: 2,
                    cell: 59,
                    x0: Int(11776.into()),
                    y0: Int(3584.into()),
                    vx: -1024,
                    vy: 0,
                },
            ],
            time: Rat::integer(0),
            next_cannon_id: 3,
            next_ball_id: 3,
            pending: vec![],
            next_strike_id: 1,
            received_e8s: Int(500000000u64.into()),
            credits: vec![
                Credit {
                    account: a,
                    units: Rat::integer(11),
                },
                Credit {
                    account: b,
                    units: Rat::integer(22),
                },
            ],
        };
        world.validate().unwrap();
        let mut source = source();
        source.binding_checked = true;
        let mut identity = b2z_native::identity().unwrap();
        identity["source_id"] = json!("00".repeat(32));
        let observed = 9007199254740993u64;
        let mut h = Coordinator::create(
            &world.encode().unwrap(),
            serde_json::from_value(identity).unwrap(),
            0,
            0,
            "00".repeat(32),
            ExplicitClock(observed + 1000000000),
        )
        .unwrap();
        let ready = |version| Transition {
            version,
            phase: "ready".into(),
            ledger_cutover: Some(Int(100.into())),
            index_synced: Some(Int(100.into())),
            metadata_hex: None,
            transition_hash: None,
            previous_manifest: None,
        };
        let mut publications = Vec::new();
        let mut artifact_events = Vec::new();
        let mut epoch_metadata = serde_json::Map::new();
        let mut record = |h: &Coordinator<ExplicitClock>, metadata: Option<&[u8]>| {
            let p = dtr_host::observation::publication(&h.record).unwrap().data;
            artifact_events.push(json!({"segment_id":p.head.segment_id,"events_hex":h.record.journal.head.event_hex}));
            if let Some(bytes) = metadata {
                epoch_metadata.insert(
                    h.record
                        .journal
                        .epoch
                        .as_ref()
                        .unwrap()
                        .transition_hash
                        .clone(),
                    json!(dtr_wire::hex(bytes)),
                );
            }
            publications.push(p);
        };
        ordinary(&mut h);
        record(&h, None);
        let (out, metadata, id) =
            super::super::transition::candidate(&h, &ready(1), &source).unwrap();
        apply_rules(&mut h, &out, &metadata, id);
        record(&h, Some(&metadata));
        ordinary(&mut h);
        record(&h, None);
        let (out, metadata, id) =
            super::super::transition::million_candidate(&h, &ready(2), &source).unwrap();
        apply_rules(&mut h, &out, &metadata, id);
        record(&h, Some(&metadata));
        ordinary(&mut h);
        record(&h, None);
        let previous = World::decode(&unhex(&h.record.journal.head.state_hex).unwrap()).unwrap();
        let (out, metadata, id) = rules_candidate(&h, &ready(3), &source, observed).unwrap();
        let next = World::decode(&out.state).unwrap();
        assert_eq!(previous.received_e8s, next.received_e8s);
        assert_eq!(previous.credits, next.credits);
        assert_eq!(previous.cannons, next.cannons);
        assert_eq!(previous.balls, next.balls);
        assert_eq!(previous.ownership, next.ownership);
        assert_eq!(previous.time, next.time);
        apply_rules(&mut h, &out, &metadata, id);
        record(&h, Some(&metadata));
        assert_eq!(h.record.journal.epoch.as_ref().unwrap().index().unwrap(), 3);
        assert_eq!(
            dtr_host::observation::publication(&h.record)
                .unwrap()
                .data
                .version,
            8
        );
        source.memo_adapter_version = b2z_protocol::v6::MEMO_ADAPTER_VERSION;
        ordinary(&mut h);
        record(&h, None);
        let dormant = World::decode(&unhex(&h.record.journal.head.state_hex).unwrap()).unwrap();
        assert!(dormant.balls.is_empty());
        assert_eq!(dormant.cannons.len(), 2);
        let image = h.snapshot().unwrap();
        let restored =
            Coordinator::restore(&image, &hash(&image), crate::B2zHostKernel::default()).unwrap();
        assert!(!crate::needs_simulation(&restored).unwrap());
        let now = observed + 1000000000 + playability::DORMANCY_GRACE_NS;
        let fences = dormant.playability.as_ref().unwrap().due(now);
        assert_eq!(fences.len(), 2);
        let expiry = b2z_native::lifecycle_v6::expire(&dormant, now, &fences)
            .unwrap()
            .unwrap();
        let output = Output {
            state: expiry.output.state,
            events: expiry.output.events,
            scores: expiry.output.scores,
        };
        let epoch = h
            .prepare_checkpoint(&output, hash(&expiry.metadata))
            .unwrap();
        assert_eq!(epoch.index().unwrap(), 4);
        h.apply(dtr_host::Action::Transition {
            epoch: Box::new(epoch),
            state_hex: dtr_wire::hex(&output.state),
            event_hex: dtr_wire::hex(&output.events),
            score_hex: dtr_wire::hex(&output.scores),
        })
        .unwrap();
        record(&h, Some(&expiry.metadata));
        let finished = World::decode(&output.state).unwrap();
        assert!(finished.cannons.is_empty());
        assert_eq!(finished.time, dormant.time);
        assert_eq!(finished.received_e8s, dormant.received_e8s);
        assert_eq!(finished.credits, dormant.credits);
        assert_eq!(number(&h.record.inbox.cursor).unwrap(), source.cursor);
        assert_eq!(h.record.inbox.source_anchor, "00".repeat(32));
        let publication = dtr_host::observation::publication(&h.record).unwrap().data;
        assert_eq!(publication.version, 9);
        let mut run = crate::RunState::default();
        crate::reconcile_completed_segments(&mut run, &publication).unwrap();
        assert_eq!(run.completed_segments, 4);
        assert!(b2z_native::lifecycle_v6::expire(&finished, now, &fences)
            .unwrap()
            .is_none());
        let trace = json!({"status":"PASS","evidence_class":"SYNTHETIC_NATIVE_HOST_CONTENT_NOT_IC_AUTHENTICATION","initial_world_hex":dtr_wire::hex(&world.encode().unwrap()),"inputs":[],"assigned":[],"publications":publications,"artifact_events":artifact_events,"epoch_metadata":epoch_metadata});
        let expected: serde_json::Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/playability-host-history.json"
        ))
        .unwrap();
        assert_eq!(trace, expected);
        if let Some(path) = std::env::var_os("B2Z_V6_NATIVE_TRACE") {
            std::fs::write(path, serde_json::to_vec(&trace).unwrap()).unwrap();
        }
    }
}
