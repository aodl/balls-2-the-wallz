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
  port=(profile/'DevToolsActivePort').read_text().splitlines()[0];browser=pw.chromium.connect_over_cdp('http://127.0.0.1:'+port,no_defaults=True);context=browser.contexts[0];control=browser.new_browser_cdp_session();page=context.pages[0];page.set_viewport_size({'width':390,'height':844})
  page.add_init_script(path=str(Path(__file__).parent/'fixtures/audio-output-tap.js'));page.add_init_script('globalThis.audioLifecycleQA=[];for(const name of ["freeze","resume","visibilitychange"])document.addEventListener(name,()=>audioLifecycleQA.push({name,hidden:document.hidden,at:performance.now()}));for(const name of ["pageshow","pagehide"])addEventListener(name,e=>audioLifecycleQA.push({name,persisted:e.persisted,at:performance.now()}));')
  page.goto(url+'/?recording=audio-wall');page.wait_for_function('()=>__b2zExperience?.session?.ready',timeout=60000);page.locator('#board').click(position={'x':160,'y':180});page.wait_for_function('()=>__b2zAudio().music?.active&&__b2zAudio().fxBuffers===7',timeout=60000)
  page.wait_for_function('()=>outputQA.rows.slice(-5).some(r=>r.rms>.001)',timeout=15000)
  page.evaluate('globalThis.audioIdentityQA={session:__b2zExperience.session,clock:__b2zExperience.clock,queue:__b2zExperience.queue,marker:crypto.randomUUID()}');cdp=context.new_cdp_session(page)
  with context.expect_page()as created:control.send('Target.createTarget',{'url':url+'/away.html','newWindow':False})
  away=created.value;page.bring_to_front();windows=[control.send('Browser.getWindowForTarget',{'targetId':context.new_cdp_session(n).send('Target.getTargetInfo')['targetInfo']['targetId']})for n in [page,away]];assert windows[0]['windowId']==windows[1]['windowId'];report['windows']=windows
  report['cycles']=[]
  for duration in [5,35,8]:
   page.wait_for_timeout(2200);before=page.evaluate('__b2zAudio()');away.bring_to_front();page.wait_for_function('()=>document.hidden&&__b2zAudio().hidden&&__b2zAudio().contextState==="suspended"',polling=100,timeout=15000);hidden=page.evaluate('__b2zAudio()');assert not hidden['music']['active']and hidden['activeVoices']==0
   if duration==8:cdp.send('Page.setWebLifecycleState',{'state':'frozen'})
   away.wait_for_timeout(duration*1000)
   if duration==8:cdp.send('Page.setWebLifecycleState',{'state':'active'})
   start=time.monotonic();page.bring_to_front();page.wait_for_function('()=>!document.hidden&&__b2zAudio().music.active&&outputQA.rows.some(r=>!r.hidden&&r.rms>.001&&r.at>performance.now()-250)',timeout=15000)
   after=page.evaluate('({audio:__b2zAudio(),events:audioLifecycleQA,sameSession:audioIdentityQA.session===__b2zExperience.session,sameClock:audioIdentityQA.clock===__b2zExperience.clock,sameQueue:audioIdentityQA.queue===__b2zExperience.queue,clock:__b2zExperience.clock.state(),gameError:__b2zTools.state().error})')
   assert after['sameSession']and after['sameClock']and after['sameQueue']and after['gameError']is None;assert after['clock']['playhead']<=after['clock']['available'];assert abs(after['audio']['music']['phase']-hidden['music']['phase'])<3*48000;assert after['audio']['music']['queuedNodes']<=2
   report['cycles'].append({'status':'PASS native output-stream energy, not physical listening','hidden_seconds':duration,'resumed_ms':(time.monotonic()-start)*1000,'before':before,'hidden':hidden,'after':after})
  # A second actual game tab takes ownership deliberately; hidden predecessor
  # yields and reclaims on visible return without a toggle or duplicated loop.
  other=context.new_page();other.goto(url+'/?recording=audio-wall');other.wait_for_function('()=>__b2zExperience?.session?.ready',timeout=60000);other.locator('#board').click(position={'x':160,'y':180});other.wait_for_function('()=>__b2zAudio().music?.active',timeout=60000);page.wait_for_function('()=>!__b2zAudio().music.active',timeout=15000);page.bring_to_front();page.wait_for_function('()=>__b2zAudio().music.active',timeout=15000);other.wait_for_function('()=>!__b2zAudio().music.active',timeout=15000);report['two_native_tabs']='PASS visible return automatically reclaims from hidden predecessor'
  # Exhaust real music transport attempts in an isolated cache, then recover
  # by genuine visibility return. FX/game keep working independently.
  page.evaluate('async()=>{for(const name of await caches.keys())if(name.startsWith("b2z-audio-")){const cache=await caches.open(name);for(const r of await cache.keys())if(new URL(r.url).pathname.includes("/music/"))await cache.delete(r)}}');bad=context.new_page();bad.add_init_script(path=str(Path(__file__).parent/'fixtures/audio-output-tap.js'))
  def unavailable(route):route.abort('internetdisconnected')
  bad.route('**/audio/b2z-v1/music/*.flac',unavailable);bad.goto(url+'/?recording=audio-wall');bad.bring_to_front();bad.wait_for_function('()=>__b2zExperience?.session?.ready',timeout=60000);bad.locator('#board').click(position={'x':160,'y':180});bad.wait_for_function('()=>__b2zAudio().lastError.length>0&&__b2zAudio().fxBuffers===7&&!__b2zAudio().music.active',timeout=60000)
  failed=bad.evaluate('__b2zAudio()');assert failed['settings']['enabled'];assert bad.evaluate('__b2zTools.state().error')is None;bad.unroute('**/audio/b2z-v1/music/*.flac',unavailable)
  away.bring_to_front();bad.wait_for_function('()=>document.hidden&&__b2zAudio().hidden',timeout=15000);away.wait_for_timeout(1200);start=time.monotonic();bad.bring_to_front();bad.wait_for_function('()=>__b2zAudio().music.active&&outputQA.rows.some(r=>r.rms>.001&&r.at>performance.now()-250)',timeout=30000)
  report['exhausted_delivery_recovery']={'status':'PASS actual native decoder/output stream after genuine hidden return; no toggle','failed':failed,'after':bad.evaluate('__b2zAudio()'),'resumed_ms':(time.monotonic()-start)*1000};assert bad.evaluate('__b2zTools.state().error')is None;bad.close();page.bring_to_front();page.wait_for_function('()=>__b2zAudio().music.active',timeout=15000)
  report['output_energy']=page.evaluate('outputQA.rows');import base64
  for i,data in enumerate(page.evaluate('outputQA.capture()')):(out/f'native-output-{i}.webm').write_bytes(base64.b64decode(data))
  page.locator('#audio-button').click();assert not page.evaluate('__b2zAudio().settings.enabled');away.bring_to_front();away.wait_for_timeout(1100);page.bring_to_front();page.wait_for_timeout(500);assert not page.evaluate('__b2zAudio().settings.enabled');assert not page.evaluate('__b2zAudio().music.active');report['muted_return']='PASS'
  page.goto(url+'/away.html');page.go_back(wait_until='commit');page.wait_for_function('()=>__b2zExperience?.session?.ready',timeout=60000);cached=page.evaluate('audioLifecycleQA.some(e=>e.name==="pageshow"&&e.persisted)');assert not page.evaluate('__b2zAudio().settings.enabled');report['actual_BFCache']={'status':'PASS'if cached else'BLOCKED','restored':cached,'events':page.evaluate('audioLifecycleQA'),'notRestoredReasons':page.evaluate('performance.getEntriesByType("navigation")[0]?.notRestoredReasons?.toJSON?.()??null')}
  page.screenshot(path=str(out/'native-return.png'));report['status']='PASS';report['browser']=browser.version

 except Exception as e:
  if browser:
   try:report['failure_observation']={'url':page.url,'events':page.evaluate('audioLifecycleQA'),'ready':page.evaluate('__b2zExperience?.session?.ready??false'),'enabled':page.evaluate('__b2zAudio?.().settings.enabled??null'),'same_marker':page.evaluate('globalThis.audioIdentityQA?.marker??null')}
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
