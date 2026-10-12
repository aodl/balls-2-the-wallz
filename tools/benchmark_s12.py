#!/usr/bin/env python3
"""Bounded S12 benchmark entry point. Exit 0=PASS, 1=FAIL, 2=BLOCKED prerequisite."""
import argparse
import datetime
import hashlib
import json
import os
import platform
import shutil
import signal
import subprocess
import sys
import time
from pathlib import Path

from verify_s09_local import start_pocketic, stop_pocketic

ROOT = Path(__file__).resolve().parents[1]
DTR_REVISION = '71e59e93cf49a3656689679b538b4c3f138787f8'


def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        while chunk := stream.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def command_text(command, timeout=15):
    result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, timeout=timeout)
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
            'runtime_cargo_lock_sha256': sha256(ROOT / 'canisters/runtime-lab/Cargo.lock')}


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


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--profile', choices=['smoke', 'extended'], required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--artifacts', type=Path,
                        default=Path('/home/codexdev/dtr-s09-artifacts'))
    parser.add_argument('--repetitions', type=int, default=3)
    args = parser.parse_args()
    if sys.version_info < (3, 11):
        parser.error('Python 3.11 or newer is required')
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
        run('canbench', ['canbench'], 600,
            {'CANBENCH_CFG_FILE': 'benchmarks/s12/canbench.yml'})
        for relative in ('benchmarks/s12/canbench_results.yml',
                         'benchmarks/s12/canbench_results.csv'):
            path = ROOT / relative
            report['artifacts'].append({'kind': 'measured', 'path': relative,
                                        'sha256': sha256(path)})
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
            target = output / 'cargo-target'
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
            run('controlled-ledger-backlog', ['cargo', '+1.94.1', 'test', '--manifest-path',
                'tools/s09-integration/Cargo.toml', '--locked', '--test', 'pocketic_host',
                's12_controlled_ledger_backlog_trace', '--', '--ignored', '--exact', '--nocapture'],
                1200, {**common, 'DTR_S12_LEDGER_TRACE': str(ledger)})
            run('upstream-ledger-archive', ['cargo', '+1.94.1', 'test', '--manifest-path',
                'tools/s09-integration/Cargo.toml', '--locked', '--test', 'pocketic_host',
                'upstream_ledger_archive_to_recovered_publication_matches_native', '--',
                '--exact', '--nocapture'], 900, common)
            for kind, path in (('autonomous-trace', autonomous), ('ledger-trace', ledger)):
                report['artifacts'].append({'kind': kind, 'path': str(path),
                                            'sha256': sha256(path)})
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
