import functools,http.server,threading,json
from pathlib import Path
from playwright.sync_api import sync_playwright
from importlib.machinery import SourceFileLoader
root=Path('.work/frontend80-deployment-20261116');out=root/'live-clipboard-fields';out.mkdir(exist_ok=False);qa=SourceFileLoader('qa',str(root/'live-common.py')).load_module();report={'status':'RUNNING','scope':'Actual production Rules7; actual API completion, native copy and external native paste. Fresh real certificate/operational state only; no overrides or payment. One action per viewport; separate nine-panel geometry coverage.','views':[]}
(out/'paste.html').write_text('<!doctype html><title>Read-only clipboard acceptance</title><textarea id="surface" aria-label="Native paste acceptance"></textarea>')
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(out.resolve())));threading.Thread(target=server.serve_forever,daemon=True).start();pasteurl=f'http://127.0.0.1:{server.server_port}/paste.html'
def save():(out/'results.json').write_text(json.dumps(report,indent=2)+'\n')
init='''globalThis.clipQA={api:[],native:[],clicks:[],deny:false};globalThis.clipState=()=>({at:performance.now(),focused:document.hasFocus(),hidden:document.hidden,status:globalThis.__b2zExperience?.status,disabled:document.querySelector('#transfer-controls')?.disabled,certAge:__b2zExperience.session.certificateAgeMs,certifiedAge:performance.now()-__b2zExperience.session.certifiedAt,operationalAge:performance.now()-__b2zExperience.session.operationalAt,head:String(__b2zExperience.session.sequence.last.publication.head.segment_id),memo:document.querySelector('#text-memo')?.textContent,amount:document.querySelector('#transfer-amount')?.textContent,recipient:document.querySelector('#full-recipient')?.textContent,payer:document.querySelector('#full-payer')?.textContent});addEventListener('click',e=>{const b=e.target.closest?.('[data-copy]');if(b)clipQA.clicks.push({field:b.dataset.copy,state:clipState()});},true);addEventListener('copy',e=>clipQA.native.push({state:clipState(),prevented:e.defaultPrevented,value:e.clipboardData?.getData('text/plain')}));const real=navigator.clipboard.writeText.bind(navigator.clipboard);navigator.clipboard.writeText=async value=>{const e={value,start:clipState()};clipQA.api.push(e);try{if(clipQA.deny)throw new DOMException('Controlled clipboard denial','NotAllowedError');await real(value);e.success=true;}catch(error){e.success=false;e.error=String(error);throw error;}finally{e.end=clipState();}};'''
def values(p):return p.evaluate('({owner:document.getElementById("full-recipient").textContent,amount:document.getElementById("transfer-amount").textContent.replace(" ICP",""),text:document.getElementById("text-memo").textContent,payer:document.getElementById("full-payer").textContent})')
def ready(p):
 p.bring_to_front()
 if p.locator('#replace-instructions').is_visible():p.locator('#replace-instructions').click()
 p.wait_for_function('()=>{const e=__b2zExperience,s=e.session;return document.hasFocus()&&!document.hidden&&e.status.canPrepare&&!document.getElementById("transfer-controls").disabled&&Number.isFinite(s.certificateAgeMs)&&s.certificateAgeMs<10000}',timeout=60000)
def pasted(wallet,p):
 wallet.bring_to_front();wallet.locator('#surface').fill('');wallet.locator('#surface').focus();wallet.keyboard.press('Control+V');result=wallet.locator('#surface').input_value();p.bring_to_front();return result
