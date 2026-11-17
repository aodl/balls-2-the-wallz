#!/usr/bin/env python3
"""Actual shared renderer art/cost fixture; synthetic populations, no authenticated gameplay."""
import argparse,functools,http.server,json,threading,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);p.add_argument('--baseline-root',type=Path);p.add_argument('--smoke',action='store_true');a=p.parse_args();out=a.output.absolute();out.mkdir(parents=True,exist_ok=False);root=Path(__file__).resolve().parents[1]
subprocess.run(['node','tools/fixtures/prepare-playability-actions.mjs',str(out/'fixture.json')],check=True)
entry=root/'tools/fixtures/graphite-visual-browser.mjs'
if a.baseline_root:
 text=entry.read_text().replace("'../../apps/b2z-observer/render.mjs'",repr(str(a.baseline_root.absolute()/'apps/b2z-observer/render.mjs')))
 # Keep relative non-renderer dependencies in the isolated worktree.

 for name in ['camera.mjs','model.mjs']:text=text.replace("'../../apps/b2z-observer/"+name+"'",repr(str(root/'apps/b2z-observer'/name)))
 text=text.replace("'@dtr/timeline-runtime/runtime/canonical'",repr(str(root/'node_modules/@dtr/timeline-runtime/packages/runtime/canonical.mjs')))
 entry=out/'baseline-entry.mjs';entry.write_text(text)
subprocess.run(['node_modules/.bin/esbuild',str(entry),'--bundle','--format=esm','--platform=browser','--outfile='+str(out/'fixture.mjs')],check=True)
(out/'index.html').write_text('<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="style.css"></head><body><canvas id="board"></canvas><script type="module" src="fixture.mjs"></script></body></html>');(out/'style.css').write_bytes((root/'apps/b2z-observer/style.css').read_bytes())
class H(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
s=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(H,directory=str(out)));threading.Thread(target=s.serve_forever,daemon=True).start();report={'status':'RUNNING','scope':__doc__,'baseline':bool(a.baseline_root),'rows':[],'errors':[]}
try:
 with sync_playwright()as pw:
  b=pw.chromium.launch(headless=True,chromium_sandbox=True)
  for width,height in [(1440,900),(390,844),(320,640)]:
   c=b.new_context(viewport={'width':width,'height':height});page=c.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)));page.goto(f'http://127.0.0.1:{s.server_port}');page.wait_for_function('()=>!!globalThis.graphite')
   for count,scale in ([(1,64),(128,8)]if a.smoke else[(1,64),(32,20),(128,8),(128,2)]):
    page.evaluate('(p)=>graphite.scene(p)',{'cannons':count,'scale':scale});measurement=page.evaluate('graphite.measure(4)'if a.smoke else'graphite.measure(60)');report['rows'].append({'width':width,'height':height,'cannons':count,'scale':scale,**measurement});page.screenshot(path=str(out/f'{width}-{count}-{scale}.png'))
   if not a.baseline_root:
    for angle in ([0,45]if a.smoke else[0,22.5,45,90,135,180,225,270,315]):
     page.evaluate('(angle)=>graphite.scene({cannons:1,deflectors:1,scale:160,angle})',angle);page.screenshot(path=str(out/f'{width}-models-{angle}.png'))
    page.evaluate('graphite.scene({cannons:128,deflectors:256,scale:8})');report['rows'].append({'width':width,'height':height,'cannons':128,'deflectors':256,'scale':8,**page.evaluate('graphite.measure(4)'if a.smoke else'graphite.measure(60)')});page.screenshot(path=str(out/f'{width}-mixed.png'))
   c.close()
  assert not report['errors'],report['errors'];report['status']='PASS';b.close()
except Exception as e:report.update(status='FAIL',error=str(e));raise
finally:(out/'results.json').write_text(json.dumps(report,indent=2)+'\n');s.shutdown()
