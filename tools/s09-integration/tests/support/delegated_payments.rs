//! Actual pinned disposable ICP Ledger/Index wire proof. Caller principals here
//! are PocketIC callers, not an Internet Identity/browser signing claim.
use super::*;
use candid::Nat;
use ic_ledger_types::Subaccount;
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
    let sub = vec![1u8; 32];
    call(
        &pic,
        ledger,
        a,
        "icrc1_transfer",
        IcrcTransferArg {
            to: IcrcAccount {
                owner: a,
                subaccount: Some(sub.clone()),
            },
            fee: Some(fee.clone()),
            memo: None,
            from_subaccount: None,
            created_at_time: None,
            amount: 1_000_000u64.into(),
        },
    )
    .unwrap();
    let sub_grant = num(call(
        &pic,
        ledger,
        a,
        "icrc1_transfer",
        IcrcTransferArg {
            to: acct(g),
            fee: Some(fee.clone()),
            memo: Some(grant.clone()),
            from_subaccount: Some(sub.clone()),
            created_at_time: None,
            amount: 0u64.into(),
        },
    )
    .unwrap());
    call(
        &pic,
        ledger,
        a,
        "icrc2_approve",
        Approve {
            from_subaccount: Some(sub.clone()),
            spender: acct(s),
            amount: 500_000u64.into(),
            expected_allowance: Some(0u64.into()),
            expires_at: Some(pic.get_time().as_nanos_since_unix_epoch() + 3_600_000_000_000),
            fee: Some(fee.clone()),
            memo: None,
            created_at_time: None,
        },
    )
    .unwrap();
    let sub_paid = num(call(
        &pic,
        ledger,
        s,
        "icrc2_transfer_from",
        Pull {
            spender_subaccount: None,
            from: IcrcAccount {
                owner: a,
                subaccount: Some(sub.clone()),
            },
            to: acct(g),
            amount: 100_000u64.into(),
            fee: Some(fee.clone()),
            memo: Some(command.clone()),
            created_at_time: None,
        },
    )
    .unwrap());
    let sub_account =
        AccountIdentifier::new(&a, &ic_ledger_types::Subaccount(sub.try_into().unwrap()));
    let mut sub_history = None;
    for _ in 0..50 {
        pic.advance_time(Duration::from_secs(1));
        pic.tick();
        let reply: source::HistoryResult = decode_one(
            &pic.query_call(
                index,
                Principal::anonymous(),
                "get_account_identifier_transactions",
                candid::encode_one(source::HistoryArgs {
                    account_identifier: recipient.clone(),
                    start: None,
                    max_results: 64,
                })
                .unwrap(),
            )
            .unwrap(),
        )
        .unwrap();
        if reply
            .as_ref()
            .is_ok_and(|h| h.transactions.iter().any(|r| r.id == sub_paid))
        {
            sub_history = Some(reply.unwrap());
            break;
        }
    }
    let sub_history = sub_history.unwrap();
    let grant_row = sub_history
        .transactions
        .iter()
        .find(|r| r.id == sub_grant)
        .unwrap();
    let paid_row = sub_history
        .transactions
        .iter()
        .find(|r| r.id == sub_paid)
        .unwrap();
    let normalized = |r: &source::TransactionWithId| {
        b2z_protocol::delegation::Payment::decode(
            &unhex(&source::classify_delegation(r, &receiver).unwrap().unwrap()).unwrap(),
        )
        .unwrap()
    };
    let sub_input = normalized(paid_row);
    assert_eq!(sub_input.from, *sub_account.as_bytes());
    assert_ne!(sub_input.from, input.from);
    assert_eq!(sub_input.spender, input.spender);
    assert_eq!(sub_input.memo, Some(command.clone()));
    let sub_owner_grant = normalized(grant_row);
    assert_eq!(sub_owner_grant.from, *sub_account.as_bytes());
    assert!(sub_owner_grant.spender.is_none());
    assert_eq!(
        registry.apply(&sub_owner_grant, sub_grant).unwrap(),
        b2z_native::delegation_v8::Decision::Granted
    );
    assert_eq!(
        registry.apply(&sub_input, sub_paid).unwrap(),
        b2z_native::delegation_v8::Decision::Gameplay
    );
    assert_eq!(registry.grants.len(), 2);
    println!(
        "ICRC2_WIRE_RESULT {}",
        serde_json::json!({"status":"PASS","scope":"actual pinned disposable Ledger and Index; PocketIC caller identities, not browser/II signing or installed B2Z gameplay","grant_position":grant_pos,"approval_position":approve,"delegated_position":transfer,"memo_limit":32,"explicit_nondefault_funding":"PASS","subaccount_grant_position":sub_grant,"subaccount_payment_position":sub_paid,"setup_amount_e8s":0,"queried_fee_e8s":12345,"funder":funding,"spender":spending,"recipient":recipient,"ledger_timestamp_ns":row.transaction.timestamp.as_ref().unwrap().timestamp_nanos})
    );
}
#[test]
#[ignore = "experimental delegated-payment qualification; explicit dedicated invocation"]
fn icrc2_actual_sdk_signing_and_immutable_duplicate_retry() {
    signed_sdk_proof(false);
}
#[test]
#[ignore = "experimental delegated-payment qualification; explicit dedicated invocation"]
fn icrc2_actual_signed_installed_gameplay_pipeline() {
    signed_sdk_proof(true);
}
fn signed_sdk_proof(installed: bool) {
    let out = PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap()).join(if installed {
        "signed-gameplay"
    } else {
        "signed-ledger"
    });
    std::fs::create_dir_all(&out).unwrap();
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    let log = std::fs::File::create(out.join("signer.log")).unwrap();
    let mut node = OwnedBrowser(
        std::process::Command::new("node")
            .current_dir(&root)
            .args([
                "tools/fixtures/delegated-ledger-signer.mjs",
                out.to_str().unwrap(),
                if installed {
                    "--installed-game"
                } else {
                    "--ledger-only"
                },
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
    let (mut pic, ledger, receiver) = if installed {
        let (pic, id, ledger, setup_payer) = arena_setup_world_fee_clock_payers_options(
            bytes("B2Z_DELEGATION_WASM"),
            initial_world(),
            12345,
            3600,
            &[a],
            true,
        );
        europe::activate(&pic, id);
        playability_installed::funding_paused(&pic, id, true);
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
        let pos = num(call(
            &pic,
            ledger,
            setup_payer,
            "icrc1_transfer",
            IcrcTransferArg {
                to: acct(id),
                fee: Some(fee),
                memo: Some(b"INVALID".to_vec()),
                from_subaccount: None,
                created_at_time: None,
                amount: 10_000u64.into(),
            },
        )
        .unwrap());
        for _ in 0..120 {
            tick(&pic);
            if status(&pic, id).source.admitted_to_exclusive > pos {
                break;
            }
        }
        assert!(status(&pic, id).source.admitted_to_exclusive > pos);
        playability_installed::one_tick(&pic, id);
        playability_installed::prepare(&pic, id, "prepare_delegation_transition");
        let mut ready = false;
        for _ in 0..120 {
            tick(&pic);
            let bytes: Vec<u8> = get_query(
                &pic,
                id,
                "delegation_transition_status",
                encode_args(()).unwrap(),
            );
            let t: serde_json::Value = decode(&bytes).unwrap();
            if t["transition"]["phase"] == "ready" && transition_drained(&pic, id) {
                ready = true;
                break;
            }
        }
        assert!(ready);
        let _: Vec<u8> = get_result(
            &pic,
            id,
            "commit_delegation_transition",
            candid::encode_one(observe(&pic, id).1.head.manifest_hash).unwrap(),
        );
        (pic, ledger, id)
    } else {
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
        let ledger = deploy_ledger_options(&pic, &bytes("ICP_LEDGER_WASM"), &[a], 12345, true);
        let receiver = create_controlled(&pic);
        (pic, ledger, receiver)
    };
    if installed {
        let now = std::time::SystemTime::now();
        assert!(
            pic.get_time().as_nanos_since_unix_epoch()
                <= now
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_nanos() as u64
        );
        pic.set_time(now.into());
    }
    let gateway = pic.make_live(None);
    let config = serde_json::json!({"network":"pocketic-local","ledger":ledger.to_text(),"host":gateway.as_str().trim_end_matches('/'),"canister_id":receiver.to_text(),"root_key_hex":hex(&pic.root_key().unwrap()),"installed_game":installed});
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
    if installed {
        let last = result["manual_position"]
            .as_str()
            .unwrap()
            .parse::<u64>()
            .unwrap();
        for _ in 0..120 {
            tick(&pic);
            assert!(status(&pic, receiver).source.last_error.is_none());
            if status(&pic, receiver).source.admitted_to_exclusive > last {
                break;
            }
        }
        assert!(status(&pic, receiver).source.admitted_to_exclusive > last);
        playability_installed::one_tick(&pic, receiver);
        let world = arena_world(&pic, receiver);
        let owner = AccountIdentifier::new(&a, &Subaccount([0; 32])).to_hex();
        assert_eq!(world.cannons.len(), 1);
        assert_eq!(world.cannons[0].account, owner);
        assert_eq!(world.received_e8s, 150_010_000i64.into());
        let (o, p) = observe(&pic, receiver);
        let mut event = vec![];
        for c in 0..p.artifacts[1].chunks.len() {
            event.extend(get_query::<Vec<u8>>(
                &pic,
                receiver,
                "artifact_chunk",
                encode_args((dtr_wire::hash(&o.publication), 1u8, c as u16)).unwrap(),
            ));
        }
        let event: serde_json::Value = decode(&event).unwrap();
        std::fs::write(
            out.join("game-receipts.json"),
            serde_json::to_vec_pretty(&event).unwrap(),
        )
        .unwrap();
        let receipts = event["receipts"].as_array().unwrap();
        for key in ["join_position", "transfer_position", "manual_position"] {
            let position = result[key].as_str().unwrap();
            let row = receipts
                .iter()
                .find(|r| r["position"]["$integer"] == position)
                .unwrap();
            assert_eq!(row["account"], owner);
            assert_eq!(row["status"], "applied", "{key}: {row}");
            if key == "transfer_position" {
                assert_eq!(
                    row["spender"],
                    AccountIdentifier::new(&s, &Subaccount([0; 32])).to_hex()
                );
                assert_eq!(row["transfer"]["memo"], result["memo"]);
            }
        }
        std::fs::write(
            out.join("game-receipts.json"),
            serde_json::to_vec_pretty(&event).unwrap(),
        )
        .unwrap();
        signed_game_authentication(&pic, receiver, ledger, &out);
    }
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
        let initial = arena_world(&pic, id).encode().unwrap();
        std::fs::write(out.join(format!("{label}-initial.bin")), &initial).unwrap();
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
        let seal = p.head.seal.as_ref().expect("paid segment must be sealed");
        assert_eq!(
            seal.previous_state,
            dtr_wire::hash(&initial),
            "capture must cover exactly one actual segment"
        );
        let recipient = AccountIdentifier::new(&id, &DEFAULT_SUBACCOUNT);
        let history: source::HistoryResult = decode_one(
            &pic.query_call(
                status(&pic, id).source.index,
                Principal::anonymous(),
                "get_account_identifier_transactions",
                candid::encode_one(source::HistoryArgs {
                    account_identifier: recipient.to_hex(),
                    start: None,
                    max_results: 64,
                })
                .unwrap(),
            )
            .unwrap(),
        )
        .unwrap();
        let mut inputs = vec![];
        let mut raw_rows = vec![];
        let delegated = b2z_native::world::World::decode(&initial)
            .unwrap()
            .playability
            .unwrap()
            .authorization
            .is_some();
        let history = history.unwrap();
        let mut old_adapter = source::SourceState::configured(
            IndexConfig {
                network: "pocketic-local".into(),
                ledger,
                index: status(&pic, id).source.index,
                receiving_subaccount: 0,
                event_horizon: None,
                starting_policy: StartingPolicy::FromBeginning,
            },
            id,
        )
        .unwrap()
        .0;
        if !delegated {
            old_adapter.memo_adapter_version = 4;
            old_adapter.page(history.clone()).unwrap();
        }
        for row in history.transactions {
            if Int(row.id.into()) < seal.source_from
                || Int(row.id.into()) >= seal.source_to_exclusive
            {
                continue;
            }
            let payload = if delegated {
                source::classify_delegation(&row, &recipient).unwrap()
            } else {
                old_adapter
                    .pending
                    .as_ref()
                    .unwrap()
                    .rows
                    .iter()
                    .find(|r| r.id == row.id)
                    .unwrap()
                    .payload
                    .clone()
            };
            if let Some(payload_hex) = payload {
                if delegated {
                    raw_rows.push(serde_json::json!({"recipient":recipient.to_hex(),"raw_candid_hex":hex(&candid::encode_one(&row).unwrap())}));
                }
                inputs.push(b2z_native::Input {
                    position: Int(row.id.into()),
                    payload_hex,
                });
            }
        }
        inputs.sort_by(|a, b| a.position.cmp(&b.position));
        std::fs::write(
            out.join(format!("{label}-inputs.bin")),
            dtr_wire::encode(&inputs).unwrap(),
        )
        .unwrap();
        std::fs::write(
            out.join(format!("{label}-source-rows.bin")),
            dtr_wire::encode(&raw_rows).unwrap(),
        )
        .unwrap();
        assert!(
            std::process::Command::new("node")
                .current_dir(Path::new(env!("CARGO_MANIFEST_DIR")).join("../.."))
                .args([
                    "tools/verify_delegated_capture.mjs",
                    out.to_str().unwrap(),
                    label
                ])
                .status()
                .unwrap()
                .success()
        );
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
    let prior_cutover = observe(&pic, id).0.publication;
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
    let cutover_observation = observe(&pic, id).0;
    std::fs::write(out.join("cutover-initial.bin"), boundary.encode().unwrap()).unwrap();
    std::fs::write(out.join("cutover-prior-publication.bin"), prior_cutover).unwrap();
    std::fs::write(
        out.join("cutover-publication.bin"),
        &cutover_observation.publication,
    )
    .unwrap();
    std::fs::write(
        out.join("cutover-inputs.bin"),
        dtr_wire::encode(&Vec::<b2z_native::Input>::new()).unwrap(),
    )
    .unwrap();
    for (kind, d) in cutover.artifacts.iter().enumerate() {
        let mut body = vec![];
        for c in 0..d.chunks.len() {
            body.extend(get_query::<Vec<u8>>(
                &pic,
                id,
                "artifact_chunk",
                encode_args((
                    dtr_wire::hash(&cutover_observation.publication),
                    kind as u8,
                    c as u16,
                ))
                .unwrap(),
            ));
        }
        assert_eq!(dtr_wire::hash(&body), d.sha256);
        std::fs::write(out.join(format!("cutover-artifact-{kind}.bin")), body).unwrap();
    }
    assert!(
        std::process::Command::new("node")
            .current_dir(Path::new(env!("CARGO_MANIFEST_DIR")).join("../.."))
            .args([
                "tools/verify_delegated_capture.mjs",
                out.to_str().unwrap(),
                "cutover"
            ])
            .status()
            .unwrap()
            .success()
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
    let forbidden = pull(
        stranger,
        b2z_protocol::delegation::encode_authorization(
            &b2z_protocol::delegation::AuthorizationMemo::Grant(stranger.as_slice().to_vec()),
        )
        .unwrap(),
        0,
    );
    assert!(
        format!("{}", settle(forbidden, "delegated-self-grant-forbidden"))
            .contains("DELEGATED_SETUP_FORBIDDEN")
    );
    assert!(
        arena_world(&pic, id)
            .playability
            .as_ref()
            .unwrap()
            .authorization
            .as_ref()
            .unwrap()
            .grants
            .is_empty()
    );
    let grant_s = direct(
        b2z_protocol::delegation::encode_authorization(
            &b2z_protocol::delegation::AuthorizationMemo::Grant(s.as_slice().to_vec()),
        )
        .unwrap(),
        0,
    );
    settle(grant_s, "owner-restores-spender");
    let grant_t = direct(
        b2z_protocol::delegation::encode_authorization(
            &b2z_protocol::delegation::AuthorizationMemo::Grant(stranger.as_slice().to_vec()),
        )
        .unwrap(),
        0,
    );
    settle(grant_t, "owner-replaces-spender");
    let registry = arena_world(&pic, id)
        .playability
        .unwrap()
        .authorization
        .unwrap();
    assert_eq!(registry.grants.len(), 1);
    assert_eq!(
        registry.grants[0].spender_principal,
        hex(stranger.as_slice())
    );
    let replaced = pull(s, b"FIRE 1 90 1".to_vec(), 100_000_000);
    assert!(
        format!("{}", settle(replaced, "replaced-spender-rejected"))
            .contains("UNAUTHORIZED_SPENDER")
    );
    let replacement = pull(stranger, b"FIRE 1 90 1".to_vec(), 100_000_000);
    let result = settle(replacement, "replacement-spender-accepted");
    assert_eq!(result["receipts"][0]["status"], "applied");
    let invalid_target = pull(stranger, b"MOVE 1 500000".to_vec(), 10_000);
    let result = settle(invalid_target, "authorized-payment-invalid-target");
    assert_eq!(result["receipts"][0]["status"], "rejected");
    assert_ne!(result["receipts"][0]["reason"], "UNAUTHORIZED_SPENDER");
    // A Ledger allowance is demonstrably not restricted to this game destination.
    let wrong = num(call(
        &pic,
        ledger,
        s,
        "icrc2_transfer_from",
        Pull {
            spender_subaccount: None,
            from: acct(a),
            to: acct(stranger),
            amount: 100_000_000u64.into(),
            fee: Some(fee.clone()),
            memo: Some(b"FIRE 1 90 1".to_vec()),
            created_at_time: None,
        },
    )
    .unwrap());
    let h: source::HistoryResult = decode_one(
        &pic.query_call(
            status(&pic, id).source.index,
            Principal::anonymous(),
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
    assert!(!h.unwrap().transactions.iter().any(|r| r.id == wrong));
    let far = pic.get_time().as_nanos_since_unix_epoch() + 8 * 86400 * 1_000_000_000;
    let renew = |amount: u64| {
        call(
            &pic,
            ledger,
            a,
            "icrc2_approve",
            Approve {
                from_subaccount: None,
                spender: acct(stranger),
                amount: amount.into(),
                expected_allowance: None,
                expires_at: Some(far),
                fee: Some(fee.clone()),
                memo: None,
                created_at_time: None,
            },
        )
    };
    renew(0).unwrap();
    assert!(
        matches!(
            call(
                &pic,
                ledger,
                stranger,
                "icrc2_transfer_from",
                Pull {
                    spender_subaccount: None,
                    from: acct(a),
                    to: acct(id),
                    amount: 100_000_000u64.into(),
                    fee: Some(fee.clone()),
                    memo: Some(b"FIRE 1 90 1".to_vec()),
                    created_at_time: None
                }
            ),
            Err(Error::InsufficientAllowance { .. })
        ),
        "game grant alone cannot spend ICP"
    );
    renew(1_000_000_000).unwrap();
    let expires = registry.grants[0]
        .expires_at_ns
        .0
        .to_string()
        .parse::<u64>()
        .unwrap();
    let now = pic.get_time().as_nanos_since_unix_epoch();
    pic.advance_time(Duration::from_nanos(expires - now + 1));
    for _ in 0..20 {
        tick(&pic);
    }
    let expired = pull(stranger, b"FIRE 1 90 1".to_vec(), 100_000_000);
    assert!(
        format!("{}", settle(expired, "expired-game-grant-rejected"))
            .contains("UNAUTHORIZED_SPENDER")
    );
    let final_world = arena_world(&pic, id);
    assert_eq!(final_world.received_e8s, 1_000_010_000i64.into());
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
    std::fs::write(out.join("result.json"),serde_json::to_vec_pretty(&serde_json::json!({"status":"PASS","scope":"actual installed disposable paid B2Z, pinned Ledger/Index, owner grant/revoke, delegated authorization, continued manual play, upgrade preservation; not Internet Identity or production","prior_wasm_sha256":dtr_wire::hash(&prior),"feature_wasm_sha256":dtr_wire::hash(&module),"backend":id.to_text(),"funding":a.to_text(),"spender":s.to_text(),"positions":{"join":join,"old_rejected":old_rejected,"unauthorized":unauthorized,"grant":gp,"paid":paid,"unrelated":bad,"revoke":revoke,"revoked":revoked,"manual":manual,"self_grant":forbidden,"replacement":replacement,"replaced":replaced,"invalid_target":invalid_target,"wrong_recipient":wrong,"expired":expired},"received_e8s":"1000010000","cutover":cutover})).unwrap()).unwrap();
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

#[test]
#[ignore = "experimental delegated-payment qualification; explicit dedicated invocation"]
fn icrc2_bounded_empty_maintenance_and_registry_cost() {
    let (pic, id, ledger, a) = arena_setup_world_fee_clock_payers_options(
        bytes("B2Z_DELEGATION_WASM"),
        initial_world(),
        12345,
        0,
        &[],
        true,
    );
    europe::activate(&pic, id);
    playability_installed::funding_paused(&pic, id, true);
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
    let process = |memo: Vec<u8>, amount: u64| {
        let pos = num(call(
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
        .unwrap());
        for _ in 0..120 {
            tick(&pic);
            if status(&pic, id).source.admitted_to_exclusive > pos {
                break;
            }
        }
        assert!(status(&pic, id).source.admitted_to_exclusive > pos);
        playability_installed::one_tick(&pic, id);
        assert!(observe(&pic, id).1.head.source_to_exclusive > Int(pos.into()));
        pos
    };
    process(b"INVALID".to_vec(), 10_000);
    assert!(arena_world(&pic, id).cannons.is_empty());
    let window = |label: &str| {
        for _ in 0..20 {
            pic.tick();
        }
        let before = status(&pic, id);
        let balance = pic.cycle_balance(id);
        let time = pic.get_time().as_nanos_since_unix_epoch();
        for _ in 0..10 {
            pic.advance_time(Duration::from_secs(60));
            for _ in 0..20 {
                pic.tick();
            }
        }
        let after = status(&pic, id);
        assert!(after.source.last_error.is_none());
        assert!(after.run.last_error.is_none());
        assert_eq!(
            after.run.completed_segments, before.run.completed_segments,
            "empty interval must not fabricate gameplay"
        );
        assert!(
            (9..=11).contains(&(after.source.index_calls - before.source.index_calls)),
            "the unchanged fallback must actually execute throughout the window"
        );
        serde_json::json!({"label":label,"virtual_elapsed_seconds":(pic.get_time().as_nanos_since_unix_epoch()-time)as f64/1e9,"net_backend_cycle_debit":(balance as i128-pic.cycle_balance(id)as i128).to_string(),"index_calls":after.source.index_calls-before.source.index_calls,"completed_segments":0,"state_bytes":arena_world(&pic,id).encode().unwrap().len()})
    };
    let baseline = window("same-module-rules7-empty");
    playability_installed::prepare(&pic, id, "prepare_delegation_transition");
    let mut ready = false;
    for _ in 0..120 {
        tick(&pic);
        let raw: Vec<u8> = get_query(
            &pic,
            id,
            "delegation_transition_status",
            encode_args(()).unwrap(),
        );
        let v: serde_json::Value = decode(&raw).unwrap();
        if v["transition"]["phase"] == "ready" && transition_drained(&pic, id) {
            ready = true;
            break;
        }
    }
    assert!(ready);
    let _: Vec<u8> = get_result(
        &pic,
        id,
        "commit_delegation_transition",
        candid::encode_one(observe(&pic, id).1.head.manifest_hash).unwrap(),
    );
    let zero = window("rules8-empty-registry");
    let s = Principal::self_authenticating([44; 32]);
    let start = pic.cycle_balance(id);
    process(
        b2z_protocol::delegation::encode_authorization(
            &b2z_protocol::delegation::AuthorizationMemo::Grant(s.as_slice().to_vec()),
        )
        .unwrap(),
        0,
    );
    let grant_debit = start as i128 - pic.cycle_balance(id) as i128;
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
    let one = window("rules8-one-grant-empty");
    let out = PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap());
    std::fs::create_dir_all(&out).unwrap();
    std::fs::write(out.join("delegation-empty-cost.json"),serde_json::to_vec_pretty(&serde_json::json!({"status":"PASS","scope":"one bounded 600-second virtual maintenance window per condition; actual PocketIC cycle debit, not physical consensus, populated-game lifetime or isolated instruction cost","module_sha256":dtr_wire::hash(&bytes("B2Z_DELEGATION_WASM")),"unchanged_source_fallback_seconds":60,"treasury_paused":true,"workload":"empty world; no simulation segments or extra allowance/expiry polling","windows":[baseline,zero,one],"grant_source_plus_execution_net_cycles":grant_debit.to_string(),"grant_cost_limit":"includes existing source discovery, maintenance and one input segment; not a pure authorization-lookup measurement"})).unwrap()).unwrap();
}

#[test]
#[ignore = "experimental delegated-payment qualification; explicit dedicated invocation"]
fn icrc2_activation_methods_remain_controller_only() {
    let (pic, id, _, _) = arena_setup_world_fee_clock_payers_options(
        bytes("B2Z_DELEGATION_WASM"),
        initial_world(),
        12345,
        0,
        &[],
        true,
    );
    let s = Principal::self_authenticating([99; 32]);
    assert_ne!(s, controller());
    let before = arena_world(&pic, id).encode().unwrap();
    for method in [
        "prepare_delegation_transition",
        "commit_delegation_transition",
    ] {
        let arg = if method == "commit_delegation_transition" {
            candid::encode_one(observe(&pic, id).1.head.manifest_hash).unwrap()
        } else {
            encode_args(()).unwrap()
        };
        let reply = pic.update_call(id, s, method, arg).unwrap();
        let result: Result<Vec<u8>, String> = decode_one(&reply).unwrap();
        assert!(result.unwrap_err().contains("controller"));
    }
    let reply = pic
        .query_call(
            id,
            s,
            "delegation_transition_status",
            encode_args(()).unwrap(),
        )
        .unwrap();
    let result: Result<Vec<u8>, String> = decode_one(&reply).unwrap();
    assert!(result.unwrap_err().contains("controller"));
    assert_eq!(arena_world(&pic, id).encode().unwrap(), before);
    println!(
        "PASS actual activation prepare/status/commit reject non-controller before any state change"
    );
}

/// One existing 256-record source window, not a population/throughput campaign.
#[test]
#[ignore = "experimental delegated-payment qualification; explicit dedicated invocation"]
fn icrc2_maximum_source_window_preserves_backpressure_and_exactly_once() {
    let (pic, id, ledger, a) = arena_setup_world_fee_clock_payers_options(
        bytes("B2Z_DELEGATION_WASM"),
        initial_world(),
        12345,
        0,
        &[],
        true,
    );
    europe::activate(&pic, id);
    playability_installed::funding_paused(&pic, id, true);
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
    let direct = |memo: Vec<u8>, amount: u64| IcrcTransferArg {
        to: acct(id),
        fee: Some(fee.clone()),
        memo: Some(memo),
        from_subaccount: None,
        created_at_time: None,
        amount: amount.into(),
    };
    let first = num(call(
        &pic,
        ledger,
        a,
        "icrc1_transfer",
        direct(b"INVALID".to_vec(), 10_000),
    )
    .unwrap());
    for _ in 0..120 {
        tick(&pic);
        if status(&pic, id).source.admitted_to_exclusive > first {
            break;
        }
    }
    playability_installed::one_tick(&pic, id);
    playability_installed::prepare(&pic, id, "prepare_delegation_transition");
    let mut ready = false;
    for _ in 0..120 {
        tick(&pic);
        let bytes: Vec<u8> = get_query(
            &pic,
            id,
            "delegation_transition_status",
            encode_args(()).unwrap(),
        );
        let t: serde_json::Value = decode(&bytes).unwrap();
        if t["transition"]["phase"] == "ready" && transition_drained(&pic, id) {
            ready = true;
            break;
        }
    }
    assert!(ready);
    let _: Vec<u8> = get_result(
        &pic,
        id,
        "commit_delegation_transition",
        candid::encode_one(observe(&pic, id).1.head.manifest_hash).unwrap(),
    );
    let s = Principal::self_authenticating([55; 32]);
    let memo = b2z_protocol::delegation::encode_authorization(
        &b2z_protocol::delegation::AuthorizationMemo::Grant(s.as_slice().to_vec()),
    )
    .unwrap();
    let mut calls = vec![];
    for _ in 0..source::MAX_PENDING {
        calls.push(
            pic.submit_call(
                ledger,
                a,
                "icrc1_transfer",
                candid::encode_one(direct(memo.clone(), 0)).unwrap(),
            )
            .unwrap(),
        );
    }
    let mut positions = vec![];
    for pending in calls {
        let result: Result<Nat, Error> = decode_one(&pic.await_call(pending).unwrap()).unwrap();
        positions.push(num(result.unwrap()));
    }
    positions.sort();
    positions.dedup();
    assert_eq!(positions.len(), 256);
    let last = *positions.last().unwrap();
    for _ in 0..240 {
        tick(&pic);
        let st = status(&pic, id);
        assert!(st.source.last_error.is_none(), "{:?}", st.source.last_error);
        if st.source.admitted_to_exclusive > last {
            break;
        }
    }
    let work: playability_installed::BoundaryWork =
        get_query(&pic, id, "controller_work", encode_args(()).unwrap());
    assert_eq!(
        work.pending_inputs, 256,
        "full normalized window must persist before execution"
    );
    let state = arena_world(&pic, id).encode().unwrap();
    let cursor = status(&pic, id).source.admitted_to_exclusive;
    let module = bytes("B2Z_DELEGATION_WASM");
    pic.upgrade_canister(
        id,
        module.clone(),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    assert_eq!(arena_world(&pic, id).encode().unwrap(), state);
    assert_eq!(status(&pic, id).source.admitted_to_exclusive, cursor);
    let restored: playability_installed::BoundaryWork =
        get_query(&pic, id, "controller_work", encode_args(()).unwrap());
    assert_eq!(restored.pending_inputs, 256);
    playability_installed::one_tick(&pic, id);
    let world = arena_world(&pic, id);
    assert_eq!(world.received_e8s, 10_000.into());
    let registry = world.playability.unwrap().authorization.unwrap();
    assert_eq!(registry.grants.len(), 1);
    assert_eq!(registry.last_position, Some(Int(last.into())));
    assert_eq!(
        observe(&pic, id).1.head.source_to_exclusive,
        Int((last + 1).into())
    );
    let (o, p) = observe(&pic, id);
    let mut event = vec![];
    for c in 0..p.artifacts[1].chunks.len() {
        event.extend(get_query::<Vec<u8>>(
            &pic,
            id,
            "artifact_chunk",
            encode_args((dtr_wire::hash(&o.publication), 1u8, c as u16)).unwrap(),
        ));
    }
    let event: serde_json::Value = decode(&event).unwrap();
    assert_eq!(event["receipts"].as_array().unwrap().len(), 256);
    assert!(
        event["receipts"]
            .as_array()
            .unwrap()
            .iter()
            .all(|r| r["reason"] == "DELEGATION_GRANTED")
    );
    let out = PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap());
    std::fs::create_dir_all(&out).unwrap();
    std::fs::write(out.join("delegation-source-window.json"),serde_json::to_vec_pretty(&serde_json::json!({"status":"PASS","scope":"one existing maximum normalized source window with actual valueless Ledger/Index records; no population/throughput or production claim","rows":256,"normal_wasm_sha256":dtr_wire::hash(&module),"pending_inputs_preserved":256,"last_ledger_position":last,"duplicate_receipts":0,"received_e8s":"10000","registry_entries":1})).unwrap()).unwrap();
}

fn signed_game_authentication(pic: &PocketIc, id: Principal, ledger: Principal, out: &Path) {
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
}
