"""S13 finite-window policy comparison using measured counts and explicit S12 sample reuse."""
import json
from pathlib import Path
from s12_cost_model import scenario_cost
from s12_measurements import load_current
from s13_analysis import cases, identity, validate_trace, validate_pair

ROOT = Path(__file__).resolve().parents[1]


def project(traces, assumptions, binding):
    if not traces or len(traces) % 2:
        raise ValueError('complete nonempty pairs required')
    if identity(assumptions) != identity(json.loads((ROOT/'benchmarks/s13/cost-assumptions.json').read_text())):
        raise ValueError('unexpected cost configuration')
    from benchmark_s12 import sha256
    if binding['model_configuration_sha256'] != sha256(ROOT/'benchmarks/s13/cost-assumptions.json'):
        raise ValueError('cost configuration identity mismatch')
    if binding['normal_wasm_sha256'] != assumptions['reuse_instructions']['normal_wasm_sha256']:
        raise ValueError('S12 instruction reuse requires unchanged normal Wasm; obtain new measurements')
    workload_path = ROOT/'benchmarks/s12/workloads.json'
    if binding['workload_sha256'] != sha256(workload_path):
        raise ValueError('incompatible workload fixture identity')
    workload = json.loads(workload_path.read_text())
    world_hash = next(r['initial_state_hash'] for r in workload['workloads'] if r['name']=='ball-dense-medium')
    declared = {spec['id']:spec for profile in ('smoke','extended') for spec in cases(profile)}
    manifest = load_current(ROOT/assumptions['reuse_instructions']['manifest'])
    if manifest['source']['dtr_revision'] != binding['source']['dtr_revision']:
        raise ValueError('instruction dependency incompatible')
    benches = {r['name']:r for r in manifest['benchmarks']}
    for i in range(0,len(traces),2):
        validate_pair(traces[i],traces[i+1])
    rows = []
    for trace in traces:
        if trace['initial_world_sha256'] != world_hash:
            raise ValueError('initial world differs from declared workload')
        expected_case = declared.get(trace['case']['id'])
        if expected_case is None:
            raise ValueError('unknown declared measurement case')
        validate_trace(trace,{**binding,'case':expected_case})
        last = trace['trace'][-1]; spec = trace['case']; duration = last['elapsed_virtual_seconds']
        pages = last['verified_cursor']/64
        calls = last['ledger_calls']; archive = last['archive_calls']
        # All initiated calls are retained, including the in-flight tail. Difference
        # from verified pages is classified as empty/pending overhead, not exact polls.
        empty_or_pending = calls-pages
        if empty_or_pending < 0: raise ValueError('calls cannot be fewer than full pages')
        scenario = dict(name=spec['id'],game_mode='warm-medium',ledger_enabled=True,
            ledger_records_per_second=last['verified_cursor']/duration,
            segment_seconds=duration/last['completed_segments'],
            callbacks_per_segment=last['callbacks']/last['completed_segments'],
            fallback_seconds=spec['fallback_seconds'],archive_fraction=archive/pages if pages else 0,
            observed_empty_polls_per_day=empty_or_pending*86400/duration)
        model = {**assumptions['model'],'storage_bytes':trace['stable_bytes_final']}
        cost = scenario_cost(scenario,assumptions['tariff_13_node_cycles'],model,benches)
        cost.update(measured_counts=dict(ledger_calls=calls,archive_calls=archive,verified_full_pages=pages,
            empty_polls_observed=last['empty_polls_observed'],empty_or_pending_calls=empty_or_pending,
            callbacks=last['callbacks'],completed_segments=last['completed_segments']),
            measured_virtual_seconds=duration,
            count_scope='finite initiated calls, including startup/archive and unfinished tail; idle timers without a call NOT_MEASURED',
            source_trace_case=spec, payload_bytes='ESTIMATED: 150 response bytes per record, 32 request bytes, 256 empty bytes',
            omitted='certification, full timer dispatch, full network decoding/await paths, heap/code storage, actual production burn, finality, query/gateway service',
            instruction_reuse=assumptions['reuse_instructions'])
        rows.append(cost)
    comparisons = []
    for one,five in zip(rows[::2],rows[1::2]):
        fields=('polling_cycles_per_day','ledger_processing_instruction_cycles_per_day','ledger_base_cycles_per_day',
                'ledger_xnet_cycles_per_day','ledger_bytes_cycles_per_day','game_callback_base_cycles_per_day','storage_cycles_per_day')
        comparisons.append(dict(pair=one['source_trace_case']['pair'],
            one_second=one['name'],five_second=five['name'],
            increment_one_minus_five_cycles_per_day={k:one[k]-five[k] for k in fields},
            game_instruction_increment_sample_range=[a-b for a,b in zip(one['game_instruction_cycles_per_day_sample_range'],five['game_instruction_cycles_per_day_sample_range'])],
            total_increment_matched_sample_range=[a-b for a,b in zip(one['cycles_per_day_sample_range'],five['cycles_per_day_sample_range'])],
            range_scope='matched early/late sample choices, not confidence interval or complete-cost bound'))
    return dict(schema='btz-s13-policy-cost-results-v1',status='PASS',binding=binding,
                assumptions=assumptions,scenarios=rows,comparisons=comparisons,
                actual_cycles_burned='NOT_MEASURED',deployment='ANALYTICAL_ESTIMATE: repeat each finite virtual-time window for a day')
