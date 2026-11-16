//! Independently execute all combined vectors and recover actual cursor state.
use b2z_native::{world::World, Cursor, Input};
use dtr_wire::{decode, hash, hex, unhex};
use serde_json::Value;
#[test]
fn combined_exact_outputs_and_durable_pending_annotations() {
    let fixture: Value =
        serde_json::from_str(include_str!("../../../tests/fixtures/combined-v11.json")).unwrap();
    assert_eq!(
        b2z_native::combined_v11::identity().unwrap(),
        fixture["identity"]
    );
    let mut recovered_pending = false;
    for row in fixture["rows"].as_array().unwrap() {
        let state = unhex(row["initial_hex"].as_str().unwrap()).unwrap();
        let inputs: Vec<Input> =
            decode(&unhex(row["inputs_hex"].as_str().unwrap()).unwrap()).unwrap();
        let context: Value = decode(&unhex(row["context_hex"].as_str().unwrap()).unwrap()).unwrap();
        let mut c = Cursor::begin(&state, inputs, &context).unwrap();
        let budget = if row["recover_each_work_unit"] == true {
            1
        } else {
            17
        };
        let mut slices = 0;
        loop {
            let (_, done) = c.step(budget).unwrap();
            slices += 1;
            if budget == 1 || slices % 13 == 0 {
                let bytes = c.snapshot().unwrap();
                let v: Value = decode(&bytes).unwrap();
                assert_eq!(v["cursor"]["v6"]["clearance_rules"], true);
                assert_eq!(v["cursor"]["v6"]["war_cry_rules"], true);
                recovered_pending |= v["cursor"]["v6"]["pending_cry"].is_string();
                c = Cursor::restore(&bytes, &hash(&bytes)).unwrap();
            }
            if done {
                break;
            }
            assert!(slices < 100000, "{}", row["name"]);
        }
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
                hex(&bytes),
                row["outputs"][kind]["hex"],
                "{}: {kind} exact bytes",
                row["name"]
            );
            assert_eq!(
                hash(&bytes),
                row["outputs"][kind]["sha256"],
                "{}: {kind} authenticated hash",
                row["name"]
            );
        }
    }
    assert!(
        recovered_pending,
        "recover a pending composed annotation before its first successful launch"
    );
}
