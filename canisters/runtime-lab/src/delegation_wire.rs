//! Adapter-5-only check before typed Candid's optional-field compatibility.
//! A missing wire `spender` must never be silently decoded as direct payment.
use candid::{IDLArgs, types::value::IDLValue};
fn field<'a>(v: &'a IDLValue, name: &str) -> Result<&'a IDLValue, String> {
    let IDLValue::Record(fields) = v else {
        return Err("AUTH_INDEX_RECORD".into());
    };
    fields
        .iter()
        .find(|f| f.id.get_id() == candid::idl_hash(name))
        .map(|f| &f.val)
        .ok_or_else(|| format!("AUTH_INDEX_MISSING_{name}"))
}
fn fields(v: &IDLValue, names: &[&str]) -> Result<(), String> {
    let IDLValue::Record(actual) = v else {
        return Err("AUTH_INDEX_RECORD".into());
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
    Ok(())
}
pub fn check(bytes: &[u8]) -> Result<(), String> {
    if bytes.len() > 1_048_576 {
        return Err("AUTH_INDEX_REPLY_BOUND".into());
    }
    let mut config = candid::DecoderConfig::new();
    config.set_decoding_quota(1_000_000);
    config.set_skipping_quota(1_000_000);
    let args = IDLArgs::from_bytes_with_config(bytes, &config)
        .map_err(|e| format!("AUTH_INDEX_WIRE: {e}"))?;
    if args.args.len() != 1 {
        return Err("AUTH_INDEX_ARGUMENTS".into());
    }
    let IDLValue::Variant(result) = &args.args[0] else {
        return Err("AUTH_INDEX_RESULT".into());
    };
    if result.0.id.get_id() == candid::idl_hash("Err") {
        return Ok(());
    }
    if result.0.id.get_id() != candid::idl_hash("Ok") {
        return Err("AUTH_INDEX_RESULT".into());
    }
    fields(&result.0.val, &["balance", "transactions", "oldest_tx_id"])?;
    let IDLValue::Vec(rows) = field(&result.0.val, "transactions")? else {
        return Err("AUTH_INDEX_ROWS".into());
    };
    if rows.len() > crate::source::PAGE as usize {
        return Err("AUTH_INDEX_ROWS_BOUND".into());
    }
    for row in rows {
        fields(row, &["id", "transaction"])?;
        let tx = field(row, "transaction")?;
        fields(
            tx,
            &[
                "memo",
                "icrc1_memo",
                "created_at_time",
                "timestamp",
                "operation",
            ],
        )?;
        let IDLValue::Variant(operation) = field(tx, "operation")? else {
            return Err("AUTH_INDEX_OPERATION".into());
        };
        if operation.0.id.get_id() == candid::idl_hash("Transfer") {
            // Check presence before exact shape, preserving the specific ambiguity error.
            field(&operation.0.val, "spender")?;
            fields(
                &operation.0.val,
                &["from", "to", "amount", "fee", "spender"],
            )?;
            match field(&operation.0.val, "spender")? {
                IDLValue::None => {}
                IDLValue::Opt(v) if matches!(v.as_ref(), IDLValue::Text(_)) => {}
                _ => return Err("AUTH_INDEX_SPENDER_TYPE".into()),
            }
        }
    }
    Ok(())
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
