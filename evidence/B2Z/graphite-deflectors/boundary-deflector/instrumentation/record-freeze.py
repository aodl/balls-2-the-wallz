"""Record a new clean candidate only. Never writes historical freezes or deploys."""
from pathlib import Path
import argparse,json,hashlib,shutil,subprocess
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--frontend',type=Path,required=True);p.add_argument('--normal-wasm',type=Path,required=True);a=p.parse_args()
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
base=Path('evidence/B2Z/graphite-deflectors/boundary-deflector/artifacts');base.mkdir(exist_ok=False)
root=a.frontend.resolve();assert root.is_relative_to(Path('.work/boundary-deflector').resolve())
manifest=json.loads((root/'build-manifest.json').read_text());assert not manifest['source_dirty']and not manifest['local_test_only']
assert manifest['deployment']['canister_id']=='s5ir5-gqaaa-aaaas-amyna-cai'
oldbase=Path('evidence/B2Z/graphite-deflectors/artifacts');old=json.loads((oldbase/'provenance.json').read_text())
rows=[{'path':p.relative_to(root).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)}for p in sorted(root.rglob('*'))if p.is_file()]
(base/'frontend-inventory.json').write_text(json.dumps(rows,indent=2)+'\n');shutil.copyfile(root/'build-manifest.json',base/'build-manifest.json')
def checked(names,known):
 result=[]
 for name in sorted(names):
  p=Path(name);assert not p.is_absolute()and'..'not in p.parts and p.suffix!='.pem'and p.name!='.env'
  if name=='canister_ids.json'and not p.exists():result.append(next(r for r in known if r['path']==name));continue
  assert p.is_file(),name;result.append({'path':name,'sha256':sha(p)})
 return result
backend_names={r['path']for r in old['backend_inputs']}|{'apps/b2z-observer/configuration-deflector.bin','config/rules/v12-boundary-deflector.json'}
for directory in ['native/b2z-native/src','crates/b2z-protocol/src','canisters/runtime-lab/src']:
 backend_names.update(p.as_posix()for p in Path(directory).rglob('*')if p.is_file()and p.suffix in ['.rs','.json','.bin'])
backend=checked(backend_names,old['backend_inputs'])
names={r['path']for r in old['inputs']}|set(manifest['inputs'])|backend_names
inputs=checked(names,old['inputs'])
oldrows={r['path']:r for r in json.loads((oldbase/'frontend-inventory.json').read_text())}
audio=[r for r in rows if r['path'].startswith('audio/')];assert len(audio)==61 and all(oldrows[r['path']]['sha256']==r['sha256']for r in audio)
result={'source':manifest['source_commit'],'source_dirty':False,'files':len(rows),'public_files':len(rows)-1,'inventory_sha256':sha(base/'frontend-inventory.json'),'javascript_sha256':sha(root/'app.mjs'),'audio_manifest_sha256':sha(root/'audio/b2z-v1/manifest.json'),'unchanged_audio_files':61,'total_asset_bytes':sum(r['bytes']for r in rows),'normal_wasm_sha256':sha(a.normal_wasm),'normal_wasm_provenance':'Local normal bootstrap artifact; hosted path-bearing build must be retained distinctly and selected before final qualification/release. No production installation.','inputs':inputs,'backend_inputs':backend,'changed_assets_vs_graphite80':[r['path']for r in rows if oldrows.get(r['path'],{}).get('sha256')!=r['sha256']],'qualification_scope':'Combined Rules12 boundary Deflector frontend/backend candidate; not a claim of completed installed or hosted qualification'}
(base/'provenance.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:result[k]for k in ['source','files','javascript_sha256','inventory_sha256','normal_wasm_sha256']},indent=2))
