#!/usr/bin/env python3
"""Approved shared panel/native input against canonical disposable scenes; no IC claim."""
import argparse,functools,http.server,json,subprocess,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
from fluid_playability_browser import settled_panel,settled,TILE_PAYMENT_WARNING
from quantity_browser import open_fire,status,resize,gesture_probes
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);p.add_argument('--width',type=int);p.add_argument('--capability',choices=['enabled','disabled']);a=p.parse_args();out=a.output.resolve();out.mkdir(parents=True,exist_ok=False);fixture=out/'fixture';fixture.mkdir();root=Path(__file__).resolve().parents[1]
subprocess.run(['node','tools/fixtures/prepare-playability-actions.mjs',str(fixture/'fixture.json')],check=True);subprocess.run(['node_modules/.bin/esbuild','tools/fixtures/playability-action-browser.mjs','--bundle','--platform=browser','--format=esm','--outfile='+str(fixture/'fixture.mjs')],check=True)
(fixture/'index.html').write_text((root/'apps/b2z-observer/index.html').read_text().replace('src="./app.mjs"','src="./fixture.mjs"'));(fixture/'style.css').write_bytes((root/'apps/b2z-observer/style.css').read_bytes());(fixture/'cursors').mkdir();(fixture/'cursors/reticle.svg').write_bytes((root/'apps/b2z-observer/cursors/reticle.svg').read_bytes());(fixture/'paste.html').write_text('<textarea id="paste" aria-label="Read-only external wallet paste test"></textarea>')
class H(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def end_headers(self):self.send_header('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'");super().end_headers()
s=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(H,directory=str(fixture)));threading.Thread(target=s.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{s.server_port}';report={'status':'RUNNING','scope':__doc__,'views':[]}
def save():(out/'results.json').write_text(json.dumps(report,indent=2)+'\n')
def geometry(page):return page.evaluate('''()=>{const r=s=>document.querySelector(s).getBoundingClientRect().toJSON();return{title:r('.payment-title'),from:r('.payment-from'),to:r('.payment-to'),amount:r('.payment-price'),copies:[...document.querySelectorAll('[data-copy]')].map(n=>n.getBoundingClientRect().toJSON()),panel:r('#workspace'),scroll:r('.panel-scroll'),quantity:r('#quantity-controls'),group:r('#launch-editors'),cry:r('#war-cry-editor'),hidden:document.getElementById('launch-editors').hidden,fields:[...document.querySelectorAll('#prepared-card input,#prepared-card textarea')].length,buttons:document.querySelectorAll('#prepared-card [data-copy]').length}}''')
def align(page):
 d=geometry(page);d['summaries']=page.locator('.payment-grid .identity-summary span').evaluate_all('(nodes)=>nodes.map(n=>({id:n.id,text:n.textContent,width:n.clientWidth,scroll:n.scrollWidth}))');assert all(x['scroll']<=x['width']for x in d['summaries']),d['summaries'];assert d['fields']==0 and d['buttons']==3;assert abs(d['title']['right']-d['from']['right'])<=1,d;centers=[x['x']+x['width']/2 for x in d['copies']];assert max(centers)-min(centers)<=1,d;assert all(x['width']>=44 and x['height']>=44 for x in d['copies']);assert d['from']['right']<=d['to']['left']+1;return d
with sync_playwright()as pw:
 b=pw.chromium.launch(headless=True,chromium_sandbox=True)
 try:
  for enabled in [False,True]:
   if a.capability and enabled!=(a.capability=='enabled'):continue
   for w,h in [(1440,900),(390,844),(320,640)]:
    if a.width and w!=a.width:continue
    dpr=3 if enabled and w==320 else 2 if enabled and w==390 else 1
    ctx=b.new_context(viewport={'width':w,'height':h},device_scale_factor=dpr,has_touch=w<700,permissions=['clipboard-read','clipboard-write'],record_video_dir=str(out/f'video-{w}-{enabled}'));page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));ctx.add_init_script("globalThis.copied=[];const wr=navigator.clipboard.writeText.bind(navigator.clipboard);navigator.clipboard.writeText=async s=>{await wr(s);copied.push(s)}");page.goto(url+'/?case=quantityLive'+('&war-cry=1'if enabled else''));open_fire(page);row={'width':w,'height':h,'dpr':dpr,'capability':enabled,'actions':{}};report['views'].append(row);save()
    assert page.locator('#war-cry').is_visible()==enabled
    for action,prompt in [('fire','Aim & Pay'),('move','Move & Pay'),('build','Build, Aim & Pay')]:
     if action!='fire':
      page.locator('#'+action+'-action').click();settled_panel(page)
      if page.locator('#replace-instructions').is_visible():page.locator('#replace-instructions').click();settled_panel(page)
     assert page.locator('#action-prompt').text_content()==prompt;row['actions'][action]=align(page)
     if action in ['move','build']:assert page.locator('#payment-risk').text_content()==TILE_PAYMENT_WARNING
     if action=='fire'and enabled:
      page.locator('#war-cry').fill('CHARGE!');assert page.locator('#text-memo').text_content().endswith('|CHARGE!');page.locator('[data-copy=amount]').click();page.wait_for_function('()=>copied.length>0');old=page.locator('#text-memo').text_content();page.locator('#war-cry').fill('Again');assert page.locator('#replace-choice').is_visible();page.locator('#keep-instructions').click();assert page.locator('#war-cry').input_value()=='CHARGE!'and page.locator('#text-memo').text_content()==old;page.locator('#war-cry').fill('Again');page.locator('#replace-instructions').click();assert page.locator('#text-memo').text_content().endswith('|Again');row['copied_cry']='PASS Keep/Update complete memo and input'
      # Focus/caret and local key ownership across ordinary status refresh.
      page.locator('#war-cry').focus();before=page.evaluate('fixture.summary().camera');page.keyboard.press('ArrowLeft');page.keyboard.press('b');assert page.evaluate('fixture.summary().camera')==before;assert page.locator('#war-cry').evaluate('(n)=>document.activeElement===n')
      page.locator('#war-cry').fill('a'*64);assert len(page.locator('#text-memo').text_content().encode())<=32;assert len(page.locator('#war-cry').input_value())<64
      page.locator('#war-cry').fill('No|way');status(page,'healthy');assert page.locator('#war-cry').input_value()=='No|way';assert page.locator('[data-copy=text]').is_disabled();page.locator('#war-cry').fill('Fine')
      page.evaluate('(text)=>navigator.clipboard.writeText(text)','Hi'+chr(10)+'There');page.locator('#war-cry').focus();page.keyboard.press('Control+A');page.keyboard.press('Control+V');assert page.locator('#war-cry').input_value()=='Fine','Native paste must reject a newline before browser sanitisation';assert page.locator('[data-copy=text]').is_disabled();page.locator('#war-cry').fill('Fine')
      page.evaluate('()=>navigator.clipboard.writeText("é 🇬🇧")');page.locator('#war-cry').focus();page.keyboard.press('Control+A');page.keyboard.press('Control+V');assert page.locator('#war-cry').input_value()=='é 🇬🇧'
      page.evaluate('(text)=>navigator.clipboard.writeText(text)','\ufeffA');page.locator('#war-cry').focus();page.keyboard.press('Control+A');page.keyboard.press('Control+V');assert page.locator('#war-cry').input_value()=='\ufeffA';row['native_BOM']='PASS U+FEFF remains exact payload after native paste and canonical memo copy'

     if page.locator('#replace-instructions').is_visible():page.locator('#replace-instructions').click();settled_panel(page)
     if action=='fire'and enabled:assert page.locator('#text-memo').text_content().endswith('|\ufeffA')
     settled_panel(page) # Deliberate cry edits may still be expanding the replacement notice.
     baseline=geometry(page)['panel'];row['actions'][action]['status_samples']=[]
     for kind in ['protected','healthy','operational','healthy','delivery','healthy']:
      status(page,kind)
      for _ in range(4):
       page.wait_for_timeout(25);box=geometry(page)['panel'];assert all(box[k]==baseline[k]for k in ['x','y','width','height']),(kind,box,baseline);row['actions'][action]['status_samples'].append({'kind':kind,'panel':box})
      assert page.locator('[data-copy=text]').is_enabled()==(kind=='healthy')
      if action=='fire':assert page.locator('#quantity-controls').is_visible();assert page.locator('#war-cry').is_visible()==enabled
     for field,value in [('owner',page.locator('#full-recipient').text_content()),('amount',page.locator('#transfer-amount').text_content().replace(' ICP','')),('text',page.locator('#text-memo').text_content())]:
      page.locator('[data-copy='+field+']').click();page.wait_for_function('(v)=>copied.at(-1)===v',arg=value)
     page.locator('#recipient-reveal').click();assert page.locator('#full-recipient').is_visible();assert page.locator('#full-recipient').text_content()=='s5ir5-gqaaa-aaaas-amyna-cai';page.locator('#recipient-reveal').click();settled_panel(page);page.screenshot(path=str(out/f'{w}-{enabled}-{action}.png'));save()
    # Reopen Fire, exact camera pose; fixture geometry control is not production acceptance.
    page.locator('#fire-action').click();settled_panel(page);page.evaluate('fixture.shell.controller.cancel();Object.assign(fixture.camera,{x:3.6575453715563526,y:3.6575453715563526,scale:64});fixture.setHeading(347.15);fixture.draw()');page.wait_for_timeout(500)
    if page.locator('#replace-instructions').is_visible():page.locator('#replace-instructions').click();settled_panel(page)
    if enabled:page.locator('#war-cry').fill('Hello')
    for heading in [347.15,*range(0,360,15),*range(345,-1,-15),347.15]:
     page.evaluate('(h)=>fixture.setHeading(h)',heading);page.wait_for_timeout(20);g=geometry(page);assert not g['hidden'];r=g['group'];assert r['left']>=0 and r['right']<=w and r['top']>=0 and r['bottom']<=h;assert page.locator('#quantity-controls').is_visible();assert page.locator('#war-cry').is_visible()==enabled
     for target in ['#quantity-minus','#quantity-plus']+(['#war-cry']if enabled else[]):
      assert page.locator(target).evaluate('(n)=>{const r=n.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return h===n||n.contains(h)}'),(target,g)
     obstacles=page.evaluate("()=>['#workspace','#minimap','.camera-controls','.audio-controls'].map(s=>document.querySelector(s).getBoundingClientRect().toJSON())");assert all(not(r['left']<o['right']and r['right']>o['left']and r['top']<o['bottom']and r['bottom']>o['top'])for o in obstacles),g
    page.screenshot(path=str(out/f'{w}-{enabled}-exact-347.png'));row['exact_pose']=geometry(page);save()
    if enabled and w==320:
     page.locator('#war-cry').blur();dev=ctx.new_cdp_session(page);row['visual_viewport']=[]
     page.evaluate("document.documentElement.style.setProperty('--quantity-safe-left','12px');document.documentElement.style.setProperty('--quantity-safe-right','12px')")
     resize(page,{'width':321,'height':640});resize(page,{'width':320,'height':640})
     for factor in [1.1,1.6,1]:
      dev.send('Emulation.setPageScaleFactor',{'pageScaleFactor':factor});page.wait_for_function('()=>Math.abs(parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--launch-editor-space"))-(visualViewport.width-24))<1');settled_panel(page);g=geometry(page);v=page.evaluate('({left:visualViewport.offsetLeft,top:visualViewport.offsetTop,width:visualViewport.width,height:visualViewport.height})');r=g['group'];assert not g['hidden']and r['left']>=v['left']+12 and r['right']<=v['left']+v['width']-12 and r['top']>=v['top']and r['bottom']<=v['top']+v['height'],(factor,g,v)
      for target in ['#quantity-minus','#quantity-plus','#war-cry']:
       assert page.locator(target).evaluate('(n)=>{const r=n.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return h===n||n.contains(h)}'),(factor,target,g,v)
      row['visual_viewport'].append({'scale':factor,'viewport':v,'geometry':g});page.screenshot(path=str(out/f'320-visual-scale-{factor}.png'));save()
     page.evaluate("for(const k of ['left','right'])document.documentElement.style.setProperty('--quantity-safe-'+k,'0px')");resize(page,{'width':321,'height':640});resize(page,{'width':320,'height':640});settled_panel(page)
     row['contracted']=[]
     page.locator('#war-cry').blur()
     for height in [350,300,240,180,640]:
      resize(page,{'width':320,'height':height});settled_panel(page)
      if page.locator('#locate-context').is_visible():page.locator('#locate-context').click();settled_panel(page)
      g=geometry(page);r=g['group'];assert not g['hidden']and r['left']>=0 and r['right']<=320 and r['top']>=0 and r['bottom']<=height,g
      for target in ['#quantity-minus','#quantity-plus','#war-cry']:
       assert page.locator(target).evaluate('(n)=>{const r=n.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return h===n||n.contains(h)}'),(target,g)
      row['contracted'].append({'height':height,'geometry':g});page.screenshot(path=str(out/f'320-cry-contracted-{height}.png'));save()
     # CDP drives the browser's native IME editing path, not dispatched DOM events.
     page.locator('#war-cry').focus();page.locator('#war-cry').fill('');dev=ctx.new_cdp_session(page)
     dev.send('Input.imeSetComposition',{'text':'進め','selectionStart':2,'selectionEnd':2});assert page.locator('[data-copy=text]').is_disabled();dev.send('Input.insertText',{'text':'進め'});page.keyboard.press('Enter');assert page.locator('#war-cry').input_value()=='進め'
     if page.locator('#replace-instructions').is_visible():page.locator('#replace-instructions').click()
     assert page.locator('#text-memo').text_content().endswith('|進め');row['native_ime']='PASS composing copy fence and committed Unicode memo'
     gesture_probes(page,ctx,row)
    row['sweep']='PASS full forward/reverse, original pose, active group bounds';page.screenshot(path=str(out/f'{w}-{enabled}-347.png'));row['final']=geometry(page);row['errors']=errors;assert not errors;save()
    if enabled:
     # First Join is direction-anchored, never attached to a fabricated cannon.
     page.close();ctx.close();ctx=b.new_context(viewport={'width':w,'height':h},device_scale_factor=dpr,has_touch=w<700,permissions=['clipboard-read','clipboard-write'],record_video_dir=str(out/f'video-{w}-join'));page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(url+'/?case=quantityLive&war-cry=1');page.wait_for_function('()=>Boolean(globalThis.fixture)');page.locator('#join-action').click();page.locator('#sending-account').fill('2vxsx-fae');page.locator('#identity-save').click();settled_panel(page)
     assert page.locator('#action-prompt').text_content()=='Join & Pay';assert page.locator('#quantity-controls').is_hidden();assert page.locator('#war-cry').is_visible();assert page.locator('#launch-editors').evaluate('(n)=>n.parentElement.id')=='action-inputs';page.locator('#war-cry').fill('None');assert page.locator('#text-memo').text_content().endswith('|None');settled_panel(page);align(page)
     expected=page.locator('#text-memo').text_content();page.locator('#text-memo').select_text();page.keyboard.press('Control+C');wallet=ctx.new_page();wallet.goto(url+'/paste.html');wallet.locator('#paste').focus();wallet.keyboard.press('Control+V');assert wallet.locator('#paste').input_value()==expected;wallet.close();page.bring_to_front()
     page.evaluate('()=>{navigator.clipboard.writeText=async()=>{throw new DOMException("Denied","NotAllowedError")}}');page.locator('[data-copy=text]').click();assert page.locator('#manual-value').input_value()==expected;page.keyboard.press('Control+C');wallet=ctx.new_page();wallet.goto(url+'/paste.html');wallet.locator('#paste').focus();wallet.keyboard.press('Control+V');assert wallet.locator('#paste').input_value()==expected;wallet.close();page.bring_to_front();page.locator('#manual-handoff').click();settled_panel(page);row['join']='PASS actual direction-anchored editor, literal None, native and denied-API fallback memo copy';page.screenshot(path=str(out/f'{w}-join-cry.png'));save()
    page.close();ctx.close()
  report['status']='PASS'
 except Exception as e:
  report.update(status='FAIL',error=repr(e));page.screenshot(path=str(out/'failure.png'));report['failure']=geometry(page);report['page_errors']=errors;raise
 finally:save();b.close();s.shutdown()
