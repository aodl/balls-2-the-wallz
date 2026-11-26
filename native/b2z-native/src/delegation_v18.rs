//! Rules18 candidate authorization. Only authenticated Ledger facts select a grant.
//! Only an ordered normalized Ledger transfer may change this registry.
use b2z_protocol::delegation::{
    account_id, account_ok, decode_authorization, AuthorizationMemo, Payment, LIFETIME_NS,
};
use dtr_wire::{hex, unhex, Int, Result};
use num_traits::ToPrimitive;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Grant {
    pub spender_principal: String,
    pub activation_position: Int,
    pub expires_at_ns: Int,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Registry {
    pub version: u32,
    pub recipient: String,
    pub ledger_time_ns: Int,
    pub last_position: Option<Int>,
    pub grants: BTreeMap<String, Grant>,
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Decision {
    Gameplay,
    Granted,
    Revoked,
    Rejected(&'static str),
}
fn uint(i: &Int) -> Result<u64> {
    i.0.to_u64().ok_or_else(|| "AUTH_INTEGER".into())
}
fn account(s: &str) -> Result<[u8; 32]> {
    let a: [u8; 32] = unhex(s)?.try_into().map_err(|_| "AUTH_ACCOUNT")?;
    if hex(&a) != s || !account_ok(&a) {
        return Err("AUTH_ACCOUNT".into());
    }
    Ok(a)
}
impl Registry {
    pub fn empty(recipient: String) -> Result<Self> {
        account(&recipient)?;
        Ok(Self {
            version: 2,
            recipient,
            ledger_time_ns: Int(0.into()),
            last_position: None,
            grants: BTreeMap::new(),
        })
    }
    pub fn validate(&self) -> Result<()> {
        account(&self.recipient)?;
        uint(&self.ledger_time_ns)?;
        if self.version != 2 {
            return Err("AUTH_REGISTRY".into());
        }
        if let Some(last) = &self.last_position {
            uint(last)?;
        }
        for (payer, g) in &self.grants {
            account(payer)?;
            let principal = unhex(&g.spender_principal)?;
            if principal.len() != 29
                || principal[28] != 2
                || hex(&principal) != g.spender_principal
                || uint(&g.expires_at_ns)? < LIFETIME_NS
                || self
                    .last_position
                    .as_ref()
                    .is_none_or(|p| g.activation_position > *p)
            {
                return Err("AUTH_GRANT".into());
            }
            uint(&g.activation_position)?;
        }
        Ok(())
    }
    /// Advance only in authenticated Ledger order. Expiry uses the immutable
    /// Ledger block timestamp, never client created_at_time or current allowance.
    /// Registry validation belongs at the canonical state boundary. Individual
    /// operations use keyed lookup and do not traverse independent grants.
    pub fn apply(&mut self, p: &Payment, input_position: u64) -> Result<Decision> {
        p.encode()?;
        if p.position != input_position
            || hex(&p.to) != self.recipient
            || self
                .last_position
                .as_ref()
                .is_some_and(|n| p.position <= uint(n).unwrap())
            || p.ledger_time_ns < uint(&self.ledger_time_ns)?
        {
            return Err("AUTH_SOURCE_ORDER_OR_DESTINATION".into());
        }
        // Decode before mutation so all integrity failures leave the registry intact.
        let setup = decode_authorization(p.memo.as_deref().unwrap_or(&[]));
        let decision = match setup {
            Err(_) => Decision::Rejected("INVALID_DELEGATION"),
            Ok(Some(_)) if p.spender.is_some() => Decision::Rejected("DELEGATED_SETUP_FORBIDDEN"),
            Ok(Some(_)) if p.amount != 0 => Decision::Rejected("DELEGATION_SETUP_AMOUNT"),
            Ok(Some(AuthorizationMemo::Revoke)) => {
                self.grants.remove(&hex(&p.from));
                Decision::Revoked
            }
            Ok(Some(AuthorizationMemo::Grant(principal))) => {
                let expiry = p
                    .ledger_time_ns
                    .checked_add(LIFETIME_NS)
                    .ok_or("AUTH_TIME_OVERFLOW")?;
                self.grants.insert(
                    hex(&p.from),
                    Grant {
                        spender_principal: hex(&principal),
                        activation_position: Int(p.position.into()),
                        expires_at_ns: Int(expiry.into()),
                    },
                );
                Decision::Granted
            }
            Ok(None) => {
                if let Some(spender) = p.spender {
                    if let Some(g) = self.grants.get(&hex(&p.from)) {
                        if uint(&g.activation_position)? < p.position
                            && p.ledger_time_ns < uint(&g.expires_at_ns)?
                            && account_id(&unhex(&g.spender_principal)?, &[0; 32])? == spender
                        {
                            Decision::Gameplay
                        } else {
                            Decision::Rejected("UNAUTHORIZED_SPENDER")
                        }
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
}

pub fn configuration() -> &'static [u8] {
    include_bytes!("../../../apps/b2z-observer/configuration-delegated.bin")
}

pub fn identity() -> serde_json::Value {
    use dtr_wire::hash;
    serde_json::json!({
        "rules_hash": hash(b"B2Z_DELEGATED_PAYMENT_RULES_18"),
        "schema_hash": hash(b"B2Z_STATE_10_ORDERED_AUTHORIZATION"),
        "config_hash": hash(configuration()),
    })
}

/// Exact canonical conversion. The front and the host remain fenced until the
/// source transition, receipts and successor execution have been qualified.
pub fn migrate(mut world: crate::world::World, recipient: String) -> Result<crate::world::World> {
    world.validate()?;
    if world.version != 9 {
        return Err("EXPECTED_ECONOMY_PREDECESSOR".into());
    }
    world.authorization = Some(crate::delegation_v20::AuthorizationState::Historical(
        Registry::empty(recipient)?,
    ));
    world.version = 10;
    world.validate()?;
    Ok(world)
}

pub(crate) fn transfer(input: &crate::Input) -> Result<(Payment, u64)> {
    let payment = Payment::decode(&unhex(&input.payload_hex)?)?;
    let position = uint(&input.position)?;
    Ok((payment, position))
}

pub(crate) fn receipt_transfer(payment: &Payment) -> serde_json::Value {
    serde_json::json!({
        "spender": payment.spender.as_ref().map(|bytes| hex(bytes)),
        "to": hex(&payment.to),
        "fee": Int(payment.fee.into()),
        "ledger_recorded_ns": Int(payment.ledger_time_ns.into()),
        "created_at_ns": payment.created_at_ns.map(|time| Int(time.into())),
        "legacy_memo": Int(payment.legacy_memo.into()),
        "memo": payment.memo.as_ref().map(|bytes| hex(bytes)),
        "raw_digest": hex(&payment.raw_digest),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use b2z_protocol::delegation::encode_authorization;

    fn vector() -> (Payment, serde_json::Value) {
        let vector: serde_json::Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/b2z-delegation-v18.json"
        ))
        .unwrap();
        let p = Payment::decode(&unhex(vector["envelope"].as_str().unwrap()).unwrap()).unwrap();
        (p, vector)
    }

    #[test]
    fn exact_shared_format_and_rules17_tariff_input() {
        let (p, vector) = vector();
        assert_eq!(hex(&p.encode().unwrap()), vector["envelope"]);
        let pricing = p.pricing_envelope().unwrap();
        assert_eq!(hex(&pricing), vector["rules17_payload"]);
        assert_eq!(
            b2z_protocol::economy17::untimed(&pricing).unwrap().1,
            p.ledger_time_ns
        );
        assert_ne!(p.created_at_ns, Some(p.ledger_time_ns));
    }

    #[test]
    fn migration_matches_the_independent_schema10_fixture() {
        use crate::world::World;
        use dtr_wire::hash;
        let (p, vector) = vector();
        let fixtures: serde_json::Value = serde_json::from_str(include_str!(
            "../../../tests/fixtures/context-structures-v13.json"
        ))
        .unwrap();
        let base = unhex(fixtures["rows"][0]["initial_hex"].as_str().unwrap()).unwrap();
        let old = crate::reservoirs::migrate(World::decode(&base).unwrap()).unwrap();
        let expected = &vector["migration"];
        let activated = expected["activated_ns"].as_str().unwrap().parse().unwrap();
        let r17 = crate::economy17::migrate(old, activated).unwrap();
        assert_eq!(hash(&r17.encode().unwrap()), expected["before_sha256"]);
        let mut r18 = migrate(r17.clone(), hex(&p.to)).unwrap();
        assert_eq!(hash(&r18.encode().unwrap()), expected["after_sha256"]);
        assert_eq!(identity(), expected["identity"]);
        assert!(migrate(r18.clone(), hex(&p.to)).is_err());
        assert!(
            matches!(r18.authorization.take().unwrap(), crate::delegation_v20::AuthorizationState::Historical(registry) if registry.grants.is_empty())
        );
        r18.version = 9;
        assert_eq!(r18, r17);
    }

    #[test]
    fn delegated_execution_matches_independent_js() {
        let (_, vector) = vector();
        let execution = &vector["execution"];
        let state = unhex(execution["state"].as_str().unwrap()).unwrap();
        let mut seal = execution["seal"].clone();
        for key in ["logical_start", "logical_end"] {
            seal[key] = serde_json::json!(Int(execution["seal"][key]
                .as_str()
                .unwrap()
                .parse::<u64>()
                .unwrap()
                .into()));
        }
        let inputs: Vec<_> = execution["inputs"]
            .as_array()
            .unwrap()
            .iter()
            .map(|i| crate::Input {
                position: Int(i["position"]
                    .as_str()
                    .unwrap()
                    .parse::<u64>()
                    .unwrap()
                    .into()),
                payload_hex: i["payload_hex"].as_str().unwrap().into(),
            })
            .collect();
        let mut c = crate::Cursor::begin(&state, inputs, &seal).unwrap();
        loop {
            if c.step(17).unwrap().1 {
                break;
            }
            let saved = c.snapshot().unwrap();
            c = crate::Cursor::restore(&saved, &dtr_wire::hash(&saved)).unwrap();
        }
        c.finalize_elapsed(execution["observed_ns"].as_str().unwrap().parse().unwrap())
            .unwrap();
        let output = c.result().unwrap();
        for (k, bytes) in [
            ("state", output.state),
            ("events", output.events),
            ("scores", output.scores),
        ] {
            assert_eq!(dtr_wire::hash(&bytes), execution["output"][k], "{k}");
        }
    }

    #[test]
    fn keyed_grants_survive_beyond_the_historical_limit() {
        let (mut p, vector) = vector();
        let mut registry = Registry::empty(hex(&p.to)).unwrap();
        let grant = unhex(vector["grant_memo"].as_str().unwrap()).unwrap();
        let spender = p.spender.take();
        let memo = p.memo.take();
        let amount = p.amount;
        for n in 0u16..2048 {
            let mut raw = [0u8; 29];
            raw[..2].copy_from_slice(&n.to_be_bytes());
            raw[28] = 2;
            p.position = n.into();
            p.from = account_id(&raw, &[0; 32]).unwrap();
            p.memo = Some(grant.clone());
            p.amount = 0;
            assert_eq!(registry.apply(&p, p.position).unwrap(), Decision::Granted);
        }
        assert_eq!(registry.grants.len(), 2048);
        registry.validate().unwrap();
        assert!(registry.apply(&p, p.position).is_err());
        p.position += 1;
        p.memo = memo.clone();
        p.spender = spender;
        p.amount = amount;
        assert_eq!(registry.apply(&p, p.position).unwrap(), Decision::Gameplay);
        p.position += 1;
        p.ledger_time_ns += LIFETIME_NS;
        assert_eq!(
            registry.apply(&p, p.position).unwrap(),
            Decision::Rejected("UNAUTHORIZED_SPENDER")
        );
        p.position += 1;
        p.spender = None;
        p.amount = 0;
        p.memo = Some(encode_authorization(&AuthorizationMemo::Revoke).unwrap());
        assert_eq!(registry.apply(&p, p.position).unwrap(), Decision::Revoked);
        assert_eq!(registry.grants.len(), 2047);
        p.position += 1;
        p.memo = memo;
        p.spender = spender;
        p.amount = amount;
        assert_eq!(
            registry.apply(&p, p.position).unwrap(),
            Decision::Rejected("UNAUTHORIZED_SPENDER")
        );
    }
}
