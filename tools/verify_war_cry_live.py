#!/usr/bin/env python3
"""Two real browsers of a pinned disposable IC. Native wall-time speech, no injected event/world."""
import argparse,json,socket,subprocess,time,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--configuration',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();c=json.loads(a.configuration.read_text());out=a.output.resolve();out.mkdir(parents=True,exist_ok=False);report={'status':'RUNNING','scope':__doc__}
def save():(out/'results.json').write_text(json.dumps(report,indent=2)+'\n')
with socket.socket()as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
log=(out/'server.log').open('w');server=subprocess.Popen(['python3.11','tools/serve_observer.py','--port',str(port),'--live-config',str(a.configuration.resolve().parent),'--ic-gateway',c['host'],'--live-canister',c['canister_id'],'--proxy-trace',str(out/'proxy.jsonl')],stdout=log,stderr=subprocess.STDOUT);url=f'http://127.0.0.1:{port}/apps/b2z-observer/?mode=live'
with sync_playwright()as pw:
 profile=out/'ordinary-profile';bl=(out/'browser.log').open('w');proc=subprocess.Popen([pw.chromium.executable_path,'--headless=new','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+str(profile),'about:blank'],stdout=bl,stderr=subprocess.STDOUT);browser=None
 try:
  started=time.monotonic()
  while not(profile/'DevToolsActivePort').exists():assert proc.poll()is None and time.monotonic()-started<30;time.sleep(.1)
  browser=pw.chromium.connect_over_cdp('http://127.0.0.1:'+(profile/'DevToolsActivePort').read_text().splitlines()[0],no_defaults=True);contexts=[];pages=[];report['observers']=[];errors=[];forbidden=[]
  for i in range(2):
   ctx=browser.new_context(viewport={'width':390,'height':844},record_video_dir=str(out/f'video-{i}'));contexts.append(ctx);page=ctx.new_page();pages.append(page);page.on('pageerror',lambda e:errors.append(str(e)));page.bring_to_front()
   def guard(route):
    r=route.request
    if r.method=='POST'and not r.url.endswith(('/query','/read_state')):forbidden.append(r.url);route.abort()
    else:route.continue_()
   ctx.route('**/*',guard);page.goto(url,wait_until='domcontentloaded');page.wait_for_function('()=>__b2zExperience?.session?.ready',timeout=60000);assert not page.evaluate('String(__b2zExperience.session.error??"")');assert page.evaluate('__b2zExperience.session.config.rules_version')==10
   page.locator('#join-action').click();page.locator('#sending-account').fill(c['listening_account']);page.locator('#identity-save').click();page.wait_for_function('()=>document.getElementById("workspace").hidden');bubble=page.locator('.speech-bubble').filter(has_text=c['expected_cry']);bubble.wait_for(state='visible',timeout=20000)
   state=page.evaluate('''text=>{const b=[...document.querySelectorAll('.speech-bubble')].find(n=>n.textContent===text),e=__b2zExperience;return{at:Date.now(),born:Number(b.dataset.born),key:b.dataset.event,cannon:Number(b.dataset.cannon),text:b.textContent,head:String(e.session.sequence.last.publication.head.segment_id),identity:e.session.sequence.last.publication.identity,time:e.visibleTime,quantity:e.visible.balls.size,tag:b.firstElementChild.tagName,pointer:getComputedStyle(b).pointerEvents,rect:b.getBoundingClientRect().toJSON(),camera:[__b2zCamera.x,__b2zCamera.y,__b2zCamera.scale]}}''',c['expected_cry']);assert state['text']==c['expected_cry']and state['tag']=='BDI'and state['pointer']=='none';assert state['cannon']==c['expected_cannon'];report['observers'].append(state);page.screenshot(path=str(out/f'observer-{i}-speech.png'));save()
  assert report['observers'][0]['key']==report['observers'][1]['key'];page=pages[0];ctx=contexts[0];page.bring_to_front();control=browser.new_browser_cdp_session();info=ctx.new_cdp_session(page).send('Target.getTargetInfo')['targetInfo'];params={'url':'about:blank','newWindow':False,'browserContextId':info['browserContextId']}
  with ctx.expect_page()as new:control.send('Target.createTarget',params)
  away=new.value;page.bring_to_front();wins=[control.send('Browser.getWindowForTarget',{'targetId':ctx.new_cdp_session(x).send('Target.getTargetInfo')['targetInfo']['targetId']})['windowId']for x in [page,away]];assert wins[0]==wins[1];report['visibility']=[]
  for seconds in [5,35]:
   away.bring_to_front();page.wait_for_function('()=>document.hidden');away.wait_for_timeout(seconds*1000);page.bring_to_front();page.wait_for_function('()=>!document.hidden');page.wait_for_timeout(200);report['visibility'].append({'seconds':seconds,'at':time.time(),'bubble':page.locator('.speech-bubble').filter(has_text=c['expected_cry']).count()});page.screenshot(path=str(out/f'return-{seconds}.png'));save()
  deadline=time.monotonic()+35
  while page.locator('.speech-bubble').filter(has_text=c['expected_cry']).count():
   assert time.monotonic()<deadline;page.wait_for_timeout(300)
  expired=page.evaluate('Date.now()');assert expired-report['observers'][0]['born']>=60000;page.wait_for_timeout(1200);assert page.locator('.speech-bubble').count()==0;report['expiry']={'at':expired,'age_ms':expired-report['observers'][0]['born'],'repeat_render_does_not_restart':True};page.screenshot(path=str(out/'expired.png'));report.update(status='PASS',errors=errors,forbidden=forbidden,browser=browser.version);assert not errors and not forbidden
 except Exception as e:
  report.update(status='FAIL',error=repr(e))
  try:report['diagnostic']=page.evaluate('JSON.stringify({error:String(__b2zExperience?.session?.error),phase:document.body.dataset.phase,details:document.getElementById("observation-error").textContent,bubbles:[...document.querySelectorAll(".speech-bubble")].map(n=>({text:n.textContent,hidden:n.hidden,born:n.dataset.born}))})');page.screenshot(path=str(out/'failure.png'))
  except Exception:pass
  raise
 finally:
  save()
  if browser:
   for ctx in contexts:ctx.close()
   browser.close()
  if proc.poll()is None:proc.terminate()
  proc.wait(timeout=10);server.terminate();server.wait(timeout=10);log.close();bl.close()
