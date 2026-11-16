import json,time
from pathlib import Path
from playwright.sync_api import sync_playwright
from importlib.machinery import SourceFileLoader
qa=SourceFileLoader('qa','.work/approved-panel-deployment-20261116/live-common.py').load_module();out=Path('.work/approved-panel-deployment-20261116/copy-diagnostic');out.mkdir(exist_ok=False);report={'status':'RUNNING','copies':[],'scope':'Actual deployed frontend; native clipboard events and external paste, no payment/status override'}
with sync_playwright()as pw:
 b=pw.chromium.launch(headless=True,chromium_sandbox=True);c=b.new_context(viewport={'width':1440,'height':900},permissions=['clipboard-read','clipboard-write']);c.route('**/*',lambda r:r.continue_()if r.request.method in ['GET','OPTIONS']or r.request.method=='POST'and r.request.url.endswith(('/query','/read_state'))else r.abort());p=c.new_page();p.add_init_script("globalThis.copyTrace=[];addEventListener('copy',e=>copyTrace.push({at:performance.now(),ready:__b2zExperience.status.canPrepare,disabled:document.getElementById('transfer-controls').disabled,prevented:e.defaultPrevented,value:e.clipboardData?.getData('text/plain'),selection:getSelection().toString(),feedback:document.getElementById('copy-feedback').textContent}),false)");p.goto(qa.URL,wait_until='domcontentloaded');qa.enter_fire(p);p.locator('#build-action').click();qa.settle(p)
 def paste():
  q=c.new_page();q.set_content('<textarea id=p></textarea>');q.locator('#p').focus();q.keyboard.press('Control+V');v=q.locator('#p').input_value();q.close();p.bring_to_front();return v
 try:
  for i in range(10):
   p.wait_for_function('()=>__b2zExperience.status.canPrepare&&!document.getElementById("transfer-controls").disabled',timeout=60000)
   if not p.locator('#full-recipient').is_visible():p.locator('#recipient-reveal').click()
   p.locator('#full-recipient').focus();p.locator('#full-recipient').select_text();p.keyboard.press('Control+C');actual=paste();event=p.evaluate('copyTrace.at(-1)');expected=p.locator('#full-recipient').text_content();report['copies'].append({'event':event,'pasted':actual,'expected':expected});assert actual==(expected if event['ready']and not event['disabled']else''),(event,actual,expected);(out/'results.json').write_text(json.dumps(report,indent=2)+'\n')
  # A genuine browser read-only delivery fault must block native copy, then recover.
  def fault(r):r.fulfill(status=503,body='Controlled read-only delivery fault',content_type='text/plain')
  p.route('**/api/v*/canister/*/query',fault);p.wait_for_function('()=>!__b2zExperience.status.canPrepare',timeout=45000);p.locator('#full-recipient').focus();p.locator('#full-recipient').select_text();p.keyboard.press('Control+C');report['blocked']={'event':p.evaluate('copyTrace.at(-1)'),'pasted':paste()};assert report['blocked']['pasted']==''and report['blocked']['event']['prevented'];p.unroute('**/api/v*/canister/*/query',fault);p.wait_for_function('()=>__b2zExperience.status.canPrepare',timeout=60000);p.locator('#full-recipient').focus();p.locator('#full-recipient').select_text();p.keyboard.press('Control+C');report['recovered']={'event':p.evaluate('copyTrace.at(-1)'),'pasted':paste()};assert report['recovered']['pasted']==p.locator('#full-recipient').text_content();report['status']='PASS'
 except Exception as e:report.update(status='FAIL',error=repr(e));p.screenshot(path=str(out/'failure.png'));raise
 finally:(out/'results.json').write_text(json.dumps(report,indent=2)+'\n');b.close()
