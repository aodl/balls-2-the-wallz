#!/usr/bin/env python3
"""Record and inspect bounded, normal-speed browser playback of existing verified ball tracks.
Uses the existing HTTP server, Playwright and dense kernel recording. No game mutation.
"""
import argparse,json,os,shutil,signal,subprocess,sys,time
from pathlib import Path
from browser_observer import wait_until
from verify_observer_http import free_port,wait_for_server
ROOT=Path(__file__).resolve().parents[1]
def main():
 p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);p.add_argument('--seconds',type=int,default=14);a=p.parse_args()
 if not 8<=a.seconds<=25:p.error('bounded capture: 8–25 seconds')
 out=a.output.resolve();out.mkdir(parents=True,exist_ok=True)
 assets=out/'assets';assets.mkdir(exist_ok=True)
 subprocess.run(['node_modules/.bin/esbuild','apps/btz-observer/app.mjs','--bundle','--format=esm','--platform=browser','--outfile='+str(assets/'app.mjs')],cwd=ROOT,check=True)
 for name in ['index.html','style.css','icon.svg']:shutil.copyfile(ROOT/'apps/btz-observer'/name,assets/name)
 shutil.copytree(ROOT/'apps/btz-observer/recordings',assets/'recordings',dirs_exist_ok=True)
 # Timing is presentation metadata. Keep all historical catalogs/artifacts/pins byte-identical.
 index=json.loads((assets/'recordings/index.json').read_text());index['recordings'][0]['tick_seconds']=1
 (assets/'recordings/index.json').write_text(json.dumps(index))
 port=free_port();log=(out/'server.log').open('w');server=subprocess.Popen([sys.executable,'-B','tools/serve_observer.py','--port',str(port),'--deployment-assets',str(assets)],cwd=ROOT,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
 try:
  url=f'http://127.0.0.1:{port}/';wait_for_server(url,server)
  from playwright.sync_api import sync_playwright
  with sync_playwright() as pw:
   b=pw.chromium.launch(headless=True,chromium_sandbox=True)
   c=b.new_context(viewport={'width':1024,'height':860},record_video_dir=str(out/'video'),record_video_size={'width':1024,'height':860})
   page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.add_init_script('''(() => {
     const proto=CanvasRenderingContext2D.prototype,clear=proto.clearRect,arc=proto.arc;
     globalThis.__motionFrames=[];let frame=null;
     proto.clearRect=function(...a){
       if(this.canvas.id==='board'){
         if(frame&&frame.balls.length)globalThis.__motionFrames.push(frame);
         if(globalThis.__motionFrames.length>1800)globalThis.__motionFrames.shift();
         frame={wall_ms:performance.now(),balls:[],playhead:Number(document.querySelector('#playhead')?.textContent),verified:Number(document.querySelector('#available')?.textContent),phase:document.body.dataset.phase};
       }return clear.apply(this,a);
     };
     proto.arc=function(x,y,r,...args){if(this.canvas.id==='board'&&this.shadowBlur===9&&frame)frame.balls.push([x,y]);return arc.call(this,x,y,r,...args);};
   })();''')
   page.goto(url);wait_until(page,lambda:page.locator('#balls').inner_text()=='32',15000)
   # Real-time 1x browser playback at the deployed convention of one second per logical tick.
   wait_until(page,lambda:float(page.locator('#playhead').text_content())>.1,15000)
   start=page.evaluate('performance.now()');page.screenshot(path=str(out/'scene-start.png'))
   page.wait_for_timeout(a.seconds*1000)
   frames=page.evaluate('globalThis.__motionFrames');frames=[f for f in frames if f['wall_ms']>=start]
   page.screenshot(path=str(out/'scene-end.png'));video=page.video
   c.close();video_path=Path(video.path())
   review=out/'playback.html';review.write_text('<!doctype html><title>Local recorded motion review</title><video controls muted src="'+str(video_path.relative_to(out))+'" style="width:100%;max-width:1024px"></video>')
   viewer=b.new_page(viewport={'width':1040,'height':900});viewer.goto(review.as_uri())
   viewer.evaluate("""async()=>{const v=document.querySelector('video');await new Promise(r=>v.readyState>=2?r():v.addEventListener('loadeddata',r,{once:true}));globalThis.__decoded=[];function frame(_now,m){globalThis.__decoded.push({time:m.mediaTime,frames:m.presentedFrames});v.requestVideoFrameCallback(frame);}v.requestVideoFrameCallback(frame);v.playbackRate=1;await v.play();}""")
   # Inspect the actual recording while it plays normally, not by seeking through stills.
   for n in range(4):
    viewer.wait_for_timeout(a.seconds*1000/4);viewer.screenshot(path=str(out/f'normal-playback-{n+1}.png'))
   decoded=viewer.evaluate('globalThis.__decoded');rate=viewer.locator('video').evaluate('(v)=>v.playbackRate')
   assert rate==1 and len(decoded)>a.seconds*10
   assert decoded[-1]['time']-decoded[0]['time']>a.seconds-2
   (out/'decoded-playback.json').write_text(json.dumps(decoded));b.close()
   assert not errors,errors
   (out/'frames.json').write_text(json.dumps(frames))
   assert len(frames)>a.seconds*15,'insufficient actual rendered frames'
   # No spawns occur in this scene. Reflections must remain spatially continuous.
   # Match each current ball to its nearest prior position; ambiguity can only hide,
   # not invent, a discontinuity. Exact event/track agreement is separately unit-tested.
   cell=(1024-48-22)/16;worst=0;violations=[]
   for prev,cur in zip(frames,frames[1:]):
    dt=(cur['wall_ms']-prev['wall_ms'])/1000
    if dt<=0 or not prev['balls']:continue
    for x,y in cur['balls']:
     distance=min(((x-px)**2+(y-py)**2)**.5 for px,py in prev['balls']);worst=max(worst,distance)
     if distance>cell*1.5*min(dt,.25)+2:violations.append({'dt':dt,'distance':distance})
   assert not violations,violations[:5]
   report={'status':'PASS','qualification':'Existing kernel-generated dense recording: 32 non-cardinal balls and two competing territories. Offline content verification, not IC authenticity. All historical artifacts unchanged; only copied playback timing is 1 second/tick.','video':str(video_path.relative_to(ROOT)),'normal_playback_rate':rate,'decoded_video_frames_inspected':len(decoded),'rendered_frames':len(frames),'rendered_fps':round(len(frames)/a.seconds,2),'first':frames[0],'last':frames[-1],'max_nearest_ball_frame_displacement_px':worst,'continuity_violations':violations,'phases':sorted(set(f['phase'] for f in frames)),'x_reference':'403 Forbidden; clip not viewed; no matching claim'}
   (out/'frames.json').write_text(json.dumps(frames));(out/'results.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k not in ['first','last']},indent=2))
  return 0
 finally:
  if server.poll() is None:os.killpg(server.pid,signal.SIGTERM);server.wait(timeout=10)
  log.close()
if __name__=='__main__':raise SystemExit(main())
