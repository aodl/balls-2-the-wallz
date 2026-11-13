#!/usr/bin/env python3
"""Actual game modules, native Web Audio/FLAC, production-equivalent headers. No IC network."""
import argparse,base64,functools,http.server,json,shutil,subprocess,threading,time
import numpy as np
import soundfile as sf
from pathlib import Path
from playwright.sync_api import sync_playwright
from audio_lifecycle_browser import verify_audio_lifecycle
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);p.add_argument('--browser',choices=['chromium','firefox','webkit'],default='chromium');p.add_argument('--soak-seconds',type=int,default=0);p.add_argument('--native-only',action='store_true');p.add_argument('--video',action='store_true');p.add_argument('--cuts-only',action='store_true');p.add_argument('--controls-only',action='store_true');a=p.parse_args();out=a.output.absolute();out.mkdir(parents=True,exist_ok=False);root=Path(__file__).resolve().parents[1];assets=out/'assets';assets.mkdir()
for name in ['index.html','style.css','icon.svg']:shutil.copyfile(root/'apps/b2z-observer'/name,assets/name)
shutil.copytree(root/'apps/b2z-observer/recordings',assets/'recordings');subprocess.run(['node','tools/fixtures/audio-recording.mjs',str(assets/'recordings')],cwd=root,check=True);shutil.copytree(root/'apps/b2z-observer/audio',assets/'audio')
for source,name in [('apps/b2z-observer/app.mjs','app.mjs'),('tools/fixtures/audio-native-browser.mjs','probe.mjs')]:subprocess.run(['node_modules/.bin/esbuild',source,'--bundle','--format=esm','--platform=browser','--outfile='+str(assets/name)],cwd=root,check=True)
manifest=json.loads((assets/'audio/b2z-v1/manifest.json').read_text())
for name,indices in [('wrap',[50,0,1]),('transition',[25,26,27]),('transition-end',[26,27,28])]:
 chunks=[sf.read(assets/'audio/b2z-v1'/manifest['segments'][i]['file'],dtype='int32')[0]for i in indices];parts=[chunks[0][:2400]]+[chunk[2400:2400+manifest['segments'][i]['coreFrames']]for i,chunk in zip(indices,chunks)]+[chunks[-1][-2400:]];sf.write(assets/f'reference-{name}.flac',np.concatenate(parts),48000,subtype='PCM_24')
(assets/'probe.html').write_text('<!doctype html><title>Native lossless audio qualification</title><script type="module" src="./probe.mjs"></script>')
policy_build=out/'policy-build';subprocess.run(['node','tools/build_observer_playability.mjs','--canister','s5ir5-gqaaa-aaaas-amyna-cai','--output',str(policy_build)],cwd=root,check=True);policies=json.loads((policy_build/'.ic-assets.json5').read_text());policy=policies[0]['headers']
class H(http.server.SimpleHTTPRequestHandler):
 extensions_map={**http.server.SimpleHTTPRequestHandler.extensions_map,'.flac':'audio/flac','.mjs':'application/javascript'}
 def log_message(self,*args):pass
 def end_headers(self):
  selected=policies[1]['headers']if self.path.split('?')[0].startswith('/audio/b2z-v1/')and self.path.split('?')[0].endswith('.flac')else policies[2]['headers']if self.path.split('?')[0]=='/audio/b2z-v1/manifest.json'else policy
  for k,v in selected.items():self.send_header(k,v)
  super().end_headers()
