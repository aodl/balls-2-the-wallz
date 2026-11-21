//! Rules13 purchase-only placement policy. Committed schema7 worlds retain all Rules12 positions.
use crate::{
    purchases_v6::{self, Plan},
    territory_v6,
    world::{wrap_cell, World},
};
use b2z_protocol::context_structures as codec;
use dtr_wire::{hash, Int, Result};
use serde_json::{json, Value};
use std::{collections::BTreeMap, sync::OnceLock};

pub fn configuration() -> &'static [u8] {
    include_bytes!("../../../apps/b2z-observer/configuration-context.bin")
}

pub fn configuration_hash() -> &'static str {
    static HASH: OnceLock<String> = OnceLock::new();
    HASH.get_or_init(|| hash(configuration()))
}

pub fn identity() -> Result<Value> {
    static IDENTITY: OnceLock<Value> = OnceLock::new();
    if let Some(id) = IDENTITY.get() {
        return Ok(id.clone());
    }
    let mut id = crate::deflectors_v12::identity()?;
    id["rules_hash"] = json!(hash(b"B2Z_CONTEXT_STRUCTURES_RULES_13"));
    id["config_hash"] = json!(configuration_hash());
    Ok(IDENTITY.get_or_init(|| id).clone())
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum Structure {
    Cannon(u32),
    Deflector(u32),
}

pub fn friendly_nearby(world: &World, owner: u32, cell: usize, moving: Option<Structure>) -> bool {
    let structures: BTreeMap<_, _> = world
        .cannons
        .iter()
        .map(|c| {
            (
                c.cell,
                (Structure::Cannon(c.id), world.player_for_cannon(c.id)),
            )
        })
        .chain(
            world
                .deflectors
                .iter()
                .flatten()
                .map(|d| (d.cell, (Structure::Deflector(d.id), Some(d.owner)))),
        )
        .collect();
    let x = (cell % world.width) as i64;
    let y = (cell / world.width) as i64;
    for dy in -codec::FRIENDLY_RADIUS..=codec::FRIENDLY_RADIUS {
        for dx in -codec::FRIENDLY_RADIUS..=codec::FRIENDLY_RADIUS {
            let nearby = wrap_cell(x + dx, y + dy, world.width, world.height);
            if nearby != cell
                && structures
                    .get(&nearby)
                    .is_some_and(|(shape, player)| *player == Some(owner) && Some(*shape) != moving)
            {
                return true;
            }
        }
    }
    false
}

pub const MIN_STRUCTURE_DISTANCE: usize = 4;

pub fn has_structure_clearance(world: &World, cell: usize, moving: Option<Structure>) -> bool {
    let clear = |other: usize| {
        let dx = (cell % world.width).abs_diff(other % world.width);
        let dy = (cell / world.width).abs_diff(other / world.width);
        dx.min(world.width - dx).max(dy.min(world.height - dy)) >= MIN_STRUCTURE_DISTANCE
    };
    world
        .cannons
        .iter()
        .all(|c| moving == Some(Structure::Cannon(c.id)) || clear(c.cell))
        && world
            .deflectors
            .iter()
            .flatten()
            .all(|d| moving == Some(Structure::Deflector(d.id)) || clear(d.cell))
}

fn separation_reason(
    world: &World,
    owner: u32,
    cell: usize,
    moving: Option<Structure>,
    spacing: bool,
) -> Option<&'static str> {
    if spacing {
        (!has_structure_clearance(world, cell, moving)).then_some("STRUCTURE_TOO_CLOSE")
    } else {
        (!friendly_nearby(world, owner, cell, moving)).then_some("NO_FRIENDLY_STRUCTURE_NEARBY")
    }
}

