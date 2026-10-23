//! New v4 vectors; immutable v3 history remains covered by replay.rs.
use b2z_native::{million_identity, torus_identity, Cursor, Input};
use dtr_wire::{decode, hash, unhex};
use serde_json::Value;
fn million_split_world() -> b2z_native::world::World {
    use b2z_native::world::{Ball, Cannon, World};
    use dtr_wire::{Int, Rat};
    let account = |id: u32| format!("{id:064x}");
    World {
        version: 4,
        width: 32,
        height: 32,
        cells: (0..1024)
            .map(|cell| if cell % 32 < 16 { 1 } else { 2 })
            .collect(),
        ownership: None,
        cannons: vec![
            Cannon {
                id: 1,
                cell: 264,
                account: account(1),
                heading: Some(0),
            },
            Cannon {
                id: 2,
                cell: 279,
                account: account(2),
                heading: Some(0),
            },
        ],
        balls: vec![
            Ball {
                id: 1,
                owner: 1,
                cell: 264,
                x0: Int((8 * 1024 + 512).into()),
                y0: Int((8 * 1024 + 512).into()),
                vx: 1024,
                vy: 1,
            },
            Ball {
                id: 2,
                owner: 2,
                cell: 279,
                x0: Int((23 * 1024 + 512).into()),
                y0: Int((8 * 1024 + 512).into()),
                vx: 1024,
                vy: 1,
            },
        ],
        time: Rat::integer(0),
        next_cannon_id: 3,
        next_ball_id: 3,
        pending: vec![],
        next_strike_id: 1,
        received_e8s: Int(0.into()),
        credits: vec![],
    }
}
#[test]
fn toroidal_reference_is_byte_exact_and_recovers_every_bounded_phase() {
    let fixture: Value =
        serde_json::from_str(include_str!("../../../tests/fixtures/b2z-torus-v4.json")).unwrap();
    assert_eq!(torus_identity().unwrap(), fixture["identity"]);
    for case in fixture["cases"].as_array().unwrap() {
        let initial = unhex(case["initial_hex"].as_str().unwrap()).unwrap();
        let inputs: Vec<Input> =
            decode(&unhex(case["inputs_hex"].as_str().unwrap()).unwrap()).unwrap();
        let context: Value =
            decode(&unhex(case["context_hex"].as_str().unwrap()).unwrap()).unwrap();
        for budgets in [[512, 512, 512], [7, 31, 127]] {
            let mut c = Cursor::begin(&initial, inputs.clone(), &context).unwrap();
            let mut n = 0;
            while c.phase != "done" {
                c.step(budgets[n % 3]).unwrap();
                n += 1;
                if n % 13 == 0 {
                    let raw = c.snapshot().unwrap();
                    c = Cursor::restore(&raw, &hash(&raw)).unwrap();
                }
                assert!(n < 100000);
            }
            let raw = c.result().unwrap();
            for (kind, bytes) in [
                ("state", raw.state),
                ("events", raw.events),
                ("scores", raw.scores),
            ] {
                assert_eq!(
                    bytes,
                    unhex(case["outputs"][kind]["hex"].as_str().unwrap()).unwrap(),
                    "{} {kind}",
                    case["name"]
                );
            }
        }
    }
}

#[test]
fn staged_migration_matches_javascript_and_refuses_unfinished_work() {
    use b2z_native::{
        migration::{stage_world, Boundary},
        world::World,
    };
    let fixture: Value =
        serde_json::from_str(include_str!("../../../tests/fixtures/b2z-torus-v4.json")).unwrap();
    let old =
        World::decode(&unhex(fixture["migration"]["old_hex"].as_str().unwrap()).unwrap()).unwrap();
    let migrated = stage_world(
        &old,
        &Boundary {
            source_cursor: 39526412,
            ledger_cutover: Some(39526500),
            account_history_complete_through: Some(39526500),
            ..Boundary::default()
        },
    )
    .unwrap();
    assert_eq!(
        migrated.encode().unwrap(),
        unhex(fixture["migration"]["new_hex"].as_str().unwrap()).unwrap()
    );
    assert_eq!(migrated.credits, old.credits);
    assert_eq!(migrated.received_e8s, old.received_e8s);
    for boundary in [
        Boundary {
            staged: true,
            ..Boundary::default()
        },
        Boundary {
            pending_inputs: 1,
            ..Boundary::default()
        },
        Boundary {
            source_pending: true,
            ..Boundary::default()
        },
        Boundary {
            source_in_flight: true,
            ..Boundary::default()
        },
    ] {
        assert!(stage_world(&old, &boundary).is_err());
    }
}

