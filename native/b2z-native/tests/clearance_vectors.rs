//! Independent Rust replay of additive JS rules-9 vectors; no historical golden edits.
use b2z_native::{world::World, Cursor, Input};
use dtr_wire::{decode, hash, unhex};
use serde_json::Value;
#[test]
fn clearance_matches_reference_and_restores_its_own_continuations() {
    let f: Value =
        serde_json::from_str(include_str!("../../../tests/fixtures/clearance-v9.json")).unwrap();
    for row in f["rows"].as_array().unwrap() {
        let initial = unhex(row["initial_hex"].as_str().unwrap()).unwrap();
        let inputs: Vec<Input> =
            decode(&unhex(row["inputs_hex"].as_str().unwrap()).unwrap()).unwrap();
        let context: Value = decode(&unhex(row["context_hex"].as_str().unwrap()).unwrap()).unwrap();
        let mut c = Cursor::begin(&initial, inputs, &context).unwrap();
        let mut slices = 0;
        loop {
            let (_, done) = c.step([1, 7, 31, 127][slices % 4]).unwrap();
            slices += 1;
            if slices % 17 == 0 {
                let bytes = c.snapshot().unwrap();
                c = Cursor::restore(&bytes, &hash(&bytes)).unwrap();
            }
            if done {
                break;
            }
            assert!(slices < 100000, "{}", row["name"]);
        }
        assert!(c.result().is_err());
        c.finalize_elapsed(row["observed_ns"].as_str().unwrap().parse().unwrap())
            .unwrap();
        let result = c.result().unwrap();
        World::decode(&result.state).unwrap();
        for (kind, bytes) in [
            ("state", result.state),
            ("events", result.events),
            ("scores", result.scores),
        ] {
            assert_eq!(
                hash(&bytes),
                row["outputs"][kind]["sha256"],
                "{}: {kind}",
                row["name"]
            );
        }
    }
}
