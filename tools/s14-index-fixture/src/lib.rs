//! Test-only index fault double: exact pre-encoded response, delayed across awaits.
//! Real upstream compatibility is tested separately, never inferred from this double.
use candid::{CandidType, Deserialize, Principal};
use std::cell::RefCell;
thread_local! {
    static LEDGER:RefCell<Principal>=RefCell::new(Principal::anonymous());
    static RESPONSE:RefCell<(u32,Vec<u8>)>=const {RefCell::new((0,Vec::new()))};
    static CALLS:RefCell<u64>=const {RefCell::new(0)};
}
#[derive(CandidType, Deserialize)]
struct Args {
    account_identifier: String,
    start: Option<u64>,
    max_results: u64,
}
#[ic_cdk::init]
fn init(ledger: Principal, delay: u32, response: Vec<u8>) {
    LEDGER.with(|l| *l.borrow_mut() = ledger);
    RESPONSE.with(|r| *r.borrow_mut() = (delay, response));
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
}
#[ic_cdk::query]
fn calls() -> u64 {
    CALLS.with(|c| *c.borrow())
}
#[ic_cdk::update(manual_reply = true)]
async fn get_account_identifier_transactions(_args: Args) {
    CALLS.with(|c| *c.borrow_mut() += 1);
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
