//! Rules-v6 integer purchase arithmetic. No authority, payment execution or refunds.
use crate::economics_generated::{BALL_BASE_E8S, JOIN_E8S};
use dtr_wire::Result;

pub const MAX_QUANTITY: u32 = 64;
fn quantity(n: u32) -> Result<()> {
    if (1..=MAX_QUANTITY).contains(&n) {
        Ok(())
    } else {
        Err("QUANTITY_BOUNDS".into())
    }
}
fn square_price(base: u64, n: u64) -> Result<u64> {
    base.checked_mul(n)
        .and_then(|v| v.checked_mul(n))
        .ok_or_else(|| "PRICE_OVERFLOW".into())
}
pub fn ball_price(attached: u32) -> Result<u64> {
    square_price(BALL_BASE_E8S, u64::from(attached.max(1)))
}
pub fn cannon_price(retained: u32) -> Result<u64> {
    square_price(JOIN_E8S, u64::from(retained) + 1)
}
pub fn sequential_cost(attached: u32, requested: u32) -> Result<u64> {
    quantity(requested)?;
    let mut total = 0u64;
    for i in 0..requested {
        let n = attached.checked_add(i).ok_or("PRICE_OVERFLOW")?;
        total = total.checked_add(ball_price(n)?).ok_or("PRICE_OVERFLOW")?;
    }
    Ok(total)
}
pub fn new_cannon_cost(retained: u32, total_balls: u32) -> Result<u64> {
    new_cannon_cost_in_pool(retained, 0, total_balls)
}
pub fn new_cannon_cost_in_pool(retained: u32, pool: u32, total_balls: u32) -> Result<u64> {
    quantity(total_balls)?;
    let first = cannon_price(retained)?;
    if total_balls == 1 {
        return Ok(first);
    }
    first
        .checked_add(sequential_cost(
            pool.checked_add(1).ok_or("PRICE_OVERFLOW")?,
            total_balls - 1,
        )?)
        .ok_or_else(|| "PRICE_OVERFLOW".into())
}

#[derive(Debug, PartialEq, Eq)]
pub struct Prefix {
    pub prices: Vec<u64>,
    pub used: u64,
    pub remainder: u64,
    pub stop_reason: &'static str,
}
/// The explicit quantity is a ceiling. Every item is repriced from the actual
/// attached count, and a capacity stop or unaffordable item consumes no budget.
pub fn affordable_prefix(
    attached: u32,
    requested: u32,
    budget: u64,
    free_slots: u32,
) -> Result<Prefix> {
    quantity(requested)?;
    let mut out = Prefix {
        prices: vec![],
        used: 0,
        remainder: budget,
        stop_reason: "quantity_limit",
    };
    for i in 0..requested {
        if i >= free_slots {
            out.stop_reason = "capacity";
            break;
        }
        let price = ball_price(attached.checked_add(i).ok_or("PRICE_OVERFLOW")?)?;
        if price > out.remainder {
            out.stop_reason = "insufficient_payment";
            break;
        }
        out.prices.push(price);
        out.used += price;
        out.remainder -= price;
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn shared_integer_prices_and_overflow() {
        for line in include_str!("../../../tests/fixtures/prices-v6.tsv")
            .lines()
            .filter(|s| !s.starts_with('#') && !s.is_empty())
        {
            let p: Vec<_> = line.split('\t').collect();
            let n = p[1].parse().unwrap();
            let q = p[2].parse().unwrap();
            let result = match p[0] {
                "ball" => ball_price(n),
                "cannon" => cannon_price(n),
                "batch" => sequential_cost(n, q),
                "new" => new_cannon_cost(n, q),
                _ => panic!("fixture kind"),
            };
            if p[3] == "OVERFLOW" {
                assert_eq!(result.unwrap_err(), "PRICE_OVERFLOW", "{line}");
            } else {
                assert_eq!(result.unwrap(), p[3].parse::<u64>().unwrap(), "{line}");
            }
        }
    }
    #[test]
    fn partial_prefix_never_spends_on_unspawned_items_or_beyond_quantity() {
        for (attached, requested, budget, slots, count, used, reason) in [
            (1, 3, 139_999_999, 64, 2, 50_000_000, "insufficient_payment"),
            (0, 3, 50_000_000, 64, 2, 20_000_000, "insufficient_payment"),
            (1, 3, 140_000_000, 2, 2, 50_000_000, "capacity"),
            (1, 1, 100_000_000, 64, 1, 10_000_000, "quantity_limit"),
            (0, 1, 9_999_999, 64, 0, 0, "insufficient_payment"),
            (0, 1, 100_000_000, 0, 0, 0, "capacity"),
        ] {
            let p = affordable_prefix(attached, requested, budget, slots).unwrap();
            assert_eq!(p.prices.len(), count);
            assert_eq!(p.used, used);
            assert_eq!(p.used + p.remainder, budget);
            assert_eq!(p.stop_reason, reason);
        }
        for q in [0, 65, u32::MAX] {
            assert!(affordable_prefix(0, q, 1_000_000_000, 64).is_err());
            assert!(new_cannon_cost(0, q).is_err());
        }
    }
}
