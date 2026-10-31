//! Thin control adapter for the existing S09 normal-module/browser rehearsal.
//! Every payment below is on the owned, valueless Ledger; no dfx/mainnet calls.
use super::*;
use b2z_native::{purchases_v6, world::World};

pub(super) struct Scene {
    browser: OwnedBrowser,
    collector: LivePublications,
    live: PocketIc,
    out: PathBuf,
    capture_start: usize,
}
fn save(out: &Path, name: &str, value: &serde_json::Value) {
    std::fs::write(out.join(name), serde_json::to_vec_pretty(value).unwrap()).unwrap();
}
fn head(pic: &PocketIc, id: Principal) -> u64 {
    observe(pic, id)
        .1
        .head
        .segment_id
        .unwrap()
        .0
        .to_string()
        .parse()
        .unwrap()
}
fn account(p: Principal) -> String {
    AccountIdentifier::new(&p, &DEFAULT_SUBACCOUNT).to_hex()
}
fn resume(pic: &PocketIc, id: Principal) {
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
}
fn pause(pic: &PocketIc, id: Principal) {
    get_result::<Status>(pic, id, "pause_autonomous", encode_args(()).unwrap());
}
fn payment(
    pic: &PocketIc,
    id: Principal,
    ledger: Principal,
    payer: Principal,
    amount: u64,
    text: &str,
    inputs: &mut BTreeMap<u64, String>,
) -> u64 {
    let command = b2z_protocol::v6::parse_text(text.as_bytes()).unwrap();
    let memo = b2z_protocol::v6::encode(command).unwrap();
    let position = transfer_text(pic, ledger, payer, id, amount, text.as_bytes());
    inputs.insert(
        position,
        normalized(
            AccountIdentifier::new(&payer, &DEFAULT_SUBACCOUNT),
            amount,
            memo,
        ),
    );
    position
}
impl Scene {
    pub(super) fn start(
        pic: &PocketIc,
        id: Principal,
        ledger: Principal,
        payer: Principal,
        out: &Path,
    ) -> Self {
        let out = out.join("playability-browser");
        std::fs::create_dir(&out).unwrap();
        let before = observe(pic, id).0.publication;
        let now = pocket_ic::Time::from(std::time::SystemTime::now());
        assert!(
            pic.get_time() <= now,
            "browser setup must align only forward to real time"
        );
        pic.set_time(now);
        for _ in 0..20 {
            pic.tick();
        }
        assert_eq!(
            observe(pic, id).0.publication,
            before,
            "clock alignment cannot advance paused gameplay"
        );
        let mut live =
            PocketIc::new_from_existing_instance(pic.get_server_url(), pic.instance_id(), None);
        let gateway = live.make_live(None);
        let source = status(pic, id).source;
        let config = serde_json::json!({"network":"pocketic-local","canister_id":id.to_text(),"ledger":ledger.to_text(),"index":source.index.to_text(),"recipient":account(id),"root_key_hex":hex(&pic.root_key().unwrap()),"payer_account":account(payer),"new_player_account":account(Principal::self_authenticating([10;32])),"revival_account":account(Principal::self_authenticating([2;32]))});
        save(&out, "configuration.json", &config);
        // Required by the existing loopback proxy; the bundled adapter binds
        // its actual root/canister from configuration.json, never this label.
        save(
            &out,
            "metadata.json",
            &serde_json::json!({"network":"pocketic-local","canister_id":id.to_text(),"root_key_sha256":dtr_wire::hash(&pic.root_key().unwrap())}),
        );
        std::fs::write(out.join("root-key.der"), pic.root_key().unwrap()).unwrap();
        let log = std::fs::File::create(out.join("browser.log")).unwrap();
        let browser = OwnedBrowser(
            std::process::Command::new(std::env::var("S14_BROWSER_PYTHON").unwrap())
                .current_dir(Path::new(env!("CARGO_MANIFEST_DIR")).join("../.."))
                .args([
                    "tools/verify_s14_deployment.py",
                    "--playability-scene-only",
                    "--configuration",
                    out.join("configuration.json").to_str().unwrap(),
                    "--gateway",
                    gateway.as_str(),
                    "--output",
                    out.to_str().unwrap(),
                ])
                .stdout(log.try_clone().unwrap())
                .stderr(log)
                .spawn()
                .unwrap(),
        );
        let capture_start = head(pic, id) as usize;
        assert_eq!(capture_start, 3);
        let mut scene = Self {
            browser,
            collector: LivePublications::start(pic, id),
            live,
            out,
            capture_start,
        };
        scene.wait(pic, id, "browser-playability-ready", 120, false);
        scene
    }
    fn wait(
        &mut self,
        pic: &PocketIc,
        id: Principal,
        name: &str,
        seconds: u64,
        poll: bool,
    ) -> Vec<serde_json::Value> {
        let started = std::time::Instant::now();
        let mut rows = Vec::new();
        loop {
            let complete = self.out.join(name).exists();
            if let Some(exit) = self.browser.0.try_wait().unwrap()
                && !complete
            {
                panic!(
                    "browser exited {exit} before {name}; see {}",
                    self.out.join("browser.log").display()
                );
            }
            if poll {
                let start = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs_f64()
                    * 1000.;
                let s = status(pic, id);
                let end = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs_f64()
                    * 1000.;
                rows.push(serde_json::json!({"query_started_epoch_ms":start,"query_completed_epoch_ms":end,"completed_ticks":s.run.completed_segments}));
            }
            // A measurement completion marker must be followed by a timed
            // poll, so both sample endpoints have independent outer bounds.
            if complete {
                break;
            }
            assert!(
                started.elapsed() < Duration::from_secs(seconds),
                "browser handshake {name} timed out"
            );
            std::thread::sleep(Duration::from_millis(if poll { 500 } else { 100 }));
        }
        rows
    }
    fn committed(&mut self, pic: &PocketIc, id: Principal, last: u64, expected: &Int) -> World {
        let start = std::time::Instant::now();
        loop {
            assert!(
                start.elapsed() < Duration::from_secs(150),
                "unchanged 60s source fallback did not commit the action batch"
            );
            if let Some(exit) = self.browser.0.try_wait().unwrap() {
                panic!("browser exited {exit}; see browser.log");
            }
            let s = status(pic, id);
            assert!(s.run.last_error.is_none(), "{:?}", s.run.last_error);
            assert!(s.source.last_error.is_none(), "{:?}", s.source.last_error);
            if s.source.admitted_to_exclusive > last {
                let p = observe(pic, id).1;
                if p.head
                    .source_to_exclusive
                    .0
                    .to_string()
                    .parse::<u64>()
                    .unwrap()
                    > last
                {
                    let w = arena_world(pic, id);
                    assert_eq!(&w.received_e8s, expected);
                    return w;
                }
            }
            std::thread::sleep(Duration::from_millis(500));
        }
    }
    pub(super) fn finish(
        mut self,
        pic: &PocketIc,
        id: Principal,
        ledger: Principal,
        payer: Principal,
        initial: &World,
        inputs: &mut BTreeMap<u64, String>,
    ) {
        let dormant = arena_world(pic, id);
        assert_eq!(dormant.cannons.len(), 4);
        assert_eq!(dormant.balls.len(), 1);
        assert_eq!(
            dormant
                .playability
                .as_ref()
                .unwrap()
                .lifecycle
                .iter()
                .filter(|l| l.deadline_ns.is_some())
                .count(),
            3
        );
        save(
            &self.out,
            "phase-dormant.json",
            &serde_json::json!({"head":head(pic,id),"cannons":4,"balls":1,"dormant_cannons":[2,3,4]}),
        );
        self.wait(pic, id, "browser-dormant-checked", 60, false);
        resume(pic, id);
        self.wait(pic, id, "browser-join-prepared", 45, false);
        let new_player = Principal::self_authenticating([10; 32]);
        let revival_player = Principal::self_authenticating([2; 32]);
        let join = payment(
            pic,
            id,
            ledger,
            new_player,
            105_000_000,
            "NEW 270 1",
            inputs,
        );
        let partial = payment(pic, id, ledger, payer, 15_000_000, "FIRE 1 270 2", inputs);
        let revival = payment(
            pic,
            id,
            ledger,
            revival_player,
            10_000_000,
            "FIRE 2 90 1",
            inputs,
        );
        let expected = Int(dormant.received_e8s.0.clone() + 130_000_000u64);
        let purchased = self.committed(pic, id, revival, &expected);
        assert_eq!(purchased.cannons.len(), 5);
        assert_eq!(purchased.balls.len(), 4);
        assert!(purchased.active_cannon(2));
        save(
            &self.out,
            "phase-purchases.json",
            &serde_json::json!({"head":head(pic,id),"join":join,"partial_fire":partial,"revival":revival,"cannons":5,"balls":4}),
        );
        let polls = self.wait(pic, id, "browser-normal-complete", 150, true);
        save(
            &self.out,
            "production-polls.json",
            &serde_json::json!(polls),
        );
        self.wait(pic, id, "browser-actions-ready", 45, false);
        pause(pic, id);
        let w = arena_world(pic, id);
        let cannon = w.cannons.iter().find(|c| c.id == 1).unwrap();
        let owner = purchases_v6::player_by_account(&w, &account(payer)).unwrap();
        let sites = purchases_v6::adjacent_sites(&w, owner).unwrap();
        let site = *sites
            .iter()
            .find(|c| **c == cannon.cell + 1)
            .or_else(|| sites.first())
            .expect("legal adjacent site");
        let target = w
            .neighbors(cannon.cell)
            .into_iter()
            .filter(|c| *c != site)
            .find(|cell| {
                matches!(
                    purchases_v6::prepare(
                        &w,
                        &account(payer),
                        10_000,
                        &b2z_protocol::v6::encode(b2z_protocol::v6::Command::Move {
                            cannon: 1,
                            cell: *cell as u32
                        })
                        .unwrap(),
                        &[]
                    )
                    .unwrap(),
                    purchases_v6::Plan::Move { .. }
                )
            })
            .unwrap();
        let new = payment(
            pic,
            id,
            ledger,
            payer,
            400_000_000,
            &format!("NEW 270 1 {site}"),
            inputs,
        );
        let moved = payment(
            pic,
            id,
            ledger,
            payer,
            10_000,
            &format!("MOVE 1 {target}"),
            inputs,
        );
        let illegal = payment(
            pic,
            id,
            ledger,
            payer,
            10_000,
            &format!("MOVE 1 {}", cannon.cell),
            inputs,
        );
        let wrong = payment(pic, id, ledger, payer, 10_000_000, "FIRE 2 90 1", inputs);
        let admission = std::time::Instant::now();
        while status(pic, id).source.admitted_to_exclusive <= wrong || work(pic, id).0 < 4 {
            assert!(
                admission.elapsed() < Duration::from_secs(150),
                "paused action batch was not durably admitted"
            );
            std::thread::sleep(Duration::from_millis(500));
        }
        resume(pic, id);
        let expected = Int(expected.0 + 410_020_000u64);
        let actions = self.committed(pic, id, wrong, &expected);
        assert_eq!(actions.cannons.len(), 6);
        assert_eq!(actions.balls.len(), 5);
        assert_eq!(
            actions.cannons.iter().find(|c| c.id == 1).unwrap().cell,
            target
        );
        assert_eq!(
            actions.cannons.iter().find(|c| c.id == 6).unwrap().cell,
            site
        );
        save(
            &self.out,
            "phase-actions.json",
            &serde_json::json!({"head":head(pic,id),"new_cannon":new,"move":moved,"illegal_move":illegal,"wrong_owner":wrong,"target":target,"site":site}),
        );
        self.wait(pic, id, "browser-clock-ready", 90, false);
        self.live.stop_progress();
        // Drain only already-dispatched continuation work at the frozen IC
        // time. Quotes then share one stable authenticated head while the run
        // flag remains true. This interval is outside the real-time sample.
        for _ in 0..100 {
            if transition_drained(pic, id) {
                break;
            }
            pic.tick();
        }
        assert!(transition_drained(pic, id));
        let mut local: serde_json::Value = serde_json::from_slice(
            &std::fs::read(self.out.join("local-test-policy.json")).unwrap(),
        )
        .unwrap();
        local["host"] = serde_json::json!(self.live.url().unwrap().as_str().trim_end_matches('/'));
        save(&self.out, "agent-local-policy.json", &local);
        let result = std::process::Command::new("node")
            .current_dir(Path::new(env!("CARGO_MANIFEST_DIR")).join("../.."))
            .args([
                "tools/inspect_b2z_player.mjs",
                "--account",
                &account(payer),
                "--receipt",
                &wrong.to_string(),
                "--local-config",
                self.out.join("agent-local-policy.json").to_str().unwrap(),
            ])
            .output()
            .unwrap();
        std::fs::write(self.out.join("agent-example.json"), &result.stdout).unwrap();
        std::fs::write(self.out.join("agent-example.stderr"), &result.stderr).unwrap();
        assert!(result.status.success(), "read-only agent example failed");
        pause(pic, id);
        let before = arena_world(pic, id);
        let deadline = before
            .playability
            .as_ref()
            .unwrap()
            .lifecycle
            .iter()
            .filter_map(|l| l.deadline_ns.as_ref())
            .map(|n| n.0.to_string().parse::<u64>().unwrap())
            .max()
            .unwrap();
        assert!(before.active_cannon(2));
        let now = pic.get_time().as_nanos_since_unix_epoch();
        assert!(deadline >= now);
        pic.advance_time(Duration::from_nanos(deadline - now + 1));
        let mut expired = false;
        for _ in 0..1800 {
            pic.advance_time(Duration::from_millis(50));
            for _ in 0..4 {
                pic.tick();
            }
            let world = arena_world(pic, id);
            if world.cannons.len() == 4 {
                expired = true;
                break;
            }
        }
        assert!(expired);
        let after = arena_world(pic, id);
        assert_eq!(after.time, before.time);
        assert_eq!(after.balls, before.balls);
        assert_eq!(after.credits, before.credits);
        assert_eq!(after.received_e8s, before.received_e8s);
        assert!(after.active_cannon(2));
        assert_eq!(observe(pic, id).1.version, 9);
        save(
            &self.out,
            "phase-expiry.json",
            &serde_json::json!({"head":head(pic,id),"now_ns":pic.get_time().as_nanos_since_unix_epoch().to_string(),"expired":[3,4],"revived_survivor":2,"cannons":4,"balls":5,"logical_time_unchanged":true}),
        );
        let end = head(pic, id);
        for _ in 0..30 {
            if self
                .collector
                .since(0)
                .last()
                .unwrap()
                .head
                .segment_id
                .as_ref()
                .unwrap()
                .0
                .to_string()
                .parse::<u64>()
                .unwrap()
                >= end
            {
                break;
            }
            std::thread::sleep(Duration::from_millis(100));
        }
        let catalog = self.collector.since(0);
        assert_eq!(
            catalog
                .last()
                .unwrap()
                .head
                .segment_id
                .as_ref()
                .unwrap()
                .0
                .to_string()
                .parse::<u64>()
                .unwrap(),
            end
        );
        let mut metadata = BTreeMap::new();
        for p in &catalog {
            if let Some(epoch) = &p.epoch
                && !metadata.contains_key(&epoch.transition_hash)
            {
                let bytes: Vec<u8> = get_query(
                    pic,
                    id,
                    "epoch_metadata",
                    candid::encode_one(epoch.transition_hash.clone()).unwrap(),
                );
                assert_eq!(dtr_wire::hash(&bytes), epoch.metadata_hash);
                metadata.insert(epoch.transition_hash.clone(), hex(&bytes));
            }
        }
        save(
            &self.out,
            "replay-seed.json",
            &serde_json::json!({"status":"PASS","evidence_class":"GENUINE_DISPOSABLE_FIDUCIARY_LEDGER_INDEX_BROWSER_V6","capture_start":self.capture_start,"pre_capture_publications":&catalog[..self.capture_start],"initial_world_hex":hex(&initial.encode().unwrap()),"inputs":inputs.iter().map(|(position,payload)|serde_json::json!({"position":position.to_string(),"payload_hex":payload})).collect::<Vec<_>>(),"epoch_metadata":metadata}),
        );
        self.wait(pic, id, "browser-reconnect-ready", 240, false);
        // Declared post-capture fault: advance twenty logical publications with
        // downloads paused, then require one authenticated same-page resync.
        resume(pic, id);
        let target = status(pic, id).run.completed_segments + 20;
        for _ in 0..600 {
            pic.advance_time(Duration::from_secs(1));
            for _ in 0..8 {
                pic.tick();
            }
            if status(pic, id).run.completed_segments >= target {
                break;
            }
        }
        pause(pic, id);
        assert!(status(pic, id).run.completed_segments >= target);
        let final_world = arena_world(pic, id);
        save(
            &self.out,
            "phase-reconnect.json",
            &serde_json::json!({"head":head(pic,id),"now_ns":pic.get_time().as_nanos_since_unix_epoch().to_string(),"cannons":final_world.cannons.len(),"balls":final_world.balls.len(),"scope":"Post-capture deliberate retention gap; simulated ticks, no wall-time rate claim"}),
        );
        self.wait(pic, id, "browser-complete", 60, false);
        let exit = self.browser.0.wait().unwrap();
        assert!(exit.success());
        self.collector.finish();
        self.live.stop_live();
        save(
            &self.out,
            "installed-browser-result.json",
            &serde_json::json!({"status":"PASS","module_sha256":dtr_wire::hash(&bytes("B2Z_S14_WASM")),"wire_capture_through":end,"normal_sample_seconds":if std::env::var("B2Z_PLAYABILITY_BROWSER_ACTIONS_ONLY").as_deref()==Ok("1"){0}else{45},"consecutive_native_catalogs_through_capture":catalog.len(),"all_local_inputs":inputs.len(),"real_mainnet_operations":"NONE"}),
        );
    }
}
