import json,os,socket,subprocess,time,urllib.request,hashlib,shutil
from pathlib import Path
root=Path.cwd();out=root/'.work/audio-mainnet-playtest/rehearsal-success';out.mkdir(exist_ok=False)
with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
old=root/'.work/audio-mainnet-playtest/rollback/frontend';new=root/'.work/audio-corrective/frozen/frontend'
shutil.copytree(old,out/'old');shutil.copytree(new,out/'new');old=out/'old';new=out/'new'
cfg={'version':1,'canisters':{'observer':{'type':'assets','source':[str(old)]}},'networks':{'local':{'bind':f'127.0.0.1:{port}','type':'ephemeral'}}};env={**os.environ,'DFX_IDENTITY':'codex_local','NPM_CONFIG_IF_PRESENT':'true'};report={'network':'isolated local','port':port,'status':'FAIL','phases':[]}
def run(label,args,timeout=600):
 with (out/(label+'.log')).open('w') as f:r=subprocess.run(['dfx',*args],cwd=out,env=env,stdout=f,stderr=subprocess.STDOUT,timeout=timeout)
 assert r.returncode==0,label
 return (out/(label+'.log')).read_text()
def phase(label,source,initial=False):
 cfg['canisters']['observer']['source']=[str(source)];(out/'dfx.json').write_text(json.dumps(cfg));beg=time.monotonic();run(label,['deploy','observer','--network','local','--no-wallet',*([] if initial else ['--no-asset-upgrade'])]);canister=run(label+'-id',['canister','id','observer','--network','local']).strip();inventory=json.loads(run(label+'-inventory',['canister','call','observer','list','(record {})','--query','--network','local','--output','json']));rows=inventory[0] if len(inventory)==1 and isinstance(inventory[0],list) else inventory
 expected={('/'+p.relative_to(source).as_posix()):p for p in source.rglob('*') if p.is_file() and p.name!='.ic-assets.json5'};assert set(expected)=={r['key'] for r in rows};verified=[]
 for row in rows:
  p=expected[row['key']];b=p.read_bytes();e=next(x for x in row['encodings'] if x['content_encoding']=='identity');digest=hashlib.sha256(b).hexdigest();raw=e['sha256'];raw=raw[0] if len(raw)==1 and isinstance(raw[0],list) else raw
  if isinstance(raw,list):assert bytes(raw).hex()==digest,(row['key'],raw)
  with urllib.request.urlopen(f'http://127.0.0.1:{port}'+row['key']+'?canisterId='+canister,timeout=45) as r:
   got=r.read();headers={k.lower():v for k,v in r.headers.items()}
  assert got==b;assert headers.get('ic-certificate');assert headers.get('x-content-type-options')=='nosniff';verified.append({'path':row['key'],'sha256':digest,'bytes':len(b),'certificate_header':True})
 subprocess.run(['node',str(root/'.work/audio-mainnet-playtest/certify-local.mjs'),f'http://127.0.0.1:{port}',canister,str(source),str(out/(label+'-certified.json'))],cwd=root,check=True,timeout=60)
 report['phases'].append({'phase':label,'seconds':time.monotonic()-beg,'files':verified});report['canister']=canister;run(label+'-status',['canister','status','observer','--network','local']);return canister
try:
 (out/'dfx.json').write_text(json.dumps(cfg));run('start',['start','--background','--host',f'127.0.0.1:{port}']);phase('previous',old,True);phase('candidate',new);phase('restored',old)
 # Real browser loads restored exact mainnet-bound application from the disposable asset gateway.
 from playwright.sync_api import sync_playwright
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,chromium_sandbox=True);page=browser.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(f'http://{report["canister"]}.localhost:{port}/',wait_until='domcontentloaded');page.wait_for_function('()=>globalThis.__b2zExperience?.session?.ready',timeout=120000);state=page.evaluate('()=>({ready:__b2zExperience.session.ready,error:__b2zExperience.session.error,source:__b2zExperience.session.source,head:String(__b2zExperience.session.sequence.last.sequence)})');assert not state['error'];page.screenshot(path=str(out/'restored-game.png'));report['browser']={'state':state,'errors':errors,'scope':'Restored local frontend; read-only pinned-mainnet gameplay verification'};assert not errors;page.close();browser.close()
 report['status']='PASS'
except Exception as e:report['error']=str(e);raise
finally:
 (out/'results.json').write_text(json.dumps(report,indent=2)+'\n');run('stop',['stop'],60)
