#!/usr/bin/env python3
from pathlib import Path
import http.server,threading,subprocess,json,argparse
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser(description='Sandboxed synthetic fragmented v5 renderer stress; no authenticated-state claims or canister mutations.');parser.add_argument('--state',type=Path,required=True);parser.add_argument('--output',type=Path,required=True);a=parser.parse_args();root=Path(__file__).resolve().parents[1];out=a.output.resolve();out.mkdir(parents=True,exist_ok=False);label=out.name
subprocess.run(['node_modules/.bin/esbuild',str(root/'tools/fixtures/million-render-stress.mjs'),'--bundle','--platform=browser','--format=esm','--outfile='+str(out/'stress.mjs')],check=True)
(out/'state.bin').write_bytes(a.state.read_bytes());(out/'index.html').write_text('<!doctype html><link rel="stylesheet" href="style.css"><canvas></canvas><script type="module" src="stress.mjs"></script>');(out/'style.css').write_text('body{margin:0;background:#071423;overflow:hidden}')
class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*a,**k):super().__init__(*a,directory=str(out.resolve()),**k)
 def end_headers(self):self.send_header('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'");super().end_headers()
 def log_message(self,*a):pass
 def do_POST(self):self.send_error(405)
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();rows=[]
def allocated(node):return node.get('selfSize',0)+sum(allocated(c) for c in node.get('children',[]))
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,chromium_sandbox=True)
 try:
  for width,height in [(1440,900),(390,844)]:
   for count in [10000,50000]:
    for scene,scale in [('overview',.9*min(width,height)/1000),('close',48)]:
     context=b.new_context(viewport={'width':width,'height':height});page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(f'http://127.0.0.1:{server.server_port}');
     for _ in range(200):
      if page.evaluate('Boolean(globalThis.stress)'):break
      page.wait_for_timeout(100)
     cdp=context.new_cdp_session(page);cdp.send('HeapProfiler.enable');cdp.send('HeapProfiler.collectGarbage');heap_before=cdp.send('Runtime.getHeapUsage');cdp.send('HeapProfiler.startSampling',{'samplingInterval':32768,'includeObjectsCollectedByMajorGC':True,'includeObjectsCollectedByMinorGC':True})
     setup=page.evaluate('options=>stress.setup(options)',{'count':count,'width':width,'height':height,'scale':scale});profile_build=cdp.send('HeapProfiler.stopSampling')['profile'];cdp.send('HeapProfiler.collectGarbage');heap_cached=cdp.send('Runtime.getHeapUsage');page.evaluate('stress.measure(20)')
     cdp.send('HeapProfiler.startSampling',{'samplingInterval':32768,'includeObjectsCollectedByMajorGC':True,'includeObjectsCollectedByMinorGC':True});measurement=page.evaluate('stress.measure(120)');profile=cdp.send('HeapProfiler.stopSampling')['profile'];pan_measurement=page.evaluate('stress.measure(60,true)');heap_end=cdp.send('Runtime.getHeapUsage');cdp.send('HeapProfiler.collectGarbage');heap_gc=cdp.send('Runtime.getHeapUsage');assert not errors,errors
     row={**setup,'scene':scene,**measurement,'pan_measurement':pan_measurement,'heap_before':heap_before,'heap_after_cache':heap_cached,'heap_after_frames':heap_end,'heap_after_final_gc':heap_gc,'sampled_build_allocation_bytes':allocated(profile_build['head']),'sampled_frame_allocation_bytes':allocated(profile['head']),'allocation_sampling_interval_bytes':32768,'qualification':'Synthetic fragmented v5 rendering stress. 50k disjoint intervals may exceed production wire-size limits; no authenticated-state or performance gate was changed.'};rows.append(row);(out/'results.json').write_text(json.dumps({'status':'RUNNING','rows':rows},indent=2)+'\n');print(label,width,count,scene,measurement['draw_ms'],flush=True);page.screenshot(path=str(out/f'{width}-{count}-{scene}.png'));context.close()
 finally:b.close();server.shutdown()
(out/'results.json').write_text(json.dumps({'status':'PASS','rows':rows},indent=2)+'\n')
