#!/usr/bin/env python3
"""Actual shader same-owner seam/interior pixel comparison; no ownership inference from colour."""
import argparse,functools,http.server,json,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--fixture-dir',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();out=a.output.absolute();out.mkdir(parents=True,exist_ok=False)
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(a.fixture_dir.absolute())));threading.Thread(target=server.serve_forever,daemon=True).start();rows=[]
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,chromium_sandbox=True)
 try:
  for dpr in [1,1.25,1.5,2]:
   c=b.new_context(viewport={'width':500,'height':400},device_scale_factor=dpr);page=c.new_page();page.goto(f'http://127.0.0.1:{server.server_port}');page.wait_for_function('()=>!!window.fixture');page.evaluate('fixture.terrainScene()')
   for scale in [2.73,9.37,48.25,96]:
    baseline=page.evaluate('s=>fixture.pixelCrop(500,500,s)',scale)
    for x,y in [(0,500),(500,0),(0,0),(1000,500),(500,1000),(1000,1000)]:
     seam=page.evaluate('([x,y,s])=>fixture.pixelCrop(x,y,s)',[x,y,scale]);delta=[abs(a-b)for a,b in zip(baseline,seam)];mean=sum(delta)/len(delta);large=sum(d>8 for d in delta)/len(delta);rows.append({'dpr':dpr,'scale':scale,'at':[x,y],'mean_abs_rgba':mean,'fraction_gt8':large})
     if mean>1.5 or large>.025:
      rows[-1]['interior_sample']=baseline[:32];rows[-1]['seam_sample']=seam[:32];rows[-1]['state']=page.evaluate('({camera:fixture.summary().camera,stats:fixture.summary().stats,surface:fixture.surface(500000)})');page.screenshot(path=str(out/'failure.png'))
     assert mean<=1.5 and large<=.025,rows[-1]
   c.close();print('PASS DPR',dpr,flush=True)
 finally:b.close();server.shutdown();(out/'comparisons.json').write_text(json.dumps(rows,indent=2)+'\n')
