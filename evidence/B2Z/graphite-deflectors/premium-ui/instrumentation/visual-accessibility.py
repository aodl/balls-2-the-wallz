"""Capture semantic state. Root scaling is a controlled text-only zoom proxy."""
import json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
import live_common as qa
url,dest=sys.argv[1:]
out=Path(dest);out.mkdir(exist_ok=False,parents=True)
rows={}
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,chromium_sandbox=True)
 for mode in ['forced','reduced','two-times-text']:
  c=b.new_context(viewport={'width':320,'height':640},has_touch=True,forced_colors='active' if mode=='forced' else 'none',reduced_motion='reduce')
  page=c.new_page()
  if mode=='reduced':
   c.new_cdp_session(page).send('Emulation.setEmulatedMedia',{'features':[{'name':'prefers-reduced-transparency','value':'reduce'},{'name':'prefers-reduced-motion','value':'reduce'}]})
  page.goto(url,wait_until='domcontentloaded')
  qa.enter_fire(page);qa.heading(page,347.15)
  if mode=='two-times-text':page.evaluate("()=>document.documentElement.style.setProperty('font-size','32px','important')")
  qa.settle(page)
  page.locator('#fire-action').focus()
  page.keyboard.press('Tab')
  data=page.evaluate("""()=>{const active=document.activeElement, style=getComputedStyle(active);
   const scroll=document.querySelector('.panel-scroll'),memo=document.querySelector('#text-memo'),
        amount=document.querySelector('#transfer-amount'),notice=document.querySelector('.payment-information');
   const geometry=node=>node.getBoundingClientRect().toJSON();
   return {focus:active.id||active.dataset.copy,outline:style.outlineStyle,outlineWidth:style.outlineWidth,
    computedFont:parseFloat(getComputedStyle(document.documentElement).fontSize),completeMemo:memo.textContent,
    scroll:[scroll.clientHeight,scroll.scrollHeight,scroll.clientWidth,scroll.scrollWidth],notice:geometry(notice),
    amount:geometry(amount),memo:geometry(memo),
    controls:[...document.querySelectorAll('[data-copy]')].map(t=>geometry(t)),
    isForced:matchMedia('(forced-colors: active)').matches,
    reducedTransparency:matchMedia('(prefers-reduced-transparency: reduce)').matches,
    backdrop:getComputedStyle(document.querySelector('.panel-body')).backdropFilter};
  }""")
  assert data['backdrop']=='none' and data['focus'] and data['outline']!='none'
  assert data['scroll'][2]==data['scroll'][3],data
  assert data['completeMemo'].startswith('FIRE ')
  assert all(t['width']>=44 and t['height']>=44 for t in data['controls'])
  if mode=='two-times-text':assert data['computedFont']==32
  page.screenshot(path=str(out/f'{mode}.png'))
  rows[mode]=data
  c.close()
 b.close()
(out/'result.json').write_text(json.dumps(rows,indent=2)+'\n')
