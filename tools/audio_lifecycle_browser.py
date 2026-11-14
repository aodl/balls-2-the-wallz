"""Native actual-app controls/faults. Controlled lifecycle here; real tabs separately qualified."""
import json

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
 report['game_error']=page.evaluate('__b2zTools.state().error');assert report['game_error']is None
