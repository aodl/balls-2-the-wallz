#!/usr/bin/env python3
"""Rendered controlled return/retention with actual component fixture. Not genuine tab hiding."""
from human_input import set_heading,choose_cell,chosen_cell,heading_value
import argparse,functools,http.server,json,threading,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--fixture-dir',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--video',action='store_true');a=p.parse_args();out=a.output.absolute();out.mkdir(parents=True,exist_ok=False);rows=[]
class H(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
s=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(H,directory=str(a.fixture_dir.absolute())));threading.Thread(target=s.serve_forever,daemon=True).start()
with sync_playwright()as pw:
 b=pw.chromium.launch(headless=True,chromium_sandbox=True)
 try:
  for w,h in [(1440,900),(390,844),(320,640)]:
   c=b.new_context(viewport={'width':w,'height':h},**({'record_video_dir':str(out/'video'),'record_video_size':{'width':w,'height':h}}if a.video else{}));page=c.new_page();errors=[];requests=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url));page.goto(f'http://127.0.0.1:{s.server_port}');page.wait_for_function('()=>!!globalThis.fixture');page.evaluate('async()=>{await fixture.motion("wrap",.01);fixture.camera.scale=96;const b=fixture.displayedBalls()[0];fixture.camera.centre(b.x,b.y);fixture.draw()}');page.locator('#board').focus();page.keyboard.press('b');page.wait_for_function('()=>fixture.shell.controller.following&&!fixture.shell.controller.active');assert page.locator('#workspace').is_hidden();assert page.evaluate('fixture.summary().account')is None
   page.evaluate('fixture.markClock()');before=page.evaluate('fixture.controlledHide()');calls=len(requests);page.wait_for_timeout(200);assert page.evaluate('fixture.summary().time')==before['playhead'];returned=page.evaluate('()=>{const at=performance.now(),r=fixture.controlledReturn();return{...r,latencyMs:r.renderedAt-at}}');assert returned['state']['playhead']==before['playhead'];assert returned['state']['available']==before['available'];assert returned['sameClock'];assert returned['state']['buffer']>.9;page.wait_for_function('(t)=>fixture.summary().time>t',arg=before['playhead'],timeout=5000);assert len(requests)==calls
   page.evaluate('fixture.controlledHide()');admissions=[]
   for _ in range(3):admissions.append(page.evaluate('fixture.controlledAppend()'))
   returned_new=page.evaluate('()=>{const at=performance.now(),r=fixture.controlledReturn();return{...r,latencyMs:r.renderedAt-at}}');assert returned_new['sameClock'];assert returned_new['queue']==1;assert abs(returned_new['state']['buffer']-1)<1e-8;assert page.evaluate('fixture.camera.scale')==96;page.wait_for_function('(t)=>fixture.summary().time>t',arg=returned_new['state']['playhead'],timeout=5000);assert page.evaluate('Boolean(fixture.shell.controller.following)');assert page.locator('#stop-follow').count()==0;assert page.evaluate('fixture.sameClock()');page.evaluate('fixture.playbackScale(20)');page.wait_for_timeout(2500);page.screenshot(path=str(out/f'{w}-verified-return.png'));assert not errors,errors
   rows.append({'viewport':[w,h],'same_head':returned,'three_new_intervals':returned_new,'admissions':admissions,'requests_during_controlled_return':len(requests)-calls,'displayed_follow_preserved':True,'zoom':96,'video':page.video.path()if page.video else None,'scope':'Explicitly paused fixture presentation, injected integrity-checked canonical segments; not IC-certified; not real visibility, certificate, background scheduler, device or production timing evidence.'});(out/'progress.json').write_text(json.dumps(rows,indent=2)+'\n');c.close();print('PASS',w,flush=True)
 except Exception:
  traceback.print_exc();page.screenshot(path=str(out/'failure.png'));raise
 finally:b.close();s.shutdown()
(out/'results.json').write_text(json.dumps({'status':'PASS','scope':__doc__,'rows':rows,'video':a.video},indent=2)+'\n')
