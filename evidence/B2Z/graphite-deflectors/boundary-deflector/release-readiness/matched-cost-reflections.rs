use super::*;
use b2z_native::world::World;

thread_local! { static FIXTURE_CYCLES: std::cell::Cell<u128> = const { std::cell::Cell::new(100_000_000_000_000) }; }
pub(super) fn fixture_cycles() -> u128 { FIXTURE_CYCLES.with(std::cell::Cell::get) }


#[derive(CandidType, Deserialize, serde::Serialize)]
struct Metrics {
    messages: u64,
    seal_instructions: u64,
    step_instructions: u64,
    publish_instructions: u64,
    persist_instructions: u64,
    max_instructions: u64,
}
#[derive(CandidType, Deserialize)]
struct Runtime { metrics: Metrics }
#[derive(CandidType, Deserialize)]
struct Run { run: Work }
#[derive(CandidType, Deserialize)]
struct Work { total_work: u64 }

#[test]
fn release_readiness_matched() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    let fixtures: serde_json::Value = serde_json::from_slice(
        &std::fs::read(root.join("tests/fixtures/boundary-deflector-v12.json")).unwrap()
    ).unwrap();
    let normal = bytes("B2Z_S14_WASM");
    let prior = bytes("B2Z_RULES11_PRIOR_WASM");
    assert_eq!(dtr_wire::hash(&normal), "2cb2fe026941cbdd5373b490e1300f430db62b0b274e9f604ad3ad1a0f03ac13");
    assert_eq!(dtr_wire::hash(&prior), "5ffb6cc2c1cd377ef36a847df309fc21ead8e4b66d97d49200ca00d80b3e8a43");
    let out = PathBuf::from(std::env::var("S14_DEPLOYMENT_OUTPUT").unwrap());
    std::fs::create_dir_all(&out).unwrap();
    let mut rows = vec![];
    for (label, fixture, v12, allowance, trickle, idle, gap, demand) in [
        ("idle-A","corridor-with-recovery",false,2,true,true,false,0),
        ("idle-B","corridor-with-recovery",false,1,true,true,false,0),
        ("idle-C","corridor-with-recovery",true,1,true,true,false,0),
        ("trickle-A","corridor-with-recovery",false,2,true,false,false,0),
        ("trickle-B","corridor-with-recovery",false,1,true,false,false,0),
        ("trickle-C","corridor-with-recovery",true,1,true,false,false,0),
        ("normal-A","corridor-with-recovery",false,2,false,false,false,0),
        ("normal-B","corridor-with-recovery",false,1,false,false,false,0),
        ("normal-C","corridor-with-recovery",true,1,false,false,false,0),
        ("reflection-A","near-parallel-cannon-reflection-NE",false,2,false,false,false,0),
        ("reflection-B","near-parallel-cannon-reflection-NE",false,1,false,false,false,0),
        ("reflection-C","near-parallel-cannon-reflection-NE",true,1,false,false,false,0),
        ("gap-A","corridor-with-recovery",false,2,true,false,true,0),
        ("gap-B","corridor-with-recovery",false,1,true,false,true,0),
        ("gap-C","corridor-with-recovery",true,1,true,false,true,0),
        ("small-C","immutable-four-direction-diamond",true,1,true,false,false,2),
        ("diamond-C","immutable-four-direction-diamond",true,1,false,false,false,4),
        ("moderate-C","global-capacity-64-balls-256-structures",true,1,true,false,false,32),
        ("capacity-C","global-capacity-64-balls-256-structures",true,1,false,false,false,256),
    ] {
        if let Ok(group) = std::env::var("READINESS_GROUP") {
            if !label.starts_with(&group) { continue; }
        }
        let fixture = fixtures["rows"].as_array().unwrap().iter().find(|x| x["name"] == fixture).unwrap();
        let mut world = World::decode(&unhex(fixture["initial_hex"].as_str().unwrap()).unwrap()).unwrap();
        world.deflectors.as_mut().unwrap().truncate(demand);
        if label.starts_with("reflection-") {
            let ball = &mut world.balls[0];
            assert_eq!(ball.cell, 1001);
            ball.vx = 0;
            ball.vy = 32000;
            ball.x0 = Int(1536.into());
        }
        if label == "moderate-C" {
            let mut seen = std::collections::BTreeSet::new();
            world.balls.retain(|ball| seen.insert(ball.owner));
        }
        if idle {
            world.cannons.clear();
            world.balls.clear();
            world.pending.clear();
            world.credits.clear();
            let o = world.ownership.as_mut().unwrap();
            o.base.fill(0); o.overrides.clear(); o.counts.clear();
            let p=world.playability.as_mut().unwrap();
            p.players.clear(); p.territories.clear(); p.lifecycle.clear();
        }
        if demand == 0 && !(idle && v12) {
            world.version = 6;
            world.deflectors = None;
            world.next_deflector_id = None;
            for ball in &mut world.balls { ball.den = None; }
        }
        world.validate().unwrap();
        FIXTURE_CYCLES.with(|cycles| cycles.set(if trickle { 1_750_000_000_000 } else { 100_000_000_000_000 }));
        let (pic, id, _, _) = arena_setup_world(bytes("B2Z_S14_TEST_WASM"), world.encode().unwrap());
        
        playability_installed::funding_paused(&pic, id, true);
        if demand == 0 && !(idle && v12) {
            war_cry_installed::transition(&pic, id, "entry");
            if !idle {
                // Setup only. While the gameplay driver is paused, let the old
                // pace deadline elapse instead of issuing thousands of empty rounds.
                if trickle { pic.advance_time(Duration::from_secs(101)); }
                playability_installed::one_tick(&pic, id);
            }
            war_cry_installed::transition(&pic, id, "combined");
            if !idle {
                // Setup only. While the gameplay driver is paused, let the old
                // pace deadline elapse instead of issuing thousands of empty rounds.
                if trickle { pic.advance_time(Duration::from_secs(101)); }
                playability_installed::one_tick(&pic, id);
            }
        }
        if v12 && demand == 0 && !idle {
            let setup: Status = get_result(&pic,id,"start_autonomous",candid::encode_one(RunConfig {segment_ticks:1,pacing_seconds:1,work_budget:512}).unwrap());
            assert!(setup.run.running);
            get_result::<Status>(&pic,id,"pause_autonomous",encode_args(()).unwrap());
            war_cry_installed::transition(&pic,id,"deflector");
        }
        pic.upgrade_canister(id, if v12 { normal.clone() } else { prior.clone() }, encode_args(()).unwrap(), Some(controller())).unwrap();
        for _ in 0..6 { tick(&pic); }
        let initial = arena_world(&pic, id);
        let now = status(&pic, id);
        assert_eq!(now.run.pace.unwrap().mode, if trickle {"Trickle"}else{"Normal"});
        let initial_metrics: Runtime = get_query(&pic,id,"controller_runtime",encode_args(()).unwrap());
        let initial_totals: Run = get_query(&pic,id,"lab_status",encode_args(()).unwrap());
        let initial_world = dtr_wire::hash(&initial.encode().unwrap());
        let identity = observe(&pic,id).1.identity;
        assert_eq!(identity.rules_hash, if v12 {"1b44508ad27a714b43888e3d0cf84beeb9a2450bb25112bfd3b650b865105c1c"} else {"5d0ca4591a782b609ef10d9db46d4bd93042b0fcdd738d8d1f920840c05b7756"});
        let cycles = pic.cycle_balance(id);
        let begin = pic.get_time().as_nanos_since_unix_epoch();
        let start: Status = get_result(&pic, id, "start_autonomous", candid::encode_one(RunConfig {segment_ticks:allowance,pacing_seconds:1,work_budget:512}).unwrap());
        let expected = start.run.publication_ticks.unwrap();
        assert_eq!(expected, if trickle {1}else{allowance});
        eprintln!("READY {label} allowance={expected}");
        let target = if demand > 2 {2}else{4};
        let step = if trickle && !idle { Duration::from_secs(10) } else if idle { Duration::from_secs(2) } else { Duration::from_millis(50) };
        let mut last = now.run.completed_segments;
        let mut events=0;
        let mut reflections=0;
        let mut last_velocity=initial.balls.first().map(|b| (i64::from(b.vx),i64::from(b.vy)));
        let mut payload=0;
        let mut counts=vec![];
        let mut first_after_gap=None;
        for i in 0..if trickle && !idle { 100 } else { 1500 } {
            if gap && i==3 {
                pic.advance_time(Duration::from_secs(600));
            }
            pic.advance_time(step);
            pic.tick();
            let current=status(&pic,id);
            assert!(current.run.last_error.is_none(), "{label}: {:?}",current.run.last_error);
            if current.run.completed_segments > last {
                assert_eq!(current.run.completed_segments, last+1);
                last=current.run.completed_segments;
                let (o,p)=observe(&pic,id);
                let segment=p.head.segment_id.unwrap().0.to_string().parse::<u64>().unwrap();
                let bundle: Vec<Vec<u8>>=get_query(&pic,id,"artifact_bundle",encode_args((segment,dtr_wire::hash(&o.publication))).unwrap());
                let audit: serde_json::Value=decode(&bundle[1]).unwrap();
                let event_rows=audit["events"].as_array().unwrap();
                events+=event_rows.len();
                if label.starts_with("reflection-") {
                    for event in event_rows {
                        let v=if event["kind"]=="motion" {
                            Some((event["ball_state"]["vx"].as_i64().unwrap(),event["ball_state"]["vy"].as_i64().unwrap()))
                        } else if event.is_array() && event[0]==0 {
                            Some((event[5][3].as_i64().unwrap(),event[5][4].as_i64().unwrap()))
                        } else {None};
                        if let Some(v) = v {
                            if Some(v)!=last_velocity { reflections+=1; }
                            last_velocity=Some(v);
                        }
                    }
                }
                payload+=o.publication.len()+bundle.iter().map(Vec::len).sum::<usize>();
                let elapsed=pic.get_time().as_nanos_since_unix_epoch()-begin;
                counts.push(elapsed.to_string());
                eprintln!("PUBLICATION {label} logical={} elapsed_ns={elapsed}", (last-now.run.completed_segments)*expected);
                if gap && i>=3 && first_after_gap.is_none(){first_after_gap=Some(elapsed.to_string());}
            }
            if idle && i>=89 || !idle && (last-now.run.completed_segments)*expected>=target {break;}
        }
        let elapsed=pic.get_time().as_nanos_since_unix_epoch()-begin;
        let spent=cycles-pic.cycle_balance(id);
        let end=status(&pic,id);
        let mut m: Runtime=get_query(&pic,id,"controller_runtime",encode_args(()).unwrap());
        m.metrics.messages -= initial_metrics.metrics.messages;
        m.metrics.seal_instructions -= initial_metrics.metrics.seal_instructions;
        m.metrics.step_instructions -= initial_metrics.metrics.step_instructions;
        m.metrics.publish_instructions -= initial_metrics.metrics.publish_instructions;
        m.metrics.persist_instructions -= initial_metrics.metrics.persist_instructions;
        let totals: Run=get_query(&pic,id,"lab_status",encode_args(()).unwrap());
        let before_work=now.run.current_segment_work.unwrap_or(0);
        let final_world=arena_world(&pic,id);
        let logical=(last-now.run.completed_segments)*expected;
        assert!(idle || logical>=target, "{label} short: {logical}");
        assert!(!label.starts_with("reflection-")||reflections>0);
        let result=serde_json::json!({"label":label,"initial_world":initial_world,"initial_logical":initial.time.0.to_string(),"final_logical":final_world.time.0.to_string(),"mode":end.run.pace.unwrap().mode,"stored":allowance,"effective":expected,"ticks":logical,"publications":last-now.run.completed_segments,"elapsed_ns":elapsed.to_string(),"publication_ns":counts,"post_gap_first_ns":first_after_gap,"cycles":spent.to_string(),"index_calls":end.source.index_calls-now.source.index_calls,"events":events,"reflections":reflections,"payload_bytes":payload,"metrics":m.metrics,"work_units":totals.run.total_work-initial_totals.run.total_work,"initial_current_work":before_work,"initial_cannons":initial.cannons.len(),"initial_balls":initial.balls.len(),"deflectors":initial.deflectors.as_ref().map_or(0,Vec::len)});
        println!("READINESS {result}");
        rows.push(result);
        std::fs::write(out.join("readiness-cost.json"),serde_json::to_vec_pretty(&rows).unwrap()).unwrap();
    }
}
