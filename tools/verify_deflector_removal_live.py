#!/usr/bin/env python3
"""Two native observers reconstruct paid structures and later committed destruction.
No injected world/event, private camera change, gameplay submission or mainnet.
"""
import argparse,json,socket,subprocess,time
from pathlib import Path
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--configuration',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();c=json.loads(a.configuration.read_text());out=a.output.resolve();out.mkdir(parents=True,exist_ok=False);report={'status':'RUNNING','scope':__doc__,'observers':[]};errors=[];forbidden=[]
def save():(out/'results.json').write_text(json.dumps(report,indent=2)+'\n')
from urllib.parse import urlparse
endpoint=urlparse(c['host']);assert c['network']=='pocketic-local'and endpoint.scheme=='http'and endpoint.hostname in['localhost','127.0.0.1']
with socket.socket()as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
local={**c,'host':f'http://127.0.0.1:{port}'};(out/'local-policy.json').write_text(json.dumps(local)+'\n');subprocess.run(['node','tools/build_observer_playability.mjs','--local-test-config',str(out/'local-policy.json'),'--output',str(out/'assets')],check=True)
log=(out/'server.log').open('w');server=subprocess.Popen(['python3.11','tools/serve_observer.py','--port',str(port),'--deployment-assets',str(out/'assets'),'--live-config',str(a.configuration.resolve().parent),'--ic-gateway',c['host'],'--live-canister',c['canister_id'],'--proxy-trace',str(out/'proxy.jsonl')],stdout=log,stderr=subprocess.STDOUT)
try:
 with sync_playwright()as pw:
  browser=pw.chromium.launch(headless=True,chromium_sandbox=True);contexts=[];pages=[]
  try:
   for i in range(2):
    ctx=browser.new_context(viewport={'width':390,'height':844},record_video_dir=str(out/f'video-{i}'));contexts.append(ctx)
    def guard(route):
     r=route.request
     if r.method=='POST'and not r.url.endswith(('/query','/read_state')):forbidden.append(r.url);route.abort()
     else:route.continue_()
    ctx.route('**/*',guard)
    ctx.add_init_script('''globalThis.structureProbe={samples:[]};let signature='';function probe(){const e=globalThis.__b2zExperience;if(e?.session?.ready&&e.visible?.version===7){const ds=[...e.visible.deflectors.values()].sort((a,b)=>a.id-b.id),s=JSON.stringify(ds);if(s!==signature){signature=s;structureProbe.samples.push({at:Date.now(),time:e.visibleTime,structures:ds,publication:String(e.session.sequence.last.publication.head.segment_id),identity:e.session.sequence.last.publication.identity});}}requestAnimationFrame(probe)}requestAnimationFrame(probe);''')
    page=ctx.new_page();pages.append(page);page.on('pageerror',lambda e:errors.append(str(e)));page.goto(f'http://127.0.0.1:{port}/',wait_until='domcontentloaded');page.wait_for_function('()=>__b2zExperience?.session?.ready',timeout=60000);assert page.evaluate('__b2zExperience.session.config.rules_version')==12
    page.locator('#join-action').click();page.locator('#sending-account').fill(c['listening_account']);page.locator('#identity-save').click();page.wait_for_function('()=>document.getElementById("workspace").hidden');page.wait_for_function('()=>__b2zExperience.visible.deflectors.size===2',timeout=45000)
    page.locator('#centre-cannon').click();page.locator('#own-cannons button').filter(has_text='Cannon #2 ·').click();page.wait_for_timeout(500);page.screenshot(path=str(out/f'observer-{i}-before.png'));report['observers'].append({'before':page.evaluate('structureProbe.samples.at(-1)')});save()
   Path(c['observer_ready_marker']).write_text('Both native observers authenticated the two paid structures.\n')
   for i,page in enumerate(pages):
    page.bring_to_front();page.wait_for_function('()=>__b2zExperience.visible.deflectors.size===1&&[...__b2zExperience.visible.deflectors.values()][0].cell===103',timeout=60000);assert not page.evaluate('String(__b2zExperience.session.error??"")');report['observers'][i]['after']=page.evaluate('structureProbe.samples.at(-1)');report['observers'][i]['samples']=page.evaluate('structureProbe.samples');page.screenshot(path=str(out/f'observer-{i}-after.png'));save()
   assert report['observers'][0]['before']['structures']==report['observers'][1]['before']['structures'];assert report['observers'][0]['after']['structures']==report['observers'][1]['after']['structures'];assert all(x['after']['time']>=x['before']['time']for x in report['observers']);assert not forbidden and not errors
   report.update(status='PASS',errors=errors,forbidden=forbidden);save()
  finally:
   for ctx in contexts:ctx.close()
   browser.close()
finally:server.terminate();server.wait();log.close()
print('PASS two authenticated native observers reconstruct committed Deflector destruction')
