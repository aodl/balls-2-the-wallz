#!/usr/bin/env python3
"""Native displayed contact perspective through actual SegmentPlayer/renderer/engine.
Disposable canonical kernel data: source-content verification, not IC authenticity or physical listening.
"""
import argparse,base64,functools,http.server,json,shutil,subprocess,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);a=p.parse_args();out=a.output.absolute();out.mkdir(parents=True,exist_ok=False);root=Path(__file__).resolve().parents[1]
subprocess.run(['node','tools/fixtures/prepare-audio-contact.mjs',str(out/'contact.json')],check=True);subprocess.run(['node_modules/.bin/esbuild','tools/fixtures/audio-contact-browser.mjs','--bundle','--platform=browser','--format=esm','--outfile='+str(out/'contact.mjs')],check=True)
(out/'index.html').write_text((root/'apps/b2z-observer/index.html').read_text().replace('./app.mjs','./contact.mjs'))
for f in ['style.css','icon.svg','cursors/reticle.svg']:
 target=out/f;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes((root/'apps/b2z-observer'/f).read_bytes())
shutil.copytree(root/'apps/b2z-observer/audio',out/'audio');rows=[];expected=json.loads((out/'contact.json').read_text())['expected'];assert expected['initialBoundaryAccount']!=expected['latestBoundaryAccount']
class H(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
 def end_headers(self):self.send_header('Content-Security-Policy',"default-src 'none';script-src 'self';style-src 'self';img-src 'self';connect-src 'self';base-uri 'none';form-action 'none'");self.send_header('Permissions-Policy','autoplay=()');super().end_headers()
s=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(H,directory=str(out)));threading.Thread(target=s.serve_forever,daemon=True).start()
with sync_playwright()as pw:
 b=pw.chromium.launch(headless=True,chromium_sandbox=True)
 try:
  for name,account,durations in [('friendly','aaaaa-aa',[.28,.30]),('threat','rrkah-fqaaa-aaaaa-aaaaq-cai',[.82]),('spectator',None,[.18])]:
   c=b.new_context(viewport={'width':1440,'height':900});page=c.new_page();page.add_init_script(path=str(root/'tools/fixtures/audio-output-tap.js'));page.add_init_script('globalThis.contactStarts=[];const native=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){if(this.buffer?.duration<2)contactStarts.push({duration:this.buffer.duration,rate:this.playbackRate.value,at:this.context.currentTime});return native.apply(this,args)}');page.goto(f'http://127.0.0.1:{s.server_port}');page.wait_for_function('()=>!!contactQA')
   if account:page.locator('#identify-button').click();page.locator('#sending-account').fill(account);page.locator('#identity-save').click();assert page.locator('#identity-note').text_content()=='';assert page.evaluate('contactQA.state().account')is not None;page.locator('#close-panel').click()
   else:page.locator('#board').click(position={'x':100,'y':180})
   page.wait_for_function('()=>contactQA.audio().music?.active&&contactQA.audio().fxBuffers===7',timeout=60000);page.evaluate('contactQA.start()');page.wait_for_function('()=>contactStarts.length>0',timeout=15000);first=page.evaluate('contactStarts[0]');assert any(abs(first['duration']-v)<.0001 for v in durations),(name,first);assert first['rate']==1;page.wait_for_timeout(1800);state=page.evaluate('contactQA.audio()');perspective_state=page.evaluate('contactQA.state()');assert perspective_state['latestBoundaryOwner']==expected['latestBoundaryAccount'] and perspective_state['authorityTime']==['1','1'];assert state['stats']['maxVoices']<=8;endpoint=page.evaluate('contactQA.finish()');assert endpoint['endpointEquality']and endpoint['events']==endpoint['expected']and endpoint['startsBeforeSeek']==endpoint['startsAfterSeek'];page.screenshot(path=str(out/(name+'.png')))
   for i,data in enumerate(page.evaluate('outputQA.capture()')):(out/f'{name}-{i}.webm').write_bytes(base64.b64decode(data))
   rows.append({'perspective':name,'account':account,'firstNativeEffect':first,'presentationAndAuthority':perspective_state,'audio':state,'endpoint':endpoint});c.close();(out/'results.json').write_text(json.dumps({'status':'RUNNING','scope':__doc__,'rows':rows},indent=2)+'\n')
  (out/'results.json').write_text(json.dumps({'status':'PASS','scope':__doc__,'rows':rows},indent=2)+'\n')
 finally:b.close();s.shutdown()
