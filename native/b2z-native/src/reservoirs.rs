//! Inert terrain, with storage and commands fenced by the Rules16 identity.
use crate::{
    purchases_v6::{enemy_clearance, occupied_cells, player_by_account, Plan},
    territory_v6,
    world::World,
};
use b2z_protocol::reservoir::PRICE_E8S;
use dtr_wire::{hash, Int, Result};
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

/// Canonical wire capacity switch, not a limit on occupied cells. A full-size
/// range array fits within the historical 250 KB bitmap's byte budget.
pub const MAX_COMPACT_RANGES: usize = 14_000;

pub fn compact_configuration() -> &'static [u8] {
    include_bytes!("../../../apps/b2z-observer/configuration-compact-reservoir.bin")
}

pub fn compact_identity() -> serde_json::Value {
    json!({
        "rules_hash":hash(b"B2Z_COMPACT_RESERVOIR_RULES_19"),
        "schema_hash":hash(b"B2Z_STATE_11_CANONICAL_RESERVOIR_RANGES"),
        "config_hash":hash(compact_configuration()),
    })
}

/// Four cells per historical lowercase hex digit, lowest bit first.
pub fn has(world: &World, cell: usize) -> bool {
    if let Some(ranges) = &world.reservoir_ranges {
        let index = ranges.partition_point(|range| range[0] as usize <= cell);
        return index > 0 && cell < ranges[index - 1][1] as usize;
    }
    world
        .reservoirs
        .as_ref()
        .and_then(|bits| bits.as_bytes().get(cell / 4))
        .and_then(|&byte| nibble(byte))
        .is_some_and(|bits| (bits & (1 << (cell % 4))) != 0)
}

fn set_bit(bits: &mut String, cell: usize) {
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
}

/// At most one range beyond the wire threshold is needed to choose a format.
fn ranges_from_bitmap(bits: &str) -> Vec<[u32; 2]> {
    let mut ranges: Vec<[u32; 2]> = Vec::new();
    for (i, byte) in bits.bytes().enumerate() {
        let mut occupied = nibble(byte).expect("checked bitmap");
        while occupied != 0 {
            let bit = occupied.trailing_zeros();
            occupied &= occupied - 1;
            let cell = i as u32 * 4 + bit;
            if let Some(last) = ranges.last_mut().filter(|r| r[1] == cell) {
                last[1] += 1;
            } else {
                ranges.push([cell, cell + 1]);
                if ranges.len() > MAX_COMPACT_RANGES {
                    return ranges;
                }
            }
        }
    }
    ranges
}

/// Materialise the historical representation for the one-off cutover check
/// and the legacy spawn preimage. Ordinary compact checkpoints never call it.
pub fn legacy_bitmap(world: &World) -> String {
    if let Some(bits) = &world.reservoirs {
        return bits.clone();
    }
    let Some(ranges) = &world.reservoir_ranges else {
        return String::new();
    };
    let length = ranges
        .last()
        .map_or(0, |last| (last[1] as usize).div_ceil(4));
    let mut bits = vec![0u8; length];
    for &[start, end] in ranges {
        for cell in start as usize..end as usize {
            bits[cell / 4] |= 1 << (cell % 4);
        }
    }
    bits.iter()
        .map(|&value| char::from(DIGITS[value as usize]))
        .collect()
}

pub fn place(world: &mut World, cell: usize) -> Result<()> {
    if cell >= world.cell_count() || has(world, cell) {
        return Err("RESERVOIR_OCCUPANCY".into());
    }
    if let Some(ranges) = &mut world.reservoir_ranges {
        let cell = cell as u32;
        let right = ranges.partition_point(|range| range[0] < cell);
        let left_adjacent = right > 0 && ranges[right - 1][1] == cell;
        let right_adjacent = ranges.get(right).is_some_and(|range| range[0] == cell + 1);
        match (left_adjacent, right_adjacent) {
            (true, true) => ranges[right - 1][1] = ranges.remove(right)[1],
            (true, false) => ranges[right - 1][1] += 1,
            (false, true) => ranges[right][0] = cell,
            (false, false) => ranges.insert(right, [cell, cell + 1]),
        }
        if ranges.len() > MAX_COMPACT_RANGES {
            world.reservoirs = Some(legacy_bitmap(world));
            world.reservoir_ranges = None;
        }
    } else {
        let bits = world.reservoirs.as_mut().ok_or("RESERVOIR_SCHEMA")?;
        set_bit(bits, cell);
        if world.version >= 11 {
            let ranges = ranges_from_bitmap(bits);
            if ranges.len() <= MAX_COMPACT_RANGES {
                world.reservoir_ranges = Some(ranges);
                world.reservoirs = None;
            }
        }
    }
    Ok(())
}

