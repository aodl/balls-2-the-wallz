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
