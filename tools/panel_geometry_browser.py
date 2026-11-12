"""Readiness-only geometry checks on the actual composer/shell, with pinned fixture world."""
import json
from fluid_playability_browser import settled_panel

PANEL_SNAPSHOT = r'''(tag)=>{
 const f=fixture,c=document.getElementById('workspace'),body=c.querySelector('.panel-body'),scroll=c.querySelector('.panel-scroll'),content=c.querySelector('.panel-content');
 const rect=n=>n.getBoundingClientRect().toJSON(),text=id=>document.getElementById(id).textContent;
 const summary=f.summary();
 return {tag,at:performance.now(),action:f.proposal(),selected:summary.selected,prepared:!document.getElementById('prepared-card').hidden,disabled:document.getElementById('transfer-controls').disabled,
  values:Object.fromEntries(['transfer-amount','payment-owner','text-memo','paying-account','payment-fee','payment-risk'].map(id=>[id,text(id)])),
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
 base=page.evaluate('capturePanelGeometry("baseline")');assert base['prepared']and not base['disabled'],base
 assert base['cache']is None or not base['cache']['dirty']and not base['cache']['pendingFrame'],base
 rows=[]
 for label,override in STATUS_CASES:
  samples=sample_transition(page,label,override);settled_panel(page);samples.append(page.evaluate('label=>capturePanelGeometry(label+"-settled")',label))
  expected_disabled=bool(override.get('deliveryError')or override.get('operationalFresh')is False)
  for sample in samples:
   if not sample['tag'].endswith('-before'):assert sample['disabled']==expected_disabled,(label,sample)
   assert sample['prepared']and sample['values']==base['values'],(label,base,sample)
   assert sample['action']==base['action']and sample['selected']==base['selected'],(label,base,sample)
   assert sample['camera']==base['camera']and not sample['cameraActive'],(label,base,sample)
   assert sample['clock']==base['clock']and sample['queue']==base['queue']and sample['time']==base['time']and sample['sameClock']and sample['sameWorld'],(label,base,sample)
   assert abs(sample['scroll']['top']-base['scroll']['top'])<=1,(label,base,sample)
   assert 'Reconnecting'not in sample['bodyText'],(label,sample)
   for part in ['workspace','header','body']:
    assert all(abs(sample[part][k]-base[part][k])<=1 for k in ['x','y','width','height']),(label,part,base,sample)
  rows.append({'case':label,'disabled':expected_disabled,'samples':samples})
  if output:(output/(prefix+'-status-geometry.json')).write_text(json.dumps({'baseline':base,'transitions':rows},indent=2)+'\n')
 return {'baseline':base,'transitions':rows,'max_drift_px':max(abs(sample['workspace'][k]-base['workspace'][k])for row in rows for sample in row['samples']for k in ['x','y','width','height'])}
