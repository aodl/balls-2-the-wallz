//! The daily tariff is driven by explicit durable commit time, never by the
//! wall clock at execution of a payment.
use crate::{playability::elapsed, world::World};
use b2z_protocol::economy17::{DAY_NS, GRACE_NS};
use dtr_wire::{Int, Result, hash};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::collections::BTreeSet;

pub fn configuration() -> &'static [u8] {
    include_bytes!("../../../apps/b2z-observer/configuration-economy.bin")
}

pub fn identity() -> Value {
    json!({
        "rules_hash": hash(b"B2Z_DAILY_ECONOMY_RULES_17"),
        "schema_hash": hash(b"B2Z_STATE_09_DAILY_TARIFFS"),
        "config_hash": hash(configuration()),
    })
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Snapshot {
    /// A late commit can cover several consecutive boundaries with the same
    /// unchanging predecessor. Only the last boundary can schedule a tariff.
    pub first_boundary_ns: Int,
    pub boundary_ns: Int,
    pub population: u32,
    pub multiplier: u32,
    pub previous_multiplier: u32,
    pub announced_ns: Int,
    pub effective_ns: Int,
    pub grace_end_ns: Int,
    pub predecessor_commit_ns: Int,
    pub predecessor_state_hash: String,
}
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Schedule {
    pub activated_ns: Int,
    pub population: u32,
    pub initial_multiplier: u32,
    pub predecessor_state_hash: String,
    pub snapshots: Vec<Snapshot>,
}

pub fn population(world: &World) -> u32 {
    // A cannon occupies a distinct tile. The count cannot exceed 1,000,000.
    world
        .cannons
        .iter()
        .map(|c| &c.account)
        .collect::<BTreeSet<_>>()
        .len() as u32
}

fn valid_hash(value: &str) -> bool {
    value.len() == 64
        && value
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}

impl Schedule {
    pub fn validate(&self, committed_ns: u64) -> Result<()> {
        let activation = elapsed(&self.activated_ns)?;
        if activation > committed_ns
            || !valid_hash(&self.predecessor_state_hash)
            || self.initial_multiplier != self.population.max(1)
            || self.population > 1_000_000
        {
            return Err("ECONOMY_BOOTSTRAP".into());
        }
        let mut previous = activation / DAY_NS * DAY_NS;
        let mut previous_announcement = activation;
        let mut multiplier = self.initial_multiplier;
        for snapshot in &self.snapshots {
            let first = elapsed(&snapshot.first_boundary_ns)?;
            let boundary = elapsed(&snapshot.boundary_ns)?;
            let announce = elapsed(&snapshot.announced_ns)?;
            let effective = elapsed(&snapshot.effective_ns)?;
            let predecessor = elapsed(&snapshot.predecessor_commit_ns)?;
            if Some(first) != previous.checked_add(DAY_NS)
                || boundary < first
                || boundary % DAY_NS != 0
                || predecessor < previous_announcement
                || predecessor >= first
                || announce < boundary
                || announce > committed_ns
                || Some(effective) != boundary.checked_add(DAY_NS)
                || announce >= effective
                || Some(elapsed(&snapshot.grace_end_ns)?) != effective.checked_add(GRACE_NS)
                || snapshot.population > 1_000_000
                || snapshot.multiplier != snapshot.population.max(1)
                || snapshot.previous_multiplier != multiplier
                || !valid_hash(&snapshot.predecessor_state_hash)
            {
                return Err("ECONOMY_SNAPSHOT".into());
            }
            previous = boundary;
            previous_announcement = announce;
            multiplier = snapshot.multiplier;
        }
        if committed_ns / DAY_NS * DAY_NS != previous {
            return Err("ECONOMY_UNRECORDED_BOUNDARY".into());
        }
        Ok(())
    }

    /// Commit spans [predecessor_ns, observed_ns]. Define a midnight snapshot as
    /// the committed state before any mutation at that boundary.
    pub fn observe(
        &mut self,
        predecessor_ns: u64,
        observed_ns: u64,
        count: u32,
        predecessor_hash: String,
    ) -> Result<Option<Snapshot>> {
        if observed_ns < predecessor_ns {
            return Err("ECONOMY_TIME_ROLLBACK".into());
        }
        let first = (predecessor_ns / DAY_NS + 1)
            .checked_mul(DAY_NS)
            .ok_or("ECONOMY_TIMESTAMP_OVERFLOW")?;
        let boundary = observed_ns / DAY_NS * DAY_NS;
        if first > boundary {
            return Ok(None);
        }
        let effective = boundary
            .checked_add(DAY_NS)
            .ok_or("ECONOMY_TIMESTAMP_OVERFLOW")?;
        let grace = effective
            .checked_add(GRACE_NS)
            .ok_or("ECONOMY_TIMESTAMP_OVERFLOW")?;
        let snapshot = Snapshot {
            first_boundary_ns: Int(first.into()),
            boundary_ns: Int(boundary.into()),
            population: count,
            multiplier: count.max(1),
            previous_multiplier: self.tariffs(observed_ns).0,
            announced_ns: Int(observed_ns.into()),
            effective_ns: Int(effective.into()),
            grace_end_ns: Int(grace.into()),
            predecessor_commit_ns: Int(predecessor_ns.into()),
            predecessor_state_hash: predecessor_hash,
        };
        self.snapshots.push(snapshot.clone());
        Ok(Some(snapshot))
    }

    /// Bootstrap prices also cover successor-source inputs that were recorded
    /// after the exclusive Ledger cutoff but before the activation commit.
    pub fn tariffs(&self, block_ns: u64) -> (u32, Option<u32>) {
        let time = Int(block_ns.into());
        let at = self
            .snapshots
            .partition_point(|s| s.effective_ns.0 <= time.0);
        if at == 0 {
            return (self.initial_multiplier, None);
        }
        let s = &self.snapshots[at - 1];
        (
            s.multiplier,
            (time.0 < s.grace_end_ns.0 && s.previous_multiplier != s.multiplier)
                .then_some(s.previous_multiplier),
        )
    }
}

pub fn migrate(mut world: World, observed_ns: u64) -> Result<World> {
    if world.version != 8 {
        return Err("ECONOMY_PREDECESSOR".into());
    }
    world.validate()?;
    let count = population(&world);
    let predecessor = hash(&world.encode()?);
    let state = world.playability.as_mut().ok_or("EXPECTED_V6")?;
    if observed_ns < elapsed(&state.elapsed_ns)? {
        return Err("ECONOMY_TIME_ROLLBACK".into());
    }
    state.elapsed_ns = Int(observed_ns.into());
    world.version = 9;
    world.economy = Some(Schedule {
        activated_ns: Int(observed_ns.into()),
        population: count,
        initial_multiplier: count.max(1),
        predecessor_state_hash: predecessor,
        snapshots: vec![],
    });
    world.validate()?;
    Ok(world)
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PaymentTariff {
    pub ledger_recorded_ns: Int,
    pub multiplier: u32,
}

pub(crate) fn prepare(
    world: &World,
    account: &str,
    amount: u64,
    memo: &[u8],
    moved: &[u32],
    recorded_ns: u64,
) -> Result<(crate::purchases_v6::Plan, PaymentTariff)> {
    use crate::purchases_v6::{Plan, player_balls};
    use b2z_protocol::economy17::affordable_balls;
    use num_traits::ToPrimitive;

    let (current, previous) = world
        .economy
        .as_ref()
        .ok_or("ECONOMY_SCHEMA")?
        .tariffs(recorded_ns);
    let named = |multiplier| PaymentTariff {
        ledger_recorded_ns: Int(recorded_ns.into()),
        multiplier,
    };
    if let Some(cell) = b2z_protocol::reservoir::cell(memo).map_err(|_| "RESERVOIR_MEMO")? {
        return Ok((
            crate::reservoirs::prepare(world, account, amount, cell)?,
            named(current),
        ));
    }
    let prepare = |p| {
        crate::context_structures::prepare_at(world, account, amount, memo, moved, true, Some(p))
    };
    let primary = prepare(current)?;
    let Some(old_rate) = previous else {
        return Ok((primary, named(current)));
    };
    // A lower current multiplier weakly dominates the older one. A higher
    // rate can be replaced only when the previous tariff improves fulfilment.
    if current <= old_rate {
        return Ok((primary, named(current)));
    }
    let old = prepare(old_rate)?;
    let count = |plan: &Plan, rate| {
        let slots = (u32::MAX - world.next_ball_id) as usize;
        match plan {
            Plan::Rejected { .. } => 0,
            Plan::New {
                price, quantity, ..
            } => {
                1 + affordable_balls(
                    amount - price.0.to_u64().expect("checked Ledger price"),
                    rate,
                    player_balls(world, account) + 1,
                    (usize::from(*quantity) - 1).min(slots - 1),
                )
            }
            Plan::Fire { quantity, .. } => affordable_balls(
                amount,
                rate,
                player_balls(world, account),
                usize::from(*quantity).min(slots),
            ),
            _ => 1,
        }
    };
    // Fixed prices produce identical results and always keep the current tariff.
    if count(&old, old_rate) > count(&primary, current) {
        Ok((old, named(old_rate)))
    } else {
        Ok((primary, named(current)))
    }
}

/// Read-only quotation from the committed inventory and a verified clock
/// reading. The Ledger's recorded time still governs actual acquisition.
pub fn quote_items(w: &World, account: &str, memo: &[u8], observed_ns: u64) -> Result<Vec<u64>> {
    use crate::purchases_v6::{Plan, player_balls};
    use b2z_protocol::economy17::{BALL_BASE_E8S, marginal};
    use num_traits::ToPrimitive;
    let rate = w
        .economy
        .as_ref()
        .ok_or("ECONOMY_SCHEMA")?
        .tariffs(observed_ns)
        .0;
    let plan =
        crate::context_structures::prepare_at(w, account, u64::MAX, memo, &[], true, Some(rate))?;
    let slots = (u32::MAX - w.next_ball_id) as usize;
    let mut prices = Vec::new();
    let (mut count, mut limit) = match plan {
        Plan::Rejected { reason } => return Err(reason),
        Plan::Fire { quantity, .. } => (player_balls(w, account), usize::from(quantity).min(slots)),
        Plan::New {
            price, quantity, ..
        } => {
            prices.push(price.0.to_u64().ok_or("PRICE_OVERFLOW")?);
            (
                player_balls(w, account) + 1,
                (usize::from(quantity) - 1).min(slots - 1),
            )
        }
        Plan::Move { price, .. }
        | Plan::Reservoir { price, .. }
        | Plan::Deflect { price, .. }
        | Plan::DeflectorMove { price, .. }
        | Plan::DeflectorReorient { price, .. } => {
            return Ok(vec![price.0.to_u64().ok_or("PRICE_OVERFLOW")?]);
        }
    };
    while limit > 0 {
        prices.push(marginal(BALL_BASE_E8S, rate, count).ok_or("PRICE_OVERFLOW")?);
        count += 1;
        limit -= 1;
    }
    prices.iter().try_fold(0u64, |sum, price| {
        sum.checked_add(*price).ok_or("PRICE_OVERFLOW")
    })?;
    Ok(prices)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::cursor::{Cursor, Input};
    use b2z_protocol::{economy17::*, reservoir, v6};
    use dtr_wire::{decode, hex, unhex};

    fn fixture() -> World {
        let vectors: Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/context-structures-v13.json"
        ))
        .unwrap();
        let world =
            World::decode(&unhex(vectors["rows"][0]["initial_hex"].as_str().unwrap()).unwrap())
                .unwrap();
        crate::reservoirs::migrate(world).unwrap()
    }

    fn payment(account: &str, amount: u64, recorded: u64) -> Input {
        let memo = v6::encode(v6::Command::Fire {
            cannon: 1,
            angle: 40960,
            quantity: 2,
        })
        .unwrap();
        let mut bytes = reservoir::NORMALIZED_PAYMENT.to_vec();
        bytes.extend(unhex(account).unwrap());
        bytes.extend(amount.to_be_bytes());
        bytes.extend(memo);
        bytes.push(0);
        Input {
            position: Int(1.into()),
            payload_hex: hex(&timestamped(&bytes, recorded).unwrap()),
        }
    }

    fn segment(world: &World, inputs: Vec<Input>, observed: u64) -> (World, Value, usize) {
        let mut context = identity();
        context["logical_start"] = json!(Int(world.time.0.to_integer()));
        context["logical_end"] = json!(Int(world.time.0.to_integer() + 1));
        let mut cursor = Cursor::begin(&world.encode().unwrap(), inputs, &context).unwrap();
        let mut iterations = 0;
        loop {
            let (used, complete) = cursor.step(17).unwrap();
            iterations += used;
            if complete {
                break;
            }
            let snapshot = cursor.snapshot().unwrap();
            cursor = Cursor::restore(&snapshot, &hash(&snapshot)).unwrap();
        }
        cursor.finalize_elapsed(observed).unwrap();
        let result = cursor.result().unwrap();
        (
            World::decode(&result.state).unwrap(),
            decode(&result.events).unwrap(),
            iterations,
        )
    }

    #[test]
    fn rates_follow_block_time_and_preserve_the_selected_prefix_through_restore() {
        let midnight = DAY_NS * 20_000;
        let mut w = migrate(fixture(), midnight - 1).unwrap();
        let life = w
            .playability
            .as_mut()
            .unwrap()
            .lifecycle
            .iter_mut()
            .find(|entry| entry.deadline_ns.is_some())
            .unwrap();
        life.dormant_since_ns = Some(Int((midnight - DAY_NS - 1).into()));
        life.deadline_ns = Some(Int((midnight - 1).into()));
        let fence = crate::playability::Fence {
            cannon: life.cannon,
            generation: life.generation,
            deadline_ns: life.deadline_ns.clone().unwrap(),
        };
        let retired = crate::lifecycle_v6::expire(&w, midnight - 1, &[fence])
            .unwrap()
            .unwrap();
        let w = World::decode(&retired.output.state).unwrap();
        let (announced, events, _) = segment(&w, vec![], midnight);
        assert_eq!(
            events["events"]
                .as_array()
                .unwrap()
                .iter()
                .filter(|e| e["kind"] == "economy_snapshot")
                .count(),
            1
        );
        let effective = midnight + DAY_NS;
        let account = &announced.cannons[0].account;
        for (recorded, sent, rate, used, acquired) in [
            (effective - 1, 260_000, 2, 260_000, 2),
            (effective, 260_000, 1, 130_000, 2),
            (effective + GRACE_NS - 1, 260_000, 1, 130_000, 2),
            (effective + GRACE_NS, 80_000, 1, 40_000, 1),
        ] {
            let (_, events, _) = segment(
                &announced,
                vec![payment(account, sent, recorded)],
                effective + 3 * GRACE_NS,
            );
            let receipt = &events["receipts"][0];
            assert_eq!(receipt["price_multiplier"], rate);
            assert_eq!(
                receipt["ledger_recorded_ns"]["$integer"],
                recorded.to_string()
            );
            assert_eq!(receipt["amount_used"]["$integer"], used.to_string());
            assert_eq!(receipt["actual_quantity"], acquired);
        }
    }

    #[test]
    fn sixty_five_existing_balls_do_not_block_another_purchase() {
        let midnight = DAY_NS * 20_000;
        let mut w = migrate(fixture(), midnight).unwrap();
        let first = w.balls[0].clone();
        for id in w.next_ball_id..=65 {
            w.balls.push(crate::world::Ball {
                id,
                ..first.clone()
            });
        }
        w.next_ball_id = 66;
        w.validate().unwrap();
        let account = w.cannons[0].account.clone();
        let expected = quote_items(
            &w,
            &account,
            &v6::encode(v6::Command::Fire {
                cannon: 1,
                angle: 40960,
                quantity: 2,
            })
            .unwrap(),
            midnight,
        )
        .unwrap();
        let (_, events, iterations) = segment(
            &w,
            vec![payment(&account, expected.iter().sum(), midnight + 1)],
            midnight + 2,
        );
        assert_eq!(events["receipts"][0]["actual_quantity"], 2);
        assert!(iterations > 0);
        eprintln!(
            "Rules17 high-ball native work units: {iterations}; input world bytes: {}",
            w.encode().unwrap().len()
        );
    }
}
