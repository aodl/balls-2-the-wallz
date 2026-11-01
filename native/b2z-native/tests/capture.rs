//! Cross-language, resumable capture proposals; no installed-IC claim.
use b2z_native::{capture_v6::Job, world::World};
use dtr_wire::{decode, encode, hash, unhex};
use serde_json::Value;
fn fixture() -> Value {
    serde_json::from_str(include_str!("../../../tests/fixtures/capture-v6.json")).unwrap()
}
#[test]
fn atomic_capture_and_mutual_destruction_match_independent_js() {
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
        let committed = w.encode().unwrap();
        assert!(j.step(&mut w).unwrap());
        assert_eq!(w.encode().unwrap(), committed);
    }
}
#[test]
fn invalid_pair_or_cannon_target_never_mutates_the_world() {
    let f = fixture();
    let v = &f["cases"]["both"];
    let w = World::decode(&unhex(v["before_hex"].as_str().unwrap()).unwrap()).unwrap();
    let before = w.encode().unwrap();
    let ball = v["ball"].as_u64().unwrap() as u32;
    for cell in [100, 106, 1103] {
        assert!(Job::capture(&w, cell, ball).is_err());
    }
    assert!(Job::cleanup(&w, &[[1, 2]]).is_err());
    assert!(Job::cleanup(&w, &[[ball, 1], [ball, 2]]).is_err());
    assert_eq!(w.encode().unwrap(), before);
}
