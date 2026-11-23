//! TEMPORARY DEVELOPMENT ONLY — REMOVE BEFORE PUBLIC LAUNCH
use super::*;

#[derive(CandidType, Deserialize, Debug)]
pub(super) struct DevSpeed {
    pub(super) mode: String,
    pub(super) adaptive_tier: String,
    pub(super) remaining_seconds: u16,
    admission_open: bool,
    last_stop: Option<String>,
}

pub(super) fn bind(pic: &PocketIc, id: Principal, operator: Option<Principal>) {
    get_result::<()>(
        pic,
        id,
        "bind_dev_speed_operator",
        candid::encode_one(operator).unwrap(),
    );
}

pub(super) fn switch(
    pic: &PocketIc,
    id: Principal,
    caller: Principal,
    full: bool,
    duration: Option<u16>,
) -> Result<DevSpeed, String> {
    let reply = pic
        .update_call(
            id,
            caller,
            "set_dev_simulation_speed",
            encode_args((full, duration)).unwrap(),
        )
        .unwrap();
    decode_one(&reply).unwrap()
}

pub(super) fn certify_frontend(release: &Path, out: &Path) {
    let mut pic = PocketIcBuilder::new()
        .with_nns_subnet()
        .with_application_subnet()
        .with_server_url(
            std::env::var("POCKET_IC_SERVER_URL")
                .unwrap()
                .parse()
                .unwrap(),
        )
        .build();
    let frontend = create_controlled(&pic);
    pic.add_cycles(frontend, 100_000_000_000_000);
    pic.install_canister(
        frontend,
        std::fs::read(release.join("frontend.wasm")).unwrap(),
        encode_args(()).unwrap(),
        Some(controller()),
    );
    let gateway = pic.make_live(None);
    let loopback = format!("http://127.0.0.1:{}", gateway.port().unwrap());
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    let status = std::process::Command::new("node")
        .current_dir(root)
        .arg("tools/verify_embedded_frontend_http.mjs")
        .arg(loopback)
        .arg(frontend.to_text())
        .arg(release)
        .arg(out.join("developer-speed-certified-frontend.json"))
        .status()
        .unwrap();
    pic.stop_live();
    assert!(
        status.success(),
        "exact developer frontend IC HTTP certification"
    );
}

#[test]
#[ignore = "explicit embedded developer frontend certification"]
fn dev_speed_certifies_embedded_frontend() {
    let release = PathBuf::from(std::env::var_os("B2Z_DEV_SPEED_FRONTEND").unwrap());
    let out = PathBuf::from(std::env::var_os("S14_DEPLOYMENT_OUTPUT").unwrap());
    std::fs::create_dir_all(&out).unwrap();
    certify_frontend(&release, &out);
}

