#!/usr/bin/env python3
"""Natural panel sizing and per-frame status invariants; controlled canonical scene, real DOM/input."""
import argparse,functools,http.server,json,subprocess,threading,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
from fluid_playability_browser import settled_panel,wallet_fields_reachable
from panel_geometry_browser import install_capture,apply_status,verify_status_geometry
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);p.add_argument('--fixture-dir',type=Path);p.add_argument('--baseline',action='store_true');p.add_argument('--width',type=int);p.add_argument('--video',action='store_true');a=p.parse_args();out=a.output.absolute();out.mkdir(parents=True,exist_ok=False);root=Path(__file__).resolve().parents[1];fixture=a.fixture_dir.absolute()if a.fixture_dir else out/'fixture';rows=[]
if not a.fixture_dir:
 fixture.mkdir();subprocess.run(['node','tools/fixtures/prepare-playability-actions.mjs',str(fixture/'fixture.json')],check=True);subprocess.run(['node_modules/.bin/esbuild','tools/fixtures/playability-action-browser.mjs','--bundle','--platform=browser','--format=esm','--outfile='+str(fixture/'fixture.mjs')],check=True);(fixture/'index.html').write_text((root/'apps/b2z-observer/index.html').read_text().replace('src="./app.mjs"','src="./fixture.mjs"'));(fixture/'cursors').mkdir()
 for name in ['style.css','icon.svg','cursors/reticle.svg']:(fixture/name).write_bytes((root/'apps/b2z-observer'/name).read_bytes())
class H(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def end_headers(self):self.send_header('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'");super().end_headers()
s=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(H,directory=str(fixture)));threading.Thread(target=s.serve_forever,daemon=True).start()
cases=[(1440,900,False),(390,844,False),(320,640,False),(390,430,False),(320,300,False),(1440,900,True),(390,844,True),(320,640,True)]
with sync_playwright()as pw:
 b=pw.chromium.launch(headless=True,chromium_sandbox=True)
 try:
  for w,h,reduced in cases:
   if a.width and w!=a.width:continue
   if a.baseline and (w!=1440 or reduced):continue
   key=f'{w}-{h}-'+('reduced'if reduced else'motion');c=b.new_context(viewport={'width':w,'height':h},has_touch=w<700,reduced_motion='reduce'if reduced else'no-preference',**({'record_video_dir':str(out/'video'),'record_video_size':{'width':w,'height':h}}if a.video else{}));page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(f'http://127.0.0.1:{s.server_port}');page.wait_for_function('()=>!!fixture');page.locator('#identify-button').click();page.locator('#sending-account').fill('aaaaa-aa');page.locator('#identity-save').click();page.locator('#close-panel').click();page.evaluate('fixture.render("additional","initial");fixture.select(1);document.dispatchEvent(new CustomEvent("b2z-locate"))'if a.baseline else'async()=>{await fixture.motion("additional",.01);fixture.playbackScale(0);fixture.controlledReturn();fixture.select(1);document.dispatchEvent(new CustomEvent("b2z-locate"))}');settled_panel(page)
   install_capture(page);apply_status(page,{})
   # A valid Move and valid Build have the same final height. Hide/show within
   # one frame recreates the actual missed ResizeObserver notification.
   page.locator('#move-action').click();page.evaluate('fixture.choose(fixture.moveSites(1)[0])');settled_panel(page)
   page.evaluate('''()=>{window.expansionTrace=[];const take=tag=>expansionTrace.push(capturePanelGeometry(tag));document.getElementById('build-action').click();take('Build-open');fixture.choose(fixture.sites()[0]);take('Build-chosen');let frames=0;function frame(){take('expansion-frame-'+(++frames));if(frames<12)requestAnimationFrame(frame)}requestAnimationFrame(frame)}''')
   if a.baseline:
    page.wait_for_timeout(1000);before=page.evaluate('capturePanelGeometry("settled-before-status")');page.screenshot(path=str(out/'baseline-before.png'));apply_status(page,{'operationalFresh':False,'phase':'STALLED','advancing':False});page.wait_for_timeout(450);after=page.evaluate('capturePanelGeometry("after-status")');(out/'baseline.json').write_text(json.dumps({'before':before,'after':after,'frames':page.evaluate('expansionTrace')},indent=2)+'\n');page.screenshot(path=str(out/'baseline-after.png'));assert abs(after['workspace']['height']-before['workspace']['height'])<=1,(before,after)
   settled_panel(page);(out/(key+'-expansion.json')).write_text(json.dumps(page.evaluate('expansionTrace'),indent=2)+'\n');page.screenshot(path=str(out/(key+'-build-settled.png')))
   results=[]
   for action,button in [('Fire','fire-action'),('Move','move-action'),('Build','build-action')]:
    page.locator('#'+button).click()
    if action!='Fire':page.evaluate('kind=>fixture.choose(kind==="Move"?fixture.moveSites(1)[0]:fixture.sites()[0])',action)
    settled_panel(page);result=verify_status_geometry(page,out,key+'-'+action);results.append({'action':action,'max_drift_px':result['max_drift_px'],'baseline':result['baseline']['workspace'],'states':len(result['transitions'])});wallet_fields_reachable(page,['transfer-amount','payment-owner','text-memo','paying-account','payment-fee','payment-risk']);page.screenshot(path=str(out/(key+'-'+action+'.png')))
   assert not errors,errors;rows.append({'viewport':[w,h],'reduced_motion':reduced,'actions':results,'recording':str(Path(page.video.path()).relative_to(out))if page.video else None});c.close();(out/'results.json').write_text(json.dumps({'status':'RUNNING','rows':rows},indent=2)+'\n');print('PASS',key,flush=True)
 except Exception:
  traceback.print_exc();page.screenshot(path=str(out/'failure.png'));raise
 finally:b.close();s.shutdown()
(out/'results.json').write_text(json.dumps({'status':'PASS','scope':__doc__,'rows':rows,'limits':'Emulated viewport/touch and software rendering; fixture status delivery is separate from IC authenticity.'},indent=2)+'\n')
