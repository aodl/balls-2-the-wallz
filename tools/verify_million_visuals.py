#!/usr/bin/env python3
"""Read-only, sandboxed browser comparison of the exact old/new arena renderers.
Pinned captured state comparisons are separate from fresh IC-root live acceptance.
No canister mutation, signing identity, or browser security-policy override.
"""
import argparse,hashlib,http.server,json,os,subprocess,threading,time
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def wait_eval(page,expression,arg=None,timeout=90):
 end=time.monotonic()+timeout
 while time.monotonic()<end:
  if page.evaluate(expression,arg):return
  page.wait_for_timeout(200)
 raise TimeoutError('Browser predicate: '+expression)
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--reference',type=Path,required=True);p.add_argument('--before-assets',type=Path,required=True);p.add_argument('--after-assets',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--base-ref',default='5899df61f0a5f540d91956dc5b6006ec708a5a1e');p.add_argument('--live',action='store_true');a=p.parse_args();a.output.mkdir(parents=True,exist_ok=False);out=a.output.resolve();fixture=out/'fixture';fixture.mkdir()
 state=Path(str(a.reference)+'-state.bin');record=json.loads(a.reference.with_suffix('.json').read_text());assert record['certificate_verified'] and record['world']['version']==5
 (fixture/'state.bin').write_bytes(state.read_bytes());(fixture/'reference.json').write_text(json.dumps({'state_sha256':sha(state),'capture':str(a.reference),'recorded_at':record['recorded_at']}))
 old=subprocess.check_output(['git','show',a.base_ref+':apps/b2z-observer/app.mjs'],cwd=ROOT,text=True);start=old.index('function drawTerritory(');end=old.index('function frame(',start)
 source="import {wrap} from '"+str(ROOT/'apps/b2z-observer/camera.mjs')+"';\nimport {heading} from '"+str(ROOT/'packages/kernels/b2z/math.mjs')+"';\nexport function createBefore({canvas,ctx,camera,getView,getTime,getSelected}){\nlet visible,visibleTime,focusOnNextDraw=false;const color=id=>['#30415b','#54f0d2','#84b7ff','#e4a4ff','#ffc778','#ff8b9b'][id===0?0:1+(id-1)%5];const timeNumber=r=>Number(r[0])/Number(r[1]);const arcade={selectedCannon:getSelected,moveSelection:()=>null};const map=document.createElement('canvas');map.width=160;map.height=160;const $=id=>id==='minimap'?map:null;\n"+old[start:end]+"\nreturn ()=>{visible=getView();visibleTime=getTime();draw();};}"
 (fixture/'before-source.mjs').write_text(source)
 for entry,name in [(fixture/'before-source.mjs','before-render.mjs'),(ROOT/'tools/fixtures/million-visuals.mjs','fixture.mjs')]:
  subprocess.run([str(ROOT/'node_modules/.bin/esbuild'),str(entry),'--bundle','--format=esm','--platform=browser','--external:./before-render.mjs','--outfile='+str(fixture/name)],cwd=ROOT,check=True)
 (fixture/'index.html').write_text('<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="./fixture.css"><canvas id="board"></canvas><p id="qualification"></p><script type="module" src="./fixture.mjs"></script>')
 (fixture/'fixture.css').write_text('html,body{margin:0;background:#071423;overflow:hidden}canvas{display:block;width:100vw;height:100vh}p{position:fixed;bottom:0;left:8px;color:#c8d7e8;font:11px system-ui;background:#071423dd;padding:4px;max-width:90vw;pointer-events:none}')
 roots={'fixture':fixture,'before':a.before_assets.resolve(),'after':a.after_assets.resolve()}
 class Handler(http.server.BaseHTTPRequestHandler):
  def do_GET(self):
   path=self.path.split('?',1)[0].split('/');group=path[1] if len(path)>1 else '';name='/'.join(path[2:]) or 'index.html'
   if group not in roots or '/' in name or name.startswith('.') or name.endswith(('.pem','.env')):self.send_error(404);return
   f=roots[group]/name
   if not f.is_file() or f.suffix not in {'.html','.css','.mjs','.bin','.json','.svg'}:self.send_error(404);return
   data=f.read_bytes();self.send_response(200);self.send_header('Content-Type',{'.mjs':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'}.get(f.suffix,'application/octet-stream'));self.send_header('Content-Length',str(len(data)));self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff');self.send_header('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self' https://icp-api.io; img-src 'self'; font-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");self.end_headers();self.wfile.write(data)
  def do_POST(self):self.send_error(405)
  def log_message(self,*args):pass
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}'
 report={'status':'RUNNING','base_ref':a.base_ref,'captured_state_sha256':sha(state),'comparison_qualification':'Exact baseline drawing functions, shared camera coordinates and scale, fixed captured v5 state. Close-up baseline views may exceed the former UI zoom limit; old UI limits are verified separately. Ownership fixture explicitly synthetic. Fresh mainnet certificate verification is a separate live gate.','screenshots':[],'performance':[],'live':[]}
 def save():(out/'results.json').write_text(json.dumps(report,indent=2)+'\n')
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,chromium_sandbox=True)
  try:
   for width,height in [(1440,900),(390,844)]:
    context=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1)
    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    reference=record['world'];c=reference['cannons'][0];cx=c['cell']%1000+.5;cy=c['cell']//1000+.5;t=int(reference['time'][0])/int(reference['time'][1]);ball=reference['balls'][0];bx=(int(ball['x0'])+ball['vx']*t)/1024%1000;by=(int(ball['y0'])+ball['vy']*t)/1024%1000
    scenes=[('overview',500,500,.9*min(width,height)/1000,'captured'),('medium',cx,cy,8,'captured'),('close-cannon',cx,cy,48,'captured'),('close-ball',bx,by,48,'captured'),('maximum',bx,by,96,'captured'),('seam',999.8,999.8,48,'wrapped-ball'),('overrides',cx,cy,16,'ownership')]
    for before in [True,False]:
     page.goto(url+'/fixture/?'+('before=1' if before else 'after=1'));wait_eval(page,'Boolean(globalThis.visual)')
     for name,x,y,scale,fixture_name in scenes:
      info=page.evaluate('options=>visual.configure(options)',{'x':x,'y':y,'scale':scale,'fixture':fixture_name});assert info['camera']=={'x':x,'y':y,'scale':scale}
      image=f'{width}-{name}-'+('before' if before else 'after')+'.png';page.screenshot(path=str(out/image));report['screenshots'].append({'path':image,'viewport':[width,height],**info})
      if not before and name=='overrides':
       assert page.evaluate('visual.pixel(295.5,47.5)')==[57,85,123,255], 'override must replace base with opaque owner 2'
       assert page.evaluate('visual.pixel(295.5,46.5)')==[12,25,41,255], 'unowned override must remove underlying territory'
      if not before and name=='overview':
       assert page.evaluate('visual.pixel(312.9,500.5)')==page.evaluate('visual.pixel(313.1,500.5)'), 'same-owner base edge must have no seam'
      if name in ['overview','medium','close-ball']:
       perf=page.evaluate('visual.measure(90)');report['performance'].append({'viewport':[width,height],'scene':name,**perf});save()
    assert not errors,errors;context.close()
   if a.live:
    # Actual production verifier + CSP + browser-native Web Crypto. Queries only.
    for width,height in [(1440,900),(390,844)]:
     context=browser.new_context(viewport={'width':width,'height':height},has_touch=True);context.add_init_script('''(()=>{const native=requestAnimationFrame;globalThis.__visualFrames=[];let prior=null;globalThis.requestAnimationFrame=fn=>native(t=>{const start=performance.now();try{fn(t);}finally{if(fn.name==='frame'){if(__visualFrames.length<3600)__visualFrames.push({ms:performance.now()-start,interval:prior===null?null:t-prior});prior=t;}}});})();''');page=context.new_page();errors=[];posts=[];blocked=[];page.on('pageerror',lambda e:errors.append(str(e)))
     def route(r):
      if r.request.method=='POST':
       posts.append(r.request.url)
       if not r.request.url.endswith(('/query','/read_state')):blocked.append(r.request.url);r.abort();return
      r.continue_()
     context.route('**/*',route);page.goto(url+'/before/',timeout=60000);wait_eval(page,'Boolean(globalThis.__dtrLive?.connected)');page.wait_for_timeout(100);old_default=page.evaluate('({x:__b2zCamera.x,y:__b2zCamera.y,scale:__b2zCamera.scale})');page.screenshot(path=str(out/f'{width}-live-before-default.png'));page.evaluate('__b2zCamera.zoom(1e6)');old_max=page.evaluate('__b2zCamera.scale');assert abs(old_max-.9*min(width,height)/1000*24)<1e-7;page.screenshot(path=str(out/f'{width}-live-before-max.png'));page.goto(url+'/after/',timeout=60000);wait_eval(page,'Boolean(globalThis.__dtrLive?.connected)')
     assert '1,000 × 1,000' in page.locator('#world-rules').text_content();page.wait_for_timeout(100);camera=page.evaluate('({x:__b2zCamera.x,y:__b2zCamera.y,scale:__b2zCamera.scale})');assert camera['scale']==24,camera
     page.screenshot(path=str(out/f'{width}-live-default.png'));page.locator('#board').click(position={'x':width/2,'y':height/2});assert page.locator('#play-dialog').evaluate('(e)=>e.open');page.keyboard.press('Escape')
     page.locator('#toolbar-view').click();page.locator('#fit-world').click();page.wait_for_timeout(100);fit=page.evaluate('__b2zCamera.scale');assert abs(fit-.9*min(width,height)/1000)<1e-9
     page.locator('#centre-cannon').click();assert page.evaluate('__b2zCamera.scale')==24;page.keyboard.press('Escape')
     page.locator('#board').click(position={'x':width/2,'y':height/2});page.wait_for_timeout(200);assert page.locator('#play-dialog').evaluate('(e)=>e.open')
     page.locator('#action-mode').select_option('ball');wait_eval(page,'!document.getElementById("prepare-transfer").disabled');page.locator('#prepare-transfer').click();assert page.locator('#text-memo').text_content().startswith('ANGLE ')
     page.keyboard.press('Escape')
     # Wheel and pinch anchor, actual drag, exact cell picking and local payment preparation.
     page.mouse.move(round(width*.4),round(height*.4));anchor=page.evaluate('(p)=>__b2zCamera.world(p.x,p.y)',{'x':round(width*.4),'y':round(height*.4)});scale=page.evaluate('__b2zCamera.scale');page.mouse.wheel(0,-120);page.wait_for_timeout(100);assert abs(page.evaluate('__b2zCamera.scale')/scale-__import__('math').exp(.36))<1e-7
     after=page.evaluate('(p)=>__b2zCamera.world(p.x,p.y)',{'x':round(width*.4),'y':round(height*.4)});assert all(abs(anchor[k]-after[k])<1e-7 for k in ['x','y'])
     page.evaluate('__b2zCamera.scale=24;__b2zCamera.centre('+str(cx)+','+str(cy)+')');before_drag=page.evaluate('__b2zCamera.x');page.mouse.move(width*.5,height*.5);page.mouse.down();page.mouse.move(width*.5+40,height*.5+20,steps=5);page.mouse.up();assert abs(page.evaluate('__b2zCamera.x')-(before_drag-40/24))<1e-7
     cdp=context.new_cdp_session(page);middle={'x':round(width*.5),'y':round(height*.4)};before_pinch=page.evaluate('(p)=>({scale:__b2zCamera.scale,...__b2zCamera.world(p.x,p.y)})',middle)
     points=lambda spread:[{'x':middle['x']-spread,'y':middle['y'],'id':1},{'x':middle['x']+spread,'y':middle['y'],'id':2}]
     cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':points(40)});cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':points(60)});cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_timeout(100);after_pinch=page.evaluate('(p)=>({scale:__b2zCamera.scale,...__b2zCamera.world(p.x,p.y)})',middle);assert abs(after_pinch['scale']/before_pinch['scale']-1.5)<1e-7 and all(abs(before_pinch[k]-after_pinch[k])<1e-7 for k in ['x','y'])
     map_box=page.locator('#minimap').bounding_box();page.mouse.click(map_box['x']+map_box['width']/2,map_box['y']+map_box['height']/2);assert abs(page.evaluate('__b2zCamera.x')-500)<1
     page.evaluate('__b2zCamera.frameCell('+str(c['cell'])+')');page.locator('#toolbar-play').click();page.locator('#action-mode').select_option('move');page.locator('#pick-move').click();target=c['cell']+1;screen=page.evaluate('(n)=>__b2zCamera.screen(n%1000+.5,Math.floor(n/1000)+.5)',target);page.mouse.click(screen['x'],screen['y']);assert page.locator('#move-cell').input_value()==str(target);page.locator('#prepare-transfer').click();assert page.locator('#text-memo').text_content()==f'MOVE {target}';page.keyboard.press('Escape')
     page.evaluate('__b2zCamera.zoom(1e6)');assert page.evaluate('__b2zCamera.scale')==96;page.screenshot(path=str(out/f'{width}-live-max.png'));page.evaluate('__b2zCamera.scale=24')
     page.evaluate('__b2zCamera.zoom(2,100,200)');point=page.evaluate('__b2zCamera.world(100,200)');page.evaluate('__b2zCamera.zoom(.5,100,200)');page.evaluate('__b2zCamera.zoom(2,100,200)');assert all(abs(page.evaluate('__b2zCamera.world(100,200)')[k]-point[k])<1e-7 for k in ['x','y'])
     deliberate=page.evaluate('()=>{__b2zCamera.pan(20,-10);return {x:__b2zCamera.x,y:__b2zCamera.y,scale:__b2zCamera.scale};}')
     initial=page.evaluate('__dtrLive.heads.at(-1)');wait_eval(page,'(n)=>__dtrLive.heads.at(-1)>n',initial,60);assert page.evaluate('({x:__b2zCamera.x,y:__b2zCamera.y,scale:__b2zCamera.scale})')==deliberate
     page.evaluate('globalThis.__visualOldLive=__dtrLive;document.getElementById("restart").click()');wait_eval(page,'globalThis.__dtrLive!==globalThis.__visualOldLive && __dtrLive.connected');assert page.evaluate('({x:__b2zCamera.x,y:__b2zCamera.y,scale:__b2zCamera.scale})')==deliberate
     assert not errors and not blocked,(errors,blocked);report['live'].append({'viewport':[width,height],'status':'PASS','actual_IC_root_and_v8':True,'baseline_default':old_default,'baseline_max_scale':old_max,'candidate_max_scale':96,'frame_samples':page.evaluate('globalThis.__visualFrames'),'default_camera':camera,'publications_and_reconnect_preserve_deliberate_camera':True,'wheel_pinch_pan_minimap_picking_payment_preparation':True,'read_only_posts':len(posts),'errors':errors});save();context.close()
   report['status']='PASS';save()
  except BaseException as e:
   report.update(status='FAIL',error=type(e).__name__+': '+str(e))
   try:report['failure_state']=page.evaluate('({error:document.querySelector("#error-text")?.textContent,live:globalThis.__dtrLive})');page.screenshot(path=str(out/'failure.png'))
   except Exception:pass
   save();raise
  finally:browser.close();server.shutdown()
 print(json.dumps({'status':report['status'],'screenshots':len(report['screenshots']),'live_cases':len(report['live'])},indent=2))
if __name__=='__main__':main()
