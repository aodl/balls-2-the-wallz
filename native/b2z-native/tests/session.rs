//! Differential every-continuation proof for the private typed session.
use b2z_native::{
    host::{B2zHostKernel, ExecutionSession},
    Cursor, Input,
};
use dtr_host::Kernel;
use dtr_wire::{decode, hash, unhex};
use serde_json::Value;
#[test]
fn typed_sessions_equal_full_stateless_import_at_every_fixture_step() {
    for text in [
        include_str!("../../../tests/fixtures/b2z-v3-golden.json"),
        include_str!("../../../tests/fixtures/b2z-torus-v4.json"),
        include_str!("../../../tests/fixtures/prelaunch-pricing.json"),
    ] {
        let fixture: Value = serde_json::from_str(text).unwrap();
        for case in fixture["cases"].as_array().unwrap() {
            let initial = unhex(case["initial_hex"].as_str().unwrap()).unwrap();
            let inputs: Vec<Input> =
                decode(&unhex(case["inputs_hex"].as_str().unwrap()).unwrap()).unwrap();
            let context: Value =
                decode(&unhex(case["context_hex"].as_str().unwrap()).unwrap()).unwrap();
            let mut bytes = Cursor::begin(&initial, inputs, &context)
                .unwrap()
                .snapshot()
                .unwrap();
            let mut session = ExecutionSession::restore(&bytes, &hash(&bytes), 256 * 1024).unwrap();
            let mut ordinal = 0;
            loop {
                let budget = [1, 7, 31, 127, 511, 512][ordinal % 6];
                let (next, progress, typed) = session.propose_step(budget, 256 * 1024).unwrap();
                let (reference, expected) = B2zHostKernel.step(&bytes, budget).unwrap();
                assert_eq!(next, reference, "{} step {}", case["name"], ordinal);
                assert_eq!(
                    (progress.used, progress.complete),
                    (expected.used, expected.complete)
                );
                Cursor::restore(&next, &hash(&next)).unwrap(); // original full import
                assert_eq!(
                    session.snapshot().unwrap(),
                    bytes,
                    "proposal mutated its input"
                );
                session = typed.unwrap_or_else(|| {
                    ExecutionSession::restore(&next, &hash(&next), 256 * 1024).unwrap()
                });
                bytes = next;
                ordinal += 1;
                assert!(ordinal < 2_000_000);
                if progress.complete {
                    break;
                }
                if ordinal % 31 == 0 {
                    session = ExecutionSession::restore(&bytes, &hash(&bytes), 256 * 1024).unwrap();
                }
            }
            let out = session.result().unwrap();
            for (kind, actual) in [
                ("state", out.state),
                ("events", out.events),
                ("scores", out.scores),
            ] {
                assert_eq!(
                    actual,
                    unhex(case["outputs"][kind]["hex"].as_str().unwrap()).unwrap(),
                    "{} {}",
                    case["name"],
                    kind
                );
            }
        }
    }
}
