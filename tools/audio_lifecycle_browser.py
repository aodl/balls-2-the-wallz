"""Native controls/cache/context and explicitly controlled lifecycle; no IC calls."""
from pathlib import Path
import json

def verify_audio_lifecycle(page,context,url,out,report):
 # Saved enablement on a fresh page still has no context or downloads.
 page.locator('#audio-mute').uncheck();page.reload();page.wait_for_function('()=>__b2zExperience?.session?.ready',timeout=60000);page.wait_for_timeout(300)
 assert page.evaluate('__b2zAudio().sampleRate')is None
 assert page.evaluate('__b2zAudio().settings.effects&&!__b2zAudio().settings.mute')
 page.locator('#audio-button').click();page.locator('#audio-resume').click();page.wait_for_function('()=>__b2zAudio().fxBuffers===4',timeout=60000)
 warm=page.evaluate('__b2zAudio()');assert warm['loader']['cacheHits']>=1
 # A second visible tab must deliberately claim sound, displacing the first.
 other=context.new_page();other.goto(url+'/?recording=audio-wall');other.wait_for_function('()=>__b2zExperience?.session?.ready',timeout=60000);assert other.evaluate('__b2zAudio().sampleRate')is None
 other.locator('#audio-button').click();other.locator('#audio-resume').click();other.wait_for_function('()=>__b2zAudio().fxBuffers===4',timeout=60000);page.wait_for_function('()=>!__b2zAudio().unlocked',timeout=10000);assert page.evaluate('__b2zAudio().activeVoices')==0
 # Real native context suspension, driven by controlled lifecycle events.
 other.evaluate('document.dispatchEvent(new Event("freeze"))');other.wait_for_function('()=>__b2zAudio().hidden&&__b2zAudio().contextState==="suspended"');assert other.evaluate('__b2zAudio().activeVoices')==0
 other.locator('#audio-mute').check();other.evaluate('document.dispatchEvent(new Event("resume"))');assert other.evaluate('__b2zAudio().settings.mute');assert not other.evaluate('__b2zAudio().hidden');assert other.evaluate('__b2zAudio().activeVoices')==0
 other.evaluate('dispatchEvent(new PageTransitionEvent("pagehide",{persisted:true}));dispatchEvent(new PageTransitionEvent("pageshow",{persisted:true}))');assert other.evaluate('__b2zAudio().settings.mute')
 report['lifecycle']={'saved_enabled_reload_silent':'PASS','warm_cache':warm['loader'],'two_visible_tabs_deliberate_ownership':'PASS','controlled_freeze_resume_with_native_context':'PASS','controlled_BFCache_events_keep_mute':'PASS','native_BFCache_restore':'NOT_RUN','physical_device_interruption':'NOT_RUN'}
 # Actual native controls at CSS viewports; no physical mobile claim.
 layouts=[]
 for width,height in [(1440,900),(390,844),(320,640)]:
  other.set_viewport_size({'width':width,'height':height});other.wait_for_timeout(200);camera=other.evaluate('[__b2zCamera.x,__b2zCamera.y,__b2zCamera.scale]');slider=other.locator('#audio-effectsVolume');slider.focus();slider.press('ArrowRight');assert other.evaluate('[__b2zCamera.x,__b2zCamera.y,__b2zCamera.scale]')==camera
  box=other.locator('#audio-popover').bounding_box();assert box and box['x']>=0 and box['x']+box['width']<=width and box['y']+box['height']<=height
  other.screenshot(path=str(out/f'{width}-audio-controls.png'));layouts.append({'viewport':[width,height],'popover':box,'keyboard_did_not_move_camera':True})
 report['controls_layout']=layouts
 # Browser-protocol freeze dispatches Chromium's actual lifecycle, rather than
 # a synthetic document event. Physical OS suspension remains a separate scope.
 other.evaluate('globalThis.audioLifecycleEvents=[];for(const name of ["freeze","resume"])document.addEventListener(name,()=>audioLifecycleEvents.push({name,starts:__b2zAudio().stats.starts}),true)')
 protocol_started=False
 try:
  protocol=context.new_cdp_session(other);protocol.send('Page.setWebLifecycleState',{'state':'frozen'});protocol_started=True;page.wait_for_timeout(200);protocol.send('Page.setWebLifecycleState',{'state':'active'});other.wait_for_function('()=>audioLifecycleEvents.some(e=>e.name==="resume")',timeout=10000)
  events=other.evaluate('audioLifecycleEvents');assert [e['name']for e in events]==['freeze','resume'];assert other.evaluate('__b2zAudio().activeVoices')==0;report['chromium_protocol_freeze_resume']={'status':'PASS','events':events,'scope':'Actual Chromium lifecycle, muted tab; not physical OS suspension'};protocol.detach()
 except Exception as e:
  observed=other.evaluate('audioLifecycleEvents')
  if observed:raise
  report['chromium_protocol_freeze_resume']={'status':'BLOCKED','reason':str(e),'events':observed,'scope':'Protocol did not dispatch lifecycle events on this visible headless page; no actual freeze assertion qualified'}
 other.close()
 # Actual RAF spacing on identical pinned movement. This includes host scheduling/GPU;
 # matched CPU-only incremental costs are measured separately by measure_audio.mjs.
 perf=[]
 for enabled in [False,True]:
  page.locator('#audio-mute').set_checked(not enabled);page.evaluate('async()=>{await __b2zTools.recording(\"audio-wall\");__b2zCamera.scale=48;__b2zCamera.centre(2.5,2.5)}');page.wait_for_function('()=>__b2zExperience.session.ready&&!__b2zExperience.session.error',timeout=60000)
  perf.append(page.evaluate('''enabled=>new Promise(resolve=>{const values=[],start=performance.now();let previous=start;function sample(now){values.push(now-previous);previous=now;if(now-start<4000)return requestAnimationFrame(sample);values.sort((a,b)=>a-b);resolve({enabled,frames:values.length,over33ms:values.filter(v=>v>33.334).length,over50ms:values.filter(v=>v>50).length,p50:values[Math.ceil(values.length*.5)-1],p95:values[Math.ceil(values.length*.95)-1],p99:values[Math.ceil(values.length*.99)-1],audio:__b2zAudio()})}requestAnimationFrame(sample)})''',enabled))
 report['actual_game_frame_spacing_ms']=perf

 # Audio corruption is isolated from the game's immutable content pins.
 page.reload();page.wait_for_function('()=>__b2zExperience?.session?.ready',timeout=60000);page.locator('#audio-button').click();page.locator('#audio-clear').click();page.wait_for_function('()=>document.getElementById("audio-status").textContent==="Downloaded audio cleared."')
 def corrupt(route):route.fulfill(status=200,content_type='audio/flac',body=b'not approved audio')
 page.route('**/audio/b2z-v1/sfx/*.flac',corrupt);page.locator('#audio-mute').uncheck();page.locator('#audio-resume').click();page.wait_for_function('()=>__b2zAudio().lastError.includes("hash")',timeout=60000);assert page.evaluate('__b2zTools.state().error')is None
 assert page.evaluate('__b2zAudio().fxBuffers')==0;report['audio_hash_rejection']=page.evaluate('__b2zAudio()');page.wait_for_function('()=>!__b2zAudio().loading',timeout=60000);page.unroute('**/audio/b2z-v1/sfx/*.flac',corrupt);page.locator('#audio-resume').click();page.wait_for_function('()=>__b2zAudio().fxBuffers===4',timeout=60000);report['audio_hash_retry']='PASS'
 before=page.evaluate('__b2zAudio().stats.starts');supported=page.evaluate('''()=>{window.audioQALoss=document.getElementById('board').getContext('webgl2').getExtension('WEBGL_lose_context');return Boolean(audioQALoss)}''')
 if supported:
  page.evaluate('audioQALoss.loseContext()');page.wait_for_timeout(200);assert page.evaluate('__b2zAudio().activeVoices')==0;page.evaluate('audioQALoss.restoreContext()');page.wait_for_timeout(500);assert page.evaluate('__b2zTools.state().error')is None;assert page.evaluate('__b2zAudio().stats.starts')==before;report['native_webgl_context_loss_restore']='PASS (software renderer; no old cue)'
 else:report['native_webgl_context_loss_restore']='BLOCKED (extension unavailable)'
 # Hold all optional audio transport while the normal application verifies and
 # renders another pinned recording. This is offline content verification, not IC.
 page.locator('#audio-clear').click();page.wait_for_function('()=>document.getElementById("audio-status").textContent==="Downloaded audio cleared."')
 held=[]
 def hold(route):held.append(route)
 page.route('**/audio/b2z-v1/**/*.flac',hold)
 page.locator('#audio-music').check();page.locator('#audio-mute').uncheck();page.locator('#audio-resume').click()
 page.wait_for_function('()=>__b2zAudio().loader?.pending>0',timeout=30000)
 before=page.evaluate('__b2zAudio()');page.evaluate('()=>__b2zTools.recording("audio-wall")');page.wait_for_function('()=>__b2zExperience?.session?.ready&&!__b2zExperience?.session?.error',timeout=60000)
 after=page.evaluate('__b2zAudio()');assert after['loader']['maxFetches']<=2 and after['loader']['maxDecodes']<=1;assert page.evaluate('__b2zExperience.visibleTime')is not None
 report['slow_optional_audio']={'scope':'Actual browser pinned recording verified while FLAC requests held; not IC network priority qualification','held_requests':len(held),'before':before,'after':after,'world_ready':True}
 page.locator('#audio-mute').check()
 page.unroute('**/audio/b2z-v1/**/*.flac',hold)
 for route in held:
  try:route.abort()
  except Exception:pass
 verify_native_follow(context,url,out,report)

