//! Versioned player/lifecycle state. All elapsed-time facts are explicit inputs;
//! this module has no clock, IC calls, Ledger positions or ambient randomness.
pub use crate::playability_generated::*;
use crate::world::{account_ok, World};
use dtr_wire::{Int, Result};
use num_traits::ToPrimitive;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
fn read_time<'de, D: serde::Deserializer<'de>>(d: D) -> std::result::Result<Option<Int>, D::Error> {
    Int::deserialize(d).map(Some)
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Player {
    pub id: u32,
    pub account: String,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Lifecycle {
    pub cannon: u32,
    pub player: u32,
    pub generation: u32,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        deserialize_with = "read_time"
    )]
    pub dormant_since_ns: Option<Int>,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        deserialize_with = "read_time"
    )]
    pub deadline_ns: Option<Int>,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct State {
    pub next_territory_id: u32,
    pub territories: Vec<crate::territory_v6::Territory>,
    pub elapsed_ns: Int,
    pub next_player_id: u32,
    pub players: Vec<Player>,
    pub lifecycle: Vec<Lifecycle>,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Fence {
    pub cannon: u32,
    pub generation: u32,
    pub deadline_ns: Int,
}
pub fn elapsed(value: &Int) -> Result<u64> {
    value
        .0
        .to_u64()
        .ok_or_else(|| "LIFECYCLE_TIME_BOUNDS".into())
}
pub fn configuration() -> &'static [u8] {
    include_bytes!("../../../apps/b2z-observer/configuration-playability.bin")
}
pub fn identity() -> Result<serde_json::Value> {
    Ok(
        serde_json::json!({"rules_hash":dtr_wire::hash(b"B2Z_PLAYABILITY_RULES_06"),"schema_hash":dtr_wire::hash(b"B2Z_STATE_06_PLAYERS_LIFECYCLE"),"config_hash":dtr_wire::hash(configuration())}),
    )
}
impl State {
    pub fn player(&self, id: u32) -> Option<&Player> {
        self.players
            .binary_search_by_key(&id, |p| p.id)
            .ok()
            .map(|i| &self.players[i])
    }
    pub fn life(&self, cannon: u32) -> Option<&Lifecycle> {
        self.lifecycle
            .binary_search_by_key(&cannon, |c| c.cannon)
            .ok()
            .map(|i| &self.lifecycle[i])
    }
    pub fn life_mut(&mut self, cannon: u32) -> Option<&mut Lifecycle> {
        self.lifecycle
            .binary_search_by_key(&cannon, |c| c.cannon)
            .ok()
            .map(|i| &mut self.lifecycle[i])
    }
    pub fn due(&self, observed_ns: u64) -> Vec<Fence> {
        let mut due: Vec<_> = self
            .lifecycle
            .iter()
            .filter_map(|c| {
                c.deadline_ns
                    .as_ref()
                    .filter(|d| d.0 <= observed_ns.into())
                    .map(|d| Fence {
                        cannon: c.cannon,
                        generation: c.generation,
                        deadline_ns: d.clone(),
                    })
            })
            .collect();
        due.sort_by(|a, b| {
            (&a.deadline_ns, a.cannon, a.generation).cmp(&(&b.deadline_ns, b.cannon, b.generation))
        });
        due
    }
    pub fn validate(&self, world: &World) -> Result<()> {
        let now = elapsed(&self.elapsed_ns)?;
        if self.players.len() > MAX_PLAYERS
            || self.players.windows(2).any(|p| p[0].id >= p[1].id)
            || self
                .players
                .iter()
                .any(|p| p.id == 0 || p.id == u32::MAX || !account_ok(&p.account))
            || self.next_player_id <= self.players.last().map_or(0, |p| p.id)
            || self.lifecycle.len() != world.cannons.len()
        {
            return Err("PLAYER_IDENTITY".into());
        }
        let mut accounts = BTreeSet::new();
        if self.players.iter().any(|p| !accounts.insert(&p.account)) {
            return Err("PLAYER_ACCOUNT_CONFLICT".into());
        }
        if self.territories.len() > MAX_CANNONS
            || self.territories.windows(2).any(|p| p[0].id >= p[1].id)
            || self
                .territories
                .iter()
                .any(|r| r.id == 0 || r.id == u32::MAX || self.player(r.player).is_none())
            || self.next_territory_id <= self.territories.last().map_or(0, |r| r.id)
        {
            return Err("TERRITORY_IDENTITY".into());
        }
        let mut pools = BTreeMap::new();
        for b in &world.balls {
            *pools
                .entry(world.owner(b.cell).ok_or("ball cell")?)
                .or_insert(0usize) += 1;
        }
        let mut retained = BTreeMap::new();
        let mut anchors = BTreeMap::new();
        for (c, l) in world.cannons.iter().zip(&self.lifecycle) {
            let p = self.player(l.player).ok_or("UNKNOWN_PLAYER")?;
            let region = world.owner(c.cell).ok_or("cannon cell")?;
            if l.cannon != c.id
                || l.generation == 0
                || p.account != c.account
                || world.player_at(c.cell) != Some(l.player)
            {
                return Err("CANNON_PLAYER_BINDING".into());
            }
            let count = retained.entry(l.player).or_insert(0usize);
            *count += 1;
            if *count > MAX_RETAINED_PER_PLAYER {
                return Err("PLAYER_CANNON_CAPACITY".into());
            }
            *anchors.entry(region).or_insert(0usize) += 1;
            let balls = pools.get(&region).copied().unwrap_or(0);
            match (&l.dormant_since_ns, &l.deadline_ns, balls) {
                (None, None, n) if n > 0 => {}
                (Some(s), Some(d), 0)
                    if elapsed(s)? <= now
                        && elapsed(d)?
                            == elapsed(s)?
                                .checked_add(DORMANCY_GRACE_NS)
                                .ok_or("LIFECYCLE_TIME_OVERFLOW")? => {}
                _ => return Err("CANNON_LIFECYCLE".into()),
            }
        }
        let areas = world.ownership_counts();
        for r in &self.territories {
            let count = anchors.get(&r.id).copied().unwrap_or(0);
            if count == 0 {
                return Err("TERRITORY_WITHOUT_CANNON".into());
            }
            if pools.get(&r.id).copied().unwrap_or(0) == 0
                && areas
                    .iter()
                    .find(|(id, _)| *id == r.id)
                    .map_or(0, |(_, n)| *n)
                    != count
            {
                return Err("DORMANT_TERRITORY_RETAINED".into());
            }
        }
        Ok(())
    }
}

