#!/usr/bin/env python3
"""Actual HTTP browser integration: native Web Crypto/CSP, bounded playback and fail-closed verification.
The separate populated UX fixture qualifies composer/renderer interactions. No wallet or gameplay updates.
"""
import argparse,json,time,subprocess,importlib.metadata
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def wait_until(page,predicate,timeout=30000):
 deadline=time.monotonic()+timeout/1000;last=None
 while time.monotonic()<deadline:
  try:
   if predicate():return
  except Exception as e:last=e
  page.wait_for_timeout(50)
 raise TimeoutError(f'condition not met within {timeout}ms: {last}')
def wait_file(page,path,timeout=30000):
 wait_until(page,path.is_file,timeout);return path.read_text().strip()
def open_settings(page):
 if page.locator('#status-view').is_hidden():page.locator('#status-button').click()
 if not page.locator('#status-view details').evaluate('(n)=>n.open'):page.locator('#status-view summary').click()
def close_settings(page):
 if page.locator('#workspace').is_visible():page.locator('#close-panel').click()
def main():
 p=argparse.ArgumentParser();p.add_argument('--mode',choices=['http'],default='http');p.add_argument('--trust',choices=['offline','local','live'],default='offline');p.add_argument('--url',required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--browser');p.add_argument('--coordination',type=Path);a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
 report={'overall':'IN_PROGRESS','mode':'http','trust':a.trust,'qualification':__doc__,'checks':[]};dest=a.output/'results.json'
 def record(name,status='PASS',details=None):report['checks'].append({'name':name,'status':status,'details':details});dest.write_text(json.dumps(report,indent=2)+'\n');print(name,status,flush=True)
 try:from playwright.sync_api import sync_playwright
 except ImportError:report['overall']='BLOCKED';record('browser-tooling','BLOCKED','Playwright unavailable');return 2
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,chromium_sandbox=True,**({'executable_path':a.browser}if a.browser else{}));report.update(browser_version=browser.version,playwright_version=importlib.metadata.version('playwright'),sandbox=True);record('browser-sandbox')
  context=browser.new_context(viewport={'width':1440,'height':900});page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  try:
   response=page.goto(a.url);wait_until(page,lambda:page.evaluate('Boolean(__b2zExperience?.session?.ready)'))
   assert page.evaluate('isSecureContext&&typeof crypto.subtle.digest==="function"');record('native-browser-web-crypto')
   assert response and "script-src 'self'" in response.headers.get('content-security-policy','');assert page.locator('#workspace').is_hidden();assert not page.locator('dialog').count();record('csp-and-unobstructed-arena')
   if a.trust=='live':
    c=a.coordination;c.mkdir(parents=True,exist_ok=True);wait_until(page,lambda:page.evaluate('Boolean(__dtrLive?.connected)'));(c/'browser-connected').write_text('connected\n');wait_until(page,lambda:page.evaluate('__dtrLive.heads.length')>=2)
    assert page.evaluate('__dtrLive.resyncs')==0;assert page.evaluate('__dtrLive.heads.slice(0,2)')==[0,1];record('fresh-live-certified-publications')
    page.evaluate('__b2zTools.delivery(true)');(c/'short-paused').write_text('paused\n');target=int(wait_file(page,c/'harness-short-ready'));page.evaluate('__b2zTools.delivery(false)');wait_until(page,lambda:page.evaluate('__dtrLive.heads.at(-1)')>=target);assert page.evaluate('__dtrLive.resyncs')==0;record('short-disconnect-retained-catchup')
    page.evaluate('__b2zTools.delivery(true)');(c/'long-paused').write_text('paused\n');target=int(wait_file(page,c/'harness-long-ready',60000));page.evaluate('__b2zTools.delivery(false)');wait_until(page,lambda:page.evaluate('__dtrLive.resyncs')>=1 and page.evaluate('__dtrLive.heads.at(-1)')>=target);record('long-disconnect-certified-snapshot-resync')
    target=int(wait_file(page,c/'harness-final-ready'));wait_until(page,lambda:page.evaluate('__dtrLive.heads.at(-1)')>=target);heads=page.evaluate('__dtrLive.heads');assert all(b>a for a,b in zip(heads,heads[1:]));record('live-anti-rollback-and-continuity',details=heads)
   else:
    wait_until(page,lambda:page.evaluate('__b2zExperience.clock.playhead')>0);record('verified-coverage-advances')
    if a.trust=='offline':
     # Replay-only controller is separate from ordinary UI; an old in-flight load cannot win.
     page.evaluate('()=>{void __b2zTools.recording("dense");void __b2zTools.recording("near-impact");}');wait_until(page,lambda:page.evaluate('__b2zTools.state().recording.id')=='near-impact'and page.evaluate('__b2zTools.state().ready'));record('session-generation-fencing')
   before=page.evaluate('__b2zExperience.clock.playhead');page.evaluate('window.savedClock=__b2zExperience.clock;window.savedQueue=__b2zExperience.queue');open_settings(page);close_settings(page);page.locator('#identify-button').click();close_settings(page);page.wait_for_timeout(150)
   assert page.evaluate('savedClock===__b2zExperience.clock&&savedQueue===__b2zExperience.queue');assert page.evaluate('__b2zExperience.clock.playhead')>=before;record('UX-04-panels-preserve-clock-and-queue')
   for w,h in[(1440,900),(390,844),(320,640)]:
    page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(150);assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');page.screenshot(path=str(a.output/f'{w}x{h}.png'))
   record('responsive-rendered-arena');assert page.evaluate('Boolean(__b2zRender?.draw_calls)');record('actual-webgl-renderer')
   reduced=browser.new_context(reduced_motion='reduce');rp=reduced.new_page();rp.goto(a.url);wait_until(rp,lambda:rp.evaluate('Boolean(globalThis.__b2zExperience?.session?.ready)'))
   wait_until(rp,lambda:rp.evaluate('__b2zExperience.clock.playhead>0||__b2zExperience.session.mode==="live"'));assert rp.locator('body').get_attribute('data-phase')!='PAUSED';record('UX-11-reduced-motion-retains-live-updates');reduced.close()
   # Corruption cannot fall back to an offline trust policy.
   bad=context.new_page()
   def corrupt(route):
    r=route.fetch();b=bytearray(r.body());b[-1]^=1;route.fulfill(response=r,body=bytes(b))
   if a.trust in['local','live']:bad.route('**/root-key.der',corrupt)
   else:bad.route('**/recordings/dense/000/state-*',corrupt)
   bad.goto(a.url if a.trust!='offline'else a.url.split('?')[0]+'?recording=dense');wait_until(bad,lambda:bad.locator('body').get_attribute('data-phase')=='ERROR');assert bad.evaluate('!__b2zExperience.status.canPrepare');record('corruption-fails-closed');bad.close()
   assert not errors,errors;report['overall']='PASS';record('application-errors',details=errors)
  except Exception as e:
   report['overall']='FAIL';record('browser-integration','FAIL',str(e));page.screenshot(path=str(a.output/'failure.png'),timeout=5000);return 1
  finally:browser.close()
 return 0
if __name__=='__main__':raise SystemExit(main())
