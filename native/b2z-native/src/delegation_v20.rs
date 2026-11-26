//! Draft successor storage for ordered Ledger authorization. Rules18/19 retain
//! their original map encoding and decoders. This module is not wired into a
//! gameplay epoch until a paid-state-preserving Schema12 transition is proven.
use crate::delegation_v18::{Decision, Grant, Registry};
use b2z_protocol::delegation::{
    account_id, account_ok, decode_authorization, AuthorizationMemo, Payment, LIFETIME_NS,
};
use dtr_wire::{hex, unhex, Int, Result};
use num_traits::ToPrimitive;
use serde::{Deserialize, Serialize};

fn uint(value: &Int) -> Result<u64> {
    value.0.to_u64().ok_or_else(|| "AUTH_INTEGER".into())
}

fn account(value: &str) -> Result<()> {
    let bytes: [u8; 32] = unhex(value)?.try_into().map_err(|_| "AUTH_ACCOUNT")?;
    if hex(&bytes) != value || !account_ok(&bytes) {
        return Err("AUTH_ACCOUNT".into());
    }
    Ok(())
}

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

/// The field name remains stable in canonical world state. Untagged decoding
/// preserves historical map bytes; only Schema12 may store ordered rows.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum AuthorizationState {
    Historical(Registry),
    Rows(RegistryV3),
}

impl AuthorizationState {
    pub fn validate(&self) -> Result<()> {
        match self {
            Self::Historical(value) => value.validate(),
            Self::Rows(value) => value.validate(),
        }
    }

