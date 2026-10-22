//! B2Z-owned operating funding, separate from deterministic game/history state.
use candid::{CandidType, Deserialize, Nat, Principal};
use ic_cdk::call::Call;
use ic_ledger_types::{
    AccountIdentifier, Memo, Subaccount, Timestamp, Tokens, TransferArgs, TransferError,
    TransferResult,
};
use ic_stable_structures::StableCell;
use serde::Serialize;
use std::{
    cell::{Cell, RefCell},
    time::Duration,
};

pub const CMC: &str = "rkp4c-7iaaa-aaaaa-aaaca-cai";
pub const BENEFICIARY: &str = "s34gv-3qaaa-aaaar-qcifa-cai";
pub const TOP_UP_MEMO: u64 = 1_347_768_404;
pub const INTERVAL: u64 = 300;
const CALL_FLOOR: u128 = 200_000_000_000;
const LEASE_NS: u64 = 90_000_000_000;
// Prelaunch treasury policy: sweep available gameplay ICP into operating cycles for B2Z.
// A future separately reviewed treasury policy will support adaptive cycle reserves,
// player rewards, ICP buybacks and other revenue allocations. Those functions are
// not implemented or promised by this release.
thread_local! {
    static STORE:RefCell<StableCell<Vec<u8>,super::Memory>>=RefCell::new(StableCell::init(super::memory(3),Vec::new()));
    static BUSY:Cell<bool>=const {Cell::new(false)};
}
#[cfg(feature = "test-hooks")]
thread_local! { static FAULT:RefCell<String>=const {RefCell::new(String::new())}; }
#[derive(Clone, Debug, CandidType, Deserialize, Serialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct Plan {
    pub ledger: String,
    pub beneficiary: String,
    pub cmc: String,
    pub to: Vec<u8>,
    pub amount_e8s: u64,
    pub fee_e8s: u64,
    pub memo: u64,
    pub created_at_time_ns: u64,
}
impl Plan {
    pub fn args(&self) -> TransferArgs {
        TransferArgs {
            memo: Memo(self.memo),
            amount: Tokens::from_e8s(self.amount_e8s),
            fee: Tokens::from_e8s(self.fee_e8s),
            from_subaccount: None,
            to: AccountIdentifier::from_slice(&self.to).expect("validated CMC destination"),
            created_at_time: Some(Timestamp {
                timestamp_nanos: self.created_at_time_ns,
            }),
        }
    }
}
#[derive(Clone, Debug, CandidType, Deserialize, Serialize, PartialEq, Eq)]
pub enum Phase {
    Idle,
    TransferPending {
        plan: Plan,
        uncertain: bool,
        attempts: u64,
    },
    NotifyPending {
        plan: Plan,
        block_index: u64,
        attempts: u64,
    },
}
#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct Observation {
    pub e8s: u64,
    pub observed_at_ns: u64,
}
#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct Completion {
    pub plan: Plan,
    pub block_index: u64,
    pub cycles: String,
    pub completed_at_ns: u64,
}
#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct Refund {
    pub plan: Plan,
    pub transfer_block: u64,
    pub refund_block: Option<u64>,
    pub reason: String,
}
#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct State {
    pub version: u32,
    pub paused: bool,
    pub halted: bool,
    pub phase: Phase,
    pub observed_balance: Option<Observation>,
    pub observed_fee: Option<Observation>,
    pub total_converted_e8s: String,
    pub total_cycles_reported: String,
    pub last_success: Option<Completion>,
    pub last_refund: Option<Refund>,
    pub last_error: Option<String>,
    pub last_plan_ns: u64,
    pub nonce: u64,
    pub lease_started_ns: u64,
}
#[derive(CandidType)]
struct Account {
    owner: Principal,
    subaccount: Option<Vec<u8>>,
}
#[derive(CandidType, Deserialize)]
pub struct NotifyArg {
    pub block_index: u64,
    pub canister_id: Principal,
}
#[derive(Debug, CandidType, Deserialize)]
pub enum NotifyError {
    Refunded {
        reason: String,
        block_index: Option<u64>,
    },
    Processing,
    TransactionTooOld(u64),
    InvalidTransaction(String),
    Other {
        error_code: u64,
        error_message: String,
    },
}
pub type NotifyResult = Result<Nat, NotifyError>;

