//! Fresh normal genesis/epochs and bounded default Application (13-node cost) probes.
use super::*;

fn output(name: &str, value: serde_json::Value) {
    let out = PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap());
    std::fs::create_dir_all(&out).unwrap();
    std::fs::write(out.join(name), serde_json::to_vec_pretty(&value).unwrap()).unwrap();
}
fn settle(pic: &PocketIc) {
    for _ in 0..20 {
        pic.advance_time(Duration::from_millis(10));
        pic.tick();
    }
}
fn advance(pic: &PocketIc, seconds: u64) {
    for _ in 0..seconds {
        tick(pic);
    }
    settle(pic);
}
fn interval(pic: &PocketIc, id: Principal, seconds: u64) {
    get_result::<()>(
        pic,
        id,
        "test_source_interval",
        candid::encode_one(seconds).unwrap(),
    );
}

fn activate(pic: &PocketIc, id: Principal) -> Vec<serde_json::Value> {
    let mut epochs = vec![];
    for prefix in ["torus", "million", "playability", "entry"] {
        get_result::<Vec<u8>>(
            &pic,
            id,
            &format!("prepare_{prefix}_transition"),
            encode_args(()).unwrap(),
        );
        let mut ready = false;
        for _ in 0..100 {
            tick(&pic);
            let raw: Vec<u8> = get_query(
                &pic,
                id,
                &format!("{prefix}_transition_status"),
                encode_args(()).unwrap(),
            );
            let t: serde_json::Value = decode(&raw).unwrap();
            let t = t.get("transition").unwrap_or(&t);
            if t["phase"] == "ready" && observe(&pic, id).1.head.seal.is_some() {
                ready = true;
                break;
            }
        }
        assert!(
            ready,
            "{prefix} did not drain its authenticated source fence"
        );
        println!("ready authenticated {prefix} predecessor");
        let prior = observe(&pic, id).1;
        let manifest = prior.head.manifest_hash.clone();
        let raw: Vec<u8> = get_result(
            &pic,
            id,
            &format!("commit_{prefix}_transition"),
            candid::encode_one(manifest.clone()).unwrap(),
        );
        let after = observe(&pic, id).1;
        let w = arena_world(&pic, id);
        assert!(w.cannons.is_empty() && w.balls.is_empty() && w.credits.is_empty());
        assert_eq!(w.received_e8s, 0.into());
        assert_eq!(status(&pic, id).source.admitted_to_exclusive, 0);
        assert_eq!(after.identity.source_id, prior.identity.source_id);
        epochs.push(serde_json::json!({"stage":prefix,"previous_manifest":manifest,"publication":after,"transition":decode::<serde_json::Value>(&raw).unwrap()}));
    }
    epochs
}

#[test]
fn europe_fresh_normal_empty_genesis_authenticated_epochs_and_external_payment() {
    let module = bytes("B2Z_S14_WASM");
    let (pic, id, ledger, payer) = arena_setup(module.clone());
    let start = arena_world(&pic, id);
    assert!(start.cannons.is_empty() && start.balls.is_empty() && start.credits.is_empty());
    assert_eq!(start.received_e8s, 0.into());
    assert_eq!(status(&pic, id).source.admitted_to_exclusive, 0);
    let epochs = activate(&pic, id);
    assert_eq!(arena_world(&pic, id).version, 6);
    assert_eq!(arena_world(&pic, id).width, 1000);
    assert_eq!(
        observe(&pic, id).1.identity.config_hash,
        b2z_native::entry_v7::identity().unwrap()["config_hash"]
            .as_str()
            .unwrap()
    );
    let clean = arena_world(&pic, id).encode().unwrap();
    pic.upgrade_canister(id, module, encode_args(()).unwrap(), Some(controller()))
        .unwrap();
    settle(&pic);
    assert_eq!(arena_world(&pic, id).encode().unwrap(), clean);
    start_arena(&pic, id);
    let sent = pic.get_time().as_nanos_since_unix_epoch();
    let mut admitted = None;
    let at = transfer_text(&pic, ledger, payer, id, 100_000_000, b"NEW 37.5 1");
    for _ in 0..180 {
        tick(&pic);
        if admitted.is_none() && status(&pic, id).source.admitted_to_exclusive > at {
            admitted = Some(pic.get_time().as_nanos_since_unix_epoch());
        }
        if arena_world(&pic, id).cannons.len() == 1 {
            break;
        }
    }
    let paid = arena_world(&pic, id);
    assert_eq!(
        paid.cannons.len(),
        1,
        "ordinary Ledger payment works without site or poke"
    );
    assert_eq!(
        paid.cannons[0].account,
        AccountIdentifier::new(&payer, &DEFAULT_SUBACCOUNT).to_hex()
    );
    assert_eq!(paid.received_e8s, 100_000_000.into());
    assert_eq!(status(&pic, id).source.admitted_to_exclusive, at + 1);
    output(
        "europe-fresh.json",
        serde_json::json!({"status":"PASS","backend":id,"recipient":AccountIdentifier::new(&id,&DEFAULT_SUBACCOUNT).to_hex(),"normal_module_sha256":dtr_wire::hash(&bytes("B2Z_S14_WASM")),"epochs":epochs,"empty_state_hex":hex(&clean),"payment":at,"virtual_payment_to_admission_seconds":(admitted.unwrap()-sent) as f64/1e9,"virtual_payment_to_applied_seconds":(pic.get_time().as_nanos_since_unix_epoch()-sent) as f64/1e9,"no_website_or_poke":true,"upgrade_preserved_clean_world":true}),
    );
}

