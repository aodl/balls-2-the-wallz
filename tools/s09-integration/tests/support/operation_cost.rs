//! Disposable IC-only checkpoint traps. Never used for cost measurements.
use super::*;

fn bounded_upgrade(pic: &PocketIc, id: Principal, module: &[u8]) {
    for attempt in 0..3 {
        // Replenish install-code credit through real local scheduler rounds.
        for _ in 0..600 {
            pic.advance_time(Duration::from_secs(1));
            pic.tick();
        }
        match pic.upgrade_canister(
            id,
            module.to_vec(),
            encode_args(()).unwrap(),
            Some(controller()),
        ) {
            Ok(()) => return,
            Err(e) if e.reject_message.contains("rate limited") && attempt < 2 => {}
            Err(e) => panic!("fault rehearsal upgrade: {e:?}"),
        }
    }
    panic!("bounded fault rehearsal install credit exhausted");
}
fn fault(pic: &PocketIc, id: Principal, point: &str) {
    get_result::<()>(
        pic,
        id,
        "test_funding_fault",
        candid::encode_one(point.to_string()).unwrap(),
    );
}
fn bundle(pic: &PocketIc, id: Principal, p: &Publication, catalog: &[u8]) -> Vec<Vec<u8>> {
    if p.head.segment_id.is_none() {
        return p
            .artifacts
            .iter()
            .enumerate()
            .map(|(kind, desc)| {
                let mut bytes = vec![];
                for index in 0..desc.chunks.len() {
                    let chunk: Vec<u8> = get_query(
                        pic,
                        id,
                        "artifact_chunk",
                        encode_args((dtr_wire::hash(catalog), kind as u8, index as u16)).unwrap(),
                    );
                    bytes.extend(chunk);
                }
                bytes
            })
            .collect();
    }
    get_query(
        pic,
        id,
        "artifact_bundle",
        encode_args((
            p.head
                .segment_id
                .as_ref()
                .unwrap()
                .0
                .to_string()
                .parse::<u64>()
                .unwrap(),
            dtr_wire::hash(catalog),
        ))
        .unwrap(),
    )
}
fn authenticate(pic: &PocketIc, id: Principal, out: &Path) {
    let (o, p) = observe(pic, id);
    let data = bundle(pic, id, &p, &o.publication);
    std::fs::create_dir_all(out).unwrap();
    std::fs::write(out.join("catalog.bin"), &o.publication).unwrap();
    std::fs::write(out.join("certificate.cbor"), o.certificate.unwrap()).unwrap();
    std::fs::write(out.join("root-key.der"), pic.root_key().unwrap()).unwrap();
    for (k, b) in ["state", "events", "scores"].iter().zip(&data) {
        std::fs::write(out.join(format!("{k}.bin")), b).unwrap();
    }
    let zero_genesis = std::env::var("B2Z_PROFILE_ZERO").as_deref() == Ok("1");
    let expected_version = if zero_genesis { 6 } else { 8 };
    assert_eq!(p.version, expected_version);
    if zero_genesis {
        assert!(p.head.segment_id.is_none());
        let world = arena_world(pic, id);
        assert!(world.cannons.is_empty() && world.balls.is_empty());
    }
    std::fs::write(out.join("metadata.json"),serde_json::to_vec(&serde_json::json!({"canister_id":id.to_text(),"now_ns":pic.get_time().as_nanos_since_unix_epoch().to_string(),"publication_version":expected_version,"zero_genesis":zero_genesis,"scenario":if zero_genesis {"empty-v5-genesis-v6"} else {"paid-v8"},"virtual_clock":true})).unwrap()).unwrap();
    assert!(
        std::process::Command::new("node")
            .current_dir(Path::new(env!("CARGO_MANIFEST_DIR")).join("../.."))
            .args([
                "tools/verify_operation_cache_observation.mjs",
                out.to_str().unwrap()
            ])
            .status()
            .unwrap()
            .success()
    );
}
/// Rehearse checkpoint failures on a separately identified test-hook build from
/// the same functional candidate. No instrumented cycle result is accepted.
pub(super) fn checkpoint_faults(
    pic: &PocketIc,
    id: Principal,
    out: &Path,
    frozen_snapshot: Vec<u8>,
) {
    let module = bytes("B2Z_PROFILE_FAULT_WASM");
    pic.stop_canister(id, Some(controller())).unwrap();
    pic.load_canister_snapshot(id, Some(controller()), frozen_snapshot)
        .unwrap();
    bounded_upgrade(pic, id, &module);
    pic.start_canister(id, Some(controller())).unwrap();
    // Isolate checkpoint atomicity from unrelated financial scheduling. Active,
    // pending and uncertain financial callbacks are tested by the funding suite.
    #[derive(CandidType, Deserialize)]
    struct Paused {
        paused: bool,
    }
    assert!(
        get_result::<Paused>(
            pic,
            id,
            "set_funding_paused",
            candid::encode_one(true).unwrap()
        )
        .paused
    );
    get_result::<Status>(pic, id, "pause_autonomous", encode_args(()).unwrap());
    for _ in 0..10 {
        pic.tick();
    }
    let initial_world = arena_world(pic, id);
    let initial_catalog = observe(pic, id).0.publication;
    let initial_retained = retained_bytes(pic, id);
    let initial_source = status(pic, id).source.admitted_to_exclusive;
    let initial_finance = funding_tests::preserved_finance(pic, id);
    let initial_completed = status(pic, id).run.completed_segments;
    pic.stop_canister(id, Some(controller())).unwrap();
    let snapshot = pic
        .take_canister_snapshot(id, Some(controller()), None)
        .unwrap();
    let mut expected = None;
    let mut cases = vec![];
    for (point, stage) in [
        ("control", "none"),
        ("persistence:before-write", "before-write"),
        ("persistence:after-image", "after-image"),
        ("persistence-publish:after-current", "after-current"),
        ("persistence-publish:after-retained", "after-retained"),
        ("persistence-publish:after-root", "after-root"),
        (
            "persistence-publish:after-certification",
            "after-certification",
        ),
    ] {
        if point != "control" {
            pic.stop_canister(id, Some(controller())).unwrap();
        }
        pic.load_canister_snapshot(id, Some(controller()), snapshot.id.clone())
            .unwrap();
        // A snapshot load is not a Rust post_upgrade invocation. Rehydrate the
        // CDK timer registry through the same cold-upgrade path as production.
        bounded_upgrade(pic, id, &module);
        pic.start_canister(id, Some(controller())).unwrap();
        if point != "control" {
            fault(pic, id, point);
            let start = pic.update_call(
                id,
                controller(),
                "start_autonomous",
                candid::encode_one(RunConfig {
                    segment_ticks: 1,
                    pacing_seconds: 1,
                    work_budget: 512,
                })
                .unwrap(),
            );
            let marker = format!("B2Z_PERSISTENCE_FAULT {stage}");
            let mut trapped = match start {
                Err(e) => {
                    assert!(e.reject_message.contains(&marker), "unexpected {e:?}");
                    true
                }
                Ok(bytes) => {
                    assert!(
                        decode_one::<Result<Status, String>>(&bytes)
                            .unwrap()
                            .is_ok()
                    );
                    false
                }
            };
            for _ in 0..240 {
                if trapped {
                    break;
                }
                pic.advance_time(Duration::from_millis(50));
                pic.tick();
                let logs = pic.fetch_canister_logs(id, controller()).unwrap();
                trapped = logs
                    .iter()
                    .any(|r| String::from_utf8_lossy(&r.content).contains(&marker));
                assert_eq!(
                    observe(pic, id).0.publication,
                    initial_catalog,
                    "failed publication leaked before trap witness"
                );
            }
            assert!(trapped, "fault point was not executed: {point}");
            assert_eq!(observe(pic, id).0.publication, initial_catalog);
            assert_eq!(arena_world(pic, id), initial_world);
            assert_eq!(retained_bytes(pic, id), initial_retained);
            assert_eq!(status(pic, id).source.admitted_to_exclusive, initial_source);
            assert_eq!(funding_tests::preserved_finance(pic, id), initial_finance);
            authenticate(pic, id, &out.join(format!("fault-{stage}-trapped")));
            // Inspect authenticated state first; only then clear the local fault
            // and resume from the genuine prior checkpoint. No compensation.
            fault(pic, id, "persistence:clear");
            // start_autonomous is deliberately idempotent while running. A
            // trapped one-shot callback needs an explicit controller pause/start
            // to replace its timer reservation; never infer progress from true.
            get_result::<Status>(pic, id, "pause_autonomous", encode_args(()).unwrap());
        }
        get_result::<Status>(
            pic,
            id,
            "start_autonomous",
            candid::encode_one(RunConfig {
                segment_ticks: 1,
                pacing_seconds: 1,
                work_budget: 512,
            })
            .unwrap(),
        );
        for _ in 0..600 {
            if status(pic, id).run.completed_segments >= initial_completed + 2 {
                break;
            }
            pic.advance_time(Duration::from_millis(50));
            pic.tick();
            pic.tick();
        }
        get_result::<Status>(pic, id, "pause_autonomous", encode_args(()).unwrap());
        assert_eq!(
            status(pic, id).run.completed_segments,
            initial_completed + 2
        );
        let (o, p) = observe(pic, id);
        let recovered = (
            o.publication.clone(),
            bundle(pic, id, &p, &o.publication),
            retained_bytes(pic, id),
            status(pic, id).source.admitted_to_exclusive,
            funding_tests::preserved_finance(pic, id),
        );
        if let Some(ref expected) = expected {
            assert_eq!(
                expected, &recovered,
                "checkpoint recovery differs from matched no-fault control: {point}"
            );
        } else {
            expected = Some(recovered);
        }
        authenticate(pic, id, &out.join(format!("fault-{stage}-recovered")));
        cases.push(serde_json::json!({"point":point,"status":"PASS","trapped":point!="control","paid_state_and_retained_bytes_preserved":true,"authenticated_before_retry":point!="control","recovered_control_match":true,"publication_sha256":dtr_wire::hash(&o.publication)}));
    }
    std::fs::write(out.join("checkpoint-faults.json"),serde_json::to_vec_pretty(&serde_json::json!({"status":"PASS","test_hook_build_only":true,"wasm_sha256":dtr_wire::hash(&module),"starting_module":"exact frozen production snapshot","cases":cases})).unwrap()).unwrap();
}

