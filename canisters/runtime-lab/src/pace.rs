//! B2Z wall-clock scheduling only. Never changes logical velocities, scores or seals.
use candid::CandidType;
use serde::Deserialize;

// Liquid API already accounts for freezing/resource and current message/call reserves.
// Extra headroom below is application policy, not another subtraction of those reserves.
pub const INDEX_FLOOR: u128 = 150_000_000_000;
pub const LIFELINE_EXIT: u128 = 2_500_000_000_000;
pub const LIFELINE_ENTER: u128 = 3_000_000_000_000;
pub const SURVIVAL_EXIT: u128 = 3_000_000_000_000;
pub const SURVIVAL_ENTER: u128 = 3_500_000_000_000;
pub const CONSERVE_EXIT: u128 = 4_000_000_000_000;
pub const CONSERVE_ENTER: u128 = 5_000_000_000_000;
pub const STEADY_EXIT: u128 = 12_000_000_000_000;
pub const STEADY_ENTER: u128 = 15_000_000_000_000;
pub const ECONOMY_EXIT: u128 = 16_000_000_000_000;
pub const ECONOMY_ENTER: u128 = 20_000_000_000_000;
pub const CRUISE_EXIT: u128 = 24_000_000_000_000;
pub const CRUISE_ENTER: u128 = 30_000_000_000_000;
pub const NORMAL_EXIT: u128 = 30_000_000_000_000;
pub const NORMAL_ENTER: u128 = 40_000_000_000_000;
pub const MAX_ACTIONS: usize = 8;
pub const MAX_WORK: u64 = 2048;
pub const INSTRUCTION_YIELD: u64 = 600_000_000;

const MIN_PERFORMANCE_MILLI: u32 = 50;
const PERFORMANCE_SAMPLE_COUNT: u8 = 3;
const RECOVERY_SAMPLE_COUNT: u8 = 5;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Default)]
pub enum Mode {
    Normal,
    Cruise,
    Economy,
    Steady,
    Conserve,
    Survival,
    Lifeline,
    #[default]
    ReserveProtection,
}

impl Mode {
    pub fn name(self) -> String {
        format!("{self:?}")
    }

    pub fn milli(self) -> u32 {
        match self {
            Self::Normal => 1000,
            Self::Cruise => 750,
            Self::Economy => 500,
            Self::Steady => 300,
            Self::Conserve => 200,
            Self::Survival => 100,
            Self::Lifeline => 50,
            Self::ReserveProtection => 0,
        }
    }

    pub fn rank(self) -> u8 {
        match self {
            Self::Normal => 7,
            Self::Cruise => 6,
            Self::Economy => 5,
            Self::Steady => 4,
            Self::Conserve => 3,
            Self::Survival => 2,
            Self::Lifeline => 1,
            Self::ReserveProtection => 0,
        }
    }

    fn exit(self) -> u128 {
        match self {
            Self::Normal => NORMAL_EXIT,
            Self::Cruise => CRUISE_EXIT,
            Self::Economy => ECONOMY_EXIT,
            Self::Steady => STEADY_EXIT,
            Self::Conserve => CONSERVE_EXIT,
            Self::Survival => SURVIVAL_EXIT,
            Self::Lifeline => LIFELINE_EXIT,
            Self::ReserveProtection => 0,
        }
    }
}

const ACTIVE_MODES: [Mode; 7] = [
    Mode::Normal,
    Mode::Cruise,
    Mode::Economy,
    Mode::Steady,
    Mode::Conserve,
    Mode::Survival,
    Mode::Lifeline,
];

fn entry(mode: Mode) -> u128 {
    match mode {
        Mode::Normal => NORMAL_ENTER,
        Mode::Cruise => CRUISE_ENTER,
        Mode::Economy => ECONOMY_ENTER,
        Mode::Steady => STEADY_ENTER,
        Mode::Conserve => CONSERVE_ENTER,
        Mode::Survival => SURVIVAL_ENTER,
        Mode::Lifeline => LIFELINE_ENTER,
        Mode::ReserveProtection => u128::MAX,
    }
}

