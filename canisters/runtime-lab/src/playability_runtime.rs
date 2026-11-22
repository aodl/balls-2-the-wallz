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

/// Rules-only cutover: the complete v6 world and economic state survive byte-for-byte.
pub fn entry_candidate<K: Kernel>(
    h: &Coordinator<K>,
    t: &Transition,
    source: &SourceState,
    _observed_ns: u64,
) -> Result<(Output, Vec<u8>, Identity)> {
    t.validate()?;
    if t.version != 4
        || t.phase != "ready"
        || source.pending.is_some()
        || source.in_flight
        || !source.binding_checked
        || source.last_error.is_some()
        || source.memo_adapter_version != b2z_protocol::v6::MEMO_ADAPTER_VERSION
    {
        return Err("entry source cutover not drained".into());
    }
    let expected = playability::identity()?;
    let actual = serde_json::to_value(&h.record.journal.identity).map_err(|e| e.to_string())?;
    if ["rules_hash", "config_hash", "schema_hash"]
        .iter()
        .any(|k| actual[*k] != expected[*k])
    {
        return Err("entry requires exact rules-v6 predecessor identity".into());
    }
    let state = unhex(&h.record.journal.head.state_hex)?;
    let old = World::decode(&state)?;
    if old.version != 6
        || !old.time.0.is_integer()
        || old.time.0.to_integer() != h.record.journal.head.logical_end.0
        || !old.pending.is_empty()
        || Int(source.cursor.into()) != h.record.inbox.cursor
        || h.record.journal.stage.is_some()
        || !h.record.inbox.pending.is_empty()
        || h.record.inbox.cursor != h.record.inbox.retired_to
    {
        return Err("entry requires committed gameplay/source boundary".into());
    }
    let mut id = b2z_native::entry_v7::identity()?;
    id["source_id"] = json!(h.record.journal.identity.source_id);
    let identity: Identity = serde_json::from_value(id).map_err(|e| e.to_string())?;
    let metadata = json!({"version":4,"migration":"B2Z_FARTHEST_ENTRY_RULES_07","old_identity":h.record.journal.identity,"new_identity":identity,"previous_state":hash(&state),"new_state":hash(&state),"logical_boundary":old.time,"source_cursor":Int(source.cursor.into()),"ledger_cutover":t.ledger_cutover,"account_history_complete_through":t.ledger_cutover,"index_synced":t.index_synced,"source_anchor":h.record.inbox.source_anchor,"memo_adapter_before":source.memo_adapter_version,"memo_adapter_after":source.memo_adapter_version});
    Ok((
        Output {
            state,
            events: encode(
                &json!({"version":6,"receipts":[],"events":[{"kind":"rules_activated","sequence":0,"time":old.time,"context":metadata}]}),
            )?,
            scores: encode(&json!({"version":6,"area_time":[]}))?,
        },
        encode(&metadata)?,
        identity,
    ))
}

pub fn clearance_candidate<K: Kernel>(
    h: &Coordinator<K>,
    t: &Transition,
    source: &SourceState,
    _observed_ns: u64,
) -> Result<(Output, Vec<u8>, Identity)> {
    t.validate()?;
    if t.version != 5
        || t.phase != "ready"
        || source.pending.is_some()
        || source.in_flight
        || !source.binding_checked
        || source.last_error.is_some()
        || source.memo_adapter_version != b2z_protocol::v6::MEMO_ADAPTER_VERSION
    {
        return Err("clearance source cutover not drained".into());
    }
    let expected = b2z_native::entry_v7::identity()?;
    let actual = serde_json::to_value(&h.record.journal.identity).map_err(|e| e.to_string())?;
    if ["rules_hash", "config_hash", "schema_hash"]
        .iter()
        .any(|k| actual[*k] != expected[*k])
    {
        return Err("clearance requires exact rules-v7 predecessor identity".into());
    }
    let state = unhex(&h.record.journal.head.state_hex)?;
    let old = World::decode(&state)?;
    if old.version != 6
        || !old.time.0.is_integer()
        || old.time.0.to_integer() != h.record.journal.head.logical_end.0
        || !old.pending.is_empty()
        || Int(source.cursor.into()) != h.record.inbox.cursor
        || h.record.journal.stage.is_some()
        || !h.record.inbox.pending.is_empty()
        || h.record.inbox.cursor != h.record.inbox.retired_to
    {
        return Err("clearance requires committed gameplay/source boundary".into());
    }
    let mut id = b2z_native::clearance_v9::identity()?;
    id["source_id"] = json!(h.record.journal.identity.source_id);
    let identity: Identity = serde_json::from_value(id).map_err(|e| e.to_string())?;
    let metadata = json!({"version":5,"migration":"B2Z_TERRITORY_CLEARANCE_RULES_09","old_identity":h.record.journal.identity,"new_identity":identity,"previous_state":hash(&state),"new_state":hash(&state),"logical_boundary":old.time,"source_cursor":Int(source.cursor.into()),"ledger_cutover":t.ledger_cutover,"account_history_complete_through":t.ledger_cutover,"index_synced":t.index_synced,"source_anchor":h.record.inbox.source_anchor,"memo_adapter_before":source.memo_adapter_version,"memo_adapter_after":source.memo_adapter_version});
    Ok((
        Output {
            state,
            events: encode(
                &json!({"version":6,"receipts":[],"events":[{"kind":"rules_activated","sequence":0,"time":old.time,"context":metadata}]}),
            )?,
            scores: encode(&json!({"version":6,"area_time":[]}))?,
        },
        encode(&metadata)?,
        identity,
    ))
}