    pub fn apply(&mut self, payment: &Payment, position: u64) -> Result<Decision> {
        match self {
            Self::Historical(value) => value.apply(payment, position),
            Self::Rows(value) => value.apply(payment, position),
        }
    }
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
        account(&self.recipient)?;
        uint(&self.ledger_time_ns)?;
        if let Some(last) = &self.last_position {
            uint(last)?;
        }
        let mut previous_account: Option<&str> = None;
        for row in &self.grants {
            if previous_account.is_some_and(|last| row.account.as_str() <= last) {
                return Err("AUTH_V3_ORDER".into());
            }
            account(&row.account)?;
            previous_account = Some(&row.account);
            let principal = unhex(&row.spender_principal)?;
            if principal.len() != 29
                || principal[28] != 2
                || hex(&principal) != row.spender_principal
                || uint(&row.expires_at_ns)? < LIFETIME_NS
                || self
                    .last_position
                    .as_ref()
                    .is_none_or(|p| row.activation_position > *p)
            {
                return Err("AUTH_GRANT".into());
            }
            uint(&row.activation_position)?;
        }
        Ok(())
    }

    /// Apply an ordered Ledger fact directly to the canonical row set. A
    /// temporary v2 map here would repeat work and reintroduce unsafe keys.
    pub fn apply(&mut self, p: &Payment, input_position: u64) -> Result<Decision> {
        p.encode()?;
        let prior = self.last_position.as_ref().map(uint).transpose()?;
        if p.position != input_position
            || hex(&p.to) != self.recipient
            || prior.is_some_and(|n| p.position <= n)
            || p.ledger_time_ns < uint(&self.ledger_time_ns)?
        {
            return Err("AUTH_SOURCE_ORDER_OR_DESTINATION".into());
        }
        let payer = hex(&p.from);
        let at = self.grants.binary_search_by(|row| row.account.cmp(&payer));
        let setup = decode_authorization(p.memo.as_deref().unwrap_or(&[]));
        let decision = match setup {
            Err(_) => Decision::Rejected("INVALID_DELEGATION"),
            Ok(Some(_)) if p.spender.is_some() => Decision::Rejected("DELEGATED_SETUP_FORBIDDEN"),
            Ok(Some(_)) if p.amount != 0 => Decision::Rejected("DELEGATION_SETUP_AMOUNT"),
            Ok(Some(AuthorizationMemo::Revoke)) => {
                if let Ok(index) = at {
                    self.grants.remove(index);
                }
                Decision::Revoked
            }
            Ok(Some(AuthorizationMemo::Grant(principal))) => {
                let expiry = p
                    .ledger_time_ns
                    .checked_add(LIFETIME_NS)
                    .ok_or("AUTH_TIME_OVERFLOW")?;
                let row = GrantRow {
                    account: payer,
                    spender_principal: hex(&principal),
                    activation_position: Int(p.position.into()),
                    expires_at_ns: Int(expiry.into()),
                };
                match at {
                    Ok(index) => self.grants[index] = row,
                    Err(index) => self.grants.insert(index, row),
                }
                Decision::Granted
            }
            Ok(None) => {
                if let Some(spender) = p.spender {
                    let allowed = at
                        .ok()
                        .and_then(|index| self.grants.get(index))
                        .is_some_and(|grant| {
                            uint(&grant.activation_position)
                                .is_ok_and(|activation| activation < p.position)
                                && uint(&grant.expires_at_ns)
                                    .is_ok_and(|expiry| p.ledger_time_ns < expiry)
                                && unhex(&grant.spender_principal)
                                    .ok()
                                    .and_then(|bytes| account_id(&bytes, &[0; 32]).ok())
                                    == Some(spender)
                        });
                    if allowed {
                        Decision::Gameplay
                    } else {
                        Decision::Rejected("UNAUTHORIZED_SPENDER")
                    }
                } else {
                    Decision::Gameplay
                }
            }
        };
        self.last_position = Some(Int(p.position.into()));
        self.ledger_time_ns = Int(p.ledger_time_ns.into());
        Ok(decision)
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

/// Exact state-only successor transition. The authenticated host must still
/// establish its source cutoff and commit boundary before publishing this state.
pub fn migrate(mut predecessor: crate::world::World) -> Result<crate::world::World> {
    predecessor.validate()?;
    if predecessor.version != 11 {
        return Err("AUTH_V3_PREDECESSOR".into());
    }
    let historical = match predecessor.authorization.take() {
        Some(AuthorizationState::Historical(value)) => value,
        _ => return Err("AUTH_V3_PREDECESSOR".into()),
    };
    predecessor.authorization = Some(AuthorizationState::Rows(RegistryV3::from_v2(&historical)?));
    // The first tariff observed after activation is announced at the next
    // midnight and effective the following midnight. Existing announced
    // tariffs keep their historical linear meaning through that boundary.
    let day = b2z_protocol::economy17::DAY_NS;
    let elapsed = crate::playability::elapsed(
        &predecessor
            .playability
            .as_ref()
            .ok_or("EXPECTED_V6")?
            .elapsed_ns,
    )?;
    let formula_start = elapsed
        .checked_div(day)
        .and_then(|days| days.checked_add(2))
        .and_then(|days| days.checked_mul(day))
        .ok_or("SUCCESSOR_TARIFF_BOUNDARY_OVERFLOW")?;
    predecessor.economy_formula_start_ns = Some(Int(formula_start.into()));
    predecessor.version = 12;
    predecessor.validate()?;
    Ok(predecessor)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::delegation_v18::Decision;
    use b2z_protocol::delegation::Payment;
    use dtr_wire::{decode, encode, hash, hex, unhex};

    #[test]
    fn paid_predecessor_state_migrates_without_mutating_historical_bytes() {
        let vector: serde_json::Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/b2z-delegation-v18.json"
        ))
        .unwrap();
        let original = unhex(vector["execution"]["state"].as_str().unwrap()).unwrap();
        let previous = crate::world::World::decode(&original).unwrap();
        assert_eq!(previous.version, 10);
        let mut reservoir_predecessor = previous.clone();
        reservoir_predecessor.reservoirs = Some(String::new());
        let compact = crate::reservoirs::migrate_compact(reservoir_predecessor).unwrap();
        let successor = migrate(compact.clone()).unwrap();
        assert_eq!(successor.version, 12);
        let day = b2z_protocol::economy17::DAY_NS;
        let previous_ns =
            crate::playability::elapsed(&compact.playability.as_ref().unwrap().elapsed_ns).unwrap();
        assert_eq!(
            successor.economy_formula_start_ns,
            Some(Int(((previous_ns / day + 2) * day).into()))
        );
        assert_eq!(previous.encode().unwrap(), original);
        assert_eq!(
            hash(&successor.encode().unwrap()),
            "397f1ea8f24d4fc646d2baeb1e6971bab834c12ab4d2ab2510bc3b975988887d"
        );
        assert_eq!(
            crate::world::World::decode(&successor.encode().unwrap()).unwrap(),
            successor
        );
        assert!(migrate(successor).is_err());
    }

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
    fn schema12_world_encodes_digit_leading_grant_after_paid_state_migration() {
        let vector: serde_json::Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/b2z-delegation-v18.json"
        ))
        .unwrap();
        let old_bytes = unhex(vector["execution"]["state"].as_str().unwrap()).unwrap();
        let mut old = crate::world::World::decode(&old_bytes).unwrap();
        old.reservoirs = Some(String::new());
        let mut world = migrate(crate::reservoirs::migrate_compact(old).unwrap()).unwrap();
        let mut grant =
            Payment::decode(&unhex(vector["envelope"].as_str().unwrap()).unwrap()).unwrap();
        assert!(hex(&grant.from).starts_with('2'));
        let registry = match world.authorization.as_mut().unwrap() {
            AuthorizationState::Rows(rows) => rows,
            AuthorizationState::Historical(_) => panic!("Schema12 requires grant rows"),
        };
        grant.to = unhex(&registry.recipient).unwrap().try_into().unwrap();
        grant.position = registry
            .last_position
            .as_ref()
            .map(|p| uint(p).unwrap() + 1)
            .unwrap_or(0);
        grant.ledger_time_ns = grant
            .ledger_time_ns
            .max(uint(&registry.ledger_time_ns).unwrap())
            + 1;
        grant.amount = 0;
        grant.spender = None;
        grant.memo = Some(unhex(vector["grant_memo"].as_str().unwrap()).unwrap());
        assert_eq!(
            registry.apply(&grant, grant.position).unwrap(),
            Decision::Granted
        );
        let encoded = world.encode().unwrap();
        let decoded = crate::world::World::decode(&encoded).unwrap();
        assert_eq!(decoded, world);
        assert_eq!(decoded.encode().unwrap(), encoded);
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
        let second_account = payment.spender.unwrap();
        let mut grant = payment;
        grant.position = 4;
        grant.spender = None;
        grant.amount = 0;
        grant.memo = Some(unhex(vector["grant_memo"].as_str().unwrap()).unwrap());
        assert_eq!(populated.apply(&grant, 4).unwrap(), Decision::Granted);
        grant.position = 5;
        grant.from = second_account;
        assert_eq!(populated.apply(&grant, 5).unwrap(), Decision::Granted);
        let mut duplicate = RegistryV3::from_v2(&populated).unwrap();
        assert_eq!(duplicate.grants.len(), 2);
        assert_eq!(
            hash(&encode(&duplicate).unwrap()),
            "21553782195144ba08f801724dd016868aa077bda59e2d7c6e8696108ac66c53"
        );
        duplicate.grants.push(duplicate.grants[0].clone());
        assert!(duplicate.validate().is_err());
    }

    #[test]
    fn direct_grant_and_revoke_match_historical_decisions() {
        let (mut payment, vector) = {
            let value: serde_json::Value = serde_json::from_str(include_str!(
                "../../../tests/fixtures/b2z-delegation-v18.json"
            ))
            .unwrap();
            (
                Payment::decode(&unhex(value["envelope"].as_str().unwrap()).unwrap()).unwrap(),
                value,
            )
        };
        let mut old = Registry::empty(hex(&payment.to)).unwrap();
        let mut rows = RegistryV3::from_v2(&old).unwrap();
        payment.position = 4;
        payment.amount = 0;
        payment.spender = None;
        payment.memo = Some(unhex(vector["grant_memo"].as_str().unwrap()).unwrap());
        assert_eq!(
            old.apply(&payment, 4).unwrap(),
            rows.apply(&payment, 4).unwrap()
        );
        assert_eq!(rows.to_v2().unwrap(), old);
        assert_eq!(
            hash(&encode(&rows).unwrap()),
            "d50ecde672ae35c869752e3b8267e92e046735694fe60622df74b540869ffe6d"
        );
        payment.position = 5;
        payment.memo = Some(vec![0xb2, 0xd1, 0x80]);
        assert_eq!(
            old.apply(&payment, 5).unwrap(),
            rows.apply(&payment, 5).unwrap()
        );
        assert_eq!(rows.to_v2().unwrap(), old);
        assert!(rows.grants.is_empty());
    }

    #[test]
    fn direct_rows_accept_every_account_leading_hex_digit() {
        let vector: serde_json::Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/b2z-delegation-v18.json"
        ))
        .unwrap();
        let mut payment =
            Payment::decode(&unhex(vector["envelope"].as_str().unwrap()).unwrap()).unwrap();
        let mut accounts = std::collections::BTreeMap::new();
        for value in 0..=u8::MAX {
            let mut principal = [value; 29];
            principal[28] = 2;
            let payer = hex(&account_id(&principal, &[0; 32]).unwrap());
            accounts.insert(payer.chars().next().unwrap(), payer);
        }
        assert_eq!(accounts.len(), 16);
        for payer in accounts.values() {
            let mut rows =
                RegistryV3::from_v2(&Registry::empty(hex(&payment.to)).unwrap()).unwrap();
            payment.from = unhex(payer).unwrap().try_into().unwrap();
            payment.position = 4;
            payment.amount = 0;
            payment.spender = None;
            payment.memo = Some(unhex(vector["grant_memo"].as_str().unwrap()).unwrap());
            assert_eq!(rows.apply(&payment, 4).unwrap(), Decision::Granted);
            let encoded = encode(&rows).unwrap();
            assert_eq!(decode::<RegistryV3>(&encoded).unwrap(), rows);
        }
    }
}
