"""Follow up noisy 390px startup by separating certificate delay, using real live authority."""
from pathlib import Path
import json,sys
from playwright.sync_api import sync_playwright
a,b,dst=sys.argv[1:]
rows=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,chromium_sandbox=True)
 for wave in range(4):
  for variant in ('A','B','B','A'):
   c=browser.new_context(viewport={'width':390,'height':844},has_touch=True,device_scale_factor=1)
   page=c.new_page()
   page.goto(a if variant=='A' else b,wait_until='domcontentloaded')
   page.wait_for_function('()=>globalThis.__b2zExperience?.session?.firstWorldAt',timeout=90000)
   data=page.evaluate("""()=>{const s=__b2zExperience.session;
    return {certificate:s.certifiedAt,world:s.firstWorldAt,after_certificate:s.firstWorldAt-s.certifiedAt,
       paint:performance.getEntriesByType('paint')[0]?.startTime,
       app_bytes:performance.getEntriesByType('resource').find(r=>r.name.endsWith('/app.mjs')).encodedBodySize,
       dpr:devicePixelRatio,cert_status:s.ready}
    }""")
   assert data['certificate']>0 and data['after_certificate']>=0 and data['cert_status']
   rows.append({'wave':wave,'variant':variant,**data})
   Path(dst).write_text(json.dumps(rows,indent=2)+'\n')
   c.close()
 browser.close()
