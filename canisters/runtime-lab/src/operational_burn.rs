//! Bounded settled net observations for the versioned operational lane.
use std::collections::VecDeque;

const MINUTE_NS: u64 = 60_000_000_000;
const SAMPLE_NS: u64 = 5 * MINUTE_NS;
const MAX_GAP_NS: u64 = 12 * MINUTE_NS;
const FULL_NS: u64 = 55 * MINUTE_NS;
const HOUR_NS: u64 = 60 * MINUTE_NS;
const MAX_SAMPLES: usize = 13;
const DAY_NS: u128 = 1440 * MINUTE_NS as u128;

#[derive(Clone, Copy)]
struct Sample {
    time_ns: u64,
    total: u128,
    credits: u128,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Quality {
    Preliminary = 1,
    Established = 2,
    Stale = 3,
}

#[derive(Clone, Copy)]
struct Estimate {
    start_ns: u64,
    end_ns: u64,
    count: u8,
    per_day: u128,
    quality: Quality,
}

#[derive(Default)]
pub(crate) struct Meter {
    samples: VecDeque<Sample>,
    estimate: Option<Estimate>,
}

impl Meter {
    #[must_use]
    pub(crate) fn observe(
        &mut self,
        time_ns: u64,
        total: u128,
        treasury_credits: u128,
        settled: bool,
    ) -> bool {
        if !settled || time_ns == 0 {
            return false;
        }
        if let Some(last) = self.samples.back() {
            let elapsed = time_ns.saturating_sub(last.time_ns);
            if time_ns < last.time_ns
                || elapsed > MAX_GAP_NS
                || total > last.total
                || treasury_credits != last.credits
            {
                self.samples.clear();
                if let Some(estimate) = &mut self.estimate {
                    estimate.quality = Quality::Stale;
                }
            } else if elapsed < SAMPLE_NS {
                return false;
            }
        }
        self.samples.push_back(Sample {
            time_ns,
            total,
            credits: treasury_credits,
        });
        while self.samples.len() > MAX_SAMPLES
            || self
                .samples
                .front()
                .is_some_and(|first| time_ns - first.time_ns > HOUR_NS)
        {
            self.samples.pop_front();
        }
        let first = self.samples.front().expect("sample was appended");
        let span = time_ns - first.time_ns;
        if span >= SAMPLE_NS {
            let per_day = (first.total - total).checked_mul(DAY_NS);
            if let Some(numerator) = per_day {
                self.estimate = Some(Estimate {
                    start_ns: first.time_ns,
                    end_ns: time_ns,
                    count: self.samples.len() as u8,
                    per_day: numerator / u128::from(span),
                    quality: if span >= FULL_NS {
                        Quality::Established
                    } else {
                        Quality::Preliminary
                    },
                });
            }
        }
        true
    }

    /// V1 uses an exact fixed-width wire so the certificate commits to a
    /// bounded record without exposing balance or treasury transaction details.
    pub(crate) fn record(&self) -> [u8; 35] {
        let mut bytes = [0; 35];
        bytes[0] = 1;
        if let Some(estimate) = self.estimate {
            bytes[1] = estimate.quality as u8;
            bytes[2] = estimate.count;
            bytes[3..11].copy_from_slice(&estimate.start_ns.to_be_bytes());
            bytes[11..19].copy_from_slice(&estimate.end_ns.to_be_bytes());
            bytes[19..35].copy_from_slice(&estimate.per_day.to_be_bytes());
        }
        bytes
    }

    pub(crate) fn restore_record(&mut self, bytes: &[u8]) -> Result<(), &'static str> {
        if bytes.len() != 35 || bytes[0] != 1 {
            return Err("operational burn record version");
        }
        let count = bytes[2];
        let start_ns = u64::from_be_bytes(bytes[3..11].try_into().unwrap());
        let end_ns = u64::from_be_bytes(bytes[11..19].try_into().unwrap());
        let per_day = u128::from_be_bytes(bytes[19..35].try_into().unwrap());
        if bytes[1] == 0 && count == 0 && start_ns == 0 && end_ns == 0 && per_day == 0 {
            return Ok(());
        }
        if !(1..=3).contains(&bytes[1])
            || !(2..=MAX_SAMPLES as u8).contains(&count)
            || start_ns == 0
            || end_ns
                .checked_sub(start_ns)
                .is_none_or(|span| !(SAMPLE_NS..=HOUR_NS).contains(&span))
        {
            return Err("invalid operational burn record");
        }
        self.estimate = Some(Estimate {
            start_ns,
            end_ns,
            count,
            per_day,
            quality: Quality::Stale,
        });
        Ok(())
    }
}

