"""Exact future frontend80 served locally with its policy; read-only actual certified European Rules7. No installation/payment."""
import functools,http.server,threading,json,time,hashlib,importlib.util
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path('.work/combined-clearance-war-cry/frozen/frontend').absolute();out=Path('.work/combined-clearance-war-cry/frozen-mainnet');out.mkdir(exist_ok=False);policy=json.loads((root/'.ic-assets.json5').read_text());inventory=json.loads(Path('evidence/B2Z/combined-clearance-war-cry/artifacts/frontend-inventory.json').read_text());assert len(inventory)==80
for row in inventory:
 f=root/row['path'];assert f.stat().st_size==row['bytes']and hashlib.sha256(f.read_bytes()).hexdigest()==row['sha256']
spec=importlib.util.spec_from_file_location('common',Path('.work/approved-panel-deployment-20261116/live-common.py'));common=importlib.util.module_from_spec(spec);spec.loader.exec_module(common)
public={'/'+r['path']for r in inventory if r['path']!='.ic-assets.json5'}
class H(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
 def do_GET(self):
  from urllib.parse import urlsplit
  if urlsplit(self.path).path not in public|{'/'}:self.send_error(404);return
  super().do_GET()
 def guess_type(self,p):return 'audio/flac'if p.endswith('.flac')else'application/javascript'if p.endswith('.mjs')else super().guess_type(p)
 def end_headers(self):
  for k,v in policy[0]['headers'].items():self.send_header(k,v)
  self.send_header('Cache-Control','no-cache');super().end_headers()
s=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(H,directory=str(root)));threading.Thread(target=s.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{s.server_port}';report={'status':'RUNNING','scope':__doc__,'rows':[],'requests':[]}
def save():(out/'results.json').write_text(json.dumps(report,indent=2)+'\n')
with sync_playwright()as pw:
 b=pw.chromium.launch(headless=True,chromium_sandbox=True)
 try:
  for w,h in [(320,640),(390,844),(1440,900)]:
   c=b.new_context(viewport={'width':w,'height':h},has_touch=w<700,permissions=['clipboard-write'],record_video_dir=str(out/f'video-{w}'));p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
   def guard(route):
    r=route.request
    if r.method not in ['GET','OPTIONS']and not(r.method=='POST'and r.url.endswith(('/query','/read_state'))):route.abort();raise AssertionError('Non-read-only request blocked')
    if r.method=='POST':
     assert 'icp-api.io' in r.url and '/s5ir5-gqaaa-aaaas-amyna-cai/'in r.url,r.url
     report['requests'].append({'method':r.method,'url':r.url})
    route.continue_()
   p.route('**/*',guard);start=time.monotonic();p.goto(base,wait_until='domcontentloaded');p.wait_for_function('()=>globalThis.__b2zExperience?.session?.ready',timeout=90000);first_world_seconds=time.monotonic()-start;source,roster=common.enter_fire(p);common.heading(p,347.15);common.settle(p);before=common.editor(p,source['cell']);assert p.locator('#war-cry-editor').is_hidden();assert '|'not in p.locator('#text-memo').inner_text()
   p.screenshot(path=str(out/f'{w}-rules7-347.png'));p.locator('#quantity-plus').click();plus=common.editor(p,source['cell']);assert plus['composer']['quantity']==before['composer']['quantity']+1 and plus['composer']['degrees']==before['composer']['degrees']and plus['camera']==before['camera']
   row={'viewport':[w,h],'first_verified_world_seconds':first_world_seconds,'startup_and_native_entry_seconds':time.monotonic()-start,'source':source,'before':before,'plus':plus,'war_cry_hidden_under_certified_rules7':True,'copy':[],'errors':errors};report['rows'].append(row);save()
   p.evaluate('''()=>{const original=navigator.clipboard.writeText.bind(navigator.clipboard);navigator.clipboard.writeText=async value=>{await original(value);globalThis.copiedExact=value}}''')
   if p.locator('[data-copy=amount]').is_enabled():
    values={'owner':p.locator('#full-recipient').inner_text(),'amount':p.locator('#transfer-amount').inner_text().removesuffix(' ICP'),'text':p.locator('#text-memo').inner_text()};assert values['owner']=='s5ir5-gqaaa-aaaas-amyna-cai'
    for name,value in values.items():
     p.evaluate('globalThis.copiedExact=null');p.locator(f'[data-copy={name}]').click();p.wait_for_function('v=>globalThis.copiedExact===v',arg=value,timeout=10000);row['copy'].append({'field':name,'exact':value})
   else:row['copy_status']='BLOCKED by actual operational readiness; no override'
   payload=p.evaluate('()=>JSON.stringify({world:__b2zExperience.session.referenceWorld,config:__b2zExperience.session.config,composer:__b2zExperience.composer},(_,v)=>typeof v==="bigint"?{$integer:String(v)}:v)');(out/f'{w}-fire-quote.json').write_text(payload);payment=common.payment(p);payment['payer']=p.locator('#full-payer').inner_text();(out/f'{w}-fire-payment.json').write_text(json.dumps(payment,indent=2)+'\n')
   p.locator('#quantity-minus').click()
   if row['copy']:
    p.wait_for_function('()=>!document.getElementById("replace-choice").hidden');p.locator('#keep-instructions').click();assert int(p.locator('#quantity-count').inner_text())==plus['composer']['quantity']
    p.locator('#quantity-minus').click();p.locator('#replace-instructions').click()
   assert int(p.locator('#quantity-count').inner_text())==before['composer']['quantity'];assert not errors,errors
   p.screenshot(path=str(out/f'{w}-updated.png'));save();p.close();c.close()
  report['status']='PASS';report['browser']=b.version;save()
 finally:b.close();s.shutdown()
