#!/usr/bin/env python3
"""Two real browsers of a pinned disposable IC. Native wall-time speech, no injected event/world."""
import argparse,json,socket,subprocess,time,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--configuration',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();c=json.loads(a.configuration.read_text());out=a.output.resolve();out.mkdir(parents=True,exist_ok=False);report={'status':'RUNNING','scope':__doc__}
def save():(out/'results.json').write_text(json.dumps(report,indent=2)+'\n')
with socket.socket()as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
local={**c,'host':f'http://127.0.0.1:{port}'};(out/'local-policy.json').write_text(json.dumps(local)+'\n');subprocess.run(['node','tools/build_observer_playability.mjs','--local-test-config',str(out/'local-policy.json'),'--output',str(out/'assets')],check=True);manifest=json.loads((out/'assets/build-manifest.json').read_text());assert manifest['local_test_only']and manifest['deployment']==local
log=(out/'server.log').open('w');server=subprocess.Popen(['python3.11','tools/serve_observer.py','--port',str(port),'--deployment-assets',str(out/'assets'),'--live-config',str(a.configuration.resolve().parent),'--ic-gateway',c['host'],'--live-canister',c['canister_id'],'--proxy-trace',str(out/'proxy.jsonl')],stdout=log,stderr=subprocess.STDOUT);url=f'http://127.0.0.1:{port}/'
with sync_playwright()as pw:
 profile=out/'ordinary-profile';bl=(out/'browser.log').open('w');proc=subprocess.Popen([pw.chromium.executable_path,'--headless=new','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+str(profile),'about:blank'],stdout=bl,stderr=subprocess.STDOUT);browser=None
 try:
  started=time.monotonic()
  while not(profile/'DevToolsActivePort').exists():assert proc.poll()is None and time.monotonic()-started<30;time.sleep(.1)
  browser=pw.chromium.connect_over_cdp('http://127.0.0.1:'+(profile/'DevToolsActivePort').read_text().splitlines()[0],no_defaults=True);contexts=[];pages=[];report['observers']=[];errors=[];forbidden=[]
  for i in range(2):
   ctx=browser.contexts[0]if i==0 else browser.new_context(viewport={'width':390,'height':844},record_video_dir=str(out/f'video-{i}'));contexts.append(ctx);page=ctx.pages[0]if i==0 else ctx.new_page();page.set_viewport_size({'width':390,'height':844});pages.append(page);page.on('pageerror',lambda e:errors.append(str(e)));page.bring_to_front()
   def guard(route):
    r=route.request
    if r.method=='POST'and not r.url.endswith(('/query','/read_state')):forbidden.append(r.url);route.abort()
    else:route.continue_()
   ctx.route('**/*',guard);page.goto(url,wait_until='domcontentloaded');page.wait_for_function('()=>globalThis.__b2zExperience?.session?.ready',timeout=60000);assert not page.evaluate('String(__b2zExperience.session.error??"")');assert page.evaluate('__b2zExperience.session.config.rules_version')==10
   page.locator('#join-action').click();page.locator('#sending-account').fill(c['listening_account']);page.locator('#identity-save').click();page.wait_for_function('()=>document.getElementById("workspace").hidden');bubble=page.locator('.speech-bubble').filter(has_text=c['expected_cry']);bubble.wait_for(state='visible',timeout=20000)
   state=page.evaluate('''text=>{const b=[...document.querySelectorAll('.speech-bubble')].find(n=>n.textContent===text),e=__b2zExperience;return{at:Date.now(),born:Number(b.dataset.born),key:b.dataset.event,cannon:Number(b.dataset.cannon),text:b.textContent,head:String(e.session.sequence.last.publication.head.segment_id),identity:e.session.sequence.last.publication.identity,time:e.visibleTime,quantity:e.visible.balls.size,tag:b.firstElementChild.tagName,pointer:getComputedStyle(b).pointerEvents,rect:b.getBoundingClientRect().toJSON(),camera:[__b2zCamera.x,__b2zCamera.y,__b2zCamera.scale]}}''',c['expected_cry']);assert state['text']==c['expected_cry']and state['tag']=='BDI'and state['pointer']=='none';assert state['cannon']==c['expected_cannon'];report['observers'].append(state)
   if i==1:
    # The other observer's real-tab journey/screenshots can cross this five-second
    # window on a busy host. Record actual output concurrently, without changing
    # DOM, visibility, clocks, playback or the application's timer.
    page.evaluate('''({text,born})=>{globalThis.speechLifetimeProbe={samples:[],expired:null};const timer=setInterval(()=>{const age=Date.now()-born,b=[...document.querySelectorAll('.speech-bubble')].find(n=>n.textContent===text);if(age>=55000&&age<60000&&b&&speechLifetimeProbe.samples.length<32)speechLifetimeProbe.samples.push({age_ms:age,opacity:Number(getComputedStyle(b).opacity),visibility:document.visibilityState});if(!b&&!speechLifetimeProbe.expired)speechLifetimeProbe.expired={at:Date.now(),age_ms:age};if(age>61500)clearInterval(timer);},200)}''',{'text':c['expected_cry'],'born':state['born']})
   page.screenshot(path=str(out/f'observer-{i}-speech.png'));save()
  assert report['observers'][0]['key']==report['observers'][1]['key'];page=pages[0];ctx=contexts[0];page.bring_to_front();control=browser.new_browser_cdp_session();info=ctx.new_cdp_session(page).send('Target.getTargetInfo')['targetInfo'];params={'url':'about:blank','newWindow':False}
  with ctx.expect_page()as new:control.send('Target.createTarget',params)
  away=new.value;page.bring_to_front();wins=[control.send('Browser.getWindowForTarget',{'targetId':ctx.new_cdp_session(x).send('Target.getTargetInfo')['targetInfo']['targetId']})['windowId']for x in [page,away]];assert wins[0]==wins[1];report['visibility_context']='Ordinary default context; no Playwright focus emulation';report['visibility']=[]
  for seconds in [5,35]:
   away.bring_to_front();page.wait_for_function('()=>document.hidden',polling=100);away.wait_for_timeout(seconds*1000);page.bring_to_front();page.wait_for_function('()=>!document.hidden',polling=100);page.wait_for_timeout(200);report['visibility'].append({'seconds':seconds,'at':time.time(),'bubble':page.locator('.speech-bubble').filter(has_text=c['expected_cry']).count()});page.screenshot(path=str(out/f'return-{seconds}.png'));save()
  # Observe the later observer's own 55+5s clock; initial authentication/navigation
  # time in the other observer must not erase the fade sampling window.
  page=pages[-1];page.bring_to_front();born=report['observers'][-1]['born'];deadline=time.monotonic()+65
  while page.locator('.speech-bubble').filter(has_text=c['expected_cry']).count():
   assert time.monotonic()<deadline
   age=page.evaluate('Date.now()')-born
   if 55500<=age<59000 and 'fade'not in report:
    opacity=float(page.locator('.speech-bubble').filter(has_text=c['expected_cry']).evaluate('(n)=>getComputedStyle(n).opacity'));assert 0<opacity<1;report['fade']={'age_ms':age,'opacity':opacity};page.screenshot(path=str(out/'fading.png'));save()
   page.wait_for_timeout(300)
  probe=page.evaluate('globalThis.speechLifetimeProbe');report['native_lifetime_probe']=probe
  if 'fade'not in report:
   observed=next((x for x in probe['samples']if 55000<=x['age_ms']<60000 and 0<x['opacity']<1),None)
   if observed:report['fade']={**observed,'scope':'Passive native DOM/computed output captured concurrently with the other observer real-tab journey'}
  assert 'fade'in report
  expired=probe['expired']['at']if probe['expired']else page.evaluate('Date.now()');assert expired-born>=60000;page.wait_for_timeout(1200);assert page.locator('.speech-bubble').count()==0;report['expiry']={'at':expired,'age_ms':expired-born,'repeat_render_does_not_restart':True};page.screenshot(path=str(out/'expired.png'));pages[0].bring_to_front();pages[0].wait_for_timeout(300);assert pages[0].locator('.speech-bubble').count()==0;report['first_hidden_age_expiry']='PASS first observer also expired without replay';report.update(status='PASS',errors=errors,forbidden=forbidden,browser=browser.version);assert not errors and not forbidden
 except Exception as e:
  report.update(status='FAIL',error=repr(e),errors=errors,forbidden=forbidden)
  try:report['diagnostic']=page.evaluate('JSON.stringify({error:String(globalThis.__b2zExperience?.session?.error),phase:document.body.dataset.phase,details:document.getElementById("render-error")?.textContent,bubbles:[...document.querySelectorAll(".speech-bubble")].map(n=>({text:n.textContent,hidden:n.hidden,born:n.dataset.born}))})');page.screenshot(path=str(out/'failure.png'))
  except Exception:pass
  raise
 finally:
  save()
  if browser:
   for ctx in contexts[1:]:ctx.close()
   browser.close()
  if proc.poll()is None:proc.terminate()
  proc.wait(timeout=10);server.terminate();server.wait(timeout=10);log.close();bl.close()
