//! Successor-only capture immunity, non-anchor lifecycle and atomic cancellation.
use b2z_native::{capture_v6::Job, world::World};
use dtr_wire::{decode, encode, hash, unhex};
use serde_json::Value;
fn fixture() -> Value {
    serde_json::from_str(include_str!(
        "../../../tests/fixtures/boundary-deflector-topology-v12.json"
    ))
    .unwrap()
}
#[test]
fn successor_topology_removal_and_cancellation_match_independent_js() {
    let f = fixture();
    for (name, v) in f["cases"].as_object().unwrap() {
        let bytes = unhex(v["before_hex"].as_str().unwrap()).unwrap();
        let mut w = World::decode(&bytes).unwrap();
        let mut j = if v["pairs"].is_null() {
            Job::capture(
                &w,
                v["target"].as_u64().unwrap() as usize,
                v["ball"].as_u64().unwrap() as u32,
            )
            .unwrap()
        } else {
            Job::cleanup(
                &w,
                &serde_json::from_value::<Vec<[u32; 2]>>(v["pairs"].clone()).unwrap(),
            )
            .unwrap()
        };
        let mut work = 0;
        while !j.step(&mut w).unwrap() {
            assert_eq!(
                w.encode().unwrap(),
                bytes,
                "{name}: committed world changed during proposal"
            );
            j = decode(&encode(&j).unwrap()).unwrap();
            work += 1;
            assert!(work < 10000);
        }
        w.validate().unwrap();
        assert_eq!(hash(&w.encode().unwrap()), v["state_sha256"], "{name}");
        assert_eq!(
            hash(&encode(&j.event().unwrap()).unwrap()),
            v["event_sha256"],
            "{name}"
        );
        if !v["expiry"].is_null() {
            let expiry = &v["expiry"];
            let fences: Vec<b2z_native::playability::Fence> =
                decode(&unhex(expiry["fences_hex"].as_str().unwrap()).unwrap()).unwrap();
            let out = b2z_native::lifecycle_v6::expire(
                &w,
                expiry["observed_ns"].as_str().unwrap().parse().unwrap(),
                &fences,
            )
            .unwrap()
            .unwrap()
            .output;
            for (kind, bytes) in [
                ("state", out.state),
                ("events", out.events),
                ("scores", out.scores),
            ] {
                assert_eq!(
                    dtr_wire::hex(&bytes),
                    expiry["outputs"][kind]["hex"],
                    "{name} expiry {kind}"
                );
            }
        }
        let committed = w.encode().unwrap();
        assert!(j.step(&mut w).unwrap());
        assert_eq!(w.encode().unwrap(), committed);
    }
}
