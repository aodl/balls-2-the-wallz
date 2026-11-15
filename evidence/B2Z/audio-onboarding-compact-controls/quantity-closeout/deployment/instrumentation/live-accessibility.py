import importlib.machinery,json
from pathlib import Path
from playwright.sync_api import sync_playwright
r=Path('.work/quantity-deployment-20261115');out=r/'live-accessibility';out.mkdir(exist_ok=False);qa=importlib.machinery.SourceFileLoader('qa',str(r/'live-common.py')).load_module();rows=[]
with sync_playwright()as pw:
 b=pw.chromium.launch(headless=True,chromium_sandbox=True)
 try:
  for width,height in [(320,640),(390,844)]:
   p=b.new_page(viewport={'width':width,'height':height},has_touch=True);p.goto(qa.URL,wait_until='domcontentloaded');source,roster=qa.enter_fire(p);qa.heading(p,347.15);qa.settle(p);before=qa.editor(p,source['cell']);box=p.locator('.panel-scroll').bounding_box();p.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);p.mouse.wheel(0,600);p.wait_for_timeout(300);risk=p.locator('#payment-risk').bounding_box();assert risk['y']>=box['y']and risk['y']+risk['height']<=box['y']+box['height']+1;qa.editor(p,source['cell']);p.screenshot(path=str(out/f'{width}-fee-risk-scroll.png'));p.mouse.wheel(0,-800);p.wait_for_timeout(300);p.locator('#recipient-reveal').click();qa.settle(p);assert p.locator('#full-recipient').is_visible();qa.editor(p,source['cell']);p.screenshot(path=str(out/f'{width}-full-address.png'));p.locator('#recipient-reveal').click();qa.settle(p);after=qa.editor(p,source['cell']);assert after['composer']==before['composer'];rows.append({'width':width,'status':'PASS','native_payment_scroll':True,'full_address_disclosure':True,'before':before,'after':after});p.close()
 finally:
  (out/'results.json').write_text(json.dumps({'rows':rows,'status':'PASS'if len(rows)==2 else'INCOMPLETE'},indent=2)+'\n');b.close()
