import functools,http.server,threading,json
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path('.work/graphite-deflectors/bench-final').resolve();out=Path('.work/graphite-deflectors/final-model-gallery');out.mkdir(exist_ok=False)
class H(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(H,directory=str(root)));threading.Thread(target=server.serve_forever,daemon=True).start();rows=[];errors=[]
with sync_playwright()as pw:
 b=pw.chromium.launch(headless=True,chromium_sandbox=True)
 try:
  for width,height in [(1440,900),(390,844),(320,640)]:
   c=b.new_context(viewport={'width':width,'height':height});p=c.new_page();p.on('pageerror',lambda e:errors.append(str(e)));p.goto(f'http://127.0.0.1:{server.server_port}');p.wait_for_function('()=>!!globalThis.graphite')
   for angle in [0,22.5,45,90,135,180,225,270,315]:
    stats=p.evaluate('(angle)=>graphite.scene({cannons:1,deflectors:1,scale:160,angle})',angle);p.screenshot(path=str(out/f'{width}-models-{angle}.png'));rows.append({'viewport':[width,height],'angle':angle,'stats':stats})
   p.evaluate('graphite.scene({cannons:8,scale:36})');p.screenshot(path=str(out/f'{width}-palette-extremes.png'));p.evaluate('graphite.scene({cannons:1,deflectors:1,scale:64})');p.screenshot(path=str(out/f'{width}-working-scale.png'));c.close()
  assert not errors;print('PASS actual shared renderer nine headings, normal-scale and palette captures')
 finally:b.close();server.shutdown();(out/'results.json').write_text(json.dumps({'status':'FAIL'if errors else'PASS','scope':'Final indexed runtime shared renderer; synthetic art scene, not paid structures or authenticated Deflector state. Palette overrides are controlled contrast extremes, not changed game colours.','rows':rows,'errors':errors},indent=2)+'\n')
