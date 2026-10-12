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
    return row['sustained_records_per_second'], {
        'source': str(path), 'scenario': row['name'], 'evidence_class': row['evidence_class'],
        'records': row['records_processed'], 'elapsed_seconds': row['elapsed_seconds'],
        'received_candid_bytes': row['received_candid_bytes'],
        'bytes_per_record': row['received_candid_bytes'] / row['records_processed']}


def project(assumptions, benches, workloads, mu, mu_record):
    tariff = assumptions['tariff_13_node_cycles']
    model = assumptions['model']
    seal = benches['coordinator_seal_medium']['instructions']
    page_classification = benches['ledger_page_all_irrelevant']['instructions']
    bytes_per_record = mu_record['bytes_per_record']
    scenarios = []
    for spec in assumptions['scenarios']:
        workload = workloads[spec['workload']]
        work = workload['expected']['work_units']
        steps = math.ceil(work / model['work_budget'])
        callbacks = steps + 2
        coordinator = benches[spec['coordinator_benchmark']]['instructions']
        persistence = benches[spec['persistence_benchmark']]['instructions']
        measured_component_instructions = coordinator + seal + callbacks * persistence
        execution_allowance = math.ceil(
            measured_component_instructions * model['unmeasured_execution_allowance_fraction'])
        game_instructions = measured_component_instructions + execution_allowance
        game_base = callbacks * tariff['update_execution_base']
        rate = mu if spec['ledger_records_per_second'] == 'MEASURED_CONTROLLED_MU' \
            else spec['ledger_records_per_second']
        pages_per_segment = rate * spec['segment_seconds'] / model['page_records']
        scan_instructions_page = page_classification + persistence
        scan_execution_messages_page = 2 + model['archive_fraction']
        scan_base = pages_per_segment * scan_execution_messages_page * tariff['update_execution_base']
        scan_instructions = pages_per_segment * scan_instructions_page
        xnet_calls = pages_per_segment * (1 + model['archive_fraction'])
        xnet = xnet_calls * tariff['xnet_request_and_response']
        xnet_bytes = pages_per_segment * (
            model['page_records'] * bytes_per_record
            + model['average_request_bytes_assumption'] * (1 + model['archive_fraction']))
        xnet_byte_cost = xnet_bytes * tariff['xnet_byte']
        storage = (model['stable_memory_bytes'] / (1024 ** 3)) * \
            tariff['gib_storage_second'] * spec['segment_seconds']
        segment_cycles_13 = game_instructions + game_base + scan_instructions + scan_base + xnet + xnet_byte_cost + storage
        multiplier = assumptions['replication']['higher_replication_scale']
        def periods(cycles):
            per_hour = cycles * 3600 / spec['segment_seconds']
            return {'cycles_per_segment': round(cycles), 'cycles_per_hour': round(per_hour),
                    'cycles_per_day': round(per_hour * 24),
                    'cycles_per_30_day_month': round(per_hour * 24 * 30),
                    'xdr_per_day': per_hour * 24 / model['cycles_per_xdr'],
                    'xdr_per_30_day_month': per_hour * 24 * 30 / model['cycles_per_xdr']}
        scenarios.append({**spec, 'ledger_records_per_second': rate,
            'measured_components': {'work_units': work, 'steps': steps, 'callbacks': callbacks,
                'coordinator_instructions': coordinator, 'seal_instructions_proxy': seal,
                'persistence_instructions_per_callback_conservative_proxy': persistence,
                'ledger_classification_instructions_per_64_record_page': page_classification},
            'estimated_components_13_node_cycles_per_segment': {
                'game_measured_instruction_components': measured_component_instructions,
                'unmeasured_execution_allowance': execution_allowance,
                'game_update_base_fees': game_base,
                'ledger_instruction_components': round(scan_instructions),
                'ledger_update_base_fees': round(scan_base),
                'xnet_call_overhead': round(xnet), 'xnet_received_and_assumed_request_bytes': round(xnet_bytes),
                'xnet_byte_transmission': round(xnet_byte_cost), 'stable_storage': round(storage),
                'compute_allocation': 0},
            'projection': {'13_node_application': periods(segment_cycles_13),
                '34_node_higher_replication': periods(segment_cycles_13 * multiplier)}})
    backlog = model['backlog_records']
    arrivals = []
    for label, lam in [('paused', 0), ('half_measured_mu', mu / 2), ('above_measured_mu', mu * 1.1)]:
        arrivals.append({'name': label, 'lambda_records_per_second': lam,
            'mu_records_per_second': mu,
            'estimated_catch_up_seconds': backlog / (mu - lam) if mu > lam else None,
            'outcome': 'DRAINS' if mu > lam else 'DOES_NOT_DRAIN'})
    retention_rows = []
    for retained in (0, 4 * 1024 * 1024, 8 * 1024 * 1024):
        storage_day = retained / (1024 ** 3) * tariff['gib_storage_second'] * 86400
        retention_rows.append({'retained_bytes': retained,
            'additional_storage_cycles_per_day_13_node': round(storage_day),
            'additional_storage_cycles_per_day_34_node': round(
                storage_day * assumptions['replication']['higher_replication_scale'])})
    moderate = next(row for row in scenarios if row['name'] == 'moderate-ongoing')
    moderate_segment = moderate['projection']['13_node_application']['cycles_per_segment']
    page_cycles = page_classification + benches['persistence_publication_empty_motion']['instructions'] \
        + (2 + model['archive_fraction']) * tariff['update_execution_base'] \
        + (1 + model['archive_fraction']) * tariff['xnet_request_and_response'] \
        + (model['page_records'] * bytes_per_record
           + model['average_request_bytes_assumption'] * (1 + model['archive_fraction'])) * tariff['xnet_byte']
    return {'schema': 'btz-s12-cost-projection-v1',
        'classification': {'measured_locally': ['canbench instructions/heap/stable growth',
            'controlled PocketIC records, elapsed time and Candid response bytes'],
            'estimated_from_tariffs': ['cycles per segment/hour/day/month and XDR'],
            'not_measured': ['actual production cycle burn', 'mainnet latency/finality/availability',
                'current canister cycle balance', 'gateway/query infrastructure cost',
                'Wasm heap high-water mark', 'certified_data_set instruction cost',
                'inter-canister request payload bytes (32-byte model assumption used)',
                'ETH-equivalent compute (no versioned conversion definition)']},
        'tariff_provenance': {'retrieved_utc_date': assumptions['retrieved_utc_date'],
            'official_sources': assumptions['official_sources'],
            'cycles_per_xdr': model['cycles_per_xdr'], 'usd_conversion': 'NOT_PROVIDED'},
        'controlled_throughput': mu_record,
        'backlog_estimates': {'backlog_records': backlog,
            'formula': 'B / (mu - lambda) when mu > lambda', 'arrival_scenarios': arrivals},
        'scenarios': scenarios,
        'sensitivity': {
            'occupancy_and_players': [
                {key: row[key] for key in ('name', 'players', 'balls', 'segment_seconds')}
                | {'cycles_per_day_13_node': row['projection']['13_node_application']['cycles_per_day']}
                for row in scenarios[:4]],
            'segment_cadence': [{'seconds': seconds,
                'moderate_workload_cycles_per_day_13_node_holding_segment_work_fixed': round(
                    moderate_segment * 86400 / seconds)} for seconds in (10, 20, 60)],
            'ledger_record_rates': [{'records_per_second': rate,
                'pages_per_day': rate * 86400 / model['page_records'],
                'scan_cycles_per_day_13_node': round(
                    rate * 86400 / model['page_records'] * page_cycles)}
                for rate in (0, 1, 20, mu)],
            'retention': retention_rows,
            'qualification': 'Player rows are tested configurations but occupancy/geometry are confounded; cadence and traffic rows hold their stated component fixed.'}}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--assumptions', type=Path,
        default=ROOT / 'benchmarks/s12/cost-assumptions.json')
    parser.add_argument('--canbench', type=Path,
        default=ROOT / 'benchmarks/s12/canbench_results.yml')
    parser.add_argument('--workloads', type=Path,
        default=ROOT / 'benchmarks/s12/workloads.json')
    parser.add_argument('--ledger-trace', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    assumptions = json.loads(args.assumptions.read_text())
    mu, mu_record = controlled_mu(args.ledger_trace)
    result = project(assumptions, load_canbench(args.canbench),
                     workload_rows(args.workloads), mu, mu_record)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({'outcome': 'PASS', 'scenarios': len(result['scenarios']),
                      'controlled_mu': mu}))


if __name__ == '__main__':
    main()
