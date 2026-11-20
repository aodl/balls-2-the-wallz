//! Real valueless Ledger/Index and exact normal modules. Arena genesis is synthetic, never mainnet.
use super::*;
use b2z_native::world::World;
use b2z_protocol::{context_structures as codec, deflector as predecessor_codec};
use serde_json::{Value, json};

fn save(out: &Path, name: &str, value: &Value) {
    std::fs::write(out.join(name), serde_json::to_vec_pretty(value).unwrap()).unwrap();
}

fn upgrade(pic: &PocketIc, id: Principal, wasm: Vec<u8>) {
    let expected = dtr_wire::hash(&wasm);
    pic.upgrade_canister(id, wasm, encode_args(()).unwrap(), Some(controller()))
        .unwrap();
    let module = pic
        .canister_status(id, Some(controller()))
        .unwrap()
        .module_hash
        .unwrap();
    assert_eq!(hex(&module), expected);
}

fn retained_wasm() -> Vec<u8> {
    let normal = bytes("B2Z_RULES12_PRIOR_WASM");
    assert_eq!(
        dtr_wire::hash(&normal),
        "2cb2fe026941cbdd5373b490e1300f430db62b0b274e9f604ad3ad1a0f03ac13"
    );
    normal
}

fn funding_account(p: Principal) -> AccountIdentifier {
    AccountIdentifier::new(&p, &DEFAULT_SUBACCOUNT)
}

fn test_world(payer: Principal) -> World {
    let f: Value = serde_json::from_str(include_str!(
        "../../../../tests/fixtures/context-structures-v13.json"
    ))
    .unwrap();
    let mut w =
        World::decode(&unhex(f["rows"][0]["initial_hex"].as_str().unwrap()).unwrap()).unwrap();
    let account = funding_account(payer).to_hex();
    let old = w.cannons[0].account.clone();
    for p in &mut w.playability.as_mut().unwrap().players {
        if p.account == old {
            p.account = account.clone();
        }
    }
    for c in &mut w.cannons {
        if c.account == old {
            c.account = account.clone();
        }
    }
    for entry in &mut w.credits {
        if entry.account == old {
            entry.account = account.clone();
        }
    }
    let elapsed = (std::time::SystemTime::now() - Duration::from_secs(1800))
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_nanos() as u64;
    let lifecycle = w.playability.as_mut().unwrap();
    lifecycle.elapsed_ns = dtr_wire::Int(elapsed.into());
    for entry in &mut lifecycle.lifecycle {
        if entry.dormant_since_ns.is_some() {
            entry.dormant_since_ns = Some(dtr_wire::Int(elapsed.into()));
            entry.deadline_ns = Some(dtr_wire::Int((elapsed + 86_400_000_000_000).into()));
        }
    }
    // Credits are canonical by account, including the disposable payer.
    w.credits.sort_by(|a, b| a.account.cmp(&b.account));
    w.validate().unwrap();
    w
}

fn wait_admitted(pic: &PocketIc, id: Principal, pos: u64) {
    for _ in 0..400 {
        if status(pic, id).source.admitted_to_exclusive > pos {
            return;
        }
        tick(pic);
    }
    panic!("Ledger position {pos} not admitted");
}

// Use the real Trickle driver and advance the disposable wall clock one
// second at a time. Check the controller after each timer slice.
fn complete_one_trickle_tick(pic: &PocketIc, id: Principal) {
    let target = status(pic, id).run.completed_segments + 1;
    playability_installed::configuration(pic, id, 512);
    for _ in 0..300 {
        tick(pic);
        let run = status(pic, id).run;
        assert!(run.last_error.is_none(), "{:?}", run.last_error);
        if run.completed_segments == target {
            get_result::<Status>(pic, id, "pause_autonomous", encode_args(()).unwrap());
            assert_eq!(status(pic, id).run.completed_segments, target);
            return;
        }
        assert!(run.completed_segments < target);
    }
    panic!("Trickle did not publish one tick in the bounded clock window");
}