#[test]
#[ignore = "bounded normal-Wasm Reserve Protection maintenance accounting"]
fn quiet_profile() {
    #[derive(CandidType, Deserialize)]
    struct Pace {
        mode: String,
        supported_milli: u32,
        admission_open: bool,
    }
    #[derive(CandidType, Deserialize)]
    struct Run {
        pace: Pace,
    }
    #[derive(CandidType, Deserialize)]
    struct View {
        run: Run,
    }
    let seconds: u64 = std::env::var("B2Z_PROFILE_QUIET_SECONDS")
        .unwrap()
        .parse()
        .unwrap();
    assert!((60..=1800).contains(&seconds));
    let mut modules = vec![("frozen", bytes("B2Z_PROFILE_FROZEN_WASM"))];
    if std::env::var_os("B2Z_PROFILE_A1_WASM").is_some() {
        modules.push(("a1", bytes("B2Z_PROFILE_A1_WASM")));
    }
    modules.push(("prototype", bytes("B2Z_S14_WASM")));
    let mut rows = vec![];
    for (label, module) in modules {
        let zero = std::env::var("B2Z_PROFILE_ZERO").as_deref() == Ok("1");
        let world = if zero {
            let mut v4 = b2z_native::world::World::decode(&initial_world()).unwrap();
            v4.version = 4;
            v4.width = 32;
            v4.height = 32;
            v4.cells = vec![0; 1024];
            v4.ownership = None;
            v4.cannons.clear();
            v4.balls.clear();
            v4.pending.clear();
            v4.validate().unwrap();
            b2z_native::migration::stage_million_world(&v4).unwrap()
        } else {
            b2z_native::world::World::decode(
                &std::fs::read(std::env::var("B2Z_PROFILE_CAPTURE").unwrap()).unwrap(),
            )
            .unwrap()
        };
        let (pic, id, _, _) = arena_setup_world(module, world.encode().unwrap());
        let before = status(&pic, id);
        let catalog = observe(&pic, id).0.publication;
        let cycles = pic.cycle_balance(id);
        let started = pic.get_time();
        start_arena(&pic, id);
        for _ in 0..seconds {
            pic.advance_time(Duration::from_secs(1));
            pic.tick();
            pic.tick();
        }
        let debit = cycles - pic.cycle_balance(id);
        let after = status(&pic, id);
        let view: View = get_query(&pic, id, "lab_status", encode_args(()).unwrap());
        if zero {
            assert!(world.cannons.is_empty() && world.balls.is_empty());
        } else {
            assert_eq!(view.run.pace.mode, "ReserveProtection");
            assert_eq!(view.run.pace.supported_milli, 0);
            assert!(!view.run.pace.admission_open);
        }
        assert_eq!(after.run.completed_segments, before.run.completed_segments);
        assert_eq!(observe(&pic, id).0.publication, catalog);
        assert!(after.source.index_calls >= before.source.index_calls + seconds / 60 - 1);
        let finance = funding_tests::full_finance(&pic, id);
        assert_eq!(finance["total_cycles_reported"], serde_json::json!("0"));
        if zero {
            authenticate(
                &pic,
                id,
                &PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap())
                    .join(format!("zero-{label}")),
            );
        }
        rows.push(serde_json::json!({"label":label,"cycles":debit.to_string(),"virtual_ns":(pic.get_time().as_nanos_since_unix_epoch()-started.as_nanos_since_unix_epoch()).to_string(),"index_calls":after.source.index_calls-before.source.index_calls,"segments":0,"mode":view.run.pace.mode,"source_error":after.source.last_error,"treasury":finance,"normal_Wasm":true,"fiduciary_fixture":true}));
    }
    std::fs::write(PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap()).join(if std::env::var("B2Z_PROFILE_ZERO").as_deref()==Ok("1") {"zero-profile.json"} else {"quiet-profile.json"}),serde_json::to_vec_pretty(&serde_json::json!({"status":"PASS","seconds":seconds,"includes_start_cost":true,"rows":rows})).unwrap()).unwrap();
}

