//! S14 installed normal-Wasm account-index integration. Valueless disposable ICP only.
use b2z_native::host::B2zHostKernel;
use candid::{CandidType, Deserialize, Principal, decode_one, encode_args};
use dtr_host::observation::{Publication, publication};
use dtr_host::{Action, Coordinator};
use dtr_wire::{Int, decode, hex, unhex};
use ic_ledger_types::{
    AccountIdentifier, DEFAULT_SUBACCOUNT, Memo, Tokens, TransferArgs, TransferResult,
};
use pocket_ic::{CanisterSettings, PocketIc, PocketIcBuilder};
use std::{
    collections::BTreeMap,
    path::{Path, PathBuf},
    time::Duration,
};
// Reuse exact adapter types/validation; host-only methods are checked in the host crate.
#[allow(dead_code)]
#[rustfmt::skip]
#[path = "../../../canisters/runtime-lab/src/source.rs"]
mod source;
use source::{IndexConfig, PokeMatch, PokeTarget, SourceStatus, StartingPolicy};
#[derive(CandidType)]
enum LedgerPayload {
    Init(LedgerInitArgs),
}

#[derive(CandidType)]
struct LedgerInitArgs {
    minting_account: String,
    icrc1_minting_account: Option<IcrcAccount>,
    initial_values: Vec<(String, Tokens)>,
    max_message_size_bytes: Option<u64>,
    transaction_window: Option<LedgerDuration>,
    archive_options: Option<ArchiveOptions>,
    send_whitelist: Vec<Principal>,
    transfer_fee: Option<Tokens>,
    token_symbol: Option<String>,
    token_name: Option<String>,
    feature_flags: Option<FeatureFlags>,
}

#[derive(CandidType)]
struct IcrcAccount {
    owner: Principal,
    subaccount: Option<Vec<u8>>,
}

#[derive(CandidType)]
struct LedgerDuration {
    secs: u64,
    nanos: u32,
}

#[derive(CandidType)]
struct ArchiveOptions {
    trigger_threshold: u64,
    num_blocks_to_archive: u64,
    node_max_memory_size_bytes: Option<u64>,
    max_message_size_bytes: Option<u64>,
    controller_id: Principal,
    more_controller_ids: Option<Vec<Principal>>,
    cycles_for_archive_creation: Option<u64>,
    max_transactions_per_response: Option<u64>,
}

#[derive(CandidType)]
struct FeatureFlags {
    icrc2: bool,
}

#[derive(CandidType, Deserialize)]
struct Archive {
    canister_id: Principal,
}

#[derive(CandidType, Deserialize)]
struct Archives {
    archives: Vec<Archive>,
}

fn controller() -> Principal {
    Principal::self_authenticating([7; 32])
}

fn initial_world() -> Vec<u8> {
    if let Ok(path) = std::env::var("S14_GENESIS_WORLD") {
        return std::fs::read(path).unwrap();
    }
    let path =
        Path::new(env!("CARGO_MANIFEST_DIR")).join("../../tests/fixtures/b2z-v3-golden.json");
    let value: serde_json::Value = serde_json::from_slice(&std::fs::read(path).unwrap()).unwrap();
    let text = value["cases"][0]["initial_hex"].as_str().unwrap();
    dtr_wire::unhex(text).unwrap()
}

fn deploy_ledger(pic: &PocketIc, ledger_wasm: &[u8], payers: &[Principal]) -> Principal {
    deploy_ledger_fee(pic, ledger_wasm, payers, 10_000)
}
fn deploy_ledger_fee(
    pic: &PocketIc,
    ledger_wasm: &[u8],
    payers: &[Principal],
    fee: u64,
) -> Principal {
    let ledger = create_controlled(pic);
    let minting = AccountIdentifier::new(
        &Principal::self_authenticating([88; 32]),
        &DEFAULT_SUBACCOUNT,
    );
    let initial_values = payers
        .iter()
        .map(|payer| {
            (
                AccountIdentifier::new(payer, &DEFAULT_SUBACCOUNT).to_hex(),
                Tokens::from_e8s(5_000_000_000),
            )
        })
        .collect();
    let payload = LedgerPayload::Init(LedgerInitArgs {
        minting_account: minting.to_hex(),
        icrc1_minting_account: None,
        initial_values,
        max_message_size_bytes: Some(1_000_000),
        transaction_window: None,
        archive_options: Some(ArchiveOptions {
            trigger_threshold: 4,
            num_blocks_to_archive: 2,
            node_max_memory_size_bytes: Some(32 * 1024 * 1024),
            max_message_size_bytes: Some(1_000_000),
            controller_id: controller(),
            more_controller_ids: None,
            cycles_for_archive_creation: Some(10_000_000_000_000),
            max_transactions_per_response: Some(2),
        }),
        send_whitelist: vec![],
        transfer_fee: Some(Tokens::from_e8s(fee)),
        token_symbol: Some("TICP".into()),
        token_name: Some("PocketIC Test ICP".into()),
        feature_flags: Some(FeatureFlags { icrc2: false }),
    });
    pic.install_canister(
        ledger,
        ledger_wasm.to_vec(),
        candid::encode_one(payload).unwrap(),
        Some(controller()),
    );
    ledger
}

fn transfer(
    pic: &PocketIc,
    ledger: Principal,
    payer: Principal,
    to: AccountIdentifier,
    amount: u64,
    memo: [u8; 8],
) -> u64 {
    let args = TransferArgs {
        memo: Memo(u64::from_be_bytes(memo)),
        amount: Tokens::from_e8s(amount),
        fee: Tokens::from_e8s(10_000),
        from_subaccount: None,
        to,
        created_at_time: None,
    };
    let reply = pic
        .update_call(ledger, payer, "transfer", candid::encode_one(args).unwrap())
        .unwrap();
    decode_one::<TransferResult>(&reply).unwrap().unwrap()
}

fn normalized(account: AccountIdentifier, amount: u64, memo: [u8; 8]) -> String {
    let mut bytes = b"BTZPAY02".to_vec();
    bytes.extend_from_slice(account.as_bytes());
    bytes.extend_from_slice(&amount.to_be_bytes());
    bytes.extend_from_slice(&memo);
    hex(&bytes)
}

fn create_controlled(pic: &PocketIc) -> Principal {
    let owner = controller();
    pic.create_canister_with_settings(
        Some(owner),
        Some(CanisterSettings {
            controllers: Some(vec![owner]),
            ..Default::default()
        }),
    )
}

