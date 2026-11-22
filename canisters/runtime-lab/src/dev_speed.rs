//! TEMPORARY DEVELOPMENT ONLY — REMOVE BEFORE PUBLIC LAUNCH
use super::*;

#[derive(CandidType, Deserialize)]
pub struct Status {
    pub mode: String,
    pub adaptive_tier: String,
    pub remaining_seconds: u16,
    pub default_seconds: u16,
    pub running: bool,
    pub idle: bool,
    pub admission_open: bool,
    pub liquid_cycles: u128,
    pub recovery_reserve: u128,
}

pub fn read() -> AppResult<Status> {
    authorized()?;
    let r = root()?;
    status(&r)
}

fn status(r: &Root) -> AppResult<Status> {
    let now = ic_cdk::api::time();
    let liquid = ic_cdk::api::canister_liquid_cycle_balance();
    let running = r.run.running && r.run.last_error.is_none();
    let transitioning = active_transition(r)?.is_some() || r.lifecycle_barrier.is_some();
    Ok(PACE.with(|p| {
        let pace = p.borrow();
        let adaptive = pace::select(pace.mode, liquid);
        let remaining = pace
            .dev_until_ns
            .filter(|until| {
                running
                    && !transitioning
                    && now < *until
                    && pace.dev_resources_safe(liquid)
                    && adaptive != pace::Mode::ReserveProtection
            })
            .map_or(0, |until| (until - now).div_ceil(1_000_000_000) as u16);
        Status {
            mode: if remaining == 0 {
                "Adaptive"
            } else {
                "Full Speed"
            }
            .into(),
            adaptive_tier: adaptive.name(),
            remaining_seconds: remaining,
            default_seconds: pace::DEV_DEFAULT_SECONDS,
            running,
            idle: ARENA_IDLE.with(Cell::get),
            admission_open: adaptive != pace::Mode::ReserveProtection,
            liquid_cycles: liquid,
            recovery_reserve: pace::DEV_RECOVERY_RESERVE,
        }
    }))
}

pub fn set(full_speed: bool, duration_seconds: Option<u16>) -> AppResult<Status> {
    authorized()?;
    let r = root()?;
    let now = ic_cdk::api::time();
    if full_speed {
        if !r.run.running || r.run.last_error.is_some() {
            return Err("The autonomous simulation must already be running".into());
        }
        if active_transition(&r)?.is_some() || r.lifecycle_barrier.is_some() {
            return Err("Full Speed is unavailable during a transition or lifecycle fence".into());
        }
        if host(&r)?.record.journal.stage.is_some() {
            return Err("Wait for the current checkpoint before switching pace".into());
        }
        let liquid = ic_cdk::api::canister_liquid_cycle_balance();
        refresh_pace();
        PACE.with(|p| {
            p.borrow_mut().start_dev_speed(
                now,
                duration_seconds.unwrap_or(pace::DEV_DEFAULT_SECONDS),
                liquid,
            )
        })?;
    } else {
        PACE.with(|p| p.borrow_mut().end_dev_speed(now));
    }
    install_run_timer(&r.run);
    status(&r)
}
