"""Actual app, pinned disposable IC root, fixed head H; delivery faults are browser-local.
No updates, wallet actions, fabricated certificates or next-state simulation.
"""
import hashlib,json,time
from pathlib import Path
from playwright.sync_api import expect

def verify_certified_lifecycle(page,context,out,configuration,record,report,save):
 def state(p=page):return p.evaluate('''()=>{const e=__b2zExperience,s=e.session;return{head:String(s.sequence.last.publication.head.segment_id),root:s.root,time:e.visibleTime,available:s.clock.available,history:s.startupHistory,ready:s.ready,error:String(s.error??''),retryFailures:s.retryFailures,status:e.status,balls:[...e.visible.balls.values()].map(b=>({id:b.id,x:(Number(b.x0)+b.vx*e.visibleTime)/1024,y:(Number(b.y0)+b.vy*e.visibleTime)/1024})),firstWorldMs:s.firstWorldAt,resources:performance.getEntriesByType('resource').map(r=>({name:r.name.split('/').at(-1),bytes:r.transferSize,durationMs:r.duration}))}}''')
 # Capture from the first visible frame, rather than waiting for an endpoint.
 initial=state();assert initial['history']['outcome']=='interval',initial
 assert initial['balls'];page.wait_for_timeout(150);samples=page.evaluate('coldSamples');assert samples and samples[0]['time']<initial['available'],samples;assert all(r['referenceTime']==initial['available']and r['head']==initial['head']for r in samples),samples;report['cold_frame_samples']=samples
 page.screenshot(path=str(out/'cold-H-playback.png'));start=samples[0]['time'];page.wait_for_function('(t)=>__b2zExperience.visibleTime>t+.05',arg=start,timeout=5000);moving=state();assert moving['head']==initial['head']and moving['root']==initial['root'];assert moving['balls']!=samples[0]['balls'];page.screenshot(path=str(out/'cold-H-moving.png'))
 page.wait_for_function('()=>coldTiming.operatingStateKnownAt>0&&coldTiming.firstMotionFrameAt>0',timeout=15000);report['startup_timings_ms']=page.evaluate('coldTiming');assert report['startup_timings_ms']['currentAuthorityAt']<=report['startup_timings_ms']['firstVerifiedFrameAt']<=report['startup_timings_ms']['firstMotionFrameAt']
 # The live clock object advances each frame, while the HUD snapshot is published
 # at 100ms intervals. Wait for the displayed endpoint too before freezing it.
 page.wait_for_function('()=>{const e=__b2zExperience;return e.clock.playhead===e.clock.available&&e.visibleTime===e.clock.available&&e.session.lastRenderedPlayhead===e.clock.available}',timeout=10000);settled=state();page.wait_for_timeout(600);assert state()['time']==settled['time'];assert state()['head']==initial['head'];report['startup_without_H_plus_1']={'status':'PASS','initial':initial,'moving':moving,'exhausted':settled};record('cold-certified-H-plays-without-another-publication',report['startup_without_H_plus_1'])
 # Native local draft and camera survive every outage in the same session.
 page.locator('#identify-button').click();page.locator('#sending-account').fill(configuration['payer_account']);page.locator('#identity-save').click();page.locator('#close-panel').click();page.locator('#centre-cannon').click();page.wait_for_timeout(700);page.locator('#fire-action').click();page.wait_for_timeout(700)
 page.evaluate('window.retainedIdentity={session:__b2zExperience.session,clock:__b2zExperience.clock,queue:__b2zExperience.queue,camera:[__b2zCamera.x,__b2zCamera.y,__b2zCamera.scale],composer:JSON.stringify(__b2zExperience.composer)}');panel=page.locator('#workspace').bounding_box();rows=[];navigations=[];page.on('framenavigated',lambda f:navigations.append(f.url) if f==page.main_frame else None)
 for seconds,code in [(5,503),(30,429),(90,503),(180,503)]:
  calls=[]
  def fail(route):
   from serve_observer import query_method
   calls.append({'at':time.monotonic(),'url':route.request.url,'method':query_method(route.request.post_data_buffer or b'')});route.fulfill(status=code,content_type='text/plain',body='Temporarily unavailable')
  page.route('**/api/v*/canister/*/query',fail);began=time.monotonic();samples=[]
  while time.monotonic()-began<seconds:
   page.wait_for_timeout(min(1000,max(1,(seconds-(time.monotonic()-began))*1000)));s=state();samples.append({'elapsedSeconds':time.monotonic()-began,'panel':page.locator('#workspace').bounding_box(),'state':s});assert s['error']=='';assert s['time']<=s['available'];assert s['root']==initial['root']
  expect(page.locator('#arena-note')).to_have_text('Reconnecting');assert page.locator('#transfer-controls').evaluate('(n)=>n.disabled');page.screenshot(path=str(out/f'outage-{seconds}s.png'));page.unroute('**/api/v*/canister/*/query',fail)
  # A visible return requests immediate work without replacing the session.
  page.evaluate('document.dispatchEvent(new Event("freeze"));document.dispatchEvent(new Event("resume"))')
  page.wait_for_function('()=>!__b2zExperience.session.deliveryError&&performance.now()-__b2zExperience.session.certifiedAt<5000',timeout=40000)
  assert page.evaluate('retainedIdentity.session===__b2zExperience.session&&retainedIdentity.clock===__b2zExperience.clock&&retainedIdentity.queue===__b2zExperience.queue')
  assert page.evaluate('JSON.stringify([__b2zCamera.x,__b2zCamera.y,__b2zCamera.scale])===JSON.stringify(retainedIdentity.camera)');assert page.evaluate('JSON.stringify(__b2zExperience.composer)===retainedIdentity.composer');assert not navigations;assert state()['time']==settled['time']
  (out/f'outage-{seconds}s-requests.json').write_text(json.dumps(calls,indent=2)+'\n');drift=max(abs(box[k]-panel[k]) for row in samples for box in [row['panel']]for k in ['x','y','width','height']);assert drift<=1,(seconds,drift);assert len(calls)<seconds/2+6,(seconds,len(calls));rows.append({'seconds':seconds,'httpStatus':code,'requests':len(calls),'panelDriftPx':drift,'samples':samples,'recovered':state(),'scope':'Real elapsed delivery fault; freeze/resume is controlled lifecycle, not native tab visibility'});report['recoveries']=rows;save()
 page.screenshot(path=str(out/'recovered.png'))
 # Cold-start outage: the same page recovers, without refresh or a new session.
 cold=context.new_page();held=[];holding=[True]
 def initial_fault(route):
  if holding[0]:held.append(route)
  else:route.fulfill(status=503,body='Unavailable')
 cold.route('**/api/v*/canister/*/query',initial_fault);cold.goto(page.url,wait_until='domcontentloaded');expect(cold.locator('#waiting-label')).to_have_text('Catching up with on-chain activity ...');expect(cold.locator('#motion-wait')).to_be_visible();cold.screenshot(path=str(out/'initial-catch-up-spinner.png'));cold.wait_for_timeout(1000);holding[0]=False
 for route in held:route.fulfill(status=503,body='Unavailable')
 cold.wait_for_timeout(5200);cold.screenshot(path=str(out/'initial-outage.png'));cold.unroute('**/api/v*/canister/*/query');cold.wait_for_function('()=>__b2zExperience?.session?.ready',timeout=45000);report['cold_outage_recovery']=state(cold);cold.close()
 # Slow operational confirmation cannot hold authenticated rendering hostage.
 slow=context.new_page();status_requests=[]
 def hold_status(route):
  if b'lab_status' in (route.request.post_data_buffer or b''):status_requests.append(route)
  else:route.continue_()
 slow.route('**/api/v*/canister/*/query',hold_status);began=time.monotonic();slow.goto(page.url,wait_until='domcontentloaded');slow.wait_for_function('()=>__b2zExperience?.session?.ready',timeout=15000);elapsed=time.monotonic()-began;assert status_requests;assert slow.locator('#transfer-controls').evaluate('(n)=>n.disabled');assert not slow.evaluate('Boolean(__b2zExperience.session.operational)');report['slow_optional_status']={'status':'PASS','worldSeconds':elapsed,'state':state(slow)}
 slow.unroute('**/api/v*/canister/*/query',hold_status)
 # The held request may already be cancelled by the actual SDK deadline.
 # Let that slot settle and require a newly admitted operational observation.
 slow.wait_for_function('()=>Boolean(__b2zExperience.session.operational)',timeout=15000);slow.close()
 # The optional history budget expires before the scene is committed. A late
 # real response is fenced; it can never reset the already visible endpoint.
 for label,delay in [('history-timeout',2500)]:
  fallback=context.new_page();held=[]
  def hold(route):
   if b'retained_publication' in (route.request.post_data_buffer or b''):
    held.append(route);return
   route.continue_()
  fallback.route('**/api/v*/canister/*/query',hold);began=time.monotonic();fallback.goto(page.url,wait_until='domcontentloaded');fallback.wait_for_function('()=>__b2zExperience?.session?.ready',timeout=15000);before=state(fallback);assert before['history']['outcome']=='deadline';assert before['time']==before['available'];fallback.screenshot(path=str(out/'history-fallback.png'))
  for route in held:route.continue_()
  fallback.wait_for_timeout(delay);assert state(fallback)['time']==before['time'];report[label]={'worldSeconds':time.monotonic()-began,'before':before,'after':state(fallback)};fallback.close()
 # Real certificate verification with a deliberately incorrect PUBLIC local
 # root. Removing the faulty transport response cannot clear its trust barrier.
 negative=context.new_page();script=(out/'assets/app.mjs').read_text();root=configuration['root_key_hex'];assert root in script
 import subprocess
 mainnet=subprocess.check_output(['node','--input-type=module','-e',"import {IC_ROOT_KEY} from '@icp-sdk/core/agent';process.stdout.write(IC_ROOT_KEY)"],text=True).strip();damaged=script.replace(root,mainnet);negative.route('**/app.mjs',lambda r:r.fulfill(status=200,content_type='text/javascript',body=damaged));negative.route('**/api/v*/canister/*/query',lambda r:r.fulfill(status=503,body='Unavailable'));negative.goto(page.url,wait_until='domcontentloaded');negative.wait_for_timeout(1800);negative.unroute('**/api/v*/canister/*/query');negative.wait_for_function('()=>__b2zExperience?.status.kind==="verification-error"',timeout=20000);assert negative.locator('#transfer-controls').evaluate('(n)=>n.disabled');negative.screenshot(path=str(out/'integrity-failure.png'));negative.wait_for_timeout(1200);assert negative.evaluate('__b2zExperience.status.kind')=='verification-error';negative.locator('#status-button').click();assert negative.locator('#retry').is_visible();report['wrong_root']={'status':'PASS','error':negative.locator('#observation-error').text_content()};negative.close()
 record('same-session-bounded-automatic-recovery-and-hard-trust-barrier',{'outages':[r['seconds']for r in rows],'panelDriftPx':max(r['panelDriftPx']for r in rows),'noNavigation':not navigations});save()
