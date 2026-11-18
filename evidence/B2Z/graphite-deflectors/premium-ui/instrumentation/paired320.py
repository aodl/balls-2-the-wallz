"""Matched native response at the exact mobile camera and active action context."""
import json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
import live_common as qa

a,b,dst=sys.argv[1:]
rows=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,chromium_sandbox=True)
 for wave in range(2):
  for variant in ('A','B','B','A'):
   c=browser.new_context(viewport={'width':320,'height':640},has_touch=True)
   c.add_init_script("""globalThis.responses=[];
    addEventListener('click',e=>{const n=e.target.closest('button');
      if(e.isTrusted&&n){const start=e.timeStamp;requestAnimationFrame(t=>responses.push({name:n.id,ms:performance.now()-start}));}
    },true);""")
   page=c.new_page();page.goto(a if variant=='A' else b,wait_until='domcontentloaded')
   qa.enter_fire(page);qa.heading(page,347.15);qa.settle(page);page.evaluate('responses.length=0')
   expected=['quantity-plus','quantity-minus','move-action','build-action','fire-action']*4
   for key in expected:
    page.locator('#'+key).tap();qa.frame(page)
   got=page.evaluate('responses')
   got=[x for x in got if x['name'] in expected]
   assert [x['name'] for x in got]==expected,got
   rows.append({'wave':wave,'variant':variant,'response':got})
   Path(dst).write_text(json.dumps(rows,indent=2)+'\n');c.close()
 browser.close()
