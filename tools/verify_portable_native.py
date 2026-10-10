#!/usr/bin/env python3
"""Actually execute native byte/continuation comparisons. Missing Cargo is BLOCKED, not success."""
import argparse,json,shutil,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--legacy-cursors',action='store_true');args=parser.parse_args()
    if not shutil.which('cargo'):print('BLOCKED: cargo unavailable');return 2
    command=['cargo','run','--manifest-path','native/Cargo.toml','--quiet','--locked','--offline','-p','native-conformance-v4','--']
    result=subprocess.run(command+(['legacy'] if args.legacy_cursors else ['public']),cwd=ROOT,text=True,capture_output=True,timeout=90)
    if result.returncode:print(result.stderr);return 1
    golden=json.loads((ROOT/'tests/fixtures/btz-v3-golden.json').read_text())['cases']
    byname={r['name']:r for r in golden};expected=[]
    for row in golden:expected.append('\t'.join(['case',row['name'],*[row['outputs'][k]['sha256']for k in('state','events','scores')]]))
    for i,row in enumerate(json.loads((ROOT/'tests/fixtures/cursor-v4.json').read_text())['rows'] if args.legacy_cursors else []):expected.append(f"cursor\t{i}\t{byname[row['name']]['outputs']['state']['sha256']}")
    for row in json.loads((ROOT/'tests/fixtures/numeric-v4.json').read_text())['cases']:expected.append(f"numeric\t{row['id']}\t{'/'.join(row['sum'])}")
    if result.stdout.splitlines()!=expected:print('FAIL: native output differs, missing/extra rows fail');return 1
    for name,slices,budget in ([('admission',10,1),('severance',30,1),('near-impact',20,1),('dense',100,7)] if args.legacy_cursors else []):
        exported=subprocess.run([*command,'export',name,str(slices),str(budget)],cwd=ROOT,text=True,capture_output=True,timeout=30)
        if exported.returncode:print(exported.stderr);return 1
        resumed=subprocess.run(['node','tools/native_bridge.mjs',name],input=exported.stdout,cwd=ROOT,text=True,capture_output=True,timeout=30)
        if resumed.returncode:print(resumed.stderr);return 1
        print(resumed.stdout.strip())
    print(f'PASS: {len(expected)} native byte/arithmetic comparisons (private cross-language continuations are optional legacy diagnostics).');return 0
if __name__=='__main__':raise SystemExit(main())
