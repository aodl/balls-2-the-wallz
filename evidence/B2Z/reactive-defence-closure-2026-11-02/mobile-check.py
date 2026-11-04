from pathlib import Path
import json,time,sys
sys.path.insert(0,str(Path("tools").resolve()))
from browser_observer import wait_until
from playwright.sync_api import sync_playwright
out=Path('.work/b2z-reactive-review');errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,chromium_sandbox=True)
 c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=3)
 page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8189/',timeout=60000)
 wait_until(page,lambda:page.evaluate('Boolean(globalThis.__dtrLive?.connected)'),60000)
 page.wait_for_timeout(15000)
 result={'status':'PASS','scope':'Locally built candidate over HTTP with production CSP, genuine read-only mainnet certificates and operational data; not deployed','title':page.title(),'errors':errors,'arena_note':page.locator('#arena-note').inner_text(),'catching_up':page.locator('#catching-up').is_visible(),'catching_up_text':page.locator('#catching-up').inner_text(),'head':page.evaluate('__dtrLive.heads.at(-1)'),'controls':[]}
 for button in page.locator('.toolbar button').all():
  button.scroll_into_view_if_needed();box=button.bounding_box()
  data=button.evaluate("e=>({id:e.id,label:e.getAttribute('aria-label')||e.innerText,text:e.innerText,scroll_width:e.scrollWidth,client_width:e.clientWidth,scroll_height:e.scrollHeight,client_height:e.clientHeight})")
  data['box']=box;data['visible']=button.is_visible();result['controls'].append(data)
  assert data['visible'] and data['scroll_width']<=data['client_width']+1
  assert box['x']>=0 and box['x']+box['width']<=390
  assert button.evaluate("e=>{const b=e.getBoundingClientRect(),n=e.closest('nav').getBoundingClientRect();return b.top>=n.top&&b.bottom<=n.bottom}")
  if button.is_enabled():button.focus();assert button.evaluate('e=>document.activeElement===e')
 if not page.locator('#minimap').is_visible():page.locator('#toggle-minimap').click()
 result['status_minimap_bounds']=[]
 for width,height in [(390,844),(320,640)]:
  page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(300)
  controls=[]
  for button in page.locator('.toolbar button').all():
   button.scroll_into_view_if_needed();box=button.bounding_box()
   assert button.is_visible() and box['x']>=0 and box['x']+box['width']<=width
   assert button.evaluate("e=>{const b=e.getBoundingClientRect(),n=e.closest('nav').getBoundingClientRect();return e.scrollWidth<=e.clientWidth+1&&b.top>=n.top&&b.bottom<=n.bottom}")
   if button.is_enabled():button.focus();assert button.evaluate('e=>document.activeElement===e')
   controls.append(button.get_attribute('id'))
  assert len(controls)==13
  toolbar=page.locator('.toolbar').bounding_box();notice=page.locator('#catching-up').bounding_box()
  assert notice['y']>=toolbar['y']+toolbar['height'] or notice['y']+notice['height']<=toolbar['y'], (toolbar,notice)
  stats=page.locator('.arena-stats').bounding_box();mini=page.locator('#minimap').bounding_box();note=page.locator('#arena-note').bounding_box()
  assert stats['y']+stats['height']<=mini['y']
  assert note['x']>=0 and note['x']+note['width']<=width
  result['status_minimap_bounds'].append({'viewport':[width,height],'accessible_controls':controls,'toolbar':toolbar,'notice':notice,'stats':stats,'minimap':mini,'note':note})
  page.screenshot(path=str(out/f'mobile-{width}.png'))
 (out/'mobile.json').write_text(json.dumps(result,indent=2)+'\n')
 assert not errors
 assert page.locator('#catching-up').get_attribute('data-kind')=='reserve'
 assert not page.locator('#catching-up .spinner').is_visible()
 assert 'paused to conserve' in page.locator('#catching-up strong').inner_text()
 b.close()
