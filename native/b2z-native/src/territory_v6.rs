//! Connected-island labels. Balls belong to funding players, never launchers.
//! Cell labels identify connected islands; canonical player identity is separate.
use crate::{
    playability::{mark_dormant, Fence},
    world::{CellOverride, OwnerCount, World},
};
use dtr_wire::Result;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Territory {
    pub id: u32,
    pub player: u32,
}
pub fn player(world: &World, id: u32) -> Option<u32> {
    if id == 0 {
        return Some(0);
    }
    world
        .playability
        .as_ref()?
        .territories
        .iter()
        .find(|r| r.id == id)
        .map(|r| r.player)
}
pub fn for_cannon(world: &World, id: u32) -> Option<u32> {
    world.owner(world.cannons.iter().find(|c| c.id == id)?.cell)
}
pub fn balls(world: &World, id: u32) -> usize {
    let owner = player(world, id);
    world
        .balls
        .iter()
        .filter(|b| Some(b.owner) == owner && world.owner(b.cell) == Some(id))
        .count()
}
pub fn allocate(world: &mut World, owner: u32) -> Result<u32> {
    let s = world.playability.as_mut().ok_or("EXPECTED_V6")?;
    if s.player(owner).is_none() {
        return Err("UNKNOWN_PLAYER".into());
    }
    let id = s.next_territory_id;
    s.next_territory_id = id.checked_add(1).ok_or("TERRITORY_ID_EXHAUSTED")?;
    if id == 0 || id == u32::MAX {
        return Err("TERRITORY_ID_EXHAUSTED".into());
    }
    s.territories.push(Territory { id, player: owner });
    Ok(id)
}
/// Relabel compact storage without visiting the million individual cells.
pub fn relabel(world: &mut World, from: u32, to: u32) -> Result<()> {
    if from == 0 || from == to {
        return Err("TERRITORY_RELABEL".into());
    }
    let o = world.ownership.as_mut().ok_or("EXPECTED_V6")?;
    for id in &mut o.base {
        if *id == from {
            *id = to
        }
    }
    let mut overrides: Vec<CellOverride> = vec![];
    for mut r in std::mem::take(&mut o.overrides) {
        if r.owner == from {
            r.owner = to
        }
        if let Some(last) = overrides
            .last_mut()
            .filter(|p| p.end == r.start && p.owner == r.owner)
        {
            last.end = r.end
        } else {
            overrides.push(r)
        }
    }
    o.overrides = overrides;
    let mut counts = BTreeMap::new();
    for r in &o.counts {
        let owner = if r.owner == from { to } else { r.owner };
        if owner != 0 {
            *counts.entry(owner).or_insert(0usize) += r.cells
        }
    }
    o.counts = counts
        .into_iter()
        .map(|(owner, cells)| OwnerCount { owner, cells })
        .collect();
    Ok(())
}
pub fn merge(world: &mut World, ids: &[u32]) -> Result<u32> {
    let ids: BTreeSet<_> = ids.iter().copied().collect();
    let id = *ids.first().ok_or("EMPTY_TERRITORY_MERGE")?;
    let owner = player(world, id).ok_or("UNKNOWN_TERRITORY")?;
    if ids.iter().any(|id| player(world, *id) != Some(owner)) {
        return Err("HOSTILE_TERRITORY_MERGE".into());
    }
    for other in &ids {
        if *other != id {
            relabel(world, *other, id)?;
        }
    }
    world
        .playability
        .as_mut()
        .unwrap()
        .territories
        .retain(|r| r.id == id || !ids.contains(&r.id));
    Ok(id)
}
/// After empty-island land release or marker expiry, remaining marker cells
/// form small cardinal components. Group those entities, never scan the board.
pub fn regroup_markers(world: &mut World, id: u32) -> Result<()> {
    if balls(world, id) != 0 {
        return Err("TERRITORY_HAS_BALLS".into());
    }
    let owner = player(world, id).ok_or("UNKNOWN_TERRITORY")?;
    let anchors: Vec<_> = world
        .cannons
        .iter()
        .filter(|c| world.owner(c.cell) == Some(id))
        .map(|c| (c.id, c.cell))
        .collect();
    if world
        .ownership_counts()
        .iter()
        .find(|(r, _)| *r == id)
        .map_or(0, |(_, n)| *n)
        != anchors.len()
    {
        return Err("EMPTY_TERRITORY_NOT_PRUNED".into());
    }
    let mut seen = BTreeSet::new();
    let mut groups = vec![];
    for (_, cell) in &anchors {
        if !seen.insert(*cell) {
            continue;
        }
        let mut queue = vec![*cell];
        let mut head = 0;
        while head < queue.len() {
            for n in world.neighbors(queue[head]) {
                if anchors.iter().any(|(_, c)| *c == n) && seen.insert(n) {
                    queue.push(n)
                }
            }
            head += 1;
        }
        groups.push(queue)
    }
    let extra = groups.len().saturating_sub(1) as u32;
    world
        .playability
        .as_ref()
        .unwrap()
        .next_territory_id
        .checked_add(extra)
        .ok_or("TERRITORY_ID_EXHAUSTED")?;
    if groups.is_empty() {
        world
            .playability
            .as_mut()
            .unwrap()
            .territories
            .retain(|r| r.id != id);
        return Ok(());
    }
    for (index, cells) in groups.into_iter().enumerate() {
        let label = if index == 0 {
            id
        } else {
            allocate(world, owner)?
        };
        for c in cells {
            world.set_owner(c, label)?;
        }
    }
    Ok(())
}
/// Private-proposal operation. Every cannon on a ball-free island enters its
/// own grace period; other islands of the same player are unchanged.
pub fn prune_empty(world: &mut World, id: u32) -> Result<Vec<Fence>> {
    if balls(world, id) != 0 {
        return Err("TERRITORY_HAS_BALLS".into());
    }
    let cannons: Vec<_> = world
        .cannons
        .iter()
        .filter(|c| world.owner(c.cell) == Some(id))
        .map(|c| (c.id, c.cell))
        .collect();
    let mut fences = vec![];
    for (c, _) in &cannons {
        if let Some(f) = mark_dormant(world, *c)? {
            fences.push(f)
        }
    }
    world.clear_owner(id)?;
    for (_, cell) in cannons {
        world.set_owner(cell, id)?;
    }
    regroup_markers(world, id)?;
    Ok(fences)
}
