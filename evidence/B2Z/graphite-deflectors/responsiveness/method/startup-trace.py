"""Separate startup diagnostic. WebGL calls measure CPU wall time, not GPU timer queries."""
import json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True)
urls=sys.argv[2:]
rows=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,chromium_sandbox=True)
 for url in urls:
  c=browser.new_context(viewport={'width':1440,'height':900})
  p=c.new_page();dev=c.new_cdp_session(p);trace=browser.new_browser_cdp_session()
  mode='baseline' if url.endswith(':18371/') else 'adaptive'
  packets=[];done=[]
  trace.on('Tracing.dataCollected',lambda batch:packets.extend(batch['value']))
  trace.on('Tracing.tracingComplete',lambda event:done.append(event))
  p.add_init_script("""window.graphicsProbe={calls:[],firstDraw:null};
   const proto=WebGL2RenderingContext.prototype;
   for(const name of ['compileShader','linkProgram','getProgramParameter','drawArraysInstanced','drawElementsInstanced']){
    const original=proto[name];
    proto[name]=function(...args){
     const start=performance.now(),value=original.apply(this,args),end=performance.now();
     if(name.startsWith('draw'))graphicsProbe.firstDraw??=end;
     if(graphicsProbe.calls.length<300)graphicsProbe.calls.push({name,start,duration:end-start});
     return value;
    };
   }
  """)
  trace.send('Tracing.start',{'categories':'devtools.timeline,blink.user_timing,v8,gpu,cc','options':'record-as-much-as-possible','transferMode':'ReportEvents'})
  p.goto(url,wait_until='domcontentloaded')
  p.wait_for_function('()=>graphicsProbe.firstDraw!==null&&__b2zExperience?.session?.ready',timeout=90000)
  diag=p.evaluate("""()=>({gl:graphicsProbe,world:__b2zExperience.session.firstWorldAt,
     cert:__b2zExperience.session.certifiedAt,history:__b2zExperience.session.startupHistory,
     nav:performance.getEntriesByType('navigation')[0].toJSON(),
     active:!!__b2zAudio().music?.active})""")
  trace.send('Tracing.end')
  for _ in range(30):
   if done:break
   p.wait_for_timeout(100)
  assert done
  interesting={'Layout','UpdateLayoutTree','Paint','EventDispatch','EvaluateScript','v8.compile','RunTask','GPUTask','RasterTask'}
  summary={}
  for e in packets:
   if e.get('ph')=='X' and e.get('name') in interesting:
    d=summary.setdefault(e['name'],{'n':0,'total_ms':0,'max_ms':0});ms=e.get('dur',0)/1000
    d['n']+=1;d['total_ms']+=ms;d['max_ms']=max(ms,d['max_ms'])
  rows.append({'mode':mode,'startup':diag,'summary':summary,'traceEventCount':len(packets)})
  (out/f'{mode}-raw.json').write_text(json.dumps({'traceEvents':packets}))
  (out/'summary.json').write_text(json.dumps(rows,indent=2)+'\n')
  c.close()
 browser.close()
