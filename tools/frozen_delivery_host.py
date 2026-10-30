#!/usr/bin/env python3
"""Portable provisioning and one-shot delegation to the untouched b96 delivery runner."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import shutil
import subprocess
import sys
import time


def digest(p):
    h = hashlib.sha256()
    with p.open('rb') as f:
        for b in iter(lambda: f.read(1024 * 1024), b''):
            h.update(b)
    return h.hexdigest()


def save(p, value):
    p.write_text(json.dumps(value, indent=2) + '\n')


def checked(cmd, source, evidence, env=None):
    with (evidence / ('provision-' + str(len(list(evidence.glob('provision-*.log')))) + '.log')).open('w') as log:
        log.write(json.dumps(cmd) + '\n'); log.flush()
        subprocess.run(cmd, cwd=source, env=env, stdout=log, stderr=subprocess.STDOUT, check=True)


def verify_package(package):
    sys.path.insert(0, str(package))
    from package_frozen_delivery import verify
    verify(package)


def prepare(package, state, native_build):
    verify_package(package)
    if sys.version_info[:2] != (3, 11) or platform.machine() != 'x86_64' or os.getuid() == 0:
        raise RuntimeError('requires non-root Linux x86-64 with Python 3.11')
    state.mkdir(parents=True, exist_ok=False)
    evidence = state / 'evidence'; evidence.mkdir()
    runtime = state / 'runtime'; runtime.mkdir()
    source = package / 'baseline'
    env = {**os.environ, 'RUSTUP_TOOLCHAIN': '1.94.1', 'DFX_IDENTITY': 'codex_local'}
    if subprocess.check_output(['node', '--version'], text=True).strip() != 'v24.15.0':
        raise RuntimeError('requires exact Node 24.15.0')
    save(evidence / 'host-compatibility.json', {'platform': platform.platform(), 'architecture': platform.machine(), 'libc': platform.libc_ver(), 'cpu_count': os.cpu_count(), 'cpu_affinity': len(os.sched_getaffinity(0)), 'python': sys.version, 'recommended_specs_are_not_acceptance_predicates': True})
    checked(['rustup', 'toolchain', 'install', '1.94.1', '--profile', 'minimal'], source, evidence, env)
    manifests = ['Cargo.toml', 'native/Cargo.toml', 'canisters/runtime-lab/Cargo.toml', 'tools/s09-integration/Cargo.toml', 'tools/fixtures/dtr-consumer-rust/Cargo.toml']
    for m in manifests:
        checked(['cargo', '+1.94.1', 'fetch', '--manifest-path', m, '--locked'], source, evidence, env)
    checked([sys.executable, '-B', 'tools/check_dtr_provenance.py', '--output', str(evidence / 'provenance.json')], source, evidence, env)
    checked(['npm', 'ci', '--ignore-scripts'], source, evidence, env)
    browser = runtime / 'browser'
    # Resolve launcher symlinks: venv's recorded base home must be the actual
    # Python installation, including on user-scoped relocatable CPython builds.
    checked([str(Path(sys.executable).resolve()), '-m', 'venv', str(browser)], source, evidence, env)
    py = str(browser / 'bin/python')
    checked([py, '-m', 'pip', 'install', '--require-hashes', '-r', 'tools/browser-requirements.txt'], source, evidence, env)
    checked([py, '-m', 'playwright', 'install', 'chromium'], source, evidence, env)
    # Run in the pinned browser environment. Inventory AND actual sandbox launch
    # must pass; missing OS libraries or denied sandbox are environment blockers.
    smoke = """import pathlib,json,hashlib
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 exe=pathlib.Path(p.chromium.executable_path)
 while not exe.name.startswith('chromium-'): exe=exe.parent
 cache=exe.parent
 expected=json.loads(pathlib.Path('vendor/b2z/delivery/browser-binaries.json').read_text())
 actual={str(f.relative_to(cache)) for d in {n.split('/')[0] for n in expected} for f in (cache/d).rglob('*') if f.is_file()}
 assert actual==set(expected), 'browser inventory differs'
 for n,h in expected.items(): assert hashlib.sha256((cache/n).read_bytes()).hexdigest()==h,n
 b=p.chromium.launch(headless=True,chromium_sandbox=True)
 assert b.version=='153.0.8010.12',b.version
 print(json.dumps({'version':b.version,'sandbox':True,'verified_files':len(expected)}));b.close()
