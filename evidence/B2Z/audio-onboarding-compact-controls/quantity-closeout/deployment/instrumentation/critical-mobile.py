import json,sys,time,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.path.insert(0,'.work/quantity-deployment-20261115');from importlib.machinery import SourceFileLoader
qa=SourceFileLoader('qa','.work/quantity-deployment-20261115/live-common.py').load_module();out=Path('.work/quantity-deployment-20261115/critical-mobile');out.mkdir(exist_ok=False);report={'status':'RUNNING','scope':'Actual installed European frontend, fresh320×640 browser, authenticated current Rules7, ordinary input only; no camera/world/status override or payment','headings':[],'errors':[],'forbidden':[]}
def save():(out/'results.json').write_text(json.dumps(report,indent=2)+'\n')
with sync_playwright()as pw:
 b=pw.chromium.launch(headless=True,chromium_sandbox=True);c=b.new_context(viewport={'width':320,'height':640},has_touch=True,record_video_dir=str(out/'video'));p=c.new_page();p.on('pageerror',lambda e:report['errors'].append(str(e)))
 def guard(route):
  r=route.request
  if r.method=='POST'and not r.url.endswith(('/query','/read_state')):report['forbidden'].append(r.url);route.abort()
  else:route.continue_()
 c.route('**/*',guard)
 try:
  with p.expect_response(lambda r:r.url.split('?')[0]==qa.URL+'app.mjs')as loaded:p.goto(qa.URL,wait_until='domcontentloaded')
  report['served_js_sha256']=hashlib.sha256(loaded.value.body()).hexdigest();assert report['served_js_sha256']=='3ee92eee3dda006c57f2dd17779e0e4babb947dc54942c6bd4998b975ebedbb2'
  source,roster=qa.enter_fire(p);report['source']=source;report['roster']=roster;report['entry']=qa.snap(p);assert source['cell']==0,'EXACT_POSE_UNAVAILABLE cannon0 no longer exists';initial_camera=qa.snap(p)['camera'];report['exact_camera']=all(abs(a-z)<1e-8 for a,z in zip(initial_camera,[3.6575453715563526,3.6575453715563526,64]));qa.heading(p,167.15);dock=qa.editor(p,0)['quantity']['rect'];report['original_sequence']=[]
  for wanted in [212.15,257.15,302.15,347.15,32.15,77.15,122.15,167.15]:
   for _ in range(9):p.keyboard.press('Shift+ArrowRight')
   p.wait_for_function('(n)=>Number(__b2zExperience.composer.degrees)===n',arg=wanted);p.wait_for_timeout(1000);d=qa.editor(p,0);assert d['camera']==initial_camera and d['quantity']['rect']==dock;report['original_sequence'].append(d);p.screenshot(path=str(out/f'{wanted}.png'));save()
   if wanted==347.15:report['exact_failed_pose']=d;assert d['scroll']['height']>=min(240,d['scrollContent']);assert d['cyclesVisibility']=='hidden';assert p.locator('#aim-handle').is_visible()
  for _ in range(72):
   p.keyboard.press('Shift+ArrowRight');qa.frame(p);d=qa.editor(p,0);assert d['camera']==initial_camera and d['quantity']['rect']==dock;report['headings'].append(d)
  qa.heading(p,332.15);report['adjacent']=[]
  for key in ['ArrowRight','ArrowLeft']:
   for n in range(26):
    if n:p.keyboard.press(key)
    qa.frame(p);d=qa.editor(p,0);assert d['camera']==initial_camera and d['quantity']['rect']==dock;report['adjacent'].append({'direction':key,'state':d})
  qa.heading(p,347.15);base=qa.snap(p);base_payment=qa.payment(p);report['quantity_edits']=[]
  for button,delta in [('plus',1),('minus',-1),('plus',1),('plus',1),('minus',-1),('minus',-1)]:
   n=int(p.locator('#quantity-count').text_content());p.locator('#quantity-'+button).click();p.wait_for_function('(n)=>__b2zExperience.composer.quantity===n',arg=n+delta);d=qa.editor(p,0);assert d['camera']==base['camera']and d['composer']['degrees']==base['composer']['degrees'];assert qa.payment(p)['memo'].endswith(' '+str(n+delta));report['quantity_edits'].append({'state':d,'payment':qa.payment(p)})
  p.locator('#quantity-plus').focus();p.keyboard.press('ArrowUp');assert p.locator('#quantity-count').text_content()=='2';p.keyboard.press('ArrowDown');assert p.locator('#quantity-count').text_content()=='1';r=p.locator('#quantity-plus').bounding_box();p.touchscreen.tap(r['x']+22,r['y']+22);assert p.locator('#quantity-count').text_content()=='2';p.locator('#quantity-minus').click();assert p.locator('#quantity-count').text_content()=='1';report['keyboard_touch']='PASS native key/tap, count/memo, fixed camera/heading'
  # Hold the actual quantity button while a genuine keyboard aim edit occurs.
  r=p.locator('#quantity-plus').bounding_box();p.mouse.move(r['x']+22,r['y']+22);p.mouse.down();p.locator('#aim-handle').focus();p.keyboard.press(']');assert p.locator('#quantity-controls').bounding_box()=={'x':dock['x'],'y':dock['y'],'width':dock['width'],'height':dock['height']};p.mouse.up();assert p.locator('#quantity-count').text_content()=='2';p.locator('#quantity-minus').click();report['hold_aim']='PASS held target stable while aiming'
  # A visible right-pointing shaft is hit through the ordinary aiming cursor.
  qa.heading(p,90);origin=p.evaluate('__b2zCamera.cellPoint(0)');x,y=origin['sx']+80,origin['sy'];assert p.evaluate('([x,y])=>document.elementFromPoint(x,y)?.id==="board"',[x,y]);p.mouse.move(x,y);p.wait_for_timeout(100);assert p.locator('#board').get_attribute('data-cursor')=='aim';before=qa.snap(p);p.mouse.down();p.mouse.move(x-5,y-20,steps=5);p.mouse.up();p.wait_for_function('a=>__b2zExperience.composer.degrees!==a',arg=before['composer']['degrees']);assert qa.snap(p)['camera']==before['camera'];qa.editor(p,0);report['arrow_drag']='PASS visible shaft cursor/drag updates heading without panning'
  # Real touch aim -> second-finger pinch; editor must not intercept finger2.
  dev=c.new_cdp_session(p);origin=p.evaluate('__b2zCamera.cellPoint(0)');x,y=origin['sx']-26,origin['sy']+4;assert p.evaluate('([x,y])=>document.elementFromPoint(x,y)?.id==="board"',[x,y]);box=p.locator('#quantity-controls').bounding_box();dev.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':11}]});dev.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+15,'y':y-14,'id':11}]});qa.frame(p);angle=qa.snap(p)['composer']['degrees'];camera=qa.snap(p)['camera'];assert p.evaluate('([x,y])=>document.elementFromPoint(x+90,y)?.id==="board"',[x,y]);dev.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x+15,'y':y-14,'id':11},{'x':x+90,'y':y,'id':22}]});dev.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x-5,'y':y-25,'id':11},{'x':x+115,'y':y+10,'id':22}]});assert p.locator('#quantity-controls').bounding_box()==box;dev.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});qa.frame(p);assert qa.snap(p)['camera']!=camera;assert p.locator('#quantity-count').text_content()=='1';p.wait_for_function('a=>__b2zExperience.composer.degrees===a',arg=angle);report['aim_pinch']='PASS gesture ownership, fixed editor, no minus interception'
  # A genuine resize fences a held press before relocation.
  r=p.locator('#quantity-plus').bounding_box();n=p.locator('#quantity-count').text_content();p.mouse.move(r['x']+22,r['y']+22);p.mouse.down();p.set_viewport_size({'width':320,'height':350});p.wait_for_function('()=>__b2zCamera.viewport.height===350');p.wait_for_timeout(80);p.mouse.up();assert p.locator('#quantity-count').text_content()==n;qa.settle(p)
  if p.locator('#locate-context').is_visible():p.locator('#locate-context').click();qa.settle(p)
  report['contracted']=qa.editor(p,0);assert report['contracted']['scroll']['height']>=96;p.screenshot(path=str(out/'contracted-held-release.png'));p.set_viewport_size({'width':320,'height':640});p.wait_for_function('()=>__b2zCamera.viewport.height===640');qa.settle(p)
  if p.locator('#locate-context').is_visible():p.locator('#locate-context').click();qa.settle(p)
  qa.editor(p,0);p.locator('#close-panel').click();assert p.locator('#quantity-controls').is_hidden();p.locator('#centre-cannon').click();qa.settle(p)
  if p.locator('#own-cannons button').first.is_visible():p.locator('#own-cannons button').first.click();qa.settle(p)
  p.locator('#fire-action').click();qa.settle(p);qa.editor(p,0);report['reopen']='PASS same usable editor after close/reopen';assert not report['errors']and not report['forbidden'];report['status']='PASS';save()
 except Exception as e:
  report.update(status='FAIL',error=repr(e))
  try:report['failure_state']=qa.snap(p);p.screenshot(path=str(out/'failure.png'))
  except Exception:pass
  save();raise
 finally:save();p.close();c.close();b.close()
