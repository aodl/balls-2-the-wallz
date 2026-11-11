//! Actual pinned disposable ICP Ledger/Index wire proof. Caller principals here
//! are PocketIC callers, not an Internet Identity/browser signing claim.
use super::*;
use candid::Nat;
#[derive(CandidType)]
struct Approve {
    from_subaccount: Option<Vec<u8>>,
    spender: IcrcAccount,
    amount: Nat,
    expected_allowance: Option<Nat>,
    expires_at: Option<u64>,
    fee: Option<Nat>,
    memo: Option<Vec<u8>>,
    created_at_time: Option<u64>,
}
#[derive(CandidType)]
struct Pull {
    spender_subaccount: Option<Vec<u8>>,
    from: IcrcAccount,
    to: IcrcAccount,
    amount: Nat,
    fee: Option<Nat>,
    memo: Option<Vec<u8>>,
    created_at_time: Option<u64>,
}
#[derive(CandidType, Deserialize, Debug)]
enum Error {
    BadFee { expected_fee: Nat },
    BadBurn { min_burn_amount: Nat },
    InsufficientFunds { balance: Nat },
    InsufficientAllowance { allowance: Nat },
    AllowanceChanged { current_allowance: Nat },
    Expired { ledger_time: u64 },
    TooOld,
    CreatedInFuture { ledger_time: u64 },
    Duplicate { duplicate_of: Nat },
    TemporarilyUnavailable,
    GenericError { error_code: Nat, message: String },
}
fn call<T: CandidType>(
    p: &PocketIc,
    l: Principal,
    who: Principal,
    m: &str,
    arg: T,
) -> Result<Nat, Error> {
    decode_one(
        &p.update_call(l, who, m, candid::encode_one(arg).unwrap())
            .unwrap(),
    )
    .unwrap()
}
fn acct(owner: Principal) -> IcrcAccount {
    IcrcAccount {
        owner,
        subaccount: None,
    }
}
fn num(n: Nat) -> u64 {
    n.0.to_string().parse().unwrap()
}
#[test]
#[ignore = "experimental delegated-payment qualification; explicit dedicated invocation"]
fn icrc2_actual_ledger_index_preserves_funder_spender_memo_and_zero_grant() {
    let pic = PocketIcBuilder::new()
        .with_nns_subnet()
        .with_application_subnet()
        .with_server_url(
            std::env::var("POCKET_IC_SERVER_URL")
                .unwrap()
                .parse()
                .unwrap(),
        )
        .build();
    pic.set_time(std::time::SystemTime::now().into());
    let a = Principal::self_authenticating([1; 32]);
    let s = Principal::self_authenticating([2; 32]);
    let g = Principal::self_authenticating([3; 32]);
    let ledger = deploy_ledger_options(&pic, &bytes("ICP_LEDGER_WASM"), &[a], 12345, true);
    let fee: Nat = decode_one(
        &pic.query_call(
            ledger,
            Principal::anonymous(),
            "icrc1_fee",
            encode_args(()).unwrap(),
        )
        .unwrap(),
    )
    .unwrap();
    assert_eq!(num(fee.clone()), 12345);
    let index = create_controlled(&pic);
    pic.add_cycles(index, 100_000_000_000_000);
    pic.install_canister(
        index,
        bytes("ICP_INDEX_WASM"),
        candid::encode_one(Some(IndexArg::Init(IndexInit {
            ledger_id: ledger,
            retrieve_blocks_from_ledger_interval_seconds: Some(1),
        })))
        .unwrap(),
        Some(controller()),
    );
    let now = pic.get_time().as_nanos_since_unix_epoch();
    let grant = b2z_protocol::delegation::encode_authorization(
        &b2z_protocol::delegation::AuthorizationMemo::Grant(s.as_slice().to_vec()),
    )
    .unwrap();
    assert_eq!(grant.len(), 32);
    let direct = |memo: Vec<u8>| IcrcTransferArg {
        to: acct(g),
        fee: Some(fee.clone()),
        memo: Some(memo),
        from_subaccount: None,
        created_at_time: None,
        amount: 0u64.into(),
    };
    let grant_pos = num(
        call(&pic, ledger, a, "icrc1_transfer", direct(grant.clone()))
            .expect("zero-amount owner grant plus explicit queried fee"),
    );
    let too_long = pic.update_call(
        ledger,
        a,
        "icrc1_transfer",
        candid::encode_one(direct(vec![7; 33])).unwrap(),
    );
    assert!(too_long.is_err(), "33-byte memo must not be accepted");
    let approve = num(call(
        &pic,
        ledger,
        a,
        "icrc2_approve",
        Approve {
            from_subaccount: None,
            spender: acct(s),
            amount: 1_000_000u64.into(),
            expected_allowance: Some(0u64.into()),
            expires_at: Some(now + 3_600_000_000_000),
            fee: Some(fee.clone()),
            memo: None,
            created_at_time: None,
        },
    )
    .unwrap());
    let command = b"FIRE 1 255 2".to_vec();
    let created = pic.get_time().as_nanos_since_unix_epoch();
    let pull = || Pull {
        spender_subaccount: None,
        from: acct(a),
        to: acct(g),
        amount: 100_000u64.into(),
        fee: Some(fee.clone()),
        memo: Some(command.clone()),
        created_at_time: Some(created),
    };
    let transfer = num(call(&pic, ledger, s, "icrc2_transfer_from", pull()).unwrap());
    match call(&pic, ledger, s, "icrc2_transfer_from", pull()) {
        Err(Error::Duplicate { duplicate_of }) => assert_eq!(num(duplicate_of), transfer),
        other => panic!("dedup result {other:?}"),
    };
    let stranger = Principal::self_authenticating([4; 32]);
    assert!(matches!(
        call(&pic, ledger, stranger, "icrc2_transfer_from", pull()),
        Err(Error::InsufficientAllowance { .. })
    ));
    let recipient = AccountIdentifier::new(&g, &DEFAULT_SUBACCOUNT).to_hex();
    let funding = AccountIdentifier::new(&a, &DEFAULT_SUBACCOUNT).to_hex();
    let spending = AccountIdentifier::new(&s, &DEFAULT_SUBACCOUNT).to_hex();
    let mut history = None;
    for _ in 0..50 {
        pic.advance_time(Duration::from_secs(1));
        pic.tick();
        let h: source::HistoryResult = decode_one(
            &pic.query_call(
                index,
                Principal::anonymous(),
                "get_account_identifier_transactions",
                candid::encode_one(source::HistoryArgs {
                    account_identifier: recipient.clone(),
                    start: None,
                    max_results: 100,
                })
                .unwrap(),
            )
            .unwrap(),
        )
        .unwrap();
        if h.as_ref()
            .is_ok_and(|h| h.transactions.iter().any(|r| r.id == transfer))
        {
            history = Some(h.unwrap());
            break;
        }
    }
    let h = history.expect("official Index discovers zero grant and delegated transfer");
    let grant_row = h.transactions.iter().find(|r| r.id == grant_pos).unwrap();
    assert_eq!(grant_row.transaction.icrc1_memo.as_ref(), Some(&grant));
    assert!(
        matches!(&grant_row.transaction.operation,source::Operation::Transfer{from,spender:None,amount,..}if from==&funding&&amount.e8s==0)
    );
    let row = h.transactions.iter().find(|r| r.id == transfer).unwrap();
    assert_eq!(row.transaction.icrc1_memo.as_ref(), Some(&command));
    assert!(
        matches!(&row.transaction.operation,source::Operation::Transfer{from,to,spender:Some(who),amount,fee}if from==&funding&&to==&recipient&&who==&spending&&amount.e8s==100_000&&fee.e8s==12345)
    );
    assert_eq!(
        row.transaction
            .created_at_time
            .as_ref()
            .unwrap()
            .timestamp_nanos,
        created
    );
    assert!(row.transaction.timestamp.is_some());
    assert!(!h.transactions.iter().any(|r| r.id == approve));
    let encoded: candid::Result<Vec<u8>> =
        candid::encode_one(Ok::<_, source::IndexError>(h.clone()));
    super::delegation_wire::check(&encoded.unwrap()).unwrap();
    let receiver = AccountIdentifier::from_hex(&recipient).unwrap();
    let normalized = source::classify_delegation(row, &receiver)
        .unwrap()
        .unwrap();
    let input = b2z_protocol::delegation::Payment::decode(&unhex(&normalized).unwrap()).unwrap();
    assert_eq!(
        input.spender.unwrap().as_slice(),
        AccountIdentifier::new(&s, &DEFAULT_SUBACCOUNT).as_bytes()
    );
    assert_eq!(input.memo.as_ref(), Some(&command));
    assert_eq!(input.position, transfer);
    let mut registry = b2z_native::delegation_v8::Registry::empty(recipient.clone()).unwrap();
    let grant_input = b2z_protocol::delegation::Payment::decode(
        &unhex(
            &source::classify_delegation(grant_row, &receiver)
                .unwrap()
                .unwrap(),
        )
        .unwrap(),
    )
    .unwrap();
    assert_eq!(
        registry.apply(&grant_input, grant_pos).unwrap(),
        b2z_native::delegation_v8::Decision::Granted
    );
    assert_eq!(
        registry.apply(&input, transfer).unwrap(),
        b2z_native::delegation_v8::Decision::Gameplay
    );
    println!(
        "ICRC2_WIRE_RESULT {}",
        serde_json::json!({"status":"PASS","scope":"actual pinned disposable Ledger and Index; PocketIC caller identities, not browser/II signing or installed B2Z gameplay","grant_position":grant_pos,"approval_position":approve,"delegated_position":transfer,"memo_limit":32,"setup_amount_e8s":0,"queried_fee_e8s":12345,"funder":funding,"spender":spending,"recipient":recipient,"ledger_timestamp_ns":row.transaction.timestamp.as_ref().unwrap().timestamp_nanos})
    );
}
#[test]
#[ignore = "experimental delegated-payment qualification; explicit dedicated invocation"]
fn icrc2_actual_sdk_signing_and_immutable_duplicate_retry() {
    let out = PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap()).join("signed-ledger");
    std::fs::create_dir_all(&out).unwrap();
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    let log = std::fs::File::create(out.join("signer.log")).unwrap();
    let mut node = OwnedBrowser(
        std::process::Command::new("node")
            .current_dir(&root)
            .args([
                "tools/fixtures/delegated-ledger-signer.mjs",
                out.to_str().unwrap(),
            ])
            .stdout(log.try_clone().unwrap())
            .stderr(log)
            .spawn()
            .unwrap(),
    );
    let began = std::time::Instant::now();
    while !out.join("signers-public.json").exists() {
        assert!(began.elapsed() < Duration::from_secs(30));
        std::thread::sleep(Duration::from_millis(100));
    }
    let public: serde_json::Value =
        serde_json::from_slice(&std::fs::read(out.join("signers-public.json")).unwrap()).unwrap();
    let a = Principal::from_text(public["funding"].as_str().unwrap()).unwrap();
    let s = Principal::from_text(public["spender"].as_str().unwrap()).unwrap();
    assert_ne!(a, s);
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
    pic.set_time(std::time::SystemTime::now().into());
    let ledger = deploy_ledger_options(&pic, &bytes("ICP_LEDGER_WASM"), &[a], 12345, true);
    let receiver = create_controlled(&pic);
    let gateway = pic.make_live(None);
    let config = serde_json::json!({"network":"pocketic-local","ledger":ledger.to_text(),"host":gateway.as_str().trim_end_matches('/'),"canister_id":receiver.to_text(),"root_key_hex":hex(&pic.root_key().unwrap())});
    std::fs::write(
        out.join("signed-config.json"),
        serde_json::to_vec(&config).unwrap(),
    )
    .unwrap();
    let deadline = std::time::Instant::now() + Duration::from_secs(180);
    loop {
        if let Some(code) = node.0.try_wait().unwrap() {
            assert!(
                code.success(),
                "signed SDK proof failed; see {}",
                out.join("signer.log").display()
            );
            break;
        }
        assert!(
            std::time::Instant::now() < deadline,
            "bounded signing proof timed out"
        );
        std::thread::sleep(Duration::from_millis(100));
    }
    let result: serde_json::Value =
        serde_json::from_slice(&std::fs::read(out.join("signed-result.json")).unwrap()).unwrap();
    assert_eq!(result["status"], "PASS");
    assert_eq!(result["funding"], a.to_text());
    assert_eq!(result["spender"], s.to_text());
    pic.stop_live();
    println!("SIGNED_LEDGER_RESULT {}", result);
}