"""
    checked([py, '-c', smoke], source, evidence, env)
    artifacts = runtime / 'artifacts'
    checked([sys.executable, '-B', 'tools/fetch_s09_artifacts.py', '--destination', str(artifacts), '--record', str(evidence / 'downloads.json')], source, evidence, env)
    if native_build:
        # Native-only build of the exact exported baseline. No wasm target,
        # no backend build script and no frontend asset generation are invoked.
        env = {**env, 'CARGO_TARGET_DIR': str(runtime / 'native-target')}
        build = evidence / 'native-build.jsonl'
        with build.open('w') as out:
            subprocess.run(['cargo', '+1.94.1', 'test', '--manifest-path', 'tools/s09-integration/Cargo.toml', '--test', 's14_index', '--no-run', '--locked', '--offline', '--message-format=json'], cwd=source, env=env, stdout=out, stderr=(evidence / 'native-build.log').open('w'), check=True)
        binaries = [r['executable'] for line in build.read_text().splitlines() if line.startswith('{') and (r := json.loads(line)).get('reason') == 'compiler-artifact' and r.get('executable')]
        if len(binaries) != 1:
            raise RuntimeError('ambiguous native harness')
        harness = Path(binaries[0])
    else:
        reference_root = json.loads((package / 'PACKAGE.json').read_text())['reference_harness_source_root']
        if source.resolve() != Path(reference_root):
            raise RuntimeError('reference harness embeds ' + reference_root + '; choose --native-build to compile the SAME baseline at this source path')
        harness = package / 'inputs/harness'
    frozen_harness = evidence / 'native-harness'
    shutil.copyfile(harness, frozen_harness); frozen_harness.chmod(0o755)
    checked([str(frozen_harness), '--list'], source, evidence, env)
    # Existing provisioning-only fixture check, never a measured delivery window.
    sys.path.insert(0, str(source / 'tools'))
    from verify_s09_local import start_pocketic, stop_pocketic
    server = start_pocketic(artifacts / 'bin/pocket-ic', evidence, hard_ttl_seconds=300, idle_ttl_seconds=250)
    try:
        binding_env = {**env, 'POCKET_IC_SERVER_URL': server[3], 'ICP_LEDGER_WASM': str(artifacts / 'wasm/ledger-canister.wasm'), 'ICP_INDEX_WASM': str(artifacts / 'wasm/ic-icp-index-canister.wasm'), 'B2Z_S14_WASM': str(package / 'inputs/A0.wasm'), 'B2Z_PROFILE_FIDUCIARY': '1'}
        checked([str(frozen_harness), 'delivery_public_binding', '--exact', '--ignored', '--nocapture'], source, evidence, binding_env)
    finally:
        stop_pocketic(*server[:3])
    verify_package(package)
    library_path = env.get('LD_LIBRARY_PATH', '')
    libraries = {str(p.resolve()): digest(p) for directory in library_path.split(os.pathsep) if directory for p in Path(directory).glob('*.so*') if p.is_file()}
    save(evidence / 'RUNTIME_LIBRARIES.json', libraries)
    ready = {'baseline': json.loads((package / 'PACKAGE.json').read_text())['baseline_commit'], 'harness': str(frozen_harness), 'harness_sha256': digest(frozen_harness), 'native_build': native_build, 'browser_python': py, 'browser_library_path': library_path, 'artifacts': str(artifacts), 'ready_epoch': time.time(), 'comparison_runs': 0}
    save(evidence / 'READY.json', ready)
    seal(evidence)


def seal(evidence):
    files = sorted(p for p in evidence.rglob('*') if p.is_file() and p != evidence / 'SHA256SUMS')
    (evidence / 'SHA256SUMS').write_text(''.join(digest(p) + '  ' + str(p.relative_to(evidence)) + '\n' for p in files))


def run(package, state):
    verify_package(package)
    evidence = state / 'evidence'
    ready = json.loads((evidence / 'READY.json').read_text())
    if digest(Path(ready['harness'])) != ready['harness_sha256']:
        raise RuntimeError('native harness changed after provisioning')
    libraries = evidence / 'RUNTIME_LIBRARIES.json'
    if libraries.exists():
        for name, sha in json.loads(libraries.read_text()).items():
            if digest(Path(name)) != sha:
                raise RuntimeError('provisioned browser library changed: ' + name)
    # Atomic, permanent claim: failures and interrupts cannot be retried by this
    # command. A later attempt needs its own explicit review and fresh state.
    attempt = evidence / 'attempt'; attempt.mkdir(exist_ok=False)
    save(attempt / 'AUTHORIZATION.json', {'authorized_environment': 'operator-authorized existing host', 'normal_only': True, 'single_attempt': True, 'baseline': ready['baseline'], 'native_harness_sha256': ready['harness_sha256']})
    source = package / 'baseline'
    py = ready['browser_python']
    env = {**os.environ, 'DFX_IDENTITY': 'codex_local', 'S14_QUAL_PREBUILT_ROOT': str(package / 'inputs'), 'S14_QUAL_PRODUCTION_REFERENCE': str(source / 'vendor/b2z/delivery/frontend-manifest.json'), 'PATH': str(Path(py).parent) + os.pathsep + os.environ['PATH']}
    if ready.get('browser_library_path'):
        env['LD_LIBRARY_PATH'] = ready['browser_library_path']
    cmd = [py, '-B', 'tools/run_matched_delivery.py', '--output', str(attempt / 'comparison'), '--normal-only', '--harness', ready['harness'], '--harness-sha256', ready['harness_sha256'], '--a0', str(package / 'inputs/A0.wasm'), '--a2', str(package / 'inputs/A2.wasm'), '--a2-sha256', '2c289fdf44d05422909ce53be5e058222de6b1f971644b0750c7bc12d148c9cb', '--artifacts', ready['artifacts'], '--proxy-port', '18765', '--browser-python', py, '--ready', str(evidence / 'READY.json'), '--prerequisite-wait-seconds', '180']
    code = None
    try:
        with (attempt / 'runner.log').open('w') as log:
            code = subprocess.call(cmd, cwd=source, env=env, stdout=log, stderr=subprocess.STDOUT)
    finally:
        outcomes_path = attempt / 'comparison/outcomes.json'
        outcomes = json.loads(outcomes_path.read_text()) if outcomes_path.exists() else []
        verdict = 'PASS' if code == 0 and len(outcomes) == 2 and all(r['status'] == 'PASS' for r in outcomes) else 'FAIL' if any(r['status'] == 'FAIL' for r in outcomes) else 'BLOCKED'
        save(attempt / 'VERDICT.json', {'status': verdict, 'runner_exit_code': code, 'outcomes': outcomes, 'missing_cases_are_not_pass': True, 'no_automatic_retry': True})
        seal(evidence)
    return 0 if verdict == 'PASS' else 1


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('mode', choices=['prepare', 'run', 'seal'])
    p.add_argument('--package', type=Path, default=Path(__file__).resolve().parent)
    p.add_argument('--state', type=Path, required=True)
    p.add_argument('--native-build', action='store_true', help='compile the unchanged native b96 harness for this path; never compile comparison Wasm')
    a = p.parse_args(); package = a.package.resolve(); state = a.state.resolve()
    if a.mode == 'prepare':
        try:
            prepare(package, state, a.native_build)
        finally:
            evidence = state / 'evidence'
            if evidence.exists():
                save(evidence / 'PREPARATION.json', {'status': 'PASS' if (evidence / 'READY.json').exists() else 'FAIL', 'comparison': 'NOT_RUN'})
                seal(evidence)
    elif a.mode == 'run':
        return run(package, state)
    else:
        seal(state / 'evidence')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