pub fn war_cry_candidate<K: Kernel>(
    h: &Coordinator<K>,
    t: &Transition,
    source: &SourceState,
    _observed_ns: u64,
) -> Result<(Output, Vec<u8>, Identity)> {
    t.validate()?;
    if t.version != 6
        || t.phase != "ready"
        || source.pending.is_some()
        || source.in_flight
        || !source.binding_checked
        || source.last_error.is_some()
        || source.memo_adapter_version != b2z_protocol::v6::MEMO_ADAPTER_VERSION
    {
        return Err("war cry source cutover not drained".into());
    }
    let expected = b2z_native::entry_v7::identity()?;
    let actual = serde_json::to_value(&h.record.journal.identity).map_err(|e| e.to_string())?;
    if ["rules_hash", "config_hash", "schema_hash"]
        .iter()
        .any(|k| actual[*k] != expected[*k])
    {
        return Err("war cry requires exact rules-v7 predecessor identity".into());
    }
    let state = unhex(&h.record.journal.head.state_hex)?;
    let old = World::decode(&state)?;
    if old.version != 6
        || !old.time.0.is_integer()
        || old.time.0.to_integer() != h.record.journal.head.logical_end.0
        || !old.pending.is_empty()
        || Int(source.cursor.into()) != h.record.inbox.cursor
        || h.record.journal.stage.is_some()
        || !h.record.inbox.pending.is_empty()
        || h.record.inbox.cursor != h.record.inbox.retired_to
    {
        return Err("war cry requires committed gameplay/source boundary".into());
    }
    let mut id = b2z_native::war_cry::identity()?;
    id["source_id"] = json!(h.record.journal.identity.source_id);
    let identity: Identity = serde_json::from_value(id).map_err(|e| e.to_string())?;
    let metadata = json!({"version":6,"migration":"B2Z_WAR_CRY_RULES_10","old_identity":h.record.journal.identity,"new_identity":identity,"previous_state":hash(&state),"new_state":hash(&state),"logical_boundary":old.time,"source_cursor":Int(source.cursor.into()),"ledger_cutover":t.ledger_cutover,"account_history_complete_through":t.ledger_cutover,"index_synced":t.index_synced,"source_anchor":h.record.inbox.source_anchor,"memo_adapter_before":source.memo_adapter_version,"memo_adapter_after":b2z_protocol::war_cry::MEMO_ADAPTER_VERSION});
    Ok((
        Output {
            state,
            events: encode(
                &json!({"version":6,"receipts":[],"events":[{"kind":"rules_activated","sequence":0,"time":old.time,"context":metadata}]}),
            )?,
            scores: encode(&json!({"version":6,"area_time":[]}))?,
        },
        encode(&metadata)?,
        identity,
    ))
}

