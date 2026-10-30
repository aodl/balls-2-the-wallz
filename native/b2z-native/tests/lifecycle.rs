//! Pure context facts only; installed certificate/epoch/replay gates are separate.
use b2z_native::{lifecycle_v6::expire, playability::Fence, world::World};
use dtr_wire::{decode, hash, unhex};
use serde_json::Value;
fn fixture() -> Value {
    serde_json::from_str(include_str!("../../../tests/fixtures/lifecycle-v6.json")).unwrap()
}
fn world() -> World {
    World::decode(&unhex(fixture()["previous_state_hex"].as_str().unwrap()).unwrap()).unwrap()
}
fn fences() -> Vec<Fence> {
    decode(&unhex(fixture()["fences_hex"].as_str().unwrap()).unwrap()).unwrap()
}
fn now() -> u64 {
    fixture()["observed_ns"].as_str().unwrap().parse().unwrap()
}
#[test]
fn expiry_outputs_match_js_and_preserve_time_and_paid_history() {
    let w = world();
    let before = w.encode().unwrap();
    let r = expire(&w, now(), &fences()).unwrap().unwrap();
    let next = World::decode(&r.output.state).unwrap();
    let f = fixture();
    for (name, bytes) in [
        ("state", &r.output.state),
        ("events", &r.output.events),
        ("scores", &r.output.scores),
    ] {
        assert_eq!(hash(bytes), f["outputs"][name]);
    }
    assert_eq!(hash(&r.metadata), f["metadata_sha256"]);
    assert_eq!(
        r.metadata,
        unhex(f["metadata_hex"].as_str().unwrap()).unwrap()
    );
    assert_eq!(next.time, w.time);
    assert_eq!(next.credits, w.credits);
    assert_eq!(next.received_e8s, w.received_e8s);
    assert_eq!(next.next_cannon_id, w.next_cannon_id);
    assert_eq!(next.next_ball_id, w.next_ball_id);
    assert!(next.cannons.is_empty());
    assert_eq!(next.owner(w.cannons[0].cell), Some(0));
    assert_eq!(
        next.playability.as_ref().unwrap().players,
        w.playability.as_ref().unwrap().players
    );
    assert_eq!(w.encode().unwrap(), before);
    assert!(expire(&next, now(), &fences()).unwrap().is_none());
}
#[test]
fn premature_and_malformed_facts_are_fatal_and_atomic() {
    let w = world();
    let before = w.encode().unwrap();
    let f = fences()[0].clone();
    assert_eq!(
        expire(&w, now() - 1, std::slice::from_ref(&f))
            .err()
            .unwrap(),
        "EXPIRY_NOT_DUE"
    );
    assert!(expire(&w, now(), &[f.clone(), f.clone()]).is_err());
    let mut invalid = f;
    invalid.generation += 1;
    assert!(expire(&w, now(), &[invalid]).is_err());
    assert_eq!(w.encode().unwrap(), before);
    let late = expire(&w, now() + 30 * 86_400_000_000_000, &fences())
        .unwrap()
        .unwrap();
    assert_eq!(World::decode(&late.output.state).unwrap().time, w.time);
}
#[test]
fn a_friendly_ball_reactivates_every_cannon_in_its_island_and_fences_expiry() {
    use b2z_native::{
        playability::{revive_territory, Lifecycle, DORMANCY_GRACE_NS},
        purchases_v6::{prepare, Batch},
    };
    use dtr_wire::Int;
    let mut w = world();
    let c = w.cannons[0].clone();
    let memo = b2z_protocol::v6::encode(b2z_protocol::v6::Command::Fire {
        cannon: c.id,
        angle: 0,
        quantity: 1,
    })
    .unwrap();
    let plan = prepare(&w, &c.account, 10_000_000, &memo, &[]).unwrap();
    let mut batch = Batch::fire(c.account.clone(), 10_000_000, &plan).unwrap();
    assert!(batch.step(&mut w).unwrap().unwrap().revived);
    assert!(expire(&w, now(), &fences()).unwrap().is_none());
    let cell = c.cell + 1;
    let id = w.next_cannon_id;
    w.next_cannon_id += 1;
    w.cannons.push(b2z_native::world::Cannon { id, cell, ..c });
    w.set_owner(cell, 1).unwrap();
    let s = w.playability.as_mut().unwrap();
    let since = s.elapsed_ns.clone();
    let deadline = Int(&since.0 + DORMANCY_GRACE_NS);
    s.lifecycle.push(Lifecycle {
        cannon: id,
        player: 1,
        generation: 1,
        dormant_since_ns: Some(since),
        deadline_ns: Some(deadline.clone()),
    });
    assert!(w.validate().is_err());
    assert_eq!(revive_territory(&mut w, 1).unwrap(), vec![id]);
    w.validate().unwrap();
    assert!(w.active_cannon(id));
    assert!(expire(
        &w,
        now(),
        &[Fence {
            cannon: id,
            generation: 1,
            deadline_ns: deadline
        }]
    )
    .unwrap()
    .is_none());
    assert_eq!(w.cannons.len(), 2);
}
#[test]
fn maximum_deadline_batch_is_bounded_and_does_not_change_the_paid_clock() {
    use b2z_native::playability::{
        elapsed, Lifecycle, Player, State, DORMANCY_GRACE_NS, MAX_CANNONS, MAX_RETAINED_PER_PLAYER,
    };
    use dtr_wire::Int;
    let mut w = world();
    let template = w.cannons[0].clone();
    let since = w.playability.as_ref().unwrap().elapsed_ns.clone();
    let deadline = Int(&since.0 + DORMANCY_GRACE_NS);
    w.clear_owner(1).unwrap();
    w.cannons.clear();
    w.balls.clear();
    w.pending.clear();
    w.playability = Some(State {
        elapsed_ns: since.clone(),
        next_player_id: 1,
        next_territory_id: MAX_CANNONS as u32 + 1,
        territories: vec![],
        players: vec![],
        lifecycle: vec![],
    });
    for index in 0..MAX_CANNONS {
        let id = index as u32 + 1;
        let player = (index / MAX_RETAINED_PER_PLAYER) as u32 + 1;
        let account = if player == 1 {
            template.account.clone()
        } else {
            format!("{player:02x}").repeat(32)
        };
        let state = w.playability.as_mut().unwrap();
        if state.players.last().is_none_or(|p| p.id != player) {
            state.players.push(Player {
                id: player,
                account: account.clone(),
            });
        }
        state.lifecycle.push(Lifecycle {
            cannon: id,
            player,
            generation: 1,
            dormant_since_ns: Some(since.clone()),
            deadline_ns: Some(deadline.clone()),
        });
        w.cannons.push(b2z_native::world::Cannon {
            id,
            cell: index * 2,
            account,
            heading: template.heading,
        });
        w.playability
            .as_mut()
            .unwrap()
            .territories
            .push(b2z_native::territory_v6::Territory { id, player });
        w.set_owner(index * 2, id).unwrap();
    }
    w.next_cannon_id = MAX_CANNONS as u32 + 1;
    let state = w.playability.as_mut().unwrap();
    state.next_player_id = state.players.len() as u32 + 1;
    w.validate().unwrap();
    let at = elapsed(&deadline).unwrap();
    let fences = w.playability.as_ref().unwrap().due(at);
    let r = expire(&w, at, &fences).unwrap().unwrap();
    let next = World::decode(&r.output.state).unwrap();
    assert_eq!(r.expired.len(), MAX_CANNONS);
    assert!(next.cannons.is_empty());
    assert!(next.ownership_counts().is_empty());
    assert_eq!(next.time, w.time);
    assert_eq!(next.credits, w.credits);
    assert!(r.output.events.len() < 1024 * 1024);
    assert!(expire(&next, at, &fences).unwrap().is_none());
}
