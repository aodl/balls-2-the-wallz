#!/usr/bin/env python3
"""Focused actual component/browser qualification; uses the existing canonical fixture."""
import argparse,functools,http.server,json,subprocess,threading,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
from fluid_playability_browser import verify_fluid_controls
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);p.add_argument('--video',action='store_true');a=p.parse_args();root=Path(__file__).resolve().parents[1];out=a.output.absolute();out.mkdir(parents=True,exist_ok=False)
subprocess.run(['node','tools/fixtures/prepare-playability-actions.mjs',str(out/'fixture.json')],check=True)
subprocess.run(['node_modules/.bin/esbuild','tools/fixtures/playability-action-browser.mjs','--bundle','--platform=browser','--format=esm','--outfile='+str(out/'fixture.mjs')],check=True)
(out/'index.html').write_text((root/'apps/b2z-observer/index.html').read_text().replace('src="./app.mjs"','src="./fixture.mjs"'));(out/'cursors').mkdir()
for n in ['style.css','icon.svg','cursors/reticle.svg']:(out/n).write_bytes((root/'apps/b2z-observer'/n).read_bytes())
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def end_headers(self):self.send_header('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'");super().end_headers()
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(out)));threading.Thread(target=server.serve_forever,daemon=True).start();rows=[]
with sync_playwright()as p:
 b=p.chromium.launch(headless=True,chromium_sandbox=True)
 try:
  for w,h in [(1440,900),(390,844),(320,640)]:
   c=b.new_context(viewport={'width':w,'height':h},has_touch=w<700,permissions=['clipboard-write'],**({'record_video_dir':str(out/'video'),'record_video_size':{'width':w,'height':h}}if a.video else{}));c.add_init_script('window.copied=[];const write=navigator.clipboard.writeText.bind(navigator.clipboard);navigator.clipboard.writeText=async v=>{await write(v);copied.push(v)}');page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(f'http://127.0.0.1:{server.server_port}');page.wait_for_function('()=>!!window.fixture');r=verify_fluid_controls(page,w,h,out);assert not errors,errors;r['video']=page.video.path()if page.video else None;c.close();rows.append(r);(out/'progress.json').write_text(json.dumps(rows,indent=2)+'\n');print('PASS',w,flush=True)
 except Exception:
  traceback.print_exc();page.screenshot(path=str(out/'failure.png'));(out/'failure.json').write_text(json.dumps({'errors':errors,'body':page.locator('body').inner_text()},indent=2));raise
 finally:b.close();server.shutdown()
(out/'results.json').write_text(json.dumps({'status':'PASS','rows':rows,'video':a.video},indent=2)+'\n')
