#!/usr/bin/env python3
"""Read-only authenticated candidate on loopback HTTP; actual tab hiding required.
Actual document.hidden is required; controlled hidden-policy tests are separate.
Use --cdp with a dedicated disposable Chromium to avoid Playwright focus emulation.
"""
import argparse,functools,http.server,json,threading,time,sys
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--headed',action='store_true',help='Use a real display for actual tab visibility; never disable throttling');p.add_argument('--cdp',help='Attach to an ordinary local Chromium debugging endpoint without Playwright default overrides');p.add_argument('--assets',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();
if a.cdp and urlparse(a.cdp).hostname not in ('127.0.0.1','localhost','::1'):p.error('--cdp requires a dedicated disposable browser on loopback')
out=a.output.absolute();out.mkdir(parents=True,exist_ok=False)
headers=json.loads((a.assets/'.ic-assets.json5').read_text())[0]['headers']
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def end_headers(self):
  for key,value in headers.items():self.send_header(key,value)
  super().end_headers()
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(a.assets.absolute())));threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as pw:
 b=pw.chromium.connect_over_cdp(a.cdp,no_defaults=True) if a.cdp else pw.chromium.launch(headless=not a.headed,chromium_sandbox=True,ignore_default_args=['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--disable-back-forward-cache']);c=b.contexts[0] if a.cdp else b.new_context(viewport={'width':390,'height':844});browser_cdp=b.new_browser_cdp_session()
 def new_tab():
  if not a.cdp:return c.new_page()
  # Chromium 153's Playwright new_page creates a new window. Use an actual
  # browser tab so the native visibility/suspension assertion remains meaningful.
  with c.expect_page()as created:browser_cdp.send('Target.createTarget',{'url':'about:blank','newWindow':False})
  return created.value
 page=c.pages[0]if a.cdp and c.pages else new_tab();page.set_viewport_size({'width':390,'height':844});requests=[];responses=[];errors=[];wire=[];cdp=c.new_cdp_session(page);cdp.send('Network.enable');cdp.send('Performance.enable');cdp.on('Network.loadingFinished',lambda e:wire.append({'at':time.monotonic(),'bytes':e['encodedDataLength']}))
 page.on('request',lambda r:requests.append({'at':time.monotonic(),'url':r.url,'method':r.method}));page.on('response',lambda r:responses.append(r));page.on('pageerror',lambda e:errors.append(str(e)))
 try:
  response=page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='domcontentloaded');assert all(response.header_value(k)==v for k,v in headers.items());page.wait_for_function('()=>Boolean(globalThis.__b2zExperience?.session?.ready)',timeout=90000)
  assert page.evaluate('__b2zExperience.session.source.owner')=='s5ir5-gqaaa-aaaas-amyna-cai';page.evaluate('window.warmIdentity={session:__b2zExperience.session,clock:__b2zExperience.clock,queue:__b2zExperience.queue,camera:[__b2zCamera.x,__b2zCamera.y,__b2zCamera.scale]};window.lifecycleEvents=[];for(const name of ["freeze","resume","visibilitychange"])document.addEventListener(name,()=>lifecycleEvents.push({name,time:performance.now(),hidden:document.hidden}));')
  before_metrics={r['name']:r['value']for r in cdp.send('Performance.getMetrics')['metrics']};before=page.evaluate('({verified_state_bytes:__b2zExperience.session.previousState?.byteLength,verified_queue_bytes:__b2zExperience.session.bytes,accepted:__b2zExperience.session.accepted,state:__b2zExperience.clock.state(),root:__b2zExperience.session.sequence.last.root_hash,identity:__b2zExperience.session.sequence.last.publication.identity,source:__b2zExperience.session.source,proof:__dtrLive.delivery.acceptedHeads.at(-1),heap:performance.memory?.usedJSHeapSize,status:__b2zExperience.status})');(out/'verified-before.json').write_text(json.dumps(before,indent=2)+'\n');away=new_tab();away.goto('about:blank');away.bring_to_front();actual_hidden=page.evaluate('document.hidden');browser_cdp=b.new_browser_cdp_session();gpu=browser_cdp.send('SystemInfo.getInfo');windows=[browser_cdp.send('Browser.getWindowForTarget',{'targetId':c.new_cdp_session(target).send('Target.getTargetInfo')['targetInfo']['targetId']}) for target in (page,away)];assert windows[0]['windowId']==windows[1]['windowId'];(out/'browser-environment.json').write_text(json.dumps({'browser':b.version,'system':gpu,'windows':windows,'cdp_no_defaults':bool(a.cdp)},indent=2)+'\n');
  if not actual_hidden:
   (out/'results.json').write_text(json.dumps({'status':'BLOCKED','reason':'Browser reports both tabs visible; no real hidden lifecycle can be asserted','verified_before':before,'events':page.evaluate('lifecycleEvents'),'no_throttling_override':True},indent=2)+'\n');sys.exit(2)
  t=time.monotonic();page.wait_for_timeout(35000);sent=time.monotonic();page.bring_to_front();page.wait_for_function('()=>lifecycleEvents.some(e=>e.name==="visibilitychange"&&!e.hidden)');first=time.monotonic();after_metrics={r['name']:r['value']for r in cdp.send('Performance.getMetrics')['metrics']};after=page.evaluate('({verified_state_bytes:__b2zExperience.session.previousState?.byteLength,verified_queue_bytes:__b2zExperience.session.bytes,accepted:__b2zExperience.session.accepted,state:__b2zExperience.clock.state(),sameClock:warmIdentity.clock===__b2zExperience.clock,sameQueue:warmIdentity.queue===__b2zExperience.queue,sameSession:warmIdentity.session===__b2zExperience.session,camera:[__b2zCamera.x,__b2zCamera.y,__b2zCamera.scale],events:lifecycleEvents,heap:performance.memory?.usedJSHeapSize,status:__b2zExperience.status})');assert after['sameClock']and after['sameQueue']and after['sameSession'];assert after['state']['playhead']<=after['state']['available'];(out/'verified-return.json').write_text(json.dumps(after,indent=2)+'\n');page.screenshot(path=str(out/'returned.png'));page.wait_for_function('()=>{const s=__b2zExperience.session;return !s.error&&!s.warmRecovery&&performance.now()-s.operationalAt<15000&&Date.now()-Number(BigInt(s.certificateTimeNs)/1000000n)<30000}',timeout=30000);current=time.monotonic();current_state=page.evaluate('({state:__b2zExperience.clock.state(),status:__b2zExperience.status,root:__b2zExperience.session.sequence.last.root_hash})')
  returns=[]
  for label,seconds,freeze in [('short',3,False),('simulated-suspension',8,True)]:
   away.bring_to_front();assert page.evaluate('document.hidden');started=time.monotonic()
   if freeze:cdp.send('Page.setWebLifecycleState',{'state':'frozen'})
   away.wait_for_timeout(seconds*1000)
   if freeze:cdp.send('Page.setWebLifecycleState',{'state':'active'})
   activated=time.monotonic();page.bring_to_front();page.wait_for_function('()=>!document.hidden')
   retained=page.evaluate('({sameClock:warmIdentity.clock===__b2zExperience.clock,sameQueue:warmIdentity.queue===__b2zExperience.queue,sameSession:warmIdentity.session===__b2zExperience.session,camera:[__b2zCamera.x,__b2zCamera.y,__b2zCamera.scale],state:__b2zExperience.clock.state(),events:lifecycleEvents})')
   assert retained['sameClock']and retained['sameQueue']and retained['sameSession'];assert retained['camera']==page.evaluate('warmIdentity.camera');assert retained['state']['playhead']<=retained['state']['available']
   returns.append({'case':label,'elapsed_hidden_seconds':activated-started,'return_to_visible_observation_ms':(time.monotonic()-activated)*1000,'controlled_suspension':freeze,'retained':retained})
  (out/'repeated-returns.json').write_text(json.dumps(returns,indent=2)+'\n')
  # A second tab uses its own bounded session; no leader election or shared queue.
  other=new_tab();other.goto(f'http://127.0.0.1:{server.server_port}');other.wait_for_function('()=>Boolean(globalThis.__b2zExperience?.session?.ready)',timeout=90000);second=other.evaluate('({ready:__b2zExperience.session.ready,source:__b2zExperience.session.source.owner,visibility:document.visibilityState})');other.close()
  result={'scope':__doc__,'status':'PASS' if page.locator('#render-error').is_hidden() else 'PARTIAL','rendered_arena':page.locator('#render-error').is_hidden(),'graphics_message':page.locator('#render-error').text_content(),'automation_defaults_disabled':bool(a.cdp),'actual_hidden_seconds':sent-t,'return_to_visibility_observation_ms':(first-sent)*1000,'return_to_fresh_current_state_ms':(current-sent)*1000,'fresh_current_state':current_state,'before':before,'after':after,'requests_in_hidden_window':sum(t<r['at']<sent for r in requests),'fetched_encoded_bytes_while_hidden':sum(e['bytes']for e in wire if t<e['at']<sent),'cpu_task_seconds_during_away_and_return':after_metrics.get('TaskDuration',0)-before_metrics.get('TaskDuration',0),'memory_scope':'JS heap plus latest verified state/queued bytes are separate; native/GPU total is not measured','total_requests':len(requests),'query_only':all(r['method']!='POST'or r['url'].endswith(('/query','/read_state'))for r in requests),'repeated_returns':returns,'second_tab':second,'errors':errors,'first_verified_render_submission_ms':page.evaluate('()=>{const s=__b2zExperience.session;return s.firstWarmRenderAt===null?null:s.firstWarmRenderAt-s.returnStartedAt}'), 'first_verified_frame_latency':None,'frame_limit':'Visibility observation and fresh-state timings are not first rendered-frame timings; graphics availability is recorded separately','hidden_executing':'Actual document.hidden verified; no spoofed visibility or disabled throttling'};assert result['query_only'];assert not errors,errors;(out/'results.json').write_text(json.dumps(result,indent=2)+'\n');print(result['status']+' actual hidden observation return',flush=True);
  if result['status']!='PASS':sys.exit(2)
 finally:b.close();server.shutdown()
