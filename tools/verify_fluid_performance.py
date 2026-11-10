#!/usr/bin/env python3
"""Bounded matched populated comparison; no video, no performance pass inferred."""
import argparse,functools,http.server,json,threading,time
from pathlib import Path
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--baseline',type=Path,required=True);p.add_argument('--candidate',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();out=a.output.absolute();out.mkdir(parents=True,exist_ok=False);rows=[]
class H(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
with sync_playwright()as pw:
 browser=pw.chromium.launch(headless=True,chromium_sandbox=True)
 try:
  for label,directory in [('deployed-runtime',a.baseline),('candidate',a.candidate)]:
   server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(H,directory=str(directory.absolute())));threading.Thread(target=server.serve_forever,daemon=True).start()
   try:
    for width,height in [(1440,900),(390,844),(320,640)]:
     c=browser.new_context(viewport={'width':width,'height':height});page=c.new_page();page.goto(f'http://127.0.0.1:{server.server_port}');page.wait_for_function('()=>!!globalThis.fixture');page.locator('#identify-button').click();page.locator('#sending-account').fill('aaaaa-aa');page.locator('#identity-save').click();page.locator('#close-panel').click();session=c.new_cdp_session(page);session.send('Performance.enable');gpu=page.evaluate('()=>{const g=document.getElementById("board").getContext("webgl2"),e=g.getExtension("WEBGL_debug_renderer_info");return e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER)}')
     for scene in ['six-entity-seam','verified-motion-and-panel']:
      if scene=='six-entity-seam':page.evaluate('fixture.render("bridge_both","initial");fixture.camera.centre(103.5,.6);fixture.camera.scale=48;fixture.draw()')
      else:page.evaluate('async()=>{await fixture.motion("idle",.1);fixture.playbackScale(1);fixture.select(1);fixture.camera.scale=48;fixture.camera.frameCell(fixture.world().cannons.find(c=>c.id===1).cell);fixture.draw()}')
      if scene=='verified-motion-and-panel':page.locator('#fire-action').click()
      page.wait_for_timeout(400);page.evaluate('fixture.metricsReset()');before={v['name']:v['value']for v in session.send('Performance.getMetrics')['metrics']};start=time.monotonic();page.wait_for_timeout(5000);elapsed=time.monotonic()-start;after={v['name']:v['value']for v in session.send('Performance.getMetrics')['metrics']};metrics=page.evaluate('fixture.metrics()');latency=page.evaluate('()=>new Promise(resolve=>{const t=performance.now();document.getElementById("board").dispatchEvent(new PointerEvent("pointermove",{clientX:50,clientY:50,bubbles:true}));requestAnimationFrame(()=>resolve(performance.now()-t))})');page.screenshot(path=str(out/f'{label}-{width}-{scene}.png'));rows.append({'variant':label,'viewport':[width,height],'scene':scene,'elapsed_seconds':elapsed,'metrics':metrics,'population':page.evaluate('({cannons:fixture.summary().cannons,balls:fixture.summary().balls})'),'cpu_task_seconds':after['TaskDuration']-before['TaskDuration'],'layout_seconds':after['LayoutDuration']-before['LayoutDuration'],'script_seconds':after['ScriptDuration']-before['ScriptDuration'],'pointer_to_next_frame_ms':latency,'gpu':gpu});(out/'progress.json').write_text(json.dumps(rows,indent=2)+'\n');print(label,width,scene,metrics.get('p95'),flush=True)
     c.close()
   finally:server.shutdown()
 finally:browser.close()
(out/'results.json').write_text(json.dumps({'status':'MEASURED','browser':browser.version,'rows':rows,'limitations':'Software WebGL and emulated viewports; no hardware/physical-phone smoothness claim. Five-second bounded windows, no video encoding. Interaction latency is synthetic pointer dispatch to next render frame, not native input latency.'},indent=2)+'\n')
