//! Bounded operational samples, not certified gameplay or a billed gross meter.
use candid::{CandidType, Nat};
use serde::Deserialize;
use std::collections::VecDeque;
#[derive(Clone)]
struct Sample {
    at: u64,
    total: u128,
    liquid: u128,
    credits: u128,
}
#[derive(Default)]
pub struct Meter {
    samples: VecDeque<Sample>,
    started: u64,
    resets: u64,
    reason: String,
}
#[derive(CandidType, Deserialize)]
pub struct Health {
    pub version: u32,
    pub runtime_started_ns: u64,
    pub observed_at_ns: u64,
    pub liquid_cycles: Nat,
    pub total_cycles: Nat,
    pub sample_start_ns: u64,
    pub sample_end_ns: u64,
    pub sample_start_total_cycles: Nat,
    pub sample_end_total_cycles: Nat,
    pub sample_scope: String,
    pub sample_count: u32,
    pub net_decline_cycles: Option<Nat>,
    pub known_treasury_credit_delta: Nat,
    pub reservation_gap_start: Nat,
    pub reservation_gap_end: Nat,
    pub resets: u64,
    pub discontinuity: String,
    pub certified_gameplay: bool,
}
impl Meter {
    pub fn start(&mut self, at: u64) {
        if self.started == 0 {
            self.started = at;
        }
    }
    pub fn sample(&mut self, at: u64, total: u128, liquid: u128, credits: u128) {
        self.start(at);
        if let Some(last) = self.samples.back() {
            if at <= last.at || total > last.total || credits != last.credits {
                self.samples.clear();
                self.resets += 1;
                self.reason =
                    "balance increase, credit or clock discontinuity; rate restarted".into();
            }
        }
        if self
            .samples
            .back()
            .is_some_and(|s| at.saturating_sub(s.at) < 15_000_000_000)
        {
            return;
        }
        self.samples.push_back(Sample {
            at,
            total,
            liquid,
            credits,
        });
        while self.samples.len() > 21
            || self
                .samples
                .front()
                .is_some_and(|s| at.saturating_sub(s.at) > 300_000_000_000)
        {
            self.samples.pop_front();
        }
    }
    pub fn read(&self, now: u64, total: u128, liquid: u128) -> Health {
        let a = self.samples.front();
        let b = self.samples.back();
        let valid = a.zip(b).is_some_and(|(a, b)| {
            b.at.saturating_sub(a.at) >= 60_000_000_000
                && now.saturating_sub(b.at) <= 90_000_000_000
        });
        Health {
            version: 1,
            runtime_started_ns: self.started,
            observed_at_ns: now,
            liquid_cycles: liquid.into(),
            total_cycles: total.into(),
            sample_start_ns: a.map_or(0, |s| s.at),
            sample_end_ns: b.map_or(0, |s| s.at),
            sample_start_total_cycles: a.map_or(0, |s| s.total).into(),
            sample_end_total_cycles: b.map_or(0, |s| s.total).into(),
            sample_scope: "source-fallback callback before outgoing calls; current-message execution reserve included; query balances are separate observations".into(),
            sample_count: self.samples.len() as u32,
            net_decline_cycles: if valid {
                a.zip(b)
                    .map(|(a, b)| a.total.saturating_sub(b.total).into())
            } else {
                None
            },
            known_treasury_credit_delta: a
                .zip(b)
                .map_or(0, |(a, b)| b.credits.saturating_sub(a.credits))
                .into(),
            reservation_gap_start: a.map_or(0, |s| s.total.saturating_sub(s.liquid)).into(),
            reservation_gap_end: b.map_or(0, |s| s.total.saturating_sub(s.liquid)).into(),
            resets: self.resets,
            discontinuity: if self.samples.len() < 2 {
                "upgrade/startup: measuring".into()
            } else {
                self.reason.clone()
            },
            certified_gameplay: false,
        }
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn net_samples_reset_on_topups_and_credits_and_expire() {
        let mut m = Meter::default();
        m.sample(1, 1000, 900, 0);
        m.sample(60_000_000_001, 900, 800, 0);
        assert_eq!(
            m.read(60_000_000_002, 900, 800).net_decline_cycles,
            Some(100u32.into())
        );
        m.sample(80_000_000_001, 2000, 1900, 0);
        assert!(m
            .read(80_000_000_002, 2000, 1900)
            .net_decline_cycles
            .is_none());
        m.sample(140_000_000_001, 1900, 1800, 0);
        assert!(m
            .read(140_000_000_002, 1900, 1800)
            .net_decline_cycles
            .is_some());
        assert!(m
            .read(240_000_000_002, 1900, 1800)
            .net_decline_cycles
            .is_none());
        m.sample(160_000_000_001, 1800, 1700, 100);
        assert!(m
            .read(160_000_000_002, 1800, 1700)
            .net_decline_cycles
            .is_none());
    }
    #[test]
    fn samples_are_bounded_and_do_not_measure_subminute_rates() {
        let mut m = Meter::default();
        for i in 1..100 {
            m.sample(i * 15_000_000_000, 1000 - i as u128, 900 - i as u128, 0);
        }
        assert!(m.samples.len() <= 21);
    }
    #[test]
    fn discontinuities_cannot_hide_inside_the_sampling_interval() {
        let mut m = Meter::default();
        m.sample(1, 1000, 900, 0);
        m.sample(60_000_000_001, 900, 800, 0);
        m.sample(60_000_000_002, 950, 850, 0);
        assert_eq!(m.resets, 1);
        assert!(m
            .read(60_000_000_003, 950, 850)
            .net_decline_cycles
            .is_none());
        m.sample(60_000_000_001, 940, 840, 0);
        assert_eq!(m.resets, 2);
    }
    #[test]
    fn query_execution_refunds_do_not_rewrite_historical_callback_endpoints() {
        let mut m = Meter::default();
        m.sample(1, 1000, 900, 0);
        m.sample(60_000_000_001, 900, 800, 0);
        let h = m.read(60_000_000_002, 1100, 1000);
        assert_eq!(h.net_decline_cycles, Some(100u32.into()));
        assert_eq!(h.sample_end_total_cycles, Nat::from(900u32));
        assert_eq!(h.total_cycles, Nat::from(1100u32));
        m.sample(120_000_000_001, 1100, 1000, 0);
        assert!(m
            .read(120_000_000_002, 1100, 1000)
            .net_decline_cycles
            .is_none());
    }
}
