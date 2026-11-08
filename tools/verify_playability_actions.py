#!/usr/bin/env python3
"""UX-01..13 populated synthetic UI journeys; real HTTP/WebGL/Web Crypto, no IC or payment claim."""
import argparse,functools,http.server,json,subprocess,threading,time
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);a=p.parse_args();root=Path(__file__).resolve().parents[1];out=a.output.absolute();out.mkdir(parents=True,exist_ok=False)
subprocess.run(['node','tools/fixtures/prepare-playability-actions.mjs',str(out/'fixture.json')],cwd=root,check=True)
subprocess.run(['node_modules/.bin/esbuild','tools/fixtures/playability-action-browser.mjs','--bundle','--platform=browser','--format=esm','--outfile='+str(out/'fixture.mjs')],cwd=root,check=True)
(out/'index.html').write_text((root/'apps/b2z-observer/index.html').read_text().replace('src="./app.mjs"','src="./fixture.mjs"'))
for n in ['style.css','icon.svg']:(out/n).write_bytes((root/'apps/b2z-observer'/n).read_bytes())
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def end_headers(self):
  self.send_header('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'");super().end_headers()
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(out)));threading.Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}'
rows=[];errors=[]
def identify(page,account='aaaaa-aa'):
 print('account click',flush=True);page.locator('#identify-button').click();print('account open',flush=True)
 if page.locator('#account-summary').is_visible():page.locator('#change-account').click()
 print('fill account',flush=True);page.locator('#sending-account').fill(account);print('save account',flush=True);page.locator('#identity-save').click();print('account saved',flush=True)
def close(page):
 if page.locator('#workspace').is_visible():page.locator('#close-panel').click()
