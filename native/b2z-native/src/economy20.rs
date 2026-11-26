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
}
