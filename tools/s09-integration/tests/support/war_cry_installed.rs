//! Actual valueless Ledger/Index → normal source → annotated launch; synthetic setup only.
use super::*;
use b2z_native::world::World;
fn save(out: &Path, name: &str, value: &serde_json::Value) {
    std::fs::write(out.join(name), serde_json::to_vec_pretty(value).unwrap()).unwrap();
}
fn transition(pic: &PocketIc, id: Principal, kind: &str) {
    playability_installed::prepare(pic, id, &format!("prepare_{kind}_transition"));
    let mut ready = false;
    for _ in 0..1800 {
        tick(pic);
        let raw: Vec<u8> = get_query(
            pic,
            id,
            &format!("{kind}_transition_status"),
            encode_args(()).unwrap(),
        );
        let v: serde_json::Value = decode(&raw).unwrap();
        if v["transition"]["phase"] == "ready" && transition_drained(pic, id) {
            ready = true;
            break;
        }
    }
    assert!(ready, "drained {kind} boundary");
    let manifest = observe(pic, id).1.head.manifest_hash;
    let wrong = pic
        .update_call(
            id,
            controller(),
            &format!("commit_{kind}_transition"),
            candid::encode_one("00".repeat(32)).unwrap(),
        )
        .unwrap();
    assert!(
        decode_one::<Result<Vec<u8>, String>>(&wrong)
            .unwrap()
            .is_err(),
        "stale/wrong manifest must fail"
    );
    let _: Vec<u8> = get_result(
        pic,
        id,
        &format!("commit_{kind}_transition"),
        candid::encode_one(manifest.clone()).unwrap(),
    );
    let installed = observe(pic, id).0.publication;
    let _: Vec<u8> = get_result(
        pic,
        id,
        &format!("commit_{kind}_transition"),
        candid::encode_one(manifest).unwrap(),
    );
    assert_eq!(
        observe(pic, id).0.publication,
        installed,
        "same commit is idempotent"
    );
    let wrong = pic
        .update_call(
            id,
            controller(),
            &format!("commit_{kind}_transition"),
            candid::encode_one("ab".repeat(32)).unwrap(),
        )
        .unwrap();
    assert!(
        decode_one::<Result<Vec<u8>, String>>(&wrong)
            .unwrap()
            .is_err(),
        "conflicting commit retry must fail"
    );
}
fn admitted(pic: &PocketIc, id: Principal, position: u64) {
    for _ in 0..180 {
        if status(pic, id).source.admitted_to_exclusive > position {
            return;
        }
        tick(pic);
    }
    panic!("real source did not admit Ledger position {position}");
}
#[test]
fn war_cry_real_ledger_index_launch_and_independent_replay() {
    run_war_cry(None, false);
}
#[test]
#[ignore = "exact retained paid European Rules7 module; disposable upgrade only"]
fn war_cry_european_rules7_upgrade() {
    let prior = bytes("B2Z_EUROPEAN_PRIOR_WASM");
    assert_eq!(
        dtr_wire::hash(&prior),
        "612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948"
    );
    run_war_cry(Some(prior), false);
}
#[test]
fn combined_real_ledger_index_launch_and_independent_replay() {
    run_war_cry(None, true);
}
#[test]
#[ignore = "exact retained paid European Rules7 module; disposable combined upgrade only"]
fn combined_european_rules7_launch_upgrade() {
    let prior = bytes("B2Z_EUROPEAN_PRIOR_WASM");
    assert_eq!(
        dtr_wire::hash(&prior),
        "612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948"
    );
    run_war_cry(Some(prior), true);
}
fn run_war_cry(european_prior: Option<Vec<u8>>, combined: bool) {
    let transition_kind = if combined { "combined" } else { "war_cry" };
    let configuration = if combined {
        b2z_native::combined_v11::configuration()
    } else {
        b2z_native::war_cry::configuration()
    };
    let repo = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    let out = PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap()).join(if combined {
        "combined-launch"
    } else {
        "war-cry"
    });
    std::fs::create_dir_all(&out).unwrap();
    let f: serde_json::Value =
        serde_json::from_slice(&std::fs::read(repo.join("tests/fixtures/rules-v6.json")).unwrap())
            .unwrap();
    let mut world =
        World::decode(&unhex(f["cases"]["revival"]["state_hex"].as_str().unwrap()).unwrap())
            .unwrap();
    let payer = Principal::self_authenticating([9; 32]);
    let extra = Principal::self_authenticating([10; 32]);
    let account = AccountIdentifier::new(&payer, &DEFAULT_SUBACCOUNT).to_hex();
    for c in &mut world.cannons {
        c.account = account.clone();
    }
    let base = std::env::var("B2Z_PROFILE_FIXED_TIME_NS")
        .ok()
        .map(|n| n.parse::<u64>().unwrap())
        .unwrap_or_else(|| {
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos() as u64
        })
        - 3_600_000_000_000;
    let p = world.playability.as_mut().unwrap();
    p.elapsed_ns = Int(base.into());
    for player in &mut p.players {
        player.account = account.clone();
    }
    for l in &mut p.lifecycle {
        if l.deadline_ns.is_some() {
            l.dormant_since_ns = Some(Int(base.into()));
            l.deadline_ns = Some(Int((base + 86_400_000_000_000).into()));
        }
    }
    for c in &mut world.credits {
        c.account = account.clone();
    }
    world.validate().unwrap();
    let initial = world.encode().unwrap();
    let (pic, id, ledger, _) = arena_setup_world_fee_clock_payers(
        bytes("B2Z_S14_TEST_WASM"),
        initial.clone(),
        10000,
        3600,
        &[extra],
    );
    playability_installed::funding_paused(&pic, id, true);
    pic.upgrade_canister(
        id,
        bytes("B2Z_S14_WASM"),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    get_result::<Status>(&pic, id, "pause_autonomous", encode_args(()).unwrap());
    // New controller methods are never a public game-command surface.
    for (method, args) in [
        (
            &format!("prepare_{transition_kind}_transition"),
            encode_args(()).unwrap(),
        ),
        (
            &format!("commit_{transition_kind}_transition"),
            candid::encode_one("0".repeat(64)).unwrap(),
        ),
    ] {
        let reply = pic
            .update_call(id, Principal::anonymous(), method, args)
            .unwrap();
        assert!(
            decode_one::<Result<Vec<u8>, String>>(&reply)
                .unwrap()
                .is_err()
        );
    }
    let reply = pic
        .query_call(
            id,
            Principal::anonymous(),
            &format!("{transition_kind}_transition_status"),
            encode_args(()).unwrap(),
        )
        .unwrap();
    assert!(
        decode_one::<Result<Vec<u8>, String>>(&reply)
            .unwrap()
            .is_err()
    );
    let reply = pic
        .update_call(
            id,
            controller(),
            &format!("prepare_{transition_kind}_transition"),
            encode_args(()).unwrap(),
        )
        .unwrap();
    assert!(
        decode_one::<Result<Vec<u8>, String>>(&reply)
            .unwrap()
            .unwrap_err()
            .contains("predecessor")
    );
    let mut rows = vec![];
    playability_installed::record(&pic, id, &mut rows, &out);
    transition(&pic, id, "entry");
    playability_installed::record(&pic, id, &mut rows, &out);
    let mut upgrade_proof = None;
    if let Some(prior) = &european_prior {
        let before = arena_world(&pic, id).encode().unwrap();
        let finance = funding_tests::preserved_finance(&pic, id);
        let publication = observe(&pic, id).0.publication;
        pic.upgrade_canister(
            id,
            prior.clone(),
            encode_args(()).unwrap(),
            Some(controller()),
        )
        .unwrap();
        assert_eq!(arena_world(&pic, id).encode().unwrap(), before);
        assert_eq!(funding_tests::preserved_finance(&pic, id), finance);
        assert_eq!(observe(&pic, id).0.publication, publication);
    }
    let mut payments = BTreeMap::new();
    // Previously rejected text stays rejected and is never reinterpreted at activation.
    let old = transfer_text(&pic, ledger, payer, id, 10000000, b"FIRE 1 0 1|Old");
    payments.insert(
        old,
        normalized(
            AccountIdentifier::new(&payer, &DEFAULT_SUBACCOUNT),
            10000000,
            [0; 8],
        ),
    );
    admitted(&pic, id, old);
    playability_installed::one_tick(&pic, id);
    playability_installed::record(&pic, id, &mut rows, &out);
    let before = arena_world(&pic, id).encode().unwrap();
    let finance = funding_tests::preserved_finance(&pic, id);
    if european_prior.is_some() {
        let publication = observe(&pic, id).0.publication;
        let cursor = status(&pic, id).source.admitted_to_exclusive;
        pic.upgrade_canister(
            id,
            bytes("B2Z_S14_WASM"),
            encode_args(()).unwrap(),
            Some(controller()),
        )
        .unwrap();
        assert_eq!(arena_world(&pic, id).encode().unwrap(), before);
        assert_eq!(funding_tests::preserved_finance(&pic, id), finance);
        assert_eq!(observe(&pic, id).0.publication, publication);
        assert_eq!(status(&pic, id).source.admitted_to_exclusive, cursor);
        upgrade_proof = Some(
            serde_json::json!({"predecessor":"612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948","candidate":dtr_wire::hash(&bytes("B2Z_S14_WASM")),"old_rule_payment_processed":old,"world_publication_source_and_finance_preserved":true}),
        );
    }
    transition(&pic, id, transition_kind);
    assert_eq!(arena_world(&pic, id).encode().unwrap(), before);
    assert_eq!(funding_tests::preserved_finance(&pic, id), finance);
    assert_eq!(
        observe(&pic, id).1.identity.config_hash,
        dtr_wire::hash(configuration)
    );
    playability_installed::record(&pic, id, &mut rows, &out);
    // The actual pinned ICP Ledger must enforce the end-to-end byte limit.
    let oversized = pic.update_call(
        ledger,
        payer,
        "icrc1_transfer",
        candid::encode_one(IcrcTransferArg {
            to: IcrcAccount {
                owner: id,
                subaccount: None,
            },
            fee: Some(10_000u64.into()),
            memo: Some(b"FIRE 1 0 1|1234567890123456789012".to_vec()),
            from_subaccount: None,
            created_at_time: None,
            amount: 0u64.into(),
        })
        .unwrap(),
    );
    let oversized_rejection = match oversized {
        Err(e) => format!("{e:?}"),
        Ok(reply) => {
            #[derive(CandidType, Deserialize, Debug)]
            enum MemoError {
                GenericError {
                    error_code: candid::Nat,
                    message: String,
                },
            }
            format!(
                "{:?}",
                decode_one::<Result<candid::Nat, MemoError>>(&reply)
                    .unwrap()
                    .unwrap_err()
            )
        }
    };
    assert!(
        oversized_rejection.to_lowercase().contains("memo"),
        "{oversized_rejection}"
    );
    let mut pending_upgrade = false;
    let mut sent = vec![];
    let start_cycles = pic.cycle_balance(id);
    for (sender, memo, amount) in [
        (payer, "FIRE 1 0 1|é😀", 10000000),
        (payer, "FIRE 1 0 64|Charge!", 10000000),
        (payer, "FIRE 1 0 1|No", 0),
        (payer, "FIRE 1 0 1|Twin", 1000000000),
        (payer, "FIRE 1 0 1|Twin", 1000000000),
        (payer, "FIRE 1 0 1|Bad|Text", 10000000),
        (payer, "FIRE 1 0 1|123456789012345678901", 0),
        (extra, "NEW 0 1|Hello!", 100000000),
        (payer, "FIRE 1 0 1|\u{feff}A", 1000000000),
    ] {
        let position = transfer_text(&pic, ledger, sender, id, amount, memo.as_bytes());
        let parsed = b2z_protocol::war_cry::parse_text(memo.as_bytes()).ok();
        let command = parsed
            .as_ref()
            .and_then(|p| b2z_protocol::v6::encode(p.command).ok())
            .unwrap_or([0; 8]);
        let cry = parsed.as_ref().map(|p| p.cry.as_bytes()).unwrap_or(&[]);
        let mut raw = b"BTZPAY03".to_vec();
        raw.extend(AccountIdentifier::new(&sender, &DEFAULT_SUBACCOUNT).as_bytes());
        raw.extend(amount.to_be_bytes());
        raw.extend(command);
        raw.push(cry.len() as u8);
        raw.extend(cry);
        payments.insert(position, hex(&raw));
        admitted(&pic, id, position);
        if !pending_upgrade {
            let before_upgrade = arena_world(&pic, id).encode().unwrap();
            let finance_before = funding_tests::preserved_finance(&pic, id);
            let source_before = status(&pic, id).source.admitted_to_exclusive;
            pic.upgrade_canister(
                id,
                bytes("B2Z_S14_WASM"),
                encode_args(()).unwrap(),
                Some(controller()),
            )
            .unwrap();
            assert_eq!(arena_world(&pic, id).encode().unwrap(), before_upgrade);
            assert_eq!(funding_tests::preserved_finance(&pic, id), finance_before);
            assert_eq!(status(&pic, id).source.admitted_to_exclusive, source_before);
            pending_upgrade = true;
        }
        let purchase_cycles = pic.cycle_balance(id);
        let purchase_started = std::time::Instant::now();
        playability_installed::one_tick(&pic, id);
        let processing_cycles = purchase_cycles - pic.cycle_balance(id);
        sent.push(serde_json::json!({"position":position,"raw_memo_hex":hex(memo.as_bytes()),"memo":memo,"amount":amount,"normalized_hex":hex(&raw),"normalized_bytes":raw.len(),"admitted_purchase_window_cycles":processing_cycles.to_string(),"admitted_purchase_window_wall_ms":purchase_started.elapsed().as_millis(),"cost_scope":"normal Wasm admitted purchase plus mandatory game/controller work; not isolated annotation overhead or a target-subnet quote"}));
        playability_installed::record(&pic, id, &mut rows, &out);
    }
    // Explicit additional Build uses the existing authoritative site helper.
    // It is a proposal only; the normal interpreter still decides at processing.
    let w = arena_world(&pic, id);
    let player = b2z_native::purchases_v6::player_by_account(&w, &account).unwrap();
    let site = *b2z_native::purchases_v6::adjacent_sites(&w, player)
        .unwrap()
        .first()
        .expect("eligible additional Build");
    let memo = format!("NEW 0 1 {site}|Build!");
    let amount = 1_000_000_000u64;
    let position = transfer_text(&pic, ledger, payer, id, amount, memo.as_bytes());
    let parsed = b2z_protocol::war_cry::parse_text(memo.as_bytes()).unwrap();
    let mut raw = b"BTZPAY03".to_vec();
    raw.extend(AccountIdentifier::new(&payer, &DEFAULT_SUBACCOUNT).as_bytes());
    raw.extend(amount.to_be_bytes());
    raw.extend(b2z_protocol::v6::encode(parsed.command).unwrap());
    raw.push(parsed.cry.len() as u8);
    raw.extend(parsed.cry.as_bytes());
    payments.insert(position, hex(&raw));
    admitted(&pic, id, position);
    let cycles = pic.cycle_balance(id);
    let started = std::time::Instant::now();
    playability_installed::one_tick(&pic, id);
    sent.push(serde_json::json!({"position":position,"raw_memo_hex":hex(memo.as_bytes()),"memo":memo,"amount":amount,"normalized_hex":hex(&raw),"normalized_bytes":raw.len(),"admitted_purchase_window_cycles":(cycles-pic.cycle_balance(id)).to_string(),"admitted_purchase_window_wall_ms":started.elapsed().as_millis(),"cost_scope":"normal Wasm admitted explicit additional Build plus mandatory game/controller work"}));
    playability_installed::record(&pic, id, &mut rows, &out);
    let mut artifacts = vec![];
    let mut metadata = BTreeMap::new();
    let mut assigned = vec![];
    let mut annotations = vec![];
    let mut receipts = vec![];
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
        let raw = std::fs::read(out.join(format!("publication-{n}-artifact-1.bin"))).unwrap();
        let audit: serde_json::Value = decode(&raw).unwrap();
        for e in audit["events"].as_array().unwrap() {
            if e.get("launch_annotation").is_some() {
                annotations.push(e.clone());
            }
        }
        receipts.extend(audit["receipts"].as_array().unwrap().iter().cloned());
        artifacts.push(serde_json::json!({"segment_id":n.to_string(),"events_hex":hex(&raw)}));
        if let Some(e) = &p.epoch {
            if !metadata.contains_key(&e.transition_hash) {
                let raw: Vec<u8> = get_query(
                    &pic,
                    id,
                    "epoch_metadata",
                    candid::encode_one(e.transition_hash.clone()).unwrap(),
                );
                assert_eq!(dtr_wire::hash(&raw), e.metadata_hash);
                metadata.insert(e.transition_hash.clone(), hex(&raw));
            }
        }
        if let Some(s) = &p.head.seal {
            let a = s.source_from.0.to_string().parse::<u64>().unwrap();
            let b = s.source_to_exclusive.0.to_string().parse::<u64>().unwrap();
            assigned.extend(payments.range(a..b).map(|(n, _)| n.to_string()));
        }
    }
    assert_eq!(
        annotations.len(),
        7,
        "Revive, partial Fire, distinct identical payments, first Join and explicit additional Build; no zero/rejected cry"
    );
    assert_eq!(annotations[0]["launch_annotation"]["cry"], "é😀");
    assert_eq!(annotations[1]["launch_annotation"]["cry"], "Charge!");
    assert_eq!(annotations[4]["launch_annotation"]["cry"], "Hello!");
    assert_eq!(annotations[5]["launch_annotation"]["cry"], "\u{feff}A");
    assert_eq!(annotations[6]["launch_annotation"]["cry"], "Build!");
    save(
        &out,
        "trace.json",
        &serde_json::json!({"status":"PASS","initial_world_hex":hex(&initial),"publications":rows,"inputs":payments.iter().map(|(n,p)|serde_json::json!({"position":n.to_string(),"payload_hex":p})).collect::<Vec<_>>(),"assigned":assigned.clone(),"artifact_events":artifacts,"epoch_metadata":metadata}),
    );
    assert!(
        std::process::Command::new("node")
            .current_dir(&repo)
            .args([
                "tools/replay_s14.mjs",
                out.join("trace.json").to_str().unwrap(),
                out.join("replay.json").to_str().unwrap()
            ])
            .status()
            .unwrap()
            .success()
    );
    // Every declared payment must be retired, including final malformed text.
    assert!(payments.keys().all(|n| assigned.contains(&n.to_string())));
    pic.set_time(pocket_ic::Time::from(std::time::SystemTime::now()));
    let mut live =
        PocketIc::new_from_existing_instance(pic.get_server_url(), pic.instance_id(), None);
    let gateway = live.make_live(None);
    std::fs::write(out.join("root-key.der"), pic.root_key().unwrap()).unwrap();
    save(
        &out,
        "metadata.json",
        &serde_json::json!({"network":"pocketic-local","canister_id":id.to_text(),"root_key_sha256":dtr_wire::hash(&pic.root_key().unwrap())}),
    );
    save(
        &out,
        "configuration.json",
        &serde_json::json!({"network":"pocketic-local","host":gateway.as_str(),"canister_id":id.to_text(),"ledger":ledger.to_text(),"index":status(&pic,id).source.index.to_text(),"root_key_hex":hex(&pic.root_key().unwrap()),"listening_account":account,"expected_cry":"Build!","expected_cannon":3,"expected_rules":if combined {11}else{10}}),
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
    assert!(
        std::process::Command::new(std::env::var("S14_BROWSER_PYTHON").unwrap())
            .current_dir(&repo)
            .args([
                "tools/verify_war_cry_live.py",
                "--configuration",
                out.join("configuration.json").to_str().unwrap(),
                "--output",
                out.join("browser").to_str().unwrap()
            ])
            .status()
            .unwrap()
            .success()
    );
    live.stop_live();
    save(
        &out,
        "result.json",
        &serde_json::json!({"status":"PASS","normal_wasm":dtr_wire::hash(&bytes("B2Z_S14_WASM")),"rules":observe(&pic,id).1.identity,"state_preserved_at_cutover":true,"production_module_upgrade":upgrade_proof,"finance_preserved_at_cutover":true,"old_invalid_position":old,"payments":sent,"annotations":annotations,"receipts":receipts,"source_cursor":status(&pic,id).source.admitted_to_exclusive,"admitted_annotation_upgrade_preserved":pending_upgrade,"ledger_33_byte_rejection":oversized_rejection,"ledger_32_byte_payment_processed":true,"whole_processing_cycles":(start_cycles as i128-pic.cycle_balance(id)as i128).to_string(),"scope":"synthetic initial state; actual valueless official Ledger/Index and normal game Wasm; not production"}),
    );
}
