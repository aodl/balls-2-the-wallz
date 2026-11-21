//! Rules15 changes new structure sites without changing the schema7 world.
use dtr_wire::{hash, Result};
use serde_json::{json, Value};
use std::sync::OnceLock;

pub fn configuration() -> &'static [u8] {
    include_bytes!("../../../apps/b2z-observer/configuration-spacing.bin")
}

pub fn configuration_hash() -> &'static str {
    static HASH: OnceLock<String> = OnceLock::new();
    HASH.get_or_init(|| hash(configuration()))
}

pub fn identity() -> Result<Value> {
    static IDENTITY: OnceLock<Value> = OnceLock::new();
    if let Some(identity) = IDENTITY.get() {
        return Ok(identity.clone());
    }
    let mut identity = crate::shout::identity()?;
    identity["rules_hash"] = json!(hash(b"B2Z_STRUCTURE_SPACING_RULES_15"));
    identity["config_hash"] = json!(configuration_hash());
    Ok(IDENTITY.get_or_init(|| identity).clone())
}
