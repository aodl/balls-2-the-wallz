import functools,http.server,threading,json,time,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path('.work/quantity-closeout/frozen/frontend').absolute();out=Path('.work/quantity-closeout/frozen-readiness-settled');out.mkdir(exist_ok=False);policy=json.loads((root/'.ic-assets.json5').read_text());rows=[];net=[]
class H(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
 def do_GET(self):
  if self.path.startswith('/.'):self.send_error(404);return
  super().do_GET()
 def guess_type(self,p):return 'audio/flac'if p.endswith('.flac')else 'application/javascript'if p.endswith('.mjs')else super().guess_type(p)
 def end_headers(self):
  for k,v in policy[0]['headers'].items():self.send_header(k,v)
  self.send_header('Cache-Control','no-cache');super().end_headers()
s=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(H,directory=str(root)));threading.Thread(target=s.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{s.server_port}'
with sync_playwright()as pw:
 b=pw.chromium.launch(headless=True,chromium_sandbox=True)
 try:
  for w,h in [(320,640)]:
   c=b.new_context(viewport={'width':w,'height':h},has_touch=w<700,permissions=['clipboard-write'],record_video_dir=str(out/f'video-{w}'));c.add_init_script("globalThis.copyAudit=[];const write=navigator.clipboard.writeText.bind(navigator.clipboard);navigator.clipboard.writeText=async v=>{await write(v);copyAudit.push(v)}");p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
   def guard(route):
    r=route.request
    if 'icp-api.io' in r.url:
     net.append({'method':r.method,'url':r.url,'at':time.time()})
     if r.method not in ['GET','OPTIONS']and not(r.method=='POST'and(r.url.endswith('/query')or r.url.endswith('/read_state'))):route.abort();raise AssertionError('Non-read-only request blocked')
    route.continue_()
   p.route('**/*',guard);start=time.monotonic();p.goto(base,wait_until='domcontentloaded');p.wait_for_function('()=>globalThis.__b2zExperience?.session?.ready',timeout=90000);ready=time.monotonic()-start
   account=p.evaluate('__b2zExperience.session.referenceWorld.cannons[0].account');p.locator('#join-action').click();p.locator('#sending-account').fill(account);p.locator('#identity-save').click();p.wait_for_function('()=>document.getElementById("workspace").hidden');p.wait_for_timeout(600);assert p.locator('#prepared-card').is_hidden();p.locator('#centre-cannon').click();p.wait_for_timeout(600)
   if p.locator('#own-cannons button').first.is_visible():p.locator('#own-cannons button').first.click();p.wait_for_timeout(500)
   if p.locator('#focus-cannon').is_enabled():p.locator('#focus-cannon').click();p.wait_for_timeout(600)
   p.locator('#fire-action').click();p.wait_for_timeout(800);p.locator('#aim-handle').focus()
   for _ in range(36):p.keyboard.press('Shift+ArrowRight')
   p.wait_for_timeout(1000)
   def state():return p.evaluate('''()=>{const n=document.getElementById('quantity-controls'),r=n.getBoundingClientRect(),s=__b2zExperience.session;return{heading:__b2zExperience.composer.degrees,quantity:__b2zExperience.composer.quantity,hidden:n.hidden,rect:r.toJSON(),camera:[__b2zCamera.x,__b2zCamera.y,__b2zCamera.scale],panel:document.getElementById('workspace').getBoundingClientRect().toJSON(),scroll:document.querySelector('.panel-scroll').getBoundingClientRect().toJSON(),targets:[...n.querySelectorAll('button')].map(b=>{const q=b.getBoundingClientRect();return{id:b.id,rect:q.toJSON(),hit:document.elementFromPoint(q.x+22,q.y+22)===b}}),rules:s.sequence.last?.publication?.identity?.rules_hash??s.sequence.last?.identity?.rules_hash,head:String(s.sequence.last?.publication?.head?.segment_id??s.sequence.last?.head?.segment_id),ready:s.ready,error:String(s.error??''),canPrepare:__b2zExperience.status.canPrepare,status:__b2zExperience.status.label,memo:document.getElementById('text-memo').textContent,copyDisabled:document.getElementById('transfer-controls').disabled}}''')
   readiness=[]
   for i in range(16):
    readiness.append(p.evaluate('''()=>{const e=__b2zExperience,s=e.session,now=performance.now();return{at:new Date().toISOString(),status:e.status,operationalAgeMs:now-s.operationalAt,operational:s.operational,lastObserved:s.lastObservedAt,observedAt:s.observedAt,deliveryError:String(s.deliveryError??''),error:String(s.error??'')}}'''))
    if readiness[-1]['status']['canPrepare']:break
    p.wait_for_timeout(2000)
   copies=[]
   if readiness[-1]['status']['canPrepare']:
    for kind in ['owner','amount','text']:
     p.locator('[data-copy='+kind+']').click();p.wait_for_timeout(100)
    copies=p.evaluate('copyAudit');assert copies[0]=='s5ir5-gqaaa-aaaas-amyna-cai'and copies[1]=='0.1'and copies[2]=='FIRE 1 217.5 1',copies
   (out/'readiness.json').write_text(json.dumps({'readiness':readiness,'copies':copies,'scope':'Read-only mainnet, no status override; actual successful Clipboard API writes only, no payment'},indent=2)+'\n')
   before=state();assert before['ready']and not before['error']and not before['hidden']and all(t['hit']for t in before['targets']),before;assert before['rules']=='982a6f78d3187d62e9a79240407cdeffa2fc830d4c385aaeffb1d507a2d9d82f';p.screenshot(path=str(out/f'{w}-347.png'))
   p.locator('#quantity-plus').click();assert p.locator('#quantity-count').text_content()==str(before['quantity']+1);p.wait_for_function('(n)=>__b2zExperience.composer.quantity===n',arg=before['quantity']+1);after=state();assert after['quantity']==before['quantity']+1 and after['heading']==before['heading']and after['camera']==before['camera'],(before,after);
   if p.locator('#replace-choice').is_visible():p.locator('#keep-instructions').click()
   else:p.locator('#quantity-minus').click()
   p.wait_for_function('(n)=>__b2zExperience.composer.quantity===n',arg=before['quantity']);assert p.locator('#quantity-count').text_content()==str(before['quantity']);assert state()['quantity']==before['quantity'];assert not errors,errors
   row={'viewport':[w,h],'first_verified_world_s':ready,'before':before,'after_plus':after,'errors':errors,'scope':'Exact frozen local HTTP assets with unchanged policy; actual mainnet authenticated Rules7; no status override, production deployment or payment'};rows.append(row);(out/'results.json').write_text(json.dumps({'status':'RUNNING','rows':rows,'network':net},indent=2)+'\n');p.close();c.close()
  (out/'results.json').write_text(json.dumps({'status':'PASS','rows':rows,'network':net},indent=2)+'\n')
 finally:b.close();s.shutdown()
