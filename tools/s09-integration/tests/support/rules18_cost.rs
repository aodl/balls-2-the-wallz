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

fn seed_symbolic_population(target: u32) -> World {
    let mut world = seed("two_ball");
    let additions = target as usize - b2z_native::economy17::population(&world) as usize;
    let elapsed = world.playability.as_ref().unwrap().elapsed_ns.clone();
    let deadline = Int(&elapsed.0 + playability::DORMANCY_GRACE_NS);
    let mut accounts = world
        .cannons
        .iter()
        .map(|c| c.account.clone())
        .collect::<std::collections::BTreeSet<_>>();
    let sites = (50usize..950)
        .step_by(8)
        .flat_map(|y| (50usize..950).step_by(8).map(move |x| (x, y)))
        .filter(|&(x, y)| {
            (y - 1..=y + 1)
                .all(|row| (x - 1..=x + 1).all(|col| world.owner(row * 1000 + col) == Some(0)))
                && world.cannons.iter().all(|c| {
                    let cx = c.cell % 1000;
                    let cy = c.cell / 1000;
                    cx.abs_diff(x).max(cy.abs_diff(y)) >= 4
                })
        })
        .take(additions)
        .collect::<Vec<_>>();
    assert_eq!(
        sites.len(),
        additions,
        "isolated synthetic population sites"
    );
    // Dormant, one-tile retained Cannons count as participating accounts. The
    // grid spacing keeps this synthetic tariff fixture away from real anchors.
    for (n, (x, y)) in sites.into_iter().enumerate() {
        let mut principal_seed = [0u8; 32];
        principal_seed[..4].copy_from_slice(&(n as u32).to_le_bytes());
        principal_seed[31] = 0x20;
        let account = AccountIdentifier::new(
            &Principal::self_authenticating(principal_seed),
            &DEFAULT_SUBACCOUNT,
        )
        .to_hex();
        assert!(accounts.insert(account.clone()), "unique synthetic account");
        let state = world.playability.as_mut().unwrap();
        let player = state.next_player_id;
        let territory = state.next_territory_id;
        let cannon = world.next_cannon_id;
        state.next_player_id += 1;
        state.next_territory_id += 1;
        state.players.push(playability::Player {
            id: player,
            account: account.clone(),
        });
        state.territories.push(Territory {
            id: territory,
            player,
        });
        state.lifecycle.push(playability::Lifecycle {
            cannon,
            player,
            generation: 1,
            dormant_since_ns: Some(elapsed.clone()),
            deadline_ns: Some(deadline.clone()),
        });
        world.next_cannon_id += 1;
        world.cannons.push(Cannon {
            id: cannon,
            account,
            cell: y * 1000 + x,
            heading: Some(0),
        });
        world
            .set_owner_range(y * 1000 + x, y * 1000 + x + 1, 0, territory)
            .unwrap();
    }
    assert_eq!(b2z_native::economy17::population(&world), target);
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

fn capture_retained(
    pic: &PocketIc,
    id: Principal,
    out: &Path,
    segment: u64,
    ordinal: u64,
) -> Publication {
    let raw: Vec<u8> = get_query(
        pic,
        id,
        "retained_publication",
        candid::encode_one(segment).unwrap(),
    );
    let publication: Publication = decode(&raw).unwrap();
    assert_eq!(
        publication.head.segment_id.as_ref().unwrap(),
        &Int(segment.into())
    );
    std::fs::write(out.join(format!("{ordinal}-publication.bin")), &raw).unwrap();
    let artifacts: Vec<Vec<u8>> = get_query(
        pic,
        id,
        "artifact_bundle",
        encode_args((segment, dtr_wire::hash(&raw))).unwrap(),
    );
    assert_eq!(artifacts.len(), publication.artifacts.len());
    for (descriptor, body) in publication.artifacts.iter().zip(artifacts) {
        assert_eq!(body.len(), descriptor.length);
        assert_eq!(dtr_wire::hash(&body), descriptor.sha256);
        std::fs::write(out.join(format!("{ordinal}-{}.bin", descriptor.kind)), body).unwrap();
    }
    publication
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
    let after_upgrade = pic.cycle_balance(id);
    // A pending callback refund can put the measured end above the start.
    // This bracket records net balance movement, not isolated install cost.
    let upgrade_cycles = Int(before_upgrade.into()).0 - Int(after_upgrade.into()).0;
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
    let after_cutover = pic.cycle_balance(id);
    let cutover_cycles = Int(before_cutover.into()).0 - Int(after_cutover.into()).0;
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
        "upgrade_balance_before":before_upgrade.to_string(),"upgrade_balance_after":after_upgrade.to_string(),
        "cutover_balance_before":before_cutover.to_string(),"cutover_balance_after":after_cutover.to_string(),
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

fn measure_ordinary(
    pic: &PocketIc,
    id: Principal,
    out: &Path,
    expected_period_ms: u64,
) -> Vec<u128> {
    std::fs::create_dir_all(out).unwrap();
    capture(pic, id, out, 0);
    let mut costs = Vec::new();
    for ordinal in 1..=4 {
        let before = status(pic, id);
        let started = pic.get_time().as_nanos_since_unix_epoch();
        if ordinal > 1 || expected_period_ms == 100_000 {
            advance(pic, expected_period_ms - 5_000);
            assert_eq!(
                status(pic, id).run.completed_segments,
                before.run.completed_segments
            );
        }
        let mut observed = false;
        for _ in 0..(expected_period_ms / 1000 + 8) {
            let balance = pic.cycle_balance(id);
            advance(pic, 1000);
            let next = status(pic, id);
            assert!(next.run.last_error.is_none());
            if next.run.completed_segments == before.run.completed_segments {
                continue;
            }
            assert_eq!(
                next.run.completed_segments,
                before.run.completed_segments + 1
            );
            assert_eq!(next.run.callback_count, before.run.callback_count + 1);
            let elapsed = pic.get_time().as_nanos_since_unix_epoch() - started;
            if ordinal > 1 {
                assert!(elapsed >= expected_period_ms * 1_000_000);
            }
            costs.push(balance - pic.cycle_balance(id));
            capture(pic, id, out, ordinal);
            observed = true;
            break;
        }
        assert!(observed, "ordinary checkpoint did not publish on schedule");
    }
    replay(out, 4, &[]);
    costs
}

#[test]
#[ignore = "explicit exact Rules19 to pre-launch capped Wasm rehearsal"]
fn prelaunch_trickle_rules19() {
    use super::dev_speed_installed as speed;

    let out = PathBuf::from(std::env::var_os("S14_DEPLOYMENT_OUTPUT").unwrap());
    let production = PathBuf::from(std::env::var_os("B2Z_COST_COMPACT_WASM").unwrap());
    let prior = std::fs::read(&production).unwrap();
    assert_eq!(
        dtr_wire::hash(&prior),
        "b258ec234b9abd7db9e7b170c14e432b4d1ef2d9b2545632bddb58668a6095de"
    );
    let candidate = bytes("B2Z_COST_MEASURE_WASM");
    let (pic, id, ledger, payer) = arena_setup_world(
        bytes("B2Z_COST_PROFILE_WASM"),
        seed("two_ball").encode().unwrap(),
    );
    get_result::<Status>(
        &pic,
        id,
        "test_liquid_budget",
        candid::encode_one(3_750_000_000_000u64).unwrap(),
    );
    compact_cutover(&pic, id, ledger, &production, &out);
    playability_installed::configuration(&pic, id, 512);

    let prior_paid = arena_world(&pic, id).received_e8s;
    let payment = transfer_text(&pic, ledger, payer, id, 1_000_000, b"RESERVOIR 998000");
    for _ in 0..180 {
        advance(&pic, 1000);
        if status(&pic, id).source.admitted_to_exclusive > payment && transition_drained(&pic, id) {
            break;
        }
    }
    assert!(status(&pic, id).source.admitted_to_exclusive > payment);
    assert_eq!(
        arena_world(&pic, id).received_e8s.0,
        &prior_paid.0 + 1_000_000u64
    );
    assert_eq!(arena_world(&pic, id).balls.len(), 2);
    assert_eq!(status(&pic, id).run.pace.unwrap().mode, "Lifeline");
    let baseline = measure_ordinary(&pic, id, &out.join("uncapped"), 20_000);
    pause(&pic, id);

    let head = observe(&pic, id).0.publication;
    let financial = funding_tests::preserved_finance(&pic, id);
    let history = retained_bytes(&pic, id);
    let cursor = status(&pic, id).source.admitted_to_exclusive;
    let before = pic.cycle_balance(id);
    upgrade_during_recovery(&pic, id, &candidate).unwrap();
    let upgrade_cycles = before - pic.cycle_balance(id);
    assert_eq!(observe(&pic, id).0.publication, head);
    assert_eq!(retained_bytes(&pic, id), history);
    assert_eq!(funding_tests::preserved_finance(&pic, id), financial);
    assert_eq!(status(&pic, id).source.admitted_to_exclusive, cursor);
    assert!(!status(&pic, id).run.running);

    let operator = Principal::self_authenticating([38; 32]);
    let read =
        || get_query::<speed::DevSpeed>(&pic, id, "dev_simulation_speed", encode_args(()).unwrap());
    assert_eq!(read().adaptive_tier, "Lifeline");
    let capped = status(&pic, id).run.pace.unwrap();
    assert_eq!(
        (capped.mode.as_str(), capped.supported_milli),
        ("Trickle", 10)
    );
    assert!(capped.admission_open);
    playability_installed::configuration(&pic, id, 512);
    assert!(!read().can_start);
    assert_eq!(read().effective_milli, Some(10));
    assert!(speed::switch(&pic, id, controller(), true, None).is_err());
    speed::bind(&pic, id, Some(operator));
    assert!(speed::switch(&pic, id, payer, true, None).is_err());
    let capped_cost = measure_ordinary(&pic, id, &out.join("capped"), 100_000);
    std::fs::write(out.join("capped/replay-inputs.bin"), b"[]").unwrap();
    assert!(
        std::process::Command::new("node")
            .current_dir(Path::new(env!("CARGO_MANIFEST_DIR")).join("../.."))
            .arg("tools/verify_compact_cost_replay.mjs")
            .arg(out.join("capped"))
            .arg("4")
            .arg(out.join("cutover"))
            .status()
            .unwrap()
            .success()
    );
    // The minimum observed checkpoint debit excludes a coincident source poll.
    let baseline_cost = *baseline.iter().min().unwrap();
    let adjusted_cost = *capped_cost.iter().min().unwrap();
    assert!(
        adjusted_cost <= baseline_cost * 105 / 100,
        "{baseline:?} versus {capped_cost:?}"
    );

    let count = status(&pic, id).run.completed_segments;
    advance(&pic, 45_000);
    pic.add_cycles(id, 2_000_000_000_000);
    advance(&pic, 45_000);
    assert_eq!(read().adaptive_tier, "Survival");
    assert_eq!(status(&pic, id).run.completed_segments, count);
    advance(&pic, 10_000);
    assert_eq!(status(&pic, id).run.completed_segments, count + 1);

    let armed = speed::switch(&pic, id, operator, true, None).unwrap();
    assert_eq!(armed.remaining_seconds, 120);
    assert_eq!(status(&pic, id).run.pace.unwrap().supported_milli, 1000);
    let fast_start = status(&pic, id).run.completed_segments;
    advance(&pic, 1100);
    assert!(status(&pic, id).run.completed_segments > fast_start);
    advance(&pic, 120_000);
    assert_eq!(read().mode, "Adaptive");
    assert_eq!(read().last_stop.as_deref(), Some("window-expired"));
    assert_eq!(status(&pic, id).run.pace.unwrap().supported_milli, 10);
    speed::switch(&pic, id, operator, true, None).unwrap();
    advance(&pic, 1100);
    let last_fast = status(&pic, id).run.completed_segments;
    assert_eq!(
        speed::switch(&pic, id, operator, false, None)
            .unwrap()
            .last_stop
            .as_deref(),
        Some("manual")
    );
    assert_eq!(status(&pic, id).run.pace.unwrap().supported_milli, 10);
    advance(&pic, 90_000);
    assert_eq!(status(&pic, id).run.completed_segments, last_fast);

    speed::switch(&pic, id, operator, true, None).unwrap();
    let head = observe(&pic, id).0.publication;
    upgrade_during_recovery(&pic, id, &candidate).unwrap();
    assert_eq!(observe(&pic, id).0.publication, head);
    assert!(status(&pic, id).run.running);
    assert_eq!(read().mode, "Adaptive");
    assert!(speed::switch(&pic, id, operator, true, None).is_err());
    speed::bind(&pic, id, Some(operator));
    assert_eq!(
        speed::switch(&pic, id, operator, false, None).unwrap().mode,
        "Adaptive"
    );
    pause(&pic, id);
    let head = observe(&pic, id).0.publication;
    let before = pic.cycle_balance(id);
    upgrade_during_recovery(&pic, id, &prior).unwrap();
    let rollback_cycles = before - pic.cycle_balance(id);
    assert_eq!(observe(&pic, id).0.publication, head);
    assert!(!status(&pic, id).run.running);
    assert_eq!(status(&pic, id).source.admitted_to_exclusive, cursor);

    let probe = bytes("B2Z_PRELAUNCH_TEST_WASM");
    upgrade_during_recovery(&pic, id, &probe).unwrap();
    playability_installed::configuration(&pic, id, 512);
    speed::bind(&pic, id, Some(operator));
    speed::switch(&pic, id, operator, true, None).unwrap();
    get_result::<Status>(
        &pic,
        id,
        "test_liquid_budget",
        candid::encode_one(999_000_000_000u64).unwrap(),
    );
    let protected = status(&pic, id).run.pace.unwrap();
    assert_eq!(
        (protected.mode.as_str(), protected.supported_milli),
        ("ReserveProtection", 0)
    );
    assert!(!protected.admission_open);
    assert_eq!(read().mode, "Adaptive");
    let protected_head = observe(&pic, id).0.publication;
    advance(&pic, 105_000);
    assert_eq!(observe(&pic, id).0.publication, protected_head);
    pic.add_cycles(id, 2_800_000_000_000);
    advance(&pic, 60_000);
    assert_eq!(status(&pic, id).run.pace.unwrap().supported_milli, 10);
    pause(&pic, id);
    upgrade_during_recovery(&pic, id, &candidate).unwrap();
    verify_prelaunch_browser(&pic, id, ledger, &out);
    let release = PathBuf::from(std::env::var_os("B2Z_DEV_SPEED_FRONTEND").unwrap());
    speed::certify_frontend(&release, &out);
    std::fs::write(out.join("prelaunch.json"), serde_json::to_vec_pretty(&json!({
        "status":"PASS","exact_predecessor":dtr_wire::hash(&prior),"candidate":dtr_wire::hash(&candidate),
        "baseline_cycles":baseline,"capped_cycles":capped_cost,"baseline_checkpoint":baseline_cost,
        "capped_checkpoint":adjusted_cost,"upgrade_cycles":upgrade_cycles,"rollback_cycles":rollback_cycles,
        "payment_position":payment,"paid_cursor":cursor,"unchanged_retained_publications":history.len(),
        "independently_replayed":8,"same_id":id.to_text()
    })).unwrap()).unwrap();
}

fn verify_prelaunch_browser(pic: &PocketIc, id: Principal, ledger: Principal, out: &Path) {
    let wall = pocket_ic::Time::from(std::time::SystemTime::now());
    if wall > pic.get_time() {
        pic.set_time(wall);
    }
    playability_installed::configuration(pic, id, 512);
    let out = out.join("browser");
    std::fs::create_dir_all(&out).unwrap();
    std::fs::write(out.join("metadata.json"), b"{}").unwrap();
    std::fs::write(out.join("root-key.der"), pic.root_key().unwrap()).unwrap();
    let policy = json!({
        "network":"pocketic-local","canister_id":id.to_text(),"ledger":ledger.to_text(),
        "index":status(pic,id).source.index.to_text(),"recipient":source::receiving_account(id,0).to_hex(),
        "root_key_hex":hex(&pic.root_key().unwrap()),
    });
    let configuration = out.join("configuration.json");
    std::fs::write(&configuration, serde_json::to_vec(&policy).unwrap()).unwrap();
    let mut live =
        PocketIc::new_from_existing_instance(pic.get_server_url(), pic.instance_id(), None);
    let gateway = live.make_live(None);
    let log = std::fs::File::create(out.join("browser.log")).unwrap();
    let mut browser = OwnedBrowser(
        std::process::Command::new(std::env::var_os("B2Z_PRELAUNCH_BROWSER_PYTHON").unwrap())
            .current_dir(Path::new(env!("CARGO_MANIFEST_DIR")).join("../.."))
            .args([
                "-B",
                "tools/verify_s14_deployment.py",
                "--prelaunch-trickle-scene-only",
                "--configuration",
            ])
            .arg(configuration)
            .arg("--gateway")
            .arg(gateway.as_str())
            .arg("--output")
            .arg(&out)
            .stdout(log.try_clone().unwrap())
            .stderr(log)
            .spawn()
            .unwrap(),
    );
    let deadline = std::time::Instant::now() + Duration::from_secs(185);
    loop {
        if let Some(status) = browser.0.try_wait().unwrap() {
            assert!(
                status.success(),
                "capped Chromium evidence: {}",
                out.display()
            );
            break;
        }
        assert!(
            std::time::Instant::now() < deadline,
            "capped Chromium deadline"
        );
        std::thread::sleep(Duration::from_millis(100));
    }
    live.stop_live();
    pause(pic, id);
}

#[test]
#[ignore = "explicit Rules19 construction payment-to-presentation rehearsal"]
fn signed_rules19_construction_presentation() {
    let out = PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap());
    std::fs::create_dir_all(&out).unwrap();
    let mut signer = super::delegation_installed::Signer::start(&out);
    let mut fixture = seed("moderate");
    let account = AccountIdentifier::new(&signer.owner, &DEFAULT_SUBACCOUNT).to_hex();
    let cannon = &mut fixture.cannons[2];
    let previous = std::mem::replace(&mut cannon.account, account.clone());
    let owner = fixture
        .playability
        .as_mut()
        .unwrap()
        .players
        .iter_mut()
        .find(|player| player.account == previous)
        .unwrap();
    owner.account = account.clone();
    let owner = owner.id;
    let (pic, id, ledger, _) = arena_setup_world_fee_clock_payers_options(
        bytes("B2Z_COST_PROFILE_WASM"),
        fixture.encode().unwrap(),
        10_000,
        120,
        &[signer.owner],
        true,
    );
    let compact = PathBuf::from(std::env::var("B2Z_COST_COMPACT_WASM").unwrap());
    compact_cutover(&pic, id, ledger, &compact, &out);
    upgrade_during_recovery(&pic, id, &bytes("B2Z_CONSTRUCTION_PRIOR_WASM")).unwrap();
    pause(&pic, id);
    let (_, before_publication) = capture(&pic, id, &out, 0);
    let prior = arena_world(&pic, id);
    let sites = (0..prior.cell_count())
        .filter(|&cell| prior.player_at(cell) == Some(owner))
        .filter(|&cell| {
            b2z_native::context_structures::site_reason(&prior, owner, cell, None, false, true)
                .unwrap()
                .is_none()
        })
        .collect::<Vec<_>>();
    let cannon = sites[0];
    let diverter = *sites
        .iter()
        .find(|&&cell| {
            let dx = (cell % prior.width).abs_diff(cannon % prior.width);
            let dy = (cell / prior.width).abs_diff(cannon / prior.width);
            dx.min(prior.width - dx).max(dy.min(prior.height - dy)) >= 4
        })
        .expect("two separated eligible construction sites");
    let buy = format!("NEW 0 1 {cannon}");
    let manual = format!("DEFLECT {diverter} N");
    let expected = signer.pay_construction(&pic, id, ledger, &prior, [&buy, &manual]);
    let mut records = super::delegation_installed::official_inputs(&pic, id, &expected);
    records.sort_by_key(|(payment, _)| payment.position);
    let inputs = records
        .iter()
        .map(|(payment, _)| {
            assert_eq!(
                payment.from,
                *AccountIdentifier::from_hex(&account).unwrap().as_bytes()
            );
            assert_eq!(payment.fee, 10_000);
            b2z_native::Input {
                position: Int(payment.position.into()),
                payload_hex: hex(&payment.encode().unwrap()),
            }
        })
        .collect::<Vec<_>>();
    let last = *expected.keys().last().unwrap();
    for _ in 0..180 {
        advance(&pic, 1000);
        // Admission can produce a no-tick publication while these payments
        // remain unapplied. The source cursor and structures, not publication
        // byte identity, fence the actual paid construction outcome.
        if status(&pic, id).source.admitted_to_exclusive > last {
            break;
        }
    }
    assert_eq!(status(&pic, id).source.admitted_to_exclusive, last + 1);
    assert_eq!(
        observe(&pic, id).1.head.source_to_exclusive,
        before_publication.head.source_to_exclusive
    );
    let held = arena_world(&pic, id);
    assert!(!held.cannons.iter().any(|c| c.cell == cannon));
    assert!(!held.deflectors.iter().flatten().any(|d| d.cell == diverter));
    // Replay begins at the latest certified pre-payment publication. Its
    // predecessor may be a source-admission no-tick publication; starting
    // from the earlier snapshot would skip that valid history link.
    let (_, staged_publication) = capture(&pic, id, &out, 0);
    assert_eq!(
        staged_publication.head.source_to_exclusive,
        before_publication.head.source_to_exclusive
    );
    let target = status(&pic, id).run.completed_segments + 1;
    playability_installed::configuration(&pic, id, 512);
    advance(&pic, 100_000);
    for _ in 0..250 {
        let state = status(&pic, id);
        assert!(state.run.last_error.is_none(), "{:?}", state.run.last_error);
        if state.run.completed_segments >= target {
            break;
        }
        advance(&pic, 50);
    }
    pause(&pic, id);
    assert_eq!(status(&pic, id).run.completed_segments, target);
    let (_, publication) = capture(&pic, id, &out, 1);
    replay(&out, 1, &inputs);
    std::fs::write(
        out.join("replay-inputs.bin"),
        dtr_wire::encode(&inputs).unwrap(),
    )
    .unwrap();
    std::fs::write(
        out.join("placement.json"),
        serde_json::to_vec(&json!({
            "backend":id.to_text(),"ledger":ledger.to_text(),"account":account,
            "cannon":cannon,"diverter":diverter,"manual_memo":manual,
            "committed_segment":publication.head.segment_id,
        }))
        .unwrap(),
    )
    .unwrap();
    let repository = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    let independently_replayed = std::process::Command::new("node")
        .current_dir(&repository)
        .arg("tools/verify_compact_cost_replay.mjs")
        .arg(&out)
        .arg("1")
        .output()
        .unwrap();
    assert!(
        independently_replayed.status.success(),
        "{}",
        String::from_utf8_lossy(&independently_replayed.stderr)
    );
    let verified = std::process::Command::new("node")
        .current_dir(repository)
        .arg("tools/verify_installed_construction_presentation.mjs")
        .arg(out)
        .output()
        .unwrap();
    assert!(
        verified.status.success(),
        "{}",
        String::from_utf8_lossy(&verified.stderr)
    );
}

/// A genuine disposable ICRC-2 approval and transfer_from. The transfer's
/// immutable Ledger block time is deliberately later than the prior grant.
fn expired_delegated_payment(
    pic: &PocketIc,
    ledger: Principal,
    payer: Principal,
    spender: Principal,
    receiver: Principal,
) -> u64 {
    #[derive(CandidType)]
    struct ApproveArg {
        from_subaccount: Option<Vec<u8>>,
        spender: IcrcAccount,
        amount: candid::Nat,
        expected_allowance: Option<candid::Nat>,
        expires_at: Option<u64>,
        fee: Option<candid::Nat>,
        memo: Option<Vec<u8>>,
        created_at_time: Option<u64>,
    }
    #[derive(CandidType, Deserialize, Debug)]
    enum ApproveError {
        BadFee {
            expected_fee: candid::Nat,
        },
        InsufficientFunds {
            balance: candid::Nat,
        },
        AllowanceChanged {
            current_allowance: candid::Nat,
        },
        Expired {
            ledger_time: u64,
        },
        TooOld,
        CreatedInFuture {
            ledger_time: u64,
        },
        Duplicate {
            duplicate_of: candid::Nat,
        },
        TemporarilyUnavailable,
        GenericError {
            error_code: candid::Nat,
            message: String,
        },
    }
    #[derive(CandidType)]
    struct TransferFromArg {
        spender_subaccount: Option<Vec<u8>>,
        from: IcrcAccount,
        to: IcrcAccount,
        amount: candid::Nat,
        fee: Option<candid::Nat>,
        memo: Option<Vec<u8>>,
        created_at_time: Option<u64>,
    }
    #[derive(CandidType, Deserialize, Debug)]
    enum TransferFromError {
        BadFee {
            expected_fee: candid::Nat,
        },
        BadBurn {
            min_burn_amount: candid::Nat,
        },
        InsufficientFunds {
            balance: candid::Nat,
        },
        InsufficientAllowance {
            allowance: candid::Nat,
        },
        TooOld,
        CreatedInFuture {
            ledger_time: u64,
        },
        Duplicate {
            duplicate_of: candid::Nat,
        },
        TemporarilyUnavailable,
        GenericError {
            error_code: candid::Nat,
            message: String,
        },
    }
    let now = pic.get_time().as_nanos_since_unix_epoch();
    let lifetime = b2z_protocol::delegation::LIFETIME_NS;
    let approved_until = now + 2 * lifetime;
    let reply = pic
        .update_call(
            ledger,
            payer,
            "icrc2_approve",
            candid::encode_one(ApproveArg {
                from_subaccount: None,
                spender: IcrcAccount {
                    owner: spender,
                    subaccount: None,
                },
                amount: 200_000_000u64.into(),
                expected_allowance: None,
                expires_at: Some(approved_until),
                fee: Some(10_000u64.into()),
                memo: None,
                created_at_time: None,
            })
            .unwrap(),
        )
        .unwrap();
    decode_one::<Result<candid::Nat, ApproveError>>(&reply)
        .unwrap()
        .unwrap();
    let expired_at = now + lifetime + 86_400_000_000_000;
    pic.set_time(pocket_ic::Time::from(
        std::time::UNIX_EPOCH + Duration::from_nanos(expired_at),
    ));
    let reply = pic
        .update_call(
            ledger,
            spender,
            "icrc2_transfer_from",
            candid::encode_one(TransferFromArg {
                spender_subaccount: None,
                from: IcrcAccount {
                    owner: payer,
                    subaccount: None,
                },
                to: IcrcAccount {
                    owner: receiver,
                    subaccount: None,
                },
                amount: 100_000_000u64.into(),
                fee: Some(10_000u64.into()),
                memo: Some(b"NEW 0 1".to_vec()),
                created_at_time: None,
            })
            .unwrap(),
        )
        .unwrap();
    decode_one::<Result<candid::Nat, TransferFromError>>(&reply)
        .unwrap()
        .unwrap()
        .0
        .to_string()
        .parse()
        .unwrap()
}

#[test]
#[ignore = "isolated reproduction of the current authorization wire boundary"]
fn rules19_digit_leading_grant_wire_boundary() {
    run_rules19_digit_leading_grant_wire_boundary(false, false, false, false, false, false, false);
}

#[test]
#[ignore = "multiple real pending Rules19 inputs through authenticated recovery"]
fn rules19_multi_pending_recovery() {
    run_rules19_digit_leading_grant_wire_boundary(true, false, false, false, false, false, false);
}

#[test]
#[ignore = "ordered Rules19 grants, revoke and payments through installed recovery"]
fn rules19_grant_revoke_recovery() {
    run_rules19_digit_leading_grant_wire_boundary(true, true, false, false, false, false, false);
}

#[test]
#[ignore = "Rules19 recovery preparation and commit across UTC tariff midnight"]
fn rules19_recovery_utc_boundary() {
    run_rules19_digit_leading_grant_wire_boundary(true, true, true, false, false, false, false);
}

#[test]
#[ignore = "obstructed Rules19 recovery remains fail-closed under disposable resource protection"]
fn rules19_recovery_resource_protection() {
    run_rules19_digit_leading_grant_wire_boundary(false, false, false, true, false, false, false);
}

#[test]
#[ignore = "obstructed Rules19 reserved execution stage through authenticated recovery"]
fn rules19_reserved_stage_recovery() {
    run_rules19_digit_leading_grant_wire_boundary(false, false, false, false, true, false, false);
}

#[test]
#[ignore = "obstructed Rules19 interrupted execution cursor through authenticated recovery"]
fn rules19_partial_stage_recovery() {
    run_rules19_digit_leading_grant_wire_boundary(false, false, false, false, true, true, false);
}

#[test]
#[ignore = "expired delegated Ledger payment retains Rules19 authorization policy through recovery"]
fn rules19_expired_delegation_recovery() {
    run_rules19_digit_leading_grant_wire_boundary(false, false, false, false, false, false, true);
}

fn run_rules19_digit_leading_grant_wire_boundary(
    extra_pending: bool,
    revoke_pending: bool,
    cross_utc: bool,
    protect: bool,
    reserved_stage: bool,
    partial_stage: bool,
    expired_delegate: bool,
) {
    assert!(!revoke_pending || extra_pending);
    assert!(!cross_utc || revoke_pending);
    assert!(!partial_stage || reserved_stage);
    assert!(!expired_delegate || !reserved_stage);
    let out = PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap());
    std::fs::create_dir_all(&out).unwrap();
    let payer = (0..=u8::MAX)
        .map(|value| Principal::self_authenticating([value; 32]))
        .find(|p| {
            AccountIdentifier::new(p, &DEFAULT_SUBACCOUNT)
                .to_hex()
                .as_bytes()[0]
                .is_ascii_digit()
        })
        .unwrap();
    let other = Principal::self_authenticating([9; 32]);
    let third = Principal::self_authenticating([10; 32]);
    assert_ne!(other, payer);
    assert_ne!(third, payer);
    let (pic, id, ledger, _) = arena_setup_world_fee_clock_payers_options(
        bytes("B2Z_COST_PROFILE_WASM"),
        seed("two_ball").encode().unwrap(),
        10_000,
        0,
        &[payer, other, third],
        true,
    );
    let compact = PathBuf::from(std::env::var("B2Z_COST_COMPACT_WASM").unwrap());
    compact_cutover(&pic, id, ledger, &compact, &out);
    let installed = bytes("B2Z_RULES20_INSTALLED_WASM");
    let installed_sha256 = dtr_wire::hash(&installed);
    assert_eq!(
        installed_sha256,
        "b19e4ba3a11339b71dc20134bcfac525f63530461f11a593d7d880eb86b5bc90"
    );
    upgrade_during_recovery(&pic, id, &installed).unwrap();
    playability_installed::one_tick(&pic, id);
    let (prior, publication) = capture(&pic, id, &out, 0);
    let prior_received = arena_world(&pic, id).received_e8s;
    let spender = Principal::self_authenticating([77; 32]);
    let grant = b2z_protocol::delegation::encode_authorization(
        &b2z_protocol::delegation::AuthorizationMemo::Grant(spender.as_slice().to_vec()),
    )
    .unwrap();
    let first_valid_position =
        partial_stage.then(|| transfer_text(&pic, ledger, other, id, 100_000_000, b"NEW 0 1"));
    let position = transfer_text(&pic, ledger, payer, id, 0, &grant);
    for _ in 0..180 {
        advance(&pic, 1000);
        if status(&pic, id).source.admitted_to_exclusive > position && transition_drained(&pic, id)
        {
            break;
        }
    }
    assert_eq!(status(&pic, id).source.admitted_to_exclusive, position + 1);
    if reserved_stage {
        // The exact installed scheduler coalesces Seal and the failing Step
        // in one callback, leaving no durable reservation. Use the reviewed
        // disposable test hook only to commit the normal DTR Seal over the
        // genuine admitted Ledger input, then let exact Rules19 execute it.
        upgrade_during_recovery(&pic, id, &bytes("B2Z_COST_PROFILE_WASM")).unwrap();
        let revision = status(&pic, id).revision;
        let _: Status = get_result(
            &pic,
            id,
            "test_apply",
            encode_args((
                revision,
                dtr_wire::encode(&Action::Seal {
                    logical_end: Int(&publication.head.logical_end.0 + 1u32),
                })
                .unwrap(),
            ))
            .unwrap(),
        );
        if partial_stage {
            let revision = status(&pic, id).revision;
            let _: Status = get_result(
                &pic,
                id,
                "test_apply",
                encode_args((
                    revision,
                    dtr_wire::encode(&Action::Step { budget: 1 }).unwrap(),
                ))
                .unwrap(),
            );
        }
        upgrade_during_recovery(&pic, id, &installed).unwrap();
        assert_eq!(observe(&pic, id).0.publication, prior.publication);
    }
    playability_installed::configuration(&pic, id, 512);
    advance(&pic, 100_000);
    for _ in 0..250 {
        if status(&pic, id).run.last_error.is_some() {
            break;
        }
        advance(&pic, 50);
    }
    let state = status(&pic, id);
    let error = state
        .run
        .last_error
        .as_deref()
        .expect("dependent wire fault should be explicit");
    assert!(error.contains("reserved/noncanonical key"), "{error}");
    assert!(!state.run.running);
    assert_eq!(observe(&pic, id).0.publication, prior.publication);

    // The failed publication is not a Ledger rollback. Probe the independent
    // source cursor, a normal retry, and stable-module recovery separately.
    let expired_position =
        expired_delegate.then(|| expired_delegated_payment(&pic, ledger, payer, spender, id));
    let later_command = if partial_stage {
        format!("FIRE {} 0 1", arena_world(&pic, id).next_cannon_id)
    } else {
        "NEW 0 1".into()
    };
    let later_position = transfer_text(
        &pic,
        ledger,
        other,
        id,
        100_000_000,
        later_command.as_bytes(),
    );
    let mut extra_positions = Vec::new();
    if extra_pending {
        let extra_spender = Principal::self_authenticating([78; 32]);
        let extra_grant = b2z_protocol::delegation::encode_authorization(
            &b2z_protocol::delegation::AuthorizationMemo::Grant(extra_spender.as_slice().to_vec()),
        )
        .unwrap();
        extra_positions.push(transfer_text(&pic, ledger, payer, id, 0, &extra_grant));
        if revoke_pending {
            let other_spender = Principal::self_authenticating([79; 32]);
            let other_grant = b2z_protocol::delegation::encode_authorization(
                &b2z_protocol::delegation::AuthorizationMemo::Grant(
                    other_spender.as_slice().to_vec(),
                ),
            )
            .unwrap();
            let other_revoke = b2z_protocol::delegation::encode_authorization(
                &b2z_protocol::delegation::AuthorizationMemo::Revoke,
            )
            .unwrap();
            extra_positions.push(transfer_text(&pic, ledger, other, id, 0, &other_grant));
            extra_positions.push(transfer_text(&pic, ledger, other, id, 0, &other_revoke));
        }
        extra_positions.push(transfer_text(
            &pic,
            ledger,
            third,
            id,
            200_000_000,
            b"NEW 0 1",
        ));
    }
    let pending_count =
        2 + extra_positions.len() as u32 + u32::from(partial_stage) + u32::from(expired_delegate);
    let last_old_position = extra_positions.last().copied().unwrap_or(later_position);
    for _ in 0..180 {
        advance(&pic, 1000);
        if status(&pic, id).source.admitted_to_exclusive > last_old_position {
            break;
        }
    }
    let after_later_payment = status(&pic, id);
    playability_installed::configuration(&pic, id, 512);
    advance(&pic, 100_000);
    for _ in 0..250 {
        if status(&pic, id).run.last_error.is_some() {
            break;
        }
        advance(&pic, 50);
    }
    let after_retry = status(&pic, id);
    assert_eq!(observe(&pic, id).0.publication, prior.publication);
    upgrade_during_recovery(&pic, id, &installed).unwrap();
    let after_upgrade = status(&pic, id);
    playability_installed::configuration(&pic, id, 512);
    advance(&pic, 100_000);
    for _ in 0..250 {
        if status(&pic, id).run.last_error.is_some() {
            break;
        }
        advance(&pic, 50);
    }
    let after_upgrade_retry = status(&pic, id);
    let final_observation = observe(&pic, id).0;
    let final_world = arena_world(&pic, id);
    #[derive(CandidType, Deserialize)]
    struct PendingWork {
        phase: Option<String>,
        pending_inputs: u32,
    }
    let pending: PendingWork = get_query(&pic, id, "controller_work", encode_args(()).unwrap());
    assert_eq!(
        final_world.received_e8s, prior_received,
        "no later transfer may be falsely reported as applied while publication is blocked"
    );
    assert_eq!(
        after_later_payment.source.admitted_to_exclusive,
        last_old_position + 1
    );
    assert_eq!(after_retry.run.last_error.as_deref(), Some(error));
    assert_eq!(after_upgrade.run.last_error.as_deref(), Some(error));
    assert_eq!(after_upgrade_retry.run.last_error.as_deref(), Some(error));
    assert_eq!(pending.pending_inputs, pending_count);
    if reserved_stage {
        assert_eq!(pending.phase.as_deref(), Some("running"));
    }
    assert_eq!(final_observation.publication, prior.publication);

    let candidate = bytes("B2Z_RULES20_CANDIDATE_WASM");
    upgrade_during_recovery(&pic, id, &candidate).unwrap();
    let prepare = || -> Result<Vec<u8>, String> {
        let reply = pic
            .update_call(
                id,
                controller(),
                "prepare_rules20_transition",
                encode_args(()).unwrap(),
            )
            .expect("preparation call must return an application result");
        candid::decode_one(&reply).unwrap()
    };
    // Let the upgrade's independent Index check settle. The actual
    // obstruction must survive a clean source scan and a compatible upgrade.
    for _ in 0..180 {
        advance(&pic, 1000);
        let source = status(&pic, id).source;
        if !source.scan_in_flight && source.pending_records == 0 && source.last_error.is_none() {
            break;
        }
    }
    let after_successor_upgrade = status(&pic, id);
    assert_eq!(
        after_successor_upgrade.run.last_error.as_deref(),
        Some(error)
    );
    assert_eq!(
        after_successor_upgrade.source.admitted_to_exclusive,
        last_old_position + 1
    );
    let preparation_error = prepare().unwrap_err();
    assert_eq!(
        preparation_error,
        "finish existing source reconciliation and recover errors before cutover"
    );
    assert_eq!(observe(&pic, id).0.publication, prior.publication);
    let successor_pending: PendingWork =
        get_query(&pic, id, "controller_work", encode_args(()).unwrap());
    assert_eq!(successor_pending.pending_inputs, pending_count);

    std::fs::write(
        out.join("digit-leading-grant.json"),
        serde_json::to_vec_pretty(&json!({
            "status":"REPRODUCED","scope":"genuine disposable Rules19 Ledger/Index and installed backend",
            "installed_sha256":installed_sha256,"candidate_sha256":dtr_wire::hash(&candidate),
            "normal_transition_preparation_error":preparation_error,
            "funding_account_key_begins_with_digit":true,"grant_position":position,
            "source_cursor":state.source.admitted_to_exclusive,"published_head":publication.head.segment_id,
            "published_head_preserved":true,"run_error":error,"running":state.run.running,
            "later_valid_payment_position":later_position,
            "later_payment_source_cursor":after_later_payment.source.admitted_to_exclusive,
            "retry_error":after_retry.run.last_error,"retry_running":after_retry.run.running,
            "upgrade_error":after_upgrade.run.last_error,"upgrade_running":after_upgrade.run.running,
            "upgrade_retry_error":after_upgrade_retry.run.last_error,
            "upgrade_retry_running":after_upgrade_retry.run.running,
            "publication_still_preserved":final_observation.publication==prior.publication,
            "pending_controller_inputs":pending.pending_inputs,
            "pending_stage_phase":pending.phase,
            "received_e8s_before_grant":prior_received,
            "received_e8s_after_retries":final_world.received_e8s,
        }))
        .unwrap(),
    )
    .unwrap();

    let refuse_under_protection = |method: &str, argument: Vec<u8>| {
        let before = pic.cycle_balance(id);
        let probe = bytes("B2Z_RULES20_PROTECTION_PROBE_WASM");
        upgrade_during_recovery(&pic, id, &probe).unwrap();
        let _: Status = get_result(
            &pic,
            id,
            "test_liquid_budget",
            candid::encode_one(400_000_000_000u64).unwrap(),
        );
        upgrade_during_recovery(&pic, id, &candidate).unwrap();
        assert_eq!(
            pic.canister_status(id, Some(controller()))
                .unwrap()
                .module_hash,
            Some(dtr_wire::unhex(&dtr_wire::hash(&candidate)).unwrap())
        );
        let reply = pic.update_call(id, controller(), method, argument).unwrap();
        assert_eq!(
            decode_one::<Result<Vec<u8>, String>>(&reply)
                .unwrap()
                .unwrap_err(),
            "insufficient liquid cycles for safe recovery"
        );
        assert_eq!(observe(&pic, id).0.publication, prior.publication);
        let work: PendingWork = get_query(&pic, id, "controller_work", encode_args(()).unwrap());
        assert_eq!(work.pending_inputs, pending_count);
        pic.add_cycles(id, before - pic.cycle_balance(id));
    };
    if protect {
        refuse_under_protection("prepare_rules19_recovery", encode_args(()).unwrap());
    }
    if expired_delegate {
        let source = status(&pic, id).source;
        eprintln!(
            "expired recovery preflight source={:?} status={:?} lifecycle={:?}",
            (
                source.binding_checked,
                source.pending_records,
                source.scan_in_flight,
                source.reconciliation_requested,
                source.last_error
            ),
            decode::<Value>(&get_query::<Vec<u8>>(
                &pic,
                id,
                "rules19_recovery_status",
                encode_args(()).unwrap(),
            )),
            decode::<Value>(&get_query::<Vec<u8>>(
                &pic,
                id,
                "rules20_transition_status",
                encode_args(()).unwrap(),
            ))
        );
    }

    // Positive route: the same durable obstructed journal, without test_apply
    // or input mutation, crosses the authenticated DTR recovery boundary.
    let _: Vec<u8> = get_result(
        &pic,
        id,
        "prepare_rules19_recovery",
        encode_args(()).unwrap(),
    );
    let mut recovery_ready = false;
    for _ in 0..180 {
        advance(&pic, 1000);
        let raw: Vec<u8> = get_query(
            &pic,
            id,
            "rules19_recovery_status",
            encode_args(()).unwrap(),
        );
        let view: serde_json::Value = decode(&raw).unwrap();
        if view["transition"]["phase"] == "ready" {
            recovery_ready = true;
            break;
        }
    }
    assert!(recovery_ready, "measured recovery Ledger/Index fence");
    let day_ns = b2z_protocol::economy17::DAY_NS;
    let preparation_utc_day = pic.get_time().as_nanos_since_unix_epoch() / day_ns;
    if cross_utc {
        let next_day = (preparation_utc_day + 1) * day_ns + 1_000_000_000;
        pic.set_time(pocket_ic::Time::from(
            std::time::UNIX_EPOCH + Duration::from_nanos(next_day),
        ));
        advance(&pic, 1000);
        assert_eq!(
            pic.get_time().as_nanos_since_unix_epoch() / day_ns,
            preparation_utc_day + 1
        );
        let raw: Vec<u8> = get_query(
            &pic,
            id,
            "rules19_recovery_status",
            encode_args(()).unwrap(),
        );
        let view: serde_json::Value = decode(&raw).unwrap();
        assert_eq!(
            view["transition"]["phase"], "ready",
            "prepared source obligations survive UTC midnight"
        );
        assert_eq!(observe(&pic, id).0.publication, prior.publication);
        // The prepared recovery fence is durable across a same-ID software
        // restart before the controller commits the authenticated boundary.
        upgrade_during_recovery(&pic, id, &candidate).unwrap();
        assert_eq!(observe(&pic, id).0.publication, prior.publication);
        let mut prepared_after_restart = false;
        for _ in 0..180 {
            let raw: Vec<u8> = get_query(
                &pic,
                id,
                "rules19_recovery_status",
                encode_args(()).unwrap(),
            );
            let view: serde_json::Value = decode(&raw).unwrap();
            if view["transition"]["phase"] == "ready" {
                prepared_after_restart = true;
                break;
            }
            advance(&pic, 1000);
        }
        assert!(
            prepared_after_restart,
            "recovery preparation survives restart"
        );
    }
    let commit_utc_day = pic.get_time().as_nanos_since_unix_epoch() / day_ns;
    if protect {
        refuse_under_protection(
            "commit_rules19_recovery",
            candid::encode_one(publication.head.manifest_hash.clone()).unwrap(),
        );
    }
    let stale = pic
        .update_call(
            id,
            controller(),
            "commit_rules19_recovery",
            candid::encode_one("00".repeat(32)).unwrap(),
        )
        .unwrap();
    assert!(
        decode_one::<Result<Vec<u8>, String>>(&stale)
            .unwrap()
            .is_err()
    );
    assert_eq!(observe(&pic, id).0.publication, prior.publication);
    let _: Vec<u8> = get_result(
        &pic,
        id,
        "commit_rules19_recovery",
        candid::encode_one(publication.head.manifest_hash.clone()).unwrap(),
    );
    let (recovered_observation, recovered_publication) = capture(&pic, id, &out, 1);
    assert_eq!(recovered_publication.version, 10);
    assert_eq!(recovered_publication.epoch.as_ref().unwrap().version, 4);
    assert_eq!(
        recovered_publication.head.source_to_exclusive,
        publication.head.source_to_exclusive
    );
    assert_eq!(
        recovered_publication
            .epoch
            .as_ref()
            .unwrap()
            .recovery
            .as_ref()
            .unwrap()
            .pending_count,
        pending_count
    );
    assert_eq!(
        recovered_publication
            .epoch
            .as_ref()
            .unwrap()
            .recovery
            .as_ref()
            .unwrap()
            .version,
        if reserved_stage { 1 } else { 2 }
    );
    assert_eq!(arena_world(&pic, id).received_e8s, prior_received);
    let old_segment = publication
        .head
        .segment_id
        .as_ref()
        .unwrap()
        .0
        .to_string()
        .parse::<u64>()
        .unwrap();
    let retained: Vec<u8> = get_query(
        &pic,
        id,
        "retained_publication",
        candid::encode_one(old_segment).unwrap(),
    );
    assert_eq!(
        retained, prior.publication,
        "committed Rules19 bytes survive recovery"
    );
    let _: Vec<u8> = get_result(
        &pic,
        id,
        "commit_rules19_recovery",
        candid::encode_one(publication.head.manifest_hash.clone()).unwrap(),
    );
    assert_eq!(
        observe(&pic, id).0.publication,
        recovered_observation.publication
    );
    let recovery_module_hash = pic
        .canister_status(id, Some(controller()))
        .unwrap()
        .module_hash;
    assert!(upgrade_during_recovery(&pic, id, &installed).is_err());
    assert_eq!(
        pic.canister_status(id, Some(controller()))
            .unwrap()
            .module_hash,
        recovery_module_hash,
        "Rules19 must reject the first durable recovery boundary"
    );
    upgrade_during_recovery(&pic, id, &candidate).unwrap();
    assert_eq!(
        observe(&pic, id).0.publication,
        recovered_observation.publication
    );
    // A payment arriving after the measured Ledger fence belongs to the
    // successor. It must not enter the retained Rules19 execution prefix.
    let expected_other_cannon = arena_world(&pic, id).next_cannon_id;
    let successor_command = format!("FIRE {expected_other_cannon} 0 1");
    let successor_payment = transfer_text(
        &pic,
        ledger,
        other,
        id,
        300_000_000,
        successor_command.as_bytes(),
    );
    assert!(successor_payment > last_old_position);
    let digit_account = AccountIdentifier::new(&payer, &DEFAULT_SUBACCOUNT).to_hex();
    let mut settled = false;
    for _ in 0..600 {
        advance(&pic, 1000);
        let work: PendingWork = get_query(&pic, id, "controller_work", encode_args(()).unwrap());
        let raw: Vec<u8> = get_query(
            &pic,
            id,
            "rules19_recovery_status",
            encode_args(()).unwrap(),
        );
        let view: serde_json::Value = decode(&raw).unwrap();
        let world = arena_world(&pic, id);
        let granted = matches!(world.authorization.as_ref(),
            Some(b2z_native::delegation_v20::AuthorizationState::Rows(rows))
                if rows.grants.iter().any(|row| row.account == digit_account));
        if work.pending_inputs == 0
            && work.phase.is_none()
            && view["transition"]["recovery_source_complete"] == true
            && granted
            && world.received_e8s.0
                == prior_received.0.clone()
                    + (if extra_pending {
                        300_000_000u64
                    } else {
                        100_000_000u64
                    })
                    + if partial_stage { 100_000_000u64 } else { 0 }
                    + if expired_delegate { 100_000_000u64 } else { 0 }
        {
            settled = true;
            break;
        }
    }
    assert!(
        settled,
        "both original inputs must retire and publish under Rules19 policy: {:?}",
        status(&pic, id).run.last_error
    );
    let final_world = arena_world(&pic, id);
    assert_eq!(final_world.version, 11);
    assert!(final_world.cannons.iter().any(|c| {
        c.id == expected_other_cannon
            && c.account == AccountIdentifier::new(&other, &DEFAULT_SUBACCOUNT).to_hex()
    }));
    if extra_pending {
        let rows = match final_world.authorization.as_ref() {
            Some(b2z_native::delegation_v20::AuthorizationState::Rows(rows)) => rows,
            _ => panic!("canonical recovery grant rows required"),
        };
        let row = rows
            .grants
            .iter()
            .find(|row| row.account == digit_account)
            .expect("digit-leading grant retained");
        assert_eq!(
            row.spender_principal,
            hex(Principal::self_authenticating([78; 32]).as_slice()),
            "later Rules19 grant replaces the first without losing its input receipt"
        );
        if revoke_pending {
            let other_account = AccountIdentifier::new(&other, &DEFAULT_SUBACCOUNT).to_hex();
            assert!(
                rows.grants.iter().all(|row| row.account != other_account),
                "Rules19 revoke removes only its funding account's grant"
            );
        }
    }
    assert_eq!(
        status(&pic, id).source.admitted_to_exclusive,
        last_old_position + 1
    );
    let _: Vec<u8> = get_result(
        &pic,
        id,
        "finish_rules19_recovery",
        encode_args(()).unwrap(),
    );
    let raw: Vec<u8> = get_query(
        &pic,
        id,
        "rules19_recovery_status",
        encode_args(()).unwrap(),
    );
    let view: serde_json::Value = decode(&raw).unwrap();
    assert_eq!(view["transition"]["phase"], "fenced");
    eprintln!("Rules19 recovery fenced with original inputs retired");
    let old_final_ordinal = if reserved_stage { 3 } else { 2 };
    let first_reserved_pub =
        reserved_stage.then(|| capture_retained(&pic, id, &out, old_segment + 2, 2));
    let (before_successor, mut before_successor_pub) = capture(&pic, id, &out, old_final_ordinal);
    if let Some(expired) = expired_position {
        let events: Value = decode(&std::fs::read(out.join("2-events.bin")).unwrap()).unwrap();
        let receipts = events["receipts"].as_array().unwrap();
        assert_eq!(receipts.len(), pending_count as usize);
        let row = receipts
            .iter()
            .find(|row| row["position"]["$integer"] == expired.to_string())
            .unwrap();
        assert_eq!(row["reason"], "UNAUTHORIZED_SPENDER");
        assert_eq!(row["status"], "rejected");
        assert_eq!(row["amount"]["$integer"], "100000000");
    }
    if extra_pending {
        let event_log: Value = decode(&std::fs::read(out.join("2-events.bin")).unwrap()).unwrap();
        let receipts = event_log["receipts"].as_array().unwrap();
        assert_eq!(
            receipts.len(),
            pending_count as usize,
            "every admitted Rules19 input has one receipt"
        );
        let mut receipt_positions = vec![position, later_position];
        receipt_positions.extend(extra_positions.iter().copied());
        for (row, expected_position) in receipts.iter().zip(receipt_positions) {
            assert_eq!(row["position"]["$integer"], expected_position.to_string());
        }
        assert_eq!(receipts[0]["reason"], "DELEGATION_GRANTED");
        assert_eq!(receipts[2]["reason"], "DELEGATION_GRANTED");
        if revoke_pending {
            assert_eq!(receipts[3]["reason"], "DELEGATION_GRANTED");
            assert_eq!(receipts[4]["reason"], "DELEGATION_REVOKED");
        }
        for (row, paid) in [(1, 100_000_000u64), (receipts.len() - 1, 200_000_000u64)] {
            assert_eq!(receipts[row]["status"], "applied");
            assert_eq!(receipts[row]["amount"]["$integer"], paid.to_string());
            assert_eq!(receipts[row]["price_multiplier"], 1);
            assert_eq!(receipts[row]["per_item_prices"][0]["$integer"], "1000000");
        }
    }
    assert_eq!(
        before_successor_pub.head.segment_id.as_ref().unwrap(),
        &Int((old_segment + 2 + u64::from(reserved_stage)).into()),
        "recovered segments must retire the exact pending prefix"
    );
    let recovered_seal = before_successor_pub.head.seal.as_ref().unwrap();
    let reserved_inputs = 1 + usize::from(partial_stage);
    assert_eq!(
        recovered_seal.input_count,
        pending_count
            - if reserved_stage {
                reserved_inputs as u32
            } else {
                0
            }
    );
    assert_eq!(
        recovered_seal.source_to_exclusive,
        Int((last_old_position + 1).into())
    );
    let mut expected = BTreeMap::from([
        (position, ("DELEGATION_GRANTED".into(), 0, None)),
        (later_position, ("ACCEPTED".into(), 100_000_000, None)),
        (successor_payment, ("ACCEPTED".into(), 300_000_000, None)),
    ]);
    if let Some(first) = first_valid_position {
        expected.insert(first, ("ACCEPTED".into(), 100_000_000, None));
    }
    if let Some(expired) = expired_position {
        expected.insert(
            expired,
            ("UNAUTHORIZED_SPENDER".into(), 100_000_000, Some(spender)),
        );
    }
    if extra_pending {
        expected.insert(extra_positions[0], ("DELEGATION_GRANTED".into(), 0, None));
        if revoke_pending {
            expected.insert(extra_positions[1], ("DELEGATION_GRANTED".into(), 0, None));
            expected.insert(extra_positions[2], ("DELEGATION_REVOKED".into(), 0, None));
        }
        expected.insert(
            *extra_positions.last().unwrap(),
            ("ACCEPTED".into(), 200_000_000, None),
        );
    }
    let mut records = super::delegation_installed::official_inputs(&pic, id, &expected);
    records.sort_by_key(|(payment, _)| payment.position);
    if let Some(expired) = expired_position {
        let payment = &records
            .iter()
            .find(|(payment, _)| payment.position == expired)
            .unwrap()
            .0;
        let account = AccountIdentifier::new(&payer, &DEFAULT_SUBACCOUNT).to_hex();
        assert_eq!(hex(&payment.from), account);
        assert_eq!(
            payment.spender.map(|value| hex(&value)),
            Some(AccountIdentifier::new(&spender, &DEFAULT_SUBACCOUNT).to_hex())
        );
        let rows = match final_world.authorization.as_ref() {
            Some(b2z_native::delegation_v20::AuthorizationState::Rows(rows)) => rows,
            _ => panic!("recovery authorization rows required"),
        };
        let grant = rows
            .grants
            .iter()
            .find(|row| row.account == account)
            .unwrap();
        assert!(grant.expires_at_ns <= Int(payment.ledger_time_ns.into()));
    }
    let inputs = records
        .into_iter()
        .filter(|(payment, _)| payment.position <= last_old_position)
        .into_iter()
        .map(|(payment, _)| b2z_native::Input {
            position: Int(payment.position.into()),
            payload_hex: hex(&payment.encode().unwrap()),
        })
        .collect::<Vec<_>>();
    let mut expected_positions = first_valid_position.into_iter().collect::<Vec<_>>();
    expected_positions.push(position);
    expected_positions.extend(expired_position);
    expected_positions.push(later_position);
    expected_positions.extend(extra_positions.iter().copied());
    assert_eq!(
        inputs
            .iter()
            .map(|i| i.position.clone())
            .collect::<Vec<_>>(),
        expected_positions
            .into_iter()
            .map(|p| Int(p.into()))
            .collect::<Vec<_>>()
    );
    let final_inputs = if reserved_stage {
        &inputs[reserved_inputs..]
    } else {
        &inputs[..]
    };
    let root = dtr_host::input_root(
        &final_inputs
            .iter()
            .map(|i| dtr_host::Input {
                position: i.position.clone(),
                payload_hex: i.payload_hex.clone(),
            })
            .collect::<Vec<_>>(),
        recovered_seal.source_from.0.to_string().parse().unwrap(),
        recovered_seal
            .source_to_exclusive
            .0
            .to_string()
            .parse()
            .unwrap(),
    )
    .unwrap();
    assert_eq!(root, recovered_seal.input_root);
    if let Some(first_pub) = first_reserved_pub {
        let first_seal = first_pub.head.seal.as_ref().unwrap();
        let obligation = recovered_publication
            .epoch
            .as_ref()
            .unwrap()
            .recovery
            .as_ref()
            .unwrap();
        let original_seal = obligation.reserved_seal.as_ref().unwrap();
        assert!(obligation.reserved_stage_hash.is_some());
        assert_eq!(first_seal.logical_end, original_seal.logical_end);
        assert_eq!(
            first_seal.source_to_exclusive,
            original_seal.source_to_exclusive
        );
        assert_eq!(first_seal.source_anchor, original_seal.source_anchor);
        assert_eq!(first_seal.input_root, original_seal.input_root);
        assert_eq!(first_seal.input_count, reserved_inputs as u32);
        assert_eq!(first_seal.source_to_exclusive, Int((position + 1).into()));
        assert_eq!(recovered_seal.source_from, first_seal.source_to_exclusive);
        let first_root = dtr_host::input_root(
            &inputs[..reserved_inputs]
                .iter()
                .map(|input| dtr_host::Input {
                    position: input.position.clone(),
                    payload_hex: input.payload_hex.clone(),
                })
                .collect::<Vec<_>>(),
            first_seal.source_from.0.to_string().parse().unwrap(),
            first_seal
                .source_to_exclusive
                .0
                .to_string()
                .parse()
                .unwrap(),
        )
        .unwrap();
        assert_eq!(first_root, first_seal.input_root);
        let first_events: Value =
            decode(&std::fs::read(out.join("2-events.bin")).unwrap()).unwrap();
        let first_receipts = first_events["receipts"].as_array().unwrap();
        assert_eq!(first_receipts.len(), reserved_inputs);
        if let Some(first) = first_valid_position {
            assert_eq!(first_receipts[0]["position"]["$integer"], first.to_string());
            assert_eq!(first_receipts[0]["status"], "applied");
            assert_eq!(first_receipts[0]["price_multiplier"], 1);
        }
        let grant_receipt = &first_receipts[reserved_inputs - 1];
        assert_eq!(grant_receipt["position"]["$integer"], position.to_string());
        assert_eq!(grant_receipt["reason"], "DELEGATION_GRANTED");
        let later_events: Value =
            decode(&std::fs::read(out.join("3-events.bin")).unwrap()).unwrap();
        let later_receipts = later_events["receipts"].as_array().unwrap();
        assert_eq!(later_receipts.len(), 1);
        assert_eq!(
            later_receipts[0]["position"]["$integer"],
            later_position.to_string()
        );
        assert_eq!(later_receipts[0]["status"], "applied");
        assert_eq!(later_receipts[0]["price_multiplier"], 1);
        std::fs::write(
            out.join("2-inputs.bin"),
            dtr_wire::encode(&inputs[..reserved_inputs]).unwrap(),
        )
        .unwrap();
    }
    std::fs::write(
        out.join(format!("{old_final_ordinal}-inputs.bin")),
        dtr_wire::encode(final_inputs).unwrap(),
    )
    .unwrap();
    upgrade_during_recovery(&pic, id, &candidate).unwrap();
    assert_eq!(
        observe(&pic, id).0.publication,
        before_successor.publication
    );
    let mut source_settled = false;
    for _ in 0..180 {
        let current = status(&pic, id);
        let raw: Vec<u8> = get_query(
            &pic,
            id,
            "rules19_recovery_status",
            encode_args(()).unwrap(),
        );
        let view: serde_json::Value = decode(&raw).unwrap();
        if !current.source.scan_in_flight
            && current.source.pending_records == 0
            && current.source.last_error.is_none()
            && current.run.last_error.is_none()
            && view["source_pending"] == false
            && view["source_in_flight"] == false
        {
            source_settled = true;
            break;
        }
        advance(&pic, 1000);
    }
    assert!(
        source_settled,
        "source reconciliation after recovery restart: source={:?} run={:?}",
        status(&pic, id).source.last_error,
        status(&pic, id).run.last_error
    );
    if cross_utc || expired_delegate {
        let mut prepared = false;
        let mut last_error = String::new();
        for _ in 0..180 {
            let reply = pic
                .update_call(
                    id,
                    controller(),
                    "prepare_rules20_transition",
                    encode_args(()).unwrap(),
                )
                .unwrap();
            match decode_one::<Result<Vec<u8>, String>>(&reply).unwrap() {
                Ok(_) => {
                    prepared = true;
                    break;
                }
                Err(error)
                    if error
                        == "finish existing source reconciliation and recover errors before cutover" =>
                {
                    last_error = error;
                    advance(&pic, 1000);
                }
                Err(error) => panic!("unexpected Rules20 preparation error: {error}"),
            }
        }
        let transition_status: Vec<u8> = get_query(
            &pic,
            id,
            "rules20_transition_status",
            encode_args(()).unwrap(),
        );
        let transition_view: serde_json::Value = decode(&transition_status).unwrap();
        std::fs::write(
            out.join("utc-transition-status.json"),
            serde_json::to_vec_pretty(&transition_view).unwrap(),
        )
        .unwrap();
        assert!(
            prepared,
            "Rules20 preparation after UTC recovery remained blocked: {last_error}; lifecycle={transition_view}"
        );
        eprintln!("Rules20 preparation accepted after Rules19 recovery");
    } else {
        playability_installed::prepare(&pic, id, "prepare_rules20_transition");
    }
    let mut successor_ordinal = old_final_ordinal + 1;
    if expired_delegate {
        // Seven days of elapsed time can make an existing Cannon's dormant
        // lifecycle checkpoint due. Preserve and independently verify each
        // authentic no-input checkpoint before the ordinary successor epoch.
        let prior_segment = before_successor_pub
            .head
            .segment_id
            .as_ref()
            .unwrap()
            .0
            .to_string()
            .parse::<u64>()
            .unwrap();
        let current_pub = observe(&pic, id).1;
        let current_segment = current_pub
            .head
            .segment_id
            .as_ref()
            .unwrap()
            .0
            .to_string()
            .parse::<u64>()
            .unwrap();
        assert!(current_segment >= prior_segment && current_segment - prior_segment <= 16);
        for segment in prior_segment + 1..=current_segment {
            let ordinal = old_final_ordinal + segment - prior_segment;
            let checkpoint = capture_retained(&pic, id, &out, segment, ordinal);
            assert!(
                checkpoint.head.seal.is_none(),
                "overdue lifecycle checkpoint"
            );
        }
        successor_ordinal += current_segment - prior_segment;
        before_successor_pub = current_pub;
    }
    let mut ready = false;
    for _ in 0..180 {
        advance(&pic, 1000);
        let raw: Vec<u8> = get_query(
            &pic,
            id,
            "rules20_transition_status",
            encode_args(()).unwrap(),
        );
        let view: serde_json::Value = decode(&raw).unwrap();
        if view["transition"]["phase"] == "ready" && transition_drained(&pic, id) {
            ready = true;
            break;
        }
    }
    assert!(ready, "ordinary Rules20 transition after drained recovery");
    eprintln!("Rules20 successor drain ready after Rules19 recovery");
    let _: Vec<u8> = get_result(
        &pic,
        id,
        "commit_rules20_transition",
        candid::encode_one(before_successor_pub.head.manifest_hash).unwrap(),
    );
    let successor = arena_world(&pic, id);
    assert_eq!(successor.version, 12);
    assert_eq!(successor.received_e8s, final_world.received_e8s);
    let (_, successor_pub) = capture(&pic, id, &out, successor_ordinal);
    assert_eq!(successor_pub.version, 8);
    playability_installed::configuration(&pic, id, 512);
    let mut later_settled = false;
    for _ in 0..300 {
        advance(&pic, 1000);
        let world = arena_world(&pic, id);
        if status(&pic, id).source.admitted_to_exclusive > successor_payment
            && world.received_e8s.0 == &successor.received_e8s.0 + 300_000_000u64
        {
            later_settled = true;
            break;
        }
    }
    assert!(
        later_settled,
        "post-fence payment must publish under Rules20"
    );
    let paid_segment = observe(&pic, id)
        .1
        .head
        .segment_id
        .as_ref()
        .unwrap()
        .0
        .to_string()
        .parse::<u64>()
        .unwrap();
    let successor_segment = successor_pub
        .head
        .segment_id
        .as_ref()
        .unwrap()
        .0
        .to_string()
        .parse::<u64>()
        .unwrap();
    assert!(
        paid_segment > successor_segment && paid_segment - successor_segment <= 16,
        "bounded retained successor history"
    );
    for segment in successor_segment + 1..paid_segment {
        let ordinal = successor_ordinal + segment - successor_segment;
        let intermediate = capture_retained(&pic, id, &out, segment, ordinal);
        assert_eq!(
            intermediate.head.seal.as_ref().unwrap().input_count,
            0,
            "only the final successor segment applies the later payment"
        );
        std::fs::write(
            out.join(format!("{ordinal}-inputs.bin")),
            dtr_wire::encode(&Vec::<b2z_native::Input>::new()).unwrap(),
        )
        .unwrap();
    }
    let paid_ordinal = successor_ordinal + paid_segment - successor_segment;
    let (_, successor_paid_pub) = capture(&pic, id, &out, paid_ordinal);
    assert_eq!(
        successor_paid_pub.head.seal.as_ref().unwrap().input_count,
        1
    );
    let successor_events: Value =
        decode(&std::fs::read(out.join(format!("{paid_ordinal}-events.bin"))).unwrap()).unwrap();
    let successor_receipt = successor_events["receipts"]
        .as_array()
        .unwrap()
        .iter()
        .find(|row| row["position"]["$integer"] == successor_payment.to_string())
        .expect("one later Rules20 receipt");
    assert_eq!(successor_receipt["status"], "applied");
    assert_eq!(successor_receipt["actual_quantity"], 1);
    assert_eq!(successor_receipt["cannon"], expected_other_cannon);
    assert!(successor_receipt["amount_used"]["$integer"] != "0");
    let expected_later =
        BTreeMap::from([(successor_payment, ("ACCEPTED".into(), 300_000_000, None))]);
    let later_input = super::delegation_installed::official_inputs(&pic, id, &expected_later)
        .into_iter()
        .map(|(payment, _)| b2z_native::Input {
            position: Int(payment.position.into()),
            payload_hex: hex(&payment.encode().unwrap()),
        })
        .collect::<Vec<_>>();
    std::fs::write(
        out.join(format!("{paid_ordinal}-inputs.bin")),
        dtr_wire::encode(&later_input).unwrap(),
    )
    .unwrap();
    let independent = std::process::Command::new("node")
        .current_dir(Path::new(env!("CARGO_MANIFEST_DIR")).join("../.."))
        .arg("tools/verify_rules20_installed_replay.mjs")
        .arg(&out)
        .arg(paid_ordinal.to_string())
        .output()
        .unwrap();
    assert!(
        independent.status.success(),
        "independent obstructed recovery replay: {}{}",
        String::from_utf8_lossy(&independent.stdout),
        String::from_utf8_lossy(&independent.stderr)
    );
    std::fs::write(
        out.join("obstructed-recovery-result.json"),
        serde_json::to_vec_pretty(&json!({
            "status":"PASS","old_manifest":publication.head.manifest_hash,
            "preparation_utc_day":preparation_utc_day,"commit_utc_day":commit_utc_day,
            "cross_utc":cross_utc,"resource_protection_checked":protect,
            "reserved_stage":reserved_stage,"partial_stage":partial_stage,
            "expired_delegate":expired_delegate,"expired_payment_position":expired_position,
            "resource_protection_probe_sha256":protect.then(|| dtr_wire::hash(&bytes("B2Z_RULES20_PROTECTION_PROBE_WASM"))),
            "recovery_manifest":recovered_publication.head.manifest_hash,
            "pending_count":pending_count,"grant_position":position,
            "later_payment_position":later_position,"extra_pending_positions":extra_positions,
            "admitted_cursor":status(&pic, id).source.admitted_to_exclusive,
            "received_e8s_at_transition":successor.received_e8s,
            "successor_payment_position":successor_payment,
            "successor_payment_applied":true,
            "received_e8s_after_successor_payment":arena_world(&pic, id).received_e8s,
            "successor_version":successor.version
        }))
        .unwrap(),
    )
    .unwrap();
}