pub fn cmc_subaccount(p: Principal) -> Subaccount {
    let mut bytes = [0; 32];
    bytes[0] = p.as_slice().len() as u8;
    bytes[1..1 + p.as_slice().len()].copy_from_slice(p.as_slice());
    Subaccount(bytes)
}
pub fn destination(p: Principal) -> AccountIdentifier {
    AccountIdentifier::new(&Principal::from_text(CMC).unwrap(), &cmc_subaccount(p))
}
fn context() -> Result<(Principal, Principal, bool), String> {
    let r = super::root()?;
    let owner = ic_cdk::api::canister_self();
    let local = r.source.network == "pocketic-local";
    if r.source.receiving_subaccount != 0
        || (!local
            && (owner.to_text() != BENEFICIARY || r.source.ledger != super::source::LEDGER_ID))
    {
        return Err("funding requires the reviewed backend default account".into());
    }
    Ok((
        Principal::from_text(&r.source.ledger).map_err(|e| e.to_string())?,
        owner,
        local,
    ))
}
fn validate(s: &State) -> Result<(), String> {
    if s.version != 1
        || s.total_converted_e8s.parse::<Nat>().is_err()
        || s.total_cycles_reported.parse::<Nat>().is_err()
    {
        return Err("funding state version/counters".into());
    }
    let check = |p: &Plan| -> Result<(), String> {
        let (ledger, owner, _) = context()?;
        if p.ledger != ledger.to_text()
            || p.beneficiary != owner.to_text()
            || p.cmc != CMC
            || p.to != destination(owner).as_bytes()
            || p.memo != TOP_UP_MEMO
            || p.amount_e8s == 0
        {
            Err("funding identity mismatch".into())
        } else {
            Ok(())
        }
    };
    match &s.phase {
        Phase::Idle => {}
        Phase::TransferPending { plan, .. } | Phase::NotifyPending { plan, .. } => check(plan)?,
    };
    Ok(())
}
pub fn read() -> Result<State, String> {
    let b = STORE.with(|s| s.borrow().get().clone());
    if b.is_empty() {
        return Err("funding not initialized".into());
    }
    let s: State = serde_json::from_slice(&b).map_err(|e| e.to_string())?;
    validate(&s)?;
    Ok(s)
}
fn save(s: &State) {
    validate(s).unwrap_or_else(|e| ic_cdk::trap(&e));
    let b = serde_json::to_vec(s).expect("funding serialization");
    assert!(b.len() <= 16384, "funding capacity");
    STORE.with(|c| c.borrow_mut().set(b));
}
fn now() -> u64 {
    ic_cdk::api::time()
}
fn error(s: &mut State, e: impl ToString) {
    s.last_error = Some(e.to_string().chars().take(1500).collect());
}
pub fn initialize() -> Result<(), String> {
    let setup = context();
    let local = setup.as_ref().is_ok_and(|c| c.2);
    let unsupported = setup.err();
    let mut s = if STORE.with(|c| c.borrow().get().is_empty()) {
        State {
            version: 1,
            paused: local || unsupported.is_some(),
            halted: unsupported.is_some(),
            phase: Phase::Idle,
            observed_balance: None,
            observed_fee: None,
            total_converted_e8s: "0".into(),
            total_cycles_reported: "0".into(),
            last_success: None,
            last_refund: None,
            last_error: unsupported,
            last_plan_ns: 0,
            nonce: 0,
            lease_started_ns: 0,
        }
    } else {
        read()?
    };
    s.nonce = s.nonce.checked_add(1).ok_or("funding nonce exhausted")?;
    s.lease_started_ns = 0;
    save(&s);
    BUSY.with(|b| b.set(false));
    install_timer();
    Ok(())
}
pub fn pause(paused: bool) -> Result<State, String> {
    let mut s = read()?;
    s.paused = paused;
    save(&s);
    Ok(s)
}
fn install_timer() {
    ic_cdk_timers::set_timer(Duration::from_secs(INTERVAL), async {
        install_timer();
        tick().await;
    });
}
fn current(n: u64) -> Option<State> {
    let s = read().ok()?;
    (s.nonce == n).then_some(s)
}
fn affordable(s: &mut State) -> bool {
    if ic_cdk::api::canister_liquid_cycle_balance() < CALL_FLOOR {
        error(s, "funding deferred: insufficient liquid cycles for calls");
        save(s);
        false
    } else {
        true
    }
}
fn refresh_lease(s: &mut State) {
    s.lease_started_ns = now();
    save(s);
}
async fn query_nat(
    n: u64,
    ledger: Principal,
    method: &str,
    owner: Principal,
) -> Result<u64, String> {
    let call = Call::bounded_wait(ledger, method).change_timeout(30);
    let response = if method == "icrc1_balance_of" {
        call.with_arg(&Account {
            owner,
            subaccount: None,
        })
        .await
    } else {
        call.await
    }
    .map_err(|e| format!("{method}: {e:?}"))?;
    if current(n).is_none() {
        return Err("superseded funding lease".into());
    }
    let nat = response
        .candid::<Nat>()
        .map_err(|e| format!("{method} decode: {e:?}"))?;
    u64::try_from(nat.0).map_err(|_| "ledger value exceeds u64".into())
}
pub fn worthwhile(balance: u64, fee: u64) -> Option<u64> {
    let amount = balance.checked_sub(fee)?;
    let minimum = fee.checked_mul(100)?.max(1_000_000);
    (amount >= minimum).then_some(amount)
}
#[cfg(feature = "test-hooks")]
pub fn set_fault(point: String) -> Result<(), String> {
    if !context()?.2 {
        return Err("disposable only".into());
    }
    if ![
        "after-plan",
        "after-transfer",
        "before-notify",
        "after-notify",
    ]
    .contains(&point.as_str())
    {
        return Err("unknown funding test point".into());
    }
    FAULT.with(|f| *f.borrow_mut() = point);
    Ok(())
}
fn fault(point: &str) -> bool {
    #[cfg(feature = "test-hooks")]
    {
        return FAULT.with(|f| {
            if f.borrow().as_str() == point {
                f.borrow_mut().clear();
                true
            } else {
                false
            }
        });
    }
    #[cfg(not(feature = "test-hooks"))]
    {
        let _ = point;
        false
    }
}
async fn tick() {
    let Ok(mut s) = read() else { return };
    if s.paused || s.halted {
        return;
    }
    if BUSY.with(Cell::get) && now().saturating_sub(s.lease_started_ns) < LEASE_NS {
        return;
    }
    if !affordable(&mut s) {
        return;
    }
    s.nonce = s.nonce.checked_add(1).expect("funding nonce exhausted");
    refresh_lease(&mut s);
    BUSY.with(|b| b.set(true));
    let n = s.nonce;
    if let Err(e) = work(n).await {
        if let Some(mut s) = current(n) {
            error(&mut s, e);
            save(&s);
        }
    }
    if current(n).is_some() {
        BUSY.with(|b| b.set(false));
    }
}
async fn work(n: u64) -> Result<(), String> {
    let (ledger, owner, _) = context()?;
    let mut s = current(n).ok_or("superseded funding worker")?;
    if matches!(s.phase, Phase::Idle) {
        let balance = query_nat(n, ledger, "icrc1_balance_of", owner).await?;
        s = current(n).ok_or("superseded funding worker")?;
        s.observed_balance = Some(Observation {
            e8s: balance,
            observed_at_ns: now(),
        });
        save(&s);
        if s.paused || !affordable(&mut s) {
            return Ok(());
        }
        refresh_lease(&mut s);
        let fee = query_nat(n, ledger, "icrc1_fee", owner).await?;
        s = current(n).ok_or("superseded funding worker")?;
        s.observed_fee = Some(Observation {
            e8s: fee,
            observed_at_ns: now(),
        });
        save(&s);
        if s.paused {
            return Ok(());
        }
        let Some(amount) = worthwhile(balance, fee) else {
            return Ok(());
        };
        let timestamp = now().max(
            s.last_plan_ns
                .checked_add(1)
                .ok_or("funding timestamp exhausted")?,
        );
        s.last_plan_ns = timestamp;
        s.phase = Phase::TransferPending {
            plan: Plan {
                ledger: ledger.to_text(),
                beneficiary: owner.to_text(),
                cmc: CMC.into(),
                to: destination(owner).as_bytes().to_vec(),
                amount_e8s: amount,
                fee_e8s: fee,
                memo: TOP_UP_MEMO,
                created_at_time_ns: timestamp,
            },
            uncertain: false,
            attempts: 0,
        };
        save(&s);
        if fault("after-plan") {
            return Ok(());
        }
    }
    s = current(n).ok_or("superseded funding worker")?;
    if let Phase::TransferPending {
        plan,
        uncertain,
        attempts,
    } = s.phase.clone()
    {
        if s.paused || !affordable(&mut s) {
            return Ok(());
        }
        // This write commits the entire original identity and ambiguity before the await.
        s.phase = Phase::TransferPending {
            plan: plan.clone(),
            uncertain: true,
            attempts: attempts
                .checked_add(1)
                .ok_or("funding attempts exhausted")?,
        };
        refresh_lease(&mut s);
        let response = Call::bounded_wait(ledger, "transfer")
            .change_timeout(30)
            .with_arg(plan.args())
            .await
            .map_err(|e| format!("transfer ambiguous: {e:?}"))?;
        let result = response
            .candid::<TransferResult>()
            .map_err(|e| format!("transfer ambiguous decode: {e:?}"))?;
        if fault("after-transfer") {
            ic_cdk::trap("disposable lost transfer reply");
        }
        s = current(n).ok_or("superseded funding worker")?;
        match result {
            Ok(block)
            | Err(TransferError::TxDuplicate {
                duplicate_of: block,
            }) => {
                s.phase = Phase::NotifyPending {
                    plan,
                    block_index: block,
                    attempts: 0,
                };
                s.last_error = None;
                save(&s);
            }
            Err(e) => {
                apply_transfer_error(&mut s, e, uncertain);
                save(&s);
                return Ok(());
            }
        }
        if fault("before-notify") {
            return Ok(());
        }
    }
    s = current(n).ok_or("superseded funding worker")?;
    if let Phase::NotifyPending {
        plan,
        block_index,
        attempts,
    } = s.phase.clone()
    {
        if s.paused || !affordable(&mut s) {
            return Ok(());
        }
        s.phase = Phase::NotifyPending {
            plan: plan.clone(),
            block_index,
            attempts: attempts.checked_add(1).ok_or("notify attempts exhausted")?,
        };
        refresh_lease(&mut s);
        let response = Call::bounded_wait(Principal::from_text(CMC).unwrap(), "notify_top_up")
            .change_timeout(30)
            .with_arg(&NotifyArg {
                block_index,
                canister_id: owner,
            })
            .await
            .map_err(|e| format!("notify retry same block {block_index}: {e:?}"))?;
        let result = response
            .candid::<NotifyResult>()
            .map_err(|e| format!("notify decode retry same block {block_index}: {e:?}"))?;
        if fault("after-notify") {
            ic_cdk::trap("disposable lost notification reply");
        }
        s = current(n).ok_or("superseded funding worker")?;
        match result {
            Ok(cycles) => {
                let icp = s
                    .total_converted_e8s
                    .parse::<Nat>()
                    .map_err(|e| e.to_string())?;
                let total = s
                    .total_cycles_reported
                    .parse::<Nat>()
                    .map_err(|e| e.to_string())?;
                s.total_converted_e8s = (icp.0 + Nat::from(plan.amount_e8s).0).to_string();
                s.total_cycles_reported = (total.0 + cycles.0.clone()).to_string();
                s.last_success = Some(Completion {
                    plan,
                    block_index,
                    cycles: cycles.to_string(),
                    completed_at_ns: now(),
                });
                s.phase = Phase::Idle;
                s.last_error = None;
            }
            Err(NotifyError::Refunded {
                reason,
                block_index: refund_block,
            }) => {
                error(
                    &mut s,
                    format!("CMC refunded; stopped for review: {reason}"),
                );
                s.last_refund = Some(Refund {
                    plan,
                    transfer_block: block_index,
                    refund_block,
                    reason: reason.chars().take(1500).collect(),
                });
                s.phase = Phase::Idle;
                s.halted = true;
            }
            Err(NotifyError::Processing) => error(&mut s, "CMC Processing; retry same block"),
            Err(NotifyError::Other {
                error_code,
                error_message,
            }) => error(
                &mut s,
                format!("CMC retry same block: {error_code} {error_message}"),
            ),
            Err(e) => {
                s.halted = true;
                error(
                    &mut s,
                    format!("CMC terminal; retained block for review: {e:?}"),
                );
            }
        }
        save(&s);
    }
    Ok(())
}
fn apply_transfer_error(s: &mut State, e: TransferError, was_uncertain: bool) {
    error(
        s,
        format!("transfer {e:?}; prior_ambiguity={was_uncertain}"),
    );
    match e {
        TransferError::TxCreatedInFuture => {
            if let Phase::TransferPending { uncertain, .. } = &mut s.phase {
                *uncertain = was_uncertain;
            }
        }
        TransferError::BadFee { .. } | TransferError::InsufficientFunds { .. }
            if !was_uncertain =>
        {
            s.phase = Phase::Idle
        }
        _ => {
            s.halted = true;
            error(s,format!("transfer halted; reconcile original identity before replacement: {e:?}; prior_ambiguity={was_uncertain}"));
        }
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn threshold_and_dust() {
        assert_eq!(worthwhile(1_010_000, 10_000), Some(1_000_000));
        assert_eq!(worthwhile(1_009_999, 10_000), None);
        assert_eq!(worthwhile(9_999, 10_000), None);
        assert_eq!(worthwhile(u64::MAX, u64::MAX), None);
        assert_eq!(worthwhile(100_000_000, 20_000), Some(99_980_000));
    }
    #[test]
    fn principal_subaccount_is_not_default() {
        let p = Principal::from_text(BENEFICIARY).unwrap();
        let s = cmc_subaccount(p);
        assert_ne!(s.0, [0; 32]);
        assert_eq!(s.0[0] as usize, p.as_slice().len());
        assert_eq!(&s.0[1..1 + p.as_slice().len()], p.as_slice());
        // Independently calculated by tools/verify_cmc_route.py (CRC32 + SHA224).
        assert_eq!(
            destination(p).to_hex(),
            "fa4c0ec911194217d5d4f3ec27f7ac26a7f19e74fbeeba39d469e4f24071b8de"
        );
    }
    fn pending(uncertain: bool) -> State {
        State {
            version: 1,
            paused: false,
            halted: false,
            phase: Phase::TransferPending {
                plan: Plan {
                    ledger: super::super::source::LEDGER_ID.into(),
                    beneficiary: BENEFICIARY.into(),
                    cmc: CMC.into(),
                    to: destination(Principal::from_text(BENEFICIARY).unwrap())
                        .as_bytes()
                        .to_vec(),
                    amount_e8s: 99_990_000,
                    fee_e8s: 10_000,
                    memo: TOP_UP_MEMO,
                    created_at_time_ns: 123,
                },
                uncertain,
                attempts: 1,
            },
            observed_balance: None,
            observed_fee: None,
            total_converted_e8s: "0".into(),
            total_cycles_reported: "0".into(),
            last_success: None,
            last_refund: None,
            last_error: None,
            last_plan_ns: 123,
            nonce: 1,
            lease_started_ns: 0,
        }
    }
    #[test]
    fn definitive_rejections_replan_only_without_prior_ambiguity() {
        for uncertain in [false, true] {
            for e in [
                TransferError::BadFee {
                    expected_fee: Tokens::from_e8s(20_000),
                },
                TransferError::InsufficientFunds {
                    balance: Tokens::from_e8s(1),
                },
            ] {
                let mut s = pending(uncertain);
                let original = s.phase.clone();
                apply_transfer_error(&mut s, e, uncertain);
                assert_eq!(s.halted, uncertain);
                if uncertain {
                    assert_eq!(s.phase, original);
                } else {
                    assert_eq!(s.phase, Phase::Idle);
                }
            }
        }
    }
    #[test]
    fn expired_identity_is_never_replaced_and_future_keeps_original() {
        for uncertain in [false, true] {
            let mut s = pending(uncertain);
            let original = s.phase.clone();
            apply_transfer_error(
                &mut s,
                TransferError::TxTooOld {
                    allowed_window_nanos: 86_400_000_000_000,
                },
                uncertain,
            );
            assert!(s.halted);
            assert_eq!(s.phase, original);
            let mut s = pending(true);
            apply_transfer_error(&mut s, TransferError::TxCreatedInFuture, uncertain);
            assert!(!s.halted);
            assert_eq!(s.phase, pending(uncertain).phase);
        }
    }
}
