#!/usr/bin/env python3
"""Bounded S12 benchmark entry point. Exit 0=PASS, 1=FAIL, 2=BLOCKED prerequisite."""
import argparse
import datetime
import hashlib
import json
import statistics
import os
import platform
import re
import shutil
import signal
import subprocess
import sys
import time
from pathlib import Path

from verify_s09_local import start_pocketic, stop_pocketic
from s12_measurements import load_totals, configuration, validate, compare

ROOT = Path(__file__).resolve().parents[1]
DTR_REVISION = '71e59e93cf49a3656689679b538b4c3f138787f8'


def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        while chunk := stream.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def command_text(command, timeout=15):
    try:
        result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, timeout=timeout)
    except (OSError, subprocess.TimeoutExpired) as error:
        return {'command': command, 'exit_code': None, 'text': str(error)}
    return {'command': command, 'exit_code': result.returncode,
            'text': (result.stdout + result.stderr).strip()}


def git_value(*args):
    return subprocess.run(['git', *args], cwd=ROOT, text=True, capture_output=True,
                          check=True, timeout=15).stdout.strip()


def source_record():
    return {'revision': git_value('rev-parse', 'HEAD'),
            'tree': git_value('rev-parse', 'HEAD^{tree}'),
            'branch': git_value('branch', '--show-current'),
            'working_tree_changes': git_value('status', '--porcelain').splitlines(),
            'dtr_revision': DTR_REVISION,
            'package_lock_sha256': sha256(ROOT / 'package-lock.json'),
            'dtr_package_sha256': sha256(ROOT / 'vendor/dtr/dtr-timeline-runtime-0.11.0.tgz'),
            'runtime_cargo_lock_sha256': sha256(ROOT / 'canisters/runtime-lab/Cargo.lock'),
            'tracked_content_sha256': hashlib.sha256(b''.join(
                path.encode() + b'\0' + (ROOT / path).read_bytes()
                for path in git_value('ls-files').splitlines()
                if (ROOT / path).is_file())).hexdigest()}


def execute(identifier, command, output, timeout, environment=None):
    log = output / 'logs' / f'{identifier}.log'
    log.parent.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    reason = None
    code = None
    try:
        with log.open('w') as stream:
            process = subprocess.Popen(command, cwd=ROOT, text=True,
                stdout=stream, stderr=subprocess.STDOUT, start_new_session=True,
                env={**os.environ, 'PYTHONDONTWRITEBYTECODE': '1', **(environment or {})})
            try:
                code = process.wait(timeout=timeout)
            except subprocess.TimeoutExpired:
                os.killpg(process.pid, signal.SIGKILL)
                process.wait(timeout=10)
                code = 124
                reason = f'timeout after {timeout}s; owned process group terminated'
    except OSError as error:
        code = 127
        reason = str(error)
        log.write_text(f'{error}\n')
    row = {'id': identifier, 'command': command, 'status': 'PASS' if code == 0 else 'FAIL',
           'exit_code': code, 'elapsed_seconds': round(time.monotonic() - started, 3),
           'timeout_seconds': timeout, 'log': str(log.relative_to(output))}
    if reason:
        row['reason'] = reason
    return row


def environment_record():
    cpu = 'NOT_MEASURED'
    try:
        cpu = subprocess.run(['lscpu'], text=True, capture_output=True, check=True,
                             timeout=10).stdout
    except (OSError, subprocess.SubprocessError):
        pass
    memory = 'NOT_MEASURED'
    try:
        memory = subprocess.run(['free', '-b'], text=True, capture_output=True, check=True,
                                timeout=10).stdout
    except (OSError, subprocess.SubprocessError):
        pass
    return {'captured_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'platform': platform.platform(), 'machine': platform.machine(), 'cpu': cpu,
            'memory': memory, 'tools': {
                'python': command_text([sys.executable, '--version']),
                'node': command_text(['node', '--version']),
                'npm': command_text(['npm', '--version']),
                'rustc': command_text(['rustc', '+1.94.1', '--version']),
                'cargo': command_text(['cargo', '+1.94.1', '--version']),
                'canbench': command_text(['canbench', '--version']),
            }, 'definitions': {
                'wasm_instructions': 'canbench performance-counter instructions',
                'heap_increase': 'canbench 64-KiB Wasm pages grown during one benchmark query',
                'stable_memory_increase': 'canbench 64-KiB stable pages grown; not payload bytes',
                'elapsed_seconds': 'local host wall time; not mainnet latency',
                'work_units': 'BTZ deterministic abstract work; not Wasm instructions',
            }}


