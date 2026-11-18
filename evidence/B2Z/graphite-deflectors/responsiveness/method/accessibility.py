import json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
import live_common as qa
url,output=sys.argv[1:]
rows=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,chromium_sandbox=True)
 for mode in ['reduced','forced']:
  context=browser.new_context(viewport={'width':320,'height':640},has_touch=True,reduced_motion='reduce',forced_colors='active' if mode=='forced' else 'none')
  page=context.new_page()
  if mode=='reduced':
   dev=context.new_cdp_session(page)
   dev.send('Emulation.setEmulatedMedia',{'features':[{'name':'prefers-reduced-transparency','value':'reduce'},{'name':'prefers-reduced-motion','value':'reduce'}]})
  page.goto(url,wait_until='domcontentloaded')
  qa.enter_fire(page)
  s=page.evaluate("""()=>{const n=document.querySelector('.panel-header'),r=getComputedStyle(n);return{
   header:{color:r.color,image:r.backgroundImage,bg:r.backgroundColor,blur:r.backdropFilter},
   geometry:[...document.querySelectorAll('#context-actions button,#workspace button[data-copy]')].filter(n=>!n.hidden).map(b=>{const r=b.getBoundingClientRect();return{width:r.width,height:r.height}}),
   controls:[...document.querySelectorAll('#quantity-controls button')].map(b=>[b.offsetWidth,b.offsetHeight]),
   forced:matchMedia('(forced-colors: active)').matches,transparency:matchMedia('(prefers-reduced-transparency: reduce)').matches,
   motion:matchMedia('(prefers-reduced-motion: reduce)').matches,transition:getComputedStyle(document.querySelector('.panel-body')).transitionDuration,
   identity:__b2zExperience.session.sequence.last.publication.identity
  }}""")
  assert s['motion'] and s['transition']=='0s' and s['header']['blur']=='none' and s['header']['image']=='none'
  assert s['forced'] if mode=='forced' else s['transparency']
  assert all(t['width']>=44 and t['height']>=44 for t in s['geometry']) and all(w>=44 and h>=44 for w,h in s['controls'])
  rows.append({'mode':mode,**s});context.close()
 browser.close()
Path(output).write_text(json.dumps({'status':'PASS','rows':rows},indent=2)+'\n')
