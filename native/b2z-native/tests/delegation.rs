use b2z_native::delegation_v8::{Decision, Registry};
use b2z_protocol::delegation::Payment;
use dtr_wire::{encode, hex, unhex};
#[test]
fn authorization_matches_javascript_after_every_ordered_transfer() {
    let vectors: serde_json::Value = serde_json::from_str(include_str!(
        "../../../tests/fixtures/b2z-delegation-v1.json"
    ))
    .unwrap();
    let mut registry = Registry::empty(vectors["recipient"].as_str().unwrap().into()).unwrap();
    for row in vectors["steps"].as_array().unwrap() {
        let p = Payment::decode(&unhex(row["payload_hex"].as_str().unwrap()).unwrap()).unwrap();
        let decision = registry.apply(&p, p.position).unwrap();
        let label = match decision {
            Decision::Gameplay => "gameplay",
            Decision::Granted => "granted",
            Decision::Revoked => "revoked",
            Decision::Rejected(reason) => reason,
        };
        assert_eq!(label, row["decision"].as_str().unwrap(), "{}", row["label"]);
        registry.validate().unwrap();
        assert_eq!(
            hex(&encode(&registry).unwrap()),
            row["state_hex"].as_str().unwrap(),
            "{}",
            row["label"]
        );
        let restored: Registry = dtr_wire::decode(&encode(&registry).unwrap()).unwrap();
        assert_eq!(restored, registry);
        let before = registry.clone();
        assert!(registry.apply(&p, p.position).is_err());
        assert_eq!(registry, before, "duplicates are never replayed");
    }
}
#[test]
fn wrong_destination_and_input_position_never_modify_registry() {
    let v: serde_json::Value = serde_json::from_str(include_str!(
        "../../../tests/fixtures/b2z-delegation-v1.json"
    ))
    .unwrap();
    let mut r = Registry::empty(v["recipient"].as_str().unwrap().into()).unwrap();
    let mut p =
        Payment::decode(&unhex(v["steps"][0]["payload_hex"].as_str().unwrap()).unwrap()).unwrap();
    let before = r.clone();
    assert!(r.apply(&p, p.position + 1).is_err());
    assert_eq!(r, before);
    p.to = p.from;
    assert!(r.apply(&p, p.position).is_err());
    assert_eq!(r, before);
}
#[test]
fn delegated_kernel_matches_javascript_and_preserves_pending_cursor() {
    use b2z_native::{world::World, Cursor, Input};
    use dtr_wire::{decode, hash};
    let row: serde_json::Value = serde_json::from_str(include_str!(
        "../../../tests/fixtures/delegated-kernel-v8.json"
    ))
    .unwrap();
    let initial = unhex(row["initial_hex"].as_str().unwrap()).unwrap();
    let inputs: Vec<Input> = decode(&unhex(row["inputs_hex"].as_str().unwrap()).unwrap()).unwrap();
    let context = decode(&unhex(row["context_hex"].as_str().unwrap()).unwrap()).unwrap();
    let mut c = Cursor::begin(&initial, inputs, &context).unwrap();
    let mut slices = 0;
    loop {
        let (_, done) = c.step([1, 7, 31, 127][slices % 4]).unwrap();
        slices += 1;
        if slices % 3 == 0 {
            let bytes = c.snapshot().unwrap();
            c = Cursor::restore(&bytes, &hash(&bytes)).unwrap();
        }
        if done {
            break;
        }
        assert!(slices < 100000);
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
        assert_eq!(hash(&bytes), row["outputs"][kind]["sha256"], "{kind}");
    }
}