def aggregate_ledger_traces(paths, destination):
    documents = [json.loads(path.read_text()) for path in paths]
    names = [row['name'] for row in documents[0]['scenarios']]
    scenarios = []
    for name in names:
        rows = [next(row for row in document['scenarios'] if row['name'] == name)
                for document in documents]
        rates = [row['sustained_records_per_second'] for row in rows]
        deterministic = ('initial_backlog', 'arrivals_per_service_window', 'final_tip',
                         'final_cursor', 'final_backlog', 'records_processed',
                         'ledger_calls', 'archive_calls', 'received_candid_bytes', 'outcome')
        for key in deterministic:
            if len({json.dumps(row[key], sort_keys=True) for row in rows}) != 1:
                raise ValueError(f'ledger repetitions disagree for {name}.{key}')
        scenarios.append({key: rows[0][key] for key in rows[0]
                          if key not in ('trace', 'sustained_records_per_second', 'elapsed_seconds')})
        scenarios[-1].update({
            'elapsed_seconds_samples': [row['elapsed_seconds'] for row in rows],
            'sustained_records_per_second': min(rates),
            'sustained_records_per_second_distribution': {
                'samples': rates, 'min': min(rates), 'median': statistics.median(rates),
                'max': max(rates), 'selection': 'minimum used as conservative mu'},
            'runs': [{'source': str(path), 'elapsed_seconds': row['elapsed_seconds'],
                      'records_per_second': row['sustained_records_per_second'],
                      'page_trace': row['trace']} for path, row in zip(paths, rows)],
        })
    aggregate = {'schema': 'btz-s12-controlled-ledger-distribution-v1', 'outcome': 'PASS',
        'page_limit': documents[0]['page_limit'], 'qualification': documents[0]['qualification'],
        'traffic': documents[0]['traffic'], 'repetitions': len(documents),
        'scenarios': scenarios}
    destination.write_text(json.dumps(aggregate, indent=2) + '\n')


