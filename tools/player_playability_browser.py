from fluid_playability_browser import action_field,settled_panel
"""Focused player-centred journeys, called by the existing populated browser harness.
Synthetic snapshots only; no certificate, wallet or physical-device claim.
"""
import math
from playwright.sync_api import expect

def verify_aim_entry_settling(page):
 # UX-04/11: entry composition is allowed to animate before direct aiming.
 # Hold a real controller transition so a fast CI machine cannot accidentally
 # qualify an early pose sample. This changes only controlled camera timing.
 guard=page.evaluate('''()=>{const m=fixture.shell.controller;
   if(!m.animation)m.go(m.target(c=>c.pan(0,-4)),{owner:'composition',duration:160});
   const a=m.animation;a.duration=160;a.start=performance.now()+60000;
   globalThis.aimEntryGuard={released:false,memo:document.getElementById('text-memo').textContent,started:performance.now()};
   setTimeout(()=>{a.start=performance.now();aimEntryGuard.released=true;},120);
   return{owner:a.owner,active:m.active};}''')
 assert guard['active']and guard['owner']=='composition',guard
 settled_panel(page)
 result=page.evaluate('''()=>({released:aimEntryGuard.released,active:fixture.shell.controller.active,elapsed_ms:performance.now()-aimEntryGuard.started,memo:document.getElementById('text-memo').textContent,oldMemo:aimEntryGuard.memo})''')
 assert result['released']and not result['active']and result['elapsed_ms']>=120,result
 assert result['memo']==result['oldMemo'],result
 print('aim entry settled',result,flush=True)

def verify_aim_interrupt(page):
 # A direct gesture cancels an in-progress accommodation from its actual pose.
 # Compare inside pointer-down after the real shell listener, not before it.
 page.evaluate('''()=>{const m=fixture.shell.controller;m.go(m.target(c=>c.pan(0,6)),{owner:'composition',duration:1200});
   globalThis.aimInterrupt=null;document.getElementById('aim-handle').addEventListener('pointerdown',e=>{aimInterrupt={target:e.target.id,camera:fixture.summary().camera,active:m.active};},{once:true});}''')
 box=page.locator('#aim-handle').bounding_box();p=page.evaluate('fixture.camera.cellPoint(fixture.aim().cannon.cell)')
 page.mouse.move(box['x']+22,box['y']+22);page.mouse.down();page.mouse.move(p['sx'],p['sy']-60,steps=5);page.mouse.up()
 down=page.evaluate('aimInterrupt');assert down and down['target']=='aim-handle'and not down['active'],down
 assert page.evaluate('fixture.summary().camera')==down['camera']
 page.wait_for_timeout(300)
 assert page.evaluate('fixture.summary().camera')==down['camera']and not page.evaluate('fixture.shell.controller.active')
 expect(page.locator('#text-memo')).to_have_text('FIRE 1 225 1')
 print('aim interrupt held',down,flush=True)

