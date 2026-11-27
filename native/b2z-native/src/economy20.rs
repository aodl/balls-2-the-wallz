//! Exact scalar tariff arithmetic for the proposed successor. Historical
//! tariffs retain their original population and linear interpretation.

/// Return the Ledger-representable marginal price for a population-scaled
/// purchase. The population is the symbolic tariff. It can be much too large
/// to materialize its multiplier in any Ledger amount.
pub fn marginal_price(base_e8s: u64, population: u32, current_personal_count: u32) -> Option<u64> {
    if base_e8s == 0 {
        return None;
    }
    let excess = population.saturating_sub(1_000);
    let limit = u64::MAX.checked_shr(excess)?;
    let count = u64::from(current_personal_count) + 1;
    let scalar = u64::from(population.clamp(1, 1_000));
    let scaled = base_e8s.checked_mul(scalar)?;
    let unshifted = scaled.checked_mul(count)?.checked_mul(count)?;
    // Bound by the Ledger before shifting. A fixed-width shift would otherwise
    // discard high bits and could present an unaffordable purchase as cheap.
    (unshifted <= limit).then(|| unshifted << excess)
}

/// The selected daily schedule supplies the current tariff and, only during
/// grace, a previous tariff. The prior formula stays linear across activation.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Tariff {
    Linear(u32),
    Exponential(u32),
}

/// Durable successor receipt/cursor tariff. Historical numeric receipts keep
/// their old shape; only Rules20 uses this tagged formula and population.
#[derive(Clone, Debug, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(tag = "formula", rename_all = "snake_case", deny_unknown_fields)]
pub enum TariffWire {
    Linear { multiplier: u32 },
    Exponential { population: u32 },
}

impl From<Tariff> for TariffWire {
    fn from(value: Tariff) -> Self {
        match value {
            Tariff::Linear(multiplier) => Self::Linear { multiplier },
            Tariff::Exponential(population) => Self::Exponential { population },
        }
    }
}

