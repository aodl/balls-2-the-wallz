"""Native-input checks on populated real frontend components, not an IC attestation."""
from fluid_playability_browser import settled_panel,settled,TILE_PAYMENT_WARNING
from human_input import set_heading
import time

def verify_territory_controls(page,out,width):
 row={'arrows':[],'zoom':[]}
 # Establish remembered identity via native selection, then prove a genuine cold reload.
 if page.locator('#workspace').is_visible():page.locator('#close-panel').click()
 page.evaluate('fixture.render("additional","initial");fixture.camera.scale=64;fixture.camera.frameCell(453578);fixture.draw()');point=page.evaluate('fixture.point(1)');page.mouse.click(point['x'],point['y']);page.wait_for_function('()=>fixture.summary().selected===1');account=page.evaluate('fixture.summary().account');page.reload(wait_until='domcontentloaded');page.wait_for_function('()=>!!globalThis.fixture');row['cold_selection']=page.evaluate('fixture.summary()');page.screenshot(path=str(out/f'{width}-cold-remembered.png'));assert row['cold_selection']['selected'] is None;assert row['cold_selection']['account']==account
 if page.locator('#workspace').is_visible():page.locator('#close-panel').click()
 page.evaluate('fixture.render("additional","initial");fixture.camera.scale=64;fixture.camera.frameCell(453578);fixture.draw()')
 pt=page.evaluate('fixture.point(1)');page.mouse.click(pt['x'],pt['y']);page.wait_for_function('()=>fixture.summary().selected===1')
 page.wait_for_function('()=>!document.getElementById("move-action").disabled',timeout=20000)
 page.locator('#move-action').click();settled_panel(page);cell=page.evaluate('fixture.proposal().cell');assert cell is not None and cell!=page.evaluate('fixture.world().cannons[0].cell');assert page.locator('#prepared-card').is_visible();assert page.locator('#payment-risk').inner_text()==TILE_PAYMENT_WARNING;row['move']={'cell':cell,'memo':page.locator('#text-memo').inner_text(),'destination':page.evaluate('fixture.destinations()')};page.screenshot(path=str(out/f'{width}-automatic-move.png'))
 page.locator('#build-action').click();settled_panel(page);cell=page.evaluate('fixture.proposal().cell');assert cell is not None;assert page.locator('#prepared-card').is_visible();assert page.locator('#payment-risk').inner_text()==TILE_PAYMENT_WARNING;assert page.locator('#text-memo').inner_text().endswith(' '+str(cell));row['build']={'cell':cell,'memo':page.locator('#text-memo').inner_text()};page.screenshot(path=str(out/f'{width}-automatic-build.png'))
 page.locator('#fire-action').click();settled_panel(page)
 for angle in [0,45,90,135,180,225,270,315]:
  set_heading(page,angle);page.wait_for_timeout(60);arrow=page.evaluate('fixture.arrow()');assert arrow
  for segment in [1,2,4]:
   a,z=arrow['screen'][segment-1],arrow['screen'][segment];p={'x':a['x']*.2+z['x']*.8,'y':a['y']*.2+z['y']*.8}
   node=page.evaluate('(p)=>document.elementFromPoint(p.x,p.y)?.id',p)
   if node!='board':row['arrows'].append({'angle':angle,'segment':segment,'foreground':node,'result':'OCCLUDED'});continue
   page.mouse.move(p['x'],p['y']);page.wait_for_function('()=>document.getElementById("board").dataset.cursor==="aim"');camera=page.evaluate('fixture.summary().camera');before=page.locator('#text-memo').inner_text();page.mouse.down();page.mouse.move(p['x']+17,p['y']+11,steps=4);page.mouse.up();assert page.evaluate('fixture.summary().camera')==camera;assert page.evaluate('fixture.aim().heading===fixture.command().angle');row['arrows'].append({'angle':angle,'segment':segment,'before':before,'after':page.locator('#text-memo').inner_text(),'result':'PASS'});set_heading(page,angle)
 if width<700:
  set_heading(page,90);page.wait_for_timeout(50);arrow=page.evaluate('fixture.arrow()');a,z=arrow['screen'][0],arrow['screen'][1];x,y=a['x']*.02+z['x']*.98,a['y']*.02+z['y']*.98
  if page.evaluate('(p)=>document.elementFromPoint(p.x,p.y)?.id==="board"',{'x':x,'y':y}):
   cdp=page.context.new_cdp_session(page);touch=lambda px,py,i:{'x':px,'y':py,'id':i,'radiusX':4,'radiusY':4,'force':1};cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[touch(x,y,1)]});memo=page.locator('#text-memo').inner_text();before=page.evaluate('fixture.summary().camera');cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[touch(x,y,1),touch(x-65,y-25,2)]});cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[touch(x+12,y,1),touch(x-80,y-25,2)]});cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});after=page.evaluate('fixture.summary().camera');assert after[2]!=before[2];assert page.locator('#text-memo').inner_text()==memo;assert page.evaluate('fixture.aim().heading===fixture.command().angle');row['touch_arrow_then_pinch']={'before':before,'after':after,'memo':memo}
 assert any(x['result']=='PASS' for x in row['arrows']);page.screenshot(path=str(out/f'{width}-arrow-aim.png'))
 page.locator('#close-panel').click();page.evaluate('fixture.camera.scale=fixture.camera.fitScale;fixture.draw()');page.wait_for_function('()=>document.getElementById("fit").disabled&&document.getElementById("zoom-out").disabled');assert page.locator('#zoom-in').is_enabled();before=page.evaluate('fixture.summary().camera');r=page.locator('#fit').bounding_box();page.mouse.click(r['x']+r['width']/2,r['y']+r['height']/2);assert page.evaluate('fixture.summary().camera')==before;row['zoom'].append({'bound':'minimum','camera':before})
 for _ in range(40):
  if page.locator('#zoom-in').is_disabled():break
  page.locator('#zoom-in').click()
 assert page.locator('#zoom-in').is_disabled();assert page.locator('#zoom-out').is_enabled();page.locator('#zoom-out').click();assert page.locator('#zoom-in').is_enabled();settled(page);row['zoom'].append({'bound':'maximum-target-and-reversal','camera':page.evaluate('fixture.summary().camera')})
 if width==1440:
  proof_started=time.monotonic();page.evaluate('fixture.render("noMove","initial");fixture.camera.scale=64;fixture.camera.frameCell(fixture.world().cannons[0].cell);fixture.draw()');point=page.evaluate('fixture.point(1)');page.mouse.click(point['x'],point['y']);page.wait_for_function('()=>fixture.destinations().ready',timeout=30000);assert page.locator('#move-action').is_disabled();assert page.locator('#move-action').get_attribute('title')=='No legal move destination';row['no_move_proof']=page.evaluate('fixture.destinations()');row['no_move_proof']['wall_seconds']=time.monotonic()-proof_started;page.screenshot(path=str(out/'no-legal-move.png'))
 return row
