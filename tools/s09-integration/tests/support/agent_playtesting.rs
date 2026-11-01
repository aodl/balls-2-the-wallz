//! One explicit agent-only local integration; exact deployed normal module and valueless ICP.
use super::*;
#[test]
#[ignore = "explicit bounded agent executor integration; never mainnet"]
fn restricted_executor_ledger_index_rehearsal() {
    let output = PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap());
    std::fs::create_dir_all(&output).unwrap();
    let repo = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    let manifest: serde_json::Value = serde_json::from_slice(
        &std::fs::read(repo.join("config/agents/players.public.json")).unwrap(),
    )
    .unwrap();
    let players: Vec<Principal> = manifest["players"]
        .as_array()
        .unwrap()
        .iter()
        .map(|p| Principal::from_text(p["principal"].as_str().unwrap()).unwrap())
        .collect();
    let module = bytes("B2Z_S14_WASM");
    assert_eq!(
        dtr_wire::hash(&module),
        "b618e4f34b429484263cd0a09efc1865d646733540ff66eec0e5f16f3b2b9a2e"
    );
    let initial = playability_installed::controls(false);
    let (pic, id, ledger, _) = arena_setup_world_fee_clock_payers(
        module,
        initial.encode().unwrap(),
        10_000,
        3600,
        &players,
    );
    playability_installed::funding_paused(&pic, id, true);
    playability_installed::one_tick(&pic, id);
    playability_installed::old_transition(&pic, id, "torus");
    playability_installed::one_tick(&pic, id);
    playability_installed::old_transition(&pic, id, "million");
    // V6 activation requires a sealed v5 gameplay head, not the v5 checkpoint itself.
    playability_installed::one_tick(&pic, id);
    for _ in 0..4 {
        if transition_drained(&pic, id) {
            break;
        }
        playability_installed::one_tick(&pic, id);
    }
    playability_installed::prepare(&pic, id, "prepare_playability_transition");
    for _ in 0..1800 {
        let raw: Vec<u8> = get_query(
            &pic,
            id,
            "playability_transition_status",
            encode_args(()).unwrap(),
        );
        let view: serde_json::Value = decode(&raw).unwrap();
        if view["transition"]["phase"] == "ready" && transition_drained(&pic, id) {
            break;
        }
        pic.advance_time(Duration::from_millis(50));
        for _ in 0..4 {
            pic.tick();
        }
    }
    let _: Vec<u8> = get_result(
        &pic,
        id,
        "commit_playability_transition",
        candid::encode_one(observe(&pic, id).1.head.manifest_hash).unwrap(),
    );
    assert_eq!(arena_world(&pic, id).version, 6);
    let now = pocket_ic::Time::from(std::time::SystemTime::now());
    assert!(pic.get_time() <= now);
    pic.set_time(now);
    for _ in 0..20 {
        pic.tick();
    }
    playability_installed::configuration(&pic, id, 512);
    let mut live =
        PocketIc::new_from_existing_instance(pic.get_server_url(), pic.instance_id(), None);
    let gateway = live.make_live(None);
    let s = status(&pic, id).source;
    let config = serde_json::json!({"network":"pocketic-local","host":gateway.as_str(),"canister_id":id.to_text(),"ledger":ledger.to_text(),"index":s.index.to_text(),"recipient":AccountIdentifier::new(&id,&DEFAULT_SUBACCOUNT).to_hex(),"root_key_hex":hex(&pic.root_key().unwrap()),"controlled_fixture_accounts":arena_world(&pic,id).cannons.iter().map(|c|c.account.clone()).collect::<Vec<_>>()});
    let config_path = output.join("local-config.json");
    std::fs::write(&config_path, serde_json::to_vec_pretty(&config).unwrap()).unwrap();
    let cycles = pic.cycle_balance(id);
    let started = std::time::Instant::now();
    let log = std::fs::File::create(output.join("agent-executor.log")).unwrap();
    let status = std::process::Command::new("node")
        .current_dir(&repo)
        .args([
            "tools/test_b2z_executor_installed.mjs",
            config_path.to_str().unwrap(),
            output.to_str().unwrap(),
        ])
        .stdout(log.try_clone().unwrap())
        .stderr(log)
        .status()
        .unwrap();
    let remaining = pic.cycle_balance(id);
    std::fs::write(output.join("installed-cost.json"),serde_json::to_vec_pretty(&serde_json::json!({"status":if status.success(){"PASS"}else{"FAIL"},"module_sha256":"b618e4f34b429484263cd0a09efc1865d646733540ff66eec0e5f16f3b2b9a2e","net_cycles":(cycles as i128-remaining as i128).to_string(),"wall_seconds":started.elapsed().as_secs_f64(),"scope":"One disposable fixture with real upstream Ledger/Index, signed ordinary identities, no mainnet funds or sustained throughput claim"})).unwrap()).unwrap();
    assert!(status.success(), "Inspect preserved agent-executor.log");
}