// This lane owns stable memory slot 4. The authoritative root, chunks and
// treasury retain their existing slots and serialization.
#[cfg(feature = "certified-operational-burn")]
thread_local! {
    static STORED: std::cell::RefCell<ic_stable_structures::StableCell<Vec<u8>, super::Memory>> =
        std::cell::RefCell::new(ic_stable_structures::StableCell::init(super::memory(4), Vec::new()));
    static METER: std::cell::RefCell<Meter> = std::cell::RefCell::new({
        let mut meter = Meter::default();
        STORED.with(|slot| {
            let store = slot.borrow();
            if !store.get().is_empty() {
                if let Err(error) = meter.restore_record(store.get()) {
                    ic_cdk::trap(error);
                }
            }
        });
        meter
    });
}

#[cfg(feature = "certified-operational-burn")]
pub(crate) fn current_record() -> [u8; 35] {
    METER.with(|meter| meter.borrow().record())
}

#[cfg(feature = "certified-operational-burn")]
pub(crate) fn certified_root(publication: &[u8]) -> Vec<u8> {
    let mut bytes = b"B2Z-CERTIFIED-OPERATIONAL-01".to_vec();
    bytes.extend(publication);
    let hash = dtr_wire::hash(&current_record());
    bytes.extend(super::unhex(&hash).expect("hash encodes 32 bytes"));
    super::unhex(&dtr_wire::hash(&bytes)).expect("hash encodes 32 bytes")
}

// Keep the probe out of every releasable module and out of the estimator.
#[cfg(all(feature = "certified-operational-burn", feature = "test-hooks"))]
pub(crate) fn balance_probe(phase: &str, source_in_flight: bool, callback: bool) {
    let refunded = callback.then(ic_cdk::api::msg_cycles_refunded);
    ic_cdk::println!(
        "b2z-burn-probe {phase} now={} total={} liquid={} source_in_flight={source_in_flight} refunded={refunded:?} instructions={}",
        ic_cdk::api::time(),
        ic_cdk::api::canister_cycle_balance(),
        ic_cdk::api::canister_liquid_cycle_balance(),
        ic_cdk::api::performance_counter(0)
    );
}

/// Probe a replica-observed balance while the probe's own callback is pending.
#[cfg(all(feature = "certified-operational-burn", feature = "test-hooks"))]
pub(crate) async fn probe_management() {
    use candid::{CandidType, Nat, Principal};
    use serde::Deserialize;
    #[derive(CandidType)]
    struct Target {
        canister_id: Principal,
    }
    #[derive(CandidType, Deserialize)]
    struct Balance {
        cycles: Nat,
        reserved_cycles: Nat,
    }
    let now = ic_cdk::api::time();
    let previous = MANAGEMENT_PROBE_NS.with(|at| at.get());
    if now.saturating_sub(previous) < SAMPLE_NS {
        return;
    }
    MANAGEMENT_PROBE_NS.with(|at| at.set(now));
    let before = ic_cdk::api::canister_cycle_balance();
    let status =
        ic_cdk::call::Call::bounded_wait(Principal::management_canister(), "canister_status")
            .change_timeout(10)
            .with_arg(Target {
                canister_id: ic_cdk::api::canister_self(),
            })
            .await;
    let after = ic_cdk::api::canister_cycle_balance();
    match status
        .map_err(|error| error.to_string())
        .and_then(|response| response.candid::<Balance>().map_err(|error| error.to_string()))
    {
        Ok(balance) => ic_cdk::println!(
            "b2z-burn-management now={now} reply={} before={before} observed={} reserved={} after={after}",
            ic_cdk::api::time(), balance.cycles, balance.reserved_cycles
        ),
        Err(error) => ic_cdk::println!("b2z-burn-management now={now} unavailable={error}"),
    }
}

