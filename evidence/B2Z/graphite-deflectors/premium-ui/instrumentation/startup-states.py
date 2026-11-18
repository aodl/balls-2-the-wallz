"""Controlled browser states using actual qualified UI and read-only backend."""
import json,sys,time
from pathlib import Path
from playwright.sync_api import sync_playwright
url,output=sys.argv[1:]
out=Path(output);out.mkdir(exist_ok=False,parents=True)
captures={}
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,chromium_sandbox=True)
 for mode in ['loading','renderer-unavailable']:
  c=browser.new_context(viewport={'width':390,'height':844},has_touch=True,reduced_motion='reduce')
  page=c.new_page()
  if mode=='loading':
   def delay(route):
    time.sleep(0.65)
    route.continue_()
   page.route('**/api/v*/canister/*/query',delay)
  else:
   c.add_init_script("""const context=HTMLCanvasElement.prototype.getContext;
     HTMLCanvasElement.prototype.getContext=function(type,...options){
       if(this.id==='board'&&(type==='webgl2'||type==='webgl'))return null;
       return context.call(this,type,...options);
     };""")
  page.goto(url,wait_until='domcontentloaded')
  main='#motion-wait' if mode=='loading' else '#render-error'
  page.locator(main).wait_for(state='visible')
  captures[mode]={'text':page.locator(main).inner_text(),'copy_disabled':page.evaluate('''()=>!document.querySelector('#prepared-card').checkVisibility()||[...document.querySelectorAll('[data-copy]')].every(button=>button.matches(':disabled'))''')}
  assert captures[mode]['copy_disabled']
  page.screenshot(path=str(out/f'{mode}.png'))
  if mode=='loading':page.unroute_all(behavior='wait')
  c.close()
 browser.close()
(out/'result.json').write_text(json.dumps(captures,indent=2)+'\n')