with sync_playwright()as pw:
 b=pw.chromium.launch(headless=True,chromium_sandbox=True)
 try:
  for width,height,action in [(1440,900,'fire'),(390,844,'move'),(320,640,'build')]:
   c=b.new_context(viewport={'width':width,'height':height},has_touch=width<700,permissions=['clipboard-read','clipboard-write']);c.route('**/*',lambda r:r.continue_()if r.request.method in ['GET','OPTIONS']or r.request.method=='POST'and r.request.url.endswith(('/query','/read_state'))else r.abort());wallet=c.new_page();wallet.goto(pasteurl);p=c.new_page();p.add_init_script(init);p.goto(qa.URL,wait_until='domcontentloaded');source,roster=qa.enter_fire(p)
   if action!='fire':p.locator('#'+action+'-action').click();qa.settle(p)
   row={'viewport':[width,height],'action':action,'source':source,'fields':[]};report['views'].append(row);save()
   for key,selector in [('owner','#full-recipient'),('amount','#transfer-amount'),('text','#text-memo')]:
    item={'field':key,'api_attempts':[],'native_attempts':[]};row['fields'].append(item)
    for attempt in range(3):
     ready(p);expected=values(p)[key];idx=p.evaluate('clipQA.api.length');p.locator('[data-copy='+key+']').click()
     try:p.wait_for_function('n=>clipQA.api.length>n&&clipQA.api[n].end!==undefined',arg=idx,timeout=10000)
     except Exception:item['api_attempts'].append({'blocked_or_uncompleted':True,'state':p.evaluate('clipState()'),'clicks':p.evaluate('clipQA.clicks.slice(-1)')});save();continue
     event=p.evaluate('n=>clipQA.api[n]',idx);item['api_attempts'].append(event);save();assert event['success'],event;assert event['value']==expected,event;actual=pasted(wallet,p);assert actual==expected,(actual,expected,event);item['api']={'status':'PASS','value':actual};break
    else:raise AssertionError('No completed allowed Clipboard API write in bounded ready attempts')
    for attempt in range(3):
     ready(p)
     if key=='owner'and not p.locator(selector).is_visible():p.locator('#recipient-reveal').click()
     p.locator(selector).focus();p.locator(selector).select_text();p.wait_for_function('()=>__b2zExperience.status.canPrepare&&!document.getElementById("transfer-controls").disabled',timeout=60000);expected=values(p)[key];idx=p.evaluate('clipQA.native.length');p.keyboard.press('Control+C');p.wait_for_function('n=>clipQA.native.length>n',arg=idx,timeout=10000);event=p.evaluate('n=>clipQA.native[n]',idx);actual=pasted(wallet,p);item['native_attempts'].append({'event':event,'pasted':actual});save()
     if event['state']['status']['canPrepare']and not event['state']['disabled']:assert actual==expected and event['value']==expected,(actual,expected,event);item['native']={'status':'PASS','value':actual};break
     assert actual==''and event['value']==''and event['prevented'],event
    else:raise AssertionError('Native copy remained protected in bounded ready attempts')
    if key=='owner'and p.locator('#full-recipient').is_visible():p.locator('#recipient-reveal').click()
    save()
   if width==320:
    ready(p);expected=values(p)['owner'];p.evaluate('clipQA.deny=true');p.locator('[data-copy=owner]').click();p.wait_for_function('()=>!document.getElementById("manual-copy").hidden');assert p.locator('#manual-value').input_value()==expected;p.locator('#manual-value').focus();p.locator('#manual-value').select_text();p.wait_for_function('()=>__b2zExperience.status.canPrepare&&!document.getElementById("transfer-controls").disabled',timeout=60000);p.keyboard.press('Control+C');assert pasted(wallet,p)==expected;p.locator('#manual-handoff').click();p.evaluate('clipQA.deny=false');row['denied_api_fallback']='PASS exact full principal via real native selection/paste; no payment'
   row['final']=qa.snap(p);p.screenshot(path=str(out/f'{width}-{action}.png'));assert row['final']['identity']['rules_hash']==qa.RULES7;assert p.locator('#war-cry-editor').is_hidden();assert '|'not in values(p)['text'];row['status']='PASS';save();p.close();wallet.close();c.close()
  report['status']='PASS'
 except Exception as e:
  report.update(status='FAIL',error=repr(e))
  try:report['failure_state']=p.evaluate('clipState()');report['failure_events']=p.evaluate('clipQA');p.screenshot(path=str(out/'failure.png'))
  except Exception:pass
  raise
 finally:save();b.close();server.shutdown()