fn enterable(balance: u128) -> Mode {
    ACTIVE_MODES
        .into_iter()
        .find(|mode| balance >= entry(*mode))
        .unwrap_or(Mode::ReserveProtection)
}

pub fn select(current: Mode, liquid: u128) -> Mode {
    if liquid < LIFELINE_EXIT {
        return Mode::ReserveProtection;
    }
    let fastest = enterable(liquid);
    if fastest.rank() > current.rank() {
        return fastest;
    }
    if current != Mode::ReserveProtection && liquid >= current.exit() {
        return current;
    }
    ACTIVE_MODES
        .into_iter()
        .find(|mode| mode.rank() < current.rank() && liquid >= mode.exit())
        .unwrap_or(fastest)
}

#[derive(Clone, CandidType, Deserialize)]
pub struct Hint {
    pub mode: String,
    /// Funding-selected gameplay target. This is never reduced because of world size.
    pub nominal_milli: u32,
    /// Actual scheduler target after the independently measured performance envelope.
    pub supported_milli: u32,
    pub performance_limited: bool,
    pub admission_open: bool,
}

pub struct Clock {
    pub mode: Mode,
    pub due: u64,
    pub batch_started: u64,
    pub performance_milli: u32,
    pub overrun: u8,
    pub healthy: u8,
    pub last_published: u64,
    pub rest_since_publication: u64,
}

impl Default for Clock {
    fn default() -> Self {
        Self {
            mode: Mode::ReserveProtection,
            due: 0,
            batch_started: 0,
            performance_milli: 1000,
            overrun: 0,
            healthy: 0,
            last_published: 0,
            rest_since_publication: 0,
        }
    }
}

impl Clock {
    pub fn refresh(&mut self, liquid: u128) {
        let mode = select(self.mode, liquid);
        if mode != self.mode {
            self.mode = mode;
            self.due = 0;
            self.overrun = 0;
            self.healthy = 0;
        }
    }

    fn supported_milli(&self) -> u32 {
        self.mode.milli().min(self.performance_milli)
    }

    /// Keep very slow publications at a bounded wall-clock cadence. This changes
    /// only segment boundaries; the kernel still advances every logical tick.
    pub fn publication_ticks(&self, configured: u64) -> u64 {
        if matches!(self.mode, Mode::Survival | Mode::Lifeline) {
            configured.min(1)
        } else {
            configured
        }
    }

    pub fn hint(&self) -> Hint {
        let nominal_milli = self.mode.milli();
        let supported_milli = self.supported_milli();
        Hint {
            mode: self.mode.name(),
            nominal_milli,
            supported_milli,
            performance_limited: supported_milli < nominal_milli,
            admission_open: self.mode != Mode::ReserveProtection,
        }
    }

    pub fn period(&self, ticks: u64) -> u64 {
        let rate = self.supported_milli();
        if rate == 0 {
            60_000_000_000
        } else {
            ticks.saturating_mul(1_000_000_000_000) / u64::from(rate)
        }
    }

    pub fn wait(&mut self, now: u64, ticks: u64) -> u64 {
        let period = self.period(ticks);
        if self.due == 0 || now > self.due.saturating_add(period.saturating_mul(2)) {
            self.due = now;
        }
        self.due.saturating_sub(now)
    }

    pub fn scheduled_wait(&mut self, now: u64, ticks: u64) -> u64 {
        let wait = self.wait(now, ticks);
        self.rest_since_publication = self.rest_since_publication.saturating_add(wait);
        wait
    }