/// Lossless v5 -> v6 metadata addition; activation/authentication is host-owned.
pub fn migrate(world: &World, observed_ns: u64) -> Result<World> {
    world.validate()?;
    if world.version != 5 || world.playability.is_some() {
        return Err("EXPECTED_V5_PREDECESSOR".into());
    }
    let mut next = world.clone();
    next.version = 6;
    next.playability = Some(State {
        elapsed_ns: Int(observed_ns.into()),
        next_player_id: world.next_cannon_id,
        next_territory_id: world.next_cannon_id,
        territories: world
            .cannons
            .iter()
            .map(|c| crate::territory_v6::Territory {
                id: c.id,
                player: c.id,
            })
            .collect(),
        players: world
            .cannons
            .iter()
            .map(|c| Player {
                id: c.id,
                account: c.account.clone(),
            })
            .collect(),
        lifecycle: world
            .cannons
            .iter()
            .map(|c| Lifecycle {
                cannon: c.id,
                player: c.id,
                generation: 1,
                dormant_since_ns: None,
                deadline_ns: None,
            })
            .collect(),
    });
    next.validate()?;
    Ok(next)
}

/// Stages a newly dormant cannon at the last observed time. The enclosing
/// completion must stamp the returned fence with its explicit completion fact.
pub fn mark_dormant(world: &mut World, cannon: u32) -> Result<Option<Fence>> {
    if world.active_cannon(cannon) {
        return Err("CANNON_HAS_BALLS".into());
    }
    let state = world.playability.as_mut().ok_or("EXPECTED_V6")?;
    let since = state.elapsed_ns.clone();
    let deadline = elapsed(&since)?
        .checked_add(DORMANCY_GRACE_NS)
        .ok_or("LIFECYCLE_TIME_OVERFLOW")?;
    let life = state.life_mut(cannon).ok_or("UNKNOWN_CANNON")?;
    if life.deadline_ns.is_some() {
        return Ok(None);
    }
    let generation = life
        .generation
        .checked_add(1)
        .ok_or("LIFECYCLE_GENERATION_EXHAUSTED")?;
    life.generation = generation;
    life.dormant_since_ns = Some(since);
    life.deadline_ns = Some(Int(deadline.into()));
    Ok(Some(Fence {
        cannon,
        generation,
        deadline_ns: Int(deadline.into()),
    }))
}
pub fn revive(world: &mut World, cannon: u32) -> Result<bool> {
    if !world.active_cannon(cannon) {
        return Err("REVIVAL_REQUIRES_PAID_BALL".into());
    }
    let life = world
        .playability
        .as_mut()
        .ok_or("EXPECTED_V6")?
        .life_mut(cannon)
        .ok_or("UNKNOWN_CANNON")?;
    if life.deadline_ns.is_none() {
        return Ok(false);
    }
    life.generation = life
        .generation
        .checked_add(1)
        .ok_or("LIFECYCLE_GENERATION_EXHAUSTED")?;
    life.deadline_ns = None;
    life.dormant_since_ns = None;
    Ok(true)
}
pub fn finalize_elapsed(
    world: &mut World,
    observed_ns: u64,
    pending: &[Fence],
) -> Result<Vec<Fence>> {
    let mut unique = BTreeSet::new();
    if pending.len() > MAX_CANNONS
        || pending
            .iter()
            .any(|f| !unique.insert((f.cannon, f.generation)))
    {
        return Err("LIFECYCLE_FENCE_DUPLICATE".into());
    }
    let state = world.playability.as_mut().ok_or("EXPECTED_V6")?;
    if observed_ns < elapsed(&state.elapsed_ns)? {
        return Err("LIFECYCLE_TIME_ROLLBACK".into());
    }
    let deadline = observed_ns
        .checked_add(DORMANCY_GRACE_NS)
        .ok_or("LIFECYCLE_TIME_OVERFLOW")?;
    let mut proposed = state.clone();
    let mut stamped = vec![];
    for fence in pending {
        if let Some(life) = proposed.life_mut(fence.cannon) {
            if life.generation == fence.generation
                && life.deadline_ns.as_ref() == Some(&fence.deadline_ns)
            {
                life.dormant_since_ns = Some(Int(observed_ns.into()));
                life.deadline_ns = Some(Int(deadline.into()));
                stamped.push(Fence {
                    cannon: life.cannon,
                    generation: life.generation,
                    deadline_ns: Int(deadline.into()),
                });
            }
        }
    }
    proposed.elapsed_ns = Int(observed_ns.into());
    *state = proposed;
    Ok(stamped)
}

/// Compact ownership cleanup only when this entire player has no live balls.
/// Active shared territory is handled by the resumable topology operation.
pub fn clear_unsupported_player(world: &mut World, player: u32) -> Result<bool> {
    let state = world.playability.as_ref().ok_or("EXPECTED_V6")?;
    state.player(player).ok_or("UNKNOWN_PLAYER")?;
    if world.balls.iter().any(|b| b.owner == player) {
        return Ok(false);
    }
    let regions: Vec<_> = world
        .playability
        .as_ref()
        .unwrap()
        .territories
        .iter()
        .filter(|r| r.player == player)
        .map(|r| r.id)
        .collect();
    for r in regions {
        crate::territory_v6::prune_empty(world, r)?;
    }
    Ok(true)
}

/// A ball arriving or being purchased activates every cannon in its island.
pub fn revive_territory(world: &mut World, id: u32) -> Result<Vec<u32>> {
    let ids: Vec<_> = world
        .cannons
        .iter()
        .filter(|c| world.owner(c.cell) == Some(id))
        .map(|c| c.id)
        .collect();
    let mut out = vec![];
    for c in ids {
        if revive(world, c)? {
            out.push(c)
        }
    }
    Ok(out)
}