#[test]
#[ignore = "explicit isolated development-speed rehearsal"]
fn dev_speed_switches_authoritative_pace_and_preserves_replay() {
    let mut world = pace_world();
    // The historic helper used a 16-column setup. This fixture derives the
    // cell from the current golden world and keeps the exact ball position.
    let cell = 2 * world.width + 10;
    world.cannons[0].cell = cell;
    world.balls[0].cell = cell;
    world.cannons[0].account = AccountIdentifier::new(
        &Principal::self_authenticating([9; 32]),
        &DEFAULT_SUBACCOUNT,
    )
    .to_hex();
    let initial = world.encode().unwrap();
    let wasm = bytes("B2Z_DEV_SPEED_WASM");
    let (pic, id, ledger, payer) = arena_setup_world(wasm.clone(), initial.clone());
    playability_installed::funding_paused(&pic, id, true);
    get_result::<Status>(
        &pic,
        id,
        "test_liquid_budget",
        candid::encode_one(2_350_000_000_000u64).unwrap(),
    );
    let genesis = observe(&pic, id).1;
    let mut replay = Coordinator::create(
        &initial,
        genesis.identity,
        0,
        0,
        "00".repeat(32),
        B2zHostKernel,
    )
    .unwrap();
    #[derive(CandidType, Deserialize)]
    struct Settings {
        segment_ticks: u64,
        pacing_seconds: u32,
        work_budget: u32,
    }
    #[derive(CandidType, Deserialize)]
    struct Operational {
        run: Settings,
    }
    let settings =
        || get_query::<Operational>(&pic, id, "lab_status", encode_args(()).unwrap()).run;
    let read = || get_query::<DevSpeed>(&pic, id, "dev_simulation_speed", encode_args(()).unwrap());
    let operator = Principal::self_authenticating([27; 32]);
    assert_ne!(operator, controller());
    let set = |full, duration| switch(&pic, id, operator, full, duration).unwrap();
    let unauthorized = pic
        .update_call(
            id,
            payer,
            "bind_dev_speed_operator",
            candid::encode_one(Some(payer)).unwrap(),
        )
        .unwrap();
    assert_eq!(
        decode_one::<Result<(), String>>(&unauthorized)
            .unwrap()
            .unwrap_err(),
        "controller only"
    );
    bind(&pic, id, Some(operator));
    assert_eq!(
        switch(&pic, id, payer, true, None).unwrap_err(),
        "developer speed operator only"
    );
    let hidden = pic
        .query_call(id, payer, "dev_simulation_speed", encode_args(()).unwrap())
        .unwrap();
    assert_eq!(
        decode_one::<Result<DevSpeed, String>>(&hidden)
            .unwrap()
            .unwrap_err(),
        "developer speed operator only"
    );
    let adaptive = read();
    assert_eq!(
        (&*adaptive.mode, &*adaptive.adaptive_tier),
        ("Adaptive", "Trickle")
    );
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
    let mut assigned = vec![];
    let mut last = None;
    let mut payments = BTreeMap::new();
    let mut replayed = 0;
    let mut capture = |payments: &BTreeMap<u64, String>| {
        let p = observe(&pic, id).1;
        if p.head.segment_id.is_some() && last != p.head.segment_id {
            replay_head(&pic, id, &p, &mut replay, payments, &mut assigned);
            last = p.head.segment_id;
            replayed += 1;
        }
    };
    tick(&pic);
    capture(&payments);
    let memo = b2z_protocol::encode(b2z_protocol::Command::Angle(40960));
    let payment = transfer_text(&pic, ledger, payer, id, 1_000_000_000, b"ANGLE 225");
    payments.insert(
        payment,
        normalized(
            AccountIdentifier::new(&payer, &DEFAULT_SUBACCOUNT),
            1_000_000_000,
            memo,
        ),
    );
    for _ in 0..70 {
        if status(&pic, id).source.admitted_to_exclusive > payment {
            break;
        }
        tick(&pic);
        capture(&payments);
    }
    let before = status(&pic, id);
    assert!(before.source.admitted_to_exclusive > payment);
    assert_eq!(arena_world(&pic, id).received_e8s, Int(0.into()));
    let predecessor = observe(&pic, id).0.publication;
    let started = set(true, None::<u16>);
    assert_eq!(
        (&*started.mode, started.remaining_seconds),
        ("Full Speed", 120)
    );
    assert!(started.admission_open);
    let pacing = status(&pic, id).run.pace.unwrap();
    assert_eq!(
        (pacing.mode.as_str(), pacing.supported_milli),
        ("Normal", 1000)
    );
    assert_eq!(observe(&pic, id).0.publication, predecessor);
    let phase_start = pic.get_time();
    let mut ticks = vec![];
    for _ in 0..40 {
        pic.advance_time(Duration::from_millis(100));
        for _ in 0..4 {
            pic.tick();
        }
        capture(&payments);
        let count = status(&pic, id).run.completed_segments;
        if count > before.run.completed_segments + ticks.len() as u64 {
            assert_eq!(
                count,
                before.run.completed_segments + ticks.len() as u64 + 1
            );
            ticks.push(
                (pic.get_time().as_nanos_since_unix_epoch()
                    - phase_start.as_nanos_since_unix_epoch())
                    / 1_000_000,
            );
        }
        if ticks.len() == 3 {
            break;
        }
    }
    assert_eq!(ticks.len(), 3);
    assert!(
        ticks
            .windows(2)
            .all(|w| w[1] - w[0] >= 1_000 && w[1] - w[0] <= 1_100),
        "{ticks:?}"
    );
    assert_eq!(
        arena_world(&pic, id).received_e8s,
        Int(1_000_000_000u64.into())
    );
    let current = observe(&pic, id).0.publication;
    let stopped = set(false, None::<u16>);
    assert_eq!(stopped.mode, "Adaptive");
    assert_eq!(stopped.last_stop.as_deref(), Some("manual"));
    assert_eq!(observe(&pic, id).0.publication, current);
    assert_eq!(
        status(&pic, id).run.pace.as_ref().unwrap().supported_milli,
        10
    );

    assert_eq!(set(true, Some(2u16)).remaining_seconds, 2);
    let clock = pic.get_time();
    while pic.get_time().as_nanos_since_unix_epoch()
        < clock.as_nanos_since_unix_epoch() + 2_100_000_000
    {
        pic.advance_time(Duration::from_millis(100));
        for _ in 0..4 {
            pic.tick();
        }
        capture(&payments);
    }
    let expired = read();
    assert_eq!(expired.mode, "Adaptive");
    assert_eq!(expired.last_stop.as_deref(), Some("window-expired"));
    let prior = observe(&pic, id).0.publication;
    assert_eq!(set(true, None).remaining_seconds, 120);
    bind(&pic, id, None);
    assert_eq!(read().mode, "Adaptive");
    assert_eq!(observe(&pic, id).0.publication, prior);
    assert_eq!(
        switch(&pic, id, operator, true, None).unwrap_err(),
        "developer speed operator only"
    );
    bind(&pic, id, Some(operator));

    let saved = observe(&pic, id).0.publication;
    let finance = funding_tests::preserved_finance(&pic, id);
    let before_restart = status(&pic, id);
    let before_settings = settings();
    assert_eq!(set(true, Some(120u16)).mode, "Full Speed");
    pic.upgrade_canister(id, wasm, encode_args(()).unwrap(), Some(controller()))
        .unwrap();
    assert_eq!(read().mode, "Adaptive");
    assert_eq!(
        switch(&pic, id, operator, true, None).unwrap_err(),
        "developer speed operator only"
    );
    bind(&pic, id, Some(operator));
    assert_eq!(observe(&pic, id).0.publication, saved);
    assert_eq!(funding_tests::preserved_finance(&pic, id), finance);
    assert_eq!(
        status(&pic, id).source.admitted_to_exclusive,
        before_restart.source.admitted_to_exclusive
    );
    let after_settings = settings();
    assert_eq!(after_settings.segment_ticks, before_settings.segment_ticks);
    assert_eq!(after_settings.work_budget, before_settings.work_budget);
    assert_eq!(
        after_settings.pacing_seconds,
        before_settings.pacing_seconds
    );

    assert_eq!(set(true, Some(120u16)).mode, "Full Speed");
    get_result::<Status>(
        &pic,
        id,
        "test_liquid_budget",
        candid::encode_one(999_000_000_000u64).unwrap(),
    );
    let protected = read();
    assert_eq!(
        (&*protected.mode, &*protected.adaptive_tier),
        ("Adaptive", "ReserveProtection")
    );
    assert!(!protected.admission_open);
    assert_eq!(protected.last_stop.as_deref(), Some("recovery-reserve"));
    let protected_head = observe(&pic, id).0.publication;
    for _ in 0..3 {
        tick(&pic);
    }
    assert_eq!(observe(&pic, id).0.publication, protected_head);
    assert_eq!(assigned, [payment]);
    let out = PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap());
    std::fs::create_dir_all(&out).unwrap();
    std::fs::write(
        out.join("dev-speed.json"),
        serde_json::to_vec_pretty(&serde_json::json!({
            "status":"PASS","scope":"isolated development build on disposable PocketIC",
            "full_speed_commit_milliseconds":ticks,"checkout_replay_segments":replayed,
            "ledger_receipt_position":payment,"controller_only_binding":true,"operator_only_toggle":true,
            "binding_revocation":true,"expiration":true,
            "manual_deactivation":true,"restart_restores_adaptive":true,"reserve_protection":true
        }))
        .unwrap(),
    )
    .unwrap();
}
