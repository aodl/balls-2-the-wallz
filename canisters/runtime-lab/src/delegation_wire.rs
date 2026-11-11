//! Adapter-5-only wire schema check before typed Candid optional compatibility.
//! Validate the small type table once, not an untyped copy of every transaction.
use binread::BinReaderExt;
use candid::{
    binary_parser::Header,
    types::{Type, TypeEnv, TypeInner},
};
use std::io::Cursor;
fn traced(env: &TypeEnv, ty: &Type) -> Result<Type, String> {
    let mut ty = ty.clone();
    for _ in 0..64 {
        match ty.as_ref() {
            TypeInner::Var(name) => {
                ty = env.find_type(name).map_err(|_| "AUTH_INDEX_TYPE")?.clone()
            }
            _ => return Ok(ty),
        }
    }
    Err("AUTH_INDEX_TYPE_CYCLE".into())
}
fn fields(
    env: &TypeEnv,
    ty: &Type,
    names: &[&str],
    variant: bool,
) -> Result<Vec<candid::types::Field>, String> {
    let ty = traced(env, ty)?;
    let actual = match ty.as_ref() {
        TypeInner::Record(v) if !variant => v,
        TypeInner::Variant(v) if variant => v,
        _ => return Err("AUTH_INDEX_RECORD".into()),
    };
    let mut expected = names
        .iter()
        .map(|n| candid::idl_hash(n))
        .collect::<Vec<_>>();
    expected.sort_unstable();
    let mut ids = actual.iter().map(|f| f.id.get_id()).collect::<Vec<_>>();
    ids.sort_unstable();
    if ids != expected {
        return Err("AUTH_INDEX_RECORD_FIELDS".into());
    }
    Ok(actual.clone())
}
fn field(fields: &[candid::types::Field], name: &str) -> Result<Type, String> {
    fields
        .iter()
        .find(|f| f.id.get_id() == candid::idl_hash(name))
        .map(|f| f.ty.clone())
        .ok_or_else(|| format!("AUTH_INDEX_MISSING_{name}"))
}
pub fn decode_checked(bytes: &[u8]) -> Result<crate::source::HistoryResult, String> {
    if bytes.len() > 1_048_576 {
        return Err("AUTH_INDEX_REPLY_BOUND".into());
    }
    let header = Cursor::new(bytes)
        .read_le_args::<Header>((Some(64),))
        .map_err(|_| "AUTH_INDEX_HEADER")?;
    let (env, args) = header.to_types().map_err(|_| "AUTH_INDEX_TYPES")?;
    if args.len() != 1 {
        return Err("AUTH_INDEX_ARGUMENTS".into());
    }
    let result = fields(&env, &args[0], &["Ok", "Err"], true)?;
    let history = fields(
        &env,
        &field(&result, "Ok")?,
        &["balance", "transactions", "oldest_tx_id"],
        false,
    )?;
    let transactions = traced(&env, &field(&history, "transactions")?)?;
    let TypeInner::Vec(row) = transactions.as_ref() else {
        return Err("AUTH_INDEX_ROWS".into());
    };
    let row = fields(&env, row, &["id", "transaction"], false)?;
    let tx = fields(
        &env,
        &field(&row, "transaction")?,
        &[
            "memo",
            "icrc1_memo",
            "created_at_time",
            "timestamp",
            "operation",
        ],
        false,
    )?;
    let operation = traced(&env, &field(&tx, "operation")?)?;
    let TypeInner::Variant(operations) = operation.as_ref() else {
        return Err("AUTH_INDEX_OPERATION".into());
    };
    let transfer = traced(&env, &field(operations, "Transfer")?)?;
    let TypeInner::Record(transfer_fields) = transfer.as_ref() else {
        return Err("AUTH_INDEX_RECORD".into());
    };
    // Check actual type-table presence before serde can supply a missing option.
    let spender = traced(&env, &field(transfer_fields, "spender")?)?;
    fields(
        &env,
        &transfer,
        &["from", "to", "amount", "fee", "spender"],
        false,
    )?;
    let TypeInner::Opt(inner) = spender.as_ref() else {
        return Err("AUTH_INDEX_SPENDER_TYPE".into());
    };
    if !matches!(traced(&env, inner)?.as_ref(), TypeInner::Text) {
        return Err("AUTH_INDEX_SPENDER_TYPE".into());
    }
    let mut config = candid::DecoderConfig::new();
    config.set_decoding_quota(1_000_000);
    config.set_skipping_quota(1_000_000);
    config.set_max_type_len(64);
    config.set_full_error_message(false);
    let mut decoder = candid::de::IDLDeserialize::new_with_config(bytes, &config)
        .map_err(|_| "AUTH_INDEX_WIRE")?;
    let result: crate::source::HistoryResult =
        decoder.get_value().map_err(|_| "AUTH_INDEX_WIRE")?;
    decoder.done().map_err(|_| "AUTH_INDEX_WIRE")?;
    if result
        .as_ref()
        .is_ok_and(|page| page.transactions.len() > crate::source::PAGE as usize)
    {
        return Err("AUTH_INDEX_ROWS_BOUND".into());
    }
    Ok(result)
}
#[cfg(test)]
pub fn check(bytes: &[u8]) -> Result<(), String> {
    decode_checked(bytes).map(|_| ())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[derive(candid::CandidType)]
    struct OldTransfer {
        from: String,
        to: String,
        amount: crate::source::Tokens,
        fee: crate::source::Tokens,
    }
    #[derive(candid::CandidType)]
    enum OldOperation {
        Transfer(OldTransfer),
    }
    #[derive(candid::CandidType)]
    struct OldTx {
        memo: u64,
        icrc1_memo: Option<Vec<u8>>,
        created_at_time: Option<crate::source::Timestamp>,
        timestamp: Option<crate::source::Timestamp>,
        operation: OldOperation,
    }
    #[derive(candid::CandidType)]
    struct OldRow {
        id: u64,
        transaction: OldTx,
    }
    #[derive(candid::CandidType)]
    struct OldHistory {
        balance: u64,
        oldest_tx_id: Option<u64>,
        transactions: Vec<OldRow>,
    }
    #[test]
    fn missing_optional_spender_is_not_owner_proof() {
        let old: std::result::Result<OldHistory, crate::source::IndexError> = Ok(OldHistory {
            balance: 0,
            oldest_tx_id: Some(0),
            transactions: vec![OldRow {
                id: 0,
                transaction: OldTx {
                    memo: 0,
                    icrc1_memo: None,
                    created_at_time: None,
                    timestamp: Some(crate::source::Timestamp { timestamp_nanos: 1 }),
                    operation: OldOperation::Transfer(OldTransfer {
                        from: "from".into(),
                        to: "to".into(),
                        amount: crate::source::Tokens { e8s: 0 },
                        fee: crate::source::Tokens { e8s: 1 },
                    }),
                },
            }],
        });
        let wire = candid::encode_one(old).unwrap();
        let compatible: crate::source::HistoryResult = candid::decode_one(&wire).unwrap();
        assert!(matches!(
            &compatible.unwrap().transactions[0].transaction.operation,
            crate::source::Operation::Transfer { spender: None, .. }
        ));
        assert_eq!(check(&wire).unwrap_err(), "AUTH_INDEX_MISSING_spender");
    }
    fn page_wire(count: u64) -> Vec<u8> {
        let response: crate::source::HistoryResult = Ok(crate::source::History {
            balance: 0,
            oldest_tx_id: Some(0),
            transactions: (0..count)
                .map(|id| crate::source::TransactionWithId {
                    id,
                    transaction: crate::source::Transaction {
                        memo: 0,
                        icrc1_memo: Some(vec![2; 32]),
                        created_at_time: None,
                        timestamp: Some(crate::source::Timestamp {
                            timestamp_nanos: 1000000000,
                        }),
                        operation: crate::source::Operation::Transfer {
                            from: "a".repeat(64),
                            to: "b".repeat(64),
                            amount: crate::source::Tokens { e8s: 0 },
                            fee: crate::source::Tokens { e8s: 12345 },
                            spender: None,
                        },
                    },
                })
                .collect(),
        });
        candid::encode_one(response).unwrap()
    }
    #[test]
    fn full_index_page_fits_existing_wire_budget() {
        check(&page_wire(crate::source::PAGE)).unwrap();
    }
    #[test]
    fn extra_rows_truncation_and_oversized_replies_remain_rejected() {
        assert_eq!(
            check(&page_wire(crate::source::PAGE + 1)).unwrap_err(),
            "AUTH_INDEX_ROWS_BOUND"
        );
        let mut wire = page_wire(1);
        wire.pop();
        assert!(check(&wire).is_err());
        assert_eq!(
            check(&vec![0; 1_048_577]).unwrap_err(),
            "AUTH_INDEX_REPLY_BOUND"
        );
    }
    #[test]
    fn explicit_spender_absence_is_accepted() {
        let response: crate::source::HistoryResult = Ok(crate::source::History {
            balance: 0,
            oldest_tx_id: Some(0),
            transactions: vec![crate::source::TransactionWithId {
                id: 0,
                transaction: crate::source::Transaction {
                    memo: 0,
                    icrc1_memo: None,
                    created_at_time: None,
                    timestamp: Some(crate::source::Timestamp { timestamp_nanos: 1 }),
                    operation: crate::source::Operation::Transfer {
                        from: "from".into(),
                        to: "to".into(),
                        amount: crate::source::Tokens { e8s: 0 },
                        fee: crate::source::Tokens { e8s: 1 },
                        spender: None,
                    },
                },
            }],
        });
        check(&candid::encode_one(response).unwrap()).unwrap();
    }
}
