//! Inert terrain, with storage and commands fenced by the Rules16 identity.
use crate::{
    purchases_v6::{Plan, enemy_clearance, occupied_cells, player_by_account},
    territory_v6,
    world::World,
};
use b2z_protocol::reservoir::PRICE_E8S;
use dtr_wire::{Int, Result, hash};
use serde_json::json;

pub fn configuration() -> &'static [u8] {
    include_bytes!("../../../apps/b2z-observer/configuration-reservoir.bin")
}

pub fn identity() -> serde_json::Value {
    json!({
        "rules_hash":hash(b"B2Z_RESERVOIR_RULES_16"),
        "schema_hash":hash(b"B2Z_STATE_08_RESERVOIR_TERRAIN"),
        "config_hash":hash(configuration()),
    })
}

const DIGITS: &[u8; 16] = b"0123456789abcdef";

fn nibble(byte: u8) -> Option<u8> {
    match byte {
        b'0'..=b'9' => Some(byte - b'0'),
        b'a'..=b'f' => Some(byte - b'a' + 10),
        _ => None,
    }
}

/// Four cells per canonical lowercase hex digit, lowest bit first.
pub fn has(world: &World, cell: usize) -> bool {
    world
        .reservoirs
        .as_ref()
        .and_then(|bits| bits.as_bytes().get(cell / 4))
        .and_then(|&byte| nibble(byte))
        .is_some_and(|bits| (bits & (1 << (cell % 4))) != 0)
}

pub fn place(world: &mut World, cell: usize) -> Result<()> {
    if cell >= world.cell_count() || has(world, cell) {
        return Err("RESERVOIR_OCCUPANCY".into());
    }
    let bits = world.reservoirs.as_mut().ok_or("RESERVOIR_SCHEMA")?;
    let at = cell / 4;
    let old = bits
        .as_bytes()
        .get(at)
        .and_then(|&byte| nibble(byte))
        .unwrap_or(0);
    let encoded = DIGITS[(old | (1 << (cell % 4))) as usize] as char;
    if at < bits.len() {
        bits.replace_range(at..at + 1, &encoded.to_string());
    } else {
        bits.extend(std::iter::repeat_n('0', at - bits.len()));
        bits.push(encoded);
    }
    Ok(())
}

pub fn validate(world: &World) -> Result<()> {
    match (world.version, &world.reservoirs) {
        (8 | 9, Some(bits)) => {
            let cells = world.cell_count();
            let max = cells.div_ceil(4);
            if bits.len() > max || bits.ends_with('0') || !bits.bytes().all(|b| nibble(b).is_some())
            {
                return Err("RESERVOIR_SCHEMA".into());
            }
            let tail = cells % 4;
            if (tail != 0
                && bits.len() == max
                && bits.bytes().last().and_then(nibble).unwrap_or(0) >= 1 << tail)
                || world.cannons.iter().any(|s| has(world, s.cell))
                || world
                    .deflectors
                    .iter()
                    .flatten()
                    .any(|s| has(world, s.cell))
            {
                return Err("RESERVOIR_OCCUPANCY".into());
            }
        }
        (8 | 9, None) | (_, Some(_)) => return Err("RESERVOIR_SCHEMA".into()),
        _ => {}
    }
    Ok(())
}

pub fn migrate(mut world: World) -> Result<World> {
    if world.version != 7 {
        return Err("RESERVOIR_PREDECESSOR".into());
    }
    world.validate()?;
    world.version = 8;
    world.reservoirs = Some(String::new());
    world.validate()?;
    Ok(world)
}

pub fn prepare(world: &World, account: &str, amount: u64, cell: usize) -> Result<Plan> {
    if !matches!(world.version, 8 | 9) {
        return Err("RESERVOIR_SCHEMA".into());
    }
    let price = if world.version == 9 {
        b2z_protocol::economy17::RESERVOIR_PRICE_E8S
    } else {
        PRICE_E8S
    };
    if amount < price {
        return Ok(Plan::Rejected {
            reason: "UNDERFUNDED".into(),
        });
    }
    let reason = match (player_by_account(world, account), world.owner(cell)) {
        (Some(player), Some(territory)) if world.player_at(cell) == Some(player) => {
            if territory_v6::balls(world, territory) == 0 {
                "NO_ACTIVE_ISLAND"
            } else if has(world, cell) || occupied_cells(world)?.contains(&cell) {
                "SITE_OCCUPIED"
            } else if !enemy_clearance(world, player, cell) {
                "ENEMY_TERRITORY_TOO_CLOSE"
            } else {
                return Ok(Plan::Reservoir {
                    cell,
                    price: Int(price.into()),
                });
            }
        }
        _ => "NOT_OWN_TERRITORY",
    };
    Ok(Plan::Rejected {
        reason: reason.into(),
    })
}
