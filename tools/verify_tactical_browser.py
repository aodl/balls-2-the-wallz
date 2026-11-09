#!/usr/bin/env python3
"""UX-02/04/11/12: bounded real renderer/interaction review; synthetic canonical fixtures.
Existing fixture bundle required. Not certificate, device, wallet or GPU-hardware evidence.
"""
import argparse,functools,http.server,json,threading,time
from pathlib import Path
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--fixture-dir',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--baseline',action='store_true');p.add_argument('--video',action='store_true');a=p.parse_args();out=a.output.absolute();out.mkdir(parents=True,exist_ok=False)
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(a.fixture_dir.absolute())));threading.Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}';rows=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,chromium_sandbox=True)
 try:
  for width,height in [(1440,900),(390,844),(320,640)]:
   context=browser.new_context(viewport={'width':width,'height':height},has_touch=width<700,permissions=['clipboard-write'],**({'record_video_dir':str(out/'video'),'record_video_size':{'width':width,'height':height}}if a.video else {}));page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(origin);page.wait_for_function('()=>!!window.fixture');page.evaluate('fixture.render("bridge_both","initial")');page.wait_for_timeout(150)
   # Same populated seam workload and wall duration for baseline/candidate. No video for measurements.
   page.evaluate('fixture.camera.centre(103.5,.6);fixture.camera.scale=48;fixture.draw();fixture.metricsReset()');cdp=context.new_cdp_session(page);cdp.send('Performance.enable');before=cdp.send('Performance.getMetrics');page.wait_for_timeout(5000);after=cdp.send('Performance.getMetrics');metrics=page.evaluate('fixture.metrics()');metrics['cpu_task_seconds']=next(r['value']for r in after['metrics']if r['name']=='TaskDuration')-next(r['value']for r in before['metrics']if r['name']=='TaskDuration');page.screenshot(path=str(out/f'{width}-seam.png'))
   renderer=page.evaluate('()=>{const g=document.querySelector("#board").getContext("webgl2"),e=g.getExtension("WEBGL_debug_renderer_info");return{renderer:e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER),dpr:devicePixelRatio}}')
   page.locator('#identify-button').click();page.locator('#sending-account').fill('aaaaa-aa');page.locator('#identity-save').click();page.locator('#close-panel').click();page.evaluate('fixture.render("additional","initial");fixture.select(1)');
   if page.locator('#locate-context').is_visible():page.locator('#locate-context').click()
   page.locator('#fire-action').click();page.locator('#angle-degrees').fill('45');page.wait_for_timeout(100);page.screenshot(path=str(out/f'{width}-aim.png'))
   if not a.baseline:
    inspect=page.evaluate('fixture.inspect()');assert inspect['guide']and inspect['guideEnd']and inspect['barrels'];beforebarrel=inspect['barrels'];world=page.evaluate('JSON.stringify(fixture.world(),(_,v)=>typeof v==="bigint"?String(v):v)');page.locator('#angle-degrees').fill('90');page.wait_for_timeout(80);assert page.evaluate('fixture.inspect().barrels')!=beforebarrel;assert page.evaluate('JSON.stringify(fixture.world(),(_,v)=>typeof v==="bigint"?String(v):v)')==world
    handle=page.locator('#aim-handle').bounding_box();page.mouse.move(handle['x']+22,handle['y']+22);page.mouse.down();point=page.evaluate('fixture.point(1)');page.mouse.move(point['x']+60,point['y'],steps=8);page.mouse.up()
    assert 'FIRE 1 315' in page.locator('#text-memo').inner_text()
    page.locator('#close-panel').click();page.evaluate('fixture.select(1)');page.locator('#move-action').click();chosen=page.locator('#text-memo').text_content();point=page.evaluate('fixture.camera.cellPoint(fixture.world().cannons[0].cell)');page.mouse.move(point['sx'],point['sy']);page.wait_for_timeout(120);assert page.locator('#text-memo').text_content()==chosen;assert page.evaluate('fixture.inspect().hover.kind') in ['place','invalid'];page.screenshot(path=str(out/f'{width}-move.png'))
    cursor=page.locator('#board').evaluate('(n)=>getComputedStyle(n).cursor');assert 'reticle.svg' in cursor or cursor in ['not-allowed','crosshair'];page.mouse.click(point['sx'],point['sy']);page.wait_for_timeout(100)
    page.locator('#close-panel').click();page.evaluate('fixture.select(1)');page.locator('#build-action').click();sites=page.evaluate('fixture.sites()');assert sites;page.evaluate('(n)=>fixture.choose(n)',sites[0]);page.screenshot(path=str(out/f'{width}-build.png'));page.locator('#close-panel').click()
    await_motion='fixture.motion("idle",.1)';page.evaluate(await_motion);page.evaluate('fixture.markClock()');page.wait_for_timeout(200);page.locator('#identify-button').click();page.locator('#close-panel').click();assert page.evaluate('fixture.sameClock()');page.evaluate('fixture.playbackScale(300)');page.wait_for_timeout(1200);page.evaluate('fixture.appendMotion()');page.wait_for_timeout(350)
   assert not errors,errors
   rows.append({'viewport':[width,height],'metrics':metrics,'renderer':renderer,'errors':errors,'video':str(Path(page.video.path()).relative_to(out))if a.video else None});(out/'partial-results.json').write_text(json.dumps(rows,indent=2)+'\n');context.close();print('PASS',width,flush=True)
 finally:browser.close();server.shutdown()
(out/'results.json').write_text(json.dumps({'baseline':a.baseline,'synthetic_fixture':True,'video_during_measurement':a.video,'rows':rows},indent=2)+'\n')