/// Genuine valueless Ledger transfer with a stopped local CMC produces a durable
/// NotifyPending on the exact normal predecessor, without manufacturing state.
pub(super) fn prepare_notify_pending(
    pic: &PocketIc,
    id: Principal,
    ledger: Principal,
    payer: Principal,
) {
    get_result::<Status>(pic, id, "pause_autonomous", encode_args(()).unwrap());
    let cmc = Principal::from_text("rkp4c-7iaaa-aaaaa-aaaca-cai").unwrap();
    pic.stop_canister(cmc, Some(controller())).unwrap();
    transfer_text(pic, ledger, payer, id, 100_000_000, b"ANGLE NaN");
    for _ in 0..3 {
        pic.advance_time(Duration::from_secs(300));
        for _ in 0..80 {
            pic.tick();
        }
        if funding_tests::full_finance(pic, id)["phase"]
            .get("NotifyPending")
            .is_some()
        {
            return;
        }
    }
    panic!(
        "normal predecessor did not retain genuine NotifyPending: {:?}",
        funding_tests::full_finance(pic, id)
    );
}
pub(super) fn finish_notify_pending(pic: &PocketIc, id: Principal, out: &Path) {
    let before = funding_tests::full_finance(pic, id);
    let plan = before["phase"]["NotifyPending"]["plan"].clone();
    let block = before["phase"]["NotifyPending"]["block_index"].clone();
    assert!(!plan.is_null());
    let world = arena_world(pic, id);
    let catalog = observe(pic, id).0.publication;
    let retained = retained_bytes(pic, id);
    pic.start_canister(
        Principal::from_text("rkp4c-7iaaa-aaaaa-aaaca-cai").unwrap(),
        Some(controller()),
    )
    .unwrap();
    let mut after = before.clone();
    for _ in 0..3 {
        pic.advance_time(Duration::from_secs(300));
        for _ in 0..80 {
            pic.tick();
        }
        after = funding_tests::full_finance(pic, id);
        if after["phase"] == serde_json::json!("Idle") {
            break;
        }
    }
    assert_eq!(after["phase"], serde_json::json!("Idle"));
    assert_eq!(after["last_success"]["plan"], plan);
    assert_eq!(after["last_success"]["block_index"], block);
    let old: u128 = before["total_cycles_reported"]
        .as_str()
        .unwrap()
        .parse()
        .unwrap();
    let new: u128 = after["total_cycles_reported"]
        .as_str()
        .unwrap()
        .parse()
        .unwrap();
    assert_eq!(new - old, 1_000_000_000_000);
    assert_eq!(arena_world(pic, id), world);
    assert_eq!(observe(pic, id).0.publication, catalog);
    assert_eq!(retained_bytes(pic, id), retained);
    let once = after["total_cycles_reported"].clone();
    pic.advance_time(Duration::from_secs(300));
    for _ in 0..80 {
        pic.tick();
    }
    assert_eq!(
        funding_tests::full_finance(pic, id)["total_cycles_reported"],
        once
    );
    authenticate(pic, id, &out.join("pending-notify-recovered"));
    std::fs::write(out.join("pending-notify-recovery.json"),serde_json::to_vec_pretty(&serde_json::json!({"status":"PASS","origin":"exact frozen normal predecessor, genuine Ledger transaction, stopped local CMC","before":before,"after":after,"one_credit":true,"paid_world_and_retention_unchanged":true,"normal_Wasm":true})).unwrap()).unwrap();
}
