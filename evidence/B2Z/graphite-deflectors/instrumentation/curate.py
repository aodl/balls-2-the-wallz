from pathlib import Path
import shutil,json,hashlib
src=Path('.work/graphite-deflectors');out=Path('evidence/B2Z/graphite-deflectors');results=out/'results';logs=out/'logs';ins=out/'instrumentation'
for p in [results,logs,ins]:p.mkdir(exist_ok=True)
for f in src.iterdir():
 if not f.is_file() or f.name in ['STATE.md']:continue
 target=logs if f.suffix=='.log' else results if f.suffix=='.json' else ins if f.suffix in ['.py','.mjs'] else None
 if target:shutil.copy2(f,target/f.name)
folders=['production-readonly','production-final','baseline','graphite-pose','graphite-pose-v2','graphite-pose-v3','refinement','quantity-final','model-captures','model-captures-v2','baseline-models','final-models','indexed-models','indexed-cache-smoke','depth-mask-v2','human-corrections-merged','indexed-acceptance','bench-abba','final-model-gallery','hosted-fa935','hosted-9e6df','hosted-logs']
keep={'.json','.png','.webm','.log','.html'}
for name in folders:
 root=src/name
 if not root.exists():continue
 for f in root.rglob('*'):
  if not f.is_file() or f.suffix not in keep:continue
  rel=f.relative_to(root)
  if any(p in ['variants','fixture','video-ignored','ordinary-profile','__pycache__','served-after']for p in rel.parts):continue
  if f.name in ['fixture.json','index.html','style.css']:continue
  target=results/name/rel;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(f,target)
(results/'indexed-acceptance/SCOPE.json').write_text(json.dumps({'frontend':'Exact undeployed indexed graphite80-file freeze served from loopback','javascript_sha256':'25ac2af801426d57c20d2066782e8d523c45b8d0b6fbcebaca464332751971db','backend':'Actual authenticated European Rules7 s5ir5-gqaaa-aaaas-amyna-cai; read-only query/read_state requests only','legacy_raw_scope_wording':'Some reused raw harness scope strings say production; this refers to the actual mainnet backend. The candidate frontend was NOT deployed. The modified instrumentation and loopback URL/context make that distinction explicit.','no_private_camera_world_or_operational_override':True,'payments':'NONE','device':'Ordinary sandboxed Chromium desktop; emulated touch/viewports, not physical phones'},indent=2)+'\n')
# Reproduction programs are retained, but dependency trees/compiled variants/audio
# bodies/profiles/keys are never copied into reviewed source evidence.
for f in src.joinpath('indexed-acceptance').glob('*.py'):shutil.copy2(f,ins/f.name)
if (src/'reproduced-indexed/result.json').exists():shutil.copy2(src/'reproduced-indexed/result.json',results/'frozen-reproduction.json')
rows=[p for p in out.rglob('*')if p.is_file()];print('reviewed',len(rows),'files',sum(p.stat().st_size for p in rows),'bytes','largest',max(p.stat().st_size for p in rows))
