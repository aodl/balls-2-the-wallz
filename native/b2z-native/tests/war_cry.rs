use b2z_native::{world::World, Cursor, Input};
use dtr_wire::{hash, unhex};
use serde_json::Value;
#[test]
fn native_matches_js_annotation_vectors_and_recovers_each_work_unit() {
    let f: Value =
        serde_json::from_str(include_str!("../../../tests/fixtures/war-cry.json")).unwrap();
    let mut observed_pending = false;
    for r in f["rows"].as_array().unwrap() {
        let state = unhex(r["initial_hex"].as_str().unwrap()).unwrap();
        let inputs: Vec<Input> =
            dtr_wire::decode(&unhex(r["inputs_hex"].as_str().unwrap()).unwrap()).unwrap();
        let context: Value =
            dtr_wire::decode(&unhex(r["context_hex"].as_str().unwrap()).unwrap()).unwrap();
        let mut c = Cursor::begin(&state, inputs, &context).unwrap();
        let mut steps = 0;
        loop {
            let (_, done) = c.step(1).unwrap();
            if done {
                break;
            }
            steps += 1;
            assert!(steps < 100000);
            let b = c.snapshot().unwrap();
            let v: Value = dtr_wire::decode(&b).unwrap();
            if v["cursor"]["v6"]["pending_cry"].is_string() {
                observed_pending = true;
            }
            c = Cursor::restore(&b, &hash(&b)).unwrap();
        }
        World::decode(&state).unwrap();
        c.finalize_elapsed(r["observed_ns"].as_str().unwrap().parse().unwrap())
            .unwrap();
        let out = c.result().unwrap();
        for (k, b) in [
            ("state", out.state),
            ("events", out.events),
            ("scores", out.scores),
        ] {
            assert_eq!(
                hash(&b),
                r["outputs"][k]["sha256"].as_str().unwrap(),
                "{} {k}",
                r["name"]
            );
        }
    }
    assert!(
        observed_pending,
        "must recover a pending annotation before launch"
    );
}

#[cfg(test)]
mod shared_vectors {
    #[test]
    fn strict_memos_match_shared_vectors() {
        let f: serde_json::Value =
            serde_json::from_str(include_str!("../../../tests/fixtures/war-cry-memos.json"))
                .unwrap();
        assert_eq!(f["memo_limit"], 32);
        for row in f["rows"].as_array().unwrap() {
            let h = row["raw_hex"].as_str().unwrap();
            let bytes: Vec<u8> = (0..h.len())
                .step_by(2)
                .map(|i| u8::from_str_radix(&h[i..i + 2], 16).unwrap())
                .collect();
            let actual = b2z_protocol::war_cry::parse_text(&bytes);
            assert_eq!(
                actual.is_ok(),
                row["accepted"].as_bool().unwrap(),
                "{}",
                row["name"]
            );
            if let Ok(parsed) = actual {
                assert_eq!(parsed.cry, row["cry"].as_str().unwrap(), "{}", row["name"]);
            }
        }
    }
}
