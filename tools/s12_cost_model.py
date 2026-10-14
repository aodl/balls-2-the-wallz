#!/usr/bin/env python3
"""Reviewable S12 tariff projection; never represents observed production cycle burn."""
import argparse
import json
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_canbench(path):
    text = path.read_text()
    pattern = re.compile(
        r'^  ([a-z0-9_]+):\n    total:\n      calls: (\d+)\n'
        r'      instructions: (\d+)\n      heap_increase: (\d+)\n'
        r'      stable_memory_increase: (\d+)', re.MULTILINE)
    rows = {name: {'calls': int(calls), 'instructions': int(instructions),
                   'heap_increase_pages': int(heap),
                   'stable_memory_increase_pages': int(stable)}
            for name, calls, instructions, heap, stable in pattern.findall(text)}
    if not rows:
        raise ValueError('no canbench totals found')
    return rows


def workload_rows(path):
    data = json.loads(path.read_text())
    return {row['name']: row for row in data['workloads']}


def controlled_mu(path):
    data = json.loads(path.read_text())
    row = next(row for row in data['scenarios'] if row['name'] == 'paused-arrivals')
    elapsed = row.get('elapsed_seconds')
    if elapsed is None:
        distribution = row['sustained_records_per_second_distribution']
        selected = distribution['samples'].index(distribution['min'])
        elapsed = row['elapsed_seconds_samples'][selected]
    return row['sustained_records_per_second'], {
        'source': str(path), 'scenario': row['name'], 'evidence_class': row['evidence_class'],
        'records': row['records_processed'], 'elapsed_seconds': elapsed,
        'selection': 'minimum repeated local-host throughput' if 'elapsed_seconds_samples' in row
                     else 'single local-host sample',
        'received_candid_bytes': row['received_candid_bytes'],
        'bytes_per_record': row['received_candid_bytes'] / row['records_processed']}


