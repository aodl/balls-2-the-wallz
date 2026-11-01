//! Explicit authenticated elapsed-time operations, never Ledger records or ticks.
//! Committed v6 topology must already have removed unsupported non-anchor land.
use crate::{
    playability::{elapsed, Fence, MAX_CANNONS},
    world::World,
    Output,
};
use dtr_wire::{encode, hash, Int, Result};
use serde_json::json;
use std::collections::BTreeSet;

pub struct Expiry {
    pub output: Output,
    pub metadata: Vec<u8>,
    pub expired: Vec<u32>,
}
/// Fenced, idempotent expiry. Source cursor/anchors, logical time, paid receipts
/// and accrued credits never change. A stale-only request emits no checkpoint.
pub fn expire(world: &World, observed_ns: u64, fences: &[Fence]) -> Result<Option<Expiry>> {
    world.validate()?;
    let state = world.playability.as_ref().ok_or("EXPECTED_V6")?;
    if observed_ns < elapsed(&state.elapsed_ns)? {
        return Err("LIFECYCLE_TIME_ROLLBACK".into());
    }
    if fences.len() > MAX_CANNONS {
        return Err("EXPIRY_CAPACITY".into());
    }
    let mut seen = BTreeSet::new();
    let mut due = vec![];
    let mut prior = None;
    for f in fences {
        let deadline = elapsed(&f.deadline_ns)?;
        let key = (deadline, f.cannon, f.generation);
        if f.cannon == 0
            || f.cannon >= world.next_cannon_id
            || f.generation == 0
            || !seen.insert((f.cannon, f.generation))
            || prior.is_some_and(|p| key <= p)
        {
            return Err("EXPIRY_FENCE".into());
        }
        prior = Some(key);
        let Some(l) = state.life(f.cannon) else {
            continue;
        };
        if f.generation < l.generation {
            continue;
        }
        if f.generation != l.generation || l.deadline_ns.as_ref() != Some(&f.deadline_ns) {
            return Err("EXPIRY_FENCE".into());
        }
        if deadline > observed_ns {
            return Err("EXPIRY_NOT_DUE".into());
        }
        due.push(f.clone());
    }
    if due.is_empty() {
        return Ok(None);
    }
    let metadata = json!({"domain":"B2Z-LIFECYCLE-CONTEXT-01","version":1,"previous_state":hash(&world.encode()?),"observed_ns":Int(observed_ns.into()),"fences":fences});
    let mut next = world.clone();
    next.playability.as_mut().unwrap().elapsed_ns = Int(observed_ns.into());
    let mut events =
        vec![json!({"kind":"lifecycle_context","sequence":0,"time":world.time,"context":metadata})];
    let mut expired = vec![];
    for f in due {
        let c = next
            .cannons
            .iter()
            .find(|c| c.id == f.cannon)
            .cloned()
            .ok_or("UNKNOWN_CANNON")?;
        let player = next.player_for_cannon(c.id).ok_or("UNKNOWN_PLAYER")?;
        if next.active_cannon(c.id) {
            return Err("EXPIRY_REQUIRES_DORMANCY".into());
        }
        let territory = next.owner(c.cell).ok_or("UNKNOWN_TERRITORY")?;
        next.set_owner(c.cell, 0)?;
        next.cannons.retain(|c| c.id != f.cannon);
        next.playability
            .as_mut()
            .unwrap()
            .lifecycle
            .retain(|l| l.cannon != f.cannon);
        crate::territory_v6::regroup_markers(&mut next, territory)?;
        events.push(json!({"kind":"cannon_expired","sequence":events.len(),"time":world.time,"cannon":c.id,"cell":c.cell,"player":player,"generation":f.generation,"deadline_ns":f.deadline_ns,"observed_ns":Int(observed_ns.into()),"cell_retained":false}));
        expired.push(c.id);
    }
    Ok(Some(Expiry {
        metadata: encode(&metadata)?,
        expired,
        output: Output {
            state: next.encode()?,
            events: encode(&json!({"version":6,"receipts":[],"events":events}))?,
            scores: encode(&json!({"version":6,"area_time":[]}))?,
        },
    }))
}
