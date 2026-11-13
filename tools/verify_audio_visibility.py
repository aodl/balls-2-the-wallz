#!/usr/bin/env python3
"""Ordinary sandboxed Chromium, real same-window tab visibility/freeze/BFCache.
Offline pinned game content only; no IC, physical OS/device or output-route claim.
"""
import argparse,functools,http.server,json,subprocess,threading,time
from pathlib import Path
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--fixture-dir',type=Path,required=True);p.add_argument('--policy-dir',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();out=a.output.absolute();out.mkdir(parents=True,exist_ok=False);policy=json.loads((a.policy_dir/'.ic-assets.json5').read_text())[0]['headers']
class H(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  if self.path=='/away.html':
   body=b'<!doctype html><title>Native tab visibility control</title>';self.send_response(200);self.send_header('Content-Type','text/html');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body);return
  super().do_GET()
 def end_headers(self):
  for k,v in policy.items():self.send_header(k,v)
  super().end_headers()
s=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(H,directory=str(a.fixture_dir.absolute())));threading.Thread(target=s.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{s.server_port}';report={'scope':__doc__,'status':'IN_PROGRESS'}
with sync_playwright()as pw:
 profile=out/'ordinary-profile';command=[pw.chromium.executable_path,'--headless=new','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+str(profile),'about:blank'];log=(out/'browser.log').open('w');proc=subprocess.Popen(command,stdout=log,stderr=subprocess.STDOUT,start_new_session=True);browser=None
 try:
  began=time.monotonic()
  while not(profile/'DevToolsActivePort').exists():
   if proc.poll()is not None or time.monotonic()-began>20:raise RuntimeError('Ordinary sandboxed Chromium unavailable; no policy fallback')
   time.sleep(.1)
  port=(profile/'DevToolsActivePort').read_text().splitlines()[0];browser=pw.chromium.connect_over_cdp('http://127.0.0.1:'+port,no_defaults=True);context=browser.contexts[0];control=browser.new_browser_cdp_session();page=context.pages[0];page.set_viewport_size({'width':390,'height':844});page.add_init_script('''globalThis.audioLifecycleQA=[];for(const name of ['freeze','resume','visibilitychange'])document.addEventListener(name,()=>audioLifecycleQA.push({name,hidden:document.hidden,at:performance.now()}));for(const name of ['pageshow','pagehide'])addEventListener(name,e=>audioLifecycleQA.push({name,persisted:e.persisted,at:performance.now()}));''');page.goto(url+'/?recording=audio-wall');page.wait_for_function('()=>__b2zExperience?.session?.ready',timeout=60000);page.locator('#audio-button').click();page.locator('#audio-music').check();page.locator('#audio-effects').check();page.wait_for_function('()=>__b2zAudio().music?.active&&__b2zAudio().fxBuffers===4',timeout=60000);page.evaluate('globalThis.audioIdentityQA={session:__b2zExperience.session,clock:__b2zExperience.clock,queue:__b2zExperience.queue,marker:crypto.randomUUID()}');before=page.evaluate('__b2zAudio()');cdp=context.new_cdp_session(page)
  with context.expect_page()as created:control.send('Target.createTarget',{'url':url+'/away.html','newWindow':False})
  away=created.value;away.bring_to_front();windows=[control.send('Browser.getWindowForTarget',{'targetId':context.new_cdp_session(n).send('Target.getTargetInfo')['targetInfo']['targetId']})for n in [page,away]];assert windows[0]['windowId']==windows[1]['windowId'];report['windows']=windows
  if not page.evaluate('document.hidden'):
   report.update(status='BLOCKED',reason='Ordinary same-window tabs did not produce actual hidden state');raise RuntimeError(report['reason'])
  page.wait_for_function('()=>__b2zAudio().hidden&&__b2zAudio().contextState==="suspended"',polling=100,timeout=15000);hidden=page.evaluate('__b2zAudio()');assert hidden['activeVoices']==0 and not hidden['music']['active'];cdp.send('Page.setWebLifecycleState',{'state':'frozen'});away.wait_for_timeout(1200);cdp.send('Page.setWebLifecycleState',{'state':'active'});page.bring_to_front();page.wait_for_function('()=>!document.hidden&&!__b2zAudio().hidden',timeout=15000)
  try:page.wait_for_function('()=>__b2zAudio().contextState==="running"&&__b2zAudio().music?.active',timeout=5000);recovery='automatic'
  except Exception:
   assert 'Tap'in page.locator('#audio-status').inner_text();page.locator('#audio-resume').click();page.wait_for_function('()=>__b2zAudio().music?.active',timeout=30000);recovery='required honest browser-permission gesture'
  after=page.evaluate('({audio:__b2zAudio(),events:audioLifecycleQA,sameSession:audioIdentityQA.session===__b2zExperience.session,sameClock:audioIdentityQA.clock===__b2zExperience.clock,sameQueue:audioIdentityQA.queue===__b2zExperience.queue,clock:__b2zExperience.clock.state(),gameError:__b2zTools.state().error})');assert after['sameSession']and after['sameClock']and after['sameQueue'];assert after['clock']['playhead']<=after['clock']['available'];assert after['gameError']is None;assert any(e['name']=='freeze'for e in after['events'])and any(e['name']=='resume'for e in after['events']);report['native_hidden_freeze_return']={'status':'PASS','before':before,'hidden':hidden,'after':after,'recovery':recovery}
  page.locator('#audio-mute').check();marker=page.evaluate('audioIdentityQA.marker');page.goto(url+'/away.html');page.go_back(wait_until='commit');page.wait_for_function('()=>__b2zExperience?.session?.ready',timeout=60000);cached=page.evaluate('audioLifecycleQA.some(e=>e.name==="pageshow"&&e.persisted)');assert page.evaluate('__b2zAudio().settings.mute');assert page.evaluate('__b2zAudio().activeVoices')==0;report['actual_BFCache']={'status':'PASS'if cached else'BLOCKED','restored':cached,'events':page.evaluate('audioLifecycleQA'),'same_marker':page.evaluate('(m)=>globalThis.audioIdentityQA?.marker===m',marker),'notRestoredReasons':page.evaluate('performance.getEntriesByType("navigation")[0]?.notRestoredReasons?.toJSON?.()??null')};assert not cached or report['actual_BFCache']['same_marker'];assert page.locator('#render-error').is_hidden();assert page.evaluate('__b2zTools.state().error')is None;page.screenshot(path=str(out/'native-return.png'));report['status']='PASS';report['browser']=browser.version
 except Exception as e:
  if browser:
   try:report['failure_observation']={'url':page.url,'events':page.evaluate('audioLifecycleQA'),'ready':page.evaluate('__b2zExperience?.session?.ready??false'),'mute':page.evaluate('__b2zAudio?.().settings.mute??null'),'same_marker':page.evaluate('globalThis.audioIdentityQA?.marker??null')}
   except Exception:pass
  if report['status']!='BLOCKED':report.update(status='FAIL',error=str(e))
  raise
 finally:
  (out/'results.json').write_text(json.dumps(report,indent=2)+'\n')
  if browser:browser.close()
  if proc.poll()is None:proc.terminate()
  try:proc.wait(timeout=5)
  except subprocess.TimeoutExpired:proc.kill();proc.wait()
  log.close();s.shutdown()
