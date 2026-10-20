//! Executable native comparison gate. Failures exit nonzero; fixtures are never rewritten.
use b2z_native::{Cursor, Input, Output};
use dtr_wire::{decode, encode, hash, hex, unhex, Rat, Result};
use serde_json::Value;
use std::{env, fs, path::Path};
fn load(root: &Path, name: &str) -> Result<Value> {
    serde_json::from_slice(
        &fs::read(root.join("tests/fixtures").join(name)).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())
}
fn bytes(v: &Value) -> Result<Vec<u8>> {
    unhex(v.as_str().ok_or("hex string")?)
}
fn complete(mut c: Cursor) -> Result<Output> {
    let mut slices = 0usize;
    while c.phase != "done" {
        c.step([1, 7, 31, 127][slices % 4])?;
        slices += 1;
        if slices > 2_000_000 {
            return Err("native work bound".into());
        }
        if slices % 31 == 0 {
            let b = c.snapshot()?;
            c = Cursor::restore(&b, &hash(&b))?;
        }
    }
    c.result()
}
fn check_output(output: &Output, expected: &Value) -> Result<()> {
    for (key, actual) in [
        ("state", &output.state),
        ("events", &output.events),
        ("scores", &output.scores),
    ] {
        if actual != &bytes(&expected[key]["hex"])? {
            return Err(format!("native {key} byte mismatch"));
        }
    }
    Ok(())
}
fn begin(case: &Value) -> Result<Cursor> {
    let initial = bytes(&case["initial_hex"])?;
    let inputs: Vec<Input> = decode(&bytes(&case["inputs_hex"])?)?;
    let context: Value = decode(&bytes(&case["context_hex"])?)?;
    let w = b2z_native::world::World::decode(&initial)?;
    if w.encode()? != initial {
        return Err("world roundtrip".into());
    }
    Cursor::begin(&initial, inputs, &context)
}
fn main_inner() -> Result<()> {
    let args: Vec<_> = env::args().collect();
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    let golden = load(&root, "b2z-v3-golden.json")?;
    let cases = golden["cases"].as_array().ok_or("golden cases")?;
    if args.get(1).map(String::as_str) == Some("export") {
        let name = args.get(2).ok_or("export name")?;
        let count: usize = args
            .get(3)
            .ok_or("export slices")?
            .parse()
            .map_err(|_| "export count")?;
        let budget: usize = args
            .get(4)
            .ok_or("export budget")?
            .parse()
            .map_err(|_| "export budget")?;
        if args.len() != 5 || count > 100_000 {
            return Err("export bounds".into());
        }
        let case = cases
            .iter()
            .find(|c| c["name"].as_str() == Some(name))
            .ok_or("unknown export case")?;
        let mut c = begin(case)?;
        for _ in 0..count {
            c.step(budget)?;
        }
        println!("{}", hex(&c.snapshot()?));
        return Ok(());
    }
    let public_only = args.len() == 1 || args.get(1).map(String::as_str) == Some("public");
    let legacy = args.get(1).map(String::as_str) == Some("legacy");
    if args.len() != 1 && !((public_only || legacy) && args.len() == 2) {
        return Err(
            "usage: native-conformance-v4 [public | legacy | export NAME SLICES BUDGET]".into(),
        );
    }
    for case in cases {
        let output = complete(begin(case)?)?;
        check_output(&output, &case["outputs"])?;
        println!(
            "case\t{}\t{}\t{}\t{}",
            case["name"].as_str().ok_or("name")?,
            hash(&output.state),
            hash(&output.events),
            hash(&output.scores)
        );
    }
    if !public_only {
        let cursors = load(&root, "cursor-v4.json")?;
        for (index, row) in cursors["rows"]
            .as_array()
            .ok_or("cursor rows")?
            .iter()
            .enumerate()
        {
            let snapshot = bytes(&row["snapshot_hex"])?;
            let c = Cursor::restore(&snapshot, row["sha256"].as_str().ok_or("cursor hash")?)?;
            let case = cases
                .iter()
                .find(|c| c["name"] == row["name"])
                .ok_or("cursor name")?;
            let output = complete(c)?;
            check_output(&output, &case["outputs"])?;
            println!("cursor\t{index}\t{}", hash(&output.state));
        }
    }
    let numbers = load(&root, "numeric-v4.json")?;
    for row in numbers["cases"].as_array().ok_or("numeric cases")? {
        let parse = |v: &Value| -> Result<Rat> {
            Rat::new(
                v[0].as_str()
                    .ok_or("numerator")?
                    .parse()
                    .map_err(|_| "numerator")?,
                v[1].as_str()
                    .ok_or("denominator")?
                    .parse()
                    .map_err(|_| "denominator")?,
            )
        };
        let a = parse(&row["a"])?;
        let b = parse(&row["b"])?;
        let sum = a.add(&b)?;
        let difference = a.sub(&b)?;
        let scaled = a.mul_i(row["scale"].as_i64().ok_or("scale")?)?;
        if sum != parse(&row["sum"])?
            || difference != parse(&row["difference"])?
            || scaled != parse(&row["scaled"])?
            || (a.cmp(&b) as i32 as i64) != row["comparison"].as_i64().ok_or("comparison")?
        {
            return Err("numeric mismatch".into());
        }
        if decode::<Rat>(&encode(&sum)?)? != sum {
            return Err("numeric roundtrip".into());
        }
        println!(
            "numeric\t{}\t{}",
            row["id"].as_u64().ok_or("numeric ID")?,
            sum
        );
    }
    Ok(())
}
fn main() {
    if let Err(e) = main_inner() {
        eprintln!("FAIL: {e}");
        std::process::exit(1);
    }
}
