//! Opt-in Rules18 profiling with the pinned 13-node disposable application subnet.
use super::*;
use b2z_native::{
    playability,
    territory_v6::Territory,
    world::{self, Ball, Cannon, World},
};
use serde_json::{Value, json};

fn seed(case: &str) -> World {
    let mut world = World::decode(&bytes("B2Z_COST_WORLD")).unwrap();
    assert_eq!((world.version, world.width, world.height), (10, 1000, 1000));
    assert_eq!(world.balls.len(), 2);
    if case == "compact_bitmap" {
        // An explicitly different fixture keeps the same number of Reservoirs
        // while removing the large neutral prefix from their canonical bitmap.
        let count = world
            .reservoirs
            .as_ref()
            .unwrap()
            .bytes()
            .map(|b| (char::from(b).to_digit(16).unwrap()).count_ones() as usize)
            .sum::<usize>();
        world.reservoirs.as_mut().unwrap().clear();
        let sites = (0..world.cell_count())
            .filter(|&cell| {
                world.owner(cell) == Some(0)
                    && !world.cannons.iter().any(|c| c.cell == cell)
                    && !world.deflectors.iter().flatten().any(|d| d.cell == cell)
            })
            .take(count)
            .collect::<Vec<_>>();
        assert_eq!(sites.len(), count);
        for cell in sites {
            b2z_native::reservoirs::place(&mut world, cell).unwrap();
        }
    }
    if case == "idle" {
        let elapsed = world.playability.as_ref().unwrap().elapsed_ns.clone();
        let deadline = Int(&elapsed.0 + playability::DORMANCY_GRACE_NS);
        let anchors = world
            .cannons
            .iter()
            .map(|c| (c.cell, world.owner(c.cell).unwrap()))
            .collect::<Vec<_>>();
        let owners = world.ownership.as_ref().unwrap().clone();
        world.ownership = Some(
            world::ScaledOwnership::from_32x32(vec![0; 1024], world.width, world.height).unwrap(),
        );
        for (cell, owner) in anchors {
            world.set_owner_range(cell, cell + 1, 0, owner).unwrap();
        }
        assert_ne!(world.ownership.as_ref(), Some(&owners));
        world.deflectors.as_mut().unwrap().clear();
        world.balls.clear();
        world.pending.clear();
        for life in &mut world.playability.as_mut().unwrap().lifecycle {
            life.dormant_since_ns = Some(elapsed.clone());
            life.deadline_ns = Some(deadline.clone());
        }
    }
    let (players, balls_per_player) = match case {
        "moderate" => (4, 3),
        "large" => (14, 6),
        _ => (0, 0),
    };
    let sites = (0..50)
        .map(|slot| (45 + slot % 10 * 55, 70 + slot / 10 * 60))
        .filter(|&(x, y)| {
            (y..y + 7).all(|r| (x..x + 12).all(|c| world.owner(r * 1000 + c) == Some(0)))
        })
        .take(players)
        .collect::<Vec<_>>();
    assert_eq!(sites.len(), players);
    for (i, (x, y)) in sites.into_iter().enumerate() {
        let s = world.playability.as_mut().unwrap();
        let player = s.next_player_id;
        let territory = s.next_territory_id;
        let cannon = world.next_cannon_id;
        let owner = AccountIdentifier::new(
            &Principal::self_authenticating([30 + i as u8; 32]),
            &DEFAULT_SUBACCOUNT,
        )
        .to_hex();
        s.next_player_id += 1;
        s.next_territory_id += 1;
        s.players.push(playability::Player {
            id: player,
            account: owner.clone(),
        });
        s.territories.push(Territory {
            id: territory,
            player,
        });
        s.lifecycle.push(playability::Lifecycle {
            cannon,
            player,
            generation: 1,
            dormant_since_ns: None,
            deadline_ns: None,
        });
        world.next_cannon_id += 1;
        world.cannons.push(Cannon {
            id: cannon,
            account: owner,
            cell: y * 1000 + x,
            heading: Some(0),
        });
        for row in y..y + 7 {
            world
                .set_owner_range(row * 1000 + x, row * 1000 + x + 12, 0, territory)
                .unwrap();
        }
        for j in 0..balls_per_player {
            let xx = x + 2 + j;
            let yy = y + 2 + j % 2;
            let time = world.time.0.to_integer();
            let q = i64::from(world::Q);
            let speed = 512i64;
            world.balls.push(Ball {
                id: world.next_ball_id,
                owner: player,
                cell: yy * 1000 + xx,
                x0: Int((xx as i64 * q + q / 2).into()),
                y0: Int((yy as i64 * q + q / 2) - time * speed),
                vx: 0,
                vy: speed as i32,
                den: Some(Int(1.into())),
                deflector_rearm: None,
            });
            world.next_ball_id += 1;
        }
        b2z_native::reservoirs::place(&mut world, (y + 6) * 1000 + x + 11).unwrap();
    }
    world.validate().unwrap();
    world
}