pub fn combined_candidate<K: Kernel>(
    h: &Coordinator<K>,
    t: &Transition,
    source: &SourceState,
    _observed_ns: u64,
) -> Result<(Output, Vec<u8>, Identity)> {
    t.validate()?;
    h.validate()?;
    let committed_anchor = h
        .record
        .journal
        .head
        .seal
        .as_ref()
        .map(|s| &s.source_anchor)
        .or_else(|| h.record.journal.epoch.as_ref().map(|e| &e.source_anchor));
    if committed_anchor != Some(&h.record.inbox.source_anchor) {
        return Err("combined source anchor differs from authenticated predecessor".into());
    }
    if t.version != 7
        || t.phase != "ready"
        || source.pending.is_some()
        || source.in_flight
        || !source.binding_checked
        || source.last_error.is_some()
        || source.memo_adapter_version != b2z_protocol::v6::MEMO_ADAPTER_VERSION
    {
        return Err("combined source cutover not drained".into());
    }
    let expected = b2z_native::entry_v7::identity()?;
    let actual = serde_json::to_value(&h.record.journal.identity).map_err(|e| e.to_string())?;
    if ["rules_hash", "config_hash", "schema_hash"]
        .iter()
        .any(|k| actual[*k] != expected[*k])
    {
        return Err("combined requires exact rules-v7 predecessor identity".into());
    }
    let state = unhex(&h.record.journal.head.state_hex)?;
    let old = World::decode(&state)?;
    if old.version != 6
        || !old.time.0.is_integer()
        || old.time.0.to_integer() != h.record.journal.head.logical_end.0
        || !old.pending.is_empty()
        || Int(source.cursor.into()) != h.record.inbox.cursor
        || h.record.journal.stage.is_some()
        || !h.record.inbox.pending.is_empty()
        || h.record.inbox.cursor != h.record.inbox.retired_to
    {
        return Err("combined requires committed gameplay/source boundary".into());
    }
    let mut id = b2z_native::combined_v11::identity()?;
    id["source_id"] = json!(h.record.journal.identity.source_id);
    let identity: Identity = serde_json::from_value(id).map_err(|e| e.to_string())?;
    let metadata = json!({"version":7,"migration":"B2Z_CLEARANCE_WAR_CRY_RULES_11","old_identity":h.record.journal.identity,"new_identity":identity,"previous_state":hash(&state),"new_state":hash(&state),"logical_boundary":old.time,"source_cursor":Int(source.cursor.into()),"ledger_cutover":t.ledger_cutover,"account_history_complete_through":t.ledger_cutover,"index_synced":t.index_synced,"source_anchor":h.record.inbox.source_anchor,"memo_adapter_before":source.memo_adapter_version,"memo_adapter_after":b2z_protocol::war_cry::MEMO_ADAPTER_VERSION});
    Ok((
        Output {
            state,
            events: encode(
                &json!({"version":6,"receipts":[],"events":[{"kind":"rules_activated","sequence":0,"time":old.time,"context":metadata}]}),
            )?,
            scores: encode(&json!({"version":6,"area_time":[]}))?,
        },
        encode(&metadata)?,
        identity,
    ))
}

pub fn deflector_candidate<K: Kernel>(
    h: &Coordinator<K>,
    t: &Transition,
    source: &SourceState,
    _observed_ns: u64,
) -> Result<(Output, Vec<u8>, Identity)> {
    t.validate()?;
    h.validate()?;
    let committed_anchor = h
        .record
        .journal
        .head
        .seal
        .as_ref()
        .map(|s| &s.source_anchor)
        .or_else(|| h.record.journal.epoch.as_ref().map(|e| &e.source_anchor));
    if committed_anchor != Some(&h.record.inbox.source_anchor) {
        return Err("deflector source anchor differs from authenticated predecessor".into());
    }
    if t.version != 8
        || t.phase != "ready"
        || source.pending.is_some()
        || source.in_flight
        || !source.binding_checked
        || source.last_error.is_some()
        || source.memo_adapter_version != b2z_protocol::war_cry::MEMO_ADAPTER_VERSION
    {
        return Err("deflector source cutover not drained".into());
    }
    let expected = b2z_native::combined_v11::identity()?;
    let actual = serde_json::to_value(&h.record.journal.identity).map_err(|e| e.to_string())?;
    if ["rules_hash", "config_hash", "schema_hash"]
        .iter()
        .any(|k| actual[*k] != expected[*k])
    {
        return Err("deflector requires exact Rules11 predecessor identity".into());
    }
    let state = unhex(&h.record.journal.head.state_hex)?;
    let old = World::decode(&state)?;
    if h.record.journal.head.seal.is_none()
        && h.record
            .journal
            .epoch
            .as_ref()
            .is_none_or(|e| e.version != 3)
    {
        return Err(
            "deflector requires a completed Rules11 interval, not a consecutive rules epoch".into(),
        );
    }
    if old.version != 6
        || !old.time.0.is_integer()
        || old.time.0.to_integer() != h.record.journal.head.logical_end.0
        || Int(source.cursor.into()) != h.record.inbox.cursor
        || h.record.journal.stage.is_some()
        || !h.record.inbox.pending.is_empty()
        || h.record.inbox.cursor != h.record.inbox.retired_to
    {
        return Err("deflector requires committed gameplay/source boundary".into());
    }
    let mut id = b2z_native::deflectors_v12::identity()?;
    id["source_id"] = json!(h.record.journal.identity.source_id);
    let identity: Identity = serde_json::from_value(id).map_err(|e| e.to_string())?;
    let successor = b2z_native::deflectors_v12::migrate(&old)?;
    let next_state = successor.encode()?;
    let mut projection = successor.clone();
    projection.version = 6;
    projection.deflectors = None;
    projection.next_deflector_id = None;
    for b in &mut projection.balls {
        b.den = None;
    }
    if projection.encode()? != state {
        return Err("world preservation projection differs".into());
    }
    let metadata = json!({"version":8,"migration":"B2Z_BOUNDARY_DEFLECTOR_RULES_12","old_identity":h.record.journal.identity,"new_identity":identity,"previous_state":hash(&state),"new_state":hash(&next_state),"preserved_predecessor_projection":hash(&state),"logical_boundary":old.time,"source_cursor":Int(source.cursor.into()),"ledger_cutover":t.ledger_cutover,"account_history_complete_through":t.ledger_cutover,"index_synced":t.index_synced,"source_anchor":h.record.inbox.source_anchor,"memo_adapter_before":source.memo_adapter_version,"memo_adapter_after":b2z_protocol::deflector::MEMO_ADAPTER_VERSION});
    Ok((
        Output {
            state: next_state,
            events: encode(
                &json!({"version":7,"receipts":[],"events":[{"kind":"deflector_rules_activated","sequence":0,"time":old.time,"context":metadata}]}),
            )?,
            scores: encode(&json!({"version":7,"area_time":[]}))?,
        },
        encode(&metadata)?,
        identity,
    ))
}