impl TariffWire {
    pub fn rate(&self) -> Tariff {
        match *self {
            Self::Linear { multiplier } => Tariff::Linear(multiplier),
            Self::Exponential { population } => Tariff::Exponential(population),
        }
    }
    pub fn valid(&self) -> bool {
        match *self {
            Self::Linear { multiplier } => multiplier > 0 && multiplier <= 1_000_000,
            Self::Exponential { population } => population <= 1_000_000,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PaymentTariff20 {
    pub ledger_recorded_ns: dtr_wire::Int,
    pub rate: TariffWire,
}

impl Tariff {
    pub fn price(self, base: u64, held: u32) -> Option<u64> {
        match self {
            Self::Linear(multiplier) => {
                b2z_protocol::economy17::marginal(base, multiplier, held as usize)
            }
            Self::Exponential(population) => marginal_price(base, population, held),
        }
    }
}

/// Select a tariff from the immutable Ledger block time. An unrepresentable
/// current price cannot suppress a still-valid predecessor grace tariff.
pub(crate) fn prepare(
    world: &crate::world::World,
    account: &str,
    amount: u64,
    memo: &[u8],
    moved: &[u32],
    recorded_ns: u64,
) -> dtr_wire::Result<(crate::purchases_v6::Plan, PaymentTariff20)> {
    use crate::purchases_v6::{player_balls, Plan};
    use num_traits::ToPrimitive;
    let start = crate::playability::elapsed(
        world
            .economy_formula_start_ns
            .as_ref()
            .ok_or("ECONOMY_FORMULA_START")?,
    )?;
    let (current, previous) = tariffs(
        world.economy.as_ref().ok_or("ECONOMY_SCHEMA")?,
        start,
        recorded_ns,
    );
    let named = |rate: Tariff| PaymentTariff20 {
        ledger_recorded_ns: dtr_wire::Int(recorded_ns.into()),
        rate: rate.into(),
    };
    if let Some(cell) = b2z_protocol::reservoir::cell(memo).map_err(|_| "RESERVOIR_MEMO")? {
        return Ok((
            crate::reservoirs::prepare(world, account, amount, cell)?,
            named(current),
        ));
    }
    let plan = |rate| {
        crate::context_structures::prepare_at_tariff(
            world,
            account,
            amount,
            memo,
            moved,
            true,
            Some(rate),
        )
    };
    let primary = plan(current)?;
    let Some(older_rate) = previous else {
        return Ok((primary, named(current)));
    };
    let older = plan(older_rate)?;
    let count = |candidate: &Plan, rate: Tariff| -> u32 {
        let slots = u32::MAX - world.next_ball_id;
        match candidate {
            Plan::Rejected { .. } => 0,
            Plan::New {
                price, quantity, ..
            } => {
                let Some(first) = price.0.to_u64() else {
                    return 0;
                };
                let Some(mut remaining) = amount.checked_sub(first) else {
                    return 0;
                };
                let held = player_balls(world, account) as u32 + 1;
                let extras = u32::from(*quantity)
                    .saturating_sub(1)
                    .min(slots.saturating_sub(1));
                let mut n = 1;
                for offset in 0..extras {
                    let Some(price) = held
                        .checked_add(offset)
                        .and_then(|h| rate.price(b2z_protocol::economy17::BALL_BASE_E8S, h))
                    else {
                        break;
                    };
                    let Some(rest) = remaining.checked_sub(price) else {
                        break;
                    };
                    remaining = rest;
                    n += 1;
                }
                n
            }
            Plan::Fire { quantity, .. } => {
                let mut remaining = amount;
                let held = player_balls(world, account) as u32;
                let mut n = 0;
                for offset in 0..u32::from(*quantity).min(slots) {
                    let Some(price) = held
                        .checked_add(offset)
                        .and_then(|h| rate.price(b2z_protocol::economy17::BALL_BASE_E8S, h))
                    else {
                        break;
                    };
                    let Some(rest) = remaining.checked_sub(price) else {
                        break;
                    };
                    remaining = rest;
                    n += 1;
                }
                n
            }
            _ => 1,
        }
    };
    if count(&older, older_rate) > count(&primary, current) {
        Ok((older, named(older_rate)))
    } else {
        Ok((primary, named(current)))
    }
}

/// Quote only Ledger-representable items at the authenticated current tariff.
/// The quote does not promise future admission under a later daily schedule.
pub fn quote_items(
    world: &crate::world::World,
    account: &str,
    memo: &[u8],
    observed_ns: u64,
) -> dtr_wire::Result<Vec<u64>> {
    use crate::purchases_v6::{player_balls, Plan};
    use num_traits::ToPrimitive;
    let start = crate::playability::elapsed(
        world
            .economy_formula_start_ns
            .as_ref()
            .ok_or("ECONOMY_FORMULA_START")?,
    )?;
    let rate = tariffs(
        world.economy.as_ref().ok_or("ECONOMY_SCHEMA")?,
        start,
        observed_ns,
    )
    .0;
    let plan = crate::context_structures::prepare_at_tariff(
        world,
        account,
        u64::MAX,
        memo,
        &[],
        true,
        Some(rate),
    )?;
    let slots = u32::MAX - world.next_ball_id;
    let mut prices = Vec::new();
    let (mut held, mut remaining) = match plan {
        Plan::Rejected { reason } => return Err(reason),
        Plan::Fire { quantity, .. } => (
            player_balls(world, account) as u32,
            u32::from(quantity).min(slots),
        ),
        Plan::New {
            price, quantity, ..
        } => {
            prices.push(price.0.to_u64().ok_or("PRICE_UNREPRESENTABLE")?);
            (
                player_balls(world, account) as u32 + 1,
                u32::from(quantity)
                    .saturating_sub(1)
                    .min(slots.saturating_sub(1)),
            )
        }
        Plan::Move { price, .. }
        | Plan::Reservoir { price, .. }
        | Plan::Deflect { price, .. }
        | Plan::DeflectorMove { price, .. }
        | Plan::DeflectorReorient { price, .. } => {
            return Ok(vec![price.0.to_u64().ok_or("PRICE_UNREPRESENTABLE")?]);
        }
    };
    while remaining > 0 {
        prices.push(
            rate.price(b2z_protocol::economy17::BALL_BASE_E8S, held)
                .ok_or("PRICE_UNREPRESENTABLE")?,
        );
        held = held.checked_add(1).ok_or("PRICE_UNREPRESENTABLE")?;
        remaining -= 1;
    }
    prices.iter().try_fold(0u64, |sum, p| {
        sum.checked_add(*p).ok_or("PRICE_UNREPRESENTABLE")
    })?;
    Ok(prices)
}

/// Interpret the authenticated daily population rows at their own effective
/// boundaries. A predecessor announced before the successor cutover remains
/// linear throughout its grace window, even after the first new tariff starts.
pub fn tariffs(
    schedule: &crate::economy17::Schedule,
    formula_start_ns: u64,
    block_ns: u64,
) -> (Tariff, Option<Tariff>) {
    let at = schedule
        .snapshots
        .partition_point(|row| row.effective_ns.0 <= block_ns.into());
    if at == 0 {
        return (Tariff::Linear(schedule.initial_multiplier), None);
    }
    let active = &schedule.snapshots[at - 1];
    let formula = |effective: &dtr_wire::Int, population| {
        if effective.0 >= formula_start_ns.into() {
            Tariff::Exponential(population)
        } else {
            Tariff::Linear(population)
        }
    };
    let current = formula(&active.effective_ns, active.multiplier);
    let previous = if at > 1 {
        formula(
            &schedule.snapshots[at - 2].effective_ns,
            active.previous_multiplier,
        )
    } else {
        Tariff::Linear(active.previous_multiplier)
    };
    let in_grace = active.grace_end_ns.0 > block_ns.into();
    (
        current,
        (in_grace && previous != current).then_some(previous),
    )
}

/// A prefix of an executable plan. The caller supplies the inventory after a
/// Cannon's included Ball and applies the existing legality and capacity caps.
#[derive(Clone, Copy)]
pub struct Purchase {
    pub structure: Option<(u64, u32)>,
    pub balls_held: u32,
    pub additional_balls: u16,
}

fn affordable(tariff: Tariff, purchase: Purchase, payment: u64) -> (u32, u64) {
    let mut remaining = payment;
    let mut count = 0;
    if let Some((base, held)) = purchase.structure {
        let Some(rest) = tariff
            .price(base, held)
            .and_then(|price| remaining.checked_sub(price))
        else {
            return (0, 0);
        };
        remaining = rest;
        count = 1;
    }
    for offset in 0..u32::from(purchase.additional_balls) {
        let Some(rest) = purchase
            .balls_held
            .checked_add(offset)
            .and_then(|held| tariff.price(b2z_protocol::economy17::BALL_BASE_E8S, held))
            .and_then(|price| remaining.checked_sub(price))
        else {
            break;
        };
        remaining = rest;
        count += 1;
    }
    (count, payment - remaining)
}

pub fn choose_tariff(
    current: Tariff,
    previous: Option<Tariff>,
    purchase: Purchase,
    payment: u64,
) -> (Tariff, u32, u64) {
    let (count, spent) = affordable(current, purchase, payment);
    if let Some(previous) = previous {
        let (previous_count, previous_spent) = affordable(previous, purchase, payment);
        // A current overflow is only an unaffordable item under that tariff.
        // Evaluate an allowed previous tariff independently and keep ties current.
        if previous_count > count {
            return (previous, previous_count, previous_spent);
        }
    }
    (current, count, spent)
}

#[cfg(test)]
mod tests {
    use super::*;

    use dtr_wire::Int;

    #[test]
    fn daily_formula_boundary_preserves_a_linear_grace_tariff() {
        let day = b2z_protocol::economy17::DAY_NS;
        let grace = b2z_protocol::economy17::GRACE_NS;
        let stamp = |n: u64| Int(n.into());
        let mut schedule = crate::economy17::Schedule {
            activated_ns: stamp(0),
            population: 1_000,
            initial_multiplier: 1_000,
            predecessor_state_hash: "0".repeat(64),
            snapshots: vec![],
        };
        for (boundary, population, previous) in [(day, 1_001, 1_000), (2 * day, 1_002, 1_001)] {
            schedule.snapshots.push(crate::economy17::Snapshot {
                first_boundary_ns: stamp(boundary),
                boundary_ns: stamp(boundary),
                population,
                multiplier: population,
                previous_multiplier: previous,
                announced_ns: stamp(boundary),
                effective_ns: stamp(boundary + day),
                grace_end_ns: stamp(boundary + day + grace),
                predecessor_commit_ns: stamp(boundary - day),
                predecessor_state_hash: "0".repeat(64),
            });
        }
        schedule.validate(2 * day).unwrap();
        assert_eq!(
            tariffs(&schedule, 2 * day, 2 * day - 1),
            (Tariff::Linear(1_000), None)
        );
        assert_eq!(
            tariffs(&schedule, 2 * day, 2 * day),
            (Tariff::Exponential(1_001), Some(Tariff::Linear(1_000)))
        );
        assert_eq!(
            tariffs(&schedule, 2 * day, 2 * day + grace),
            (Tariff::Exponential(1_001), None)
        );
        assert_eq!(
            tariffs(&schedule, 2 * day, 3 * day),
            (Tariff::Exponential(1_002), Some(Tariff::Exponential(1_001)))
        );
        let mut same_population = schedule.clone();
        same_population.snapshots[0].population = 1_000;
        same_population.snapshots[0].multiplier = 1_000;
        same_population.snapshots[1].previous_multiplier = 1_000;
        assert_eq!(
            tariffs(&same_population, 2 * day, 2 * day),
            (Tariff::Exponential(1_000), Some(Tariff::Linear(1_000)))
        );
    }

    #[test]
    fn successor_structure_planners_apply_the_symbolic_price() {
        use crate::purchases_v6::Plan;
        use dtr_wire::unhex;
        let vector: serde_json::Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/b2z-delegation-v18.json"
        ))
        .unwrap();
        let mut prior = crate::world::World::decode(
            &unhex(vector["execution"]["state"].as_str().unwrap()).unwrap(),
        )
        .unwrap();
        prior.reservoirs = Some(String::new());
        let world =
            crate::delegation_v20::migrate(crate::reservoirs::migrate_compact(prior).unwrap())
                .unwrap();
        let account = &world
            .playability
            .as_ref()
            .unwrap()
            .players
            .iter()
            .find(|player| player.id == 1)
            .unwrap()
            .account;
        let rate = Tariff::Exponential(1_001);
        let cannon_held = world
            .cannons
            .iter()
            .filter(|c| &c.account == account)
            .count() as u32;
        let cannon_price = rate
            .price(b2z_protocol::economy17::CANNON_BASE_E8S, cannon_held)
            .unwrap();
        let cannon_memo = b2z_protocol::v6::encode(b2z_protocol::v6::Command::New {
            angle: 0,
            quantity: 1,
            cell: Some(500500),
        })
        .unwrap();
        assert!(matches!(
            crate::context_structures::prepare_at_tariff(
                &world, account, cannon_price, &cannon_memo, &[], true, Some(rate)
            )
            .unwrap(),
            Plan::New { price, .. } if price.0 == cannon_price.into()
        ));
        assert!(matches!(
            crate::context_structures::prepare_at_tariff(
                &world,
                account,
                u64::MAX,
                &cannon_memo,
                &[],
                true,
                Some(Tariff::Exponential(1_035))
            )
            .unwrap(),
            Plan::Rejected { reason } if reason == "PRICE_OVERFLOW"
        ));
        let diverter_held = world
            .deflectors
            .as_ref()
            .unwrap()
            .iter()
            .filter(|d| d.owner == 1)
            .count() as u32;
        let diverter_price = rate
            .price(b2z_protocol::economy17::DIVERTER_BASE_E8S, diverter_held)
            .unwrap();
        let diverter_memo =
            b2z_protocol::deflector::encode(b2z_protocol::deflector::Command::Deflect {
                cell: 500500,
                orientation: 0,
            })
            .unwrap();
        assert!(matches!(
            crate::context_structures::prepare_at_tariff(
                &world, account, diverter_price, &diverter_memo, &[], true, Some(rate)
            )
            .unwrap(),
            Plan::Deflect { price, .. } if price.0 == diverter_price.into()
        ));
    }

    #[test]
    fn successor_payment_grace_keeps_an_affordable_linear_predecessor() {
        use crate::purchases_v6::Plan;
        use dtr_wire::unhex;
        let vector: serde_json::Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/b2z-delegation-v18.json"
        ))
        .unwrap();
        let mut prior = crate::world::World::decode(
            &unhex(vector["execution"]["state"].as_str().unwrap()).unwrap(),
        )
        .unwrap();
        prior.reservoirs = Some(String::new());
        let mut world =
            crate::delegation_v20::migrate(crate::reservoirs::migrate_compact(prior).unwrap())
                .unwrap();
        let account = world.cannons[0].account.clone();
        let held = world
            .cannons
            .iter()
            .filter(|c| c.account == account)
            .count() as u32;
        let day = b2z_protocol::economy17::DAY_NS;
        let start = day * 2;
        world.economy_formula_start_ns = Some(Int(start.into()));
        let schedule = world.economy.as_mut().unwrap();
        schedule.initial_multiplier = 1_000;
        schedule.population = 1_000;
        schedule.snapshots = vec![crate::economy17::Snapshot {
            first_boundary_ns: Int(day.into()),
            boundary_ns: Int(day.into()),
            population: 1_035,
            multiplier: 1_035,
            previous_multiplier: 1_000,
            announced_ns: Int(day.into()),
            effective_ns: Int(start.into()),
            grace_end_ns: Int((start + b2z_protocol::economy17::GRACE_NS).into()),
            predecessor_commit_ns: Int(0.into()),
            predecessor_state_hash: "0".repeat(64),
        }];
        let amount = Tariff::Linear(1_000)
            .price(b2z_protocol::economy17::CANNON_BASE_E8S, held)
            .unwrap();
        let memo = b2z_protocol::v6::encode(b2z_protocol::v6::Command::New {
            angle: 0,
            quantity: 1,
            cell: Some(500500),
        })
        .unwrap();
        let (plan, named) = prepare(&world, &account, amount, &memo, &[], start).unwrap();
        assert!(matches!(plan, Plan::New { .. }));
        assert_eq!(named.rate, TariffWire::Linear { multiplier: 1_000 });
        let wire = dtr_wire::encode(&serde_json::to_value(&named).unwrap()).unwrap();
        let decoded: PaymentTariff20 =
            serde_json::from_value(dtr_wire::decode(&wire).unwrap()).unwrap();
        assert_eq!(decoded, named);
        assert_eq!(
            serde_json::to_value(&named).unwrap(),
            serde_json::json!({"ledger_recorded_ns":Int(start.into()),"rate":{"formula":"linear","multiplier":1_000}})
        );
        let (later, tariff) = prepare(
            &world,
            &account,
            amount,
            &memo,
            &[],
            start + b2z_protocol::economy17::GRACE_NS,
        )
        .unwrap();
        assert!(matches!(later, Plan::Rejected { .. }));
        assert_eq!(tariff.rate, TariffWire::Exponential { population: 1_035 });
    }

    #[test]
    fn successor_ball_batch_preserves_tagged_rate_and_stops_before_an_unaffordable_item() {
        use crate::purchases_v6::{Batch, Plan};
        use dtr_wire::unhex;
        let vector: serde_json::Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/b2z-delegation-v18.json"
        ))
        .unwrap();
        let mut prior = crate::world::World::decode(
            &unhex(vector["execution"]["state"].as_str().unwrap()).unwrap(),
        )
        .unwrap();
        prior.reservoirs = Some(String::new());
        let mut world =
            crate::delegation_v20::migrate(crate::reservoirs::migrate_compact(prior).unwrap())
                .unwrap();
        let cannon = world.cannons[0].clone();
        let held = crate::purchases_v6::player_balls(&world, &cannon.account) as u32;
        let first = Tariff::Exponential(1_001)
            .price(b2z_protocol::economy17::BALL_BASE_E8S, held)
            .unwrap();
        let plan = Plan::Fire {
            cannon: cannon.id,
            angle: 0,
            quantity: 2,
            explicit: true,
        };
        let mut batch = Batch::fire(cannon.account.clone(), first, &plan).unwrap();
        batch.economy_tariff20 = Some(TariffWire::Exponential { population: 1_001 });
        batch.validate(&world).unwrap();
        assert!(batch.step(&mut world).unwrap().is_some());
        assert!(batch.step(&mut world).unwrap().is_none());
        assert_eq!(batch.stop_reason.as_deref(), Some("insufficient_payment"));
        assert_eq!(batch.prices, vec![Int(first.into())]);
        let restored: Batch =
            serde_json::from_value(serde_json::to_value(&batch).unwrap()).unwrap();
        restored.validate(&world).unwrap();
        assert_eq!(restored.prices, batch.prices);
        let mut impossible = Batch::fire(cannon.account, first, &plan).unwrap();
        impossible.economy_tariff20 = Some(TariffWire::Exponential { population: 1_035 });
        assert!(impossible.step(&mut world).unwrap().is_none());
        assert_eq!(
            impossible.stop_reason.as_deref(),
            Some("insufficient_payment")
        );
    }

    #[test]
    fn exact_shared_marginal_price_vectors() {
        let data: serde_json::Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/economy20-prices.json"
        ))
        .unwrap();
        for row in data.as_array().unwrap() {
            assert_eq!(
                marginal_price(
                    row["base"].as_str().unwrap().parse().unwrap(),
                    row["population"].as_u64().unwrap().try_into().unwrap(),
                    row["held"].as_u64().unwrap().try_into().unwrap(),
                ),
                row["amount"].as_str().map(|s| s.parse().unwrap()),
                "{}",
                row["name"]
            );
        }
    }

    #[test]
    fn exact_shared_grace_prefix_vectors() {
        let data: serde_json::Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/economy20-prefix.json"
        ))
        .unwrap();
        let tariff = |value: &serde_json::Value| match value["formula"].as_str().unwrap() {
            "linear" => Tariff::Linear(value["multiplier"].as_u64().unwrap() as u32),
            "exponential" => Tariff::Exponential(value["population"].as_u64().unwrap() as u32),
            _ => unreachable!(),
        };
        for row in data.as_array().unwrap() {
            let current = tariff(&row["current"]);
            let previous = (!row["previous"].is_null()).then(|| tariff(&row["previous"]));
            let structure = &row["structure"];
            let result = choose_tariff(
                current,
                previous,
                Purchase {
                    structure: (!structure.is_null()).then(|| {
                        (
                            structure["base"].as_str().unwrap().parse().unwrap(),
                            structure["held"].as_u64().unwrap() as u32,
                        )
                    }),
                    balls_held: row["ballsHeld"].as_u64().unwrap() as u32,
                    additional_balls: row["additionalBalls"].as_u64().unwrap() as u16,
                },
                row["budget"].as_str().unwrap().parse().unwrap(),
            );
            assert_eq!(
                result,
                (
                    if row["selected"] == "previous" {
                        previous.unwrap()
                    } else {
                        current
                    },
                    row["count"].as_u64().unwrap() as u32,
                    row["spent"].as_str().unwrap().parse().unwrap(),
                ),
                "{}",
                row["name"]
            );
        }
    }
}
