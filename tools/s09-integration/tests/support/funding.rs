//! Valueless upstream Ledger/Index + narrow real-contract CMC double only.
use super::*;
#[derive(Clone, Debug, CandidType, Deserialize)]
struct Plan {
    ledger: String,
    beneficiary: String,
    cmc: String,
    to: Vec<u8>,
    amount_e8s: u64,
    fee_e8s: u64,
    memo: u64,
    created_at_time_ns: u64,
}
#[derive(Clone, Debug, CandidType, Deserialize)]
enum Phase {
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
#[derive(Clone, Debug, CandidType, Deserialize)]
struct Observation {
    e8s: u64,
    observed_at_ns: u64,
}
#[derive(Clone, Debug, CandidType, Deserialize)]
struct Completion {
    plan: Plan,
    block_index: u64,
    cycles: String,
    completed_at_ns: u64,
}
#[derive(Clone, Debug, CandidType, Deserialize)]
struct Refund {
    plan: Plan,
    transfer_block: u64,
    refund_block: Option<u64>,
    reason: String,
}
#[derive(Clone, Debug, CandidType, Deserialize)]
struct Funding {
    version: u32,
    paused: bool,
    halted: bool,
    phase: Phase,
    observed_balance: Option<Observation>,
    observed_fee: Option<Observation>,
    total_converted_e8s: String,
    total_cycles_reported: String,
    last_success: Option<Completion>,
    last_refund: Option<Refund>,
    last_error: Option<String>,
    last_plan_ns: u64,
    nonce: u64,
    lease_started_ns: u64,
}
#[derive(CandidType, Deserialize)]
struct CmcStats {
    calls: u64,
    credits: u64,
    blocks: Vec<u64>,
    target: Principal,
}
fn cmc() -> Principal {
    Principal::from_text("rkp4c-7iaaa-aaaaa-aaaca-cai").unwrap()
}
fn funding(pic: &PocketIc, id: Principal) -> Funding {
    get_query(pic, id, "controller_funding", encode_args(()).unwrap())
}
fn settle(pic: &PocketIc) {
    for _ in 0..40 {
        pic.advance_time(Duration::from_millis(100));
        pic.tick();
    }
}
fn maintenance(pic: &PocketIc) {
    pic.advance_time(Duration::from_secs(300));
    settle(pic);
}
fn enabled(pic: &PocketIc, id: Principal, value: bool) {
    get_result::<Funding>(
        pic,
        id,
        "set_funding_paused",
        candid::encode_one(!value).unwrap(),
    );
}
fn fault(pic: &PocketIc, id: Principal, value: &str) {
    get_result::<()>(
        pic,
        id,
        "test_funding_fault",
        candid::encode_one(value).unwrap(),
    );
}
fn mode(pic: &PocketIc, value: &str) {
    pic.update_call(
        cmc(),
        controller(),
        "mode",
        candid::encode_one(value).unwrap(),
    )
    .unwrap();
}
fn stats(pic: &PocketIc) -> CmcStats {
    decode_one(
        &pic.query_call(cmc(), controller(), "stats", encode_args(()).unwrap())
            .unwrap(),
    )
    .unwrap()
}
fn balance(pic: &PocketIc, ledger: Principal, owner: Principal) -> u64 {
    let n: candid::Nat = decode_one(
        &pic.query_call(
            ledger,
            controller(),
            "icrc1_balance_of",
            candid::encode_one(IcrcAccount {
                owner,
                subaccount: None,
            })
            .unwrap(),
        )
        .unwrap(),
    )
    .unwrap();
    u64::try_from(n.0).unwrap()
}
fn rows(pic: &PocketIc, id: Principal, index: Principal) -> source::History {
    let arg = source::HistoryArgs {
        account_identifier: AccountIdentifier::new(&id, &DEFAULT_SUBACCOUNT).to_hex(),
        start: None,
        max_results: 64,
    };
    decode_one::<source::HistoryResult>(
        &pic.query_call(
            index,
            controller(),
            "get_account_identifier_transactions",
            candid::encode_one(arg).unwrap(),
        )
        .unwrap(),
    )
    .unwrap()
    .unwrap()
}
fn setup(wasm: Vec<u8>) -> (PocketIc, Principal, Principal, Principal, Principal) {
    setup_fee(wasm, 10_000)
}
fn setup_fee(wasm: Vec<u8>, fee: u64) -> (PocketIc, Principal, Principal, Principal, Principal) {
    let (pic, id, ledger, payer) = arena_setup_world_fee(wasm, initial_world(), fee);
    let index = status(&pic, id).source.index;
    pic.create_canister_with_id(
        Some(controller()),
        Some(CanisterSettings {
            controllers: Some(vec![controller()]),
            ..Default::default()
        }),
        cmc(),
    )
    .unwrap();
    pic.install_canister(
        cmc(),
        std::fs::read(std::env::var("B2Z_CMC_MOCK_WASM").unwrap()).unwrap(),
        encode_args((id, ledger)).unwrap(),
        Some(controller()),
    );
    (pic, id, ledger, index, payer)
}
fn outgoing(pic: &PocketIc, id: Principal, index: Principal) -> Vec<source::TransactionWithId> {
    rows(pic,id,index).transactions.into_iter().filter(|r|matches!(&r.transaction.operation,source::Operation::Transfer{from,..} if from==&AccountIdentifier::new(&id,&DEFAULT_SUBACCOUNT).to_hex())).collect()
}
fn deposit(pic: &PocketIc, ledger: Principal, payer: Principal, id: Principal, amount: u64) {
    // Let the real Ledger choose its configured fee, including the changed-fee case.
    let reply = pic
        .update_call(
            ledger,
            payer,
            "icrc1_transfer",
            candid::encode_one(IcrcTransferArg {
                to: IcrcAccount {
                    owner: id,
                    subaccount: None,
                },
                fee: None,
                memo: Some(b"ANGLE NaN".to_vec()),
                from_subaccount: None,
                created_at_time: None,
                amount: amount.into(),
            })
            .unwrap(),
        )
        .unwrap();
    #[derive(CandidType, Deserialize, Debug)]
    enum Error {
        GenericError {
            error_code: candid::Nat,
            message: String,
        },
    }
    decode_one::<Result<candid::Nat, Error>>(&reply)
        .unwrap()
        .unwrap();
}
#[test]
fn funding_real_ledger_join_sweep_index_and_upgrade_preserve_history() {
    let prior = std::env::var("B2Z_FUNDING_PRIOR_WASM")
        .map(|p| std::fs::read(p).unwrap())
        .unwrap_or_else(|_| bytes("B2Z_S14_WASM"));
    let (pic, id, ledger, index, payer) = setup(prior);
    start_arena(&pic, id);
    let tx = transfer_text(&pic, ledger, payer, id, 100_000_000, b"ANGLE 37.5");
    for _ in 0..80 {
        tick(&pic);
        if work(&pic, id).0 == 0 && status(&pic, id).source.admitted_to_exclusive > tx {
            break;
        }
    }
    get_result::<Status>(&pic, id, "pause_autonomous", encode_args(()).unwrap());
    settle(&pic);
    let before = arena_world(&pic, id);
    let publication = observe(&pic, id).0.publication;
    let cursor = status(&pic, id).source.admitted_to_exclusive;
    let old_memory = pic
        .canister_status(id, Some(controller()))
        .unwrap()
        .memory_size;
    pic.upgrade_canister(
        id,
        bytes("B2Z_S14_WASM"),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    settle(&pic);
    let new_memory = pic
        .canister_status(id, Some(controller()))
        .unwrap()
        .memory_size;
    println!("FUNDING_UPGRADE_MEMORY before={old_memory} after={new_memory}");
    assert_eq!(arena_world(&pic, id), before);
    assert_eq!(observe(&pic, id).0.publication, publication);
    assert_eq!(status(&pic, id).source.admitted_to_exclusive, cursor);
    assert!(funding(&pic, id).paused);
    assert_eq!(balance(&pic, ledger, id), 100_000_000);
    let denied = pic
        .query_call(
            id,
            Principal::anonymous(),
            "controller_funding",
            encode_args(()).unwrap(),
        )
        .unwrap();
    assert!(
        decode_one::<Result<Funding, String>>(&denied)
            .unwrap()
            .is_err()
    );
    let denied = pic
        .update_call(
            id,
            Principal::anonymous(),
            "set_funding_paused",
            candid::encode_one(false).unwrap(),
        )
        .unwrap();
    assert!(
        decode_one::<Result<Funding, String>>(&denied)
            .unwrap()
            .is_err()
    );
    enabled(&pic, id, true);
    let initial_cycles = pic.cycle_balance(id);
    maintenance(&pic);
    let s = funding(&pic, id);
    assert!(!s.halted, "{:?}", s.last_error);
    assert!(matches!(s.phase, Phase::Idle));
    assert_eq!(s.total_converted_e8s, "99990000");
    assert_eq!(s.total_cycles_reported, "1000000000000");
    assert!(pic.cycle_balance(id) > initial_cycles + 900_000_000_000);
    assert_eq!(balance(&pic, ledger, id), 0);
    assert_eq!(stats(&pic).credits, 1);
    let success = s.last_success.unwrap();
    assert_eq!(success.plan.memo, 1_347_768_404);
    assert_eq!(success.plan.fee_e8s, 10_000);
    assert_eq!(success.plan.amount_e8s, 99_990_000);
    assert_eq!(success.plan.beneficiary, id.to_text());
    let mut sub = [0; 32];
    sub[0] = id.as_slice().len() as u8;
    sub[1..1 + id.as_slice().len()].copy_from_slice(id.as_slice());
    let expected = AccountIdentifier::new(&cmc(), &ic_ledger_types::Subaccount(sub));
    assert_eq!(success.plan.to, expected.as_bytes());
    maintenance(&pic);
    let out = outgoing(&pic, id, index);
    assert_eq!(out.len(), 1);
    assert_eq!(out[0].id, success.block_index);
    assert_eq!(out[0].transaction.memo, 1_347_768_404);
    match &out[0].transaction.operation {
        source::Operation::Transfer {
            to, amount, fee, ..
        } => {
            assert_eq!(to, &expected.to_hex());
            assert_eq!(amount.e8s, 99_990_000);
            assert_eq!(fee.e8s, 10_000);
        }
        _ => panic!("not transfer"),
    }
    assert!(status(&pic, id).source.admitted_to_exclusive > success.block_index);
    assert_eq!(arena_world(&pic, id).received_e8s, before.received_e8s);
    assert_eq!(stats(&pic).credits, 1);
    start_arena(&pic, id);
    for _ in 0..15 {
        tick(&pic);
    }
    assert!(status(&pic, id).run.completed_segments > 0);
    assert_eq!(arena_world(&pic, id).cannons.len(), 1);
    println!(
        "FUNDING_REAL_PATH PASS incoming={tx} outgoing={} account={expected}",
        success.block_index
    );
}
#[test]
fn funding_pending_upgrade_duplicates_notification_retry_and_new_deposits() {
    for point in [
        "after-plan",
        "after-transfer",
        "before-notify",
        "after-notify",
    ] {
        let (pic, id, ledger, index, payer) = setup(bytes("B2Z_S14_TEST_WASM"));
        transfer_text(&pic, ledger, payer, id, 100_000_000, b"ANGLE 37.5");
        settle(&pic);
        fault(&pic, id, point);
        enabled(&pic, id, true);
        maintenance(&pic);
        let before = funding(&pic, id);
        assert!(
            !matches!(before.phase, Phase::Idle),
            "{point}: {:?}",
            before.phase
        );
        let plan = match &before.phase {
            Phase::TransferPending { plan, .. } | Phase::NotifyPending { plan, .. } => plan.clone(),
            _ => unreachable!(),
        };
        transfer_text(&pic, ledger, payer, id, 2_000_000, b"ANGLE NaN");
        pic.upgrade_canister(
            id,
            bytes("B2Z_S14_WASM"),
            encode_args(()).unwrap(),
            Some(controller()),
        )
        .unwrap();
        settle(&pic);
        let after = funding(&pic, id);
        assert_eq!(
            candid::encode_one(&after.phase).unwrap(),
            candid::encode_one(&before.phase).unwrap()
        );
        mode(&pic, "processing");
        maintenance(&pic);
        let pending = funding(&pic, id);
        if point == "after-notify" {
            assert!(matches!(pending.phase, Phase::Idle));
            assert_eq!(stats(&pic).credits, 1);
            assert_eq!(pending.total_converted_e8s, "99990000");
            assert_eq!(balance(&pic, ledger, id), 2_000_000);
            continue;
        }
        assert!(
            matches!(pending.phase, Phase::NotifyPending { .. }),
            "{point}: {:?} {:?}",
            pending.phase,
            pending.last_error
        );
        let block = match pending.phase {
            Phase::NotifyPending { block_index, .. } => block_index,
            _ => unreachable!(),
        };
        // after-notify already credited once; its idempotent response completes immediately.
        enabled(&pic, id, false);
        let prior_calls = stats(&pic).calls;
        maintenance(&pic);
        assert_eq!(stats(&pic).calls, prior_calls);
        enabled(&pic, id, true);
        mode(&pic, "other");
        maintenance(&pic);
        assert!(
            matches!(funding(&pic,id).phase,Phase::NotifyPending{block_index,..} if block_index==block)
        );
        mode(&pic, "");
        maintenance(&pic);
        let done = funding(&pic, id);
        assert!(matches!(done.phase, Phase::Idle));
        assert_eq!(
            done.last_success.as_ref().unwrap().plan.created_at_time_ns,
            plan.created_at_time_ns
        );
        assert_eq!(stats(&pic).credits, 1);
        assert_eq!(balance(&pic, ledger, id), 2_000_000);
        maintenance(&pic);
        assert_eq!(funding(&pic, id).total_converted_e8s, "101980000");
        assert_eq!(stats(&pic).credits, 2);
        maintenance(&pic);
        assert_eq!(outgoing(&pic, id, index).len(), 2);
    }
}

#[test]
fn funding_actual_changed_fee_dust_accumulation_and_rejected_game_payments() {
    for fee in [10_000, 20_000] {
        let (pic, id, ledger, index, payer) = setup_fee(bytes("B2Z_S14_WASM"), fee);
        enabled(&pic, id, true);
        maintenance(&pic);
        assert_eq!(funding(&pic, id).observed_balance.unwrap().e8s, 0);
        assert_eq!(funding(&pic, id).observed_fee.unwrap().e8s, fee);
        deposit(&pic, ledger, payer, id, fee - 1);
        maintenance(&pic);
        assert_eq!(balance(&pic, ledger, id), fee - 1);
        assert_eq!(stats(&pic).credits, 0);
        let minimum = fee * 100;
        for _ in 0..2 {
            deposit(&pic, ledger, payer, id, minimum / 3);
            maintenance(&pic);
            assert_eq!(stats(&pic).credits, 0);
        }
        deposit(&pic, ledger, payer, id, minimum / 3 + 3);
        let incoming = balance(&pic, ledger, id);
        maintenance(&pic);
        let s = funding(&pic, id);
        assert_eq!(s.total_converted_e8s, (incoming - fee).to_string());
        assert_eq!(s.last_success.unwrap().plan.fee_e8s, fee);
        assert_eq!(balance(&pic, ledger, id), 0);
        assert_eq!(stats(&pic).credits, 1);
        start_arena(&pic, id);
        for _ in 0..30 {
            tick(&pic);
        }
        let world = arena_world(&pic, id);
        assert_eq!(world.received_e8s, Int(incoming.into()));
        assert!(world.cannons.is_empty());
        assert_eq!(work(&pic, id).0, 0);
        assert_eq!(outgoing(&pic, id, index).len(), 1);
        let received = world.received_e8s;
        maintenance(&pic);
        assert_eq!(arena_world(&pic, id).received_e8s, received);
        assert_eq!(stats(&pic).credits, 1);
    }
}

#[test]
fn funding_low_liquid_cycles_defer_then_recover_without_browser() {
    let (pic, id, ledger, _, payer) = setup(bytes("B2Z_S14_TEST_WASM"));
    deposit(&pic, ledger, payer, id, 100_000_000);
    get_result::<Status>(
        &pic,
        id,
        "test_liquid_budget",
        candid::encode_one(100_000_000_000u64).unwrap(),
    );
    enabled(&pic, id, true);
    maintenance(&pic);
    let s = funding(&pic, id);
    assert_eq!(status(&pic, id).run.pace.unwrap().mode, "ReserveProtection");
    assert!(matches!(s.phase, Phase::Idle));
    assert!(s.last_error.unwrap().contains("insufficient liquid cycles"));
    assert_eq!(balance(&pic, ledger, id), 100_000_000);
    assert_eq!(stats(&pic).calls, 0);
    pic.add_cycles(id, 1_000_000_000_000);
    maintenance(&pic);
    assert_eq!(stats(&pic).credits, 1);
    assert_eq!(balance(&pic, ledger, id), 0);
    assert_eq!(
        status(&pic, id).run.pace.unwrap().mode,
        "ReserveProtection",
        "treasury recovery must not depend on gameplay admission reopening"
    );
}

#[test]
fn funding_refund_and_terminal_notification_halt_with_evidence() {
    for error in ["refund", "invalid", "old"] {
        let (pic, id, ledger, index, payer) = setup(bytes("B2Z_S14_WASM"));
        deposit(&pic, ledger, payer, id, 100_000_000);
        mode(&pic, error);
        enabled(&pic, id, true);
        maintenance(&pic);
        let s = funding(&pic, id);
        assert!(s.halted, "{error}: {:?}", s.last_error);
        assert_eq!(s.total_converted_e8s, "0");
        assert_eq!(stats(&pic).credits, 0);
        if error == "refund" {
            assert!(matches!(s.phase, Phase::Idle));
            let refund = s.last_refund.unwrap();
            assert!(refund.refund_block.unwrap() > refund.transfer_block);
            assert_eq!(balance(&pic, ledger, id), 99_980_000);
        } else {
            assert!(matches!(s.phase, Phase::NotifyPending { .. }));
            assert_eq!(balance(&pic, ledger, id), 0);
        }
        let calls = stats(&pic).calls;
        enabled(&pic, id, false);
        enabled(&pic, id, true);
        maintenance(&pic);
        assert_eq!(stats(&pic).calls, calls);
        assert_eq!(outgoing(&pic, id, index).len(), 1);
        assert!(funding(&pic, id).halted);
        if error == "refund" {
            // Preserve the existing gross-incoming/invalid-command policy.
            // The treasury observes actual balance instead of using this tally.
            start_arena(&pic, id);
            for _ in 0..30 {
                tick(&pic);
            }
            let world = arena_world(&pic, id);
            assert_eq!(world.received_e8s, Int::from(199_980_000));
            assert!(world.cannons.is_empty());
            assert_eq!(work(&pic, id).0, 0);
            assert!(
                status(&pic, id).source.admitted_to_exclusive
                    > funding(&pic, id).last_refund.unwrap().refund_block.unwrap()
            );
        }
    }
}

#[test]
fn funding_expired_ambiguous_transfer_never_creates_replacement() {
    let (pic, id, ledger, index, payer) = setup(bytes("B2Z_S14_TEST_WASM"));
    deposit(&pic, ledger, payer, id, 100_000_000);
    fault(&pic, id, "after-transfer");
    enabled(&pic, id, true);
    maintenance(&pic);
    let pending = funding(&pic, id);
    assert!(matches!(
        pending.phase,
        Phase::TransferPending {
            uncertain: true,
            ..
        }
    ));
    pic.upgrade_canister(
        id,
        bytes("B2Z_S14_WASM"),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    pic.advance_time(Duration::from_secs(26 * 3600));
    settle(&pic);
    let expired = funding(&pic, id);
    assert!(expired.halted, "{:?}", expired.last_error);
    assert_eq!(expired.total_converted_e8s, "0");
    assert_eq!(expired.last_plan_ns, pending.last_plan_ns);
    assert!(matches!(
        expired.phase,
        Phase::TransferPending {
            uncertain: true,
            ..
        }
    ));
    deposit(&pic, ledger, payer, id, 2_000_000);
    maintenance(&pic);
    assert_eq!(balance(&pic, ledger, id), 2_000_000);
    assert_eq!(stats(&pic).credits, 0);
    assert_eq!(outgoing(&pic, id, index).len(), 1);
}

#[test]
fn funding_bounded_empty_maintenance_overhead() {
    let (pic, id, _, _, _) = setup(bytes("B2Z_S14_WASM"));
    let mut measurements = Vec::new();
    for enabled_now in [false, true] {
        enabled(&pic, id, enabled_now);
        let before = pic.cycle_balance(id);
        let started = pic.get_time();
        let previous = status(&pic, id);
        for _ in 0..3 {
            maintenance(&pic);
        }
        let after = status(&pic, id);
        measurements.push(serde_json::json!({"funding_enabled":enabled_now,
            "cycles_spent": (before - pic.cycle_balance(id)).to_string(),
            "virtual_seconds": (pic.get_time().as_nanos_since_unix_epoch()-started.as_nanos_since_unix_epoch()) as f64 / 1e9, "maintenance_intervals":3,
            "index_calls":after.source.index_calls-previous.source.index_calls,
            "segments":after.run.completed_segments-previous.run.completed_segments}));
        assert_eq!(
            after.run.completed_segments,
            previous.run.completed_segments
        );
        assert_eq!(stats(&pic).calls, 0);
    }
    println!(
        "FUNDING_MAINTENANCE_COST {}",
        serde_json::json!(measurements)
    );
}

/// Both durable stores and both timers coexist: outgoing Ledger rows straddle
/// the exclusive epoch fence while a notification survives commit and upgrade.
#[test]
fn funding_torus_cutover_preserves_pending_finance_and_outgoing_classification() {
    let (pic, id, ledger, index, payer) = setup(bytes("B2Z_S14_TEST_WASM"));
    start_arena(&pic, id);
    let join = transfer_text(&pic, ledger, payer, id, 100_000_000, b"ANGLE 37.5");
    for _ in 0..120 {
        tick(&pic);
        if arena_world(&pic, id).cannons.len() == 1 && work(&pic, id).0 == 0 {
            break;
        }
    }
    assert_eq!(
        arena_world(&pic, id).received_e8s,
        Int(100_000_000u64.into())
    );
    enabled(&pic, id, true);
    maintenance(&pic);
    enabled(&pic, id, false);
    let first = funding(&pic, id).last_success.unwrap().block_index;
    assert!(first > join);
    // Invalid and underfunded incoming commands must finish under v3 too.
    let invalid = transfer_text(&pic, ledger, payer, id, 2_000_000, b"ANGLE NaN");
    let underfunded = transfer_text(&pic, ledger, payer, id, 1, b"ANGLE 225");
    for _ in 0..120 {
        tick(&pic);
        if status(&pic, id).source.admitted_to_exclusive > underfunded && work(&pic, id).0 == 0 {
            break;
        }
    }
    assert_eq!(
        arena_world(&pic, id).received_e8s,
        Int(102_000_001u64.into())
    );
    get_result::<Status>(&pic, id, "pause_autonomous", encode_args(()).unwrap());
    settle(&pic);
    let _: Vec<u8> = get_result(
        &pic,
        id,
        "prepare_torus_transition",
        encode_args(()).unwrap(),
    );
    for _ in 0..120 {
        if transition_view(&pic, id).unwrap().ledger_cutover.is_some() {
            break;
        }
        tick(&pic);
    }
    let cutover =
        u64::try_from(transition_view(&pic, id).unwrap().ledger_cutover.unwrap().0).unwrap();
    assert!(first < cutover && invalid < cutover && underfunded < cutover);
    // The treasury remains autonomous during the source hold. Lose its transfer
    // reply, retain the original plan, and upgrade while that plan is pending.
    fault(&pic, id, "after-transfer");
    enabled(&pic, id, true);
    maintenance(&pic);
    enabled(&pic, id, false);
    let pending = funding(&pic, id);
    assert!(matches!(pending.phase, Phase::TransferPending { .. }));
    for _ in 0..90 {
        tick(&pic);
        if outgoing(&pic, id, index).len() == 2 {
            break;
        }
    }
    let during = outgoing(&pic, id, index)
        .into_iter()
        .map(|r| r.id)
        .max()
        .unwrap();
    assert!(during >= cutover);
    pic.upgrade_canister(
        id,
        bytes("B2Z_S14_WASM"),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    assert_eq!(
        candid::encode_one(&funding(&pic, id).phase).unwrap(),
        candid::encode_one(&pending.phase).unwrap()
    );
    start_arena(&pic, id);
    for _ in 0..120 {
        tick(&pic);
        if transition_view(&pic, id).unwrap().phase == "ready" && transition_drained(&pic, id) {
            break;
        }
    }
    assert_eq!(transition_view(&pic, id).unwrap().phase, "ready");
    mode(&pic, "processing");
    enabled(&pic, id, true);
    maintenance(&pic);
    enabled(&pic, id, false);
    let checkpoint_pending = funding(&pic, id);
    assert!(matches!(
        checkpoint_pending.phase,
        Phase::NotifyPending { .. }
    ));
    let before = arena_world(&pic, id);
    let cursor = status(&pic, id).source.admitted_to_exclusive;
    assert_eq!(cursor, underfunded + 1);
    assert!(cursor <= cutover);
    let manifest = observe(&pic, id).1.head.manifest_hash;
    let _: Vec<u8> = get_result(
        &pic,
        id,
        "commit_torus_transition",
        candid::encode_one(manifest).unwrap(),
    );
    assert_eq!(arena_world(&pic, id).credits, before.credits);
    assert_eq!(arena_world(&pic, id).received_e8s, before.received_e8s);
    assert_eq!(
        candid::encode_one(&funding(&pic, id).phase).unwrap(),
        candid::encode_one(&checkpoint_pending.phase).unwrap()
    );
    pic.upgrade_canister(
        id,
        bytes("B2Z_S14_WASM"),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    assert_eq!(
        candid::encode_one(&funding(&pic, id).phase).unwrap(),
        candid::encode_one(&checkpoint_pending.phase).unwrap()
    );
    mode(&pic, "");
    enabled(&pic, id, true);
    maintenance(&pic);
    assert!(matches!(funding(&pic, id).phase, Phase::Idle));
    assert_eq!(stats(&pic).credits, 2);
    assert_eq!(
        outgoing(&pic, id, index).len(),
        2,
        "retry must not duplicate transfer"
    );
    // A third sweep after activation remains an outgoing non-command in v4.
    let last = transfer_text(&pic, ledger, payer, id, 2_000_000, b"ANGLE NaN");
    maintenance(&pic);
    enabled(&pic, id, false);
    for _ in 0..120 {
        tick(&pic);
        if status(&pic, id).source.admitted_to_exclusive > last + 1 && work(&pic, id).0 == 0 {
            break;
        }
    }
    let out = outgoing(&pic, id, index);
    assert_eq!(out.len(), 3);
    assert!(out.iter().any(|r| r.id > last));
    for row in &out {
        let (mut adapter, _) = source::SourceState::configured(
            IndexConfig {
                network: "pocketic-local".into(),
                ledger,
                index,
                receiving_subaccount: 0,
                event_horizon: None,
                starting_policy: StartingPolicy::FromBeginning,
            },
            id,
        )
        .unwrap();
        adapter
            .page(source::History {
                balance: 0,
                oldest_tx_id: Some(row.id),
                transactions: vec![row.clone()],
            })
            .unwrap();
        assert!(adapter.admission(&"00".repeat(32)).unwrap().1.is_empty());
    }
    assert_eq!(
        arena_world(&pic, id).received_e8s,
        Int(104_000_001u64.into())
    );
    assert_eq!(arena_world(&pic, id).version, 4);
    assert_eq!(arena_world(&pic, id).width, 32);
    assert_eq!(arena_world(&pic, id).cannons.len(), 1);
    assert_eq!(stats(&pic).credits, 3);
    println!(
        "FUNDING_TORUS_CUTOVER PASS cutover={cutover} before={first} during={during} after={:?}",
        out.iter().map(|r| r.id).collect::<Vec<_>>()
    );
}
