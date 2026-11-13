#!/usr/bin/env python3
"""Actual DOM/renderer/Camera audibility geometry. Controlled fixture; no sound/IC authenticity claim."""
import argparse,functools,http.server,json,subprocess,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);p.add_argument('--multi-only',action='store_true');a=p.parse_args();out=a.output.absolute();out.mkdir(parents=True,exist_ok=False);root=Path.cwd()
subprocess.run(['node','tools/fixtures/prepare-playability-actions.mjs',str(out/'fixture.json')],check=True);subprocess.run(['node_modules/.bin/esbuild','tools/fixtures/playability-action-browser.mjs','--bundle','--format=esm','--platform=browser','--outfile='+str(out/'fixture.mjs')],check=True)
(out/'qa.css').write_text('.qa-occluder{position:fixed!important;left:30%!important;top:35%!important;right:auto!important;bottom:auto!important;width:160px!important;height:100px!important;display:block!important}')
(out/'index.html').write_text((root/'apps/b2z-observer/index.html').read_text().replace('./app.mjs','./fixture.mjs').replace('</head>','<link rel="stylesheet" href="./qa.css"></head>'))
for name in ['style.css','icon.svg','cursors/reticle.svg']:
 target=out/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes((root/'apps/b2z-observer'/name).read_bytes())
class H(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def end_headers(self):self.send_header('Content-Security-Policy',"default-src 'none';script-src 'self';style-src 'self';connect-src 'self';img-src 'self'");super().end_headers()
subprocess.run(['node','tools/fixtures/audio-multisegment.mjs',str(out/'multi.json')],check=True)
subprocess.run(['node_modules/.bin/esbuild','tools/fixtures/audio-multisegment-browser.mjs','--bundle','--format=esm','--platform=browser','--outfile='+str(out/'multi.mjs')],check=True)
(out/'multi.html').write_text('<!doctype html><script type="module" src="./multi.mjs"></script>')
s=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(H,directory=str(out)));threading.Thread(target=s.serve_forever,daemon=True).start();report={'scope':__doc__,'rows':[]}
with sync_playwright()as pw:
 b=pw.chromium.launch(headless=True,chromium_sandbox=True)
 try:
  for width,height in ([]if a.multi_only else [(1440,900),(390,844),(320,640)]):
   for dpr in [1,2,3]:
    c=b.new_context(viewport={'width':width,'height':height},device_scale_factor=dpr);page=c.new_page();page.goto(f'http://127.0.0.1:{s.server_port}');page.wait_for_function('()=>!!window.fixture');page.evaluate('fixture.render("additional");fixture.camera.centre(578.5,453.5)');rows=[]
    # Use the actual source's canonical cell, never a guessed screen proxy.
    page.evaluate('()=>{const n=fixture.world().cannons[0].cell;fixture.camera.centre(n%1000+.5,Math.floor(n/1000)+.5)}')
    for px in [12,20,30,40]:
     value=page.evaluate('px=>{fixture.camera.scale=px/Math.sqrt(2/3);return fixture.audioProbe()}',px);row=next(r for r in value['rows']if r['kind']=='cannon'and r['entity']==1);gain=(row['masked']or{}).get('gain',0);rows.append({'cellPx':px,'gain':gain,'facts':value})
    assert rows[0]['gain']==0 and 0<rows[1]['gain']<rows[2]['gain']<=rows[3]['gain'];assert rows[-1]['gain']>.99
    page.evaluate('document.getElementById("board").style.cssText="position:absolute;left:20px;top:30px;width:calc(100% - 40px);height:calc(100% - 60px)"');page.wait_for_timeout(100);offset=page.evaluate('fixture.audioProbe()');assert offset['canvas']['left']==20 and offset['canvas']['top']==30;assert offset['pose']==offset['membershipPose'];source=next(r for r in offset['rows']if r['kind']=='cannon'and r['entity']==1);assert source['masked']
    page.evaluate('document.documentElement.style.overflow="auto";document.body.style.cssText="overflow:visible;height:200vh";document.getElementById("board").style.top="130px";scrollTo(0,100)');page.wait_for_function('()=>scrollY===100');scrolled=page.evaluate('fixture.audioProbe()');assert scrolled['canvas']['top']==30;assert scrolled['pose']==scrolled['membershipPose'];assert next(r for r in scrolled['rows']if r['kind']=='cannon'and r['entity']==1)['masked']
    page.evaluate('scrollTo(0,0);document.documentElement.style.cssText="";document.body.style.cssText="";document.getElementById("board").style.top="30px"');page.wait_for_function('()=>scrollY===0')
    # Relocate real opaque DOM nodes into the safe interior to isolate UI masking
    # from the independently conservative screen-edge rule. Test-only placement.
    overlays=[]
    for selector in ['.arena-chrome','#minimap','#workspace','#audio-popover']:
     page.evaluate('sel=>{const n=document.querySelector(sel);n.hidden=false;n.classList.add("qa-occluder");document.dispatchEvent(new Event("b2z-audio-layout"))}',selector);page.wait_for_timeout(50)
     value=page.evaluate('sel=>{const c=fixture.world().cannons[0],r=document.querySelector(sel).getBoundingClientRect(),canvas=document.getElementById("board").getBoundingClientRect(),p=fixture.camera.cellPoint(c.cell);fixture.camera.pan(r.left+r.width/2-canvas.left-p.sx,r.top+r.height/2-canvas.top-p.sy);return fixture.audioProbe()}',selector)
     row=next(r for r in value['rows']if r['entity']==1 and r['kind']=='cannon');assert row['plain']and row['masked']is None,(selector,row);overlays.append({'node':selector,'facts':value});page.evaluate('sel=>{const n=document.querySelector(sel);n.classList.remove("qa-occluder");n.style.cssText="";n.hidden=sel==="#workspace"||sel==="#audio-popover";document.dispatchEvent(new Event("b2z-audio-layout"))}',selector)
    poses=page.evaluate('''()=>{fixture.render("wrap");fixture.camera.scale=64;const rows=[];for(const x of [999.5,1000.5,-.5,.5]){fixture.camera.centre(x,999.5);const p=fixture.audioProbe();if(p.pose!==p.membershipPose)throw Error("Stale renderer pose at seam");rows.push(p);}for(const dx of [-20,20]){fixture.camera.pan(dx,0);const p=fixture.audioProbe();if(p.pose!==p.membershipPose)throw Error("Stale renderer pose after pan");rows.push(p);}return rows}''')
    page.screenshot(path=str(out/f'{width}-dpr{dpr}.png'));report['rows'].append({'viewport':[width,height],'dpr':dpr,'zoom':rows,'offset':offset,'scrolled':scrolled,'overlays':overlays,'controlled_seam_pan_poses':poses});c.close();(out/'results.json').write_text(json.dumps(report,indent=2)+'\n')
  page=b.new_page();page.goto(f'http://127.0.0.1:{s.server_port}/multi.html');page.wait_for_function('()=>!!globalThis.multiFrame');report['multi_segment_native_frame']=page.evaluate('()=>Promise.race([multiFrame(),new Promise((_,reject)=>setTimeout(()=>reject(Error("Native frame deadline")),30000))])')
  report['status']='PASS'
 except Exception as e:report.update(status='FAIL',error=str(e));page.screenshot(path=str(out/'failure.png'));raise
 finally:(out/'results.json').write_text(json.dumps(report,indent=2)+'\n');b.close();s.shutdown()
