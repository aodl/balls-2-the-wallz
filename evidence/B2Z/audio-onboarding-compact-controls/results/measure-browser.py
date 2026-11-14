"""Bounded identical populated-source ON/OFF and OFF/OFF controls on shared software-rendered host. No performance PASS."""
import functools,http.server,threading,json,time
from pathlib import Path
from playwright.sync_api import sync_playwright
base=Path('.work/audio-onboarding-compact-controls/native-full/assets').absolute();out=Path('.work/audio-onboarding-compact-controls/browser-cost');out.mkdir(exist_ok=True);policy=json.loads(Path('.work/audio-onboarding-compact-controls/frozen-760/frontend/.ic-assets.json5').read_text())[0]['headers']
class H(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
 def end_headers(self):
  for k,v in policy.items():self.send_header(k,v)
  super().end_headers()
s=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(H,directory=str(base)));threading.Thread(target=s.serve_forever,daemon=True).start();rows=[]
with sync_playwright()as pw:
 b=pw.chromium.launch(headless=True,chromium_sandbox=True)
 try:
  for width,height in [(1440,900),(390,844),(320,640)]:
   for variant in ['OFF-A','ON-A','OFF-B','ON-B']:
    c=b.new_context(viewport={'width':width,'height':height});c.add_init_script('localStorage.setItem("b2z.audio.v2",'+json.dumps(json.dumps({'version':2,'enabled':variant.startswith('ON')}))+')');p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)));p.goto(f'http://127.0.0.1:{s.server_port}/?recording=dense');p.wait_for_function('()=>__b2zExperience?.session?.ready',timeout=60000);startup=p.evaluate('({firstVerifiedMs:performance.now(),resources:performance.getEntriesByType("resource").map(r=>({name:new URL(r.name).pathname,bytes:r.transferSize,duration:r.duration}))})');p.locator('#board').click(position={'x':80,'y':180})
    if variant.startswith('ON'):p.wait_for_function('()=>__b2zAudio().music?.active&&__b2zAudio().fxBuffers===7',timeout=60000)
    # Use the exact same content interval, renderer/camera and ordinary clock.
    p.evaluate('async()=>{await __b2zTools.recording("dense");__b2zCamera.scale=48;__b2zCamera.centre(4,3)}');p.wait_for_timeout(500)
    frames=p.evaluate('()=>new Promise(resolve=>{const samples=[],start=performance.now();let last=start;function tick(now){samples.push(now-last);last=now;if(now-start>=4000){samples.sort((a,b)=>a-b);return resolve({frames:samples.length,p50:samples[Math.ceil(samples.length*.5)-1],p95:samples[Math.ceil(samples.length*.95)-1],p99:samples[Math.ceil(samples.length*.99)-1]})}requestAnimationFrame(tick)}requestAnimationFrame(tick)})');state=p.evaluate('({audio:__b2zAudio(),playhead:__b2zExperience.clock?.state(),gameError:__b2zTools.state().error,resources:performance.getEntriesByType("resource").map(r=>({name:new URL(r.name).pathname,bytes:r.transferSize})),heap:performance.memory?.usedJSHeapSize})');assert not errors and state['gameError']is None;rows.append({'viewport':[width,height],'variant':variant,'startup':startup,'frame_ms':frames,'state':state});p.screenshot(path=str(out/f'{width}-{variant}.png'));c.close();(out/'results.json').write_text(json.dumps({'status':'MEASURED_NOT_QUALIFIED','scope':__doc__,'rows':rows},indent=2)+'\n')
 finally:b.close();s.shutdown()
