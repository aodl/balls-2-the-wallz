#!/usr/bin/env python3
"""Read-only isometric views of a pinned captured state. No legacy renderer or live/deployment claim."""
import argparse,functools,hashlib,http.server,json,subprocess,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--reference',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();out=a.output.absolute();out.mkdir(parents=True,exist_ok=False)
 state=Path(str(a.reference)+'-state.bin');record=json.loads(a.reference.with_suffix('.json').read_text());assert record['certificate_verified'] and record['world']['version']==5
 (out/'state.bin').write_bytes(state.read_bytes());(out/'reference.json').write_text(json.dumps({'state_sha256':hashlib.sha256(state.read_bytes()).hexdigest()}))
 subprocess.run(['node_modules/.bin/esbuild','tools/fixtures/million-visuals.mjs','--bundle','--platform=browser','--format=esm','--outfile='+str(out/'fixture.mjs')],cwd=ROOT,check=True)
 (out/'index.html').write_text('<!doctype html><link rel="stylesheet" href="fixture.css"><canvas id="board"></canvas><script type="module" src="fixture.mjs"></script>');(out/'fixture.css').write_text('html,body{margin:0;overflow:hidden;background:#151d24}canvas{width:100vw;height:100vh;display:block}')
 class Handler(http.server.SimpleHTTPRequestHandler):
  def log_message(self,*args):pass
  def end_headers(self):self.send_header('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'");super().end_headers()
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(out)));threading.Thread(target=server.serve_forever,daemon=True).start();rows=[]
 with sync_playwright()as pw:
  browser=pw.chromium.launch(headless=True,chromium_sandbox=True)
  try:
   for width,height in[(1440,900),(390,844),(320,640)]:
    context=browser.new_context(viewport={'width':width,'height':height});page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(f'http://127.0.0.1:{server.server_port}');page.wait_for_function('()=>Boolean(globalThis.visual)')
    c=record['world']['cannons'][0];x=c['cell']%1000+.5;y=c['cell']//1000+.5
    for name,cx,cy,scale,fixture in[('overview',500,500,None,'captured'),('cannon',x,y,48,'captured'),('seam',999.8,999.8,48,'wrapped-ball'),('ownership',x,y,16,'ownership')]:
     row=page.evaluate('(o)=>visual.configure(o)',{'x':cx,'y':cy,'scale':scale,'fixture':fixture});assert row['instances']['tiles']<=8192;page.screenshot(path=str(out/f'{width}-{name}.png'));rows.append({'viewport':[width,height],**row})
    assert not errors,errors;context.close()
  finally:browser.close();server.shutdown()
 (out/'results.json').write_text(json.dumps({'status':'PASS','qualification':__doc__,'rows':rows},indent=2)+'\n')
if __name__=='__main__':main()
