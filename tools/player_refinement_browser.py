"""UXR behaviour near real component paths, canonical fixtures, actual input events."""
import math,time
from fluid_playability_browser import action_field,payment_warning,TILE_PAYMENT_WARNING,ORDINARY_PAYMENT_WARNING,settled

def verify_refinement(page,width,height,out):
 from playwright.sync_api import expect
 def close():
  if page.locator('#workspace').is_visible():page.locator('#close-panel').click()
 def prepare(kind='move'):
  close();page.evaluate('fixture.render("additional","initial");fixture.select(1);document.dispatchEvent(new CustomEvent("b2z-locate"))');settled(page);page.locator('#'+{'move':'move-action','new':'build-action','fire':'fire-action'}[kind]).click();page.wait_for_timeout(230)
  if kind=='move':action_field(page,'#move-cell').fill('')
  if kind=='new':action_field(page,'#new-cell').select_option('')
  for selector in ['#payment-risk','#payment-fee','#text-memo','#payment-owner']:
   assert page.locator(selector).evaluate('(n)=>parseFloat(getComputedStyle(n).fontSize)>=14'),'financial text must retain a readable size'
  if page.locator('#toolbar-hint').is_visible():
   hint=page.locator('#toolbar-hint').bounding_box();header=page.locator('.panel-header').bounding_box();assert hint['y']+hint['height']<=header['y']+1,'icon hint must not obscure the action prompt'
 def open_point(cell):
  p=page.evaluate('(n)=>fixture.camera.cellPoint(n)',cell)
  return p if page.evaluate('p=>document.elementFromPoint(p.sx,p.sy)===document.getElementById("board")',p)else None
 def placement(operation,kind='move'):
  prepare(kind)
  if operation=='removed':
   close();page.evaluate('fixture.publish("additional","final");fixture.select(2);document.dispatchEvent(new CustomEvent("b2z-locate"))');settled(page);page.locator('#move-action').click();action_field(page,'#move-cell').fill('')
  sites=page.evaluate(('fixture.moveSites(2)'if operation=='removed'else'fixture.moveSites(1)')if kind=='move'else'fixture.sites()');target=next((n for n in sites if open_point(n)),None);assert target is not None,(width,sites)
  if operation=='revision':target=453579;assert target in sites and open_point(target)
  p=open_point(target)
  # Run a controlled disturbance immediately AFTER the real pointerup handler,
  # before its deferred single-click commits. No forged target/payment callback.
  page.evaluate('(operation)=>document.getElementById("board").addEventListener("pointerup",()=>queueMicrotask(()=>{'+
   'if(operation==="pan")fixture.camera.pan(80,0);'+
   'if(operation==="zoom")fixture.shell.controller.zoom(1.4);'+
   'if(operation==="focus")document.dispatchEvent(new CustomEvent("b2z-locate"));'+
   'if(operation==="mode")fixture.action("ball");'+
   'if(operation==="revision")fixture.publish("additional","final");'+
   'if(operation==="removed")fixture.publish("additional","initial");'+
   'fixture.draw();}),{once:true})',operation)
  page.mouse.click(p['sx'],p['sy']);page.wait_for_timeout(650);settled(page)
  if operation in ['pan','zoom']:
   page.wait_for_function('(x)=>document.getElementById(x.id).value===String(x.target)',arg={'id':'move-cell'if kind=='move'else'new-cell','target':target},timeout=5000)
  value=page.locator('#move-cell'if kind=='move'else'#new-cell').input_value();memo=page.locator('#text-memo').text_content();ready=page.locator('#prepared-card').is_visible()and not page.locator('#transfer-controls').evaluate('(n)=>n.disabled')
  if operation in ['mode','removed','focus']:assert value in ['',str(target)],(operation,target,value,memo)
  else:assert value in ['',str(target)],(operation,target,value,memo)
  if operation in ['revision','removed']:assert not ready,(operation,value,memo)
  if value==str(target)and ready:assert memo.endswith(' '+str(target)),(operation,target,value,memo)
  return{'operation':operation,'action':kind,'original':target,'chosen':value,'copyable':ready,'memo':memo}
 rows=[]
 if width==1440:
  for operation in ['pan','zoom','focus','mode','revision','removed']:rows.append(placement(operation));(out/f'{width}-target-integrity.json').write_text(__import__('json').dumps(rows,indent=2)+'\n')
  rows.append(placement('focus','new'))
  prepare('move');sites=page.evaluate('fixture.moveSites(1)');n=next(n for n in sites if open_point(n));p=open_point(n);page.evaluate('window.gestureTrace=[];for(const name of ["pointerdown","pointerup","click","dblclick"])document.getElementById("board").addEventListener(name,e=>gestureTrace.push({name,at:e.timeStamp,now:performance.now(),detail:e.detail,type:e.pointerType,cell:document.getElementById("move-cell").value}),true)');page.mouse.dblclick(p['sx'],p['sy'],delay=55);settled(page);(out/f'{width}-double-click.json').write_text(__import__('json').dumps(page.evaluate('gestureTrace'),indent=2)+'\n');assert page.locator('#move-cell').input_value()==''
 # One click immediately selects and usefully focuses a distant cannon. Several
 # positions include the awkward lower/off-centre compositions in the review.
 compositions=[]
 for sx,sy in [(width*.75,height*.33),(width*.45,height*.6),(width*.25,height*.42)]:
  close();page.evaluate('fixture.render("additional","initial");fixture.camera.scale=36;const c=fixture.world().cannons.find(c=>c.id===1);fixture.camera.centre(c.cell%1000+.5,Math.floor(c.cell/1000)+.5);fixture.draw()');p=page.evaluate('fixture.point(1)');page.evaluate('([dx,dy])=>{fixture.camera.pan(dx,dy);fixture.draw()}',[sx-p['x'],sy-p['y']]);p=page.evaluate('fixture.point(1)');before=page.evaluate('fixture.summary().camera');started=time.monotonic()
  (page.touchscreen.tap(p['x'],p['y'])if width<700 else page.mouse.click(p['x'],p['y']));expect(page.locator('#workspace')).to_be_visible();assert page.evaluate('fixture.summary().selected')==1;settled(page);transition_elapsed=time.monotonic()-started;page.wait_for_timeout(200);expect(page.locator('#focus-cannon')).to_be_disabled();assert page.evaluate('fixture.summary().camera')!=before
  controls=['focus-cannon','fire-action','move-action','build-action','close-panel']
  if not compositions:
   r=page.locator('#fire-action').bounding_box();page.mouse.move(r['x']+22,r['y']+22);page.mouse.down();page.wait_for_timeout(650);page.mouse.up();expect(page.locator('#toolbar-hint')).to_have_text('Fire');assert page.locator('#action-view').is_hidden()
  beforeboxes=[page.locator('#'+n).bounding_box()for n in controls];page.locator('#fire-action').click();samples=[]
  for delay in [35,65,150]:
   page.wait_for_timeout(delay);samples.append([page.locator('#'+n).bounding_box()for n in controls])
  drift=max(math.hypot(b['x']-c['x'],b['y']-c['y'])for sample in samples for b,c in zip(sample,beforeboxes));assert drift<=2,(width,drift)
  geom=page.locator('.panel-scroll').evaluate('(n)=>({height:n.clientHeight,content:n.scrollHeight})');assert geom['height']>=240,(width,geom)
  for selector in ['#transfer-amount','#payment-owner','#text-memo','#paying-account','#payment-fee','#payment-risk']:
   page.locator(selector).scroll_into_view_if_needed();assert page.locator(selector).evaluate('(n)=>{const r=n.getBoundingClientRect(),p=document.querySelector(".panel-scroll").getBoundingClientRect();return r.top>=p.top-2&&r.bottom<=p.bottom+2}'),selector
  payment_warning(page,ORDINARY_PAYMENT_WARNING);compositions.append({'clicked_at':[sx,sy],'transition_wall_seconds':transition_elapsed,'journey_seconds_including_layout_checks':time.monotonic()-started,'toolbar_max_drift':drift,'panel':geom});page.screenshot(path=str(out/f'{width}-refined-payment.png'))
 # Build ghost and toolbar keep distinct identities; no quote or frozen packet
 # follows hover. Two sites change only the preview, not its real-cannon anchor.
 prepare('new');header=page.locator('.panel-header').bounding_box();sites=page.evaluate('fixture.sites()');assert len(sites)>=2
 for n in sites[:2]:
  action_field(page,'#new-cell').select_option(str(n));page.wait_for_timeout(180);r=page.locator('.panel-header').bounding_box();assert abs(r['x']-header['x'])<=2 and abs(r['y']-header['y'])<=2;assert page.evaluate('fixture.aim().cannon.cell')==n
 payment_warning(page,TILE_PAYMENT_WARNING);page.screenshot(path=str(out/f'{width}-stable-build.png'))
 # Coherent native clipboard packet survives local action editing/replacement.
 page.locator('[data-copy="text"]').click();expect(page.locator('#copy-feedback')).to_contain_text('Copied.');old=page.locator('#text-memo').text_content();page.locator('#angle-degrees').fill('45');expect(page.locator('#replace-choice')).to_be_visible();page.locator('#keep-instructions').click();expect(page.locator('#text-memo')).to_have_text(old);page.locator('#angle-degrees').fill('90');page.locator('#replace-instructions').click();expect(page.locator('#text-memo')).to_contain_text('NEW 315 1');payment_warning(page,TILE_PAYMENT_WARNING)
 # Immediate ball acquisition, a true max-zoom double-click no-op, then real
 # wheel input and cancellation. Controlled frozen coverage cannot move a ball.
 close();page.evaluate('fixture.motion("wrap",.01)');page.evaluate('fixture.playbackScale(0);fixture.camera.scale=48;const b=fixture.displayedBalls()[0];fixture.camera.centre(b.x,b.y);fixture.draw();fixture.markClock()');p=page.evaluate('()=>{const b=fixture.displayedBalls()[0];return fixture.camera.point(b.x,b.y,.14)}');page.mouse.click(p['sx'],p['sy']);assert page.evaluate('Boolean(fixture.shell.controller.following)');settled(page);assert page.evaluate('fixture.camera.scale')==48
 page.evaluate('fixture.camera.scale=fixture.camera.maxScale;fixture.draw()');p=page.evaluate('()=>{const b=fixture.displayedBalls()[0];return fixture.camera.point(b.x,b.y,.14)}');ball=page.evaluate('fixture.shell.followedBall()');page.mouse.dblclick(p['sx'],p['sy'],delay=50);settled(page);assert page.evaluate('fixture.shell.followedBall()')==ball;assert page.evaluate('Boolean(fixture.shell.controller.following)');assert page.evaluate('fixture.sameClock()')
 page.keyboard.press('Escape');page.evaluate('fixture.camera.scale=48;fixture.draw();window.wheelTrace=[];document.addEventListener("wheel",e=>wheelTrace.push({dy:e.deltaY,mode:e.deltaMode,target:e.target.id,ctrl:e.ctrlKey,scale:fixture.camera.scale}),true)');page.mouse.move(width*.35,height*.3);page.mouse.wheel(0,-100*page.evaluate('devicePixelRatio'));page.mouse.wheel(0,-100*page.evaluate('devicePixelRatio'));page.wait_for_timeout(350);settled(page);(out/f'{width}-wheel.json').write_text(__import__('json').dumps(page.evaluate('({events:wheelTrace,camera:fixture.summary().camera,animation:fixture.shell.controller.animation,following:fixture.shell.controller.following})'),indent=2)+'\n');assert abs(page.evaluate('fixture.camera.scale')-48*math.exp(.4))<1e-6
 page.mouse.wheel(0,-100*page.evaluate('devicePixelRatio'));page.mouse.wheel(0,100*page.evaluate('devicePixelRatio'));page.wait_for_timeout(200);settled(page);assert abs(page.evaluate('fixture.camera.scale')-48*math.exp(.4))<1e-6
 assert page.evaluate('fixture.sameClock()');page.screenshot(path=str(out/f'{width}-navigation.png'))
 # Ordinary waiting is compact; actual catch-up remains truthful, never a
 # permanent spinner for routine slow production or optional telemetry.
 page.evaluate('fixture.playbackScale(1000)');page.wait_for_function('()=>fixture.summary().queue===0',timeout=8000);page.wait_for_timeout(750);assert page.locator('#motion-wait').is_hidden();expect(page.locator('#arena-note')).to_have_text('Waiting for next update')
 # Explicit panel-aware Focus and precision/caret survive a latest-state refresh.
 prepare('fire');page.evaluate('fixture.camera.pan(Math.min(190,innerWidth*.35),0);fixture.draw()');expect(page.locator('#focus-cannon')).to_be_enabled();page.locator('#focus-cannon').click();settled(page);expect(page.locator('#focus-cannon')).to_be_disabled()
 page.locator('#angle-degrees').focus();page.locator('#angle-degrees').fill('37.25');page.evaluate('fixture.publish("additional","final")');assert page.locator('#angle-degrees').evaluate('(n)=>document.activeElement===n');assert page.locator('#angle-degrees').input_value()=='37.25'
 # Real viewport contraction (not a native software keyboard claim) and a
 # landscape window retain one scroll and reachable exact financial fields.
 contraction=[]
 for vw,vh in [(width,430),(width,300),(844,390)]:
  page.set_viewport_size({'width':vw,'height':vh});page.wait_for_timeout(300)
  if page.locator('#locate-context').is_visible():page.locator('#locate-context').click();settled(page)
  for selector in ['#text-memo','#payment-owner','#paying-account','#payment-risk']:
   page.locator(selector).scroll_into_view_if_needed();assert page.locator(selector).evaluate('(n)=>{const r=n.getBoundingClientRect(),p=document.querySelector(".panel-scroll").getBoundingClientRect();return r.top>=p.top-2&&r.bottom<=p.bottom+2&&r.left>=0&&r.right<=innerWidth}')
  point=page.evaluate('fixture.point(1)');assert page.evaluate('p=>document.elementFromPoint(p.x,p.y)===document.getElementById("board")',point),'selected source must remain visible with keyboard contraction'
  geom=page.locator('.panel-scroll').evaluate('(n)=>({height:n.clientHeight,content:n.scrollHeight})');assert geom['height']>=96;contraction.append({'viewport':[vw,vh],**geom})
 page.set_viewport_size({'width':width,'height':height});page.emulate_media(reduced_motion='reduce');page.wait_for_function('([w,h])=>fixture.camera.viewport.width===w&&fixture.camera.viewport.height===h',arg=[width,height]);page.evaluate('document.dispatchEvent(new CustomEvent("b2z-locate"));fixture.draw()');page.evaluate('fixture.camera.pan(Math.min(170,innerWidth*.35),0);fixture.draw()');page.locator('#focus-cannon').click();assert not page.evaluate('fixture.shell.controller.active');page.emulate_media(forced_colors='active');assert page.locator('#payment-risk').is_visible();page.emulate_media(forced_colors='none',reduced_motion='no-preference')
 assert page.locator('#legacy-details,#hex-memo,#transaction-index,[data-copy="hex"]').count()==0
 return{'target_integrity':rows,'compositions':compositions,'ball_immediate_follow':True,'max_zoom_follow_preserved':True,'wheel_accumulation_and_reversal':True,'same_clock_queue':True,'contracted_layouts':contraction}
