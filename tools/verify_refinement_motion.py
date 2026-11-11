#!/usr/bin/env python3
"""Matched real wall-clock supported-rate visual samples; no production or hardware claim."""
import argparse,functools,http.server,json,threading,time
from pathlib import Path
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--baseline',type=Path,required=True);p.add_argument('--candidate',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();out=a.output.absolute();out.mkdir(parents=True,exist_ok=False);rows=[]
class H(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
with sync_playwright()as pw:
 b=pw.chromium.launch(headless=True,chromium_sandbox=True)
 try:
  for label,directory in [('deployed',a.baseline),('refined',a.candidate)]:
   server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(H,directory=str(directory.absolute())));threading.Thread(target=server.serve_forever,daemon=True).start()
   try:
    c=b.new_context(viewport={'width':960,'height':700},record_video_dir=str(out/'video'),record_video_size={'width':960,'height':700});page=c.new_page();page.goto(f'http://127.0.0.1:{server.server_port}');page.wait_for_function('()=>!!fixture')
    for pace,seconds in [(.01,22),(.05,8),(1,.65)]:
     page.evaluate('(pace)=>fixture.motion("idle",pace)',pace);
     if pace>=.5:
      page.evaluate('fixture.appendMotion()');page.evaluate('fixture.controlledHide();fixture.controlledReturn()')
     page.evaluate('fixture.playbackScale(1);fixture.camera.scale=76;const b=fixture.displayedBalls()[0];fixture.camera.centre(b.x,b.y);fixture.draw()');
     if pace>=.5:page.locator('#board').focus();page.keyboard.press('b')
     start=page.evaluate('({time:fixture.summary().time,points:fixture.displayedBalls()})');wall=time.monotonic();page.wait_for_timeout(seconds*1000);elapsed=time.monotonic()-wall
     pixels=page.evaluate('''()=>{fixture.draw();const b=fixture.displayedBalls()[0],p=fixture.camera.point(b.x,b.y,.14),canvas=document.getElementById('board'),gl=canvas.getContext('webgl2'),ratio=canvas.width/innerWidth,size=96,a=new Uint8Array(size*size*4);gl.readPixels(Math.round(p.sx*ratio)-size/2,Math.round((innerHeight-p.sy)*ratio)-size/2,size,size,gl.RGBA,gl.UNSIGNED_BYTE,a);let white=0,outer=0;for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4;if(a[i]>235&&a[i+1]>235&&a[i+2]>235){white++;if(Math.hypot(x-size/2,y-size/2)>8*ratio)outer++;}}return{white_pixels:white,white_outside_core:outer,buffer_ratio:ratio,size,stats:fixture.summary().stats,time:fixture.summary().time,points:fixture.displayedBalls()}}''');page.screenshot(path=str(out/f'{label}-{pace}-working.png'));page.evaluate('fixture.camera.scale=fixture.camera.fitScale;fixture.draw()');page.screenshot(path=str(out/f'{label}-{pace}-widest.png'));rows.append({'variant':label,'pace_ticks_per_second':pace,'startup':'warm verified resume; ball followed to keep it in frame'if pace>=.5 else'nominal slow startup','real_elapsed_seconds':elapsed,'initial':start,'sample':pixels});(out/'results.json').write_text(json.dumps({'status':'MEASURED','rows':rows,'scope':__doc__},indent=2)+'\n');print(label,pace,pixels['stats']['tails'],pixels['white_outside_core'],flush=True)
    c.close()
   finally:server.shutdown()
 finally:b.close()
