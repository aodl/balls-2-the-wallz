//! New v4 vectors; immutable v3 history remains covered by replay.rs.
use b2z_native::{torus_identity, Cursor, Input};
use dtr_wire::{decode, hash, unhex};
use serde_json::Value;
#[test]
fn toroidal_reference_is_byte_exact_and_recovers_every_bounded_phase() {
    let fixture: Value =
        serde_json::from_str(include_str!("../../../tests/fixtures/b2z-torus-v4.json")).unwrap();
    assert_eq!(torus_identity().unwrap(), fixture["identity"]);
    for case in fixture["cases"].as_array().unwrap() {
        let initial = unhex(case["initial_hex"].as_str().unwrap()).unwrap();
        let inputs: Vec<Input> =
            decode(&unhex(case["inputs_hex"].as_str().unwrap()).unwrap()).unwrap();
        let context: Value =
            decode(&unhex(case["context_hex"].as_str().unwrap()).unwrap()).unwrap();
        for budgets in [[512, 512, 512], [7, 31, 127]] {
            let mut c = Cursor::begin(&initial, inputs.clone(), &context).unwrap();
            let mut n = 0;
            while c.phase != "done" {
                c.step(budgets[n % 3]).unwrap();
                n += 1;
                if n % 13 == 0 {
                    let raw = c.snapshot().unwrap();
                    c = Cursor::restore(&raw, &hash(&raw)).unwrap();
                }
                assert!(n < 100000);
            }
            let raw = c.result().unwrap();
            for (kind, bytes) in [
                ("state", raw.state),
                ("events", raw.events),
                ("scores", raw.scores),
            ] {
                assert_eq!(
                    bytes,
                    unhex(case["outputs"][kind]["hex"].as_str().unwrap()).unwrap(),
                    "{} {kind}",
                    case["name"]
                );
            }
        }
    }
}

#[test]
fn staged_migration_matches_javascript_and_refuses_unfinished_work() {
    use b2z_native::{
        migration::{stage_world, Boundary},
        world::World,
    };
    let fixture: Value =
        serde_json::from_str(include_str!("../../../tests/fixtures/b2z-torus-v4.json")).unwrap();
    let old =
        World::decode(&unhex(fixture["migration"]["old_hex"].as_str().unwrap()).unwrap()).unwrap();
    let migrated = stage_world(
        &old,
        &Boundary {
            source_cursor: 39526412,
            ledger_cutover: Some(39526500),
            account_history_complete_through: Some(39526500),
            ..Boundary::default()
        },
    )
    .unwrap();
    assert_eq!(
        migrated.encode().unwrap(),
        unhex(fixture["migration"]["new_hex"].as_str().unwrap()).unwrap()
    );
    assert_eq!(migrated.credits, old.credits);
    assert_eq!(migrated.received_e8s, old.received_e8s);
    for boundary in [
        Boundary {
            staged: true,
            ..Boundary::default()
        },
        Boundary {
            pending_inputs: 1,
            ..Boundary::default()
        },
        Boundary {
            source_pending: true,
            ..Boundary::default()
        },
        Boundary {
            source_in_flight: true,
            ..Boundary::default()
        },
    ] {
        assert!(stage_world(&old, &boundary).is_err());
    }
}
