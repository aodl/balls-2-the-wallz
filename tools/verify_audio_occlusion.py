#!/usr/bin/env python3
"""Native effect-tail suppression by actual UI nodes in controlled overlap poses.
Uses retained offline game assets, not IC certificates or a physical output route.
"""
import argparse,functools,http.server,json,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--fixture-dir',type=Path,required=True);p.add_argument('--policy-dir',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();out=a.output.absolute();out.mkdir(parents=True,exist_ok=False);policies=json.loads((a.policy_dir/'.ic-assets.json5').read_text())
CSS=b'.native-audio-mask{position:fixed!important;left:var(--qa-x)!important;top:var(--qa-y)!important;right:auto!important;bottom:auto!important;width:160px!important;height:160px!important;z-index:10000!important;opacity:1!important;pointer-events:none!important}'
class H(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  if self.path=='/mask.css':
   self.send_response(200);self.send_header('Content-Type','text/css');self.send_header('Content-Length',str(len(CSS)));self.end_headers();self.wfile.write(CSS);return
  super().do_GET()
 def end_headers(self):
  headers=policies[1]['headers']if self.path.endswith('.flac')else policies[2]['headers']if self.path.endswith('/manifest.json')else policies[0]['headers']
  for k,v in headers.items():self.send_header(k,v)
  super().end_headers()
s=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(H,directory=str(a.fixture_dir.absolute())));threading.Thread(target=s.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{s.server_port}';report={'scope':__doc__,'rows':[]}
with sync_playwright()as pw:
 b=pw.chromium.launch(headless=True,chromium_sandbox=True)
 try:
  for selector in ['.arena-chrome','#minimap','#workspace','#audio-popover']:
   c=b.new_context(viewport={'width':390,'height':844});c.add_init_script('''globalThis.audioStopQA=[];const stop=AudioBufferSourceNode.prototype.stop;AudioBufferSourceNode.prototype.stop=function(when){audioStopQA.push({at:this.context.currentTime,when:when??null});return when===undefined?stop.call(this):stop.call(this,when)}''');page=c.new_page();page.goto(url+'/?recording=audio-wall');page.wait_for_function('()=>__b2zExperience?.session?.ready',timeout=60000);page.evaluate('__b2zTools.pause(true)');page.add_style_tag(url=url+'/mask.css')
   page.locator('#audio-button').click();page.locator('#audio-effects').check();page.wait_for_function('()=>__b2zAudio().fxBuffers===4',timeout=60000);page.locator('#audio-button').click();page.evaluate('async()=>{await __b2zTools.recording("audio-wall");__b2zCamera.scale=48;__b2zCamera.centre(2.5,2.5);audioStopQA=[];__b2zTools.pause(false)}')
   row=page.evaluate('''sel=>new Promise((resolve,reject)=>{const start=performance.now();let masked=false,point,rect;function sample(){const audio=__b2zAudio();if(!masked&&audio.activeVoices){const ball=__b2zExperience.visible.balls.values().next().value,t=__b2zExperience.visibleTime,p=__b2zCamera.point((Number(ball.x0)+ball.vx*t)/1024,(Number(ball.y0)+ball.vy*t)/1024,.14),canvas=document.getElementById('board').getBoundingClientRect(),node=document.querySelector(sel);point={x:canvas.left+p.sx,y:canvas.top+p.sy};node.hidden=false;node.style.setProperty('--qa-x',(point.x-80)+'px');node.style.setProperty('--qa-y',(point.y-80)+'px');node.classList.add('native-audio-mask');rect=node.getBoundingClientRect().toJSON();masked=true;}if(masked&&audioStopQA.some(s=>s.when!==null&&s.when>s.at&&s.when-s.at<=.1))return resolve({selector:sel,point,rect,stops:audioStopQA,audio:__b2zAudio(),gameError:__b2zTools.state().error});if(performance.now()-start>20000)return reject(Error('No native mask fade stop for '+sel));requestAnimationFrame(sample)}requestAnimationFrame(sample)})''',selector)
   assert row['gameError']is None;assert row['audio']['stats']['starts']>0;assert row['rect']['left']<=row['point']['x']<=row['rect']['right'];assert row['rect']['top']<=row['point']['y']<=row['rect']['bottom'];report['rows'].append(row);page.screenshot(path=str(out/(selector.replace('#','').replace('.','')+'.png')));c.close()
  report['status']='PASS'
 except Exception as e:report.update(status='FAIL',error=str(e));page.screenshot(path=str(out/'failure.png'));raise
 finally:(out/'results.json').write_text(json.dumps(report,indent=2)+'\n');b.close();s.shutdown()
