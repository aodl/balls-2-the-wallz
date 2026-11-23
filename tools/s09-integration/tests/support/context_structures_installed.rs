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
fn shout_rules13_upgrade_official_payments_and_recovery() {
    use b2z_protocol::shout;
    let out = PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap()).join("shout");
    std::fs::create_dir_all(&out).unwrap();
    let repo = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    let payer = Principal::self_authenticating([9; 32]);
    let joining = Principal::self_authenticating([10; 32]);
    let initial = test_world(payer).encode().unwrap();
    let (pic, id, ledger, _) = arena_setup_world_fee_clock_payers(
        bytes("B2Z_S14_TEST_WASM"),
        initial.clone(),
        10000,
        500,
        &[joining],
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
    let mut send = |sender: Principal, text: &str, amount: u64, adapter: u8, reason: &str| {
        let position = transfer_text(&pic, ledger, sender, id, amount, text.as_bytes());
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
        raw.extend(funding_account(sender).as_bytes());
        raw.extend(amount.to_be_bytes());
        raw.extend(directive);
        raw.push(cry.len() as u8);
        raw.extend(cry.as_bytes());
        inputs.insert(position, hex(&raw));
        expected.insert(position, reason.to_owned());
        position
    };
    let historic_deflector = send(payer, "DEFLECT 300300 NW", 10000000, 7, "ACCEPTED");
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

    let history_payment = send(payer, "DROT 1 W|Old", 10000, 8, "MALFORMED_MEMO");
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
        send(payer, text, amount, 9, reason);
    }
    send(payer, "FIRE 1 180 1|Contact", 100000000, 9, "ACCEPTED");
    let last = send(joining, "NEW 0 1|Hello", 100000000, 9, "ACCEPTED");
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
        [
            "Advance", "Contact", "Forward", "Hello", "Ready", "Shield", "Turn"
        ]
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
        .current_dir(&repo)
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
    let root_key = pic.root_key().unwrap();
    std::fs::write(out.join("root-key.der"), &root_key).unwrap();
    save(
        &out,
        "metadata.json",
        &json!({"network":"pocketic-local","canister_id":id.to_text(),"root_key_sha256":dtr_wire::hash(&root_key)}),
    );
    let browser = std::process::Command::new(std::env::var("S14_BROWSER_PYTHON").unwrap())
        .current_dir(&repo)
        .args([
            "tools/verify_shout_browser.py",
            "--configuration",
            out.join("configuration.json").to_str().unwrap(),
            "--output",
            out.join("browser").to_str().unwrap(),
        ])
        .status()
        .unwrap();
    assert!(browser.success(), "two independent Shout browser observers");
    live.stop_live();
}