struct Schema7Cutover {
    bootstrap_ns: Option<u64>,
    version: u32,
    migration: &'static str,
    event: &'static str,
    previous_adapter: u8,
    next_adapter: u8,
}

pub fn context_candidate<K: Kernel>(
    h: &Coordinator<K>,
    t: &Transition,
    source: &SourceState,
) -> Result<(Output, Vec<u8>, Identity)> {
    schema7_candidate(
        h,
        t,
        source,
        b2z_native::deflectors_v12::identity()?,
        b2z_native::context_structures::identity()?,
        Schema7Cutover {
            bootstrap_ns: None,
            version: 9,
            migration: "B2Z_CONTEXT_STRUCTURES_RULES_13",
            event: "context_rules_activated",
            previous_adapter: b2z_protocol::deflector::MEMO_ADAPTER_VERSION,
            next_adapter: b2z_protocol::context_structures::MEMO_ADAPTER_VERSION,
        },
    )
}

pub fn shout_candidate<K: Kernel>(
    h: &Coordinator<K>,
    t: &Transition,
    source: &SourceState,
) -> Result<(Output, Vec<u8>, Identity)> {
    schema7_candidate(
        h,
        t,
        source,
        b2z_native::context_structures::identity()?,
        b2z_native::shout::identity()?,
        Schema7Cutover {
            bootstrap_ns: None,
            version: 10,
            migration: "B2Z_ACTION_SHOUT_RULES_14",
            event: "shout_rules_activated",
            previous_adapter: b2z_protocol::context_structures::MEMO_ADAPTER_VERSION,
            next_adapter: b2z_protocol::shout::MEMO_ADAPTER_VERSION,
        },
    )
}

pub fn spacing_candidate<K: Kernel>(
    h: &Coordinator<K>,
    t: &Transition,
    source: &SourceState,
) -> Result<(Output, Vec<u8>, Identity)> {
    let adapter = b2z_protocol::shout::MEMO_ADAPTER_VERSION;
    schema7_candidate(
        h,
        t,
        source,
        b2z_native::shout::identity()?,
        b2z_native::spacing::identity()?,
        Schema7Cutover {
            bootstrap_ns: None,
            version: 11,
            migration: "B2Z_STRUCTURE_SPACING_RULES_15",
            event: "spacing_rules_activated",
            previous_adapter: adapter,
            next_adapter: adapter,
        },
    )
}

pub fn reservoir_candidate<K: Kernel>(
    h: &Coordinator<K>,
    t: &Transition,
    source: &SourceState,
) -> Result<(Output, Vec<u8>, Identity)> {
    schema7_candidate(
        h,
        t,
        source,
        b2z_native::spacing::identity()?,
        b2z_native::reservoirs::identity(),
        Schema7Cutover {
            bootstrap_ns: None,
            version: 12,
            migration: "B2Z_RESERVOIR_RULES_16",
            event: "reservoir_rules_activated",
            previous_adapter: b2z_protocol::shout::MEMO_ADAPTER_VERSION,
            next_adapter: b2z_protocol::reservoir::MEMO_ADAPTER_VERSION,
        },
    )
}

pub fn economy_candidate<K: Kernel>(
    h: &Coordinator<K>,
    t: &Transition,
    source: &SourceState,
    observed_ns: u64,
) -> Result<(Output, Vec<u8>, Identity)> {
    schema7_candidate(
        h,
        t,
        source,
        b2z_native::reservoirs::identity(),
        b2z_native::economy17::identity(),
        Schema7Cutover {
            bootstrap_ns: Some(observed_ns),
            version: 13,
            migration: "B2Z_DAILY_ECONOMY_RULES_17",
            event: "economy_rules_activated",
            previous_adapter: b2z_protocol::reservoir::MEMO_ADAPTER_VERSION,
            next_adapter: b2z_protocol::economy17::MEMO_ADAPTER_VERSION,
        },
    )
}

pub fn delegation_candidate<K: Kernel>(
    h: &Coordinator<K>,
    t: &Transition,
    source: &SourceState,
) -> Result<(Output, Vec<u8>, Identity)> {
    if source.receiving_subaccount != 0 {
        return Err("Rules18 requires the certified default receiving account".into());
    }
    schema7_candidate(
        h,
        t,
        source,
        b2z_native::economy17::identity(),
        b2z_native::delegation_v18::identity(),
        Schema7Cutover {
            bootstrap_ns: None,
            version: 14,
            migration: "B2Z_DELEGATED_PAYMENT_RULES_18",
            event: "delegated_payments_activated",
            previous_adapter: b2z_protocol::economy17::MEMO_ADAPTER_VERSION,
            next_adapter: b2z_protocol::delegation::ADAPTER_VERSION,
        },
    )
}

