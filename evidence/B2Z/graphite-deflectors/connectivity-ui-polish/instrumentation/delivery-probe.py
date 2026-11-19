"""Actual browser and signed mainnet world. Browser-only read faults; no updates."""
import json,sys,time
from pathlib import Path
from playwright.sync_api import sync_playwright
import live_common as qa
sys.path.insert(0,str(Path('tools').resolve()))
from serve_observer import query_method

url,output=sys.argv[1:]
out=Path(output);out.mkdir(exist_ok=False,parents=True)
report={}
def save():
 (out/'result.json').write_text(json.dumps(report,indent=2)+'\n')
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,chromium_sandbox=True)
 context=browser.new_context(viewport={'width':320,'height':640},has_touch=True)
 errors=[];writes=[]
 def guard(route):
  req=route.request
  if req.method=='POST' and not req.url.split('?')[0].endswith(('/query','/read_state')):
   writes.append('unexpected update');route.abort()
  else:route.continue_()
 context.route('**/*',guard)
 page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
 page.goto(url,wait_until='domcontentloaded')
 source,_=qa.enter_fire(page);qa.heading(page,347.15);qa.settle(page)
 qa.RULES7='1b44508ad27a714b43888e3d0cf84beeb9a2450bb25112bfd3b650b865105c1c'
 qty=qa.editor(page,source['cell'])
 report['pose']={'viewport':qty['viewport'],'quantity':qty['quantity']}
 def state():
  return page.evaluate("""()=>{const e=__b2zExperience,s=e.session;
   return {root:s.root,head:String(s.sequence.last.publication.head.segment_id),status:e.status.kind,
    copy:[...document.querySelectorAll('[data-copy]')].map(n=>n.disabled),
    spinner:!document.querySelector('#motion-wait').hidden,
    panel:document.querySelector('#workspace').getBoundingClientRect().toJSON(),
    camera:[__b2zCamera.x,__b2zCamera.y,__b2zCamera.scale],
    amount:document.querySelector('#transfer-amount').textContent,
    manualDisabled:document.querySelector('#manual-handoff').disabled,
    error:String(s.error??''),outage:s.deliveryDiagnostics.active?.kind,failures:s.retryFailures,
    recoveries:s.deliveryDiagnostics.recoveries};
   }""")
 ready='()=>!document.querySelector("[data-copy=text]").disabled&&__b2zExperience.session.certificateAgeMs+performance.now()-__b2zExperience.session.certifiedAt<14000'
 page.wait_for_function(ready,timeout=50000)
 page.evaluate('window.retained={session:__b2zExperience.session,clock:__b2zExperience.clock,queue:__b2zExperience.queue};')
 identity='retained.session===__b2zExperience.session&&retained.clock===__b2zExperience.clock&&retained.queue===__b2zExperience.queue'
 before=state();page.screenshot(path=str(out/'ready.png'))
 attempts=[]
 def reject_once(route):
  name=query_method(route.request.post_data_buffer or b'')
  if not attempts and name=='observation':
   attempts.append(name);route.fulfill(status=503,body='Controlled single read failure')
  else:route.continue_()
 reads='**/api/v*/canister/*/query'
 page.route(reads,reject_once)
 page.wait_for_function('()=>!!__b2zExperience.session.deliveryDiagnostics.active||__b2zExperience.session.deliveryDiagnostics.recoveries>0',timeout=15000)
 brief=state()
 assert brief['copy']==[False]*3 and not brief['spinner'] and brief['status']!='delivery',brief
 page.wait_for_function('()=>!__b2zExperience.session.deliveryError',timeout=20000)
 page.unroute(reads,reject_once)
 report['single_observation_failure']={'before':before,'brief':brief,'attempts':attempts,'recovered':state()};save()
 calls=[]
 def outage(route):
  calls.append(query_method(route.request.post_data_buffer or b''))
  route.fulfill(status=503,body='Controlled sustained read failure')
 page.route(reads,outage)
 page.wait_for_function('()=>__b2zExperience.status.kind==="delivery"&&document.querySelector("[data-copy=text]").disabled',timeout=20000)
 during=state();assert during['camera']==before['camera'] and during['panel']==before['panel']
 assert during['copy']==[True]*3 and not during['spinner'] and not during['error']
 page.screenshot(path=str(out/'outage.png'))
 page.locator('#recipient-reveal').click()
 assert page.locator('#full-recipient').is_visible()
 page.locator('#recipient-reveal').click()
 page.locator('#quantity-plus').tap()
 page.locator('#war-cry').fill('LOCAL DRAFT')
 memo=page.locator('#text-memo').text_content()
 assert memo.endswith('|LOCAL DRAFT') and state()['copy']==[True]*3
 assert page.evaluate(identity)
 page.unroute(reads,outage)
 page.wait_for_function(ready,timeout=50000)
 after=state()
 assert page.locator('#text-memo').text_content()==memo and after['camera']==before['camera']
 assert page.evaluate(identity) and not after['error']
 report['sustained_failure']={'attempts':len(calls),'during':during,'after':after,'same_session_clock_queue':True,'local_quantity_and_war_cry_preserved':True};save()
 # Controlled persisted lifecycle exercises the recovery fence, without
 # claiming a physical browser BFCache navigation.
 page.evaluate('window.retainedGeneration=__b2zExperience.session.lifecycleGeneration??0;dispatchEvent(new PageTransitionEvent("pagehide",{persisted:true}));dispatchEvent(new PageTransitionEvent("pageshow",{persisted:true}));')
 page.wait_for_function('()=>__b2zExperience.session.lifecycleGeneration>retainedGeneration',timeout=15000)
 page.wait_for_function(ready,timeout=50000)
 assert page.evaluate(identity) and page.locator('#text-memo').text_content()==memo
 assert not errors and not writes,(errors,writes)
 report['status']='PASS';report['persisted_lifecycle']='Controlled PageTransitionEvent, same verified session, clock and queue';report['unexpected_writes']=len(writes);report['browser_errors']=errors;save()
 context.close();browser.close()
