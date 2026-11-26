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
    fn price(self, base: u64, held: u32) -> Option<u64> {
        match self {
            Self::Linear(multiplier) => {
                b2z_protocol::economy17::marginal(base, multiplier, held as usize)
            }
            Self::Exponential(population) => marginal_price(base, population, held),
        }
    }
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
