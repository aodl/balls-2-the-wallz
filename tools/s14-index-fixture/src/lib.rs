//! Test-only index fault double: exact pre-encoded response, delayed across awaits.
//! Real upstream compatibility is tested separately, never inferred from this double.
use candid::{CandidType, Deserialize, Principal};
use std::cell::RefCell;
thread_local! {
    static LEDGER:RefCell<Principal>=const { RefCell::new(Principal::anonymous()) };
    static RESPONSE:RefCell<(u32,Vec<u8>)>=const {RefCell::new((0,Vec::new()))};
    static HISTORY:RefCell<Option<History>>=const { RefCell::new(None) };
    static CALLS:RefCell<u64>=const {RefCell::new(0)};
}
#[derive(CandidType, Deserialize)]
struct Args {
    account_identifier: String,
    start: Option<u64>,
    max_results: u64,
}
#[derive(Clone, CandidType, Deserialize)]
struct Tokens {
    e8s: u64,
}
#[derive(Clone, CandidType, Deserialize)]
struct Timestamp {
    timestamp_nanos: u64,
}
#[derive(Clone, CandidType, Deserialize)]
enum Operation {
    Transfer {
        from: String,
        to: String,
        amount: Tokens,
        fee: Tokens,
        spender: Option<String>,
    },
}
#[derive(Clone, CandidType, Deserialize)]
struct Transaction {
    memo: u64,
    icrc1_memo: Option<Vec<u8>>,
    operation: Operation,
    created_at_time: Option<Timestamp>,
    timestamp: Option<Timestamp>,
}
#[derive(Clone, CandidType, Deserialize)]
struct Row {
    id: u64,
    transaction: Transaction,
}
#[derive(Clone, CandidType, Deserialize)]
struct History {
    balance: u64,
    transactions: Vec<Row>,
    oldest_tx_id: Option<u64>,
}
#[derive(CandidType)]
struct IndexError {
    message: String,
}
#[ic_cdk::update]
fn set_history(ids: Vec<u64>, to: String, from: String) {
    assert!(ic_cdk::api::is_controller(&ic_cdk::api::msg_caller()));
    assert!(ids.len() <= 2048 && ids.windows(2).all(|w| w[0] < w[1]));
    let oldest_tx_id = ids.first().copied();
    HISTORY.with(|h| {
        *h.borrow_mut() = Some(History {
            balance: 0,
            oldest_tx_id,
            transactions: ids
                .into_iter()
                .rev()
                .map(|id| Row {
                    id,
                    transaction: Transaction {
                        memo: 0,
                        icrc1_memo: None,
                        created_at_time: None,
                        timestamp: None,
                        operation: Operation::Transfer {
                            to: to.clone(),
                            from: from.clone(),
                            amount: Tokens { e8s: 1 },
                            fee: Tokens { e8s: 10_000 },
                            spender: None,
                        },
                    },
                })
                .collect(),
        })
    });
}
#[ic_cdk::init]
fn init(ledger: Principal, delay: u32, response: Vec<u8>) {
    LEDGER.with(|l| *l.borrow_mut() = ledger);
    RESPONSE.with(|r| *r.borrow_mut() = (delay, response));
    HISTORY.with(|h| *h.borrow_mut() = None);
}
#[ic_cdk::query]
fn ledger_id() -> Principal {
    LEDGER.with(|l| *l.borrow())
}
#[ic_cdk::update]
fn set_reply(delay: u32, response: Vec<u8>) {
    assert!(ic_cdk::api::is_controller(&ic_cdk::api::msg_caller()));
    assert!(delay <= 120 && response.len() <= 65536);
    RESPONSE.with(|r| *r.borrow_mut() = (delay, response));
    HISTORY.with(|h| *h.borrow_mut() = None);
}
#[ic_cdk::query]
fn calls() -> u64 {
    CALLS.with(|c| *c.borrow())
}
#[ic_cdk::update(manual_reply = true)]
async fn get_account_identifier_transactions(args: Args) {
    CALLS.with(|c| *c.borrow_mut() += 1);
    if let Some(mut history) = HISTORY.with(|h| h.borrow().clone()) {
        assert!(args.max_results <= 64);
        history
            .transactions
            .retain(|r| args.start.is_none_or(|before| r.id < before));
        history.transactions.truncate(args.max_results as usize);
        ic_cdk::api::msg_reply(
            candid::encode_one(Result::<History, IndexError>::Ok(history)).unwrap(),
        );
        return;
    }
    let (delay, response) = RESPONSE.with(|r| r.borrow().clone());
    // Only manually progressed PocketIC uses this fixture: the driver holds and
    // mocks the management outcall. No real HTTP traffic is sent.
    if delay > 0 {
        let args = ic_management_canister_types::HttpRequestArgs {
            url: "https://s14-index.invalid/held-response".into(),
            max_response_bytes: Some(32),
            method: ic_management_canister_types::HttpMethod::GET,
            headers: vec![],
            body: None,
            transform: None,
            is_replicated: Some(true),
        };
        let _ =
            ic_cdk::call::Call::unbounded_wait(Principal::management_canister(), "http_request")
                .with_arg(args)
                .with_cycles(100_000_000_000)
                .await;
    }
    ic_cdk::api::msg_reply(response);
}
