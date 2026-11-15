import json,time
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('.work/quantity-deployment-20261115/live-cost');out.mkdir(exist_ok=False);url='https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/'
with sync_playwright()as pw:
 b=pw.chromium.launch(headless=True,chromium_sandbox=True);p=b.new_page(viewport={'width':1440,'height':900});t=time.monotonic();p.goto(url,wait_until='domcontentloaded');p.wait_for_function('()=>__b2zExperience?.session?.ready',timeout=90000);first=time.monotonic()-t;p.locator('#status-button').click();p.locator('#close-panel').click();p.wait_for_function('()=>__b2zAudio().music?.active&&__b2zAudio().fxBuffers===7',timeout=90000)
 rows=[]
 for enabled in [True,False,False,True]:
  if p.evaluate('__b2zAudio().settings.enabled')!=enabled:p.locator('#audio-button').click()
  p.wait_for_timeout(1200)
  data=p.evaluate('''()=>new Promise(resolve=>{const rows=[],start=performance.now();let last;function f(t){if(last!==undefined)rows.push(t-last);last=t;if(t-start<5000)requestAnimationFrame(f);else{rows.sort((a,b)=>a-b);const q=x=>rows[Math.ceil(rows.length*x)-1];resolve({frames:rows.length,p50:q(.5),p95:q(.95),p99:q(.99),audio:__b2zAudio(),camera:[__b2zCamera.x,__b2zCamera.y,__b2zCamera.scale],head:String(__b2zExperience.session.sequence.last.publication.head.segment_id),population:{cannons:__b2zExperience.session.referenceWorld.cannons.length,balls:__b2zExperience.session.referenceWorld.balls.length},status:__b2zExperience.status,error:String(__b2zExperience.session.error??'')})}}requestAnimationFrame(f)})''');assert not data['error'];rows.append({'enabled':enabled,**data})
 resources=p.evaluate('performance.getEntriesByType("resource").filter(r=>r.name.includes("/audio/")).map(r=>({name:r.name.split("/").at(-1),transfer:r.transferSize,encoded:r.encodedBodySize,duration:r.duration}))');result={'status':'OBSERVATION ONLY; P09 remains FAIL/unqualified','first_world_seconds':first,'scope':'Actual installed one-cannon Rules7 world, identical camera ON/OFF/OFF/ON; shared VM software rendering, not dense gameplay/hardware performance qualification. Default Playwright launch; no autoplay override.','rows':rows,'resources':resources,'audio_transfer_bytes':sum(r['transfer']for r in resources),'browser':b.version};(out/'results.json').write_text(json.dumps(result,indent=2)+'\n');b.close()
