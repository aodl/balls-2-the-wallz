"""Readiness-only geometry checks on the actual composer/shell, with pinned fixture world."""
import json
from fluid_playability_browser import settled_panel

PANEL_SNAPSHOT = r'''(tag)=>{
 const f=fixture,c=document.getElementById('workspace'),body=c.querySelector('.panel-body'),scroll=c.querySelector('.panel-scroll'),content=c.querySelector('.panel-content');
 const rect=n=>n.getBoundingClientRect().toJSON(),text=id=>document.getElementById(id).textContent;
 const summary=f.summary();
 return {tag,at:performance.now(),action:f.proposal(),selected:summary.selected,prepared:!document.getElementById('prepared-card').hidden,disabled:[...c.querySelectorAll('[data-copy]')].map(button=>button.disabled),
  local:['payer-change','close-panel'].map(id=>document.getElementById(id).disabled),
  central:!document.getElementById('motion-wait').hidden,
  values:Object.fromEntries(['transfer-amount','payment-owner','text-memo','paying-account','payment-risk'].map(id=>[id,text(id)])),
  workspace:rect(c),header:rect(c.querySelector('.panel-header')),body:rect(body),content:{height:content.getBoundingClientRect().height,scrollHeight:content.scrollHeight},scroll:{height:scroll.clientHeight,scrollHeight:scroll.scrollHeight,top:scroll.scrollTop},
  target:c.style.getPropertyValue('--body-height'),space:c.style.getPropertyValue('--body-space'),cache:f.shell.layoutState?.()??null,
  animations:document.getAnimations().filter(a=>a.effect?.target===body||a.effect?.target===scroll).map(a=>({target:a.effect.target.className,state:a.playState,time:a.currentTime})),camera:summary.camera,cameraActive:f.shell.controller.active,
  clock:summary.clock,queue:summary.queue,time:summary.time,sameClock:f.sameClock(),sameWorld:f.world()===window.panelPinnedWorld,status:text('arena-note'),bodyText:body.innerText};
}'''

STATUS_CASES=[('healthy',{}),('status-failure',{'operationalFresh':False}),('status-recovered',{}),('delivery-failure',{'deliveryError':'HTTP 503','failureKind':'delivery'}),('prolonged-outage',{'fresh':False,'operationalFresh':False,'deliveryError':'HTTP 503','failureKind':'delivery'}),('recovered',{}),('long-waiting-label',{'phase':'STALLED','advancing':False}),('short-live-label',{})]

def install_capture(page):
 page.evaluate('(source)=>{window.capturePanelGeometry=eval(source)}',PANEL_SNAPSHOT)

def apply_status(page,override):
 page.evaluate('''(override)=>fixture.status({live:true,verified:true,fresh:true,healthy:true,operationalFresh:true,advancing:true,phase:'PLAYING',world:fixture.world(),operational:{run:{running:true,last_error:[],pace:{mode:'Normal',nominal_milli:1000,admission_open:true}},source:{binding_checked:true,last_error:[]}},...override})''',override)

def sample_transition(page,label,override):
 return page.evaluate('''({label,override})=>new Promise(resolve=>{
  const rows=[capturePanelGeometry(label+'-before')],started=performance.now();
  fixture.status({live:true,verified:true,fresh:true,healthy:true,operationalFresh:true,advancing:true,phase:'PLAYING',world:fixture.world(),operational:{run:{running:true,last_error:[],pace:{mode:'Normal',nominal_milli:1000,admission_open:true}},source:{binding_checked:true,last_error:[]}},...override});
  rows.push(capturePanelGeometry(label+'-immediate'));let frames=0;
  function frame(){rows.push(capturePanelGeometry(label+'-frame-'+(++frames)));if(frames>=4&&performance.now()-started>=250)return resolve(rows);requestAnimationFrame(frame)}requestAnimationFrame(frame);
 })''',{'label':label,'override':override})