#[test]
fn europe_empty_reconciliation_and_maintenance_costs() {
    let mut rows = vec![];
    // Equal one-hour virtual windows, with no simulation, credits or payments.
    for (seconds, treasury_enabled) in
        [(0, false), (0, true), (60, true), (600, true), (3600, true)]
    {
        let (pic, id, _, _) = arena_setup(bytes("B2Z_S14_TEST_WASM"));
        interval(&pic, id, seconds);
        get_result::<candid::Reserved>(
            &pic,
            id,
            "set_funding_paused",
            candid::encode_one(!treasury_enabled).unwrap(),
        );
        settle(&pic);
        let before = status(&pic, id);
        let balance = pic.cycle_balance(id);
        let began = pic.get_time().as_nanos_since_unix_epoch();
        for _ in 0..60 {
            pic.advance_time(Duration::from_secs(60));
            for _ in 0..20 {
                pic.tick();
            }
        }
        settle(&pic);
        let after = status(&pic, id);
        let end = pic.cycle_balance(id);
        assert!(!after.source.scan_in_flight);
        assert_eq!(after.source.admitted_to_exclusive, 0);
        assert_eq!(after.run.completed_segments, 0);
        println!(
            "completed empty-cost fallback {seconds}: debit={} calls={}",
            balance - end,
            after.source.index_calls - before.source.index_calls
        );
        rows.push(serde_json::json!({"fallback_seconds":seconds,"treasury_enabled":treasury_enabled,"window_seconds":(pic.get_time().as_nanos_since_unix_epoch()-began) as f64/1e9,"settled_cycles":(balance-end).to_string(),"index_calls":after.source.index_calls-before.source.index_calls,"treasury_credits":0,"active_simulation":false,"configuration":"PocketIC default Application / 13-node normal cost schedule; not physical consensus or target-subnet capacity evidence"}));
    }
    output(
        "europe-polling-costs.json",
        serde_json::json!({"status":"PASS","scope":"Actual settled backend cycle debits, no attached-call reservation estimate or treasury credit","rows":rows}),
    );
}

