//! One paid, unfinished-state normal-module rehearsal; disposable valueless ICP.
use super::*;
use b2z_native::world::World;
thread_local! {static REAL_TIME: std::cell::Cell<bool> = const { std::cell::Cell::new(false) };}

fn save(out: &Path, name: &str, value: &serde_json::Value) {
    std::fs::write(out.join(name), serde_json::to_vec_pretty(value).unwrap()).unwrap();
}

#[test]
#[ignore = "fixed 3/4-ball normal-module cost comparison; disposable IC only"]
fn playability_cost_comparison() {
    assert_eq!(std::env::var("B2Z_PROFILE_FIDUCIARY").as_deref(), Ok("1"));
    let root = PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap());
    std::fs::create_dir_all(&root).unwrap();
    let prior = bytes("B2Z_PLAYABILITY_PRIOR_WASM");
    assert_eq!(
        dtr_wire::hash(&prior),
        "c7d12fd76146554186e63330fc95094d86941caf119bceef47f9f76c777c6526"
    );
    let module = bytes("B2Z_S14_WASM");
    let mut results = Vec::new();
    for count in [3usize, 4] {
        let out = root.join(format!("balls-{count}"));
        std::fs::create_dir(&out).unwrap();
        let mut world = World::decode(&initial_world()).unwrap();
        world.cells = vec![1; 128];
        world.cannons = vec![b2z_native::world::Cannon {
            id: 1,
            account: AccountIdentifier::new(
                &Principal::self_authenticating([9; 32]),
                &DEFAULT_SUBACCOUNT,
            )
            .to_hex(),
            cell: 32,
            heading: None,
        }];
        world.balls = (0..count)
            .map(|i| {
                let x = 4 + i * 2;
                b2z_native::world::Ball {
                    id: i as u32 + 1,
                    owner: 1,
                    cell: 3 * 16 + x,
                    x0: Int((x * 1024 + 512).into()),
                    y0: Int(3584.into()),
                    vx: 1024,
                    vy: 0,
                }
            })
            .collect();
        world.next_cannon_id = 2;
        world.next_ball_id = count as u32 + 1;
        world.validate().unwrap();
        let (pic, id, _, _) = arena_setup_world(prior.clone(), world.encode().unwrap());
        funding_paused(&pic, id, true);
        one_tick(&pic, id);
        old_transition(&pic, id, "torus");
        one_tick(&pic, id);
        old_transition(&pic, id, "million");
        for _ in 0..40 {
            pic.tick();
        }
        for _ in 0..3 {
            if transition_drained(&pic, id) {
                break;
            }
            one_tick(&pic, id);
        }
        assert!(
            transition_drained(&pic, id),
            "cost fixture must snapshot a fully committed source/work boundary"
        );
        let initial = arena_world(&pic, id);
        assert_eq!(initial.balls.len(), count);
        // Replenish local install-code credit before the one candidate upgrade;
        // this paused setup interval is excluded from both cost windows.
        for _ in 0..600 {
            pic.advance_time(Duration::from_secs(1));
            pic.tick();
        }
        pic.stop_canister(id, Some(controller())).unwrap();
        let snapshot = pic
            .take_canister_snapshot(id, Some(controller()), None)
            .unwrap();
        pic.start_canister(id, Some(controller())).unwrap();
        let mut windows = Vec::new();
        let mut states = Vec::new();
        let mut baseline_start: Option<World> = None;
        for label in ["release-1-v5", "candidate-v6"] {
            if label == "release-1-v5" {
                one_tick(&pic, id);
                baseline_start = Some(arena_world(&pic, id));
            }
            if label == "candidate-v6" {
                pic.stop_canister(id, Some(controller())).unwrap();
                pic.load_canister_snapshot(id, Some(controller()), snapshot.id.clone())
                    .unwrap();
                pic.upgrade_canister(
                    id,
                    module.clone(),
                    encode_args(()).unwrap(),
                    Some(controller()),
                )
                .unwrap();
                pic.start_canister(id, Some(controller())).unwrap();
                assert_eq!(arena_world(&pic, id), initial);
                prepare(&pic, id, "prepare_playability_transition");
                let mut ready = false;
                for _ in 0..1800 {
                    let raw: Vec<u8> = get_query(
                        &pic,
                        id,
                        "playability_transition_status",
                        encode_args(()).unwrap(),
                    );
                    let value: serde_json::Value = decode(&raw).unwrap();
                    if value["transition"]["phase"] == "ready" && transition_drained(&pic, id) {
                        ready = true;
                        break;
                    }
                    advance(&pic);
                }
                assert!(ready);
                let _: Vec<u8> = get_result(
                    &pic,
                    id,
                    "commit_playability_transition",
                    candid::encode_one(observe(&pic, id).1.head.manifest_hash).unwrap(),
                );
                for _ in 0..20 {
                    pic.tick();
                }
                assert_eq!(
                    arena_world(&pic, id).time,
                    baseline_start.as_ref().unwrap().time,
                    "v6 cost window must start at the same logical boundary as the baseline"
                );
            }
            let before = status(&pic, id);
            let balance = pic.cycle_balance(id);
            let metric = super::playability_profile::metric_values(&pic, id);
            let t = pic.get_time();
            let wall = std::time::Instant::now();
            let mut samples = Vec::new();
            configuration(&pic, id, 512);
            let target = before.run.completed_segments + 8;
            for turn in 0..6000 {
                advance(&pic);
                let s = status(&pic, id);
                if turn % 20 == 0 {
                    samples.push(serde_json::json!({"turn":turn,"completed":s.run.completed_segments,"last_error":s.run.last_error}));
                }
                assert!(
                    s.run.last_error.is_none(),
                    "{label}: {:?}",
                    s.run.last_error
                );
                if s.run.completed_segments >= target {
                    break;
                }
            }
            pause(&pic, id);
            let after = status(&pic, id);
            assert_eq!(after.run.completed_segments, target);
            let remaining = pic.cycle_balance(id);
            let state = arena_world(&pic, id);
            assert_eq!(state.balls.len(), count);
            windows.push(serde_json::json!({"label":label,"status":"PASS","ticks":8,"net_cycles":(balance as i128-remaining as i128).to_string(),"cycles_per_tick":(balance as i128-remaining as i128)/8,"simulated_ns":(pic.get_time().as_nanos_since_unix_epoch()-t.as_nanos_since_unix_epoch()).to_string(),"host_wall_seconds":wall.elapsed().as_secs_f64(),"source_calls":after.source.index_calls-before.source.index_calls,"metrics_before":metric,"metrics_after":super::playability_profile::metric_values(&pic,id),"module_sha256":if label=="candidate-v6"{dtr_wire::hash(&module)}else{dtr_wire::hash(&prior)},"state_bytes":state.encode().unwrap().len(),"artifact_bytes":observe(&pic,id).1.artifacts.iter().map(|d|d.length).collect::<Vec<_>>(),"samples":samples}));
            std::fs::write(
                out.join(format!("{label}-state.bin")),
                state.encode().unwrap(),
            )
            .unwrap();
            states.push(state);
        }
        // This deliberately friendly/no-payment path has unchanged physics.
        // Hostile captures and purchases intentionally differ after activation.
        assert_eq!(states[0].balls, states[1].balls);
        assert_eq!(states[0].cannons, states[1].cannons);
        assert_eq!(states[0].ownership, states[1].ownership);
        assert_eq!(states[0].credits, states[1].credits);
        assert_eq!(states[0].time, states[1].time);
        let row = serde_json::json!({"balls":count,"windows":windows,"friendly_physics_and_scores_equal":true,"qualification":"Fixed eight-tick synthetic friendly states, exact normal modules on fiduciary PocketIC; real billing/model measurements but no sustained wall-time delivery claim. Snapshot restoration is confined to disposable comparison setup."});
        save(&out, "cost.json", &row);
        results.push(row);
    }
    save(
        &root,
        "normal-cost-comparison.json",
        &serde_json::json!({"status":"PASS","rows":results}),
    );
}
fn configuration(pic: &PocketIc, id: Principal, budget: u32) {
    get_result::<Status>(
        pic,
        id,
        "start_autonomous",
        candid::encode_one(RunConfig {
            segment_ticks: 1,
            pacing_seconds: 1,
            work_budget: budget,
        })
        .unwrap(),
    );
}
fn pause(pic: &PocketIc, id: Principal) {
    get_result::<Status>(pic, id, "pause_autonomous", encode_args(()).unwrap());
}
fn advance(pic: &PocketIc) {
    if REAL_TIME.with(|v| v.get()) {
        std::thread::sleep(Duration::from_millis(50));
        return;
    }
    pic.advance_time(Duration::from_millis(50));
    for _ in 0..4 {
        pic.tick();
    }
}
fn funding_paused(pic: &PocketIc, id: Principal, paused: bool) {
    #[derive(CandidType, Deserialize)]
    struct Funding {
        paused: bool,
    }
    assert_eq!(
        get_result::<Funding>(
            pic,
            id,
            "set_funding_paused",
            candid::encode_one(paused).unwrap()
        )
        .paused,
        paused
    );
}
fn one_tick(pic: &PocketIc, id: Principal) {
    let target = status(pic, id).run.completed_segments + 1;
    configuration(pic, id, 512);
    for _ in 0..6000 {
        advance(pic);
        let s = status(pic, id);
        assert!(s.run.last_error.is_none(), "{:?}", s.run.last_error);
        if s.run.completed_segments >= target {
            break;
        }
    }
    pause(pic, id);
    assert_eq!(
        status(pic, id).run.completed_segments,
        target,
        "exactly one complete tick required"
    );
}
fn prepare(pic: &PocketIc, id: Principal, method: &str) {
    let mut error = String::new();
    for _ in 0..1800 {
        let reply = pic
            .update_call(id, controller(), method, encode_args(()).unwrap())
            .unwrap();
        match decode_one::<Result<Vec<u8>, String>>(&reply).unwrap() {
            Ok(_) => return,
            Err(e)
                if e.starts_with("finish existing source reconciliation")
                    || e.starts_with(
                        "finish existing source reconciliation and recover errors",
                    ) =>
            {
                error = e
            }
            Err(e) => panic!("{method}: {e}"),
        }
        advance(pic);
    }
    panic!("{method} preparation failed: {error}");
}
fn old_transition(pic: &PocketIc, id: Principal, kind: &str) {
    prepare(pic, id, &format!("prepare_{kind}_transition"));
    for _ in 0..1800 {
        if transition_view_for(pic, id, &format!("{kind}_transition_status"))
            .unwrap()
            .phase
            == "ready"
            && transition_drained(pic, id)
        {
            break;
        }
        advance(pic);
    }
    assert_eq!(
        transition_view_for(pic, id, &format!("{kind}_transition_status"))
            .unwrap()
            .phase,
        "ready"
    );
    let _: Vec<u8> = get_result(
        pic,
        id,
        &format!("commit_{kind}_transition"),
        candid::encode_one(observe(pic, id).1.head.manifest_hash).unwrap(),
    );
}
fn record(pic: &PocketIc, id: Principal, rows: &mut Vec<Publication>, out: &Path) {
    let (o, p) = observe(pic, id);
    let Some(n) = p.head.segment_id.as_ref() else {
        return;
    };
    let current = n.0.to_string().parse::<usize>().unwrap();
    for segment in rows.len()..=current {
        let raw: Vec<u8> = if segment == current {
            o.publication.clone()
        } else {
            get_query(
                pic,
                id,
                "retained_publication",
                candid::encode_one(segment as u64).unwrap(),
            )
        };
        let publication: Publication = decode(&raw).unwrap();
        std::fs::write(out.join(format!("publication-{segment}.bin")), raw).unwrap();
        for (kind, descriptor) in publication.artifacts.iter().enumerate() {
            let mut body = Vec::new();
            for chunk in 0..descriptor.chunks.len() {
                body.extend(get_query::<Vec<u8>>(
                    pic,
                    id,
                    "retained_artifact_chunk",
                    encode_args((
                        segment as u64,
                        dtr_wire::hash(&encode_publication(&publication)),
                        kind as u8,
                        chunk as u16,
                    ))
                    .unwrap(),
                ));
            }
            assert_eq!(dtr_wire::hash(&body), descriptor.sha256);
            std::fs::write(
                out.join(format!("publication-{segment}-artifact-{kind}.bin")),
                body,
            )
            .unwrap();
        }
        rows.push(publication);
    }
}
fn controls(browser: bool) -> World {
    let fixture: serde_json::Value = serde_json::from_str(include_str!(
        "../../../../tests/fixtures/playability-host-history.json"
    ))
    .unwrap();
    let mut w =
        World::decode(&unhex(fixture["initial_world_hex"].as_str().unwrap()).unwrap()).unwrap();
    // Retained control players collide at 4.5, after both old-rule segments
    // drain. A genuine paid fire adds a surviving ball away from that path.
    // Legacy new-cannon placement cannot introduce an obstacle on the path.
    for (i, c) in w.cannons.iter_mut().enumerate() {
        let account = AccountIdentifier::new(
            &Principal::self_authenticating([if i == 0 { 9 } else { 2 }; 32]),
            &DEFAULT_SUBACCOUNT,
        )
        .to_hex();
        w.credits[i].account = account.clone();
        c.account = account;
    }
    w.credits.sort_by(|a, b| a.account.cmp(&b.account));
    w.balls[0].cell = 51;
    w.balls[0].x0 = Int(3584.into());
    w.balls[1].cell = 60;
    w.balls[1].x0 = Int(12800.into());
    if browser {
        use b2z_native::world::{Ball, Cannon, Credit};
        use dtr_wire::Rat;
        w.cells = (0..128)
            .map(|cell| {
                1 + (if cell / 16 >= 4 { 2 } else { 0 }) + (if cell % 16 >= 8 { 1 } else { 0 })
            })
            .collect();
        w.cannons[0].cell = 32;
        w.cannons[1].cell = 47;
        w.balls[0].cell = 35;
        w.balls[0].y0 = Int(2560.into());
        w.balls[1].cell = 44;
        w.balls[1].y0 = Int(2560.into());
        for (id, cell, ball_cell, x, velocity) in [
            (3u32, 96usize, 99usize, 3584i64, 1024),
            (4, 111, 108, 12800, -1024),
        ] {
            let account = AccountIdentifier::new(
                &Principal::self_authenticating([id as u8; 32]),
                &DEFAULT_SUBACCOUNT,
            )
            .to_hex();
            w.cannons.push(Cannon {
                id,
                cell,
                account: account.clone(),
                heading: None,
            });
            w.credits.push(Credit {
                account,
                units: Rat::integer(id as i64 * 11),
            });
            w.balls.push(Ball {
                id,
                owner: id,
                cell: ball_cell,
                x0: Int(x.into()),
                y0: Int(6656.into()),
                vx: velocity,
                vy: 0,
            });
        }
        w.next_ball_id = 5;
        w.next_cannon_id = 5;
        w.credits.sort_by(|a, b| a.account.cmp(&b.account));
    }
    w.received_e8s = Int(0.into());
    w.validate().unwrap();
    w
}
fn history_and_authentication(
    pic: &PocketIc,
    id: Principal,
    out: &Path,
    initial: &World,
    publications: &[Publication],
    payments: &BTreeMap<u64, String>,
) {
    let mut events = Vec::new();
    let mut metadata = BTreeMap::new();
    let mut assigned = Vec::new();
    for p in publications {
        let segment = p
            .head
            .segment_id
            .as_ref()
            .unwrap()
            .0
            .to_string()
            .parse::<u64>()
            .unwrap();
        let catalog = encode_publication(p);
        let hash = dtr_wire::hash(&catalog);
        let mut bytes = Vec::new();
        for chunk in 0..p.artifacts[1].chunks.len() {
            bytes.extend(get_query::<Vec<u8>>(
                pic,
                id,
                "retained_artifact_chunk",
                encode_args((segment, hash.clone(), 1u8, chunk as u16)).unwrap(),
            ));
        }
        assert_eq!(dtr_wire::hash(&bytes), p.artifacts[1].sha256);
        events.push(serde_json::json!({"segment_id":segment.to_string(),"events_hex":hex(&bytes)}));
        if let Some(epoch) = &p.epoch {
            let bytes: Vec<u8> = get_query(
                pic,
                id,
                "epoch_metadata",
                candid::encode_one(epoch.transition_hash.clone()).unwrap(),
            );
            assert_eq!(dtr_wire::hash(&bytes), epoch.metadata_hash);
            metadata.insert(epoch.transition_hash.clone(), hex(&bytes));
        }
        if let Some(seal) = &p.head.seal {
            let from = seal.source_from.0.to_string().parse::<u64>().unwrap();
            let end = seal
                .source_to_exclusive
                .0
                .to_string()
                .parse::<u64>()
                .unwrap();
            assigned.extend(
                payments
                    .range(from..end)
                    .map(|(position, _)| position.to_string()),
            );
        }
    }
    let path = out.join("independent-history.json");
    save(
        out,
        "independent-history.json",
        &serde_json::json!({"status":"PASS","evidence_class":"DISPOSABLE_NORMAL_MODULE_QUERY_CAPTURE; IC authenticity separately verified below","initial_world_hex":hex(&initial.encode().unwrap()),"publications":publications,"inputs":payments.iter().map(|(position,payload_hex)|serde_json::json!({"position":position.to_string(),"payload_hex":payload_hex})).collect::<Vec<_>>(),"assigned":assigned,"artifact_events":events,"epoch_metadata":metadata}),
    );
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    assert!(
        std::process::Command::new("node")
            .current_dir(&root)
            .args([
                "tools/replay_s14.mjs",
                path.to_str().unwrap(),
                out.join("independent-replay.json").to_str().unwrap()
            ])
            .status()
            .unwrap()
            .success()
    );
    let auth = out.join("authenticated-final");
    std::fs::create_dir(&auth).unwrap();
    let (o, p) = observe(pic, id);
    std::fs::write(auth.join("catalog.bin"), o.publication.clone()).unwrap();
    std::fs::write(auth.join("certificate.cbor"), o.certificate.unwrap()).unwrap();
    std::fs::write(auth.join("root-key.der"), pic.root_key().unwrap()).unwrap();
    for (kind, name) in ["state", "events", "scores"].iter().enumerate() {
        let mut bytes = Vec::new();
        for chunk in 0..p.artifacts[kind].chunks.len() {
            bytes.extend(get_query::<Vec<u8>>(
                pic,
                id,
                "artifact_chunk",
                encode_args((dtr_wire::hash(&o.publication), kind as u8, chunk as u16)).unwrap(),
            ));
        }
        assert_eq!(dtr_wire::hash(&bytes), p.artifacts[kind].sha256);
        std::fs::write(auth.join(format!("{name}.bin")), bytes).unwrap();
    }
    save(
        &auth,
        "metadata.json",
        &serde_json::json!({"canister_id":id.to_text(),"now_ns":pic.get_time().as_nanos_since_unix_epoch().to_string(),"publication_version":p.version,"scenario":"paid-playability-v9","virtual_clock":true}),
    );
    assert!(
        std::process::Command::new("node")
            .current_dir(&root)
            .args([
                "tools/verify_operation_cache_observation.mjs",
                auth.to_str().unwrap()
            ])
            .status()
            .unwrap()
            .success()
    );
}
#[derive(CandidType, Deserialize)]
struct BoundaryWork {
    phase: Option<String>,
    pending_inputs: u32,
}

