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
    let mut world = World::decode(
        &unhex(
            f["rows"]
                .as_array()
                .unwrap()
                .iter()
                .find(|r| r["name"] == "corridor-with-recovery")
                .unwrap()["initial_hex"]
                .as_str()
                .unwrap(),
        )
        .unwrap(),
    )
    .unwrap();
    world.version = 6;
    world.deflectors = None;
    world.next_deflector_id = None;
    for b in &mut world.balls {
        b.den = None;
        b.deflector_rearm = None;
    }
    // Use an exact integer trajectory referenced to cell2003 at logical2.
    // Draining may advance farther; sites use the actual later verified boundary.
    let b = &mut world.balls[0];
    let x = (3584i64 - 2 * i64::from(b.vx)).rem_euclid(1024000);
    let y = (2560i64 - 2 * i64::from(b.vy)).rem_euclid(1024000);
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
    for text in ["DEFLECT 2004 NE", "FIRE 1 0 1|Before"] {
        let amount = if text.starts_with("FIRE") {
            40000000u64
        } else {
            10000000
        };
        let position = transfer_text(&pic, ledger, payer, id, amount, text.as_bytes());
        last_old = position;
        let parsed = b2z_protocol::war_cry::parse_text(text.as_bytes()).ok();
        let memo = parsed
            .as_ref()
            .and_then(|p| b2z_protocol::v6::encode(p.command).ok())
            .unwrap_or([0; 8]);
        let cry = parsed.as_ref().map(|p| p.cry.as_bytes()).unwrap_or(&[]);
        let mut raw = b"BTZPAY03".to_vec();
        raw.extend(AccountIdentifier::new(&payer, &DEFAULT_SUBACCOUNT).as_bytes());
        raw.extend(amount.to_be_bytes());
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
    eprintln!(
        "Rules11 processed old inputs at actual boundary {:?}, ball cell {}",
        arena_world(&pic, id).time,
        arena_world(&pic, id).balls[0].cell
    );
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
    // Preparation may legitimately finish a previously admitted old interval.
    // Compare the exact immediately preceding publication, never a guessed time.
    playability_installed::record(&pic, id, &mut rows, &out);
    let previous = rows[rows.len() - 2]
        .head
        .segment_id
        .as_ref()
        .unwrap()
        .0
        .to_string();
    let predecessor_state =
        std::fs::read(out.join(format!("publication-{previous}-artifact-0.bin"))).unwrap();
    let projected =
        b2z_native::deflectors_v12::migrate(&World::decode(&predecessor_state).unwrap())
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
    let actual = arena_world(&pic, id);
    let anchor = actual.balls.iter().find(|b| b.id == 1).unwrap().cell;
    let bx = (anchor % 1000) as i64;
    let by = (anchor / 1000) as i64;
    let cell_at = |dx: i64, dy: i64| {
        ((by + dy).rem_euclid(1000) * 1000 + (bx + dx).rem_euclid(1000)) as usize
    };
    let devices = [
        (cell_at(1, 0), "NE"),
        (cell_at(-1, 2), "SE"),
        (cell_at(-3, 0), "SW"),
        (cell_at(-1, -2), "NW"),
    ];
    for (cell, orientation) in devices {
        last = send(payer, &format!("DEFLECT {cell} {orientation}"), 10000000);
    }
    let duplicate = format!("DEFLECT {} NW", devices[0].0);
    for (sender, text, amount) in [
        (payer, duplicate.as_str(), 10000000),
        (payer, "DEFLECT 4004 NE", 10000000),
        (payer, "DEFLECT 1004 NE", 9999999),
        (extra, "DEFLECT 1005 NE", 10000000),
        (payer, "DEFLECT 1006 45", 10000000),
        (payer, "FIRE 1 0 1|Boundary!", 1000000000),
        (payer, "DEFLECT 300300 NE", 10000000),
        (payer, "MOVE 1 4005", 10000),
        (payer, "NEW 0 1 5005|Build!", 1000000000),
        (payer, "NEW 0 1 300300|Unsafe!", 1600000000),
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
        &serde_json::json!({"network":"pocketic-local","host":gateway.as_str(),"canister_id":id.to_text(),"ledger":ledger.to_text(),"index":status(&pic,id).source.index.to_text(),"root_key_hex":hex(&pic.root_key().unwrap()),"listening_account":account,"expected_cry":"Together!","fresh_live_payment":true,"expected_cannon":4,"expected_rules":12,"observer_ready_marker":out.join("observers-ready").to_str().unwrap(),"initial_replay_end":final_world.time.0.to_integer().to_string().parse::<u64>().unwrap(),"deflector_view_cell":cell_at(-1,0)}),
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
    // Both ordinary observers are now authenticated. The next speech must come
    // from a new real valueless Ledger payment, never a synthetic UI preview.
    let live_memo = "FIRE 4 0 1|Together!";
    let live_position = transfer_text(&pic, ledger, payer, id, 1000000000, live_memo.as_bytes());
    let parsed = b2z_protocol::deflector::parse_text(live_memo.as_bytes()).unwrap();
    let mut raw = b"BTZPAY04".to_vec();
    raw.extend(AccountIdentifier::new(&payer, &DEFAULT_SUBACCOUNT).as_bytes());
    raw.extend(1000000000u64.to_be_bytes());
    raw.extend(b2z_protocol::deflector::encode(parsed.command).unwrap());
    raw.push(parsed.cry.len() as u8);
    raw.extend(parsed.cry.as_bytes());
    payments.insert(live_position, hex(&raw));
    let index = status(&pic, id).source.index;
    let indexed_deadline = std::time::Instant::now() + Duration::from_secs(15);
    loop {
        let history: source::HistoryResult = decode_one(
            &pic.query_call(
                index,
                controller(),
                "get_account_identifier_transactions",
                candid::encode_one(source::HistoryArgs {
                    account_identifier: AccountIdentifier::new(&id, &DEFAULT_SUBACCOUNT).to_hex(),
                    start: None,
                    max_results: 64,
                })
                .unwrap(),
            )
            .unwrap(),
        )
        .unwrap();
        if history
            .unwrap()
            .transactions
            .iter()
            .any(|r| r.id == live_position)
        {
            break;
        }
        assert!(
            std::time::Instant::now() < indexed_deadline,
            "official Index must contain the real live payment before start reconciliation"
        );
        std::thread::sleep(Duration::from_millis(200));
    }
    let start_live = status(&pic, id).run.completed_segments;
    playability_installed::configuration(&pic, id, 512);
    let deadline = std::time::Instant::now() + Duration::from_secs(90);
    while status(&pic, id).run.completed_segments < start_live + 4
        || observe(&pic, id).1.head.source_to_exclusive.0 <= live_position.into()
    {
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
    let mut live_trace = trace.clone();
    live_trace["inputs"] = serde_json::json!(
        payments
            .iter()
            .map(|(n, p)| serde_json::json!({"position":n.to_string(),"payload_hex":p}))
            .collect::<Vec<_>>()
    );
    save(&out, "trace.json", &live_trace);
    capture("authenticated-after-live");
    let mut live_annotations = vec![];
    let live_position_text = live_position.to_string();
    for entry in std::fs::read_dir(out.join("authenticated-after-live")).unwrap() {
        let path = entry.unwrap().path();
        if path
            .file_name()
            .unwrap()
            .to_string_lossy()
            .ends_with("-events.bin")
        {
            let audit: serde_json::Value = decode(&std::fs::read(path).unwrap()).unwrap();
            for e in audit["events"].as_array().unwrap() {
                if e["launch_annotation"]["position"]["$integer"].as_str()
                    == Some(live_position_text.as_str())
                {
                    live_annotations.push(e.clone());
                }
            }
        }
    }
    assert_eq!(live_annotations.len(), 1);
    assert_eq!(live_annotations[0]["launch_annotation"]["cry"], "Together!");
    save(
        &out,
        "live-payment.json",
        &serde_json::json!({"position":live_position,"memo":live_memo,"amount":1000000000u64,"normalized_hex":payments[&live_position],"annotations":live_annotations}),
    );
    live.stop_live();
    save(
        &out,
        "result.json",
        &serde_json::json!({"status":"PASS","scope":"Disposable official valueless Ledger/Index; normal Wasm and exact Rules11 predecessor; no production operation","normal_wasm":dtr_wire::hash(&bytes("B2Z_S14_WASM")),"identity":observe(&pic,id).1.identity,"world_finance_cursor_publication_preserved_on_module_upgrade":true,"state_exactly_extended_at_epoch":true,"admitted_upgrade_preserved":true,"historical_payments":historical_payments,"payments":sent,"receipts":receipts,"contacts":contacts,"annotations":annotations,"purchase_tick_cycles":processing_cycles.to_string(),"purchase_tick_wall_ms":started.elapsed().as_millis(),"cost_scope":"full admitted batch plus game/controller work, not isolated Deflector overhead"}),
    );
}

#[test]
fn boundary_deflector_capacity_and_paid_ownership_loss() {
    let repo = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    let root = PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap())
        .join("boundary-capacity-loss");
    std::fs::create_dir_all(&root).unwrap();
    let fixtures: serde_json::Value = serde_json::from_slice(
        &std::fs::read(repo.join("tests/fixtures/boundary-deflector-v12.json")).unwrap(),
    )
    .unwrap();
    for (label, name, memo, reason) in [
        (
            "capacity",
            "global-capacity-64-balls-256-structures",
            "DEFLECT 300031 NE",
            "DEFLECTOR_CAPACITY",
        ),
        (
            "loss",
            "paid-safe-then-genuine-bridge-loss",
            "DEFLECT 119 NW",
            "ACCEPTED",
        ),
        (
            "seam",
            "paid-safe-then-toroidal-bridge-loss",
            "DEFLECT 4 NW",
            "ACCEPTED",
        ),
    ] {
        let out = root.join(label);
        std::fs::create_dir_all(&out).unwrap();
        let row = fixtures["rows"]
            .as_array()
            .unwrap()
            .iter()
            .find(|r| r["name"] == name)
            .unwrap();
        let mut world =
            World::decode(&unhex(row["initial_hex"].as_str().unwrap()).unwrap()).unwrap();
        let payer = Principal::self_authenticating([9; 32]);
        let account = AccountIdentifier::new(&payer, &DEFAULT_SUBACCOUNT).to_hex();
        let original = world
            .playability
            .as_ref()
            .unwrap()
            .players
            .iter()
            .find(|p| p.id == 1)
            .unwrap()
            .account
            .clone();
        for p in &mut world.playability.as_mut().unwrap().players {
            if p.id == 1 {
                p.account = account.clone();
            }
        }
        for c in &mut world.cannons {
            if c.account == original {
                c.account = account.clone();
            }
        }
        for c in &mut world.credits {
            if c.account == original {
                c.account = account.clone();
            }
        }
        world.credits.sort_by(|a, b| a.account.cmp(&b.account));
        world.validate().unwrap();
        let initial = world.encode().unwrap();
        let (pic, id, ledger, _) = arena_setup_world(bytes("B2Z_S14_TEST_WASM"), initial.clone());
        playability_installed::funding_paused(&pic, id, true);
        let before = arena_world(&pic, id).encode().unwrap();
        let finance = funding_tests::preserved_finance(&pic, id);
        let publication = observe(&pic, id).0.publication;
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
        let mut rows = vec![];
        playability_installed::record(&pic, id, &mut rows, &out);
        let position = transfer_text(&pic, ledger, payer, id, 10000000, memo.as_bytes());
        for _ in 0..180 {
            if status(&pic, id).source.admitted_to_exclusive > position {
                break;
            }
            tick(&pic);
        }
        assert!(status(&pic, id).source.admitted_to_exclusive > position);
        // Stage genuine normal-module work and preserve its durable continuation.
        playability_installed::configuration(&pic, id, 1);
        let mut stage = None;
        for _ in 0..100 {
            pic.advance_time(Duration::from_millis(50));
            for _ in 0..4 {
                pic.tick();
            }
            let w: playability_installed::BoundaryWork =
                get_query(&pic, id, "controller_work", encode_args(()).unwrap());
            if w.phase.is_some() {
                stage = w.phase;
                break;
            }
        }
        get_result::<Status>(&pic, id, "pause_autonomous", encode_args(()).unwrap());
        assert!(stage.is_some());
        let before = arena_world(&pic, id).encode().unwrap();
        let finance = funding_tests::preserved_finance(&pic, id);
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
        let resumed: playability_installed::BoundaryWork =
            get_query(&pic, id, "controller_work", encode_args(()).unwrap());
        assert_eq!(resumed.phase, stage);
        let cycles = pic.cycle_balance(id);
        let begin = std::time::Instant::now();
        playability_installed::one_tick(&pic, id);
        let debit = cycles - pic.cycle_balance(id);
        playability_installed::record(&pic, id, &mut rows, &out);
        let last = rows.last().unwrap();
        let n = last.head.segment_id.as_ref().unwrap().0.to_string();
        let event_bytes =
            std::fs::read(out.join(format!("publication-{n}-artifact-1.bin"))).unwrap();
        let audit: serde_json::Value = decode(&event_bytes).unwrap();
        let receipt = audit["receipts"]
            .as_array()
            .unwrap()
            .iter()
            .find(|r| r["position"]["$integer"].as_str() == Some(position.to_string().as_str()))
            .unwrap();
        assert_eq!(receipt["reason"], reason);
        let final_world = arena_world(&pic, id);
        assert_eq!(final_world.received_e8s.0, world.received_e8s.0 + 10000000);
        if label == "capacity" {
            assert_eq!(final_world.deflectors.as_ref().unwrap().len(), 256);
            assert_eq!(receipt["amount_used"]["$integer"], "0");
            assert_eq!(receipt["remainder"], receipt["amount"]);
        } else {
            assert_eq!(receipt["amount_used"]["$integer"], "10000000");
            assert!(final_world.deflectors.as_ref().unwrap().is_empty());
            let removed: Vec<_> = audit["events"]
                .as_array()
                .unwrap()
                .iter()
                .filter_map(|e| e.get("removed_deflectors").and_then(|v| v.as_array()))
                .flatten()
                .collect();
            assert_eq!(removed.len(), 1);
            assert_eq!(removed[0]["cell"], if label == "seam" { 4 } else { 119 });
        }
        let parsed = b2z_protocol::deflector::parse_text(memo.as_bytes()).unwrap();
        let mut raw = b"BTZPAY04".to_vec();
        raw.extend(AccountIdentifier::new(&payer, &DEFAULT_SUBACCOUNT).as_bytes());
        raw.extend(10000000u64.to_be_bytes());
        raw.extend(b2z_protocol::deflector::encode(parsed.command).unwrap());
        raw.push(0);
        let mut assigned = vec![];
        let mut artifacts = vec![];
        for p in &rows {
            let n = p.head.segment_id.as_ref().unwrap().0.to_string();
            let bytes = std::fs::read(out.join(format!("publication-{n}-artifact-1.bin"))).unwrap();
            artifacts.push(serde_json::json!({"segment_id":n,"events_hex":hex(&bytes)}));
            if let Some(s) = &p.head.seal {
                if s.source_from.0 <= position.into() && s.source_to_exclusive.0 > position.into() {
                    assigned.push(position.to_string());
                }
            }
        }
        assert_eq!(assigned.len(), 1);
        let trace = serde_json::json!({"status":"PASS","initial_world_hex":hex(&initial),"publications":rows,"inputs":[{"position":position.to_string(),"payload_hex":hex(&raw)}],"assigned":assigned,"artifact_events":artifacts,"epoch_metadata":{}});
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
        save(
            &out,
            "result.json",
            &serde_json::json!({"status":"PASS","scope":"Synthetic population setup only; genuine official valueless Ledger/Index payment, normal-module execution, durable-stage upgrade and independent replay. Not production.","label":label,"normal_wasm":dtr_wire::hash(&bytes("B2Z_S14_WASM")),"initial_balls":world.balls.len(),"initial_deflectors":world.deflectors.as_ref().unwrap().len(),"receipt":receipt,"interrupted_stage":stage,"event_bytes":event_bytes.len(),"events":audit["events"].as_array().unwrap().len(),"cycles":debit.to_string(),"wall_ms":begin.elapsed().as_millis(),"cost_scope":"Remaining whole publication/controller/source work after module recovery; not isolated Deflector overhead"}),
        );
    }
}

#[test]
fn boundary_deflector_paid_all_ball_ownership_contacts() {
    let repo = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    let root =
        PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap()).join("boundary-ownership");
    std::fs::create_dir_all(&root).unwrap();
    let fixtures: serde_json::Value = serde_json::from_slice(
        &std::fs::read(repo.join("tests/fixtures/boundary-deflector-v12.json")).unwrap(),
    )
    .unwrap();
    for attacker in [1u32, 2] {
        for defender in [1u32, 2] {
            for face in ["W", "E"] {
                let orientation = if face == "W" { "NE" } else { "SW" };
                let name = format!("ownership-{attacker}-{defender}-{face}-{orientation}");
                let out = root.join(&name);
                std::fs::create_dir_all(&out).unwrap();
                let row = fixtures["rows"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .find(|r| r["name"] == name)
                    .unwrap();
                let mut world =
                    World::decode(&unhex(row["initial_hex"].as_str().unwrap()).unwrap()).unwrap();
                let payers = [
                    Principal::self_authenticating([9; 32]),
                    Principal::self_authenticating([10; 32]),
                ];
                for player in [1u32, 2] {
                    let original = format!("{player:02x}").repeat(32);
                    let account =
                        AccountIdentifier::new(&payers[(player - 1) as usize], &DEFAULT_SUBACCOUNT)
                            .to_hex();
                    world
                        .playability
                        .as_mut()
                        .unwrap()
                        .players
                        .iter_mut()
                        .find(|p| p.id == player)
                        .unwrap()
                        .account = account.clone();
                    for c in &mut world.cannons {
                        if c.account == original {
                            c.account = account.clone();
                        }
                    }
                    for c in &mut world.credits {
                        if c.account == original {
                            c.account = account.clone();
                        }
                    }
                }
                world.credits.sort_by(|a, b| a.account.cmp(&b.account));
                world.validate().unwrap();
                let initial = world.encode().unwrap();
                let (pic, id, ledger, _) = arena_setup_world_fee_clock_payers(
                    bytes("B2Z_S14_TEST_WASM"),
                    initial.clone(),
                    10000,
                    0,
                    &[payers[1]],
                );
                playability_installed::funding_paused(&pic, id, true);
                let finance = funding_tests::preserved_finance(&pic, id);
                let publication = observe(&pic, id).0.publication;
                pic.upgrade_canister(
                    id,
                    bytes("B2Z_S14_WASM"),
                    encode_args(()).unwrap(),
                    Some(controller()),
                )
                .unwrap();
                assert_eq!(arena_world(&pic, id).encode().unwrap(), initial);
                assert_eq!(funding_tests::preserved_finance(&pic, id), finance);
                assert_eq!(observe(&pic, id).0.publication, publication);
                let cell = if face == "W" { 1503 } else { 1496 };
                let memo = format!("DEFLECT {cell} {orientation}");
                let payer = payers[(defender - 1) as usize];
                let position = transfer_text(&pic, ledger, payer, id, 10000000, memo.as_bytes());
                let mut rows = vec![];
                playability_installed::record(&pic, id, &mut rows, &out);
                for _ in 0..180 {
                    if status(&pic, id).source.admitted_to_exclusive > position {
                        break;
                    }
                    tick(&pic);
                }
                assert!(status(&pic, id).source.admitted_to_exclusive > position);
                playability_installed::one_tick(&pic, id);
                playability_installed::record(&pic, id, &mut rows, &out);
                let final_world = arena_world(&pic, id);
                assert_eq!(final_world.deflectors.as_ref().unwrap().len(), 1);
                assert_eq!(final_world.deflectors.as_ref().unwrap()[0].owner, defender);
                assert_eq!(final_world.player_at(cell), Some(defender));
                assert_eq!(
                    final_world.balls.iter().find(|b| b.id == 1).unwrap().owner,
                    attacker
                );
                assert!(final_world.pending.iter().all(|p| p.to != cell));
                let mut artifacts = vec![];
                let mut assigned = vec![];
                let mut contacts = vec![];
                let mut receipts = vec![];
                for p in &rows {
                    let n = p.head.segment_id.as_ref().unwrap().0.to_string();
                    let raw =
                        std::fs::read(out.join(format!("publication-{n}-artifact-1.bin"))).unwrap();
                    let audit: serde_json::Value = decode(&raw).unwrap();
                    for e in audit["events"].as_array().unwrap() {
                        if e.as_array()
                            .is_some_and(|a| a.len() == 8 && !a[6].is_null() && a[3] == 1)
                        {
                            contacts.push(e.clone());
                        }
                        assert!(!(e["kind"] == "strike_armed" && e["strike"]["to"] == cell));
                        assert!(!(e["kind"] == "capture" && e["target"] == cell));
                    }
                    receipts.extend(audit["receipts"].as_array().unwrap().iter().cloned());
                    artifacts.push(serde_json::json!({"segment_id":n,"events_hex":hex(&raw)}));
                    if let Some(s) = &p.head.seal {
                        if s.source_from.0 <= position.into()
                            && s.source_to_exclusive.0 > position.into()
                        {
                            assigned.push(position.to_string());
                        }
                    }
                }
                assert!(
                    !contacts.is_empty(),
                    "paid {name} must produce an actual protected contact"
                );
                let expected =
                    b2z_native::deflector_boundary::face_velocity(orientation, face).unwrap();
                for contact in &contacts {
                    assert_eq!(contact[5][3], expected.1);
                    assert_eq!(contact[5][4], expected.2);
                    assert_ne!(contact[5][0], cell);
                }
                let receipt = receipts
                    .iter()
                    .find(|r| {
                        r["position"]["$integer"].as_str() == Some(position.to_string().as_str())
                    })
                    .unwrap();
                assert_eq!(receipt["reason"], "ACCEPTED");
                assert_eq!(receipt["amount_used"]["$integer"], "10000000");
                assert_eq!(assigned.len(), 1);
                let parsed = b2z_protocol::deflector::parse_text(memo.as_bytes()).unwrap();
                let mut raw = b"BTZPAY04".to_vec();
                raw.extend(AccountIdentifier::new(&payer, &DEFAULT_SUBACCOUNT).as_bytes());
                raw.extend(10000000u64.to_be_bytes());
                raw.extend(b2z_protocol::deflector::encode(parsed.command).unwrap());
                raw.push(0);
                save(
                    &out,
                    "trace.json",
                    &serde_json::json!({"status":"PASS","initial_world_hex":hex(&initial),"publications":rows,"inputs":[{"position":position.to_string(),"payload_hex":hex(&raw)}],"assigned":assigned,"artifact_events":artifacts,"epoch_metadata":{}}),
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
                save(
                    &out,
                    "result.json",
                    &serde_json::json!({"status":"PASS","scope":"Synthetic frontier constructor; actual official valueless Ledger/Index, normal Wasm, protected enemy/friendly collision and independent replay; not production","normal_wasm":dtr_wire::hash(&bytes("B2Z_S14_WASM")),"attacker":attacker,"defender":defender,"face":face,"orientation":orientation,"contacts":contacts,"receipt":receipt}),
                );
            }
        }
    }
}

#[test]
fn boundary_deflector_paid_destruction_two_observers() {
    let repo = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    let out = PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap())
        .join("boundary-destruction-observers");
    std::fs::create_dir_all(&out).unwrap();
    let fixtures: serde_json::Value = serde_json::from_slice(
        &std::fs::read(repo.join("tests/fixtures/boundary-deflector-v12.json")).unwrap(),
    )
    .unwrap();
    let row = fixtures["rows"]
        .as_array()
        .unwrap()
        .iter()
        .find(|r| r["name"] == "paid-stable-before-future-bridge-loss")
        .unwrap();
    let mut world = World::decode(&unhex(row["initial_hex"].as_str().unwrap()).unwrap()).unwrap();
    let payers = [
        Principal::self_authenticating([9; 32]),
        Principal::self_authenticating([10; 32]),
    ];
    for player in [1u32, 2] {
        let original = format!("{player:02x}").repeat(32);
        let account =
            AccountIdentifier::new(&payers[(player - 1) as usize], &DEFAULT_SUBACCOUNT).to_hex();
        world
            .playability
            .as_mut()
            .unwrap()
            .players
            .iter_mut()
            .find(|p| p.id == player)
            .unwrap()
            .account = account.clone();
        for c in &mut world.cannons {
            if c.account == original {
                c.account = account.clone();
            }
        }
        for c in &mut world.credits {
            if c.account == original {
                c.account = account.clone();
            }
        }
    }
    world.credits.sort_by(|a, b| a.account.cmp(&b.account));
    let initial = world.encode().unwrap();
    let (pic, id, ledger, _) = arena_setup_world_fee_clock_payers(
        bytes("B2Z_S14_TEST_WASM"),
        initial.clone(),
        10000,
        3600,
        &[payers[1]],
    );
    playability_installed::funding_paused(&pic, id, true);
    let finance = funding_tests::preserved_finance(&pic, id);
    pic.upgrade_canister(
        id,
        bytes("B2Z_S14_WASM"),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    assert_eq!(arena_world(&pic, id).encode().unwrap(), initial);
    assert_eq!(funding_tests::preserved_finance(&pic, id), finance);
    let mut payments = BTreeMap::new();
    let mut rows = vec![];
    playability_installed::record(&pic, id, &mut rows, &out);
    let normalized = |payer: Principal, amount: u64, memo: &str| {
        let parsed = b2z_protocol::deflector::parse_text(memo.as_bytes()).unwrap();
        let mut raw = b"BTZPAY04".to_vec();
        raw.extend(AccountIdentifier::new(&payer, &DEFAULT_SUBACCOUNT).as_bytes());
        raw.extend(amount.to_be_bytes());
        raw.extend(b2z_protocol::deflector::encode(parsed.command).unwrap());
        raw.push(parsed.cry.len() as u8);
        raw.extend(parsed.cry.as_bytes());
        hex(&raw)
    };
    for memo in ["DEFLECT 119 NW", "DEFLECT 103 SE"] {
        let n = transfer_text(&pic, ledger, payers[0], id, 10000000, memo.as_bytes());
        payments.insert(n, normalized(payers[0], 10000000, memo));
    }
    let last = *payments.keys().last().unwrap();
    for _ in 0..180 {
        if status(&pic, id).source.admitted_to_exclusive > last {
            break;
        }
        tick(&pic);
    }
    assert!(status(&pic, id).source.admitted_to_exclusive > last);
    playability_installed::one_tick(&pic, id);
    playability_installed::record(&pic, id, &mut rows, &out);
    assert_eq!(arena_world(&pic, id).deflectors.as_ref().unwrap().len(), 2);
    let trace = serde_json::json!({"status":"PASS","initial_world_hex":hex(&initial),"publications":rows,"inputs":[],"assigned":[],"artifact_events":[],"epoch_metadata":{}});
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
        &serde_json::json!({"network":"pocketic-local","host":gateway.as_str(),"canister_id":id.to_text(),"ledger":ledger.to_text(),"index":status(&pic,id).source.index.to_text(),"root_key_hex":hex(&pic.root_key().unwrap()),"listening_account":AccountIdentifier::new(&payers[0],&DEFAULT_SUBACCOUNT).to_hex(),"observer_ready_marker":out.join("observers-ready").to_str().unwrap()}),
    );
    let mut browser = std::process::Command::new(std::env::var("S14_BROWSER_PYTHON").unwrap())
        .current_dir(&repo)
        .args([
            "tools/verify_deflector_removal_live.py",
            "--configuration",
            out.join("configuration.json").to_str().unwrap(),
            "--output",
            out.join("browser").to_str().unwrap(),
        ])
        .spawn()
        .unwrap();
    let deadline = std::time::Instant::now() + Duration::from_secs(180);
    while !out.join("observers-ready").exists() {
        assert!(browser.try_wait().unwrap().is_none());
        assert!(std::time::Instant::now() < deadline);
        std::thread::sleep(Duration::from_millis(100));
    }
    let memo = "FIRE 3 270 1|Advance!";
    let position = transfer_text(&pic, ledger, payers[1], id, 1000000000, memo.as_bytes());
    payments.insert(position, normalized(payers[1], 1000000000, memo));
    let index = status(&pic, id).source.index;
    let deadline = std::time::Instant::now() + Duration::from_secs(15);
    loop {
        let history: source::HistoryResult = decode_one(
            &pic.query_call(
                index,
                controller(),
                "get_account_identifier_transactions",
                candid::encode_one(source::HistoryArgs {
                    account_identifier: AccountIdentifier::new(&id, &DEFAULT_SUBACCOUNT).to_hex(),
                    start: None,
                    max_results: 64,
                })
                .unwrap(),
            )
            .unwrap(),
        )
        .unwrap();
        if history
            .unwrap()
            .transactions
            .iter()
            .any(|r| r.id == position)
        {
            break;
        }
        assert!(std::time::Instant::now() < deadline);
        std::thread::sleep(Duration::from_millis(200));
    }
    let start = status(&pic, id).run.completed_segments;
    playability_installed::configuration(&pic, id, 512);
    let deadline = std::time::Instant::now() + Duration::from_secs(90);
    while status(&pic, id).run.completed_segments < start + 4
        || observe(&pic, id).1.head.source_to_exclusive.0 <= position.into()
    {
        assert!(status(&pic, id).run.last_error.is_none());
        assert!(std::time::Instant::now() < deadline);
        std::thread::sleep(Duration::from_millis(100));
    }
    get_result::<Status>(&pic, id, "pause_autonomous", encode_args(()).unwrap());
    assert!(browser.wait().unwrap().success());
    let final_world = arena_world(&pic, id);
    let ds = final_world.deflectors.as_ref().unwrap();
    assert_eq!(ds.len(), 1);
    assert_eq!(ds[0].cell, 103);
    assert_eq!(ds[0].orientation, "SE");
    assert_eq!(final_world.player_at(119), Some(0));
    assert!(
        final_world
            .playability
            .as_ref()
            .unwrap()
            .life(2)
            .unwrap()
            .deadline_ns
            .is_some()
    );
    let mut trace = trace;
    trace["inputs"] = serde_json::json!(
        payments
            .iter()
            .map(|(n, p)| serde_json::json!({"position":n.to_string(),"payload_hex":p}))
            .collect::<Vec<_>>()
    );
    save(&out, "trace.json", &trace);
    assert!(
        std::process::Command::new("node")
            .current_dir(&repo)
            .args([
                "tools/capture_war_cry_installed.mjs",
                out.join("configuration.json").to_str().unwrap(),
                out.join("trace.json").to_str().unwrap(),
                out.join("authenticated-after").to_str().unwrap()
            ])
            .status()
            .unwrap()
            .success()
    );
    assert!(
        std::process::Command::new("node")
            .current_dir(&repo)
            .args([
                "tools/verify_deflector_replay_negatives.mjs",
                out.join("authenticated-after/authenticated-history.json")
                    .to_str()
                    .unwrap(),
                out.join("deflector-replay-negatives.json")
                    .to_str()
                    .unwrap()
            ])
            .status()
            .unwrap()
            .success()
    );
    let mut removed = vec![];
    for entry in std::fs::read_dir(out.join("authenticated-after")).unwrap() {
        let path = entry.unwrap().path();
        if path
            .file_name()
            .unwrap()
            .to_string_lossy()
            .ends_with("-events.bin")
        {
            let audit: serde_json::Value = decode(&std::fs::read(path).unwrap()).unwrap();
            for e in audit["events"].as_array().unwrap() {
                if let Some(ds) = e.get("removed_deflectors").and_then(|v| v.as_array()) {
                    removed.extend(ds.iter().cloned());
                }
            }
        }
    }
    assert_eq!(removed.len(), 1);
    assert_eq!(removed[0]["cell"], 119);
    assert_eq!(removed[0]["owner"], 1);
    live.stop_live();
    save(
        &out,
        "result.json",
        &serde_json::json!({"status":"PASS","scope":"Actual valueless official Ledger/Index, normal module, later enemy FIRE, two independent authenticated native observers and independent replay; no production operation","normal_wasm":dtr_wire::hash(&bytes("B2Z_S14_WASM")),"payments":trace["inputs"],"removed":removed,"surviving":ds}),
    );
}

fn deflector_payment_bytes(payer: Principal, amount: u64, memo: &str) -> String {
    let parsed = b2z_protocol::deflector::parse_text(memo.as_bytes()).unwrap();
    let mut raw = b"BTZPAY04".to_vec();
    raw.extend(AccountIdentifier::new(&payer, &DEFAULT_SUBACCOUNT).as_bytes());
    raw.extend(amount.to_be_bytes());
    raw.extend(b2z_protocol::deflector::encode(parsed.command).unwrap());
    raw.push(parsed.cry.len() as u8);
    raw.extend(parsed.cry.as_bytes());
    hex(&raw)
}
#[test]
fn boundary_deflector_paid_cancellation_and_revival() {
    let repo = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    let root = PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap())
        .join("boundary-island-lifecycle");
    std::fs::create_dir_all(&root).unwrap();
    let fixtures: serde_json::Value = serde_json::from_slice(
        &std::fs::read(repo.join("tests/fixtures/boundary-deflector-v12.json")).unwrap(),
    )
    .unwrap();
    for mode in ["cancellation", "revival"] {
        let out = root.join(mode);
        std::fs::create_dir_all(&out).unwrap();
        let name = if mode == "cancellation" {
            "paid-cancellation-before-future-bridge"
        } else {
            "paid-safe-then-genuine-bridge-loss"
        };
        let row = fixtures["rows"]
            .as_array()
            .unwrap()
            .iter()
            .find(|r| r["name"] == name)
            .unwrap();
        let mut world =
            World::decode(&unhex(row["initial_hex"].as_str().unwrap()).unwrap()).unwrap();
        let payers = [
            Principal::self_authenticating([9; 32]),
            Principal::self_authenticating([10; 32]),
        ];
        for player in [1u32, 2] {
            let original = format!("{player:02x}").repeat(32);
            let account =
                AccountIdentifier::new(&payers[(player - 1) as usize], &DEFAULT_SUBACCOUNT)
                    .to_hex();
            world
                .playability
                .as_mut()
                .unwrap()
                .players
                .iter_mut()
                .find(|p| p.id == player)
                .unwrap()
                .account = account.clone();
            for c in &mut world.cannons {
                if c.account == original {
                    c.account = account.clone();
                }
            }
            for c in &mut world.credits {
                if c.account == original {
                    c.account = account.clone();
                }
            }
        }
        world.credits.sort_by(|a, b| a.account.cmp(&b.account));
        let initial = world.encode().unwrap();
        let (pic, id, ledger, _) = arena_setup_world_fee_clock_payers(
            bytes("B2Z_S14_TEST_WASM"),
            initial.clone(),
            10000,
            0,
            &[payers[1]],
        );
        playability_installed::funding_paused(&pic, id, true);
        pic.upgrade_canister(
            id,
            bytes("B2Z_S14_WASM"),
            encode_args(()).unwrap(),
            Some(controller()),
        )
        .unwrap();
        assert_eq!(arena_world(&pic, id).encode().unwrap(), initial);
        let mut rows = vec![];
        let mut payments = BTreeMap::new();
        playability_installed::record(&pic, id, &mut rows, &out);
        let memos = if mode == "cancellation" {
            vec!["DEFLECT 119 NW", "DEFLECT 103 SE"]
        } else {
            vec!["DEFLECT 119 NW"]
        };
        for memo in memos {
            let n = transfer_text(&pic, ledger, payers[0], id, 10000000, memo.as_bytes());
            payments.insert(n, deflector_payment_bytes(payers[0], 10000000, memo));
        }
        let last = *payments.keys().last().unwrap();
        for _ in 0..180 {
            if status(&pic, id).source.admitted_to_exclusive > last {
                break;
            }
            tick(&pic);
        }
        assert!(status(&pic, id).source.admitted_to_exclusive > last);
        playability_installed::one_tick(&pic, id);
        playability_installed::record(&pic, id, &mut rows, &out);

        let (payer, memo) = if mode == "cancellation" {
            (payers[1], "FIRE 3 270 1|Hold!")
        } else {
            (payers[0], "FIRE 2 0 1|Back!")
        };
        let n = transfer_text(&pic, ledger, payer, id, 1000000000, memo.as_bytes());
        payments.insert(n, deflector_payment_bytes(payer, 1000000000, memo));
        for _ in 0..180 {
            if status(&pic, id).source.admitted_to_exclusive > n {
                break;
            }
            tick(&pic);
        }
        assert!(status(&pic, id).source.admitted_to_exclusive > n);
        playability_installed::one_tick(&pic, id);
        // Neutral captures use existing reflection/return travel. Do not
        // assume a newly launched ball can reach a ten-tile bridge in one seal.
        if mode == "cancellation" {
            for _ in 0..8 {
                if !arena_world(&pic, id).balls.iter().any(|b| b.id == 1) {
                    break;
                }
                playability_installed::record(&pic, id, &mut rows, &out);
                playability_installed::one_tick(&pic, id);
            }
        }
        let final_world = arena_world(&pic, id);
        playability_installed::record(&pic, id, &mut rows, &out);
        save(
            &out,
            "before-assertions.json",
            &serde_json::json!({"world_hex":hex(&final_world.encode().unwrap()),"publication":observe(&pic,id).1,"positions":payments.keys().collect::<Vec<_>>() }),
        );
        if mode == "cancellation" {
            assert_eq!(final_world.deflectors.as_ref().unwrap().len(), 2);
            assert_eq!(final_world.player_at(115), Some(1));
            assert!(final_world.balls.iter().any(|b| b.id == 2 && b.owner == 1));
            assert!(!final_world.balls.iter().any(|b| b.id == 1));
            assert!(
                final_world
                    .playability
                    .as_ref()
                    .unwrap()
                    .life(1)
                    .unwrap()
                    .deadline_ns
                    .is_none()
            );
        } else {
            assert!(final_world.deflectors.as_ref().unwrap().is_empty());
            assert!(
                final_world
                    .playability
                    .as_ref()
                    .unwrap()
                    .life(2)
                    .unwrap()
                    .deadline_ns
                    .is_none()
            );
            assert!(
                final_world
                    .balls
                    .iter()
                    .any(|b| b.owner == 1 && b.cell >= 120)
            );
        }

        playability_installed::record(&pic, id, &mut rows, &out);
        let mut artifacts = vec![];
        let mut assigned = vec![];
        let mut audit_events = vec![];
        for p in &rows {
            let n = p.head.segment_id.as_ref().unwrap().0.to_string();
            let raw = std::fs::read(out.join(format!("publication-{n}-artifact-1.bin"))).unwrap();
            let audit: serde_json::Value = decode(&raw).unwrap();
            audit_events.extend(audit["events"].as_array().unwrap().iter().cloned());
            artifacts.push(serde_json::json!({"segment_id":n,"events_hex":hex(&raw)}));
            if let Some(s) = &p.head.seal {
                assigned.extend(
                    payments
                        .keys()
                        .filter(|n| {
                            s.source_from.0 <= (**n).into()
                                && s.source_to_exclusive.0 > (**n).into()
                        })
                        .map(|n| n.to_string()),
                );
            }
        }
        assert_eq!(assigned.len(), payments.len());
        if mode == "cancellation" {
            assert!(audit_events.iter().any(|e| e["cancelled_capture"] == true));
            assert!(!audit_events.iter().any(|e| {
                e.get("removed_deflectors")
                    .and_then(|v| v.as_array())
                    .is_some_and(|a| !a.is_empty())
            }));
        }

        save(
            &out,
            "trace.json",
            &serde_json::json!({"status":"PASS","initial_world_hex":hex(&initial),"publications":rows,"inputs":payments.iter().map(|(n,p)|serde_json::json!({"position":n.to_string(),"payload_hex":p})).collect::<Vec<_>>(),"assigned":assigned,"artifact_events":artifacts,"epoch_metadata":{}}),
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
        save(
            &out,
            "result.json",
            &serde_json::json!({"status":"PASS","scope":"Synthetic initial territory; actual valueless Ledger/Index, normal-module topology/lifecycle and independent replay. Not production.","mode":mode,"normal_wasm":dtr_wire::hash(&bytes("B2Z_S14_WASM")),"final_world":hex(&arena_world(&pic,id).encode().unwrap()),"events":audit_events}),
        );
    }
}

#[test]
fn boundary_deflector_paid_occupancy_and_automatic_first_entry() {
    let repo = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    let out = PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap())
        .join("boundary-occupancy-entry");
    std::fs::create_dir_all(&out).unwrap();
    let fixtures: serde_json::Value = serde_json::from_slice(
        &std::fs::read(repo.join("tests/fixtures/boundary-deflector-v12.json")).unwrap(),
    )
    .unwrap();
    let row = fixtures["rows"]
        .as_array()
        .unwrap()
        .iter()
        .find(|r| r["name"] == "paid-structure-occupancy-and-first-entry")
        .unwrap();
    let mut world = World::decode(&unhex(row["initial_hex"].as_str().unwrap()).unwrap()).unwrap();
    let payers = [
        Principal::self_authenticating([9; 32]),
        Principal::self_authenticating([10; 32]),
    ];
    let account = AccountIdentifier::new(&payers[0], &DEFAULT_SUBACCOUNT).to_hex();
    for c in &mut world.cannons {
        c.account = account.clone();
    }
    for c in &mut world.credits {
        c.account = account.clone();
    }
    world.playability.as_mut().unwrap().players[0].account = account;
    let initial = world.encode().unwrap();
    let (pic, id, ledger, _) = arena_setup_world_fee_clock_payers(
        bytes("B2Z_S14_TEST_WASM"),
        initial.clone(),
        10000,
        0,
        &[payers[1]],
    );
    playability_installed::funding_paused(&pic, id, true);
    pic.upgrade_canister(
        id,
        bytes("B2Z_S14_WASM"),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    assert_eq!(arena_world(&pic, id).encode().unwrap(), initial);
    let mut rows = vec![];
    playability_installed::record(&pic, id, &mut rows, &out);
    let mut payments = BTreeMap::new();
    let mut expected = BTreeMap::new();
    for (sender, memo, amount, reason) in [
        (payers[0], "DEFLECT 4005 NE", 10000000, "ACCEPTED"),
        (payers[0], "MOVE 1 4005", 1000000000, "SITE_OCCUPIED"),
        (
            payers[0],
            "NEW 0 1 4005",
            1000000000,
            "ILLEGAL_ADJACENT_SITE",
        ),
        (payers[0], "DEFLECT 1001 NE", 10000000, "SITE_OCCUPIED"),
        (payers[0], "DEFLECT 4004 NE", 10000000, "SITE_OCCUPIED"),
        (payers[1], "NEW 0 1", 1000000000, "ACCEPTED"),
    ] {
        let n = transfer_text(&pic, ledger, sender, id, amount, memo.as_bytes());
        payments.insert(n, deflector_payment_bytes(sender, amount, memo));
        expected.insert(n, reason);
    }
    let last = *payments.keys().last().unwrap();
    for _ in 0..180 {
        if status(&pic, id).source.admitted_to_exclusive > last {
            break;
        }
        tick(&pic);
    }
    assert!(status(&pic, id).source.admitted_to_exclusive > last);
    playability_installed::one_tick(&pic, id);
    playability_installed::record(&pic, id, &mut rows, &out);
    let final_world = arena_world(&pic, id);
    assert_eq!(final_world.deflectors.as_ref().unwrap().len(), 1);
    assert_eq!(final_world.cannons.len(), 2);
    assert!(final_world.cannons.iter().all(|c| c.cell != 4005));
    assert_eq!(
        final_world.cannons.iter().find(|c| c.id == 1).unwrap().cell,
        4004
    );
    let mut artifacts = vec![];
    let mut assigned = vec![];
    let mut receipts = vec![];
    for p in &rows {
        let n = p.head.segment_id.as_ref().unwrap().0.to_string();
        let raw = std::fs::read(out.join(format!("publication-{n}-artifact-1.bin"))).unwrap();
        let audit: serde_json::Value = decode(&raw).unwrap();
        receipts.extend(audit["receipts"].as_array().unwrap().iter().cloned());
        artifacts.push(serde_json::json!({"segment_id":n,"events_hex":hex(&raw)}));
        if let Some(s) = &p.head.seal {
            assigned.extend(
                payments
                    .keys()
                    .filter(|n| {
                        s.source_from.0 <= (**n).into() && s.source_to_exclusive.0 > (**n).into()
                    })
                    .map(|n| n.to_string()),
            );
        }
    }
    assert_eq!(assigned.len(), payments.len());
    for (n, reason) in expected {
        let receipt = receipts
            .iter()
            .find(|r| r["position"]["$integer"].as_str() == Some(n.to_string().as_str()))
            .unwrap();
        assert_eq!(receipt["reason"], reason);
        if reason != "ACCEPTED" {
            assert_eq!(receipt["amount_used"]["$integer"], "0");
            assert_eq!(receipt["remainder"], receipt["amount"]);
        }
    }
    save(
        &out,
        "trace.json",
        &serde_json::json!({"status":"PASS","initial_world_hex":hex(&initial),"publications":rows,"inputs":payments.iter().map(|(n,p)|serde_json::json!({"position":n.to_string(),"payload_hex":p})).collect::<Vec<_>>(),"assigned":assigned,"artifact_events":artifacts,"epoch_metadata":{}}),
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
    save(
        &out,
        "result.json",
        &serde_json::json!({"status":"PASS","scope":"Official valueless Ledger/Index; normal-module construction/Move/first-entry occupancy and independent replay; not production","normal_wasm":dtr_wire::hash(&bytes("B2Z_S14_WASM")),"receipts":receipts,"structures":final_world.deflectors,"cannons":final_world.cannons}),
    );
}

#[test]
fn boundary_deflector_paid_destruction_and_elapsed_expiry_after_real_activation() {
    let repo = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    let out = PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap())
        .join("boundary-real-lifecycle");
    std::fs::create_dir_all(&out).unwrap();
    assert!(
        std::process::Command::new("node")
            .current_dir(&repo)
            .args([
                "tools/boundary_deflector_expiry_fixture.mjs",
                out.join("genesis.bin").to_str().unwrap()
            ])
            .status()
            .unwrap()
            .success()
    );
    let mut world = World::decode(&std::fs::read(out.join("genesis.bin")).unwrap()).unwrap();
    let payers = [
        Principal::self_authenticating([9; 32]),
        Principal::self_authenticating([10; 32]),
    ];
    for (player, payer) in [(1u32, payers[0]), (2, payers[1])] {
        let original = format!("{player:02x}").repeat(32);
        let account = AccountIdentifier::new(&payer, &DEFAULT_SUBACCOUNT).to_hex();
        for c in &mut world.cannons {
            if c.account == original {
                c.account = account.clone();
            }
        }
        for c in &mut world.credits {
            if c.account == original {
                c.account = account.clone();
            }
        }
    }
    world.credits.sort_by(|a, b| a.account.cmp(&b.account));
    let initial = world.encode().unwrap();
    let (pic, id, ledger, _) = arena_setup_world_fee_clock_payers(
        bytes("B2Z_S14_WASM"),
        initial.clone(),
        10000,
        0,
        &[payers[1]],
    );
    playability_installed::funding_paused(&pic, id, true);
    let mut rows = vec![];
    let mut payments = BTreeMap::new();
    playability_installed::record(&pic, id, &mut rows, &out);
    for kind in [
        "torus",
        "million",
        "playability",
        "entry",
        "combined",
        "deflector",
    ] {
        playability_installed::one_tick(&pic, id);
        playability_installed::record(&pic, id, &mut rows, &out);
        if kind == "torus" || kind == "million" {
            playability_installed::old_transition(&pic, id, kind);
        } else {
            war_cry_installed::transition(&pic, id, kind);
        }
        playability_installed::record(&pic, id, &mut rows, &out);
    }
    assert_eq!(arena_world(&pic, id).version, 7);
    let site = arena_world(&pic, id)
        .cannons
        .iter()
        .find(|c| c.id == 1)
        .unwrap()
        .cell
        + 1;
    let memo = format!("DEFLECT {site} NE");
    let n = transfer_text(&pic, ledger, payers[0], id, 10000000, memo.as_bytes());
    payments.insert(n, deflector_payment_bytes(payers[0], 10000000, &memo));
    for _ in 0..180 {
        if status(&pic, id).source.admitted_to_exclusive > n {
            break;
        }
        tick(&pic);
    }
    assert!(status(&pic, id).source.admitted_to_exclusive > n);
    playability_installed::one_tick(&pic, id);
    playability_installed::record(&pic, id, &mut rows, &out);
    assert_eq!(arena_world(&pic, id).deflectors.as_ref().unwrap().len(), 1);
    let memo = "FIRE 2 180 1|Forward!";
    let n = transfer_text(&pic, ledger, payers[1], id, 1000000000, memo.as_bytes());
    payments.insert(n, deflector_payment_bytes(payers[1], 1000000000, memo));
    for _ in 0..180 {
        if status(&pic, id).source.admitted_to_exclusive > n {
            break;
        }
        tick(&pic);
    }
    assert!(status(&pic, id).source.admitted_to_exclusive > n);
    for _ in 0..64 {
        playability_installed::one_tick(&pic, id);
        playability_installed::record(&pic, id, &mut rows, &out);
        if arena_world(&pic, id)
            .playability
            .as_ref()
            .unwrap()
            .life(1)
            .unwrap()
            .deadline_ns
            .is_some()
        {
            break;
        }
    }
    let dormant = arena_world(&pic, id);
    assert!(dormant.deflectors.as_ref().unwrap().is_empty());
    let deadline = dormant
        .playability
        .as_ref()
        .unwrap()
        .life(1)
        .unwrap()
        .deadline_ns
        .as_ref()
        .unwrap()
        .0
        .to_string()
        .parse::<u64>()
        .unwrap();
    let current = pic.get_time().as_nanos_since_unix_epoch();
    assert!(deadline >= current);
    pic.advance_time(Duration::from_nanos(deadline - current + 1));
    for _ in 0..1800 {
        pic.advance_time(Duration::from_millis(50));
        for _ in 0..4 {
            pic.tick();
        }
        if !arena_world(&pic, id).cannons.iter().any(|c| c.id == 1) {
            break;
        }
    }
    let final_world = arena_world(&pic, id);
    assert!(!final_world.cannons.iter().any(|c| c.id == 1));
    assert!(final_world.deflectors.as_ref().unwrap().is_empty());
    assert_eq!(final_world.time, dormant.time);
    assert_eq!(final_world.balls, dormant.balls);
    assert_eq!(final_world.received_e8s, dormant.received_e8s);
    assert_eq!(final_world.credits, dormant.credits);
    playability_installed::record(&pic, id, &mut rows, &out);
    let mut artifacts = vec![];
    let mut assigned = vec![];
    let mut metadata = BTreeMap::new();
    let mut audit_events = vec![];
    for p in &rows {
        let n = p.head.segment_id.as_ref().unwrap().0.to_string();
        let raw = std::fs::read(out.join(format!("publication-{n}-artifact-1.bin"))).unwrap();
        let audit: serde_json::Value = decode(&raw).unwrap();
        audit_events.extend(audit["events"].as_array().unwrap().iter().cloned());
        artifacts.push(serde_json::json!({"segment_id":n,"events_hex":hex(&raw)}));
        if let Some(s) = &p.head.seal {
            assigned.extend(
                payments
                    .keys()
                    .filter(|n| {
                        s.source_from.0 <= (**n).into() && s.source_to_exclusive.0 > (**n).into()
                    })
                    .map(|n| n.to_string()),
            );
        }
        if let Some(epoch) = &p.epoch {
            if !metadata.contains_key(&epoch.transition_hash) {
                let raw: Vec<u8> = get_query(
                    &pic,
                    id,
                    "epoch_metadata",
                    candid::encode_one(epoch.transition_hash.clone()).unwrap(),
                );
                assert_eq!(dtr_wire::hash(&raw), epoch.metadata_hash);
                metadata.insert(epoch.transition_hash.clone(), hex(&raw));
            }
        }
    }
    assert_eq!(assigned.len(), 2);
    assert!(
        audit_events
            .iter()
            .any(|e| e["kind"] == "cannon_expired" && e["cannon"] == 1)
    );
    assert!(audit_events.iter().any(|e| {
        e.get("removed_deflectors")
            .and_then(|v| v.as_array())
            .is_some_and(|a| a.len() == 1)
    }));
    save(
        &out,
        "trace.json",
        &serde_json::json!({"status":"PASS","initial_world_hex":hex(&initial),"publications":rows,"inputs":payments.iter().map(|(n,p)|serde_json::json!({"position":n.to_string(),"payload_hex":p})).collect::<Vec<_>>(),"assigned":assigned,"artifact_events":artifacts,"epoch_metadata":metadata}),
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
    save(
        &out,
        "result.json",
        &serde_json::json!({"status":"PASS","scope":"Normal module from synthetic v3 genesis, real authenticated lifecycle/entry/Rules11/Rules12 transitions, actual valueless Ledger payments, committed Deflector destruction and virtual24h expiry; independent replay; not production","normal_wasm":dtr_wire::hash(&bytes("B2Z_S14_WASM")),"deadline_ns":deadline.to_string(),"final_world":hex(&final_world.encode().unwrap())}),
    );
}
