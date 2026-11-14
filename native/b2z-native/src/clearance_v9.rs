//! Rules-only successor to entry v7; v8 remains delegated-payment experimental.
pub fn configuration() -> &'static [u8] {
    include_bytes!("../../../apps/b2z-observer/configuration-clearance.bin")
}
pub fn identity() -> dtr_wire::Result<serde_json::Value> {
    let mut v = crate::entry_v7::identity()?;
    v["rules_hash"] = serde_json::json!(dtr_wire::hash(b"B2Z_TERRITORY_CLEARANCE_RULES_09"));
    v["config_hash"] = serde_json::json!(dtr_wire::hash(configuration()));
    Ok(v)
}
