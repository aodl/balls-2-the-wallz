//! Pure v6 state facts; installed-IC lifecycle/epoch qualification is separate.
use b2z_native::{migration::stage_million_world, playability::*, world::World};
use dtr_wire::{encode, hash, unhex, Int};
use serde_json::Value;

fn vector() -> Value {
    serde_json::from_str(include_str!("../../../tests/fixtures/playability-v6.json")).unwrap()
}
#[test]
fn certified_configuration_matches_compiled_policy_and_economics() {
    let c: Value = dtr_wire::decode(configuration()).unwrap();
    let economics: Value =
        serde_json::from_str(include_str!("../../../config/economics/prelaunch.json")).unwrap();
    assert_eq!(c["version"], 6);
    assert_eq!(
        c["memo_adapter_version"],
        b2z_protocol::v6::MEMO_ADAPTER_VERSION
    );
    for (key, value) in [
        ("max_cannons", MAX_CANNONS),
        ("max_balls", MAX_BALLS),
        (
            "max_purchase_balls_per_island",
            MAX_PURCHASE_BALLS_PER_ISLAND,
        ),
        ("max_retained_per_player", MAX_RETAINED_PER_PLAYER),
        ("max_players", MAX_PLAYERS),
    ] {
        assert_eq!(c[key], value);
    }
    assert_eq!(
        serde_json::from_value::<Int>(c["dormancy_grace_ns"].clone()).unwrap(),
        Int(DORMANCY_GRACE_NS.into())
    );
    for key in ["join_e8s", "ball_base_e8s", "move_e8s"] {
        assert_eq!(
            serde_json::from_value::<Int>(c[key].clone())
                .unwrap()
                .0
                .to_string(),
            economics[key].as_str().unwrap()
        );
    }
    assert_eq!(identity().unwrap()["config_hash"], hash(configuration()));
}
fn time(key: &str) -> u64 {
    vector()[key].as_str().unwrap().parse().unwrap()
}
fn original() -> World {
    let f: Value =
        serde_json::from_str(include_str!("../../../tests/fixtures/b2z-torus-v4.json")).unwrap();
    stage_million_world(
        &World::decode(&unhex(f["migration"]["new_hex"].as_str().unwrap()).unwrap()).unwrap(),
    )
    .unwrap()
}
fn dormant() -> (World, Fence) {
    let mut w = migrate(&original(), time("observed_ns")).unwrap();
    w.balls.clear();
    w.pending.clear();
    let f = mark_dormant(&mut w, 1).unwrap().unwrap();
    clear_unsupported_player(&mut w, 1).unwrap();
    let stamped = finalize_elapsed(&mut w, time("completed_ns"), &[f]).unwrap();
    w.validate().unwrap();
    (w, stamped[0].clone())
}
#[test]
fn cross_language_metadata_preserves_paid_v5_bytes() {
    let before = original();
    let mut next = migrate(&before, time("observed_ns")).unwrap();
    assert_eq!(hash(&before.encode().unwrap()), vector()["v5_sha256"]);
    assert_eq!(hash(&next.encode().unwrap()), vector()["migration_sha256"]);
    assert_eq!(next.credits, before.credits);
    assert_eq!(next.received_e8s, before.received_e8s);
    assert!(migrate(&next, time("observed_ns")).is_err());
    next.playability = None;
    next.version = 5;
    assert_eq!(next.encode().unwrap(), before.encode().unwrap());
}
#[test]
fn deadline_is_elapsed_24h_from_completion_not_logical_ticks() {
    let (mut w, f) = dormant();
    assert_eq!(hash(&w.encode().unwrap()), vector()["dormant_sha256"]);
    assert_eq!(w.time, original().time);
    assert_eq!(
        elapsed(&f.deadline_ns).unwrap(),
        time("completed_ns") + DORMANCY_GRACE_NS
    );
    let state = w.playability.as_ref().unwrap();
    assert!(state.due(elapsed(&f.deadline_ns).unwrap() - 1).is_empty());
    assert_eq!(state.due(elapsed(&f.deadline_ns).unwrap()), [f]);
    assert_eq!(mark_dormant(&mut w, 1).unwrap(), None);
    assert!(w.score_areas().unwrap().is_empty());
    assert_eq!(w.ownership_counts(), [(1, 1)]);
    assert_eq!(w.owner(w.cannons[0].cell), Some(1));
    assert_eq!(w.credits, original().credits);
    assert_eq!(w.received_e8s, original().received_e8s);
}
#[test]
fn revival_fences_old_generation_without_restoring_territory() {
    let (mut w, f) = dormant();
    assert!(revive(&mut w, 1).is_err());
    w.balls = original().balls;
    assert!(revive(&mut w, 1).unwrap());
    assert_eq!(hash(&w.encode().unwrap()), vector()["revived_sha256"]);
    assert!(
        finalize_elapsed(&mut w, time("completed_ns") + 1, std::slice::from_ref(&f))
            .unwrap()
            .is_empty()
    );
    assert!(w
        .playability
        .as_ref()
        .unwrap()
        .due(elapsed(&f.deadline_ns).unwrap())
        .is_empty());
    assert_eq!(w.ownership_counts(), [(1, 1)]);
    assert_eq!(
        w.playability.as_ref().unwrap().life(1).unwrap().generation,
        3
    );
    assert!(!revive(&mut w, 1).unwrap());
    w.validate().unwrap();
}
#[test]
fn invalid_clock_facts_are_atomic_and_null_deadlines_fail_closed() {
    let (mut w, f) = dormant();
    let before = w.encode().unwrap();
    for (now, pending) in [
        (time("completed_ns") - 1, vec![]),
        (time("completed_ns"), vec![f.clone(), f.clone()]),
        (u64::MAX, vec![f]),
    ] {
        assert!(finalize_elapsed(&mut w, now, &pending).is_err());
        assert_eq!(w.encode().unwrap(), before);
    }
    w.playability
        .as_mut()
        .unwrap()
        .life_mut(1)
        .unwrap()
        .deadline_ns
        .as_mut()
        .unwrap()
        .0 += 1u32;
    assert!(w.validate().is_err());
    let mut value: Value =
        serde_json::to_value(migrate(&original(), time("observed_ns")).unwrap()).unwrap();
    value["playability"]["lifecycle"][0]["deadline_ns"] = Value::Null;
    assert!(World::decode(&encode(&value).unwrap()).is_err());
}
#[test]
fn shared_owner_is_bound_to_account_and_island_balls_activate_all_cannons() {
    let mut w = migrate(&original(), time("observed_ns")).unwrap();
    let mut c = w.cannons[0].clone();
    c.id = 2;
    c.cell += 1;
    w.cannons.push(c);
    w.next_cannon_id = 3;
    w.playability.as_mut().unwrap().lifecycle.push(Lifecycle {
        cannon: 2,
        player: 1,
        generation: 1,
        dormant_since_ns: None,
        deadline_ns: None,
    });
    w.validate().unwrap();
    assert!(w.active_cannon(2));
    assert_eq!(w.balls.len(), 1);
    assert_eq!(w.territory_ball_count(1), w.territory_ball_count(2));
    assert_eq!(w.score_areas().unwrap(), w.ownership_counts());
    w.cannons[1].account = "02".repeat(32);
    assert!(w.validate().is_err());
    w.cannons[1].account = w.cannons[0].account.clone();
    w.version = 5;
    w.playability = None;
    assert!(w.validate().is_err());
}
#[test]
fn dormant_player_cannot_keep_land_or_invent_player_binding() {
    let (mut w, _) = dormant();
    w.set_owner((w.cannons[0].cell + 10) % 1_000_000, 1)
        .unwrap();
    assert!(w.validate().is_err());
    let mut w = migrate(&original(), time("observed_ns")).unwrap();
    w.playability.as_mut().unwrap().lifecycle[0].player = 2;
    assert!(w.validate().is_err());
}
#[test]
fn expired_player_identity_cannot_retain_unsupported_land() {
    let mut w = migrate(&original(), time("observed_ns")).unwrap();
    let s = w.playability.as_mut().unwrap();
    s.players.push(Player {
        id: 100,
        account: "02".repeat(32),
    });
    s.next_player_id = 101;
    w.validate().unwrap();
    w.set_owner((w.cannons[0].cell + 10) % 1_000_000, 100)
        .unwrap();
    assert_eq!(w.validate().unwrap_err(), "unknown cell owner");
}
