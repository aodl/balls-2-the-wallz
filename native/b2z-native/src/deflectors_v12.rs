//! Provisional successor structure policy; no production transition authority.
use crate::deflector_boundary::{face_velocity, Trajectory};
use crate::world::{Ball, Deflector, World};
use dtr_wire::{hash, Int, Rat, Result};
use num_bigint::BigInt;
use serde_json::{json, Value};
use std::collections::{BTreeMap, BTreeSet};
pub fn identity() -> Result<Value> {
    let mut i = crate::combined_v11::identity()?;
    i["rules_hash"] = json!(hash(b"B2Z_BOUNDARY_DEFLECTOR_RULES_12"));
    i["schema_hash"] = json!(hash(b"B2Z_STATE_07_BOUNDED_DIAGONAL_DEFLECTORS"));
    i["config_hash"] = json!(hash(include_bytes!(
        "../../../apps/b2z-observer/configuration-deflector.bin"
    )));
    Ok(i)
}
pub fn configuration() -> &'static [u8] {
    include_bytes!("../../../apps/b2z-observer/configuration-deflector.bin")
}
pub fn at(w: &World, cell: usize) -> Option<&Deflector> {
    let ds = w.deflectors.as_ref()?;
    ds.binary_search_by_key(&cell, |d| d.cell)
        .ok()
        .map(|i| &ds[i])
}
pub fn trajectory(b: &Ball) -> Result<Trajectory> {
    Trajectory::new(
        b.x0.0.clone(),
        b.y0.0.clone(),
        b.den.as_ref().ok_or("denominator")?.0.clone(),
        b.vx,
        b.vy,
    )
}
pub fn validate_ball(b: &Ball) -> Result<()> {
    let t = trajectory(b)?;
    if BigInt::from(t.den) != b.den.as_ref().unwrap().0 || t.x != b.x0.0 || t.y != b.y0.0 {
        return Err("noncanonical trajectory".into());
    }
    if t.den > 1 && (b.vx.unsigned_abs() != 22627 || b.vy.unsigned_abs() != 22627)
        || i64::from(b.vx).pow(2) + i64::from(b.vy).pow(2) > 32001i64.pow(2)
    {
        return Err("successor velocity class".into());
    }
    if b.deflector_rearm.is_some() {
        return Err("rearm is not part of the boundary policy".into());
    }
    Ok(())
}
pub fn separation(w: &World, cell: usize) -> bool {
    let x = (cell % w.width) as i64;
    let y = (cell / w.width) as i64;
    for dy in -1..=1 {
        for dx in -1..=1 {
            if (dx != 0 || dy != 0)
                && at(
                    w,
                    crate::world::wrap_cell(x + dx, y + dy, w.width, w.height),
                )
                .is_some()
            {
                return false;
            }
        }
    }
    true
}
pub fn validate(w: &World) -> Result<()> {
    let ds = w.deflectors.as_ref().ok_or("structure state")?;
    let next = w.next_deflector_id.ok_or("structure counter")?;
    if ds.len() > 256 || next == 0 {
        return Err("structure capacity".into());
    }
    let mut prior = None;
    let mut ids = BTreeSet::new();
    let mut counts = BTreeMap::new();
    for d in ds {
        if d.id == 0
            || d.id >= next
            || !ids.insert(d.id)
            || d.cell >= w.cell_count()
            || prior.is_some_and(|p| p >= d.cell)
            || w.player_at(d.cell) != Some(d.owner)
            || w.cannons.iter().any(|c| c.cell == d.cell)
            || !b2z_protocol::deflector::ORIENTATIONS.contains(&d.orientation.as_str())
        {
            return Err("deflector identity/occupancy".into());
        }
        if !separation(w, d.cell) {
            return Err("deflector spacing".into());
        }
        let count = counts.entry(d.owner).or_insert(0);
        *count += 1;
        if *count > 16 {
            return Err("player structure capacity".into());
        }
        prior = Some(d.cell);
    }
    for b in &w.balls {
        validate_ball(b)?;
        if at(w, b.cell).is_some() {
            return Err("ball in blocked structure".into());
        }
    }
    Ok(())
}
pub fn remove_lost(w: &mut World) -> Vec<Deflector> {
    if w.version < 7 {
        return vec![];
    }
    let ds = w.deflectors.take().unwrap_or_default();
    let mut kept = Vec::new();
    let mut gone = Vec::new();
    for d in ds {
        if w.player_at(d.cell) == Some(d.owner) {
            kept.push(d)
        } else {
            gone.push(d)
        }
    }
    w.deflectors = Some(kept);
    gone
}
pub fn contact(b: &mut Ball, t: &Rat, d: &Deflector, face: &str, _wall: i64) -> Result<Value> {
    let old = trajectory(b)?;
    let (axis, nx, ny) = match face {
        "N" => (1, 0i64, -1i64),
        "E" => (0, 1, 0),
        "S" => (1, 0, 1),
        "W" => (0, -1, 0),
        _ => return Err("contact face".into()),
    };
    if i64::from(b.vx) * nx + i64::from(b.vy) * ny >= 0
        || old.position(t)?[axis] != Rat::integer(_wall)
    {
        return Err("not a genuine face entry".into());
    }
    let (front, vx, vy) = face_velocity(&d.orientation, face)?;
    let new = old.redirect(t, vx, vy)?;
    if old.position(t)? != new.position(t)? {
        return Err("discontinuous contact".into());
    }
    b.x0 = Int(new.x);
    b.y0 = Int(new.y);
    b.den = Some(Int(new.den.into()));
    b.vx = new.vx;
    b.vy = new.vy;
    Ok(
        json!({"id":d.id,"orientation":d.orientation,"face":face,"kind":"deflector_redirect","front":front}),
    )
}
pub fn migrate(old: &World) -> Result<World> {
    old.validate()?;
    if old.version != 6 {
        return Err("Rules11 schema predecessor".into());
    }
    let mut w = old.clone();
    w.version = 7;
    w.deflectors = Some(vec![]);
    w.next_deflector_id = Some(1);
    for b in &mut w.balls {
        b.den = Some(Int(1.into()));
    }
    w.validate()?;
    Ok(w)
}
pub fn prepare(
    w: &World,
    account: &str,
    amount: u64,
    memo: &[u8],
) -> Result<crate::purchases_v6::Plan> {
    prepare_with_spacing(w, account, amount, memo, false)
}
pub(crate) fn prepare_with_spacing(
    w: &World,
    account: &str,
    amount: u64,
    memo: &[u8],
    spacing: bool,
) -> Result<crate::purchases_v6::Plan> {
    use crate::purchases_v6::Plan;
    let fail = |reason: &str| {
        Ok(Plan::Rejected {
            reason: reason.to_owned(),
        })
    };
    let (cell, orientation) = match b2z_protocol::deflector::decode(memo) {
        Ok(b2z_protocol::deflector::Command::Deflect { cell, orientation }) => {
            (cell as usize, orientation)
        }
        _ => return fail("MALFORMED_MEMO"),
    };
    let Some(owner) = w
        .playability
        .as_ref()
        .and_then(|s| s.players.iter().find(|p| p.account == account))
        .map(|p| p.id)
    else {
        return fail("NOT_OWN_TERRITORY");
    };
    if w.player_at(cell) != Some(owner) {
        return fail("NOT_OWN_TERRITORY");
    }
    if amount < 10000000 {
        return fail("UNDERFUNDED");
    }
    let ds = w.deflectors.as_ref().ok_or("structure state")?;
    if ds.len() >= 256 {
        return fail("DEFLECTOR_CAPACITY");
    }
    if ds.iter().filter(|d| d.owner == owner).count() >= 16 {
        return fail("PLAYER_DEFLECTOR_CAPACITY");
    }
    if w.next_deflector_id == Some(u32::MAX) {
        return fail("DEFLECTOR_ID_EXHAUSTED");
    }
    if crate::territory_v6::balls(w, w.owner(cell).unwrap_or(0)) == 0 {
        return fail("NO_ACTIVE_ISLAND");
    }
    if crate::purchases_v6::occupied_cells(w)?.contains(&cell) {
        return fail("SITE_OCCUPIED");
    }
    if !spacing && !separation(w, cell) {
        return fail("DEFLECTOR_TOO_CLOSE");
    }
    if !crate::purchases_v6::enemy_clearance(w, owner, cell) {
        return fail("ENEMY_TERRITORY_TOO_CLOSE");
    }
    Ok(Plan::Deflect {
        owner,
        cell,
        orientation: b2z_protocol::deflector::ORIENTATIONS[orientation as usize].to_owned(),
        price: Int(10000000.into()),
    })
}

