import functools,http.server,threading,time,json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('.work/approved-panel-deployment-20261116/bounded-performance-control');out.mkdir(exist_ok=False);report={'scope':'Read-only European Rules7, ordinary Chromium/SwiftShader; A/B/A same viewport and explicit enabled/muted intent. Not physical hardware, dense P09, output-route or isolated audio-CPU qualification.','status':'RUNNING','rows':[]};servers=[];urls={}
for name,directory in [('A','.work/approved-panel-war-cry/rollback/frontend'),('B','.work/approved-panel-war-cry/frozen/frontend')]:
 root=Path(directory).absolute();policy=json.loads((root/'.ic-assets.json5').read_text())[0]['headers']
 class H(http.server.SimpleHTTPRequestHandler):
  security_headers=policy
  def log_message(self,*args):pass
  def end_headers(self):
   for k,v in self.security_headers.items():self.send_header(k,v)
   self.send_header('Cache-Control','no-cache');super().end_headers()
  def guess_type(self,p):return 'audio/flac'if p.endswith('.flac')else'application/javascript'if p.endswith('.mjs')else super().guess_type(p)
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(H,directory=str(root)));threading.Thread(target=server.serve_forever,daemon=True).start();servers.append(server);urls[name]=f'http://127.0.0.1:{server.server_port}'
try:
 with sync_playwright()as pw:
  browser=pw.chromium.launch(headless=True,chromium_sandbox=True)
  try:
   for label in ['A','B','A']:
    c=browser.new_context(viewport={'width':1440,'height':900});page=c.new_page();errors=[];forbidden=[];page.on('pageerror',lambda e:errors.append(str(e)))
    def guard(route):
     r=route.request
     if r.method not in ['GET','OPTIONS']and not(r.method=='POST'and r.url.endswith(('/query','/read_state'))):forbidden.append(r.url);route.abort()
     else:route.continue_()
    c.route('**/*',guard);start=time.monotonic();page.goto(urls[label],wait_until='domcontentloaded');page.wait_for_function('()=>globalThis.__b2zExperience?.session?.ready',timeout=90000);ready=time.monotonic()-start;page.locator('#board').click(position={'x':1000,'y':300});page.wait_for_timeout(2000)
    def state():return json.loads(page.evaluate('''()=>JSON.stringify((()=>{const e=__b2zExperience;return{head:String(e.session.sequence.last.publication.head.segment_id),root:e.session.root,rules:e.session.config.rules_version,balls:e.visible.balls.size,cannons:e.visible.cannons.size,time:e.visibleTime,camera:[__b2zCamera.x,__b2zCamera.y,__b2zCamera.scale],audio:__b2zAudio(),heap:performance.memory?{used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize}:null,resource:performance.getEntriesByType('resource').map(r=>({name:r.name.split('/').at(-1),encoded:r.encodedBodySize,transfer:r.transferSize,duration:r.duration}))}})(),(_,v)=>typeof v==='bigint'?String(v):v)'''))
    row={'variant':label,'verified_world_seconds':ready,'enabled_before':state()};assert row['enabled_before']['rules']==7 and row['enabled_before']['audio']['settings']['enabled']
    for mode in ['enabled','muted']:
     if mode=='muted':page.locator('#audio-button').click();assert not page.evaluate('__b2zAudio().settings.enabled')
     samples=page.evaluate('''()=>new Promise(resolve=>{const rows=[],start=performance.now();let previous=start;function frame(t){rows.push(t-previous);previous=t;if(t-start>=5000||rows.length>=180)resolve(rows.slice(Math.min(10,Math.floor(rows.length/4))).sort((a,b)=>a-b));else requestAnimationFrame(frame);}requestAnimationFrame(frame);})''');row[mode]={'frame_ms_p50':samples[len(samples)//2],'frame_ms_p95':samples[int(len(samples)*.95)],'frame_ms_p99':samples[int(len(samples)*.99)],'state':state()}
    assert not errors and not forbidden;row['errors']=errors;row['forbidden']=forbidden;report['rows'].append(row);(out/'results.json').write_text(json.dumps(report,indent=2)+'\n');c.close()
   report['status']='PASS observations collected; no performance threshold claim'
  finally:browser.close()
finally:
 (out/'results.json').write_text(json.dumps(report,indent=2)+'\n')
 for s in servers:s.shutdown()