s=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(H,directory=str(assets)));threading.Thread(target=s.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{s.server_port}';report={'scope':__doc__,'mode':'native-cuts'if a.cuts_only else'native-codec'if a.native_only else'integrated-app','checks':[],'errors':[]}
with sync_playwright()as pw:
 b=getattr(pw,a.browser).launch(headless=True,**({'chromium_sandbox':True}if a.browser=='chromium'else{}));c=b.new_context(viewport={'width':390,'height':844},**({'record_video_dir':str(out/'video')}if a.video else{}));page=c.new_page();page.expose_function('__audioQATelemetry',lambda value:(out/'latest-state.json').write_text(json.dumps(value,indent=2)+'\n'));page.add_init_script("setInterval(()=>{if(globalThis.__b2zAudio)void __audioQATelemetry({audio:__b2zAudio(),hidden:document.hidden,world:__b2zExperience?.visibleTime,ready:__b2zExperience?.session?.ready,gameError:String(__b2zExperience?.session?.error??'')}).catch(()=>{})},1000)");requests=[];page.on('request',lambda r:requests.append(r.url));page.on('pageerror',lambda e:report['errors'].append(str(e)))
 try:
  page.goto(url+"/?recording=audio-wall");page.wait_for_function('()=>__b2zExperience?.session?.ready',timeout=60000);page.wait_for_timeout(500);assert not any('/audio/'in u for u in requests);assert page.evaluate('__b2zAudio().sampleRate')is None;report['checks'].append({'id':'L01','status':'PASS','observation':'Actual game boot silent; zero audio requests/context before gesture'})
  if not a.native_only:
   page.locator('#audio-button').click();page.locator('#audio-music').check();page.wait_for_function('()=>__b2zAudio().music?.active',timeout=60000);page.screenshot(path=str(out/'music-enabled.png'));report['initial']=page.evaluate('__b2zAudio()');assert report['initial']['sampleRate']==48000;assert report['initial']['music']['maxBuffers']<=3;report['checks'].append({'id':'B04/M02','status':'PASS','observation':'Native gesture-started FLAC music under unchanged autoplay=() and exact CSP'})
   if a.soak_seconds:
    for elapsed in range(0,a.soak_seconds,15):
     page.wait_for_timeout(min(15,a.soak_seconds-elapsed)*1000);sample=page.evaluate('__b2zAudio()');report.setdefault('soak',[]).append({'elapsed':min(elapsed+15,a.soak_seconds),'state':sample});(out/'running.json').write_text(json.dumps(report,indent=2)+'\n');assert sample['music']['nodes']<=2 and sample['music']['maxBuffers']<=3 and sample['music']['maxDecoded']<=32*1024*1024
   page.locator('#audio-mute').check();page.wait_for_timeout(500);muted=page.evaluate('__b2zAudio()');assert muted['activeVoices']==0 and not muted['music']['active'];after=sum('/audio/'in u for u in requests);page.wait_for_timeout(700);assert sum('/audio/'in u for u in requests)==after;report['muted']=muted
   page.locator('#audio-music').uncheck();page.locator('#audio-effects').check();page.locator('#audio-mute').uncheck();page.wait_for_function('()=>__b2zAudio().fxBuffers===4',timeout=60000);report['effects_only']=page.evaluate('__b2zAudio()');assert not report['effects_only']['music']['active'];page.screenshot(path=str(out/'effects-only.png'))
   page.locator('#audio-button').click();before_starts=page.evaluate('__b2zAudio().stats.starts');attempts=[]
   for attempt in range(3):
    page.evaluate('async()=>{await __b2zTools.recording(\"audio-wall\");__b2zCamera.scale=48;__b2zCamera.centre(2.5,2.5)}')
    try:page.wait_for_function('(n)=>__b2zAudio().stats.starts>n',arg=before_starts,timeout=30000)
    except Exception:
     state=page.evaluate('__b2zAudio()');attempts.append({'attempt':attempt+1,'state':state,'outcome':'no fresh cue'});report['effect_attempts']=attempts;assert page.evaluate('__b2zTools.state().error')is None
     if not state['eventTotals']['lateFrames']:raise
     continue
    attempts.append({'attempt':attempt+1,'outcome':'actual displayed native cue'});break
   report['effect_attempts']=attempts;report['displayed_effects']=page.evaluate('__b2zAudio()');assert report['displayed_effects']['stats']['starts']>before_starts,'No eligible fresh displayed reflection across bounded native attempts';assert report['displayed_effects']['stats']['maxVoices']<=8;assert page.evaluate('__b2zTools.state().error')is None;page.screenshot(path=str(out/'displayed-effects.png'));page.locator('#audio-button').click();tail_started=time.monotonic();page.wait_for_function('()=>__b2zAudio().activeVoices===0',timeout=2000);report['covered_tail_stop']={'wall_ms':(time.monotonic()-tail_started)*1000,'ramp_seconds':.06,'scope':'Opaque audio popover covers the ripple; wall delay includes RAF scheduling, no hardware latency claim'}
   page.locator('#audio-mute').check();page.wait_for_timeout(300)
   verify_audio_lifecycle(page,c,url,out,report)
  if not a.controls_only:
   probe=c.new_page();probe.expose_function('__audioProbePCM',lambda value:(out/Path(value['name']).name).write_bytes(base64.b64decode(value['base64'])));probe.expose_function('__audioProbeRow',lambda value:(out/'codec-progress.json').write_text(json.dumps(value,indent=2)+'\n'));probe.goto(url+'/probe.html');probe.wait_for_function('()=>!!audioNative')
   probes=[('native48','audioNative.nativeCores(48000)'),('cuts48','audioNative.renderedCuts(48000)'),('cuts441','audioNative.renderedCuts(44100)'),('transition48','audioNative.renderedCuts(48000,"transition")'),('transition441','audioNative.renderedCuts(44100,"transition")'),('transitionEnd48','audioNative.renderedCuts(48000,"transition-end")'),('transitionEnd441','audioNative.renderedCuts(44100,"transition-end")')]
   for key,expression in (probes[1:]if a.cuts_only else probes):
    print('Native probe',key,flush=True);report[key]=probe.evaluate('()=>Promise.race(['+expression+',new Promise((_,reject)=>setTimeout(()=>{audioNative.cancel();reject(Error(\"Native probe deadline\"))},900000))])');(out/'native-progress.json').write_text(json.dumps(report,indent=2)+'\n')
   assert a.cuts_only or all(r['sha256']==r['expected']for r in report['native48']['rows']);assert all(report[k]['errorSamples']==0 for k in [key for key,_ in probes if key!='native48']);probe.close();assert not report['errors'],report['errors'];assert all(u.startswith(url)for u in requests),'Unexpected non-loopback request';report['status']='PASS'
  else:report['status']='PASS'
 except Exception as e:
  report.update(status='FAIL',error=str(e),last_audio=page.evaluate('__b2zAudio()'),game=page.evaluate('__b2zTools.state().error'),audio_status=page.locator('#audio-status').inner_text());page.screenshot(path=str(out/'failure.png'));raise
 finally:
  report['browser']=b.version;report['audio_requests']=sum('/audio/'in u for u in requests);(out/'results.json').write_text(json.dumps(report,indent=2)+'\n');c.close();b.close();s.shutdown()
print(json.dumps({'status':report['status'],'browser':report['browser'],'native48':len(report.get('native48',{}).get('rows',[]))}))