fn profile(pic: &PocketIc, id: Principal, instrumented: bool) -> Option<Value> {
    instrumented.then(|| {
        let value: String = get_query(pic, id, "test_cost_profile", encode_args(()).unwrap());
        serde_json::from_str(&value).unwrap()
    })
}

fn runtime(pic: &PocketIc, id: Principal) -> Value {
    playability_profile::metric_values(pic, id)
}

fn advance(pic: &PocketIc, millis: u64) {
    pic.advance_time(Duration::from_millis(millis));
    for _ in 0..4 {
        pic.tick();
    }
}

fn pause(pic: &PocketIc, id: Principal) {
    get_result::<Status>(pic, id, "pause_autonomous", encode_args(()).unwrap());
}

#[derive(CandidType, Deserialize)]
struct ObservationBundle {
    observation: Observation,
    artifacts: Vec<Vec<u8>>,
}

fn capture(pic: &PocketIc, id: Principal, out: &Path, ordinal: u64) -> (Observation, Publication) {
    let bundle: ObservationBundle =
        get_query(pic, id, "observation_bundle", encode_args(()).unwrap());
    let obs = bundle.observation;
    let p: Publication = decode(&obs.publication).unwrap();
    let virtual_ns = pic.get_time().as_nanos_since_unix_epoch();
    let wall = std::time::UNIX_EPOCH.elapsed().unwrap();
    // Agent::verify compares with real wall time. Translate the disposable
    // clock offset here and check the signed timestamp against consensus below.
    let expiry = wall.saturating_sub(Duration::from_nanos(virtual_ns)) + Duration::from_secs(120);
    let agent = ic_agent::Agent::builder()
        .with_url("http://127.0.0.1:1")
        .with_ingress_expiry(expiry)
        .build()
        .unwrap();
    agent.set_root_key(pic.root_key().unwrap());
    let cert: ic_agent::Certificate =
        serde_cbor::from_slice(obs.certificate.as_ref().unwrap()).unwrap();
    agent.verify(&cert, id).unwrap();
    let certified_time =
        leb128::read::unsigned(&mut ic_agent::lookup_value(&cert, [b"time".as_slice()]).unwrap())
            .unwrap();
    assert!(virtual_ns.abs_diff(certified_time) < 1_000_000_000);
    let certified = ic_agent::lookup_value(
        &cert,
        [
            b"canister".as_slice(),
            id.as_slice(),
            b"certified_data".as_slice(),
        ],
    )
    .unwrap();
    assert_eq!(certified, unhex(&dtr_wire::hash(&obs.publication)).unwrap());
    std::fs::write(
        out.join(format!("{ordinal}-publication.bin")),
        &obs.publication,
    )
    .unwrap();
    assert_eq!(p.artifacts.len(), bundle.artifacts.len());
    for (descriptor, body) in p.artifacts.iter().zip(&bundle.artifacts) {
        assert_eq!(body.len(), descriptor.length);
        assert_eq!(dtr_wire::hash(body), descriptor.sha256);
        assert_eq!(
            body.chunks(p.chunk_bytes)
                .map(dtr_wire::hash)
                .collect::<Vec<_>>(),
            descriptor.chunks
        );
        std::fs::write(out.join(format!("{ordinal}-{}.bin", descriptor.kind)), body).unwrap();
    }
    (obs, p)
}

