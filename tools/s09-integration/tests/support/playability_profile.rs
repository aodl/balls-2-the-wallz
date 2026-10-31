//! Fixed disposable admission screen; no production identity or real money.
use super::*;
use b2z_native::{
    playability as v6,
    territory_v6::Territory,
    world::{Ball, Cannon, ScaledOwnership, World},
};
use pocket_ic::common::rest::SubnetKind;

fn world(balls: usize) -> World {
    assert!(balls > 0 && balls <= v6::MAX_BALLS);
    let players = if balls <= 4 { 1 } else { 8 };
    let cannons = if balls <= 4 {
        1
    } else {
        v6::MAX_CANNONS.min(128)
    };
    assert!(cannons >= players && cannons.div_ceil(players) <= v6::MAX_RETAINED_PER_PLAYER);
    let accounts = (1..=players)
        .map(|id| {
            AccountIdentifier::new(
                &Principal::self_authenticating([id as u8; 32]),
                &DEFAULT_SUBACCOUNT,
            )
            .to_hex()
        })
        .collect::<Vec<_>>();
    let mut w = World::decode(&initial_world()).unwrap();
    w.version = 6;
    w.width = 1000;
    w.height = 1000;
    w.cells.clear();
    w.ownership = Some(
        ScaledOwnership::from_32x32(
            (0..1024)
                .map(|cell| (cell % 32 * players / 32 + 1) as u32)
                .collect(),
            1000,
            1000,
        )
        .unwrap(),
    );
    w.cannons = (0..cannons)
        .map(|i| {
            let player = i * players / cannons;
            Cannon {
                id: (i + 1) as u32,
                account: accounts[player].clone(),
                cell: (i % 16 * 60 + 10) * 1000 + player * 1000 / players + 5,
                heading: Some(16384),
            }
        })
        .collect();
    w.balls = (0..balls)
        .map(|i| {
            let player = i * players / balls;
            let x = player * 1000 / players + 1000 / players / 2;
            let y = (i % (balls / players).max(1)) * 10;
            Ball {
                id: (i + 1) as u32,
                owner: (player + 1) as u32,
                cell: y * 1000 + x,
                x0: Int((x * 1024 + 512).into()),
                y0: Int((y * 1024 + 512).into()),
                vx: 0,
                vy: 32000,
            }
        })
        .collect();
    w.next_cannon_id = cannons as u32 + 1;
    w.next_ball_id = balls as u32 + 1;
    w.next_strike_id = 1;
    w.pending.clear();
    w.credits.clear();
    w.received_e8s = Int(0.into());
    w.playability = Some(v6::State {
        elapsed_ns: Int(0.into()),
        next_player_id: players as u32 + 1,
        next_territory_id: players as u32 + 1,
        players: accounts
            .iter()
            .enumerate()
            .map(|(i, a)| v6::Player {
                id: i as u32 + 1,
                account: a.clone(),
            })
            .collect(),
        territories: (1..=players)
            .map(|id| Territory {
                id: id as u32,
                player: id as u32,
            })
            .collect(),
        lifecycle: w
            .cannons
            .iter()
            .map(|c| v6::Lifecycle {
                cannon: c.id,
                player: w.cannons.iter().position(|v| v.id == c.id).unwrap() as u32
                    * players as u32
                    / cannons as u32
                    + 1,
                generation: 1,
                dormant_since_ns: None,
                deadline_ns: None,
            })
            .collect(),
    });
    // Fixed neutral holes in every other row of each flight column. They keep
    // each friendly stripe connected but force real capture/topology work.
    for player in 0..players {
        let x = player * 1000 / players + 1000 / players / 2;
        for y in (1..1000).step_by(2) {
            w.set_owner(y * 1000 + x, 0).unwrap();
        }
    }
    w.validate().unwrap();
    w
}
#[derive(Clone, Deserialize, CandidType, serde::Serialize)]
struct Metrics {
    messages: u64,
    seal_instructions: u64,
    step_instructions: u64,
    publish_instructions: u64,
    persist_instructions: u64,
    max_instructions: u64,
    last_step_instructions: u64,
}
#[derive(Deserialize, CandidType)]
struct Runtime {
    metrics: Metrics,
}
fn metrics(pic: &PocketIc, id: Principal) -> Metrics {
    get_query::<Runtime>(pic, id, "controller_runtime", encode_args(()).unwrap()).metrics
}
pub(super) fn metric_values(pic: &PocketIc, id: Principal) -> serde_json::Value {
    serde_json::to_value(metrics(pic, id)).unwrap()
}
fn artifacts(pic: &PocketIc, id: Principal, p: &Publication) -> Vec<Vec<u8>> {
    p.artifacts
        .iter()
        .enumerate()
        .map(|(kind, d)| {
            let mut bytes = Vec::new();
            for i in 0..d.chunks.len() {
                let b: Vec<u8> = get_query(
                    pic,
                    id,
                    "artifact_chunk",
                    encode_args((dtr_wire::hash(&encode_publication(p)), kind as u8, i as u16))
                        .unwrap(),
                );
                bytes.extend(b);
            }
            assert_eq!(dtr_wire::hash(&bytes), d.sha256);
            assert_eq!(bytes.len(), d.length);
            bytes
        })
        .collect()
}
#[test]
#[ignore = "one bounded declared v6 admission screen, not a delivery performance window"]
fn playability_admission_screen() {
    assert_eq!(std::env::var("B2Z_PROFILE_FIDUCIARY").as_deref(), Ok("1"));
    let root = PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap());
    std::fs::create_dir_all(&root).unwrap();
    let module = bytes("B2Z_S14_TEST_WASM");
    let module_hash = dtr_wire::hash(&module);
    let normal = (std::env::var("B2Z_PLAYABILITY_SCREEN_NORMAL").as_deref() == Ok("1"))
        .then(|| bytes("B2Z_S14_WASM"));
    let requested = std::env::var("B2Z_PLAYABILITY_SCREEN_CASES")
        .unwrap_or_else(|_| "3,4,64,128,512".into())
        .split(',')
        .map(|s| s.parse::<usize>().unwrap())
        .collect::<Vec<_>>();
    assert!(requested.len() <= 5);
    let mut rows = Vec::new();
    for count in requested {
        if count > v6::MAX_BALLS {
            rows.push(serde_json::json!({"balls":count,"status":"NOT_ADMITTED","reason":"above candidate declared capacity"}));
            continue;
        }
        let directory = root.join(format!("balls-{count}"));
        std::fs::create_dir(&directory).unwrap();
        let initial = world(count);
        std::fs::write(
            directory.join("initial-state.bin"),
            initial.encode().unwrap(),
        )
        .unwrap();
        let (pic, id, _, _) = arena_setup_world(module.clone(), initial.encode().unwrap());
        let topology = pic.topology();
        let subnet = pic.get_subnet(id).unwrap();
        assert_eq!(Some(subnet), topology.get_fiduciary());
        assert_eq!(
            topology.subnet_configs[&subnet].subnet_kind,
            SubnetKind::Fiduciary
        );
        #[derive(CandidType, Deserialize)]
        struct Funding {
            paused: bool,
        }
        assert!(
            get_result::<Funding>(
                &pic,
                id,
                "set_funding_paused",
                candid::encode_one(true).unwrap()
            )
            .paused
        );
        if let Some(normal) = &normal {
            // Synthetic setup is confined to the disposable constructor. All
            // measured execution below runs the exact frozen normal module.
            for _ in 0..600 {
                pic.advance_time(Duration::from_secs(1));
                pic.tick();
            }
            pic.upgrade_canister(
                id,
                normal.clone(),
                encode_args(()).unwrap(),
                Some(controller()),
            )
            .unwrap();
            assert_eq!(arena_world(&pic, id), initial);
            assert_eq!(
                pic.canister_status(id, Some(controller()))
                    .unwrap()
                    .module_hash,
                Some(unhex(&dtr_wire::hash(normal)).unwrap())
            );
        }
        let start = status(&pic, id);
        let before = metrics(&pic, id);
        let balance = pic.cycle_balance(id);
        let memory = pic.canister_status(id, Some(controller())).unwrap();
        let time = pic.get_time();
        let wall = std::time::Instant::now();
        let target = start.run.completed_segments + 4;
        let mut turns = 0;
        let mut peak_step = 0;
        let mut samples = Vec::new();
        get_result::<Status>(
            &pic,
            id,
            "start_autonomous",
            candid::encode_one(RunConfig {
                segment_ticks: 1,
                pacing_seconds: 1,
                work_budget: 512,
            })
            .unwrap(),
        );
        let after = loop {
            pic.advance_time(Duration::from_millis(50));
            for _ in 0..4 {
                pic.tick();
            }
            turns += 1;
            let current = status(&pic, id);
            let m = metrics(&pic, id);
            peak_step = peak_step.max(m.last_step_instructions);
            if turns % 20 == 0 {
                samples.push(serde_json::json!({"turn":turns,"completed":current.run.completed_segments,"error":current.run.last_error,"last_step_instructions":m.last_step_instructions,"cycles":pic.cycle_balance(id).to_string()}));
            }
            if current.run.completed_segments >= target
                || current.run.last_error.is_some()
                || turns >= 6000
                || wall.elapsed() >= Duration::from_secs(180)
            {
                break current;
            }
        };
        get_result::<Status>(&pic, id, "pause_autonomous", encode_args(()).unwrap());
        let after_metrics = metrics(&pic, id);
        let remaining = pic.cycle_balance(id);
        let final_memory = pic.canister_status(id, Some(controller())).unwrap();
        let (o, p) = observe(&pic, id);
        let bodies = artifacts(&pic, id, &p);
        let final_world = World::decode(&bodies[0]).unwrap();
        let passed = after.run.completed_segments >= target
            && after.run.last_error.is_none()
            && final_world.balls.len() == count
            && bodies
                .iter()
                .all(|b| b.len() <= dtr_host::observation::MAX_ARTIFACT);
        std::fs::write(directory.join("catalog.bin"), &o.publication).unwrap();
        std::fs::write(directory.join("certificate.cbor"), o.certificate.unwrap()).unwrap();
        std::fs::write(directory.join("root-key.der"), pic.root_key().unwrap()).unwrap();
        for (kind, b) in ["state", "events", "scores"].iter().zip(&bodies) {
            std::fs::write(directory.join(format!("{kind}.bin")), b).unwrap();
        }
        if !passed {
            std::fs::write(
                directory.join("failed-stable-memory.bin"),
                pic.get_stable_memory(id),
            )
            .unwrap();
        }
        let row = serde_json::json!({"status":if passed{"PASS"}else{"FAIL"},"balls":count,"cannons":initial.cannons.len(),"players":initial.playability.as_ref().unwrap().players.len(),"neutral_holes":initial.ownership.as_ref().unwrap().overrides.len(),"initial_state_bytes":initial.encode().unwrap().len(),"completed_ticks":after.run.completed_segments-start.run.completed_segments,"source_calls":after.source.index_calls-start.source.index_calls,"runtime_error":after.run.last_error,"turns_50ms":turns,"virtual_ns":(pic.get_time().as_nanos_since_unix_epoch()-time.as_nanos_since_unix_epoch()).to_string(),"host_wall_seconds":wall.elapsed().as_secs_f64(),"cycles_before":balance.to_string(),"cycles_after":remaining.to_string(),"net_cycle_debit":(balance as i128-remaining as i128).to_string(),"metrics_before":before,"metrics_after":after_metrics,"maximum_observed_step_message_instructions":peak_step,"artifact_bytes":bodies.iter().map(|b|b.len()).collect::<Vec<_>>(),"final_ball_count":final_world.balls.len(),"memory_before":format!("{:?}",memory.memory_metrics),"memory_after":format!("{:?}",final_memory.memory_metrics),"reserved_cycles_before":memory.reserved_cycles.to_string(),"reserved_cycles_after":final_memory.reserved_cycles.to_string(),"publication_sha256":dtr_wire::hash(&o.publication),"subnet":subnet.to_text(),"subnet_configuration":topology.subnet_configs[&subnet],"samples":samples,"measured_module_sha256":normal.as_ref().map(|m|dtr_wire::hash(m)).unwrap_or_else(||module_hash.clone()),"normal_module_execution":normal.is_some(),"qualification":"Synthetic v6 genesis created using explicit disposable test hooks. If normal_module_execution is true, the exact normal module replaces it before every measurement. Pinned fiduciary IC admission/work/wire screen; no paid-history, sustained rate or 1 tick/s-at-capacity claim."});
        std::fs::write(
            directory.join("result.json"),
            serde_json::to_vec_pretty(&row).unwrap(),
        )
        .unwrap();
        rows.push(row);
        std::fs::write(
            root.join("admission-screen.json"),
            serde_json::to_vec_pretty(
                &serde_json::json!({"status":"RUNNING","module_sha256":module_hash,"rows":rows}),
            )
            .unwrap(),
        )
        .unwrap();
    }
    std::fs::write(root.join("admission-screen.json"),serde_json::to_vec_pretty(&serde_json::json!({"status":"COMPLETE","module_sha256":module_hash,"rows":rows,"all_original_cases_retained":true,"declared_source_max_balls":v6::MAX_BALLS,"declared_source_max_cannons":v6::MAX_CANNONS})).unwrap()).unwrap();
}