#[test]
#[ignore = "explicit normal-module paid v5→v6 rehearsal; local only"]
fn paid_island_upgrade_rehearsal() {
    assert_eq!(std::env::var("B2Z_PROFILE_FIDUCIARY").as_deref(), Ok("1"));
    let out = PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap());
    std::fs::create_dir_all(&out).unwrap();
    let old = bytes("B2Z_PLAYABILITY_PRIOR_WASM");
    assert_eq!(
        dtr_wire::hash(&old),
        "c7d12fd76146554186e63330fc95094d86941caf119bceef47f9f76c777c6526"
    );
    let module = bytes("B2Z_S14_WASM");
    let browser = std::env::var("B2Z_PLAYABILITY_BROWSER").as_deref() == Ok("1");
    let initial = controls(browser);
    let extra = Principal::self_authenticating([10; 32]);
    let extras = if browser {
        vec![extra, Principal::self_authenticating([2; 32])]
    } else {
        vec![extra]
    };
    let (pic, id, ledger, payer) = arena_setup_world_fee_clock_payers(
        old.clone(),
        initial.encode().unwrap(),
        10_000,
        if browser { 3600 } else { 900 },
        &extras,
    );
    let index = status(&pic, id).source.index;
    let cmc = Principal::from_text("rkp4c-7iaaa-aaaaa-aaaca-cai").unwrap();
    pic.create_canister_with_id(
        Some(controller()),
        Some(CanisterSettings {
            controllers: Some(vec![controller()]),
            ..Default::default()
        }),
        cmc,
    )
    .unwrap();
    pic.install_canister(
        cmc,
        bytes("B2Z_CMC_MOCK_WASM"),
        encode_args((id, ledger)).unwrap(),
        Some(controller()),
    );
    funding_paused(&pic, id, true);
    let mut payments = BTreeMap::new();
    let mut publications = Vec::new();
    let first_fire = if browser {
        b"ANGLE 270".as_slice()
    } else {
        b"ANGLE 90".as_slice()
    };
    let join = transfer_text(&pic, ledger, payer, id, 10_000_000, first_fire);
    payments.insert(
        join,
        normalized(
            AccountIdentifier::new(&payer, &DEFAULT_SUBACCOUNT),
            10_000_000,
            b2z_protocol::encode(b2z_protocol::parse_text(first_fire).unwrap()),
        ),
    );
    for _ in 0..1800 {
        if work(&pic, id).0 > 0 {
            break;
        }
        advance(&pic);
    }
    assert!(work(&pic, id).0 > 0);
    one_tick(&pic, id);
    record(&pic, id, &mut publications, &out);
    assert_eq!(
        arena_world(&pic, id).cannons.len(),
        if browser { 4 } else { 2 }
    );
    old_transition(&pic, id, "torus");
    record(&pic, id, &mut publications, &out);
    one_tick(&pic, id);
    record(&pic, id, &mut publications, &out);
    old_transition(&pic, id, "million");
    record(&pic, id, &mut publications, &out);
    assert_eq!(arena_world(&pic, id).version, 5);

    // Stage an unfinished real normal-Wasm operation; no synthetic mutation API.
    configuration(&pic, id, if browser { 4 } else { 1 });
    let mut unfinished = false;
    for _ in 0..100 {
        advance(&pic);
        let w: BoundaryWork = get_query(&pic, id, "controller_work", encode_args(()).unwrap());
        if w.phase.is_some() {
            unfinished = true;
            break;
        }
    }
    pause(&pic, id);
    assert!(unfinished);
    assert_eq!(arena_world(&pic, id).time.0.to_integer().to_string(), "2");
    funding_paused(&pic, id, false);
    operation_cost::prepare_notify_pending(&pic, id, ledger, payer);
    // The helper made one genuine local invalid-memo payment. Include it in
    // replay from actual Index history; never fabricate its Ledger position.
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
    let invalid = history
        .unwrap()
        .transactions
        .into_iter()
        .find(|r| r.transaction.icrc1_memo.as_deref() == Some(b"ANGLE NaN"))
        .unwrap();
    payments.insert(
        invalid.id,
        normalized(
            AccountIdentifier::new(&payer, &DEFAULT_SUBACCOUNT),
            100_000_000,
            [0; 8],
        ),
    );
    let before_world = arena_world(&pic, id);
    let before_catalog = observe(&pic, id).0.publication;
    let before_retained = retained_bytes(&pic, id);
    let before_source = status(&pic, id).source;
    let before_finance = funding_tests::preserved_finance(&pic, id);
    let before_memory = pic.canister_status(id, Some(controller())).unwrap();
    let before_cycles = pic.cycle_balance(id);
    pic.upgrade_canister(
        id,
        module.clone(),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    let after_cycles = pic.cycle_balance(id);
    let after_memory = pic.canister_status(id, Some(controller())).unwrap();
    assert_eq!(arena_world(&pic, id), before_world);
    assert_eq!(observe(&pic, id).0.publication, before_catalog);
    assert_eq!(retained_bytes(&pic, id), before_retained);
    assert_eq!(funding_tests::preserved_finance(&pic, id), before_finance);
    assert_eq!(
        status(&pic, id).source.admitted_to_exclusive,
        before_source.admitted_to_exclusive
    );
    assert_eq!(
        status(&pic, id).source.recipient_account,
        before_source.recipient_account
    );
    assert_eq!(
        after_memory.settings.controllers,
        before_memory.settings.controllers
    );
    assert_eq!(
        after_memory.module_hash,
        Some(unhex(&dtr_wire::hash(&module)).unwrap())
    );
    save(
        &out,
        "normal-upgrade.json",
        &serde_json::json!({"status":"PASS","predecessor_sha256":dtr_wire::hash(&old),"candidate_sha256":dtr_wire::hash(&module),"paid_world_and_catalog_and_retained_preserved":true,"unfinished_operation":true,"pending_treasury":before_finance,"cycles_before":before_cycles.to_string(),"cycles_after":after_cycles.to_string(),"upgrade_net_debit":(before_cycles as i128-after_cycles as i128).to_string(),"reserved_before":before_memory.reserved_cycles.to_string(),"reserved_after":after_memory.reserved_cycles.to_string()}),
    );
    operation_cost::finish_notify_pending(&pic, id, &out);
    funding_paused(&pic, id, true);
    let scene = if browser {
        let scene = super::playability_browser::Scene::start(&pic, id, ledger, payer, &out);
        REAL_TIME.with(|v| v.set(true));
        Some(scene)
    } else {
        None
    };
    // Keep the captured paused configuration. Calling start merely to change a
    // budget can advance overdue old gameplay before pause is handled.
    prepare(&pic, id, "prepare_playability_transition");
    let mut ready = false;
    for _ in 0..6000 {
        let bytes: Vec<u8> = get_query(
            &pic,
            id,
            "playability_transition_status",
            encode_args(()).unwrap(),
        );
        let v: serde_json::Value = decode(&bytes).unwrap();
        assert!(v["lifecycle_error"].is_null());
        if v["transition"]["phase"] == "ready"
            && transition_drained(&pic, id)
            && arena_world(&pic, id).pending.is_empty()
        {
            ready = true;
            break;
        }
        advance(&pic);
    }
    assert!(ready, "paused old work/source window did not drain");
    record(&pic, id, &mut publications, &out);
    let old_world = arena_world(&pic, id);
    assert_eq!(
        old_world.time.0.to_integer().to_string(),
        "4",
        "the staged old operation and later old-rule payment must both drain before v6 activation"
    );
    let old_manifest = observe(&pic, id).1.head.manifest_hash;
    let _: Vec<u8> = get_result(
        &pic,
        id,
        "commit_playability_transition",
        candid::encode_one(old_manifest).unwrap(),
    );
    let migrated = arena_world(&pic, id);
    assert_eq!(migrated.version, 6);
    assert_eq!(migrated.balls, old_world.balls);
    assert_eq!(migrated.cannons, old_world.cannons);
    assert_eq!(migrated.credits, old_world.credits);
    assert_eq!(migrated.received_e8s, old_world.received_e8s);
    assert_eq!(migrated.ownership, old_world.ownership);
    record(&pic, id, &mut publications, &out);
    one_tick(&pic, id);
    record(&pic, id, &mut publications, &out);
    if let Some(scene) = scene {
        scene.finish(&pic, id, ledger, payer, &initial, &mut payments);
        return;
    }
    let dormant = arena_world(&pic, id);
    let life = dormant.playability.as_ref().unwrap();
    assert_eq!(
        life.lifecycle
            .iter()
            .filter(|l| l.deadline_ns.is_some())
            .count(),
        1,
        "only the ball-free control island must become dormant"
    );
    assert_eq!(
        dormant.balls.len(),
        1,
        "the paid ball survives the control wall-pair collision and supports its island"
    );
    let deadline = life
        .lifecycle
        .iter()
        .filter_map(|l| l.deadline_ns.as_ref())
        .map(|n| n.0.to_string().parse::<u64>().unwrap())
        .max()
        .unwrap();
    let current = pic.get_time().as_nanos_since_unix_epoch();
    assert!(deadline >= current);
    pic.advance_time(Duration::from_nanos(deadline - current + 1));
    let mut expired = false;
    for _ in 0..1800 {
        advance(&pic);
        let w = arena_world(&pic, id);
        if w.cannons.len() == 1 {
            expired = true;
            break;
        }
    }
    assert!(
        expired,
        "elapsed lifecycle timer did not expire the dormant controls"
    );
    let final_world = arena_world(&pic, id);
    assert_eq!(final_world.time, dormant.time);
    assert_eq!(final_world.received_e8s, dormant.received_e8s);
    assert_eq!(final_world.credits, dormant.credits);
    assert_eq!(final_world.balls, dormant.balls);
    assert_eq!(observe(&pic, id).1.version, 9);
    record(&pic, id, &mut publications, &out);
    history_and_authentication(&pic, id, &out, &initial, &publications, &payments);
    save(
        &out,
        "installed-island-result.json",
        &serde_json::json!({"status":"PASS","scope":"Normal-Wasm installed paid v5 preservation, unfinished operation, pending treasury recovery, v6 wall-pair death/island dormancy and one explicitly virtual 24h expiry. Browser/wire qualification is separate.","normal_module_sha256":dtr_wire::hash(&module),"predecessor_sha256":dtr_wire::hash(&old),"publications":publications.len(),"remaining_cannons":final_world.cannons.len(),"remaining_balls":final_world.balls.len(),"source_cursor":status(&pic,id).source.admitted_to_exclusive,"deadline_ns":deadline.to_string(),"canonical_inputs":payments}),
    );
}
