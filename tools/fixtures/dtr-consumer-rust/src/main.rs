use dtr_core::Seal as CoreSeal;
use dtr_host::{input_root, Action, Input};
use dtr_source_model::advance_prefix;
use dtr_wire::{hash, Int};

fn main() {
    assert_eq!(advance_prefix(10, 10, 2, 100, 256).unwrap(), 12);
    let input = Input {
        position: Int(0.into()),
        payload_hex: "00".into(),
    };
    assert_eq!(input_root(&[input], 0, 1).unwrap().len(), 64);
    assert_eq!(hash(b"consumer").len(), 64);
    let sparse: Vec<Input> = [100u64, 109, 800]
        .into_iter()
        .map(|id| Input {
            position: Int(id.into()),
            payload_hex: "00".into(),
        })
        .collect();
    assert_eq!(input_root(&sparse, 0, 801).unwrap().len(), 64);
    let ordered = Action::IngestOrdered {
        start: Int(0.into()),
        end: Int(801.into()),
        inputs: sparse,
        anchor: "aa".repeat(32),
    };
    assert!(matches!(ordered, Action::IngestOrdered {inputs, ..} if inputs.len() == 3));
    let seal = CoreSeal {
        epoch_hash: None,
        segment_id: 0,
        logical_start: 0,
        logical_end: 1,
        source_from: 0,
        source_to_exclusive: 0,
        input_count: 0,
        source_id: [0; 32],
        source_anchor: [0; 32],
        rules_hash: [0; 32],
        config_hash: [0; 32],
        schema_hash: [0; 32],
        previous_state: [0; 32],
        previous_manifest: [0; 32],
        input_root: [0; 32],
    };
    assert_eq!(seal.encode().unwrap().len(), 308);
    println!("PASS isolated remote DTR Rust consumer");
}