pub fn site_reason(
    world: &World,
    owner: u32,
    cell: usize,
    moving: Option<Structure>,
    deflector: bool,
    spacing: bool,
) -> Result<Option<&'static str>> {
    if world.player_at(cell) != Some(owner) {
        return Ok(Some("NOT_OWN_TERRITORY"));
    }
    if territory_v6::balls(world, world.owner(cell).unwrap_or(0)) == 0 {
        return Ok(Some("NO_ACTIVE_ISLAND"));
    }
    if purchases_v6::occupied_cells(world)?.contains(&cell) {
        return Ok(Some("SITE_OCCUPIED"));
    }
    if deflector && !spacing {
        let x = (cell % world.width) as i64;
        let y = (cell / world.width) as i64;
        for dy in -1..=1 {
            for dx in -1..=1 {
                let nearby = wrap_cell(x + dx, y + dy, world.width, world.height);
                if crate::deflectors_v12::at(world, nearby)
                    .is_some_and(|d| Some(Structure::Deflector(d.id)) != moving)
                {
                    return Ok(Some("DEFLECTOR_TOO_CLOSE"));
                }
            }
        }
    }
    if !purchases_v6::enemy_clearance(world, owner, cell) {
        return Ok(Some("ENEMY_TERRITORY_TOO_CLOSE"));
    }
    if let Some(reason) = separation_reason(world, owner, cell, moving, spacing) {
        return Ok(Some(reason));
    }
    Ok(None)
}

pub fn prepare(
    world: &World,
    account: &str,
    amount: u64,
    memo: &[u8],
    moved: &[u32],
    spacing: bool,
) -> Result<Plan> {
    let reject = |reason: &str| {
        Ok(Plan::Rejected {
            reason: reason.into(),
        })
    };
    let command = match codec::decode(memo) {
        Ok(command) => command,
        Err(_) => return reject("MALFORMED_MEMO"),
    };
    let id = match command {
        codec::Command::Existing(b2z_protocol::deflector::Command::Deflect { .. }) => {
            let plan =
                crate::deflectors_v12::prepare_with_spacing(world, account, amount, memo, spacing)?;
            if let Plan::Deflect { cell, owner, .. } = plan {
                if let Some(reason) = separation_reason(world, owner, cell, None, spacing) {
                    return reject(reason);
                }
            }
            return Ok(plan);
        }
        codec::Command::Existing(_) => {
            return purchases_v6::prepare_with_context(
                world, account, amount, memo, moved, true, spacing,
            );
        }
        codec::Command::Move { id, .. } | codec::Command::Reorient { id, .. } => id,
    };
    let Some(d) = world.deflectors.iter().flatten().find(|d| d.id == id) else {
        return reject("NO_DEFLECTOR");
    };
    if purchases_v6::player_by_account(world, account) != Some(d.owner) {
        return reject("NOT_OWNER");
    }
    if world.player_at(d.cell) != Some(d.owner)
        || territory_v6::balls(world, world.owner(d.cell).unwrap_or(0)) == 0
    {
        return reject("NO_ACTIVE_ISLAND");
    }
    match command {
        codec::Command::Move { cell, .. } => {
            if amount < codec::MOVE_E8S {
                return reject("UNDERFUNDED");
            }
            let cell = cell as usize;
            if cell == d.cell {
                return reject("SAME_LOCATION");
            }
            if let Some(reason) = site_reason(
                world,
                d.owner,
                cell,
                Some(Structure::Deflector(id)),
                true,
                spacing,
            )? {
                return reject(reason);
            }
            Ok(Plan::DeflectorMove {
                id,
                cell,
                price: Int(codec::MOVE_E8S.into()),
            })
        }
        codec::Command::Reorient { orientation, .. } => {
            if amount < codec::REORIENT_E8S {
                return reject("UNDERFUNDED");
            }
            let orientation = b2z_protocol::deflector::ORIENTATIONS[orientation as usize];
            if orientation == d.orientation {
                return reject("SAME_ORIENTATION");
            }
            Ok(Plan::DeflectorReorient {
                id,
                orientation: orientation.to_owned(),
                price: Int(codec::REORIENT_E8S.into()),
            })
        }
        codec::Command::Existing(_) => unreachable!(),
    }
}
