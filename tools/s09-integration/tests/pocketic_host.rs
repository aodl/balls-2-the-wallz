use btz_native::host::BtzHostKernel;
use candid::{CandidType, Deserialize, Principal, decode_one, encode_args};
use dtr_host::observation::{Publication, publication as native_publication};
use dtr_host::{Action, Coordinator};
use dtr_wire::{Int, decode, encode, hex};
use ic_agent::{Agent, Certificate, lookup_value};
use ic_ledger_types::{
    AccountIdentifier, DEFAULT_SUBACCOUNT, Memo, Tokens, TransferArgs, TransferResult,
};
use pocket_ic::common::rest::BlobCompression;
use pocket_ic::{CanisterSettings, PocketIc, PocketIcBuilder};
use serde_json::Value;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

#[derive(Clone, CandidType)]
struct LedgerConfig {
    network: String,
    ledger: Principal,
    recipient_account: Vec<u8>,
    page_limit: u16,
    fallback_seconds: u32,
    hint_principal: Option<Principal>,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
struct SourceStatus {
    mode: String,
    network: Option<String>,
    ledger: Option<Principal>,
    recipient_account: Option<Vec<u8>>,
    verified_source_watermark: Option<u64>,
    generation: Option<u64>,
    scan_in_flight: bool,
    hint_pending: bool,
    last_error: Option<String>,
    ledger_calls: u64,
    archive_calls: u64,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
struct Status {
    version: u32,
    revision: u64,
    publication_hash: String,
    synthetic_inputs_only: bool,
    source: SourceStatus,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
struct ControllerWork {
    revision: u64,
    phase: Option<String>,
    ready_manifest: Option<String>,
    pending_inputs: u32,
    source_cursor: u64,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
struct Observation {
    publication: Vec<u8>,
    certificate: Option<Vec<u8>>,
}

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

fn required_path(name: &str) -> PathBuf {
    let path = std::env::var_os(name).unwrap_or_else(|| panic!("{name} is required"));
    let path = PathBuf::from(path);
    assert!(path.is_file(), "{name} is not a file: {}", path.display());
    path
}

fn instance() -> PocketIc {
    PocketIcBuilder::new()
        .with_nns_subnet()
        .with_application_subnet()
        .with_server_binary(required_path("POCKET_IC_BIN"))
        .build()
}

fn controller() -> Principal {
    Principal::self_authenticating([7; 32])
}

fn initial_world() -> Vec<u8> {
    let path =
        Path::new(env!("CARGO_MANIFEST_DIR")).join("../../tests/fixtures/btz-v3-golden.json");
    let value: serde_json::Value = serde_json::from_slice(&std::fs::read(path).unwrap()).unwrap();
    let text = value["cases"][0]["initial_hex"].as_str().unwrap();
    dtr_wire::unhex(text).unwrap()
}

fn deploy_synthetic(pic: &PocketIc, wasm: &[u8]) -> Principal {
    let owner = controller();
    let id = pic.create_canister_with_settings(
        Some(owner),
        Some(CanisterSettings {
            controllers: Some(vec![owner]),
            ..Default::default()
        }),
    );
    let init = encode_args((
        initial_world(),
        "01".repeat(32),
        0u64,
        0u64,
        None::<LedgerConfig>,
    ))
    .unwrap();
    pic.install_canister(id, wasm.to_vec(), init, Some(owner));
    id
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

fn status(pic: &PocketIc, id: Principal, caller: Principal) -> Result<Status, String> {
    let bytes = pic
        .query_call(id, caller, "lab_status", encode_args(()).unwrap())
        .map_err(|error| format!("query rejected: {error:?}"))?;
    decode_one::<Result<Status, String>>(&bytes).map_err(|error| error.to_string())?
}

fn update_result<T>(
    pic: &PocketIc,
    id: Principal,
    caller: Principal,
    method: &str,
    args: Vec<u8>,
) -> Result<T, String>
where
    T: for<'de> Deserialize<'de> + CandidType,
{
    let reply = pic
        .update_call(id, caller, method, args)
        .map_err(|error| format!("{method} rejected: {error:?}"))?;
    decode_one::<Result<T, String>>(&reply).map_err(|error| error.to_string())?
}

fn controller_work(pic: &PocketIc, id: Principal) -> Result<ControllerWork, String> {
    let reply = pic
        .query_call(
            id,
            controller(),
            "controller_work",
            encode_args(()).unwrap(),
        )
        .map_err(|error| format!("controller_work rejected: {error:?}"))?;
    decode_one::<Result<ControllerWork, String>>(&reply).map_err(|error| error.to_string())?
}

fn observation(pic: &PocketIc, id: Principal) -> Observation {
    let reply = pic
        .query_call(
            id,
            Principal::anonymous(),
            "observation",
            encode_args(()).unwrap(),
        )
        .unwrap();
    decode_one::<Result<Observation, String>>(&reply)
        .unwrap()
        .unwrap()
}

fn apply(pic: &PocketIc, id: Principal, revision: u64, action: Action) -> Result<Status, String> {
    update_result(
        pic,
        id,
        controller(),
        "apply",
        encode_args((revision, encode(&action).unwrap())).unwrap(),
    )
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

fn artifacts(pic: &PocketIc, id: Principal, publication: &Publication) -> Vec<Vec<u8>> {
    publication
        .artifacts
        .iter()
        .enumerate()
        .map(|(kind, descriptor)| {
            let mut bytes = Vec::with_capacity(descriptor.length);
            for index in 0..descriptor.chunks.len() {
                let reply = pic
                    .query_call(
                        id,
                        Principal::anonymous(),
                        "artifact_chunk",
                        encode_args((
                            dtr_wire::hash(&encode(publication).unwrap()),
                            kind as u8,
                            index as u16,
                        ))
                        .unwrap(),
                    )
                    .unwrap();
                let chunk = decode_one::<Result<Vec<u8>, String>>(&reply)
                    .unwrap()
                    .unwrap();
                bytes.extend(chunk);
            }
            bytes.truncate(descriptor.length);
            assert_eq!(dtr_wire::hash(&bytes), descriptor.sha256);
            bytes
        })
        .collect()
}

fn archives(pic: &PocketIc, ledger: Principal) -> Vec<Principal> {
    let reply = pic
        .query_call(
            ledger,
            Principal::anonymous(),
            "archives",
            encode_args(()).unwrap(),
        )
        .unwrap();
    decode_one::<Archives>(&reply)
        .unwrap()
        .archives
        .into_iter()
        .map(|archive| archive.canister_id)
        .collect()
}

fn assert_module_hash(pic: &PocketIc, canister: Principal, wasm_path: &str) {
    let expected = dtr_wire::hash(&std::fs::read(required_path(wasm_path)).unwrap());
    let actual = pic
        .canister_status(canister, Some(controller()))
        .unwrap()
        .module_hash
        .map(|bytes| hex(&bytes))
        .unwrap();
    assert_eq!(
        actual, expected,
        "installed module differs from pinned artifact"
    );
}

fn certificate_time(certificate: &Certificate) -> Result<u64, String> {
    let mut bytes = lookup_value(certificate, [b"time".as_slice()]).map_err(|e| e.to_string())?;
    leb128::read::unsigned(&mut bytes).map_err(|e| e.to_string())
}

fn authenticate_catalog(
    agent: &Agent,
    certificate_bytes: Option<&[u8]>,
    canister: Principal,
    publication: &[u8],
    now_nanos: u64,
    max_age: Duration,
    max_future: Duration,
) -> Result<(u64, bool), String> {
    let bytes = certificate_bytes.ok_or("missing certificate")?;
    let certificate: Certificate = serde_cbor::from_slice(bytes).map_err(|e| e.to_string())?;
    agent
        .verify(&certificate, canister)
        .map_err(|e| e.to_string())?;
    let certified = lookup_value(
        &certificate,
        [
            b"canister".as_slice(),
            canister.as_slice(),
            b"certified_data".as_slice(),
        ],
    )
    .map_err(|e| e.to_string())?;
    if certified != dtr_wire::unhex(&dtr_wire::hash(publication)).unwrap() {
        return Err("certified catalog root mismatch".into());
    }
    let certificate_nanos = certificate_time(&certificate)?;
    if certificate_nanos.saturating_add(max_age.as_nanos() as u64) < now_nanos {
        return Err("stale certificate".into());
    }
    if certificate_nanos > now_nanos.saturating_add(max_future.as_nanos() as u64) {
        return Err("future certificate".into());
    }
    Ok((certificate_nanos, certificate.delegation.is_some()))
}

#[test]
fn install_and_authorization_smoke() {
    let wasm = std::fs::read(required_path("DTR_RUNTIME_WASM")).unwrap();
    let pic = instance();
    let id = deploy_synthetic(&pic, &wasm);
    let public = status(&pic, id, Principal::anonymous()).unwrap();
    assert_eq!(public.version, 6);
    assert_eq!(public.revision, 0);
    assert!(public.synthetic_inputs_only);
    assert_eq!(public.source.mode, "synthetic");
    assert_eq!(public.publication_hash.len(), 64);

    let unauthorized = pic.update_call(
        id,
        Principal::self_authenticating([9; 32]),
        "sync_ledger",
        encode_args(()).unwrap(),
    );
    let reply = unauthorized.expect("authorization is an application error reply");
    let result = decode_one::<Result<Status, String>>(&reply).unwrap();
    assert!(result.unwrap_err().contains("controller-only"));
    assert!(
        pic.update_call(
            id,
            controller(),
            "test_trap_after_root_write",
            candid::encode_one(0u64).unwrap(),
        )
        .is_err(),
        "normal Wasm must not expose test-only fault hooks"
    );
}

#[test]
fn invalid_init_trap_rollback_and_corruption_fail_closed() {
    let normal_wasm = std::fs::read(required_path("DTR_RUNTIME_WASM")).unwrap();
    let test_wasm = std::fs::read(required_path("DTR_RUNTIME_TEST_WASM")).unwrap();
    let pic = instance();

    let invalid = create_controlled(&pic);
    let invalid_args = encode_args((
        vec![0xff],
        "01".repeat(32),
        0u64,
        0u64,
        None::<LedgerConfig>,
    ))
    .unwrap();
    let rejected = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        pic.install_canister(
            invalid,
            normal_wasm.clone(),
            invalid_args,
            Some(controller()),
        );
    }));
    assert!(
        rejected.is_err(),
        "invalid genesis must reject installation"
    );

