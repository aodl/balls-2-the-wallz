"""Native actual-app controls/faults. Controlled lifecycle here; real tabs separately qualified."""
import json,math

def retained_source_frame(before,after):
 # AudioMusic.stop deliberately saves Math.floor(position()), an integer source
 # frame. Compare that exact contract, not a fractional AudioContext snapshot.
 assert math.isfinite(before) and math.isfinite(after) and before>=0 and after>=0
 saved_frame=math.floor(before)
 assert after>=saved_frame, f"Music source-frame rewind: before={before!r}, saved={saved_frame}, after={after!r}"
 return {"before":before,"saved_source_frame":saved_frame,"after":after,"delta_source_frames":after-before}

def verify_audio_lifecycle(page,context,url,out,report):
 before=page.evaluate('__b2zAudio()')
 # Controlled document lifecycle event tests cancellation; not genuine visibility.
 page.evaluate('document.dispatchEvent(new Event("freeze"))');page.wait_for_function('()=>__b2zAudio().hidden');assert page.evaluate('__b2zAudio().activeVoices')==0
 page.evaluate('document.dispatchEvent(new Event("resume"))');page.wait_for_function('()=>__b2zAudio().music.active',timeout=60000);report['controlled_freeze_resume']={'before':before,'after':page.evaluate('__b2zAudio()'),'status':'PASS controlled events, not native visibility'}
 # A fresh context/cache isolates bad audio bytes from the working lane. It may
 # never poison verified game state. No integrity assertion is removed.
 isolated=context.browser.new_context(viewport={'width':390,'height':844});bad=isolated.new_page()
 def corrupt(route):route.fulfill(status=200,content_type='audio/flac',body=b'invalid pinned audio')
 bad.route('**/audio/b2z-v1/sfx/*.flac',corrupt);bad.goto(url+'/?recording=audio-wall');bad.wait_for_function('()=>__b2zExperience?.session?.ready',timeout=60000);bad.locator('#board').click(position={'x':160,'y':180});bad.wait_for_function('()=>__b2zAudio().lastError.includes("hash")',timeout=60000);assert bad.evaluate('__b2zTools.state().error')is None;assert bad.evaluate('__b2zAudio().fxBuffers')==0
 report['audio_hash_rejection']=bad.evaluate('__b2zAudio()');bad.unroute('**/audio/b2z-v1/sfx/*.flac',corrupt)
 # Online is a meaningful recovery signal, no repair button or toggle ritual.
 bad.evaluate('dispatchEvent(new Event("online"))');bad.wait_for_function('()=>__b2zAudio().fxBuffers===7&&__b2zAudio().music.active',timeout=60000);report['audio_hash_recovery']={'status':'PASS verified refetch; game unaffected','state':bad.evaluate('__b2zAudio()')};isolated.close()
 # Actual native suspension/closure, controlled by the harness. These are not
 # claims about a physical OS audio-route interruption.
 identity=page.evaluate('globalThis.nativeGameIdentityQA={session:__b2zExperience.session,clock:__b2zExperience.clock,queue:__b2zExperience.queue};({phase:__b2zAudio().music.phase,contexts:audioContextsQA.length})')
 page.evaluate('audioContextsQA.at(-1).suspend()');page.wait_for_function('()=>__b2zAudio().music.active&&__b2zAudio().contextState==="running"',timeout=15000)
 phase=page.evaluate('__b2zAudio().music.phase');report['native_suspend_phase']=retained_source_frame(identity['phase'],phase);page.evaluate('audioContextsQA.at(-1).close()');page.wait_for_function('()=>__b2zAudio().contextState==="closed"');page.locator('#board').click(position={'x':160,'y':180});page.wait_for_function('()=>__b2zAudio().music.active&&__b2zAudio().fxBuffers===7',timeout=60000)
 assert page.evaluate('audioContextsQA.length')==identity['contexts']+1;report['native_close_phase']=retained_source_frame(phase,page.evaluate('__b2zAudio().music.phase'));assert page.evaluate('nativeGameIdentityQA.session===__b2zExperience.session&&nativeGameIdentityQA.clock===__b2zExperience.clock&&nativeGameIdentityQA.queue===__b2zExperience.queue')
 report['native_context_recovery']={'status':'PASS controlled actual native suspend/close; one ordinary gesture, one recreation, phase and game references retained','state':page.evaluate('__b2zAudio()')}
 report['game_error']=page.evaluate('__b2zTools.state().error');assert report['game_error']is None
