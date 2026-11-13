#!/usr/bin/env python3
"""Owned disposable observer-only dfx network. No backend or mainnet configuration."""
import argparse,hashlib,json,os,socket,subprocess,time,urllib.request,shutil
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--assets',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();assets=a.assets.resolve();out=a.output.resolve();out.mkdir(parents=True,exist_ok=False)
with socket.socket()as listener:listener.bind(('127.0.0.1',0));port=listener.getsockname()[1]
shutil.copytree(assets,out/'assets')
(out/'baseline').mkdir();(out/'baseline/index.html').write_text('<!doctype html><title>Disposable asset baseline</title>');shutil.copyfile(assets/'.ic-assets.json5',out/'baseline/.ic-assets.json5')
config={'version':1,'canisters':{'observer':{'type':'assets','source':['baseline'],'build':[]}},'networks':{'local':{'bind':f'127.0.0.1:{port}','type':'ephemeral'}}};(out/'dfx.json').write_text(json.dumps(config,indent=2));env={**os.environ,'DFX_IDENTITY':'codex_local','NPM_CONFIG_IF_PRESENT':'true'};report={'scope':__doc__,'assets':str(assets),'network':'local','port':port}
def run(name,args,timeout=180):
 with (out/(name+'.log')).open('w')as log:
  r=subprocess.run(['dfx',*args],cwd=out,env=env,stdout=log,stderr=subprocess.STDOUT,timeout=timeout)
 if r.returncode:raise RuntimeError(name+' failed; inspect local log')
 return (out/(name+'.log')).read_text()
try:
 run('start',['start','--background','--host',f'127.0.0.1:{port}']);run('baseline-deploy',['deploy','observer','--network','local','--no-wallet'],300);canister=run('id',['canister','id','observer','--network','local']).strip();report['canister']=canister
 report['baseline_status']=run('baseline-status',['canister','status','observer','--network','local']);config['canisters']['observer']['source']=['assets'];(out/'dfx.json').write_text(json.dumps(config,indent=2));began=time.monotonic();run('deploy',['deploy','observer','--network','local','--no-wallet','--no-asset-upgrade'],600);report['upload_seconds']=time.monotonic()-began
 report['after_status']=run('after-status',['canister','status','observer','--network','local']);report['before_repeat_inventory']=json.loads(run('before-repeat-inventory',['canister','call','observer','list','(record {})','--query','--network','local','--output','json']));began=time.monotonic();report['repeat_sync_log']=run('repeat-sync',['deploy','observer','--network','local','--no-wallet','--no-asset-upgrade'],600);report['repeat_sync_seconds']=time.monotonic()-began


 report['inventory']=json.loads(run('inventory',['canister','call','observer','list','(record {})','--query','--network','local','--output','json']))
 assert report['inventory']==report['before_repeat_inventory'],'Unchanged sync modified asset content/properties'
 files=report['inventory'];
 if isinstance(files,list)and len(files)==1 and isinstance(files[0],list):files=files[0]
 matched=0
 for f in files:
  if f['key'].endswith('.flac'):
   assert [e['content_encoding']for e in f['encodings']]==['identity'],f;assert f['content_type']=='audio/flac',f;matched+=1
 assert matched==57,matched
 rows=[]
 public=sorted(p.relative_to(assets).as_posix()for p in assets.rglob('*')if p.is_file()and p.name!='.ic-assets.json5')
 assert {'/'+name for name in public}=={f['key']for f in files}
 for name in public:
  with urllib.request.urlopen(f'http://127.0.0.1:{port}/'+name+'?canisterId='+canister,timeout=30)as response:
   data=response.read();headers=dict(response.headers);mime=response.headers.get_content_type()
  assert data==(assets/name).read_bytes();assert headers.get('IC-Certificate')or headers.get('ic-certificate');assert headers.get('X-Content-Type-Options',headers.get('x-content-type-options'))=='nosniff';assert not name.endswith('.flac')or mime=='audio/flac';assert not name.endswith('.json')or mime=='application/json';assert not name.endswith('.mjs')or'javascript'in mime
  if name.endswith('.flac'):assert 'immutable'in headers.get('Cache-Control',headers.get('cache-control',''))
  rows.append({'file':name,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'mime':mime})
 report.update(status='PASS',files=rows,flac_identity_encodings=matched);run('status',['canister','status','observer','--network','local'])
except Exception as e:report.update(status='FAIL',error=str(e));raise
finally:
 (out/'results.json').write_text(json.dumps(report,indent=2)+'\n')
 try:run('stop',['stop'],60)
 except Exception:pass
print('PASS local asset canister: all57 FLACs identity-only; complete public inventory, repeat identity and served hashes/security headers')