def verify_player_controls(page,width,height):
 def close():
  if page.locator('#workspace').is_visible():page.locator('#close-panel').click()
 def select(n):
  page.evaluate('(n)=>fixture.select(n)',n)
  if page.locator('#locate-context').is_visible():page.locator('#locate-context').click();page.wait_for_function('()=>!fixture.shell.controller.active',timeout=8000)
 page.locator('#identify-button').click()
 if page.locator('#account-summary').is_visible():page.locator('#change-account').click()
 page.locator('#sending-account').fill('aaaaa-aa');page.locator('#identity-save').click();close()
 # Actual texture bound to the renderer stays exact through both former LOD edges.
 cells=page.evaluate('fixture.fragmented()');colours={}
 for scale in [2.99,3.01,9.99,10.01]:
  page.evaluate('(s)=>{fixture.camera.scale=s;fixture.camera.constrain();fixture.draw()}',scale)
  assert page.evaluate('fixture.inspect().surfaceBound')
  for n,owner in cells:
   data=page.evaluate('(n)=>fixture.surface(n)',n);assert data['owner']==owner
   colour=data['rgba'][:3]
   if n in colours:assert colour==colours[n]
   colours[n]=colour
 assert colours[499499]!=colours[500503]and colours[500500]!=colours[499499]
 page.evaluate('fixture.markSurface()');delta=page.evaluate('fixture.paintCell(500500,3)');assert delta['same']and delta['rows']<=3 and delta['uploadedBytes']<=12000;assert page.evaluate('fixture.inspect().surfaceBound');assert page.evaluate('fixture.surface(500500).rgba.slice(0,3)')==colours[500503]
 if width==1440:
  # Restore a lost GL context after an ownership change while uploads were suspended.
  page.evaluate('fixture.camera.scale=48;fixture.camera.constrain();fixture.paintCell(500500,1)')
  pixel='()=>{fixture.camera.pan(.001,0);fixture.draw();const c=document.getElementById("board"),g=c.getContext("webgl2"),p=fixture.camera.cellPoint(500500),r=c.getBoundingClientRect(),v=new Uint8Array(4);g.readPixels(Math.floor(p.sx*c.width/r.width),Math.floor((r.height-p.sy)*c.height/r.height),1,1,g.RGBA,g.UNSIGNED_BYTE,v);return [...v];}'
  expected=page.evaluate(pixel);assert expected[3]==255 and sum(expected[:3])>0
  page.evaluate('fixture.paintCell(500500,3)');assert page.evaluate(pixel)!=expected
  page.evaluate('()=>new Promise(resolve=>{const c=document.getElementById("board");c.addEventListener("webglcontextlost",e=>{e.preventDefault();resolve();},{once:true});window.contextExtension=c.getContext("webgl2").getExtension("WEBGL_lose_context");contextExtension.loseContext();})')
  page.evaluate('fixture.paintCell(500500,1)');page.wait_for_timeout(250)
  page.evaluate('()=>new Promise(resolve=>{document.getElementById("board").addEventListener("webglcontextrestored",resolve,{once:true});contextExtension.restoreContext();})')
  assert page.evaluate(pixel)==expected,'Restored terrain must include the complete atlas, including changes while GL was lost'
 print('terrain path PASS',width,flush=True)
 # The overview is persistent and draws a clipped quadrilateral, never a bbox.
 page.locator('#fit').click();page.wait_for_function('()=>!fixture.shell.controller.active',timeout=8000);assert page.locator('#minimap').is_visible()
 for x,y in [(0,0),(999.9,0),(0,999.9),(999.9,999.9)]:
  polys=page.evaluate('([x,y])=>{fixture.camera.centre(x,y);fixture.draw();return fixture.camera.minimapPolygons()}',[x,y]);assert polys and all(3<=len(p)<=8 for p in polys)
 before=page.evaluate('fixture.summary().camera');mini=page.locator('#minimap').bounding_box();page.mouse.click(mini['x']+mini['width']*.25,mini['y']+mini['height']*.5);page.wait_for_function('()=>!fixture.shell.controller.active',timeout=8000);after=page.evaluate('fixture.summary().camera');assert after!=before;anchor=page.evaluate('fixture.shell.mapAnchor()');assert abs(((after[0]-(anchor['x']-250)+500)%1000)-500)<12 and abs(((after[1]-(anchor['y']+250)+500)%1000)-500)<12
 page.locator('#minimap').focus();page.keyboard.press('ArrowRight');page.wait_for_function('()=>!fixture.shell.controller.active',timeout=8000);assert page.evaluate('fixture.summary().camera[0]')!=after[0]
 page.evaluate('fixture.render("idle","initial")');gap=page.evaluate('fixture.effectGap()');assert gap['moving']['effects']>0 and gap['moving']['tails']>0;assert gap['stopped']['effects']==0 and gap['stopped']['tails']==0
 page.evaluate('fixture.render("additional","initial")');select(1);page.locator('#fire-action').click()
 print('minimap path PASS',width,flush=True)
 # Finish the intended entry movement before measuring a stationary drag.
 # The original exact equality assertion below is retained.
 if width==390:verify_aim_entry_settling(page)
 else:settled_panel(page)
 # The real handle owns the drag; the camera does not change.
 handle=page.locator('#aim-handle');box=handle.bounding_box();assert box and box['width']>=44 and box['height']>=44
 assert handle.evaluate('(n)=>{const r=n.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===n}')
 p=page.evaluate('fixture.camera.cellPoint(fixture.aim().cannon.cell)');before=page.evaluate('fixture.summary().camera')
 card=page.locator('#workspace').bounding_box();mini=page.locator('#minimap').bounding_box();assert not(card['x']<=p['sx']<=card['x']+card['width'] and card['y']<=p['sy']<=card['y']+card['height']);assert card['y']+card['height']<=mini['y']+1 or card['x']+card['width']<=mini['x'] or card['x']>=mini['x']+mini['width']
 page.mouse.move(box['x']+22,box['y']+22);page.mouse.down();page.mouse.move(p['sx'],p['sy']-60,steps=5);page.mouse.up()
 assert page.evaluate('fixture.summary().camera')==before
 expect(page.locator('#text-memo')).to_have_text('FIRE 1 225 1')
 if width==390:verify_aim_interrupt(page)
 for displayed in ['0','45','90','180','270','359.99']:
  page.locator('#angle-degrees').fill(displayed);expected=page.evaluate('(a)=>fixture.expectedHeading(a)',displayed);assert page.locator('#text-memo').inner_text()==f'FIRE 1 {expected} 1';assert page.evaluate('fixture.aim().heading===fixture.command().angle')
 print('heading and drag PASS',width,flush=True)
 # Real compact-meter DOM path must never expand with internal reset diagnostics.
 allowed=page.evaluate('fixture.canPay()')
 for cause in ['credit','reserve','module','source','hidden','error']:
  expected=page.evaluate('(kind)=>fixture.cycles(kind)',cause);assert page.locator('#cycles-burn').inner_text()==expected
  assert len(page.locator('#cycles-balance').inner_text())<=28;assert page.evaluate('fixture.canPay()')==allowed
  meter=page.locator('#cycles-display').bounding_box();mini=page.locator('#minimap').bounding_box();card=page.locator('#workspace').bounding_box()
  overlap=lambda a,b:a['x']<b['x']+b['width'] and a['x']+a['width']>b['x'] and a['y']<b['y']+b['height'] and a['y']+a['height']>b['y']
  assert not overlap(meter,mini) and not overlap(meter,card);assert meter['x']>=0 and meter['x']+meter['width']<=width
 assert 'diagnostic' in page.locator('#cycle-detail').text_content()
 # Keyboard viewport contraction retains an editable heading, then restores space.
 if width<=700:
  page.locator('#angle-degrees').focus();page.set_viewport_size({'width':width,'height':400});page.wait_for_function('(w)=>fixture.camera.viewport.height===400&&fixture.camera.viewport.width===w',arg=width);page.locator('#angle-degrees').scroll_into_view_if_needed();bounds=page.locator('#angle-degrees').evaluate('(n)=>{const r=n.getBoundingClientRect(),p=n.closest(".panel-body").getBoundingClientRect();return {focus:n===document.activeElement,top:r.top,bottom:r.bottom,bodyTop:p.top,bodyBottom:p.bottom,card:n.closest("#workspace").style.cssText,short:document.documentElement.className}}');assert bounds['focus']and bounds['top']>=bounds['bodyTop']and bounds['bottom']<=bounds['bodyBottom'],bounds
  page.set_viewport_size({'width':width,'height':height});page.wait_for_function('(h)=>fixture.camera.viewport.height===h',arg=height)
 # A cancelled aim does not turn into a board tap; two fingers own the camera.
 if width<=700:
  # Finish keyboard accommodation, then explicitly focus the working area.
  # A pinch starts on the arena, not on the card/Close control below it.
  page.locator('#angle-degrees').blur()
  if page.locator('#focus-cannon').is_enabled():page.locator('#focus-cannon').click();page.wait_for_function('()=>!fixture.shell.controller.active',timeout=8000)
  cdp=page.context.new_cdp_session(page);h=page.locator('#aim-handle').bounding_box();x,y=h['x']+22,h['y']+22;selected=page.evaluate('fixture.summary().selected')
  assert page.evaluate('([x,y])=>document.elementFromPoint(x,y)===document.getElementById("aim-handle")',[x,y])
  assert page.evaluate('([x,y])=>document.elementFromPoint(x,y)===document.getElementById("board")',[x+60,y-15])
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':11}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x-20,'y':y-10,'id':11}]});memo=page.locator('#text-memo').inner_text();cam=page.evaluate('fixture.summary().camera')
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x-20,'y':y-10,'id':11},{'x':x+60,'y':y-15,'id':22}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+10,'y':y-30,'id':11},{'x':x+80,'y':y+10,'id':22}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
  assert page.evaluate('fixture.summary().camera')!=cam;assert page.locator('#text-memo').inner_text()==memo;assert page.evaluate('fixture.summary().selected')==selected
  h=page.locator('#aim-handle').bounding_box();cam=page.evaluate('fixture.summary().camera');memo=page.locator('#text-memo').inner_text();cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':h['x']+22,'y':h['y']+22,'id':33}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});assert page.evaluate('fixture.summary().camera')==cam and page.locator('#text-memo').inner_text()==memo

 page.locator('#aim-handle').focus();page.keyboard.press('ArrowRight');assert page.evaluate('fixture.aim().heading===fixture.command().angle')
 page.locator('#angle-degrees').fill('');assert page.locator('#prepared-card').is_hidden();close();select(1);page.locator('#move-action').click()
 source=page.evaluate('fixture.world().cannons[0].cell');action_field(page,'#move-cell').fill(str(source));assert page.locator('#transfer-controls').evaluate('(n)=>n.disabled');expect(page.locator('#preparation-note')).to_contain_text('different tile');cell=page.evaluate('fixture.moveSites(1)[0]');action_field(page,'#move-cell').fill(str(cell));expect(page.locator('#text-memo')).to_have_text(f'MOVE 1 {cell}');assert page.locator('[data-copy="text"]').is_enabled();page.evaluate('fixture.draw()');assert page.evaluate('fixture.inspect().previewSpan')<=1.00001
 close();page.evaluate('fixture.render("wrap","initial")');select(1);page.locator('#build-action').click();assert page.locator('#prepared-card').is_hidden();assert page.locator('#transfer-controls').evaluate('(n)=>n.disabled')
 assert 997 in page.evaluate('fixture.sites()');action_field(page,'#new-cell').select_option('997');expect(page.locator('#text-memo')).to_contain_text(' 997');page.evaluate('fixture.draw()');p=page.evaluate('fixture.camera.cellPoint(997)');drawing=page.evaluate('fixture.inspect()');assert page.evaluate('fixture.aim().cannon.cell')==997
 assert drawing['ghost']and abs(drawing['ghost'][0]-p['x'])<.01 and abs(drawing['ghost'][1]-p['y'])<.01
 assert abs(((drawing['guide'][0]-p['x'])**2+(drawing['guide'][1]-p['y'])**2)**.5-.42)<.01,'UX-12 ground guide begins beyond the body at its encoded heading'
 print('Move and seam Build PASS',width,flush=True)
 # A genuine canonical later snapshot occupies the chosen site; no silent fallback.
 close();page.evaluate('fixture.render("additional","initial")');select(1);page.locator('#build-action').click();action_field(page,'#new-cell').select_option('453579');page.evaluate('fixture.publish("additional","final")');assert action_field(page,'#new-cell').input_value()=='453579';assert page.locator('#prepared-card').is_hidden();expect(page.locator('#preparation-note')).to_contain_text('eligible')
 assert page.locator('#new-cell option:checked').is_disabled()
 close();page.evaluate('fixture.motion("idle",.01)');page.evaluate('fixture.markClock()');start=page.evaluate('fixture.summary().time')
 page.locator('#identify-button').click();close();select(1);page.locator('#fire-action').click();page.locator('#angle-degrees').fill('45')
 # UX-03/04/11: identities survive the click synchronously; reachability follows
 # the deliberate camera transition rather than a teleport.
 immediate=page.evaluate('()=>{fixture.camera.centre(800,800);fixture.draw();const card=document.getElementById("workspace"),wasOffscreen=card.classList.contains("offscreen");document.getElementById("locate-context").click();return{wasOffscreen,visible:!card.hidden&&getComputedStyle(card).visibility!=="hidden",inert:card.inert,sameClock:fixture.sameClock()};}')
 assert immediate['wasOffscreen']and immediate['sameClock'],immediate
 page.wait_for_function('()=>!fixture.shell.controller.active&&!document.getElementById("workspace").inert',timeout=8000);assert page.locator('#workspace').is_visible()
 # Keep the actual pointer path and the original visibility/inertness checks.
 page.evaluate('fixture.camera.centre(800,800);fixture.draw()');assert page.locator('#locate-context').is_visible();page.locator('#locate-context').click();page.wait_for_function('()=>!fixture.shell.controller.active',timeout=8000)
 assert page.locator('#workspace').is_visible();assert not page.locator('#workspace').evaluate('(n)=>n.inert')
 close();page.locator('#minimap').focus();page.keyboard.press('ArrowLeft');page.wait_for_timeout(300);assert page.evaluate('fixture.sameClock()')and page.evaluate('fixture.summary().time')>start
 print('eligibility and clock PASS',width,flush=True)
 verify_pan_ownership(page,width,height)
 # The centre state comes from the resolver, and never masks pause/error/idle.
 page.evaluate('fixture.render("idle","initial")')
 base='({phase:"STALLED",live:true,verified:true,fresh:true,healthy:true,operationalFresh:true,advancing:false,operational:{run:{running:true,last_error:[],pace:{mode:"Trickle",supported_milli:10,admission_open:true}},source:{binding_checked:true,last_error:[]}}})'
 # UXR-24 supersedes the permanent central Trickle spinner. Keep the
 # same resolver and strengthen distinct catch-up / protection / error checks.
 page.evaluate('fixture.status('+base+')');page.wait_for_timeout(550);page.evaluate('fixture.status('+base+')');assert page.locator('#motion-wait').is_hidden();expect(page.locator('#arena-note')).to_have_text('Waiting for next update')
 page.evaluate('fixture.status({...'+base+',catchingUp:true})');page.wait_for_timeout(550);page.evaluate('fixture.status({...'+base+',catchingUp:true})');assert page.locator('#motion-wait').is_visible();expect(page.locator('#waiting-label')).to_have_text('Catching up with on-chain activity ...')
 page.evaluate('fixture.status({...'+base+',operational:{run:{running:true,pace:{mode:"ReserveProtection",supported_milli:0,admission_open:false}},source:{binding_checked:true,last_error:[]}}})');assert page.locator('#motion-wait').is_hidden();expect(page.locator('#arena-note')).to_have_text('Game paused · low energy');assert not page.evaluate('fixture.canPay()')
 page.evaluate('fixture.status({...'+base+',phase:"ERROR",failureKind:"verification"})');assert page.locator('#motion-wait').is_hidden();expect(page.locator('#arena-note')).to_have_text('Unable to verify game')
 page.reload();page.wait_for_function('()=>!!window.fixture')

