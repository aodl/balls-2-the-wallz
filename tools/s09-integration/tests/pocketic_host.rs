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
use std::collections::{BTreeMap, BTreeSet};
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

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
    run: RunStatus,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
struct RunStatus {
    running: bool,
    generation: u64,
    segment_ticks: u64,
    pacing_seconds: u32,
    work_budget: u32,
    callback_count: u64,
    completed_segments: u64,
    current_segment_work: u64,
    last_segment_work: u64,
    total_work: u64,
    max_segment_work: u64,
    last_error: Option<String>,
}

#[derive(Clone, CandidType)]
struct RunConfig {
    segment_ticks: u64,
    pacing_seconds: u32,
    work_budget: u32,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
struct RetainedEntry {
    segment_id: u64,
    publication_hash: String,
    bytes: u64,
    current: bool,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
struct RetentionStatus {
    max_segments: u16,
    max_bytes: u64,
    retained_bytes: u64,
    entries: Vec<RetainedEntry>,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
struct TestScanState {
    nonce: u64,
    cursor: u64,
    started_at_seconds: u64,
    expired: bool,
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

#[derive(Clone, CandidType)]
struct FaultTimestamp {
    timestamp_nanos: u64,
}

#[derive(Clone, CandidType)]
struct FaultTransaction {
    memo: u64,
    icrc1_memo: Option<Vec<u8>>,
    operation: Option<FaultOperation>,
    created_at_time: FaultTimestamp,
}

#[derive(Clone, CandidType)]
#[allow(dead_code)]
enum FaultOperation {
    Mint {
        to: Vec<u8>,
        amount: FaultTokens,
    },
    Transfer {
        from: Vec<u8>,
        to: Vec<u8>,
        amount: FaultTokens,
        fee: FaultTokens,
        spender: Option<Vec<u8>>,
    },
}

#[derive(Clone, CandidType)]
struct FaultTokens {
    e8s: u64,
}

#[derive(Clone, CandidType)]
struct FaultBlock {
    parent_hash: Option<Vec<u8>>,
    transaction: FaultTransaction,
    timestamp: FaultTimestamp,
}

#[derive(Clone, CandidType)]
struct FaultBlockRange {
    blocks: Vec<FaultBlock>,
}

#[derive(Clone, CandidType)]
#[allow(dead_code)]
enum FaultArchiveError {
    Other {
        error_code: u64,
        error_message: String,
    },
}

type FaultArchiveResult = Result<FaultBlockRange, FaultArchiveError>;
candid::define_function!(FaultArchiveCallback : (FaultGetBlocksArgs) -> (FaultArchiveResult) query);

#[derive(Clone, CandidType)]
struct FaultGetBlocksArgs {
    start: u64,
    length: u64,
}

#[derive(Clone, CandidType)]
struct FaultArchivedRange {
    start: u64,
    length: u64,
    callback: FaultArchiveCallback,
}

#[derive(Clone, CandidType)]
struct FaultQueryResponse {
    chain_length: u64,
    certificate: Option<Vec<u8>>,
    blocks: Vec<FaultBlock>,
    first_block_index: u64,
    archived_blocks: Vec<FaultArchivedRange>,
}

fn required_path(name: &str) -> PathBuf {
    let path = std::env::var_os(name).unwrap_or_else(|| panic!("{name} is required"));
    let path = PathBuf::from(path);
    assert!(path.is_file(), "{name} is not a file: {}", path.display());
    path
}

fn baseline_runtime_wasm(current: &[u8]) -> Vec<u8> {
    let mode = std::env::var("DTR_UPGRADE_TEST_MODE")
        .expect("DTR_UPGRADE_TEST_MODE must explicitly select same-version or cross-version");
    let path = required_path("DTR_BASELINE_RUNTIME_WASM");
    let baseline = std::fs::read(path).unwrap();
    let baseline_revision = std::env::var("DTR_BASELINE_SOURCE_REVISION")
        .expect("DTR_BASELINE_SOURCE_REVISION is required");
    let baseline_tree =
        std::env::var("DTR_BASELINE_SOURCE_TREE").expect("DTR_BASELINE_SOURCE_TREE is required");
    let replacement_revision = std::env::var("DTR_REPLACEMENT_SOURCE_REVISION")
        .expect("DTR_REPLACEMENT_SOURCE_REVISION is required");
    let replacement_tree = std::env::var("DTR_REPLACEMENT_SOURCE_TREE")
        .expect("DTR_REPLACEMENT_SOURCE_TREE is required");
    assert!(!replacement_revision.is_empty() && !replacement_tree.is_empty());
    match mode.as_str() {
        "same-version" => {
            assert_eq!(
                baseline, current,
                "same-version baseline must be the current normal module"
            );
            assert_eq!(baseline_revision, replacement_revision);
            assert_eq!(baseline_tree, replacement_tree);
        }
        "cross-version" => {
            assert_eq!(
                baseline_revision,
                "e4405bbdcfccb11533d8a2a98ce709e2d8d02ed0"
            );
            assert_eq!(baseline_tree, "42c9f5c7b01b94bd1fe6da40cc55bc34513f7220");
        }
        other => panic!("unknown DTR_UPGRADE_TEST_MODE: {other}"),
    }
    baseline
}

fn instance() -> PocketIc {
    let builder = PocketIcBuilder::new()
        .with_nns_subnet()
        .with_application_subnet();
    if let Ok(server_url) = std::env::var("POCKET_IC_SERVER_URL") {
        builder
            .with_server_url(
                server_url
                    .parse()
                    .unwrap_or_else(|error| panic!("invalid POCKET_IC_SERVER_URL: {error}")),
            )
            .build()
    } else {
        builder
            .with_server_binary(required_path("POCKET_IC_BIN"))
            .build()
    }
}

fn wat_bytes(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("\\{byte:02x}")).collect()
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

fn fault_block() -> FaultBlock {
    FaultBlock {
        parent_hash: Some(vec![0; 32]),
        transaction: FaultTransaction {
            memo: 0,
            icrc1_memo: None,
            operation: None,
            created_at_time: FaultTimestamp { timestamp_nanos: 1 },
        },
        timestamp: FaultTimestamp { timestamp_nanos: 1 },
    }
}

fn fault_payment(from: AccountIdentifier, to: AccountIdentifier) -> FaultBlock {
    FaultBlock {
        parent_hash: Some(vec![0; 32]),
        transaction: FaultTransaction {
            memo: u64::from_be_bytes(*b"BTZ\x11\0\0\x40\0"),
            icrc1_memo: None,
            operation: Some(FaultOperation::Transfer {
                from: from.as_bytes().to_vec(),
                to: to.as_bytes().to_vec(),
                amount: FaultTokens { e8s: 1_000_000_000 },
                fee: FaultTokens { e8s: 10_000 },
                spender: None,
            }),
            created_at_time: FaultTimestamp { timestamp_nanos: 1 },
        },
        timestamp: FaultTimestamp { timestamp_nanos: 1 },
    }
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

fn s12_world(name: &str) -> Vec<u8> {
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../benchmarks/s12/workloads.json");
    let value: Value = serde_json::from_slice(&std::fs::read(path).unwrap()).unwrap();
    let workload = value["workloads"]
        .as_array()
        .unwrap()
        .iter()
        .find(|row| row["name"] == name)
        .unwrap_or_else(|| panic!("missing S12 workload {name}"));
    dtr_wire::unhex(workload["initial_state_hex"].as_str().unwrap()).unwrap()
}

fn write_s12_trace(variable: &str, value: &Value) {
    let path = PathBuf::from(
        std::env::var_os(variable).unwrap_or_else(|| panic!("{variable} is required")),
    );
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).unwrap();
    }
    std::fs::write(path, serde_json::to_vec_pretty(value).unwrap()).unwrap();
}

fn deploy_synthetic(pic: &PocketIc, wasm: &[u8]) -> Principal {
    deploy_synthetic_world(pic, wasm, initial_world())
}

fn deploy_synthetic_world(pic: &PocketIc, wasm: &[u8], world: Vec<u8>) -> Principal {
    let owner = controller();
    let id = pic.create_canister_with_settings(
        Some(owner),
        Some(CanisterSettings {
            controllers: Some(vec![owner]),
            ..Default::default()
        }),
    );
    let init = encode_args((world, "01".repeat(32), 0u64, 0u64, None::<LedgerConfig>)).unwrap();
    pic.install_canister(id, wasm.to_vec(), init, Some(owner));
    id
}

fn deploy_fault_source(pic: &PocketIc, wasm: &[u8], ledger: Principal) -> Principal {
    deploy_fault_source_with_fallback(pic, wasm, ledger, 3600)
}

fn deploy_fault_source_with_fallback(
    pic: &PocketIc,
    wasm: &[u8],
    ledger: Principal,
    fallback_seconds: u32,
) -> Principal {
    deploy_fault_source_with_limits(pic, wasm, ledger, fallback_seconds, 4)
}

fn deploy_fault_source_with_limits(
    pic: &PocketIc,
    wasm: &[u8],
    ledger: Principal,
    fallback_seconds: u32,
    page_limit: u16,
) -> Principal {
    let runtime = create_controlled(pic);
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
            page_limit,
            fallback_seconds,
            hint_principal: None,
        }),
    ))
    .unwrap();
    pic.install_canister(runtime, wasm.to_vec(), init, Some(controller()));
    runtime
}

fn test_source_anchor(pic: &PocketIc, id: Principal) -> String {
    let bytes = pic
        .query_call(
            id,
            controller(),
            "test_source_anchor",
            encode_args(()).unwrap(),
        )
        .unwrap();
    decode_one::<Result<String, String>>(&bytes)
        .unwrap()
        .unwrap()
}

fn test_scan_state(pic: &PocketIc, id: Principal) -> TestScanState {
    let bytes = pic
        .query_call(
            id,
            controller(),
            "test_scan_state",
            encode_args(()).unwrap(),
        )
        .unwrap();
    decode_one::<Result<TestScanState, String>>(&bytes)
        .unwrap()
        .unwrap()
}

