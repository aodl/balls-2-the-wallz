import json,sys,functools,http.server,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
from importlib.machinery import SourceFileLoader
qa=SourceFileLoader('qa','.work/approved-panel-deployment-20261116/live-common.py').load_module();out=Path('.work/approved-panel-deployment-20261116/pinch-diagnostic');out.mkdir(exist_ok=False);rows=[]
class H(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
 def guess_type(self,p):return 'application/javascript'if p.endswith('.mjs')else'audio/flac'if p.endswith('.flac')else super().guess_type(p)
 def end_headers(self):
  for k,v in json.loads(Path('.work/approved-panel-war-cry/rollback/frontend/.ic-assets.json5').read_text())[0]['headers'].items():self.send_header(k,v)
  super().end_headers()
s=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(H,directory=str(Path('.work/approved-panel-war-cry/rollback/frontend').resolve())));threading.Thread(target=s.serve_forever,daemon=True).start()
with sync_playwright()as pw:
 b=pw.chromium.launch(headless=True,chromium_sandbox=True)
 try:
  for label,url in [('production',qa.URL),('rollback',f'http://127.0.0.1:{s.server_port}/')]:
   c=b.new_context(viewport={'width':320,'height':640},has_touch=True);p=c.new_page();c.route('**/*',lambda r:r.continue_()if r.request.method in ['GET','OPTIONS']or r.request.method=='POST'and r.request.url.endswith(('/query','/read_state'))else r.abort());p.add_init_script("globalThis.pointerQA=[];for(const name of ['pointerdown','pointermove','pointerup','pointercancel'])addEventListener(name,e=>{const snap=phase=>pointerQA.push({phase,event:name,id:e.pointerId,pointer:e.pointerType,x:e.clientX,y:e.clientY,at:performance.now(),angle:globalThis.__b2zExperience?.composer?.degrees,camera:globalThis.__b2zCamera?[__b2zCamera.x,__b2zCamera.y,__b2zCamera.scale]:null});snap('capture');queueMicrotask(()=>snap('microtask'));requestAnimationFrame(()=>snap('frame'));},true)");p.goto(url,wait_until='domcontentloaded');source,_=qa.enter_fire(p)
   for repeat in range(3):
    qa.heading(p,90);qa.settle(p);origin=p.evaluate('__b2zCamera.cellPoint(0)');x,y=origin['sx']+80,origin['sy'];p.mouse.move(x,y);p.mouse.down();p.mouse.move(x-5,y-20,steps=5);p.mouse.up();qa.frame(p);origin=p.evaluate('__b2zCamera.cellPoint(0)');x,y=origin['sx']-26,origin['sy']+4;dev=c.new_cdp_session(p);dev.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':11}]});dev.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+15,'y':y-14,'id':11}]});qa.frame(p);before=qa.snap(p);angle=before['composer']['degrees'];dev.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x+15,'y':y-14,'id':11},{'x':x+90,'y':y,'id':22}]});dev.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x-5,'y':y-25,'id':11},{'x':x+115,'y':y+10,'id':22}]});dev.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});qa.frame(p);p.wait_for_timeout(500);after=qa.snap(p);rows.append({'variant':label,'repeat':repeat,'before':before,'after':after,'equal':angle==after['composer']['degrees'],'pointer':p.evaluate('pointerQA')});p.screenshot(path=str(out/f'{label}-{repeat}.png'));(out/'results.json').write_text(json.dumps(rows,indent=2)+'\n');dev.detach()
   p.close();c.close()
 finally:b.close();s.shutdown()