def scenario_cost(spec, tariff, model, benches):
    """Independent daily terms; sampled ranges are illustrative, never bounds."""
    rate = spec['ledger_records_per_second']
    cadence = spec['segment_seconds']
    callbacks = spec['callbacks_per_segment']
    if spec['game_mode'] == 'kernel-only':
        callbacks = math.ceil(spec['work_units'] / model['work_budget']) + 2
    def instructions(name):
        if name not in benches or benches[name]['instructions'] <= 0:
            raise ValueError(f'missing measurement {name}; cannot substitute zero')
        return benches[name]['instructions']
    if spec['game_mode'] == 'warm-medium':
        if model['work_budget'] != 512:
            raise ValueError('warm measurements require work budget 512; rerun for changed budget')
        seal = instructions('warm_seal_medium_512')
        publish = instructions('warm_evict_medium_512')
        finalize = instructions('warm_finalize_medium_512')
        samples = [instructions(f'warm_{phase}_medium_512') for phase in ('early','middle','late')]
        steps = max(0, callbacks - 3)
        low = seal + publish + finalize + steps * min(samples)
        high = seal + publish + finalize + steps * max(samples)
        scope = 'ESTIMATED: synthetic-source warm two-tick seed samples transferred to ledger-source evolving-world callback counts; metadata/cursor differences are unmeasured and sample extrema are not bounds'
    else:
        low = high = instructions(spec['kernel_benchmark'])
        scope = 'PARTIAL_ESTIMATE: direct kernel only; coordinator/restore/persistence/publication NOT_MEASURED for this scenario'
    coefficient = tariff['per_wasm_instruction']
    segments_day = 86400 / cadence
    game_base = callbacks * tariff['update_execution_base'] * segments_day
    page_day = rate * 86400 / model['page_records'] if spec['ledger_enabled'] else 0
    if 'backlog_records_assumption' in spec:
        page_day = min(page_day, spec['backlog_records_assumption'] / model['page_records'])
    admission = instructions('warm_ledger_staged_admission') if page_day else 0
    calls_page = 1 + spec['archive_fraction']
    ledger_instructions_day = page_day * admission
    ledger_base = page_day * (2 + spec['archive_fraction']) * tariff['update_execution_base']
    ledger_xnet = page_day * calls_page * tariff['xnet_request_and_response']
    ledger_bytes = page_day * (model['page_records'] * model['response_bytes_per_record_assumption']
                              + calls_page * model['request_bytes_assumption'])
    # Full-page arrival batches are explicit scenario assumptions. Count an
    # observed/assumed empty scan independently, without charging the same
    # scheduled opportunity again as both an empty poll and a nonempty page.
    opportunities_day = 86400 / spec['fallback_seconds'] if spec['ledger_enabled'] else 0
    polls_day = spec.get('observed_empty_polls_per_day', max(0, opportunities_day - page_day)) \
        if spec['ledger_enabled'] else 0
    poll_instructions_day = polls_day * (instructions('warm_ledger_empty_poll') + model['empty_poll_instruction_assumption']) if polls_day else 0
    poll_base = polls_day * model['empty_poll_updates_assumption'] * tariff['update_execution_base']
    poll_xnet = polls_day * tariff['xnet_request_and_response']
    poll_bytes = polls_day * model['empty_poll_bytes_assumption'] * tariff['xnet_byte']
    storage = model['storage_bytes'] / 1024**3 * tariff['gib_storage_second'] * 86400
    independent = ledger_base + ledger_xnet + ledger_bytes * tariff['xnet_byte'] + poll_base + poll_xnet + poll_bytes + storage
    instruction_day_low = low * segments_day + ledger_instructions_day + poll_instructions_day
    instruction_day_high = high * segments_day + ledger_instructions_day + poll_instructions_day
    total_low = instruction_day_low * coefficient + game_base + independent
    total_high = instruction_day_high * coefficient + game_base + independent
    return {**spec, 'modeled_callbacks_per_segment': callbacks, 'classification': 'ANALYTICAL_ESTIMATE', 'game_scope': scope,
        'game_instructions_per_segment_sample_range': [low, high],
        'game_instruction_cycles_per_day_sample_range': [low * segments_day * coefficient, high * segments_day * coefficient],
        'game_callback_base_cycles_per_day': game_base,
        'ledger_processing_instruction_cycles_per_day': ledger_instructions_day * coefficient,
        'ledger_base_cycles_per_day': ledger_base,
        'ledger_xnet_cycles_per_day': ledger_xnet,
        'ledger_bytes_cycles_per_day': ledger_bytes * tariff['xnet_byte'],
        'polling_cycles_per_day': poll_instructions_day * coefficient + poll_base + poll_xnet + poll_bytes,
        'polling_classification': 'PARTIAL_ESTIMATE: measured begin/at-tip handling plus explicit unmeasured execution and payload assumptions',
        'storage_cycles_per_day': storage, 'pages_per_day_assumption': page_day,
        'polls_per_day_assumption': polls_day,
        'fallback_opportunities_per_day': opportunities_day,
        'poll_count_classification': 'OBSERVED_FINITE_WINDOW' if 'observed_empty_polls_per_day' in spec else 'ESTIMATED: full arrival batches, no hints; nonempty pages use polling opportunities',
        'instruction_components_per_day_sample_range': [instruction_day_low, instruction_day_high],
        'game_cycles_per_segment_sample_range': [low*coefficient+callbacks*tariff['update_execution_base'],high*coefficient+callbacks*tariff['update_execution_base']],
        'cycles_per_day_sample_range': [total_low,total_high],
        'cycles_per_30_day_month_sample_range': [total_low*30,total_high*30],
        'xdr_per_day_sample_range': [total_low/1e12,total_high/1e12],
        'xdr_per_30_day_month_sample_range': [total_low*30/1e12,total_high*30/1e12],
        'subnet_nodes_assumption': 13,
        'higher_replication_34_node_cycles_per_day_sample_range': [total_low*34/13,total_high*34/13],
        'complete_total_upper_bound': 'NOT_MEASURED'}


