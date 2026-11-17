//! Shared public outputs, independent Rust execution and actual cursor recovery.
use b2z_native::{world::World, Cursor, Input};
use dtr_wire::{decode, hash, hex, unhex};
use serde_json::Value;
#[test]
fn exact_boundary_public_outputs_and_recovery() {
    let f: Value = serde_json::from_str(include_str!(
        "../../../tests/fixtures/boundary-deflector-v12.json"
    ))
    .unwrap();
    assert_eq!(
        b2z_native::deflectors_v12::identity().unwrap(),
        f["identity"]
    );
    for row in f["rows"].as_array().unwrap() {
        if let Ok(filter) = std::env::var("B2Z_BOUNDARY_VECTOR_FILTER") {
            if row["name"].as_str() != Some(filter.as_str()) {
                continue;
            }
        }
        eprintln!("boundary vector {}", row["name"]);
        let initial = unhex(row["initial_hex"].as_str().unwrap()).unwrap();
        let inputs: Vec<Input> =
            decode(&unhex(row["inputs_hex"].as_str().unwrap()).unwrap()).unwrap();
        let context: Value = decode(&unhex(row["context_hex"].as_str().unwrap()).unwrap()).unwrap();
        let mut c = Cursor::begin(&initial, inputs, &context).unwrap();
        let budget = if row["recover_each_work_unit"] == true {
            1
        } else {
            17
        };
        let mut count = 0;
        loop {
            let (_, done) = c.step(budget).unwrap();
            count += 1;
            if count % 1000 == 0 {
                eprintln!("boundary progress {} work calls {}", row["name"], count);
            }
            if budget == 1 || count % 13 == 0 {
                let b = c.snapshot().unwrap();
                c = Cursor::restore(&b, &hash(&b)).unwrap();
            }
            if done {
                break;
            }
            assert!(count < 100000, "{}", row["name"]);
        }
        c.finalize_elapsed(row["observed_ns"].as_str().unwrap().parse().unwrap())
            .unwrap();
        let out = c.result().unwrap();
        World::decode(&out.state).unwrap();
        for (kind, bytes) in [
            ("state", out.state),
            ("events", out.events),
            ("scores", out.scores),
        ] {
            assert_eq!(
                hash(&bytes),
                row["outputs"][kind]["sha256"],
                "{} {kind} hash",
                row["name"]
            );
            assert_eq!(
                hex(&bytes),
                row["outputs"][kind]["hex"],
                "{} {kind} exact bytes",
                row["name"]
            );
        }
    }
}
