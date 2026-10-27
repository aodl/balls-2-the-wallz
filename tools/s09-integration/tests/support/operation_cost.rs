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
    std::fs::write(out.join("metadata.json"),serde_json::to_vec(&serde_json::json!({"canister_id":id.to_text(),"now_ns":pic.get_time().as_nanos_since_unix_epoch().to_string(),"publication_version":8,"virtual_clock":true})).unwrap()).unwrap();
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
        let world = b2z_native::world::World::decode(
            &std::fs::read(std::env::var("B2Z_PROFILE_CAPTURE").unwrap()).unwrap(),
        )
        .unwrap();
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
        assert_eq!(view.run.pace.mode, "ReserveProtection");
        assert_eq!(view.run.pace.supported_milli, 0);
        assert!(!view.run.pace.admission_open);
        assert_eq!(after.run.completed_segments, before.run.completed_segments);
        assert_eq!(observe(&pic, id).0.publication, catalog);
        assert!(after.source.index_calls >= before.source.index_calls + seconds / 60 - 1);
        let finance = funding_tests::full_finance(&pic, id);
        assert_eq!(finance["total_cycles_reported"], serde_json::json!("0"));
        rows.push(serde_json::json!({"label":label,"cycles":debit.to_string(),"virtual_ns":(pic.get_time().as_nanos_since_unix_epoch()-started.as_nanos_since_unix_epoch()).to_string(),"index_calls":after.source.index_calls-before.source.index_calls,"segments":0,"mode":view.run.pace.mode,"source_error":after.source.last_error,"treasury":finance,"normal_Wasm":true,"fiduciary_fixture":true}));
    }
    std::fs::write(PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap()).join("quiet-profile.json"),serde_json::to_vec_pretty(&serde_json::json!({"status":"PASS","seconds":seconds,"includes_start_cost":true,"rows":rows})).unwrap()).unwrap();
}
