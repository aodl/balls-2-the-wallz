import functools,http.server,threading,json,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path('.work/graphite-deflectors').resolve();out=root/'bench-abba';out.mkdir(exist_ok=False)
class H(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(H,directory=str(root)));threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/';report={'status':'RUNNING','scope':'Sequential A(old316593)/B(indexed0e2740)/B/A same poses; synthetic renderer only, audio absent in both, no other task-owned acceptance browser, software host not hardware qualification. Draw CPU and actual RAF samples; no general speedup or P09 pass.','rows':[],'errors':[],'bundle_sha256':{n:hashlib.sha256((root/n/'fixture.mjs').read_bytes()).hexdigest()for n in ['baseline-models','bench-final']}}
def save():(out/'results.json').write_text(json.dumps(report,indent=2)+'\n')
try:
 with sync_playwright()as pw:
  b=pw.chromium.launch(headless=True,chromium_sandbox=True)
  for width,height in [(1440,900),(390,844),(320,640)]:
   c=b.new_context(viewport={'width':width,'height':height});pages={}
   for name in ['baseline-models','bench-final']:
    p=c.new_page();p.on('pageerror',lambda e:report['errors'].append(str(e)));p.goto(url+name+'/');p.wait_for_function('()=>Boolean(globalThis.graphite)');pages[name]=p
   for count,scale in [(1,64),(32,20),(128,8),(128,2)]:
    row={'viewport':[width,height],'requested_cannons':count,'scale':scale,'samples':[]}
    for label,name in [('A','baseline-models'),('B','bench-final'),('B','bench-final'),('A','baseline-models')]:
     p=pages[name];p.bring_to_front();p.evaluate('(s)=>graphite.scene(s)',{'cannons':count,'scale':scale})
     d=p.evaluate('''async()=>{let running=true;const stamps=[];function frame(t){stamps.push(t);if(running)requestAnimationFrame(frame)}requestAnimationFrame(frame);const result=await graphite.measure(80);running=false;const times=stamps.slice(21).map((t,i,a)=>i?t-a[i-1]:null).filter(t=>t!==null).sort((a,b)=>a-b);return {...result,raf:{samples:times.length,p50:times[Math.floor(times.length*.5)],p95:times[Math.floor(times.length*.95)],p99:times[Math.floor(times.length*.99)]},hidden:document.hidden}}''')
     assert d['hidden']is False
     if label=='B':assert d['stats']['structure_uploads']is False
     row['samples'].append({'variant':label,**d});save()
    report['rows'].append(row);save();p.screenshot(path=str(out/f'{width}-{count}-{scale}.png'));print(width,count,scale,flush=True)
   c.close()
  assert not report['errors'];report['status']='PASS';b.close()
except Exception as e:report.update(status='FAIL',error=str(e));raise
finally:save();server.shutdown()
