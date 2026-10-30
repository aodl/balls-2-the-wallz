#!/usr/bin/env python3
"""Fail closed on a source graph other than the explicitly selected DTR revision."""
import argparse,hashlib,json,subprocess,tomllib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
MANIFESTS=['Cargo.toml','native/Cargo.toml','canisters/runtime-lab/Cargo.toml','tools/s09-integration/Cargo.toml','tools/fixtures/dtr-consumer-rust/Cargo.toml']

def check_packages(packages,expected):
 rows=[]
 for package in packages:
  source=package.get('source')or''
  if package['name']not in {'dtr-core','dtr-wire','dtr-host','dtr-source-model','life-conformance'}and not source.startswith('git+https://github.com/aodl/dtr.git'):continue
  if not source.startswith('git+https://github.com/aodl/dtr.git?rev='+expected+'#')or source.split('#')[-1]!=expected:raise ValueError('unqualified DTR package source: '+package['name']+' '+source)
  rows.append({k:package.get(k)for k in ['name','version','source','checksum']})
 if not rows:raise ValueError('no resolved DTR packages')
 return rows

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--expected-revision');ap.add_argument('--locks-only',action='store_true');ap.add_argument('--manifest',action='append');ap.add_argument('--output',type=Path);a=ap.parse_args();contract=json.loads((ROOT/'config/dtr-release-source.json').read_text());expected=a.expected_revision or contract['required_rust_revision'];report={'required_rust_revision':expected,'release_contract':contract,'source_graphs':[],'status':'NOT_RUN'}
 try:
  for manifest in MANIFESTS:
   lock=ROOT/Path(manifest).parent/'Cargo.lock';rows=check_packages(tomllib.loads(lock.read_text())['package'],expected);report['source_graphs'].append({'manifest':manifest,'locked':rows})
  if hashlib.sha256((ROOT/contract['npm_archive']).read_bytes()).hexdigest()!=contract['npm_archive_sha256']:raise ValueError('immutable JS archive hash')
  if not a.locks_only:
   for manifest in a.manifest or MANIFESTS:
    cmd=['cargo','metadata','--format-version','1','--locked','--offline','--manifest-path',manifest];r=subprocess.run(cmd,cwd=ROOT,capture_output=True,text=True,timeout=120)
    if r.returncode:raise ValueError('cargo metadata failed: '+manifest+' '+r.stderr[-1200:])
    report['source_graphs'].append({'manifest':manifest,'resolved':check_packages(json.loads(r.stdout)['packages'],expected)})
  report['status']='PASS'
 except (ValueError,subprocess.TimeoutExpired)as error:report.update(status='BLOCKED',reason=str(error))
 if a.output:a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(report,indent=2)+'\n')
 print(json.dumps(report,indent=2));return 0 if report['status']=='PASS'else 2
if __name__=='__main__':raise SystemExit(main())
