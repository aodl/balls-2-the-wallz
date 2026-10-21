//! B2Z wall-clock scheduling only. Never changes logical velocities, scores or seals.
use candid::CandidType;
use serde::Deserialize;
// Liquid API already accounts for freezing/resource and current message/call reserves.
// Extra headroom below is application policy, not another subtraction of those reserves.
pub const INDEX_FLOOR: u128 = 150_000_000_000;
pub const CONSERVE_EXIT: u128 = 250_000_000_000;
pub const CONSERVE_ENTER: u128 = 500_000_000_000;
pub const ECONOMY_EXIT: u128 = 1_000_000_000_000;
pub const ECONOMY_ENTER: u128 = 1_500_000_000_000;
pub const NORMAL_EXIT: u128 = 3_000_000_000_000;
pub const NORMAL_ENTER: u128 = 4_000_000_000_000;
pub const LARGE_WORLD_CEILING_MILLI: u32 = 500;
pub const MAX_ACTIONS: usize = 8;
pub const MAX_WORK: u64 = 2048;
pub const INSTRUCTION_YIELD: u64 = 600_000_000;
#[derive(Clone, Copy, Debug, PartialEq, Eq, Default)]
pub enum Mode {
    Normal,
    Economy,
    Conserve,
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
            Self::Economy => 500,
            Self::Conserve => 250,
            Self::ReserveProtection => 0,
        }
    }
    pub fn rank(self) -> u8 {
        match self {
            Self::Normal => 3,
            Self::Economy => 2,
            Self::Conserve => 1,
            Self::ReserveProtection => 0,
        }
    }
    fn exit(self) -> u128 {
        match self {
            Self::Normal => NORMAL_EXIT,
            Self::Economy => ECONOMY_EXIT,
            Self::Conserve => CONSERVE_EXIT,
            Self::ReserveProtection => 0,
        }
    }
}
fn enterable(balance: u128) -> Mode {
    if balance >= NORMAL_ENTER {
        Mode::Normal
    } else if balance >= ECONOMY_ENTER {
        Mode::Economy
    } else if balance >= CONSERVE_ENTER {
        Mode::Conserve
    } else {
        Mode::ReserveProtection
    }
}
pub fn select(current: Mode, liquid: u128) -> Mode {
    if liquid < CONSERVE_EXIT {
        return Mode::ReserveProtection;
    }
    let fastest = enterable(liquid);
    if fastest.rank() > current.rank() {
        return fastest;
    }
    if current != Mode::ReserveProtection && liquid >= current.exit() {
        return current;
    }
    for mode in [Mode::Economy, Mode::Conserve] {
        if mode.rank() < current.rank() && liquid >= mode.exit() {
            return mode;
        }
    }
    fastest
}
#[derive(Clone, CandidType, Deserialize)]
pub struct Hint {
    pub mode: String,
    pub nominal_milli: u32,
    pub admission_open: bool,
}
#[derive(Default)]
pub struct Clock {
    pub mode: Mode,
    pub due: u64,
    pub batch_started: u64,
    pub ceiling_milli: u32,
    pub overrun: u8,
    pub last_published: u64,
    pub rest_since_publication: u64,
}
impl Clock {
    pub fn configure_world(&mut self, torus: bool) {
        self.ceiling_milli = if torus {
            LARGE_WORLD_CEILING_MILLI
        } else {
            1000
        };
        self.due = 0;
    }

    pub fn refresh(&mut self, liquid: u128) {
        let mode = select(self.mode, liquid);
        if mode != self.mode {
            self.mode = mode;
            self.due = 0;
        }
        if self.ceiling_milli == 0 {
            self.ceiling_milli = 1000;
        }
    }
    pub fn hint(&self) -> Hint {
        Hint {
            mode: self.mode.name(),
            nominal_milli: self.mode.milli() * self.ceiling_milli / 1000,
            admission_open: self.mode != Mode::ReserveProtection,
        }
    }
    pub fn period(&self, ticks: u64) -> u64 {
        let rate = self.hint().nominal_milli;
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
        } else {
            self.overrun = 0;
        }
        if self.overrun >= 3 {
            let sustainable = ticks.saturating_mul(800_000_000_000) / elapsed.max(1);
            let base = sustainable.saturating_mul(1000) / u64::from(self.mode.milli().max(1));
            self.ceiling_milli = self.ceiling_milli.min(base.clamp(100, 1000) as u32);
            self.overrun = 0;
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
    #[test]
    fn every_entry_exit_and_hysteresis_boundary() {
        for (mode, entry, exit) in [
            (Mode::Normal, NORMAL_ENTER, NORMAL_EXIT),
            (Mode::Economy, ECONOMY_ENTER, ECONOMY_EXIT),
            (Mode::Conserve, CONSERVE_ENTER, CONSERVE_EXIT),
        ] {
            assert!(select(Mode::ReserveProtection, entry - 1).rank() < mode.rank());
            assert_eq!(select(Mode::ReserveProtection, entry), mode);
            assert_eq!(select(mode, exit), mode);
            assert!(select(mode, exit - 1).rank() < mode.rank());
            for v in [exit, exit + (entry - exit) / 2, entry - 1] {
                assert_eq!(select(mode, v), mode);
            }
        }
        assert_eq!(select(Mode::Normal, 0), Mode::ReserveProtection);
        assert_eq!(
            select(Mode::ReserveProtection, CONSERVE_ENTER),
            Mode::Conserve
        );
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
    fn persistent_compute_overruns_lower_shared_supported_ceiling() {
        let mut c = Clock::default();
        c.refresh(NORMAL_ENTER);
        for n in 1..=3 {
            c.batch_started = (n - 1) * 4_000_000_000 + 1;
            c.published(n * 4_000_000_000 + 1, 2, true);
        }
        assert_eq!(c.hint().nominal_milli, 400);
        c.refresh(ECONOMY_ENTER);
        assert_eq!(c.hint().nominal_milli, 200);
    }
    #[test]
    fn timer_delivery_cost_also_bounds_the_shared_ceiling() {
        let mut c = Clock::default();
        c.refresh(NORMAL_ENTER);
        c.last_published = 1;
        for n in 1..=3 {
            let now = n * 3_000_000_000 + 1;
            c.batch_started = now;
            c.rest_since_publication = 100_000_000;
            c.published(now, 2, true);
        }
        assert_eq!(c.hint().nominal_milli, 551);
        assert!(c.hint().nominal_milli <= 1000);
    }
    #[test]
    fn larger_staged_world_uses_the_measured_shared_envelope() {
        let mut c = Clock::default();
        c.configure_world(true);
        c.refresh(NORMAL_ENTER);
        assert_eq!(c.hint().nominal_milli, 500);
        c.refresh(ECONOMY_ENTER);
        assert_eq!(c.hint().nominal_milli, 250);
        c.refresh(CONSERVE_ENTER);
        assert_eq!(c.hint().nominal_milli, 125);
    }
}