    let test_id = deploy_synthetic(&pic, &test_wasm);
    let before = status(&pic, test_id, Principal::anonymous()).unwrap();
    let trapped = pic.update_call(
        test_id,
        controller(),
        "test_trap_after_root_write",
        candid::encode_one(before.revision).unwrap(),
    );
    assert!(
        trapped.is_err(),
        "test hook must trap after its tentative stable write"
    );
    let after = status(&pic, test_id, Principal::anonymous()).unwrap();
    assert_eq!(after.revision, before.revision);
    assert_eq!(after.publication_hash, before.publication_hash);

    let corrupt = deploy_synthetic(&pic, &normal_wasm);
    let before_corruption = status(&pic, corrupt, Principal::anonymous()).unwrap();
    let stable_size = pic.get_stable_memory(corrupt).len();
    assert!(stable_size > 1024);
    pic.set_stable_memory(
        corrupt,
        vec![0; stable_size],
        BlobCompression::NoCompression,
    );
    assert!(
        pic.upgrade_canister(
            corrupt,
            normal_wasm,
            encode_args(()).unwrap(),
            Some(controller()),
        )
        .is_err(),
        "post-upgrade must reject malformed durable state"
    );
    let corrupt_reply = pic
        .query_call(
            corrupt,
            Principal::anonymous(),
            "lab_status",
            encode_args(()).unwrap(),
        )
        .expect("query entrypoint remains callable");
    let recovered = decode_one::<Result<Status, String>>(&corrupt_reply)
        .unwrap()
        .expect("failed upgrade must atomically restore the previous module and memory");
    assert_eq!(recovered.revision, before_corruption.revision);
    assert_eq!(
        recovered.publication_hash, before_corruption.publication_hash,
        "malformed durable data must reject the upgrade, never install replacement genesis"
    );
}

#[test]
fn upgrades_preserve_idle_sealed_and_ready_boundaries() {
    let wasm = std::fs::read(required_path("DTR_RUNTIME_WASM")).unwrap();
    let pic = instance();

    let idle = deploy_synthetic(&pic, &wasm);
    let idle_publication = observation(&pic, idle).publication;
    pic.upgrade_canister(
        idle,
        wasm.clone(),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    assert_eq!(observation(&pic, idle).publication, idle_publication);
    assert!(controller_work(&pic, idle).unwrap().phase.is_none());

    let sealed = deploy_synthetic(&pic, &wasm);
    let sealed_publication = observation(&pic, sealed).publication;
    apply(
        &pic,
        sealed,
        0,
        Action::Seal {
            logical_end: Int(1u64.into()),
        },
    )
    .unwrap();
    assert_eq!(
        controller_work(&pic, sealed).unwrap().phase.as_deref(),
        Some("running")
    );
    pic.upgrade_canister(
        sealed,
        wasm.clone(),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    assert_eq!(observation(&pic, sealed).publication, sealed_publication);
    assert_eq!(
        controller_work(&pic, sealed).unwrap().phase.as_deref(),
        Some("running")
    );

    let ready = deploy_synthetic(&pic, &wasm);
    apply(
        &pic,
        ready,
        0,
        Action::Seal {
            logical_end: Int(1u64.into()),
        },
    )
    .unwrap();
    let mut work = controller_work(&pic, ready).unwrap();
    for _ in 0..64 {
        if work.phase.as_deref() == Some("ready") {
            break;
        }
        apply(&pic, ready, work.revision, Action::Step { budget: 100_000 }).unwrap();
        work = controller_work(&pic, ready).unwrap();
    }
    assert_eq!(work.phase.as_deref(), Some("ready"));
    let ready_hash = work.ready_manifest.clone();
    let ready_publication = observation(&pic, ready).publication;
    pic.upgrade_canister(ready, wasm, encode_args(()).unwrap(), Some(controller()))
        .unwrap();
    let recovered = controller_work(&pic, ready).unwrap();
    assert_eq!(recovered.phase.as_deref(), Some("ready"));
    assert_eq!(recovered.ready_manifest, ready_hash);
    assert_eq!(observation(&pic, ready).publication, ready_publication);
}

#[test]
fn upstream_ledger_archive_to_recovered_publication_matches_native() {
    let runtime_wasm = std::fs::read(required_path("DTR_RUNTIME_WASM")).unwrap();
    let ledger_wasm = std::fs::read(required_path("DTR_LEDGER_WASM")).unwrap();
    let mut pic = instance();
    let runtime = create_controlled(&pic);
    let payers = [
        Principal::self_authenticating([11; 32]),
        Principal::self_authenticating([12; 32]),
        Principal::self_authenticating([13; 32]),
    ];
    let ledger = deploy_ledger(&pic, &ledger_wasm, &payers);
    assert_module_hash(&pic, ledger, "DTR_LEDGER_WASM");

    let recipient = AccountIdentifier::new(&runtime, &DEFAULT_SUBACCOUNT);
    let init = encode_args((
        initial_world(),
        "00".repeat(32),
        0u64,
        0u64,
        Some(LedgerConfig {
            network: "pocketic-local".into(),
            ledger,
            recipient_account: recipient.as_bytes().to_vec(),
            page_limit: 2,
            fallback_seconds: 60,
            hint_principal: Some(Principal::self_authenticating([22; 32])),
        }),
    ))
    .unwrap();
    pic.install_canister(runtime, runtime_wasm.clone(), init, Some(controller()));

    let valid_memo = *b"BTZ\x11\0\0\x40\0";
    let under_memo = *b"BTZ\x11\0\0\x20\0";
    let malformed_memo = [0; 8];
    let valid = transfer(
        &pic,
        ledger,
        payers[0],
        recipient,
        1_000_000_000,
        valid_memo,
    );
    let under = transfer(&pic, ledger, payers[1], recipient, 1, under_memo);
    let malformed = transfer(
        &pic,
        ledger,
        payers[2],
        recipient,
        1_000_000_000,
        malformed_memo,
    );
    let irrelevant_destination = AccountIdentifier::new(
        &Principal::self_authenticating([44; 32]),
        &DEFAULT_SUBACCOUNT,
    );
    transfer(
        &pic,
        ledger,
        payers[0],
        irrelevant_destination,
        1_000_000_000,
        valid_memo,
    );
    for _ in 0..20 {
        pic.tick();
    }
    let archive_ids = archives(&pic, ledger);
    assert!(
        !archive_ids.is_empty(),
        "low threshold must exercise an upstream archive"
    );
    // The ledger installs the official gzip payload directly; the reported
    // module hash therefore matches the pinned compressed artifact.
    assert_module_hash(&pic, archive_ids[0], "DTR_LEDGER_ARCHIVE_WASM_GZ");

    let synthetic = Action::Ingest {
        start: Int(0u64.into()),
        records: vec![],
        anchor: "00".repeat(32),
    };
    assert!(
        apply(&pic, runtime, 0, synthetic)
            .unwrap_err()
            .contains("rejects generic synthetic ingestion")
    );
    let unrelated = Principal::self_authenticating([99; 32]);
    let unauthorized = pic
        .update_call(runtime, unrelated, "sync_ledger", encode_args(()).unwrap())
        .unwrap();
    assert!(
        decode_one::<Result<Status, String>>(&unauthorized)
            .unwrap()
            .unwrap_err()
            .contains("controller-only")
    );
    let private_query = pic
        .query_call(
            runtime,
            unrelated,
            "controller_work",
            encode_args(()).unwrap(),
        )
        .unwrap();
    assert!(
        decode_one::<Result<ControllerWork, String>>(&private_query)
            .unwrap()
            .unwrap_err()
            .contains("controller-only")
    );

    let mut latest = status(&pic, runtime, Principal::anonymous()).unwrap();
    for _ in 0..32 {
        latest = update_result(
            &pic,
            runtime,
            controller(),
            "sync_ledger",
            encode_args(()).unwrap(),
        )
        .unwrap();
        if !latest.source.hint_pending && !latest.source.scan_in_flight {
            break;
        }
    }
    assert!(
        !latest.source.hint_pending,
        "bounded scans must reach the ledger tip"
    );
    assert!(
        latest.source.archive_calls > 0,
        "runtime must follow the ledger-established archive"
    );

    let dropped_hint_position = transfer(
        &pic,
        ledger,
        payers[0],
        irrelevant_destination,
        1,
        valid_memo,
    );
    let before_fallback = latest.source.verified_source_watermark.unwrap();
    assert!(before_fallback <= dropped_hint_position);
    pic.advance_time(Duration::from_secs(61));
    for _ in 0..24 {
        pic.tick();
    }
    latest = status(&pic, runtime, Principal::anonymous()).unwrap();
    for _ in 0..16 {
        if latest.source.verified_source_watermark.unwrap() > dropped_hint_position {
            break;
        }
        pic.tick();
        latest = status(&pic, runtime, Principal::anonymous()).unwrap();
    }
    let watermark = latest.source.verified_source_watermark.unwrap();
    assert!(
        watermark > dropped_hint_position,
        "fallback timer must discover the dropped hint"
    );

    let old_publication = observation(&pic, runtime).publication;
    let mut work = controller_work(&pic, runtime).unwrap();
    let sealed = apply(
        &pic,
        runtime,
        work.revision,
        Action::Seal {
            logical_end: Int(2u64.into()),
        },
    )
    .unwrap();
    assert_eq!(observation(&pic, runtime).publication, old_publication);
    assert!(
        apply(
            &pic,
            runtime,
            sealed.revision - 1,
            Action::Step { budget: 1 },
        )
        .unwrap_err()
        .contains("stale laboratory revision")
    );
    apply(&pic, runtime, sealed.revision, Action::Step { budget: 1 }).unwrap();
    work = controller_work(&pic, runtime).unwrap();
    assert_eq!(work.phase.as_deref(), Some("running"));

    pic.upgrade_canister(
        runtime,
        runtime_wasm.clone(),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    work = controller_work(&pic, runtime).unwrap();
    assert_eq!(work.phase.as_deref(), Some("running"));
    assert_eq!(work.source_cursor, watermark);
    assert_eq!(work.pending_inputs, 3);
    for _ in 0..128 {
        if work.phase.as_deref() == Some("ready") {
            break;
        }
        apply(
            &pic,
            runtime,
            work.revision,
            Action::Step { budget: 100_000 },
        )
        .unwrap();
        work = controller_work(&pic, runtime).unwrap();
    }
    assert_eq!(work.phase.as_deref(), Some("ready"));
    assert_eq!(observation(&pic, runtime).publication, old_publication);
    let ready = work.ready_manifest.clone().unwrap();

    let lost_reply = pic
        .submit_call(
            runtime,
            controller(),
            "apply",
            encode_args((
                work.revision,
                encode(&Action::Publish {
                    manifest_hash: ready.clone(),
                })
                .unwrap(),
            ))
            .unwrap(),
        )
        .unwrap();
    for _ in 0..12 {
        pic.tick();
        if observation(&pic, runtime).publication != old_publication {
            break;
        }
    }
    // Deliberately never await `lost_reply`: state is checked through a fresh query.
    let _client_reply_was_ignored = lost_reply;
    let committed_observation = observation(&pic, runtime);
    assert_ne!(committed_observation.publication, old_publication);
    assert!(committed_observation.certificate.is_some());
    let committed: Publication = decode(&committed_observation.publication).unwrap();
    assert_eq!(committed.head.manifest_hash, ready);
    let committed_status = status(&pic, runtime, Principal::anonymous()).unwrap();
    let duplicate = apply(
        &pic,
        runtime,
        committed_status.revision,
        Action::Publish {
            manifest_hash: ready.clone(),
        },
    )
    .unwrap();
    assert_eq!(duplicate.revision, committed_status.revision);

    let public_artifacts = artifacts(&pic, runtime, &committed);
    let world: Value = serde_json::from_slice(&public_artifacts[0]).unwrap();
    let events: Value = serde_json::from_slice(&public_artifacts[1]).unwrap();
    assert_eq!(world["cannons"].as_array().unwrap().len(), 1);
    let receipts = events["receipts"].as_array().unwrap();
    assert_eq!(receipts.len(), 3);
    let reasons: Vec<_> = receipts
        .iter()
        .map(|receipt| receipt["reason"].as_str().unwrap())
        .collect();
    assert_eq!(
        reasons
            .iter()
            .filter(|reason| **reason == "ACCEPTED")
            .count(),
        1
    );
    assert!(reasons.contains(&"UNDERFUNDED"));
    assert!(reasons.contains(&"MALFORMED_MEMO"));

    let mut records = vec![None; watermark as usize];
    records[valid as usize] = Some(normalized(
        AccountIdentifier::new(&payers[0], &DEFAULT_SUBACCOUNT),
        1_000_000_000,
        valid_memo,
    ));
    records[under as usize] = Some(normalized(
        AccountIdentifier::new(&payers[1], &DEFAULT_SUBACCOUNT),
        1,
        under_memo,
    ));
    records[malformed as usize] = Some(normalized(
        AccountIdentifier::new(&payers[2], &DEFAULT_SUBACCOUNT),
        1_000_000_000,
        malformed_memo,
    ));
    let seal = committed.head.seal.clone().unwrap();
    let mut native = Coordinator::create(
        &initial_world(),
        committed.identity.clone(),
        0,
        0,
        "00".repeat(32),
        BtzHostKernel,
    )
    .unwrap();
    native
        .apply(Action::Ingest {
            start: Int(0u64.into()),
            records,
            anchor: seal.source_anchor.clone(),
        })
        .unwrap();
    native
        .apply(Action::Seal {
            logical_end: Int(2u64.into()),
        })
        .unwrap();
    while native.record.journal.stage.as_ref().unwrap().phase == "running" {
        native.apply(Action::Step { budget: 100_000 }).unwrap();
    }
    let native_ready = native
        .record
        .journal
        .stage
        .as_ref()
        .unwrap()
        .ready_hash
        .clone()
        .unwrap();
    native
        .apply(Action::Publish {
            manifest_hash: native_ready,
        })
        .unwrap();
    assert_eq!(
        native_publication(&native.record).unwrap().artifacts,
        public_artifacts
    );

    let wall_time = SystemTime::now();
    pic.set_time(wall_time.into());
    pic.tick();
    let root_key = pic.root_key().expect("NNS root key");
    println!("LOCAL_ROOT_SHA256={}", dtr_wire::hash(&root_key));
    let url = pic.make_live(None);
    let async_runtime = tokio::runtime::Runtime::new().unwrap();
    let agent = Agent::builder().with_url(url.as_str()).build().unwrap();
    // Deliberate harness binding to this exact local instance; never fetched from an arbitrary endpoint.
    agent.set_root_key(root_key.clone());
    let http_reply = async_runtime
        .block_on(
            agent
                .query(&runtime, "observation")
                .with_arg(encode_args(()).unwrap())
                .call(),
        )
        .unwrap();
    let http_observation = decode_one::<Result<Observation, String>>(&http_reply)
        .unwrap()
        .unwrap();
    assert_eq!(
        http_observation.publication,
        committed_observation.publication
    );
    let now_nanos = wall_time.duration_since(UNIX_EPOCH).unwrap().as_nanos() as u64;
    let (cert_time, delegated) = authenticate_catalog(
        &agent,
        http_observation.certificate.as_deref(),
        runtime,
        &http_observation.publication,
        now_nanos,
        Duration::from_secs(300),
        Duration::from_secs(30),
    )
    .unwrap();
    assert!(
        delegated,
        "application-subnet certificate must exercise NNS delegation"
    );
    assert!(
        authenticate_catalog(
            &agent,
            None,
            runtime,
            &http_observation.publication,
            now_nanos,
            Duration::from_secs(300),
            Duration::from_secs(30),
        )
        .unwrap_err()
        .contains("missing certificate")
    );
    assert!(
        authenticate_catalog(
            &agent,
            http_observation.certificate.as_deref(),
            runtime,
            &old_publication,
            now_nanos,
            Duration::from_secs(300),
            Duration::from_secs(30),
        )
        .unwrap_err()
        .contains("catalog root mismatch")
    );
    assert!(
        authenticate_catalog(
            &agent,
            http_observation.certificate.as_deref(),
            runtime,
            &http_observation.publication,
            cert_time + Duration::from_secs(301).as_nanos() as u64,
            Duration::from_secs(300),
            Duration::from_secs(30),
        )
        .unwrap_err()
        .contains("stale certificate")
    );
    assert!(
        authenticate_catalog(
            &agent,
            http_observation.certificate.as_deref(),
            runtime,
            &http_observation.publication,
            cert_time.saturating_sub(Duration::from_secs(31).as_nanos() as u64),
            Duration::from_secs(300),
            Duration::from_secs(30),
        )
        .unwrap_err()
        .contains("future certificate")
    );
    let certificate: Certificate =
        serde_cbor::from_slice(http_observation.certificate.as_deref().unwrap()).unwrap();
    assert!(
        agent
            .verify(&certificate, Principal::management_canister())
            .is_err()
    );
    if let Some(directory) = std::env::var_os("DTR_S09_EXPORT") {
        let directory = PathBuf::from(directory);
        std::fs::create_dir_all(&directory).unwrap();
        let certificate_bytes = http_observation.certificate.as_deref().unwrap();
        let initial_state = initial_world();
        for (name, bytes) in [
            ("catalog.bin", http_observation.publication.as_slice()),
            ("certificate.cbor", certificate_bytes),
            ("root-key.der", root_key.as_slice()),
            ("initial-state.bin", initial_state.as_slice()),
            ("state.bin", public_artifacts[0].as_slice()),
            ("events.bin", public_artifacts[1].as_slice()),
            ("scores.bin", public_artifacts[2].as_slice()),
        ] {
            std::fs::write(directory.join(name), bytes).unwrap();
        }
        let metadata = serde_json::json!({
            "version": 1,
            "trust": "local-ic-test-certificate",
            "network": "pocketic-local",
            "canister_id": runtime.to_text(),
            "root_key_sha256": dtr_wire::hash(&root_key),
            "logical_start": 0,
            "logical_end": 2,
            "tick_seconds": 0.25,
        });
        std::fs::write(
            directory.join("metadata.json"),
            serde_json::to_vec_pretty(&metadata).unwrap(),
        )
        .unwrap();
    }
    let wrong_agent = Agent::builder().with_url(url.as_str()).build().unwrap();
    let mut wrong_root = root_key;
    *wrong_root.last_mut().unwrap() ^= 1;
    wrong_agent.set_root_key(wrong_root);
    assert!(wrong_agent.verify(&certificate, runtime).is_err());
    let mut tampered_certificate = http_observation.certificate.unwrap();
    let middle = tampered_certificate.len() / 2;
    tampered_certificate[middle] ^= 1;
    assert!(
        serde_cbor::from_slice::<Certificate>(&tampered_certificate).map_or(true, |certificate| {
            agent.verify(&certificate, runtime).is_err()
        })
    );
    let mut tampered_chunk = public_artifacts[0].clone();
    tampered_chunk[0] ^= 1;
    assert_ne!(
        dtr_wire::hash(&tampered_chunk),
        committed.artifacts[0].sha256
    );
    pic.stop_live();
}
