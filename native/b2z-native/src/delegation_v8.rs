//! Experimental rules-8 authorization. No network, caller identity or ambient time.
//! Only an ordered normalized Ledger transfer may change this registry.
use b2z_protocol::delegation::{
    account_id, account_ok, decode_authorization, AuthorizationMemo, Payment, LIFETIME_NS,
};
use dtr_wire::{hex, unhex, Int, Result};
use num_traits::ToPrimitive;
use serde::{Deserialize, Serialize};
pub const MAX_ACCOUNTS: usize = 1024;
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Grant {
    pub account: String,
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
    pub grants: Vec<Grant>,
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
            version: 1,
            recipient,
            ledger_time_ns: Int(0.into()),
            last_position: None,
            grants: vec![],
        })
    }
    pub fn validate(&self) -> Result<()> {
        account(&self.recipient)?;
        uint(&self.ledger_time_ns)?;
        if self.version != 1
            || self.grants.len() > MAX_ACCOUNTS
            || self.grants.windows(2).any(|p| p[0].account >= p[1].account)
        {
            return Err("AUTH_REGISTRY".into());
        }
        if let Some(last) = &self.last_position {
            uint(last)?;
        }
        for g in &self.grants {
            account(&g.account)?;
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
    pub fn apply(&mut self, p: &Payment, input_position: u64) -> Result<Decision> {
        self.validate()?;
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
            Ok(Some(AuthorizationMemo::Revoke)) => {
                self.grants.retain(|g| g.account != hex(&p.from));
                Decision::Revoked
            }
            Ok(Some(AuthorizationMemo::Grant(principal))) => {
                let expiry = p
                    .ledger_time_ns
                    .checked_add(LIFETIME_NS)
                    .ok_or("AUTH_TIME_OVERFLOW")?;
                let a = hex(&p.from);
                // Lazy bounded expiry cleanup; never a periodic registry timer.
                self.grants
                    .retain(|g| uint(&g.expires_at_ns).unwrap() > p.ledger_time_ns);
                if !self.grants.iter().any(|g| g.account == a) && self.grants.len() == MAX_ACCOUNTS
                {
                    Decision::Rejected("DELEGATION_CAPACITY")
                } else {
                    let grant = Grant {
                        account: a.clone(),
                        spender_principal: hex(&principal),
                        activation_position: Int(p.position.into()),
                        expires_at_ns: Int(expiry.into()),
                    };
                    match self.grants.binary_search_by(|g| g.account.cmp(&a)) {
                        Ok(i) => self.grants[i] = grant,
                        Err(i) => self.grants.insert(i, grant),
                    };
                    Decision::Granted
                }
            }
            Ok(None) => {
                if let Some(spender) = p.spender {
                    let from = hex(&p.from);
                    let grant = self
                        .grants
                        .binary_search_by(|g| g.account.cmp(&from))
                        .ok()
                        .map(|i| &self.grants[i]);
                    if let Some(g) = grant {
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

/// Pure schema addition, called only by the authenticated drained host transition.
pub fn migrate(world: &crate::world::World, recipient: String) -> Result<crate::world::World> {
    world.validate()?;
    if world.version != 6 || world.playability.as_ref().unwrap().authorization.is_some() {
        return Err("EXPECTED_ENTRY_PREDECESSOR".into());
    }
    let mut next = world.clone();
    next.playability.as_mut().unwrap().authorization = Some(Registry::empty(recipient)?);
    next.validate()?;
    Ok(next)
}
pub fn configuration() -> &'static [u8] {
    include_bytes!("../../../apps/b2z-observer/configuration-delegation.bin")
}
pub fn identity() -> Result<serde_json::Value> {
    Ok(
        serde_json::json!({"rules_hash":dtr_wire::hash(b"B2Z_DELEGATED_PAYMENT_RULES_08"),"schema_hash":dtr_wire::hash(b"B2Z_STATE_06_AUTHORIZATION_01"),"config_hash":dtr_wire::hash(configuration())}),
    )
}
