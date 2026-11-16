import json,time
from pathlib import Path
from playwright.sync_api import sync_playwright
from importlib.machinery import SourceFileLoader
root=Path('.work/frontend80-deployment-20261116');out=root/'copy-click-events';out.mkdir(exist_ok=False);qa=SourceFileLoader('qa',str(root/'live-common.py')).load_module();report={'status':'RUNNING','attempts':[]}
init='''globalThis.clickQA=[];function st(){const e=globalThis.__b2zExperience,s=e?.session;return{at:performance.now(),focused:document.hasFocus(),hidden:document.hidden,status:e?.status,disabled:document.querySelector('#transfer-controls')?.disabled,feedback:document.querySelector('#copy-feedback')?.textContent,manualHidden:document.querySelector('#manual-copy')?.hidden,manualValue:document.querySelector('#manual-value')?.value,operationalAge:s?performance.now()-s.operationalAt:null,certificateAge:s?.certificateAgeMs,certifiedAge:s?performance.now()-s.certifiedAt:null,deliveryError:String(s?.deliveryError??''),reason:document.querySelector('#preparation-note')?.textContent,replace:!document.querySelector('#replace-choice')?.hidden,amount:document.querySelector('#transfer-amount')?.textContent,memo:document.querySelector('#text-memo')?.textContent}};for(const type of ['pointerdown','pointerup','click'])addEventListener(type,e=>{const b=e.target.closest?.('[data-copy]');if(b){clickQA.push({type,phase:'capture',field:b.dataset.copy,state:st()});queueMicrotask(()=>clickQA.push({type,phase:'after',field:b.dataset.copy,state:st()}));}},true);const real=navigator.clipboard.writeText.bind(navigator.clipboard);navigator.clipboard.writeText=async value=>{clickQA.push({type:'api-start',value,state:st()});try{await real(value);clickQA.push({type:'api-end',value,success:true,state:st()});}catch(e){clickQA.push({type:'api-end',value,success:false,error:String(e),state:st()});throw e;}};'''
with sync_playwright()as pw:
 b=pw.chromium.launch(headless=True,chromium_sandbox=True);c=b.new_context(viewport={'width':1440,'height':900},permissions=['clipboard-read','clipboard-write']);c.add_init_script(init);c.route('**/*',lambda r:r.continue_()if r.request.method in ['GET','OPTIONS']or r.request.method=='POST'and r.request.url.endswith(('/query','/read_state'))else r.abort());p=c.new_page()
 try:
  p.goto(qa.URL,wait_until='domcontentloaded');qa.enter_fire(p)
  for key in ['owner','amount','text']:
   p.bring_to_front();p.wait_for_function('()=>__b2zExperience.status.canPrepare&&!document.getElementById("transfer-controls").disabled',timeout=60000);before=p.evaluate('clickQA.length');p.locator('[data-copy='+key+']').click();p.wait_for_timeout(1200);trace=p.evaluate('n=>clickQA.slice(n)',before);report['attempts'].append({'key':key,'trace':trace,'after':p.evaluate('st()')});(out/'results.json').write_text(json.dumps(report,indent=2)+'\n');p.screenshot(path=str(out/(key+'.png')))
  report['status']='OBSERVED'
 except Exception as e:report.update(status='FAIL',error=repr(e));raise
 finally:
  (out/'results.json').write_text(json.dumps(report,indent=2)+'\n');c.close();b.close()
