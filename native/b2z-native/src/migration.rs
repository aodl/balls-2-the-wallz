//! Pure game-owned placement. The host authenticates cutover evidence and commits through DTR.
use crate::world::{World, Q};
use dtr_wire::{Rat, Result};
#[derive(Default)]
pub struct Boundary {
    pub source_cursor: u64,
    pub ledger_cutover: Option<u64>,
    pub account_history_complete_through: Option<u64>,
    pub staged: bool,
    pub pending_inputs: usize,
    pub source_pending: bool,
    pub source_in_flight: bool,
}
pub fn stage_world(old: &World, boundary: &Boundary) -> Result<World> {
    if boundary.staged
        || boundary.pending_inputs != 0
        || boundary.source_pending
        || boundary.source_in_flight
    {
        return Err("drain old inputs and finish the old segment before transition".into());
    }
    let (Some(cutover), Some(complete)) = (
        boundary.ledger_cutover,
        boundary.account_history_complete_through,
    ) else {
        return Err("Index history barrier required for old-width MOVE commands".into());
    };
    if cutover < boundary.source_cursor || complete < cutover {
        return Err("Index history barrier required for old-width MOVE commands".into());
    }
    old.validate()?;
    if old.version != 3 || old.width != 16 || old.height != 8 || !old.time.0.is_integer() {
        return Err("old committed world".into());
    }
    let cell = |n: usize| (n / 16 + 12) * 32 + n % 16 + 8;
    let mut w = old.clone();
    w.version = 4;
    w.width = 32;
    w.height = 32;
    w.cells = vec![0; 1024];
    for (n, owner) in old.cells.iter().enumerate() {
        w.cells[cell(n)] = *owner;
    }
    for c in &mut w.cannons {
        c.cell = cell(c.cell);
        c.heading = None;
    }
    for b in &mut w.balls {
        b.cell = cell(b.cell);
        b.x0.0 += 8 * Q;
        b.y0.0 += 12 * Q;
    }
    for p in &mut w.pending {
        p.from = cell(p.from);
        p.to = cell(p.to);
        p.position = p
            .position
            .add(&Rat::integer(if p.axis == "x" { 12 * Q } else { 8 * Q }))?;
    }
    w.validate()?;
    Ok(w)
}
