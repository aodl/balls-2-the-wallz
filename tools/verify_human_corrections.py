#!/usr/bin/env python3
"""Populated current renderer/composer native-input acceptance, no IC authenticity claim.
Certified fixed-H and delivery acceptance is the separate installed normal-module case.
"""
import argparse,functools,http.server,json,subprocess,threading,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from fluid_playability_browser import settled_panel,settled,wallet_fields_reachable,TILE_PAYMENT_WARNING,payment_warning
from human_input import set_heading,choose_cell,chosen_cell
from panel_geometry_browser import verify_status_geometry
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);p.add_argument('--fixture-dir',type=Path);p.add_argument('--baseline',action='store_true');p.add_argument('--width',type=int);p.add_argument('--seams-only',action='store_true');p.add_argument('--reduced-motion',action='store_true');p.add_argument('--forced-colors',action='store_true');a=p.parse_args();out=a.output.absolute();out.mkdir(parents=True,exist_ok=False);root=Path(__file__).resolve().parents[1];fixture=a.fixture_dir.absolute() if a.fixture_dir else out/'fixture'
if not a.fixture_dir:
 fixture.mkdir();subprocess.run(['node','tools/fixtures/prepare-playability-actions.mjs',str(fixture/'fixture.json')],check=True);subprocess.run(['node_modules/.bin/esbuild','tools/fixtures/playability-action-browser.mjs','--bundle','--platform=browser','--format=esm','--outfile='+str(fixture/'fixture.mjs')],check=True);(fixture/'index.html').write_text((root/'apps/b2z-observer/index.html').read_text().replace('src="./app.mjs"','src="./fixture.mjs"'));(fixture/'cursors').mkdir()
 for name in ['style.css','icon.svg','cursors/reticle.svg']:(fixture/name).write_bytes((root/'apps/b2z-observer'/name).read_bytes())
