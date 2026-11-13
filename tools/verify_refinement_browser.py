#!/usr/bin/env python3
"""UXR-01..25 actual maintained components, populated canonical local fixtures.
Baseline mode records defects without claiming conformance. No network/payment API.
"""
from human_input import set_heading,choose_cell,chosen_cell,heading_value
import argparse,functools,http.server,json,subprocess,threading,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
from player_refinement_browser import verify_refinement
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);p.add_argument('--baseline',action='store_true');p.add_argument('--video',action='store_true');p.add_argument('--fixture-dir',type=Path);p.add_argument('--width',type=int);a=p.parse_args();root=Path(__file__).resolve().parents[1];out=a.output.absolute();out.mkdir(parents=True,exist_ok=False)
subprocess.run(['node','tools/fixtures/prepare-playability-actions.mjs',str(out/'fixture.json')],check=True)
subprocess.run(['node_modules/.bin/esbuild','tools/fixtures/playability-action-browser.mjs','--bundle','--platform=browser','--format=esm','--outfile='+str(out/'fixture.mjs')],check=True)
(out/'index.html').write_text((root/'apps/b2z-observer/index.html').read_text().replace('src="./app.mjs"','src="./fixture.mjs"'));(out/'cursors').mkdir()
for n in ['style.css','icon.svg','cursors/reticle.svg']:(out/n).write_bytes((root/'apps/b2z-observer'/n).read_bytes())
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def end_headers(self):self.send_header('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'");super().end_headers()
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(a.fixture_dir.absolute()if a.fixture_dir else out)));threading.Thread(target=server.serve_forever,daemon=True).start();rows=[]
with sync_playwright()as pw:
 browser=pw.chromium.launch(headless=True,chromium_sandbox=True)
 try:
  for w,h in [(w,h)for w,h in [(1440,900),(390,844),(320,640)]if a.width is None or a.width==w]:
   ctx=browser.new_context(viewport={'width':w,'height':h},has_touch=w<700,device_scale_factor={1440:1,390:1.5,320:2}[w],permissions=['clipboard-write'],**({'record_video_dir':str(out/'video'),'record_video_size':{'width':w,'height':h}}if a.video else{}));page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(f'http://127.0.0.1:{server.server_port}');page.wait_for_function('()=>!!window.fixture')
   page.locator('#identify-button').click();page.locator('#sending-account').fill('aaaaa-aa');page.locator('#identity-save').click();page.locator('#close-panel').click();page.evaluate('fixture.render("additional","initial");fixture.select(1);document.dispatchEvent(new CustomEvent("b2z-locate"))');page.wait_for_function('()=>!fixture.shell.controller.active');page.wait_for_timeout(250)
   ids=['focus-cannon','fire-action','move-action','build-action','close-panel'];boxes=lambda:[page.locator('#'+n).bounding_box()for n in ids]
   before=boxes();page.screenshot(path=str(out/f'{w}-toolbar.png'));page.locator('#fire-action').click();page.wait_for_timeout(300);after=boxes();geometry=page.evaluate('()=>{const n=(document.querySelector(".panel-scroll")??document.querySelector(".panel-body")),r=n.getBoundingClientRect();return{height:r.height,content:n.scrollHeight,workspace:document.getElementById("workspace").getBoundingClientRect().toJSON()}}');page.screenshot(path=str(out/f'{w}-fire.png'))
   row={'viewport':[w,h],'toolbar_drift':[round(((b['x']-c['x'])**2+(b['y']-c['y'])**2)**.5,2)for b,c in zip(before,after)],'panel':geometry,'errors':errors}
   page.locator('#move-action').click();page.wait_for_timeout(250);row['move_panel']=page.evaluate('()=>{const n=(document.querySelector(".panel-scroll")??document.querySelector(".panel-body"));return{height:n.clientHeight,content:n.scrollHeight}}')
   # Pending placement: use original canonical target, then move camera within its delay.
   if w==1440:
    page.evaluate('fixture.camera.scale=64;fixture.draw()');sites=page.evaluate('fixture.moveSites(1)');target=None
    for n in sites:
     pt=page.evaluate('(n)=>fixture.camera.cellPoint(n)',n)
     if page.evaluate('p=>document.elementFromPoint(p.sx,p.sy)===document.getElementById("board")',pt):target=n;break
    if target is not None:
     pt=page.evaluate('(n)=>fixture.camera.cellPoint(n)',target);page.evaluate('document.getElementById("board").addEventListener("pointerup",()=>queueMicrotask(()=>{fixture.camera.pan(64,0);fixture.draw()}),{once:true})');page.mouse.click(pt['sx'],pt['sy']);page.wait_for_timeout(650);row['deferred_target']={'original':target,'chosen':chosen_cell(page),'memo':page.locator('#text-memo').text_content()}
   row['minimap']=page.locator('#minimap').evaluate('(n)=>({width:n.width,height:n.height,css:n.getBoundingClientRect().width,dpr:devicePixelRatio})')
   rows.append(row);(out/'results.json').write_text(json.dumps({'baseline':a.baseline,'rows':rows},indent=2)+'\n');print(json.dumps(row),flush=True)
   if not a.baseline:
    assert max(row['toolbar_drift'])<=2,row
    assert geometry['height']>=min(240,geometry['content']),row
    row['journeys']=verify_refinement(page,w,h,out);assert not errors,errors
    page.emulate_media(reduced_motion='no-preference');page.evaluate('fixture.motion("idle",.01)');page.evaluate('fixture.controlledHide();fixture.select(1)');page.wait_for_function('()=>document.querySelector(".panel-body").getBoundingClientRect().height<1',timeout=5000)
    row['controlled_expansion']=page.evaluate('''()=>{document.getElementById('fire-action').click();const body=document.querySelector('.panel-body');getComputedStyle(body).height;const animations=document.getAnimations().filter(a=>a.effect?.target===body||a.effect?.target===document.querySelector('.panel-scroll'));animations.forEach(a=>a.pause());const rows=[0,90,180].map(t=>{animations.forEach(a=>a.currentTime=t);const b=body.getBoundingClientRect(),button=document.getElementById('fire-action').getBoundingClientRect();return{at:t,height:b.height,button:[button.x,button.y]}});animations.forEach(a=>a.finish());return{animations:animations.length,rows}}''')
    r=row['controlled_expansion']['rows'];assert row['controlled_expansion']['animations']>0;assert r[0]['height']<2 and r[0]['height']<r[1]['height']<r[-1]['height'];assert all(v['button']==r[0]['button']for v in r)
    (out/'results.json').write_text(json.dumps({'status':'RUNNING','baseline':False,'rows':rows},indent=2)+'\n')
   # Finalize the page recording before disposing its context.
   page.close();ctx.close()
 finally:browser.close();server.shutdown()

if not a.baseline:(out/'results.json').write_text(json.dumps({'status':'PASS','baseline':False,'rows':rows},indent=2)+'\n')
