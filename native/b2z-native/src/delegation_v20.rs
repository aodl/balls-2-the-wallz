//! Draft successor storage for ordered Ledger authorization. Rules18/19 retain
//! their original map encoding and decoders. This module is not wired into a
//! gameplay epoch until a paid-state-preserving Schema12 transition is proven.
use crate::delegation_v18::{Grant, Registry};
use dtr_wire::{Int, Result};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct GrantRow {
    pub account: String,
    pub activation_position: Int,
    pub expires_at_ns: Int,
    pub spender_principal: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct RegistryV3 {
    pub version: u32,
    pub recipient: String,
    pub ledger_time_ns: Int,
    pub last_position: Option<Int>,
    pub grants: Vec<GrantRow>,
}

impl RegistryV3 {
    pub fn from_v2(previous: &Registry) -> Result<Self> {
        previous.validate()?;
        let grants = previous
            .grants
            .iter()
            .map(|(account, grant)| GrantRow {
                account: account.clone(),
                activation_position: grant.activation_position.clone(),
                expires_at_ns: grant.expires_at_ns.clone(),
                spender_principal: grant.spender_principal.clone(),
            })
            .collect();
        let next = Self {
            version: 3,
            recipient: previous.recipient.clone(),
            ledger_time_ns: previous.ledger_time_ns.clone(),
            last_position: previous.last_position.clone(),
            grants,
        };
        next.validate()?;
        Ok(next)
    }

    pub fn validate(&self) -> Result<()> {
        if self.version != 3 {
            return Err("AUTH_V3_VERSION".into());
        }
        let mut previous_account: Option<&str> = None;
        let mut grants = BTreeMap::new();
        for row in &self.grants {
            if previous_account.is_some_and(|last| row.account.as_str() <= last) {
                return Err("AUTH_V3_ORDER".into());
            }
            previous_account = Some(&row.account);
            grants.insert(
                row.account.clone(),
                Grant {
                    activation_position: row.activation_position.clone(),
                    expires_at_ns: row.expires_at_ns.clone(),
                    spender_principal: row.spender_principal.clone(),
                },
            );
        }
        Registry {
            version: 2,
            recipient: self.recipient.clone(),
            ledger_time_ns: self.ledger_time_ns.clone(),
            last_position: self.last_position.clone(),
            grants,
        }
        .validate()
    }

    /// In-memory compatibility adapter only; its map must not be encoded as
    /// successor canonical state because valid account strings may start with
    /// digits, which are not valid canonical object keys.
    pub fn to_v2(&self) -> Result<Registry> {
        self.validate()?;
        let grants = self
            .grants
            .iter()
            .map(|row| {
                (
                    row.account.clone(),
                    Grant {
                        activation_position: row.activation_position.clone(),
                        expires_at_ns: row.expires_at_ns.clone(),
                        spender_principal: row.spender_principal.clone(),
                    },
                )
            })
            .collect();
        Ok(Registry {
            version: 2,
            recipient: self.recipient.clone(),
            ledger_time_ns: self.ledger_time_ns.clone(),
            last_position: self.last_position.clone(),
            grants,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::delegation_v18::Decision;
    use b2z_protocol::delegation::Payment;
    use dtr_wire::{decode, encode, hash, hex, unhex};

    #[test]
    fn digit_leading_valid_account_survives_versioned_canonical_storage() {
        let vector: serde_json::Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/b2z-delegation-v18.json"
        ))
        .unwrap();
        let mut payment =
            Payment::decode(&unhex(vector["envelope"].as_str().unwrap()).unwrap()).unwrap();
        assert!(hex(&payment.from).starts_with('2'));
        payment.position = 4;
        payment.spender = None;
        payment.amount = 0;
        payment.memo = Some(unhex(vector["grant_memo"].as_str().unwrap()).unwrap());
        let mut historical = Registry::empty(hex(&payment.to)).unwrap();
        assert_eq!(historical.apply(&payment, 4).unwrap(), Decision::Granted);
        assert!(encode(&historical).is_err());
        let successor = RegistryV3::from_v2(&historical).unwrap();
        let bytes = encode(&successor).unwrap();
        let decoded: RegistryV3 = decode(&bytes).unwrap();
        assert_eq!(decoded, successor);
        assert_eq!(decoded.to_v2().unwrap(), historical);
        assert_eq!(
            hash(&bytes),
            "d50ecde672ae35c869752e3b8267e92e046735694fe60622df74b540869ffe6d"
        );
    }

    #[test]
    fn grant_rows_require_strict_canonical_order_without_duplicates() {
        let vector: serde_json::Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/b2z-delegation-v18.json"
        ))
        .unwrap();
        let payment =
            Payment::decode(&unhex(vector["envelope"].as_str().unwrap()).unwrap()).unwrap();
        let mut r = RegistryV3::from_v2(&Registry::empty(hex(&payment.to)).unwrap()).unwrap();
        assert!(r.grants.is_empty());
        r.version = 2;
        assert!(r.validate().is_err());
        let mut populated = Registry::empty(hex(&payment.to)).unwrap();
        let mut grant = payment;
        grant.position = 4;
        grant.spender = None;
        grant.amount = 0;
        grant.memo = Some(unhex(vector["grant_memo"].as_str().unwrap()).unwrap());
        assert_eq!(populated.apply(&grant, 4).unwrap(), Decision::Granted);
        let mut duplicate = RegistryV3::from_v2(&populated).unwrap();
        duplicate.grants.push(duplicate.grants[0].clone());
        assert!(duplicate.validate().is_err());
    }
}