fn replay(out: &Path, checkpoints: u64, inputs: &[b2z_native::Input]) {
    for number in 1..=checkpoints {
        let artifact = |n, kind| std::fs::read(out.join(format!("{n}-{kind}.bin"))).unwrap();
        let publication: Publication = decode(&artifact(number, "publication")).unwrap();
        let seal = publication.head.seal.as_ref().unwrap();
        assert_eq!(seal.input_count as usize, inputs.len());
        let records = inputs
            .iter()
            .map(|input| dtr_host::Input {
                position: input.position.clone(),
                payload_hex: input.payload_hex.clone(),
            })
            .collect::<Vec<_>>();
        let source = |n: &Int| n.0.to_string().parse().unwrap();
        assert_eq!(
            dtr_host::input_root(
                &records,
                source(&seal.source_from),
                source(&seal.source_to_exclusive)
            )
            .unwrap(),
            seal.input_root
        );
        assert_eq!(&seal.logical_end.0 - &seal.logical_start.0, 1u32.into());
        let mut cursor = b2z_native::Cursor::begin(
            &artifact(number - 1, "state"),
            inputs.to_vec(),
            &serde_json::to_value(seal).unwrap(),
        )
        .unwrap();
        while !cursor.step(101).unwrap().1 {}
        let event_bytes = artifact(number, "events");
        let audit: Value = decode(&event_bytes).unwrap();
        let observed = audit["events"]
            .as_array()
            .unwrap()
            .iter()
            .find_map(|event| event["observed_ns"]["$integer"].as_str())
            .unwrap()
            .parse()
            .unwrap();
        cursor.finalize_elapsed(observed).unwrap();
        let result = cursor.result().unwrap();
        assert_eq!(result.events, event_bytes);
        assert_eq!(result.scores, artifact(number, "scores"));
        assert_eq!(result.state, artifact(number, "state"));
    }
}

fn commit_fixture_interval(pic: &PocketIc, id: Principal, logical_end: Int) {
    #[derive(CandidType, Deserialize)]
    struct Work {
        ready_manifest: Option<String>,
    }
    let apply = |action: Action| {
        let revision = status(pic, id).revision;
        get_result::<Status>(
            pic,
            id,
            "test_apply",
            encode_args((revision, dtr_wire::encode(&action).unwrap())).unwrap(),
        );
    };
    apply(Action::Seal { logical_end });
    for _ in 0..32 {
        let work: Work = get_query(pic, id, "controller_work", encode_args(()).unwrap());
        if let Some(manifest_hash) = work.ready_manifest {
            apply(Action::Publish { manifest_hash });
            return;
        }
        apply(Action::Step { budget: 512 });
    }
    panic!("fixture predecessor did not finish");
}

struct CompactBrowser {
    live: PocketIc,
    child: OwnedBrowser,
    out: PathBuf,
    old_head: u64,
}

impl CompactBrowser {
    fn start(
        pic: &PocketIc,
        id: Principal,
        ledger: Principal,
        out: &Path,
        old_head: u64,
        python: std::ffi::OsString,
    ) -> Self {
        let wall = pocket_ic::Time::from(std::time::SystemTime::now());
        if wall > pic.get_time() {
            pic.set_time(wall);
        }
        let out = out.join("browser");
        std::fs::create_dir_all(&out).unwrap();
        let config = json!({
            "network":"pocketic-local","canister_id":id.to_text(),"ledger":ledger.to_text(),
            "index":status(pic,id).source.index.to_text(),"recipient":source::receiving_account(id,0).to_hex(),
            "root_key_hex":hex(&pic.root_key().unwrap()),
        });
        std::fs::write(out.join("metadata.json"), b"{}").unwrap();
        std::fs::write(out.join("root-key.der"), pic.root_key().unwrap()).unwrap();
        let config_path = out.join("configuration.json");
        std::fs::write(&config_path, serde_json::to_vec(&config).unwrap()).unwrap();
        let mut live =
            PocketIc::new_from_existing_instance(pic.get_server_url(), pic.instance_id(), None);
        let gateway = live.make_live(None);
        let log = std::fs::File::create(out.join("browser.log")).unwrap();
        let child = OwnedBrowser(
            std::process::Command::new(python)
                .current_dir(Path::new(env!("CARGO_MANIFEST_DIR")).join("../.."))
                .args([
                    "-B",
                    "tools/verify_s14_deployment.py",
                    "--compact-reservoir-scene-only",
                    "--configuration",
                ])
                .arg(config_path)
                .arg("--gateway")
                .arg(gateway.as_str())
                .arg("--output")
                .arg(&out)
                .stdout(log.try_clone().unwrap())
                .stderr(log)
                .spawn()
                .unwrap(),
        );
        let mut browser = Self {
            live,
            child,
            out,
            old_head,
        };
        browser.wait_marker("compact-browser-ready", 100);
        let held_head = std::fs::read_to_string(browser.out.join("compact-browser-ready"))
            .unwrap()
            .parse::<u64>()
            .unwrap();
        assert!(held_head >= old_head);
        browser.old_head = held_head;
        browser
    }