def verify_status_geometry(page,output=None,prefix='panel'):
 install_capture(page);apply_status(page,{})
 settled_panel(page)
 page.evaluate('window.panelPinnedWorld=fixture.world();fixture.markClock();const n=document.querySelector(".panel-scroll");n.scrollTop=Math.min(60,n.scrollHeight-n.clientHeight)')
 base=page.evaluate('capturePanelGeometry("baseline")');assert base['prepared']and base['disabled']==[False]*3,base
 assert base['cache']is None or not base['cache']['dirty']and not base['cache']['pendingFrame'],base
 rows=[]
 for label,override in STATUS_CASES:
  samples=sample_transition(page,label,override);settled_panel(page);samples.append(page.evaluate('label=>capturePanelGeometry(label+"-settled")',label))
  expected_disabled=bool(override.get('deliverySustained') or override.get('fresh') is False or override.get('operationalFresh') is False)
  for sample in samples:
   if not sample['tag'].endswith('-before'):assert sample['disabled']==[expected_disabled]*3,(label,sample)
   assert sample['local']==[False]*2 and not sample['central'],(label,sample)
   assert sample['prepared']and sample['values']==base['values'],(label,base,sample)
   assert sample['action']==base['action']and sample['selected']==base['selected'],(label,base,sample)
   assert sample['camera']==base['camera']and not sample['cameraActive'],(label,base,sample)
   assert sample['clock']==base['clock']and sample['queue']==base['queue']and sample['time']==base['time']and sample['sameClock']and sample['sameWorld'],(label,base,sample)
   assert abs(sample['scroll']['top']-base['scroll']['top'])<=1,(label,base,sample)
   assert 'Connection delayed' not in sample['bodyText'],(label,sample)
   for part in ['workspace','header','body']:
    assert all(abs(sample[part][k]-base[part][k])<=1 for k in ['x','y','width','height']),(label,part,base,sample)
  rows.append({'case':label,'disabled':expected_disabled,'samples':samples})
  if output:(output/(prefix+'-status-geometry.json')).write_text(json.dumps({'baseline':base,'transitions':rows},indent=2)+'\n')
 return {'baseline':base,'transitions':rows,'max_drift_px':max(abs(sample['workspace'][k]-base['workspace'][k])for row in rows for sample in row['samples']for k in ['x','y','width','height'])}


def verify_independent_controls(page):
 """Exercise the generated browser handoff and real keyboard Copy at stale authority."""
 apply_status(page,{})
 page.locator('#fire-action').click()
 settled_panel(page)
 memo=page.locator('#text-memo')
 original=memo.text_content()
 page.evaluate("""()=>{
  const clipboard=navigator.clipboard;
  clipboard.writeText=async()=>{throw new DOMException('Controlled write denial','NotAllowedError')};
  window.blockedNativeCopy=[];
  document.addEventListener('copy',event=>blockedNativeCopy.push({trusted:event.isTrusted,cancelled:event.defaultPrevented}));
 }""")
 page.locator('[data-copy=text]').click()
 page.locator('#manual-copy').wait_for(state='visible')
 assert page.locator('#manual-value').input_value()==original
 assert page.locator('#manual-value').evaluate('node=>node===document.activeElement')
 apply_status(page,{'operationalFresh':False})
 assert page.locator('#manual-value').is_disabled() and page.locator('#manual-handoff').is_disabled()
 assert all(button.is_disabled() for button in page.locator('[data-copy]').all())
 assert page.locator('#recipient-reveal, #payer-reveal').count()==0
 assert page.locator('#full-recipient').text_content()
 assert page.locator('#full-payer').text_content()
 page.locator('#payment-owner').select_text()
 page.keyboard.press('Control+c')
 page.wait_for_function('()=>blockedNativeCopy.some(event=>event.trusted&&event.cancelled)')
 page.locator('#quantity-plus').click()
 assert memo.text_content()!=original
 assert page.locator('[data-copy=text]').is_disabled()
 page.locator('#payer-change').focus()
 page.keyboard.press('Enter')
 assert page.locator('#identity-form').is_visible()
 assert page.locator('#sending-account').evaluate('node=>node===document.activeElement')
 apply_status(page,{})
 return {'native_copy_blocked':True,'manual_handoff_blocked':True,'from_to_inspection':True,'local_quantity':True,'payer_reassociation':True}
