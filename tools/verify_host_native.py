#!/usr/bin/env python3
"""Execute native host comparisons and both directions of saved-host continuation."""
import argparse, json, shutil, subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--legacy-cursors',action='store_true');args=parser.parse_args()
    if not shutil.which('cargo'):print('BLOCKED: Cargo unavailable; native host NOT executed.');return 2
    command=['cargo','run','--manifest-path','native/Cargo.toml','--quiet','--locked','--offline','-p','native-conformance-v4','--bin','host_v5','--']
    if not args.legacy_cursors:
        from observation_reference import build
        result=subprocess.run([*command,'public'],cwd=ROOT,text=True,capture_output=True,timeout=90)
        if result.returncode:print(result.stderr);return 1
        expected=[]
        for row in json.loads((ROOT/'tests/fixtures/coordinator-v5.json').read_text())['rows']:
            if row['game']!='btz':continue
            record=json.loads(bytes.fromhex(row['actions'][-1]['image_hex']))
            expected.append(f"host_public\t{row['name']}\t{record['journal']['head']['manifest_hash']}")
            expected.append(f"publication6\t{row['name']}\t{build(record,version=6)['sha256']}")
        if result.stdout.splitlines()!=expected:print('FAIL: native public outcomes/catalog mismatch');return 1
        print(f'PASS: {len(expected)} native public outcome/catalog checks plus native-own recovery per operation.');return 0
    result=subprocess.run([*command,'legacy'],cwd=ROOT,text=True,capture_output=True,timeout=90)
    if result.returncode:print(result.stderr);return 1
    expected=[]
    for row in json.loads((ROOT/'tests/fixtures/coordinator-v5.json').read_text())['rows']:
        if row['game']!='btz':continue
        expected.extend(f"host\t{row['name']}\t{i}\t{a['sha256']}" for i,a in enumerate(row['actions']))
        publication=next(r for r in json.loads((ROOT/'tests/fixtures/observation-v5.json').read_text())['rows'] if r['name']==row['name'])
        expected.append(f"publication\t{row['name']}\t{publication['sha256']}")
        expected.extend(f"resume\t{row['name']}\t{i}\t{row['actions'][-1]['sha256']}" for i in range(len(row['actions'])))
    if result.stdout.splitlines()!=expected:print('FAIL: missing/extra/mismatched native host output');return 1
    for name,index in [('admission',2),('severance',3),('near-impact',3),('dense',4)]:
        exported=subprocess.run([*command,'export',name,str(index)],cwd=ROOT,text=True,capture_output=True,timeout=30)
        if exported.returncode:print(exported.stderr);return 1
        resumed=subprocess.run(['node','tools/host_bridge.mjs',name,str(index)],input=exported.stdout,cwd=ROOT,text=True,capture_output=True,timeout=30)
        if resumed.returncode:print(resumed.stderr);return 1
        print(resumed.stdout.strip())
    print(f'PASS: {len(expected)} actual native host comparisons plus four native-to-JS continuations.');return 0
if __name__=='__main__':raise SystemExit(main())
