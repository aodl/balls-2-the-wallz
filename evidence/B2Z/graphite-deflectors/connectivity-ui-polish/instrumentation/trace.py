"""Read-only live browser diagnostics. Persist method names and typed outcomes, never request bodies."""
import json,os,sys,time
from pathlib import Path
from playwright.sync_api import sync_playwright
url,dst=sys.argv[1:3];seconds=int(sys.argv[3]); out=Path(dst);out.mkdir(exist_ok=False,parents=True)
methods=('observation_bundle','retained_artifact_chunk','retained_publication','artifact_bundle','artifact_chunk','observation','source_descriptor','lab_status','get_subnet_info')
with sync_playwright() as pw, (out/'timeline.jsonl').open('w',buffering=1) as stream:
 browser=pw.chromium.launch(headless=True,chromium_sandbox=True)
 context=browser.new_context(viewport={'width':1440,'height':900})
 context.add_init_script('''document.addEventListener('DOMContentLoaded',()=>{
  const note=document.querySelector('#arena-note'),copy=document.querySelector('[data-copy=owner]'),wait=document.querySelector('#motion-wait');
  if(!note||!copy||!wait)return;
  const changed=window.statusChanges=[];let old='';
  const observer=new MutationObserver(()=>{const value=[note.textContent,copy.disabled,!wait.hidden],key=JSON.stringify(value);
    if(key!==old){old=key;if(changed.length===256)changed.shift();changed.push({at:Math.round(performance.now()),label:value[0],copyDisabled:value[1],spinner:value[2]});}});
  observer.observe(note,{childList:true,subtree:true,characterData:true});
  observer.observe(copy,{attributes:true,attributeFilter:['disabled']});
  observer.observe(wait,{attributes:true,attributeFilter:['hidden']});
 });''')
 page=context.new_page();cdp=context.new_cdp_session(page);cdp.send('Network.enable')
 pending={};started=time.monotonic()
 def row(kind,**fields):stream.write(json.dumps(dict(t=round(time.monotonic()-started,3),kind=kind,**fields))+'\n')
 def request(e):
  r=e['request'];url=r['url'];path=url.split('?')[0]
  if r['method']!='POST':return
  assert path.endswith(('/query','/read_state')),path
  method=next((m for m in methods if m in r.get('postData','')),path.rsplit('/',1)[-1])
  pending[e['requestId']]=[e['timestamp'],method,0];row('request',method=method,id=e['requestId'])
 def response(e):
  if e['requestId'] in pending:pending[e['requestId']][2]=e['response']['status']
 def finish(e):
  q=pending.pop(e['requestId'],None)
  if q:row('response',method=q[1],ms=round(1000*(e['timestamp']-q[0])),http=q[2],bytes=e.get('encodedDataLength'),error=e.get('errorText'),cancelled=e.get('canceled'))
 cdp.on('Network.requestWillBeSent',request);cdp.on('Network.responseReceived',response);cdp.on('Network.loadingFinished',finish);cdp.on('Network.loadingFailed',finish)
 def guard(route):
  r=route.request
  if r.method=='POST' and not r.url.split('?')[0].endswith(('/query','/read_state')):route.abort()
  else: route.continue_()
 context.route('**/*',guard)
 for attempt in range(30):
  response=page.goto(url,wait_until='domcontentloaded',timeout=18000)
  row('navigation',http=response.status,gate=response.headers.get('x-ic-error-code'),subnetUpgrade='Subnet Upgrade' in page.title())
  if response.ok:break
  if attempt==0:page.screenshot(path=str(out/'gateway.png'))
  page.wait_for_timeout(10000)
 else:raise RuntimeError('Frontend origin still unavailable')
 page.screenshot(path=str(out/'initial.png'))
 if len(sys.argv)>4:
  import live_common as qa
  try:
   page.wait_for_function('()=>__b2zExperience?.session?.ready||__b2zExperience?.session?.error',timeout=16000)
   if page.evaluate('()=>__b2zExperience.session.ready'):
    qa.enter_fire(page);page.screenshot(path=str(out/'panel.png'))
  except Exception as error:row('panel_setup',type=type(error).__name__)
 measuring=time.monotonic()
 while time.monotonic()-measuring<seconds:
  v=page.evaluate("""()=>{const e=window.__b2zExperience,s=e?.session,d=s?.deliveryDiagnostics;
   const error=x=>x?String(x.message??x).replace(/[a-f0-9]{32,}/gi,'[hash]').slice(0,150):null;
   return {statusKind:e?.status?.kind,label:document.querySelector('#arena-note')?.textContent,ready:s?.ready,canCopy:e?.status?.canPrepare,
     copyDisabled:document.querySelector('[data-copy=owner]')?.matches(':disabled'),spinner:!document.querySelector('#motion-wait')?.hidden,
     head:String(s?.sequence?.last?.publication?.head?.segment_id??''),certificateAge:s?.certificateAgeMs,
     certificateTime:s?.certificateTimeNs,acceptedRoot:s?.sequence?.last?.root_hash,firstCertificate:s?.firstCertificateAt,
     operationalSegments:String(s?.operational?.run?.completed_segments??''),operationalAge:Number.isFinite(s?.operationalAt)?Math.round(performance.now()-s.operationalAt):null,
     deliveryError:error(s?.deliveryError),trustError:error(s?.error),failures:s?.retryFailures,
     statusFailures:s?.statusFailures,nextDue:s?.nextDue?Math.round(s.nextDue-performance.now()):null,
     authorityPending:s?.pendingAuthorityHead===undefined?null:String(s.pendingAuthorityHead),pending:d?.active?.kind,recovered:d?.recoveries,buffer:e?.clock?.state()?.buffer};}""")
  row('state',**v)
  for change in page.evaluate('()=>window.statusChanges?.splice(0)??[]'):row('transition',**change)
  page.wait_for_timeout(500)
 context.close();browser.close()