def project(assumptions, benches, combined):
    specs = []
    for spec in assumptions['scenarios']:
        spec = dict(spec)
        if spec.get('combined_scenario'):
            observed = next(row for row in combined['scenarios'] if row['name'] == spec['combined_scenario'])
            seconds = observed['duration_virtual_seconds']
            spec['segment_seconds'] = seconds / observed['completed_segments']
            spec['callbacks_per_segment'] = observed['callbacks'] / observed['completed_segments']
            spec['ledger_records_per_second'] = observed['verified_records_per_virtual_second']
            spec['cadence_classification'] = 'MEASURED_VIRTUAL_TIME'
            spec['observed_arrival_rate'] = observed['arrival_records_per_virtual_second']
            spec['observed_final_backlog'] = observed['final_backlog']
            spec['observed_empty_polls_per_day'] = observed['trace'][-1]['empty_polls_observed'] / seconds * 86400
            pages = sum(row['records_verified'] for row in observed['trace']) / assumptions['model']['page_records']
            spec['archive_fraction'] = observed['trace'][-1]['archive_calls'] / pages if pages else 0
            spec['arrival_batch'] = observed['arrival_batch']
            spec['arrival_period_seconds'] = observed['arrival_period_seconds']
        specs.append(spec)
    rows = [scenario_cost(s, assumptions['tariff_13_node_cycles'], assumptions['model'], benches) for s in specs]
    moderate = next(s for s in specs if s['name'] == 'moderate-combined')
    sensitivity = [scenario_cost({**moderate, 'segment_seconds': seconds}, assumptions['tariff_13_node_cycles'], assumptions['model'], benches) for seconds in (10,20,60)]
    return {'schema': 'btz-s12-cost-projection-v2', 'status': 'PASS',
        'qualification': 'Tariff-based partial estimates and illustrative sample ranges; no demonstrated complete upper bound or actual balance burn',
        'assumptions': assumptions, 'scenarios': rows, 'cadence_sensitivity': sensitivity,
        'backlog_catch_up_qualification': 'Busy-window service rate is a scenario assumption, not a measured catch-up duration. High-hint overload service rate must not be reused for quieter fallback scheduling.',
        'not_measured': ['heap high-water', 'update-only certification and timer dispatch instructions',
            'network encode/decode part of polling execution', 'actual inter-canister request bytes', 'archive execution',
            'mainnet cycles burned', 'mainnet finality/availability', 'real-world fiat conversion'],
        'not_included': ['query-service/gateway costs', 'ETH-equivalent compute', 'upstream ledger operating costs',
            'storage of unmeasured heap and Wasm code', 'retry execution costs (zero observed is not a future guarantee)']}


def main():
    from s12_measurements import load_current
    from benchmark_s12 import source_record
    parser = argparse.ArgumentParser()
    parser.add_argument('--assumptions', type=Path, default=ROOT / 'benchmarks/s12/closeout-cost-assumptions.json')
    parser.add_argument('--current-measurements', type=Path, required=True)
    parser.add_argument('--combined-trace', type=Path, required=True)
    parser.add_argument('--ledger-trace', type=Path, help='historical controlled page evidence only; never autonomous capacity')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    current = load_current(args.current_measurements, source_record())
    benches = {row['name']:row for row in current['benchmarks']}
    result = project(json.loads(args.assumptions.read_text()), benches, json.loads(args.combined_trace.read_text()))
    result['measurement_provenance'] = {'source': current['source'], 'wasm_sha256': current['wasm_sha256'],
        'manifest_sha256': __import__('hashlib').sha256(args.current_measurements.read_bytes()).hexdigest(),
        'combined_trace_sha256': __import__('hashlib').sha256(args.combined_trace.read_bytes()).hexdigest()}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({'status':'PASS','scenarios':len(result['scenarios'])}))


if __name__ == '__main__':
    main()
