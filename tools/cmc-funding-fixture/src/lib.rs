//! Disposable CMC contract double. No mainnet deployment or real exchange rate.
use candid::{CandidType, Deserialize, Nat, Principal};
use ic_cdk::call::Call;
use std::{cell::RefCell, collections::BTreeMap};
#[derive(Clone, CandidType, Deserialize)]
struct Args {
    canister_id: Principal,
    block_index: u64,
}
#[derive(Clone, CandidType, Deserialize)]
enum NotifyError {
    Refunded {
        reason: String,
        block_index: Option<u64>,
    },
    Processing,
    TransactionTooOld(u64),
    InvalidTransaction(String),
    Other {
        error_code: u64,
        error_message: String,
    },
}
#[derive(CandidType, Deserialize)]
struct Id {
    canister_id: Principal,
}
#[derive(Clone, CandidType, Deserialize)]
struct Stats {
    calls: u64,
    credits: u64,
    blocks: Vec<u64>,
    target: Principal,
}
thread_local! {
 static TARGET:RefCell<Principal>=const{RefCell::new(Principal::anonymous())};
 static LEDGER:RefCell<Principal>=const{RefCell::new(Principal::anonymous())};
 static MODE:RefCell<String>=const{RefCell::new(String::new())};
 static DONE:RefCell<BTreeMap<u64,Result<Nat,NotifyError>>>=const{RefCell::new(BTreeMap::new())};
 static COUNTS:RefCell<(u64,u64)>=const{RefCell::new((0,0))};
}
#[ic_cdk::init]
fn init(target: Principal, ledger: Principal) {
    LEDGER.with(|l| *l.borrow_mut() = ledger);
    TARGET.with(|t| *t.borrow_mut() = target);
}
#[ic_cdk::update]
fn mode(value: String) {
    assert!(ic_cdk::api::is_controller(&ic_cdk::api::msg_caller()));
    MODE.with(|m| *m.borrow_mut() = value);
}
#[ic_cdk::query]
fn stats() -> Stats {
    let (calls, credits) = COUNTS.with(|c| *c.borrow());
    Stats {
        calls,
        credits,
        blocks: DONE.with(|d| d.borrow().keys().copied().collect()),
        target: TARGET.with(|t| *t.borrow()),
    }
}
#[ic_cdk::update]
async fn notify_top_up(a: Args) -> Result<Nat, NotifyError> {
    COUNTS.with(|c| c.borrow_mut().0 += 1);
    let target = TARGET.with(|t| *t.borrow());
    if a.canister_id != target || ic_cdk::api::msg_caller() != target {
        return Err(NotifyError::InvalidTransaction(
            "wrong beneficiary/caller".into(),
        ));
    }
    if let Some(value) = DONE.with(|d| d.borrow().get(&a.block_index).cloned()) {
        return value;
    }
    let mode = MODE.with(|m| m.borrow().clone());
    match mode.as_str() {
        "processing" => return Err(NotifyError::Processing),
        "other" => {
            return Err(NotifyError::Other {
                error_code: 1,
                error_message: "controlled retry".into(),
            })
        }
        "invalid" => return Err(NotifyError::InvalidTransaction("controlled invalid".into())),
        "old" => return Err(NotifyError::TransactionTooOld(99)),
        _ => {}
    }
    let ledger = LEDGER.with(|l| *l.borrow());
    let arg = ic_ledger_types::GetBlocksArgs {
        start: a.block_index,
        length: 1,
    };
    let data = Call::bounded_wait(ledger, "query_blocks")
        .with_arg(&arg)
        .await
        .unwrap()
        .candid::<ic_ledger_types::QueryBlocksResponse>()
        .unwrap();
    let block = if data.first_block_index == a.block_index && !data.blocks.is_empty() {
        data.blocks[0].clone()
    } else {
        let archive = data.archived_blocks.first().expect("known payment block");
        let callback: candid::Func = archive.callback.clone().into();
        Call::bounded_wait(callback.principal, &callback.method)
            .with_arg(&arg)
            .await
            .unwrap()
            .candid::<ic_ledger_types::GetBlocksResult>()
            .unwrap()
            .unwrap()
            .blocks[0]
            .clone()
    };
    let mut sub = [0; 32];
    sub[0] = target.as_slice().len() as u8;
    sub[1..1 + target.as_slice().len()].copy_from_slice(target.as_slice());
    let sub = ic_ledger_types::Subaccount(sub);
    let expected = ic_ledger_types::AccountIdentifier::new(&ic_cdk::api::canister_self(), &sub);
    let amount = match block.transaction.operation {
        Some(ic_ledger_types::Operation::Transfer {
            from, to, amount, ..
        }) if from
            == ic_ledger_types::AccountIdentifier::new(
                &target,
                &ic_ledger_types::DEFAULT_SUBACCOUNT,
            )
            && to == expected
            && block.transaction.memo.0 == 1_347_768_404 =>
        {
            amount.e8s()
        }
        _ => return Err(NotifyError::InvalidTransaction("wrong CMC payment".into())),
    };
    if mode == "refund" {
        let fee = Call::bounded_wait(ledger, "icrc1_fee")
            .await
            .unwrap()
            .candid::<Nat>()
            .unwrap();
        let fee = u64::try_from(fee.0).unwrap();
        let args = ic_ledger_types::TransferArgs {
            memo: ic_ledger_types::Memo(0),
            amount: ic_ledger_types::Tokens::from_e8s(amount - fee),
            fee: ic_ledger_types::Tokens::from_e8s(fee),
            from_subaccount: Some(sub),
            to: ic_ledger_types::AccountIdentifier::new(
                &target,
                &ic_ledger_types::DEFAULT_SUBACCOUNT,
            ),
            created_at_time: Some(ic_ledger_types::Timestamp {
                timestamp_nanos: ic_cdk::api::time(),
            }),
        };
        let block = Call::bounded_wait(ledger, "transfer")
            .with_arg(&args)
            .await
            .unwrap()
            .candid::<ic_ledger_types::TransferResult>()
            .unwrap()
            .unwrap();
        let result = Err(NotifyError::Refunded {
            reason: "controlled real-ledger refund".into(),
            block_index: Some(block),
        });
        DONE.with(|d| d.borrow_mut().insert(a.block_index, result.clone()));
        return result;
    }
    let cycles = 1_000_000_000_000u128;
    Call::bounded_wait(Principal::management_canister(), "deposit_cycles")
        .with_arg(&Id {
            canister_id: target,
        })
        .with_cycles(cycles)
        .await
        .expect("owned disposable backend");
    let value = Nat::from(cycles);
    DONE.with(|d| d.borrow_mut().insert(a.block_index, Ok(value.clone())));
    COUNTS.with(|c| c.borrow_mut().1 += 1);
    Ok(value)
}
