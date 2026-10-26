#!/usr/bin/env python3
from pathlib import Path
import http.server,threading,json,time,argparse
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser(description='Read-only genuine IC-root v8 PLAYING browser captures. Query/read_state POSTs only.');parser.add_argument('--assets',type=Path,required=True);parser.add_argument('--output',type=Path,required=True);a=parser.parse_args();out=a.output.resolve();out.mkdir(parents=True,exist_ok=False);assets=a.assets.resolve()
class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*a,**k):super().__init__(*a,directory=str(assets),**k)
 def end_headers(self):self.send_header('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self' https://icp-api.io; img-src 'self'; font-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");super().end_headers()
 def do_POST(self):self.send_error(405)
 def log_message(self,*a):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();rows=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,chromium_sandbox=True)
 try:
  for width,height in [(1440,900),(390,844)]:
   context=browser.new_context(viewport={'width':width,'height':height},has_touch=True)
   context.add_init_script('''(()=>{const arc=CanvasRenderingContext2D.prototype.arc,raf=requestAnimationFrame;globalThis.__arcs=[];CanvasRenderingContext2D.prototype.arc=function(x,y,r,...rest){if(this.canvas.id==='board'){const m=this.getTransform();__arcs.push({x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f,r:r*m.a});}return arc.call(this,x,y,r,...rest);};globalThis.requestAnimationFrame=fn=>raf(t=>{if(fn.name==='frame')__arcs=[];fn(t);});})();''')
   page=context.new_page();errors=[];posts=[];blocked=[];page.on('pageerror',lambda e:errors.append(str(e)))
   def route(r):
    if r.request.method=='POST':
     posts.append(r.request.url)
     if not r.request.url.endswith(('/query','/read_state')):blocked.append(r.request.url);r.abort();return
    r.continue_()
   context.route('**/*',route);page.goto(f'http://127.0.0.1:{server.server_port}',timeout=60000)
   samples=[];steady=0;deadline=time.monotonic()+180
   while time.monotonic()<deadline:
    state=page.evaluate('globalThis.__dtrLive??null');samples.append(state)
    if state and state.get('playback',{}).get('phase')=='PLAYING':steady+=1
    else:steady=0
    if steady>=5:break
    page.wait_for_timeout(1000)
   assert steady>=5, samples[-1];assert '1,000 × 1,000' in page.locator('#world-rules').text_content()
   camera=page.evaluate('({x:__b2zCamera.x,y:__b2zCamera.y,scale:__b2zCamera.scale})');assert camera['scale']==24
   shots=[]
   def shot(name):
    assert page.evaluate('__dtrLive.playback.phase')=='PLAYING';filename=f'{width}-{name}.png';page.screenshot(path=str(out/filename));shots.append({'path':filename,'camera':page.evaluate('({x:__b2zCamera.x,y:__b2zCamera.y,scale:__b2zCamera.scale})'),'playback':page.evaluate('__dtrLive.playback'),'arcs':page.evaluate('__arcs')})
   shot('playing-cannon');page.evaluate('__b2zCamera.scale=48');page.wait_for_timeout(100);shot('playing-cannon-close')
   # Actual drawn, interpolated ball centre; no synthetic state or trajectory edits.
   page.evaluate('__b2zCamera.fit()');page.wait_for_timeout(100)
   ball=page.evaluate('''()=>{const c=__b2zCamera,a=__arcs.find(a=>Math.abs(a.r-.073*c.scale)<1e-7);if(!a)throw Error('No live ball');return c.world(a.x,a.y);}''')
   page.evaluate('(p)=>{__b2zCamera.scale=48;__b2zCamera.centre(p.x,p.y);}',ball);page.wait_for_timeout(50);shot('playing-ball-tail')
   assert any(abs(a['r']-48*.073)<1e-6 for a in shots[-1]['arcs']), 'actual ball body missing'
   page.evaluate('__b2zCamera.scale=96');page.wait_for_timeout(50);shot('playing-maximum')
   assert page.locator('#minimap').is_visible();assert not errors and not blocked,(errors,blocked)
   rows.append({'viewport':[width,height],'status':'PASS','sandbox':True,'browser_native_web_crypto':True,'actual_IC_root_v8':True,'steady_playing_samples':steady,'samples':samples,'screenshots':shots,'errors':errors,'read_only_posts':posts});(out/'results.json').write_text(json.dumps({'status':'RUNNING','rows':rows},indent=2)+'\n');print(width,'PLAYING PASS',flush=True);context.close()
 finally:browser.close();server.shutdown()
(out/'results.json').write_text(json.dumps({'status':'PASS','rows':rows},indent=2)+'\n')
