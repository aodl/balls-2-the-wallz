import json
from pathlib import Path
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,chromium_sandbox=True);c=b.new_context();page=c.new_page();blocked=[]
 def abort(r):blocked.append(r.request.url);r.abort()
 page.route('**/audio/**',abort);page.goto('https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/',wait_until='domcontentloaded');page.wait_for_function('()=>globalThis.__b2zExperience?.session?.ready',timeout=120000);page.locator('#audio-button').click();page.locator('#audio-music').check();page.wait_for_function('()=>!!__b2zAudio().lastError',timeout=30000);r=page.evaluate('()=>({audio:__b2zAudio(),ready:__b2zExperience.session.ready,gameError:__b2zExperience.session.error,head:__b2zExperience.session.sequence.last.publication.head})');assert blocked and r['ready'] and not r['gameError'];r.update(status='PASS',fault='Browser-side audio-only transport abort; no server mutation',blocked=blocked);Path('.work/audio-mainnet-playtest/live/fault.json').write_text(json.dumps(r,indent=2)+'\n');page.screenshot(path='.work/audio-mainnet-playtest/live/audio-fault.png');page.close();c.close();b.close()