def select(page,n):page.evaluate('(n)=>fixture.select(n)',n)
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=pw.chromium.executable_path,headless=True,chromium_sandbox=True)
 try:
  for width,height in [(1440,900),(390,844),(320,640)]:
   context=browser.new_context(viewport={'width':width,'height':height},permissions=['clipboard-write'],record_video_dir=str(out/'video'),record_video_size={'width':width,'height':height})
   context.add_init_script("window.copied=[];const write=navigator.clipboard.writeText.bind(navigator.clipboard);window.realWrite=write;navigator.clipboard.writeText=async v=>{await write(v);copied.push(v)}")
   page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));print('navigate',width,flush=True);page.goto(origin);print('loaded',flush=True);page.wait_for_function('()=>!!window.fixture');assert page.locator('#workspace').is_hidden();assert not page.locator('dialog').count()
   assert not page.locator('input[placeholder*="transaction"]').count();assert not page.get_by_text("I've sent this",exact=True).count()
   print('identify',flush=True);identify(page);close(page);page.evaluate('fixture.render("additional","final")');select(page,2);page.locator('#fire-action').click();page.locator('#ball-quantity').fill('2');page.locator('#angle-degrees').fill('90')
   expect(page.locator('#text-memo')).to_have_text('FIRE 2 90 2');expect(page.locator('#transfer-amount')).to_have_text('4.1 ICP');expect(page.locator('#payment-owner')).to_have_text('s5ir5-gqaaa-aaaas-amyna-cai');expect(page.locator('#payment-risk')).to_contain_text('no automatic refunds')
   print('wallet fields',flush=True)
   for field in ['transfer-amount','payment-owner','text-memo','paying-account','payment-risk']:
    page.locator('#'+field).evaluate('(n)=>n.scrollIntoView({block:"center",inline:"nearest"})');page.wait_for_timeout(60);assert page.locator('#'+field).evaluate('(n)=>{const r=n.getBoundingClientRect(),p=document.querySelector(".panel-body").getBoundingClientRect();return r.top>=p.top&&r.bottom<=p.bottom&&r.left>=p.left&&r.right<=p.right}')
   for kind,value in [('amount','4.1'),('owner','s5ir5-gqaaa-aaaas-amyna-cai'),('text','FIRE 2 90 2')]:
    page.locator(f'[data-copy="{kind}"]').click();expect(page.locator('#copy-feedback')).to_contain_text('Copied.');page.wait_for_function('(v)=>copied.at(-1)===v',arg=value)
   page.locator('#angle-degrees').fill('180');assert page.locator('#replace-choice').is_visible();assert page.locator('#prepared-card').is_hidden();page.locator('#keep-instructions').click();expect(page.locator('#text-memo')).to_have_text('FIRE 2 90 2')
   page.locator('#angle-degrees').fill('180');page.locator('#replace-instructions').click();page.locator('[data-copy="text"]').click();page.wait_for_function('(v)=>copied.at(-1)===v',arg='FIRE 2 180 2')
   page.locator('#legacy-details summary').click();expect(page.locator('#payment-address')).to_have_text('c58487869d46ef0494c7d7c0312b2760abb7164eafd23f0009a42b9545f53bde');page.locator('[data-copy="recipient"]').click();page.wait_for_function('(v)=>copied.at(-1)===v',arg='c58487869d46ef0494c7d7c0312b2760abb7164eafd23f0009a42b9545f53bde')
   page.locator('#text-memo').scroll_into_view_if_needed();page.screenshot(path=str(out/f'{width}x{height}-wallet.png'))
   close(page);page.locator('#identify-button').click();expect(page.locator('#saved-list')).to_contain_text('FIRE 2 180 2');assert not page.locator('#saved-list input').count();close(page)
   # Denial is not success; manual save preserves the same instruction set.
   identify(page,'rrkah-fqaaa-aaaaa-aaaaq-cai');close(page);page.locator('#join-action').click();assert page.locator('#quantity-controls').is_hidden();expect(page.locator('#text-memo')).to_have_text('NEW 180 1')
   page.evaluate('()=>{navigator.clipboard.writeText=async()=>{throw Error("denied")}}');page.locator('[data-copy="owner"]').click();expect(page.locator('#copy-feedback')).to_contain_text('Clipboard unavailable');assert page.locator('#manual-value').input_value()=='s5ir5-gqaaa-aaaas-amyna-cai';page.locator('#manual-handoff').click();expect(page.locator('#copy-feedback')).to_contain_text('Instructions saved')
   close(page);identify(page);close(page);page.evaluate('fixture.render("mutual_last","final")');select(page,1);expect(page.locator('#fire-action')).to_have_text('Revive');assert page.locator('#move-action').is_disabled();page.locator('#fire-action').click();expect(page.locator('#panel-title')).to_contain_text('Revive')
   page.evaluate('()=>{navigator.clipboard.writeText=window.realWrite}');page.locator('[data-copy="text"]').click();page.wait_for_timeout(100);page.evaluate('fixture.render("mutual_last","expired")');close(page);page.evaluate('fixture.render("additional","final")');select(page,1);page.locator('#fire-action').click();assert page.locator('#replace-choice').is_visible();page.locator('#replace-instructions').click();assert page.locator('[data-copy="text"]').is_enabled();close(page)
   # Actual clock and queue identity through repeated panels/account/action edits.
   page.evaluate('fixture.motion("idle",.01)');page.evaluate('fixture.markClock()');initial=page.evaluate('fixture.summary().time')
   for i in range(3):
    print('account click',flush=True);page.locator('#identify-button').click();print('account open',flush=True);close(page);select(page,1);page.locator('#fire-action').click();page.locator('#angle-degrees').fill(str(20+i));page.wait_for_timeout(200);close(page)
   assert page.evaluate('fixture.sameClock()');assert page.evaluate('fixture.summary().time')>initial;page.wait_for_timeout(1000);page.screenshot(path=str(out/f'{width}x{height}-moving.png'))
   assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');assert page.locator('.camera-controls button').evaluate_all('(ns)=>ns.every(n=>{const r=n.getBoundingClientRect();return r.width>=44&&r.height>=44})')
   # Contextual opponent/Build/Move paths use canonical helpers, not disabled action walls.
   page.evaluate('fixture.render("bridge_both","initial")');select(page,3);assert page.locator('#context-actions').is_hidden();close(page)
   page.evaluate('fixture.render("additional","final")');select(page,1);page.locator('#move-action').click();page.locator('#move-cell').fill('999999');assert page.locator('#prepared-card').is_hidden();page.keyboard.press('Escape')
   select(page,1);page.locator('#build-action').click();assert page.locator('#new-controls').is_visible();assert page.evaluate('fixture.sites().length')>0
   site=page.evaluate('fixture.sites()[0]');page.locator('#new-cell').select_option(str(site));assert page.locator('#text-memo').inner_text().endswith(' '+str(site));close(page)
   metrics=page.evaluate('fixture.metrics()');rows.append({'viewport':[width,height],'status':'PASS','metrics':metrics,'recording':str(Path(page.video.path()).relative_to(out)),'coverage':['contextual Fire/Revive/Join','exact coherent bytes','principal/default/legacy equality','denied/manual clipboard','edit and replacement','history/account scoping','one panel','clock/queue identity and progress','populated WebGL rendering']});context.close();print(f'PASS {width}x{height}',flush=True)
  context=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce');page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(origin);page.wait_for_function('()=>!!window.fixture');identify(page);close(page);page.evaluate('fixture.motion("idle",.01)');before=page.evaluate('fixture.summary().time');page.wait_for_timeout(600);assert page.evaluate('fixture.summary().time')>before
  page.set_viewport_size({'width':390,'height':500});page.locator('#identify-button').click();page.locator('#change-account').click();page.locator('#sending-account').fill('aaaaa-aa');assert page.locator('#identity-save').is_visible();page.locator('#identity-save').click();page.keyboard.press('Escape');page.set_viewport_size({'width':320,'height':640});before_zoom=page.evaluate('devicePixelRatio');page.keyboard.press('ControlOrMeta+Equal');native_zoom=page.evaluate('devicePixelRatio')!=before_zoom;page.evaluate("document.documentElement.style.fontSize='24px'");assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');rows.append({'status':'PASS','coverage':['reduced motion continues live motion','software-keyboard viewport resize','150% root text-size emulation'],'native_browser_zoom_shortcut_changed_dpr':native_zoom});context.close()
  context=browser.new_context(viewport={'width':390,'height':844});context.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw Error('blocked')}})");page=context.new_page();page.goto(origin);page.wait_for_function('()=>!!window.fixture');identify(page);assert 'this visit only' in page.locator('#storage-note').inner_text();close(page);select(page,1);page.locator('#fire-action').click();assert page.locator('[data-copy="text"]').is_enabled();context.close()
  assert not errors,errors
 except Exception:
  print('FAILURE',errors,flush=True);page.screenshot(path=str(out/'failure.png'),timeout=5000);(out/'failure.json').write_text(json.dumps({'errors':errors,'text':page.locator('body').inner_text()},indent=2));raise
 finally:browser.close();server.shutdown()
(out/'results.json').write_text(json.dumps({'status':'PASS','scope':__doc__,'rows':rows,'errors':errors},indent=2)+'\n')
