#!/usr/bin/env python3
"""Matched populated visual closeout and focused actual-component acceptance.
Uses the maintained canonical fixture bundle, no payment/network execution.
"""
from human_input import set_heading,choose_cell,chosen_cell,heading_value
import argparse,functools,http.server,json,threading
from pathlib import Path
from verify_s14_deployment import seam_pointer_target
from playwright.sync_api import sync_playwright,expect
from fluid_playability_browser import action_field,settled,settled_panel,wallet_fields_reachable,TILE_PAYMENT_WARNING,payment_warning
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--fixture-dir',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--baseline',action='store_true');p.add_argument('--video',action='store_true');p.add_argument('--width',type=int);p.add_argument('--pose-from',type=Path,help='Use recorded candidate camera poses for material-only baseline captures');a=p.parse_args();out=a.output.absolute();out.mkdir(parents=True,exist_ok=False);rows=[];poses={r['viewport'][0]:r for r in json.loads(a.pose_from.read_text())['rows']}if a.pose_from else{}
class H(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def end_headers(self):self.send_header('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'");super().end_headers()
s=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(H,directory=str(a.fixture_dir.absolute())));threading.Thread(target=s.serve_forever,daemon=True).start()
with sync_playwright()as pw:
 b=pw.chromium.launch(headless=True,chromium_sandbox=True)
 try:
  for w,h in [(w,h)for w,h in [(1440,900),(390,844),(320,640)]if a.width is None or a.width==w]:
   c=b.new_context(viewport={'width':w,'height':h},has_touch=w<700,permissions=['clipboard-write'],**({'record_video_dir':str(out/'video'),'record_video_size':{'width':w,'height':h}}if a.video else{}));page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(f'http://127.0.0.1:{s.server_port}');page.wait_for_function('()=>!!globalThis.fixture')
   def match_pose(key):
    if w in poses and key in poses[w]:page.evaluate('(p)=>{fixture.shell.controller.cancel();Object.assign(fixture.camera,{x:p[0],y:p[1],scale:p[2]});fixture.camera.constrain();fixture.draw()}',poses[w][key]);page.wait_for_timeout(80)
   page.locator('#identify-button').click();page.locator('#sending-account').fill('aaaaa-aa');page.locator('#identity-save').click();page.locator('#close-panel').click();page.evaluate('fixture.render("additional","initial");fixture.select(1);document.dispatchEvent(new CustomEvent("b2z-locate"))');settled(page);page.wait_for_timeout(220);match_pose('initial_camera');page.screenshot(path=str(out/f'{w}-toolbar.png'));row={'viewport':[w,h],'initial_camera':page.evaluate('fixture.summary().camera'),'baseline':a.baseline,'errors':errors}
   def preview_points():
    return page.evaluate('''()=>{const a=fixture.aim();if(!a)return[];const p=fixture.camera.cellPoint(a.cannon.cell),d=a.angle*Math.PI/180;return[[p.x,p.y,.24],[p.x+Math.cos(d)*.50,p.y+Math.sin(d)*.50,.27],[p.x-.22,p.y,.08],[p.x+.22,p.y,.08]].map(([x,y,z])=>{const q=fixture.camera.screen(x,y,z),n=document.elementFromPoint(q.x,q.y);return{x:q.x,y:q.y,target:n?.id??null,board:['board','aim-handle'].includes(n?.id),navigation:(()=>{const nav=document.getElementById('centre-cannon'),r=nav.getBoundingClientRect(),visible=getComputedStyle(nav).visibility!=='hidden'&&!nav.hidden;return visible&&q.x>=r.left&&q.x<=r.right&&q.y>=r.top&&q.y<=r.bottom})()}})}''')
   header=page.locator('.panel-header').bounding_box();page.locator('#fire-action').click();settled_panel(page);match_pose('fire_camera');row['fire_camera']=page.evaluate('fixture.summary().camera');row['mouse_hint_after_activation']=page.locator('#toolbar-hint').is_visible();page.screenshot(path=str(out/f'{w}-fire.png'));wallet_fields_reachable(page,['transfer-amount','payment-owner','text-memo','paying-account','payment-fee','payment-risk']);page.screenshot(path=str(out/f'{w}-payment-warning.png'))
   page.locator('#build-action').click();p=page.evaluate('fixture.camera.cellPoint(453577)');page.mouse.click(p['sx'],p['sy']);page.wait_for_function('()=>String(fixture.proposal().cell??"")==="453577"');settled_panel(page);match_pose('build_camera');row['build_camera']=page.evaluate('fixture.summary().camera');row['build_preview_points']=preview_points();row['my_cannon_visible']=page.locator('#centre-cannon').is_visible();row['ghost_style']=page.evaluate('fixture.inspect().ghostStyle??null');page.screenshot(path=str(out/f'{w}-build.png'));payment_warning(page,TILE_PAYMENT_WARNING)
   if not a.baseline:
    assert not row['mouse_hint_after_activation'];assert not row['my_cannon_visible'];assert all(p['board']and not p['navigation']for p in row['build_preview_points']),row
    assert row['ghost_style']and row['ghost_style']['wireframe']is False;assert 0<row['ghost_style']['opacity']<1
    for n in page.evaluate('fixture.sites()'):
     choose_cell(page,str(n));settled_panel(page);assert all(p['board']and not p['navigation']for p in preview_points()),(w,n,preview_points());r=page.locator('.panel-header').bounding_box();assert abs(r['x']-header['x'])<=2 and abs(r['y']-header['y'])<=2
    # All four encoded directions keep the touch handle clear of the card.
    aim_positions=[]
    for angle in ['0','90','180','270']:
     set_heading(page,angle);settled_panel(page);r=page.locator('#aim-handle').bounding_box();point={'x':r['x']+22,'y':r['y']+22};assert page.evaluate('p=>document.elementFromPoint(p.x,p.y)?.id==="aim-handle"',point);assert all(p['board']for p in preview_points());aim_positions.append({'screen_heading':angle,'handle':r,'camera':page.evaluate('fixture.summary().camera')})
    assert all(p['camera']==aim_positions[0]['camera']for p in aim_positions),'angle edits must not recenter the camera'
    row['aim_directions']=aim_positions
    if w==1440:
     memo=page.locator('#text-memo').inner_text()
     for owner,label in [(0,'neutral'),(3,'contrasting')]:
      page.evaluate('([n,o])=>fixture.paintCell(n,o)',[453577,owner]);page.screenshot(path=str(out/f'{w}-ghost-{label}-palette-fixture.png'));assert page.locator('#text-memo').inner_text()==memo
     page.evaluate('fixture.paintCell(453577,1)')
    contractions=[]
    if w<700:
     for height in [430,300]:
      page.locator('#board').focus();set_heading(page,'90');page.set_viewport_size({'width':w,'height':height});page.wait_for_function('(h)=>fixture.camera.viewport.height===h',arg=height);settled_panel(page);points=preview_points();diagnostic=page.evaluate('({scrollX,scrollY,arena:document.getElementById("arena").getBoundingClientRect().toJSON(),card:document.getElementById("workspace").getBoundingClientRect().toJSON(),inline:document.getElementById("workspace").style.cssText})');(out/f'{w}-keyboard-{height}.json').write_text(json.dumps({'points':points,**diagnostic},indent=2));page.screenshot(path=str(out/f'{w}-keyboard-{height}.png'));assert all(p['board']for p in points),(w,height,points,diagnostic);assert page.locator('#board').evaluate('(n)=>n===document.activeElement');page.keyboard.press('Alt+]');assert page.evaluate('fixture.aim().heading===fixture.command().angle');wallet_fields_reachable(page,['transfer-amount','payment-owner','text-memo','paying-account','payment-fee','payment-risk']);contractions.append({'viewport':[w,height],'preview':points,'scroll_height':page.locator('.panel-scroll').evaluate('(n)=>n.clientHeight')})
     page.locator('#board').blur();page.set_viewport_size({'width':w,'height':h});page.wait_for_function('(h)=>fixture.camera.viewport.height===h',arg=h);settled_panel(page)
     if page.locator('#focus-cannon').is_enabled():page.locator('#focus-cannon').click();settled_panel(page)
    row['keyboard_viewport_contractions']=contractions
    cdp=c.new_cdp_session(page)
    cdp.send('Emulation.setEmulatedMedia',{'features':[{'name':'prefers-reduced-transparency','value':'reduce'}]})
    row['reduced_transparency']=page.locator('.panel-body').evaluate('(n)=>({background:getComputedStyle(n).backgroundColor,filter:getComputedStyle(n).backdropFilter})')
    assert row['reduced_transparency']['filter']=='none',row
    page.screenshot(path=str(out/f'{w}-reduced-transparency.png'))
    cdp.send('Emulation.setEmulatedMedia',{'features':[{'name':'forced-colors','value':'active'},{'name':'prefers-reduced-motion','value':'reduce'}]})
    assert page.locator('#build-action').get_attribute('aria-label')=='Build'
    page.screenshot(path=str(out/f'{w}-forced-colors.png'))
    cdp.send('Emulation.setEmulatedMedia',{'features':[]})
    if w==1440:
     # Installed harness regression: direct geometric mutation leaves old DOM
     # until the next frame. Native input must wait for the new layout, while
     # retaining its original canonical target (never click through a card).
     row['layout_race']=page.evaluate('''()=>{const c=fixture.camera,r=document.querySelector('.panel-header').getBoundingClientRect(),old=[c.x,c.y,c.scale];c.centre(.5,.5);c.pan(r.left+60-innerWidth/2,r.top+22-innerHeight/2);const p=c.screen(.5,.5);return{old,point:p,canonical:c.cell(p.x,p.y),oldLayout:document.elementFromPoint(p.x,p.y)?.id};}''')
     assert row['layout_race']['canonical']==0 and row['layout_race']['oldLayout']!='board'
     page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
     row['layout_race']['settledLayout']=page.evaluate('p=>document.elementFromPoint(p.x,p.y)?.id',row['layout_race']['point'])
     assert row['layout_race']['settledLayout']=='board',row['layout_race']
     page.evaluate('globalThis.__b2zCamera=fixture.camera');row['installed_seam_helper']=seam_pointer_target(page,999.8,1000.5)
     page.evaluate('(p)=>{fixture.shell.controller.cancel();Object.assign(fixture.camera,{x:p[0],y:p[1],scale:p[2]});fixture.draw()}',row['layout_race']['old']);settled_panel(page)
    # Native keyboard focus explains an icon; activation dismisses that hint.
    page.locator('#close-panel').focus();page.keyboard.press('Shift+Tab');expect(page.locator('#toolbar-hint')).to_have_text('Build');expect(page.locator('#toolbar-hint')).to_be_visible();page.keyboard.press('Enter');expect(page.locator('#toolbar-hint')).to_be_hidden();page.keyboard.press('Escape');expect(page.locator('#centre-cannon')).to_be_visible()
   page.keyboard.press('Escape')
   row['grid_cameras']={}
   for scale,label in [(12,'intermediate'),(page.evaluate('fixture.camera.fitScale'),'wide')]:
    page.evaluate('(s)=>{fixture.shell.controller.cancel();fixture.camera.scale=s;fixture.draw()}',scale);match_pose(label+'_camera');row[label+'_camera']=page.evaluate('fixture.summary().camera');page.screenshot(path=str(out/f'{w}-{label}.png'))
   row['recording']=str(Path(page.video.path()).relative_to(out))if page.video else None;assert not errors,errors;rows.append(row);(out/'results.json').write_text(json.dumps({'status':'BASELINE'if a.baseline else'RUNNING','rows':rows},indent=2)+'\n');c.close();print('CAPTURED',w,flush=True)
 finally:b.close();s.shutdown()
(out/'results.json').write_text(json.dumps({'status':'BASELINE'if a.baseline else'PASS','rows':rows,'scope':__doc__},indent=2)+'\n')