fn schema7_candidate<K: Kernel>(
    h: &Coordinator<K>,
    t: &Transition,
    source: &SourceState,
    predecessor: serde_json::Value,
    mut successor: serde_json::Value,
    policy: Schema7Cutover,
) -> Result<(Output, Vec<u8>, Identity)> {
    t.validate()?;
    h.validate()?;
    let committed_anchor = h
        .record
        .journal
        .head
        .seal
        .as_ref()
        .map(|s| &s.source_anchor)
        .or_else(|| h.record.journal.epoch.as_ref().map(|e| &e.source_anchor));
    if committed_anchor != Some(&h.record.inbox.source_anchor) {
        return Err("schema7 source anchor differs from authenticated predecessor".into());
    }
    if t.version != policy.version
        || t.phase != "ready"
        || source.pending.is_some()
        || source.in_flight
        || !source.binding_checked
        || source.last_error.is_some()
        || source.memo_adapter_version != policy.previous_adapter
    {
        return Err("schema7 source cutover not drained".into());
    }
    let actual = serde_json::to_value(&h.record.journal.identity).map_err(|e| e.to_string())?;
    if ["rules_hash", "config_hash", "schema_hash"]
        .iter()
        .any(|k| actual[*k] != predecessor[*k])
    {
        return Err("schema7 cutover requires its exact predecessor identity".into());
    }
    let state = unhex(&h.record.journal.head.state_hex)?;
    let old = World::decode(&state)?;
    if h.record.journal.head.seal.is_none()
        && h.record
            .journal
            .epoch
            .as_ref()
            .is_none_or(|e| e.version != 3)
    {
        return Err(
            "schema7 cutover requires a committed predecessor interval or lifecycle checkpoint"
                .into(),
        );
    }
    if old.version
        != match policy.version {
            14 => 9,
            13 => 8,
            _ => 7,
        }
        || !old.time.0.is_integer()
        || old.time.0.to_integer() != h.record.journal.head.logical_end.0
        || Int(source.cursor.into()) != h.record.inbox.cursor
        || h.record.journal.stage.is_some()
        || !h.record.inbox.pending.is_empty()
        || h.record.inbox.cursor != h.record.inbox.retired_to
    {
        return Err("schema7 cutover requires committed gameplay/source boundary".into());
    }
    successor["source_id"] = json!(h.record.journal.identity.source_id);
    let identity: Identity = serde_json::from_value(successor).map_err(|e| e.to_string())?;
    if old.encode()? != state {
        return Err("noncanonical state at schema7 cutover".into());
    }
    let next = if let Some(ns) = policy.bootstrap_ns {
        b2z_native::economy17::migrate(old.clone(), ns)?
    } else if policy.version == 14 {
        b2z_native::delegation_v18::migrate(old.clone(), source.recipient_hex.clone())?
    } else if policy.version == 12 {
        b2z_native::reservoirs::migrate(old.clone())?
    } else {
        old.clone()
    };
    let state_after = next.encode()?;
    let mut metadata = json!({
        "version":policy.version,"migration":policy.migration,
        "old_identity":h.record.journal.identity,"new_identity":identity,
        "previous_state":hash(&state),"new_state":hash(&state_after),
        "logical_boundary":old.time,"source_cursor":Int(source.cursor.into()),
        "ledger_cutover":t.ledger_cutover,"account_history_complete_through":t.ledger_cutover,
        "index_synced":t.index_synced,"source_anchor":h.record.inbox.source_anchor,
        "memo_adapter_before":source.memo_adapter_version,
        "memo_adapter_after":policy.next_adapter
    });
    if policy.version == 13 {
        metadata["bootstrap"] = json!(next.economy.as_ref().ok_or("missing economy bootstrap")?);
    }
    if policy.version == 14 {
        metadata["recipient"] = json!(source.recipient_hex);
    }
    Ok((
        Output {
            state: state_after,
            events: encode(
                &json!({"version":next.version,"receipts":[],"events":[{"kind":policy.event,"sequence":0,"time":old.time,"context":metadata}]}),
            )?,
            scores: encode(&json!({"version":next.version,"area_time":[]}))?,
        },
        encode(&metadata)?,
        identity,
    ))
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
    if w.version < 6 {
        clear_timer();
        return Ok(());
    }
    let now = ic_cdk::api::time();
    let state = w.playability.as_ref().ok_or("missing lifecycle state")?;
    let expiry = state
        .lifecycle
        .iter()
        .filter_map(|l| l.deadline_ns.as_ref())
        .min()
        .map(number)
        .transpose()?;
    let midnight = if w.version >= 9 {
        let day = b2z_protocol::economy17::DAY_NS;
        (number(&state.elapsed_ns)? / day + 1).checked_mul(day)
    } else {
        None
    };
    if let Some(deadline) = expiry.into_iter().chain(midnight).min() {
        let at =
            if deadline <= now && (r.lifecycle_error.is_some() || r.source.last_error.is_some()) {
                now.saturating_add(60_000_000_000)
            } else if deadline <= now && (r.lifecycle_barrier.is_some() || w.version >= 9) {
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
    if !maintenance_active(r) {
        return Ok(());
    }
    let h = host(r)?;
    let w = World::decode(&unhex(&h.record.journal.head.state_hex)?)?;
    install_world(r, &w)
}
fn maintenance_active(r: &Root) -> bool {
    r.playability_transition
        .as_ref()
        .is_some_and(|t| t.phase == "complete")
        || r.economy_transition
            .as_ref()
            .is_some_and(|t| t.phase == "complete")
}
#[cfg(target_arch = "wasm32")]
pub fn on_publication(r: &Root, h: &Coordinator<super::B2zHostKernel>) -> Result<()> {
    if !maintenance_active(r) {
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
    if w.version < 6 {
        return Ok(());
    }
    let now = ic_cdk::api::time();
    let state = w.playability.as_ref().ok_or("missing lifecycle state")?;
    let day = b2z_protocol::economy17::DAY_NS;
    let pricing_due = w.version >= 9 && number(&state.elapsed_ns)? / day < now / day;
    let mut due = state.due(now);
    if w.version >= 9 {
        // Keep the authenticated checkpoint preimage under its existing byte
        // budget. Additional due fences remain eligible in the next checkpoint.
        let mut bytes = 0;
        let mut batch = 0;
        for fence in &due {
            bytes += encode(fence)?.len() + 1;
            if bytes > 15 * 1024 {
                break;
            }
            batch += 1;
        }
        due.truncate(batch);
    }
    if due.is_empty() && !pricing_due {
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
    if !due.is_empty() {
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
            deflectors: None,
            next_deflector_id: None,
            reservoirs: None,
            economy: None,
            authorization: None,
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
                    den: None,
                    deflector_rearm: None,
                    id: 1,
                    owner: 1,
                    cell: 52,
                    x0: Int(4608.into()),
                    y0: Int(3584.into()),
                    vx: 1024,
                    vy: 0,
                },
                Ball {
                    den: None,
                    deflector_rearm: None,
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
        // Independently branch from the actual three-epoch v6 history. Leave the
        // historical trace/golden below unchanged.
        {
            let image = h.snapshot().unwrap();
            let mut entry =
                Coordinator::restore(&image, &hash(&image), ExplicitClock(observed + 1000000000))
                    .unwrap();
            ordinary(&mut entry);
            let old_state = unhex(&entry.record.journal.head.state_hex).unwrap();
            let old_cursor = entry.record.inbox.cursor.clone();
            let old_retired = entry.record.inbox.retired_to.clone();
            let old_anchor = entry.record.inbox.source_anchor.clone();
            let old_pending = encode(&entry.record.inbox.pending).unwrap();
            let old_reservation = encode(&entry.record.inbox.reservation).unwrap();
            let old_epoch = entry
                .record
                .journal
                .epoch
                .as_ref()
                .unwrap()
                .transition_hash
                .clone();
            let (out, metadata, id) =
                entry_candidate(&entry, &ready(4), &source, observed + 2000000000).unwrap();
            assert_eq!(
                out.state, old_state,
                "entry cutover preserves every world/value/deadline byte"
            );
            let mut wrong = source.clone();
            wrong.memo_adapter_version = 3;
            assert!(entry_candidate(&entry, &ready(4), &wrong, observed).is_err());
            apply_rules(&mut entry, &out, &metadata, id);
            assert_eq!(
                entry
                    .record
                    .journal
                    .epoch
                    .as_ref()
                    .unwrap()
                    .index()
                    .unwrap(),
                4
            );
            assert_ne!(
                entry.record.journal.epoch.as_ref().unwrap().transition_hash,
                old_epoch
            );
            assert_eq!(entry.record.inbox.cursor, old_cursor);
            assert_eq!(entry.record.inbox.retired_to, old_retired);
            assert_eq!(entry.record.inbox.source_anchor, old_anchor);
            assert_eq!(encode(&entry.record.inbox.pending).unwrap(), old_pending);
            assert_eq!(
                encode(&entry.record.inbox.reservation).unwrap(),
                old_reservation
            );
            assert_eq!(
                unhex(&entry.record.journal.head.state_hex).unwrap(),
                old_state
            );
            assert_eq!(
                entry.record.journal.identity.config_hash,
                hash(b2z_native::entry_v7::configuration())
            );
            assert!(
                entry_candidate(&entry, &ready(4), &source, observed).is_err(),
                "never reinterpret/repeat a rules-7 activation"
            );
            ordinary(&mut entry);
            // Branch independently: never change the historical Rules9 trace.
            {
                let image = entry.snapshot().unwrap();
                let mut combined = Coordinator::restore(
                    &image,
                    &hash(&image),
                    ExplicitClock(observed + 1000000000),
                )
                .unwrap();
                let before = combined.record.clone();
                let (out, metadata, identity) =
                    combined_candidate(&combined, &ready(7), &source, observed).unwrap();
                assert_eq!(out.state, unhex(&before.journal.head.state_hex).unwrap());
                let context: serde_json::Value = decode(&metadata).unwrap();
                assert_eq!(context["version"], 7);
                assert_eq!(context["memo_adapter_before"], 4);
                assert_eq!(context["memo_adapter_after"], 6);
                let mut incomplete = ready(7);
                incomplete.index_synced = Some(Int(99.into()));
                assert!(combined_candidate(&combined, &incomplete, &source, observed).is_err());
                assert!(combined_candidate(&combined, &ready(6), &source, observed).is_err());
                for variant in 0..5 {
                    let mut wrong = source.clone();
                    match variant {
                        0 => wrong.binding_checked = false,
                        1 => wrong.in_flight = true,
                        2 => wrong.last_error = Some("transport unavailable".into()),
                        3 => wrong.memo_adapter_version = 6,
                        _ => wrong.cursor += 1,
                    }
                    assert!(combined_candidate(&combined, &ready(7), &wrong, observed).is_err());
                }
                combined.record.inbox.source_anchor = "ab".repeat(32);
                assert!(combined_candidate(&combined, &ready(7), &source, observed).is_err());
                combined.record = before.clone();
                apply_rules(&mut combined, &out, &metadata, identity);
                assert_eq!(combined.record.inbox.cursor, before.inbox.cursor);
                assert_eq!(combined.record.inbox.retired_to, before.inbox.retired_to);
                assert_eq!(
                    combined.record.inbox.source_anchor,
                    before.inbox.source_anchor
                );
                assert_eq!(
                    encode(&combined.record.inbox.pending).unwrap(),
                    encode(&before.inbox.pending).unwrap()
                );
                assert_eq!(
                    unhex(&combined.record.journal.head.state_hex).unwrap(),
                    out.state
                );
                assert_eq!(
                    combined.record.journal.identity.config_hash,
                    hash(b2z_native::combined_v11::configuration())
                );
                assert!(
                    combined_candidate(&combined, &ready(7), &source, observed).is_err(),
                    "combined identity cannot be its own predecessor"
                );
                let restored = Coordinator::restore(
                    &combined.snapshot().unwrap(),
                    &hash(&combined.snapshot().unwrap()),
                    ExplicitClock(observed),
                )
                .unwrap();
                assert_eq!(
                    restored.record.journal.identity,
                    combined.record.journal.identity
                );
                // Independently extend the exact Rules11 branch; historical
                // Rules7/9/10/11 outputs and the original trace stay unchanged.
                let mut source6 = source.clone();
                source6.memo_adapter_version = 6;
                assert!(
                    deflector_candidate(&combined, &ready(8), &source6, observed).is_err(),
                    "consecutive rules epochs are not a drained ordinary boundary"
                );
                ordinary(&mut combined);
                let mut annotation_source = source.clone();
                annotation_source.memo_adapter_version = 6;
                let before = combined.record.clone();
                let (deflect_out, deflect_metadata, deflect_id) =
                    deflector_candidate(&combined, &ready(8), &annotation_source, observed)
                        .unwrap();
                let old = World::decode(&unhex(&before.journal.head.state_hex).unwrap()).unwrap();
                let next = World::decode(&deflect_out.state).unwrap();
                assert_eq!(next, b2z_native::deflectors_v12::migrate(&old).unwrap());
                let context: serde_json::Value = decode(&deflect_metadata).unwrap();
                assert_eq!(context["memo_adapter_before"], 6);
                assert_eq!(context["memo_adapter_after"], 7);
                assert_eq!(
                    context["preserved_predecessor_projection"],
                    hash(&old.encode().unwrap())
                );
                for variant in 0..6 {
                    let mut wrong = annotation_source.clone();
                    match variant {
                        0 => wrong.binding_checked = false,
                        1 => wrong.in_flight = true,
                        2 => wrong.last_error = Some("transport unavailable".into()),
                        3 => wrong.memo_adapter_version = 4,
                        4 => wrong.memo_adapter_version = 7,
                        _ => wrong.cursor += 1,
                    }
                    assert!(deflector_candidate(&combined, &ready(8), &wrong, observed).is_err());
                }
                assert!(
                    deflector_candidate(&combined, &ready(7), &annotation_source, observed)
                        .is_err()
                );
                let mut incomplete = ready(8);
                incomplete.index_synced = Some(Int(99.into()));
                assert!(
                    deflector_candidate(&combined, &incomplete, &annotation_source, observed)
                        .is_err()
                );
                combined.record.inbox.source_anchor = "ab".repeat(32);
                assert!(
                    deflector_candidate(&combined, &ready(8), &annotation_source, observed)
                        .is_err()
                );
                combined.record = before.clone();
                apply_rules(&mut combined, &deflect_out, &deflect_metadata, deflect_id);
                assert_eq!(combined.record.inbox.cursor, before.inbox.cursor);
                assert_eq!(combined.record.inbox.retired_to, before.inbox.retired_to);
                assert_eq!(
                    combined.record.inbox.source_anchor,
                    before.inbox.source_anchor
                );
                assert_eq!(combined.record.inbox.pending, before.inbox.pending);
                assert_eq!(combined.record.inbox.reservation, before.inbox.reservation);
                assert_eq!(combined.record.inbox.revision, before.inbox.revision + 1);
                assert_ne!(combined.record.inbox.last_ack, before.inbox.last_ack);
                assert!(
                    deflector_candidate(&combined, &ready(8), &annotation_source, observed)
                        .is_err()
                );
                let image = combined.snapshot().unwrap();
                let restored =
                    Coordinator::restore(&image, &hash(&image), ExplicitClock(observed)).unwrap();
                assert_eq!(
                    restored.record.journal.head.state_hex,
                    combined.record.journal.head.state_hex
                );
                ordinary(&mut combined);
                let mut adapter7 = annotation_source.clone();
                adapter7.memo_adapter_version = b2z_protocol::deflector::MEMO_ADAPTER_VERSION;
                let (out, metadata, identity) =
                    context_candidate(&combined, &ready(9), &adapter7).unwrap();
                apply_rules(&mut combined, &out, &metadata, identity);
                let mut adapter8 = adapter7;
                adapter8.memo_adapter_version =
                    b2z_protocol::context_structures::MEMO_ADAPTER_VERSION;
                assert!(shout_candidate(&combined, &ready(10), &adapter8).is_err());
                ordinary(&mut combined);

                let mut pending = adapter8.clone();
                pending.pending = Some(self::pending(100));
                assert!(shout_candidate(&combined, &ready(10), &pending).is_err());
                let mut wrong_adapter = adapter8.clone();
                wrong_adapter.memo_adapter_version = b2z_protocol::shout::MEMO_ADAPTER_VERSION;
                assert!(shout_candidate(&combined, &ready(10), &wrong_adapter).is_err());
                let before = combined.record.clone();
                let (out, metadata, identity) =
                    shout_candidate(&combined, &ready(10), &adapter8).unwrap();
                let proof: serde_json::Value = decode(&metadata).unwrap();
                assert_eq!(proof["memo_adapter_before"], 8);
                assert_eq!(proof["memo_adapter_after"], 9);
                assert_eq!(proof["previous_state"], proof["new_state"]);
                assert_eq!(out.state, unhex(&before.journal.head.state_hex).unwrap());
                apply_rules(&mut combined, &out, &metadata, identity);
                assert_eq!(combined.record.inbox.cursor, before.inbox.cursor);
                assert_eq!(combined.record.inbox.retired_to, before.inbox.retired_to);
                assert_eq!(
                    combined.record.inbox.source_anchor,
                    before.inbox.source_anchor
                );
                assert_eq!(
                    combined.record.journal.head.state_hex,
                    before.journal.head.state_hex
                );
                let image = combined.snapshot().unwrap();
                let mut restored = Coordinator::restore(
                    &image,
                    &hash(&image),
                    ExplicitClock(observed + 1000000000),
                )
                .unwrap();
                assert_eq!(restored.record, combined.record);
                assert!(shout_candidate(&restored, &ready(10), &adapter8).is_err());
                ordinary(&mut restored);
            }
            let clear_state = unhex(&entry.record.journal.head.state_hex).unwrap();
            let (clear_out, clear_metadata, clear_id) =
                clearance_candidate(&entry, &ready(5), &source, observed).unwrap();
            assert_eq!(
                clear_out.state, clear_state,
                "clearance cutover preserves every paid state byte"
            );
            assert!(clearance_candidate(&entry, &ready(4), &source, observed).is_err());
            apply_rules(&mut entry, &clear_out, &clear_metadata, clear_id);
            assert_eq!(entry.record.inbox.cursor, old_cursor);
            assert_eq!(entry.record.inbox.retired_to, old_retired);
            assert_eq!(entry.record.inbox.source_anchor, old_anchor);
            assert_eq!(
                unhex(&entry.record.journal.head.state_hex).unwrap(),
                clear_state
            );
            assert_eq!(
                entry.record.journal.identity.config_hash,
                hash(b2z_native::clearance_v9::configuration())
            );
            assert!(
                clearance_candidate(&entry, &ready(5), &source, observed).is_err(),
                "cannot replay the cutover"
            );
        }
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
        if let Some(path) = std::env::var_os("B2Z_V6_NATIVE_TRACE") {
            std::fs::write(path, serde_json::to_vec(&trace).unwrap()).unwrap();
        }
        assert_eq!(trace, expected);
    }
}
