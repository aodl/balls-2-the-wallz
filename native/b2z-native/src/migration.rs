//! Pure game-owned placement. The host authenticates cutover evidence and commits through DTR.
use crate::world::{position, ScaledOwnership, World, Q};
use dtr_wire::{Rat, Result};
use num_bigint::BigInt;
use num_traits::ToPrimitive;
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

/// Pure v4 -> v5 placement.  The host must still supply the authenticated
/// Ledger/Index fence and commit this output with DTR's subsequent-epoch API.
pub fn stage_million_world(old: &World) -> Result<World> {
    old.validate()?;
    if old.version != 4
        || old.width != 32
        || old.height != 32
        || !old.time.0.is_integer()
        || !old.pending.is_empty()
    {
        return Err("old committed torus boundary".into());
    }
    let map_axis = |value: &Rat| -> Result<i64> {
        let scaled = value.0.numer() * BigInt::from(1000) / (value.0.denom() * BigInt::from(32));
        let period = BigInt::from(1000 * Q);
        let normalized = ((scaled % &period) + &period) % &period;
        normalized.to_i64().ok_or_else(|| "v5 ball position".into())
    };
    let map_velocity = |velocity: i32| -> Result<i32> {
        let numerator = i64::from(velocity) * 1000;
        let rounded = if numerator >= 0 {
            (numerator + 16) / 32
        } else {
            (numerator - 16) / 32
        };
        i32::try_from(rounded).map_err(|_| "v5 ball velocity".into())
    };
    let cell_center = |cell: usize| {
        let sx = cell % 32;
        let sy = cell / 32;
        let x0 = (sx * 1000).div_ceil(32);
        let x1 = ((sx + 1) * 1000).div_ceil(32);
        let y0 = (sy * 1000).div_ceil(32);
        let y1 = ((sy + 1) * 1000).div_ceil(32);
        ((y0 + y1 - 1) / 2) * 1000 + (x0 + x1 - 1) / 2
    };
    let mut next = old.clone();
    next.version = 5;
    next.width = 1000;
    next.height = 1000;
    next.ownership = Some(ScaledOwnership::from_32x32(
        std::mem::take(&mut next.cells),
        1000,
        1000,
    )?);
    for cannon in &mut next.cannons {
        cannon.cell = cell_center(cannon.cell);
    }
    for ball in &mut next.balls {
        let [old_x, old_y] = position(ball, &old.time)?;
        let x = map_axis(&old_x)?;
        let y = map_axis(&old_y)?;
        ball.vx = map_velocity(ball.vx)?;
        ball.vy = map_velocity(ball.vy)?;
        ball.cell = (y as usize / Q as usize) * 1000 + x as usize / Q as usize;
        ball.x0.0 = BigInt::from(x) - BigInt::from(ball.vx) * old.time.0.numer();
        ball.y0.0 = BigInt::from(y) - BigInt::from(ball.vy) * old.time.0.numer();
    }
    next.validate()?;
    Ok(next)
}
