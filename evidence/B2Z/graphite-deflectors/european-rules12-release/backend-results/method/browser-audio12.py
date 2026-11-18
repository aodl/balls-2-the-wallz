import base64,json,subprocess,time
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path('.work/european-rules12-release');out=root/'resume-1542'/'audio12';out.mkdir(exist_ok=False);url='https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/';report={'status':'RUNNING','scope':'Actual deployed European game; ordinary raw sandboxed Chromium, actual native decoded/output stream; no autoplay/throttling flags. No physical-output/listening claim.'}
def save():(out/'results.json').write_text(json.dumps(report,indent=2)+'\n')
def snap(page):return page.evaluate('''()=>JSON.parse(JSON.stringify({audio:__b2zAudio(),head:__b2zExperience.session.sequence.last.publication.head,identity:__b2zExperience.session.sequence.last.publication.identity,time:__b2zExperience.visibleTime,available:__b2zExperience.clock.available,error:String(__b2zExperience.session.error??''),hidden:document.hidden},(_,v)=>typeof v==='bigint'?String(v):v))''')
def energy(page):page.wait_for_function('()=>outputQA.rows.some(r=>!r.hidden&&r.rms>.001&&r.at>performance.now()-250)',timeout=20000)
with sync_playwright()as pw:
 profile=out/'ordinary-profile';log=(out/'browser.log').open('w');proc=subprocess.Popen([pw.chromium.executable_path,'--headless=new','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+str(profile.resolve()),'about:blank'],stdout=log,stderr=subprocess.STDOUT,start_new_session=True);browser=None
 try:
  began=time.monotonic()
  while not(profile/'DevToolsActivePort').exists():
   assert proc.poll()is None and time.monotonic()-began<30;time.sleep(.1)
  port=(profile/'DevToolsActivePort').read_text().splitlines()[0];browser=pw.chromium.connect_over_cdp('http://127.0.0.1:'+port,no_defaults=True);ctx=browser.contexts[0];page=ctx.pages[0];page.set_viewport_size({'width':1440,'height':900});page.add_init_script(path='tools/fixtures/audio-output-tap.js');errors=[];forbidden=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  def guard(route):
   r=route.request
   if r.method=='POST' and not r.url.endswith(('/query','/read_state')):forbidden.append(r.url);route.abort()
   else:route.continue_()
  ctx.route('**/*',guard)
  page.goto(url,wait_until='domcontentloaded');page.wait_for_function('()=>__b2zExperience?.session?.ready',timeout=90000);initial=snap(page);assert initial['audio']['settings']['enabled'];assert not initial['error'];assert page.locator('#audio-music,#audio-effects,#audio-popover,input[type=range]').count()==0;report['fresh_intent']=initial;page.screenshot(path=str(out/'fresh-enabled.png'))
  # First sound-icon gesture unlocks blocked enabled intent, or mutes if already usable.
  page.locator('#audio-button').click();expected=not initial['audio']['usable'];assert page.evaluate('__b2zAudio().settings.enabled')==expected
  if not expected:page.locator('#audio-button').click()
  page.wait_for_function('()=>__b2zAudio().music?.active&&__b2zAudio().fxBuffers===7',timeout=90000);energy(page);report['first_sound_button']={'status':'PASS','before':initial['audio'],'after':snap(page)}
  page.evaluate('globalThis.liveIdentity={session:__b2zExperience.session,clock:__b2zExperience.clock,queue:__b2zExperience.queue}')
  control=browser.new_browser_cdp_session()
  with ctx.expect_page()as created:control.send('Target.createTarget',{'url':'about:blank','newWindow':False})
  away=created.value;page.bring_to_front();wins=[control.send('Browser.getWindowForTarget',{'targetId':ctx.new_cdp_session(p).send('Target.getTargetInfo')['targetInfo']['targetId']})for p in [page,away]];assert wins[0]['windowId']==wins[1]['windowId'];report['windows']=wins;report['cycles']=[]
  for seconds in [5,35,8]:
   page.wait_for_timeout(1500);before=snap(page);away.bring_to_front();page.wait_for_function('()=>document.hidden&&__b2zAudio().hidden&&!__b2zAudio().music.active',timeout=15000);hidden=snap(page);away.wait_for_timeout(seconds*1000);t=time.monotonic();page.bring_to_front();page.wait_for_function('()=>!document.hidden&&__b2zAudio().music.active',timeout=15000);energy(page);after=snap(page);same=page.evaluate('liveIdentity.session===__b2zExperience.session&&liveIdentity.clock===__b2zExperience.clock&&liveIdentity.queue===__b2zExperience.queue');assert same and not after['error'];assert after['audio']['music']['queuedNodes']<=2;assert 0<=after['audio']['music']['phase']-hidden['audio']['music']['phase']<4*48000
   report['cycles'].append({'seconds':seconds,'resumed_ms':(time.monotonic()-t)*1000,'before':before,'hidden':hidden,'after':after,'same_verified_objects':same});save()
  # Genuine second B2Z tab with same origin; hidden predecessor yields, returning tab reclaims.
  other=ctx.new_page();other.goto(url,wait_until='domcontentloaded');other.wait_for_function('()=>__b2zExperience?.session?.ready',timeout=90000);other.locator('#status-button').click();other.wait_for_function('()=>__b2zAudio().music?.active',timeout=60000);page.wait_for_function('()=>!__b2zAudio().music.active',timeout=15000);page.bring_to_front();page.wait_for_function('()=>__b2zAudio().music.active',timeout=15000);energy(page);other.wait_for_function('()=>!__b2zAudio().music.active',timeout=15000);report['two_tabs']='PASS deliberate activation/hidden yield/automatic visible reclaim';other.close();page.bring_to_front()
  # Intercept only optional audio in an isolated browser context, leaving real game verification healthy.
  isolated=browser.new_context(viewport={'width':390,'height':844});isolated.route('**/*',guard);bad=isolated.new_page();bad.add_init_script(path='tools/fixtures/audio-output-tap.js')
  def unavailable(route):route.abort('internetdisconnected')
  bad.route('**/audio/b2z-v1/music/*.flac',unavailable);bad.goto(url,wait_until='domcontentloaded');bad.wait_for_function('()=>__b2zExperience?.session?.ready',timeout=90000);bad.locator('#status-button').click();bad.wait_for_function('()=>__b2zAudio().lastError.length>0&&__b2zAudio().fxBuffers===7&&!__b2zAudio().music.active',timeout=90000);failed=snap(bad);assert not failed['error'];bad.unroute('**/audio/b2z-v1/music/*.flac',unavailable)
  # A normal fresh trusted game gesture is a permitted recovery trigger. Actual native tab-return recovery is proven above.
  bad.locator('#close-panel').click();bad.wait_for_function('()=>__b2zAudio().music.active',timeout=60000);energy(bad);report['audio_failure_recovery']={'status':'PASS browser-only optional music transport fault, ordinary gesture recovery; not a subnet outage','failed':failed,'after':snap(bad)};isolated.close();page.bring_to_front();page.wait_for_function('()=>__b2zAudio().music.active',timeout=15000);energy(page)
  page.screenshot(path=str(out/'music-resumed.png'));captures=page.evaluate('outputQA.capture()')
  for i,b in enumerate(captures):(out/f'production-music-return-{i}.webm').write_bytes(base64.b64decode(b))
  report['native_output_rows']=page.evaluate('outputQA.rows');report['final_enabled']=snap(page);page.locator('#audio-button').click();assert not page.evaluate('__b2zAudio().settings.enabled');page.wait_for_function('()=>!__b2zAudio().music.active&&__b2zAudio().activeVoices===0');page.reload(wait_until='domcontentloaded');page.wait_for_function('()=>__b2zExperience?.session?.ready',timeout=90000);page.locator('#status-button').click();assert not page.evaluate('__b2zAudio().settings.enabled');page.wait_for_timeout(600);assert not page.evaluate('__b2zAudio().music?.active??false');report['saved_mute']='PASS reload and unrelated game gesture preserve explicit mute';page.screenshot(path=str(out/'saved-mute.png'))
  report.update(status='PASS',browser=browser.version,errors=errors,forbidden_posts=forbidden);assert not errors and not forbidden
 except Exception as e:
  report.update(status='FAIL',error=repr(e),errors=errors,forbidden_posts=forbidden)
  try:report['failure_state']=snap(page);page.screenshot(path=str(out/'failure.png'))
  except Exception:pass
  raise
 finally:
  save()
  if browser:browser.close()
  if proc.poll()is None:proc.terminate()
  try:proc.wait(timeout=5)
  except subprocess.TimeoutExpired:proc.kill();proc.wait()
  log.close()
