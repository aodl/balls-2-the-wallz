#!/usr/bin/env python3
"""UX-01..13 populated synthetic UI journeys; real HTTP/WebGL/Web Crypto, no IC or payment claim."""
from fluid_playability_browser import action_field
import argparse,functools,http.server,json,subprocess,threading,time,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from player_playability_browser import verify_player_controls,verify_saved_world_heading,capture_player_review
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);p.add_argument('--no-video',action='store_true',help='Run all assertions without optional recording/encoding load');p.add_argument('--visual-review',action='store_true',help='Short populated visual journeys, screenshots and recordings');a=p.parse_args();
if a.visual_review and a.no_video:p.error('visual review requires recordings; use --no-video only for development checks')
root=Path(__file__).resolve().parents[1];out=a.output.absolute();out.mkdir(parents=True,exist_ok=False)
subprocess.run(['node','tools/fixtures/prepare-playability-actions.mjs',str(out/'fixture.json')],cwd=root,check=True)
subprocess.run(['node_modules/.bin/esbuild','tools/fixtures/playability-action-browser.mjs','--bundle','--platform=browser','--format=esm','--outfile='+str(out/'fixture.mjs')],cwd=root,check=True)
(out/'index.html').write_text((root/'apps/b2z-observer/index.html').read_text().replace('src="./app.mjs"','src="./fixture.mjs"'))
(out/'cursors').mkdir();(out/'cursors/reticle.svg').write_bytes((root/'apps/b2z-observer/cursors/reticle.svg').read_bytes())
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
def select(page,n):
 page.evaluate('(n)=>fixture.select(n)',n)
 if page.locator('#locate-context').is_visible():page.locator('#locate-context').click();page.wait_for_function('()=>!fixture.shell.controller.active',timeout=8000)
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=pw.chromium.executable_path,headless=True,chromium_sandbox=True)
 try:
  if a.visual_review:
   for width,height in [(1440,900),(390,844),(320,640)]:
    context=browser.new_context(viewport={'width':width,'height':height},has_touch=width<=700,permissions=['clipboard-write'],record_video_dir=str(out/'video'),record_video_size={'width':width,'height':height});page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(origin);page.wait_for_function('()=>!!window.fixture');row=capture_player_review(page,width,height,out);row['recording']=str(Path(page.video.path()).relative_to(out));context.close();rows.append(row);print('VISUAL PASS',width,height,flush=True)
  else:
   for width,height in [(1440,900),(390,844),(320,640)]:
    context=browser.new_context(viewport={'width':width,'height':height},has_touch=width<=700,permissions=['clipboard-write'],**({}if a.no_video else dict(record_video_dir=str(out/'video'),record_video_size={'width':width,'height':height})))
    context.add_init_script("window.copied=[];const write=navigator.clipboard.writeText.bind(navigator.clipboard);window.realWrite=write;navigator.clipboard.writeText=async v=>{await write(v);copied.push(v)}")
    page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));print('navigate',width,flush=True);page.goto(origin);print('loaded',flush=True);page.wait_for_function('()=>!!window.fixture');assert page.locator('#workspace').is_hidden();assert not page.locator('dialog').count()
    assert not page.locator('input[placeholder*="transaction"]').count();assert not page.get_by_text("I've sent this",exact=True).count()
    print('player controls',flush=True);verify_player_controls(page,width,height);print('player controls PASS',flush=True);print('identify',flush=True);identify(page);close(page);page.evaluate('fixture.render("additional","final")');select(page,2);page.locator('#fire-action').click();page.locator('#ball-quantity').fill('2');page.locator('#angle-degrees').fill('90')
    expect(page.locator('#text-memo')).to_have_text('FIRE 2 315 2');expect(page.locator('#transfer-amount')).to_have_text('4.1 ICP');expect(page.locator('#payment-owner')).to_have_text('s5ir5-gqaaa-aaaas-amyna-cai');expect(page.locator('#payment-risk')).to_contain_text('no automatic refunds')
    print('wallet fields',flush=True)
    for field in ['transfer-amount','payment-owner','text-memo','paying-account','payment-risk']:
     page.locator('#'+field).evaluate('(n)=>n.scrollIntoView({block:"center",inline:"nearest"})');page.wait_for_timeout(60);assert page.locator('#'+field).evaluate('(n)=>{const r=n.getBoundingClientRect(),p=document.querySelector(".panel-body").getBoundingClientRect();return r.top>=p.top&&r.bottom<=p.bottom&&r.left>=p.left&&r.right<=p.right}')
    for kind,value in [('amount','4.1'),('owner','s5ir5-gqaaa-aaaas-amyna-cai'),('text','FIRE 2 315 2')]:
     page.locator(f'[data-copy="{kind}"]').click();expect(page.locator('#copy-feedback')).to_contain_text('Copied.');page.wait_for_function('(v)=>copied.at(-1)===v',arg=value)
    page.locator('#angle-degrees').fill('180');assert page.locator('#replace-choice').is_visible();assert page.locator('#prepared-card').is_hidden();page.locator('#keep-instructions').click();expect(page.locator('#text-memo')).to_have_text('FIRE 2 315 2')
    page.locator('#angle-degrees').fill('180');page.locator('#replace-instructions').click();page.locator('[data-copy="text"]').click();page.wait_for_function('(v)=>copied.at(-1)===v',arg='FIRE 2 45 2')
    # UX-07: principal/text only; preserve independent default-account binding.
    assert page.locator('#legacy-details,#payment-address,#hex-memo,[data-copy="recipient"],[data-copy="hex"]').count()==0;assert page.evaluate('fixture.source().recipient')=='c58487869d46ef0494c7d7c0312b2760abb7164eafd23f0009a42b9545f53bde'
    page.locator('#text-memo').scroll_into_view_if_needed();page.screenshot(path=str(out/f'{width}x{height}-wallet.png'))
    close(page);page.locator('#identify-button').click();expect(page.locator('#saved-list')).to_contain_text('FIRE 2 45 2');assert not page.locator('#saved-list input').count();close(page)
    # Denial is not success; manual save preserves the same instruction set.
    identify(page,'rrkah-fqaaa-aaaaa-aaaaq-cai');close(page);page.locator('#join-action').click();assert page.locator('#quantity-controls').is_hidden();expect(page.locator('#text-memo')).to_have_text('NEW 225 1');expect(page.locator('#payment-risk')).to_have_text('Payments and unused ICP are kept; no automatic refunds.');expect(page.locator('#payment-fee')).to_have_text('Wallet fee extra.')
    page.evaluate('()=>{navigator.clipboard.writeText=async()=>{throw Error("denied")}}');page.locator('[data-copy="owner"]').click();expect(page.locator('#copy-feedback')).to_contain_text('Clipboard unavailable');assert page.locator('#manual-value').input_value()=='s5ir5-gqaaa-aaaas-amyna-cai';page.keyboard.press('ControlOrMeta+C');page.locator('#angle-degrees').fill('90');expect(page.locator('#replace-choice')).to_be_visible();page.locator('#keep-instructions').click();page.locator('#manual-handoff').click();expect(page.locator('#copy-feedback')).to_contain_text('Instructions saved')
    close(page);identify(page);close(page);page.evaluate('fixture.render("mutual_last","final")');select(page,1);assert page.locator('#fire-action').get_attribute('aria-label')=='Revive';assert page.locator('#move-action').is_disabled();page.locator('#fire-action').click();expect(page.locator('#action-prompt')).to_have_text('Aim & Pay');expect(page.locator('#payment-risk')).to_have_text('Payments and unused ICP are kept; no automatic refunds.');expect(page.locator('#payment-fee')).to_have_text('Wallet fee extra.')
    page.evaluate('()=>{navigator.clipboard.writeText=window.realWrite}');page.locator('[data-copy="text"]').click();page.wait_for_timeout(100);page.evaluate('fixture.render("mutual_last","expired")');close(page);page.evaluate('fixture.render("additional","final")');select(page,1);page.locator('#fire-action').click();assert page.locator('#replace-choice').is_visible();page.locator('#replace-instructions').click();assert page.locator('[data-copy="text"]').is_enabled();close(page)
    # Actual clock and queue identity through repeated panels/account/action edits.
    page.evaluate('fixture.motion("idle",.01)');page.evaluate('fixture.markClock()');initial=page.evaluate('fixture.summary().time')
    for i in range(3):
     print('account click',flush=True);page.locator('#identify-button').click();print('account open',flush=True);close(page);select(page,1);page.locator('#fire-action').click();page.locator('#angle-degrees').fill(str(20+i));page.wait_for_timeout(200);close(page)
    assert page.evaluate('fixture.sameClock()');assert page.evaluate('fixture.summary().time')>initial;page.wait_for_timeout(1000);page.screenshot(path=str(out/f'{width}x{height}-moving.png'))
    assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');assert page.locator('.camera-controls button').evaluate_all('(ns)=>ns.every(n=>{const r=n.getBoundingClientRect();return r.width>=44&&r.height>=44})')
    # Contextual opponent/Build/Move paths use canonical helpers, not disabled action walls.
    page.evaluate('fixture.render("bridge_both","initial")');select(page,3);assert page.locator('#context-actions').is_hidden();close(page)
    page.evaluate('fixture.render("additional","final")');select(page,1);page.locator('#move-action').click();action_field(page,'#move-cell').fill('999999');assert page.locator('#prepared-card').is_hidden();page.keyboard.press('Escape')
    select(page,1);page.locator('#build-action').click();assert page.locator('#new-controls').is_visible();assert page.evaluate('fixture.sites().length')>0
    site=page.evaluate('fixture.sites()[0]');action_field(page,'#new-cell').select_option(str(site));assert page.locator('#text-memo').inner_text().endswith(' '+str(site));close(page)
    metrics=page.evaluate('fixture.metrics()');rows.append({'viewport':[width,height],'status':'PASS','metrics':metrics,'recording':str(Path(page.video.path()).relative_to(out))if page.video else None,'player_controls':'PASS','coverage':['exact renderer ownership and cell previews','nonrepeating camera and minimap','screen headings and captured aiming','Move after hidden invalid heading','seam Build origin and revised eligibility','anchored card and viewport focus','contextual Fire/Revive/Join','exact coherent bytes','principal/default/legacy equality','denied/manual clipboard','edit and replacement','history/account scoping','one panel','clock/queue identity and progress','populated WebGL rendering']});context.close();print(f'PASS {width}x{height}',flush=True)
   context=browser.new_context(viewport={'width':390,'height':844},permissions=['clipboard-write']);page=context.new_page();page.goto(origin);page.wait_for_function('()=>!!window.fixture');verify_saved_world_heading(page);context.close();rows.append({'status':'PASS','coverage':['canonical stored world heading and memo bytes survive reload with new screen display']})
   context=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce');page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(origin);page.wait_for_function('()=>!!window.fixture');identify(page);close(page);page.evaluate('fixture.motion("idle",.01)');before=page.evaluate('fixture.summary().time');page.wait_for_timeout(600);assert page.evaluate('fixture.summary().time')>before
   page.set_viewport_size({'width':390,'height':500});page.locator('#identify-button').click();page.locator('#change-account').click();page.locator('#sending-account').fill('aaaaa-aa');assert page.locator('#identity-save').is_visible();page.locator('#identity-save').click();page.keyboard.press('Escape');page.set_viewport_size({'width':320,'height':640});before_zoom=page.evaluate('devicePixelRatio');page.keyboard.press('ControlOrMeta+Equal');native_zoom=page.evaluate('devicePixelRatio')!=before_zoom;page.evaluate("document.documentElement.style.fontSize='24px'");assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');rows.append({'status':'PASS','coverage':['reduced motion continues live motion','software-keyboard viewport resize','150% root text-size emulation'],'native_browser_zoom_shortcut_changed_dpr':native_zoom});context.close()
   context=browser.new_context(viewport={'width':390,'height':844},permissions=['clipboard-write']);context.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw Error('blocked')}})");page=context.new_page();page.goto(origin);page.wait_for_function('()=>!!window.fixture');identify(page);assert 'this visit only' in page.locator('#storage-note').inner_text();close(page);select(page,1);page.locator('#fire-action').click();assert page.locator('[data-copy="text"]').is_enabled();page.locator('#text-memo').evaluate('(n)=>{const r=document.createRange();r.selectNodeContents(n);getSelection().removeAllRanges();getSelection().addRange(r)}');page.keyboard.press('ControlOrMeta+C');page.locator('#angle-degrees').fill('180');expect(page.locator('#replace-choice')).to_be_visible();page.locator('#keep-instructions').click();page.locator('[data-copy="text"]').click();expect(page.locator('#copy-feedback')).to_contain_text('this visit only');context.close()
   context=browser.new_context(viewport={'width':390,'height':844},has_touch=True);page=context.new_page();page.goto(origin);page.wait_for_function('()=>!!window.fixture');cdp=context.new_cdp_session(page);before=page.evaluate('fixture.summary()')
   cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':90,'y':220,'id':1},{'x':210,'y':220,'id':2}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':70,'y':220,'id':1},{'x':230,'y':220,'id':2}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});assert page.evaluate('fixture.summary().camera[2]')>before['camera'][2]
   camera=page.evaluate('fixture.summary().camera');cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':80,'y':220,'id':1}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':120,'y':250,'id':1}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});assert page.evaluate('fixture.summary().camera')!=camera;assert page.evaluate('fixture.summary().selected')==before['selected']
   page.evaluate('fixture.motion("idle",.01)');page.locator('#identify-button').click();field=page.locator('#sending-account');field.fill('aaaaa-aa');field.evaluate('(n)=>{n.focus();n.setSelectionRange(2,2)}');page.wait_for_timeout(700);assert field.evaluate('(n)=>document.activeElement===n&&n.selectionStart===2&&n.selectionEnd===2');rows.append({'status':'PASS','coverage':['CDP touch drag/pinch cannot select a paid destination','account caret survives live background updates'],'qualification':'Emulated touch input; no physical-device claim'});context.close()
   # Actual pinned clock/presenter, canonical subsequent kernel intervals. The
   # clock runs at Trickle policy with explicitly accelerated disposable wall time.
   context=browser.new_context(viewport={'width':390,'height':844},**({}if a.no_video else dict(record_video_dir=str(out/'video'),record_video_size={'width':390,'height':844})));page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(origin);page.wait_for_function('()=>!!window.fixture');page.evaluate('fixture.motion("wrap",.01)');page.evaluate('fixture.camera.frameCell(999999);fixture.playbackScale(20);fixture.markClock()')
   page.wait_for_function('()=>fixture.summary().queue===0',timeout=20000)
   # UX-12 separates the 350ms tail from the approved 1,250ms tile wake.
   # The former 950ms zero-wake assertion contradicted that contract on fast CI.
   page.wait_for_timeout(400);assert page.evaluate('fixture.summary().stats.tails')==0
   page.wait_for_function('()=>!document.getElementById("motion-wait").hidden',timeout=2000);assert page.locator('#waiting-label').inner_text()=='Waiting for next update'
   page.wait_for_function('()=>fixture.summary().stats.effects===0',timeout=1500);assert page.evaluate('fixture.summary().stats.effects')==0
   start=page.evaluate('fixture.summary().time');page.evaluate('fixture.appendMotion()');page.wait_for_function('(t)=>fixture.summary().time>t',arg=start);assert page.evaluate('fixture.sameClock()');page.wait_for_function('()=>fixture.summary().queue===0',timeout=20000)
   page.evaluate('fixture.appendMotion()');page.wait_for_function('(t)=>fixture.summary().time>t+1',arg=start);assert page.evaluate('fixture.sameClock()');page.wait_for_function('()=>fixture.summary().queue===0',timeout=20000);page.screenshot(path=str(out/'slow-wait-resume-wrap.png'));rows.append({'status':'PASS','coverage':['Trickle one complete interval starts','waiting has no movement effect','two later canonical publications resume same clock','toroidal rendered travel'],'timing':'20x accelerated disposable wall time at actual 0.01 policy; not production cadence','recording':str(Path(page.video.path()).relative_to(out))if page.video else None});context.close()
  assert not errors,errors
 except Exception:
  traceback.print_exc();print('FAILURE',errors,flush=True)
  try:page.screenshot(path=str(out/'failure.png'),timeout=5000);(out/'failure.json').write_text(json.dumps({'errors':errors,'text':page.locator('body').inner_text()},indent=2))
  except Exception as capture_error:print('Failure capture unavailable:',capture_error,flush=True)
  raise
 finally:browser.close();server.shutdown()
(out/'results.json').write_text(json.dumps({'status':'PASS','scope':__doc__,'rows':rows,'errors':errors},indent=2)+'\n')
