#!/usr/bin/env python3
"""Retained mainnet pose in an offline actual-composer/renderer fixture; no certificate/payment claim."""
import argparse,functools,http.server,json,subprocess,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
from fluid_playability_browser import settled_panel
from quantity_browser import verify_quantity_matrix,editor
from mobile_payment_browser import verify_mobile_payment
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);p.add_argument('--pose-only',action='store_true');p.add_argument('--matrix-width',type=int);p.add_argument('--matrix-height',type=int);p.add_argument('--mobile-correction',action='store_true');a=p.parse_args();out=a.output.absolute();out.mkdir(parents=True,exist_ok=False);root=Path(__file__).resolve().parents[1]
subprocess.run(['node','tools/fixtures/prepare-playability-actions.mjs',str(out/'fixture.json')],check=True);subprocess.run(['node_modules/.bin/esbuild','tools/fixtures/playability-action-browser.mjs','--bundle','--platform=browser','--format=esm','--outfile='+str(out/'fixture.mjs')],check=True)
(out/'index.html').write_text((root/'apps/b2z-observer/index.html').read_text().replace('src="./app.mjs"','src="./fixture.mjs"'));(out/'cursors').mkdir()
for n in ['style.css','icon.svg','cursors/reticle.svg','balls-to-the-wallz-b2z-wordmark.svg']:(out/n).write_bytes((root/'apps/b2z-observer'/n).read_bytes())
class H(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def end_headers(self):self.send_header('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'");super().end_headers()
s=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(H,directory=str(out)));threading.Thread(target=s.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{s.server_port}';report={'status':'RUNNING','scope':__doc__}
def save():(out/'results.json').write_text(json.dumps(report,indent=2)+'\n')
with sync_playwright()as pw:
 browser=pw.chromium.launch(headless=True,chromium_sandbox=True)
 try:
  ctx=browser.new_context(viewport={'width':320,'height':640},has_touch=True,record_video_dir=str(out/'video'));page=ctx.new_page();report['page_errors']=[];page.on('pageerror',lambda e:report['page_errors'].append(str(e)));page.goto(url+'/?case=quantityLive');page.wait_for_function('()=>Boolean(globalThis.fixture)')
  page.evaluate('fixture.status({phase:"PLAYING",live:true,verified:true,fresh:true,healthy:true,operationalFresh:true,world:fixture.world(),operational:{run:{running:true,last_error:[],pace:{mode:"ReserveProtection",nominal_milli:0,supported_milli:0,admission_open:false}},source:{binding_checked:true,last_error:[]}}})')
  account=page.evaluate('fixture.world().cannons[0].account');page.locator('#join-action').click();page.locator('#sending-account').fill(account);page.locator('#identity-save').click();page.wait_for_function('()=>document.getElementById("workspace").hidden');page.wait_for_timeout(1000);page.locator('#centre-cannon').click();page.wait_for_timeout(1000)
  if page.locator('#own-cannons button').first.is_visible():page.locator('#own-cannons button').first.click();page.wait_for_timeout(1000)
  if page.locator('#focus-cannon').is_enabled():page.locator('#focus-cannon').click();page.wait_for_timeout(1000)
  page.locator('#fire-action').click();settled_panel(page);page.wait_for_timeout(1000);page.locator('#aim-handle').focus()
  for _ in range(36):page.keyboard.press('Shift+ArrowRight')
  page.wait_for_timeout(1000)
  report['public_route']=page.evaluate('''()=>({camera:fixture.summary().camera,heading:fixture.proposal().degrees,panel:document.getElementById('workspace').getBoundingClientRect().toJSON(),hidden:document.getElementById('quantity-controls').hidden,focus:document.activeElement.id})''')
  # The exact captured camera is independent of any fixture-entry framing.
  page.evaluate('fixture.shell.controller.cancel();Object.assign(fixture.camera,{x:3.6575453715563526,y:3.6575453715563526,scale:64});fixture.setHeading(347.15);fixture.draw()');page.wait_for_timeout(1000)
  report['exact_pose']=page.evaluate('''()=>({camera:fixture.summary().camera,heading:fixture.proposal().degrees,hidden:document.getElementById('quantity-controls').hidden,quantity:document.getElementById('quantity-controls').getBoundingClientRect().toJSON(),origin:fixture.point(1),arrow:fixture.arrow(),layout:fixture.shell.layoutState(),viewport:{width:innerWidth,height:innerHeight,visual:{width:visualViewport.width,height:visualViewport.height,left:visualViewport.offsetLeft,top:visualViewport.offsetTop}},rects:Object.fromEntries(['.brand','#status-button','#identify-button','#cycles-display','#minimap','.camera-controls','.audio-controls','#workspace'].map(s=>[s,document.querySelector(s).getBoundingClientRect().toJSON()])),focus:document.activeElement.id})''');page.screenshot(path=str(out/'exact-pose.png'));save()
  assert not report['exact_pose']['hidden'],'Visible-cannon quantity editing disappeared at retained320x640/347.15 pose'
  page.evaluate('globalThis.quantityIdentity=document.getElementById("quantity-controls")');editor(page);page.close();ctx.close()
  if a.mobile_correction:verify_mobile_payment(browser,url,out,report,save)
  elif not a.pose_only:verify_quantity_matrix(browser,url,out,report,save,a.matrix_width,a.matrix_height)
  report['status']='PASS'
 except Exception as e:report.update(status='FAIL',error=str(e));raise
 finally:save();browser.close();s.shutdown()
