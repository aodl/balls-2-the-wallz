//! Independent exact geometry checkpoint only; never compiled into normal Wasm.
use dtr_wire::Rat;
use num_bigint::BigInt;
use serde_json::{json, Value};
use std::io::Read;
fn fraction(v: &Value) -> Rat {
    let parts: Vec<_> = v.as_str().unwrap().split('/').collect();
    Rat::new(
        parts[0].parse::<BigInt>().unwrap(),
        parts.get(1).unwrap_or(&"1").parse().unwrap(),
    )
    .unwrap()
}
fn multiply(a: &Rat, b: &Rat) -> Rat {
    Rat::new(a.0.numer() * b.0.numer(), a.0.denom() * b.0.denom()).unwrap()
}
fn divide(a: &Rat, b: &Rat) -> Rat {
    Rat::new(a.0.numer() * b.0.denom(), a.0.denom() * b.0.numer()).unwrap()
}
fn text(r: &Rat) -> String {
    if r.0.denom() == &BigInt::from(1) {
        r.0.numer().to_string()
    } else {
        format!("{}/{}", r.0.numer(), r.0.denom())
    }
}
fn contact(row: &Value) -> Value {
    let p: Vec<_> = row["entry_position"]
        .as_array()
        .unwrap()
        .iter()
        .map(fraction)
        .collect();
    let v: Vec<_> = row["incoming_velocity"]
        .as_array()
        .unwrap()
        .iter()
        .map(fraction)
        .collect();
    let outgoing: Vec<_> = row["outgoing_velocity"]
        .as_array()
        .unwrap()
        .iter()
        .map(fraction)
        .collect();
    let entry = fraction(&row["entry_time"]);
    let exits: Vec<_> = (0..2)
        .filter(|&i| v[i] != Rat::integer(0))
        .map(|i| {
            divide(
                &Rat::integer(i64::from(v[i] > Rat::integer(0)))
                    .sub(&p[i])
                    .unwrap(),
                &v[i],
            )
        })
        .collect();
    let Some(duration) = exits.into_iter().min() else {
        return Value::Null;
    };
    let half = divide(&duration, &Rat::integer(2));
    let point: Vec<_> = (0..2)
        .map(|i| p[i].add(&multiply(&v[i], &half)).unwrap())
        .collect();
    if duration <= Rat::integer(0)
        || point
            .iter()
            .any(|p| p <= &Rat::integer(0) || p >= &Rat::integer(1))
    {
        return Value::Null;
    }
    let time = entry.add(&half).unwrap();
    let intercept: Vec<_> = (0..2)
        .map(|i| text(&point[i].sub(&multiply(&outgoing[i], &time)).unwrap()))
        .collect();
    json!({"id":row["id"],"geometric_exit_time":text(&entry.add(&duration).unwrap()),"contact_time":text(&time),"contact_position":point.iter().map(text).collect::<Vec<_>>(),"outgoing_global_intercept":intercept})
}
fn main() {
    let mut s = String::new();
    std::io::stdin().read_to_string(&mut s).unwrap();
    let input: Value = serde_json::from_str(&s).unwrap();
    println!(
        "{}",
        Value::Array(
            input["vectors"]
                .as_array()
                .unwrap()
                .iter()
                .map(contact)
                .collect()
        )
    );
}
