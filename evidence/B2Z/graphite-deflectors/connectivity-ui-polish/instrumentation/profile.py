import json, os, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright
import live_common as qa
qa.URL=os.environ.get('B2Z_PROFILE_URL',qa.URL)
dest=Path(sys.argv[1]);dest.mkdir(parents=True,exist_ok=True)
record=os.environ.get('B2Z_PROFILE_VIDEO')=='yes'
asset_dir=Path(sys.argv[2]) if len(sys.argv)>2 else None
def pct(v,n):
 v=sorted(v);return round(v[min(len(v)-1,int(len(v)*n))],2) if v else None
rows=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,chromium_sandbox=True)
 for width,height,n in [(1440,900,1),(390,844,1),(320,640,1)]:
  for sample in range(n):
   c=b.new_context(viewport={'width':width,'height':height},has_touch=width<400,record_video_dir=str(dest/'video') if record and sample==0 else None)
   c.add_init_script("""window.probe={first:null,frames:[],last:performance.now(),inputs:[],seen:[]};const tasks=[];
   new PerformanceObserver(list=>{for(const entry of list.getEntries())tasks.push({name:entry.name,start:entry.startTime,duration:entry.duration});}).observe({type:'longtask',buffered:true});
   new PerformanceObserver(list=>{for(const entry of list.getEntries())if(entry.interactionId)probe.seen.push({name:entry.name,delay:entry.processingStart-entry.startTime,handler:entry.processingEnd-entry.processingStart,duration:entry.duration,target:entry.target?.id});}).observe({type:'event',durationThreshold:16,buffered:true});
   addEventListener('click',e=>{if(!e.isTrusted)return;const id=e.target.closest('button')?.id,at=e.timeStamp;queueMicrotask(()=>requestAnimationFrame(()=>{probe.inputs.push({id,ms:performance.now()-at});}));},true);
   probe.tasks=tasks;requestAnimationFrame(function frame(now){probe.frames.push(now-probe.last);probe.last=now;if(!probe.first&&window.__b2zExperience?.session?.firstWorldAt)probe.first={at:now,world:__b2zExperience.session.firstWorldAt,cert:__b2zExperience.session.firstCertificateAt??__b2zExperience.session.certifiedAt,history:__b2zExperience.session.startupHistory};requestAnimationFrame(frame)});""")
   page=c.new_page();cdp=c.new_cdp_session(page);cdp.send('Performance.enable');net=[];req={};errors=[]
   cdp.send('Network.enable')
   def request(q):
    post=q['request'].get('postData','')
    keys=['observation_bundle','artifact_bundle','retained_artifact_chunk','retained_publication','artifact_chunk','observation','source_descriptor','lab_status']
    req[q['requestId']]=next((k for k in keys if k in post),q['request']['url'])
   cdp.on('Network.requestWillBeSent',request)
   cdp.on('Network.loadingFinished',lambda q:net.append([req.get(q['requestId'],'?'),q['encodedDataLength']]))
   page.on('pageerror',lambda e:errors.append(str(e)))
   if asset_dir:
    def local(route):
     f=route.request.url.split('icp0.io/',1)[-1].split('?',1)[0] or 'index.html'
     file=asset_dir/f
     if file.is_file():
      route.fulfill(path=str(file),headers={'Cache-Control':'public, max-age=3600'})
     else: route.continue_()
    page.route('https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/**',local)
   def metrics():
    return {x['name']:x['value'] for x in cdp.send('Performance.getMetrics')['metrics']}
   for cache in ['cold','warm']:
    net.clear();before=metrics();t=time.monotonic()
    page.goto(qa.URL,wait_until='domcontentloaded');page.wait_for_function('()=>probe.first',timeout=90000)
    assert page.locator("#render-error").is_hidden(),page.locator("#render-error").text_content()
    load=page.evaluate("""()=>({first:probe.first,paint:performance.getEntriesByType('paint').map(x=>[x.name,x.startTime]),nav:performance.getEntriesByType('navigation')[0].toJSON(),app:performance.getEntriesByType('resource').find(x=>x.name.endsWith('/app.mjs'))?.toJSON(),renderer:(()=>{const gl=document.getElementById('board').getContext('webgl2'),debug=gl?.getExtension('WEBGL_debug_renderer_info');return debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null})(),dpr:devicePixelRatio})""")
    loads=list(net);after=metrics()
    row={'view':[width,height],'cache':cache,'sample':sample,'load':load,'load_wire':loads,'performance_delta':{k:after[k]-v for k,v in before.items() if k in after}}
    if cache=='warm' and sample==0:
     c0,roster=qa.enter_fire(page)
     page.locator('#close-panel').click()
     page.locator('#centre-cannon').click();qa.settle(page)
     qa.settle(page);page.screenshot(path=str(dest/f'{width}-selected.png'))
     page.locator('#fire-action').click();qa.settle(page)
     page.screenshot(path=str(dest/f'{width}-fire.png'))
     page.evaluate('probe.frames.length=0;probe.inputs.length=0;probe.seen.length=0;probe.tasks.length=0')
     step_metrics=metrics()
     handle=page.locator('#aim-handle').bounding_box()
     if handle:
      x,y=handle['x']+handle['width']/2,handle['y']+handle['height']/2
      page.mouse.move(x,y);page.mouse.down()
      for i in range(36):page.mouse.move(x+45*(i/35),y-27*(i/35))
      page.mouse.up()
     loc=page.locator('#quantity-plus')
     if loc.is_visible() and loc.is_enabled():loc.click()
     response=[]
     for control in ['#move-action','#build-action','#deflect-action']:
      page.locator(control).wait_for(state='visible')
     for action in ['move','build','deflect']:
      loc=page.locator('#'+action+'-action')
      if loc.is_visible() and loc.is_enabled():
       t0=time.monotonic();loc.click();page.evaluate('()=>new Promise(requestAnimationFrame)');response.append([action,(time.monotonic()-t0)*1000])
       if action=='deflect':page.locator('[data-deflector-orientation=SE]').click();page.screenshot(path=str(dest/f'{width}-deflect.png'))
     page.mouse.move(width-70,max(230,height//2));page.mouse.down()
     for i in range(20):page.mouse.move(width-70-i*3,max(230,height//2)+i)
     page.mouse.up()
     page.mouse.wheel(0,-100)
     page.wait_for_timeout(600)
     f=page.evaluate('probe.frames');row['action_driver_ms_including_paint_proxy']=response
     row['input_to_next_animation_callback']=page.evaluate('probe.inputs');row['native_event_timing']=page.evaluate('probe.seen')
     row['long_tasks']=page.evaluate('probe.tasks')
     m=metrics();row['interaction_performance_delta']={k:m[k]-v for k,v in step_metrics.items() if k in m}
     row['render']=page.evaluate('__b2zRender')
     row['computed_panel']=page.locator('.panel-header').evaluate("n=>({backdrop:getComputedStyle(n).backdropFilter,background:getComputedStyle(n).backgroundImage})")
     row['interaction']={'frames':len(f),'p50_ms':pct(f,.50),'p95_ms':pct(f,.95),'p99_ms':pct(f,.99) if len(f)>=100 else None,'worst_ms':max(f),'errors':errors,'hardware':load['renderer']}
     net.clear();page.wait_for_timeout(4200);row['steady_wire']=list(net)
    rows.append(row);(dest/'report.json').write_text(json.dumps({'browser':b.version,'rows':rows},indent=2))
   c.close()
 b.close()
