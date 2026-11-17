//! Official valueless Ledger/Index and normal modules; synthetic constructor only.
use super::*;
use b2z_native::world::World;

fn save(out: &Path, name: &str, value: &serde_json::Value) {
    std::fs::write(out.join(name), serde_json::to_vec_pretty(value).unwrap()).unwrap();
}
#[test]
fn boundary_deflector_rules11_upgrade_paid_redirect_and_replay() {
    let repo = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    let out =
        PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap()).join("boundary-deflector");
    std::fs::create_dir_all(&out).unwrap();
    let f: serde_json::Value = serde_json::from_slice(
        &std::fs::read(repo.join("tests/fixtures/boundary-deflector-v12.json")).unwrap(),
    )
    .unwrap();
    let mut world =
        World::decode(&unhex(f["rows"][0]["initial_hex"].as_str().unwrap()).unwrap()).unwrap();
    world.version = 6;
    world.deflectors = None;
    world.next_deflector_id = None;
    for b in &mut world.balls {
        b.den = None;
        b.deflector_rearm = None;
    }
    // Two old-policy intervals precede activation. Place the original ball so
    // its exact unmodified trajectory reaches cell1001's centre at logical2.
    let b = &mut world.balls[0];
    let x = (1536i64 - 2 * i64::from(b.vx)).rem_euclid(1024000);
    let y = (1536i64 - 2 * i64::from(b.vy)).rem_euclid(1024000);
    b.x0 = Int(x.into());
    b.y0 = Int(y.into());
    b.cell = (y / 1024 * 1000 + x / 1024) as usize;
    let payer = Principal::self_authenticating([9; 32]);
    let extra = Principal::self_authenticating([10; 32]);
    let account = AccountIdentifier::new(&payer, &DEFAULT_SUBACCOUNT).to_hex();
    for c in &mut world.cannons {
        c.account = account.clone();
    }
    for c in &mut world.credits {
        c.account = account.clone();
    }
    let base = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_nanos() as u64
        - 3_600_000_000_000;
    let p = world.playability.as_mut().unwrap();
    p.elapsed_ns = Int(base.into());
    for p in &mut p.players {
        p.account = account.clone();
    }
    // Dormant enemy marker exercises processing-time clearance without a new
    // backend field or a simulated transfer. Synthetic constructor state only.
    let enemy = AccountIdentifier::new(
        &Principal::self_authenticating([11; 32]),
        &DEFAULT_SUBACCOUNT,
    )
    .to_hex();
    world.set_owner(300303, 2).unwrap();
    world.cannons.push(b2z_native::world::Cannon {
        id: 2,
        cell: 300303,
        account: enemy.clone(),
        heading: Some(0),
    });
    world.next_cannon_id = 3;
    let p = world.playability.as_mut().unwrap();
    p.players.push(b2z_native::playability::Player {
        id: 2,
        account: enemy,
    });
    p.territories
        .push(b2z_native::territory_v6::Territory { id: 2, player: 2 });
    p.lifecycle.push(b2z_native::playability::Lifecycle {
        cannon: 2,
        player: 2,
        generation: 1,
        dormant_since_ns: Some(Int(base.into())),
        deadline_ns: Some(Int((base + 86400000000000).into())),
    });
    p.next_player_id = 3;
    p.next_territory_id = 3;
    world.cannons.push(b2z_native::world::Cannon {
        id: 3,
        cell: 300299,
        account: account.clone(),
        heading: Some(0),
    });
    world.next_cannon_id = 4;
    world
        .playability
        .as_mut()
        .unwrap()
        .lifecycle
        .push(b2z_native::playability::Lifecycle {
            cannon: 3,
            player: 1,
            generation: 1,
            dormant_since_ns: None,
            deadline_ns: None,
        });
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
    // Disposable setup: establish the candidate's one-tick operating allowance
    // before collecting the Rules11 predecessor baseline. No production setting
    // is changed and no gameplay interval may execute during this setup.
    let setup_world = arena_world(&pic, id).encode().unwrap();
    playability_installed::configuration(&pic, id, 512);
    get_result::<Status>(&pic, id, "pause_autonomous", encode_args(()).unwrap());
    assert_eq!(arena_world(&pic, id).encode().unwrap(), setup_world);
    let mut rows = vec![];
    let mut payments = BTreeMap::new();
    let mut historical_payments = vec![];
    playability_installed::record(&pic, id, &mut rows, &out);
    war_cry_installed::transition(&pic, id, "entry");
    playability_installed::record(&pic, id, &mut rows, &out);
    playability_installed::one_tick(&pic, id);
    playability_installed::record(&pic, id, &mut rows, &out);
    war_cry_installed::transition(&pic, id, "combined");
    playability_installed::record(&pic, id, &mut rows, &out);
    // Install the retained, exact qualified Rules11 normal predecessor, then the
    // new normal module. Neither module installation activates a rules epoch.
    let predecessor = bytes("B2Z_RULES11_PRIOR_WASM");
    assert_eq!(
        dtr_wire::hash(&predecessor),
        "5ffb6cc2c1cd377ef36a847df309fc21ead8e4b66d97d49200ca00d80b3e8a43"
    );
    let before = arena_world(&pic, id).encode().unwrap();
    let finance = funding_tests::preserved_finance(&pic, id);
    let publication = observe(&pic, id).0.publication;
    let source = status(&pic, id).source.admitted_to_exclusive;
    pic.upgrade_canister(
        id,
        predecessor,
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    assert_eq!(arena_world(&pic, id).encode().unwrap(), before);
    assert_eq!(funding_tests::preserved_finance(&pic, id), finance);
    assert_eq!(observe(&pic, id).0.publication, publication);
    assert_eq!(status(&pic, id).source.admitted_to_exclusive, source);
    let mut last_old = 0;
    for text in ["DEFLECT 1002 NE", "FIRE 1 0 1|Before"] {
        let position = transfer_text(&pic, ledger, payer, id, 10000000, text.as_bytes());
        last_old = position;
        let parsed = b2z_protocol::war_cry::parse_text(text.as_bytes()).ok();
        let memo = parsed
            .as_ref()
            .and_then(|p| b2z_protocol::v6::encode(p.command).ok())
            .unwrap_or([0; 8]);
        let cry = parsed.as_ref().map(|p| p.cry.as_bytes()).unwrap_or(&[]);
        let mut raw = b"BTZPAY03".to_vec();
        raw.extend(AccountIdentifier::new(&payer, &DEFAULT_SUBACCOUNT).as_bytes());
        raw.extend(10000000u64.to_be_bytes());
        raw.extend(memo);
        raw.push(cry.len() as u8);
        raw.extend(cry);
        payments.insert(position, hex(&raw));
        historical_payments
            .push(serde_json::json!({"position":position,"memo":text,"normalized_hex":hex(&raw)}));
    }
    for _ in 0..180 {
        if status(&pic, id).source.admitted_to_exclusive > last_old {
            break;
        }
        tick(&pic);
    }
    assert!(status(&pic, id).source.admitted_to_exclusive > last_old);
    playability_installed::one_tick(&pic, id);
    playability_installed::record(&pic, id, &mut rows, &out);
    assert_eq!(arena_world(&pic, id).balls[0].cell, 1001);
    let before = arena_world(&pic, id).encode().unwrap();
    let finance = funding_tests::preserved_finance(&pic, id);
    let publication = observe(&pic, id).0.publication;
    let source = status(&pic, id).source.admitted_to_exclusive;
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
    assert_eq!(status(&pic, id).source.admitted_to_exclusive, source);
    for method in [
        "prepare_deflector_transition",
        "commit_deflector_transition",
    ] {
        let args = if method.starts_with("commit") {
            candid::encode_one("00".repeat(32)).unwrap()
        } else {
            encode_args(()).unwrap()
        };
        let reply = pic
            .update_call(id, Principal::anonymous(), method, args)
            .unwrap();
        assert!(
            decode_one::<Result<Vec<u8>, String>>(&reply)
                .unwrap()
                .is_err()
        );
    }
    war_cry_installed::transition(&pic, id, "deflector");
    let projected = b2z_native::deflectors_v12::migrate(&World::decode(&before).unwrap())
        .unwrap()
        .encode()
        .unwrap();
    assert_eq!(arena_world(&pic, id).encode().unwrap(), projected);
    assert_eq!(funding_tests::preserved_finance(&pic, id), finance);
    assert_eq!(
        observe(&pic, id).1.identity.config_hash,
        dtr_wire::hash(b2z_native::deflectors_v12::configuration())
    );
    playability_installed::record(&pic, id, &mut rows, &out);
    let mut sent = vec![];
    let mut send = |sender: Principal, text: &str, amount: u64| {
        let position = transfer_text(&pic, ledger, sender, id, amount, text.as_bytes());
        let parsed = b2z_protocol::deflector::parse_text(text.as_bytes()).ok();
        let command = parsed
            .as_ref()
            .and_then(|p| b2z_protocol::deflector::encode(p.command.clone()).ok())
            .unwrap_or([0; 8]);
        let cry = parsed.as_ref().map(|p| p.cry.as_bytes()).unwrap_or(&[]);
        let mut raw = b"BTZPAY04".to_vec();
        raw.extend(AccountIdentifier::new(&sender, &DEFAULT_SUBACCOUNT).as_bytes());
        raw.extend(amount.to_be_bytes());
        raw.extend(command);
        raw.push(cry.len() as u8);
        raw.extend(cry);
        payments.insert(position, hex(&raw));
        sent.push(serde_json::json!({"position":position,"memo":text,"amount":amount,"normalized_hex":hex(&raw)}));
        position
    };
    // The same admitted batch creates the blocker before the ball reaches it.
    let mut last = 0;
    for (cell, orientation) in [(1002, "NE"), (2001, "SE"), (1000, "SW"), (1, "NW")] {
        last = send(payer, &format!("DEFLECT {cell} {orientation}"), 10000000);
    }
    for (sender, text, amount) in [
        (payer, "DEFLECT 1002 NW", 10000000),
        (payer, "DEFLECT 4004 NE", 10000000),
        (payer, "DEFLECT 1004 NE", 9999999),
        (extra, "DEFLECT 1005 NE", 10000000),
        (payer, "DEFLECT 1006 45", 10000000),
        (payer, "FIRE 1 0 1|Boundary!", 1000000000),
        (payer, "DEFLECT 300300 NE", 10000000),
        (payer, "MOVE 1 4005", 10000),
        (payer, "NEW 0 1 5005|Build!", 1000000000),
        (payer, "NEW 0 1 300300|Unsafe!", 1000000000),
    ] {
        last = send(sender, text, amount);
    }
    drop(send);
    for _ in 0..180 {
        if status(&pic, id).source.admitted_to_exclusive > last {
            break;
        }
        tick(&pic);
    }
    assert!(status(&pic, id).source.admitted_to_exclusive > last);
    let admitted_world = arena_world(&pic, id).encode().unwrap();
    let admitted_finance = funding_tests::preserved_finance(&pic, id);
    pic.upgrade_canister(
        id,
        bytes("B2Z_S14_WASM"),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    assert_eq!(arena_world(&pic, id).encode().unwrap(), admitted_world);
    assert_eq!(funding_tests::preserved_finance(&pic, id), admitted_finance);
    let cycles = pic.cycle_balance(id);
    let started = std::time::Instant::now();
    playability_installed::one_tick(&pic, id);
    let processing_cycles = cycles - pic.cycle_balance(id);
    playability_installed::record(&pic, id, &mut rows, &out);
    let final_world = arena_world(&pic, id);
    assert_eq!(final_world.deflectors.as_ref().unwrap().len(), 4);
    let mut artifacts = vec![];
    let mut metadata = BTreeMap::new();
    let mut assigned = vec![];
    let mut contacts = vec![];
    let mut receipts = vec![];
    let mut annotations = vec![];
    for p in &rows {
        let n = p.head.segment_id.as_ref().unwrap().0.to_string();
        let raw = std::fs::read(out.join(format!("publication-{n}-artifact-1.bin"))).unwrap();
        let audit: serde_json::Value = decode(&raw).unwrap();
        contacts.extend(
            audit["events"]
                .as_array()
                .unwrap()
                .iter()
                .filter(|e| {
                    e.as_array()
                        .is_some_and(|a| a.len() == 8 && !a[6].is_null())
                })
                .cloned(),
        );
        annotations.extend(
            audit["events"]
                .as_array()
                .unwrap()
                .iter()
                .filter(|e| e.get("launch_annotation").is_some())
                .cloned(),
        );
        receipts.extend(audit["receipts"].as_array().unwrap().iter().cloned());
        artifacts.push(serde_json::json!({"segment_id":n,"events_hex":hex(&raw)}));
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
    assert!(!contacts.is_empty(), "actual boundary redirect required");
    assert_eq!(contacts[0][6][1], 0);
    assert_eq!(annotations.len(), 3);
    assert_eq!(annotations[0]["launch_annotation"]["cry"], "Before");
    for (i, reason) in [
        (0, "ACCEPTED"),
        (1, "ACCEPTED"),
        (2, "ACCEPTED"),
        (3, "ACCEPTED"),
        (4, "SITE_OCCUPIED"),
        (5, "SITE_OCCUPIED"),
        (6, "UNDERFUNDED"),
        (7, "NOT_OWN_TERRITORY"),
        (8, "MALFORMED_MEMO"),
        (9, "ACCEPTED"),
        (10, "ENEMY_TERRITORY_TOO_CLOSE"),
        (11, "ACCEPTED"),
        (12, "ACCEPTED"),
        (13, "ENEMY_TERRITORY_TOO_CLOSE"),
    ] {
        let position = sent[i]["position"].as_u64().unwrap().to_string();
        let receipt = receipts
            .iter()
            .find(|r| r["position"]["$integer"].as_str() == Some(position.as_str()))
            .unwrap();
        assert_eq!(receipt["reason"], reason);
        if reason != "ACCEPTED" {
            assert_eq!(receipt["amount_used"]["$integer"], "0");
            assert_eq!(receipt["remainder"], receipt["amount"]);
        }
    }
    let old_position = historical_payments[0]["position"]
        .as_u64()
        .unwrap()
        .to_string();
    let old_receipt = receipts
        .iter()
        .find(|r| r["position"]["$integer"].as_str() == Some(old_position.as_str()))
        .unwrap();
    assert_eq!(old_receipt["reason"], "MALFORMED_MEMO");
    assert_eq!(annotations[1]["launch_annotation"]["cry"], "Boundary!");
    assert_eq!(annotations[2]["launch_annotation"]["cry"], "Build!");
    assert!(payments.keys().all(|n| assigned.contains(&n.to_string())));
    let trace = serde_json::json!({"status":"PASS","initial_world_hex":hex(&initial),"publications":rows,"inputs":payments.iter().map(|(n,p)|serde_json::json!({"position":n.to_string(),"payload_hex":p})).collect::<Vec<_>>(),"assigned":assigned,"artifact_events":artifacts,"epoch_metadata":metadata});
    save(&out, "trace.json", &trace);
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
    // Pinned live gateway, independent authenticated wire capture, then two
    // ordinary native observers. The controller alone advances a bounded live
    // window after both observers have focused the actual paid world.
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
        &serde_json::json!({"network":"pocketic-local","host":gateway.as_str(),"canister_id":id.to_text(),"ledger":ledger.to_text(),"index":status(&pic,id).source.index.to_text(),"root_key_hex":hex(&pic.root_key().unwrap()),"listening_account":account,"expected_cry":"Build!","expected_cannon":4,"expected_rules":12,"observer_ready_marker":out.join("observers-ready").to_str().unwrap(),"initial_replay_end":3}),
    );
    let capture = |label: &str| {
        assert!(
            std::process::Command::new("node")
                .current_dir(&repo)
                .args([
                    "tools/capture_war_cry_installed.mjs",
                    out.join("configuration.json").to_str().unwrap(),
                    out.join("trace.json").to_str().unwrap(),
                    out.join(label).to_str().unwrap()
                ])
                .status()
                .unwrap()
                .success()
        );
    };
    capture("authenticated-before-live");
    let mut browser = std::process::Command::new(std::env::var("S14_BROWSER_PYTHON").unwrap())
        .current_dir(&repo)
        .args([
            "tools/verify_war_cry_live.py",
            "--configuration",
            out.join("configuration.json").to_str().unwrap(),
            "--output",
            out.join("browser").to_str().unwrap(),
        ])
        .spawn()
        .unwrap();
    let deadline = std::time::Instant::now() + Duration::from_secs(180);
    while !out.join("observers-ready").exists() {
        assert!(
            browser.try_wait().unwrap().is_none(),
            "native observers exited before live-window readiness"
        );
        assert!(
            std::time::Instant::now() < deadline,
            "native observer readiness deadline"
        );
        std::thread::sleep(Duration::from_millis(100));
    }
    let start_live = status(&pic, id).run.completed_segments;
    playability_installed::configuration(&pic, id, 512);
    let deadline = std::time::Instant::now() + Duration::from_secs(90);
    while status(&pic, id).run.completed_segments < start_live + 4 {
        assert!(
            status(&pic, id).run.last_error.is_none(),
            "native live-window game error"
        );
        assert!(
            std::time::Instant::now() < deadline,
            "four real-time disposable publications"
        );
        std::thread::sleep(Duration::from_millis(100));
    }
    get_result::<Status>(&pic, id, "pause_autonomous", encode_args(()).unwrap());
    assert!(browser.wait().unwrap().success());
    capture("authenticated-after-live");
    live.stop_live();
    save(
        &out,
        "result.json",
        &serde_json::json!({"status":"PASS","scope":"Disposable official valueless Ledger/Index; normal Wasm and exact Rules11 predecessor; no production operation","normal_wasm":dtr_wire::hash(&bytes("B2Z_S14_WASM")),"identity":observe(&pic,id).1.identity,"world_finance_cursor_publication_preserved_on_module_upgrade":true,"state_exactly_extended_at_epoch":true,"admitted_upgrade_preserved":true,"historical_payments":historical_payments,"payments":sent,"receipts":receipts,"contacts":contacts,"annotations":annotations,"purchase_tick_cycles":processing_cycles.to_string(),"purchase_tick_wall_ms":started.elapsed().as_millis(),"cost_scope":"full admitted batch plus game/controller work, not isolated Deflector overhead"}),
    );
}
