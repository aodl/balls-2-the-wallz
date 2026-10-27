#!/usr/bin/env python3
"""Freeze a normal local cost experiment; no DFX, public calls or publication.

Unpublished DTR is consumed only through the reviewed temporary override. The
committed production pins and locks are restored by that tool. The pair of source
revisions, any local diff, build profile and exact artifact are recorded together.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from verify_s14_local import wasm_exports

ROOT = Path(__file__).resolve().parents[1]

def digest(data):
    return hashlib.sha256(data).hexdigest()

def git(path, *args):
    return subprocess.check_output(['git', '-C', str(path), *args], text=True).strip()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--dtr', type=Path)
    parser.add_argument('--revision')
    parser.add_argument('--opt-level', choices=['2', '3', 's', 'z'], default='3')
    args = parser.parse_args()
    if bool(args.dtr) != bool(args.revision):
        parser.error('--dtr and --revision are required together')
    out = args.output.resolve()
    out.mkdir(parents=True, exist_ok=False)
    command = ['cargo', 'build', '--manifest-path', 'canisters/runtime-lab/Cargo.toml',
               '--target', 'wasm32-unknown-unknown', '--release', '--locked', '--offline']
    if args.dtr:
        command = [sys.executable, 'tools/s14_development.py', '--dtr', str(args.dtr.resolve()),
                   '--revision', args.revision, '--', *command]
    changes = subprocess.check_output(['git', 'diff', 'HEAD', '--binary'], cwd=ROOT)
    (out / 'source.patch').write_bytes(changes)
    env = {**os.environ, 'CARGO_PROFILE_RELEASE_OPT_LEVEL': args.opt_level}
    # A different target directory is supported, and recorded, for independent worktrees.
    target = Path(env.get('CARGO_TARGET_DIR', str(ROOT / 'canisters/runtime-lab/target')))
    with (out / 'build.log').open('w') as log:
        result = subprocess.run(command, cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT)
    meta = {'source_commit': git(ROOT, 'rev-parse', 'HEAD'),
            'source_diff_sha256': digest(changes), 'dtr_revision': args.revision,
            'opt_level': args.opt_level, 'command': command, 'exit_code': result.returncode,
            'rustc': subprocess.check_output(['rustc', '-Vv'], text=True),
            'target_directory': str(target), 'instrumented': False, 'test_hooks': False,
            'npm_archive_sha256': digest((ROOT / 'vendor/dtr/dtr-timeline-runtime-0.14.0.tgz').read_bytes())}
    if result.returncode == 0:
        data = (target / 'wasm32-unknown-unknown/release/dtr_runtime_lab.wasm').read_bytes()
        artifact = out / 'normal.wasm'
        artifact.write_bytes(data)
        exports = wasm_exports(artifact)
        if any('test_' in name for name in exports):
            raise RuntimeError('test export in cost candidate')
        meta.update(wasm_sha256=digest(data), wasm_bytes=len(data), exports=exports)
    (out / 'provenance.json').write_text(json.dumps(meta, indent=2) + '\n')
    if result.returncode:
        raise SystemExit(result.returncode)
    (out / 'SHA256SUMS').write_text(''.join(f'{digest(f.read_bytes())}  {f.name}\n'
                                          for f in sorted(out.iterdir()) if f.is_file()))
    print(meta['wasm_sha256'])

if __name__ == '__main__':
    main()