class H(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def end_headers(self):self.send_header('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'");super().end_headers()
s=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(H,directory=str(fixture)));threading.Thread(target=s.serve_forever,daemon=True).start();rows=[]
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,chromium_sandbox=True)
 try:
  for w,h in [(w,h)for w,h in [(1440,900),(390,844),(320,640)]if (a.width is None or a.width==w)and(not a.seams_only or w==1440)]:
   c=b.new_context(viewport={'width':w,'height':h},has_touch=w<700,reduced_motion='reduce'if a.reduced_motion else'no-preference',forced_colors='active'if a.forced_colors else'none',record_video_dir=str(out/'video'),record_video_size={'width':w,'height':h},permissions=['clipboard-write']);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(f'http://127.0.0.1:{s.server_port}');page.wait_for_function('()=>!!globalThis.fixture');page.locator('#identify-button').click();page.locator('#sending-account').fill('aaaaa-aa');page.locator('#identity-save').click();page.locator('#close-panel').click();row={'viewport':[w,h],'baseline':a.baseline}
   if a.seams_only:
    values=[page.evaluate('(o)=>fixture.minimapSeamPixels(o)',o)for o in [{'x':500,'y':500},{'x':0,'y':0},{'x':999.8,'y':999.8},{'x':501.25,'y':498.75}]];print(values,flush=True);assert all(v['bad']==0 for v in values),values;rows.append({'viewport':[w,h],'seams':values});c.close();continue
   def setup():
    if page.locator('#workspace').is_visible():page.locator('#close-panel').click()
    page.evaluate('fixture.render("additional","initial");fixture.camera.scale=64;fixture.camera.frameCell(453578);fixture.draw()');page.wait_for_timeout(100)
   setup();p=page.evaluate('fixture.point(1)');before=page.evaluate('fixture.summary().camera');page.mouse.click(p['x'],p['y']);page.wait_for_timeout(700);row['selection']={'before':before,'after':page.evaluate('fixture.summary().camera'),'selected':page.evaluate('fixture.summary().selected'),'render':page.evaluate('fixture.inspect()')};page.screenshot(path=str(out/f'{w}-selected.png'))
   if not a.baseline:assert row['selection']['after']==before and row['selection']['selected']==1;assert row['selection']['render']['selectedBodies']==1
   if page.locator('#focus-cannon').is_enabled():page.locator('#focus-cannon').click();settled(page)
   print('selection',w,flush=True);row['focus']=page.evaluate('fixture.summary().camera');page.locator('#fire-action').click();settled_panel(page)
   if a.baseline:page.locator('#angle-degrees').fill('90')
   else:set_heading(page,90)
   page.screenshot(path=str(out/f'{w}-fire.png'));row['fire_camera']=page.evaluate('fixture.summary().camera')
   if not a.baseline:
    assert page.locator('#angle-degrees,#move-cell,#new-cell,#stop-follow').count()==0
    # Native click/drag near the body, without touching the small handle.
    pos=page.evaluate('fixture.camera.cellPoint(fixture.aim().cannon.cell)');point={'x':pos['sx']-26,'y':pos['sy']+4};assert page.evaluate('p=>document.elementFromPoint(p.x,p.y)?.id==="board"',point);memo=page.locator('#text-memo').text_content();camera=page.evaluate('fixture.summary().camera');page.mouse.click(point['x'],point['y']);assert page.locator('#text-memo').text_content()!=memo;assert page.evaluate('fixture.summary().camera')==camera;assert page.evaluate('fixture.aim().heading===fixture.command().angle');page.screenshot(path=str(out/f'{w}-near-click-aim.png'))
    page.mouse.move(pos['sx']+22,pos['sy']+4);page.mouse.down();page.mouse.move(pos['sx']+110,pos['sy']-85,steps=8);page.mouse.up();assert page.evaluate('fixture.summary().camera')==camera;assert page.evaluate('fixture.aim().heading===fixture.command().angle')
    # Down outside the vicinity owns pan even after crossing the aim zone.
    page.mouse.move(w-3,h*.52);page.mouse.down();page.mouse.move(w-53,h*.52+30,steps=6);page.mouse.up();assert page.evaluate('fixture.summary().camera')!=camera;row['near_aim_and_outside_pan']='PASS';page.screenshot(path=str(out/f'{w}-outside-pan.png'));
    if page.locator('#focus-cannon').is_enabled():page.locator('#focus-cannon').click()
    settled_panel(page)
    if w<700:
     pos=page.evaluate('fixture.camera.cellPoint(fixture.aim().cannon.cell)');x,y=pos['sx']-26,pos['sy']+4;cdp=c.new_cdp_session(page);assert page.evaluate('([x,y])=>document.elementFromPoint(x,y)?.id==="board"',[x,y]);cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':11}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+15,'y':y-14,'id':11}]});memo=page.locator('#text-memo').text_content();camera=page.evaluate('fixture.summary().camera');cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x+15,'y':y-14,'id':11},{'x':x+90,'y':y,'id':22}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x-5,'y':y-25,'id':11},{'x':x+115,'y':y+10,'id':22}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});assert page.evaluate('fixture.summary().camera')!=camera;assert page.locator('#text-memo').text_content()==memo
     if page.locator('#focus-cannon').is_enabled():page.locator('#focus-cannon').click()
     settled_panel(page);row['touch_near_aim_then_pinch']='PASS (emulated touch, no physical-device claim)'
    guide_rows=[]
    for angle in [0,45,90,135,180,225,270,315]:
     set_heading(page,angle);page.wait_for_timeout(70);value=page.evaluate('''()=>{fixture.draw();const r=fixture.inspect(),p=fixture.camera.screen(r.guideEnd[0],r.guideEnd[1],.028),b=document.getElementById('status-button').getBoundingClientRect();return{end:p,status:b.toJSON(),heading:fixture.aim().heading,memo:document.getElementById('text-memo').textContent,collision:p.x>b.left-6&&p.x<b.right+6&&p.y>b.top-6&&p.y<b.bottom+6}}''');assert not value['collision'],(w,angle,value);guide_rows.append({'screenAngle':angle,**value})
    row['guide_clearance']=guide_rows;set_heading(page,0);page.screenshot(path=str(out/f'{w}-upward-guide-clearance.png'))
    # Exact keyboard aiming and canonical memo remain bound.
    page.locator('#aim-handle').focus();angle=page.evaluate('fixture.proposal().degrees');page.keyboard.press('Alt+ArrowRight');assert abs(float(page.evaluate('fixture.proposal().degrees'))-float(angle)-.01)<.001;assert page.evaluate('fixture.aim().heading===fixture.command().angle')
   # Move shares all actual model matrices with the selected real cannon.
   page.locator('#move-action').click();sites=page.evaluate('fixture.moveSites(1)');dest=sites[0];choose_cell(page,dest);settled_panel(page);page.evaluate('fixture.draw()');data=page.evaluate('fixture.inspect()');row['move']={'cell':dest,'render':data,'source':page.evaluate('fixture.world().cannons[0].cell')};page.screenshot(path=str(out/f'{w}-move.png'))
   if not a.baseline:
    for part,m in data['ghostParts'].items():
     real=data['cannonParts'][part][:16];assert len(m)==16 and all(abs(m[i]-real[i])<1e-6 for i in list(range(12))+[13,15]),(part,m,real)
    assert row['move']['source']!=dest;payment_warning(page,TILE_PAYMENT_WARNING)
   page.locator('#build-action').click();site=page.evaluate('fixture.sites()[0]');choose_cell(page,site);settled_panel(page)
   if not a.baseline:
    target=page.evaluate('''()=>{const s=fixture.sites(),a=fixture.camera.cellPoint(fixture.proposal().cell);return s.map(cell=>({cell,...fixture.camera.cellPoint(cell)})).find(p=>p.cell!==fixture.proposal().cell&&Math.hypot(p.sx-a.sx,p.sy-a.sy)<60&&document.elementFromPoint(p.sx,p.sy)?.id==='board')}''')
    if target:
     if w<700:page.touchscreen.tap(target['sx'],target['sy'])
     else:page.mouse.click(target['sx'],target['sy'])
     page.wait_for_function('(n)=>fixture.proposal().cell===n',arg=target['cell']);assert page.evaluate('fixture.world().cannons[0].cell')==row['move']['source'];row['different_build_tile_inside_aim_halo']='PASS';choose_cell(page,site);settled_panel(page)
   poses=[]
   for angle in [0,45,90,135,180,225,270,315]:
    if a.baseline:page.locator('#angle-degrees').fill(str(angle))
    else:set_heading(page,angle)
    page.evaluate('fixture.draw()');data=page.evaluate('fixture.inspect()');poses.append({'angle':angle,'render':data});page.screenshot(path=str(out/f'{w}-build-{angle}.png'))
    if not a.baseline:assert len(data['ghostParts']['barrel'])==16 and len(data['ghostParts']['muzzle'])==16;assert page.evaluate('fixture.aim().heading===fixture.command().angle')
   print('previews',w,flush=True);row['build']=poses
   if not a.baseline:
    geometry=verify_status_geometry(page,out,str(w)+'-Build')
    row['panel_geometry']=[{'case':r['case'],'box':r['samples'][-1]['workspace'],'copyDisabled':r['disabled']}for r in geometry['transitions']]
    row['max_panel_drift_px']=geometry['max_drift_px']
    print('stable status',w,flush=True);page.screenshot(path=str(out/f'{w}-stable-status.png'))
    wallet_fields_reachable(page,['transfer-amount','payment-owner','text-memo','paying-account','payment-fee','payment-risk'])
    # Keyboard board selection commits an immutable canonical cell.
    page.locator('#board').focus();previous=page.evaluate('fixture.proposal().cell');page.keyboard.press('Alt+ArrowRight');page.keyboard.press('Enter');assert page.evaluate('fixture.proposal().cell')in [previous,previous+1]
    for height in [430,300]:
     page.set_viewport_size({'width':w,'height':height});page.wait_for_timeout(500);wallet_fields_reachable(page,['transfer-amount','payment-owner','text-memo','paying-account','payment-fee','payment-risk']);page.screenshot(path=str(out/f'{w}-contracted-{height}.png'))
    page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(500)
   page.keyboard.press('Escape')
   for scale,label in [(76,'close'),(12,'intermediate'),(page.evaluate('fixture.camera.fitScale'),'wide')]:
    page.evaluate('(s)=>{fixture.shell.controller.cancel();fixture.camera.scale=s;fixture.camera.centre(578.5,453.5);fixture.draw()}',scale);page.screenshot(path=str(out/f'{w}-grid-{label}.png'))
   if not a.baseline:
    page.evaluate('fixture.motion("wrap",.1)');page.evaluate('fixture.playbackScale(0);fixture.camera.scale=64;const b=fixture.displayedBalls()[0];fixture.camera.centre(b.x,b.y);fixture.draw()');pt=page.evaluate('()=>{const b=fixture.displayedBalls()[0];return fixture.camera.point(b.x,b.y,.14)}');page.mouse.click(pt['sx'],pt['sy']);settled(page);assert page.evaluate('Boolean(fixture.shell.controller.following)');assert page.locator('#stop-follow').count()==0;page.screenshot(path=str(out/f'{w}-follow-no-dialogue.png'));camera=page.evaluate('fixture.summary().camera');page.mouse.click(w-3,h*.52);assert not page.evaluate('Boolean(fixture.shell.controller.following)');assert page.evaluate('fixture.summary().camera')==camera;row['away_click_stops_follow']='PASS'
   if not a.baseline and w==1440:
    row['minimap_seams']=[page.evaluate('(o)=>fixture.minimapSeamPixels(o)',o)for o in [{'x':500,'y':500},{'x':0,'y':0},{'x':999.8,'y':999.8},{'x':501.25,'y':498.75}]]
    assert all(v['bad']==0 for v in row['minimap_seams']),row['minimap_seams']
   if not a.baseline:
    from territory_controls_browser import verify_territory_controls
    row['territory_controls']=verify_territory_controls(page,out,w)
    if w==1440:assert 'move_arrows'in row['territory_controls']
   row['recording']=str(Path(page.video.path()).relative_to(out));assert not errors,errors;rows.append(row);(out/'results.json').write_text(json.dumps({'status':'BASELINE'if a.baseline else'RUNNING','rows':rows},indent=2)+'\n');c.close();print('PASS'if not a.baseline else'BASELINE',w,flush=True)
 except Exception:
  traceback.print_exc();page.screenshot(path=str(out/'failure.png'));raise
 finally:b.close();s.shutdown()
(out/'results.json').write_text(json.dumps({'status':'BASELINE'if a.baseline else'PASS','scope':__doc__,'rows':rows},indent=2)+'\n')