fn install_fixture(pic: &PocketIc, id: Principal, replies: &[(&str, Vec<u8>)], traps: &[&str]) {
    pic.install_canister(
        id,
        fixture_wasm(replies, traps),
        encode_args(()).unwrap(),
        Some(controller()),
    );
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

fn retention_status(pic: &PocketIc, id: Principal) -> RetentionStatus {
    let reply = pic
        .query_call(
            id,
            Principal::anonymous(),
            "retention_status",
            encode_args(()).unwrap(),
        )
        .unwrap();
    decode_one::<Result<RetentionStatus, String>>(&reply)
        .unwrap()
        .unwrap()
}

fn retained_publication(pic: &PocketIc, id: Principal, segment_id: u64) -> Result<Vec<u8>, String> {
    let reply = pic
        .query_call(
            id,
            Principal::anonymous(),
            "retained_publication",
            candid::encode_one(segment_id).unwrap(),
        )
        .unwrap();
    decode_one::<Result<Vec<u8>, String>>(&reply).unwrap()
}

fn retained_chunk(
    pic: &PocketIc,
    id: Principal,
    segment_id: u64,
    publication_hash: &str,
    kind: u8,
    index: u16,
) -> Result<Vec<u8>, String> {
    let reply = pic
        .query_call(
            id,
            Principal::anonymous(),
            "retained_artifact_chunk",
            encode_args((segment_id, publication_hash, kind, index)).unwrap(),
        )
        .unwrap();
    decode_one::<Result<Vec<u8>, String>>(&reply).unwrap()
}

fn start_autonomous(pic: &PocketIc, id: Principal, config: RunConfig) -> Status {
    update_result(
        pic,
        id,
        controller(),
        "start_autonomous",
        candid::encode_one(config).unwrap(),
    )
    .unwrap()
}

fn pause_autonomous(pic: &PocketIc, id: Principal) -> Status {
    update_result(
        pic,
        id,
        controller(),
        "pause_autonomous",
        encode_args(()).unwrap(),
    )
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

fn capture_new_publications(
    pic: &PocketIc,
    runtime: Principal,
    captured: &mut Vec<(Publication, Vec<Vec<u8>>)>,
) {
    let publication: Publication = decode(&observation(pic, runtime).publication).unwrap();
    let Some(segment) = publication.head.segment_id.as_ref() else {
        return;
    };
    let segment: usize = segment.0.to_string().parse().unwrap();
    for expected in captured.len()..=segment {
        let publication_bytes = retained_publication(pic, runtime, expected as u64).unwrap();
        let publication: Publication = decode(&publication_bytes).unwrap();
        let actual: usize = publication
            .head
            .segment_id
            .as_ref()
            .unwrap()
            .0
            .to_string()
            .parse()
            .unwrap();
        assert_eq!(actual, expected, "published segment sequence");
        let publication_hash = dtr_wire::hash(&publication_bytes);
        let artifacts = publication
            .artifacts
            .iter()
            .enumerate()
            .map(|(kind, descriptor)| {
                let mut bytes = Vec::with_capacity(descriptor.length);
                for index in 0..descriptor.chunks.len() {
                    bytes.extend(
                        retained_chunk(
                            pic,
                            runtime,
                            expected as u64,
                            &publication_hash,
                            kind as u8,
                            index as u16,
                        )
                        .unwrap(),
                    );
                }
                bytes.truncate(descriptor.length);
                assert_eq!(dtr_wire::hash(&bytes), descriptor.sha256);
                bytes
            })
            .collect();
        captured.push((publication, artifacts));
    }
}

fn drive_to_segment(
    pic: &PocketIc,
    runtime: Principal,
    target: u64,
    captured: &mut Vec<(Publication, Vec<Vec<u8>>)>,
    pending_high_water: &mut u32,
) -> Status {
    let deadline = Instant::now() + Duration::from_secs(120);
    while Instant::now() < deadline {
        let before = captured.len();
        // Keep this live-gateway test on elapsed host time. Advancing the
        // disposable instance clock faster than the browser clock would make
        // otherwise genuine certificates appear to come from the future.
        std::thread::sleep(Duration::from_millis(100));
        pic.tick();
        let current = status(pic, runtime, Principal::anonymous()).unwrap();
        *pending_high_water =
            (*pending_high_water).max(controller_work(pic, runtime).unwrap().pending_inputs);
        if current.run.completed_segments as usize > before {
            capture_new_publications(pic, runtime, captured);
            assert_eq!(current.run.completed_segments as usize, captured.len());
        }
        if current.run.completed_segments > target {
            return current;
        }
    }
    panic!("autonomous runtime did not reach segment {target}")
}

fn wait_for_marker(directory: &Path, name: &str) -> String {
    let path = directory.join(name);
    let failed = directory.join("browser-failed");
    let deadline = Instant::now() + Duration::from_secs(45);
    while Instant::now() < deadline {
        if failed.is_file() {
            panic!(
                "live browser failed: {}",
                std::fs::read_to_string(failed).unwrap()
            );
        }
        if path.is_file() {
            return std::fs::read_to_string(path).unwrap().trim().to_string();
        }
        std::thread::sleep(Duration::from_millis(50));
    }
    panic!("timed out waiting for live browser marker {name}")
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
    for method in [
        "test_trap_after_root_write",
        "test_fill_scan_backpressure",
        "test_arm_scan_fault",
        "test_source_anchor",
        "test_scan_state",
        "test_stale_scan_completion_fence",
    ] {
        assert!(
            pic.update_call(id, controller(), method, encode_args(()).unwrap())
                .is_err(),
            "normal Wasm must not expose test-only fault hook {method}"
        );
    }
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
    let baseline = baseline_runtime_wasm(&wasm);
    let pic = instance();

    let idle = deploy_synthetic(&pic, &baseline);
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

    let sealed = deploy_synthetic(&pic, &baseline);
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

    let ready = deploy_synthetic(&pic, &baseline);
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
fn fault_ledger_pages_never_skip_the_contiguous_cursor() {
    let wasm = std::fs::read(required_path("DTR_RUNTIME_WASM")).unwrap();
    let pic = instance();

    let short_ledger = create_controlled(&pic);
    let short = FaultQueryResponse {
        chain_length: 4,
        certificate: None,
        blocks: vec![fault_block()],
        first_block_index: 0,
        archived_blocks: vec![],
    };
    install_fixture(
        &pic,
        short_ledger,
        &[("query_blocks", candid::encode_one(short).unwrap())],
        &[],
    );
    let short_runtime = deploy_fault_source(&pic, &wasm, short_ledger);
    let short_status: Status = update_result(
        &pic,
        short_runtime,
        controller(),
        "sync_ledger",
        encode_args(()).unwrap(),
    )
    .unwrap();
    assert_eq!(short_status.source.verified_source_watermark, Some(1));
    assert!(
        short_status.source.hint_pending,
        "short prefix must not jump to tip"
    );

    let gap_ledger = create_controlled(&pic);
    let gap = FaultQueryResponse {
        chain_length: 4,
        certificate: None,
        blocks: vec![fault_block()],
        first_block_index: 1,
        archived_blocks: vec![],
    };
    install_fixture(
        &pic,
        gap_ledger,
        &[("query_blocks", candid::encode_one(gap).unwrap())],
        &[],
    );
    let gap_runtime = deploy_fault_source(&pic, &wasm, gap_ledger);
    let gap_status: Status = update_result(
        &pic,
        gap_runtime,
        controller(),
        "sync_ledger",
        encode_args(()).unwrap(),
    )
    .unwrap();
    assert_eq!(gap_status.source.verified_source_watermark, Some(0));
    assert!(gap_status.source.last_error.unwrap().contains("contiguous"));

    let malformed_ledger = create_controlled(&pic);
    install_fixture(
        &pic,
        malformed_ledger,
        &[("query_blocks", vec![0xde, 0xad])],
        &[],
    );
    let malformed_runtime = deploy_fault_source(&pic, &wasm, malformed_ledger);
    let malformed_status: Status = update_result(
        &pic,
        malformed_runtime,
        controller(),
        "sync_ledger",
        encode_args(()).unwrap(),
    )
    .unwrap();
    assert_eq!(malformed_status.source.verified_source_watermark, Some(0));
    assert!(
        malformed_status
            .source
            .last_error
            .unwrap()
            .contains("decode")
    );

    let rejecting_ledger = create_controlled(&pic);
    install_fixture(&pic, rejecting_ledger, &[], &["query_blocks"]);
    let rejecting_runtime = deploy_fault_source(&pic, &wasm, rejecting_ledger);
    let rejecting_status: Status = update_result(
        &pic,
        rejecting_runtime,
        controller(),
        "sync_ledger",
        encode_args(()).unwrap(),
    )
    .unwrap();
    assert_eq!(rejecting_status.source.verified_source_watermark, Some(0));
    assert!(
        rejecting_status
            .source
            .last_error
            .unwrap()
            .contains("rejected")
    );

    let incomplete_archive = create_controlled(&pic);
    let routed = FaultQueryResponse {
        chain_length: 4,
        certificate: None,
        blocks: vec![],
        first_block_index: 0,
        archived_blocks: vec![FaultArchivedRange {
            start: 0,
            length: 2,
            callback: FaultArchiveCallback(candid::Func {
                principal: incomplete_archive,
                method: "get_blocks".into(),
            }),
        }],
    };
    let empty_archive: FaultArchiveResult = Ok(FaultBlockRange { blocks: vec![] });
    install_fixture(
        &pic,
        incomplete_archive,
        &[
            ("query_blocks", candid::encode_one(routed).unwrap()),
            ("get_blocks", candid::encode_one(empty_archive).unwrap()),
        ],
        &[],
    );
    let archive_runtime = deploy_fault_source(&pic, &wasm, incomplete_archive);
    let archive_status: Status = update_result(
        &pic,
        archive_runtime,
        controller(),
        "sync_ledger",
        encode_args(()).unwrap(),
    )
    .unwrap();
    assert_eq!(archive_status.source.verified_source_watermark, Some(0));
    assert!(archive_status.source.last_error.unwrap().contains("empty"));
}

#[test]
fn post_decode_and_persistence_errors_retain_the_source_position() {
    let wasm = std::fs::read(required_path("DTR_RUNTIME_TEST_WASM")).unwrap();
    let pic = instance();

    let invalid_ledger = create_controlled(&pic);
    let invalid = FaultQueryResponse {
        chain_length: 1,
        certificate: None,
        blocks: vec![FaultBlock {
            parent_hash: Some(vec![0; 32]),
            transaction: FaultTransaction {
                memo: 0,
                icrc1_memo: None,
                operation: Some(FaultOperation::Mint {
                    to: vec![0],
                    amount: FaultTokens { e8s: 1 },
                }),
                created_at_time: FaultTimestamp { timestamp_nanos: 1 },
            },
            timestamp: FaultTimestamp { timestamp_nanos: 1 },
        }],
        first_block_index: 0,
        archived_blocks: vec![],
    };
    install_fixture(
        &pic,
        invalid_ledger,
        &[("query_blocks", candid::encode_one(invalid).unwrap())],
        &[],
    );
    let invalid_runtime = deploy_fault_source(&pic, &wasm, invalid_ledger);
    let invalid_anchor = test_source_anchor(&pic, invalid_runtime);
    for expected_calls in 1..=2 {
        let result: Status = update_result(
            &pic,
            invalid_runtime,
            controller(),
            "sync_ledger",
            encode_args(()).unwrap(),
        )
        .unwrap();
        assert_eq!(result.source.verified_source_watermark, Some(0));
        assert!(!result.source.scan_in_flight);
        assert!(result.source.last_error.unwrap().contains("ledger account"));
        assert_eq!(result.source.ledger_calls, expected_calls);
        assert_eq!(
            controller_work(&pic, invalid_runtime)
                .unwrap()
                .pending_inputs,
            0
        );
        assert_eq!(test_source_anchor(&pic, invalid_runtime), invalid_anchor);
    }

    let capacity_ledger = create_controlled(&pic);
    let page = FaultQueryResponse {
        chain_length: 1,
        certificate: None,
        blocks: vec![fault_block()],
        first_block_index: 0,
        archived_blocks: vec![],
    };
    install_fixture(
        &pic,
        capacity_ledger,
        &[("query_blocks", candid::encode_one(page).unwrap())],
        &[],
    );
    let capacity_runtime = deploy_fault_source(&pic, &wasm, capacity_ledger);
    let capacity_anchor = test_source_anchor(&pic, capacity_runtime);
    update_result::<Status>(
        &pic,
        capacity_runtime,
        controller(),
        "test_arm_scan_fault",
        candid::encode_one(2u8).unwrap(),
    )
    .unwrap();
    let failed: Status = update_result(
        &pic,
        capacity_runtime,
        controller(),
        "sync_ledger",
        encode_args(()).unwrap(),
    )
    .unwrap();
    assert_eq!(failed.source.verified_source_watermark, Some(0));
    assert!(!failed.source.scan_in_flight);
    assert!(
        failed
            .source
            .last_error
            .unwrap()
            .contains("persistence-preparation capacity")
    );
    assert_eq!(
        controller_work(&pic, capacity_runtime)
            .unwrap()
            .pending_inputs,
        0
    );
    assert_eq!(test_source_anchor(&pic, capacity_runtime), capacity_anchor);

    let retried: Status = update_result(
        &pic,
        capacity_runtime,
        controller(),
        "sync_ledger",
        encode_args(()).unwrap(),
    )
    .unwrap();
    assert_eq!(retried.source.verified_source_watermark, Some(1));
    assert!(!retried.source.scan_in_flight);
    assert!(retried.source.last_error.is_none());
    assert_eq!(
        controller_work(&pic, capacity_runtime)
            .unwrap()
            .pending_inputs,
        0
    );
}

#[test]
fn callback_trap_recovers_by_fallback_and_stale_completion_stays_fenced() {
    let wasm = std::fs::read(required_path("DTR_RUNTIME_TEST_WASM")).unwrap();
    let pic = instance();
    let ledger = create_controlled(&pic);
    let page = FaultQueryResponse {
        chain_length: 1,
        certificate: None,
        blocks: vec![fault_block()],
        first_block_index: 0,
        archived_blocks: vec![],
    };
    install_fixture(
        &pic,
        ledger,
        &[("query_blocks", candid::encode_one(page).unwrap())],
        &[],
    );
    let runtime = deploy_fault_source_with_fallback(&pic, &wasm, ledger, 60);
    let publication_before = observation(&pic, runtime).publication;
    update_result::<Status>(
        &pic,
        runtime,
        controller(),
        "test_arm_scan_fault",
        candid::encode_one(1u8).unwrap(),
    )
    .unwrap();
    assert!(
        pic.update_call(
            runtime,
            controller(),
            "sync_ledger",
            encode_args(()).unwrap()
        )
        .is_err(),
        "post-response test hook must trap the callback"
    );
    let stranded = status(&pic, runtime, Principal::anonymous()).unwrap();
    assert_eq!(stranded.source.verified_source_watermark, Some(0));
    assert!(stranded.source.scan_in_flight);

    pic.advance_time(Duration::from_secs(61));
    let mut recovered = stranded;
    for _ in 0..24 {
        pic.tick();
        recovered = status(&pic, runtime, Principal::anonymous()).unwrap();
        if recovered.source.verified_source_watermark == Some(1) && !recovered.source.scan_in_flight
        {
            break;
        }
    }
    assert_eq!(recovered.source.verified_source_watermark, Some(1));
    assert!(!recovered.source.scan_in_flight);
    assert!(recovered.source.last_error.is_none());
    assert_eq!(observation(&pic, runtime).publication, publication_before);

    let replacement: Status = update_result(
        &pic,
        runtime,
        controller(),
        "test_stale_scan_completion_fence",
        encode_args(()).unwrap(),
    )
    .unwrap();
    assert_eq!(replacement.source.verified_source_watermark, Some(1));
    assert!(
        replacement.source.scan_in_flight,
        "stale completion must not clear the replacement operation"
    );
    let still_replacement: Status = update_result(
        &pic,
        runtime,
        controller(),
        "sync_ledger",
        encode_args(()).unwrap(),
    )
    .unwrap();
    assert_eq!(still_replacement.source.verified_source_watermark, Some(1));
    assert!(still_replacement.source.scan_in_flight);
}

#[test]
fn delayed_ledger_archive_handoff_refreshes_only_the_matching_lease() {
    let wasm = std::fs::read(required_path("DTR_RUNTIME_TEST_WASM")).unwrap();
    let pic = instance();
    pic.set_time(SystemTime::now().into());
    let owner = controller();
    let ledger = pic.create_canister_on_subnet(
        Some(owner),
        Some(CanisterSettings {
            controllers: Some(vec![owner]),
            ..Default::default()
        }),
        pic.topology().get_nns().unwrap(),
    );
    let runtime = create_controlled(&pic);
    let recipient = AccountIdentifier::new(&runtime, &DEFAULT_SUBACCOUNT);
    let payer = AccountIdentifier::new(
        &Principal::self_authenticating([54; 32]),
        &DEFAULT_SUBACCOUNT,
    );
    let routed = FaultQueryResponse {
        chain_length: 1,
        certificate: None,
        blocks: vec![],
        first_block_index: 0,
        archived_blocks: vec![FaultArchivedRange {
            start: 0,
            length: 1,
            callback: FaultArchiveCallback(candid::Func {
                principal: ledger,
                method: "get_blocks".into(),
            }),
        }],
    };
    let archived: FaultArchiveResult = Ok(FaultBlockRange {
        blocks: vec![fault_payment(payer, recipient)],
    });
    install_fixture(
        &pic,
        ledger,
        &[
            ("query_blocks", candid::encode_one(routed).unwrap()),
            ("get_blocks", candid::encode_one(archived).unwrap()),
        ],
        &[],
    );
    let init = encode_args((
        initial_world(),
        "00".repeat(32),
        0u64,
        0u64,
        Some(LedgerConfig {
            network: "pocketic-local".into(),
            ledger,
            recipient_account: recipient.as_bytes().to_vec(),
            page_limit: 1,
            fallback_seconds: 3600,
            hint_principal: None,
        }),
    ))
    .unwrap();
    pic.install_canister(runtime, wasm, init, Some(controller()));
    let message = pic
        .submit_call(
            runtime,
            controller(),
            "sync_ledger",
            encode_args(()).unwrap(),
        )
        .unwrap();
    let mut initial = test_scan_state(&pic, runtime);
    for _ in 0..12 {
        if initial.started_at_seconds > 0 {
            break;
        }
        pic.tick();
        initial = test_scan_state(&pic, runtime);
    }
    assert_eq!(initial.cursor, 0);
    assert!(initial.started_at_seconds > 0);
    pic.advance_time(Duration::from_secs(29));
    let mut refreshed = None;
    for _ in 0..12 {
        pic.tick();
        let state = test_scan_state(&pic, runtime);
        if state.cursor == 0 && state.started_at_seconds > initial.started_at_seconds {
            refreshed = Some(state);
            break;
        }
    }
    let refreshed =
        refreshed.expect("ledger callback must refresh the fenced lease before archive await");
    assert_eq!(refreshed.nonce, initial.nonce);
    assert!(!refreshed.expired);

    // Total wall-clock age now exceeds the old 45-second whole-scan lease, but
    // the second bounded call still owns its refreshed matching operation.
    pic.advance_time(Duration::from_secs(17));
    let legitimate = test_scan_state(&pic, runtime);
    assert_eq!(legitimate.nonce, initial.nonce);
    assert!(!legitimate.expired);
    pic.advance_time(Duration::from_secs(12));
    for _ in 0..20 {
        pic.tick();
        if pic.ingress_status(message.clone()).is_some() {
            break;
        }
    }
    let reply = pic
        .ingress_status(message)
        .expect("delayed two-call scan must finish")
        .unwrap();
    let result = decode_one::<Result<Status, String>>(&reply)
        .unwrap()
        .unwrap();
    assert_eq!(result.source.verified_source_watermark, Some(1));
    assert_eq!(result.source.ledger_calls, 1);
    assert_eq!(result.source.archive_calls, 1);
    assert!(!result.source.scan_in_flight);
    assert_eq!(controller_work(&pic, runtime).unwrap().pending_inputs, 1);
}

#[test]
fn scan_backpressure_is_retryable_without_upgrade_or_manual_reset() {
    let wasm = std::fs::read(required_path("DTR_RUNTIME_TEST_WASM")).unwrap();
    let pic = instance();
    let ledger = create_controlled(&pic);
    let runtime = create_controlled(&pic);
    let recipient = AccountIdentifier::new(&runtime, &DEFAULT_SUBACCOUNT);
    let payer = AccountIdentifier::new(
        &Principal::self_authenticating([55; 32]),
        &DEFAULT_SUBACCOUNT,
    );
    let response = FaultQueryResponse {
        chain_length: 4097,
        certificate: None,
        blocks: vec![fault_payment(payer, recipient)],
        first_block_index: 4096,
        archived_blocks: vec![],
    };
    install_fixture(
        &pic,
        ledger,
        &[("query_blocks", candid::encode_one(response).unwrap())],
        &[],
    );
    let init = encode_args((
        initial_world(),
        "00".repeat(32),
        0u64,
        0u64,
        Some(LedgerConfig {
            network: "pocketic-local".into(),
            ledger,
            recipient_account: recipient.as_bytes().to_vec(),
            page_limit: 4,
            fallback_seconds: 3600,
            hint_principal: None,
        }),
    ))
    .unwrap();
    pic.install_canister(runtime, wasm, init, Some(controller()));
    let filled: Status = update_result(
        &pic,
        runtime,
        controller(),
        "test_fill_scan_backpressure",
        encode_args(()).unwrap(),
    )
    .unwrap();
    assert_eq!(filled.source.verified_source_watermark, Some(4096));
    assert_eq!(controller_work(&pic, runtime).unwrap().pending_inputs, 4096);
    let anchor_before = test_source_anchor(&pic, runtime);
    let publication_before = observation(&pic, runtime).publication;

    let blocked = update_result::<Status>(
        &pic,
        runtime,
        controller(),
        "sync_ledger",
        encode_args(()).unwrap(),
    );
    if let Err(error) = &blocked {
        let stranded = status(&pic, runtime, Principal::anonymous()).unwrap();
        eprintln!(
            "POST_AWAIT_ERROR={error}; SCAN_IN_FLIGHT={}; CURSOR={:?}; PENDING={}",
            stranded.source.scan_in_flight,
            stranded.source.verified_source_watermark,
            controller_work(&pic, runtime).unwrap().pending_inputs,
        );
    }
    let blocked =
        blocked.expect("backpressure must be reported durably instead of stranding the scan");
    assert_eq!(blocked.source.verified_source_watermark, Some(4096));
    assert!(!blocked.source.scan_in_flight);
    assert!(blocked.source.last_error.unwrap().contains("backpressure"));
    assert_eq!(controller_work(&pic, runtime).unwrap().pending_inputs, 4096);
    assert_eq!(test_source_anchor(&pic, runtime), anchor_before);
    assert_eq!(observation(&pic, runtime).publication, publication_before);

    let mut work = controller_work(&pic, runtime).unwrap();
    assert_eq!(work.phase.as_deref(), Some("running"));
    for _ in 0..256 {
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
    let ready = work.ready_manifest.clone().unwrap();
    apply(
        &pic,
        runtime,
        work.revision,
        Action::Publish {
            manifest_hash: ready,
        },
    )
    .unwrap();
    assert_eq!(controller_work(&pic, runtime).unwrap().pending_inputs, 4095);

    let recovered: Status = update_result(
        &pic,
        runtime,
        controller(),
        "sync_ledger",
        encode_args(()).unwrap(),
    )
    .unwrap();
    assert_eq!(recovered.source.verified_source_watermark, Some(4097));
    assert_eq!(controller_work(&pic, runtime).unwrap().pending_inputs, 4096);

    let tip = FaultQueryResponse {
        chain_length: 4097,
        certificate: None,
        blocks: vec![],
        first_block_index: 4097,
        archived_blocks: vec![],
    };
    pic.upgrade_canister(
        ledger,
        fixture_wasm(&[("query_blocks", candid::encode_one(tip).unwrap())], &[]),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    let at_tip: Status = update_result(
        &pic,
        runtime,
        controller(),
        "sync_ledger",
        encode_args(()).unwrap(),
    )
    .unwrap();
    assert_eq!(at_tip.source.verified_source_watermark, Some(4097));
    assert_eq!(controller_work(&pic, runtime).unwrap().pending_inputs, 4096);
}

#[test]
fn autonomous_progression_is_single_bounded_upgrade_safe_and_retained() {
    let wasm = std::fs::read(required_path("DTR_RUNTIME_WASM")).unwrap();
    let baseline = baseline_runtime_wasm(&wasm);
    let pic = instance();
    let runtime = deploy_synthetic(&pic, &baseline);
    let payer = Principal::self_authenticating([61; 32]);
    let payment = normalized(
        AccountIdentifier::new(&payer, &DEFAULT_SUBACCOUNT),
        1_000_000_000,
        *b"BTZ\x11\0\0\x40\0",
    );
    apply(
        &pic,
        runtime,
        0,
        Action::Ingest {
            start: Int(0u64.into()),
            records: vec![Some(payment)],
            anchor: "12".repeat(32),
        },
    )
    .unwrap();

    let config = RunConfig {
        segment_ticks: 2,
        pacing_seconds: 1,
        work_budget: 100_000,
    };
    let started = start_autonomous(&pic, runtime, config.clone());
    assert!(started.run.running);
    let duplicate = start_autonomous(&pic, runtime, config.clone());
    assert_eq!(duplicate.run.generation, started.run.generation);
    assert!(
        apply(
            &pic,
            runtime,
            duplicate.revision,
            Action::Seal {
                logical_end: Int(2u64.into())
            }
        )
        .unwrap_err()
        .contains("autonomous execution is active")
    );

    let mut publications = Vec::<Publication>::new();
    let mut seen = 0u64;
    let mut upgraded = false;
    let mut paused_once = false;
    for _ in 0..240 {
        pic.advance_time(Duration::from_secs(1));
        for _ in 0..5 {
            pic.tick();
        }
        let current = status(&pic, runtime, Principal::anonymous()).unwrap();
        if current.run.completed_segments > seen {
            assert_eq!(current.run.completed_segments, seen + 1);
            let publication: Publication = decode(&observation(&pic, runtime).publication).unwrap();
            assert_eq!(
                publication.head.segment_id.as_ref().unwrap().0.to_string(),
                seen.to_string()
            );
            publications.push(publication);
            seen += 1;
        }
        if seen == 3
            && controller_work(&pic, runtime).unwrap().phase.as_deref() == Some("running")
            && !upgraded
        {
            let before = current.run.generation;
            pic.upgrade_canister(
                runtime,
                wasm.clone(),
                encode_args(()).unwrap(),
                Some(controller()),
            )
            .unwrap();
            let after = status(&pic, runtime, Principal::anonymous()).unwrap();
            assert!(after.run.running);
            assert_eq!(after.run.generation, before + 1);
            upgraded = true;
        }
        if seen == 5 && !paused_once {
            let paused = pause_autonomous(&pic, runtime);
            assert!(!paused.run.running);
            let paused_publication = paused.publication_hash.clone();
            pic.advance_time(Duration::from_secs(8));
            for _ in 0..8 {
                pic.tick();
            }
            let still = status(&pic, runtime, Principal::anonymous()).unwrap();
            assert_eq!(still.run.completed_segments, 5);
            assert_eq!(still.publication_hash, paused_publication);
            let resumed = start_autonomous(&pic, runtime, config.clone());
            assert!(resumed.run.running);
            assert!(resumed.run.generation > paused.run.generation);
            paused_once = true;
        }
        if seen >= 10 {
            break;
        }
    }
    assert!(upgraded);
    assert!(paused_once);
    assert_eq!(
        seen, 10,
        "one start/resume path must publish ten consecutive segments"
    );
    for (index, publication) in publications.iter().enumerate() {
        let seal = publication.head.seal.as_ref().unwrap();
        assert_eq!(seal.segment_id.0.to_string(), index.to_string());
        assert_eq!(
            seal.logical_start.0.to_string(),
            (index as u64 * 2).to_string()
        );
        assert_eq!(
            seal.logical_end.0.to_string(),
            ((index as u64 + 1) * 2).to_string()
        );
        if index == 0 {
            assert_eq!(seal.input_count, 1);
            assert_eq!(seal.source_from.0.to_string(), "0");
            assert_eq!(seal.source_to_exclusive.0.to_string(), "1");
        } else {
            assert_eq!(seal.input_count, 0);
            assert_eq!(seal.source_from.0.to_string(), "1");
            assert_eq!(seal.source_to_exclusive.0.to_string(), "1");
        }
    }
    let latest_artifacts = artifacts(&pic, runtime, publications.last().unwrap());
    let world: Value = serde_json::from_slice(&latest_artifacts[0]).unwrap();
    assert_eq!(world["cannons"].as_array().unwrap().len(), 1);
    assert_eq!(world["balls"].as_array().unwrap().len(), 1);
    assert_ne!(
        publications[1].head.state_hash,
        publications[2].head.state_hash
    );

    let retained = retention_status(&pic, runtime);
    assert_eq!(retained.max_segments, 3);
    assert_eq!(retained.max_bytes, 8 * 1024 * 1024);
    assert_eq!(retained.entries.len(), 3);
    assert_eq!(
        retained
            .entries
            .iter()
            .map(|entry| entry.segment_id)
            .collect::<Vec<_>>(),
        vec![7, 8, 9]
    );
    assert!(retained.entries.last().unwrap().current);
    assert!(retained.retained_bytes > 0);
    let segment_eight = retained_publication(&pic, runtime, 8).unwrap();
    let segment_eight_hash = dtr_wire::hash(&segment_eight);
    let segment_eight_chunk = retained_chunk(&pic, runtime, 8, &segment_eight_hash, 0, 0).unwrap();
    assert!(
        retained_publication(&pic, runtime, 6)
            .unwrap_err()
            .contains("snapshot resync required")
    );

    for _ in 0..40 {
        pic.advance_time(Duration::from_secs(1));
        for _ in 0..5 {
            pic.tick();
        }
        if status(&pic, runtime, Principal::anonymous())
            .unwrap()
            .run
            .completed_segments
            >= 11
        {
            break;
        }
    }
    assert_eq!(
        retained_publication(&pic, runtime, 8).unwrap(),
        segment_eight
    );
    assert_eq!(
        retained_chunk(&pic, runtime, 8, &segment_eight_hash, 0, 0).unwrap(),
        segment_eight_chunk
    );
    let final_status = pause_autonomous(&pic, runtime);
    assert_eq!(final_status.run.completed_segments, 11);
    assert!(final_status.run.callback_count >= 33);
    assert!(final_status.run.total_work > 0);
    assert!(final_status.run.max_segment_work > 0);
    assert!(final_status.run.last_error.is_none());
}

#[test]
#[ignore = "requires the S10 live browser orchestrator"]
fn live_autonomous_ledger_browser_reconnect_upgrade_and_replay() {
    let runtime_wasm = std::fs::read(required_path("DTR_RUNTIME_WASM")).unwrap();
    let baseline_wasm = baseline_runtime_wasm(&runtime_wasm);
    let ledger_wasm = std::fs::read(required_path("DTR_LEDGER_WASM")).unwrap();
    let live_directory =
        PathBuf::from(std::env::var_os("DTR_S10_LIVE_DIR").expect("DTR_S10_LIVE_DIR is required"));
    let coordination = live_directory.join("coordination");
    std::fs::create_dir_all(&coordination).unwrap();
    let mut pic = instance();
    let runtime = create_controlled(&pic);
    let payers = [
        Principal::self_authenticating([71; 32]),
        Principal::self_authenticating([72; 32]),
    ];
    let ledger = deploy_ledger(&pic, &ledger_wasm, &payers);
    let recipient = AccountIdentifier::new(&runtime, &DEFAULT_SUBACCOUNT);
    let irrelevant = AccountIdentifier::new(
        &Principal::self_authenticating([73; 32]),
        &DEFAULT_SUBACCOUNT,
    );
    let first_memo = *b"BTZ\x11\0\0\x20\0";
    let second_memo = *b"BTZ\x11\0\0\x80\0";
    let third_memo = *b"BTZ\x11\0\0\xc0\0";
    let under_memo = *b"BTZ\x11\0\0\x10\0";
    let malformed_memo = [0; 8];
    let mut source_records = BTreeMap::<u64, String>::new();
    let first = transfer(
        &pic,
        ledger,
        payers[0],
        recipient,
        1_000_000_000,
        first_memo,
    );
    source_records.insert(
        first,
        normalized(
            AccountIdentifier::new(&payers[0], &DEFAULT_SUBACCOUNT),
            1_000_000_000,
            first_memo,
        ),
    );
    let under = transfer(&pic, ledger, payers[1], recipient, 1, under_memo);
    source_records.insert(
        under,
        normalized(
            AccountIdentifier::new(&payers[1], &DEFAULT_SUBACCOUNT),
            1,
            under_memo,
        ),
    );
    let malformed = transfer(
        &pic,
        ledger,
        payers[0],
        recipient,
        1_000_000_000,
        malformed_memo,
    );
    source_records.insert(
        malformed,
        normalized(
            AccountIdentifier::new(&payers[0], &DEFAULT_SUBACCOUNT),
            1_000_000_000,
            malformed_memo,
        ),
    );
    transfer(
        &pic,
        ledger,
        payers[1],
        irrelevant,
        1_000_000_000,
        first_memo,
    );
    for _ in 0..20 {
        pic.tick();
    }

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
            fallback_seconds: 2,
            hint_principal: None,
        }),
    ))
    .unwrap();
    pic.install_canister(runtime, baseline_wasm, init, Some(controller()));
    let config = RunConfig {
        segment_ticks: 2,
        pacing_seconds: 1,
        work_budget: 100_000,
    };
    let root_key = pic.root_key().expect("NNS root key");
    let gateway = pic.make_live(None);
    let config_directory = live_directory.join("config");
    std::fs::create_dir_all(&config_directory).unwrap();
    std::fs::write(config_directory.join("root-key.der"), &root_key).unwrap();
    std::fs::write(
        config_directory.join("metadata.json"),
        serde_json::to_vec_pretty(&serde_json::json!({
            "version":1,
            "trust":"live-local-ic-certificate",
            "network":"pocketic-local",
            "canister_id":runtime.to_text(),
            "root_key_sha256":dtr_wire::hash(&root_key),
            "tick_seconds":0.25,
            "retained_segments":3,
            "retained_bytes":8*1024*1024,
        }))
        .unwrap(),
    )
    .unwrap();
    std::fs::write(
        live_directory.join("ready.json"),
        serde_json::to_vec_pretty(&serde_json::json!({
            "gateway":gateway.as_str(),
            "canister_id":runtime.to_text(),
            "config":config_directory,
            "root_key_sha256":dtr_wire::hash(&root_key),
        }))
        .unwrap(),
    )
    .unwrap();
    wait_for_marker(&coordination, "browser-connected");

    // Start only after the browser has authenticated the genesis head. Every
    // publication observed below is therefore new data from the still-running
    // instance rather than a head produced during browser startup.
    let started = start_autonomous(&pic, runtime, config.clone());
    assert!(started.run.running);
    assert_eq!(
        start_autonomous(&pic, runtime, config.clone())
            .run
            .generation,
        started.run.generation
    );

    // Execute the independently scheduled scan before the first logical seal.
    for _ in 0..24 {
        pic.tick();
    }
    let mut captured = Vec::<(Publication, Vec<Vec<u8>>)>::new();
    let mut pending_high_water = controller_work(&pic, runtime).unwrap().pending_inputs;
    drive_to_segment(&pic, runtime, 1, &mut captured, &mut pending_high_water);

    // A valid payment arrives after publication has begun. Repeated hints carry
    // no payload authority and must not duplicate the eventual command.
    let second = transfer(
        &pic,
        ledger,
        payers[1],
        recipient,
        1_000_000_000,
        second_memo,
    );
    source_records.insert(
        second,
        normalized(
            AccountIdentifier::new(&payers[1], &DEFAULT_SUBACCOUNT),
            1_000_000_000,
            second_memo,
        ),
    );
    for _ in 0..2 {
        update_result::<Status>(
            &pic,
            runtime,
            controller(),
            "ledger_hint",
            encode_args(()).unwrap(),
        )
        .unwrap();
    }

    wait_for_marker(&coordination, "short-paused");
    drive_to_segment(&pic, runtime, 3, &mut captured, &mut pending_high_water);
    std::fs::write(coordination.join("harness-short-ready"), "3\n").unwrap();

    wait_for_marker(&coordination, "long-paused");
    // This valid record deliberately receives no hint. The two-second fallback
    // must discover it while autonomous empty-input segments continue.
    let third = transfer(
        &pic,
        ledger,
        payers[0],
        recipient,
        1_000_000_000,
        third_memo,
    );
    source_records.insert(
        third,
        normalized(
            AccountIdentifier::new(&payers[0], &DEFAULT_SUBACCOUNT),
            1_000_000_000,
            third_memo,
        ),
    );
    drive_to_segment(&pic, runtime, 8, &mut captured, &mut pending_high_water);
    std::fs::write(coordination.join("harness-long-ready"), "8\n").unwrap();

    // Upgrade with an unfinished stage. The restored timer receives a new
    // generation; pause/resume must not erase or duplicate the staged segment.
    let running_deadline = Instant::now() + Duration::from_secs(30);
    while Instant::now() < running_deadline {
        std::thread::sleep(Duration::from_millis(100));
        pic.tick();
        if controller_work(&pic, runtime).unwrap().phase.as_deref() == Some("running") {
            break;
        }
    }
    assert_eq!(
        controller_work(&pic, runtime).unwrap().phase.as_deref(),
        Some("running")
    );
    let generation = status(&pic, runtime, Principal::anonymous())
        .unwrap()
        .run
        .generation;
    pic.upgrade_canister(
        runtime,
        runtime_wasm,
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    let recovered = status(&pic, runtime, Principal::anonymous()).unwrap();
    assert!(recovered.run.running);
    assert_eq!(recovered.run.generation, generation + 1);
    let duplicate = start_autonomous(&pic, runtime, config.clone());
    assert_eq!(duplicate.run.generation, recovered.run.generation);
    let paused = pause_autonomous(&pic, runtime);
    let paused_hash = paused.publication_hash.clone();
    for _ in 0..20 {
        std::thread::sleep(Duration::from_millis(100));
        pic.tick();
    }
    assert_eq!(
        status(&pic, runtime, Principal::anonymous())
            .unwrap()
            .publication_hash,
        paused_hash
    );
    start_autonomous(&pic, runtime, config);
    drive_to_segment(&pic, runtime, 10, &mut captured, &mut pending_high_water);
    let final_status = pause_autonomous(&pic, runtime);
    std::fs::write(coordination.join("harness-final-ready"), "10\n").unwrap();
    wait_for_marker(&coordination, "browser-complete");
    assert_eq!(final_status.run.completed_segments, 11);
    assert_eq!(captured.len(), 11);
    assert!(final_status.source.archive_calls > 0);
    assert!(!final_status.source.scan_in_flight);
    assert!(final_status.source.verified_source_watermark.unwrap() > third);
    assert_eq!(retention_status(&pic, runtime).entries.len(), 3);

    let mut receipt_positions = Vec::<u64>::new();
    for (_, artifacts) in &captured {
        let events: Value = serde_json::from_slice(&artifacts[1]).unwrap();
        receipt_positions.extend(
            events["receipts"]
                .as_array()
                .unwrap()
                .iter()
                .map(|receipt| {
                    receipt["position"]["$integer"]
                        .as_str()
                        .unwrap()
                        .parse::<u64>()
                        .unwrap()
                }),
        );
    }
    for position in [first, under, malformed, second, third] {
        assert_eq!(
            receipt_positions
                .iter()
                .filter(|value| **value == position)
                .count(),
            1,
            "source record {position} must be applied exactly once"
        );
    }

    let mut native = Coordinator::create(
        &initial_world(),
        captured[0].0.identity.clone(),
        0,
        0,
        "00".repeat(32),
        BtzHostKernel,
    )
    .unwrap();
    let mut source_cursor = 0u64;
    for (publication, expected_artifacts) in &captured {
        let seal = publication.head.seal.as_ref().unwrap();
        let source_to: u64 = seal.source_to_exclusive.0.to_string().parse().unwrap();
        if source_to > source_cursor {
            let records = (source_cursor..source_to)
                .map(|position| source_records.get(&position).cloned())
                .collect();
            native
                .apply(Action::Ingest {
                    start: Int(source_cursor.into()),
                    records,
                    anchor: seal.source_anchor.clone(),
                })
                .unwrap();
            source_cursor = source_to;
        }
        native
            .apply(Action::Seal {
                logical_end: seal.logical_end.clone(),
            })
            .unwrap();
        while native.record.journal.stage.as_ref().unwrap().phase == "running" {
            native.apply(Action::Step { budget: 100_000 }).unwrap();
        }
        let ready = native
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
                manifest_hash: ready,
            })
            .unwrap();
        assert_eq!(
            native_publication(&native.record).unwrap().artifacts,
            *expected_artifacts
        );
    }
    let assignment = |position: u64| {
        captured
            .iter()
            .position(|(publication, _)| {
                let seal = publication.head.seal.as_ref().unwrap();
                let from: u64 = seal.source_from.0.to_string().parse().unwrap();
                let to: u64 = seal.source_to_exclusive.0.to_string().parse().unwrap();
                position >= from && position < to
            })
            .unwrap()
    };
    let event_bytes = captured
        .iter()
        .map(|(_, artifacts)| artifacts[1].len())
        .collect::<Vec<_>>();
    let publication_bytes = captured
        .iter()
        .map(|(publication, artifacts)| {
            encode(publication).unwrap().len() + artifacts.iter().map(Vec::len).sum::<usize>()
        })
        .collect::<Vec<_>>();
    let final_world: Value = serde_json::from_slice(&captured.last().unwrap().1[0]).unwrap();
    println!(
        "S10_HEADS=0..10 INPUT_ASSIGNMENTS=first:{} second:{} dropped_hint:{} LEDGER_CALLS={} ARCHIVE_CALLS={} RETAINED={} RETAINED_BYTES={} EVENT_BYTES_MIN={} EVENT_BYTES_MAX={} EVENT_BYTES_TOTAL={} PUBLICATION_BYTES_MIN={} PUBLICATION_BYTES_MAX={} PUBLICATION_BYTES_TOTAL={} INBOX_HIGH_WATER={} ACTIVE_BALLS={} ACTIVE_CANNONS={} WORK_TOTAL={} WORK_MAX={} ROOT_SHA256={} CANISTER={}",
        assignment(first),
        assignment(second),
        assignment(third),
        final_status.source.ledger_calls,
        final_status.source.archive_calls,
        retention_status(&pic, runtime).entries.len(),
        retention_status(&pic, runtime).retained_bytes,
        event_bytes.iter().min().unwrap(),
        event_bytes.iter().max().unwrap(),
        event_bytes.iter().sum::<usize>(),
        publication_bytes.iter().min().unwrap(),
        publication_bytes.iter().max().unwrap(),
        publication_bytes.iter().sum::<usize>(),
        pending_high_water,
        final_world["balls"].as_array().unwrap().len(),
        final_world["cannons"].as_array().unwrap().len(),
        final_status.run.total_work,
        final_status.run.max_segment_work,
        dtr_wire::hash(&root_key),
        runtime,
    );
    pic.stop_live();
}

