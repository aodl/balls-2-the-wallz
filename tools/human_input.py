"""Current composer helpers. Fixture setup is explicit; native gestures have separate journeys."""
def proposed(page):
 return page.evaluate('globalThis.fixture?.proposal()??globalThis.__b2zExperience.composer')

def chosen_cell(page):
 cell=proposed(page)['cell'];return '' if cell is None else str(cell)

def heading_value(page):return str(proposed(page)['degrees'])

def set_heading(page,value):
 # Canonical fixture arrangement, not a claim of native input. Installed paths
 # exercise the real accessible controls; no removed DOM field is recreated.
 if page.evaluate('Boolean(globalThis.fixture?.setHeading)'):
  page.evaluate('(v)=>fixture.setHeading(Number(v))',value);return
 current=float(heading_value(page));delta=round((float(value)-current)%360,2)
 if delta>180:delta-=360
 key='ArrowRight' if delta>=0 else 'ArrowLeft';steps=round(abs(delta)*100)
 target=page.locator('#aim-handle')
 if not target.is_visible():target=page.locator('#join-direction button').first
 target.focus()
 for size,modifier in [(500,'Shift+'),(100,''),(1,'Alt+')]:
  count,steps=divmod(steps,size)
  for _ in range(count):page.keyboard.press(modifier+key)
 page.wait_for_function('(v)=>Math.abs(Number(__b2zExperience.composer.degrees)-Number(v))<.011',arg=value)

def choose_cell(page,value):
 value=None if value in ['',None] else int(value)
 if page.evaluate('Boolean(globalThis.fixture?.choose)'):
  return page.evaluate('(v)=>fixture.choose(v)',value)
 point=page.evaluate('(v)=>__b2zCamera.cellPoint(v)',value)
 if not point['visible']:
  page.locator('#board').focus();page.keyboard.press('Home')
  # Home is an animated navigation gesture. Capture the canonical target only
  # after its ordinary frames settle, not at an arbitrary point in that motion.
  page.evaluate('''()=>new Promise((resolve,reject)=>{const start=performance.now();let previous='',stableAt=start,frames=0;function sample(){const c=__b2zCamera,pose=JSON.stringify([c.x,c.y,c.scale]),now=performance.now();if(pose!==previous){previous=pose;stableAt=now;frames=0;}else frames++;if(frames>=4&&now-stableAt>=450)return resolve();if(now-start>8000)return reject(Error('Home camera did not settle'));requestAnimationFrame(sample)}requestAnimationFrame(sample)})''')
  point=page.evaluate('(v)=>__b2zCamera.cellPoint(v)',value)
 if not point['visible']or not page.evaluate('(p)=>document.elementFromPoint(p.sx,p.sy)?.id==="board"',point):
  # An anchored payment pane can cover the requested tile. Preserve that exact
  # canonical target and use the supported keyboard alternative, rather than
  # clicking through UI or silently substituting another legal destination.
  base=page.evaluate('()=>{const w=__b2zExperience.session.referenceWorld;return{width:w.width,height:w.height,cell:__b2zExperience.composer.cell??w.cannons.find(c=>c.id===__b2zTools.selection()).cell}}')
  page.locator('#board').focus();page.keyboard.press('ArrowLeft') # clear prior keyboard hover without committing a target
  dx=(value%base['width']-base['cell']%base['width']+base['width']//2)%base['width']-base['width']//2
  dy=(value//base['width']-base['cell']//base['width']+base['height']//2)%base['height']-base['height']//2
  if not dx and not dy:page.keyboard.press('Alt+ArrowLeft');page.keyboard.press('Alt+ArrowRight')
  for count,positive,negative in [(dx,'Right','Left'),(dy,'Down','Up')]:
   for _ in range(abs(count)):page.keyboard.press('Alt+Arrow'+(positive if count>0 else negative))
  page.keyboard.press('Enter');page.wait_for_timeout(450);return {'input':'keyboard','cell':value}
 assert page.evaluate('(p)=>__b2zCamera.cell(p.sx,p.sy)',point)==value,point
 page.mouse.click(point['sx'],point['sy']);page.wait_for_timeout(450);return {'input':'pointer','cell':value,'point':point}
