use b2z_native::{Cursor, Input};
use b2z_protocol::context_structures as codec;
use dtr_wire::{decode, hash, unhex, Int};
use serde_json::{json, Value};

#[test]
fn rules13_matches_the_public_vectors_at_every_work_boundary() {
    let fixture: Value = serde_json::from_str(include_str!(
        "../../../tests/fixtures/context-structures-v13.json"
    ))
    .unwrap();
    assert_eq!(
        b2z_native::context_structures::identity().unwrap(),
        fixture["identity"]
    );
    for row in fixture["rows"].as_array().unwrap() {
        let initial = unhex(row["initial_hex"].as_str().unwrap()).unwrap();
        let mut identity = fixture["identity"].clone();
        identity["logical_start"] = json!(Int(0.into()));
        identity["logical_end"] = json!(Int(1.into()));
        let inputs = row["inputs"]
            .as_array()
            .unwrap()
            .iter()
            .map(|input| Input {
                position: Int(input["position"]
                    .as_str()
                    .unwrap()
                    .parse::<u64>()
                    .unwrap()
                    .into()),
                payload_hex: input["payload_hex"].as_str().unwrap().to_owned(),
            })
            .collect();
        let mut cursor = Cursor::begin(&initial, inputs, &identity).unwrap();
        let mut complete = false;
        for _ in 0..10000 {
            let (_, done) = cursor.step(1).unwrap();
            let checkpoint = cursor.snapshot().unwrap();
            cursor = Cursor::restore(&checkpoint, &hash(&checkpoint)).unwrap();
            if done {
                complete = true;
                break;
            }
        }
        assert!(complete);
        cursor.finalize_elapsed(1).unwrap();
        let output = cursor.result().unwrap();
        let audit: Value = decode(&output.events).unwrap();
        assert_eq!(
            json!(audit["receipts"]
                .as_array()
                .unwrap()
                .iter()
                .map(|r| &r["reason"])
                .collect::<Vec<_>>()),
            row["expected"]["reasons"]
        );
        for (kind, bytes) in [
            ("state", output.state),
            ("events", output.events),
            ("scores", output.scores),
        ] {
            assert_eq!(
                hash(&bytes),
                row["expected"][kind],
                "{} {kind}",
                row["name"]
            );
        }
    }
}

#[test]
fn rules13_ledger_grammar_does_not_reinterpret_rules12_directions() {
    use b2z_protocol::deflector::{self, HEADINGS};
    for ((screen, code), heading) in codec::SCREEN_ORIENTATION_CODES
        .into_iter()
        .zip([40960, 57344, 8192, 24576])
    {
        assert_eq!(HEADINGS[code as usize], heading);
        let memo = format!("DROT 4294967295 {screen}");
        let command = codec::parse_text(memo.as_bytes()).unwrap().command;
        let normalized = codec::encode(command).unwrap();
        assert_eq!(codec::decode(&normalized).unwrap(), command);
        assert!(deflector::parse_text(memo.as_bytes()).is_err());
        assert!(codec::decode_ledger(u64::from_be_bytes(normalized), None).is_err());
    }
    for memo in [
        "DEFLECT 00 E",
        "DEFLECT 1 NE",
        "DROT 4294967296 N",
        "DROT 0 N",
        "DROT 1 N|cry",
        "DROT 1 N\n",
        "DMOVE 1 1000000",
        "DMOVE 01 0",
    ] {
        assert!(codec::parse_text(memo.as_bytes()).is_err(), "{memo}");
    }
    assert!(deflector::parse_text(b"DEFLECT 1 NE").is_ok());
}
