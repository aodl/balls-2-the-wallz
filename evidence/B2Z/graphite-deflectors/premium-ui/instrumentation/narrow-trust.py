"""Capture readiness and exact trust errors at 320px for both frozen builds."""
import json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
import live_common as qa
a,b,dst=sys.argv[1:]
rows=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,chromium_sandbox=True)
 for tag in ('A','B','B','A'):
  c=browser.new_context(viewport={'width':320,'height':640},has_touch=True)
  p=c.new_page()
  try:
   p.goto(a if tag=='A' else b,wait_until='domcontentloaded')
   gate=p.evaluate("""()=>({style:location.href, initialStatus:document.querySelector('#arena-note').textContent})""")
   p.wait_for_function('()=>__b2zExperience.session?.ready||__b2zExperience.session?.error',timeout=45000)
   qa.enter_fire(p);qa.heading(p,347.15)
   p.locator('#war-cry').fill('é🚀xxxxxxxxxxxx')
   p.wait_for_function("""()=>__b2zExperience.session.error||document.querySelector('[data-copy=owner]').matches(':enabled')""",timeout=35000)
  except Exception as error:
   gate={'harness':repr(error)}
  state=p.evaluate("""()=>{const e=__b2zExperience,s=e.session; return {
   trust: e.status.kind,error:String(s?.error??''),
   failureKind:s?.failureKind,deliveryError:s?.deliveryError,
   certificateAgeMs:s?.certificateAgeMs,diagnostics:s?.deliveryDiagnostics,
   status:document.querySelector('#arena-note').textContent,
   copy:!document.querySelector('[data-copy=owner]').matches(':disabled'),
   ready:s?.ready,last:String(s?.sequence?.last?.publication?.head?.segment_id)
  }}""")
  rows.append({'release':tag,'initial':gate,**state})
  Path(dst).write_text(json.dumps(rows,indent=2,default=str)+'\n')
  if state['error']:p.screenshot(path=str(Path(dst).with_name(f'{tag}-{len(rows)}-trust-stop.png')))
  c.close()
 browser.close()