def verify_pan_ownership(page,width,height):
 """UX-02/04/12: real captured drag, cursor threshold and continuous seam pan."""
 import time
 if page.locator('#workspace').is_visible():page.locator('#close-panel').click()
 page.evaluate('fixture.render("wrap","initial");fixture.camera.scale=48;fixture.camera.frameCell(999999);fixture.draw()')
 before=page.evaluate('fixture.summary().camera');x,y=width*.4,height*.35
 page.mouse.move(x,y);page.mouse.down();down=page.locator('#board').get_attribute('data-cursor');assert down!='grabbing'
 start=time.monotonic();page.mouse.move(x+80,y+10);page.wait_for_function('()=>document.getElementById("board").dataset.cursor==="grabbing"',timeout=2000);latency=(time.monotonic()-start)*1000
 dragging=page.locator('#board').evaluate('(n)=>getComputedStyle(n).cursor');assert dragging=='grabbing';after=page.evaluate('fixture.summary().camera');page.mouse.up()
 assert before!=after and after[1]<10,after
 return {'cursor_at_press':down,'cursor_during_drag':dragging,'before':before,'after':after,'automation_observed_pan_response_ms':latency,'latency_scope':'One CDP/renderer observed response, includes automation scheduling; not native hardware latency'}

def verify_saved_world_heading(page):
 """Stored angle metadata is canonical world space, never a new display angle."""
 page.locator('#identify-button').click();page.locator('#sending-account').fill('aaaaa-aa');page.locator('#identity-save').click();page.locator('#close-panel').click()
 page.evaluate('fixture.render("additional","initial");fixture.select(1)')
 if page.locator('#locate-context').is_visible():page.locator('#locate-context').click();page.wait_for_function('()=>!fixture.shell.controller.active',timeout=8000)
 page.locator('#fire-action').click();page.locator('#angle-degrees').fill('167.15');expect(page.locator('#text-memo')).to_have_text('FIRE 1 37.5 1');memo=page.locator('#text-memo').inner_text();hex_value=memo.encode().hex();page.locator('[data-copy="text"]').click();expect(page.locator('#copy-feedback')).to_contain_text('saved')
 page.reload();page.wait_for_function('()=>!!window.fixture');page.locator('#identify-button').click();page.get_by_text('View saved instructions',exact=True).click()
 expect(page.locator('#text-memo')).to_have_text(memo);assert page.evaluate('fixture.records()[0].hex')==hex_value;assert not page.locator('#hex-memo').count();assert page.locator('#angle-degrees').input_value()=='167.15';expect(page.locator('#preparation-note')).to_contain_text('may no longer apply');assert page.locator('#transfer-controls').evaluate('(n)=>n.disabled')