#[test]
fn upstream_ledger_archive_to_recovered_publication_matches_native() {
    let runtime_wasm = std::fs::read(required_path("DTR_RUNTIME_WASM")).unwrap();
    let baseline_wasm = baseline_runtime_wasm(&runtime_wasm);
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
    pic.install_canister(runtime, baseline_wasm, init, Some(controller()));

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

    let published_before_upgrade = observation(&pic, runtime);
    pic.upgrade_canister(
        runtime,
        runtime_wasm.clone(),
        encode_args(()).unwrap(),
        Some(controller()),
    )
    .unwrap();
    assert_eq!(
        observation(&pic, runtime).publication,
        published_before_upgrade.publication
    );
    let after_published_upgrade = status(&pic, runtime, Principal::anonymous()).unwrap();
    assert_eq!(
        after_published_upgrade.source.verified_source_watermark,
        Some(watermark)
    );
    assert_eq!(
        after_published_upgrade.publication_hash,
        committed_status.publication_hash
    );

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

#[test]
#[ignore = "S12 extended autonomous operating-envelope trace"]
fn s12_autonomous_fifty_segment_trace() {
    let wasm = std::fs::read(required_path("DTR_RUNTIME_WASM")).unwrap();
    let pic = instance();
    let runtime = deploy_synthetic_world(&pic, &wasm, s12_world("ball-dense-medium"));
    let payer = Principal::self_authenticating([61; 32]);
    let payment = normalized(
        AccountIdentifier::new(&payer, &DEFAULT_SUBACCOUNT),
        1_000_000_000,
        *b"BTZ\x11\0\0\x40\0",
    );
    apply(
        &pic,
        runtime,
        0,
        Action::Ingest {
            start: Int(0u64.into()),
            records: vec![Some(payment)],
            anchor: "12".repeat(32),
        },
    )
    .unwrap();

    let target_segments = 50u64;
    let target_cadence_seconds = 20u64;
    let work_budget = 512u32;
    let initial_stable_bytes = pic.get_stable_memory(runtime).len();
    let started = start_autonomous(
        &pic,
        runtime,
        RunConfig {
            segment_ticks: 2,
            pacing_seconds: 1,
            work_budget,
        },
    );
    assert!(started.run.running);

    let host_started = Instant::now();
    let mut virtual_seconds = 0u64;
    let mut previous_completed = 0u64;
    let mut previous_callbacks = started.run.callback_count;
    let mut previous_total_work = started.run.total_work;
    let mut ready_at = None::<u64>;
    let mut maximum_callback_work = 0u64;
    let mut publication_hashes = BTreeSet::new();
    let mut stable_samples = vec![serde_json::json!({
        "completed_segments": 0,
        "stable_bytes": initial_stable_bytes,
    })];
    let mut segments = Vec::new();

    for _ in 0..20_000 {
        virtual_seconds += 1;
        pic.advance_time(Duration::from_secs(1));
        pic.tick();
        let current = status(&pic, runtime, Principal::anonymous()).unwrap();
        let callback_work = current.run.total_work - previous_total_work;
        maximum_callback_work = maximum_callback_work.max(callback_work);
        assert!(callback_work <= u64::from(work_budget));
        previous_total_work = current.run.total_work;
        let work = controller_work(&pic, runtime).unwrap();
        if work.phase.as_deref() == Some("ready") && ready_at.is_none() {
            ready_at = Some(virtual_seconds);
        }
        if current.run.completed_segments > previous_completed {
            assert_eq!(current.run.completed_segments, previous_completed + 1);
            let bytes = observation(&pic, runtime).publication;
            let publication: Publication = decode(&bytes).unwrap();
            let segment_id: u64 = publication
                .head
                .segment_id
                .as_ref()
                .unwrap()
                .0
                .to_string()
                .parse()
                .unwrap();
            assert_eq!(segment_id + 1, current.run.completed_segments);
            let seal = publication.head.seal.as_ref().unwrap();
            let logical_start: u64 = seal.logical_start.0.to_string().parse().unwrap();
            let logical_end: u64 = seal.logical_end.0.to_string().parse().unwrap();
            assert_eq!(logical_start, segment_id * 2);
            assert_eq!(logical_end, logical_start + 2);
            if segment_id == 0 {
                assert_eq!(seal.input_count, 1);
                assert_eq!(seal.source_from.0.to_string(), "0");
                assert_eq!(seal.source_to_exclusive.0.to_string(), "1");
            } else {
                assert_eq!(seal.input_count, 0);
                assert_eq!(seal.source_from.0.to_string(), "1");
                assert_eq!(seal.source_to_exclusive.0.to_string(), "1");
            }
            assert!(publication_hashes.insert(current.publication_hash.clone()));
            let retention = retention_status(&pic, runtime);
            let lag_seconds = virtual_seconds as i64
                - (current.run.completed_segments * target_cadence_seconds) as i64;
            segments.push(serde_json::json!({
                "segment_id": segment_id,
                "logical_start": logical_start,
                "logical_end": logical_end,
                "ready_virtual_second": ready_at.take(),
                "committed_virtual_second": virtual_seconds,
                "callbacks": current.run.callback_count - previous_callbacks,
                "work_units": current.run.last_segment_work,
                "publication_bytes": bytes.len(),
                "artifact_bytes": publication.artifacts.iter().map(|row| row.length).sum::<usize>(),
                "retained_bytes": retention.retained_bytes,
                "queue": work.pending_inputs,
                "source_cursor": work.source_cursor,
                "lag_against_20_second_cadence": lag_seconds,
                "cadence_status": if lag_seconds <= 0 { "ON_TIME" } else { "BEHIND" },
            }));
            previous_callbacks = current.run.callback_count;
            previous_completed = current.run.completed_segments;
            if current.run.completed_segments % 10 == 0 {
                stable_samples.push(serde_json::json!({
                    "completed_segments": current.run.completed_segments,
                    "stable_bytes": pic.get_stable_memory(runtime).len(),
                }));
            }
            if current.run.completed_segments == target_segments {
                break;
            }
        }
    }
    assert_eq!(previous_completed, target_segments);
    let final_status = pause_autonomous(&pic, runtime);
    assert!(final_status.run.last_error.is_none());
    assert_eq!(publication_hashes.len(), target_segments as usize);
    assert!(maximum_callback_work > 0);
    let trace = serde_json::json!({
        "schema": "btz-s12-autonomous-trace-v1",
        "outcome": "PASS",
        "source": "normal application Wasm on disposable PocketIC",
        "workload": "ball-dense-medium",
        "target_segments": target_segments,
        "target_cadence_seconds": target_cadence_seconds,
        "logical_segment_ticks": 2,
        "pacing_seconds": 1,
        "work_budget": work_budget,
        "host_elapsed_seconds": host_started.elapsed().as_secs_f64(),
        "virtual_elapsed_seconds": virtual_seconds,
        "maximum_work_in_one_callback": maximum_callback_work,
        "final_callback_count": final_status.run.callback_count,
        "final_total_work": final_status.run.total_work,
        "stable_memory_samples": stable_samples,
        "input_assignment": {
            "source_position": 0,
            "discovered_virtual_second": 0,
            "verified_virtual_second": 0,
            "assigned_segment": 0,
            "assigned_at_seal_virtual_second": 1,
            "segments_after_arrival": 0,
            "qualification": "synthetic sealed-input timing, not production ledger latency",
        },
        "segments": segments,
    });
    write_s12_trace("DTR_S12_AUTONOMOUS_TRACE", &trace);
}

fn s12_fault_transfer(
    from: AccountIdentifier,
    to: AccountIdentifier,
    amount: u64,
    memo: [u8; 8],
    timestamp: u64,
) -> FaultBlock {
    FaultBlock {
        parent_hash: Some(vec![(timestamp & 255) as u8; 32]),
        transaction: FaultTransaction {
            memo: u64::from_be_bytes(memo),
            icrc1_memo: None,
            operation: Some(FaultOperation::Transfer {
                from: from.as_bytes().to_vec(),
                to: to.as_bytes().to_vec(),
                amount: FaultTokens { e8s: amount },
                fee: FaultTokens { e8s: 10_000 },
                spender: None,
            }),
            created_at_time: FaultTimestamp {
                timestamp_nanos: timestamp,
            },
        },
        timestamp: FaultTimestamp {
            timestamp_nanos: timestamp,
        },
    }
}

#[test]
#[ignore = "S12 extended controlled ledger throughput trace"]
fn s12_controlled_ledger_backlog_trace() {
    let wasm = std::fs::read(required_path("DTR_RUNTIME_WASM")).unwrap();
    let pic = instance();
    let mut scenario_rows = Vec::new();
    for (name, arrivals_per_service, max_calls, expect_drain) in [
        ("paused-arrivals", 0u64, 8u64, true),
        ("half-page-arrivals", 32u64, 12u64, true),
        ("overload-arrivals", 80u64, 8u64, false),
    ] {
        let ledger = create_controlled(&pic);
        let runtime = deploy_fault_source_with_limits(&pic, &wasm, ledger, 3600, 64);
        let recipient = AccountIdentifier::new(&runtime, &DEFAULT_SUBACCOUNT);
        let other = AccountIdentifier::new(
            &Principal::self_authenticating([91; 32]),
            &DEFAULT_SUBACCOUNT,
        );
        let from = AccountIdentifier::new(
            &Principal::self_authenticating([92; 32]),
            &DEFAULT_SUBACCOUNT,
        );
        let mut tip = 256u64;
        let mut cursor = 0u64;
        let mut installed = false;
        let mut received_bytes = 0usize;
        let mut rows = Vec::new();
        let scenario_started = Instant::now();
        for round in 0..max_calls {
            if round > 0 {
                tip += arrivals_per_service;
            }
            let count = (tip - cursor).min(64);
            if count == 0 {
                break;
            }
            let blocks = (cursor..cursor + count)
                .map(|position| {
                    if position % 64 == 0 {
                        s12_fault_transfer(
                            from,
                            recipient,
                            1_000_000_000,
                            *b"BTZ\x11\0\0\x40\0",
                            position,
                        )
                    } else if position % 257 == 1 {
                        s12_fault_transfer(from, recipient, 1, *b"BTZ\x11\0\0\x20\0", position)
                    } else if position % 257 == 2 {
                        s12_fault_transfer(from, recipient, 1_000_000_000, [0; 8], position)
                    } else {
                        s12_fault_transfer(
                            from,
                            other,
                            1_000_000_000,
                            *b"BTZ\x11\0\0\x40\0",
                            position,
                        )
                    }
                })
                .collect::<Vec<_>>();
            let archived = round % 2 == 1;
            let (replies, query_bytes, archive_bytes) = if archived {
                let query = FaultQueryResponse {
                    chain_length: tip,
                    certificate: None,
                    blocks: vec![],
                    first_block_index: cursor,
                    archived_blocks: vec![FaultArchivedRange {
                        start: cursor,
                        length: count,
                        callback: FaultArchiveCallback(candid::Func {
                            principal: ledger,
                            method: "get_blocks".into(),
                        }),
                    }],
                };
                let query = candid::encode_one(query).unwrap();
                let archive =
                    candid::encode_one(Ok::<_, FaultArchiveError>(FaultBlockRange { blocks }))
                        .unwrap();
                (
                    vec![
                        ("query_blocks", query.clone()),
                        ("get_blocks", archive.clone()),
                    ],
                    query.len(),
                    archive.len(),
                )
            } else {
                let query = candid::encode_one(FaultQueryResponse {
                    chain_length: tip,
                    certificate: None,
                    blocks,
                    first_block_index: cursor,
                    archived_blocks: vec![],
                })
                .unwrap();
                (vec![("query_blocks", query.clone())], query.len(), 0)
            };
            let reply_refs = replies
                .iter()
                .map(|(method, bytes)| (*method, bytes.clone()))
                .collect::<Vec<_>>();
            let fixture = fixture_wasm(&reply_refs, &[]);
            if installed {
                pic.upgrade_canister(
                    ledger,
                    fixture,
                    encode_args(()).unwrap(),
                    Some(controller()),
                )
                .unwrap();
            } else {
                pic.install_canister(
                    ledger,
                    fixture,
                    encode_args(()).unwrap(),
                    Some(controller()),
                );
                installed = true;
            }
            let before = Instant::now();
            let current: Status = update_result(
                &pic,
                runtime,
                controller(),
                "sync_ledger",
                encode_args(()).unwrap(),
            )
            .unwrap();
            let elapsed = before.elapsed().as_secs_f64();
            let next = current.source.verified_source_watermark.unwrap();
            assert_eq!(next - cursor, count);
            cursor = next;
            received_bytes += query_bytes + archive_bytes;
            rows.push(serde_json::json!({
                "round": round,
                "tip": tip,
                "cursor": cursor,
                "backlog": tip - cursor,
                "records": count,
                "relevant_records": (cursor - count..cursor).filter(|position| position % 64 == 0 || position % 257 == 1 || position % 257 == 2).count(),
                "irrelevant_records": (cursor - count..cursor).filter(|position| position % 64 != 0 && position % 257 != 1 && position % 257 != 2).count(),
                "archived": archived,
                "ledger_calls": current.source.ledger_calls,
                "archive_calls": current.source.archive_calls,
                "received_candid_bytes": query_bytes + archive_bytes,
                "elapsed_seconds": elapsed,
                "records_per_second": count as f64 / elapsed.max(0.000_001),
            }));
            if cursor == tip {
                break;
            }
        }
        let final_status = status(&pic, runtime, Principal::anonymous()).unwrap();
        let backlog = tip - cursor;
        if expect_drain {
            assert_eq!(backlog, 0, "{name} must drain");
        } else {
            assert!(backlog > 256, "overload case must retain growing backlog");
        }
        let elapsed = scenario_started.elapsed().as_secs_f64();
        scenario_rows.push(serde_json::json!({
            "name": name,
            "evidence_class": "controlled PocketIC fault-ledger fixture",
            "initial_backlog": 256,
            "arrivals_per_service_window": arrivals_per_service,
            "arrival_model": "host-controlled records per completed 64-record scan opportunity",
            "final_tip": tip,
            "final_cursor": cursor,
            "final_backlog": backlog,
            "records_processed": cursor,
            "elapsed_seconds": elapsed,
            "sustained_records_per_second": cursor as f64 / elapsed.max(0.000_001),
            "ledger_calls": final_status.source.ledger_calls,
            "archive_calls": final_status.source.archive_calls,
            "received_candid_bytes": received_bytes,
            "outcome": if backlog == 0 { "DRAINED" } else { "SATURATED_BOUNDED_RUN" },
            "trace": rows,
        }));
    }
    write_s12_trace(
        "DTR_S12_LEDGER_TRACE",
        &serde_json::json!({
            "schema": "btz-s12-controlled-ledger-trace-v1",
            "outcome": "PASS",
            "page_limit": 64,
            "qualification": "controlled fixture throughput; not upstream-ledger or mainnet throughput",
            "traffic": "overwhelmingly irrelevant transfers plus valid, underfunded and invalid-memo incoming transfers",
            "scenarios": scenario_rows,
        }),
    );
}
// The controlled upstream-shaped ledger owns its arrival clock. It decodes the
// fixed typed request and selects a contiguous page independently of the harness.
fn s12_clock_ledger(
    ledger: Principal,
    runtime: Principal,
    epoch: u64,
    period: u64,
    batch: u64,
    duration: u64,
) -> Vec<u8> {
    let request = candid::encode_one(FaultGetBlocksArgs {
        start: 0x0102030405060708,
        length: 64,
    })
    .unwrap();
    let start_offset = request
        .windows(8)
        .position(|b| b == 0x0102030405060708u64.to_le_bytes())
        .unwrap();
    let recipient = AccountIdentifier::new(&runtime, &DEFAULT_SUBACCOUNT);
    let from = AccountIdentifier::new(
        &Principal::self_authenticating([92; 32]),
        &DEFAULT_SUBACCOUNT,
    );
    let other = AccountIdentifier::new(
        &Principal::self_authenticating([91; 32]),
        &DEFAULT_SUBACCOUNT,
    );
    let max_tip = duration / period * batch;
    let mut bytes = vec![0; 1024];
    let mut table = Vec::new();
    let mut archive_table = Vec::new();
    let mut empty_patch = 0;
    for cursor in (0..=max_tip).step_by(64) {
        let blocks = (cursor..cursor + 64)
            .map(|position| {
                let (to, amount, memo) = match position % 256 {
                    0 => (recipient, 1_000_000_000, *b"BTZ\x11\0\0\x40\0"),
                    1 => (recipient, 1, *b"BTZ\x11\0\0\x20\0"),
                    2 => (recipient, 1_000_000_000, [0; 8]),
                    _ => (other, 1_000_000_000, *b"BTZ\x11\0\0\x40\0"),
                };
                s12_fault_transfer(from, to, amount, memo, position)
            })
            .collect::<Vec<_>>();
        let archived = cursor < 128;
        let mut response = FaultQueryResponse {
            chain_length: 0x0102030405060708,
            certificate: None,
            blocks: if archived { vec![] } else { blocks.clone() },
            first_block_index: cursor,
            archived_blocks: if archived {
                vec![FaultArchivedRange {
                    start: cursor,
                    length: 64,
                    callback: FaultArchiveCallback(candid::Func {
                        principal: ledger,
                        method: "get_blocks".into(),
                    }),
                }]
            } else {
                vec![]
            },
        };
        if cursor == max_tip {
            response.blocks.clear();
            response.archived_blocks.clear();
        }
        let encoded = candid::encode_one(response).unwrap();
        let patch = encoded
            .windows(8)
            .position(|b| b == 0x0102030405060708u64.to_le_bytes())
            .unwrap();
        let offset = bytes.len();
        bytes.extend(&encoded);
        table.push((offset, encoded.len(), offset + patch));
        let archive =
            candid::encode_one(Ok::<_, FaultArchiveError>(FaultBlockRange { blocks })).unwrap();
        archive_table.push((bytes.len(), archive.len()));
        bytes.extend(archive);
    }
    let empty = candid::encode_one(FaultQueryResponse {
        chain_length: 0x0102030405060708,
        certificate: None,
        blocks: vec![],
        first_block_index: 0,
        archived_blocks: vec![],
    })
    .unwrap();
    let empty_offset = bytes.len();
    empty_patch += empty_offset
        + empty
            .windows(8)
            .position(|b| b == 0x0102030405060708u64.to_le_bytes())
            .unwrap();
    bytes.extend(&empty);
    let table_offset = bytes.len();
    for (offset, len, patch) in table {
        for value in [offset, len, patch] {
            bytes.extend((value as u32).to_le_bytes());
        }
    }
    let archive_offset = bytes.len();
    for (offset, len) in archive_table {
        for value in [offset, len] {
            bytes.extend((value as u32).to_le_bytes());
        }
    }
    wat::parse_str(format!(r#"(module
      (import "ic0" "time" (func $time (result i64)))
      (import "ic0" "msg_arg_data_copy" (func $copy (param i32 i32 i32)))
      (import "ic0" "msg_reply_data_append" (func $append (param i32 i32)))
      (import "ic0" "msg_reply" (func $reply))
      (memory (export "memory") {pages}) (data (i32.const 0) "{data}")
      (func $start (result i32) i32.const 0 i32.const 0 i32.const {request_len} call $copy
        i32.const {start_offset} i64.load i32.wrap_i64 i32.const 64 i32.div_u)
      (func (export "canister_query query_blocks") (local $tip i64) (local $entry i32) (local $start i32)
        call $time i64.const {epoch} i64.sub i64.const 1000000000 i64.div_u
        i64.const {period} i64.div_u i64.const {batch} i64.mul local.set $tip
        call $start local.set $start
        local.get $start i32.const 64 i32.mul i64.extend_i32_u local.get $tip i64.ge_u
        if
          i32.const {empty_patch} local.get $tip i64.store
          i32.const {empty_offset} i32.const {empty_len} call $append
        else
          i32.const {table_offset} local.get $start i32.const 12 i32.mul i32.add local.set $entry
          local.get $entry i32.const 8 i32.add i32.load local.get $tip i64.store
          local.get $entry i32.load local.get $entry i32.const 4 i32.add i32.load call $append
        end call $reply)
      (func (export "canister_query get_blocks") (local $entry i32)
        i32.const {archive_offset} call $start i32.const 8 i32.mul i32.add local.set $entry
        local.get $entry i32.load local.get $entry i32.const 4 i32.add i32.load call $append call $reply)
    )"#, pages=bytes.len().div_ceil(65536), data=wat_bytes(&bytes), request_len=request.len(), empty_len=empty.len())).unwrap()
}

#[test]
#[ignore = "bounded extended S12 independent-arrival load experiment"]
fn s12_autonomous_combined_service_trace() {
    let wasm = std::fs::read(required_path("DTR_RUNTIME_WASM")).unwrap();
    let mut scenarios = Vec::new();
    for (name, period, batch) in [
        ("idle", 1, 0),
        ("low", 64, 64),
        ("moderate", 8, 64),
        ("overload", 1, 128),
    ] {
        let pic = instance();
        let ledger = create_controlled(&pic);
        let runtime = create_controlled(&pic);
        let epoch = pic.get_time().as_nanos_since_unix_epoch();
        let duration = 128u64;
        let fixture = s12_clock_ledger(ledger, runtime, epoch, period, batch, duration + 64);
        pic.install_canister(
            ledger,
            fixture,
            encode_args(()).unwrap(),
            Some(controller()),
        );
        let init = encode_args((
            s12_world("ball-dense-medium"),
            "00".repeat(32),
            0u64,
            0u64,
            Some(LedgerConfig {
                network: "pocketic-local".into(),
                ledger,
                recipient_account: AccountIdentifier::new(&runtime, &DEFAULT_SUBACCOUNT)
                    .as_bytes()
                    .to_vec(),
                page_limit: 64,
                fallback_seconds: 5,
                hint_principal: None,
            }),
        ))
        .unwrap();
        pic.install_canister(runtime, wasm.clone(), init, Some(controller()));
        start_autonomous(
            &pic,
            runtime,
            RunConfig {
                segment_ticks: 2,
                pacing_seconds: 1,
                work_budget: 512,
            },
        );
        let mut rows = Vec::new();
        let mut previous_cursor = 0;
        let mut previous_tip = 0;
        let mut previous_calls = 0;
        let mut empty_polls = 0;
        let mut previous_in_flight = false;
        let mut hints_delivered = 0;
        let initial_stable_bytes = pic.get_stable_memory(runtime).len();
        let mut successful_scans = 0;
        let mut publications = BTreeSet::new();
        let mut assigned = BTreeSet::new();
        let mut assignment_trace = Vec::new();
        let mut publication_times = Vec::new();
        let mut queue_high = 0;
        let host_started = Instant::now();
        for second in 1..=duration {
            pic.advance_time(Duration::from_secs(1));
            // Arrival-clock hints accelerate discovery; alternating arrival
            // batches intentionally omit the hint and rely on fallback.
            if batch > 0 && second % period == 0 && (second / period) % 2 == 0 {
                let _: Status = update_result(
                    &pic,
                    runtime,
                    controller(),
                    "ledger_hint",
                    encode_args(()).unwrap(),
                )
                .unwrap();
                hints_delivered += 1;
            }
            pic.tick();
            let current = status(&pic, runtime, Principal::anonymous()).unwrap();
            let work = controller_work(&pic, runtime).unwrap();
            let elapsed = pic.get_time().as_nanos_since_unix_epoch() - epoch;
            let tip = elapsed / 1_000_000_000 / period * batch;
            let cursor = current.source.verified_source_watermark.unwrap();
            let verified = cursor - previous_cursor;
            if verified > 0 {
                successful_scans += 1;
            }
            // Observational classification: completed call while cursor unchanged
            // and no call remains in flight at the tip. Not an execution counter.
            if (current.source.ledger_calls > previous_calls || previous_in_flight)
                && cursor == previous_cursor
                && cursor == tip
                && !current.source.scan_in_flight
            {
                empty_polls += 1;
            }
            queue_high = queue_high.max(work.pending_inputs);
            let publication: Publication = decode(&observation(&pic, runtime).publication).unwrap();
            let mut watermark = None;
            if let Some(seal) = &publication.head.seal {
                watermark = Some(seal.source_to_exclusive.0.to_string());
                let id = publication.head.segment_id.as_ref().unwrap().0.to_string();
                if publications.insert(id) {
                    publication_times.push(second);
                    let from = seal.source_from.0.to_string().parse::<u64>().unwrap();
                    let to = seal
                        .source_to_exclusive
                        .0
                        .to_string()
                        .parse::<u64>()
                        .unwrap();
                    let positions = (from..to).filter(|p| p % 256 < 3).collect::<Vec<_>>();
                    assert_eq!(positions.len(), seal.input_count as usize);
                    for position in positions {
                        assert!(assigned.insert(position), "duplicate input assignment");
                        assignment_trace.push(serde_json::json!({"position":position,"assigned_at_virtual_second":second,
                            "arrival_virtual_second":(position / batch.max(1) + 1)*period}));
                    }
                }
            }
            rows.push(serde_json::json!({"elapsed_virtual_seconds":elapsed as f64/1e9,"observation_second":second,
                "ledger_tip":tip,"verified_cursor":cursor,"sealed_source_watermark":watermark,"backlog":tip-cursor,
                "new_arrivals":tip-previous_tip,"records_verified":verified,
                "relevant_records_accepted":(previous_cursor..cursor).filter(|p| p%256<3).count(),
                "ledger_calls":current.source.ledger_calls,"archive_calls":current.source.archive_calls,
                "empty_polls_observed":empty_polls,"successful_scans_observed":successful_scans,
                "retries":0,"dropped_hints":if batch == 0 { 0 } else { (second/period).saturating_sub(hints_delivered) },"hints_delivered":hints_delivered,"completed_segments":current.run.completed_segments,
                "phase":work.phase,"callbacks":current.run.callback_count,"total_work":current.run.total_work,
                "input_queue_size":work.pending_inputs,"source_error":current.source.last_error,"run_error":current.run.last_error}));
            assert!(current.run.last_error.is_none());
            assert!(current.source.last_error.is_none());
            previous_cursor = cursor;
            previous_tip = tip;
            previous_calls = current.source.ledger_calls;
            previous_in_flight = current.source.scan_in_flight;
        }
        let current = status(&pic, runtime, Principal::anonymous()).unwrap();
        assert!(current.run.completed_segments > 1);
        assert!(current.source.ledger_calls > 0);
        if name == "overload" {
            assert!(previous_tip - previous_cursor > 128);
        }
        let elapsed = rows.last().unwrap()["elapsed_virtual_seconds"]
            .as_f64()
            .unwrap();
        scenarios.push(serde_json::json!({"name":name,"evidence_class":"AUTONOMOUS_CONTROLLED_SERVICE_LOAD",
            "time_base":"PocketIC virtual canister seconds","duration_virtual_seconds":elapsed,
            "host_elapsed_seconds":host_started.elapsed().as_secs_f64(),"arrival_batch":batch,"arrival_period_seconds":period,
            "arrival_records_per_virtual_second":previous_tip as f64/elapsed,
            "verified_records_per_virtual_second":previous_cursor as f64/elapsed,
            "final_backlog":previous_tip-previous_cursor,"queue_high_water":queue_high,
            "stable_bytes_initial":initial_stable_bytes,"stable_bytes_final":pic.get_stable_memory(runtime).len(),
            "retention":serde_json::json!({"retained_bytes":retention_status(&pic,runtime).retained_bytes}),
            "completed_segments":current.run.completed_segments,"callbacks":current.run.callback_count,
            "publication_times_virtual_seconds":publication_times,"assignments":assignment_trace,
            "status":"PASS","operating_outcome":if name=="overload" {"UNSUSTAINABLE_TESTED"} else {"OBSERVED_BOUNDED"},
            "configuration":{"board":"16x8","starting_balls":32,"cannons":2,"logical_ticks":2,"work_budget":512,
                "callback_pacing_seconds":1,"fallback_seconds":5,"page_records":64},"trace":rows}));
        write_s12_trace(
            "DTR_S12_COMBINED_TRACE",
            &serde_json::json!({"schema":"btz-s12-combined-v1","status":"IN_PROGRESS","scenarios":scenarios}),
        );
    }
    write_s12_trace(
        "DTR_S12_COMBINED_TRACE",
        &serde_json::json!({"schema":"btz-s12-combined-v1","status":"PASS","scenarios":scenarios,
        "qualification":"controlled typed ledger; separate upstream functional evidence required; empty polls are observational, not full instruction measurements"}),
    );
}
