// One owned disposable instance per invocation; the Python runner owns paired inventory.
#[test]
#[ignore = "bounded S13 paired autonomous scheduling measurement"]
fn s13_fallback_policy_trace() {
    let spec: Value = serde_json::from_str(&std::env::var("DTR_S13_CASE").unwrap()).unwrap();
    let number = |key: &str| spec[key].as_u64().unwrap();
    let duration = number("duration_seconds");
    let period = number("arrival_period_seconds");
    let batch = number("arrival_batch");
    let initial_tip = number("initial_tip");
    let fallback = number("fallback_seconds");
    assert!(duration <= 128 && duration >= 16 && period > 0);
    assert!([1, 5].contains(&fallback));
    let hints = spec["hints"] == "alternating";
    let pic = instance();
    // Fixed time and creation order make the complete fixture Wasm identical within pairs.
    pic.set_time((UNIX_EPOCH + Duration::from_secs(1_700_000_000)).into());
    let ledger = create_controlled(&pic);
    let runtime = create_controlled(&pic);
    let epoch = pic.get_time().as_nanos_since_unix_epoch();
    let fixture = s13_clock_ledger(
        ledger,
        runtime,
        epoch,
        period,
        batch,
        duration + 64,
        initial_tip,
    );
    let fixture_hash = dtr_wire::hash(&fixture);
    pic.install_canister(
        ledger,
        fixture,
        encode_args(()).unwrap(),
        Some(controller()),
    );
    let world = s12_world("ball-dense-medium");
    let world_hash = dtr_wire::hash(&world);
    let wasm = std::fs::read(required_path("DTR_RUNTIME_WASM")).unwrap();
    let wasm_hash = dtr_wire::hash(&wasm);
    pic.install_canister(
        runtime,
        wasm,
        encode_args((
            world.clone(),
            "00".repeat(32),
            0u64,
            0u64,
            Some(LedgerConfig {
                network: "pocketic-local".into(),
                ledger,
                recipient_account: AccountIdentifier::new(&runtime, &DEFAULT_SUBACCOUNT)
                    .as_bytes()
                    .to_vec(),
                page_limit: 64,
                fallback_seconds: fallback as u32,
                hint_principal: None,
            }),
        ))
        .unwrap(),
        Some(controller()),
    );
    let stable_initial = pic.get_stable_memory(runtime).len();
    start_autonomous(
        &pic,
        runtime,
        RunConfig {
            segment_ticks: 2,
            pacing_seconds: 1,
            work_budget: 512,
        },
    );
    let mut rows = Vec::new();
    let mut captured = Vec::new();
    let mut published = BTreeMap::new();
    let mut verified_times = BTreeMap::new();
    let mut publication_rows = Vec::new();
    let mut previous_cursor = 0;
    let mut previous_tip = initial_tip;
    let mut previous_calls = 0;
    let mut previous_in_flight = false;
    let mut empty_polls = 0;
    let mut advances = 0;
    let mut delivered = 0;
    let mut queue_high = 0;
    let started = Instant::now();
    let mut result = serde_json::json!({"schema":"btz-s13-case-v1","status":"IN_PROGRESS","case":spec,
        "normal_wasm_sha256":wasm_hash,"initial_world_sha256":world_hash,"ledger_fixture_sha256":fixture_hash,
        "configuration":{"board":"16x8","starting_balls":32,"cannons":2,"logical_ticks":2,"work_budget":512,
            "callback_pacing_seconds":1,"page_records":64,"retention_segments":3,"retention_bytes":8388608},
        "time_base":"PocketIC virtual canister seconds","exact_hidden_seal_time":"NOT_MEASURED",
        "empty_poll_scope":"observed completed calls without cursor movement at tip; not an exact execution counter",
        "retries":"NOT_MEASURED: no rejection injection in load cases","bytes_transmitted":"NOT_MEASURED",
        "full_update_instructions":"NOT_MEASURED"});
    for second in 1..=duration {
        pic.advance_time(Duration::from_secs(1));
        if hints && batch > 0 && second % period == 0 && (second / period) % 2 == 0 {
            let _: Status = update_result(
                &pic,
                runtime,
                controller(),
                "ledger_hint",
                encode_args(()).unwrap(),
            )
            .unwrap();
            delivered += 1;
        }
        pic.tick();
        let state = status(&pic, runtime, Principal::anonymous()).unwrap();
        let work = controller_work(&pic, runtime).unwrap();
        let elapsed = (pic.get_time().as_nanos_since_unix_epoch() - epoch) as f64 / 1e9;
        let tip = initial_tip + second / period * batch;
        let cursor = state.source.verified_source_watermark.unwrap();
        assert!(
            cursor >= previous_cursor && cursor <= tip,
            "contiguous monotonic cursor"
        );
        for position in (previous_cursor..cursor).filter(|p| p % 256 < 3) {
            assert!(verified_times.insert(position, elapsed).is_none());
        }
        if cursor > previous_cursor {
            advances += 1;
        }
        if (state.source.ledger_calls > previous_calls || previous_in_flight)
            && cursor == previous_cursor
            && cursor == tip
            && !state.source.scan_in_flight
        {
            empty_polls += 1;
        }
        queue_high = queue_high.max(work.pending_inputs);
        let old_len = captured.len();
        capture_new_publications(&pic, runtime, &mut captured);
        for (publication, artifacts) in &captured[old_len..] {
            let seal = publication.head.seal.as_ref().unwrap();
            let from: u64 = seal.source_from.0.to_string().parse().unwrap();
            let to: u64 = seal.source_to_exclusive.0.to_string().parse().unwrap();
            let positions = (from..to).filter(|p| p % 256 < 3).collect::<Vec<_>>();
            assert_eq!(positions.len(), seal.input_count as usize);
            let id = publication.head.segment_id.as_ref().unwrap().0.to_string();
            for position in positions {
                assert!(
                    published.insert(position, (id.clone(), elapsed)).is_none(),
                    "exactly once assignment"
                );
            }
            publication_rows.push(serde_json::json!({"segment_id":id,"observed_virtual_second":elapsed,
                "seal_hex":hex(&encode(seal).unwrap()),"logical_start":seal.logical_start.0.to_string(),
                "logical_end":seal.logical_end.0.to_string(),"source_from":from,"source_to":to,
                "input_count":seal.input_count,"artifact_sha256":artifacts.iter().map(|a|dtr_wire::hash(a)).collect::<Vec<_>>(),
                "callback_count":state.run.callback_count,"total_work":state.run.total_work,"last_segment_work":state.run.last_segment_work}));
        }
        let retained = retention_status(&pic, runtime);
        let watermark = captured.last().map(|p| {
            p.0.head
                .seal
                .as_ref()
                .unwrap()
                .source_to_exclusive
                .0
                .to_string()
        });
        rows.push(serde_json::json!({"elapsed_virtual_seconds":elapsed,"virtual_timestamp_ns":pic.get_time().as_nanos_since_unix_epoch(),
            "ledger_tip":tip,"verified_cursor":cursor,"last_published_sealed_source_watermark":watermark,
            "backlog":tip-cursor,"new_arrivals":tip-previous_tip,"records_verified":cursor-previous_cursor,
            "relevant_records_admitted":(previous_cursor..cursor).filter(|p|p%256<3).count(),
            "ledger_calls":state.source.ledger_calls,"archive_calls":state.source.archive_calls,
            "scan_in_flight":state.source.scan_in_flight,"hint_pending":state.source.hint_pending,
            "successful_source_advances_observed":advances,"empty_polls_observed":empty_polls,
            "hints_delivered":delivered,"omitted_hints":if batch==0 {0} else {second/period-delivered},
            "completed_segments":state.run.completed_segments,"phase":work.phase,"callbacks":state.run.callback_count,
            "total_work":state.run.total_work,"current_segment_work":state.run.current_segment_work,
            "input_queue_size":work.pending_inputs,"retained_publications":retained.entries.len(),"retained_bytes":retained.retained_bytes,
            "source_error":state.source.last_error,"run_error":state.run.last_error}));
        result["trace"] = serde_json::json!(rows);
        result["publications"] = serde_json::json!(publication_rows);
        write_s12_trace("DTR_S13_TRACE", &result);
        assert!(
            state.source.last_error.is_none() && state.run.last_error.is_none(),
            "unexpected runtime error"
        );
        previous_cursor = cursor;
        previous_tip = tip;
        previous_calls = state.source.ledger_calls;
        previous_in_flight = state.source.scan_in_flight;
    }
    assert!(captured.len() > 1, "game must continue autonomously");
    let payer = AccountIdentifier::new(
        &Principal::self_authenticating([92; 32]),
        &DEFAULT_SUBACCOUNT,
    );
    let mut native = Coordinator::create(
        &world,
        captured[0].0.identity.clone(),
        0,
        0,
        "00".repeat(32),
        BtzHostKernel,
    )
    .unwrap();
    let mut native_cursor = 0;
    for (publication, artifacts) in &captured {
        let seal = publication.head.seal.as_ref().unwrap();
        let to: u64 = seal.source_to_exclusive.0.to_string().parse().unwrap();
        if to > native_cursor {
            let records = (native_cursor..to)
                .map(|p| match p % 256 {
                    0 => Some(normalized(payer, 1_000_000_000, *b"BTZ\x11\0\0\x40\0")),
                    1 => Some(normalized(payer, 1, *b"BTZ\x11\0\0\x20\0")),
                    2 => Some(normalized(payer, 1_000_000_000, [0; 8])),
                    _ => None,
                })
                .collect();
            native
                .apply(Action::Ingest {
                    start: Int(native_cursor.into()),
                    records,
                    anchor: seal.source_anchor.clone(),
                })
                .unwrap();
            native_cursor = to;
        }
        native
            .apply(Action::Seal {
                logical_end: seal.logical_end.clone(),
            })
            .unwrap();
        assert_eq!(native.record.journal.stage.as_ref().unwrap().seal, *seal);
        while native.record.journal.stage.as_ref().unwrap().phase == "running" {
            native.apply(Action::Step { budget: 100_000 }).unwrap();
        }
        let ready = native
            .record
            .journal
            .stage
            .as_ref()
            .unwrap()
            .ready_hash
            .clone()
            .unwrap();
        native
            .apply(Action::Publish {
                manifest_hash: ready,
            })
            .unwrap();
        assert_eq!(
            native_publication(&native.record).unwrap().artifacts,
            *artifacts,
            "native replay of own history"
        );
    }
    let latency = (0..previous_tip).filter(|p|p%256<3).map(|position| {
        let arrival = if position < initial_tip {0} else {((position-initial_tip)/batch+1)*period};
        let verified = verified_times.get(&position).copied();
        let publication = published.get(&position);
        serde_json::json!({"position":position,"kind":match position%256 {0=>"valid_payment",1=>"underfunded",_=>"invalid_memo"},
            "arrival_virtual_second":arrival,"first_observed_verified_virtual_second":verified,
            "assigned_segment":publication.map(|p|&p.0),"first_observed_publication_virtual_second":publication.map(|p|p.1),
            "arrival_to_verification_seconds":verified.map(|v|v-arrival as f64),
            "verification_to_publication_seconds":publication.map(|p|p.1-verified.unwrap()),
            "arrival_to_publication_seconds":publication.map(|p|p.1-arrival as f64),
            "resolution":if publication.is_some(){"PUBLISHED"}else if verified.is_some(){"VERIFIED_UNPUBLISHED"}else{"UNVERIFIED"}})
    }).collect::<Vec<_>>();
    result["status"] = serde_json::json!("PASS");
    result["native_replay"] =
        serde_json::json!({"status":"PASS","segments":captured.len(),"own_history":true});
    result["latency"] = serde_json::json!(latency);
    result["queue_high_water"] = serde_json::json!(queue_high);
    result["stable_bytes_initial"] = serde_json::json!(stable_initial);
    result["stable_bytes_final"] = serde_json::json!(pic.get_stable_memory(runtime).len());
    result["host_elapsed_seconds"] = serde_json::json!(started.elapsed().as_secs_f64());
    write_s12_trace("DTR_S13_TRACE", &result);
}
