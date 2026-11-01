//! Resumable component proofs, not an installed-runtime qualification.
use b2z_native::{
    territory_topology_v6::{Flood, SplitJob},
    world::World,
};
use dtr_wire::{decode, encode, hash, unhex};
use serde_json::Value;
fn fixture() -> Value {
    serde_json::from_str(include_str!("../../../tests/fixtures/islands-v6.json")).unwrap()
}
#[test]
fn current_island_occupancy_controls_activity_with_exact_js_replay() {
    let f = fixture();
    for name in ["left", "right", "both", "unanchored"] {
        let v = &f["cases"][name];
        let mut w = World::decode(&unhex(v["cut_hex"].as_str().unwrap()).unwrap()).unwrap();
        let mut j = SplitJob::new(&w, 1, 103, 0).unwrap();
        let mut work = 0;
        while !j.step(&mut w).unwrap() {
            j = decode(&encode(&j).unwrap()).unwrap();
            w = decode(&encode(&w).unwrap()).unwrap();
            work += 1;
            assert!(work < 1000);
        }
        assert_eq!(j.phase, v["phase"]);
        assert_eq!(hash(&w.encode().unwrap()), v["state_sha256"]);
        assert_eq!(
            encode(&j.fences).unwrap(),
            unhex(v["fences_hex"].as_str().unwrap()).unwrap()
        );
        if name == "unanchored" {
            assert_eq!(j.unanchored_balls, vec![1]);
            assert_eq!(
                w.encode().unwrap(),
                unhex(v["cut_hex"].as_str().unwrap()).unwrap()
            );
        } else {
            assert_eq!(w.territory_ball_count(1), usize::from(name != "right"));
            assert_eq!(w.territory_ball_count(2), usize::from(name != "left"));
            assert_eq!(w.balls.len(), if name == "both" { 2 } else { 1 });
            assert!(w.balls.iter().all(|b| b.owner == 1));
        }
    }
}
#[test]
fn uniform_million_cell_flood_uses_row_spans_not_cell_work() {
    let f = fixture();
    let mut w =
        World::decode(&unhex(f["cases"]["left"]["before_hex"].as_str().unwrap()).unwrap()).unwrap();
    w.ownership =
        Some(b2z_native::world::ScaledOwnership::from_32x32(vec![1; 1024], 1000, 1000).unwrap());
    let mut j = Flood::new(1, 0);
    let mut work = 0;
    while !j.step(&w).unwrap() {
        work += 1;
        assert!(work < 5000)
    }
    assert!(work < 3000);
    assert_eq!(j.ranges, vec![[0, 1000000]]);
}
#[test]
fn a_remaining_friendly_ball_keeps_all_connected_cannons_active() {
    let f = fixture();
    let mut w =
        World::decode(&unhex(f["cases"]["both"]["before_hex"].as_str().unwrap()).unwrap()).unwrap();
    w.balls.retain(|b| b.id != 1);
    w.validate().unwrap();
    assert!(w.active_cannon(1));
    assert!(w.active_cannon(2));
    assert_eq!(w.territory_ball_count(1), 1);
    assert_eq!(w.territory_ball_count(2), 1);
    assert!(b2z_native::playability::mark_dormant(&mut w, 1).is_err());
}
