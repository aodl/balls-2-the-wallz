//! One focused release rehearsal. Fixture setup is synthetic; all following payments
//! use the real valueless Ledger/Index under the frozen normal production predecessor.
use super::*;
use b2z_native::world::World;
#[derive(serde::Deserialize, serde::Serialize)]
struct ClearanceReceipt {
    position: Int,
    account: String,
    amount: Int,
    amount_used: Int,
    remainder: Int,
    reason: String,
    status: String,
}
#[derive(serde::Deserialize)]
struct ClearanceEvents {
    receipts: Vec<ClearanceReceipt>,
}
fn pause(pic: &PocketIc, id: Principal) {
    get_result::<Status>(pic, id, "pause_autonomous", encode_args(()).unwrap());
}
fn tick_record(pic: &PocketIc, id: Principal, rows: &mut Vec<Publication>, out: &Path) {
    tick(pic);
    playability_installed::record(pic, id, rows, out);
}
fn live_record(pic: &PocketIc, id: Principal, rows: &mut Vec<Publication>, out: &Path) {
    std::thread::sleep(Duration::from_millis(100));
    playability_installed::record(pic, id, rows, out);
}
fn save(out: &Path, name: &str, v: &serde_json::Value) {
    std::fs::write(out.join(name), serde_json::to_vec_pretty(v).unwrap()).unwrap();
}
#[test]
#[ignore = "explicit paid v6 upgrade/entry-rules/browser rehearsal; disposable IC only"]
fn full_world_upgrade_and_first_entry() {
    let prior = bytes("B2Z_ENTRY_PRIOR_WASM");
    assert_eq!(
        dtr_wire::hash(&prior),
        "b618e4f34b429484263cd0a09efc1865d646733540ff66eec0e5f16f3b2b9a2e"
    );
    run_entry_and_clearance(prior, true, None);
}
/// Current normal module, real valueless Ledger/Index, v6→v7→v9 boundaries.
/// Historical Wasm upgrade remains the separately pinned ignored rehearsal above.
#[test]
fn clearance_rules9_on_normal_installed_module() {
    run_entry_and_clearance(bytes("B2Z_S14_WASM"), false, None);
}
#[test]
#[ignore = "exact installed European rules7 module upgrade; disposable IC only"]
fn european_rules7_upgrade_and_clearance() {
    let old = bytes("B2Z_EUROPEAN_PRIOR_WASM");
    assert_eq!(
        dtr_wire::hash(&old),
        "612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948"
    );
    run_entry_and_clearance(bytes("B2Z_S14_WASM"), false, Some(old));
}
fn run_entry_and_clearance(
    prior: Vec<u8>,
    historical_upgrade: bool,
    european_prior: Option<Vec<u8>>,
) {
    let out = PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap());
    std::fs::create_dir_all(&out).unwrap();
    let candidate = bytes("B2Z_S14_WASM");
    let repo = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    let fixture: serde_json::Value =
        serde_json::from_slice(&std::fs::read(repo.join("tests/fixtures/rules-v6.json")).unwrap())
            .unwrap();
    let mut world =
        World::decode(&unhex(fixture["cases"]["idle"]["state_hex"].as_str().unwrap()).unwrap())
            .unwrap();
    let payer = Principal::self_authenticating([9; 32]);
    let extra = Principal::self_authenticating([10; 32]);
    let account = AccountIdentifier::new(&payer, &DEFAULT_SUBACCOUNT).to_hex();
    world.cannons[0].account = account.clone();
    for p in &mut world.playability.as_mut().unwrap().players {
        p.account = account.clone();
    }
    for c in &mut world.credits {
        c.account = account.clone();
    }
    let own = world.ownership.as_mut().unwrap();
    own.base.fill(1);
    own.overrides.clear();
    own.counts = vec![b2z_native::world::OwnerCount {
        owner: 1,
        cells: 1000000,
    }];
    let b = world.balls[0].clone();
    world.balls = (1..=3)
        .map(|id| {
            let mut b = b.clone();
            b.id = id;
            b.vx = 32000;
            b.vy = 0; // Horizontal fixture rows keep both players visible through admission.
            b
        })
        .collect();
    world.next_ball_id = 4;
    world.validate().unwrap();
    let initial = world.clone();
    let (pic, id, ledger, _) = arena_setup_world_fee_clock_payers(
        bytes(if historical_upgrade {
            "B2Z_ENTRY_FIXTURE_WASM"
        } else {
            "B2Z_S14_TEST_WASM"
        }),
        world.encode().unwrap(),
        10000,
        3600,
        &[extra],
    );
    playability_installed::funding_paused(&pic, id, true);
    // Setup-only test hooks disappear before any qualified payment or release action.
    pic.upgrade_canister(
        id,
        prior.clone(),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    let mut rows = vec![];
    let mut payments = BTreeMap::new();
    playability_installed::configuration(&pic, id, 512);
    for _ in 0..20 {
        tick_record(&pic, id, &mut rows, &out);
        if arena_world(&pic, id).time > initial.time {
            break;
        }
    }
    pause(&pic, id);
    let text = b"FIRE 1 0 1";
    let position = transfer_text(&pic, ledger, payer, id, 90000000, text);
    let memo = b2z_protocol::v6::encode(b2z_protocol::v6::parse_text(text).unwrap()).unwrap();
    payments.insert(
        position,
        normalized(
            AccountIdentifier::new(&payer, &DEFAULT_SUBACCOUNT),
            90000000,
            memo,
        ),
    );
    playability_installed::configuration(&pic, id, 512);
    for _ in 0..180 {
        tick_record(&pic, id, &mut rows, &out);
        if arena_world(&pic, id).balls.len() == 4 {
            break;
        }
    }
    assert_eq!(arena_world(&pic, id).balls.len(), 4);
    pause(&pic, id);
    playability_installed::configuration(&pic, id, 1);
    let mut unfinished = false;
    for _ in 0..30 {
        tick_record(&pic, id, &mut rows, &out);
        let w: playability_installed::BoundaryWork =
            get_query(&pic, id, "controller_work", encode_args(()).unwrap());
        if w.phase.is_some() {
            unfinished = true;
            break;
        }
    }
    pause(&pic, id);
    assert!(unfinished);
    // Restore install-code credit while paused; these setup seconds are not a cost claim.
    for _ in 0..600 {
        tick_record(&pic, id, &mut rows, &out);
    }
    let before = arena_world(&pic, id).encode().unwrap();
    let publication = observe(&pic, id).0.publication;
    let source_before = status(&pic, id).source;
    let finance_before = funding_tests::preserved_finance(&pic, id);
    let cycles = pic.cycle_balance(id);
    pic.upgrade_canister(
        id,
        candidate.clone(),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    assert_eq!(arena_world(&pic, id).encode().unwrap(), before);
    assert_eq!(observe(&pic, id).0.publication, publication);
    assert_eq!(
        status(&pic, id).source.admitted_to_exclusive,
        source_before.admitted_to_exclusive
    );
    assert_eq!(status(&pic, id).source.ledger, source_before.ledger);
    assert_eq!(status(&pic, id).source.index, source_before.index);
    assert_eq!(funding_tests::preserved_finance(&pic, id), finance_before);
    for method in [
        "prepare_entry_transition",
        "commit_entry_transition",
        "prepare_clearance_transition",
        "commit_clearance_transition",
    ] {
        let arg = if method.starts_with("commit") {
            candid::encode_one("00".repeat(32)).unwrap()
        } else {
            encode_args(()).unwrap()
        };
        let reply = pic.update_call(id, extra, method, arg).unwrap();
        assert!(decode_one::<std::result::Result<Vec<u8>, String>>(&reply)
            .unwrap()
            .is_err());
    }
    playability_installed::configuration(&pic, id, 512);
    for _ in 0..100 {
        tick_record(&pic, id, &mut rows, &out);
        if transition_drained(&pic, id) {
            break;
        }
    }
    pause(&pic, id);
    assert!(transition_drained(&pic, id));
    pic.set_time(pocket_ic::Time::from(std::time::SystemTime::now()));
    let mut live =
        PocketIc::new_from_existing_instance(pic.get_server_url(), pic.instance_id(), None);
    let gateway = live.make_live(None);
    playability_installed::configuration(&pic, id, 512);
    let browser_out = out.join("browser");
    std::fs::create_dir(&browser_out).unwrap();
    let source = status(&pic, id).source;
    save(
        &browser_out,
        "configuration.json",
        &serde_json::json!({"network":"pocketic-local","host":gateway.as_str(),"canister_id":id.to_text(),"ledger":ledger.to_text(),"index":source.index.to_text(),"recipient":AccountIdentifier::new(&id,&DEFAULT_SUBACCOUNT).to_hex(),"root_key_hex":hex(&pic.root_key().unwrap()),"new_player_account":AccountIdentifier::new(&extra,&DEFAULT_SUBACCOUNT).to_hex()}),
    );
    std::fs::write(browser_out.join("root-key.der"), pic.root_key().unwrap()).unwrap();
    save(
        &browser_out,
        "metadata.json",
        &serde_json::json!({"network":"pocketic-local","canister_id":id.to_text(),"root_key_sha256":dtr_wire::hash(&pic.root_key().unwrap())}),
    );
    let log = std::fs::File::create(browser_out.join("browser.log")).unwrap();
    let mut browser = OwnedBrowser(
        std::process::Command::new(std::env::var("S14_BROWSER_PYTHON").unwrap())
            .current_dir(&repo)
            .args([
                "tools/verify_s14_deployment.py",
                "--entry-scene-only",
                "--configuration",
                browser_out.join("configuration.json").to_str().unwrap(),
                "--gateway",
                gateway.as_str(),
                "--output",
                browser_out.to_str().unwrap(),
            ])
            .stdout(log.try_clone().unwrap())
            .stderr(log)
            .spawn()
            .unwrap(),
    );
    let start = std::time::Instant::now();
    while !browser_out.join("browser-v6-ready").exists() {
        assert!(
            start.elapsed() < Duration::from_secs(120),
            "browser old-rule readiness timeout"
        );
        assert!(
            browser.0.try_wait().unwrap().is_none(),
            "inspect browser/browser.log"
        );
        live_record(&pic, id, &mut rows, &out);
    }
    pause(&pic, id);
    get_result::<Vec<u8>>(
        &pic,
        id,
        "prepare_entry_transition",
        encode_args(()).unwrap(),
    );
    for _ in 0..1200 {
        live_record(&pic, id, &mut rows, &out);
        let raw: Vec<u8> = get_query(
            &pic,
            id,
            "entry_transition_status",
            encode_args(()).unwrap(),
        );
        let t: serde_json::Value = decode(&raw).unwrap();
        if t["transition"]["phase"] == "ready" && transition_drained(&pic, id) {
            break;
        }
    }
    assert!(transition_drained(&pic, id));
    let state = arena_world(&pic, id).encode().unwrap();
    let predecessor = observe(&pic, id).1;
    let previous_manifest = predecessor.head.manifest_hash.clone();
    let finance = funding_tests::preserved_finance(&pic, id);
    let _: Vec<u8> = get_result(
        &pic,
        id,
        "commit_entry_transition",
        candid::encode_one(predecessor.head.manifest_hash).unwrap(),
    );
    assert_eq!(arena_world(&pic, id).encode().unwrap(), state);
    assert_eq!(funding_tests::preserved_finance(&pic, id), finance);
    let current = observe(&pic, id).0.publication;
    let _: Vec<u8> = get_result(
        &pic,
        id,
        "commit_entry_transition",
        candid::encode_one(previous_manifest).unwrap(),
    );
    assert_eq!(observe(&pic, id).0.publication, current);
    assert_eq!(
        observe(&pic, id).1.identity.config_hash,
        dtr_wire::hash(b2z_native::entry_v7::configuration())
    );
    playability_installed::record(&pic, id, &mut rows, &out);
    playability_installed::configuration(&pic, id, 512);
    while !browser_out.join("browser-entry-ready").exists() {
        assert!(start.elapsed() < Duration::from_secs(180));
        assert!(
            browser.0.try_wait().unwrap().is_none(),
            "inspect browser/browser.log"
        );
        live_record(&pic, id, &mut rows, &out);
    }
    let text = b"NEW 0 2";
    let join = transfer_text(&pic, ledger, extra, id, 110000000, text);
    payments.insert(
        join,
        normalized(
            AccountIdentifier::new(&extra, &DEFAULT_SUBACCOUNT),
            110000000,
            b2z_protocol::v6::encode(b2z_protocol::v6::parse_text(text).unwrap()).unwrap(),
        ),
    );
    save(
        &browser_out,
        "join-sent.json",
        &serde_json::json!({"position":join.to_string()}),
    );
    while !browser_out.join("browser-join-seen").exists() {
        assert!(
            start.elapsed() < Duration::from_secs(300),
            "browser complete timeout"
        );
        assert!(
            browser.0.try_wait().unwrap().is_none(),
            "inspect browser/browser.log"
        );
        live_record(&pic, id, &mut rows, &out);
    }
    pause(&pic, id);
    if let Some(old) = &european_prior {
        pic.upgrade_canister(
            id,
            old.clone(),
            encode_args(()).unwrap(),
            Some(controller()),
        )
        .unwrap();
        assert_eq!(
            pic.canister_status(id, Some(controller()))
                .unwrap()
                .module_hash,
            Some(
                dtr_wire::unhex("612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948")
                    .unwrap()
            )
        );
    }
    // A genuine old-rule Move is admitted by the source drain before v9. Existing
    // close cannons are preserved; only subsequent destination admission changes.
    let old_world = arena_world(&pic, id);
    let enemy = old_world
        .cannons
        .iter()
        .find(|c| c.account == AccountIdentifier::new(&extra, &DEFAULT_SUBACCOUNT).to_hex())
        .unwrap();
    let old_target = (enemy.cell / 1000) * 1000 + (enemy.cell % 1000 + 996) % 1000;
    let old_text = format!("MOVE 1 {old_target}");
    let old_position = transfer_text(&pic, ledger, payer, id, 10000, old_text.as_bytes());
    payments.insert(
        old_position,
        normalized(
            AccountIdentifier::new(&payer, &DEFAULT_SUBACCOUNT),
            10000,
            b2z_protocol::v6::encode(b2z_protocol::v6::parse_text(old_text.as_bytes()).unwrap())
                .unwrap(),
        ),
    );
    if european_prior.is_some() {
        let mut admitted = false;
        for _ in 0..1800 {
            live_record(&pic, id, &mut rows, &out);
            if status(&pic, id).source.admitted_to_exclusive > old_position {
                admitted = true;
                break;
            }
        }
        assert!(admitted);
        playability_installed::configuration(&pic, id, 512);
        let mut applied = false;
        for _ in 0..1200 {
            live_record(&pic, id, &mut rows, &out);
            if arena_world(&pic, id)
                .cannons
                .iter()
                .any(|c| c.id == 1 && c.cell == old_target)
            {
                applied = true;
                break;
            }
        }
        assert!(applied, "real old-module payment applied before upgrade");
        pause(&pic, id);
        let old_state = arena_world(&pic, id).encode().unwrap();
        let old_finance = funding_tests::preserved_finance(&pic, id);
        let old_publication = observe(&pic, id).0.publication;
        let old_source = status(&pic, id).source;
        pic.upgrade_canister(
            id,
            candidate.clone(),
            encode_args(()).unwrap(),
            Some(controller()),
        )
        .unwrap();
        assert_eq!(arena_world(&pic, id).encode().unwrap(), old_state);
        assert_eq!(funding_tests::preserved_finance(&pic, id), old_finance);
        assert_eq!(observe(&pic, id).0.publication, old_publication);
        assert_eq!(
            status(&pic, id).source.admitted_to_exclusive,
            old_source.admitted_to_exclusive
        );
        save(
            &out,
            "european-upgrade.json",
            &serde_json::json!({"status":"PASS","predecessor":"612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948","candidate":dtr_wire::hash(&candidate),"state_preserved":true,"publication_preserved":true,"financial_state_preserved":true,"source_cursor_preserved":true,"old_payment_position":old_position}),
        );
    }
    // Rules-9 uses the existing authenticated source drain; no state replacement.
    get_result::<Vec<u8>>(
        &pic,
        id,
        "prepare_clearance_transition",
        encode_args(()).unwrap(),
    );
    let mut clearance_ready = false;
    for _ in 0..1200 {
        live_record(&pic, id, &mut rows, &out);
        let raw: Vec<u8> = get_query(
            &pic,
            id,
            "clearance_transition_status",
            encode_args(()).unwrap(),
        );
        let state: serde_json::Value = decode(&raw).unwrap();
        if state["transition"]["phase"] == "ready" && transition_drained(&pic, id) {
            clearance_ready = true;
            break;
        }
    }
    assert!(
        clearance_ready,
        "clearance drain must finish before activation"
    );
    assert_eq!(
        arena_world(&pic, id)
            .cannons
            .iter()
            .find(|c| c.id == 1)
            .unwrap()
            .cell,
        old_target,
        "pre-cutover Move executes under v7"
    );
    let before_clearance = arena_world(&pic, id).encode().unwrap();
    let finance_clearance = funding_tests::preserved_finance(&pic, id);
    let previous = observe(&pic, id).1.head.manifest_hash;
    let _: Vec<u8> = get_result(
        &pic,
        id,
        "commit_clearance_transition",
        candid::encode_one(previous.clone()).unwrap(),
    );
    assert_eq!(arena_world(&pic, id).encode().unwrap(), before_clearance);
    assert_eq!(
        funding_tests::preserved_finance(&pic, id),
        finance_clearance
    );
    assert_eq!(
        observe(&pic, id).1.identity.config_hash,
        dtr_wire::hash(b2z_native::clearance_v9::configuration())
    );
    let publication = observe(&pic, id).0.publication;
    let _: Vec<u8> = get_result(
        &pic,
        id,
        "commit_clearance_transition",
        candid::encode_one(previous).unwrap(),
    );
    assert_eq!(
        observe(&pic, id).0.publication,
        publication,
        "idempotent clearance retry"
    );
    save(
        &out,
        "clearance-cutover.json",
        &serde_json::json!({"status":"PASS","state_preserved":true,"finance_preserved":true,"identity":observe(&pic,id).1.identity}),
    );
    live_record(&pic, id, &mut rows, &out);
    playability_installed::record(&pic, id, &mut rows, &out);
    std::fs::write(
        browser_out.join("clearance-activated"),
        "verified v9 epoch available",
    )
    .unwrap();
    let browser_v9_start = std::time::Instant::now();
    while !browser_out.join("browser-complete").exists() {
        assert!(
            browser_v9_start.elapsed() < Duration::from_secs(120),
            "v9 browser handoff deadline"
        );
        assert!(
            browser.0.try_wait().unwrap().is_none(),
            "inspect v9 browser log"
        );
        live_record(&pic, id, &mut rows, &out);
    }
    assert!(browser.0.wait().unwrap().success());
    // Valueless payments under the normal v9 module: both unsafe actions reject.
    let w = arena_world(&pic, id);
    let player = w.player_for_cannon(1).unwrap();
    let unsafe_build = b2z_native::purchases_v6::adjacent_sites(&w, player)
        .unwrap()
        .into_iter()
        .find(|c| !b2z_native::purchases_v6::enemy_clearance(&w, player, *c))
        .expect("active anchor retains an unsafe adjacent site");
    let unsafe_move = unsafe_build;
    let commands = [
        (10000, format!("MOVE 1 {unsafe_move}")),
        (400000000, format!("NEW 0 1 {unsafe_build}")),
    ];
    let before_received = w.received_e8s.clone();
    let before_cannons = w.cannons.clone();
    let before_balls = w.balls.len();
    let mut expected = Vec::new();
    for (amount, text) in commands {
        let position = transfer_text(&pic, ledger, payer, id, amount, text.as_bytes());
        payments.insert(
            position,
            normalized(
                AccountIdentifier::new(&payer, &DEFAULT_SUBACCOUNT),
                amount,
                b2z_protocol::v6::encode(b2z_protocol::v6::parse_text(text.as_bytes()).unwrap())
                    .unwrap(),
            ),
        );
        expected.push(position);
    }
    let cycles_before = pic.cycle_balance(id);
    let mut checked = rows.len();
    let mut receipts = BTreeMap::new();
    // Wait for official-index admission while paused, so request latency cannot
    // advance the game and turn an unsafe owned site into a different race.
    let last = *expected.last().unwrap();
    let mut admitted = false;
    for _ in 0..1800 {
        live_record(&pic, id, &mut rows, &out);
        if status(&pic, id).source.admitted_to_exclusive > last {
            admitted = true;
            break;
        }
    }
    assert!(admitted, "real Index admission after bounded paused wait");
    playability_installed::configuration(&pic, id, 512);
    for _ in 0..1800 {
        live_record(&pic, id, &mut rows, &out);
        for p in rows.iter().skip(checked) {
            let n = p.head.segment_id.as_ref().unwrap().0.to_string();
            let events: ClearanceEvents = decode(
                &std::fs::read(out.join(format!("publication-{n}-artifact-1.bin"))).unwrap(),
            )
            .unwrap();
            for receipt in events.receipts {
                let pos = receipt.position.0.to_string().parse::<u64>().unwrap();
                if expected.contains(&pos) {
                    receipts.insert(pos, receipt);
                }
            }
        }
        checked = rows.len();
        if receipts.len() == expected.len() {
            break;
        }
    }
    pause(&pic, id);
    assert_eq!(receipts.len(), 2, "both real valueless receipts observed");
    for receipt in receipts.values() {
        assert_eq!(receipt.reason, "ENEMY_TERRITORY_TOO_CLOSE");
        assert_eq!(receipt.status, "rejected");
        assert_eq!(receipt.account, account);
        assert_eq!(receipt.amount_used.0.to_string(), "0");
        assert_eq!(receipt.remainder, receipt.amount);
    }
    let after = arena_world(&pic, id);
    for c in &after.cannons {
        if let Some(old) = before_cannons.iter().find(|old| old.id == c.id) {
            assert_eq!(c.cell, old.cell);
        }
    }
    assert_eq!(after.next_cannon_id, w.next_cannon_id);
    assert_eq!(after.next_ball_id, w.next_ball_id);
    let _ = before_balls;
    assert_eq!(
        (after.received_e8s.0 - before_received.0).to_string(),
        "400010000"
    );
    save(
        &out,
        "clearance-receipts.json",
        &serde_json::json!({"status":"PASS","old_rule_move_position":old_position,"old_target":old_target,"receipts":receipts,"scope":"Whole normal-module processing window including Ledger/Index/physics; not isolated clearance cost","net_cycles":(cycles_before as i128-pic.cycle_balance(id) as i128).to_string()}),
    );
    live.stop_live();
    playability_installed::record(&pic, id, &mut rows, &out);
    let mut events = vec![];
    let mut metadata = BTreeMap::new();
    let mut assigned = vec![];
    for p in &rows {
        let n = p
            .head
            .segment_id
            .as_ref()
            .unwrap()
            .0
            .to_string()
            .parse::<usize>()
            .unwrap();
        events.push(serde_json::json!({"segment_id":n.to_string(),"events_hex":hex(&std::fs::read(out.join(format!("publication-{n}-artifact-1.bin"))).unwrap())}));
        if let Some(e) = &p.epoch {
            if !metadata.contains_key(&e.transition_hash) {
                let bytes: Vec<u8> = get_query(
                    &pic,
                    id,
                    "epoch_metadata",
                    candid::encode_one(e.transition_hash.clone()).unwrap(),
                );
                assert_eq!(dtr_wire::hash(&bytes), e.metadata_hash);
                metadata.insert(e.transition_hash.clone(), hex(&bytes));
            }
        }
        if let Some(s) = &p.head.seal {
            let a = s.source_from.0.to_string().parse::<u64>().unwrap();
            let b = s.source_to_exclusive.0.to_string().parse::<u64>().unwrap();
            assigned.extend(payments.range(a..b).map(|(n, _)| n.to_string()));
        }
    }
    save(
        &out,
        "trace.json",
        &serde_json::json!({"status":"PASS","initial_world_hex":hex(&initial.encode().unwrap()),"publications":rows,"inputs":payments.iter().map(|(n,p)|serde_json::json!({"position":n.to_string(),"payload_hex":p})).collect::<Vec<_>>(),"assigned":assigned,"artifact_events":events,"epoch_metadata":metadata}),
    );
    assert!(std::process::Command::new("node")
        .current_dir(&repo)
        .args([
            "tools/replay_s14.mjs",
            out.join("trace.json").to_str().unwrap(),
            out.join("replay.json").to_str().unwrap()
        ])
        .status()
        .unwrap()
        .success());
    save(
        &out,
        "result.json",
        &serde_json::json!({"status":"PASS","predecessor_sha256":dtr_wire::hash(&prior),"candidate_sha256":dtr_wire::hash(&candidate),"synthetic_setup_only":true,"historical_wasm_upgrade":historical_upgrade,"qualified_payments_on_normal_module":true,"unfinished_operation_preserved":true,"entry_cutover_world_exact":true,"join_position":join,"publication_count":rows.len(),"net_cycles_window":(cycles as i128-pic.cycle_balance(id) as i128).to_string()}),
    );
}
