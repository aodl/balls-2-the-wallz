//! B2Z-only v3→v4 fence and placement. Not a general migration API.
use b2z_native::{
    host::B2zHostKernel,
    migration::{stage_world, Boundary},
    world::World,
};
use dtr_host::{Coordinator, Identity, Output};
use dtr_wire::{encode, hash, unhex, Int, Result};
use serde::{Deserialize, Serialize};
use serde_json::json;
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Transition {
    pub version: u32,
    pub phase: String,
    pub ledger_cutover: Option<Int>, // exclusive global Ledger chain length; never the account cursor
    pub index_synced: Option<Int>,   // independently observed global Index sync count
    pub metadata_hex: Option<String>,
    pub transition_hash: Option<String>,
}
impl Transition {
    pub fn new() -> Self {
        Self {
            version: 1,
            phase: "ledger".into(),
            ledger_cutover: None,
            index_synced: None,
            metadata_hex: None,
            transition_hash: None,
        }
    }
    pub fn holding(&self) -> bool {
        self.phase != "complete"
    }
    pub fn validate(&self) -> Result<()> {
        if self.version != 1
            || !["ledger", "index", "drain", "ready", "complete"].contains(&self.phase.as_str())
        {
            return Err("world transition phase".into());
        }
        if self.phase != "ledger" {
            super::number(
                self.ledger_cutover
                    .as_ref()
                    .ok_or("missing Ledger cutover")?,
            )?;
        }
        if ["drain", "ready", "complete"].contains(&self.phase.as_str())
            && super::number(
                self.index_synced
                    .as_ref()
                    .ok_or("missing Index watermark")?,
            )? < super::number(self.ledger_cutover.as_ref().unwrap())?
        {
            return Err("Index has not reached cutover".into());
        }
        if self.phase == "complete"
            && (self.metadata_hex.is_none()
                || self
                    .transition_hash
                    .as_ref()
                    .is_none_or(|h| unhex(h).map_or(true, |b| b.len() != 32)))
        {
            return Err("missing transition evidence".into());
        }
        Ok(())
    }
}
pub fn candidate(
    h: &Coordinator<B2zHostKernel>,
    t: &Transition,
    source: &super::SourceState,
) -> Result<(Output, Vec<u8>, Identity)> {
    t.validate()?;
    if t.phase != "ready" || source.pending.is_some() || source.in_flight || !source.binding_checked
    {
        return Err("source cutover not drained".into());
    }
    let current = b2z_native::identity()?;
    for k in ["rules_hash", "config_hash", "schema_hash"] {
        let actual = serde_json::to_value(&h.record.journal.identity).map_err(|e| e.to_string())?;
        if actual[k] != current[k] {
            return Err("only reviewed prelaunch v3 identity can transition".into());
        }
    }
    let old = World::decode(&unhex(&h.record.journal.head.state_hex)?)?;
    if !old.time.0.is_integer()
        || old.time.0.to_integer() != h.record.journal.head.logical_end.0
        || Int(source.cursor.into()) != h.record.inbox.cursor
    {
        return Err("committed game/source boundary mismatch".into());
    }
    let next = stage_world(
        &old,
        &Boundary {
            source_cursor: source.cursor,
            ledger_cutover: Some(super::number(t.ledger_cutover.as_ref().unwrap())?),
            account_history_complete_through: Some(super::number(
                t.ledger_cutover.as_ref().unwrap(),
            )?),
            staged: h.record.journal.stage.is_some(),
            pending_inputs: h.record.inbox.pending.len(),
            source_pending: source.pending.is_some(),
            source_in_flight: source.in_flight,
        },
    )?;
    let mut identity = b2z_native::torus_identity()?;
    identity.as_object_mut().ok_or("identity")?.insert(
        "source_id".into(),
        json!(h.record.journal.identity.source_id),
    );
    let identity: Identity = serde_json::from_value(identity).map_err(|e| e.to_string())?;
    let state = next.encode()?;
    let metadata = encode(
        &json!({"version":1,"migration":"B2Z_EMBED_16X8_IN_32_TORUS_01","old_identity":h.record.journal.identity,"new_identity":identity,"previous_state":hash(&unhex(&h.record.journal.head.state_hex)?),"new_state":hash(&state),"logical_boundary":old.time,"source_cursor":Int(source.cursor.into()),"ledger_cutover":t.ledger_cutover,"account_history_complete_through":t.ledger_cutover,"index_synced":t.index_synced,"source_anchor":h.record.inbox.source_anchor}),
    )?;
    Ok((
        Output {
            state,
            events: encode(&json!({"version":4,"receipts":[],"events":[]}))?,
            scores: encode(&json!({"version":4,"area_time":[]}))?,
        },
        metadata,
        identity,
    ))
}

/// An empty capped page is valid only for a never-admitted account with no old
/// history. A global sync count cannot excuse disappearance of known account rows.
pub fn validate_empty_account_page(cursor: u64, oldest: Option<u64>, cutover: u64) -> Result<()> {
    if cursor != 0 || oldest.is_some_and(|id| id < cutover) {
        return Err("Index omitted pre-cutover account history".into());
    }
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn empty_account_page_never_erases_known_history() {
        assert!(validate_empty_account_page(0, None, 5).is_ok());
        assert!(validate_empty_account_page(0, Some(5), 5).is_ok());
        for (cursor, oldest) in [(3, None), (3, Some(5)), (0, Some(4))] {
            assert!(validate_empty_account_page(cursor, oldest, 5).is_err());
        }
    }
}