#[test]
fn million_cell_migration_is_compact_and_preserves_paid_state() {
    use b2z_native::{migration::stage_million_world, world::World};
    let fixture: Value =
        serde_json::from_str(include_str!("../../../tests/fixtures/b2z-torus-v4.json")).unwrap();
    let old =
        World::decode(&unhex(fixture["migration"]["new_hex"].as_str().unwrap()).unwrap()).unwrap();
    let next = stage_million_world(&old).unwrap();
    let bytes = next.encode().unwrap();
    assert_eq!(
        million_identity().unwrap(),
        serde_json::json!({
            "rules_hash":"0bb2169c5ccd71b6c43e0e47bb0ea341c577881ab3193bf1bbd3eed3b02ffb14",
            "schema_hash":"a9317c0f2449e8c511c6d0aaef8d1988054b4b61f3f58984ead3a42c85a73d03",
            "config_hash":"cfd4fa714ee1c835b56e7f5939d9f1f56312bbbfc0c09775681e581dc3250c03"
        })
    );
    assert_eq!(bytes.len(), 2742);
    assert_eq!(
        hash(&bytes),
        "72a73e5e53072848d9b38f30000240adf65baf802da5351bbbeb81d490e14444"
    );
    assert_eq!((next.version, next.width, next.height), (5, 1000, 1000));
    assert_eq!(next.cell_count(), 1_000_000);
    assert!(next.cells.is_empty());
    assert!(
        bytes.len() < 100_000,
        "compact state was {} bytes",
        bytes.len()
    );
    assert_eq!(next.credits, old.credits);
    assert_eq!(next.received_e8s, old.received_e8s);
    assert_eq!(next.cannons.len(), old.cannons.len());
    assert_eq!(next.balls.len(), old.balls.len());
    let expected_owned: usize = old
        .cells
        .iter()
        .enumerate()
        .filter(|(_, owner)| **owner != 0)
        .map(|(cell, _)| {
            let x = cell % 32;
            let y = cell / 32;
            (((x + 1) * 1000).div_ceil(32) - (x * 1000).div_ceil(32))
                * (((y + 1) * 1000).div_ceil(32) - (y * 1000).div_ceil(32))
        })
        .sum();
    assert_eq!(
        next.ownership_counts().iter().map(|p| p.1).sum::<usize>(),
        expected_owned
    );
    assert_eq!(World::decode(&bytes).unwrap(), next);
    for cannon in &next.cannons {
        assert_eq!(next.owner(cannon.cell), Some(cannon.id));
    }
    for ball in &next.balls {
        assert_eq!(next.owner(ball.cell), Some(ball.owner));
    }
}

#[test]
fn million_cell_boundary_capture_is_local_and_compact() {
    use b2z_native::{migration::stage_million_world, topology};
    use dtr_wire::encode;
    let old = million_split_world();
    old.validate().unwrap();
    let mut world = stage_million_world(&old).unwrap();
    let target = 400_500;
    assert_eq!(world.owner(target), Some(2));
    assert_eq!(world.owner(target - 1), Some(1));
    let mut job = topology::capture(&mut world, target, 1, true).unwrap();
    let mut units = 0;
    while !topology::step(&mut world, &mut job).unwrap() {
        units += 1;
        assert!(units < 100, "ordinary capture flooded a scaled territory");
        assert!(encode(&job).unwrap().len() < 20_000);
    }
    assert_eq!(world.owner(target), Some(1));
    assert_eq!(
        job.changed_ranges
            .iter()
            .map(|range| (range.start, range.end))
            .collect::<Vec<_>>(),
        vec![(target, target + 1)]
    );
    assert_eq!(world.ownership_counts(), vec![(1, 500_001), (2, 499_999)]);
    assert_eq!(world.balls.len(), 2);
    world.validate().unwrap();
}