#[test]
#[ignore = "exact installed Rules19 predecessor and valueless Rules20 Ledger/Index cutover"]
fn rules20_paid_epoch_and_recovery() {
    let out = PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap()).join("rules20");
    std::fs::create_dir_all(&out).unwrap();
    let profile = bytes("B2Z_COST_PROFILE_WASM");
    let world = seed("two_ball").encode().unwrap();
    let digit_payer = (0..=u8::MAX)
        .map(|value| Principal::self_authenticating([value; 32]))
        .find(|p| {
            AccountIdentifier::new(p, &DEFAULT_SUBACCOUNT)
                .to_hex()
                .as_bytes()[0]
                .is_ascii_digit()
        })
        .unwrap();
    let later_payer = Principal::self_authenticating([10; 32]);
    let (pic, id, ledger, payer) = arena_setup_world_fee_clock_payers_options(
        profile,
        world,
        10_000,
        0,
        &[digit_payer, later_payer],
        true,
    );
    let compact = PathBuf::from(std::env::var("B2Z_COST_COMPACT_WASM").unwrap());
    assert_eq!(
        dtr_wire::hash(&std::fs::read(&compact).unwrap()),
        "b258ec234b9abd7db9e7b170c14e432b4d1ef2d9b2545632bddb58668a6095de"
    );
    compact_cutover(&pic, id, ledger, &compact, &out);
    // The cutover itself is a zero-time publication. Rules20 preparation
    // requires one complete predecessor gameplay interval after that epoch.
    playability_installed::one_tick(&pic, id);
    let installed = bytes("B2Z_RULES20_INSTALLED_WASM");
    assert_eq!(
        dtr_wire::hash(&installed),
        "b19e4ba3a11339b71dc20134bcfac525f63530461f11a593d7d880eb86b5bc90"
    );
    let candidate = bytes("B2Z_RULES20_CANDIDATE_WASM");
    let predecessor_publication = observe(&pic, id).0.publication;
    upgrade_during_recovery(&pic, id, &installed).unwrap();
    assert_eq!(observe(&pic, id).0.publication, predecessor_publication);
    upgrade_during_recovery(&pic, id, &candidate).unwrap();
    assert_eq!(observe(&pic, id).0.publication, predecessor_publication);
    // Before the durable epoch, the exact installed module remains a valid
    // recovery target; after activation it must fail rather than misdecode.
    upgrade_during_recovery(&pic, id, &installed).unwrap();
    upgrade_during_recovery(&pic, id, &candidate).unwrap();
    playability_installed::prepare(&pic, id, "prepare_rules20_transition");
    let mut ready = false;
    for _ in 0..1800 {
        let raw: Vec<u8> = get_query(
            &pic,
            id,
            "rules20_transition_status",
            encode_args(()).unwrap(),
        );
        let view: serde_json::Value = dtr_wire::decode(&raw).unwrap();
        if view["transition"]["phase"] == "ready" && transition_drained(&pic, id) {
            ready = true;
            break;
        }
        advance(&pic, 1000);
    }
    assert!(
        ready,
        "Rules20 source must drain to an official Ledger/Index cutoff"
    );
    let before = arena_world(&pic, id);
    let (before_obs, before_pub) = capture(&pic, id, &out, 0);
    let source_cursor = status(&pic, id).source.admitted_to_exclusive;
    let received = before.received_e8s.clone();
    let wrong = pic
        .update_call(
            id,
            controller(),
            "commit_rules20_transition",
            candid::encode_one("00".repeat(32)).unwrap(),
        )
        .unwrap();
    assert!(
        decode_one::<Result<Vec<u8>, String>>(&wrong)
            .unwrap()
            .is_err()
    );
    assert_eq!(observe(&pic, id).0.publication, before_obs.publication);
    // A same-ID restart preserves the prepared source fence and predecessor
    // publication before the authenticated commit.
    upgrade_during_recovery(&pic, id, &candidate).unwrap();
    assert_eq!(observe(&pic, id).0.publication, before_obs.publication);
    assert!(transition_drained(&pic, id));
    let day = b2z_protocol::economy17::DAY_NS;
    let prepared_ns = pic.get_time().as_nanos_since_unix_epoch();
    let midnight = (prepared_ns / day + 1) * day;
    pic.advance_time(Duration::from_nanos(midnight - prepared_ns + 1_000_000_000));
    let _: Vec<u8> = get_result(
        &pic,
        id,
        "commit_rules20_transition",
        candid::encode_one(before_pub.head.manifest_hash.clone()).unwrap(),
    );
    let after = arena_world(&pic, id);
    let (after_obs, after_pub) = capture(&pic, id, &out, 1);
    assert_eq!(
        after,
        b2z_native::delegation_v20::migrate_at(before.clone(), midnight).unwrap()
    );
    assert_eq!(
        after.economy_formula_start_ns,
        Some(Int((midnight + 2 * day).into()))
    );
    assert_eq!(after.received_e8s, received);
    assert_eq!(status(&pic, id).source.admitted_to_exclusive, source_cursor);
    assert_eq!(after_pub.head.logical_end, before_pub.head.logical_end);
    assert_eq!(
        after_pub.head.source_to_exclusive,
        before_pub.head.source_to_exclusive
    );
    assert_ne!(after_obs.publication, before_obs.publication);
    let _: Vec<u8> = get_result(
        &pic,
        id,
        "commit_rules20_transition",
        candid::encode_one(before_pub.head.manifest_hash.clone()).unwrap(),
    );
    assert_eq!(observe(&pic, id).0.publication, after_obs.publication);
    let before_segment = before_pub
        .head
        .segment_id
        .as_ref()
        .unwrap()
        .0
        .to_string()
        .parse::<u64>()
        .unwrap();
    let retained: Vec<u8> = get_query(
        &pic,
        id,
        "retained_publication",
        candid::encode_one(before_segment).unwrap(),
    );
    assert_eq!(retained, before_obs.publication);
    let current_hash = pic
        .canister_status(id, Some(controller()))
        .unwrap()
        .module_hash;
    assert!(upgrade_during_recovery(&pic, id, &installed).is_err());
    assert_eq!(
        pic.canister_status(id, Some(controller()))
            .unwrap()
            .module_hash,
        current_hash
    );
    assert_eq!(observe(&pic, id).0.publication, after_obs.publication);
    upgrade_during_recovery(&pic, id, &candidate).unwrap();
    assert_eq!(observe(&pic, id).0.publication, after_obs.publication);
    // Midnight crossed while the predecessor clock was paused. Observe and
    // independently verify the first successor economy checkpoint in order.
    for _ in 0..120 {
        advance(&pic, 1000);
        if observe(&pic, id).1.version == 9 {
            break;
        }
    }
    let (_, midnight_pub) = capture(&pic, id, &out, 2);
    assert_eq!(midnight_pub.version, 9);
    assert_eq!(midnight_pub.head.logical_end, after_pub.head.logical_end);
    assert_eq!(
        arena_world(&pic, id).economy_formula_start_ns,
        after.economy_formula_start_ns
    );
    playability_installed::configuration(&pic, id, 512);
    let position = transfer_text(&pic, ledger, payer, id, 1_000_000, b"NEW 0 1");
    let account = AccountIdentifier::new(&payer, &DEFAULT_SUBACCOUNT).to_hex();
    let previous_cannons = after.cannons.len();
    let mut applied = false;
    for _ in 0..240 {
        advance(&pic, 1000);
        let current = arena_world(&pic, id);
        if status(&pic, id).source.admitted_to_exclusive > position
            && current.cannons.len() == previous_cannons + 1
            && current.cannons.iter().any(|c| c.account == account)
        {
            assert_eq!(current.received_e8s.0, &received.0 + 1_000_000u64);
            applied = true;
            break;
        }
    }
    assert!(
        applied,
        "successor must execute a real indexed Ledger Join after activation"
    );
    let (_, paid_pub) = capture(&pic, id, &out, 3);
    let paid_events: Value = decode(&std::fs::read(out.join("3-events.bin")).unwrap()).unwrap();
    assert!(
        paid_events["events"]
            .as_array()
            .unwrap()
            .iter()
            .any(|event| event["kind"] == "purchase_completed" && event["status"] == "applied")
    );
    let save_inputs = |position: u64, ordinal: u64| {
        let expected = BTreeMap::from([(position, ("ACCEPTED".into(), 0, None))]);
        let inputs = super::delegation_installed::official_inputs(&pic, id, &expected)
            .into_iter()
            .map(|(payment, _)| b2z_native::Input {
                position: Int(payment.position.into()),
                payload_hex: hex(&payment.encode().unwrap()),
            })
            .collect::<Vec<_>>();
        std::fs::write(
            out.join(format!("{ordinal}-inputs.bin")),
            dtr_wire::encode(&inputs).unwrap(),
        )
        .unwrap();
    };
    save_inputs(position, 3);

    // The exact old module cannot publish this valid account as a map key.
    // Schema12 must apply and publish the genuine indexed grant as a row.
    let digit_account = AccountIdentifier::new(&digit_payer, &DEFAULT_SUBACCOUNT).to_hex();
    assert!(digit_account.as_bytes()[0].is_ascii_digit());
    let grant_memo = b2z_protocol::delegation::encode_authorization(
        &b2z_protocol::delegation::AuthorizationMemo::Grant(
            Principal::self_authenticating([77; 32]).as_slice().to_vec(),
        ),
    )
    .unwrap();
    let grant_position = transfer_text(&pic, ledger, digit_payer, id, 0, &grant_memo);
    let mut grant_applied = false;
    for _ in 0..300 {
        advance(&pic, 1000);
        let current = arena_world(&pic, id);
        let stored = match current.authorization.as_ref().unwrap() {
            b2z_native::delegation_v20::AuthorizationState::Rows(rows) => {
                rows.grants.iter().any(|row| row.account == digit_account)
            }
            _ => false,
        };
        if status(&pic, id).source.admitted_to_exclusive > grant_position && stored {
            assert!(status(&pic, id).run.last_error.is_none());
            grant_applied = true;
            break;
        }
    }
    assert!(
        grant_applied,
        "digit-leading grant must publish and remain usable"
    );
    let (_, grant_pub) = capture(&pic, id, &out, 4);
    save_inputs(grant_position, 4);

    // A subsequent independent payer must progress after the repaired grant.
    let later_account = AccountIdentifier::new(&later_payer, &DEFAULT_SUBACCOUNT).to_hex();
    let later_position = transfer_text(&pic, ledger, later_payer, id, 1_000_000, b"NEW 0 1");
    let mut later_applied = false;
    for _ in 0..300 {
        advance(&pic, 1000);
        let current = arena_world(&pic, id);
        if status(&pic, id).source.admitted_to_exclusive > later_position
            && current.cannons.iter().any(|c| c.account == later_account)
            && current.received_e8s.0 == &received.0 + 2_000_000u64
        {
            assert!(status(&pic, id).run.last_error.is_none());
            later_applied = true;
            break;
        }
    }
    assert!(
        later_applied,
        "later unrelated indexed payment must publish"
    );
    let (_, later_pub) = capture(&pic, id, &out, 5);
    save_inputs(later_position, 5);
    let independent = std::process::Command::new("node")
        .current_dir(Path::new(env!("CARGO_MANIFEST_DIR")).join("../.."))
        .arg("tools/verify_rules20_installed_replay.mjs")
        .arg(&out)
        .arg("5")
        .output()
        .unwrap();
    assert!(
        independent.status.success(),
        "independent successor replay: {}{}",
        String::from_utf8_lossy(&independent.stdout),
        String::from_utf8_lossy(&independent.stderr)
    );
    std::fs::write(
        out.join("results.json"),
        serde_json::to_vec_pretty(&json!({
            "status":"PASS","scope":"disposable exact Rules19 same-ID upgrade, authenticated Rules20 epoch, genuine Ledger/Index payments and digit-leading grant",
            "installed_wasm_sha256":dtr_wire::hash(&installed),
            "candidate_wasm_sha256":dtr_wire::hash(&candidate),
            "predecessor_publication_sha256":dtr_wire::hash(&before_obs.publication),
            "successor_publication_sha256":dtr_wire::hash(&after_obs.publication),
            "source_cursor_at_cutover":source_cursor,
            "post_cutover_payment_position":position,
            "post_cutover_publication":paid_pub.head.segment_id,
            "digit_leading_grant_position":grant_position,
            "digit_leading_grant_publication":grant_pub.head.segment_id,
            "later_unrelated_payment_position":later_position,
            "later_unrelated_publication":later_pub.head.segment_id,
            "old_module_rejected_after_epoch":true,
            "same_candidate_recovery":true,
        })).unwrap(),
    ).unwrap();
}