#[test]
fn context_structures_rules12_upgrade_official_payments_and_authenticated_replay() {
    let out =
        PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap()).join("context-structures");
    std::fs::create_dir_all(&out).unwrap();
    let repo = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    let payer = Principal::self_authenticating([9; 32]);
    let extra = Principal::self_authenticating([10; 32]);
    let initial = test_world(payer).encode().unwrap();
    let (pic, id, ledger, _) = arena_setup_world_fee_clock_payers(
        bytes("B2Z_S14_TEST_WASM"),
        initial.clone(),
        10000,
        500,
        &[extra],
    );
    playability_installed::funding_paused(&pic, id, true);
    upgrade(&pic, id, retained_wasm());
    playability_installed::configuration(&pic, id, 512);
    get_result::<Status>(&pic, id, "pause_autonomous", encode_args(()).unwrap());
    assert_eq!(arena_world(&pic, id).encode().unwrap(), initial);
    let mut history = vec![];
    let mut inputs = BTreeMap::new();
    let mut expected = BTreeMap::new();
    let mut send = |sender: Principal, text: &str, amount: u64, adapter: u8, reason: &str| {
        let position = transfer_text(&pic, ledger, sender, id, amount, text.as_bytes());
        let (tag, memo, cry) = if adapter == 7 {
            let item = predecessor_codec::parse_text(text.as_bytes()).ok();
            (
                b"BTZPAY04",
                item.as_ref()
                    .and_then(|p| predecessor_codec::encode(p.command).ok())
                    .unwrap_or([0; 8]),
                item.map(|p| p.cry).unwrap_or_default(),
            )
        } else {
            let item = codec::parse_text(text.as_bytes()).ok();
            (
                codec::NORMALIZED_PAYMENT,
                item.as_ref()
                    .and_then(|p| codec::encode(p.command).ok())
                    .unwrap_or([0; 8]),
                item.map(|p| p.cry).unwrap_or_default(),
            )
        };
        let mut raw = tag.to_vec();
        raw.extend(funding_account(sender).as_bytes());
        raw.extend(amount.to_be_bytes());
        raw.extend(memo);
        raw.push(cry.len() as u8);
        raw.extend(cry.as_bytes());
        inputs.insert(position, hex(&raw));
        expected.insert(position, (text.to_owned(), reason.to_owned(), amount));
        position
    };
    send(payer, "DEFLECT 300300 NW", 10000000, 7, "ACCEPTED");
    let historic = send(payer, "DROT 1 N", 10000, 7, "MALFORMED_MEMO");
    wait_admitted(&pic, id, historic);
    complete_one_trickle_tick(&pic, id);
    playability_installed::record_bundled(&pic, id, &mut history, &out);
    let prior = arena_world(&pic, id).encode().unwrap();
    let prior_finance = funding_tests::preserved_finance(&pic, id);
    let prior_pub = observe(&pic, id).0.publication;
    let prior_source = status(&pic, id).source.admitted_to_exclusive;
    upgrade(&pic, id, bytes("B2Z_S14_WASM"));
    assert_eq!(arena_world(&pic, id).encode().unwrap(), prior);
    assert_eq!(funding_tests::preserved_finance(&pic, id), prior_finance);
    assert_eq!(observe(&pic, id).0.publication, prior_pub);
    assert_eq!(status(&pic, id).source.admitted_to_exclusive, prior_source);
    let early = pic
        .update_call(
            id,
            Principal::anonymous(),
            "prepare_context_transition",
            encode_args(()).unwrap(),
        )
        .unwrap();
    assert!(
        decode_one::<Result<Vec<u8>, String>>(&early)
            .unwrap()
            .is_err()
    );
    war_cry_installed::transition(&pic, id, "context");
    assert_eq!(arena_world(&pic, id).encode().unwrap(), prior);
    assert_eq!(funding_tests::preserved_finance(&pic, id), prior_finance);
    assert_eq!(status(&pic, id).source.admitted_to_exclusive, prior_source);
    assert_eq!(
        observe(&pic, id).1.identity.config_hash,
        dtr_wire::hash(b2z_native::context_structures::configuration())
    );
    playability_installed::record_bundled(&pic, id, &mut history, &out);
    for (text, amount, reason) in [
        ("MOVE 1 4005", 10000, "NO_FRIENDLY_STRUCTURE_NEARBY"),
        ("NEW 0 1", 400000000, "EXPLICIT_OWNED_SITE_REQUIRED"),
        ("NEW 0 1 5004", 400000000, "NOT_OWN_TERRITORY"),
        ("NEW 0 1 299999", 400000000, "NO_FRIENDLY_STRUCTURE_NEARBY"),
        ("DEFLECT 4007 N", 10000000, "ACCEPTED"),
        ("DMOVE 2 4008", 10000, "NO_FRIENDLY_STRUCTURE_NEARBY"),
        ("DROT 2 N", 10000, "SAME_ORIENTATION"),
        ("DROT 2 E", 10000, "ACCEPTED"),
        ("DMOVE 2 4006", 10000, "ACCEPTED"),
        ("MOVE 1 4009", 10000, "ACCEPTED"),
        ("NEW 0 1 5007|Ready", 400000000, "ACCEPTED"),
        ("DEFLECT 4010 W", 10000000, "ENEMY_TERRITORY_TOO_CLOSE"),
        ("DROT 9001 W", 10000, "NO_DEFLECTOR"),
        ("DROT 2 NE", 10000, "MALFORMED_MEMO"),
        ("DEFLECT 4006 E", 10000000, "SITE_OCCUPIED"),
    ] {
        send(payer, text, amount, 8, reason);
    }
    send(extra, "DMOVE 2 4007", 10000, 8, "NOT_OWNER");
    let last = send(payer, "FIRE 1 180 1|Contact", 100000000, 8, "ACCEPTED");
    drop(send);
    wait_admitted(&pic, id, last);
    let admitted = observe(&pic, id).0.publication;
    let admitted_finance = funding_tests::preserved_finance(&pic, id);
    upgrade(&pic, id, bytes("B2Z_S14_WASM"));
    assert_eq!(observe(&pic, id).0.publication, admitted);
    assert_eq!(funding_tests::preserved_finance(&pic, id), admitted_finance);
    let started = pic.cycle_balance(id);
    complete_one_trickle_tick(&pic, id);
    let processing_cycles = started - pic.cycle_balance(id);
    playability_installed::record_bundled(&pic, id, &mut history, &out);
    let state = arena_world(&pic, id);
    let d = state
        .deflectors
        .as_ref()
        .unwrap()
        .iter()
        .find(|d| d.id == 2)
        .unwrap();
    assert_eq!((d.cell, d.orientation.as_str()), (4006, "NE"));
    assert!(
        state
            .deflectors
            .as_ref()
            .unwrap()
            .iter()
            .any(|d| d.id == 1 && d.cell == 300300 && d.orientation == "NW")
    );
    assert_eq!(state.cannons.iter().find(|c| c.id == 1).unwrap().cell, 4009);
    assert!(state.cannons.iter().any(|c| c.cell == 5007));
    let mut events = vec![];
    let mut receipts = BTreeMap::new();
    let mut contacts = 0;
    let mut operations = vec![];
    for publication in &history {
        let n = publication.head.segment_id.as_ref().unwrap().0.to_string();
        let raw = std::fs::read(out.join(format!("publication-{n}-artifact-1.bin"))).unwrap();
        let audit: Value = decode(&raw).unwrap();
        for event in audit["events"].as_array().unwrap() {
            if event.is_array() && event[6].as_array().is_some_and(|e| e[0] == 2 && e[1] == 0) {
                contacts += 1;
            }
            if ["deflector_reoriented", "deflector_moved"]
                .contains(&event["kind"].as_str().unwrap_or(""))
            {
                operations.push(event.clone());
            }
        }
        for receipt in audit["receipts"].as_array().unwrap() {
            let position = receipt["position"]["$integer"]
                .as_str()
                .unwrap()
                .parse::<u64>()
                .unwrap();
            assert!(receipts.insert(position, receipt.clone()).is_none());
        }
        events.push(json!({"segment_id":n,"events_hex":hex(&raw)}));
    }
    assert!(
        contacts > 0,
        "paid Fire must contact the reoriented, relocated Deflector"
    );
    assert_eq!(operations.len(), 2);
    for (position, (memo, reason, _)) in &expected {
        let receipt = &receipts[position];
        assert_eq!(receipt["reason"], *reason, "{memo}");
        if reason != "ACCEPTED" {
            assert_eq!(receipt["amount_used"]["$integer"], "0");
            assert_eq!(receipt["remainder"], receipt["amount"]);
        }
    }
    assert_eq!(receipts.len(), inputs.len());
    let capture = json!({"status":"PASS","initial_world_hex":hex(&initial),"publications":history,"inputs":inputs.iter().map(|(n,p)|json!({"position":n.to_string(),"payload_hex":p})).collect::<Vec<_>>(),"assigned":receipts.keys().map(|k|k.to_string()).collect::<Vec<_>>(),"artifact_events":events});
    save(&out, "trace.json", &capture);
    save(
        &out,
        "operations.json",
        &json!({"receipts":receipts,"expected":expected,"operations":operations,"contacts":contacts,"measured_paid_tick_cycles":processing_cycles.to_string(),"prior_module_sha256":dtr_wire::hash(&retained_wasm()),"successor_module_sha256":dtr_wire::hash(&bytes("B2Z_S14_WASM"))}),
    );
    let wall_clock = pocket_ic::Time::from(std::time::SystemTime::now());
    if wall_clock.as_nanos_since_unix_epoch() > pic.get_time().as_nanos_since_unix_epoch() {
        pic.set_time(wall_clock);
    }
    let mut live =
        PocketIc::new_from_existing_instance(pic.get_server_url(), pic.instance_id(), None);
    let gateway = live.make_live(None);
    save(
        &out,
        "configuration.json",
        &json!({
            "network":"pocketic-local","host":gateway.as_str(),"canister_id":id.to_text(),
            "ledger":ledger.to_text(),"index":status(&pic,id).source.index.to_text(),
            "root_key_hex":hex(&pic.root_key().unwrap()),"listening_account":funding_account(payer).to_hex(),
            "cannon":1,"build_tile":5009,"structure":2,"old_deflector_cell":4007,"new_deflector_cell":4006
        }),
    );
    assert!(
        std::process::Command::new("node")
            .current_dir(&repo)
            .args([
                "tools/capture_war_cry_installed.mjs",
                out.join("configuration.json").to_str().unwrap(),
                out.join("trace.json").to_str().unwrap(),
                out.join("authenticated").to_str().unwrap()
            ])
            .status()
            .unwrap()
            .success()
    );
    std::fs::write(out.join("root-key.der"), pic.root_key().unwrap()).unwrap();
    save(
        &out,
        "metadata.json",
        &json!({"network":"pocketic-local","canister_id":id.to_text(),"root_key_sha256":dtr_wire::hash(&pic.root_key().unwrap())}),
    );
    playability_installed::configuration(&pic, id, 512);
    let browser = std::process::Command::new(std::env::var("S14_BROWSER_PYTHON").unwrap())
        .current_dir(&repo)
        .args([
            "tools/verify_context_structure_browser.py",
            "--configuration",
            out.join("configuration.json").to_str().unwrap(),
            "--output",
            out.join("browser").to_str().unwrap(),
        ])
        .status()
        .unwrap();
    get_result::<Status>(&pic, id, "pause_autonomous", encode_args(()).unwrap());
    assert!(browser.success(), "Rules13 native browser qualification");
    live.stop_live();
}