    fn wait_marker(&mut self, marker: &str, seconds: u64) {
        let until = std::time::Instant::now() + Duration::from_secs(seconds);
        loop {
            assert!(
                self.child.0.try_wait().unwrap().is_none(),
                "browser exited early: {}",
                self.out.display()
            );
            if self.out.join(marker).is_file() {
                return;
            }
            assert!(
                std::time::Instant::now() < until,
                "browser did not reach {marker}: {}",
                self.out.display()
            );
            std::thread::sleep(Duration::from_millis(100));
        }
    }

    fn finish(mut self, pic: &PocketIc, id: Principal) {
        self.wait_marker("compact-browser-transition-seen", 75);
        let operator = Principal::self_authenticating([38; 32]);
        super::dev_speed_installed::bind(pic, id, Some(operator));
        playability_installed::configuration(pic, id, 512);
        super::dev_speed_installed::switch(pic, id, operator, true, Some(75)).unwrap();
        let needed = self.old_head + 1;
        let until = std::time::Instant::now() + Duration::from_secs(70);
        let head = loop {
            let (_, p) = observe(pic, id);
            let head: u64 = p.head.segment_id.unwrap().0.to_string().parse().unwrap();
            if head >= self.old_head + 17 {
                let raw = pic
                    .query_call(
                        id,
                        controller(),
                        "retained_publication",
                        candid::encode_one(needed).unwrap(),
                    )
                    .unwrap();
                let retained = decode_one::<Result<Vec<u8>, String>>(&raw).unwrap();
                if retained.as_ref().err().map(String::as_str)
                    == Some("publication unavailable: snapshot resync required")
                {
                    break head;
                }
            }
            assert!(
                std::time::Instant::now() < until,
                "retention gap was not created"
            );
            std::thread::sleep(Duration::from_millis(250));
        };
        super::dev_speed_installed::switch(pic, id, operator, false, None).unwrap();
        pause(pic, id);
        std::fs::write(
            self.out.join("compact-browser-gap"),
            json!({"first_needed": needed, "latest": head, "evicted": true}).to_string(),
        )
        .unwrap();
        let until = std::time::Instant::now() + Duration::from_secs(70);
        loop {
            if let Some(exit) = self.child.0.try_wait().unwrap() {
                assert!(
                    exit.success(),
                    "browser qualification: {}",
                    self.out.display()
                );
                break;
            }
            assert!(
                std::time::Instant::now() < until,
                "browser reconnect exceeded deadline"
            );
            std::thread::sleep(Duration::from_millis(100));
        }
        let report: Value =
            serde_json::from_slice(&std::fs::read(self.out.join("results.json")).unwrap()).unwrap();
        assert_eq!(report["status"], "PASS");
        self.live.stop_live();
    }
}

fn upgrade_during_recovery(
    pic: &PocketIc,
    id: Principal,
    module: &[u8],
) -> Result<(), pocket_ic::RejectResponse> {
    let mut retries = 4;
    loop {
        let result = pic.upgrade_canister(
            id,
            module.to_vec(),
            encode_args(()).unwrap(),
            Some(controller()),
        );
        if retries == 0
            || !result.as_ref().is_err_and(|error| {
                error.error_code == pocket_ic::ErrorCode::CanisterInstallCodeRateLimited
            })
        {
            return result;
        }
        // The disposable replica enforces the install limit. Let it recover
        // before the next install while the authoritative game stays paused.
        for _ in 0..20 {
            tick(pic);
        }
        retries -= 1;
    }
}

