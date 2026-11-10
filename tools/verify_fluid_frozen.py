#!/usr/bin/env python3
"""Exact frozen assets on loopback, anonymous/read-only certified European game."""
import argparse,functools,hashlib,http.server,json,threading,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--assets',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();out=a.output.absolute();out.mkdir(parents=True,exist_ok=False);assets=a.assets.absolute();policy=json.loads((assets/'.ic-assets.json5').read_text())[0]['headers'];rows=[]
class H(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def end_headers(self):
  for k,v in policy.items():self.send_header(k,v)
  super().end_headers()
s=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(H,directory=str(assets)));threading.Thread(target=s.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{s.server_port}'
with sync_playwright()as pw:
 b=pw.chromium.launch(headless=True,chromium_sandbox=True)
 try:
  for w,h in [(1440,900),(390,844),(320,640)]:
   c=b.new_context(viewport={'width':w,'height':h},permissions=['clipboard-write']);page=c.new_page();posts=[];errors=[];page.on('request',lambda r:posts.append(r.url)if r.method=='POST'else None);page.on('pageerror',lambda e:errors.append(str(e)));page.add_init_script('window.copied=[];const write=navigator.clipboard.writeText.bind(navigator.clipboard);navigator.clipboard.writeText=async v=>{await write(v);copied.push(v)}');response=page.goto(origin,wait_until='domcontentloaded');assert all(response.header_value(k)==v for k,v in policy.items());page.wait_for_function('()=>Boolean(globalThis.__b2zExperience?.session?.ready)',timeout=90000);assert page.locator('#workspace').is_hidden();assert page.locator('#render-error').is_hidden();assert page.evaluate('__dtrLive.delivery.acceptedHeads.at(-1).mode')=='certificate-verifier';world=page.evaluate('({cannons:__b2zExperience.session.referenceWorld.cannons.map(c=>({id:c.id,account:c.account})),source:__b2zExperience.session.source,identity:__b2zExperience.session.sequence.last.publication.identity,operational:__b2zExperience.session.operational,board:{version:__b2zExperience.session.referenceWorld.version,width:__b2zExperience.session.referenceWorld.width,height:__b2zExperience.session.referenceWorld.height,time:__b2zExperience.session.referenceWorld.time}})');assert world['source']['owner']=='s5ir5-gqaaa-aaaas-amyna-cai';assert world['source']['recipient']=='c58487869d46ef0494c7d7c0312b2760abb7164eafd23f0009a42b9545f53bde';assert not page.locator('#legacy-details,#hex-memo,#payment-address,[data-copy="hex"]').count();handoff=None
   if world['cannons']:
    sender=world['cannons'][0]['account'];page.locator('#identify-button').click();page.locator('#sending-account').fill(sender);page.locator('#identity-save').click();page.locator('#close-panel').click();page.locator('#centre-cannon').click()
    if page.locator('#roster-view').is_visible():page.locator('#own-cannons button').first.click()
    if page.locator('#locate-context').is_visible():page.locator('#locate-context').click()
    page.locator('#fire-action').click();page.locator('#angle-degrees').fill('45');page.wait_for_timeout(1000)
    if not page.locator('#transfer-controls').evaluate('(n)=>n.disabled'):
     memo=page.locator('#text-memo').inner_text();assert memo==f'FIRE {world["cannons"][0]["id"]} 255 1';assert page.locator('#payment-owner').inner_text()==world['source']['owner'];assert page.locator('#paying-account').inner_text()==sender;expect(page.locator('#payment-risk')).to_contain_text('no automatic refunds');page.locator('[data-copy="text"]').click();page.wait_for_function('(m)=>copied.at(-1)===m',arg=memo);page.locator('#angle-degrees').fill('90');expect(page.locator('#replace-choice')).to_be_visible();page.locator('#keep-instructions').click();expect(page.locator('#text-memo')).to_have_text(memo);handoff={'memo':memo,'utf8':list(memo.encode()),'amount':page.locator('#transfer-amount').inner_text(),'payer':sender}
    else:handoff={'unavailable_reason':page.locator('#preparation-note').inner_text(),'scope':'No admission bypass; disposable fixtures qualify payment interactions.'}
    page.screenshot(path=str(out/f'{w}-verified.png'));assert page.evaluate('()=>{const c=__b2zExperience.clock,q=__b2zExperience.queue;document.getElementById("close-panel").click();return c===__b2zExperience.clock&&q===__b2zExperience.queue}')
   assert all(u.endswith(('/query','/read_state'))for u in posts),posts;assert not errors,errors;files={}
   for path in sorted(assets.rglob('*')):
    if not path.is_file()or path.name=='.ic-assets.json5':continue
    name=path.relative_to(assets).as_posix();r=c.request.get(origin+'/'+name);assert r.ok;body=r.body();assert body==path.read_bytes(),name;files[name]=hashlib.sha256(body).hexdigest()
   rows.append({'viewport':[w,h],'status':'PASS','world':world,'handoff':handoff,'files':files,'all_posts_read_only':True,'errors':errors});(out/'progress.json').write_text(json.dumps(rows,indent=2)+'\n');c.close();print('PASS',w,flush=True)
 except Exception:
  traceback.print_exc();page.screenshot(path=str(out/'failure.png'));(out/'failure.json').write_text(json.dumps({'errors':errors,'body':page.locator('body').inner_text()},indent=2));raise
 finally:b.close();s.shutdown()
(out/'results.json').write_text(json.dumps({'status':'PASS','scope':__doc__,'production_frontend_modified':False,'rows':rows},indent=2)+'\n')
