#!/usr/bin/env python3
"""Bounded S13 runner. Exit 0 PASS, 1 executed FAIL, 2 missing prerequisite BLOCKED."""
import argparse
import json
import os
import shutil
from pathlib import Path
from benchmark_s12 import ROOT, source_record, environment_record, execute, sha256, command_text
from verify_s09_local import start_pocketic, stop_pocketic
from s13_analysis import cases, identity, validate_trace, validate_pair, summarize


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--profile', choices=('smoke', 'extended'), required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--artifacts', type=Path, default=Path('/home/codexdev/dtr-s09-artifacts'))
    parser.add_argument('--harness-target', type=Path)
    parser.add_argument('--case-timeout', type=int, default=600)
    args = parser.parse_args()
    if not 30 <= args.case_timeout <= 1200:
        parser.error('case timeout must be 30..1200 seconds')
    output = args.output.resolve()
    if output.exists() and any(output.iterdir()):
        parser.error('output must be a new or empty directory; never reuse measured results')
    output.mkdir(parents=True, exist_ok=True)
    report = dict(schema='btz-s13-run-v1', profile=args.profile, overall='IN_PROGRESS',
                  source=source_record(), environment=environment_record(), checks=[], cases=cases(args.profile))
    def save():
        (output/'results.json').write_text(json.dumps(report, indent=2)+'\n')
    binary = args.artifacts.resolve()/'bin/pocket-ic'
    missing = [name for name in ('cargo', 'node') if shutil.which(name) is None]
    if not binary.is_file(): missing.append(str(binary))
    if missing:
        report.update(overall='BLOCKED', reason='missing prerequisites: '+', '.join(missing)); save(); return 2
    def run(name, command, timeout, env=None):
        row = execute(name, command, output, timeout, env)
        report['checks'].append(row); save()
        print(f'{name}: {row["status"]}', flush=True)
        if row['status'] != 'PASS': raise RuntimeError(f'{name} failed; see {row["log"]}')
    server = None
    try:
        # Compilation must finish before the idle-timed owned server starts.
        run('normal-wasm-build', ['cargo', '+1.94.1', 'build', '--manifest-path',
            'canisters/runtime-lab/Cargo.toml', '--release', '--target', 'wasm32-unknown-unknown', '--locked'], 900)
        wasm = output/'runtime-lab.wasm'
        shutil.copyfile(ROOT/'canisters/runtime-lab/target/wasm32-unknown-unknown/release/dtr_runtime_lab.wasm', wasm)
        target = args.harness_target.resolve() if args.harness_target else output/'cargo-target'
        env = dict(CARGO_TARGET_DIR=str(target), DFX_IDENTITY='codex_local')
        cargo = ['cargo', '+1.94.1', 'test', '--manifest-path', 'tools/s09-integration/Cargo.toml',
                 '--locked', '--test', 'pocketic_host']
        run('harness-build', cargo+['--no-run'], 1800, env)
        model = ROOT/'benchmarks/s13/cost-assumptions.json'
        binding = dict(source=report['source'], normal_wasm_sha256=sha256(wasm),
            workload_sha256=sha256(ROOT/'benchmarks/s12/workloads.json'),
            harness_sha256=identity({p:sha256(ROOT/p) for p in ('tools/s09-integration/tests/pocketic_host.rs','tools/s09-integration/tests/s13_fallback.rs')}),
            runtime_sha256=sha256(binary), model_configuration_sha256=sha256(model))
        report['binding'] = binding
        report['application_runtime'] = dict(version=command_text([str(binary),'--version']),sha256=sha256(binary))
        report['normal_wasm_bytes'] = wasm.stat().st_size
        server = start_pocketic(binary, output, hard_ttl_seconds=len(report['cases'])*args.case_timeout+120)
        env.update(POCKET_IC_BIN=str(binary),POCKET_IC_SERVER_URL=server[3],DTR_RUNTIME_WASM=str(wasm))
        traces = []
        for spec in report['cases']:
            path = output/f'{spec["id"]}.json'
            run(spec['id'], cargo+['s13_fallback_policy_trace','--','--ignored','--exact','--nocapture'],
                args.case_timeout, {**env, 'DTR_S13_CASE':json.dumps(spec), 'DTR_S13_TRACE':str(path)})
            trace = json.loads(path.read_text())
            trace.update(binding)
            validate_trace(trace,{**binding,'case':spec})
            path.write_text(json.dumps(trace,indent=2)+'\n')
            traces.append(trace)
            report.setdefault('trace_artifacts',[]).append(dict(path=path.name,sha256=sha256(path)))
            if len(traces)%2 == 0: validate_pair(traces[-2],traces[-1])
            (output/'summary.json').write_text(json.dumps(dict(status='IN_PROGRESS',scenarios=[summarize(t) for t in traces]),indent=2)+'\n')
            save()
        from s13_cost_model import project
        costs = project(traces, json.loads(model.read_text()), binding)
        (output/'cost-projections.json').write_text(json.dumps(costs,indent=2)+'\n')
        (output/'summary.json').write_text(json.dumps(dict(status='PASS',scenarios=[summarize(t) for t in traces]),indent=2)+'\n')
        if source_record() != report['source']: raise ValueError('source changed during measurement')
        report['overall']='PASS'; save(); print('OVERALL PASS'); return 0
    except (OSError, ValueError, RuntimeError, KeyError) as error:
        report.update(overall='FAIL',fatal_error=str(error)); save(); print(f'FAIL: {error}',flush=True); return 1
    finally:
        if server is not None: stop_pocketic(server[0],server[1],server[2])


if __name__ == '__main__':
    raise SystemExit(main())
