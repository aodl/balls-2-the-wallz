#!/usr/bin/env python3
"""Offline exact frozen-artifact reproduction/input parity. Never installs or deploys."""
import argparse,hashlib,json,shutil,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
EVIDENCE=ROOT/'evidence/B2Z/approved-action-panel-war-cry/artifacts'
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def checked_path(name):
 p=Path(name)
 if p.is_absolute()or'..'in p.parts or p.suffix=='.pem'or p.name=='.env':raise ValueError('public relative source input required')
 return ROOT/p
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);p.add_argument('--backend-only',action='store_true');p.add_argument('--wasm',type=Path);a=p.parse_args();out=a.output.resolve();out.mkdir(parents=True,exist_ok=False)
 provenance=json.loads((EVIDENCE/'provenance.json').read_text());inventory=json.loads((EVIDENCE/'frontend-inventory.json').read_text());assert sha(EVIDENCE/'frontend-inventory.json')==provenance['inventory_sha256'];assert not provenance['source_dirty']
 source=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip();checked=[]
 for row in provenance['backend_inputs']if a.backend_only else provenance['inputs']:
  path=checked_path(row['path'])
  if row['path']=='canister_ids.json'and not path.exists():
   checked.append({'path':row['path'],'scope':'optional operator mapping absent; frozen deployment.json and exact runtime build bind the backend'});continue
  assert path.is_file()and sha(path)==row['sha256'],'changed consumed input: '+row['path'];checked.append({'path':row['path'],'sha256':row['sha256']})
 if a.wasm:assert sha(a.wasm)==provenance['normal_wasm_sha256'],'normal Wasm differs from the frozen candidate'
 if not a.backend_only:
  assets=out/'reproduced';subprocess.run(['node','tools/build_observer_playability.mjs','--canister','s5ir5-gqaaa-aaaas-amyna-cai','--output',str(assets)],cwd=ROOT,check=True)
  expected={r['path']:r for r in inventory};actual={str(x.relative_to(assets))for x in assets.rglob('*')if x.is_file()};assert actual==set(expected)
  # All executable/content/policy bytes must reproduce before restoring the
  # reviewed public build record from its actual clean freeze source. A later
  # evidence/test commit must not manufacture a different public build record.
  for name,r in expected.items():
   if name=='build-manifest.json':continue
   assert(assets/name).stat().st_size==r['bytes']and sha(assets/name)==r['sha256'],'different frozen asset: '+name
  frozen=EVIDENCE/'build-manifest.json';assert sha(frozen)==expected['build-manifest.json']['sha256'];metadata=json.loads(frozen.read_text());assert metadata['source_commit']==provenance['source']and not metadata['source_dirty']and not metadata['local_test_only'];assert metadata['deployment']['canister_id']=='s5ir5-gqaaa-aaaas-amyna-cai'
  shutil.copyfile(frozen,assets/'build-manifest.json')
  assert all(sha(assets/name)==r['sha256']and(assets/name).stat().st_size==r['bytes']for name,r in expected.items())
 result={'status':'PASS','scope':__doc__,'tested_source':source,'frozen_source':provenance['source'],'normal_wasm_sha256':provenance['normal_wasm_sha256'],'inventory_sha256':provenance['inventory_sha256'],'files':len(inventory),'backend_only':a.backend_only,'checked_inputs':checked};(out/'result.json').write_text(json.dumps(result,indent=2)+'\n');print('PASS exact frozen inputs/artifacts',source)
if __name__=='__main__':main()
