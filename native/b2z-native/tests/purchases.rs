//! Purchase continuations only. Full cursor/IC admission qualification is separate.
use b2z_native::{
    migration::stage_million_world,
    playability::*,
    purchases_v6::*,
    world::{ScaledOwnership, World, Q},
};
use dtr_wire::{decode, encode, hash, unhex, Int};
use serde_json::Value;
fn vector() -> Value {
    serde_json::from_str(include_str!("../../../tests/fixtures/purchases-v6.json")).unwrap()
}
fn original() -> World {
    let f: Value =
        serde_json::from_str(include_str!("../../../tests/fixtures/b2z-torus-v4.json")).unwrap();
    migrate(
        &stage_million_world(
            &World::decode(&unhex(f["migration"]["new_hex"].as_str().unwrap()).unwrap()).unwrap(),
        )
        .unwrap(),
        9_007_199_254_740_993,
    )
    .unwrap()
}
fn memo(s: &str) -> [u8; 8] {
    b2z_protocol::v6::encode(b2z_protocol::v6::parse_text(s.as_bytes()).unwrap()).unwrap()
}
fn run(w: &mut World, plan: &Plan, budget: u64) -> Value {
    let mut b = Batch::fire(w.cannons[0].account.clone(), budget, plan).unwrap();
    let mut steps = 0;
    while b.stop_reason.is_none() {
        b.step(w).unwrap();
        b = decode(&encode(&b).unwrap()).unwrap();
        b.validate(w).unwrap();
        w.validate().unwrap();
        steps += 1;
        assert!(steps <= 65);
    }
    b.receipt().unwrap()
}
#[test]
fn resumed_batches_match_javascript_public_state_and_receipt() {
    let mut w = original();
    let p = prepare(
        &w,
        &w.cannons[0].account,
        50_000_000,
        &memo("FIRE 1 0 2"),
        &[],
    )
    .unwrap();
    let r = run(&mut w, &p, 50_000_000);
    assert_eq!(hash(&w.encode().unwrap()), vector()["state_sha256"]);
    assert_eq!(hash(&encode(&r).unwrap()), vector()["receipt_sha256"]);
    assert_eq!(r["actual_quantity"], 2);
    assert_eq!(
        serde_json::from_value::<Int>(r["amount_used"].clone()).unwrap(),
        Int(50_000_000.into())
    );
}
#[test]
fn quantity_and_partial_fill_never_buy_unrequested_or_unaffordable_balls() {
    for (q, budget, actual, used, stop) in [
        (1, 140_000_000, 1, 10_000_000, "quantity_limit"),
        (3, 139_999_999, 2, 50_000_000, "insufficient_payment"),
    ] {
        let mut w = original();
        let p = prepare(
            &w,
            &w.cannons[0].account,
            budget,
            &memo(&format!("FIRE 1 0 {q}")),
            &[],
        )
        .unwrap();
        let r = run(&mut w, &p, budget);
        assert_eq!(r["actual_quantity"], actual);
        assert_eq!(
            serde_json::from_value::<Int>(r["amount_used"].clone()).unwrap(),
            Int(used.into())
        );
        assert_eq!(
            serde_json::from_value::<Int>(r["remainder"].clone()).unwrap(),
            Int((budget - used).into())
        );
        assert_eq!(r["stop_reason"], stop);
    }
    let mut w = original();
    w.balls.clear();
    w.pending.clear();
    mark_dormant(&mut w, 1).unwrap();
    clear_unsupported_player(&mut w, 1).unwrap();
    let p = prepare(
        &w,
        &w.cannons[0].account,
        10_000_000,
        &memo("FIRE 1 0 1"),
        &[],
    )
    .unwrap();
    let r = run(&mut w, &p, 10_000_000);
    assert_eq!(r["actual_quantity"], 1);
    assert_eq!(w.ownership_counts(), [(1, 1)]);
    assert!(w
        .playability
        .as_ref()
        .unwrap()
        .life(1)
        .unwrap()
        .deadline_ns
        .is_none());
    assert_eq!(
        w.playability.as_ref().unwrap().life(1).unwrap().generation,
        3
    );
}
#[test]
fn spoofed_declarations_and_illegal_plans_do_not_mutate_world() {
    let w = original();
    let before = w.encode().unwrap();
    let other = "02".repeat(32);
    for (text, reason) in [
        ("FIRE 1 0 1", "NOT_OWNER"),
        ("MOVE 1 0", "NOT_OWNER"),
        ("NEW 0 1 0", "FIRST_PLACEMENT_AUTOMATIC"),
    ] {
        assert_eq!(
            prepare(&w, &other, 100_000_000, &memo(text), &[]).unwrap(),
            Plan::Rejected {
                reason: reason.into()
            }
        );
    }
    assert_eq!(w.encode().unwrap(), before);
}
#[test]
fn dormant_retained_cannons_affect_price_and_legacy_selection_is_deterministic() {
    let mut w = original();
    let mut c = w.cannons[0].clone();
    c.id = 2;
    c.cell = 0;
    w.cannons.push(c);
    w.next_cannon_id = 3;
    let state = w.playability.as_mut().unwrap();
    state
        .territories
        .push(b2z_native::territory_v6::Territory { id: 2, player: 1 });
    state.next_territory_id = 3;
    state.lifecycle.push(Lifecycle {
        cannon: 2,
        player: 1,
        generation: 1,
        dormant_since_ns: Some(state.elapsed_ns.clone()),
        deadline_ns: Some(Int(&state.elapsed_ns.0 + DORMANCY_GRACE_NS)),
    });
    w.set_owner(0, 2).unwrap();
    w.validate().unwrap();
    let account = w.cannons[0].account.clone();
    let Plan::New { price, first, .. } =
        prepare(&w, &account, 900_000_000, &memo("NEW 0 1"), &[]).unwrap()
    else {
        panic!("new")
    };
    assert_eq!(price, Int(900_000_000.into()));
    assert!(!first);
    assert!(matches!(
        prepare(&w, &account, 50_000_000, &memo("ANGLE 0"), &[]).unwrap(),
        Plan::Fire {
            cannon: 1,
            explicit: false,
            ..
        }
    ));
    for (cannon, reason) in [(1, "CANNON_OCCUPIED"), (2, "DORMANT_REVIVAL_REQUIRED")] {
        assert_eq!(
            prepare(
                &w,
                &account,
                10_000,
                &memo(&format!("MOVE {cannon} 0")),
                &[]
            )
            .unwrap(),
            Plan::Rejected {
                reason: reason.into()
            }
        );
    }
}
#[test]
fn adjacent_selection_matches_js_and_never_overlaps_a_seam_ball() {
    let mut w = original();
    let v = vector();
    assert_eq!(
        adjacent_sites(&w, 1).unwrap(),
        serde_json::from_value::<Vec<usize>>(v["adjacent_sites"].clone()).unwrap()
    );
    assert_eq!(
        choose_adjacent(&w, 1, &"ab".repeat(32)).unwrap(),
        Some(v["selected_adjacent"].as_u64().unwrap() as usize)
    );
    w.ownership = Some(ScaledOwnership::from_32x32(vec![1; 1024], 1000, 1000).unwrap());
    w.cannons[0].cell = 999;
    w.balls[0].cell = 999;
    w.balls[0].x0 = Int((1000 * Q).into());
    w.balls[0].y0 = Int(512.into());
    w.validate().unwrap();
    let sites = adjacent_sites(&w, 1).unwrap();
    assert!(!sites.contains(&0));
    assert!(sites.contains(&998));
}
#[test]
fn capacity_rechecked_per_item_and_unspawned_balls_are_never_charged() {
    for global in [false, true] {
        let mut w = original();
        let template = w.cannons[0].clone();
        let prototype = w.balls[0].clone();
        w.ownership = Some(ScaledOwnership::from_32x32(vec![0; 1024], 1000, 1000).unwrap());
        w.cannons.clear();
        w.balls.clear();
        w.playability.as_mut().unwrap().lifecycle.clear();
        w.playability.as_mut().unwrap().territories.clear();
        let groups = if global {
            let mut g = vec![2];
            g.extend([64; 7]);
            g.push(MAX_BALLS - 1 - 2 - 7 * 64);
            g
        } else {
            vec![MAX_PURCHASE_BALLS_PER_ISLAND - 1]
        };
        for (index, count) in groups.iter().enumerate() {
            let id = index as u32 + 1;
            let cell = 100 + index * 2;
            w.cannons.push(b2z_native::world::Cannon {
                id,
                cell,
                ..template.clone()
            });
            let s = w.playability.as_mut().unwrap();
            s.territories
                .push(b2z_native::territory_v6::Territory { id, player: 1 });
            s.lifecycle.push(Lifecycle {
                cannon: id,
                player: 1,
                generation: 1,
                dormant_since_ns: None,
                deadline_ns: None,
            });
            w.set_owner(cell, id).unwrap();
            for _ in 0..*count {
                let mut b = prototype.clone();
                b.id = w.balls.len() as u32 + 1;
                b.owner = 1;
                b.cell = cell;
                b.x0 = Int((cell as i64 * Q + Q / 2).into());
                b.x0.0 -= w.time.0.to_integer() * b.vx;
                b.y0 = Int((Q / 2).into());
                b.y0.0 -= w.time.0.to_integer() * b.vy;
                w.balls.push(b);
            }
        }
        w.next_ball_id = w.balls.len() as u32 + 1;
        w.next_cannon_id = w.cannons.len() as u32 + 1;
        w.playability.as_mut().unwrap().next_territory_id = w.next_cannon_id;
        w.validate().unwrap();
        let before = w.balls.len();
        let p = prepare(&w, &template.account, u64::MAX, &memo("FIRE 1 0 2"), &[]).unwrap();
        let r = run(&mut w, &p, u64::MAX);
        let price = b2z_native::pricing_v6::ball_price(groups[0] as u32).unwrap();
        assert_eq!(w.balls.len(), before + 1);
        assert_eq!(r["actual_quantity"], 1);
        assert_eq!(r["stop_reason"], "capacity");
        assert_eq!(r["status"], "partially_applied");
        assert_eq!(
            serde_json::from_value::<Int>(r["amount_used"].clone()).unwrap(),
            Int(price.into())
        );
        assert_eq!(
            serde_json::from_value::<Int>(r["remainder"].clone()).unwrap(),
            Int((u64::MAX - price).into())
        );
    }
}
#[test]
fn new_cannon_surplus_and_shared_ownership_match_js_without_partial_mutation() {
    for first in [true, false] {
        let w = original();
        let account = if first {
            "02".repeat(32)
        } else {
            w.cannons[0].account.clone()
        };
        let amount = if first { 150_000_000 } else { 530_000_000 };
        let plan = prepare(&w, &account, amount, &memo("NEW 0 3"), &[]).unwrap();
        let vectors = vector();
        let v = &vectors["spawns"][if first { "first" } else { "additional" }];
        let placement: b2z_native::spawn::Placement =
            serde_json::from_value(v["placement"].clone()).unwrap();
        let before = w.encode().unwrap();
        if first {
            let mut job = b2z_native::spawn::SpawnJob::begin("ab".repeat(32));
            let mut work = 0;
            while !job.step(&w).unwrap() {
                work += 1;
                assert!(work <= 1030);
                if work % 64 == 0 {
                    job = decode(&encode(&job).unwrap()).unwrap();
                }
            }
            assert_eq!(
                serde_json::to_value(job.result.as_ref().unwrap()).unwrap(),
                v["placement"]
            );
            let mut old = w.clone();
            old.version = 5;
            old.playability = None;
            let mut control = b2z_native::spawn::SpawnJob::begin("ab".repeat(32));
            while !control.step(&old).unwrap() {}
            assert_eq!(
                encode(&job.result).unwrap(),
                encode(&control.result).unwrap()
            );
        }
        let mut proposal = place_new(&w, &account, amount, &plan, &placement).unwrap();
        assert_eq!(w.encode().unwrap(), before);
        let mut batch =
            Batch::after_new(account.clone(), amount, proposal.cannon.id, &plan).unwrap();
        while batch.stop_reason.is_none() {
            batch.step(&mut proposal.world).unwrap();
            batch = decode(&encode(&batch).unwrap()).unwrap();
            proposal.world.validate().unwrap();
        }
        assert_eq!(proposal.world.cannons.len(), w.cannons.len() + 1);
        assert_eq!(proposal.world.balls.len(), w.balls.len() + 3);
        let receipt = batch.receipt().unwrap();
        assert_eq!(receipt["actual_quantity"], 3);
        assert_eq!(
            serde_json::from_value::<Int>(receipt["remainder"].clone()).unwrap(),
            Int(0.into())
        );
        assert_eq!(
            batch.prices,
            [
                Int((if first { 100_000_000 } else { 400_000_000 }).into()),
                Int((if first { 10_000_000 } else { 40_000_000 }).into()),
                Int((if first { 40_000_000 } else { 90_000_000 }).into())
            ]
        );
        assert_eq!(hash(&proposal.world.encode().unwrap()), v["state_sha256"]);
        assert_eq!(hash(&encode(&proposal.event).unwrap()), v["event_sha256"]);
        assert_eq!(hash(&encode(&receipt).unwrap()), v["receipt_sha256"]);
        let mut invalid = placement;
        invalid.kind = if first { 4 } else { 2 };
        assert!(place_new(&w, &account, amount, &plan, &invalid).is_err());
        assert_eq!(w.encode().unwrap(), before);
    }
}
#[test]
fn shared_owner_cannon_footprints_reflect_edges_corners_and_seams() {
    use b2z_native::geometry::{classify, next_crossing, passage};
    for anchor in [0, 1] {
        for (dx, dy) in [
            (1, 0),
            (-1, 0),
            (0, 1),
            (0, -1),
            (1, 1),
            (1, -1),
            (-1, 1),
            (-1, -1),
        ] {
            let base = original();
            let account = &base.cannons[0].account;
            let plan = prepare(&base, account, 400_000_000, &memo("NEW 0 1"), &[]).unwrap();
            let placement =
                serde_json::from_value(vector()["spawns"]["additional"]["placement"].clone())
                    .unwrap();
            let mut w = place_new(&base, account, 400_000_000, &plan, &placement)
                .unwrap()
                .world;
            w.ownership = Some(ScaledOwnership::from_32x32(vec![1; 1024], 1000, 1000).unwrap());
            w.cannons[anchor].cell = 0;
            let time = w.time.0.to_integer();
            let b = w.balls.iter_mut().find(|b| b.id == 2).unwrap();
            let x = (1000 - dx) % 1000;
            let y = (1000 - dy) % 1000;
            b.cell = (y * 1000 + x) as usize;
            b.vx = (dx * 32000) as i32;
            b.vy = (dy * 32000) as i32;
            b.x0 = Int((x * Q
                + if dx > 0 {
                    Q
                } else if dx < 0 {
                    0
                } else {
                    Q / 2
                })
            .into());
            b.x0.0 -= &time * b.vx;
            b.y0 = Int((y * Q
                + if dy > 0 {
                    Q
                } else if dy < 0 {
                    0
                } else {
                    Q / 2
                })
            .into());
            b.y0.0 -= &time * b.vy;
            w.validate().unwrap();
            let b = w.balls.iter().find(|b| b.id == 2).unwrap();
            let i = classify(&w, b, next_crossing(b, w.width, &w.time).unwrap());
            assert!(i.attack.is_none());
            assert!(i.targets.iter().all(|t| !t.capturable));
            assert_eq!(passage(&w, b, &i), (false, false, dx != 0 && dy != 0));
        }
    }
}
#[test]
fn shared_land_passes_but_moved_cannon_revalidates_the_frozen_intent() {
    use b2z_native::geometry::{classify, next_crossing, passage};
    let base = original();
    let account = &base.cannons[0].account;
    let plan = prepare(&base, account, 400_000_000, &memo("NEW 0 1"), &[]).unwrap();
    let placement =
        serde_json::from_value(vector()["spawns"]["additional"]["placement"].clone()).unwrap();
    let mut w = place_new(&base, account, 400_000_000, &plan, &placement)
        .unwrap()
        .world;
    w.ownership = Some(ScaledOwnership::from_32x32(vec![1; 1024], 1000, 1000).unwrap());
    let time = w.time.0.to_integer();
    let b = w.balls.iter_mut().find(|b| b.id == 2).unwrap();
    b.cell = 100099;
    b.vx = 32000;
    b.vy = 0;
    b.x0 = Int((100 * Q).into());
    b.x0.0 -= &time * b.vx;
    b.y0 = Int((100 * Q + Q / 2).into());
    w.validate().unwrap();
    let b = w.balls.iter().find(|b| b.id == 2).unwrap();
    let i = classify(&w, b, next_crossing(b, w.width, &w.time).unwrap());
    assert!(i.targets[0].pass);
    assert!(i.attack.is_none());
    assert!(passage(&w, b, &i).0);
    w.cannons[0].cell = 100100;
    w.validate().unwrap();
    let b = w.balls.iter().find(|b| b.id == 2).unwrap();
    assert!(!passage(&w, b, &i).0);
    assert!(classify(&w, b, next_crossing(b, w.width, &w.time).unwrap())
        .attack
        .is_none());
}
