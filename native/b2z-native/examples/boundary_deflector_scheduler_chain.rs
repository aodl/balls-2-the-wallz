//! Actual immutable-structure cursor chain, not an IC or financial fixture.
use b2z_native::{world::World, Cursor};
use dtr_wire::{decode, hash, unhex, Int, Rat};
use num_bigint::BigInt;
use serde_json::{json, Value};
use std::io::Read;
fn main() {
    let mut text = String::new();
    std::io::stdin().read_to_string(&mut text).unwrap();
    let input: Value = serde_json::from_str(&text).unwrap();
    let mut state = unhex(input["initial_hex"].as_str().unwrap()).unwrap();
    let mut prior = World::decode(&state).unwrap().time;
    let mut minimum: Option<Rat> = None;
    let (mut contacts, mut redirects, mut reflections, mut ticks, mut max_den, mut max_bits) =
        (0u64, 0u64, 0u64, 0u64, BigInt::from(1), 0usize);
    let mut chain = "0".repeat(64);
    let mut samples = vec![];
    while contacts < input["target"].as_u64().unwrap() {
        let w = World::decode(&state).unwrap();
        let start = w.time.0.to_integer();
        let mut context = b2z_native::deflectors_v12::identity().unwrap();
        context["logical_start"] = json!(Int(start.clone()));
        context["logical_end"] = json!(Int(start + 1));
        let mut c = Cursor::begin(&state, vec![], &context).unwrap();
        loop {
            let (_, done) = c.step(17).unwrap();
            if done {
                break;
            }
            if ticks % 23 == 0 {
                let bytes = c.snapshot().unwrap();
                c = Cursor::restore(&bytes, &hash(&bytes)).unwrap();
            }
        }
        ticks += 1;
        c.finalize_elapsed(ticks).unwrap();
        let output = c.result().unwrap();
        let audit: Value = decode(&output.events).unwrap();
        for e in audit["events"].as_array().unwrap() {
            if let Some(a) = e.as_array() {
                if !a[6].is_null() {
                    let at: Rat = Rat::new(
                        a[2][0].as_str().unwrap().parse().unwrap(),
                        a[2][1].as_str().unwrap().parse().unwrap(),
                    )
                    .unwrap();
                    assert!(at > prior);
                    let step = at.sub(&prior).unwrap();
                    if minimum.as_ref().is_none_or(|m| &step < m) {
                        minimum = Some(step);
                    }
                    prior = at;
                    contacts += 1;
                    if a[6][3] == 0 {
                        redirects += 1;
                    } else {
                        reflections += 1;
                    }
                }
            }
        }
        state = output.state;
        let w = World::decode(&state).unwrap();
        let b = &w.balls[0];
        max_den = max_den.max(b.den.as_ref().unwrap().0.clone());
        for n in [&b.x0.0, &b.y0.0] {
            max_bits = max_bits.max(n.to_str_radix(2).trim_start_matches('-').len());
        }
        chain = hash(
            format!(
                "{}{}{}{}",
                chain,
                hash(&state),
                hash(&output.events),
                hash(&output.scores)
            )
            .as_bytes(),
        );
        for target in [1500u64, 10000, 100000] {
            if contacts >= target
                && !samples
                    .iter()
                    .any(|s: &Value| s["target"].as_u64() == Some(target))
            {
                samples.push(json!({"target":target,"tick":ticks,"contacts":contacts,"state_hash":hash(&state),"chain":chain}));
            }
        }
    }
    let m = minimum.unwrap();
    println!(
        "{}",
        json!({"contacts":contacts,"redirects":redirects,"reflections":reflections,"ticks":ticks,"max_den":max_den.to_string(),"max_numerator_bits":max_bits,"chain":chain,"samples":samples,"minimum_step":[m.0.numer().to_string(),m.0.denom().to_string()]})
    );
}
