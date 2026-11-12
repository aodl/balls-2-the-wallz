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
  page.locator('#board').focus();page.keyboard.press('Home');page.wait_for_timeout(250);point=page.evaluate('(v)=>__b2zCamera.cellPoint(v)',value)
 page.mouse.click(point['sx'],point['sy']);page.wait_for_timeout(450)
