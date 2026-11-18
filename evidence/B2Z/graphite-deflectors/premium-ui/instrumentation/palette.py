"""The actual Join panel, using unowned demonstration accounts with real palette hashes."""
import json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
import live_common as qa
src=Path(__file__).resolve().parent
url,folder=sys.argv[1:]
out=Path(folder);out.mkdir(parents=True,exist_ok=False)
cases=json.loads((src/'colours.json').read_text())
rows={}
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,chromium_sandbox=True)
 for name,example in cases.items():
  context=browser.new_context(viewport={'width':1440,'height':900})
  def guard(route):
   if route.request.method=='POST' and not route.request.url.endswith(('/query','/read_state')): route.abort()
   else: route.continue_()
  context.route('**/*',guard);page=context.new_page()
  page.goto(url,wait_until='domcontentloaded')
  page.wait_for_function('()=>globalThis.__b2zExperience?.session?.ready',timeout=90000)
  page.locator('#join-action').click()
  page.locator('#sending-account').fill(example['address'])
  page.locator('#identity-save').click()
  page.locator('#prepared-card').wait_for(state='visible')
  qa.settle(page)
  displayed=page.evaluate('getComputedStyle(document.documentElement).getPropertyValue("--player-accent").trim()')
  assert displayed==example['color'],(displayed,example)
  payment=qa.payment(page)
  assert payment['memo'].startswith('NEW ')
  page.locator('#workspace').screenshot(path=str(out/f'{name}.png'))
  rows[name]={'color':displayed,'price':page.locator('#transfer-amount').evaluate('n=>getComputedStyle(n).color'),'action':payment['prompt'],'disabled':payment['disabled']}
  context.close()
 browser.close()
(out/'result.json').write_text(json.dumps(rows,indent=2)+'\n')