#[derive(Clone, Debug, CandidType, Deserialize)]
struct PaceHint {
    mode: String,
    nominal_milli: u32,
    supported_milli: u32,
    performance_limited: bool,
    admission_open: bool,
}
#[derive(Clone, Debug, CandidType, Deserialize)]
struct RunStatus {
    pace: Option<PaceHint>,
    idle: Option<bool>,
    world_transition: Option<bool>,
    running: bool,
    callback_count: u64,
    completed_segments: u64,
    publication_ticks: Option<u64>,
    last_error: Option<String>,
}
#[derive(Clone, CandidType, Deserialize)]
struct Status {
    version: u32,
    revision: u64,
    publication_hash: String,
    source: SourceStatus,
    run: RunStatus,
}
#[derive(CandidType)]
struct RunConfig {
    segment_ticks: u64,
    pacing_seconds: u32,
    work_budget: u32,
}
#[derive(CandidType, Deserialize)]
struct Observation {
    publication: Vec<u8>,
    certificate: Option<Vec<u8>>,
}
#[derive(CandidType)]
enum IndexArg {
    Init(IndexInit),
}
#[derive(CandidType)]
struct IndexInit {
    ledger_id: Principal,
    retrieve_blocks_from_ledger_interval_seconds: Option<u64>,
}
fn bytes(name: &str) -> Vec<u8> {
    std::fs::read(std::env::var(name).unwrap_or_else(|_| panic!("missing {name}"))).unwrap()
}
fn status(pic: &PocketIc, id: Principal) -> Status {
    decode_one::<Result<Status, String>>(
        &pic.query_call(id, controller(), "lab_status", encode_args(()).unwrap())
            .unwrap(),
    )
    .unwrap()
    .unwrap()
}
fn observe(pic: &PocketIc, id: Principal) -> (Observation, Publication) {
    let o = decode_one::<Result<Observation, String>>(
        &pic.query_call(
            id,
            Principal::anonymous(),
            "observation",
            encode_args(()).unwrap(),
        )
        .unwrap(),
    )
    .unwrap()
    .unwrap();
    let p = decode(&o.publication).unwrap();
    (o, p)
}
fn wat_bytes(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("\\{b:02x}")).collect()
}
fn poke_forwarder(target: Principal) -> Vec<u8> {
    wat::parse_str(format!(r#"(module
 (import "ic0" "msg_arg_data_size" (func $size (result i32)))
 (import "ic0" "msg_arg_data_copy" (func $copy (param i32 i32 i32)))
 (import "ic0" "msg_reply" (func $reply))
 (import "ic0" "msg_reply_data_append" (func $append (param i32 i32)))
 (import "ic0" "call_new" (func $new (param i32 i32 i32 i32 i32 i32 i32 i32)))
 (import "ic0" "call_data_append" (func $data (param i32 i32)))
 (import "ic0" "call_perform" (func $perform (result i32)))
 (memory (export "memory") 2)
 (table 1 funcref) (elem (i32.const 0) $done)
 (data (i32.const 0) "{}") (data (i32.const 100) "poke")
 (data (i32.const 110) "DIDL\00\00")
 (func $done (param i32) i32.const 110 i32.const 6 call $append call $reply)
 (func (export "canister_update forward")
   i32.const 1000 i32.const 0 call $size call $copy
   i32.const 0 i32.const {} i32.const 100 i32.const 4 i32.const 0 i32.const 0 i32.const 0 i32.const 0 call $new
   i32.const 1000 call $size call $data call $perform drop)
 )"#,wat_bytes(target.as_slice()),target.as_slice().len())).unwrap()
}
fn tick(pic: &PocketIc) {
    pic.advance_time(Duration::from_secs(1));
    for _ in 0..4 {
        pic.tick();
    }
}
fn get_result<T: for<'de> Deserialize<'de> + CandidType>(
    pic: &PocketIc,
    id: Principal,
    method: &str,
    args: Vec<u8>,
) -> T {
    decode_one::<Result<T, String>>(&pic.update_call(id, controller(), method, args).unwrap())
        .unwrap()
        .unwrap()
}
// Most source/upgrade tests also compare every returned artifact byte.
fn replay_head(
    pic: &PocketIc,
    id: Principal,
    p: &Publication,
    h: &mut Coordinator<B2zHostKernel>,
    payments: &BTreeMap<u64, String>,
    assigned: &mut Vec<u64>,
) {
    replay_head_with_artifacts(pic, id, p, h, payments, assigned, true)
}
fn replay_head_with_artifacts(
    pic: &PocketIc,
    id: Principal,
    p: &Publication,
    h: &mut Coordinator<B2zHostKernel>,
    payments: &BTreeMap<u64, String>,
    assigned: &mut Vec<u64>,
    verify_artifacts: bool,
) {
    let Some(seal) = p.head.seal.as_ref() else {
        return;
    };
    let to = seal
        .source_to_exclusive
        .0
        .to_string()
        .parse::<u64>()
        .unwrap();
    let from = seal.source_from.0.to_string().parse::<u64>().unwrap();
    let inputs: Vec<dtr_host::Input> = payments
        .range(from..to)
        .map(|(position, payload_hex)| {
            assigned.push(*position);
            dtr_host::Input {
                position: Int((*position).into()),
                payload_hex: payload_hex.clone(),
            }
        })
        .collect();
    if inputs.is_empty() {
        h.apply(Action::IngestOrdered {
            start: Int(from.into()),
            end: Int(to.into()),
            inputs: vec![],
            anchor: seal.source_anchor.clone(),
        })
        .unwrap();
    } else {
        let mut start = from;
        for (n, chunk) in inputs.chunks(256).enumerate() {
            let end = if (n + 1) * 256 >= inputs.len() {
                to
            } else {
                chunk
                    .last()
                    .unwrap()
                    .position
                    .0
                    .to_string()
                    .parse::<u64>()
                    .unwrap()
                    + 1
            };
            h.apply(Action::IngestOrdered {
                start: Int(start.into()),
                end: Int(end.into()),
                inputs: chunk.to_vec(),
                anchor: seal.source_anchor.clone(),
            })
            .unwrap();
            start = end;
        }
    }
    h.apply(Action::Seal {
        logical_end: seal.logical_end.clone(),
    })
    .unwrap();
    while h.record.journal.stage.as_ref().unwrap().phase == "running" {
        h.apply(Action::Step {
            budget: if verify_artifacts { 17 } else { 512 },
        })
        .unwrap();
    }
    let ready = h
        .record
        .journal
        .stage
        .as_ref()
        .unwrap()
        .ready_hash
        .clone()
        .unwrap();
    h.apply(Action::Publish {
        manifest_hash: ready,
    })
    .unwrap();
    let expected = publication(&h.record).unwrap();
    assert!(
        expected.bytes == encode_publication(p),
        "native publication mismatch: expected {}, observed {}",
        expected.sha256,
        dtr_wire::hash(&encode_publication(p))
    );
    if verify_artifacts {
        let bundled = decode_one::<Result<Vec<Vec<u8>>, String>>(
            &pic.query_call(
                id,
                controller(),
                "artifact_bundle",
                encode_args((
                    seal.segment_id.0.to_string().parse::<u64>().unwrap(),
                    expected.sha256.clone(),
                ))
                .unwrap(),
            )
            .unwrap(),
        )
        .unwrap()
        .unwrap();
        assert_eq!(bundled, expected.artifacts);
        for (kind, artifact) in expected.artifacts.iter().enumerate() {
            let mut actual = vec![];
            for n in 0..artifact.len().div_ceil(16384) {
                actual.extend(
                    decode_one::<Result<Vec<u8>, String>>(
                        &pic.query_call(
                            id,
                            controller(),
                            "retained_artifact_chunk",
                            encode_args((
                                seal.segment_id.0.to_string().parse::<u64>().unwrap(),
                                expected.sha256.clone(),
                                kind as u8,
                                n as u16,
                            ))
                            .unwrap(),
                        )
                        .unwrap(),
                    )
                    .unwrap()
                    .unwrap(),
                );
            }
            assert_eq!(&actual, artifact);
        }
    }
}
fn encode_publication(p: &Publication) -> Vec<u8> {
    dtr_wire::encode(p).unwrap()
}

#[test]
fn upstream_index_poke_fallback_upgrade_and_replay() {
    let builder = PocketIcBuilder::new()
        .with_nns_subnet()
        .with_application_subnet();
    let mut pic = if let Ok(url) = std::env::var("POCKET_IC_SERVER_URL") {
        builder.with_server_url(url.parse().unwrap()).build()
    } else {
        builder
            .with_server_binary(PathBuf::from(std::env::var("POCKET_IC_BIN").unwrap()))
            .build()
    };
    pic.set_time((std::time::SystemTime::now() - Duration::from_secs(150)).into());
    let payer = Principal::self_authenticating([9; 32]);
    let ledger = deploy_ledger(&pic, &bytes("ICP_LEDGER_WASM"), &[payer]);
    for n in 0..6 {
        transfer(
            &pic,
            ledger,
            payer,
            AccountIdentifier::new(
                &Principal::self_authenticating([42; 32]),
                &DEFAULT_SUBACCOUNT,
            ),
            10_000,
            [n; 8],
        );
    }
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
    let id = create_controlled(&pic);
    pic.add_cycles(id, 100_000_000_000_000);
    let sender = create_controlled(&pic);
    pic.add_cycles(sender, 100_000_000_000_000);
    pic.install_canister(
        sender,
        poke_forwarder(id),
        encode_args(()).unwrap(),
        Some(controller()),
    );
    let wasm = bytes("B2Z_S14_WASM");
    let world = initial_world();
    pic.install_canister(
        id,
        wasm.clone(),
        encode_args((
            world.clone(),
            0u64,
            IndexConfig {
                network: "pocketic-local".into(),
                ledger,
                index,
                receiving_subaccount: 0,
                event_horizon: Some(sender),
                starting_policy: StartingPolicy::FromBeginning,
            },
        ))
        .unwrap(),
        Some(controller()),
    );
    let (_, genesis) = observe(&pic, id);
    let descriptor = decode_one::<Result<Vec<u8>, String>>(
        &pic.query_call(
            id,
            controller(),
            "source_descriptor",
            encode_args(()).unwrap(),
        )
        .unwrap(),
    )
    .unwrap()
    .unwrap();
    assert_eq!(dtr_wire::hash(&descriptor), genesis.identity.source_id);
    let (domain, network, reported_ledger, reported_index, owner, n, account): (
        String,
        String,
        Principal,
        Principal,
        Principal,
        u64,
        String,
    ) = candid::decode_args(&descriptor).unwrap();
    assert_eq!(domain, "BTZ-ICP-INDEX-01");
    assert_eq!(network, "pocketic-local");
    assert_eq!(reported_ledger, ledger);
    assert_eq!(reported_index, index);
    assert_eq!(owner, id);
    assert_eq!(n, 0);
    assert_eq!(account, source::receiving_account(id, n).to_string());
    let mut h = Coordinator::create(
        &world,
        genesis.identity.clone(),
        0,
        0,
        "00".repeat(32),
        B2zHostKernel,
    )
    .unwrap();
    let _: Status = get_result(
        &pic,
        id,
        "start_autonomous",
        candid::encode_one(RunConfig {
            segment_ticks: 2,
            pacing_seconds: 1,
            work_budget: 512,
        })
        .unwrap(),
    );
    for _ in 0..8 {
        pic.tick();
    }
    assert!(status(&pic, id).source.binding_checked);
    // The initial game is replayed before transfers too.
    let mut last = None;
    let mut assigned = vec![];
    let mut payments = BTreeMap::new();
    let mut trace = vec![];
    let recipient = source::receiving_account(id, 0);
    let funding = AccountIdentifier::new(&payer, &DEFAULT_SUBACCOUNT);
    let first = transfer(
        &pic,
        ledger,
        payer,
        recipient,
        1_000_000_000,
        *b"BTZ\x11\0\0\0\0",
    );
    payments.insert(
        first,
        normalized(funding, 1_000_000_000, *b"BTZ\x11\0\0\0\0"),
    );
    let relevant = PokeMatch {
        target: PokeTarget::subaccount(0),
        max_amount: candid::Nat::from(1_000_000_000u64),
    };
    // Untrusted caller cannot spoof the configured sender, even with correct payload.
    assert!(
        pic.update_call(
            id,
            controller(),
            "poke",
            candid::encode_one(vec![relevant.clone()]).unwrap()
        )
        .is_err()
    );
    let ignored = [
        vec![],
        vec![PokeMatch {
            target: PokeTarget::subaccount(1),
            max_amount: 1u64.into(),
        }],
        vec![PokeMatch {
            target: PokeTarget::neuron_nonce(0),
            max_amount: 1u64.into(),
        }],
        vec![PokeMatch {
            target: PokeTarget::subaccount(0),
            max_amount: 0u64.into(),
        }],
    ];
    let before = status(&pic, id).source.index_calls;
    for payload in ignored {
        pic.update_call(
            sender,
            controller(),
            "forward",
            candid::encode_one(payload).unwrap(),
        )
        .unwrap();
    }
    assert_eq!(
        status(&pic, id).source.index_calls,
        before,
        "ignored targets must not schedule index calls"
    );
    // Real payload-bearing Candid call from the configured canister; duplicate targets coalesce.
    pic.update_call(
        sender,
        controller(),
        "forward",
        candid::encode_one(vec![
            PokeMatch {
                target: PokeTarget::neuron_nonce(0),
                max_amount: 1u64.into(),
            },
            PokeMatch {
                target: PokeTarget::subaccount(1),
                max_amount: 1u64.into(),
            },
            relevant.clone(),
            relevant,
        ])
        .unwrap(),
    )
    .unwrap();
    let mut second = None;
    let mut upgraded = false;
    let mut last_initial = world.clone();
    let mut publications = Vec::new();
    for elapsed in 0..150 {
        if elapsed == 80 {
            let _: Status = get_result(&pic, id, "pause_autonomous", encode_args(()).unwrap());
        }
        if elapsed == 82 {
            let _: Status = get_result(
                &pic,
                id,
                "start_autonomous",
                candid::encode_one(RunConfig {
                    segment_ticks: 2,
                    pacing_seconds: 1,
                    work_budget: 512,
                })
                .unwrap(),
            );
        }
        if elapsed == 30 {
            let tx = transfer(
                &pic,
                ledger,
                payer,
                recipient,
                100_000_000,
                *b"BTZ\x12\0\0\0\x01",
            );
            payments.insert(tx, normalized(funding, 100_000_000, *b"BTZ\x12\0\0\0\x01"));
            second = Some(tx);
        }
        if elapsed >= 74 && !upgraded {
            #[derive(CandidType, Deserialize)]
            struct Work {
                phase: Option<String>,
            }
            let work: Work = decode_one::<Result<Work, String>>(
                &pic.query_call(
                    id,
                    controller(),
                    "controller_work",
                    encode_args(()).unwrap(),
                )
                .unwrap(),
            )
            .unwrap()
            .unwrap();
            if status(&pic, id).run.pace.is_some() || work.phase.is_some() {
                assert!(
                    assigned.contains(&second.unwrap()),
                    "no-poke payment must publish through fallback before upgrade is allowed to wake reconciliation"
                );
                pic.upgrade_canister(
                    id,
                    wasm.clone(),
                    encode_args(()).unwrap(),
                    Some(controller()),
                )
                .unwrap();
                upgraded = true;
            }
        }
        tick(&pic);
        let s = status(&pic, id);
        assert!(s.run.last_error.is_none(), "{:?}", s.run.last_error);
        let (_, p) = observe(&pic, id);
        if p.head.segment_id != last {
            // At most one new segment per observed virtual second; verify no skipped publications.
            let sid = p
                .head
                .segment_id
                .as_ref()
                .unwrap()
                .0
                .to_string()
                .parse::<u64>()
                .unwrap();
            let next = h
                .record
                .journal
                .head
                .segment_id
                .as_ref()
                .map_or(0, |n| n.0.to_string().parse::<u64>().unwrap() + 1);
            assert_eq!(sid, next);
            last_initial = unhex(&h.record.journal.head.state_hex).unwrap();
            publications.push(p.clone());
            replay_head(&pic, id, &p, &mut h, &payments, &mut assigned);
            last = p.head.segment_id.clone();
        }
        trace.push(serde_json::json!({"elapsed_virtual_seconds":elapsed+1,"cursor":s.source.admitted_to_exclusive,"index_calls":s.source.index_calls,"in_flight":s.source.scan_in_flight,"pending":s.source.pending_records,"segments":s.run.completed_segments,"error":s.source.last_error}));
    }
    assert!(upgraded, "upgrade must interrupt a staged game operation");
    let observed_segments = status(&pic, id).run.completed_segments;
    // Virtual observation is complete. Produce a fresh real-time certificate
    // without relaxing verifier freshness. This may execute one additional
    // bounded game action; capture/replay any publication separately below.
    pic.set_time(std::time::SystemTime::now().into());
    for _ in 0..4 {
        pic.tick();
    }
    let (_, fresh) = observe(&pic, id);
    if fresh.head.segment_id != last {
        last_initial = unhex(&h.record.journal.head.state_hex).unwrap();
        publications.push(fresh.clone());
        replay_head(&pic, id, &fresh, &mut h, &payments, &mut assigned);
    }
    assert!(assigned.contains(&first));
    assert!(assigned.contains(&second.unwrap()));
    assert_eq!(assigned.len(), 2);
    let s = status(&pic, id);
    assert!(s.run.completed_segments > 2);
    assert!(s.source.last_error.is_none());
    let archive_reply = pic
        .query_call(ledger, controller(), "archives", encode_args(()).unwrap())
        .unwrap();
    assert!(
        !decode_one::<Archives>(&archive_reply)
            .unwrap()
            .archives
            .is_empty(),
        "real index must cover ledger archive history"
    );
    let (o, _) = observe(&pic, id);
    let agent = ic_agent::Agent::builder()
        .with_url("http://127.0.0.1:1")
        .build()
        .unwrap();
    agent.set_root_key(pic.root_key().unwrap());
    let cert: ic_agent::Certificate =
        serde_cbor::from_slice(o.certificate.as_ref().unwrap()).unwrap();
    agent.verify(&cert, id).unwrap();
    let certified = ic_agent::lookup_value(
        &cert,
        [
            b"canister".as_slice(),
            id.as_slice(),
            b"certified_data".as_slice(),
        ],
    )
    .unwrap();
    assert_eq!(certified, unhex(&dtr_wire::hash(&o.publication)).unwrap());
    let wrong = ic_agent::Agent::builder()
        .with_url("http://127.0.0.1:1")
        .build()
        .unwrap();
    assert!(
        wrong.verify(&cert, id).is_err(),
        "mainnet SDK root must reject disposable local certificate"
    );
    assert!(
        ic_agent::lookup_value(
            &cert,
            [
                b"canister".as_slice(),
                sender.as_slice(),
                b"certified_data".as_slice()
            ]
        )
        .is_err(),
        "certificate must bind the intended canister path"
    );
    #[derive(CandidType, Deserialize)]
    struct Entry {
        segment_id: u64,
    }
    #[derive(CandidType, Deserialize)]
    struct Retention {
        max_segments: u16,
        max_bytes: u64,
        retained_bytes: u64,
        entries: Vec<Entry>,
    }
    let retention: Retention = decode_one::<Result<Retention, String>>(
        &pic.query_call(
            id,
            controller(),
            "retention_status",
            encode_args(()).unwrap(),
        )
        .unwrap(),
    )
    .unwrap()
    .unwrap();
    assert_eq!(retention.max_segments, 3);
    assert_eq!(retention.max_bytes, 8 * 1024 * 1024);
    assert!(retention.retained_bytes <= retention.max_bytes);
    assert_eq!(retention.entries.len(), 3);
    assert!(
        retention
            .entries
            .windows(2)
            .all(|p| p[1].segment_id == p[0].segment_id + 1)
    );
    let missing = pic
        .query_call(
            id,
            controller(),
            "retained_publication",
            candid::encode_one(0u64).unwrap(),
        )
        .unwrap();
    assert!(
        decode_one::<Result<Vec<u8>, String>>(&missing)
            .unwrap()
            .unwrap_err()
            .contains("snapshot resync")
    );
    if let Ok(path) = std::env::var("S14_SNAPSHOT") {
        let directory = PathBuf::from(path);
        std::fs::create_dir_all(&directory).unwrap();
        let view = publication(&h.record).unwrap();
        let seal = h.record.journal.head.seal.as_ref().unwrap();
        for (name, data) in [
            ("catalog.bin", o.publication.as_slice()),
            (
                "certificate.cbor",
                o.certificate.as_ref().unwrap().as_slice(),
            ),
            ("root-key.der", pic.root_key().as_ref().unwrap().as_slice()),
            ("initial-state.bin", last_initial.as_slice()),
            ("state.bin", view.artifacts[0].as_slice()),
            ("events.bin", view.artifacts[1].as_slice()),
            ("scores.bin", view.artifacts[2].as_slice()),
        ] {
            std::fs::write(directory.join(name), data).unwrap();
        }
        std::fs::write(directory.join("metadata.json"),serde_json::to_vec_pretty(&serde_json::json!({"version":1,"trust":"local-ic-test-certificate","network":"pocketic-local","canister_id":id.to_text(),"root_key_sha256":dtr_wire::hash(&pic.root_key().unwrap()),"logical_start":seal.logical_start.0.to_string().parse::<u64>().unwrap(),"logical_end":seal.logical_end.0.to_string().parse::<u64>().unwrap(),"tick_seconds":0.25})).unwrap()).unwrap();
    }
    if let Ok(output) = std::env::var("S14_LIVE_CLIENT_RESULT") {
        let gateway = pic.make_live(None);
        let result = std::process::Command::new("node")
            .args([
                "tools/verify_s14_transport.mjs",
                "--snapshot",
                &std::env::var("S14_SNAPSHOT").unwrap(),
                "--host",
                gateway.as_str(),
                "--canister",
                &id.to_text(),
                "--output",
                &output,
            ])
            .status()
            .unwrap();
        pic.stop_live();
        assert!(
            result.success(),
            "live read-only SDK transport verification failed"
        );
    }
    if let Ok(path) = std::env::var("S14_TRACE") {
        std::fs::write(path,serde_json::to_vec_pretty(&serde_json::json!({"status":"PASS","evidence_class":"UPSTREAM_COMPATIBLE_LOCAL_FUNCTIONAL","assigned":assigned,"initial_world_hex":hex(&world),"inputs":payments.iter().map(|(id,payload)|serde_json::json!({"position":id.to_string(),"payload_hex":payload})).collect::<Vec<_>>(),"publications":publications,"trace":trace,"segments":s.run.completed_segments,"observed_segments":observed_segments,"certificate_time_refreshed_after_observation":true})).unwrap()).unwrap();
    }
}

fn fixture_wasm(replies: &[(&str, Vec<u8>)], traps: &[&str]) -> Vec<u8> {
    let mut offset = 0usize;
    let mut data = String::new();
    let mut functions = String::new();
    for (index, (method, reply)) in replies.iter().enumerate() {
        data.push_str(&format!(
            "(data (i32.const {offset}) \"{}\")",
            wat_bytes(reply)
        ));
        functions.push_str(&format!(
            "(func $reply{index} (export \"canister_query {method}\") i32.const {offset} i32.const {} call $append call $reply)",
            reply.len()
        ));
        offset += reply.len();
    }
    for (index, method) in traps.iter().enumerate() {
        let message = b"intentional test-ledger rejection";
        data.push_str(&format!(
            "(data (i32.const {offset}) \"{}\")",
            wat_bytes(message)
        ));
        functions.push_str(&format!(
            "(func $trap{index} (export \"canister_query {method}\") i32.const {offset} i32.const {} call $trap)",
            message.len()
        ));
        offset += message.len();
    }
    wat::parse_str(format!(
        "(module (import \"ic0\" \"msg_reply_data_append\" (func $append (param i32 i32))) (import \"ic0\" \"msg_reply\" (func $reply)) (import \"ic0\" \"trap\" (func $trap (param i32 i32))) (memory (export \"memory\") 1) {data} {functions})"
    ))
    .unwrap()
}

#[test]
fn controlled_index_pagination_lag_failure_and_upgrade() {
    let builder = PocketIcBuilder::new()
        .with_nns_subnet()
        .with_application_subnet();
    let pic = if let Ok(url) = std::env::var("POCKET_IC_SERVER_URL") {
        builder.with_server_url(url.parse().unwrap()).build()
    } else {
        builder
            .with_server_binary(PathBuf::from(std::env::var("POCKET_IC_BIN").unwrap()))
            .build()
    };
    let ledger = create_controlled(&pic);
    let index = create_controlled(&pic);
    let id = create_controlled(&pic);
    let sender = create_controlled(&pic);
    for c in [index, id, sender] {
        pic.add_cycles(c, 100_000_000_000_000);
    }
    let binding = candid::encode_one(ledger).unwrap();
    let empty: source::HistoryResult = Ok(source::History {
        balance: 0,
        transactions: vec![],
        oldest_tx_id: None,
    });
    let empty_bytes = candid::encode_one(empty).unwrap();
    let install = |data: Vec<u8>, traps: &[&str], first: bool| {
        let replies = if traps.is_empty() {
            vec![
                ("ledger_id", binding.clone()),
                ("get_account_identifier_transactions", data),
            ]
        } else {
            vec![("ledger_id", binding.clone())]
        };
        let wasm = fixture_wasm(&replies, traps);
        if first {
            pic.install_canister(index, wasm, encode_args(()).unwrap(), Some(controller()));
        } else {
            pic.upgrade_canister(index, wasm, encode_args(()).unwrap(), Some(controller()))
                .unwrap();
        }
    };
    pic.install_canister(
        index,
        fixture_wasm(
            &[
                (
                    "ledger_id",
                    candid::encode_one(Principal::anonymous()).unwrap(),
                ),
                ("get_account_identifier_transactions", empty_bytes.clone()),
            ],
            &[],
        ),
        encode_args(()).unwrap(),
        Some(controller()),
    );
    let wasm = bytes("B2Z_S14_WASM");
    pic.install_canister(
        id,
        wasm.clone(),
        encode_args((
            initial_world(),
            0u64,
            IndexConfig {
                network: "pocketic-local".into(),
                ledger,
                index,
                receiving_subaccount: 7,
                event_horizon: Some(sender),
                starting_policy: StartingPolicy::FromBeginning,
            },
        ))
        .unwrap(),
        Some(controller()),
    );
    pic.install_canister(
        sender,
        poke_forwarder(id),
        encode_args(()).unwrap(),
        Some(controller()),
    );
    for _ in 0..12 {
        pic.tick();
    }
    let mismatched = status(&pic, id);
    assert!(!mismatched.source.binding_checked);
    assert_eq!(mismatched.source.index_calls, 0);
    assert!(
        mismatched
            .source
            .last_error
            .as_ref()
            .is_some_and(|e| e.contains("ledger_id mismatch"))
    );
    install(empty_bytes.clone(), &[], false);
    pic.update_call(
        sender,
        controller(),
        "forward",
        candid::encode_one(vec![PokeMatch {
            target: PokeTarget::subaccount(7),
            max_amount: 1u64.into(),
        }])
        .unwrap(),
    )
    .unwrap();
    for _ in 0..12 {
        pic.tick();
    }
    let baseline = status(&pic, id);
    assert!(baseline.source.binding_checked);
    assert_eq!(baseline.source.admitted_to_exclusive, 0);
    // Ignore global/neuron/wrong/zero vectors without changing any durable status field.
    for payload in [
        vec![],
        vec![PokeMatch {
            target: PokeTarget::neuron_nonce(7),
            max_amount: 1u64.into(),
        }],
        vec![PokeMatch {
            target: PokeTarget::subaccount(0),
            max_amount: 1u64.into(),
        }],
        vec![PokeMatch {
            target: PokeTarget::subaccount(7),
            max_amount: 0u64.into(),
        }],
    ] {
        pic.update_call(
            sender,
            controller(),
            "forward",
            candid::encode_one(payload).unwrap(),
        )
        .unwrap();
    }
    let ignored = status(&pic, id);
    assert_eq!(ignored.revision, baseline.revision);
    assert_eq!(ignored.source.index_calls, baseline.source.index_calls);
    let poke = || {
        pic.update_call(
            sender,
            controller(),
            "forward",
            candid::encode_one(vec![PokeMatch {
                target: PokeTarget::subaccount(7),
                max_amount: candid::Nat::parse(b"184467440737095516160000000").unwrap(),
            }])
            .unwrap(),
        )
        .unwrap();
    };
    poke();
    for _ in 0..8 {
        pic.tick();
    } // index lag: still empty, not a payment
    assert_eq!(status(&pic, id).source.admitted_to_exclusive, 0);
    let recipient = source::receiving_account(id, 7).to_string();
    let funding = source::receiving_account(controller(), 0).to_string();
    let history = |ids: Vec<u64>| -> Vec<u8> {
        let response: source::HistoryResult = Ok(source::History {
            balance: 0,
            oldest_tx_id: Some(1),
            transactions: ids
                .into_iter()
                .map(|id| source::TransactionWithId {
                    id,
                    transaction: source::Transaction {
                        memo: 0,
                        icrc1_memo: None,
                        created_at_time: None,
                        timestamp: None,
                        operation: source::Operation::Transfer {
                            from: funding.clone(),
                            to: recipient.clone(),
                            amount: source::Tokens { e8s: 1 },
                            fee: source::Tokens { e8s: 10_000 },
                            spender: None,
                        },
                    },
                })
                .collect(),
        });
        candid::encode_one(response).unwrap()
    };
    install(history((100..164).rev().collect()), &[], false);
    for _ in 0..4 {
        tick(&pic);
    }
    let downloading = status(&pic, id);
    assert_eq!(downloading.source.pending_records, 64);
    assert_eq!(downloading.source.admitted_to_exclusive, 0);
    assert!(
        downloading
            .source
            .last_error
            .as_ref()
            .is_some_and(|s| s.contains("non-descending")),
        "repeated page must fail visibly"
    );
    pic.upgrade_canister(
        id,
        wasm.clone(),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    assert_eq!(status(&pic, id).source.pending_records, 64);
    // A newer arrival cannot be smuggled into the frozen older continuation.
    install(history(vec![200, 99, 5, 1]), &[], false);
    poke();
    for _ in 0..8 {
        pic.tick();
    }
    assert_eq!(status(&pic, id).source.admitted_to_exclusive, 0);
    install(history(vec![99, 5, 1]), &[], false);
    poke();
    for _ in 0..16 {
        pic.tick();
    }
    let admitted = status(&pic, id);
    assert_eq!(admitted.source.admitted_to_exclusive, 164);
    assert_eq!(admitted.source.pending_records, 0);
    #[derive(CandidType, Deserialize)]
    struct Work {
        pending_inputs: u32,
    }
    let work: Work = decode_one::<Result<Work, String>>(
        &pic.query_call(
            id,
            controller(),
            "controller_work",
            encode_args(()).unwrap(),
        )
        .unwrap(),
    )
    .unwrap()
    .unwrap();
    assert_eq!(work.pending_inputs, 67);
    for _ in 0..12 {
        tick(&pic);
    } // exhaust the original 2/10-second poke retries
    // An unavailable index cannot change admitted progress. Fallback later recovers.
    install(vec![], &["get_account_identifier_transactions"], false);
    poke();
    for _ in 0..8 {
        pic.tick();
    }
    assert_eq!(status(&pic, id).source.admitted_to_exclusive, 164);
    assert!(status(&pic, id).source.last_error.is_some());
    install(history(vec![200, 163, 99, 5, 1]), &[], false);
    for _ in 0..65 {
        tick(&pic);
    }
    assert_eq!(status(&pic, id).source.admitted_to_exclusive, 201);
    let work: Work = decode_one::<Result<Work, String>>(
        &pic.query_call(
            id,
            controller(),
            "controller_work",
            encode_args(()).unwrap(),
        )
        .unwrap(),
    )
    .unwrap()
    .unwrap();
    assert_eq!(
        work.pending_inputs, 68,
        "recovery must admit the new ID exactly once"
    );
    let before_ignored = status(&pic, id).source.index_calls;
    for matches in [
        vec![
            PokeMatch {
                target: PokeTarget::subaccount(7),
                max_amount: 1u64.into()
            };
            257
        ],
        vec![PokeMatch {
            target: PokeTarget::subaccount(7),
            max_amount: candid::Nat::parse(&vec![b'9'; 100000]).unwrap(),
        }],
    ] {
        pic.update_call(
            sender,
            controller(),
            "forward",
            candid::encode_one(matches).unwrap(),
        )
        .unwrap();
    }
    assert_eq!(
        status(&pic, id).source.index_calls,
        before_ignored,
        "oversize target vector / encoded payload cannot schedule work"
    );
    install(empty_bytes, &[], false);
    let disabled = create_controlled(&pic);
    pic.add_cycles(disabled, 100_000_000_000_000);
    pic.install_canister(
        disabled,
        wasm.clone(),
        encode_args((
            initial_world(),
            0u64,
            IndexConfig {
                network: "pocketic-local".into(),
                ledger,
                index,
                receiving_subaccount: u64::MAX,
                event_horizon: None,
                starting_policy: StartingPolicy::FromBeginning,
            },
        ))
        .unwrap(),
        Some(controller()),
    );
    for _ in 0..12 {
        pic.tick();
    }
    let disabled_calls = status(&pic, disabled).source.index_calls;
    assert!(
        pic.update_call(
            disabled,
            controller(),
            "poke",
            candid::encode_one(vec![PokeMatch {
                target: PokeTarget::subaccount(0),
                max_amount: 1u64.into()
            }])
            .unwrap()
        )
        .is_err()
    );
    assert_eq!(status(&pic, disabled).source.index_calls, disabled_calls);
    assert_eq!(status(&pic, disabled).source.receiving_subaccount, u64::MAX);
    assert_eq!(
        status(&pic, disabled).source.recipient_account,
        source::receiving_account(disabled, u64::MAX).as_bytes()
    );
    pic.upgrade_canister(disabled, wasm, encode_args(()).unwrap(), Some(controller()))
        .unwrap();
    assert_eq!(status(&pic, disabled).source.receiving_subaccount, u64::MAX);
    for method in [
        "apply",
        "sync_ledger",
        "ledger_hint",
        "test_apply",
        "test_fill_scan_backpressure",
    ] {
        assert!(
            pic.update_call(id, controller(), method, encode_args(()).unwrap())
                .is_err()
        );
    }
}

#[test]
fn complete_index_range_backpressure_preserves_both_documents() {
    let owner = Principal::from_slice(&[4]);
    let (mut s, source_id) = source::SourceState::configured(
        IndexConfig {
            network: "pocketic-local".into(),
            ledger: Principal::from_slice(&[1]),
            index: Principal::from_slice(&[2]),
            receiving_subaccount: 0,
            event_horizon: None,
            starting_policy: StartingPolicy::FromBeginning,
        },
        owner,
    )
    .unwrap();
    let mut identity = b2z_native::identity().unwrap();
    identity["source_id"] = serde_json::Value::String(source_id);
    let identity: dtr_host::Identity = serde_json::from_value(identity).unwrap();
    let mut h = Coordinator::create(
        &initial_world(),
        identity,
        0,
        0,
        "00".repeat(32),
        B2zHostKernel,
    )
    .unwrap();
    for n in 0..16 {
        h.apply(Action::Ingest {
            start: Int::from(n * 256),
            records: vec![Some("aa".into()); 256],
            anchor: "ab".repeat(32),
        })
        .unwrap();
    }
    s.cursor = 4096;
    s.page(source::History {
        balance: 0,
        oldest_tx_id: Some(5000),
        transactions: vec![source::TransactionWithId {
            id: 5000,
            transaction: source::Transaction {
                memo: 0,
                icrc1_memo: None,
                created_at_time: None,
                timestamp: None,
                operation: source::Operation::Transfer {
                    from: source::receiving_account(controller(), 0).to_string(),
                    to: s.recipient_hex.clone(),
                    amount: source::Tokens { e8s: 1 },
                    fee: source::Tokens { e8s: 10_000 },
                    spender: None,
                },
            },
        }],
    })
    .unwrap();
    let source_bytes = serde_json::to_vec(&s).unwrap();
    let host_bytes = h.snapshot().unwrap();
    let (end, inputs, anchor) = s.admission(&h.record.inbox.source_anchor).unwrap();
    assert!(
        h.apply(Action::IngestOrdered {
            start: Int(s.cursor.into()),
            end: Int(end.into()),
            inputs,
            anchor
        })
        .unwrap_err()
        .contains("backpressure")
    );
    assert_eq!(h.snapshot().unwrap(), host_bytes);
    assert_eq!(serde_json::to_vec(&s).unwrap(), source_bytes);
    let restored: source::SourceState = serde_json::from_slice(&source_bytes).unwrap();
    assert_eq!(restored.cursor, 4096);
    assert!(restored.pending.unwrap().complete);
}

#[test]
fn slow_index_calls_coalesce_timers_and_fence_late_responses() {
    for upgrade in [false, true] {
        let builder = PocketIcBuilder::new()
            .with_nns_subnet()
            .with_application_subnet();
        let pic = if let Ok(url) = std::env::var("POCKET_IC_SERVER_URL") {
            builder.with_server_url(url.parse().unwrap()).build()
        } else {
            builder
                .with_server_binary(PathBuf::from(std::env::var("POCKET_IC_BIN").unwrap()))
                .build()
        };
        let ledger = create_controlled(&pic);
        let index = create_controlled(&pic);
        let id = create_controlled(&pic);
        let sender = create_controlled(&pic);
        for c in [index, id, sender] {
            pic.add_cycles(c, 100_000_000_000_000);
        }
        let recipient = source::receiving_account(id, 0).to_string();
        let history = |ids: Vec<u64>| -> Vec<u8> {
            let reply: source::HistoryResult = Ok(source::History {
                balance: 0,
                oldest_tx_id: Some(100),
                transactions: ids
                    .into_iter()
                    .map(|id| source::TransactionWithId {
                        id,
                        transaction: source::Transaction {
                            memo: 0,
                            icrc1_memo: None,
                            created_at_time: None,
                            timestamp: None,
                            operation: source::Operation::Transfer {
                                from: source::receiving_account(controller(), 0).to_string(),
                                to: recipient.clone(),
                                amount: source::Tokens { e8s: 1 },
                                fee: source::Tokens { e8s: 10_000 },
                                spender: None,
                            },
                        },
                    })
                    .collect(),
            });
            candid::encode_one(reply).unwrap()
        };
        let fixture_path=std::env::var("S14_SLOW_INDEX_WASM").map(PathBuf::from).unwrap_or_else(|_|Path::new(env!("CARGO_MANIFEST_DIR")).join("../../tools/s14-index-fixture/target/wasm32-unknown-unknown/release/s14_index_fixture.wasm"));
        pic.install_canister(
            index,
            std::fs::read(fixture_path).unwrap(),
            encode_args((ledger, 90u32, history(vec![100]))).unwrap(),
            Some(controller()),
        );
        let wasm = bytes("B2Z_S14_WASM");
        pic.install_canister(
            id,
            wasm.clone(),
            encode_args((
                initial_world(),
                0u64,
                IndexConfig {
                    network: "pocketic-local".into(),
                    ledger,
                    index,
                    receiving_subaccount: 0,
                    event_horizon: Some(sender),
                    starting_policy: StartingPolicy::FromBeginning,
                },
            ))
            .unwrap(),
            Some(controller()),
        );
        pic.install_canister(
            sender,
            poke_forwarder(id),
            encode_args(()).unwrap(),
            Some(controller()),
        );
        for _ in 0..8 {
            pic.tick();
        }
        for _ in 0..12 {
            pic.update_call(
                sender,
                controller(),
                "forward",
                candid::encode_one(vec![PokeMatch {
                    target: PokeTarget::subaccount(0),
                    max_amount: 1u64.into(),
                }])
                .unwrap(),
            )
            .unwrap();
            tick(&pic);
            let s = status(&pic, id);
            assert_eq!(
                s.source.index_calls, 1,
                "timer/poke must not overlap the active scan: error={:?}, active={}",
                s.source.last_error, s.source.scan_in_flight
            );
            assert!(s.source.scan_in_flight);
            assert_eq!(s.source.admitted_to_exclusive, 0);
        }
        pic.update_call(
            index,
            controller(),
            "set_reply",
            encode_args((0u32, history(vec![201, 100]))).unwrap(),
        )
        .unwrap();
        if upgrade {
            pic.upgrade_canister(id, wasm, encode_args(()).unwrap(), Some(controller()))
                .unwrap();
        }
        // Release at virtual second 50: after source replacement, before the
        // management HTTP fixture expires at 60. It is not a source deadline.
        for _ in 0..38 {
            tick(&pic);
        }
        assert_eq!(
            status(&pic, id).source.admitted_to_exclusive,
            202,
            "replacement must admit before old index response is released"
        );
        let held = pic.get_canister_http();
        assert_eq!(
            held.len(),
            1,
            "controlled fixture must hold a genuine await"
        );
        let request = &held[0];
        pic.mock_canister_http_response(pocket_ic::common::rest::MockCanisterHttpResponse {
            subnet_id: request.subnet_id,
            request_id: request.request_id,
            response: pocket_ic::common::rest::CanisterHttpResponse::CanisterHttpReply(
                pocket_ic::common::rest::CanisterHttpReply {
                    status: 200,
                    headers: vec![],
                    body: vec![],
                },
            ),
            additional_responses: vec![],
        });
        for _ in 0..40 {
            tick(&pic);
        }
        let s = status(&pic, id);
        assert_eq!(s.source.admitted_to_exclusive, 202);
        assert!(!s.source.scan_in_flight);
        assert!(s.source.last_error.is_none());
        #[derive(CandidType, Deserialize)]
        struct Work {
            pending_inputs: u32,
        }
        let work: Work = decode_one::<Result<Work, String>>(
            &pic.query_call(
                id,
                controller(),
                "controller_work",
                encode_args(()).unwrap(),
            )
            .unwrap(),
        )
        .unwrap()
        .unwrap();
        assert_eq!(
            work.pending_inputs, 2,
            "late stale response must never duplicate or erase input"
        );
    }
}

/// This traps B2Z's reply callback, not the index. Only the first callback traps;
/// its pre-await durable in-flight flag must recover through ordinary fallback.
#[test]
fn b2z_callback_trap_recovers_through_fallback_without_reset() {
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
    let ledger = create_controlled(&pic);
    let index = create_controlled(&pic);
    let id = create_controlled(&pic);
    let sender = create_controlled(&pic);
    for c in [index, id, sender] {
        pic.add_cycles(c, 100_000_000_000_000);
    }
    let response = |ids: Vec<u64>| {
        candid::encode_one(source::HistoryResult::Ok(source::History {
            balance: 0,
            oldest_tx_id: ids.iter().min().copied(),
            transactions: ids
                .into_iter()
                .rev()
                .map(|position| source::TransactionWithId {
                    id: position,
                    transaction: source::Transaction {
                        memo: 0,
                        icrc1_memo: None,
                        created_at_time: None,
                        timestamp: None,
                        operation: source::Operation::Transfer {
                            from: source::receiving_account(controller(), 0).to_string(),
                            to: source::receiving_account(id, 0).to_string(),
                            amount: source::Tokens { e8s: 1 },
                            fee: source::Tokens { e8s: 10_000 },
                            spender: None,
                        },
                    },
                })
                .collect(),
        }))
        .unwrap()
    };
    pic.install_canister(
        index,
        bytes("S14_SLOW_INDEX_WASM"),
        encode_args((ledger, 0u32, response(vec![]))).unwrap(),
        Some(controller()),
    );
    pic.install_canister(
        id,
        bytes("B2Z_S14_TEST_WASM"),
        encode_args((
            initial_world(),
            0u64,
            IndexConfig {
                network: "pocketic-local".into(),
                ledger,
                index,
                receiving_subaccount: 0,
                event_horizon: Some(sender),
                starting_policy: StartingPolicy::FromBeginning,
            },
        ))
        .unwrap(),
        Some(controller()),
    );
    pic.install_canister(
        sender,
        poke_forwarder(id),
        encode_args(()).unwrap(),
        Some(controller()),
    );
    for _ in 0..12 {
        pic.tick();
    }
    let baseline = status(&pic, id).source.index_calls;
    pic.update_call(
        id,
        controller(),
        "test_trap_next_index_reply",
        encode_args(()).unwrap(),
    )
    .unwrap();
    pic.update_call(
        index,
        controller(),
        "set_reply",
        encode_args((0u32, response(vec![100]))).unwrap(),
    )
    .unwrap();
    pic.update_call(
        sender,
        controller(),
        "forward",
        candid::encode_one(vec![PokeMatch {
            target: PokeTarget::subaccount(0),
            max_amount: 1u64.into(),
        }])
        .unwrap(),
    )
    .unwrap();
    for _ in 0..12 {
        tick(&pic);
    }
    let trapped = status(&pic, id);
    assert!(
        trapped.source.scan_in_flight,
        "B2Z callback rollback must retain pre-await lease"
    );
    assert_eq!(trapped.source.admitted_to_exclusive, 0);
    assert_eq!(
        trapped.source.index_calls,
        baseline + 1,
        "unexpired scan must not duplicate"
    );
    // No manual sync, upgrade, reset or additional poke. Only normal fallback.
    for _ in 0..65 {
        tick(&pic);
    }
    let recovered = status(&pic, id);
    assert_eq!(
        recovered.source.admitted_to_exclusive, 101,
        "ordinary fallback must replace the expired trapped lease"
    );
    assert!(!recovered.source.scan_in_flight);
    #[derive(CandidType, Deserialize)]
    struct Work {
        pending_inputs: u32,
    }
    let work: Work = decode_one::<Result<Work, String>>(
        &pic.query_call(
            id,
            controller(),
            "controller_work",
            encode_args(()).unwrap(),
        )
        .unwrap(),
    )
    .unwrap()
    .unwrap();
    assert_eq!(
        work.pending_inputs, 1,
        "trapped/retried payment admitted exactly once"
    );
    // Publish the recovered payment, then cross another ordinary fallback.
    let (_, genesis) = observe(&pic, id);
    let mut native = Coordinator::create(
        &initial_world(),
        genesis.identity,
        0,
        0,
        "00".repeat(32),
        B2zHostKernel,
    )
    .unwrap();
    let payments = BTreeMap::from([(
        100,
        normalized(source::receiving_account(controller(), 0), 1, [0; 8]),
    )]);
    let mut assigned = Vec::new();
    let mut last = None;
    let _: Status = get_result(
        &pic,
        id,
        "start_autonomous",
        candid::encode_one(RunConfig {
            segment_ticks: 2,
            pacing_seconds: 1,
            work_budget: 512,
        })
        .unwrap(),
    );
    for _ in 0..50 {
        tick(&pic);
        let (_, p) = observe(&pic, id);
        if p.head.segment_id != last {
            replay_head(&pic, id, &p, &mut native, &payments, &mut assigned);
            last = p.head.segment_id.clone();
        }
    }
    assert_eq!(
        assigned,
        vec![100],
        "recovered payment publishes exactly once, even after another fallback"
    );
    println!(
        "CALLBACK_TRAP_RESULT {}",
        serde_json::json!({"status":"PASS","trapped_cursor":trapped.source.admitted_to_exclusive,"trapped_in_flight":trapped.source.scan_in_flight,"unexpired_extra_calls":trapped.source.index_calls-baseline-1,"recovered_cursor":recovered.source.admitted_to_exclusive,"queued_once":work.pending_inputs,"published_once":assigned,"recovery":"ordinary fallback; no upgrade/reset"})
    );
}

#[test]
fn bounded_history_windows_drain_256_257_and_513_without_skipping() {
    for count in [256u64, 257, 513] {
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
        let ledger = create_controlled(&pic);
        let index = create_controlled(&pic);
        let id = create_controlled(&pic);
        for c in [index, id] {
            pic.add_cycles(c, 100_000_000_000_000);
        }
        let empty = candid::encode_one(source::HistoryResult::Ok(source::History {
            balance: 0,
            transactions: vec![],
            oldest_tx_id: None,
        }))
        .unwrap();
        pic.install_canister(
            index,
            bytes("S14_SLOW_INDEX_WASM"),
            encode_args((ledger, 0u32, empty)).unwrap(),
            Some(controller()),
        );
        let ids = (0..count).map(|n| 100 + n * 7).collect::<Vec<_>>();
        let recipient = source::receiving_account(id, 0);
        let funding = source::receiving_account(controller(), 0);
        pic.update_call(
            index,
            controller(),
            "set_history",
            encode_args((ids.clone(), recipient.to_string(), funding.to_string())).unwrap(),
        )
        .unwrap();
        let wasm = bytes("B2Z_S14_WASM");
        let world = initial_world();
        pic.install_canister(
            id,
            wasm.clone(),
            encode_args((
                world.clone(),
                0u64,
                IndexConfig {
                    network: "pocketic-local".into(),
                    ledger,
                    index,
                    receiving_subaccount: 0,
                    event_horizon: None,
                    starting_policy: StartingPolicy::FromBeginning,
                },
            ))
            .unwrap(),
            Some(controller()),
        );
        let (_, genesis) = observe(&pic, id);
        let mut replay = Coordinator::create(
            &world,
            genesis.identity,
            0,
            0,
            "00".repeat(32),
            B2zHostKernel,
        )
        .unwrap();
        let mut upgraded = false;
        let mut max_pending = 0;
        let mut last_cursor = 0;
        let mut new_ids = ids.clone();
        new_ids.push(ids[count as usize - 1] + 100);
        for _ in 0..150 {
            // Observe each platform round, so the upgrade interrupts downloading,
            // not a controller-driven source admission.
            pic.tick();
            let s = status(&pic, id);
            max_pending = max_pending.max(s.source.pending_records);
            assert!(s.source.admitted_to_exclusive >= last_cursor);
            last_cursor = s.source.admitted_to_exclusive;
            assert!(s.source.last_error.is_none(), "{:?}", s.source.last_error);
            if s.source.pending_records >= 64 && !upgraded {
                pic.upgrade_canister(
                    id,
                    wasm.clone(),
                    encode_args(()).unwrap(),
                    Some(controller()),
                )
                .unwrap();
                pic.update_call(
                    index,
                    controller(),
                    "set_history",
                    encode_args((new_ids.clone(), recipient.to_string(), funding.to_string()))
                        .unwrap(),
                )
                .unwrap();
                upgraded = true;
            }
            if s.source.admitted_to_exclusive == ids[count as usize - 1] + 1
                && !s.source.scan_in_flight
            {
                break;
            }
        }
        assert!(upgraded);
        assert!(max_pending <= 256);
        assert_eq!(
            status(&pic, id).source.admitted_to_exclusive,
            ids[count as usize - 1] + 1,
            "frozen range drains before newer arrival"
        );
        // The independently added newer row is discovered by ordinary fallback.
        for _ in 0..65 {
            tick(&pic);
        }
        assert_eq!(
            status(&pic, id).source.admitted_to_exclusive,
            *new_ids.last().unwrap() + 1
        );
        #[derive(CandidType, Deserialize)]
        struct Work {
            pending_inputs: u32,
        }
        let work: Work = decode_one::<Result<Work, String>>(
            &pic.query_call(
                id,
                controller(),
                "controller_work",
                encode_args(()).unwrap(),
            )
            .unwrap(),
        )
        .unwrap()
        .unwrap();
        assert_eq!(work.pending_inputs, count as u32 + 1);
        let _: Status = get_result(
            &pic,
            id,
            "start_autonomous",
            candid::encode_one(RunConfig {
                segment_ticks: 2,
                pacing_seconds: 1,
                work_budget: 512,
            })
            .unwrap(),
        );
        let payments = new_ids
            .iter()
            .map(|id| (*id, normalized(funding, 1, [0; 8])))
            .collect::<BTreeMap<_, _>>();
        let mut assigned = Vec::new();
        let mut last = None;
        for _ in 0..45 {
            tick(&pic);
            let (_, p) = observe(&pic, id);
            if p.head.segment_id != last {
                replay_head(&pic, id, &p, &mut replay, &payments, &mut assigned);
                last = p.head.segment_id.clone();
            }
            if assigned.len() == new_ids.len() {
                break;
            }
        }
        assert_eq!(
            assigned, new_ids,
            "every original sparse position is applied oldest first exactly once"
        );
        println!(
            "BACKLOG_RESULT {}",
            serde_json::json!({"records":count,"new_arrivals":1,"sampled_pending_high_water":max_pending,"assigned":assigned.len(),"status":"PASS"})
        );
    }
}

// Terminate only the browser driver owned by this test, including on assertion
// failure; its SIGTERM handler cleans its own server/Chromium children.
struct OwnedBrowser(std::process::Child);
impl Drop for OwnedBrowser {
    fn drop(&mut self) {
        if self.0.try_wait().ok().flatten().is_none() {
            let _ = std::process::Command::new("kill")
                .args(["-TERM", &self.0.id().to_string()])
                .status();
            for _ in 0..50 {
                if self.0.try_wait().ok().flatten().is_some() {
                    return;
                }
                std::thread::sleep(Duration::from_millis(100));
            }
            let _ = self.0.kill();
            let _ = self.0.wait();
        }
    }
}
/// Full built asset deployment, not an exported finite recording. All transfers
/// and controllers are valueless identities on this disposable local network.
/// Read-only seal collection must not wait behind the driver's transfer/upgrade
/// control flow. Keep normal retention and fail on every missing publication.
struct LivePublications {
    stop: std::sync::Arc<std::sync::atomic::AtomicBool>,
    entries: std::sync::Arc<std::sync::Mutex<Vec<Publication>>>,
    reader: Option<std::thread::JoinHandle<()>>,
}
impl LivePublications {
    fn start(pic: &PocketIc, id: Principal) -> Self {
        let stop = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
        let entries = std::sync::Arc::new(std::sync::Mutex::new(Vec::<Publication>::new()));
        let recording_pic =
            PocketIc::new_from_existing_instance(pic.get_server_url(), pic.instance_id(), None);
        let stop_reader = stop.clone();
        let recorded = entries.clone();
        let reader = std::thread::spawn(move || {
            let mut next = 0u64;
            while !stop_reader.load(std::sync::atomic::Ordering::Acquire) {
                let p = observe(&recording_pic, id).1;
                if let Some(segment) = &p.head.segment_id {
                    let head: u64 = segment.0.to_string().parse().unwrap();
                    for n in next..=head {
                        let observed = if n == head {
                            p.clone()
                        } else {
                            let bytes: Vec<u8> = get_query(
                                &recording_pic,
                                id,
                                "retained_publication",
                                candid::encode_one(n).unwrap(),
                            );
                            decode::<Publication>(&bytes).unwrap()
                        };
                        recorded.lock().unwrap().push(observed);
                    }
                    next = head + 1;
                }
                std::thread::sleep(Duration::from_millis(500));
            }
        });
        Self {
            stop,
            entries,
            reader: Some(reader),
        }
    }
    fn since(&self, offset: usize) -> Vec<Publication> {
        assert!(
            !self.reader.as_ref().unwrap().is_finished(),
            "live publication collector exited"
        );
        self.entries.lock().unwrap()[offset..].to_vec()
    }
    fn finish(&mut self) {
        self.stop.store(true, std::sync::atomic::Ordering::Release);
        if let Some(reader) = self.reader.take() {
            let result = reader.join();
            if !std::thread::panicking() {
                result.expect("live publication collector failed");
            }
        }
    }
}
impl Drop for LivePublications {
    fn drop(&mut self) {
        self.finish();
    }
}

#[test]
fn deployed_bundle_live_index_payments_reconnect_and_upgrade() {
    // Longer publications give certified receipt acquisition time during UI
    // setup. Restore the ordinary two-tick run before every measured trace.
    fn resume_setup(pic: &PocketIc, id: Principal) {
        get_result::<Status>(
            pic,
            id,
            "start_autonomous",
            candid::encode_one(RunConfig {
                segment_ticks: 8,
                pacing_seconds: 1,
                work_budget: 512,
            })
            .unwrap(),
        );
    }
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
    let payer = Principal::self_authenticating([9; 32]);
    let ledger = deploy_ledger(&pic, &bytes("ICP_LEDGER_WASM"), &[payer]);
    let index = create_controlled(&pic);
    let id = create_controlled(&pic);
    let sender = create_controlled(&pic);
    for c in [index, id, sender] {
        pic.add_cycles(c, 100_000_000_000_000);
    }
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
    let wasm = bytes("B2Z_S14_WASM");
    let world = initial_world();
    pic.install_canister(
        id,
        wasm.clone(),
        encode_args((
            world.clone(),
            0u64,
            IndexConfig {
                network: "pocketic-local".into(),
                ledger,
                index,
                receiving_subaccount: 0,
                event_horizon: Some(sender),
                starting_policy: StartingPolicy::FromBeginning,
            },
        ))
        .unwrap(),
        Some(controller()),
    );
    pic.install_canister(
        sender,
        poke_forwarder(id),
        encode_args(()).unwrap(),
        Some(controller()),
    );
    let (_, genesis) = observe(&pic, id);
    let mut native = Coordinator::create(
        &world,
        genesis.identity,
        0,
        0,
        "00".repeat(32),
        B2zHostKernel,
    )
    .unwrap();
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    let out = PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap());
    std::fs::create_dir_all(&out).unwrap();
    let recipient = source::receiving_account(id, 0);
    let funding = AccountIdentifier::new(&payer, &DEFAULT_SUBACCOUNT);
    let configuration = serde_json::json!({"network":"pocketic-local","canister_id":id.to_text(),"ledger":ledger.to_text(),"index":index.to_text(),"recipient":recipient.to_string(),"root_key_hex":hex(&pic.root_key().unwrap())});
    std::fs::write(
        out.join("configuration.json"),
        serde_json::to_vec(&configuration).unwrap(),
    )
    .unwrap();
    // Existing allowlisted loopback proxy requires explicit local trust metadata.
    std::fs::write(out.join("metadata.json"), b"{}").unwrap();
    std::fs::write(out.join("root-key.der"), pic.root_key().unwrap()).unwrap();
    let gateway = pic.make_live(None);
    let python = std::env::var("S14_BROWSER_PYTHON").unwrap_or_else(|_| "python3.11".into());
    let log = std::fs::File::create(out.join("browser.log")).unwrap();
    let mut browser = OwnedBrowser(
        std::process::Command::new(python)
            .current_dir(&root)
            .args([
                "-B",
                "tools/verify_s14_deployment.py",
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
    let mut payments = BTreeMap::new();
    let mut assigned = Vec::new();
    let mut publications = Vec::new();
    let mut last = None;
    let mut phase = -1;
    let mut pause_segments = 0;
    let mut first = None;
    let mut second = None;
    let mut third = None;
    let mut receipt_started = [true, false, false];
    let mut receipt_held = [false; 3];
    let mut first_resumed = false;
    // Includes dfx asset hosting, fallback, three responsive captures, clipboard,
    // reconnect/upgrade, three negative pages and reduced-motion verification.
    // Per-page waits remain bounded; the outer deadline includes cold asset
    // builds and responsive UI work on this host, outside the measured trace.
    let began = std::time::Instant::now();
    let deadline = began + Duration::from_secs(600);
    let mut logged_phase = -2;
    let mut timing = vec![];
    let mut last_timing = 0;
    let mut capture = LivePublications::start(&pic, id);
    while std::time::Instant::now() < deadline {
        // Independent read-only capture keeps running while a transfer or an
        // upgrade awaits. No replica pause, larger retention, or skipped seal.
        let ready = capture.since(publications.len());
        for observed in ready {
            let seal = observed.head.seal.as_ref().unwrap();
            let from: u64 = seal.source_from.0.to_string().parse().unwrap();
            let to: u64 = seal.source_to_exclusive.0.to_string().parse().unwrap();
            let inputs: Vec<_> = payments.range(from..to).map(|(id, _)| *id).collect();
            assert_eq!(inputs.len(), seal.input_count as usize);
            for input in inputs {
                assert!(!assigned.contains(&input));
                assigned.push(input);
            }
            last = observed.head.segment_id.clone();
            publications.push(observed);
        }
        if phase == -1 && out.join("bootstrap-anchor-read").exists() {
            let _: Status = get_result(
                &pic,
                id,
                "start_autonomous",
                candid::encode_one(RunConfig {
                    segment_ticks: 8,
                    pacing_seconds: 1,
                    work_budget: 512,
                })
                .unwrap(),
            );
            phase = 0;
        }
        if last.is_some() && !out.join("harness-genesis-retired").exists() {
            std::fs::write(
                out.join("harness-genesis-retired"),
                b"published
",
            )
            .unwrap();
        }
        let s = status(&pic, id);
        if began.elapsed().as_secs() > last_timing {
            last_timing = began.elapsed().as_secs();
            timing.push(serde_json::json!({"wall_ms":began.elapsed().as_millis(),"ic_ns":pic.get_time().as_nanos_since_unix_epoch().to_string(),"segments":s.run.completed_segments,"running":s.run.running,"pace":s.run.pace.as_ref().map(|p|p.nominal_milli)}));
            std::fs::write(
                out.join("producer-timing.json"),
                serde_json::to_vec(&timing).unwrap(),
            )
            .unwrap();
        }
        assert!(s.source.last_error.is_none(), "{:?}", s.source.last_error);
        assert!(s.run.last_error.is_none());
        if let Some(code) = browser.0.try_wait().unwrap() {
            assert!(
                code.success(),
                "browser deployment failed; see {}",
                out.join("browser.log").display()
            );
        }
        // Hold only paid setup receipts, before the measured live trace. The
        // first payment still wakes an enabled idle arena autonomously. Later
        // payments are admitted by the real source timer while the game waits.
        for (n, tx) in [first, second, third].iter().enumerate() {
            if let Some(tx) = tx {
                if !receipt_started[n] && s.source.admitted_to_exclusive > *tx {
                    resume_setup(&pic, id);
                    receipt_started[n] = true;
                }
                if assigned.contains(tx) && !receipt_held[n] {
                    get_result::<Status>(&pic, id, "pause_autonomous", encode_args(()).unwrap());
                    receipt_held[n] = true;
                }
            }
        }
        if phase == 0 && out.join("browser-connected").exists() && !s.source.scan_in_flight {
            // Isolate target-filter behaviour from the independent 60s poll.
            pic.stop_progress();
            for _ in 0..8 {
                pic.tick();
            }
            let before = status(&pic, id).source.index_calls;
            for target in [PokeTarget::subaccount(1), PokeTarget::neuron_nonce(0)] {
                pic.update_call(
                    sender,
                    controller(),
                    "forward",
                    candid::encode_one(vec![PokeMatch {
                        target,
                        max_amount: 1u64.into(),
                    }])
                    .unwrap(),
                )
                .unwrap();
            }
            assert_eq!(
                status(&pic, id).source.index_calls,
                before,
                "unrelated target must not call index"
            );
            pic.auto_progress();
            let tx = transfer_text(&pic, ledger, payer, id, 100_000_000, b"ANGLE 37.5");
            first = Some(tx);
            std::fs::write(out.join("harness-first-payment"), tx.to_string()).unwrap();
            payments.insert(
                tx,
                normalized(
                    funding,
                    100_000_000,
                    b2z_protocol::encode(b2z_protocol::Command::Angle(6827)),
                ),
            );
            pic.update_call(
                sender,
                controller(),
                "forward",
                candid::encode_one(vec![PokeMatch {
                    target: PokeTarget::subaccount(0),
                    max_amount: 100_000_000u64.into(),
                }])
                .unwrap(),
            )
            .unwrap();
            phase = 1;
        } else if phase == 1 && receipt_held[0] {
            if !out.join("browser-first-receipt-seen").exists() {
                std::thread::sleep(Duration::from_millis(500));
                continue;
            }
            if !first_resumed {
                resume_setup(&pic, id);
                first_resumed = true;
            }
            if !out.join("browser-first-cannon-seen").exists() {
                std::thread::sleep(Duration::from_millis(50));
                continue;
            }
            get_result::<Status>(&pic, id, "pause_autonomous", encode_args(()).unwrap());
            let tx = transfer_text(&pic, ledger, payer, id, 10_000_000, b"ANGLE 225");
            second = Some(tx);
            payments.insert(
                tx,
                normalized(
                    funding,
                    10_000_000,
                    b2z_protocol::encode(b2z_protocol::Command::Angle(40960)),
                ),
            );
            phase = 2;
        } else if phase == 2 && receipt_held[1] {
            std::fs::write(
                out.join("harness-second-payment"),
                second.unwrap().to_string(),
            )
            .unwrap();
            if !out.join("browser-second-receipt-seen").exists() {
                std::thread::sleep(Duration::from_millis(500));
                continue;
            }
            // The game is held at a real publication, with replica/certificates live.
            let world = arena_world(&pic, id);
            assert_eq!(world.cannons.len(), 1, "paid join created one cannon");
            assert_eq!(world.balls.len(), 2, "fallback payment bought second ball");
            let cannon = &world.cannons[0];
            let target = world
                .cells
                .iter()
                .enumerate()
                .find(|(cell, owner)| **owner == cannon.id && *cell != cannon.cell)
                .unwrap()
                .0;
            let mut memo = *b"BTZ\x12\0\0\0\0";
            memo[4..].copy_from_slice(&(target as u32).to_be_bytes());
            let tx = transfer_text(
                &pic,
                ledger,
                payer,
                id,
                10_000,
                format!("MOVE {target}").as_bytes(),
            );
            third = Some(tx);
            payments.insert(tx, normalized(funding, 10_000, memo));
            pic.update_call(
                sender,
                controller(),
                "forward",
                candid::encode_one(vec![PokeMatch {
                    target: PokeTarget::subaccount(0),
                    max_amount: 10_000u64.into(),
                }])
                .unwrap(),
            )
            .unwrap();
            phase = 6;
        } else if phase == 6 && receipt_held[2] {
            std::fs::write(
                out.join("harness-payments-done"),
                serde_json::to_vec(&[first.unwrap(), second.unwrap(), third.unwrap()]).unwrap(),
            )
            .unwrap();
            if !out.join("browser-paid-receipts-seen").exists() {
                std::thread::sleep(Duration::from_millis(500));
                continue;
            }
            start_arena(&pic, id);
            phase = 3;
        } else if phase == 3 && out.join("browser-disconnected").exists() {
            pause_segments = s.run.completed_segments;
            phase = 4;
        } else if phase == 4 && s.run.completed_segments >= pause_segments + 5 {
            #[derive(CandidType, Deserialize)]
            struct Work {
                phase: Option<String>,
            }
            let work: Work = decode_one::<Result<Work, String>>(
                &pic.query_call(
                    id,
                    controller(),
                    "controller_work",
                    encode_args(()).unwrap(),
                )
                .unwrap(),
            )
            .unwrap()
            .unwrap();
            if s.run.pace.is_some() || work.phase.is_some() {
                pic.upgrade_canister(
                    id,
                    wasm.clone(),
                    encode_args(()).unwrap(),
                    Some(controller()),
                )
                .unwrap();
                assert_eq!(
                    status(&pic, id).source.admitted_to_exclusive,
                    s.source.admitted_to_exclusive
                );
                std::fs::write(
                    out.join("harness-upgrade-ready"),
                    s.run.completed_segments.saturating_sub(1).to_string(),
                )
                .unwrap();
                phase = 5;
            }
        } else if phase == 5 && out.join("browser-complete").exists() {
            break;
        }
        if phase != logged_phase {
            println!(
                "DEPLOYMENT_PHASE {}",
                serde_json::json!({"phase":phase,"host_elapsed_seconds":began.elapsed().as_secs(),"completed_segments":s.run.completed_segments})
            );
            logged_phase = phase;
        }
        std::thread::sleep(Duration::from_millis(500));
    }
    capture.finish();
    if phase != 5 || !out.join("browser-complete").exists() {
        let _ = browser.0.kill();
        panic!(
            "deployment acceptance timeout in phase {phase}; see {}",
            out.join("browser.log").display()
        );
    }
    assert!(browser.0.wait().unwrap().success());
    pic.stop_live();
    let mut replay_assigned = vec![];
    for p in &publications {
        replay_head_with_artifacts(
            &pic,
            id,
            p,
            &mut native,
            &payments,
            &mut replay_assigned,
            false,
        );
    }
    assert_eq!(replay_assigned, assigned);
    assert_eq!(
        assigned,
        vec![first.unwrap(), second.unwrap(), third.unwrap()]
    );
    let history = serde_json::json!({"status":"PASS","evidence_class":"DEPLOYMENT_BUNDLE_LIVE_LOCAL","initial_world_hex":hex(&world),"inputs":payments.iter().map(|(id,payload)|serde_json::json!({"position":id.to_string(),"payload_hex":payload})).collect::<Vec<_>>(),"publications":publications,"assigned":assigned});
    std::fs::write(
        out.join("history.json"),
        serde_json::to_vec_pretty(&history).unwrap(),
    )
    .unwrap();
    assert!(
        std::process::Command::new("node")
            .current_dir(&root)
            .args([
                "tools/replay_s14.mjs",
                out.join("history.json").to_str().unwrap(),
                out.join("replay.json").to_str().unwrap()
            ])
            .status()
            .unwrap()
            .success()
    );
}

/// Explicit old-release probe, never a mainnet operation. The reviewed old
/// module is supplied separately, so ordinary CI needs no historical checkout.
#[test]
#[ignore = "requires B2Z_PRIOR_WASM with the reviewed S14 module"]
fn pricing_profile_upgrade_preserves_history_but_does_not_reprice() {
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
    let ledger = create_controlled(&pic);
    let index = create_controlled(&pic);
    let old_game = create_controlled(&pic);
    let fresh_game = create_controlled(&pic);
    for c in [index, old_game, fresh_game] {
        pic.add_cycles(c, 100_000_000_000_000);
    }
    let empty = candid::encode_one(source::HistoryResult::Ok(source::History {
        balance: 0,
        transactions: vec![],
        oldest_tx_id: None,
    }))
    .unwrap();
    pic.install_canister(
        index,
        fixture_wasm(
            &[
                ("ledger_id", candid::encode_one(ledger).unwrap()),
                ("get_account_identifier_transactions", empty),
            ],
            &[],
        ),
        encode_args(()).unwrap(),
        Some(controller()),
    );
    let init = || {
        encode_args((
            initial_world(),
            0u64,
            IndexConfig {
                network: "pocketic-local".into(),
                ledger,
                index,
                receiving_subaccount: 0,
                event_horizon: None,
                starting_policy: StartingPolicy::FromBeginning,
            },
        ))
        .unwrap()
    };
    let old = bytes("B2Z_PRIOR_WASM");
    assert_eq!(
        dtr_wire::hash(&old),
        "15b016b9d156a1b90feeeb9be610fc7ba51d9413509c3c7161ab8e13faacb703"
    );
    pic.install_canister(old_game, old, init(), Some(controller()));
    get_result::<Status>(
        &pic,
        old_game,
        "start_autonomous",
        candid::encode_one(RunConfig {
            segment_ticks: 2,
            pacing_seconds: 1,
            work_budget: 512,
        })
        .unwrap(),
    );
    for _ in 0..16 {
        tick(&pic);
    }
    let before = status(&pic, old_game);
    assert!(before.run.completed_segments >= 2);
    let (_, publication_before) = observe(&pic, old_game);
    assert_eq!(
        publication_before.identity.config_hash,
        "3d15acf9031e65816c33e3987fe5bb28fee8f9a5acf742d83a7d97db5e3cd622"
    );
    pic.upgrade_canister(
        old_game,
        bytes("B2Z_S14_WASM"),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    let (_, publication_after) = observe(&pic, old_game);
    assert_eq!(
        encode_publication(&publication_before),
        encode_publication(&publication_after)
    );
    assert_eq!(
        status(&pic, old_game).source.admitted_to_exclusive,
        before.source.admitted_to_exclusive
    );
    for _ in 0..12 {
        tick(&pic);
    }
    let after = status(&pic, old_game);
    assert!(after.run.completed_segments > before.run.completed_segments);
    assert!(after.run.last_error.is_none());
    let (_, still_old) = observe(&pic, old_game);
    assert_eq!(
        still_old.identity.config_hash,
        publication_before.identity.config_hash
    );
    pic.install_canister(
        fresh_game,
        bytes("B2Z_S14_WASM"),
        init(),
        Some(controller()),
    );
    let (_, fresh) = observe(&pic, fresh_game);
    let identity = b2z_native::identity().unwrap();
    assert_eq!(
        fresh.identity.config_hash,
        identity["config_hash"].as_str().unwrap()
    );
    assert_ne!(fresh.identity.config_hash, still_old.identity.config_hash);
    println!(
        "PRICE_TRANSITION_RESULT {}",
        serde_json::json!({"status":"PASS","before_segments":before.run.completed_segments,"after_segments":after.run.completed_segments,"old_config":still_old.identity.config_hash,"new_config":fresh.identity.config_hash,"classification":"ordinary upgrade preserves historical price; 1 ICP activation requires separately approved fresh game"})
    );
}

#[derive(CandidType)]
struct IcrcTransferArg {
    to: IcrcAccount,
    fee: Option<candid::Nat>,
    memo: Option<Vec<u8>>,
    from_subaccount: Option<Vec<u8>>,
    created_at_time: Option<u64>,
    amount: candid::Nat,
}
fn transfer_text(
    pic: &PocketIc,
    ledger: Principal,
    payer: Principal,
    owner: Principal,
    amount: u64,
    memo: &[u8],
) -> u64 {
    let reply = pic
        .update_call(
            ledger,
            payer,
            "icrc1_transfer",
            candid::encode_one(IcrcTransferArg {
                to: IcrcAccount {
                    owner,
                    subaccount: None,
                },
                fee: Some(10_000u64.into()),
                memo: Some(memo.to_vec()),
                from_subaccount: None,
                created_at_time: None,
                amount: amount.into(),
            })
            .unwrap(),
        )
        .unwrap();
    #[derive(CandidType, Deserialize, Debug)]
    enum TransferError {
        GenericError {
            error_code: candid::Nat,
            message: String,
        },
    }
    decode_one::<Result<candid::Nat, TransferError>>(&reply)
        .unwrap()
        .unwrap()
        .0
        .to_string()
        .parse()
        .unwrap()
}
fn work(pic: &PocketIc, id: Principal) -> (u32, u64) {
    #[derive(CandidType, Deserialize)]
    struct Work {
        pending_inputs: u32,
        source_cursor: u64,
    }
    let w: Work = decode_one::<Result<Work, String>>(
        &pic.query_call(
            id,
            controller(),
            "controller_work",
            encode_args(()).unwrap(),
        )
        .unwrap(),
    )
    .unwrap()
    .unwrap();
    (w.pending_inputs, w.source_cursor)
}
/// Real upstream ICRC-1 -> real index -> normal adapter -> canonical input ->
/// installed game -> native/JS replay, with a paused pending inbox at upgrade.
fn s15_text_path(prior: Option<Vec<u8>>) {
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
    let payer = Principal::self_authenticating([9; 32]);
    let rival = Principal::self_authenticating([19; 32]);
    let ledger = deploy_ledger(&pic, &bytes("ICP_LEDGER_WASM"), &[payer, rival]);
    let index = create_controlled(&pic);
    let id = create_controlled(&pic);
    for c in [index, id] {
        pic.add_cycles(c, 100_000_000_000_000);
    }
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
    let is_historical = prior.is_some();
    let legacy_text = prior.as_ref().is_some_and(|p| {
        !matches!(
            dtr_wire::hash(p).as_str(),
            "187df32c5c95623abf13f52a626c9daeb3ee36591e9f6cf0d27cad8b109f4ce1"
                | "1510d8677464944d0d2ddad53370f339b75ab627ff0e3c8180467a3e63fa84f3"
        )
    });
    let old = prior.unwrap_or_else(|| bytes("B2Z_S14_WASM"));
    if is_historical {
        assert!(matches!(
            dtr_wire::hash(&old).as_str(),
            "1510d8677464944d0d2ddad53370f339b75ab627ff0e3c8180467a3e63fa84f3"
                | "187df32c5c95623abf13f52a626c9daeb3ee36591e9f6cf0d27cad8b109f4ce1"
                | "2cd80ba464a98bcc56c42e3e29996b10b2dd87e60ed9045fea0043992cfe9a3c"
                | "c831ecaa2ac1f4b7ed51179e2b880d01f32c19e5d03b3e2214027677f378dde4"
        ));
    }
    let initial = initial_world();
    pic.install_canister(
        id,
        old,
        encode_args((
            initial.clone(),
            0u64,
            IndexConfig {
                network: "pocketic-local".into(),
                ledger,
                index,
                receiving_subaccount: 0,
                event_horizon: None,
                starting_policy: StartingPolicy::FromBeginning,
            },
        ))
        .unwrap(),
        Some(controller()),
    );
    let (_, genesis) = observe(&pic, id);
    assert_eq!(
        genesis.identity.config_hash,
        "05f9b342c37d7dd5e53d6f12dce90d2ba53988ec3c1ccfeaedd8906f51042a42"
    );
    let mut native = Coordinator::create(
        &initial,
        genesis.identity.clone(),
        0,
        0,
        "00".repeat(32),
        B2zHostKernel,
    )
    .unwrap();
    let recipient = source::receiving_account(id, 0);
    let funding = AccountIdentifier::new(&payer, &DEFAULT_SUBACCOUNT);
    let mut payments = BTreeMap::new();
    let mut blobs = BTreeMap::new();
    let mut add = |tx, payer, amount, memo| {
        payments.insert(
            tx,
            normalized(
                AccountIdentifier::new(&payer, &DEFAULT_SUBACCOUNT),
                amount,
                memo,
            ),
        );
    };
    let a = b2z_protocol::encode(b2z_protocol::Command::Angle(6827));
    let b = b2z_protocol::encode(b2z_protocol::Command::Angle(40960));
    let first = transfer(&pic, ledger, payer, recipient, 100_000_000, a);
    add(first, payer, 100_000_000, a);
    let second = transfer(&pic, ledger, rival, recipient, 100_000_000, b);
    add(second, rival, 100_000_000, b);
    let invalid = transfer_text(&pic, ledger, payer, id, 1, b"ANGLE NaN");
    add(invalid, payer, 1, [0; 8]);
    blobs.insert(invalid, b"ANGLE NaN".to_vec());
    let run = || {
        candid::encode_one(RunConfig {
            segment_ticks: 2,
            pacing_seconds: 1,
            work_budget: 512,
        })
        .unwrap()
    };
    get_result::<Status>(&pic, id, "start_autonomous", run());
    let mut assigned = vec![];
    let mut publications = vec![];
    let mut last = None;
    #[derive(serde::Deserialize)]
    struct Receipt {
        position: Int,
        reason: String,
        kind: Option<String>,
    }
    #[derive(serde::Deserialize)]
    struct Audit {
        receipts: Vec<Receipt>,
    }
    let receipts = std::cell::RefCell::new(BTreeMap::new());
    let capture = |native: &mut Coordinator<B2zHostKernel>,
                   assigned: &mut Vec<u64>,
                   publications: &mut Vec<Publication>,
                   last: &mut Option<Int>,
                   payments: &BTreeMap<u64, String>| {
        let (_, p) = observe(&pic, id);
        if p.head.segment_id.is_some() && p.head.segment_id != *last {
            replay_head(&pic, id, &p, native, payments, assigned);
            let audit: Audit = decode(&publication(&native.record).unwrap().artifacts[1]).unwrap();
            for receipt in audit.receipts {
                let position = receipt.position.0.to_string().parse::<u64>().unwrap();
                assert!(
                    receipts
                        .borrow_mut()
                        .insert(position, (receipt.reason, receipt.kind))
                        .is_none(),
                    "duplicate receipt"
                );
            }
            *last = p.head.segment_id.clone();
            publications.push(p);
        }
    };
    for _ in 0..140 {
        tick(&pic);
        capture(
            &mut native,
            &mut assigned,
            &mut publications,
            &mut last,
            &payments,
        );
        if assigned.len() == 3 {
            break;
        }
    }
    assert_eq!(assigned, vec![first, second, invalid]);
    let before_world =
        b2z_native::world::World::decode(&publication(&native.record).unwrap().artifacts[0])
            .unwrap();
    assert_eq!(before_world.cannons.len(), 2);
    assert_eq!(before_world.received_e8s, Int(200_000_001u64.into()));
    get_result::<Status>(&pic, id, "pause_autonomous", encode_args(()).unwrap());
    // Valid binary blob and text are both downloaded/normalized by the OLD adapter while paused.
    let binary = b2z_protocol::encode(b2z_protocol::Command::Angle(8192));
    let pending_binary = transfer_text(&pic, ledger, payer, id, 10_000_000, &binary);
    payments.insert(pending_binary, normalized(funding, 10_000_000, binary));
    blobs.insert(pending_binary, binary.to_vec());
    let pending_text = transfer_text(&pic, ledger, payer, id, 40_000_000, b"ANGLE 135");
    let pending_command = if legacy_text {
        [0; 8]
    } else {
        b2z_protocol::encode(b2z_protocol::Command::Angle(24576))
    };
    payments.insert(
        pending_text,
        normalized(funding, 40_000_000, pending_command),
    );
    blobs.insert(pending_text, b"ANGLE 135".to_vec());
    for _ in 0..130 {
        tick(&pic);
        capture(
            &mut native,
            &mut assigned,
            &mut publications,
            &mut last,
            &payments,
        );
        if status(&pic, id).source.admitted_to_exclusive > pending_text {
            break;
        }
    }
    assert_eq!(
        work(&pic, id).0,
        2,
        "two already normalized payments wait while paused"
    );
    let before_status = status(&pic, id);
    let before_work = work(&pic, id);
    let (before_obs, before_pub) = observe(&pic, id);
    let controllers = pic
        .canister_status(id, Some(controller()))
        .unwrap()
        .settings
        .controllers;
    let before_artifacts = publication(&native.record).unwrap().artifacts;
    assert!(before_pub.head.segment_id.is_some());
    pic.upgrade_canister(
        id,
        bytes("B2Z_S14_WASM"),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    let (after_obs, after_pub) = observe(&pic, id);
    assert_eq!(
        before_obs.publication, after_obs.publication,
        "entire publication/seal/catalog remains byte-identical"
    );
    assert_eq!(before_pub.identity, after_pub.identity);
    assert_eq!(
        work(&pic, id),
        before_work,
        "queued canonical inputs and coordinator progress preserved"
    );
    assert_eq!(
        status(&pic, id).source.admitted_to_exclusive,
        before_status.source.admitted_to_exclusive
    );
    assert_eq!(
        pic.canister_status(id, Some(controller()))
            .unwrap()
            .settings
            .controllers,
        controllers
    );
    assert_eq!(
        publication(&native.record).unwrap().artifacts,
        before_artifacts
    );
    get_result::<Status>(&pic, id, "start_autonomous", run());
    for _ in 0..140 {
        tick(&pic);
        capture(
            &mut native,
            &mut assigned,
            &mut publications,
            &mut last,
            &payments,
        );
        if assigned.len() == 5 {
            break;
        }
    }
    assert_eq!(assigned.len(), 5);
    // Invalid/empty memo followed by valid text must not wedge the source. Never fall back.
    let empty = transfer_text(&pic, ledger, payer, id, 1, b"");
    payments.insert(empty, normalized(funding, 1, [0; 8]));
    blobs.insert(empty, vec![]);
    // Exactly eight ASCII bytes must take the text grammar, then ordinary game ownership checks.
    let move123 = transfer_text(&pic, ledger, payer, id, 10_000, b"MOVE 123");
    payments.insert(
        move123,
        normalized(
            funding,
            10_000,
            b2z_protocol::encode(b2z_protocol::Command::Move(123)),
        ),
    );
    blobs.insert(move123, b"MOVE 123".to_vec());
    let text = transfer_text(&pic, ledger, payer, id, 160_000_000, b"ANGLE 225");
    payments.insert(text, normalized(funding, 160_000_000, b));
    blobs.insert(text, b"ANGLE 225".to_vec());
    for _ in 0..140 {
        tick(&pic);
        capture(
            &mut native,
            &mut assigned,
            &mut publications,
            &mut last,
            &payments,
        );
        if assigned.len() == 8 {
            break;
        }
    }
    assert_eq!(
        assigned,
        vec![
            first,
            second,
            invalid,
            pending_binary,
            pending_text,
            empty,
            move123,
            text
        ]
    );
    // The exact same original bytes/IDs must come back through the actual upstream index.
    let history: source::HistoryResult = decode_one(
        &pic.query_call(
            index,
            controller(),
            "get_account_identifier_transactions",
            candid::encode_one(source::HistoryArgs {
                account_identifier: recipient.to_string(),
                start: None,
                max_results: 64,
            })
            .unwrap(),
        )
        .unwrap(),
    )
    .unwrap();
    let history = history.unwrap();
    assert_eq!(history.transactions.len(), 8);
    for row in &history.transactions {
        if let Some(expected) = blobs.get(&row.id) {
            assert_eq!(row.transaction.icrc1_memo.as_ref(), Some(expected));
            assert_eq!(
                row.transaction.memo, 0,
                "upstream ICRC-1 sets numeric memo to zero"
            );
        }
    }
    assert!(status(&pic, id).source.last_error.is_none());
    assert!(status(&pic, id).run.last_error.is_none());
    assert_eq!(status(&pic, id).source.admitted_to_exclusive, text + 1);
    let final_world =
        b2z_native::world::World::decode(&publication(&native.record).unwrap().artifacts[0])
            .unwrap();
    assert_eq!(final_world.received_e8s, Int(410_010_002u64.into()));
    let receipts = receipts.into_inner();
    assert_eq!(receipts.len(), 8);
    assert_eq!(receipts[&first].0, "ACCEPTED");
    assert_eq!(receipts[&second].0, "ACCEPTED");
    assert_ne!(receipts[&invalid].0, "ACCEPTED");
    assert_ne!(receipts[&empty].0, "ACCEPTED");
    assert_eq!(receipts[&pending_binary].0, "ACCEPTED");
    assert_eq!(
        receipts[&pending_text].0 == "ACCEPTED",
        !legacy_text,
        "historical rejection must not become v3 acceptance"
    );
    assert_eq!(receipts[&text].0, "ACCEPTED");
    let out = PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap());
    std::fs::create_dir_all(&out).unwrap();
    let name = if is_historical {
        "s15-deployed-upgrade"
    } else {
        "s15-text-path"
    };
    let result = serde_json::json!({"status":"PASS","adapter_version":3,"deployed_module_upgrade":is_historical,"before_source_cursor":before_status.source.admitted_to_exclusive,"pending_inputs":before_work.0,"publication_preserved":true,"initial_world_hex":hex(&initial),"inputs":payments.iter().map(|(id,payload)|serde_json::json!({"position":id.to_string(),"payload_hex":payload})).collect::<Vec<_>>(),"publications":publications,"assigned":assigned,"receipts":receipts,"raw_index":history.transactions.iter().map(|r|serde_json::json!({"id":r.id,"legacy":r.transaction.memo,"blob_hex":r.transaction.icrc1_memo.as_ref().map(|b|hex(b)),"raw_candid_hex":hex(&candid::encode_one(r).unwrap())})).collect::<Vec<_>>()});
    let path = out.join(format!("{name}-history.json"));
    std::fs::write(&path, serde_json::to_vec_pretty(&result).unwrap()).unwrap();
    assert!(
        std::process::Command::new("node")
            .current_dir(Path::new(env!("CARGO_MANIFEST_DIR")).join("../.."))
            .args([
                "tools/replay_s14.mjs",
                path.to_str().unwrap(),
                out.join(format!("{name}-replay.json")).to_str().unwrap()
            ])
            .status()
            .unwrap()
            .success()
    );
}
#[test]
fn upstream_text_memos_normalize_once_and_preserve_pending_upgrade() {
    s15_text_path(None);
}
#[test]
#[ignore = "requires exact currently deployed B2Z_DEPLOYED_WASM"]
fn s15_upgrade_from_deployed_module_with_players_publications_and_pending() {
    s15_text_path(Some(bytes("B2Z_DEPLOYED_WASM")));
}

#[test]
#[ignore = "requires exact installed S15 B2Z_CURRENT_DEPLOYED_WASM"]
fn b2z_upgrade_from_s15_with_players_publications_and_pending() {
    let old = bytes("B2Z_CURRENT_DEPLOYED_WASM");
    assert_eq!(
        dtr_wire::hash(&old),
        "c831ecaa2ac1f4b7ed51179e2b880d01f32c19e5d03b3e2214027677f378dde4"
    );
    s15_text_path(Some(old));
}

#[test]
#[ignore = "requires exact deployed B2Z_IDLE_PRIOR_WASM"]
fn empty_arena_upgrade_preserves_players_publications_and_pending() {
    s15_text_path(Some(bytes("B2Z_IDLE_PRIOR_WASM")));
}

fn arena_world(pic: &PocketIc, id: Principal) -> b2z_native::world::World {
    let (_, p) = observe(pic, id);
    if let Some(segment) = &p.head.segment_id {
        let bundled: Vec<Vec<u8>> = get_query(
            pic,
            id,
            "artifact_bundle",
            encode_args((
                segment.0.to_string().parse::<u64>().unwrap(),
                dtr_wire::hash(&encode_publication(&p)),
            ))
            .unwrap(),
        );
        assert_eq!(bundled.len(), p.artifacts.len());
        for (bytes, descriptor) in bundled.iter().zip(&p.artifacts) {
            assert_eq!(bytes.len(), descriptor.length);
            assert_eq!(dtr_wire::hash(bytes), descriptor.sha256);
        }
        return b2z_native::world::World::decode(&bundled[0]).unwrap();
    }
    let mut data = Vec::new();
    for n in 0..p.artifacts[0].chunks.len() {
        let chunk: Vec<u8> = get_query(
            pic,
            id,
            "artifact_chunk",
            encode_args((dtr_wire::hash(&encode_publication(&p)), 0u8, n as u16)).unwrap(),
        );
        data.extend(chunk);
    }
    b2z_native::world::World::decode(&data).unwrap()
}
fn get_query<T: for<'de> Deserialize<'de> + CandidType>(
    pic: &PocketIc,
    id: Principal,
    method: &str,
    args: Vec<u8>,
) -> T {
    decode_one::<Result<T, String>>(&pic.query_call(id, controller(), method, args).unwrap())
        .unwrap()
        .unwrap()
}
fn start_arena(pic: &PocketIc, id: Principal) {
    get_result::<Status>(
        pic,
        id,
        "start_autonomous",
        candid::encode_one(RunConfig {
            segment_ticks: 2,
            pacing_seconds: 1,
            work_budget: 512,
        })
        .unwrap(),
    );
}
fn arena_setup(wasm: Vec<u8>) -> (PocketIc, Principal, Principal, Principal) {
    arena_setup_world(wasm, initial_world())
}
fn arena_setup_world(
    wasm: Vec<u8>,
    initial: Vec<u8>,
) -> (PocketIc, Principal, Principal, Principal) {
    arena_setup_world_fee(wasm, initial, 10_000)
}
fn arena_setup_world_fee(
    wasm: Vec<u8>,
    initial: Vec<u8>,
    fee: u64,
) -> (PocketIc, Principal, Principal, Principal) {
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
    let payer = Principal::self_authenticating([9; 32]);
    let ledger = deploy_ledger_fee(&pic, &bytes("ICP_LEDGER_WASM"), &[payer], fee);
    let index = create_controlled(&pic);
    let id = create_controlled(&pic);
    for c in [id, index] {
        pic.add_cycles(c, 100_000_000_000_000);
    }
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
    pic.install_canister(
        id,
        wasm,
        encode_args((
            initial,
            0u64,
            IndexConfig {
                network: "pocketic-local".into(),
                ledger,
                index,
                receiving_subaccount: 0,
                event_horizon: None,
                starting_policy: StartingPolicy::FromBeginning,
            },
        ))
        .unwrap(),
        Some(controller()),
    );
    for _ in 0..5 {
        tick(&pic);
    }
    assert!(status(&pic, id).source.binding_checked);
    (pic, id, ledger, payer)
}
fn cost_window(pic: &PocketIc, id: Principal, label: &str, seconds: u64) -> serde_json::Value {
    let before = status(pic, id);
    let balance = pic.cycle_balance(id);
    let start = pic.get_time();
    let mut actions = BTreeMap::<String, (u128, u64)>::new();
    let mut prev = before.clone();
    let mut prev_balance = balance;
    #[derive(CandidType, Deserialize)]
    struct Phase {
        phase: Option<String>,
    }
    for _ in 0..seconds {
        let phase: Phase = get_query(pic, id, "controller_work", encode_args(()).unwrap());
        tick(pic);
        let now = status(pic, id);
        let remaining = pic.cycle_balance(id);
        let label = if now.source.index_calls != prev.source.index_calls {
            "index-poll-overlap"
        } else if now.run.callback_count == prev.run.callback_count {
            "no-simulation"
        } else if now.run.completed_segments > prev.run.completed_segments {
            "publish"
        } else if phase.phase.is_none() {
            "seal"
        } else {
            "step"
        };
        let e = actions.entry(label.into()).or_default();
        e.0 += prev_balance - remaining;
        e.1 += 1;
        prev = now;
        prev_balance = remaining;
    }
    let spent = balance - pic.cycle_balance(id);
    let after = status(pic, id);
    let segments = after.run.completed_segments - before.run.completed_segments;
    let result = serde_json::json!({"label":label,"seconds":(pic.get_time().as_nanos_since_unix_epoch()-start.as_nanos_since_unix_epoch()) as f64 / 1e9,"cycles":spent.to_string(),"segments":segments,"callbacks":after.run.callback_count-before.run.callback_count,"index_calls":after.source.index_calls-before.source.index_calls,"cycles_per_segment":if segments>0{Some((spent/segments as u128).to_string())}else{None},"cycle_buckets":actions.iter().map(|(k,(c,n))|(k,serde_json::json!({"cycles":c.to_string(),"seconds":n}))).collect::<BTreeMap<_,_>>()});
    println!("ARENA_COST {result}");
    result
}
#[test]
fn empty_arena_initial_rejected_payment_wakeup_and_browser_closed_activation() {
    let prior = std::env::var("B2Z_MILLION_PRIOR_WASM")
        .map(|path| std::fs::read(path).unwrap())
        .unwrap_or_else(|_| bytes("B2Z_S14_WASM"));
    if std::env::var("B2Z_MILLION_PRIOR_WASM").is_ok() {
        assert_eq!(
            dtr_wire::hash(&prior),
            "e1e7b491215ba34308d757ec2fc1d59b2c631a9c443674149997f4f146fb3fac"
        );
    }
    let (pic, id, ledger, payer) = arena_setup(prior);
    start_arena(&pic, id);
    let before = status(&pic, id);
    let publication = observe(&pic, id).0.publication;
    assert_eq!(before.run.idle, Some(true));
    let idle = cost_window(&pic, id, "new-empty-idle", 180);
    assert_eq!(
        status(&pic, id).run.completed_segments,
        before.run.completed_segments
    );
    assert!(status(&pic, id).source.index_calls >= before.source.index_calls + 3);
    assert_eq!(observe(&pic, id).0.publication, publication);
    for (memo, amount) in [
        (b"ANGLE NaN".as_slice(), 1),
        (b"ANGLE 37.5".as_slice(), 99_999_999),
    ] {
        let previous = status(&pic, id).run.completed_segments;
        let tx = transfer_text(&pic, ledger, payer, id, amount, memo);
        for _ in 0..80 {
            tick(&pic);
            if status(&pic, id).run.completed_segments > previous
                && status(&pic, id).run.idle == Some(true)
            {
                break;
            }
        }
        let s = status(&pic, id);
        assert!(s.source.admitted_to_exclusive > tx);
        assert_eq!(s.run.completed_segments, previous + 1);
        assert_eq!(s.run.idle, Some(true));
        assert!(arena_world(&pic, id).cannons.is_empty());
        let mut audit = Vec::new();
        let (_, p) = observe(&pic, id);
        for n in 0..p.artifacts[1].chunks.len() {
            audit.extend(get_query::<Vec<u8>>(
                &pic,
                id,
                "artifact_chunk",
                encode_args((s.publication_hash.clone(), 1u8, n as u16)).unwrap(),
            ));
        }
        let a: serde_json::Value = serde_json::from_slice(&audit).unwrap();
        assert_ne!(a["receipts"][0]["reason"], "ACCEPTED");
        for _ in 0..8 {
            tick(&pic);
        }
        assert_eq!(
            status(&pic, id).run.completed_segments,
            previous + 1,
            "exactly once then idle"
        );
    }
    let paused = status(&pic, id);
    let prior = observe(&pic, id).0.publication;
    pic.upgrade_canister(
        id,
        bytes("B2Z_S14_WASM"),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    assert_eq!(observe(&pic, id).0.publication, prior);
    assert_eq!(status(&pic, id).run.idle, Some(true));
    assert_eq!(
        status(&pic, id).source.admitted_to_exclusive,
        paused.source.admitted_to_exclusive
    );
    let tx = transfer_text(&pic, ledger, payer, id, 100_000_000, b"ANGLE 37.5");
    for _ in 0..80 {
        tick(&pic);
        if !arena_world(&pic, id).cannons.is_empty() {
            break;
        }
    }
    assert!(status(&pic, id).source.admitted_to_exclusive > tx);
    assert_eq!(arena_world(&pic, id).cannons.len(), 1);
    assert_eq!(status(&pic, id).run.idle, Some(false));
    let n = status(&pic, id).run.completed_segments;
    for _ in 0..15 {
        tick(&pic);
    }
    assert!(
        status(&pic, id).run.completed_segments >= n + 4,
        "runs with no browser/poke"
    );
    let out = PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap());
    std::fs::create_dir_all(&out).unwrap();
    std::fs::write(
        out.join("idle-cost.json"),
        serde_json::to_vec_pretty(&idle).unwrap(),
    )
    .unwrap();
}
#[test]
#[ignore = "requires exact deployed B2Z_IDLE_PRIOR_WASM for cost comparison"]
fn empty_arena_old_new_cost_comparison() {
    let path = std::env::var("B2Z_IDLE_PRIOR_WASM").expect("explicit prior module required");
    let old = std::fs::read(path).unwrap();
    assert_eq!(
        dtr_wire::hash(&old),
        "187df32c5c95623abf13f52a626c9daeb3ee36591e9f6cf0d27cad8b109f4ce1"
    );
    let (pic, id, ledger, payer) = arena_setup(old);
    start_arena(&pic, id);
    let old_idle = cost_window(&pic, id, "prior-empty-producing", 180);
    let tx = transfer_text(&pic, ledger, payer, id, 100_000_000, b"ANGLE 37.5");
    for _ in 0..80 {
        tick(&pic);
        if !arena_world(&pic, id).cannons.is_empty() {
            break;
        }
    }
    assert!(status(&pic, id).source.admitted_to_exclusive > tx);
    // Align at a completed publication; same one-cannon world continues across upgrade.
    #[derive(CandidType, Deserialize)]
    struct Phase {
        phase: Option<String>,
    }
    while get_query::<Phase>(&pic, id, "controller_work", encode_args(()).unwrap())
        .phase
        .is_some()
    {
        tick(&pic);
    }
    let checkpoint = pic
        .take_canister_snapshot(id, Some(controller()), None)
        .unwrap();
    let old_active = cost_window(&pic, id, "prior-one-cannon", 180);
    let old_final = arena_world(&pic, id);
    pic.stop_canister(id, Some(controller())).unwrap();
    pic.load_canister_snapshot(id, Some(controller()), checkpoint.id)
        .unwrap();
    pic.start_canister(id, Some(controller())).unwrap();
    let before = observe(&pic, id).0.publication;
    let cursor = status(&pic, id).source.admitted_to_exclusive;
    pic.upgrade_canister(
        id,
        bytes("B2Z_S14_WASM"),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    assert_eq!(observe(&pic, id).0.publication, before);
    assert_eq!(status(&pic, id).source.admitted_to_exclusive, cursor);
    let new_active = cost_window(&pic, id, "new-one-cannon", 180);
    assert_eq!(
        arena_world(&pic, id),
        old_final,
        "matched snapshot produces identical physics, territories and scores"
    );
    assert!(
        new_active["cycles"]
            .as_str()
            .unwrap()
            .parse::<u128>()
            .unwrap()
            < old_active["cycles"]
                .as_str()
                .unwrap()
                .parse::<u128>()
                .unwrap()
    );
    let out = PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap());
    std::fs::create_dir_all(&out).unwrap();
    std::fs::write(
        out.join("cost-comparison.json"),
        serde_json::to_vec_pretty(&serde_json::json!([old_idle, old_active, new_active])).unwrap(),
    )
    .unwrap();
}

#[test]
fn empty_arena_all_player_elimination_preserves_scores_then_idles() {
    use b2z_native::world::{Ball, Cannon, World};
    let mut w = World::decode(&initial_world()).unwrap();
    w.width = 6;
    w.height = 3;
    w.cells = (0..18).map(|n| if n % 6 < 3 { 1 } else { 2 }).collect();
    w.cannons = vec![
        Cannon {
            id: 1,
            cell: 6,
            account: "01".repeat(32),
            heading: None,
        },
        Cannon {
            id: 2,
            cell: 11,
            account: "02".repeat(32),
            heading: None,
        },
    ];
    w.balls = vec![
        Ball {
            id: 1,
            owner: 1,
            cell: 8,
            x0: Int(2560.into()),
            y0: Int(1536.into()),
            vx: 1024,
            vy: 0,
        },
        Ball {
            id: 2,
            owner: 2,
            cell: 9,
            x0: Int(3584.into()),
            y0: Int(1536.into()),
            vx: -1024,
            vy: 0,
        },
    ];
    w.next_cannon_id = 3;
    w.next_ball_id = 3;
    let (pic, id, _, _) = arena_setup_world(bytes("B2Z_S14_WASM"), w.encode().unwrap());
    start_arena(&pic, id);
    for _ in 0..15 {
        tick(&pic);
        if status(&pic, id).run.idle == Some(true) {
            break;
        }
    }
    let after = status(&pic, id);
    let world = arena_world(&pic, id);
    assert_eq!(after.run.idle, Some(true));
    assert_eq!(after.run.completed_segments, 1);
    assert!(world.cannons.is_empty() && world.balls.is_empty() && world.pending.is_empty());
    assert!(
        !world.credits.is_empty(),
        "historical scores must not hold runtime awake"
    );
    let publication = observe(&pic, id).0.publication;
    for _ in 0..65 {
        tick(&pic);
    }
    assert_eq!(status(&pic, id).run.completed_segments, 1);
    assert_eq!(observe(&pic, id).0.publication, publication);
    assert!(status(&pic, id).source.index_calls > after.source.index_calls);
    pic.upgrade_canister(
        id,
        bytes("B2Z_S14_WASM"),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    assert_eq!(observe(&pic, id).0.publication, publication);
    assert_eq!(status(&pic, id).run.idle, Some(true));
    assert_eq!(arena_world(&pic, id), world);
}

#[test]
#[ignore = "requires B2Z_ARENA_PRIOR_WASM exact deployed 1510d8"]
fn arena_upgrade_from_installed_idle_module() {
    s15_text_path(Some(bytes("B2Z_ARENA_PRIOR_WASM")));
}

#[test]
fn arena_pacing_modes_reduce_expenditure_and_preserve_pending_reserve_payments() {
    #[derive(CandidType, Deserialize)]
    struct PaceMetrics {
        seal_instructions: u64,
        step_instructions: u64,
        publish_instructions: u64,
        persist_instructions: u64,
        max_instructions: u64,
    }
    #[derive(CandidType, Deserialize)]
    struct PaceDiagnostics {
        metrics: PaceMetrics,
    }
    let mut rows = vec![];
    let mut expected = None;
    for (mode, target, rate) in [
        ("Normal", 45_000_000_000_000u64, 1.0),
        ("Cruise", 27_000_000_000_000u64, 0.75),
        ("Economy", 17_000_000_000_000u64, 0.5),
        ("Steady", 11_000_000_000_000u64, 0.3),
        ("Conserve", 6_000_000_000_000u64, 0.2),
        ("Survival", 3_700_000_000_000u64, 0.1),
        // Falling from a faster band retains Survival at or above its 3T exit.
        ("Lifeline", 2_800_000_000_000u64, 0.05),
    ] {
        let (pic, id, _, _) =
            arena_setup_world(bytes("B2Z_S14_TEST_WASM"), pace_world().encode().unwrap());
        let s: Status = get_result(
            &pic,
            id,
            "test_liquid_budget",
            candid::encode_one(target).unwrap(),
        );
        assert_eq!(s.run.pace.unwrap().mode, mode);
        start_arena(&pic, id);
        let begin = pic.get_time();
        let balance = pic.cycle_balance(id);
        let mut steps = 0;
        let publication_ticks = if rate <= 0.1 { 1 } else { 2 };
        let expected_segments = 32 / publication_ticks;
        let advance = if rate <= 0.1 {
            Duration::from_secs(2)
        } else {
            Duration::from_millis(250)
        };
        while status(&pic, id).run.completed_segments < expected_segments {
            pic.advance_time(advance);
            for _ in 0..4 {
                pic.tick();
            }
            steps += 1;
            assert!(steps < 3000);
        }
        get_result::<Status>(&pic, id, "pause_autonomous", encode_args(()).unwrap());
        let seconds = (pic.get_time().as_nanos_since_unix_epoch()
            - begin.as_nanos_since_unix_epoch()) as f64
            / 1e9;
        let spent = balance - pic.cycle_balance(id);
        let final_world = arena_world(&pic, id);
        let diagnostics: PaceDiagnostics =
            get_query(&pic, id, "controller_runtime", encode_args(()).unwrap());
        let (observation, publication) = observe(&pic, id);
        let artifact_bytes = publication
            .artifacts
            .iter()
            .map(|artifact| artifact.length)
            .sum::<usize>();
        assert_eq!(status(&pic, id).run.completed_segments, expected_segments);
        if let Some(w) = &expected {
            assert_eq!(
                &final_world, w,
                "all modes compute identical logical gameplay"
            );
        } else {
            expected = Some(final_world);
        }
        let achieved = 32.0 / seconds;
        assert!(
            achieved > rate * 0.9 && achieved < rate * 1.15,
            "{mode} {achieved} ticks/s over {seconds}s"
        );
        println!("PACE_MODE {mode}: seconds={seconds} cycles={spent}");
        rows.push(serde_json::json!({"mode":mode,"seconds":seconds,"ticks":32,"segments":expected_segments,"publication_ticks":publication_ticks,"rate":achieved,"cycles":spent.to_string(),"cycles_per_second":spent as f64/seconds,
          "instructions":{"seal":diagnostics.metrics.seal_instructions,"step":diagnostics.metrics.step_instructions,"publish":diagnostics.metrics.publish_instructions,"stable_persist":diagnostics.metrics.persist_instructions,"max_message":diagnostics.metrics.max_instructions},
          "bytes":{"stable_memory":pic.get_stable_memory(id).len(),"publication":observation.publication.len(),"artifacts":artifact_bytes}}));
    }
    for adjacent in rows.windows(2) {
        assert!(
            adjacent[1]["cycles_per_second"].as_f64().unwrap()
                < adjacent[0]["cycles_per_second"].as_f64().unwrap(),
            "{} must spend less per wall second than {}",
            adjacent[1]["mode"],
            adjacent[0]["mode"]
        );
    }
    let out = PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap());
    std::fs::create_dir_all(&out).unwrap();
    let value = serde_json::json!({"status":"PASS","clock":"PocketIC virtual time; not mainnet wall time","modes":rows});
    std::fs::write(
        out.join("pace-results.json"),
        serde_json::to_vec_pretty(&value).unwrap(),
    )
    .unwrap();
    println!("ARENA_PACE {value}");
}
#[test]
fn arena_reserve_preserves_admitted_and_index_pending_payments() {
    // A fresh disposable instance avoids treating snapshot rollback of the IC
    // global timer as a production recovery mechanism. Real upgrades re-arm timers.
    let (pic, id, ledger, payer) =
        arena_setup_world(bytes("B2Z_S14_TEST_WASM"), pace_world().encode().unwrap());
    let first = transfer_text(&pic, ledger, payer, id, 1, b"ANGLE NaN");
    let second = transfer_text(&pic, ledger, payer, id, 100_000_000, b"ANGLE 37.5");
    for _ in 0..180 {
        tick(&pic);
        if status(&pic, id).source.admitted_to_exclusive > second {
            break;
        }
    }
    assert_eq!(work(&pic, id).0, 2);
    start_arena(&pic, id);
    get_result::<Status>(
        &pic,
        id,
        "test_liquid_budget",
        candid::encode_one(180_000_000_000u64).unwrap(),
    );
    assert_eq!(status(&pic, id).run.pace.unwrap().mode, "ReserveProtection");
    let publication = observe(&pic, id).0.publication;
    let before = arena_world(&pic, id);
    let third = transfer_text(&pic, ledger, payer, id, 1, b"ANGLE -1");
    for _ in 0..65 {
        tick(&pic)
    }
    // Index calls can be unaffordable while timer/call reservations are held.
    // Keep admitted rows, and leave newer public transfers durable in the Index.
    assert!(work(&pic, id).0 >= 2);
    assert_eq!(arena_world(&pic, id), before);
    assert_eq!(observe(&pic, id).0.publication, publication);
    assert!(!status(&pic, id).run.pace.unwrap().admission_open);
    pic.add_cycles(id, 3_000_000_000_000);
    for _ in 0..200 {
        tick(&pic);
        if work(&pic, id).0 == 0 && status(&pic, id).source.admitted_to_exclusive > third {
            break;
        }
    }
    assert_eq!(work(&pic, id).0, 0);
    assert!(status(&pic, id).source.admitted_to_exclusive > third);
    assert!(status(&pic, id).run.pace.unwrap().admission_open);
    assert_eq!(
        arena_world(&pic, id).received_e8s,
        Int(100_000_002u64.into())
    );
    assert!(first < second);
    #[derive(CandidType, Deserialize)]
    struct Metrics {
        max_instructions: u64,
        max_actions: u32,
    }
    #[derive(CandidType, Deserialize)]
    struct Diagnostics {
        metrics: Metrics,
    }
    let d: Diagnostics = get_query(&pic, id, "controller_runtime", encode_args(()).unwrap());
    assert!(d.metrics.max_instructions < 2_000_000_000);
    assert!(d.metrics.max_actions >= 3 && d.metrics.max_actions <= 8);
    let anonymous = pic
        .query_call(
            id,
            Principal::anonymous(),
            "controller_runtime",
            encode_args(()).unwrap(),
        )
        .unwrap();
    assert!(
        decode_one::<Result<Diagnostics, String>>(&anonymous)
            .unwrap()
            .is_err()
    );
    let out = PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap());
    std::fs::create_dir_all(&out).unwrap();
    let value = serde_json::json!({"status":"PASS","clock":"PocketIC virtual time; not mainnet wall time","index_pending_payments":1,"max_message_instructions":d.metrics.max_instructions,"max_phase_actions":d.metrics.max_actions,"reserve_payments_preserved":2,"topup_recovery":true});
    std::fs::write(
        out.join("reserve-results.json"),
        serde_json::to_vec_pretty(&value).unwrap(),
    )
    .unwrap();
    println!("ARENA_PACE {value}");
}

#[test]
#[ignore = "requires prior idle test-hooks module, never a production installation"]
fn arena_unfinished_old_segment_survives_upgrade() {
    let (pic, id, ledger, payer) = arena_setup(bytes("B2Z_ARENA_PRIOR_TEST_WASM"));
    start_arena(&pic, id);
    let tx = transfer_text(&pic, ledger, payer, id, 100_000_000, b"ANGLE 37.5");
    for _ in 0..150 {
        tick(&pic);
        if !arena_world(&pic, id).cannons.is_empty() {
            break;
        }
    }
    assert!(status(&pic, id).source.admitted_to_exclusive > tx);
    get_result::<Status>(&pic, id, "pause_autonomous", encode_args(()).unwrap());
    #[derive(CandidType, Deserialize)]
    struct Work {
        revision: u64,
        phase: Option<String>,
        pending_inputs: u32,
        source_cursor: u64,
    }
    let mut w: Work = get_query(&pic, id, "controller_work", encode_args(()).unwrap());
    if w.phase.is_none() {
        let world = arena_world(&pic, id);
        get_result::<Status>(
            &pic,
            id,
            "test_apply",
            encode_args((
                w.revision,
                dtr_wire::encode(&Action::Seal {
                    logical_end: Int(world.time.0.to_integer() + 2u32),
                })
                .unwrap(),
            ))
            .unwrap(),
        );
        w = get_query(&pic, id, "controller_work", encode_args(()).unwrap());
    }
    if w.phase.as_deref() == Some("running") {
        get_result::<Status>(
            &pic,
            id,
            "test_apply",
            encode_args((
                w.revision,
                dtr_wire::encode(&Action::Step { budget: 1 }).unwrap(),
            ))
            .unwrap(),
        );
    }
    let before: Work = get_query(&pic, id, "controller_work", encode_args(()).unwrap());
    assert!(before.phase.is_some());
    let publication = observe(&pic, id).0.publication;
    let world = arena_world(&pic, id);
    let cursor = status(&pic, id).source.admitted_to_exclusive;
    pic.upgrade_canister(
        id,
        bytes("B2Z_S14_WASM"),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    let after: Work = get_query(&pic, id, "controller_work", encode_args(()).unwrap());
    assert_eq!(
        (
            before.revision,
            before.phase,
            before.pending_inputs,
            before.source_cursor
        ),
        (
            after.revision,
            after.phase,
            after.pending_inputs,
            after.source_cursor
        )
    );
    assert_eq!(observe(&pic, id).0.publication, publication);
    assert_eq!(arena_world(&pic, id), world);
    assert_eq!(status(&pic, id).source.admitted_to_exclusive, cursor);
    start_arena(&pic, id);
    for _ in 0..20 {
        tick(&pic);
        if observe(&pic, id).0.publication != publication {
            break;
        }
    }
    assert_ne!(observe(&pic, id).0.publication, publication);
    assert_eq!(
        arena_world(&pic, id).received_e8s,
        Int(100_000_000u64.into())
    );
}

fn pace_world() -> b2z_native::world::World {
    use b2z_native::world::{Ball, Cannon, World};
    let mut world = World::decode(&initial_world()).unwrap();
    world.cells.fill(1);
    world.cannons = vec![Cannon {
        id: 1,
        cell: 42,
        account: "01".repeat(32),
        heading: None,
    }];
    world.balls = vec![Ball {
        id: 1,
        owner: 1,
        cell: 42,
        x0: Int(10752.into()),
        y0: Int(2560.into()),
        vx: 812,
        vy: 623,
    }];
    world.next_cannon_id = 2;
    world.next_ball_id = 2;
    world
}

#[test]
#[ignore = "requires exact prior producer module"]
fn arena_matched_prior_producer_cost_comparison() {
    let mut rows = vec![];
    let mut expected = None;
    for (name, module) in [
        ("prior-one-phase", bytes("B2Z_ARENA_PRIOR_WASM")),
        ("bounded-driver", bytes("B2Z_S14_WASM")),
    ] {
        let (pic, id, _, _) = arena_setup_world(module, pace_world().encode().unwrap());
        start_arena(&pic, id);
        let start = pic.get_time();
        let balance = pic.cycle_balance(id);
        for _ in 0..600 {
            pic.advance_time(Duration::from_millis(250));
            for _ in 0..4 {
                pic.tick()
            }
            if status(&pic, id).run.completed_segments == 16 {
                break;
            }
        }
        get_result::<Status>(&pic, id, "pause_autonomous", encode_args(()).unwrap());
        assert_eq!(status(&pic, id).run.completed_segments, 16);
        let seconds = (pic.get_time().as_nanos_since_unix_epoch()
            - start.as_nanos_since_unix_epoch()) as f64
            / 1e9;
        let cycles = balance - pic.cycle_balance(id);
        let world = arena_world(&pic, id);
        if let Some(w) = expected {
            assert_eq!(world, w)
        }
        expected = Some(world);
        rows.push(serde_json::json!({"name":name,"segments":16,"ticks":32,"virtual_seconds":seconds,"cycles":cycles.to_string(),"cycles_per_segment":cycles/16,"cycles_per_second":cycles as f64/seconds,"callbacks":status(&pic,id).run.callback_count}));
    }
    assert!(
        rows[1]["cycles_per_segment"].as_u64().unwrap()
            < rows[0]["cycles_per_segment"].as_u64().unwrap()
    );
    let out = PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap());
    std::fs::create_dir_all(&out).unwrap();
    std::fs::write(
        out.join("producer-cost.json"),
        serde_json::to_vec_pretty(&rows).unwrap(),
    )
    .unwrap();
    println!("ARENA_PRODUCER_COST {rows:?}");
}

#[test]
fn torus_local_index_orientation_and_pending_upgrade_preserve_exact_replay() {
    use b2z_native::world::World;
    let mut w = World::decode(&initial_world()).unwrap();
    w.version = 4;
    w.width = 32;
    w.height = 32;
    w.cells = vec![0; 1024];
    let initial = w.encode().unwrap();
    let (pic, id, ledger, payer) = arena_setup_world(bytes("B2Z_S14_WASM"), initial.clone());
    let genesis = observe(&pic, id).1;
    assert_eq!(
        genesis.identity.rules_hash,
        b2z_native::torus_identity().unwrap()["rules_hash"]
            .as_str()
            .unwrap()
    );
    let mut native = Coordinator::create(
        &initial,
        genesis.identity.clone(),
        0,
        0,
        "00".repeat(32),
        B2zHostKernel,
    )
    .unwrap();
    let funding = AccountIdentifier::new(&payer, &DEFAULT_SUBACCOUNT);
    let mut payments = BTreeMap::new();
    let mut assigned = vec![];
    let mut publications = vec![];
    let mut last = None;
    let capture = |native: &mut Coordinator<B2zHostKernel>,
                   assigned: &mut Vec<u64>,
                   publications: &mut Vec<Publication>,
                   last: &mut Option<Int>,
                   payments: &BTreeMap<u64, String>| {
        let p = observe(&pic, id).1;
        if p.head.segment_id.is_some() && p.head.segment_id != *last {
            replay_head(&pic, id, &p, native, payments, assigned);
            *last = p.head.segment_id.clone();
            publications.push(p);
        }
    };
    start_arena(&pic, id);
    let first = transfer_text(&pic, ledger, payer, id, 100_000_000, b"ANGLE 37.5");
    payments.insert(
        first,
        normalized(
            funding,
            100_000_000,
            b2z_protocol::encode(b2z_protocol::Command::Angle(6827)),
        ),
    );
    for _ in 0..180 {
        tick(&pic);
        capture(
            &mut native,
            &mut assigned,
            &mut publications,
            &mut last,
            &payments,
        );
        if assigned.contains(&first) {
            break;
        }
    }
    assert_eq!(arena_world(&pic, id).cannons[0].heading, Some(6827));
    let second = transfer_text(&pic, ledger, payer, id, 10_000_000, b"ANGLE 225");
    payments.insert(
        second,
        normalized(
            funding,
            10_000_000,
            b2z_protocol::encode(b2z_protocol::Command::Angle(40960)),
        ),
    );
    for _ in 0..180 {
        tick(&pic);
        capture(
            &mut native,
            &mut assigned,
            &mut publications,
            &mut last,
            &payments,
        );
        if assigned.contains(&second) {
            break;
        }
    }
    assert_eq!(arena_world(&pic, id).cannons[0].heading, Some(40960));
    get_result::<Status>(&pic, id, "pause_autonomous", encode_args(()).unwrap());
    let world = arena_world(&pic, id);
    let target = world
        .cells
        .iter()
        .enumerate()
        .find(|(n, owner)| **owner == 1 && *n != world.cannons[0].cell)
        .unwrap()
        .0 as u32;
    let third = transfer_text(
        &pic,
        ledger,
        payer,
        id,
        10_000,
        format!("MOVE {target}").as_bytes(),
    );
    payments.insert(
        third,
        normalized(
            funding,
            10_000,
            b2z_protocol::encode(b2z_protocol::Command::Move(target)),
        ),
    );
    let fourth = transfer_text(&pic, ledger, payer, id, 1, b"ANGLE 1");
    payments.insert(
        fourth,
        normalized(
            funding,
            1,
            b2z_protocol::encode(b2z_protocol::Command::Angle(182)),
        ),
    );
    for _ in 0..180 {
        tick(&pic);
        if status(&pic, id).source.admitted_to_exclusive > fourth {
            break;
        }
    }
    assert_eq!(work(&pic, id).0, 2);
    let before = observe(&pic, id).0.publication;
    let source = status(&pic, id).source.admitted_to_exclusive;
    let controllers = pic
        .canister_status(id, Some(controller()))
        .unwrap()
        .settings
        .controllers;
    pic.upgrade_canister(
        id,
        bytes("B2Z_S14_WASM"),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    assert_eq!(observe(&pic, id).0.publication, before);
    assert_eq!(arena_world(&pic, id), world);
    assert_eq!(work(&pic, id).0, 2);
    assert_eq!(status(&pic, id).source.admitted_to_exclusive, source);
    assert_eq!(
        pic.canister_status(id, Some(controller()))
            .unwrap()
            .settings
            .controllers,
        controllers
    );
    start_arena(&pic, id);
    for _ in 0..180 {
        tick(&pic);
        capture(
            &mut native,
            &mut assigned,
            &mut publications,
            &mut last,
            &payments,
        );
        if assigned.contains(&fourth) {
            break;
        }
    }
    assert_eq!(assigned, vec![first, second, third, fourth]);
    let after = arena_world(&pic, id);
    assert_eq!(after.cannons[0].heading, Some(40960));
    assert_eq!(after.cannons[0].cell, target as usize);
    assert_eq!(after.received_e8s, Int(110_010_001u64.into()));
    let out = PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap());
    std::fs::create_dir_all(&out).unwrap();
    let trace = serde_json::json!({"status":"PASS","evidence_class":"STAGED_TORUS_LOCAL; no live migration facility","initial_world_hex":hex(&initial),"inputs":payments.iter().map(|(id,payload)|serde_json::json!({"position":id.to_string(),"payload_hex":payload})).collect::<Vec<_>>(),"publications":publications,"assigned":assigned,"heading_survives_upgrade":true,"pending_preserved":2});
    let path = out.join("torus-history.json");
    std::fs::write(&path, serde_json::to_vec_pretty(&trace).unwrap()).unwrap();
    assert!(
        std::process::Command::new("node")
            .current_dir(Path::new(env!("CARGO_MANIFEST_DIR")).join("../.."))
            .args([
                "tools/replay_s14.mjs",
                path.to_str().unwrap(),
                out.join("torus-replay.json").to_str().unwrap()
            ])
            .status()
            .unwrap()
            .success()
    );
}

#[test]
fn torus_all_player_elimination_sleeps_without_a_browser() {
    let fixture: serde_json::Value = serde_json::from_slice(
        &std::fs::read(
            Path::new(env!("CARGO_MANIFEST_DIR")).join("../../tests/fixtures/b2z-torus-v4.json"),
        )
        .unwrap(),
    )
    .unwrap();
    let initial = fixture["cases"]
        .as_array()
        .unwrap()
        .iter()
        .find(|v| v["name"] == "seam-territory-strike-annihilation")
        .unwrap()["initial_hex"]
        .as_str()
        .unwrap();
    let (pic, id, _, _) =
        arena_setup_world(bytes("B2Z_S14_WASM"), dtr_wire::unhex(initial).unwrap());
    start_arena(&pic, id);
    for _ in 0..30 {
        tick(&pic);
        if status(&pic, id).run.idle == Some(true) {
            break;
        }
    }
    let before = status(&pic, id);
    assert_eq!(before.run.idle, Some(true));
    assert!(arena_world(&pic, id).cannons.is_empty());
    assert!(arena_world(&pic, id).balls.is_empty());
    let publication = observe(&pic, id).0.publication;
    for _ in 0..130 {
        tick(&pic)
    }
    let after = status(&pic, id);
    assert_eq!(after.run.callback_count, before.run.callback_count);
    assert_eq!(after.run.completed_segments, before.run.completed_segments);
    assert_eq!(observe(&pic, id).0.publication, publication);
    assert!(after.source.index_calls > before.source.index_calls);
    pic.upgrade_canister(
        id,
        bytes("B2Z_S14_WASM"),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    assert_eq!(status(&pic, id).run.idle, Some(true));
    assert_eq!(observe(&pic, id).0.publication, publication);
}

#[test]
fn torus_browser_scene_camera_and_continuous_supported_playback() {
    use b2z_native::world::{Ball, Cannon, World};
    let mut w = World::decode(&initial_world()).unwrap();
    w.version = 4;
    w.width = 32;
    w.height = 32;
    w.cells = (0..1024).map(|n| if n % 32 < 16 { 1 } else { 2 }).collect();
    w.cannons = vec![
        Cannon {
            id: 1,
            cell: 326,
            account: "01".repeat(32),
            heading: Some(8192),
        },
        Cannon {
            id: 2,
            cell: 666,
            account: "02".repeat(32),
            heading: Some(40960),
        },
    ];
    w.balls = [
        (1, 1, 320, 812, 623),
        (2, 1, 997, 724, 724),
        (3, 2, 351, 724, -724),
        (4, 2, 57, -724, -724),
    ]
    .into_iter()
    .map(|(id, owner, cell, vx, vy)| Ball {
        id,
        owner,
        cell,
        x0: Int((cell % 32 * 1024 + 512).into()),
        y0: Int((cell / 32 * 1024 + 512).into()),
        vx,
        vy,
    })
    .collect();
    w.next_ball_id = 5;
    w.next_cannon_id = 3;
    let initial = w.encode().unwrap();
    let (mut pic, id, ledger, _) = arena_setup_world(bytes("B2Z_S14_WASM"), initial.clone());
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    let out = PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap()).join("torus-scene");
    std::fs::create_dir_all(&out).unwrap();
    let config = serde_json::json!({"network":"pocketic-local","canister_id":id.to_text(),"ledger":ledger.to_text(),"index":status(&pic,id).source.index.to_text(),"recipient":source::receiving_account(id,0).to_hex(),"root_key_hex":hex(&pic.root_key().unwrap())});
    std::fs::write(
        out.join("configuration.json"),
        serde_json::to_vec(&config).unwrap(),
    )
    .unwrap();
    std::fs::write(out.join("metadata.json"), b"{}").unwrap();
    std::fs::write(out.join("root-key.der"), pic.root_key().unwrap()).unwrap();
    let genesis = observe(&pic, id).1;
    let mut native = Coordinator::create(
        &initial,
        genesis.identity.clone(),
        0,
        0,
        "00".repeat(32),
        B2zHostKernel,
    )
    .unwrap();
    let gateway = pic.make_live(None);
    let log = std::fs::File::create(out.join("browser.log")).unwrap();
    let mut browser = OwnedBrowser(
        std::process::Command::new(std::env::var("S14_BROWSER_PYTHON").unwrap())
            .current_dir(&root)
            .args([
                "tools/verify_s14_deployment.py",
                "--scene-only",
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
    let began = std::time::Instant::now();
    let mut started = false;
    let mut publications = vec![];
    let mut next = 0u64;
    while began.elapsed() < Duration::from_secs(180) {
        if !started && out.join("browser-scene-ready").exists() {
            start_arena(&pic, id);
            started = true;
        }
        let p = observe(&pic, id).1;
        if let Some(segment) = p.head.segment_id.as_ref() {
            let head: u64 = segment.0.to_string().parse().unwrap();
            let first_unseen = next;
            for n in first_unseen..=head {
                let current = if n == head {
                    p.clone()
                } else {
                    let raw: Vec<u8> = get_query(
                        &pic,
                        id,
                        "retained_publication",
                        candid::encode_one(n).unwrap(),
                    );
                    decode(&raw).unwrap()
                };
                assert_eq!(current.head.seal.as_ref().unwrap().input_count, 0);
                publications.push(current);
                next = n + 1;
            }
        }
        if let Some(code) = browser.0.try_wait().unwrap() {
            assert!(
                code.success(),
                "scene browser failure: {}",
                out.join("browser.log").display()
            );
            break;
        }
        // PocketIC serializes ingress to this disposable instance. Four
        // capture polls per two-second publication preserve exact replay
        // coverage without starving the simultaneous certified browser query.
        std::thread::sleep(Duration::from_millis(500));
    }
    assert!(out.join("browser-complete").exists(), "scene timeout");
    pic.stop_live();
    let payments = BTreeMap::new();
    let mut assigned = vec![];
    for p in &publications {
        replay_head_with_artifacts(&pic, id, p, &mut native, &payments, &mut assigned, false);
    }
    assert!(assigned.is_empty());
    let history = serde_json::json!({"status":"PASS","evidence_class":"STAGED_TORUS_SYNTHETIC_GENESIS_GENUINE_LOCAL_IC","initial_world_hex":hex(&initial),"inputs":[],"publications":publications,"assigned":[]});
    let path = out.join("history.json");
    std::fs::write(&path, serde_json::to_vec_pretty(&history).unwrap()).unwrap();
    assert!(
        std::process::Command::new("node")
            .current_dir(&root)
            .args([
                "tools/replay_s14.mjs",
                path.to_str().unwrap(),
                out.join("replay.json").to_str().unwrap()
            ])
            .status()
            .unwrap()
            .success()
    );
}

#[derive(Deserialize)]
struct TransitionView {
    version: u32,
    phase: String,
    ledger_cutover: Option<Int>,
    index_synced: Option<Int>,
    metadata_hex: Option<String>,
    transition_hash: Option<String>,
}
fn transition_view(pic: &PocketIc, id: Principal) -> Option<TransitionView> {
    transition_view_for(pic, id, "torus_transition_status")
}
fn transition_view_for(pic: &PocketIc, id: Principal, method: &str) -> Option<TransitionView> {
    let bytes: Vec<u8> = get_query(pic, id, method, encode_args(()).unwrap());
    decode(&bytes).unwrap()
}
fn transition_drained(pic: &PocketIc, id: Principal) -> bool {
    #[derive(CandidType, Deserialize)]
    struct BoundaryWork {
        phase: Option<String>,
        pending_inputs: u32,
    }
    let w: BoundaryWork = get_query(pic, id, "controller_work", encode_args(()).unwrap());
    w.phase.is_none()
        && w.pending_inputs == 0
        && observe(pic, id).1.head.source_to_exclusive
            == Int(status(pic, id).source.admitted_to_exclusive.into())
}

/// This is deliberately explicit until the committed generic DTR multi-epoch
/// revision is published and B2Z can replace its immutable 0.13 pins.
#[test]
#[ignore = "requires unpublished DTR 0.14 multi-epoch development override"]
fn million_paid_v4_cutover_preserves_state_and_uses_second_epoch() {
    #[derive(CandidType, Deserialize)]
    struct FundingPause {
        paused: bool,
    }
    assert_eq!(
        std::env::var("S14_DTR_REVISION").unwrap(),
        "e1bfcf25071d11190d14f461288e12a21ca26cf8"
    );
    let (pic, id, ledger, payer) = arena_setup(bytes("B2Z_S14_WASM"));
    let funding: FundingPause = get_result(
        &pic,
        id,
        "set_funding_paused",
        candid::encode_one(true).unwrap(),
    );
    assert!(funding.paused);
    start_arena(&pic, id);
    let join = transfer_text(&pic, ledger, payer, id, 100_000_000, b"ANGLE 37.5");
    for _ in 0..240 {
        tick(&pic);
        let world = arena_world(&pic, id);
        if world.received_e8s == Int(100_000_000u64.into())
            && status(&pic, id).source.admitted_to_exclusive > join
        {
            break;
        }
    }
    get_result::<Status>(&pic, id, "pause_autonomous", encode_args(()).unwrap());
    let paid_v3 = arena_world(&pic, id);
    assert_eq!(paid_v3.cannons.len(), 1);
    assert_eq!(paid_v3.received_e8s, Int(100_000_000u64.into()));

    let mut prepared = false;
    for _ in 0..90 {
        let reply = pic
            .update_call(
                id,
                controller(),
                "prepare_torus_transition",
                encode_args(()).unwrap(),
            )
            .unwrap();
        if decode_one::<Result<Vec<u8>, String>>(&reply)
            .unwrap()
            .is_ok()
        {
            prepared = true;
            break;
        }
        tick(&pic);
    }
    assert!(prepared);
    start_arena(&pic, id);
    for _ in 0..240 {
        tick(&pic);
        if transition_view(&pic, id).unwrap().phase == "ready"
            && transition_drained(&pic, id)
        {
            break;
        }
    }
    assert_eq!(transition_view(&pic, id).unwrap().phase, "ready");
    let manifest = observe(&pic, id).1.head.manifest_hash;
    let _: Vec<u8> = get_result(
        &pic,
        id,
        "commit_torus_transition",
        candid::encode_one(manifest).unwrap(),
    );
    assert_eq!(observe(&pic, id).1.version, 7);

    // A second epoch needs a committed successor to the first checkpoint.
    for _ in 0..240 {
        tick(&pic);
        if observe(&pic, id).1.head.seal.is_some() {
            break;
        }
    }
    assert!(observe(&pic, id).1.head.seal.is_some());
    get_result::<Status>(&pic, id, "pause_autonomous", encode_args(()).unwrap());
    let before_upgrade = arena_world(&pic, id);
    let publication_before_upgrade = observe(&pic, id).0.publication;
    pic.upgrade_canister(
        id,
        bytes("B2Z_S14_WASM"),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    assert_eq!(arena_world(&pic, id), before_upgrade);
    assert_eq!(observe(&pic, id).0.publication, publication_before_upgrade);
    assert!(get_query::<FundingPause>(
        &pic,
        id,
        "controller_funding",
        encode_args(()).unwrap()
    )
    .paused);
    let before_old_move = arena_world(&pic, id);
    let cannon = before_old_move.cannons[0].clone();
    let old_target = before_old_move
        .cells
        .iter()
        .enumerate()
        .find(|(cell, owner)| **owner == cannon.id && *cell != cannon.cell)
        .unwrap()
        .0;
    let old_move = transfer_text(
        &pic,
        ledger,
        payer,
        id,
        10_000,
        format!("MOVE {old_target}").as_bytes(),
    );
    let mut prepared = false;
    for _ in 0..90 {
        let reply = pic
            .update_call(
                id,
                controller(),
                "prepare_million_transition",
                encode_args(()).unwrap(),
            )
            .unwrap();
        if decode_one::<Result<Vec<u8>, String>>(&reply)
            .unwrap()
            .is_ok()
        {
            prepared = true;
            break;
        }
        tick(&pic);
    }
    assert!(prepared);
    start_arena(&pic, id);
    for _ in 0..360 {
        tick(&pic);
        let transition = transition_view_for(&pic, id, "million_transition_status").unwrap();
        if transition.phase == "ready"
            && transition_drained(&pic, id)
            && arena_world(&pic, id).pending.is_empty()
        {
            break;
        }
    }
    let transition = transition_view_for(&pic, id, "million_transition_status").unwrap();
    assert_eq!(transition.version, 2);
    assert_eq!(transition.phase, "ready");
    let source_boundary = status(&pic, id).source.admitted_to_exclusive;
    assert!(source_boundary > old_move);
    let old_world = arena_world(&pic, id);
    assert_eq!(old_world.version, 4);
    assert_eq!(old_world.cannons[0].cell, old_target);
    let predecessor = observe(&pic, id).1;
    let expected = b2z_native::migration::stage_million_world(&old_world).unwrap();
    let _: Vec<u8> = get_result(
        &pic,
        id,
        "commit_million_transition",
        candid::encode_one(predecessor.head.manifest_hash.clone()).unwrap(),
    );
    let checkpoint_bytes = observe(&pic, id).0.publication;
    let checkpoint = observe(&pic, id).1;
    let epoch = checkpoint.epoch.as_ref().unwrap();
    assert_eq!(checkpoint.version, 8);
    assert_eq!(epoch.version, 2);
    assert_eq!(epoch.source_cursor, Int(source_boundary.into()));
    let million = arena_world(&pic, id);
    assert_eq!(million, expected);
    assert_eq!((million.width, million.height), (1000, 1000));
    assert_eq!(million.cell_count(), 1_000_000);
    assert!(million.cells.is_empty());
    assert_eq!(million.credits, old_world.credits);
    assert_eq!(million.received_e8s, old_world.received_e8s);
    assert_eq!(million.cannons.len(), old_world.cannons.len());
    assert_eq!(million.balls.len(), old_world.balls.len());
    assert_eq!(status(&pic, id).run.publication_ticks, Some(1));
    assert!(million.encode().unwrap().len() < 64 * 1024);
    let completed = transition_view_for(&pic, id, "million_transition_status").unwrap();
    assert_eq!(completed.transition_hash.as_ref(), Some(&epoch.transition_hash));
    assert_eq!(
        dtr_wire::hash(&unhex(completed.metadata_hex.as_ref().unwrap()).unwrap()),
        epoch.metadata_hash
    );

    // The exact retry is idempotent, including after an in-place upgrade.
    let _: Vec<u8> = get_result(
        &pic,
        id,
        "commit_million_transition",
        candid::encode_one(predecessor.head.manifest_hash.clone()).unwrap(),
    );
    assert_eq!(observe(&pic, id).0.publication, checkpoint_bytes);
    pic.upgrade_canister(
        id,
        bytes("B2Z_S14_WASM"),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    assert_eq!(arena_world(&pic, id), million);
    assert_eq!(observe(&pic, id).0.publication, checkpoint_bytes);
    assert!(get_query::<FundingPause>(
        &pic,
        id,
        "controller_funding",
        encode_args(()).unwrap()
    )
    .paused);

    // A post-cutover MOVE uses the million-cell coordinate space exactly once.
    let cannon = million.cannons[0].clone();
    let new_target = (1..million.cell_count())
        .map(|offset| (cannon.cell + offset) % million.cell_count())
        .find(|cell| million.owner(*cell) == Some(cannon.id))
        .unwrap();
    let new_move = transfer_text(
        &pic,
        ledger,
        payer,
        id,
        10_000,
        format!("MOVE {new_target}").as_bytes(),
    );
    start_arena(&pic, id);
    for _ in 0..360 {
        tick(&pic);
        let world = arena_world(&pic, id);
        if status(&pic, id).source.admitted_to_exclusive > new_move
            && world.cannons[0].cell == new_target
        {
            break;
        }
    }
    let after = arena_world(&pic, id);
    assert_eq!(after.cannons[0].cell, new_target);
    assert_eq!(after.received_e8s, Int(100_020_000u64.into()));
    assert!(status(&pic, id).source.admitted_to_exclusive > new_move);

    // Measure production separately from the nominal UI label. One v5
    // publication is one logical tick, so segment progress is tick progress.
    let before = status(&pic, id);
    let before_cycles = pic.cycle_balance(id);
    let began = pic.get_time();
    for _ in 0..15 {
        tick(&pic);
    }
    let measured = status(&pic, id);
    let elapsed = (pic.get_time().as_nanos_since_unix_epoch()
        - began.as_nanos_since_unix_epoch()) as f64
        / 1e9;
    let ticks = measured.run.completed_segments - before.run.completed_segments;
    let pace = measured.run.pace.as_ref().unwrap();
    assert_eq!(pace.mode, "Normal");
    assert_eq!(pace.nominal_milli, 1000);
    assert_eq!(pace.supported_milli, 1000);
    assert!(!pace.performance_limited);
    assert!(
        ticks >= 14 && ticks <= 16,
        "million-cell backend produced {ticks} ticks in {elapsed}s"
    );
    let (observation, publication) = observe(&pic, id);
    let artifact_bytes = publication
        .artifacts
        .iter()
        .map(|artifact| artifact.length)
        .sum::<usize>();
    assert!(
        publication
            .artifacts
            .iter()
            .all(|artifact| artifact.length <= dtr_host::observation::MAX_ARTIFACT)
    );
    let out = PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap());
    std::fs::create_dir_all(&out).unwrap();
    std::fs::write(
        out.join("million-performance.json"),
        serde_json::to_vec_pretty(&serde_json::json!({
            "status":"PASS",
            "clock":"PocketIC virtual time; not mainnet wall time",
            "world":[1000,1000],
            "balls":after.balls.len(),
            "ticks":ticks,
            "seconds":elapsed,
            "ticks_per_second":ticks as f64/elapsed,
            "cycles":(before_cycles-pic.cycle_balance(id)).to_string(),
            "publication_bytes":observation.publication.len(),
            "artifact_bytes":artifact_bytes,
            "state_bytes":publication.artifacts[0].length,
            "event_bytes":publication.artifacts[1].length,
            "score_bytes":publication.artifacts[2].length,
            "stable_memory_bytes":pic.get_stable_memory(id).len(),
            "pace":{"mode":pace.mode,"nominal_milli":pace.nominal_milli,"supported_milli":pace.supported_milli,"performance_limited":pace.performance_limited}
        }))
        .unwrap(),
    )
    .unwrap();
}

/// Real account history around the global Ledger/Index barrier. No normalized
/// payment injection, no canister reset, and replay uses this run's exact seals.
#[test]
fn torus_paid_v3_cutover_preserves_history_pending_inputs_and_upgrade() {
    let prior = std::env::var("B2Z_TORUS_PRIOR_WASM")
        .map(|p| std::fs::read(p).unwrap())
        .unwrap_or_else(|_| bytes("B2Z_S14_WASM"));
    if std::env::var("B2Z_TORUS_PRIOR_WASM").is_ok() {
        assert_eq!(
            dtr_wire::hash(&prior),
            "53b219277b9e1333b29c6a67c94a2d634d04362fa72b9bf65f173a7040cc14ec"
        );
    }
    let initial = initial_world();
    let (pic, id, ledger, payer) = arena_setup_world(prior, initial.clone());
    let genesis = observe(&pic, id).1;
    let mut native = Coordinator::create(
        &initial,
        genesis.identity,
        0,
        0,
        "00".repeat(32),
        B2zHostKernel,
    )
    .unwrap();
    let funding = AccountIdentifier::new(&payer, &DEFAULT_SUBACCOUNT);
    let mut payments = BTreeMap::new();
    let mut assigned = vec![];
    let mut publications = vec![];
    let mut last = None;
    let capture = |native: &mut Coordinator<B2zHostKernel>,
                   assigned: &mut Vec<u64>,
                   publications: &mut Vec<Publication>,
                   last: &mut Option<Int>,
                   payments: &BTreeMap<u64, String>| {
        let p = observe(&pic, id).1;
        if p.head.segment_id.is_some() && p.head.segment_id != *last {
            replay_head(&pic, id, &p, native, payments, assigned);
            *last = p.head.segment_id.clone();
            publications.push(p);
        }
    };
    start_arena(&pic, id);
    let first = transfer_text(&pic, ledger, payer, id, 100_000_000, b"ANGLE 37.5");
    payments.insert(
        first,
        normalized(
            funding,
            100_000_000,
            b2z_protocol::encode(b2z_protocol::Command::Angle(6827)),
        ),
    );
    for _ in 0..180 {
        tick(&pic);
        capture(
            &mut native,
            &mut assigned,
            &mut publications,
            &mut last,
            &payments,
        );
        if assigned.contains(&first) {
            break;
        }
    }
    assert_eq!(assigned, vec![first]);
    get_result::<Status>(&pic, id, "pause_autonomous", encode_args(()).unwrap());
    let before = observe(&pic, id).0.publication;
    let paid = arena_world(&pic, id);
    let source_cursor = status(&pic, id).source.admitted_to_exclusive;
    let controllers = pic
        .canister_status(id, Some(controller()))
        .unwrap()
        .settings
        .controllers;
    pic.upgrade_canister(
        id,
        bytes("B2Z_S14_WASM"),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    assert_eq!(observe(&pic, id).0.publication, before);
    assert_eq!(arena_world(&pic, id), paid);
    assert_eq!(status(&pic, id).source.admitted_to_exclusive, source_cursor);
    let old_anchor = paid.cannons[0].cell;
    let target = paid
        .cells
        .iter()
        .enumerate()
        .find(|(n, o)| **o == 1 && *n != old_anchor)
        .unwrap()
        .0;
    let old_move = transfer_text(
        &pic,
        ledger,
        payer,
        id,
        10_000,
        format!("MOVE {target}").as_bytes(),
    );
    payments.insert(
        old_move,
        normalized(
            funding,
            10_000,
            b2z_protocol::encode(b2z_protocol::Command::Move(target as u32)),
        ),
    );
    // Unrelated global blocks prove the sparse account cursor cannot be padded to the Ledger tip.
    for _ in 0..2 {
        transfer(
            &pic,
            ledger,
            payer,
            AccountIdentifier::new(
                &Principal::self_authenticating([66; 32]),
                &DEFAULT_SUBACCOUNT,
            ),
            1,
            b2z_protocol::encode(b2z_protocol::Command::Angle(0)),
        );
    }
    let mut prepared = false;
    for _ in 0..90 {
        let reply = pic
            .update_call(
                id,
                controller(),
                "prepare_torus_transition",
                encode_args(()).unwrap(),
            )
            .unwrap();
        if decode_one::<Result<Vec<u8>, String>>(&reply)
            .unwrap()
            .is_ok()
        {
            prepared = true;
            break;
        }
        tick(&pic);
    }
    assert!(prepared, "could not establish source admission fence");
    let phase_before_upgrade = transition_view(&pic, id).unwrap();
    pic.upgrade_canister(
        id,
        bytes("B2Z_S14_WASM"),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    if let Some(cut) = phase_before_upgrade.ledger_cutover {
        assert_eq!(transition_view(&pic, id).unwrap().ledger_cutover, Some(cut));
    }
    start_arena(&pic, id);
    // Reject every transition operation from an ordinary caller.
    for method in [
        "prepare_torus_transition",
        "torus_transition_status",
        "commit_torus_transition",
    ] {
        let reply = if method == "torus_transition_status" {
            pic.query_call(id, payer, method, encode_args(()).unwrap())
        } else {
            let args = if method == "commit_torus_transition" {
                candid::encode_one("00".repeat(32)).unwrap()
            } else {
                encode_args(()).unwrap()
            };
            pic.update_call(id, payer, method, args)
        }
        .unwrap();
        assert!(
            decode_one::<Result<Vec<u8>, String>>(&reply)
                .unwrap()
                .is_err()
        );
    }
    let mut cutover = None;
    for _ in 0..180 {
        let t = transition_view(&pic, id).unwrap();
        if let Some(cut) = t.ledger_cutover {
            cutover = Some(cut.0.to_string().parse::<u64>().unwrap());
            break;
        }
        tick(&pic);
    }
    let cutover = cutover.expect("Ledger metadata boundary was not established");
    let mapped = |cell: usize| (cell / 16 + 12) * 32 + cell % 16 + 8;
    let new_target = mapped(old_anchor);
    let new_move = transfer_text(
        &pic,
        ledger,
        payer,
        id,
        10_000,
        format!("MOVE {new_target}").as_bytes(),
    );
    assert!(new_move >= cutover);
    payments.insert(
        new_move,
        normalized(
            funding,
            10_000,
            b2z_protocol::encode(b2z_protocol::Command::Move(new_target as u32)),
        ),
    );
    for _ in 0..180 {
        tick(&pic);
        capture(
            &mut native,
            &mut assigned,
            &mut publications,
            &mut last,
            &payments,
        );
        if transition_view(&pic, id).unwrap().phase == "ready"
            && work(&pic, id).0 == 0
            && native.record.journal.head.source_to_exclusive == native.record.inbox.cursor
        {
            break;
        }
    }
    assert_eq!(transition_view(&pic, id).unwrap().phase, "ready");
    assert_eq!(assigned, vec![first, old_move]);
    assert_eq!(status(&pic, id).source.admitted_to_exclusive, old_move + 1);
    assert!(old_move + 1 < cutover);
    assert_eq!(
        arena_world(&pic, id).cannons[0].cell,
        target,
        "pre-cutover MOVE must use width16"
    );
    get_result::<Status>(&pic, id, "pause_autonomous", encode_args(()).unwrap());
    let old_world = arena_world(&pic, id);
    let old_publication = observe(&pic, id).0.publication;
    let source_before = status(&pic, id).source.admitted_to_exclusive;
    let expected_manifest = native.record.journal.head.manifest_hash.clone();
    let wrong = pic
        .update_call(
            id,
            controller(),
            "commit_torus_transition",
            candid::encode_one("ff".repeat(32)).unwrap(),
        )
        .unwrap();
    assert!(
        decode_one::<Result<Vec<u8>, String>>(&wrong)
            .unwrap()
            .is_err()
    );
    assert_eq!(observe(&pic, id).0.publication, old_publication);
    // Upgrade while fenced/ready; no old-world execution or source release.
    pic.upgrade_canister(
        id,
        bytes("B2Z_S14_WASM"),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    assert_eq!(transition_view(&pic, id).unwrap().phase, "ready");
    assert_eq!(observe(&pic, id).0.publication, old_publication);
    let _: Vec<u8> = get_result(
        &pic,
        id,
        "commit_torus_transition",
        candid::encode_one(expected_manifest.clone()).unwrap(),
    );
    let checkpoint = observe(&pic, id).1;
    let epoch = checkpoint.epoch.clone().unwrap();
    assert_eq!(checkpoint.version, 7);
    assert!(checkpoint.head.seal.is_none());
    assert_eq!(epoch.previous_publication_hex, hex(&old_publication));
    let new_world = arena_world(&pic, id);
    let expected = b2z_native::migration::stage_world(
        &old_world,
        &b2z_native::migration::Boundary {
            source_cursor: source_before,
            ledger_cutover: Some(cutover),
            account_history_complete_through: Some(cutover),
            ..Default::default()
        },
    )
    .unwrap();
    assert_eq!(new_world, expected);
    assert_eq!(new_world.time, old_world.time);
    assert_eq!(new_world.credits, old_world.credits);
    assert_eq!(new_world.received_e8s, old_world.received_e8s);
    assert_eq!(new_world.cannons[0].heading, None);
    assert_eq!(new_world.cannons[0].cell, mapped(target));
    let output = dtr_host::Output {
        state: new_world.encode().unwrap(),
        events: dtr_wire::encode(&serde_json::json!({"version":4,"receipts":[],"events":[]}))
            .unwrap(),
        scores: dtr_wire::encode(&serde_json::json!({"version":4,"area_time":[]})).unwrap(),
    };
    let transition = transition_view(&pic, id).unwrap();
    assert_eq!(transition.version, 1);
    assert!(transition.index_synced.as_ref().unwrap() >= &Int(cutover.into()));
    assert_eq!(
        transition.transition_hash.as_ref().unwrap(),
        &epoch.transition_hash
    );
    assert_eq!(
        dtr_wire::hash(&unhex(transition.metadata_hex.as_ref().unwrap()).unwrap()),
        epoch.metadata_hash
    );
    native
        .apply(Action::Transition {
            epoch: Box::new(epoch.clone()),
            state_hex: hex(&output.state),
            event_hex: hex(&output.events),
            score_hex: hex(&output.scores),
        })
        .unwrap();
    assert_eq!(
        publication(&native.record).unwrap().bytes,
        encode_publication(&checkpoint)
    );
    publications.push(checkpoint.clone());
    last = checkpoint.head.segment_id.clone();
    let once = observe(&pic, id).0.publication;
    let _: Vec<u8> = get_result(
        &pic,
        id,
        "commit_torus_transition",
        candid::encode_one(expected_manifest.clone()).unwrap(),
    );
    assert_eq!(observe(&pic, id).0.publication, once);
    let angle = transfer_text(&pic, ledger, payer, id, 10_000_000, b"ANGLE 225");
    payments.insert(
        angle,
        normalized(
            funding,
            10_000_000,
            b2z_protocol::encode(b2z_protocol::Command::Angle(40960)),
        ),
    );
    for _ in 0..180 {
        tick(&pic);
        if status(&pic, id).source.admitted_to_exclusive > angle {
            break;
        }
    }
    assert_eq!(work(&pic, id).0, 2);
    // Upgrade after transition with two admitted new-epoch inputs still pending.
    pic.upgrade_canister(
        id,
        bytes("B2Z_S14_WASM"),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    assert_eq!(arena_world(&pic, id), new_world);
    assert_eq!(work(&pic, id).0, 2);
    assert_eq!(observe(&pic, id).0.publication, once);
    start_arena(&pic, id);
    for _ in 0..180 {
        tick(&pic);
        capture(
            &mut native,
            &mut assigned,
            &mut publications,
            &mut last,
            &payments,
        );
        if assigned.contains(&angle) {
            break;
        }
    }
    assert_eq!(assigned, vec![first, old_move, new_move, angle]);
    let after = arena_world(&pic, id);
    assert_eq!(after.cannons[0].cell, new_target);
    assert_eq!(after.cannons[0].heading, Some(40960));
    assert_eq!(after.received_e8s, Int(110_020_000u64.into()));
    assert_eq!(
        pic.canister_status(id, Some(controller()))
            .unwrap()
            .settings
            .controllers,
        controllers
    );
    get_result::<Status>(&pic, id, "pause_autonomous", encode_args(()).unwrap());
    let accepted = arena_world(&pic, id);
    let accepted_publication = observe(&pic, id).0.publication;
    pic.upgrade_canister(
        id,
        bytes("B2Z_S14_WASM"),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    assert_eq!(arena_world(&pic, id), accepted);
    assert_eq!(observe(&pic, id).0.publication, accepted_publication);
    let out = PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap());
    std::fs::create_dir_all(&out).unwrap();
    let trace = serde_json::json!({"status":"PASS","evidence_class":"AUTHENTICATED_V3_V4_LOCAL_TRANSITION","initial_world_hex":hex(&initial),"inputs":payments.iter().map(|(id,payload)|serde_json::json!({"position":id.to_string(),"payload_hex":payload})).collect::<Vec<_>>(),"publications":publications,"assigned":assigned,"cutover":cutover,"old_account_cursor":source_before,"old_world_hex":hex(&old_world.encode().unwrap()),"new_world_hex":hex(&new_world.encode().unwrap()),"metadata_hex":transition.metadata_hex,"old_publication_hash":dtr_wire::hash(&old_publication),"transition_hash":epoch.transition_hash,"checkpoint_publication_hash":dtr_wire::hash(&once),"prior_module_tested":std::env::var("B2Z_TORUS_PRIOR_WASM").ok(),"preserved_controllers":controllers.iter().map(Principal::to_text).collect::<Vec<_>>()});
    let path = out.join("world-transition.json");
    std::fs::write(&path, serde_json::to_vec_pretty(&trace).unwrap()).unwrap();
    assert!(
        std::process::Command::new("node")
            .current_dir(Path::new(env!("CARGO_MANIFEST_DIR")).join("../.."))
            .args([
                "tools/replay_s14.mjs",
                path.to_str().unwrap(),
                out.join("world-transition-replay.json").to_str().unwrap()
            ])
            .status()
            .unwrap()
            .success()
    );
}

#[test]
fn torus_browser_authenticated_epoch_recovers_and_stales_old_move() {
    // Deliberately synthetic player fixture for UI/certificate continuity only.
    // The paid transition test separately uses actual upstream Ledger inputs.
    let fixture: serde_json::Value =
        serde_json::from_str(include_str!("../../../tests/fixtures/b2z-torus-v4.json")).unwrap();
    let initial = unhex(fixture["migration"]["old_hex"].as_str().unwrap()).unwrap();
    let (mut pic, id, ledger, _) = arena_setup_world(bytes("B2Z_S14_WASM"), initial);
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    let out =
        PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap()).join("transition-browser");
    std::fs::create_dir_all(&out).unwrap();
    let config = serde_json::json!({"network":"pocketic-local","canister_id":id.to_text(),"ledger":ledger.to_text(),"index":status(&pic,id).source.index.to_text(),"recipient":source::receiving_account(id,0).to_hex(),"root_key_hex":hex(&pic.root_key().unwrap())});
    std::fs::write(
        out.join("configuration.json"),
        serde_json::to_vec(&config).unwrap(),
    )
    .unwrap();
    std::fs::write(out.join("metadata.json"), b"{}").unwrap();
    std::fs::write(out.join("root-key.der"), pic.root_key().unwrap()).unwrap();
    start_arena(&pic, id);
    let gateway = pic.make_live(None);
    let log = std::fs::File::create(out.join("browser.log")).unwrap();
    let mut browser = OwnedBrowser(
        std::process::Command::new(std::env::var("S14_BROWSER_PYTHON").unwrap())
            .current_dir(&root)
            .args([
                "tools/verify_s14_deployment.py",
                "--transition-only",
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
    let began = std::time::Instant::now();
    let mut prepared = false;
    let mut committed = false;
    while began.elapsed() < Duration::from_secs(180) {
        if !prepared && out.join("browser-transition-ready").exists() {
            let reply = pic
                .update_call(
                    id,
                    controller(),
                    "prepare_torus_transition",
                    encode_args(()).unwrap(),
                )
                .unwrap();
            if decode_one::<Result<Vec<u8>, String>>(&reply)
                .unwrap()
                .is_ok()
            {
                prepared = true;
            }
        }
        if prepared && !committed && out.join("browser-fence-seen").exists() {
            let t = transition_view(&pic, id).unwrap();
            #[derive(CandidType, Deserialize)]
            struct BoundaryWork {
                phase: Option<String>,
                pending_inputs: u32,
            }
            let work: BoundaryWork =
                get_query(&pic, id, "controller_work", encode_args(()).unwrap());
            if t.phase == "ready" && work.phase.is_none() && work.pending_inputs == 0 {
                let old = observe(&pic, id).1;
                let old_world = arena_world(&pic, id);
                let _: Vec<u8> = get_result(
                    &pic,
                    id,
                    "commit_torus_transition",
                    candid::encode_one(old.head.manifest_hash.clone()).unwrap(),
                );
                let new = observe(&pic, id).1;
                let evidence = serde_json::json!({"status":"PASS","old_publication":old,"new_publication":new,"old_world_hash":dtr_wire::hash(&old_world.encode().unwrap()),"transition":new.epoch});
                std::fs::write(
                    out.join("transition.json"),
                    serde_json::to_vec_pretty(&evidence).unwrap(),
                )
                .unwrap();
                committed = true;
            }
        }
        if let Some(code) = browser.0.try_wait().unwrap() {
            assert!(
                code.success(),
                "transition browser failure: {}",
                out.join("browser.log").display()
            );
            break;
        }
        std::thread::sleep(Duration::from_millis(100));
    }
    assert!(committed);
    assert!(
        out.join("browser-complete").exists(),
        "transition browser timeout"
    );
    pic.stop_live();
}
#[path = "support/funding.rs"]
mod funding_tests;

#[test]
fn torus_delayed_official_index_paginates_old_history_and_holds_new_rows() {
    let (pic, id, ledger, payer) = arena_setup(bytes("B2Z_S14_WASM"));
    let index = status(&pic, id).source.index;
    start_arena(&pic, id);
    let join = transfer_text(&pic, ledger, payer, id, 100_000_000, b"ANGLE 37.5");
    for _ in 0..120 {
        tick(&pic);
        if arena_world(&pic, id).cannons.len() == 1 && work(&pic, id).0 == 0 {
            break;
        }
    }
    get_result::<Status>(&pic, id, "pause_autonomous", encode_args(()).unwrap());
    pic.stop_canister(index, Some(controller())).unwrap();
    let cursor = status(&pic, id).source.admitted_to_exclusive;
    assert!(cursor > join);
    let mut old = vec![];
    for n in 0..70 {
        old.push(transfer_text(
            &pic,
            ledger,
            payer,
            id,
            1,
            format!("bad {n}").as_bytes(),
        ));
    }
    let mut prepared = false;
    for _ in 0..90 {
        let reply = pic
            .update_call(
                id,
                controller(),
                "prepare_torus_transition",
                encode_args(()).unwrap(),
            )
            .unwrap();
        if decode_one::<Result<Vec<u8>, String>>(&reply)
            .unwrap()
            .is_ok()
        {
            prepared = true;
            break;
        }
        tick(&pic);
    }
    assert!(prepared);
    for _ in 0..120 {
        tick(&pic);
        if transition_view(&pic, id).unwrap().phase == "index"
            && status(&pic, id).source.last_error.is_some()
        {
            break;
        }
    }
    assert_eq!(transition_view(&pic, id).unwrap().phase, "index");
    assert_eq!(status(&pic, id).source.admitted_to_exclusive, cursor);
    let cutover = transition_view(&pic, id).unwrap().ledger_cutover.unwrap();
    // A callback failure and upgrade cannot release the fence or remeasure it.
    pic.upgrade_canister(
        id,
        bytes("B2Z_S14_WASM"),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    assert_eq!(
        transition_view(&pic, id).unwrap().ledger_cutover,
        Some(cutover.clone())
    );
    let new = transfer_text(&pic, ledger, payer, id, 10_000_000, b"ANGLE 225");
    assert!(Int(new.into()) >= cutover);
    pic.start_canister(index, Some(controller())).unwrap();
    let calls = status(&pic, id).source.index_calls;
    start_arena(&pic, id);
    let mut committed = false;
    for _ in 0..240 {
        tick(&pic);
        if transition_view(&pic, id).unwrap().phase != "ready" {
            continue;
        }
        assert_eq!(
            status(&pic, id).source.admitted_to_exclusive,
            old.last().unwrap() + 1
        );
        let manifest = observe(&pic, id).1.head.manifest_hash;
        let reply = pic
            .update_call(
                id,
                controller(),
                "commit_torus_transition",
                candid::encode_one(manifest).unwrap(),
            )
            .unwrap();
        if decode_one::<Result<Vec<u8>, String>>(&reply)
            .unwrap()
            .is_ok()
        {
            committed = true;
            break;
        }
    }
    assert!(
        committed,
        "old work did not drain after official Index recovered"
    );
    assert!(
        status(&pic, id).source.index_calls >= calls + 2,
        "must paginate more than one account page"
    );
    assert_eq!(
        arena_world(&pic, id).received_e8s,
        Int(100_000_070u64.into())
    );
    for _ in 0..180 {
        tick(&pic);
        if arena_world(&pic, id).received_e8s == Int(110_000_070u64.into()) {
            break;
        }
    }
    let after = arena_world(&pic, id);
    assert_eq!(after.received_e8s, Int(110_000_070u64.into()));
    assert_eq!(after.cannons[0].heading, Some(40960));
    assert_eq!(status(&pic, id).source.admitted_to_exclusive, new + 1);
    println!(
        "TORUS_DELAYED_INDEX PASS old_rows=70 cutover={cutover:?} old_cursor={cursor} final_cursor={}",
        new + 1
    );
}
