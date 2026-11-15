//! Independent annotation identity. No clearance/delegation activation.
pub fn configuration() -> &'static [u8] {
    include_bytes!("../../../apps/b2z-observer/configuration-war-cry.bin")
}
pub fn identity() -> dtr_wire::Result<serde_json::Value> {
    let mut v = crate::entry_v7::identity()?;
    v["rules_hash"] = serde_json::json!(dtr_wire::hash(b"B2Z_WAR_CRY_RULES_10"));
    v["config_hash"] = serde_json::json!(dtr_wire::hash(configuration()));
    Ok(v)
}
