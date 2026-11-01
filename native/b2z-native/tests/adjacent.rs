//! Same-account, no-gap cannon launches: independent Rust canonical output equality.
use b2z_native::{
    world::{OwnerCount, World},
    Cursor, Input,
};
use dtr_wire::{decode, hash, unhex, Int};
use num_bigint::BigInt;
use serde_json::Value;
#[test]
fn adjacent_launches_and_simultaneous_reflections_match_reference() {
    let base: Value =
        serde_json::from_str(include_str!("../../../tests/fixtures/rules-v6.json")).unwrap();
    let vectors: Value = serde_json::from_str(include_str!(
        "../../../tests/fixtures/adjacent-cannons.json"
    ))
    .unwrap();
    for case in vectors["cases"].as_array().unwrap() {
        let mut world =
            World::decode(&unhex(base["cases"]["idle"]["state_hex"].as_str().unwrap()).unwrap())
                .unwrap();
        let cell = case["cell"].as_u64().unwrap() as usize;
        let vx = case["initial_velocity"][0].as_i64().unwrap() as i32;
        let vy = case["initial_velocity"][1].as_i64().unwrap() as i32;
        world.cannons[0].cell = cell;
        world.cannons[0].heading = Some(((case["angle"].as_u64().unwrap() + 32768) % 65536) as u16);
        let own = world.ownership.as_mut().unwrap();
        own.base.fill(1);
        own.overrides.clear();
        own.counts = vec![OwnerCount {
            owner: 1,
            cells: 1000000,
        }];
        let time = world.time.0.to_integer();
        for b in &mut world.balls {
            b.cell = cell;
            b.vx = vx;
            b.vy = vy;
            b.x0 = Int(BigInt::from(cell % 1000 * 1024 + 512) - BigInt::from(vx) * &time);
            b.y0 = Int(BigInt::from(cell / 1000 * 1024 + 512) - BigInt::from(vy) * &time);
        }
        world.validate().unwrap();
        for stage in case["stages"].as_array().unwrap() {
            let inputs: Vec<Input> =
                decode(&unhex(stage["inputs_hex"].as_str().unwrap()).unwrap()).unwrap();
            let context: Value =
                decode(&unhex(stage["context_hex"].as_str().unwrap()).unwrap()).unwrap();
            let mut c = Cursor::begin(&world.encode().unwrap(), inputs, &context).unwrap();
            let mut work = 0;
            let mut slices = 0;
            loop {
                let (used, done) = c.step([1, 7, 31, 127][slices % 4]).unwrap();
                work += used;
                slices += 1;
                assert!(work < 10000, "{} {}", case["name"], stage["name"]);
                if done {
                    break;
                }
                if slices % 17 == 0 {
                    let bytes = c.snapshot().unwrap();
                    c = Cursor::restore(&bytes, &hash(&bytes)).unwrap();
                }
            }
            c.finalize_elapsed(stage["observed_ns"].as_str().unwrap().parse().unwrap())
                .unwrap();
            let out = c.result().unwrap();
            for (kind, bytes) in [
                ("state", &out.state),
                ("events", &out.events),
                ("scores", &out.scores),
            ] {
                assert_eq!(
                    hash(bytes),
                    stage["hashes"][kind],
                    "{} {} {}",
                    case["name"],
                    stage["name"],
                    kind
                );
            }
            world = World::decode(&out.state).unwrap();
            assert_eq!(world.balls.len(), stage["balls"].as_u64().unwrap() as usize);
            assert_eq!(world.cannons.len(), 2);
        }
    }
}
