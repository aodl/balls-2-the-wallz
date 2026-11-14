use b2z_native::{
    purchases_v6::{enemy_clearance, prepare, prepare_with_clearance, Plan},
    world::World,
};
use dtr_wire::unhex;
fn world() -> World {
    let f: serde_json::Value =
        serde_json::from_str(include_str!("../../../tests/fixtures/clearance-v9.json")).unwrap();
    World::decode(&unhex(f["rows"][0]["initial_hex"].as_str().unwrap()).unwrap()).unwrap()
}

#[test]
fn toroidal_chebyshev_vectors() {
    let w = world();
    for (x, y) in [
        (0, 0),
        (1, 0),
        (2, 2),
        (3, 0),
        (3, 3),
        (4, 0),
        (4, 4),
        (5, 0),
        (997, 0),
        (996, 0),
        (997, 997),
    ] {
        let d = std::cmp::max(std::cmp::min(x, 1000 - x), std::cmp::min(y, 1000 - y));
        assert_eq!(enemy_clearance(&w, 1, y * 1000 + x), d >= 4, "{x},{y}");
    }
}
#[test]
fn clearance_plan_preserves_historical_admission_and_rejects_without_mutation() {
    let mut w = world();
    let c = w.cannons[0].clone();
    let target = c.cell + 1;
    w.set_owner(target, 1).unwrap();
    w.set_owner(0, 1).unwrap();
    w.cannons[1].cell = target + 3;
    w.set_owner(target + 3, 2).unwrap();
    w.validate().unwrap();
    let memo = format!("MOVE {} {}", c.id, target);
    let memo =
        b2z_protocol::v6::encode(b2z_protocol::v6::parse_text(memo.as_bytes()).unwrap()).unwrap();
    let before = w.encode().unwrap();
    assert!(matches!(
        prepare(&w, &c.account, 10000, &memo, &[]).unwrap(),
        Plan::Move { .. }
    ));
    assert!(
        matches!(prepare_with_clearance(&w,&c.account,10000,&memo,&[],true).unwrap(),Plan::Rejected{reason} if reason=="ENEMY_TERRITORY_TOO_CLOSE")
    );
    assert_eq!(w.encode().unwrap(), before);
}
