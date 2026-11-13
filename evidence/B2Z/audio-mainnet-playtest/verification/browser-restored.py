import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('.work/audio-mainnet-playtest/rehearsal-success');config=json.loads((out/'dfx.json').read_text());port=config['networks']['local']['bind'].split(':')[-1];cid=(out/'restored-id.log').read_text().strip();result={}
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,chromium_sandbox=True);page=b.new_page(viewport={'width':1440,'height':900});errors=[];posts=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:posts.append(r.url) if r.method=='POST' else None)
 try:
  page.goto(f'http://{cid}.localhost:{port}/',wait_until='domcontentloaded');page.wait_for_function('()=>globalThis.__b2zExperience?.session?.ready',timeout=120000)
  result=page.evaluate('()=>{const s=__b2zExperience.session;return {ready:s.ready,error:s.error,mode:s.mode,source:s.source,head:String(s.sequence.last.publication.sequence),cannons:s.referenceWorld.cannons.length,balls:s.referenceWorld.balls.length,certificateMode:__dtrLive.delivery.acceptedHeads.at(-1).mode}}');assert not result['error'];assert result['certificateMode']=='certificate-verifier';assert all(u.endswith(('/query','/read_state')) for u in posts),posts;assert not errors;page.screenshot(path=str(out/'restored-sandboxed-game.png'));result.update(status='PASS',sandbox=True,errors=errors,posts=posts)
 finally:
  (out/'browser-sandboxed.json').write_text(json.dumps(result,indent=2)+'\n');page.close();b.close()