def verify_native_follow(context,url,out,report):
 """Actual game, native voices/panners and keyboard follow; not device latency."""
 context.add_init_script('''globalThis.audioPanQA=[];const ids=new WeakMap();let next=0;const create=AudioContext.prototype.createStereoPanner;AudioContext.prototype.createStereoPanner=function(...args){const node=create.apply(this,args);ids.set(node.pan,++next);return node};for(const key of ['setValueAtTime','linearRampToValueAtTime']){const original=AudioParam.prototype[key];AudioParam.prototype[key]=function(value,time,...args){if(ids.has(this)){audioPanQA.push({id:ids.get(this),value,time,method:key});if(audioPanQA.length>512)audioPanQA.shift()}return original.call(this,value,time,...args)}}''')
 probe=context.new_page();probe.goto(url+'/?recording=audio-wall');probe.wait_for_function('()=>__b2zExperience?.session?.ready',timeout=60000);probe.evaluate('__b2zTools.pause(true)')
 profiler=context.new_cdp_session(probe);profiler.send('Profiler.enable');profiler.send('Profiler.setSamplingInterval',{'interval':1000});profiler.send('Profiler.start')
 probe.locator('#audio-button').click();probe.locator('#audio-music').uncheck();probe.locator('#audio-effects').check();probe.locator('#audio-mute').uncheck();probe.locator('#audio-resume').click();probe.wait_for_function('()=>__b2zAudio().fxBuffers===4',timeout=60000);probe.locator('#audio-button').click();probe.evaluate('async()=>{await __b2zTools.recording("audio-wall");__b2zCamera.scale=48;__b2zCamera.centre(2.5,2.5)}');probe.locator('#board').focus();probe.keyboard.press('b');probe.wait_for_function('()=>document.getElementById("follow-announcement").textContent.includes("Following ball")')
 probe.evaluate('__b2zTools.pause(false)')
 trace=probe.evaluate('''()=>new Promise((resolve,reject)=>{const start=performance.now(),poses=[];let observed=false,frames=0;function sample(){const a=__b2zAudio();if(a.stats.starts>0)observed=true;if(observed){__b2zCamera.pan(6,0);poses.push({camera:[__b2zCamera.x,__b2zCamera.y,__b2zCamera.scale],voices:a.activeVoices,time:__b2zExperience.visibleTime});if(++frames===8)return resolve({poses,pans:audioPanQA,audio:a,follow:document.getElementById('follow-announcement').textContent})}if(performance.now()-start>20000)return reject(Error('No fresh native cue while following'));requestAnimationFrame(sample)}requestAnimationFrame(sample)})''')
 assert trace['audio']['stats']['starts']>0 and trace['pans'];assert trace['audio']['stats']['maxVoices']<=8;assert len({tuple(r['camera'])for r in trace['poses']})>1
 # Capture actual native parameter automation; do not infer hardware output.
 trace['native_pan_values']=sorted({r['value']for r in trace['pans']});assert len(trace['native_pan_values'])>1,'Native panner did not respond to changing camera poses';trace['status']='PASS';trace['scope']=__doc__+' Native actual-game keyboard-follow/camera-pan probe; parameter logging is test-only, not a frame-performance benchmark.'
 probe.keyboard.press('Escape');assert probe.locator('#follow-announcement').text_content()=='';probe.screenshot(path=str(out/'native-follow-pan.png'));assert probe.evaluate('__b2zTools.state().error')is None;report['native_follow_pan']=trace;profile=profiler.send('Profiler.stop')['profile'];(out/'native-follow.cpuprofile').write_text(json.dumps(profile)+'\n');profiler.detach();probe.close()