#[test]
fn europe_low_floor_transition_and_recovery_headroom() {
    let (pic, id, ledger, payer) = arena_setup(bytes("B2Z_S14_TEST_WASM"));
    activate(&pic, id);
    start_arena(&pic, id);
    transfer_text(&pic, ledger, payer, id, 100_000_000, b"NEW 0 1");
    for _ in 0..180 {
        tick(&pic);
        if arena_world(&pic, id).cannons.len() == 1 {
            break;
        }
    }
    assert_eq!(arena_world(&pic, id).balls.len(), 1);
    get_result::<Status>(&pic, id, "pause_autonomous", encode_args(()).unwrap());
    get_result::<Status>(
        &pic,
        id,
        "test_liquid_budget",
        candid::encode_one(1_400_000_000_000u64).unwrap(),
    );
    let execution_before = pic.cycle_balance(id);
    let segments = status(&pic, id).run.completed_segments;
    start_arena(&pic, id);
    for _ in 0..150 {
        tick(&pic);
        if status(&pic, id).run.completed_segments > segments {
            break;
        }
    }
    assert!(
        status(&pic, id).run.completed_segments > segments,
        "Trickle must execute while its scheduling liquid balance permits"
    );
    let execution_debit = execution_before - pic.cycle_balance(id);
    get_result::<Status>(&pic, id, "pause_autonomous", encode_args(()).unwrap());
    get_result::<Status>(
        &pic,
        id,
        "test_liquid_budget",
        candid::encode_one(900_000_000_000u64).unwrap(),
    );
    let before = pic.cycle_balance(id);
    let world = arena_world(&pic, id).encode().unwrap();
    start_arena(&pic, id);
    advance(&pic, 65);
    assert_eq!(status(&pic, id).run.pace.unwrap().mode, "ReserveProtection");
    assert_eq!(arena_world(&pic, id).encode().unwrap(), world);
    assert!(status(&pic, id).run.last_error.is_none());
    get_result::<Status>(&pic, id, "pause_autonomous", encode_args(()).unwrap());
    pic.upgrade_canister(
        id,
        bytes("B2Z_S14_WASM"),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    advance(&pic, 305);
    assert_eq!(arena_world(&pic, id).encode().unwrap(), world);
    assert!(status(&pic, id).source.last_error.is_none());
    let remaining = pic.cycle_balance(id);
    let health: Liquid = get_query(&pic, id, "controller_runtime", encode_args(()).unwrap());
    assert!(
        before - remaining < 100_000_000_000,
        "bounded protected recovery margin exhausted"
    );
    output(
        "europe-floor.json",
        serde_json::json!({"status":"PASS","active_test_liquid_target":"1400000000000","protected_test_liquid_target":"900000000000","settled_active_execution_cycles":execution_debit.to_string(),"settled_protection_upgrade_maintenance_cycles":(before-remaining).to_string(),"test_budget_burn_excluded":true,"after_total_cycles":health.total_cycles.to_string(),"after_query_liquid_cycles":health.liquid_cycles.to_string(),"source_call_floor":"150000000000","treasury_call_floor":"200000000000","transition_floor":"500000000000","application_protection_floor":"1000000000000","reservation_observation":"The 0.9T liquid-budget context selects Reserve below the 1T exit and preserves the world without errors. A query or previous ingress liquid balance is not the later scheduling balance; reserves are not subtracted a second time.","scope":"Current-rules million-cell/one-ball execution and protected recovery; maximum-population capacity and indefinite lifetime are not claimed"}),
    );
}

#[test]
fn europe_hint_costs_and_independent_fallback() {
    let (pic, base, ledger, _) = arena_setup(bytes("B2Z_S14_WASM"));
    let index = pic.topology().get_app_subnets();
    assert_eq!(index.len(), 1);
    // A second disposable backend in this same ordinary Application instance.
    let target = create_controlled(&pic);
    let sender = create_controlled(&pic);
    pic.add_cycles(target, 100_000_000_000_000);
    pic.add_cycles(sender, 100_000_000_000_000);
    let source_index = status(&pic, base).source.index;
    pic.install_canister(
        sender,
        poke_forwarder(target),
        encode_args(()).unwrap(),
        Some(controller()),
    );
    pic.install_canister(
        target,
        bytes("B2Z_S14_TEST_WASM"),
        encode_args((
            initial_world(),
            0u64,
            IndexConfig {
                network: "pocketic-local".into(),
                ledger,
                index: source_index,
                receiving_subaccount: 0,
                event_horizon: Some(sender),
                starting_policy: StartingPolicy::FromBeginning,
            },
        ))
        .unwrap(),
        Some(controller()),
    );
    advance(&pic, 5);
    interval(&pic, target, 3600);
    settle(&pic);
    let relevant = vec![PokeMatch {
        target: PokeTarget::subaccount(0),
        max_amount: 999_999u64.into(),
    }];
    assert!(
        pic.update_call(
            target,
            controller(),
            "poke",
            candid::encode_one(&relevant).unwrap()
        )
        .is_err()
    );
    let before = pic.cycle_balance(target);
    let sender_before = pic.cycle_balance(sender);
    let calls = status(&pic, target).source.index_calls;
    for _ in 0..4 {
        pic.update_call(
            sender,
            controller(),
            "forward",
            candid::encode_one(Vec::<PokeMatch>::new()).unwrap(),
        )
        .unwrap();
    }
    settle(&pic);
    assert_eq!(status(&pic, target).source.index_calls, calls);
    let ignored = before - pic.cycle_balance(target);
    let begin = pic.cycle_balance(target);
    pic.update_call(
        sender,
        controller(),
        "forward",
        candid::encode_one(relevant).unwrap(),
    )
    .unwrap();
    advance(&pic, 12);
    let hint = begin - pic.cycle_balance(target);
    let after = status(&pic, target);
    assert!(after.source.index_calls - calls >= 3);
    assert_eq!(
        after.source.admitted_to_exclusive, 0,
        "hint data never supplies payment authority"
    );
    assert_eq!(arena_world(&pic, target).received_e8s, 0.into());
    let hint_calls = after.source.index_calls - calls;
    for _ in 0..60 {
        pic.advance_time(Duration::from_secs(60));
        for _ in 0..20 {
            pic.tick();
        }
    }
    let final_status = status(&pic, target);
    assert!(
        final_status.source.index_calls > after.source.index_calls,
        "hints cannot postpone the original fallback deadline"
    );
    output(
        "europe-hint-costs.json",
        serde_json::json!({"status":"PASS","ignored_four_target_cycle_debit":ignored.to_string(),"valid_hint_and_bounded_retry_target_debit":hint.to_string(),"bounded_retry_index_calls":hint_calls,"sender_cycle_debit_including_forwarding":(sender_before-pic.cycle_balance(sender)).to_string(),"no_payload_admission":true,"independent_hourly_experimental_deadline":true,"production_fallback":60,"service_health_queries":0,"service_health":"Unavailable on deployed Event Horizon; no assistance activated"}),
    );
}

#[test]
fn europe_trickle_bounded_real_cadence() {
    let (pic, id, _, _) = arena_setup_world_fee_clock(
        bytes("B2Z_S14_TEST_WASM"),
        pace_world().encode().unwrap(),
        10_000,
        300,
    );
    pic.set_time(std::time::SystemTime::now().into());
    get_result::<Status>(
        &pic,
        id,
        "test_liquid_budget",
        candid::encode_one(1_800_000_000_000u64).unwrap(),
    );
    pic.upgrade_canister(
        id,
        bytes("B2Z_S14_WASM"),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    assert_eq!(status(&pic, id).run.pace.unwrap().mode, "Trickle");
    let mut live =
        PocketIc::new_from_existing_instance(pic.get_server_url(), pic.instance_id(), None);
    let _gateway = live.make_live(None);
    start_arena(&pic, id);
    let began = std::time::Instant::now();
    while status(&pic, id).run.completed_segments == 0 {
        assert!(began.elapsed() < Duration::from_secs(15));
        std::thread::sleep(Duration::from_millis(200));
    }
    let first = observe(&pic, id).1;
    let began = std::time::Instant::now();
    while began.elapsed() < Duration::from_secs(104) {
        std::thread::sleep(Duration::from_secs(2));
    }
    let after = observe(&pic, id).1;
    let elapsed = began.elapsed().as_secs_f64();
    assert_eq!(
        after.head.logical_end.0 - first.head.logical_end.0,
        1.into()
    );
    assert_eq!(status(&pic, id).run.pace.unwrap().supported_milli, 10);
    output(
        "europe-trickle-real-cadence.json",
        serde_json::json!({"status":"PASS","real_wall_seconds":elapsed,"additional_logical_ticks":1,"normal_wasm":true,"mode":"Trickle","nominal_milli":10,"scope":"Bounded real-cadence normal-Wasm scheduler observation on synthetic v3 trajectory fixture; not fresh-genesis or browser certificate evidence"}),
    );
}

#[derive(CandidType, Deserialize)]
struct Liquid {
    liquid_cycles: candid::Nat,
    total_cycles: candid::Nat,
}
#[test]
#[ignore = "explicit 1.5T starting-budget probe; set B2Z_PROFILE_INITIAL_CYCLES"]
fn europe_natural_initial_budget_activates_rules_and_stays_protected() {
    assert_eq!(
        std::env::var("B2Z_PROFILE_INITIAL_CYCLES").as_deref(),
        Ok("1500000000000")
    );
    let (pic, id, _, _) = arena_setup(bytes("B2Z_S14_WASM"));
    let before: Liquid = get_query(&pic, id, "controller_runtime", encode_args(()).unwrap());
    activate(&pic, id);
    start_arena(&pic, id);
    let world = arena_world(&pic, id).encode().unwrap();
    advance(&pic, 65);
    let status = status(&pic, id);
    let after: Liquid = get_query(&pic, id, "controller_runtime", encode_args(()).unwrap());
    assert!(status.source.binding_checked && status.source.last_error.is_none());
    assert_eq!(arena_world(&pic, id).version, 6);
    assert_eq!(status.run.pace.unwrap().mode, "ReserveProtection");
    assert_eq!(world, arena_world(&pic, id).encode().unwrap());
    output(
        "europe-natural-initial-budget.json",
        serde_json::json!({"status":"PASS","initial_cycles":"1500000000000","before_total":before.total_cycles.to_string(),"before_liquid":before.liquid_cycles.to_string(),"after_total":after.total_cycles.to_string(),"after_liquid":after.liquid_cycles.to_string(),"selected_mode":"ReserveProtection","current_rules":true,"healthy_source":true,"scope":"Disposable default Application 13-node cost schedule; estimate for target budget, not an actual mainnet post-install balance"}),
    );
}