fn compact_cutover(
    pic: &PocketIc,
    id: Principal,
    ledger: Principal,
    env: &std::path::Path,
    out: &Path,
) -> Value {
    let world = arena_world(pic, id);
    commit_fixture_interval(pic, id, Int(world.time.0.to_integer() + 1));
    let mut audit = out.to_path_buf();
    audit.push("cutover");
    let before_module = audit.join("before-module");
    std::fs::create_dir_all(&before_module).unwrap();
    let (old_obs, old_pub) = capture(pic, id, &before_module, 0);
    let old_segment: u64 = old_pub
        .head
        .segment_id
        .as_ref()
        .unwrap()
        .0
        .to_string()
        .parse()
        .unwrap();
    let before_upgrade = pic.cycle_balance(id);
    let module = std::fs::read(env).unwrap();
    let predecessor =
        std::env::var_os("B2Z_COST_ROLLBACK_WASM").map(|path| std::fs::read(path).unwrap());
    pic.upgrade_canister(
        id,
        module.clone(),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    let upgrade_cycles = before_upgrade - pic.cycle_balance(id);
    assert_eq!(observe(pic, id).0.publication, old_obs.publication);
    if let Some(prior) = &predecessor {
        upgrade_during_recovery(pic, id, prior).unwrap();
        assert_eq!(observe(pic, id).0.publication, old_obs.publication);
        upgrade_during_recovery(pic, id, &module).unwrap();
        assert_eq!(observe(pic, id).0.publication, old_obs.publication);
    }
    playability_installed::configuration(pic, id, 512);
    pause(pic, id);
    for _ in 0..10 {
        advance(pic, 250);
    }
    if predecessor.is_some() {
        let before = pic.cycle_balance(id);
        get_result::<Status>(
            pic,
            id,
            "test_liquid_budget",
            candid::encode_one(900_000_000_000u64).unwrap(),
        );
        let result = pic
            .update_call(
                id,
                controller(),
                "prepare_compact_reservoir_transition",
                encode_args(()).unwrap(),
            )
            .unwrap();
        assert_eq!(
            decode_one::<Result<Vec<u8>, String>>(&result)
                .unwrap()
                .unwrap_err(),
            "resource protection forbids Rules19 cutover"
        );
        assert_eq!(observe(pic, id).0.publication, old_obs.publication);
        pic.add_cycles(id, before - pic.cycle_balance(id));

        let index = status(pic, id).source.index;
        pic.stop_canister(index, Some(controller())).unwrap();
        playability_installed::prepare(pic, id, "prepare_compact_reservoir_transition");
        for _ in 0..5 {
            tick(pic);
        }
        let result = pic
            .update_call(
                id,
                controller(),
                "commit_compact_reservoir_transition",
                candid::encode_one(dtr_wire::hash(&old_obs.publication)).unwrap(),
            )
            .unwrap();
        assert!(
            decode_one::<Result<Vec<u8>, String>>(&result)
                .unwrap()
                .is_err()
        );
        assert_eq!(observe(pic, id).0.publication, old_obs.publication);
        pic.start_canister(index, Some(controller())).unwrap();
    }
    let browser = std::env::var_os("B2Z_COST_BROWSER_PYTHON")
        .map(|python| CompactBrowser::start(pic, id, ledger, out, old_segment, python));
    let before_cutover = pic.cycle_balance(id);
    // Live browser startup aligns the fixture with wall time. A UTC day
    // rollover can publish additional Rules18 maintenance before the fence.
    let mut ready = None;
    super::war_cry_installed::transition_with_predecessor(pic, id, "compact_reservoir", || {
        ready = Some(capture(pic, id, &audit, 0));
    });
    let (ready_obs, ready_pub) = ready.unwrap();
    let cutover_cycles = before_cutover - pic.cycle_balance(id);
    let (new_obs, new_pub) = capture(pic, id, &audit, 1);
    let legacy = World::decode(&std::fs::read(audit.join("0-state.bin")).unwrap()).unwrap();
    let actual = arena_world(pic, id);
    assert_eq!(
        actual,
        b2z_native::reservoirs::migrate_compact(legacy.clone()).unwrap()
    );
    let retained: Vec<u8> = get_query(
        pic,
        id,
        "retained_publication",
        candid::encode_one(old_segment).unwrap(),
    );
    assert_eq!(retained, old_obs.publication);
    let retained_artifacts: Vec<Vec<u8>> = get_query(
        pic,
        id,
        "artifact_bundle",
        encode_args((old_segment, dtr_wire::hash(&old_obs.publication))).unwrap(),
    );
    for (artifact, name) in retained_artifacts.iter().zip(["state", "events", "scores"]) {
        assert_eq!(
            artifact,
            &std::fs::read(before_module.join(format!("0-{name}.bin"))).unwrap()
        );
    }
    let ready_segment = ready_pub.head.segment_id.as_ref().unwrap();
    let ready_hash = dtr_wire::hash(&ready_obs.publication);
    let retained_ready: Vec<Vec<u8>> = get_query(
        pic,
        id,
        "artifact_bundle",
        encode_args((
            ready_segment.0.to_string().parse::<u64>().unwrap(),
            &ready_hash,
        ))
        .unwrap(),
    );
    for (artifact, name) in retained_ready.iter().zip(["state", "events", "scores"]) {
        assert_eq!(
            artifact,
            &std::fs::read(audit.join(format!("0-{name}.bin"))).unwrap()
        );
    }
    assert_eq!(new_pub.head.logical_end, ready_pub.head.logical_end);
    assert_eq!(
        new_pub.head.source_to_exclusive,
        old_pub.head.source_to_exclusive
    );
    if let Some(prior) = &predecessor {
        let expected = pic
            .canister_status(id, Some(controller()))
            .unwrap()
            .module_hash;
        let rejected = upgrade_during_recovery(pic, id, prior).unwrap_err();
        assert!(
            rejected
                .reject_message
                .contains("compact_reservoir_transition"),
            "{rejected:?}"
        );
        assert_eq!(
            pic.canister_status(id, Some(controller()))
                .unwrap()
                .module_hash,
            expected
        );
        assert_eq!(observe(pic, id).0.publication, new_obs.publication);
    }
    let report = json!({
        "old_state_hash":ready_pub.head.state_hash,"new_state_hash":new_pub.head.state_hash,
        "old_publication_hash":ready_hash,"new_publication_hash":dtr_wire::hash(&new_obs.publication),
        "old_state_bytes":legacy.encode().unwrap().len(),"new_state_bytes":actual.encode().unwrap().len(),
        "old_ranges":legacy.reservoirs.as_ref().unwrap().len(),"new_ranges":actual.reservoir_ranges,
        "upgrade_cycles":upgrade_cycles.to_string(),"cutover_cycles":cutover_cycles.to_string(),
        "source_cursor":old_pub.head.source_to_exclusive,"rollback_rehearsed":predecessor.is_some(),
    });
    std::fs::write(
        audit.join("ranges.json"),
        serde_json::to_vec_pretty(&report).unwrap(),
    )
    .unwrap();
    if let Some(browser) = browser {
        browser.finish(pic, id);
    }
    report
}

#[test]
#[ignore = "explicit disposable Rules18 cost matrix; requires exact seed and profiling Wasm"]
fn rules18_cost_matrix() {
    assert_ne!(std::env::var("B2Z_PROFILE_FIDUCIARY").as_deref(), Ok("1"));
    let case = std::env::var("B2Z_COST_CASE").unwrap();
    let initial = seed(&case);
    let out = PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap());
    std::fs::create_dir_all(&out).unwrap();
    let setup = bytes("B2Z_COST_PROFILE_WASM");
    let measured =
        std::env::var_os("B2Z_COST_MEASURE_WASM").map(|path| std::fs::read(path).unwrap());
    let compact = std::env::var_os("B2Z_COST_COMPACT_WASM").map(PathBuf::from);
    let configured = compact.as_ref().map(|path| std::fs::read(path).unwrap());
    let instrumented = measured.is_none() || std::env::var_os("B2Z_COST_PROFILE_ACTIVE").is_some();
    let module_hash = dtr_wire::hash(
        measured
            .as_deref()
            .or(configured.as_deref())
            .unwrap_or(&setup),
    );
    let (pic, id, ledger, payer) = arena_setup_world(setup, initial.encode().unwrap());
    assert_eq!(arena_world(&pic, id).version, 10);
    let protected = case.starts_with("protected");
    let protected_retained = case == "protected_retained";
    let background = protected || case == "idle";
    let target_liquid = if protected && !protected_retained {
        900_000_000_000
    } else {
        7_000_000_000_000u64
    };
    if compact.is_some() {
        get_result::<Status>(
            &pic,
            id,
            "test_liquid_budget",
            candid::encode_one(7_000_000_000_000u64).unwrap(),
        );
    }
    let cutover = compact
        .as_deref()
        .map(|path| compact_cutover(&pic, id, ledger, path, &out));
    let genesis = arena_world(&pic, id);
    if std::env::var_os("B2Z_COST_BROWSER_PYTHON").is_none() {
        get_result::<Status>(
            &pic,
            id,
            "test_liquid_budget",
            candid::encode_one(target_liquid).unwrap(),
        );
    }
    if let Some(measured) = measured {
        pic.upgrade_canister(id, measured, encode_args(()).unwrap(), Some(controller()))
            .unwrap();
        assert_eq!(arena_world(&pic, id), genesis);
    }
    if case == "protected_no_index" {
        get_result::<()>(
            &pic,
            id,
            "test_source_interval",
            candid::encode_one(0u64).unwrap(),
        );
    }
    if case == "protected_no_treasury" {
        playability_installed::funding_paused(&pic, id, true);
    } else {
        playability_installed::funding_paused(&pic, id, false);
    }
    if case != "payment" {
        playability_installed::configuration(&pic, id, 512);
    }
    if case == "protected_paused" {
        pause(&pic, id);
    }
    let tier = if protected {
        "ReserveProtection"
    } else {
        "Survival"
    };
    assert_eq!(
        status(&pic, id).run.pace.unwrap().mode,
        if protected_retained { "Survival" } else { tier }
    );
    // Drain init/start scans. Active fixtures get two completed publications
    // before measuring so slot allocation and genesis startup stay distinguishable.
    let warm_target = status(&pic, id).run.completed_segments
        + if case == "retained" || protected_retained {
            17
        } else if background || case == "payment" {
            0
        } else {
            2
        };
    for _ in 0..(80 + warm_target * 48) {
        advance(&pic, 250);
        let s = status(&pic, id);
        assert!(s.run.last_error.is_none(), "{:?}", s.run.last_error);
        if s.run.completed_segments >= warm_target
            && !s.source.scan_in_flight
            && !s.source.reconciliation_requested
        {
            break;
        }
    }
    assert_eq!(status(&pic, id).run.completed_segments, warm_target);
    if protected_retained {
        get_result::<Status>(
            &pic,
            id,
            "test_liquid_budget",
            candid::encode_one(900_000_000_000u64).unwrap(),
        );
        assert_eq!(status(&pic, id).run.pace.unwrap().mode, tier);
    }
    capture(&pic, id, &out, 0);
    let before = status(&pic, id);
    let started = pic.get_time().as_nanos_since_unix_epoch();
    let balance = pic.cycle_balance(id);
    let before_profile = profile(&pic, id, instrumented);
    let before_driver = runtime(&pic, id);
    let mut admission = None;
    let mut payment_position = None;
    if case == "payment" {
        let position = transfer_text(&pic, ledger, payer, id, 100_000_000, b"NEW 0 1");
        payment_position = Some(position);
        for _ in 0..90 {
            advance(&pic, 1_000);
            if status(&pic, id).source.admitted_to_exclusive > position {
                break;
            }
        }
        let admitted = status(&pic, id);
        assert!(
            admitted.source.admitted_to_exclusive > position,
            "{:?}",
            admitted.source.last_error
        );
        assert_eq!(
            admitted.run.completed_segments,
            before.run.completed_segments
        );
        admission = Some(json!({
            "position": position, "cursor": admitted.source.admitted_to_exclusive,
            "cycles_through_admission": (balance - pic.cycle_balance(id)).to_string(),
            "profile": profile(&pic, id, instrumented),
        }));
        playability_installed::configuration(&pic, id, 512);
    }

    let checkpoints = if background {
        0
    } else if case == "payment" {
        1
    } else {
        4
    };
    let mut consecutive = Vec::new();
    if background {
        for _ in 0..30 {
            advance(&pic, 30_000);
        }
    } else {
        let mut previous = before.run.completed_segments;
        for _ in 0..420 {
            advance(&pic, 250);
            let s = status(&pic, id);
            assert!(s.run.last_error.is_none(), "{:?}", s.run.last_error);
            if s.run.completed_segments > previous {
                assert_eq!(s.run.completed_segments, previous + 1);
                let (obs, p) = capture(
                    &pic,
                    id,
                    &out,
                    s.run.completed_segments - before.run.completed_segments,
                );
                consecutive.push(json!({
                    "publication": dtr_wire::hash(&obs.publication), "artifacts": p.artifacts,
                    "work": s.run.last_segment_work.unwrap(), "driver_callbacks": s.run.callback_count - before.run.callback_count,
                }));
                previous = s.run.completed_segments;
            }
            if previous == before.run.completed_segments + checkpoints {
                break;
            }
        }
    }
    let elapsed_ns = pic.get_time().as_nanos_since_unix_epoch() - started;
    let after = status(&pic, id);
    let pace = after.run.pace.as_ref().unwrap();
    assert_eq!(pace.mode, tier);
    assert_eq!(pace.admission_open, !protected);
    let remaining = pic.cycle_balance(id);
    let management = pic.canister_status(id, Some(controller())).unwrap();
    let after_profile = profile(&pic, id, instrumented);
    let after_driver = runtime(&pic, id);
    assert_eq!(
        after.run.completed_segments - before.run.completed_segments,
        checkpoints
    );
    assert!(
        after.source.last_error.is_none(),
        "{:?}",
        after.source.last_error
    );
    let mut inputs = Vec::new();
    if let Some(position) = payment_position {
        let events: Value =
            serde_json::from_slice(&std::fs::read(out.join("1-events.bin")).unwrap()).unwrap();
        assert!(
            events["receipts"]
                .as_array()
                .unwrap()
                .iter()
                .any(|receipt| receipt["reason"] == "ACCEPTED"),
            "{events}"
        );
        let expected = BTreeMap::from([(position, ("ACCEPTED".into(), 0, None))]);
        let rows = super::delegation_installed::official_inputs(&pic, id, &expected);
        inputs = rows
            .into_iter()
            .map(|(payment, _)| b2z_native::Input {
                position: Int(payment.position.into()),
                payload_hex: hex(&payment.encode().unwrap()),
            })
            .collect();
    }
    replay(&out, checkpoints, &inputs);
    if compact.is_some() {
        std::fs::write(
            out.join("replay-inputs.bin"),
            dtr_wire::encode(&inputs).unwrap(),
        )
        .unwrap();
        let verify = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../tools/verify_compact_cost_replay.mjs");
        assert!(
            std::process::Command::new("node")
                .arg(verify)
                .arg(&out)
                .arg(checkpoints.to_string())
                .status()
                .unwrap()
                .success()
        );
    }
    let world = arena_world(&pic, id);
    let result = json!({
        "case":case,"module_sha256":module_hash,"instrumented":instrumented,
        "seed_world_sha256":dtr_wire::hash(&genesis.encode().unwrap()),"state_bytes":genesis.encode().unwrap().len(),
        "reservoir_bitmap_bytes":genesis.reservoirs.as_ref().map_or(0, String::len),
        "reservoir_range_bytes":genesis.reservoir_ranges.as_ref().map(|ranges| dtr_wire::encode(ranges).unwrap().len()),
        "world_version":genesis.version,"cutover":cutover,
        "cannons_before":genesis.cannons.len(),"balls_before":genesis.balls.len(),
        "players_before":genesis.playability.as_ref().unwrap().players.len(),
        "balls_after":world.balls.len(),"pace":pace,"virtual_ns":elapsed_ns.to_string(),
        "work_budget":after.run.work_budget.unwrap(),"checkpoints":checkpoints,
        "replayed_checkpoints":checkpoints,
        "callbacks":after.run.callback_count-before.run.callback_count,
        "index_calls":after.source.index_calls-before.source.index_calls,
        "net_cycles":(balance-remaining).to_string(),
        "backend_memory_bytes":management.memory_size.0.to_string(),
        "reserved_cycles":management.reserved_cycles.0.to_string(),
        "management_idle_cycles_per_day":management.idle_cycles_burned_per_day.0.to_string(),
        "before_profile":before_profile,"after_profile":after_profile,
        "before_driver":before_driver,"after_driver":after_driver,
        "admission":admission,"consecutive":consecutive,
    });
    std::fs::write(
        out.join("rules18-cost.json"),
        serde_json::to_vec_pretty(&result).unwrap(),
    )
    .unwrap();
    println!(
        "RULES18 COST {case}: {checkpoints} checkpoints, {} net cycles",
        balance - remaining
    );
}