def canbench_measured(text):
    """Reject canbench's successful zero-pattern match as missing evidence."""
    return 'Benchmark:' in text and not re.search(r'counts:\s+\[total 0\b', text)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--profile', choices=['smoke', 'extended'], required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--artifacts', type=Path,
                        default=Path('/home/codexdev/dtr-s09-artifacts'))
    parser.add_argument('--repetitions', type=int, default=3)
    parser.add_argument('--ledger-repetitions', type=int, default=3)
    parser.add_argument('--harness-target', type=Path,
                        help='optional reusable Cargo target; omit for a fresh isolated target')
    args = parser.parse_args()
    if sys.version_info < (3, 11):
        parser.error('Python 3.11 or newer is required')
    if not 1 <= args.ledger_repetitions <= 10:
        parser.error('--ledger-repetitions must be 1..10')
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    result_path = output / 'results.json'
    report = {'schema': 'btz-s12-benchmark-run-v1', 'profile': args.profile,
              'overall': 'IN_PROGRESS', 'source': source_record(),
              'environment': environment_record(), 'checks': [], 'artifacts': []}

    missing = [name for name in ('node', 'cargo', 'canbench') if shutil.which(name) is None]
    if args.profile == 'extended':
        for path in (args.artifacts / 'bin/pocket-ic',
                     args.artifacts / 'wasm/ledger-canister.wasm',
                     args.artifacts / 'downloads/ledger-archive-node-canister.wasm.gz'):
            if not path.is_file():
                missing.append(str(path))
    if missing:
        report['overall'] = 'BLOCKED'
        report['checks'].append({'id': 'prerequisites', 'status': 'BLOCKED',
            'exit_code': None, 'reason': 'missing: ' + ', '.join(missing),
            'exit_contract': 'benchmark_s12 exit 2 means prerequisite blocked'})
        result_path.write_text(json.dumps(report, indent=2) + '\n')
        return 2

    def run(identifier, command, timeout, environment=None):
        row = execute(identifier, command, output, timeout, environment)
        if identifier.startswith('canbench'):
            canbench_log = (output / row['log']).read_text(errors='replace')
            if row['status'] == 'PASS' and not canbench_measured(canbench_log):
                row['status'] = 'FAIL'
                row['reason'] = 'canbench matched zero benchmarks'
        report['checks'].append(row)
        result_path.write_text(json.dumps(report, indent=2) + '\n')
        if row['status'] != 'PASS':
            raise RuntimeError(f'{identifier} failed; see {row["log"]}')

    server = None
    try:
        run('fixture-correspondence', ['node', 'tools/generate_s12_fixtures.mjs', '--check'], 60)
        game_output = output / 'game-measurements.json'
        run('deterministic-game-matrix', ['node', 'tools/s12_game_bench.mjs',
            'benchmarks/s12/workloads.json', str(game_output), str(args.repetitions)], 300)
        report['artifacts'].append({'kind': 'measured', 'path': str(game_output),
                                    'sha256': sha256(game_output)})
        baseline_path = ROOT / 'benchmarks/s12/canbench_results.yml'
        baseline_hash = sha256(baseline_path)
        baseline_rows = load_totals(baseline_path)
        current_rows, raw = [], []
        patterns = ['callback_step_persist_medium_512', 'ledger_page_all_irrelevant'] \
            if args.profile == 'smoke' else [None]
        for index, pattern in enumerate(patterns):
            yml = output / f'current-{index}.yml'
            csv = output / f'current-{index}.csv'
            if yml.exists() or csv.exists():
                raise ValueError('run output already contains measurements; use a new directory')
            cfg = output / f'canbench-{index}.yml'
            original = (ROOT / 'benchmarks/s12/canbench.yml').read_text().splitlines()
            cfg.write_text('\n'.join(line for line in original
                if not line.startswith(('results_path:', 'csv_results_path:'))) +
                f'\nresults_path: {yml}\ncsv_results_path: {csv}\n')
            run(f'canbench-{index}', ['canbench', '--persist', '--csv', '--show-canister-output'] +
                ([pattern] if pattern else []), 1200, {'CANBENCH_CFG_FILE': str(cfg)})
            totals = load_totals(yml)
            if pattern and set(totals) != {pattern}:
                raise ValueError('canbench pattern matched unexpected cases')
            for name, total in totals.items():
                current_rows.append({'name': name, **total,
                    'configuration': configuration(name, ROOT / 'benchmarks/s12/workloads.json')})
            raw.extend({'path': path.name, 'sha256': sha256(path)} for path in (yml, csv))
        if sha256(baseline_path) != baseline_hash:
            raise ValueError('historical baseline changed')
        tool = {'canbench': report['environment']['tools']['canbench']['text'],
                'runtime_sha256': sha256(ROOT / '.canbench/pocket-ic'),
                'runtime': 'canbench integrity-checked PocketIC 13.0.0'}
        measured = {'schema': 'btz-s12-current-measurements-v1',
            'source': report['source'], 'profile': args.profile,
            'captured_utc': report['environment']['captured_utc'], 'tool': tool,
            'wasm_sha256': sha256(ROOT / 'canisters/runtime-lab/target/wasm32-unknown-unknown/release/dtr_runtime_lab.wasm'),
            'build': {'features': ['canbench'], 'release': {'lto': True, 'codegen_units': 1, 'overflow_checks': True},
                      'config_sha256': sha256(ROOT / 'benchmarks/s12/canbench.yml')},
            'baseline': {'path': 'benchmarks/s12/canbench_results.yml', 'sha256': baseline_hash,
                         'source_revision': '524807a394f80e0e38db163c3e726e8e992c802f'},
            'benchmarks': current_rows, 'raw_results': raw,
            'informational_names': [r['name'] for r in current_rows if r['name'].startswith('warm_')],
            'executed_names': [row['name'] for row in current_rows]}
        validate(measured, source_record())
        current_path = output / 'current-measurements.json'
        current_path.write_text(json.dumps(measured, indent=2) + '\n')
        baseline = json.loads((ROOT / 'benchmarks/s12/baseline-identity.json').read_text())
        if baseline['baseline_sha256'] != baseline_hash:
            raise ValueError('baseline identity mismatch')
        baseline['benchmarks'] = [{'name': name, **total,
            'configuration': baseline['configurations'][name]} for name, total in baseline_rows.items()]
        baseline['monitored_names'] = [r['name'] for r in current_rows if r['name'] in baseline_rows]
        comparison = compare(measured, baseline)
        (output / 'regression-comparison.json').write_text(json.dumps(comparison, indent=2) + '\n')
        report['checks'].append({'id': 'instruction-regression', **comparison})
        report['artifacts'].append({'kind': 'current-measurements', 'path': str(current_path),
                                    'sha256': sha256(current_path)})
        if comparison['status'] == 'FAIL':
            raise ValueError('instruction regression gate failed')
        if args.profile == 'extended':
            wasm_dir = output / 'wasm'
            wasm_dir.mkdir(exist_ok=True)
            run('normal-wasm-build', ['cargo', '+1.94.1', 'build', '--manifest-path',
                'canisters/runtime-lab/Cargo.toml', '--release', '--target',
                'wasm32-unknown-unknown', '--locked'], 900)
            built = ROOT / 'canisters/runtime-lab/target/wasm32-unknown-unknown/release/dtr_runtime_lab.wasm'
            normal = wasm_dir / 'runtime-lab.wasm'
            shutil.copyfile(built, normal)
            report['artifacts'].append({'kind': 'normal-wasm', 'path': str(normal),
                'sha256': sha256(normal), 'size': normal.stat().st_size})
            target = args.harness_target.resolve() if args.harness_target else output / 'cargo-target'
            harness_env = {'CARGO_TARGET_DIR': str(target)}
            run('pocketic-harness-build', ['cargo', '+1.94.1', 'test', '--manifest-path',
                'tools/s09-integration/Cargo.toml', '--locked', '--test', 'pocketic_host',
                '--no-run'], 1800, harness_env)
            # The idle-timed server starts only after all test binaries are compiled.
            server = start_pocketic(args.artifacts / 'bin/pocket-ic', output)
            revision = report['source']['revision']
            tree = report['source']['tree']
            common = {**harness_env, 'POCKET_IC_BIN': str(args.artifacts / 'bin/pocket-ic'),
                'POCKET_IC_SERVER_URL': server[3], 'DTR_RUNTIME_WASM': str(normal),
                'DTR_LEDGER_WASM': str(args.artifacts / 'wasm/ledger-canister.wasm'),
                'DTR_LEDGER_ARCHIVE_WASM_GZ': str(args.artifacts / 'downloads/ledger-archive-node-canister.wasm.gz'),
                'DTR_BASELINE_RUNTIME_WASM': str(normal), 'DTR_UPGRADE_TEST_MODE': 'same-version',
                'DTR_BASELINE_SOURCE_REVISION': revision, 'DTR_BASELINE_SOURCE_TREE': tree,
                'DTR_REPLACEMENT_SOURCE_REVISION': revision, 'DTR_REPLACEMENT_SOURCE_TREE': tree}
            autonomous = output / 'autonomous-trace.json'
            ledger = output / 'ledger-trace.json'
            run('autonomous-50-segment', ['cargo', '+1.94.1', 'test', '--manifest-path',
                'tools/s09-integration/Cargo.toml', '--locked', '--test', 'pocketic_host',
                's12_autonomous_fifty_segment_trace', '--', '--ignored', '--exact', '--nocapture'],
                1200, {**common, 'DTR_S12_AUTONOMOUS_TRACE': str(autonomous)})
            combined = output / 'combined-service-trace.json'
            run('autonomous-combined-service', ['cargo', '+1.94.1', 'test', '--manifest-path',
                'tools/s09-integration/Cargo.toml', '--locked', '--test', 'pocketic_host',
                's12_autonomous_combined_service_trace', '--', '--ignored', '--exact', '--nocapture'],
                1200, {**common, 'DTR_S12_COMBINED_TRACE': str(combined)})
            report['artifacts'].append({'kind': 'combined-service', 'path': str(combined), 'sha256': sha256(combined)})
            report['environment']['application_runtime'] = {'version': command_text([str(args.artifacts / 'bin/pocket-ic'), '--version']),
                'sha256': sha256(args.artifacts / 'bin/pocket-ic')}
            ledger_runs = []
            for repetition in range(1, args.ledger_repetitions + 1):
                ledger_run = output / f'ledger-trace-{repetition}.json'
                run(f'controlled-ledger-backlog-{repetition}', ['cargo', '+1.94.1', 'test',
                    '--manifest-path', 'tools/s09-integration/Cargo.toml', '--locked', '--test',
                    'pocketic_host', 's12_controlled_ledger_backlog_trace', '--', '--ignored',
                    '--exact', '--nocapture'], 1200,
                    {**common, 'DTR_S12_LEDGER_TRACE': str(ledger_run)})
                ledger_runs.append(ledger_run)
            aggregate_ledger_traces(ledger_runs, ledger)
            run('upstream-ledger-archive', ['cargo', '+1.94.1', 'test', '--manifest-path',
                'tools/s09-integration/Cargo.toml', '--locked', '--test', 'pocketic_host',
                'upstream_ledger_archive_to_recovered_publication_matches_native', '--',
                '--exact', '--nocapture'], 900, common)
            for kind, path in (('autonomous-trace', autonomous), ('ledger-trace', ledger)):
                report['artifacts'].append({'kind': kind, 'path': str(path),
                                            'sha256': sha256(path)})
            cost = output / 'cost-projections.json'
            run('cost-model', [sys.executable, '-B', 'tools/s12_cost_model.py',
                '--ledger-trace', str(ledger), '--current-measurements', str(current_path), '--combined-trace', str(combined), '--output', str(cost)], 60)
            report['artifacts'].append({'kind': 'tariff-estimate', 'path': str(cost),
                                        'sha256': sha256(cost)})
        report['overall'] = 'PASS'
        result_path.write_text(json.dumps(report, indent=2) + '\n')
        print('OVERALL PASS')
        return 0
    except (OSError, subprocess.SubprocessError, RuntimeError, ValueError) as error:
        report['overall'] = 'FAIL'
        report['fatal_error'] = str(error)
        result_path.write_text(json.dumps(report, indent=2) + '\n')
        print(f'FAIL: {error}', file=sys.stderr)
        return 1
    finally:
        if server is not None:
            stop_pocketic(server[0], server[1], server[2])


if __name__ == '__main__':
    raise SystemExit(main())