fn validate_bitmap(bits: &str, cells: usize) -> Result<()> {
    let max = cells.div_ceil(4);
    if bits.len() > max || bits.ends_with('0') || !bits.bytes().all(|b| nibble(b).is_some()) {
        return Err("RESERVOIR_SCHEMA".into());
    }
    let tail = cells % 4;
    if tail != 0
        && bits.len() == max
        && bits.bytes().last().and_then(nibble).unwrap_or(0) >= 1 << tail
    {
        return Err("RESERVOIR_OCCUPANCY".into());
    }
    Ok(())
}

fn dense_required(bits: &str) -> bool {
    let mut ranges = 0;
    let mut preceding = 0;
    for byte in bits.bytes() {
        let word = nibble(byte).expect("checked bitmap");
        ranges += (word & !((word << 1) | preceding)).count_ones() as usize;
        preceding = word >> 3;
        if ranges > MAX_COMPACT_RANGES {
            return true;
        }
    }
    false
}

pub fn validate(world: &World) -> Result<()> {
    let cells = world.cell_count();
    match (world.version, &world.reservoirs, &world.reservoir_ranges) {
        (8..=12, Some(bits), None) => {
            validate_bitmap(bits, cells)?;
            if world.version >= 11 && !dense_required(bits) {
                return Err("RESERVOIR_NONCANONICAL_DENSE".into());
            }
        }
        (11..=12, None, Some(ranges)) => {
            if ranges.len() > MAX_COMPACT_RANGES
                || ranges
                    .iter()
                    .any(|&[start, end]| start >= end || end as usize > cells)
                || ranges.windows(2).any(|pair| pair[0][1] >= pair[1][0])
            {
                return Err("RESERVOIR_RANGE_SCHEMA".into());
            }
        }
        (0..=7, None, None) => return Ok(()),
        _ => return Err("RESERVOIR_SCHEMA".into()),
    }
    if world.cannons.iter().any(|s| has(world, s.cell))
        || world
            .deflectors
            .iter()
            .flatten()
            .any(|s| has(world, s.cell))
    {
        return Err("RESERVOIR_OCCUPANCY".into());
    }
    Ok(())
}

pub fn migrate_compact(mut world: World) -> Result<World> {
    if world.version != 10 {
        return Err("RESERVOIR_COMPACT_PREDECESSOR".into());
    }
    world.validate()?;
    let ranges = ranges_from_bitmap(world.reservoirs.as_deref().ok_or("RESERVOIR_SCHEMA")?);
    world.version = 11;
    if ranges.len() <= MAX_COMPACT_RANGES {
        world.reservoirs = None;
        world.reservoir_ranges = Some(ranges);
    }
    world.validate()?;
    Ok(world)
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
    if !matches!(world.version, 8..=12) {
        return Err("RESERVOIR_SCHEMA".into());
    }
    let price = if world.version >= 9 {
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

#[cfg(test)]
mod compact_tests {
    use super::*;

    #[test]
    fn sparse_and_fragmented_forms_preserve_the_exact_occupied_set() {
        let fixture: serde_json::Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/b2z-delegation-v18.json"
        ))
        .unwrap();
        let mut legacy = World::decode(
            &dtr_wire::unhex(fixture["execution"]["state"].as_str().unwrap()).unwrap(),
        )
        .unwrap();
        legacy.reservoirs = Some(String::new());
        for cell in [998000, 998001, 999000, 999001] {
            place(&mut legacy, cell).unwrap();
        }
        let mut world = migrate_compact(legacy.clone()).unwrap();
        assert_eq!(
            world.reservoir_ranges,
            Some(vec![[998000, 998002], [999000, 999002]])
        );
        assert_eq!(legacy_bitmap(&world), legacy.reservoirs.unwrap());
        assert_eq!(World::decode(&world.encode().unwrap()).unwrap(), world);
        place(&mut world, 999999).unwrap();
        assert!(has(&world, 999999));
        assert!(place(&mut world, 1_000_000).is_err());
        assert!(place(&mut world, 999999).is_err());

        world.cannons.clear();
        world.deflectors.as_mut().unwrap().clear();
        world.reservoir_ranges = Some(
            (0..MAX_COMPACT_RANGES as u32)
                .map(|n| [n * 2, n * 2 + 1])
                .collect(),
        );
        place(&mut world, 999999).unwrap();
        assert!(world.reservoir_ranges.is_none());
        assert_eq!(world.reservoirs.as_ref().unwrap().len(), 250_000);
        validate(&world).unwrap();
        place(&mut world, 1).unwrap();
        validate(&world).unwrap();
        assert_eq!(world.reservoir_ranges.as_ref().unwrap()[0], [0, 3]);
        world.reservoir_ranges.as_mut().unwrap().insert(1, [3, 4]);
        assert!(validate(&world).is_err());
    }
}
