#!/usr/bin/env python3
"""Native input against actual composer/camera/renderer; controlled canonical worlds, not IC authentication."""
import argparse,functools,http.server,json,subprocess,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
from returning_entry_browser import verify_returning_entry
from fluid_playability_browser import settled,settled_panel,TILE_PAYMENT_WARNING
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);p.add_argument('--width',type=int);a=p.parse_args();out=a.output.absolute();out.mkdir(parents=True,exist_ok=False);root=Path(__file__).resolve().parents[1]
subprocess.run(['node','tools/fixtures/prepare-playability-actions.mjs',str(out/'fixture.json')],check=True);subprocess.run(['node_modules/.bin/esbuild','tools/fixtures/playability-action-browser.mjs','--bundle','--platform=browser','--format=esm','--outfile='+str(out/'fixture.mjs')],check=True)
(out/'index.html').write_text((root/'apps/b2z-observer/index.html').read_text().replace('src="./app.mjs"','src="./fixture.mjs"'));(out/'cursors').mkdir()
for n in ['style.css','icon.svg','cursors/reticle.svg']:(out/n).write_bytes((root/'apps/b2z-observer'/n).read_bytes())
(out/'wallet.html').write_text('<!doctype html><title>Read-only external-wallet paste surface; no submit</title><label>Paste exact value<textarea id="paste"></textarea></label>')
class H(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def end_headers(self):self.send_header('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'");self.send_header('Permissions-Policy','clipboard-read=(), clipboard-write=(self), autoplay=()');super().end_headers()
s=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(H,directory=str(out)));threading.Thread(target=s.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{s.server_port}';report={'status':'RUNNING','scope':__doc__,'rows':[]}
def save():(out/'results.json').write_text(json.dumps(report,indent=2)+'\n')
def pasted(ctx,source):
 wallet=ctx.new_page();wallet.goto(url+'/wallet.html');wallet.locator('#paste').focus();wallet.keyboard.press('Control+V');wallet.wait_for_timeout(100);v=wallet.locator('#paste').input_value();wallet.close();source.bring_to_front();return v
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,chromium_sandbox=True)
 try:
  for w,h in [(1440,900),(390,844),(320,640)]:
   if a.width and a.width!=w:continue
   ctx=browser.new_context(viewport={'width':w,'height':h},has_touch=w<700,permissions=['clipboard-write'],record_video_dir=str(out/f'video-{w}'));page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(url+'/?case=additional&phase=final');page.wait_for_function('()=>!!fixture');row={'viewport':[w,h]};report['rows'].append(row)
   page.locator('#join-action').click();page.locator('#sending-account').fill('aaaaa-aa');page.locator('#identity-save').click();page.wait_for_function('()=>document.getElementById("workspace").hidden&&!fixture.shell.controller.active');assert page.evaluate('fixture.summary().selected')is None;assert page.locator('#text-memo').text_content()=='';row['returning_entry']={'status':'PASS','camera':page.evaluate('fixture.summary().camera'),'cannons':page.evaluate('fixture.summary().cannons')};page.screenshot(path=str(out/f'{w}-return-territory.png'))
   page.locator('#centre-cannon').click()
   if page.locator('#own-cannons button').first.is_visible():page.locator('#own-cannons button').first.click()
   settled(page);page.locator('#fire-action').click();settled_panel(page);page.wait_for_selector('#quantity-controls',state='visible');assert page.locator('#ball-quantity,#audio-popover,input[type=range]').count()==0;box=page.locator('#quantity-controls').bounding_box();before=page.evaluate('({camera:fixture.summary().camera,angle:fixture.proposal().degrees,cell:fixture.proposal().cell})')
   for _ in range(3):page.locator('#quantity-plus').click()
   assert page.locator('#quantity-count').text_content()=='4';assert page.evaluate('fixture.command().quantity')==4;assert page.evaluate('fixture.summary().camera')==before['camera'];assert page.evaluate('fixture.proposal().degrees')==before['angle'];assert page.locator('#quantity-controls').bounding_box()==box;row['quantity']={'status':'PASS','memo':page.locator('#text-memo').text_content(),'box':box};page.screenshot(path=str(out/f'{w}-fire-quantity.png'))
   # Actual keyboard aim changes; count widget must remain available, upright
   # and hit-testable across all quadrants without moving the camera.
   row['quadrants']=[];page.locator('#aim-handle').focus()
   for degrees in [45,90,135,180,225,270,315,0]:
    for _ in range(9):page.keyboard.press('Shift+ArrowRight')
    page.wait_for_timeout(80);assert page.evaluate('Number(fixture.proposal().degrees)')==degrees
    assert page.locator('#quantity-controls').is_visible();r=page.locator('#quantity-controls').bounding_box();assert r['x']>=0 and r['x']+r['width']<=w and r['y']>=0 and r['y']+r['height']<=h
    assert page.locator('#quantity-plus').evaluate('(n)=>{const r=n.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===n}')
    row['quadrants'].append({'degrees':degrees,'box':r})
   owner=page.locator('#full-recipient').input_value();assert '…' in page.locator('#payment-owner').text_content();page.locator('[data-copy=owner]').click();assert pasted(ctx,page)==owner;page.locator('#recipient-reveal').click();assert page.locator('#full-recipient').is_visible();page.locator('#full-recipient').focus();page.locator('#full-recipient').select_text();page.keyboard.press('Control+C');assert pasted(ctx,page)==owner;page.locator('#recipient-reveal').click()
   # A copied packet remains coherent through draft edits and Keep/Update.
   memo=page.locator('#text-memo').text_content();page.locator('[data-copy=text]').click();assert pasted(ctx,page)==memo;page.locator('#quantity-plus').click();assert page.locator('#replace-choice').is_visible();page.locator('#keep-instructions').click();assert page.locator('#quantity-count').text_content()=='4' and page.locator('#text-memo').text_content()==memo;page.locator('#quantity-plus').click();page.locator('#replace-instructions').click();assert page.evaluate('fixture.command().quantity')==5
   amount=page.locator('#transfer-amount').text_content().replace(' ICP','');page.locator('[data-copy=amount]').click();assert pasted(ctx,page)==amount;row['exact_copy']={'recipient':owner,'amount':amount,'memo':memo,'status':'PASS actual native writes/copy/paste; read API remains forbidden'}
   for action,prompt in [('move','Move & Pay'),('build','Build, Aim & Pay')]:
    page.locator('#'+action+'-action').click()
    if page.locator('#replace-instructions').is_visible():page.locator('#replace-instructions').click()
    settled_panel(page);assert page.locator('#action-prompt').text_content()==prompt;assert page.locator('#payment-risk').text_content()==TILE_PAYMENT_WARNING;assert page.evaluate('fixture.proposal().cell')is not None;assert page.locator('#quantity-controls').is_hidden();page.screenshot(path=str(out/f'{w}-{action}.png'))
   row['move_build']='PASS legal defaults, exact prompts and warning';row['errors']=errors;assert not errors;save();page.close();ctx.close()
  report['entry_matrix']=verify_returning_entry(browser,url,out)
  report['status']='PASS'
 except Exception as e:
  report['status']='FAIL';report['error']=str(e)
  try:page.screenshot(path=str(out/'failure.png'));report['dom']=page.evaluate('({proposal:fixture.proposal(),entry:fixture.entryState(),quantity:fixture.quantity(),selected:fixture.summary().selected,point:fixture.point(1),camera:fixture.summary().camera,aim:fixture.aim(),layout:fixture.shell.layoutState(),rects:[".arena-header",".brand","#status-button","#identify-button","#cycles-display","#minimap",".audio-controls",".camera-controls"].map(s=>[s,document.querySelector(s).getBoundingClientRect().toJSON()])})')
  except Exception:pass
  raise
 finally:save();browser.close();s.shutdown()
