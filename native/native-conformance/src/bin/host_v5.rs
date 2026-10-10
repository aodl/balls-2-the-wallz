//! Actual native coordinator fixture comparison. Missing toolchain is not a pass.
use btz_native::host::BtzHostKernel;
use dtr_host::{Action, Coordinator, Record};
use dtr_wire::{decode, encode, hash, hex, unhex, Result};
use serde_json::Value;
use std::{env, fs, path::Path};
fn text(v: &Value) -> Result<&str> {
    v.as_str().ok_or_else(|| "fixture string".into())
}
fn main_inner() -> Result<()> {
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    let f: Value = serde_json::from_slice(
        &fs::read(root.join("tests/fixtures/coordinator-v5.json")).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    let mut args: Vec<String> = env::args().collect();
    if args.len() == 1 || args.get(1).map(String::as_str) == Some("public") {
        if args.len() > 2 {
            return Err("public arguments".into());
        }
        for row in f["rows"].as_array().ok_or("rows")? {
            if row["game"] != "btz" {
                continue;
            }
            let name = text(&row["name"])?;
            let genesis = unhex(text(&row["genesis_hex"])?)?;
            let mut h = Coordinator::restore(&genesis, &hash(&genesis), BtzHostKernel)?;
            for step in row["actions"].as_array().ok_or("actions")? {
                h.apply(decode::<Action>(&unhex(text(&step["action_hex"])?)?)?)?;
                let expected: Record = decode(&unhex(text(&step["image_hex"])?)?)?;
                if encode(&h.record.journal.head)? != encode(&expected.journal.head)?
                    || h.record.inbox.retired_to != expected.inbox.retired_to
                    || h.record.inbox.cursor != expected.inbox.cursor
                    || encode(&h.record.inbox.pending)? != encode(&expected.inbox.pending)?
                {
                    return Err(format!("public outcome/source mismatch: {name}"));
                }
                // Restore native's own private image; never require another language's working bytes.
                let own = h.snapshot()?;
                h = Coordinator::restore(&own, &hash(&own), BtzHostKernel)?;
            }
            println!(
                "host_public\t{name}\t{}",
                h.record.journal.head.manifest_hash
            );
            println!(
                "publication6\t{name}\t{}",
                dtr_host::observation::publication(&h.record)?.sha256
            );
        }
        return Ok(());
    }
    if args.get(1).map(String::as_str) == Some("legacy") && args.len() == 2 {
        args.pop();
    }
    for row in f["rows"].as_array().ok_or("rows")? {
        if row["game"] != "btz" {
            continue;
        }
        let name = text(&row["name"])?;
        if args.get(1).map(String::as_str) == Some("export")
            && args.get(2).map(String::as_str) != Some(name)
        {
            continue;
        }
        let genesis = unhex(text(&row["genesis_hex"])?)?;
        let actions = row["actions"].as_array().ok_or("actions")?;
        let mut host = Coordinator::restore(&genesis, &hash(&genesis), BtzHostKernel)?;
        for (index, step) in actions.iter().enumerate() {
            let action: Action = decode(&unhex(text(&step["action_hex"])?)?)?;
            host.apply(action)?;
            let bytes = host.snapshot()?;
            if hex(&bytes) != text(&step["image_hex"])? {
                return Err(format!("native host image mismatch: {name}/{index}"));
            }
            if args.get(1).map(String::as_str) == Some("export") {
                let at: usize = args
                    .get(3)
                    .ok_or("export index")?
                    .parse()
                    .map_err(|_| "export index")?;
                if args.len() != 4 {
                    return Err("export arguments".into());
                }
                if index == at {
                    println!("{}", hex(&bytes));
                    return Ok(());
                }
            } else {
                println!("host\t{name}\t{index}\t{}", hash(&bytes));
            }
            // Resume canonical bytes after every actual native operation.
            host = Coordinator::restore(&bytes, &hash(&bytes), BtzHostKernel)?;
        }
        if args.len() > 1 {
            return Err("export index out of range".into());
        }
        let pf: Value = serde_json::from_slice(
            &fs::read(root.join("tests/fixtures/observation-v5.json"))
                .map_err(|e| e.to_string())?,
        )
        .map_err(|e| e.to_string())?;
        let reference = pf["rows"]
            .as_array()
            .ok_or("publication rows")?
            .iter()
            .find(|r| r["name"].as_str() == Some(name))
            .ok_or("publication fixture")?;
        let view = dtr_host::observation::publication_v5_bytes(&host.record)?;
        if hex(&view) != text(&reference["publication_hex"])? {
            return Err("native publication mismatch".into());
        }
        println!("publication\t{name}\t{}", hash(&view));
        // Also import every JS intermediate image and execute all remaining operations.
        for (index, step) in actions.iter().enumerate() {
            let bytes = unhex(text(&step["image_hex"])?)?;
            let mut resumed = Coordinator::restore(&bytes, &hash(&bytes), BtzHostKernel)?;
            for next in actions.iter().skip(index + 1) {
                resumed.apply(decode(&unhex(text(&next["action_hex"])?)?)?)?;
            }
            if hex(&resumed.snapshot()?)
                != text(&actions.last().ok_or("empty actions")?["image_hex"])?
            {
                return Err("imported host continuation mismatch".into());
            }
            println!("resume\t{name}\t{index}\t{}", hash(&resumed.snapshot()?));
        }
    }
    if args.len() > 1 {
        return Err("unknown export scenario".into());
    }
    Ok(())
}
fn main() {
    if let Err(e) = main_inner() {
        eprintln!("FAIL: {e}");
        std::process::exit(1);
    }
}
