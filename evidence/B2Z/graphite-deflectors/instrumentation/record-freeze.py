from pathlib import Path
import json,hashlib,shutil
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
base=Path('evidence/B2Z/graphite-deflectors/artifacts');root=Path('.work/graphite-deflectors/frozen/frontend');old=json.load(open('evidence/B2Z/combined-clearance-war-cry/artifacts/provenance.json'));manifest=json.loads((root/'build-manifest.json').read_text());assert not manifest['source_dirty']
rows=[{'path':p.relative_to(root).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(root.rglob('*')) if p.is_file()];(base/'frontend-inventory.json').write_text(json.dumps(rows,indent=2)+'\n');shutil.copy2(root/'build-manifest.json',base/'build-manifest.json')
paths={x['path'] for x in old['inputs']}|set(manifest['inputs']);inputs=[]
for name in sorted(paths):
 p=Path(name);assert not p.is_absolute() and '..' not in p.parts,name
 if name=='canister_ids.json' and not p.exists():inputs.append(next(x for x in old['inputs']if x['path']==name));continue
 assert p.is_file(),name;inputs.append({'path':name,'sha256':sha(p)})
for x in old['backend_inputs']:assert sha(Path(x['path']))==x['sha256'],x['path']
new={**old,'source':manifest['source_commit'],'source_dirty':False,'files':len(rows),'public_files':len(rows)-1,'inventory_sha256':sha(base/'frontend-inventory.json'),'javascript_sha256':sha(root/'app.mjs'),'audio_manifest_sha256':sha(root/'audio/b2z-v1/manifest.json'),'total_asset_bytes':sum(x['bytes']for x in rows),'inputs':inputs,'qualification_scope':'Visual frontend only; Deflector authoritative mechanic incomplete, no new backend artifact','normal_wasm_provenance':'Unchanged previously qualified Rules11 backend; not a Deflector backend candidate'}
oldrows={x['path']:x for x in json.load(open('evidence/B2Z/combined-clearance-war-cry/artifacts/frontend-inventory.json'))};new['changed_assets_vs_frontend80']=[r['path']for r in rows if oldrows.get(r['path'],{}).get('sha256')!=r['sha256']];new.pop('changed_assets_vs_approved79',None)
audio=[r for r in rows if r['path'].startswith('audio/')];assert len(audio)==61 and all(oldrows[r['path']]['sha256']==r['sha256']for r in audio);new['unchanged_audio_files']=len(audio)
(base/'provenance.json').write_text(json.dumps(new,indent=2)+'\n');print(new['source'],new['javascript_sha256'],new['inventory_sha256'],len(inputs),new['changed_assets_vs_frontend80'])
