#!/usr/bin/env python3
"""Actual shared composer/renderer native input on a synthetic Rules12 scene.
Not IC authentication, a Ledger payment or physical-device evidence.
"""
import argparse,functools,http.server,json,os,subprocess,threading,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from fluid_playability_browser import settled_panel,settled
from panel_geometry_browser import verify_status_geometry,apply_status
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);p.add_argument('--width',type=int);a=p.parse_args();out=a.output.absolute();out.mkdir(parents=True,exist_ok=False);root=Path(__file__).resolve().parents[1]
clipboard_delay_ms=int(os.environ.get('B2Z_TEST_CLIPBOARD_DELAY_MS','0'))
if not 0<=clipboard_delay_ms<=1000:raise ValueError('B2Z_TEST_CLIPBOARD_DELAY_MS must be 0..1000')
subprocess.run(['node','tools/fixtures/prepare-playability-actions.mjs',str(out/'fixture.json')],check=True)
subprocess.run(['node_modules/.bin/esbuild','tools/fixtures/playability-action-browser.mjs','--bundle','--platform=browser','--format=esm','--outfile='+str(out/'fixture.mjs')],check=True)
(out/'wallet.html').write_text('<!doctype html><title>Read-only paste, no transaction</title><textarea id="paste"></textarea>')
(out/'index.html').write_text((root/'apps/b2z-observer/index.html').read_text().replace('src="./app.mjs"','src="./fixture.mjs"'));(out/'cursors').mkdir()
for n in ['style.css','icon.svg','cursors/reticle.svg']:(out/n).write_bytes((root/'apps/b2z-observer'/n).read_bytes())
class H(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def end_headers(self):self.send_header('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'");super().end_headers()
s=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(H,directory=str(out)));threading.Thread(target=s.serve_forever,daemon=True).start();report={'status':'RUNNING','scope':__doc__,'rows':[]}
def save():(out/'results.json').write_text(json.dumps(report,indent=2)+'\n')
def pasted(context,page,expected):
 wallet=context.new_page();wallet.goto(f'http://127.0.0.1:{s.server_port}/wallet.html');wallet.wait_for_function('(expected)=>navigator.clipboard.readText().then(value=>value===expected).catch(()=>false)',arg=expected,timeout=5000);wallet.locator('#paste').focus();wallet.keyboard.press('Control+V');expect(wallet.locator('#paste')).to_have_value(expected,timeout=5000);value=wallet.locator('#paste').input_value();wallet.close();page.bring_to_front();return value
def copied_paste(context,page,expected):
 # Click dispatch does not await the application's async native clipboard write.
 # Wait for the exact OS clipboard value, then still prove external native Paste.
 page.wait_for_function('(expected)=>navigator.clipboard.readText().then(value=>value===expected).catch(()=>false)',arg=expected,timeout=5000)
 actual=pasted(context,page,expected)
 assert actual==expected,(actual,expected)
try:
 with sync_playwright()as pw:
  browser=pw.chromium.launch(headless=True,chromium_sandbox=True)
  try:
   for width,height in [(w,h)for w,h in [(1440,900),(390,844),(320,640)]if a.width is None or w==a.width]:
    context=browser.new_context(viewport={'width':width,'height':height},has_touch=width<700,permissions=['clipboard-read','clipboard-write'],record_video_dir=str(out/f'video-{width}'))
    if clipboard_delay_ms:
     # Delayed native writes reproduce a real browser scheduling boundary without replacing Copy or Paste.
     context.add_init_script(f'''(() => {{
       const nativeWrite = navigator.clipboard.writeText.bind(navigator.clipboard);
       navigator.clipboard.writeText = async value => {{
         await new Promise(resolve => setTimeout(resolve, {clipboard_delay_ms}));
         return nativeWrite(value);
       }};
     }})()''')
    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(f'http://127.0.0.1:{s.server_port}/?case=deflector&deflector');page.wait_for_function('()=>!!window.fixture')
    page.locator('#identify-button').click();page.locator('#sending-account').fill('aaaaa-aa');page.locator('#identity-save').click();page.locator('#close-panel').click()
    # Controlled scene setup only, followed by real public UI input.
    page.evaluate('fixture.camera.scale=64;fixture.camera.frameCell(4004);fixture.draw()');point=page.evaluate('fixture.point(1)');page.mouse.click(point['x'],point['y']);page.locator('#focus-cannon').click();settled(page)
    expect(page.locator('#deflect-action')).to_be_visible();expect(page.locator('#deflect-action')).to_be_enabled();page.locator('#deflect-action').click();settled_panel(page)
    expect(page.locator('#action-prompt')).to_have_text('Pay to Build & Divert');expect(page.locator('#quantity-controls')).to_be_hidden();expect(page.locator('#war-cry-editor')).to_be_hidden();expect(page.locator('#deflector-directions')).to_be_visible()
    before=page.evaluate('fixture.summary()');row={'viewport':[width,height],'orientations':[]}
    for name in ['NE','SE','SW','NW']:
     button=page.locator(f'[data-deflector-orientation="{name}"]');button.click();page.wait_for_timeout(200);rect=button.bounding_box();assert rect and rect['width']>=44 and rect['height']>=44;assert rect['x']>=0 and rect['y']>=0 and rect['x']+rect['width']<=width and rect['y']+rect['height']<=height
     expect(button).to_have_attribute('aria-pressed','true');memo=page.locator('#text-memo').inner_text();assert memo.startswith('DEFLECT ')and memo.endswith(' '+name),memo
     hit=page.evaluate('(r)=>{const e=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return e.closest("button")?.dataset.deflectorOrientation}',rect);assert hit==name
     after=page.evaluate('fixture.summary()');assert after['camera']==before['camera']and after['selected']==before['selected'];assert after['balls']==before['balls']and after['cannons']==before['cannons']
     inspect=page.evaluate('fixture.inspect()');assert inspect['ghostKind']=='deflector';assert len(inspect['deflectorGhostParts']['base'])==16 and len(inspect['deflectorGhostParts']['turret'])==16;matrix=inspect['deflectorGhostParts']['turret'];signs={'NE':(1,-1),'SE':(1,1),'SW':(-1,1),'NW':(-1,-1)}[name];norm=(matrix[0]**2+matrix[2]**2)**.5;assert norm>0 and matrix[0]*signs[0]/norm>.7 and matrix[2]*signs[1]/norm>.7,(name,matrix)
     row['orientations'].append({'name':name,'memo':memo,'button':rect,'hit':hit,'render':inspect});page.screenshot(path=str(out/f'{width}-{name}.png'))
    # Keyboard interaction remains inside the same reserved editor.
    page.locator('[data-deflector-orientation="NE"]').focus();page.keyboard.press('Enter');expect(page.locator('#text-memo')).to_have_text(__import__('re').compile(r'DEFLECT \d+ NE'))
    if page.locator('#aim-handle').is_visible():
     page.locator('#aim-handle').focus();page.keyboard.press('ArrowRight');expect(page.locator('#text-memo')).to_have_text(__import__('re').compile(r'DEFLECT \d+ SE'))
    row['status_geometry']=verify_status_geometry(page,out,f'{width}-deflector')
    expect(page.locator('#deflector-directions')).to_be_visible()
    unchanged=page.locator('#text-memo').text_content()
    for override in [{'operationalFresh':False},{'operational':{'run':{'running':True,'last_error':[],'pace':{'mode':'ReserveProtection','nominal_milli':0,'admission_open':False}},'source':{'binding_checked':True,'last_error':[]}}}]:
     apply_status(page,override);assert not page.evaluate('fixture.canPay()');expect(page.locator('#deflector-directions')).to_be_visible();assert page.locator('#text-memo').text_content()==unchanged
    apply_status(page,{})
    recipient=page.locator('#full-recipient').text_content();amount=page.locator('#transfer-amount').text_content().replace(' ICP','');memo=page.locator('#text-memo').text_content()
    for key,value in [('owner',recipient),('amount',amount),('text',memo)]:
     page.locator(f'[data-copy="{key}"]').click();copied_paste(context,page,value)
    row['clipboard']={'recipient':recipient,'amount':amount,'memo':memo,'scope':'Native Copy and external read-only paste, no payment'}
    prior=page.locator('[data-deflector-orientation][aria-pressed="true"]').get_attribute('data-deflector-orientation');other='NW'if prior!='NW'else'NE'
    page.locator(f'[data-deflector-orientation="{other}"]').click()
    assert page.locator('#replace-choice').count()==0
    expect(page.locator('#text-memo')).to_have_text(__import__('re').compile(r'DEFLECT \d+ '+other))
    expect(page.locator(f'[data-deflector-orientation="{other}"]')).to_have_attribute('aria-pressed','true')
    page.locator('[data-copy=text]').click()
    copied_paste(context,page,page.locator('#text-memo').text_content())
    row['orientation_change']='PASS immediate quote and exact native clipboard'
    # Full address remains native-selectable, never the abbreviated principal.
    assert page.locator('#recipient-reveal').count()==0;assert page.locator('#payment-owner').evaluate('(n)=>n.tagName')=='SPAN';assert page.locator('#full-recipient').text_content()==recipient
    if width<700:
     target=page.locator(f'[data-deflector-orientation="{other}"]').bounding_box();page.touchscreen.tap(target['x']+target['width']/2,target['y']+target['height']/2);assert page.evaluate('fixture.summary().camera')==before['camera'];expect(page.locator('#deflector-directions')).to_be_visible()
    before_restore=page.locator('#text-memo').text_content();page.evaluate('globalThis.restoreDeflectorGl=document.getElementById("board").getContext("webgl2").getExtension("WEBGL_lose_context");restoreDeflectorGl.loseContext()');page.wait_for_timeout(400);page.evaluate('restoreDeflectorGl.restoreContext()');page.wait_for_function('()=>!document.getElementById("board").getContext("webgl2").isContextLost()');page.wait_for_timeout(400);assert page.locator('#text-memo').text_content()==before_restore;expect(page.locator('#deflector-directions')).to_be_visible();assert page.evaluate('fixture.inspect().ghostKind')=='deflector';row['context_restore']='PASS actual WebGL loss/restore, same proposal and editor'
    row['source_geometry']=before;row['panel']=page.locator('#workspace').bounding_box();row['errors']=errors;assert not errors;report['rows'].append(row);save();context.close()
   # An unsupported certified-policy fixture must offer no Deflector action.
   c=browser.new_context(viewport={'width':320,'height':640});page=c.new_page();page.goto(f'http://127.0.0.1:{s.server_port}/?case=quantityLive&entry');page.wait_for_function('()=>!!window.fixture');expect(page.locator('#deflect-action')).to_be_hidden();expect(page.locator('#war-cry-editor')).to_be_hidden();report['unsupported_rules7']='PASS explicit Rules7 configuration hides Deflector and War Cry';c.close()
  finally:browser.close()
 report['status']='PASS';save();print(f'PASS boundary Deflector native controls at {len(report["rows"])} viewport(s); synthetic scene scope')
except Exception:
 report['status']='FAIL';report['error']=traceback.format_exc();save();raise
finally:s.shutdown();s.server_close()