#[test]
fn million_cell_one_tick_matches_javascript_and_recovers_every_slice() {
    use b2z_native::{migration::stage_million_world, Cursor};
    use dtr_wire::{Int, Rat};
    let state = stage_million_world(&million_split_world())
        .unwrap()
        .encode()
        .unwrap();
    let mut context = million_identity().unwrap();
    let object = context.as_object_mut().unwrap();
    object.insert("source_id".into(), serde_json::json!("00".repeat(32)));
    object.insert("logical_start".into(), serde_json::json!(Int(0.into())));
    object.insert("logical_end".into(), serde_json::json!(Int(1.into())));
    let mut cursor = Cursor::begin(&state, vec![], &context).unwrap();
    let mut units = 0;
    let mut max_snapshot = 0;
    while cursor.phase != "done" {
        cursor.step(1).unwrap();
        units += 1;
        let snapshot = cursor.snapshot().unwrap();
        max_snapshot = max_snapshot.max(snapshot.len());
        if units % 11 == 0 {
            cursor = Cursor::restore(&snapshot, &hash(&snapshot)).unwrap();
        }
        assert!(units < 10_000);
    }
    let output = cursor.result().unwrap();
    assert_eq!(units, 313);
    assert!(max_snapshot < 20_000);
    assert_eq!(
        [
            hash(&output.state),
            hash(&output.events),
            hash(&output.scores)
        ],
        [
            "7cb53a379c66bf09b44eadb249a83b41fa86247aa9243fcea2561ee3dd0c3a03".to_string(),
            "7865dc45b7bd47d54ccd885457c7bfcfe68aef38a885d2c1db3578146d1d318b".to_string(),
            "05e60abb7576697f0334c3e8da1ab284f41526bdb4e8f5408b07d177483aee42".to_string(),
        ]
    );
    assert_eq!(
        b2z_native::world::World::decode(&output.state)
            .unwrap()
            .time,
        Rat::integer(1)
    );
}

#[test]
fn adversarial_large_severance_is_bounded_resumable_and_compact() {
    use b2z_native::{migration::stage_million_world, topology};
    use dtr_wire::encode;
    let mut world = stage_million_world(&million_split_world()).unwrap();
    // Two attacker-owned horizontal barriers turn one defender cell into the
    // only bridge between two 249,500-cell components on the torus.
    world.set_owner_range(500, 1000, 2, 1).unwrap();
    world.set_owner_range(500_500, 500_750, 2, 1).unwrap();
    world.set_owner_range(500_751, 501_000, 2, 1).unwrap();
    let target = 500_750;
    let mut job = topology::capture(&mut world, target, 1, true).unwrap();
    let mut units = 0usize;
    let mut max_continuation = 0usize;
    while !topology::step(&mut world, &mut job).unwrap() {
        units += 1;
        if units % 50_000 == 0 {
            let bytes = encode(&job).unwrap();
            max_continuation = max_continuation.max(bytes.len());
            assert!(
                bytes.len() < 200_000,
                "continuation {} at {units}",
                bytes.len()
            );
            world.validate().unwrap();
        }
        assert!(units < 600_000);
    }
    assert_eq!(units, 499_508);
    assert!(max_continuation < 200_000);
    assert_eq!(world.ownership_counts(), vec![(1, 750_500), (2, 249_500)]);
    assert_eq!(job.changed_ranges.len(), 500);
    let state = world.encode().unwrap();
    assert_eq!(state.len(), 22_900);
    assert_eq!(
        hash(&state),
        "8a82b10e8d426e9bd19b54669094781b020b9de5e73ffd7290a2a07b34104dd2"
    );
    eprintln!(
        "million severance: work={units} max_continuation={max_continuation} state={} ranges={}",
        state.len(),
        job.changed_ranges.len()
    );
}
