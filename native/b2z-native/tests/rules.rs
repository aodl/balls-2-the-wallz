//! Complete logical v6 segments and continuation recovery, independent JS bytes.
use b2z_native::{world::World, Cursor, Input};
use dtr_wire::{decode, hash, unhex};
use serde_json::Value;
fn fixture() -> Value {
    serde_json::from_str(include_str!("../../../tests/fixtures/rules-v6.json")).unwrap()
}
#[test]
fn complete_segments_preserve_exact_independent_reference_outputs() {
    let f = fixture();
    for (name, v) in f["cases"].as_object().unwrap() {
        let state = unhex(v["state_hex"].as_str().unwrap()).unwrap();
        let inputs: Vec<Input> =
            decode(&unhex(v["inputs_hex"].as_str().unwrap()).unwrap()).unwrap();
        let context: Value = decode(&unhex(v["seal_hex"].as_str().unwrap()).unwrap()).unwrap();
        let mut c = Cursor::begin(&state, inputs, &context).unwrap();
        let mut work = 0;
        loop {
            let (used, done) = c.step(3).unwrap();
            work += used;
            let bytes = c.snapshot().unwrap();
            c = Cursor::restore(&bytes, &hash(&bytes)).unwrap();
            if done {
                break;
            }
            assert!(work < 100000, "{name}");
        }
        assert!(c.result().is_err(), "{name}: lifecycle fact is mandatory");
        let before = c.snapshot().unwrap();
        assert!(c.finalize_elapsed(0).is_err());
        assert_eq!(before, c.snapshot().unwrap());
        let now = v["observed_ns"].as_str().unwrap().parse().unwrap();
        c.finalize_elapsed(now).unwrap();
        assert!(c.finalize_elapsed(now).is_err());
        let o = c.result().unwrap();
        assert_eq!(hash(&o.state), v["state_sha256"], "{name}: state");
        assert_eq!(hash(&o.events), v["events_sha256"], "{name}: events");
        assert_eq!(hash(&o.scores), v["scores_sha256"], "{name}: scores");
        World::decode(&o.state).unwrap();
    }
}
#[test]
fn typed_completion_requires_explicit_time_and_leaves_failed_proposals_unchanged() {
    use b2z_native::host::ExecutionSession;
    let f = fixture();
    let v = &f["cases"]["idle"];
    let state = unhex(v["state_hex"].as_str().unwrap()).unwrap();
    let context: Value = decode(&unhex(v["seal_hex"].as_str().unwrap()).unwrap()).unwrap();
    let bytes = Cursor::begin(&state, vec![], &context)
        .unwrap()
        .snapshot()
        .unwrap();
    let session = ExecutionSession::restore(&bytes, &hash(&bytes), 1024 * 1024).unwrap();
    assert!(session.propose_step(512, 1024 * 1024).is_err());
    assert!(session.propose_step_at(512, 1024 * 1024, 0).is_err());
    assert_eq!(session.snapshot().unwrap(), bytes);
    let (next, p, typed) = session
        .propose_step_at(
            512,
            1024 * 1024,
            v["observed_ns"].as_str().unwrap().parse().unwrap(),
        )
        .unwrap();
    assert!(p.complete);
    let restored = Cursor::restore(&next, &hash(&next)).unwrap();
    assert_eq!(hash(&restored.result().unwrap().state), v["state_sha256"]);
    assert_eq!(
        hash(&typed.unwrap().result().unwrap().events),
        v["events_sha256"]
    );
    assert_eq!(session.snapshot().unwrap(), bytes);
}
