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
        transfer_fee: Some(Tokens::from_e8s(10_000)),
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
struct RunStatus {
    idle: Option<bool>,
    running: bool,
    callback_count: u64,
    completed_segments: u64,
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
fn replay_head(
    pic: &PocketIc,
    id: Principal,
    p: &Publication,
    h: &mut Coordinator<B2zHostKernel>,
    payments: &BTreeMap<u64, String>,
    assigned: &mut Vec<u64>,
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
        h.apply(Action::Step { budget: 17 }).unwrap();
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
            if work.phase.is_some() {
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
#[test]
fn deployed_bundle_live_index_payments_reconnect_and_upgrade() {
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
    // Includes dfx asset hosting, fallback, three responsive captures, clipboard,
    // reconnect/upgrade, three negative pages and reduced-motion verification.
    // Per-page waits remain bounded; preserve the earlier 200s timeout evidence.
    let began = std::time::Instant::now();
    let deadline = began + Duration::from_secs(360);
    let mut logged_phase = -2;
    while std::time::Instant::now() < deadline {
        // Freeze only this disposable instance while the test atomically reads
        // a retained catalog and all chunks for strict native replay. Without
        // this fence, make_live can retire the catalog midway through replay
        // on a loaded host. The browser's reconnect/resync remains unfenced.
        pic.stop_progress();
        let (_, p) = observe(&pic, id);
        if p.head.segment_id != last {
            // make_live advances independently while HTTP/asset requests run.
            // Replay every intervening retained publication; never skip a seal
            // merely because two publications completed between observations.
            let next_segment = last
                .as_ref()
                .map_or(0, |sid: &Int| sid.0.to_string().parse::<u64>().unwrap() + 1);
            let head = p
                .head
                .segment_id
                .as_ref()
                .unwrap()
                .0
                .to_string()
                .parse::<u64>()
                .unwrap();
            for segment in next_segment..=head {
                let observed = if segment == head {
                    p.clone()
                } else {
                    let bytes = decode_one::<Result<Vec<u8>, String>>(
                        &pic.query_call(
                            id,
                            controller(),
                            "retained_publication",
                            candid::encode_one(segment).unwrap(),
                        )
                        .unwrap(),
                    )
                    .unwrap()
                    .expect("live replay requires each intermediate publication still retained");
                    decode::<Publication>(&bytes).unwrap()
                };
                replay_head(&pic, id, &observed, &mut native, &payments, &mut assigned);
                last = observed.head.segment_id.clone();
                publications.push(observed);
            }
        }
        pic.auto_progress();
        if phase == -1 && out.join("bootstrap-anchor-read").exists() {
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
        assert!(s.source.last_error.is_none(), "{:?}", s.source.last_error);
        assert!(s.run.last_error.is_none());
        if let Some(code) = browser.0.try_wait().unwrap() {
            assert!(
                code.success(),
                "browser deployment failed; see {}",
                out.join("browser.log").display()
            );
        }
        if phase == 0 && out.join("browser-connected").exists() && !s.source.scan_in_flight {
            let before = s.source.index_calls;
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
            let tx = transfer_text(&pic, ledger, payer, id, 100_000_000, b"ANGLE 37.5");
            first = Some(tx);
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
        } else if phase == 1 && assigned.contains(&first.unwrap()) {
            if !out.join("browser-first-cannon-seen").exists() {
                std::thread::sleep(Duration::from_millis(50));
                continue;
            }
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
        } else if phase == 2 && assigned.contains(&second.unwrap()) {
            let view = publication(&native.record).unwrap();
            let world = b2z_native::world::World::decode(&view.artifacts[0]).unwrap();
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
        } else if phase == 6 && assigned.contains(&third.unwrap()) {
            std::fs::write(
                out.join("harness-payments-done"),
                serde_json::to_vec(&[first.unwrap(), second.unwrap(), third.unwrap()]).unwrap(),
            )
            .unwrap();
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
            if work.phase.is_some() {
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
        std::thread::sleep(Duration::from_millis(100));
    }
    if phase != 5 || !out.join("browser-complete").exists() {
        let _ = browser.0.kill();
        panic!(
            "deployment acceptance timeout in phase {phase}; see {}",
            out.join("browser.log").display()
        );
    }
    assert!(browser.0.wait().unwrap().success());
    pic.stop_live();
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
        dtr_wire::hash(p) != "187df32c5c95623abf13f52a626c9daeb3ee36591e9f6cf0d27cad8b109f4ce1"
    });
    let old = prior.unwrap_or_else(|| bytes("B2Z_S14_WASM"));
    if is_historical {
        assert!(matches!(
            dtr_wire::hash(&old).as_str(),
            "187df32c5c95623abf13f52a626c9daeb3ee36591e9f6cf0d27cad8b109f4ce1"
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
    let ledger = deploy_ledger(&pic, &bytes("ICP_LEDGER_WASM"), &[payer]);
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
    let (pic, id, ledger, payer) = arena_setup(bytes("B2Z_S14_WASM"));
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
        },
        Cannon {
            id: 2,
            cell: 11,
            account: "02".repeat(32),
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
