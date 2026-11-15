import json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.path.insert(0,'tools');from fluid_playability_browser import settled_panel
out=Path('.work/audio-compact-deployment-20261115/reproduce-320');out.mkdir(exist_ok=False)
with sync_playwright()as pw:
 b=pw.chromium.launch(headless=True,chromium_sandbox=True);p=b.new_page(viewport={'width':320,'height':640},has_touch=True);p.goto('https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/',wait_until='domcontentloaded');p.wait_for_function('()=>__b2zExperience?.session?.ready',timeout=90000);a=p.evaluate('__b2zExperience.session.referenceWorld.cannons[0].account');p.locator('#join-action').click();p.locator('#sending-account').fill(a);p.locator('#identity-save').click();p.wait_for_function('()=>document.getElementById("workspace").hidden');p.wait_for_timeout(1000);p.locator('#centre-cannon').click();p.wait_for_timeout(1000)
 if p.locator('#own-cannons button').first.is_visible():p.locator('#own-cannons button').first.click();p.wait_for_timeout(1000)
 if p.locator('#focus-cannon').is_enabled():p.locator('#focus-cannon').click();p.wait_for_timeout(1000)
 p.locator('#fire-action').click();settled_panel(p);p.wait_for_timeout(1000);p.locator('#aim-handle').focus();rows=[]
 for i in range(8):
  for _ in range(9):p.keyboard.press('Shift+ArrowRight')
  p.wait_for_timeout(1000);d=p.evaluate('''()=>({heading:__b2zExperience.composer.degrees,hidden:document.getElementById('quantity-controls').hidden,style:getComputedStyle(document.getElementById('quantity-controls')).display,quantityRect:document.getElementById('quantity-controls').getBoundingClientRect().toJSON(),handle:document.getElementById('aim-handle').getBoundingClientRect().toJSON(),panel:document.getElementById('workspace').getBoundingClientRect().toJSON(),camera:[__b2zCamera.x,__b2zCamera.y,__b2zCamera.scale],active:document.activeElement.id})''');rows.append(d);p.screenshot(path=str(out/f'{i}-{d["heading"]}.png'));(out/'results.json').write_text(json.dumps({'scope':'Actual deployed frontend, ordinary keyboard aim, one-second settle per heading; no override or payment','rows':rows},indent=2)+'\n')
 b.close()
