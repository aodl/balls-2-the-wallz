import functools,http.server,threading,json
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path('.work/audio-onboarding-compact-controls/native-full').absolute()
class H(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
s=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(H,directory=str(root)));threading.Thread(target=s.serve_forever,daemon=True).start()
with sync_playwright()as pw:
 b=pw.chromium.launch(headless=True,chromium_sandbox=True);p=b.new_page();p.goto(f'http://127.0.0.1:{s.server_port}/');r=p.evaluate('''async()=>{const bytes=await(await fetch('/native-contact-levels.webm')).arrayBuffer(),c=new OfflineAudioContext(2,1,48000),buffer=await c.decodeAudioData(bytes),rows=[];for(let k=0;k<9;k++){let sum=0,peak=0,count=0;for(let ch=0;ch<2;ch++){const x=buffer.getChannelData(ch);for(let i=Math.floor((k+.1)*48000);i<Math.min(x.length,Math.floor((k+.9)*48000));i++){sum+=x[i]*x[i];peak=Math.max(peak,Math.abs(x[i]));count++;}}rows.push({scale:[60,24,5][Math.floor(k/3)],effect:['friendly','threat','neutral'][k%3],rms:Math.sqrt(sum/count),peak});}return{scope:'Decode/measure an already recorded real native output stream, not offline-synthesised output',frames:buffer.length,sampleRate:buffer.sampleRate,rows}}''');Path('.work/audio-onboarding-compact-controls/native-levels.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r));b.close()
s.shutdown()
