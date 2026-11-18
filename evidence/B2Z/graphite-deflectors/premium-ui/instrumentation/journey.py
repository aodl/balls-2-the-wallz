"""Actual application journey with read-only IC access and browser-native input."""
import json,sys,time
from pathlib import Path
from playwright.sync_api import sync_playwright
import live_common as qa
url,folder=sys.argv[1:];out=Path(folder);out.mkdir(parents=True,exist_ok=False)
report={}
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,chromium_sandbox=True)
 for width,height in [(1440,900),(390,844),(320,640)]:
  ctx=b.new_context(viewport={'width':width,'height':height},has_touch=width<400,record_video_dir=str(out/'video'))
  forbidden=[];errors=[]
  def guard(route):
   r=route.request
   if r.method=='POST' and not r.url.endswith(('/query','/read_state')):
    forbidden.append(r.url);route.abort()
   else:route.continue_()
  ctx.route('**/*',guard);page=ctx.new_page()
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(url,wait_until='domcontentloaded')
  source,_=qa.enter_fire(page)
  assert page.locator('#render-error').is_hidden()
  page.locator('#close-panel').click();qa.settle(page)
  idle=qa.snap(page)
  page.screenshot(path=str(out/f'{width}-idle.png'))
  point=page.evaluate('cell=>{const q=__b2zCamera.cellPoint(cell,.18);return {x:q.sx,y:q.sy}}',source['cell'])
  if width<400:page.touchscreen.tap(point['x'],point['y'])
  else:page.mouse.click(point['x'],point['y'])
  page.locator('#fire-action').wait_for(state='visible')
  qa.settle(page);selected=qa.snap(page)
  assert selected['camera']==idle['camera']
  page.screenshot(path=str(out/f'{width}-selected.png'))
  page.locator('#fire-action').click();qa.settle(page)
  if width==320:
   qa.heading(page,347.15);qa.settle(page)
   # The reusable inspector pins Rules7. Its remaining quantity checks are
   # shared, while this journey authenticates the current Rules12 identity.
   old=qa.RULES7
   qa.RULES7='1b44508ad27a714b43888e3d0cf84beeb9a2450bb25112bfd3b650b865105c1c'
   try:quantity=qa.editor(page,source['cell'])
   finally:qa.RULES7=old
  else:
   page.locator('#aim-handle').focus()
   for _ in range(5):page.keyboard.press('Shift+ArrowRight')
   qa.settle(page);quantity=None
  page.locator('#war-cry').fill('CHARGE!')
  page.wait_for_function('()=>document.getElementById("text-memo").textContent.endsWith("|CHARGE!")')
  page.screenshot(path=str(out/f'{width}-aiming.png'))
  memo=qa.payment(page)['memo']
  page.locator('#quantity-plus').click();qa.settle(page)
  assert qa.payment(page)['memo']!=memo
  page.locator('#deflect-action').click()
  page.locator('[data-deflector-orientation=SE]').click();qa.settle(page)
  proposal=qa.payment(page)
  assert proposal['memo'].startswith('DEFLECT ') and proposal['memo'].endswith(' SE') and proposal['amount']=='0.1 ICP'
  page.screenshot(path=str(out/f'{width}-deflector.png'))
  session=qa.snap(page)
  assert session['ready'] and session['identity']['rules_hash']=='1b44508ad27a714b43888e3d0cf84beeb9a2450bb25112bfd3b650b865105c1c'
  assert not errors and not forbidden,(errors,forbidden)
  report[str(width)]={'identity':session['identity'],'deflector':proposal,'camera':idle['camera'],'mobile_347_15':quantity,'head':session['head'],'renderer':page.evaluate('__b2zRender'),'errors':errors,'forbidden_posts':forbidden}
  ctx.close();(out/'result.json').write_text(json.dumps(report,indent=2)+'\n')
 b.close()
