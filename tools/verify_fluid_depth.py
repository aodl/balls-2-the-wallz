#!/usr/bin/env python3
"""Actual WebGL guide depth comparison; source variants are isolated disposable tests."""
from human_input import set_heading,choose_cell,chosen_cell,heading_value
import argparse,functools,http.server,json,subprocess,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--fixture-dir',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();out=a.output.absolute();out.mkdir(parents=True,exist_ok=False);subprocess.run(['node','tools/fixtures/build-fluid-depth.mjs',str(a.fixture_dir),str(out/'variants')],check=True)
class H(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
s=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(H,directory=str(out/'variants')));threading.Thread(target=s.serve_forever,daemon=True).start();pixels={};rows=[]
with sync_playwright()as p:
 b=p.chromium.launch(headless=True,chromium_sandbox=True)
 try:
  for variant in ['normal','no-guide','overdraw']:
   c=b.new_context(viewport={'width':500,'height':400});page=c.new_page();page.goto(f'http://127.0.0.1:{s.server_port}/{variant}/');page.wait_for_function('()=>!!globalThis.fixture');page.locator('#identify-button').click();page.locator('#sending-account').fill('aaaaa-aa');page.locator('#identity-save').click();page.locator('#close-panel').click();page.evaluate('fixture.render("additional","initial");fixture.select(1)');page.locator('#fire-action').click()
   for scale in [48,96]:
    for angle in [0,45,90,135,180,225,270,315]:
     set_heading(page,angle);page.evaluate('(scale)=>{fixture.shell.controller.cancel();fixture.camera.scale=scale;const c=fixture.world().cannons.find(c=>c.id===1);fixture.camera.centre(c.cell%1000+.5,Math.floor(c.cell/1000)+.5);fixture.draw()}',scale);pixels[(variant,scale,angle)]=page.evaluate('fixture.depthPixels()')
   page.screenshot(path=str(out/(variant+'.png')));c.close();print('captured',variant,flush=True)
  for scale in [48,96]:
   for angle in [0,45,90,135,180,225,270,315]:
    base=pixels[('no-guide',scale,angle)];fixed=pixels[('normal',scale,angle)];bad=pixels[('overdraw',scale,angle)];mask=[]
    # Erode the actual neutral gunmetal/outline mask by one pixel, excluding edges.
    def body(i):v=base[i*4:i*4+3];return max(v)<150 and max(v)-min(v)<25 and base[i*4+3]==255
    for y in range(1,127):
     for x in range(1,127):
      i=y*128+x
      if all(body(i+dx+dy*128)for dx,dy in[(0,0),(-1,0),(1,0),(0,-1),(0,1)]):mask.append(i)
    assert mask,(scale,angle)
    changes=lambda image:sum(max(abs(image[i*4+k]-base[i*4+k])for k in range(3))>8 for i in mask)
    f,n=changes(fixed),changes(bad);row={'scale':scale,'screen_heading':angle,'solid_interior_pixels':len(mask),'fixed_overdraw_pixels':f,'disabled_depth_overdraw_pixels':n,'outside_body_guide_pixels':sum(fixed[i:i+3]!=base[i:i+3]for i in range(0,len(base),4))};rows.append(row);assert f/len(mask)<=.02,row;assert row['outside_body_guide_pixels']>0,row
  assert any(r['screen_heading']==0 and r['disabled_depth_overdraw_pixels']>=5 for r in rows),rows
  (out/'results.json').write_text(json.dumps({'status':'PASS','scope':__doc__,'rows':rows,'limits':'Software WebGL; not physical-GPU/device evidence. Overdraw/no-guide bundles are disposable negative/reference variants.'},indent=2)+'\n');print('PASS fixed guide occlusion, 16 direction/zoom cases and negative control',flush=True)
 finally:b.close();s.shutdown()