def capture_player_review(page,width,height,out):
 """Short real rendered journey; canonical synthetic intervals, never a transfer."""
 import time
 page.locator('#identify-button').click();page.locator('#sending-account').fill('aaaaa-aa');page.locator('#identity-save').click();page.locator('#close-panel').click()
 page.evaluate('fixture.motion("bridge_both",.01)');page.evaluate('fixture.camera.frameCell(fixture.world().cannons[0].cell);fixture.markClock();fixture.cycles("available")')
 page.wait_for_timeout(600);point=page.evaluate('fixture.point(1)');page.mouse.move(point['x'],point['y']);page.wait_for_timeout(350);page.mouse.click(point['x'],point['y']);page.locator('#fire-action').click();page.wait_for_timeout(400)
 handle=page.locator('#aim-handle').bounding_box();origin=page.evaluate('fixture.camera.cellPoint(fixture.aim().cannon.cell)');page.mouse.move(handle['x']+22,handle['y']+22);page.mouse.down();page.mouse.move(origin['sx']+55,origin['sy']-25,steps=8);page.mouse.up()
 page.locator('#angle-degrees').fill('45');page.locator('#ball-quantity').fill('2');page.wait_for_timeout(450)
 page.screenshot(path=str(out/f'{width}x{height}-populated.png'))
 for kind in ['amount','owner','text']:page.locator(f'[data-copy="{kind}"]').click();expect(page.locator('#copy-feedback')).to_contain_text('Copied')
 page.locator('#angle-degrees').fill('90');expect(page.locator('#replace-choice')).to_be_visible();page.wait_for_timeout(400);page.locator('#replace-instructions').click();page.locator('[data-copy="text"]').click();expect(page.locator('#text-memo')).to_have_text('FIRE 1 315 2')
 page.locator('#payment-risk').scroll_into_view_if_needed();page.screenshot(path=str(out/f'{width}x{height}-wallet.png'));page.wait_for_timeout(350)
 before=page.evaluate('fixture.summary().time');page.locator('#close-panel').click();point=page.evaluate('fixture.point(1)');page.mouse.click(point['x'],point['y']);page.wait_for_timeout(500);assert page.evaluate('fixture.sameClock()')and page.evaluate('fixture.summary().time')>before
 page.locator('#move-action').click();action_field(page,'#move-cell').fill('101');
 if page.locator('#replace-choice').is_visible():page.locator('#replace-instructions').click()
 expect(page.locator('#text-memo')).to_have_text('MOVE 1 101');target=page.evaluate('fixture.camera.cellPoint(101)');page.mouse.move(target['sx'],target['sy']);page.wait_for_timeout(350);page.mouse.click(target['sx'],target['sy']);page.wait_for_timeout(500);page.locator('#close-panel').click();page.evaluate('fixture.select(1)');page.locator('#build-action').click();site=page.evaluate('fixture.sites()[0]');action_field(page,'#new-cell').select_option(str(site));assert page.evaluate('fixture.aim().cannon.cell')==site;page.wait_for_timeout(700);page.locator('#close-panel').click()
 mini=page.locator('#minimap').bounding_box();page.mouse.move(mini['x']+mini['width']*.5,mini['y']+mini['height']*.85);page.mouse.down();page.mouse.move(mini['x']+mini['width']*.5,mini['y']+mini['height']*.97,steps=8);page.mouse.up();page.wait_for_timeout(600);assert page.evaluate('fixture.sameClock()')
 # A declared fixture-scene switch supplies a canonical seam trajectory. Acceleration
 # shortens the visual review, not production cadence or verified-coverage limits.
 page.evaluate('fixture.motion("wrap",.01)');page.evaluate('fixture.camera.frameCell(999999);fixture.playbackScale(20);fixture.markClock()');page.wait_for_function('()=>fixture.summary().queue===0',timeout=15000);page.wait_for_function('()=>document.getElementById("arena-note").textContent==="Waiting for next update"',timeout=3000);assert page.locator('#motion-wait').is_hidden();page.wait_for_timeout(700);page.screenshot(path=str(out/f'{width}x{height}-waiting.png'));previous=page.evaluate('fixture.summary().time');page.evaluate('fixture.appendMotion()');page.wait_for_function('(t)=>fixture.summary().time>t+.05',arg=previous);assert page.evaluate('fixture.sameClock()');page.wait_for_function('()=>document.getElementById("motion-wait").hidden');page.wait_for_timeout(800)
 return{'viewport':[width,height],'status':'PASS','screenshots':[f'{width}x{height}-populated.png',f'{width}x{height}-wallet.png',f'{width}x{height}-waiting.png'],'scope':'Actual application renderer/composer with synthetic canonical fixtures; seam waiting/resume at 20x disposable wall time; no IC certificate, transfer or physical-device claim.'}