#[test]
#[ignore = "disposable authenticated Rules20 high-population Ledger/Index tariff"]
fn rules20_paid_symbolic_population() {
    run_rules20_paid_symbolic_population(1001, Some(2_000_000_000), false);
}

#[test]
#[ignore = "disposable authenticated Rules20 threshold Ledger/Index tariff"]
fn rules20_paid_threshold_population() {
    run_rules20_paid_symbolic_population(1000, Some(1_000_000_000), false);
}

#[test]
#[ignore = "disposable authenticated Rules20 second doubling Ledger/Index tariff"]
fn rules20_paid_second_doubling_population() {
    run_rules20_paid_symbolic_population(1002, Some(4_000_000_000), false);
}

#[test]
#[ignore = "disposable authenticated Rules20 unrepresentable Ledger/Index tariff"]
fn rules20_paid_unrepresentable_population() {
    run_rules20_paid_symbolic_population(1035, None, false);
}

#[test]
#[ignore = "disposable authenticated first exponential grace Ledger/Index payment"]
fn rules20_paid_first_exponential_grace() {
    run_rules20_paid_symbolic_population(1001, Some(1_000_000), true);
}

#[test]
#[ignore = "disposable authenticated overflow-current linear grace Ledger/Index payment"]
fn rules20_paid_overflow_grace() {
    run_rules20_paid_symbolic_population(1035, Some(1_000_000), true);
}

