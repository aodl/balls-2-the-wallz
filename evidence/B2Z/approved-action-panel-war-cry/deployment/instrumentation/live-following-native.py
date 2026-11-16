import importlib.machinery,json
from pathlib import Path
from playwright.sync_api import sync_playwright
r=Path('.work/approved-panel-deployment-20261116');out=r/'live-following-native';out.mkdir(exist_ok=False);qa=importlib.machinery.SourceFileLoader('qa',str(r/'live-common.py')).load_module();d={'status':'RUNNING'}
with sync_playwright()as pw:
 b=pw.chromium.launch(headless=True,chromium_sandbox=True);p=b.new_page(viewport={'width':1440,'height':900},record_video_dir=str(out/'video'))
 try:
  p.route('**/*',lambda r:r.continue_()if r.request.method in ['GET','OPTIONS']or r.request.method=='POST'and r.request.url.endswith(('/query','/read_state'))else r.abort());p.goto(qa.URL,wait_until='domcontentloaded');qa.enter_fire(p);p.locator('#close-panel').click();qa.settle(p)
  points=p.evaluate('''()=>{const e=__b2zExperience,v=e.visible,t=e.visibleTime,r=document.getElementById('board').getBoundingClientRect();return[...v.balls.values()].map(b=>{let x=(Number(b.x0)+b.vx*t)/1024,y=(Number(b.y0)+b.vy*t)/1024;x=((x%v.width)+v.width)%v.width;y=((y%v.height)+v.height)%v.height;let q=__b2zCamera.point(x,y,.14);return{id:b.id,x:r.x+q.sx,y:r.y+q.sy,visible:q.visible}}).filter(q=>q.visible&&document.elementFromPoint(q.x,q.y)?.id==='board')}''')
  d['visible_balls']=points
  if points:
   q=points[0];scale=qa.snap(p)['camera'][2];p.mouse.click(q['x'],q['y']);p.wait_for_function('()=>document.getElementById("follow-announcement").textContent.includes("Following ball")');p.wait_for_timeout(1500);assert qa.snap(p)['camera'][2]==scale;d['selection_method']='Native mouse on displayed authenticated ball';d['followed']=p.locator('#follow-announcement').text_content();p.screenshot(path=str(out/'following-ball.png'))
  else:
   p.locator('#board').focus();p.keyboard.press('b');p.wait_for_function('()=>document.getElementById("follow-announcement").textContent.includes("Following ball")');p.wait_for_timeout(1500);d['selection_method']='Public B keyboard navigation; no visible ball at initial camera';d['followed']=p.locator('#follow-announcement').text_content();p.screenshot(path=str(out/'following-ball-keyboard.png'))
  p.keyboard.press('Escape');qa.frame(p)
  q=p.evaluate("""()=>{const e=__b2zExperience,v=e.visible,t=e.visibleTime,r=document.getElementById('board').getBoundingClientRect();for(const b of v.balls.values()){let x=(Number(b.x0)+b.vx*t)/1024,y=(Number(b.y0)+b.vy*t)/1024;x=((x%v.width)+v.width)%v.width;y=((y%v.height)+v.height)%v.height;const q=__b2zCamera.point(x,y,.14);if(q.visible&&document.elementFromPoint(r.x+q.sx,r.y+q.sy)?.id==='board')return{id:b.id,x:r.x+q.sx,y:r.y+q.sy}}return null}""")
  assert q;scale=qa.snap(p)['camera'][2];p.mouse.click(q['x'],q['y']);p.wait_for_function('()=>document.getElementById("follow-announcement").textContent.includes("Following ball")');p.wait_for_timeout(1000);assert qa.snap(p)['camera'][2]==scale;d['native_pointer_ball']={'status':'PASS','point':q};p.screenshot(path=str(out/'native-ball-click.png'))
  assert not p.locator('#stop-follow').count()
  q=p.evaluate('''()=>{for(let y=200;y<600;y+=50)for(let x=200;x<600;x+=50)if(document.elementFromPoint(x,y)?.id==='board')return{x,y}}''');p.mouse.click(q['x'],q['y']);p.wait_for_function('()=>document.getElementById("follow-announcement").textContent===""');qa.frame(p);before=qa.snap(p)['camera'];p.wait_for_timeout(800);assert qa.snap(p)['camera']==before;d['away_click']='PASS stop at current camera';m=p.locator('#minimap').bounding_box();p.mouse.click(m['x']+m['width']*.6,m['y']+m['height']*.5);qa.settle(p);d['minimap_navigation']='PASS native diamond click';p.screenshot(path=str(out/'minimap-navigation.png'));d['final']=qa.snap(p);assert not d['final']['error'];d['status']='PASS'
 except Exception as e:
  d.update(status='FAIL',error=repr(e));p.screenshot(path=str(out/'failure.png'));raise
 finally:(out/'results.json').write_text(json.dumps(d,indent=2)+'\n');p.close();b.close()
