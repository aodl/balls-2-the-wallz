import json,time
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('.work/audio-mainnet-playtest/live');out.mkdir(exist_ok=True);report={'status':'FAIL','views':[]};url='https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/'
def state(page):return page.evaluate('()=>{const s=__b2zExperience.session;return {ready:s.ready,error:s.error,head:s.sequence.last.publication.head,source:s.source,audio:__b2zAudio(),camera:[__b2zCamera.x,__b2zCamera.y,__b2zCamera.scale],certificateMode:__dtrLive.delivery.acceptedHeads.at(-1).mode}}')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,chromium_sandbox=True)
 try:
  for w,h in [(1440,900),(390,844),(320,640)]:
   ctx=b.new_context(viewport={'width':w,'height':h});page=ctx.new_page();requests=[];errors=[];posts=[];page.on('request',lambda r:requests.append(r.url) if '/audio/' in r.url else posts.append(r.url) if r.method=='POST' else None);page.on('pageerror',lambda e:errors.append(str(e)));start=time.monotonic();page.goto(url,wait_until='domcontentloaded');page.wait_for_function('()=>globalThis.__b2zExperience?.session?.ready',timeout=120000);row={'viewport':[w,h],'first_world_seconds':time.monotonic()-start,'initial':state(page)};assert not requests;assert row['initial']['audio'].get('sampleRate') is None;assert row['initial']['certificateMode']=='certificate-verifier';assert not row['initial']['error'];page.screenshot(path=str(out/f'{w}-silent.png'));page.locator('#audio-button').click();page.locator('#audio-music').check();page.wait_for_function('()=>__b2zAudio().music?.active',timeout=90000);row['music']=state(page);page.locator('#audio-effects').check();page.wait_for_function('()=>__b2zAudio().fxBuffers===4',timeout=60000);page.screenshot(path=str(out/f'{w}-enabled.png'));page.locator('#audio-button').click()
   if w==1440:
    page.wait_for_timeout(30000);row['displayed_fx_observation']=state(page);page.locator('#fit').click();page.wait_for_timeout(1500);row['overview_before']=state(page);page.wait_for_timeout(10000);row['overview_after']=state(page);assert row['overview_after']['audio']['stats']['starts']==row['overview_before']['audio']['stats']['starts'];page.screenshot(path=str(out/'overview.png'))
   page.locator('#audio-button').click();page.locator('#audio-music').uncheck();page.locator('#audio-mute').check();page.wait_for_timeout(300);row['muted']=state(page);assert not row['muted']['audio']['music']['active'];assert row['muted']['audio']['activeVoices']==0
   if w==1440:
    # Inject only an audio transport failure in this browser; actual game reads stay untouched.
    page.route('**/audio/**',lambda route:route.abort());page.locator('#audio-mute').uncheck();page.locator('#audio-music').check();page.wait_for_timeout(6000);row['audio_fault']=state(page);assert row['audio_fault']['ready'] and not row['audio_fault']['error'];page.locator('#audio-mute').check()
   assert all(u.endswith(('/query','/read_state')) for u in posts),posts;assert not errors,errors;row.update(errors=errors,audio_requests=len(requests),read_only_posts=len(posts));report['views'].append(row);(out/'results.json').write_text(json.dumps(report,indent=2)+'\n');page.close();ctx.close()
  report['status']='PASS'
 finally:
  (out/'results.json').write_text(json.dumps(report,indent=2)+'\n');b.close()