fn run_rules20_paid_symbolic_population(target: u32, exact_price: Option<u64>, grace: bool) {
    let expect_applied = exact_price.is_some();
    let out = PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap())
        .join(format!("rules20-symbolic-population-{target}"));
    std::fs::create_dir_all(&out).unwrap();
    let population = seed_symbolic_population(target);
    let payer = Principal::self_authenticating([99; 32]);
    let (pic, id, ledger, payer) = arena_setup_world_fee_clock_payers_options(
        bytes("B2Z_COST_PROFILE_WASM"),
        population.encode().unwrap(),
        10_000,
        0,
        &[payer],
        true,
    );
    let compact = PathBuf::from(std::env::var("B2Z_COST_COMPACT_WASM").unwrap());
    compact_cutover(&pic, id, ledger, &compact, &out);
    playability_installed::one_tick(&pic, id);
    let candidate = bytes("B2Z_RULES20_CANDIDATE_WASM");
    upgrade_during_recovery(&pic, id, &candidate).unwrap();
    playability_installed::prepare(&pic, id, "prepare_rules20_transition");
    let mut ready = false;
    for _ in 0..1800 {
        let raw: Vec<u8> = get_query(
            &pic,
            id,
            "rules20_transition_status",
            encode_args(()).unwrap(),
        );
        let view: serde_json::Value = dtr_wire::decode(&raw).unwrap();
        if view["transition"]["phase"] == "ready" && transition_drained(&pic, id) {
            ready = true;
            break;
        }
        advance(&pic, 1000);
    }
    assert!(ready, "high-population source must drain before epoch");
    let (_, before_pub) = capture(&pic, id, &out, 0);
    let _: Vec<u8> = get_result(
        &pic,
        id,
        "commit_rules20_transition",
        candid::encode_one(before_pub.head.manifest_hash).unwrap(),
    );
    let after = arena_world(&pic, id);
    assert_eq!(after.version, 12);
    assert_eq!(b2z_native::economy17::population(&after), target);
    let formula_start =
        b2z_native::playability::elapsed(after.economy_formula_start_ns.as_ref().unwrap()).unwrap();
    let first_boundary = formula_start - b2z_protocol::economy17::DAY_NS;
    let now = pic.get_time().as_nanos_since_unix_epoch();
    assert!(now < first_boundary);
    advance(&pic, (first_boundary + 1_000_000_000 - now) / 1_000_000);
    playability_installed::one_tick(&pic, id);
    let observed = arena_world(&pic, id);
    assert_eq!(
        observed
            .economy
            .as_ref()
            .unwrap()
            .snapshots
            .last()
            .unwrap()
            .population,
        target
    );
    let now = pic.get_time().as_nanos_since_unix_epoch();
    assert!(now < formula_start);
    // Isolate the current formula. A separate grace test must exercise
    // fallback to the previous linear tariff for the same valid payment.
    let block_offset = if grace {
        1_000_000_000
    } else {
        b2z_protocol::economy17::GRACE_NS + 1_000_000_000
    };
    advance(&pic, (formula_start + block_offset - now) / 1_000_000);
    let live_population = b2z_native::economy17::population(&arena_world(&pic, id));
    assert!(
        live_population < target,
        "expired dormant accounts must lower the live population"
    );
    let (_, before_payment) = capture(&pic, id, &out, 1);
    let amount = exact_price.unwrap_or(2_000_000_000);
    let position = transfer_text(&pic, ledger, payer, id, amount, b"NEW 0 1");
    let before_cannons = observed.cannons.len();
    let mut indexed = false;
    for _ in 0..600 {
        advance(&pic, 1000);
        if status(&pic, id).source.admitted_to_exclusive > position {
            assert_eq!(arena_world(&pic, id).cannons.len(), before_cannons);
            indexed = true;
            break;
        }
    }
    assert!(indexed, "paused source must index the genuine payment");
    if grace {
        // The original Ledger block time remains within the linear grace
        // window even though execution starts after that window has closed.
        advance(
            &pic,
            (b2z_protocol::economy17::GRACE_NS + 1_000_000_000) / 1_000_000,
        );
        assert!(
            pic.get_time().as_nanos_since_unix_epoch()
                > formula_start + b2z_protocol::economy17::GRACE_NS
        );
    }
    let before_segments = status(&pic, id).run.completed_segments;
    playability_installed::configuration(&pic, id, 512);
    let mut published = false;
    for _ in 0..600 {
        advance(&pic, 1000);
        let current = arena_world(&pic, id);
        if status(&pic, id).run.completed_segments > before_segments {
            assert!(status(&pic, id).run.last_error.is_none());
            assert_eq!(
                current.cannons.len(),
                before_cannons + usize::from(expect_applied)
            );
            published = true;
            break;
        }
    }
    assert!(
        published,
        "authentic high-population Ledger receipt must publish"
    );
    let (_, paid_pub) = capture(&pic, id, &out, 2);
    let paid_events: Value = decode(&std::fs::read(out.join("2-events.bin")).unwrap()).unwrap();
    let receipt = paid_events["receipts"]
        .as_array()
        .unwrap()
        .iter()
        .find(|row| row["position"]["$integer"] == position.to_string())
        .expect("genuine payment receipt");
    assert_eq!(receipt["status"] == "applied", expect_applied);
    if grace {
        let recorded_ns = receipt["ledger_recorded_ns"]["$integer"]
            .as_str()
            .unwrap()
            .parse::<u64>()
            .unwrap();
        assert!(recorded_ns >= formula_start);
        assert!(recorded_ns < formula_start + b2z_protocol::economy17::GRACE_NS);
    }
    assert_eq!(
        receipt["price_tariff"]["formula"],
        if grace { "linear" } else { "exponential" }
    );
    if grace {
        assert_eq!(receipt["price_tariff"]["multiplier"], 1);
    } else {
        assert_eq!(receipt["price_tariff"]["population"], target);
    }
    if expect_applied {
        assert_eq!(receipt["amount_used"]["$integer"], amount.to_string());
        assert_eq!(
            receipt["per_item_prices"][0]["$integer"],
            amount.to_string()
        );
    } else {
        assert_eq!(receipt["amount_used"]["$integer"], "0");
        assert_eq!(receipt["remainder"]["$integer"], amount.to_string());
    }
    let expected = BTreeMap::from([(position, ("ACCEPTED".into(), 0, None))]);
    let inputs = super::delegation_installed::official_inputs(&pic, id, &expected)
        .into_iter()
        .map(|(payment, _)| b2z_native::Input {
            position: Int(payment.position.into()),
            payload_hex: hex(&payment.encode().unwrap()),
        })
        .collect::<Vec<_>>();
    std::fs::write(out.join("2-inputs.bin"), dtr_wire::encode(&inputs).unwrap()).unwrap();
    let independent = std::process::Command::new("node")
        .current_dir(Path::new(env!("CARGO_MANIFEST_DIR")).join("../.."))
        .arg("tools/verify_rules20_paid_segment.mjs")
        .arg(&out)
        .output()
        .unwrap();
    assert!(
        independent.status.success(),
        "independent tariff replay: {}{}",
        String::from_utf8_lossy(&independent.stdout),
        String::from_utf8_lossy(&independent.stderr)
    );
    let partial_batch = if target == 1000 && !grace {
        pause(&pic, id);
        let before_batch = arena_world(&pic, id);
        let payer_account = AccountIdentifier::new(&payer, &DEFAULT_SUBACCOUNT).to_hex();
        let player = before_batch
            .playability
            .as_ref()
            .unwrap()
            .players
            .iter()
            .find(|row| row.account == payer_account)
            .unwrap()
            .id;
        let cannon = before_batch
            .cannons
            .iter()
            .find(|row| row.account == payer_account)
            .unwrap()
            .id;
        let held = before_batch
            .balls
            .iter()
            .filter(|ball| ball.owner == player)
            .count() as u32;
        let prices = (0..3)
            .map(|n| {
                b2z_native::economy20::marginal_price(
                    b2z_protocol::economy17::BALL_BASE_E8S,
                    target,
                    held + n,
                )
                .unwrap()
            })
            .collect::<Vec<_>>();
        let amount = prices[0] + prices[1];
        assert!(amount < prices.iter().sum::<u64>());
        let memo = format!("FIRE {cannon} 0 3");
        let position = transfer_text(&pic, ledger, payer, id, amount, memo.as_bytes());
        for _ in 0..600 {
            advance(&pic, 1000);
            if status(&pic, id).source.admitted_to_exclusive > position {
                break;
            }
        }
        assert!(status(&pic, id).source.admitted_to_exclusive > position);
        let (_, prior_batch) = capture(&pic, id, &out, 3);
        let before_segments = status(&pic, id).run.completed_segments;
        playability_installed::configuration(&pic, id, 512);
        for _ in 0..600 {
            advance(&pic, 1000);
            if status(&pic, id).run.completed_segments > before_segments {
                break;
            }
        }
        assert_eq!(status(&pic, id).run.completed_segments, before_segments + 1);
        let (_, batch_pub) = capture(&pic, id, &out, 4);
        assert_eq!(
            batch_pub.head.segment_id.as_ref().unwrap(),
            &Int(&prior_batch.head.segment_id.as_ref().unwrap().0 + 1u32)
        );
        let event_log: Value = decode(&std::fs::read(out.join("4-events.bin")).unwrap()).unwrap();
        let receipt = event_log["receipts"]
            .as_array()
            .unwrap()
            .iter()
            .find(|row| row["position"]["$integer"] == position.to_string())
            .unwrap();
        assert_eq!(receipt["status"], "partially_applied");
        assert_eq!(receipt["actual_quantity"], 2);
        assert_eq!(receipt["requested_quantity"], 3);
        assert_eq!(receipt["amount_used"]["$integer"], amount.to_string());
        assert_eq!(receipt["price_tariff"]["formula"], "exponential");
        assert_eq!(receipt["price_tariff"]["population"], 1000);
        assert_eq!(
            receipt["per_item_prices"][0]["$integer"],
            prices[0].to_string()
        );
        assert_eq!(
            receipt["per_item_prices"][1]["$integer"],
            prices[1].to_string()
        );
        let expected = BTreeMap::from([(position, ("ACCEPTED".into(), 0, None))]);
        let inputs = super::delegation_installed::official_inputs(&pic, id, &expected)
            .into_iter()
            .map(|(payment, _)| b2z_native::Input {
                position: Int(payment.position.into()),
                payload_hex: hex(&payment.encode().unwrap()),
            })
            .collect::<Vec<_>>();
        std::fs::write(out.join("4-inputs.bin"), dtr_wire::encode(&inputs).unwrap()).unwrap();
        let independent = std::process::Command::new("node")
            .current_dir(Path::new(env!("CARGO_MANIFEST_DIR")).join("../.."))
            .arg("tools/verify_rules20_paid_batch.mjs")
            .arg(&out)
            .output()
            .unwrap();
        assert!(
            independent.status.success(),
            "independent paid batch: {}",
            String::from_utf8_lossy(&independent.stderr)
        );
        json!({"position":position,"held_before":held,"prices":prices,"paid_e8s":amount,
            "actual_quantity":2,"requested_quantity":3,"independent_quote_and_replay":true})
    } else {
        Value::Null
    };
    std::fs::write(
        out.join("results.json"),
        serde_json::to_vec_pretty(&json!({
            "status":"PASS", "population":target, "live_population_at_payment":live_population, "payment_e8s":amount,
            "ledger_position":position, "candidate_sha256":dtr_wire::hash(&candidate),
            "formula_start_ns":formula_start, "publication":paid_pub.head.segment_id,
            "predecessor_publication":before_payment.head.segment_id,
            "receipt_tariff":if grace { "linear" } else { "exponential" },
            "grace_block_time_before_execution_after_window":grace,
            "receipt_reason":receipt["reason"],
            "applied":expect_applied, "independent_replay":true,"partial_batch":partial_batch,
        }))
        .unwrap(),
    )
    .unwrap();
}