#[test]
fn matched_rules12_rules13_trickle_cost() {
    let out =
        PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap()).join("context-structures");
    std::fs::create_dir_all(&out).unwrap();
    let f: Value = serde_json::from_str(include_str!(
        "../../../../tests/fixtures/boundary-deflector-v12.json"
    ))
    .unwrap();
    let mut rows = vec![];
    #[derive(CandidType, Deserialize)]
    struct Pace {
        mode: String,
        nominal_milli: u32,
    }
    #[derive(CandidType, Deserialize)]
    struct Run {
        pace: Pace,
    }
    #[derive(CandidType, Deserialize)]
    struct Lab {
        run: Run,
    }
    for (label, fixture) in [
        ("quiet-one-ball", None),
        (
            "one-ball-adversarial-diamond",
            Some("immutable-four-direction-diamond"),
        ),
        (
            "64-balls-256-deflectors",
            Some("global-capacity-64-balls-256-structures"),
        ),
    ] {
        let initial = fixture.map_or_else(
            || {
                test_world(Principal::self_authenticating([9; 32]))
                    .encode()
                    .unwrap()
            },
            |name| {
                let row = f["rows"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .find(|row| row["name"] == name)
                    .unwrap();
                unhex(row["initial_hex"].as_str().unwrap()).unwrap()
            },
        );
        let mut final_state = None;
        let mut pair = vec![];
        for (version, activate_context) in [("Rules12", false), ("Rules13", true)] {
            let (pic, id, _, _) = arena_setup_world_fee_clock_payers(
                bytes("B2Z_S14_TEST_WASM"),
                initial.clone(),
                10000,
                60,
                &[],
            );
            playability_installed::funding_paused(&pic, id, true);
            upgrade(&pic, id, retained_wasm());
            playability_installed::configuration(&pic, id, 512);
            get_result::<Status>(&pic, id, "pause_autonomous", encode_args(()).unwrap());
            assert_eq!(arena_world(&pic, id).encode().unwrap(), initial);
            complete_one_trickle_tick(&pic, id);
            let sealed = arena_world(&pic, id).encode().unwrap();
            if activate_context {
                upgrade(&pic, id, bytes("B2Z_S14_WASM"));
                war_cry_installed::transition(&pic, id, "context");
            }
            assert_eq!(arena_world(&pic, id).encode().unwrap(), sealed);
            let pace = get_query::<Lab>(&pic, id, "lab_status", encode_args(()).unwrap())
                .run
                .pace;
            assert_eq!((pace.mode.as_str(), pace.nominal_milli), ("Trickle", 10));
            let before_metrics = super::playability_profile::metric_values(&pic, id);
            let baseline = status(&pic, id);
            let before = pic.cycle_balance(id);
            complete_one_trickle_tick(&pic, id);
            let after = status(&pic, id);
            let remaining = pic.cycle_balance(id);
            let mut world = arena_world(&pic, id);
            let state = dtr_wire::hash(&world.encode().unwrap());
            // Independent fake clocks advance differently during controller
            // cutover messages. Compare canonical gameplay after fixing only
            // the observed wall-clock completion time to the common genesis.
            world.playability.as_mut().unwrap().elapsed_ns = World::decode(&initial)
                .unwrap()
                .playability
                .unwrap()
                .elapsed_ns;
            let logical_state = dtr_wire::hash(&world.encode().unwrap());
            if let Some(expected) = final_state.as_ref() {
                assert_eq!(&logical_state, expected, "{label}");
            } else {
                final_state = Some(logical_state.clone());
            }
            let after_metrics = super::playability_profile::metric_values(&pic, id);
            let instruction_deltas: BTreeMap<_, _> = [
                "seal_instructions",
                "step_instructions",
                "publish_instructions",
                "persist_instructions",
            ]
            .into_iter()
            .map(|key| {
                (
                    key,
                    after_metrics[key].as_u64().unwrap() - before_metrics[key].as_u64().unwrap(),
                )
            })
            .collect();
            pair.push(json!({
                "rules":version, "cycles":(before-remaining).to_string(), "state_hash":state, "logical_state_hash":logical_state,
                "ticks":after.run.completed_segments-baseline.run.completed_segments,
                "callbacks":after.run.callback_count-baseline.run.callback_count,
                "index_calls":after.source.index_calls-baseline.source.index_calls,
                "pace":pace.mode,"instruction_deltas":instruction_deltas,
                "publication_bytes":observe(&pic,id).1.artifacts.iter().map(|a|a.length).collect::<Vec<_>>()
            }));
        }
        rows.push(json!({"world":label,"windows":pair}));
    }
    save(
        &out,
        "matched-cycle-cost.json",
        &json!({
            "status":"PASS","scope":"Matched disposable canonical starting worlds and one-tick segment allowance; balances selected for Trickle. Whole-window backend debit includes controller and overlapping source work. Gameplay hashes normalise only the observed wall-clock completion time. No live estimate.", "rows":rows
        }),
    );
}