/// Paid predecessor upgrade, fenced adapter cutover, real upstream transfers,
/// configured grants/revocation and continued manual play. Disposable value only.
#[test]
#[ignore = "experimental delegated-payment qualification; explicit dedicated invocation"]
fn icrc2_installed_paid_upgrade_authorization_and_manual_payment() {
    let out =
        PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap()).join("installed-delegation");
    std::fs::create_dir_all(&out).unwrap();
    let prior = bytes("B2Z_DELEGATION_PRIOR_WASM");
    let module = bytes("B2Z_DELEGATION_WASM");
    assert_ne!(dtr_wire::hash(&prior), dtr_wire::hash(&module));
    let (pic, id, ledger, a) = arena_setup_world_fee_clock_payers_options(
        prior.clone(),
        initial_world(),
        12345,
        0,
        &[],
        true,
    );
    europe::activate(&pic, id);
    playability_installed::funding_paused(&pic, id, true);
    let s = Principal::self_authenticating([22; 32]);
    let stranger = Principal::self_authenticating([23; 32]);
    let fee: Nat = decode_one(
        &pic.query_call(
            ledger,
            Principal::anonymous(),
            "icrc1_fee",
            encode_args(()).unwrap(),
        )
        .unwrap(),
    )
    .unwrap();
    let direct = |memo: Vec<u8>, amount: u64| {
        num(call(
            &pic,
            ledger,
            a,
            "icrc1_transfer",
            IcrcTransferArg {
                to: acct(id),
                fee: Some(fee.clone()),
                memo: Some(memo),
                from_subaccount: None,
                created_at_time: None,
                amount: amount.into(),
            },
        )
        .unwrap())
    };
    let approve = |spender: Principal| {
        num(call(
            &pic,
            ledger,
            a,
            "icrc2_approve",
            Approve {
                from_subaccount: None,
                spender: acct(spender),
                amount: 2_000_000_000u64.into(),
                expected_allowance: Some(0u64.into()),
                expires_at: Some(pic.get_time().as_nanos_since_unix_epoch() + 3_600_000_000_000),
                fee: Some(fee.clone()),
                memo: None,
                created_at_time: None,
            },
        )
        .unwrap())
    };
    let pull = |spender: Principal, memo: Vec<u8>, amount: u64| {
        num(call(
            &pic,
            ledger,
            spender,
            "icrc2_transfer_from",
            Pull {
                spender_subaccount: None,
                from: acct(a),
                to: acct(id),
                amount: amount.into(),
                fee: Some(fee.clone()),
                memo: Some(memo),
                created_at_time: None,
            },
        )
        .unwrap())
    };
    let settle = |position: u64, label: &str| {
        // This authorization/recovery fixture deliberately keeps simulation
        // paused while the unchanged 60-second source fallback discovers the
        // payment. Do not spend dozens of unrelated physics ticks per case.
        // No cursor override, synthetic input or manual step hook is used.
        for _ in 0..120 {
            if status(&pic, id).source.admitted_to_exclusive > position {
                break;
            }
            tick(&pic);
            assert!(status(&pic, id).source.last_error.is_none());
        }
        assert!(
            status(&pic, id).source.admitted_to_exclusive > position,
            "{label} source admission deadline"
        );
        playability_installed::configuration(&pic, id, 512);
        for _ in 0..240 {
            tick(&pic);
            let st = status(&pic, id);
            assert!(
                st.source.last_error.is_none(),
                "{label} source {:?}",
                st.source.last_error
            );
            assert!(
                st.run.last_error.is_none(),
                "{label} run {:?}",
                st.run.last_error
            );
            if observe(&pic, id).1.head.source_to_exclusive > Int(position.into()) {
                break;
            }
        }
        get_result::<Status>(&pic, id, "pause_autonomous", encode_args(()).unwrap());
        let (o, p) = observe(&pic, id);
        assert!(
            p.head.source_to_exclusive > Int(position.into()),
            "{label} did not commit"
        );
        let mut artifacts = vec![];
        for (kind, d) in p.artifacts.iter().enumerate() {
            let mut body = vec![];
            for c in 0..d.chunks.len() {
                body.extend(get_query::<Vec<u8>>(
                    &pic,
                    id,
                    "artifact_chunk",
                    encode_args((dtr_wire::hash(&o.publication), kind as u8, c as u16)).unwrap(),
                ));
            }
            assert_eq!(dtr_wire::hash(&body), d.sha256);
            std::fs::write(out.join(format!("{label}-artifact-{kind}.bin")), &body).unwrap();
            artifacts.push(body);
        }
        std::fs::write(out.join(format!("{label}-publication.bin")), &o.publication).unwrap();
        let events: serde_json::Value = decode(&artifacts[1]).unwrap();
        println!("DELEGATED_INSTALLED_STAGE {label} {}", events["receipts"]);
        events
    };
    let join = direct(b"NEW 37.5 1".to_vec(), 100_000_000);
    settle(join, "direct-join");
    let old = arena_world(&pic, id);
    assert_eq!(old.cannons.len(), 1);
    assert_eq!(old.received_e8s, 100_000_000.into());
    approve(s);
    let old_rejected = pull(s, b"FIRE 1 90 1".to_vec(), 100_000_000);
    for _ in 0..120 {
        tick(&pic);
        if status(&pic, id).source.admitted_to_exclusive > old_rejected {
            break;
        }
    }
    let pending_old: playability_installed::BoundaryWork =
        get_query(&pic, id, "controller_work", encode_args(()).unwrap());
    assert!(
        pending_old.pending_inputs > 0,
        "old normalized delegated rejection must be pending during upgrade"
    );
    let before_publication = observe(&pic, id).0.publication;
    let retained = retained_bytes(&pic, id);
    let cursor = status(&pic, id).source.admitted_to_exclusive;
    pic.upgrade_canister(
        id,
        module.clone(),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    assert_eq!(
        arena_world(&pic, id).encode().unwrap(),
        old.encode().unwrap()
    );
    assert_eq!(observe(&pic, id).0.publication, before_publication);
    assert_eq!(retained_bytes(&pic, id), retained);
    assert_eq!(status(&pic, id).source.admitted_to_exclusive, cursor);
    let pending_restored: playability_installed::BoundaryWork =
        get_query(&pic, id, "controller_work", encode_args(()).unwrap());
    assert_eq!(pending_restored.pending_inputs, pending_old.pending_inputs);
    let old_events = settle(old_rejected, "old-adapter-rejected-delegate");
    assert!(format!("{old_events}").contains("MALFORMED_MEMO"));
    let boundary = arena_world(&pic, id);
    assert_eq!(boundary.received_e8s, 200_000_000.into());
    // A source grant alone does not alter history until the explicit cutover.
    playability_installed::prepare(&pic, id, "prepare_delegation_transition");
    let mut ready = false;
    for _ in 0..240 {
        tick(&pic);
        let bytes: Vec<u8> = get_query(
            &pic,
            id,
            "delegation_transition_status",
            encode_args(()).unwrap(),
        );
        let value: serde_json::Value = decode(&bytes).unwrap();
        if value["transition"]["phase"] == "ready"
            && transition_drained(&pic, id)
            && observe(&pic, id).1.head.seal.is_some()
        {
            ready = true;
            break;
        }
    }
    assert!(ready, "delegation source fence must drain");
    let _: Vec<u8> = get_result(
        &pic,
        id,
        "commit_delegation_transition",
        candid::encode_one(observe(&pic, id).1.head.manifest_hash).unwrap(),
    );
    let upgraded = arena_world(&pic, id);
    let mut stripped = upgraded.clone();
    stripped.playability.as_mut().unwrap().authorization = None;
    assert_eq!(stripped.encode().unwrap(), boundary.encode().unwrap());
    let cutover = observe(&pic, id).1;
    assert_eq!(
        cutover.identity.rules_hash,
        b2z_native::delegation_v8::identity().unwrap()["rules_hash"]
            .as_str()
            .unwrap()
    );
    approve(stranger);
    let unauthorized = pull(s, b"FIRE 1 90 1".to_vec(), 100_000_000);
    let events = settle(unauthorized, "allowance-without-game-grant");
    assert!(format!("{events}").contains("UNAUTHORIZED_SPENDER"));
    assert_eq!(
        arena_world(&pic, id).cannons[0].account,
        old.cannons[0].account
    );
    let grant = b2z_protocol::delegation::encode_authorization(
        &b2z_protocol::delegation::AuthorizationMemo::Grant(s.as_slice().to_vec()),
    )
    .unwrap();
    let gp = direct(grant, 0);
    settle(gp, "owner-grant");
    assert_eq!(
        arena_world(&pic, id)
            .playability
            .as_ref()
            .unwrap()
            .authorization
            .as_ref()
            .unwrap()
            .grants
            .len(),
        1
    );
    let paid = pull(s, b"FIRE 1 90 1".to_vec(), 100_000_000);
    for _ in 0..120 {
        tick(&pic);
        if status(&pic, id).source.admitted_to_exclusive > paid {
            break;
        }
    }
    let pending: playability_installed::BoundaryWork =
        get_query(&pic, id, "controller_work", encode_args(()).unwrap());
    assert!(
        pending.pending_inputs > 0,
        "adapter-5 normalized input pending during upgrade"
    );
    let pending_world = arena_world(&pic, id).encode().unwrap();
    let pending_publication = observe(&pic, id).0.publication;
    let pending_cursor = status(&pic, id).source.admitted_to_exclusive;
    pic.upgrade_canister(
        id,
        module.clone(),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    assert_eq!(arena_world(&pic, id).encode().unwrap(), pending_world);
    assert_eq!(observe(&pic, id).0.publication, pending_publication);
    assert_eq!(
        status(&pic, id).source.admitted_to_exclusive,
        pending_cursor
    );
    let restored: playability_installed::BoundaryWork =
        get_query(&pic, id, "controller_work", encode_args(()).unwrap());
    assert_eq!(restored.pending_inputs, pending.pending_inputs);
    let events = settle(paid, "authorized-fire");
    assert!(!format!("{events}").contains("UNAUTHORIZED_SPENDER"));
    let receipts = events["receipts"].as_array().unwrap();
    let receipt = receipts
        .iter()
        .find(|r| r["position"]["$integer"] == paid.to_string())
        .expect("published actual delegated receipt");
    assert_ne!(receipt["status"], "rejected");
    assert_eq!(receipt["account"], old.cannons[0].account);
    assert_eq!(
        receipt["spender"],
        AccountIdentifier::new(&s, &DEFAULT_SUBACCOUNT).to_hex()
    );
    let bad = pull(stranger, b"FIRE 1 90 1".to_vec(), 100_000_000);
    assert!(
        format!("{}", settle(bad, "unrelated-approved-spender")).contains("UNAUTHORIZED_SPENDER")
    );
    let revoke = direct(
        b2z_protocol::delegation::encode_authorization(
            &b2z_protocol::delegation::AuthorizationMemo::Revoke,
        )
        .unwrap(),
        0,
    );
    settle(revoke, "owner-revoke");
    let revoked = pull(s, b"FIRE 1 90 1".to_vec(), 100_000_000);
    assert!(format!("{}", settle(revoked, "revoked-spender")).contains("UNAUTHORIZED_SPENDER"));
    let manual = direct(b"FIRE 1 90 1".to_vec(), 100_000_000);
    let events = settle(manual, "manual-after-revoke");
    assert!(!format!("{events}").contains("UNAUTHORIZED_SPENDER"));
    let final_world = arena_world(&pic, id);
    assert_eq!(final_world.received_e8s, 700_000_000.into());
    let state = final_world.encode().unwrap();
    let last = observe(&pic, id).0.publication;
    let kept = retained_bytes(&pic, id);
    pic.upgrade_canister(
        id,
        module.clone(),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    assert_eq!(arena_world(&pic, id).encode().unwrap(), state);
    assert_eq!(observe(&pic, id).0.publication, last);
    assert_eq!(retained_bytes(&pic, id), kept);
    let auth = out.join("authenticated-final");
    std::fs::create_dir(&auth).unwrap();
    let (o, p) = observe(&pic, id);
    let source: Vec<u8> = get_query(&pic, id, "source_descriptor", encode_args(()).unwrap());
    std::fs::write(auth.join("source.bin"), source).unwrap();
    std::fs::write(
        auth.join("configuration.bin"),
        b2z_native::delegation_v8::configuration(),
    )
    .unwrap();
    std::fs::write(auth.join("catalog.bin"), &o.publication).unwrap();
    std::fs::write(auth.join("certificate.cbor"), o.certificate.unwrap()).unwrap();
    std::fs::write(auth.join("root-key.der"), pic.root_key().unwrap()).unwrap();
    for (kind, name) in ["state", "events", "scores"].iter().enumerate() {
        let mut body = vec![];
        for chunk in 0..p.artifacts[kind].chunks.len() {
            body.extend(get_query::<Vec<u8>>(
                &pic,
                id,
                "artifact_chunk",
                encode_args((dtr_wire::hash(&o.publication), kind as u8, chunk as u16)).unwrap(),
            ));
        }
        assert_eq!(dtr_wire::hash(&body), p.artifacts[kind].sha256);
        std::fs::write(auth.join(format!("{name}.bin")), body).unwrap();
    }
    std::fs::write(auth.join("metadata.json"),serde_json::to_vec_pretty(&serde_json::json!({"canister_id":id.to_text(),"now_ns":pic.get_time().as_nanos_since_unix_epoch().to_string(),"publication_version":p.version,"scenario":"paid-delegation-v8","source_binding_required":true,"virtual_clock":true,"ledger":ledger.to_text(),"index":status(&pic,id).source.index.to_text()})).unwrap()).unwrap();
    assert!(
        std::process::Command::new("node")
            .current_dir(Path::new(env!("CARGO_MANIFEST_DIR")).join("../.."))
            .args([
                "tools/verify_operation_cache_observation.mjs",
                auth.to_str().unwrap()
            ])
            .status()
            .unwrap()
            .success()
    );
    std::fs::write(out.join("result.json"),serde_json::to_vec_pretty(&serde_json::json!({"status":"PASS","scope":"actual installed disposable paid B2Z, pinned Ledger/Index, owner grant/revoke, delegated authorization, continued manual play, upgrade preservation; not Internet Identity or production","prior_wasm_sha256":dtr_wire::hash(&prior),"feature_wasm_sha256":dtr_wire::hash(&module),"backend":id.to_text(),"funding":a.to_text(),"spender":s.to_text(),"positions":{"join":join,"old_rejected":old_rejected,"unauthorized":unauthorized,"grant":gp,"paid":paid,"unrelated":bad,"revoke":revoke,"revoked":revoked,"manual":manual},"received_e8s":"700000000","cutover":cutover})).unwrap()).unwrap();
}

#[test]
#[ignore = "experimental delegated-payment qualification; explicit dedicated invocation"]
fn icrc2_actual_ledger_fee_allowance_expiry_and_subaccount_rejections() {
    let pic = PocketIcBuilder::new()
        .with_nns_subnet()
        .with_application_subnet()
        .with_server_url(
            std::env::var("POCKET_IC_SERVER_URL")
                .unwrap()
                .parse()
                .unwrap(),
        )
        .build();
    pic.set_time(std::time::SystemTime::now().into());
    let a = Principal::self_authenticating([31; 32]);
    let s = Principal::self_authenticating([32; 32]);
    let g = Principal::self_authenticating([33; 32]);
    let ledger = deploy_ledger_options(&pic, &bytes("ICP_LEDGER_WASM"), &[a], 12345, true);
    let fee: Nat = decode_one(
        &pic.query_call(
            ledger,
            Principal::anonymous(),
            "icrc1_fee",
            encode_args(()).unwrap(),
        )
        .unwrap(),
    )
    .unwrap();
    let request = || Pull {
        spender_subaccount: None,
        from: acct(a),
        to: acct(g),
        amount: 100_000u64.into(),
        fee: Some(fee.clone()),
        memo: Some(b"FIRE 1 90 1".to_vec()),
        created_at_time: None,
    };
    let approval = |amount: u64, expires: u64| {
        call(
            &pic,
            ledger,
            a,
            "icrc2_approve",
            Approve {
                from_subaccount: None,
                spender: acct(s),
                amount: amount.into(),
                expected_allowance: None,
                expires_at: Some(expires),
                fee: Some(fee.clone()),
                memo: None,
                created_at_time: None,
            },
        )
    };
    assert!(matches!(
        call(&pic, ledger, s, "icrc2_transfer_from", request()),
        Err(Error::InsufficientAllowance { .. })
    ));
    let now = pic.get_time().as_nanos_since_unix_epoch();
    approval(112_344, now + 3_600_000_000_000).unwrap();
    assert!(
        matches!(
            call(&pic, ledger, s, "icrc2_transfer_from", request()),
            Err(Error::InsufficientAllowance { .. })
        ),
        "allowance must cover amount plus actual fee"
    );
    approval(1_000_000, now + 3_600_000_000_000).unwrap();
    let mut bad = request();
    bad.fee = Some(1u64.into());
    assert!(matches!(
        call(&pic, ledger, s, "icrc2_transfer_from", bad),
        Err(Error::BadFee { .. })
    ));
    let mut bad = request();
    bad.from.subaccount = Some(vec![1; 32]);
    assert!(matches!(
        call(&pic, ledger, s, "icrc2_transfer_from", bad),
        Err(Error::InsufficientAllowance { .. })
    ));
    let mut bad = request();
    bad.spender_subaccount = Some(vec![1; 32]);
    assert!(matches!(
        call(&pic, ledger, s, "icrc2_transfer_from", bad),
        Err(Error::InsufficientAllowance { .. })
    ));
    let soon = pic.get_time().as_nanos_since_unix_epoch() + 1_000_000_000;
    approval(1_000_000, soon).unwrap();
    pic.advance_time(Duration::from_secs(2));
    pic.tick();
    assert!(
        matches!(
            call(&pic, ledger, s, "icrc2_transfer_from", request()),
            Err(Error::InsufficientAllowance { .. })
        ),
        "expired allowance is not usable"
    );
    assert!(
        matches!(approval(1_000_000, soon), Err(Error::Expired { .. })),
        "past expiry cannot be approved"
    );
    approval(
        10_000_000_000,
        pic.get_time().as_nanos_since_unix_epoch() + 3_600_000_000_000,
    )
    .unwrap();
    let mut bad = request();
    bad.amount = 6_000_000_000u64.into();
    assert!(matches!(
        call(&pic, ledger, s, "icrc2_transfer_from", bad),
        Err(Error::InsufficientFunds { .. })
    ));
    println!(
        "PASS actual pinned Ledger rejections: missing/fee-short/expired allowance, stale fee, wrong A/S subaccount, expired approval and insufficient ICP"
    );
}