/// Lossless schema7 decimal wire. Internal durable events remain typed.
pub fn pack_event(e: &Value) -> Result<Value> {
    if e["kind"] != "motion" {
        return Ok(e.clone());
    }
    let dec = |v: &Value| {
        v["$integer"]
            .as_str()
            .map(str::to_owned)
            .ok_or_else(|| "integer event field".to_string())
    };
    let b = &e["ball_state"];
    let c = e.get("deflector_contact");
    let contact = if let Some(c) = c {
        let o = b2z_protocol::deflector::ORIENTATIONS
            .iter()
            .position(|x| c["orientation"].as_str() == Some(x))
            .ok_or("contact orientation")?;
        let f = ["N", "E", "S", "W"]
            .iter()
            .position(|x| c["face"].as_str() == Some(x))
            .ok_or("contact face")?;
        if c["kind"] != "deflector_redirect" || !c["front"].is_boolean() {
            return Err("contact kind".into());
        }
        json!([c["id"], o, f, 0, c["front"]])
    } else {
        Value::Null
    };
    Ok(json!([
        0,
        e["sequence"],
        [dec(&e["time"][0])?, dec(&e["time"][1])?],
        e["ball"],
        e["from_cell"],
        [
            b["cell"],
            dec(&b["x0"])?,
            dec(&b["y0"])?,
            b["vx"],
            b["vy"],
            dec(&b["den"])?
        ],
        contact,
        e["vertex_blocked"]
    ]))
}