#[test]
fn spacing_rules14_upgrade_official_payments_and_authenticated_replay() {
    use b2z_protocol::shout;
    let out = PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap()).join("spacing");
    std::fs::create_dir_all(&out).unwrap();
    let payer = Principal::self_authenticating([9; 32]);
    let joining = Principal::self_authenticating([10; 32]);
    let mut world = test_world(payer);
    for row in 500..=508 {
        world
            .set_owner_range(row * 1000 + 504, row * 1000 + 513, 1, 0)
            .unwrap();
    }
    let initial = world.encode().unwrap();
    let (pic, id, ledger, _) = arena_setup_world_fee_clock_payers(
        bytes("B2Z_S14_TEST_WASM"),
        initial.clone(),
        10_000,
        500,
        &[joining],
    );
    let predecessor = bytes("B2Z_RULES14_PRIOR_WASM");
    assert_eq!(
        dtr_wire::hash(&predecessor),
        "6efe198e3874a603de02f9b3d344bf692c3f8777930b792febd911561d891da6"
    );
    playability_installed::funding_paused(&pic, id, true);
    upgrade(&pic, id, retained_wasm());
    playability_installed::configuration(&pic, id, 512);
    get_result::<Status>(&pic, id, "pause_autonomous", encode_args(()).unwrap());
    complete_one_trickle_tick(&pic, id);
    let mut history = vec![];
    playability_installed::record_bundled(&pic, id, &mut history, &out);
    upgrade(&pic, id, bytes("B2Z_RULES13_PRIOR_WASM"));
    war_cry_installed::transition_with_recovery_module(
        &pic,
        id,
        "context",
        "B2Z_RULES13_PRIOR_WASM",
    );
    playability_installed::record_bundled(&pic, id, &mut history, &out);
    complete_one_trickle_tick(&pic, id);
    playability_installed::record_bundled(&pic, id, &mut history, &out);
    upgrade(&pic, id, predecessor);
    war_cry_installed::transition_with_recovery_module(&pic, id, "shout", "B2Z_RULES14_PRIOR_WASM");
    playability_installed::record_bundled(&pic, id, &mut history, &out);

    let mut inputs = BTreeMap::new();
    let mut expected = BTreeMap::new();
    let mut send = |sender: Principal, text: &str, amount: u64, reason: &str| {
        let position = transfer_text(&pic, ledger, sender, id, amount, text.as_bytes());
        let memo = shout::parse_text(text.as_bytes()).unwrap();
        let mut raw = shout::NORMALIZED_PAYMENT.to_vec();
        raw.extend(funding_account(sender).as_bytes());
        raw.extend(amount.to_be_bytes());
        raw.extend(codec::encode(memo.command).unwrap());
        raw.push(memo.cry.len() as u8);
        raw.extend(memo.cry.as_bytes());
        inputs.insert(position, hex(&raw));
        expected.insert(position, reason.to_owned());
        position
    };
    let historic = send(payer, "DEFLECT 4007 N|Old", 10_000_000, "ACCEPTED");
    wait_admitted(&pic, id, historic);
    complete_one_trickle_tick(&pic, id);
    playability_installed::record_bundled(&pic, id, &mut history, &out);

    let prior = arena_world(&pic, id).encode().unwrap();
    let finance = funding_tests::preserved_finance(&pic, id);
    let cursor = status(&pic, id).source.admitted_to_exclusive;
    let publication = observe(&pic, id).0.publication;
    upgrade(&pic, id, bytes("B2Z_S14_WASM"));
    assert_eq!(observe(&pic, id).0.publication, publication);
    war_cry_installed::transition(&pic, id, "spacing");
    assert_eq!(arena_world(&pic, id).encode().unwrap(), prior);
    assert_eq!(funding_tests::preserved_finance(&pic, id), finance);
    assert_eq!(status(&pic, id).source.admitted_to_exclusive, cursor);
    assert_eq!(
        observe(&pic, id).1.identity.config_hash,
        b2z_native::spacing::configuration_hash()
    );
    assert_eq!(arena_world(&pic, id).deflectors.unwrap()[0].cell, 4007);
    playability_installed::record_bundled(&pic, id, &mut history, &out);

    for (memo, amount, reason) in [
        ("MOVE 1 4005|Blocked", 10_000, "STRUCTURE_TOO_CLOSE"),
        ("DMOVE 1 4006|Blocked", 10_000, "STRUCTURE_TOO_CLOSE"),
        ("DMOVE 1 8008|Away", 10_000, "ACCEPTED"),
        ("MOVE 1 4005|Alone", 10_000, "ACCEPTED"),
        ("NEW 0 1 4008|Blocked", 400_000_000, "STRUCTURE_TOO_CLOSE"),
        ("NEW 0 1 4009|Boundary", 400_000_000, "ACCEPTED"),
        ("DEFLECT 8010 E|Blocked", 10_000_000, "STRUCTURE_TOO_CLOSE"),
        ("DEFLECT 12014 E|Open", 10_000_000, "ACCEPTED"),
    ] {
        send(payer, memo, amount, reason);
    }
    let last = send(joining, "NEW 0 1|Hello", 100_000_000, "ACCEPTED");
    drop(send);
    wait_admitted(&pic, id, last);
    complete_one_trickle_tick(&pic, id);
    playability_installed::record_bundled(&pic, id, &mut history, &out);

    let joined = arena_world(&pic, id);
    let join = joined
        .cannons
        .iter()
        .find(|c| c.account == funding_account(joining).to_hex())
        .unwrap();
    assert_eq!(join.cell, 504509);
    let mut observed = BTreeMap::new();
    let mut events = Vec::new();
    let mut shouts = Vec::new();
    for p in &history {
        let segment = p.head.segment_id.as_ref().unwrap().0.to_string();
        let raw = std::fs::read(out.join(format!("publication-{segment}-artifact-1.bin"))).unwrap();
        let audit: Value = decode(&raw).unwrap();
        for event in audit["events"].as_array().unwrap() {
            for key in ["launch_annotation", "action_annotation"] {
                if let Some(shout) = event[key]["cry"].as_str() {
                    shouts.push(shout.to_owned());
                }
            }
        }
        for receipt in audit["receipts"].as_array().unwrap() {
            let position: u64 = receipt["position"]["$integer"]
                .as_str()
                .unwrap()
                .parse()
                .unwrap();
            assert!(observed.insert(position, receipt.clone()).is_none());
            assert_eq!(receipt["reason"], expected[&position]);
            if expected[&position] != "ACCEPTED" {
                assert_eq!(receipt["remainder"], receipt["amount"]);
                assert_eq!(receipt["amount_used"]["$integer"], "0");
            }
        }
        events.push(json!({"segment_id":segment,"events_hex":hex(&raw)}));
    }
    assert_eq!(observed.len(), expected.len());
    shouts.sort();
    assert_eq!(
        shouts,
        ["Alone", "Away", "Boundary", "Hello", "Old", "Open"]
    );
    save(
        &out,
        "trace.json",
        &json!({
            "status":"PASS","initial_world_hex":hex(&initial),"publications":history,
            "inputs":inputs.iter().map(|(n,p)|json!({"position":n.to_string(),"payload_hex":p})).collect::<Vec<_>>(),
            "assigned":observed.keys().map(|n|n.to_string()).collect::<Vec<_>>(),"artifact_events":events
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
    let repo = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    assert!(
        std::process::Command::new("node")
            .current_dir(repo)
            .args([
                "tools/capture_war_cry_installed.mjs",
                out.join("configuration.json").to_str().unwrap(),
                out.join("trace.json").to_str().unwrap(),
                out.join("authenticated").to_str().unwrap(),
            ])
            .status()
            .unwrap()
            .success(),
        "independent authenticated Rules15 replay"
    );
}

// Opt-in until the exact predecessor is supplied to the hosted successor gate.
#[test]
#[ignore = "requires the exact qualified Rules15 normal predecessor archive"]
fn reservoirs_rules15_upgrade_official_transfers_and_replay() {
    reservoir_then_economy(false, false, false);
}

#[test]
#[ignore = "requires the exact deployed Rules16 normal predecessor"]
fn economy_rules16_upgrade_official_timestamps_and_replay() {
    reservoir_then_economy(true, false, false);
}

#[test]
#[ignore = "requires the exact deployed Rules16 normal predecessor"]
fn economy_recovers_missing_index_times_from_official_ledger_and_archive() {
    reservoir_then_economy(true, true, false);
}

fn archived_payment_time(pic: &PocketIc, ledger: Principal, position: u64) -> u64 {
    let args = candid::encode_one(ic_ledger_types::GetBlocksArgs {
        start: position,
        length: 1,
    })
    .unwrap();
    let response = pic
        .query_call(ledger, Principal::anonymous(), "query_blocks", args.clone())
        .unwrap();
    let blocks: ic_ledger_types::QueryBlocksResponse = decode_one(&response).unwrap();
    assert!(blocks.blocks.is_empty());
    assert_eq!(blocks.archived_blocks.len(), 1);
    let range = blocks.archived_blocks.into_iter().next().unwrap();
    assert!(range.start <= position && position < range.start + range.length);
    let callback: candid::Func = range.callback.into();
    let response = pic
        .query_call(
            callback.principal,
            Principal::anonymous(),
            &callback.method,
            args,
        )
        .unwrap();
    let archive: ic_ledger_types::GetBlocksResult = decode_one(&response).unwrap();
    let archive = archive.unwrap();
    assert_eq!(archive.blocks.len(), 1);
    archive.blocks[0].timestamp.timestamp_nanos
}

fn recover_missing_index_times(
    pic: &PocketIc,
    id: Principal,
    ledger: Principal,
    index: Principal,
    official_index: Principal,
    first: u64,
    last: u64,
    priced: &BTreeMap<u64, (u64, u32, u64)>,
    out: &Path,
) {
    let query = candid::encode_one(source::HistoryArgs {
        account_identifier: funding_account(id).to_hex(),
        start: None,
        max_results: 64,
    })
    .unwrap();
    let official_rows = || {
        let raw = pic
            .query_call(
                official_index,
                Principal::anonymous(),
                "get_account_identifier_transactions",
                query.clone(),
            )
            .unwrap();
        decode_one::<source::HistoryResult>(&raw).unwrap().unwrap()
    };
    for _ in 0..90 {
        if official_rows()
            .transactions
            .first()
            .is_some_and(|r| r.id == last)
        {
            break;
        }
        tick(pic);
    }
    let mut history = official_rows();
    assert_eq!(history.transactions.first().unwrap().id, last);
    let before = status(pic, id).source.admitted_to_exclusive;
    assert!(before <= first);
    assert_eq!(status(pic, id).source.pending_records, 0);
    assert_eq!(archived_payment_time(pic, ledger, first), priced[&first].0);
    let direct: ic_ledger_types::QueryBlocksResponse = decode_one(
        &pic.query_call(
            ledger,
            Principal::anonymous(),
            "query_blocks",
            candid::encode_one(ic_ledger_types::GetBlocksArgs {
                start: last,
                length: 1,
            })
            .unwrap(),
        )
        .unwrap(),
    )
    .unwrap();
    assert_eq!(direct.first_block_index, last);
    assert!(direct.archived_blocks.is_empty());
    assert_eq!(direct.blocks.len(), 1);
    assert_eq!(direct.blocks[0].timestamp.timestamp_nanos, priced[&last].0);

    for row in &mut history.transactions {
        if row.id == first || row.id == last {
            assert_eq!(
                row.transaction.timestamp.as_ref().unwrap().timestamp_nanos,
                priced[&row.id].0
            );
            row.transaction.timestamp = None;
        }
    }
    let response = |h: source::History| candid::encode_one(source::HistoryResult::Ok(h)).unwrap();
    let mut mismatch = history.clone();
    let source::Operation::Transfer { amount, .. } =
        &mut mismatch.transactions[0].transaction.operation
    else {
        panic!("expected the newest official Index record to be a transfer");
    };
    amount.e8s += 1;
    // Only the disposable transport is replaced. The original ledger and its
    // archive remain installed official canisters, and the target is normal Wasm.
    pic.reinstall_canister(
        index,
        bytes("S14_SLOW_INDEX_WASM"),
        encode_args((ledger, 0u32, response(mismatch))).unwrap(),
        Some(controller()),
    )
    .unwrap();
    pic.start_canister(index, Some(controller())).unwrap();
    for _ in 0..130 {
        tick(pic);
        if status(pic, id)
            .source
            .last_error
            .as_deref()
            .is_some_and(|e| e.contains("Ledger timestamp block does not match Index transaction"))
        {
            break;
        }
    }
    let rejected = status(pic, id).source;
    assert_eq!(
        rejected.last_error.as_deref(),
        Some("Ledger timestamp block does not match Index transaction")
    );
    assert_eq!(rejected.admitted_to_exclusive, before);
    assert_eq!(rejected.pending_records, 0);
    pic.update_call(
        index,
        controller(),
        "set_reply",
        encode_args((0u32, response(history))).unwrap(),
    )
    .unwrap();
    wait_admitted(pic, id, last);
    assert_eq!(status(pic, id).source.admitted_to_exclusive, last + 1);
    save(
        out,
        "timestamp-fallback.json",
        &json!({
            "status":"PASS", "archived_position":first, "direct_position":last,
            "archived_timestamp_ns":priced[&first].0.to_string(), "direct_timestamp_ns":priced[&last].0.to_string(),
            "rejected_cursor":before, "rejected_pending_records":0, "admitted_cursor":last + 1,
            "source_error":rejected.last_error
        }),
    );
}

#[test]
#[ignore = "focused disposable signed financial successor"]
fn delegation_rules17_upgrade_signed_ledger_and_replay() {
    reservoir_then_economy(true, false, true);
}

// TEMPORARY DEVELOPMENT ONLY — REMOVE BEFORE PUBLIC LAUNCH
fn complete_developer_speed_ticks(
    pic: &PocketIc,
    id: Principal,
    history: &mut Vec<Publication>,
    out: &Path,
) {
    use super::dev_speed_installed::{DevSpeed, bind, switch};
    let predecessor = bytes("B2Z_RULES18_PRIOR_WASM");
    assert_eq!(
        dtr_wire::hash(&predecessor),
        "43095677376fe4f3c66185b1cf185ef9e161b5c44320609b93e134a771f4bf59"
    );
    upgrade(pic, id, predecessor.clone());
    let publication = observe(pic, id).0.publication;
    let world = arena_world(pic, id).encode().unwrap();
    let finance = funding_tests::preserved_finance(pic, id);
    let cursor = status(pic, id).source.admitted_to_exclusive;
    #[derive(CandidType, Deserialize)]
    struct Pending {
        pending_inputs: u32,
    }
    let pending = || {
        get_query::<Pending>(pic, id, "controller_work", encode_args(()).unwrap()).pending_inputs
    };
    let queued = pending();
    assert!(queued > 0);

    let candidate = bytes("B2Z_DEV_SPEED_RELEASE_WASM");
    upgrade(pic, id, candidate.clone());
    assert_eq!(observe(pic, id).0.publication, publication);
    assert_eq!(arena_world(pic, id).encode().unwrap(), world);
    assert_eq!(funding_tests::preserved_finance(pic, id), finance);
    assert_eq!(status(pic, id).source.admitted_to_exclusive, cursor);
    assert_eq!(pending(), queued);

    let operator = Principal::self_authenticating([27; 32]);
    bind(pic, id, Some(operator));
    playability_installed::configuration(pic, id, 512);
    let before = status(pic, id).run.completed_segments;
    assert_eq!(pending(), queued);
    assert_eq!(
        switch(pic, id, operator, true, None)
            .unwrap()
            .remaining_seconds,
        120
    );
    let start = pic.get_time().as_nanos_since_unix_epoch();
    let cycles = pic.cycle_balance(id);
    let mut milliseconds = Vec::new();
    for _ in 0..60 {
        pic.advance_time(Duration::from_millis(100));
        for _ in 0..4 {
            pic.tick();
        }
        let count = status(pic, id).run.completed_segments;
        if count > before + milliseconds.len() as u64 {
            assert_eq!(count, before + milliseconds.len() as u64 + 1);
            milliseconds.push((pic.get_time().as_nanos_since_unix_epoch() - start) / 1_000_000);
            playability_installed::record_bundled(pic, id, history, out);
        }
        if milliseconds.len() == 3 {
            break;
        }
    }
    assert_eq!(milliseconds.len(), 3);
    assert!(
        milliseconds
            .windows(2)
            .all(|w| (1_000..=1_100).contains(&(w[1] - w[0]))),
        "{milliseconds:?}"
    );
    let cycle_cost = cycles - pic.cycle_balance(id);
    assert_eq!(
        switch(pic, id, operator, false, None).unwrap().mode,
        "Adaptive"
    );
    let stopped = status(pic, id).run;
    assert_eq!(stopped.pace.unwrap().supported_milli, 10);
    assert_eq!(pending(), 0);
    assert_eq!(
        switch(pic, id, operator, true, None)
            .unwrap()
            .remaining_seconds,
        120
    );
    pic.advance_time(Duration::from_secs(120));
    for _ in 0..4 {
        pic.tick();
    }
    let read = get_query::<DevSpeed>(pic, id, "dev_simulation_speed", encode_args(()).unwrap());
    assert_eq!(read.mode, "Adaptive");
    get_result::<Status>(pic, id, "pause_autonomous", encode_args(()).unwrap());
    if status(pic, id).run.completed_segments > stopped.completed_segments {
        playability_installed::record_bundled(pic, id, history, out);
    }

    let settled = observe(pic, id).0.publication;
    let settled_state = arena_world(pic, id).encode().unwrap();
    let settled_finance = funding_tests::preserved_finance(pic, id);
    upgrade(pic, id, predecessor.clone());
    assert_eq!(observe(pic, id).0.publication, settled);
    assert_eq!(arena_world(pic, id).encode().unwrap(), settled_state);
    assert_eq!(funding_tests::preserved_finance(pic, id), settled_finance);
    assert_eq!(status(pic, id).source.admitted_to_exclusive, cursor);
    save(
        out,
        "developer-speed-rules18.json",
        &json!({
            "status":"PASS", "normal_predecessor":dtr_wire::hash(&predecessor), "development_candidate":dtr_wire::hash(&candidate),
            "queued_rules18_inputs":queued, "ticks_ms":milliseconds, "cycles_for_three_samples":cycle_cost.to_string(),
            "adaptive_supported_milli":10, "default_expiry_seconds":120, "exact_normal_recovery":true,
        }),
    );
}

fn reservoir_then_economy(successor_economy: bool, recover_times: bool, delegation: bool) {
    use b2z_protocol::{economy17, reservoir, shout};
    let out = PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap()).join("reservoir");
    std::fs::create_dir_all(&out).unwrap();
    let mut signer = delegation.then(|| super::delegation_installed::Signer::start(&out));
    let payer = signer
        .as_ref()
        .map(|signer| signer.owner)
        .unwrap_or_else(|| Principal::self_authenticating([9; 32]));
    let mut fixture = test_world(payer);
    let wall_ns = std::time::UNIX_EPOCH.elapsed().unwrap().as_nanos() as u64;
    let midnight = (wall_ns / economy17::DAY_NS - 3) * economy17::DAY_NS;
    let seconds_ago = if successor_economy {
        let state = fixture.playability.as_mut().unwrap();
        state.elapsed_ns = dtr_wire::Int((midnight - 7_200_000_000_000).into());
        for entry in &mut state.lifecycle {
            if entry.deadline_ns.is_some() {
                let deadline = midnight - 600_000_000_000;
                entry.dormant_since_ns = Some(dtr_wire::Int((deadline - economy17::DAY_NS).into()));
                entry.deadline_ns = Some(dtr_wire::Int(deadline.into()));
            }
        }
        (wall_ns - midnight) / 1_000_000_000 + 3_600
    } else {
        500
    };
    let initial = fixture.encode().unwrap();
    let (pic, id, ledger, _) = arena_setup_world_fee_clock_payers_options(
        bytes("B2Z_S14_TEST_WASM"),
        initial.clone(),
        10_000,
        seconds_ago,
        if delegation {
            std::slice::from_ref(&payer)
        } else {
            &[]
        },
        delegation,
    );
    if delegation {
        #[derive(CandidType, Deserialize)]
        struct Standard {
            name: String,
            url: String,
        }
        let raw = pic
            .query_call(
                ledger,
                Principal::anonymous(),
                "icrc1_supported_standards",
                encode_args(()).unwrap(),
            )
            .unwrap();
        let standards: Vec<Standard> = decode_one(&raw).unwrap();
        assert!(standards.iter().any(|standard| standard.name == "ICRC-2"));
    }
    playability_installed::funding_paused(&pic, id, true);
    upgrade(&pic, id, retained_wasm());
    playability_installed::configuration(&pic, id, 512);
    get_result::<Status>(&pic, id, "pause_autonomous", encode_args(()).unwrap());
    complete_one_trickle_tick(&pic, id);
    let mut history = vec![];
    playability_installed::record_bundled(&pic, id, &mut history, &out);
    upgrade(&pic, id, bytes("B2Z_RULES13_PRIOR_WASM"));
    war_cry_installed::transition_with_recovery_module(
        &pic,
        id,
        "context",
        "B2Z_RULES13_PRIOR_WASM",
    );
    playability_installed::record_bundled(&pic, id, &mut history, &out);
    complete_one_trickle_tick(&pic, id);
    playability_installed::record_bundled(&pic, id, &mut history, &out);
    upgrade(&pic, id, bytes("B2Z_RULES14_PRIOR_WASM"));
    war_cry_installed::transition_with_recovery_module(&pic, id, "shout", "B2Z_RULES14_PRIOR_WASM");
    playability_installed::record_bundled(&pic, id, &mut history, &out);

    let mut input = BTreeMap::new();
    let mut receipts = BTreeMap::new();
    let mut send = |text: &str, amount: u64, reason: &str, adapter: u8| {
        let position = transfer_text(&pic, ledger, payer, id, amount, text.as_bytes());
        let (prefix, memo, cry) = if adapter == 9 {
            let parsed = shout::parse_text(text.as_bytes()).unwrap();
            (
                shout::NORMALIZED_PAYMENT,
                codec::encode(parsed.command).unwrap(),
                parsed.cry,
            )
        } else {
            let (memo, cry) = reservoir::decode_ledger(0, Some(text.as_bytes())).unwrap();
            (reservoir::NORMALIZED_PAYMENT, memo, cry)
        };
        let mut raw = prefix.to_vec();
        raw.extend(funding_account(payer).as_bytes());
        raw.extend(amount.to_be_bytes());
        raw.extend(memo);
        raw.push(cry.len() as u8);
        raw.extend(cry.as_bytes());
        input.insert(position, hex(&raw));
        receipts.insert(position, reason.to_owned());
        position
    };
    let historic = send("DEFLECT 4007 N|Before", 10_000_000, "ACCEPTED", 9);
    wait_admitted(&pic, id, historic);
    complete_one_trickle_tick(&pic, id);
    playability_installed::record_bundled(&pic, id, &mut history, &out);
    let predecessor = bytes("B2Z_RULES15_PRIOR_WASM");
    assert_eq!(
        dtr_wire::hash(&predecessor),
        "8d7f1a670acb9f89646afbf715d05045079de0f6925367058476c88ac1da9d89"
    );
    upgrade(&pic, id, predecessor);
    war_cry_installed::transition_with_recovery_module(
        &pic,
        id,
        "spacing",
        "B2Z_RULES15_PRIOR_WASM",
    );
    playability_installed::record_bundled(&pic, id, &mut history, &out);
    complete_one_trickle_tick(&pic, id);
    playability_installed::record_bundled(&pic, id, &mut history, &out);

    let normal16 = if successor_economy {
        "B2Z_RULES16_PRIOR_WASM"
    } else {
        "B2Z_S14_WASM"
    };
    if successor_economy {
        assert_eq!(
            dtr_wire::hash(&bytes(normal16)),
            "a5889a92ce936b035d02632588b75ae7f66ddfda73398177dd79cba2b5b48dcd"
        );
    }
    let old = arena_world(&pic, id);
    let old_publication = observe(&pic, id).0.publication;
    let finance = funding_tests::preserved_finance(&pic, id);
    let cursor = status(&pic, id).source.admitted_to_exclusive;
    upgrade(&pic, id, bytes(normal16));
    assert_eq!(observe(&pic, id).0.publication, old_publication);
    war_cry_installed::transition_with_recovery_module(&pic, id, "reservoir", normal16);
    assert_eq!(
        arena_world(&pic, id).encode().unwrap(),
        b2z_native::reservoirs::migrate(old)
            .unwrap()
            .encode()
            .unwrap()
    );
    assert_eq!(funding_tests::preserved_finance(&pic, id), finance);
    assert_eq!(status(&pic, id).source.admitted_to_exclusive, cursor);
    playability_installed::record_bundled(&pic, id, &mut history, &out);

    for (text, reason) in [
        ("RESERVOIR 4005", "ACCEPTED"),
        ("RESERVOIR 4006", "ACCEPTED"),
        ("RESERVOIR 4006", "SITE_OCCUPIED"),
        ("RESERVOIR 4007", "SITE_OCCUPIED"),
        ("RESERVOIR 4010", "ENEMY_TERRITORY_TOO_CLOSE"),
        ("RESERVOIR 4009", "ACCEPTED"),
    ] {
        send(text, reservoir::PRICE_E8S, reason, 10);
    }
    let last = send(
        "RESERVOIR 10003",
        reservoir::PRICE_E8S - 1,
        "UNDERFUNDED",
        10,
    );
    drop(send);
    wait_admitted(&pic, id, last);
    complete_one_trickle_tick(&pic, id);
    playability_installed::record_bundled(&pic, id, &mut history, &out);
    let w = arena_world(&pic, id);
    let cells: Vec<_> = (0..w.cell_count())
        .filter(|&cell| b2z_native::reservoirs::has(&w, cell))
        .collect();
    assert_eq!(cells, [4005, 4006, 4009]);
    let current = arena_world(&pic, id).encode().unwrap();
    upgrade(&pic, id, bytes(normal16));
    assert_eq!(arena_world(&pic, id).encode().unwrap(), current);

    let mut priced = BTreeMap::new();
    let mut delegated_positions = BTreeMap::new();
    let normal17 = if delegation {
        "B2Z_RULES17_PRIOR_WASM"
    } else {
        "B2Z_S14_WASM"
    };
    if successor_economy {
        let old = arena_world(&pic, id);
        let publication = observe(&pic, id).0.publication;
        let finance = funding_tests::preserved_finance(&pic, id);
        let cursor = status(&pic, id).source.admitted_to_exclusive;
        upgrade(&pic, id, bytes(normal17));
        assert_eq!(observe(&pic, id).0.publication, publication);
        assert_eq!(arena_world(&pic, id), old);
        war_cry_installed::transition_with_recovery_module(&pic, id, "economy", normal17);
        let new = arena_world(&pic, id);
        assert_eq!(new.version, 9);
        let bootstrap = new
            .economy
            .as_ref()
            .unwrap()
            .activated_ns
            .0
            .to_string()
            .parse()
            .unwrap();
        assert_eq!(new, b2z_native::economy17::migrate(old, bootstrap).unwrap());
        assert_eq!(new.economy.as_ref().unwrap().initial_multiplier, 2);
        assert_eq!(funding_tests::preserved_finance(&pic, id), finance);
        assert_eq!(status(&pic, id).source.admitted_to_exclusive, cursor);
        playability_installed::record_bundled(&pic, id, &mut history, &out);

        let jump = |ns| pic.set_time((std::time::UNIX_EPOCH + Duration::from_nanos(ns)).into());
        assert!(pic.get_time().as_nanos_since_unix_epoch() < midnight - 599_000_000_000);
        jump(midnight - 599_000_000_000);
        for _ in 0..80 {
            tick(&pic);
            if b2z_native::economy17::population(&arena_world(&pic, id)) == 1 {
                break;
            }
        }
        assert_eq!(b2z_native::economy17::population(&arena_world(&pic, id)), 1);
        playability_installed::record_bundled(&pic, id, &mut history, &out);
        jump(midnight + 12_000_000_000);
        for _ in 0..80 {
            tick(&pic);
            if !arena_world(&pic, id).economy.unwrap().snapshots.is_empty() {
                break;
            }
        }
        let announced = arena_world(&pic, id);
        let day = &announced.economy.as_ref().unwrap().snapshots[0];
        assert_eq!(day.population, 1);
        let effective = midnight + economy17::DAY_NS;
        assert_eq!(
            day.effective_ns.0.to_string().parse::<u64>().unwrap(),
            effective
        );
        playability_installed::record_bundled(&pic, id, &mut history, &out);

        let fallback = recover_times.then(|| {
            let index = status(&pic, id).source.index;
            pic.stop_canister(index, Some(controller())).unwrap();
            // The disposable arena starts with a Trickle-sized balance, but
            // the official Ledger reserves 10T to create its archive.
            pic.add_cycles(ledger, 100_000_000_000_000);
            let official_index = create_controlled(&pic);
            pic.add_cycles(official_index, 100_000_000_000_000);
            pic.install_canister(
                official_index,
                bytes("ICP_INDEX_WASM"),
                candid::encode_one(Some(IndexArg::Init(IndexInit {
                    ledger_id: ledger,
                    retrieve_blocks_from_ledger_interval_seconds: Some(1),
                })))
                .unwrap(),
                Some(controller()),
            );
            (index, official_index)
        });
        let mut send = |text: &str, amount: u64, reason: &str, wanted: u32, used: u64| {
            let created_at = text
                .ends_with("|After")
                .then_some(effective + 1_000_000_000);
            let position =
                transfer_text_at(&pic, ledger, payer, id, amount, text.as_bytes(), created_at);
            // Fetch the actual Ledger timestamp independently of the game's
            // Index adapter and use it to reconstruct the normalized input.
            let response = pic
                .query_call(
                    ledger,
                    Principal::anonymous(),
                    "query_blocks",
                    candid::encode_one(ic_ledger_types::GetBlocksArgs {
                        start: position,
                        length: 1,
                    })
                    .unwrap(),
                )
                .unwrap();
            let blocks: ic_ledger_types::QueryBlocksResponse = decode_one(&response).unwrap();
            assert_eq!(blocks.first_block_index, position);
            assert_eq!(blocks.blocks.len(), 1);
            let recorded = blocks.blocks[0].timestamp.timestamp_nanos;
            if let Some(created_at) = created_at {
                assert_ne!(recorded, created_at);
                assert!(recorded >= effective + economy17::GRACE_NS);
                assert!(created_at < effective + economy17::GRACE_NS);
            }
            let (memo, cry) = reservoir::decode_ledger(0, Some(text.as_bytes())).unwrap();
            let mut raw = reservoir::NORMALIZED_PAYMENT.to_vec();
            raw.extend(funding_account(payer).as_bytes());
            raw.extend(amount.to_be_bytes());
            raw.extend(memo);
            raw.push(cry.len() as u8);
            raw.extend(cry.as_bytes());
            input.insert(
                position,
                hex(&economy17::timestamped(&raw, recorded).unwrap()),
            );
            receipts.insert(position, reason.to_owned());
            priced.insert(position, (recorded, wanted, used));
            position
        };
        jump(effective - 120_000_000_000);
        let owner_id = announced.playability.as_ref().unwrap().players[0].id;
        let balls = announced
            .balls
            .iter()
            .filter(|b| b.owner == owner_id)
            .count();
        let fire_price = |rate, n| economy17::marginal(economy17::BALL_BASE_E8S, rate, n).unwrap();
        let first = send(
            "FIRE 1 225 1|Earlier",
            fire_price(2, balls),
            "ACCEPTED",
            2,
            fire_price(2, balls),
        );
        jump(effective + 1_800_000_000_000);
        send(
            "FIRE 1 225 1|Grace",
            fire_price(2, balls + 1),
            "ACCEPTED",
            1,
            fire_price(1, balls + 1),
        );
        jump(effective + economy17::GRACE_NS + 1);
        send(
            "FIRE 1 225 1|After",
            fire_price(1, balls + 2) - 1,
            "UNDERFUNDED",
            1,
            0,
        );
        send(
            "RESERVOIR 4008",
            economy17::RESERVOIR_PRICE_E8S,
            "ACCEPTED",
            1,
            economy17::RESERVOIR_PRICE_E8S,
        );
        for (memo, price) in [
            ("DMOVE 1 8008|Away", 10_000),
            ("MOVE 1 4003|Across", 10_000),
            ("NEW 0 2 10003|Build", 4_000_000 + fire_price(1, balls + 3)),
            ("DEFLECT 12014 E|Divert", 400_000),
        ] {
            send(memo, price, "ACCEPTED", 1, price);
        }
        let pos = send("DROT 1 W|Turn", 10_000, "ACCEPTED", 1, 10_000);
        drop(send);
        // An idle daily checkpoint must be emitted before checking the settled
        // tick sequence. Pending Ledger work is processed hours after it landed.
        jump(effective + 3 * economy17::GRACE_NS);
        if let Some((index, official_index)) = fallback {
            recover_missing_index_times(
                &pic,
                id,
                ledger,
                index,
                official_index,
                first,
                pos,
                &priced,
                &out,
            );
        }
        wait_admitted(&pic, id, pos);
        let head_before = observe(&pic, id)
            .1
            .head
            .segment_id
            .unwrap()
            .0
            .to_string()
            .parse::<u64>()
            .unwrap();
        let cycles_before = pic.cycle_balance(id);
        complete_one_trickle_tick(&pic, id);
        playability_installed::record_bundled(&pic, id, &mut history, &out);
        let result = arena_world(&pic, id);
        assert!(b2z_native::reservoirs::has(&result, 4008));
        assert_eq!(
            result.balls.iter().filter(|b| b.owner == owner_id).count(),
            balls + 4
        );
        assert_eq!(
            result.cannons.iter().find(|c| c.id == 1).unwrap().cell,
            4003
        );
        assert!(result.cannons.iter().any(|c| c.cell == 10003));
        let diverters = result.deflectors.as_ref().unwrap();
        let moved = diverters.iter().find(|d| d.id == 1).unwrap();
        assert_eq!((moved.cell, moved.orientation.as_str()), (8008, "SW"));
        assert!(diverters.iter().any(|d| d.cell == 12014));
        assert_eq!(result.economy.as_ref().unwrap().tariffs(effective).0, 1);
        let raw = result.encode().unwrap();
        upgrade(&pic, id, bytes(normal17));
        assert_eq!(arena_world(&pic, id).encode().unwrap(), raw);
        save(
            &out,
            "economy-cost.json",
            &json!({"head_before":head_before,"paid_cycles":(cycles_before-pic.cycle_balance(id)).to_string(),
            "state_bytes":raw.len(),"predecessor":dtr_wire::hash(&bytes(normal16)),"successor":dtr_wire::hash(&bytes(normal17))}),
        );
        if let Some(signer) = signer.as_mut() {
            assert_eq!(
                dtr_wire::hash(&bytes(normal17)),
                "c066140f4ef3174b3f440694c19ec4116a03298fcc63b80636b0b5389bc210ca"
            );
            let p = observe(&pic, id).0.publication;
            let f = funding_tests::preserved_finance(&pic, id);
            let s = status(&pic, id).source.admitted_to_exclusive;
            upgrade(&pic, id, bytes("B2Z_S14_WASM"));
            assert_eq!(observe(&pic, id).0.publication, p);
            assert_eq!(arena_world(&pic, id), result);
            war_cry_installed::transition(&pic, id, "delegation");
            assert_eq!(
                arena_world(&pic, id),
                b2z_native::delegation_v18::migrate(result.clone(), funding_account(id).to_hex())
                    .unwrap()
            );
            assert_eq!(funding_tests::preserved_finance(&pic, id), f);
            assert_eq!(status(&pic, id).source.admitted_to_exclusive, s);
            playability_installed::record_bundled(&pic, id, &mut history, &out);
            let owned_balls = result.balls.iter().filter(|b| b.owner == owner_id).count();
            let signed = signer.pay(&pic, id, ledger, &result, owned_balls);
            let last = *signed.keys().last().unwrap();
            let rows = super::delegation_installed::official_inputs(&pic, id, &signed);
            for (proof, (reason, amount_used, spender)) in rows {
                let position = proof.position;
                assert_eq!(proof.from, *funding_account(payer).as_bytes());
                assert_eq!(proof.to, *funding_account(id).as_bytes());
                assert_eq!(proof.fee, 10_000);
                assert_eq!(
                    proof.spender,
                    spender.map(|p| *funding_account(p).as_bytes())
                );
                receipts.insert(position, reason);
                input.insert(position, hex(&proof.encode().unwrap()));
                delegated_positions.insert(position, (proof, amount_used));
            }
            wait_admitted(&pic, id, last);
            // Upgrade before applying admitted source positions, then confirm
            // that exactly one retained receipt is produced per position.
            // TEMPORARY DEVELOPMENT ONLY — REMOVE BEFORE PUBLIC LAUNCH
            if std::env::var_os("B2Z_DEV_SPEED_RELEASE_WASM").is_some() {
                complete_developer_speed_ticks(&pic, id, &mut history, &out);
            } else {
                upgrade(&pic, id, bytes("B2Z_S14_WASM"));
                complete_one_trickle_tick(&pic, id);
                playability_installed::record_bundled(&pic, id, &mut history, &out);
            }
            let after = arena_world(&pic, id);
            assert_eq!(
                after.balls.iter().filter(|b| b.owner == owner_id).count(),
                owned_balls + 2
            );
            assert_eq!(after.reservoirs, result.reservoirs);
            assert!(after.authorization.as_ref().unwrap().grants.is_empty());
            assert_eq!(status(&pic, id).source.admitted_to_exclusive, last + 1);
        }
    }

    let mut observed = BTreeMap::new();
    let mut events = Vec::new();
    for p in &history {
        let segment = p.head.segment_id.as_ref().unwrap().0.to_string();
        let raw = std::fs::read(out.join(format!("publication-{segment}-artifact-1.bin"))).unwrap();
        let audit: Value = decode(&raw).unwrap();
        for receipt in audit["receipts"].as_array().unwrap() {
            let position: u64 = receipt["position"]["$integer"]
                .as_str()
                .unwrap()
                .parse()
                .unwrap();
            assert!(observed.insert(position, receipt.clone()).is_none());
            assert_eq!(receipt["reason"], receipts[&position]);
            if let Some((proof, used)) = delegated_positions.get(&position) {
                assert_eq!(receipt["account"], hex(&proof.from));
                assert_eq!(
                    receipt["transfer"]["memo"],
                    proof
                        .memo
                        .as_ref()
                        .map(|m| hex(m))
                        .map(Value::String)
                        .unwrap_or(Value::Null)
                );
                assert_eq!(receipt["transfer"]["raw_digest"], hex(&proof.raw_digest));
                assert_eq!(
                    receipt["transfer"]["ledger_recorded_ns"]["$integer"],
                    proof.ledger_time_ns.to_string()
                );
                assert_eq!(receipt["amount_used"]["$integer"], used.to_string());
            }
            if receipts[&position] != "ACCEPTED" {
                assert_eq!(receipt["remainder"], receipt["amount"]);
                assert_eq!(receipt["amount_used"]["$integer"], "0");
            }
            if let Some((recorded, multiplier, used)) = priced.get(&position) {
                assert_eq!(
                    receipt["ledger_recorded_ns"]["$integer"],
                    recorded.to_string()
                );
                assert_eq!(receipt["price_multiplier"], *multiplier);
                assert_eq!(receipt["amount_used"]["$integer"], used.to_string());
            } else if receipts[&position] == "ACCEPTED"
                && position != historic
                && !delegated_positions.contains_key(&position)
            {
                assert_eq!(receipt["amount_used"]["$integer"], "1000000");
            }
        }
        events.push(json!({"segment_id":segment,"events_hex":hex(&raw)}));
    }
    assert_eq!(observed.len(), receipts.len());
    save(
        &out,
        "trace.json",
        &json!({
            "status":"PASS","initial_world_hex":hex(&initial),"publications":history,"artifact_events":events,
            "inputs":input.iter().map(|(n,p)|json!({"position":n.to_string(),"payload_hex":p})).collect::<Vec<_>>(),
            "assigned":observed.keys().map(|n|n.to_string()).collect::<Vec<_>>()
        }),
    );
    let wall = pocket_ic::Time::from(std::time::SystemTime::now());
    if wall.as_nanos_since_unix_epoch() > pic.get_time().as_nanos_since_unix_epoch() {
        pic.set_time(wall);
    }
    let mut live =
        PocketIc::new_from_existing_instance(pic.get_server_url(), pic.instance_id(), None);
    let gateway = live.make_live(None);
    let mut connection = json!({
        "network":"pocketic-local","host":gateway.as_str(),"canister_id":id.to_text(),
        "ledger":ledger.to_text(),"index":status(&pic,id).source.index.to_text(),
        "root_key_hex":hex(&pic.root_key().unwrap()),"listening_account":funding_account(payer).to_hex()
    });
    if delegation {
        // Source processing advances the disposable simulation clock past the
        // SDK's real signing time. Pin the freshness check to the replica's
        // independent consensus clock without weakening either bound.
        connection["verification_time_ns"] =
            json!(live.get_time().as_nanos_since_unix_epoch().to_string());
        connection["replay_evicted_artifacts"] = json!(true);
    }
    save(&out, "configuration.json", &connection);
    let repo = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    assert!(
        std::process::Command::new("node")
            .current_dir(repo)
            .args([
                "tools/capture_war_cry_installed.mjs",
                out.join("configuration.json").to_str().unwrap(),
                out.join("trace.json").to_str().unwrap(),
                out.join("authenticated").to_str().unwrap(),
            ])
            .status()
            .unwrap()
            .success(),
        "independent authenticated successor replay"
    );
    // TEMPORARY DEVELOPMENT ONLY — REMOVE BEFORE PUBLIC LAUNCH
    if let Some(release) = std::env::var_os("B2Z_DEV_SPEED_FRONTEND") {
        super::dev_speed_installed::certify_frontend(Path::new(&release), &out);
    }
}