    pub fn published(&mut self, now: u64, ticks: u64, ordinary: bool) {
        let compute = now.saturating_sub(self.batch_started);
        let delivery = if self.last_published == 0 {
            0
        } else {
            now.saturating_sub(self.last_published)
                .saturating_sub(self.rest_since_publication)
        };
        let elapsed = compute.max(delivery);
        self.last_published = now;
        self.rest_since_publication = 0;
        let period = self.period(ticks);
        if ordinary && elapsed > period {
            self.overrun = self.overrun.saturating_add(1);
            self.healthy = 0;
        } else if ordinary
            && self.performance_milli < self.mode.milli()
            && elapsed <= period.saturating_mul(3) / 4
        {
            self.overrun = 0;
            self.healthy = self.healthy.saturating_add(1);
        } else {
            self.overrun = 0;
            self.healthy = 0;
        }
        if self.overrun >= PERFORMANCE_SAMPLE_COUNT {
            let sustainable = ticks.saturating_mul(800_000_000_000) / elapsed.max(1);
            self.performance_milli = self
                .performance_milli
                .min(sustainable.clamp(u64::from(MIN_PERFORMANCE_MILLI), 1000) as u32);
            self.overrun = 0;
            self.healthy = 0;
        } else if self.healthy >= RECOVERY_SAMPLE_COUNT {
            self.performance_milli = self
                .performance_milli
                .saturating_add(50)
                .max(self.performance_milli.saturating_mul(5) / 4)
                .min(1000);
            self.healthy = 0;
        }
        let period = self.period(ticks);
        if self.due == 0 || now > self.due.saturating_add(period.saturating_mul(2)) {
            self.due = now;
        }
        self.due = self.due.saturating_add(period);
        self.batch_started = 0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const BANDS: [(Mode, u128, u128, u32); 7] = [
        (Mode::Normal, NORMAL_ENTER, NORMAL_EXIT, 1000),
        (Mode::Cruise, CRUISE_ENTER, CRUISE_EXIT, 750),
        (Mode::Economy, ECONOMY_ENTER, ECONOMY_EXIT, 500),
        (Mode::Steady, STEADY_ENTER, STEADY_EXIT, 300),
        (Mode::Conserve, CONSERVE_ENTER, CONSERVE_EXIT, 200),
        (Mode::Survival, SURVIVAL_ENTER, SURVIVAL_EXIT, 100),
        (Mode::Lifeline, LIFELINE_ENTER, LIFELINE_EXIT, 50),
    ];

    #[test]
    fn every_entry_exit_and_one_cycle_below_boundary() {
        for (mode, entry, exit, milli) in BANDS {
            assert!(select(Mode::ReserveProtection, entry - 1).rank() < mode.rank());
            assert_eq!(select(Mode::ReserveProtection, entry), mode);
            assert_eq!(select(mode, exit), mode);
            assert!(select(mode, exit - 1).rank() < mode.rank());
            assert_eq!(mode.milli(), milli);
        }
        assert_eq!(
            select(Mode::ReserveProtection, LIFELINE_EXIT),
            Mode::ReserveProtection
        );
        assert_eq!(
            select(Mode::ReserveProtection, LIFELINE_ENTER),
            Mode::Lifeline
        );
        assert_eq!(select(Mode::Lifeline, LIFELINE_EXIT), Mode::Lifeline);
        assert_eq!(
            select(Mode::Lifeline, LIFELINE_EXIT - 1),
            Mode::ReserveProtection
        );
    }

    #[test]
    fn conservative_selection_and_descending_steady_do_not_oscillate() {
        assert_eq!(
            select(Mode::ReserveProtection, 10_000_000_000_000),
            Mode::Conserve
        );
        assert_eq!(select(Mode::ReserveProtection, STEADY_EXIT), Mode::Conserve);
        assert_eq!(select(Mode::Steady, STEADY_EXIT), Mode::Steady);
        assert_eq!(select(Mode::Steady, STEADY_EXIT - 1), Mode::Conserve);
        for (mode, entry, exit, _) in BANDS {
            let mut current = select(Mode::ReserveProtection, entry);
            for balance in [entry - 1, exit, entry - 1, exit] {
                current = select(current, balance);
                assert_eq!(current, mode);
            }
        }
    }

    #[test]
    fn sudden_changes_skip_intermediate_modes_in_both_directions() {
        assert_eq!(select(Mode::Normal, SURVIVAL_EXIT), Mode::Survival);
        assert_eq!(select(Mode::Normal, LIFELINE_EXIT), Mode::Lifeline);
        assert_eq!(
            select(Mode::Normal, LIFELINE_EXIT - 1),
            Mode::ReserveProtection
        );
        assert_eq!(select(Mode::ReserveProtection, CRUISE_ENTER), Mode::Cruise);
        assert_eq!(select(Mode::Lifeline, NORMAL_ENTER), Mode::Normal);
    }

    #[test]
    fn deadlines_bound_head_and_drop_delayed_catchup() {
        let mut c = Clock::default();
        c.refresh(NORMAL_ENTER);
        assert_eq!(c.wait(1_000_000_000, 2), 0);
        c.batch_started = 1_000_000_000;
        c.published(1_000_000_000, 2, true);
        assert_eq!(c.wait(2_000_000_000, 2), 1_000_000_000);
        assert_eq!(c.wait(100_000_000_000, 2), 0);
        c.batch_started = 100_000_000_000;
        c.published(100_000_000_000, 2, true);
        assert_eq!(c.due, 102_000_000_000);
        c.refresh(ECONOMY_ENTER);
        assert_eq!(c.hint().nominal_milli, 500);
        assert_eq!(c.period(2), 4_000_000_000);
        c.refresh(0);
        assert!(!c.hint().admission_open);
        c.refresh(NORMAL_ENTER);
        assert!(c.hint().admission_open);
    }

    #[test]
    fn target_is_dimension_free_and_performance_is_reported_separately() {
        let mut c = Clock::default();
        c.refresh(NORMAL_ENTER);
        assert_eq!(c.hint().nominal_milli, 1000);
        assert_eq!(c.hint().supported_milli, 1000);
        assert!(!c.hint().performance_limited);
        c.performance_milli = 400;
        assert_eq!(c.hint().nominal_milli, 1000);
        assert_eq!(c.hint().supported_milli, 400);
        assert!(c.hint().performance_limited);
        c.refresh(ECONOMY_ENTER);
        assert_eq!(c.hint().nominal_milli, 500);
        assert_eq!(c.hint().supported_milli, 400);
    }

    #[test]
    fn persistent_compute_overruns_lower_then_healthy_probes_restore_envelope() {
        let mut c = Clock::default();
        c.refresh(NORMAL_ENTER);
        for n in 1..=3 {
            c.batch_started = (n - 1) * 4_000_000_000 + 1;
            c.published(n * 4_000_000_000 + 1, 2, true);
        }
        assert_eq!(c.hint().nominal_milli, 1000);
        assert_eq!(c.hint().supported_milli, 400);
        assert!(c.hint().performance_limited);

        let mut now = 12_000_000_001;
        for _ in 0..RECOVERY_SAMPLE_COUNT {
            c.batch_started = now;
            now += 1_000_000_000;
            c.published(now, 2, true);
        }
        assert_eq!(c.hint().supported_milli, 500);
    }

    #[test]
    fn timer_delivery_cost_also_bounds_the_performance_envelope() {
        let mut c = Clock::default();
        c.refresh(NORMAL_ENTER);
        c.last_published = 1;
        for n in 1..=3 {
            let now = n * 3_000_000_000 + 1;
            c.batch_started = now;
            c.rest_since_publication = 100_000_000;
            c.published(now, 2, true);
        }
        assert_eq!(c.hint().nominal_milli, 1000);
        assert_eq!(c.hint().supported_milli, 551);
        assert!(c.hint().performance_limited);
    }
}
