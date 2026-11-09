#!/usr/bin/env python3
"""Read-only authenticated candidate on loopback HTTP; actual tab hiding required.
Headless Chromium keeps both tabs visible: this is suspension evidence, NOT a
claim that an OS-hidden tab ran timers. Controlled hidden policy tests are separate.
"""
import argparse,functools,http.server,json,threading,time,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--headed',action='store_true',help='Use a real display for actual tab visibility; never disable throttling');p.add_argument('--assets',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();out=a.output.absolute();out.mkdir(parents=True,exist_ok=False)
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(a.assets.absolute())));threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=not a.headed,chromium_sandbox=True,ignore_default_args=['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--disable-back-forward-cache']);c=b.new_context(viewport={'width':390,'height':844});page=c.new_page();requests=[];responses=[];errors=[]
 page.on('request',lambda r:requests.append({'at':time.monotonic(),'url':r.url,'method':r.method}));page.on('response',lambda r:responses.append(r));page.on('pageerror',lambda e:errors.append(str(e)))
 try:
  page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='domcontentloaded');page.wait_for_function('()=>Boolean(globalThis.__b2zExperience?.session?.ready)',timeout=90000)
  assert page.evaluate('__b2zExperience.session.source.owner')=='s5ir5-gqaaa-aaaas-amyna-cai';page.evaluate('window.warmIdentity={session:__b2zExperience.session,clock:__b2zExperience.clock,queue:__b2zExperience.queue,camera:[__b2zCamera.x,__b2zCamera.y,__b2zCamera.scale]};window.lifecycleEvents=[];for(const name of ["freeze","resume","visibilitychange"])document.addEventListener(name,()=>lifecycleEvents.push({name,time:performance.now(),hidden:document.hidden}));')
  before=page.evaluate('({state:__b2zExperience.clock.state(),root:__b2zExperience.session.sequence.last.root_hash,identity:__b2zExperience.session.sequence.last.publication.identity,source:__b2zExperience.session.source,proof:__dtrLive.delivery.acceptedHeads.at(-1),heap:performance.memory?.usedJSHeapSize,status:__b2zExperience.status})');(out/'verified-before.json').write_text(json.dumps(before,indent=2)+'\n');away=c.new_page();away.goto('about:blank');away.bring_to_front();actual_hidden=page.evaluate('document.hidden');
  if not actual_hidden:
   (out/'results.json').write_text(json.dumps({'status':'BLOCKED','reason':'Browser reports both tabs visible; no real hidden lifecycle can be asserted','verified_before':before,'events':page.evaluate('lifecycleEvents'),'no_throttling_override':True},indent=2)+'\n');sys.exit(2)
  t=time.monotonic();page.wait_for_timeout(35000);sent=time.monotonic();page.bring_to_front();page.wait_for_function('()=>lifecycleEvents.some(e=>e.name==="visibilitychange"&&!e.hidden)');first=time.monotonic();after=page.evaluate('({state:__b2zExperience.clock.state(),sameClock:warmIdentity.clock===__b2zExperience.clock,sameQueue:warmIdentity.queue===__b2zExperience.queue,sameSession:warmIdentity.session===__b2zExperience.session,camera:[__b2zCamera.x,__b2zCamera.y,__b2zCamera.scale],events:lifecycleEvents,heap:performance.memory?.usedJSHeapSize,status:__b2zExperience.status})');assert after['sameClock']and after['sameQueue']and after['sameSession'];assert after['state']['playhead']<=after['state']['available'];page.screenshot(path=str(out/'returned.png'))
  # A second tab uses its own bounded session; no leader election or shared queue.
  other=c.new_page();other.goto(f'http://127.0.0.1:{server.server_port}');other.wait_for_function('()=>Boolean(globalThis.__b2zExperience?.session?.ready)',timeout=90000);second=other.evaluate('({ready:__b2zExperience.session.ready,source:__b2zExperience.session.source.owner,visibility:document.visibilityState})');other.close()
  result={'scope':__doc__,'status':'PASS','actual_hidden_seconds':sent-t,'return_to_visibility_observation_ms':(first-sent)*1000,'before':before,'after':after,'requests_in_hidden_window':sum(t<r['at']<sent for r in requests),'total_requests':len(requests),'query_only':all(r['method']!='POST'or r['url'].endswith(('/query','/read_state'))for r in requests),'second_tab':second,'errors':errors,'first_verified_frame_latency':'Visibility callback draws retained verified state synchronously; external measured value above includes CDP round trip. No hardware timing guarantee.','hidden_executing':'Actual document.hidden verified; no spoofed visibility or disabled throttling'};assert result['query_only'];assert not errors,errors;(out/'results.json').write_text(json.dumps(result,indent=2)+'\n');print('PASS actual hidden return',flush=True)
 finally:b.close();server.shutdown()