#[test]
#[ignore = "requires the exact qualified Rules13 module via --rules13-prior-wasm"]
fn shout_rules13_upgrade_official_payments_and_recovery() {
    use b2z_protocol::shout;
    let out = PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap()).join("shout");
    std::fs::create_dir_all(&out).unwrap();
    let repo = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    let payer = Principal::self_authenticating([9; 32]);
    let initial = test_world(payer).encode().unwrap();
    let (pic, id, ledger, _) = arena_setup_world_fee_clock_payers(
        bytes("B2Z_S14_TEST_WASM"),
        initial.clone(),
        10000,
        500,
        &[],
    );
    let predecessor = bytes("B2Z_RULES13_PRIOR_WASM");
    assert_eq!(
        dtr_wire::hash(&predecessor),
        "d17fb92e83a01a3f09a4e969ef4b9d3e045053fec818a53dfe91ba139cd1f4fd"
    );
    playability_installed::funding_paused(&pic, id, true);
    upgrade(&pic, id, predecessor);
    playability_installed::configuration(&pic, id, 512);
    get_result::<Status>(&pic, id, "pause_autonomous", encode_args(()).unwrap());
    assert_eq!(arena_world(&pic, id).encode().unwrap(), initial);
    let mut history = vec![];

    let mut inputs = BTreeMap::new();
    let mut expected = BTreeMap::new();
    let mut send = |text: &str, amount: u64, adapter: u8, reason: &str| {
        let position = transfer_text(&pic, ledger, payer, id, amount, text.as_bytes());
        let (tag, directive, cry) = if adapter == 7 {
            let p = predecessor_codec::parse_text(text.as_bytes()).ok();
            (
                b"BTZPAY04",
                p.as_ref()
                    .map_or([0; 8], |p| predecessor_codec::encode(p.command).unwrap()),
                p.map(|p| p.cry).unwrap_or_default(),
            )
        } else if adapter == 8 {
            let p = codec::parse_text(text.as_bytes()).ok();
            (
                codec::NORMALIZED_PAYMENT,
                p.as_ref()
                    .map_or([0; 8], |p| codec::encode(p.command).unwrap()),
                p.map(|p| p.cry).unwrap_or_default(),
            )
        } else {
            let p = shout::parse_text(text.as_bytes()).ok();
            (
                shout::NORMALIZED_PAYMENT,
                p.as_ref()
                    .map_or([0; 8], |p| codec::encode(p.command).unwrap()),
                p.map(|p| p.cry).unwrap_or_default(),
            )
        };
        let mut raw = tag.to_vec();
        raw.extend(funding_account(payer).as_bytes());
        raw.extend(amount.to_be_bytes());
        raw.extend(directive);
        raw.push(cry.len() as u8);
        raw.extend(cry.as_bytes());
        inputs.insert(position, hex(&raw));
        expected.insert(position, reason.to_owned());
        position
    };
    let historic_deflector = send("DEFLECT 300300 NW", 10000000, 7, "ACCEPTED");
    wait_admitted(&pic, id, historic_deflector);
    complete_one_trickle_tick(&pic, id);
    playability_installed::record_bundled(&pic, id, &mut history, &out);
    war_cry_installed::transition_with_recovery_module(
        &pic,
        id,
        "context",
        "B2Z_RULES13_PRIOR_WASM",
    );
    playability_installed::record_bundled(&pic, id, &mut history, &out);

    let history_payment = send("DROT 1 W|Old", 10000, 8, "MALFORMED_MEMO");
    wait_admitted(&pic, id, history_payment);
    complete_one_trickle_tick(&pic, id);
    playability_installed::record_bundled(&pic, id, &mut history, &out);

    let prior = arena_world(&pic, id).encode().unwrap();
    let prior_finance = funding_tests::preserved_finance(&pic, id);
    let prior_pub = observe(&pic, id).0.publication;
    let predecessor_cursor = status(&pic, id).source.admitted_to_exclusive;
    let successor = bytes("B2Z_S14_WASM");
    upgrade(&pic, id, successor.clone());
    assert_eq!(observe(&pic, id).0.publication, prior_pub);
    assert_eq!(arena_world(&pic, id).encode().unwrap(), prior);
    assert_eq!(funding_tests::preserved_finance(&pic, id), prior_finance);
    war_cry_installed::transition(&pic, id, "shout");
    assert_eq!(arena_world(&pic, id).encode().unwrap(), prior);
    assert_eq!(funding_tests::preserved_finance(&pic, id), prior_finance);
    assert_eq!(
        status(&pic, id).source.admitted_to_exclusive,
        predecessor_cursor
    );
    assert_eq!(
        observe(&pic, id).1.identity.config_hash,
        b2z_native::shout::configuration_hash()
    );
    playability_installed::record_bundled(&pic, id, &mut history, &out);
    for (text, amount, reason) in [
        ("DEFLECT 4007 N|Shield", 10000000, "ACCEPTED"),
        ("DROT 2 N|Same", 10000, "SAME_ORIENTATION"),
        ("DROT 2 E|Turn", 10000, "ACCEPTED"),
        ("DMOVE 2 4006|Advance", 10000, "ACCEPTED"),
        ("MOVE 1 4009|Forward", 10000, "ACCEPTED"),
        ("NEW 0 1 5007|Ready", 400000000, "ACCEPTED"),
    ] {
        send(text, amount, 9, reason);
    }
    let last = send("FIRE 1 180 1|Contact", 100000000, 9, "ACCEPTED");
    drop(send);
    wait_admitted(&pic, id, last);
    let admitted = observe(&pic, id).0.publication;
    upgrade(&pic, id, successor.clone());
    assert_eq!(observe(&pic, id).0.publication, admitted);
    complete_one_trickle_tick(&pic, id);
    playability_installed::record_bundled(&pic, id, &mut history, &out);

    let mut receipts = BTreeMap::new();
    let mut announcements = vec![];
    let mut events = vec![];
    for p in &history {
        let segment = p.head.segment_id.as_ref().unwrap().0.to_string();
        let raw = std::fs::read(out.join(format!("publication-{segment}-artifact-1.bin"))).unwrap();
        let audit: Value = decode(&raw).unwrap();
        for event in audit["events"].as_array().unwrap() {
            for key in ["launch_annotation", "action_annotation"] {
                if let Some(cry) = event[key]["cry"].as_str() {
                    announcements.push(cry.to_owned());
                }
            }
        }
        for receipt in audit["receipts"].as_array().unwrap() {
            let position = receipt["position"]["$integer"]
                .as_str()
                .unwrap()
                .parse::<u64>()
                .unwrap();
            assert!(receipts.insert(position, receipt.clone()).is_none());
        }
        events.push(json!({"segment_id":segment,"events_hex":hex(&raw)}));
    }
    assert_eq!(receipts.len(), expected.len());
    for (position, reason) in &expected {
        let receipt = &receipts[position];
        assert_eq!(receipt["reason"], *reason);
        if reason != "ACCEPTED" {
            assert_eq!(receipt["amount_used"]["$integer"], "0");
            assert_eq!(receipt["remainder"], receipt["amount"]);
        }
    }
    announcements.sort();
    assert_eq!(
        announcements,
        ["Advance", "Contact", "Forward", "Ready", "Shield", "Turn"]
    );
    save(
        &out,
        "trace.json",
        &json!({
            "status":"PASS","initial_world_hex":hex(&initial),"publications":history,
            "inputs":inputs.iter().map(|(n,p)|json!({"position":n.to_string(),"payload_hex":p})).collect::<Vec<_>>(),
            "assigned":receipts.keys().map(|k|k.to_string()).collect::<Vec<_>>(),"artifact_events":events
        }),
    );
    let wall = pocket_ic::Time::from(std::time::SystemTime::now());
    if wall.as_nanos_since_unix_epoch() > pic.get_time().as_nanos_since_unix_epoch() {
        pic.set_time(wall);
    }
    let mut live =
        PocketIc::new_from_existing_instance(pic.get_server_url(), pic.instance_id(), None);
    let gateway = live.make_live(None);
    save(
        &out,
        "configuration.json",
        &json!({
            "network":"pocketic-local","host":gateway.as_str(),"canister_id":id.to_text(),
            "ledger":ledger.to_text(),"index":status(&pic,id).source.index.to_text(),
            "root_key_hex":hex(&pic.root_key().unwrap()),"listening_account":funding_account(payer).to_hex()
        }),
    );
    let replay = std::process::Command::new("node")
        .current_dir(repo)
        .args([
            "tools/capture_war_cry_installed.mjs",
            out.join("configuration.json").to_str().unwrap(),
            out.join("trace.json").to_str().unwrap(),
            out.join("authenticated").to_str().unwrap(),
        ])
        .status()
        .unwrap();
    assert!(
        replay.success(),
        "official transaction history must authenticate and replay"
    );
    live.stop_live();
}