#[test]
#[ignore = "disposable exact Rules19 to Rules20 paid construction over Balls"]
fn rules20_paid_construction_over_existing_balls() {
    run_rules20_paid_construction_over_existing_balls(false);
}

#[test]
#[ignore = "disposable installed passage exception survives same-ID restart"]
fn rules20_paid_passage_restart() {
    run_rules20_paid_construction_over_existing_balls(true);
}

fn run_rules20_paid_construction_over_existing_balls(slow_passage: bool) {
    let out =
        PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap()).join(if slow_passage {
            "rules20-passage-restart"
        } else {
            "rules20-construction"
        });
    std::fs::create_dir_all(&out).unwrap();
    let payer = Principal::self_authenticating([9; 32]);
    let account = AccountIdentifier::new(&payer, &DEFAULT_SUBACCOUNT).to_hex();
    let mut initial = seed("two_ball");
    let old_account = initial.cannons[0].account.clone();
    for cannon in &mut initial.cannons {
        assert_eq!(cannon.account, old_account);
        cannon.account = account.clone();
    }
    for player in &mut initial.playability.as_mut().unwrap().players {
        if player.account == old_account {
            player.account = account.clone();
        }
    }
    if slow_passage {
        let time = initial.time.0.to_integer();
        for ball in &mut initial.balls {
            let x = ball.cell % initial.width;
            let y = ball.cell / initial.width;
            ball.den = Some(Int(1.into()));
            ball.x0 = Int(Int((x * 1024 + 512).into()).0 - &time);
            ball.y0 = Int((y * 1024 + 512).into());
            ball.vx = 1;
            ball.vy = 0;
        }
        initial.validate().unwrap();
    }
    let (pic, id, ledger, actual_payer) = arena_setup_world_fee_clock_payers_options(
        bytes("B2Z_COST_PROFILE_WASM"),
        initial.encode().unwrap(),
        10_000,
        0,
        &[],
        true,
    );
    assert_eq!(actual_payer, payer);
    let compact = PathBuf::from(std::env::var("B2Z_COST_COMPACT_WASM").unwrap());
    compact_cutover(&pic, id, ledger, &compact, &out);
    playability_installed::one_tick(&pic, id);
    let installed = bytes("B2Z_RULES20_INSTALLED_WASM");
    assert_eq!(
        dtr_wire::hash(&installed),
        "b19e4ba3a11339b71dc20134bcfac525f63530461f11a593d7d880eb86b5bc90"
    );
    let candidate = bytes("B2Z_RULES20_CANDIDATE_WASM");
    upgrade_during_recovery(&pic, id, &installed).unwrap();
    upgrade_during_recovery(&pic, id, &candidate).unwrap();
    playability_installed::prepare(&pic, id, "prepare_rules20_transition");
    let mut ready = false;
    for _ in 0..1800 {
        let raw: Vec<u8> = get_query(
            &pic,
            id,
            "rules20_transition_status",
            encode_args(()).unwrap(),
        );
        let view: serde_json::Value = dtr_wire::decode(&raw).unwrap();
        if view["transition"]["phase"] == "ready" && transition_drained(&pic, id) {
            ready = true;
            break;
        }
        advance(&pic, 1000);
    }
    assert!(ready);
    let (_, prior) = capture(&pic, id, &out, 0);
    let _: Vec<u8> = get_result(
        &pic,
        id,
        "commit_rules20_transition",
        candid::encode_one(prior.head.manifest_hash).unwrap(),
    );
    let migrated = arena_world(&pic, id);
    assert_eq!(migrated.version, 12);
    pause(&pic, id);
    let ball_sites = migrated
        .balls
        .iter()
        .map(|ball| {
            assert_eq!(ball.owner, 1);
            assert_eq!(
                b2z_native::context_structures::site_reason(
                    &migrated, ball.owner, ball.cell, None, false, true
                )
                .unwrap(),
                None,
                "Rules20 must allow explicit construction on the existing Ball's cell"
            );
            (ball.id, ball.cell)
        })
        .collect::<Vec<_>>();
    assert_eq!(ball_sites.len(), 2);
    assert_ne!(ball_sites[0].1, ball_sites[1].1);
    let buy = format!("NEW 0 1 {}", ball_sites[0].1);
    let diverter = format!("DEFLECT {} N", ball_sites[1].1);
    let first = transfer_text(&pic, ledger, payer, id, 100_000_000, buy.as_bytes());
    let second = transfer_text(&pic, ledger, payer, id, 10_000_000, diverter.as_bytes());
    let mut staged = false;
    for _ in 0..300 {
        advance(&pic, 1000);
        if status(&pic, id).source.admitted_to_exclusive > second {
            staged = true;
            break;
        }
    }
    assert!(
        staged,
        "both genuine Ledger/Index inputs must be admitted while paused"
    );
    let held = arena_world(&pic, id);
    assert_eq!(
        held.balls
            .iter()
            .map(|ball| (ball.id, ball.cell))
            .collect::<Vec<_>>(),
        ball_sites
    );
    assert!(!held.cannons.iter().any(|c| c.cell == ball_sites[0].1));
    assert!(
        !held
            .deflectors
            .iter()
            .flatten()
            .any(|d| d.cell == ball_sites[1].1)
    );
    let (_, staged_publication) = capture(&pic, id, &out, 1);
    playability_installed::configuration(&pic, id, 512);
    let mut applied = false;
    for _ in 0..300 {
        advance(&pic, 1000);
        let current = arena_world(&pic, id);
        if current.cannons.iter().any(|c| c.cell == ball_sites[0].1)
            && current
                .deflectors
                .iter()
                .flatten()
                .any(|d| d.cell == ball_sites[1].1)
        {
            applied = true;
            break;
        }
    }
    assert!(
        applied,
        "both paid structures must be built over existing Ball sites"
    );
    let final_world = arena_world(&pic, id);
    assert_eq!(
        final_world.received_e8s.0,
        &migrated.received_e8s.0 + 110_000_000u64
    );
    let (_, final_publication) = capture(&pic, id, &out, 2);
    assert_eq!(
        final_publication.head.segment_id.as_ref().unwrap().0,
        &staged_publication.head.segment_id.as_ref().unwrap().0 + 1u32,
        "the paid construction capture must contain complete consecutive history"
    );
    let expected = BTreeMap::from([
        (first, ("ACCEPTED".into(), 0, None)),
        (second, ("ACCEPTED".into(), 0, None)),
    ]);
    let mut official = super::delegation_installed::official_inputs(&pic, id, &expected);
    official.sort_by_key(|(payment, _)| payment.position);
    let inputs = official
        .into_iter()
        .map(|(payment, _)| b2z_native::Input {
            position: Int(payment.position.into()),
            payload_hex: hex(&payment.encode().unwrap()),
        })
        .collect::<Vec<_>>();
    std::fs::write(out.join("2-inputs.bin"), dtr_wire::encode(&inputs).unwrap()).unwrap();
    let independent = std::process::Command::new("node")
        .current_dir(Path::new(env!("CARGO_MANIFEST_DIR")).join("../.."))
        .arg("tools/verify_rules20_installed_replay.mjs")
        .arg(&out)
        .arg("2")
        .output()
        .unwrap();
    assert!(
        independent.status.success(),
        "independent paid construction replay: {}{}",
        String::from_utf8_lossy(&independent.stdout),
        String::from_utf8_lossy(&independent.stderr)
    );
    if slow_passage {
        assert_eq!(final_world.passage_exceptions.len(), 2);
        assert_eq!(
            final_world
                .passage_exceptions
                .iter()
                .map(|row| (row.ball, row.cell))
                .collect::<Vec<_>>(),
            ball_sites
        );
        pause(&pic, id);
        upgrade_during_recovery(&pic, id, &candidate).unwrap();
        assert_eq!(arena_world(&pic, id), final_world);
        assert_eq!(
            observe(&pic, id).0.publication,
            std::fs::read(out.join("2-publication.bin")).unwrap()
        );
        playability_installed::one_tick(&pic, id);
        let after_restart = arena_world(&pic, id);
        assert_eq!(
            after_restart.passage_exceptions,
            final_world.passage_exceptions
        );
        assert_eq!(
            after_restart
                .balls
                .iter()
                .filter(|ball| ball_sites.iter().any(|(id, _)| *id == ball.id))
                .map(|ball| (ball.id, ball.cell, ball.vx, ball.vy))
                .collect::<Vec<_>>(),
            final_world
                .balls
                .iter()
                .filter(|ball| ball_sites.iter().any(|(id, _)| *id == ball.id))
                .map(|ball| (ball.id, ball.cell, ball.vx, ball.vy))
                .collect::<Vec<_>>()
        );
        let (_, restarted_publication) = capture(&pic, id, &out, 3);
        assert_eq!(
            restarted_publication.head.segment_id.as_ref().unwrap().0,
            &final_publication.head.segment_id.as_ref().unwrap().0 + 1u32
        );
        std::fs::write(
            out.join("3-inputs.bin"),
            dtr_wire::encode(&Vec::<b2z_native::Input>::new()).unwrap(),
        )
        .unwrap();
        let independent = std::process::Command::new("node")
            .current_dir(Path::new(env!("CARGO_MANIFEST_DIR")).join("../.."))
            .arg("tools/verify_rules20_installed_replay.mjs")
            .arg(&out)
            .arg("3")
            .output()
            .unwrap();
        assert!(
            independent.status.success(),
            "independent restarted passage replay: {}{}",
            String::from_utf8_lossy(&independent.stdout),
            String::from_utf8_lossy(&independent.stderr)
        );
    }
    std::fs::write(
        out.join("results.json"),
        serde_json::to_vec_pretty(&json!({
            "status":"PASS", "installed_wasm_sha256":dtr_wire::hash(&installed),
            "candidate_wasm_sha256":dtr_wire::hash(&candidate),
            "ball_sites":ball_sites,"cannon_payment_position":first,
            "diverter_payment_position":second,
            "final_publication":final_publication.head.segment_id,
            "passage_restart":slow_passage,
        }))
        .unwrap(),
    )
    .unwrap();
}