#[cfg(all(feature = "certified-operational-burn", feature = "test-hooks"))]
thread_local! {
    static MANAGEMENT_PROBE_NS: std::cell::Cell<u64> = const { std::cell::Cell::new(0) };
}

#[cfg(feature = "certified-operational-burn")]
pub(crate) fn sample(root: Option<&super::Root>) {
    let now = ic_cdk::api::time();
    let too_soon = METER.with(|meter| {
        meter
            .borrow()
            .samples
            .back()
            .is_some_and(|last| now >= last.time_ns && now - last.time_ns < SAMPLE_NS)
    });
    if too_soon {
        return;
    }
    let loaded;
    let root = match root {
        Some(root) => root,
        None => {
            let Ok(root) = super::root() else { return };
            loaded = root;
            &loaded
        }
    };
    let Ok(funding) = super::funding::read() else {
        return;
    };
    let Ok(credits) = funding.total_cycles_reported.parse::<u128>() else {
        return;
    };
    // Skip work with outstanding Index or treasury calls. Durable funding
    // uncertainty also invalidates a comparison across credits.
    if root.source.in_flight
        || super::funding::busy()
        || funding.phase != super::funding::Phase::Idle
    {
        return;
    }
    #[cfg(feature = "test-hooks")]
    balance_probe("meter", root.source.in_flight, false);
    let total = ic_cdk::api::canister_cycle_balance();
    let changed = METER.with(|meter| {
        let mut meter = meter.borrow_mut();
        let before = meter.record();
        meter.observe(now, total, credits, true) && before != meter.record()
    });
    if changed {
        let record = current_record().to_vec();
        let Ok(publication) = super::unhex(&root.publication_hash) else {
            ic_cdk::trap("invalid operational publication root")
        };
        STORED.with(|slot| slot.borrow_mut().set(record));
        super::set_observation_root(&publication);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn one_hour_is_bounded_and_uses_exact_observed_duration() {
        let mut meter = Meter::default();
        for n in 0..30 {
            assert!(meter.observe(1 + SAMPLE_NS * n, 1000 - u128::from(n) * 2, 0, true));
            if n == 1 {
                assert_eq!(meter.estimate.unwrap().quality, Quality::Preliminary);
                assert_eq!(meter.estimate.unwrap().per_day, 576);
            }
        }
        let e = meter.estimate.unwrap();
        assert_eq!(e.quality, Quality::Established);
        assert_eq!(e.end_ns - e.start_ns, HOUR_NS);
        assert_eq!(e.per_day, 576);
        assert_eq!(e.count, 13);
    }

    #[test]
    fn ignores_reservations_and_preserves_the_previous_rate_across_discontinuities() {
        let mut meter = Meter::default();
        assert!(meter.observe(1, 1000, 0, true));
        assert!(!meter.observe(SAMPLE_NS, 40, 0, false));
        assert!(meter.observe(SAMPLE_NS + 1, 997, 0, true));
        let old = meter.estimate.unwrap();
        assert_eq!(old.per_day, 864);
        assert!(meter.observe(SAMPLE_NS * 2 + 1, 999, 0, true));
        assert_eq!(meter.estimate.unwrap().quality, Quality::Stale);
        assert_eq!(meter.estimate.unwrap().per_day, old.per_day);
        assert!(meter.observe(SAMPLE_NS * 3 + 1, 995, 2, true));
        assert_eq!(meter.estimate.unwrap().quality, Quality::Stale);
        assert!(meter.observe(SAMPLE_NS * 4 + 1, 991, 2, true));
        assert_eq!(meter.estimate.unwrap().quality, Quality::Preliminary);
        assert_eq!(meter.estimate.unwrap().per_day, 1152);
    }

    #[test]
    fn restoration_retains_a_valid_rate_as_stale_and_rejects_malformed_bytes() {
        let mut before = Meter::default();
        assert!(before.observe(10, 100, 0, true));
        assert!(before.observe(10 + SAMPLE_NS, 99, 0, true));
        let mut bytes = before.record();
        let mut restored = Meter::default();
        restored.restore_record(&bytes).unwrap();
        assert_eq!(restored.estimate.unwrap().quality, Quality::Stale);
        assert_eq!(restored.estimate.unwrap().per_day, 288);
        bytes[2] = 255;
        assert!(restored.restore_record(&bytes).is_err());
    }
}
