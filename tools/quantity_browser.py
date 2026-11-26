"""Native-input availability invariant; controlled canonical UI fixture, not IC authenticity."""
from fluid_playability_browser import settled_panel,settled

def resize(page,size):
 # Wait for the real ResizeObserver/window event; a viewport command completing
 # does not mean the game has received it. Never invoke internal layout routines.
 page.set_viewport_size(size)
 page.wait_for_function('(s)=>fixture.camera.viewport.width===s.width&&fixture.camera.viewport.height===s.height',arg=size)

def editor(page):
 d=page.evaluate('''()=>{const n=document.getElementById('quantity-controls'),r=n.getBoundingClientRect(),v=visualViewport;return{hidden:n.hidden,inert:n.inert,style:getComputedStyle(n).display,rect:r.toJSON(),viewport:{left:v.offsetLeft,top:v.offsetTop,right:v.offsetLeft+v.width,bottom:v.offsetTop+v.height},placement:n.dataset.placement,focus:document.activeElement.id,identity:n===globalThis.quantityIdentity,count:document.querySelectorAll('#quantity-controls').length,targets:[...n.querySelectorAll('button')].map(b=>{const q=b.getBoundingClientRect();return{id:b.id,rect:q.toJSON(),hit:document.elementFromPoint(q.x+q.width/2,q.y+q.height/2)===b}}),corners:[[r.left+2,r.top+2],[r.right-2,r.top+2],[r.left+2,r.bottom-2],[r.right-2,r.bottom-2]].map(([x,y])=>document.elementFromPoint(x,y)?.closest('#quantity-controls')===n),layout:fixture.shell.layoutState(),proposal:fixture.proposal(),camera:fixture.summary().camera}}''')
 assert not d['hidden']and not d['inert']and d['style']!='none'and d['identity']and d['count']==1,d
 r=d['rect'];v=d['viewport'];assert r['left']>=v['left']and r['right']<=v['right']and r['top']>=v['top']and r['bottom']<=v['bottom'],d
 assert all(b['hit']and b['rect']['width']>=44 and b['rect']['height']>=44 for b in d['targets'])and all(d['corners']),d
 if d['placement']=='dock':
  body=page.locator('.panel-body').bounding_box()
  if d['layout']['quantityReservation']=='rail':
   assert r['bottom']<=body['y']or r['top']>=body['y']+body['height']or r['right']<=body['x']or r['left']>=body['x']+body['width'],d
  else:assert r['bottom']<=body['y'],d
 return d

def status(page,kind):
 page.evaluate('''kind=>fixture.status({phase:'PLAYING',live:true,verified:true,fresh:true,healthy:true,operationalFresh:kind!=='operational',world:fixture.world(),deliverySustained:kind==='delivery',deliveryError:kind==='delivery'?'Controlled read failure':null,operational:{run:{running:true,last_error:[],pace:{mode:kind==='protected'?'ReserveProtection':'Normal',nominal_milli:kind==='protected'?0:1000,supported_milli:1000,admission_open:kind!=='protected'}},source:{binding_checked:true,last_error:[]}}})''',kind)

def open_fire(page):
 page.wait_for_function('()=>Boolean(globalThis.fixture)');account=page.evaluate('fixture.world().cannons[0].account');page.locator('#join-action').click();page.locator('#sending-account').fill(account);page.locator('#identity-save').click();page.wait_for_function('()=>document.getElementById("workspace").hidden');settled(page);page.locator('#centre-cannon').click();settled(page)
 if page.locator('#own-cannons button').first.is_visible():page.locator('#own-cannons button').first.click()
 # Focus can become disabled when the latest layout confirms that the
 # cannon is already framed. Resolve this after the layout, not mid-frame.
 settled_panel(page)
 if page.locator('#focus-cannon').is_enabled():page.locator('#focus-cannon').click();settled_panel(page)
 page.locator('#fire-action').click();settled_panel(page);settled(page);page.evaluate('globalThis.quantityIdentity=document.getElementById("quantity-controls")')

def verify_quantity_matrix(browser,url,out,report,save,width=None,height=None):
 report['matrix']=[]
 cases=[(320,640,1),(390,844,2),(1440,900,1),(320,350,1),(320,300,2),(390,430,1),(640,320,1),(320,640,3),(320,240,1),(320,180,1),(390,844,1)]
 for w,h,dpr in cases:
  if width and w!=width:continue
  if height and h!=height:continue
  print('quantity matrix',w,h,dpr,flush=True);c=browser.new_context(viewport={'width':w,'height':max(h,640)},device_scale_factor=dpr,has_touch=w<700,permissions=['clipboard-write'],record_video_dir=str(out/f'video-{w}-{h}-{dpr}'));c.add_init_script("globalThis.copyAudit=[];const write=navigator.clipboard.writeText.bind(navigator.clipboard);navigator.clipboard.writeText=async v=>{await write(v);copyAudit.push(v)}");p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)));
  # The geometry fixture has no operational playback. A genuine saved mute
  # still exposes the speaker so this test can verify the small-layout mask.
  if h<280:p.add_init_script("localStorage.setItem('b2z.audio.v2',JSON.stringify({version:2,enabled:false}))")
  if w==390 and dpr==1 and h==844:p.emulate_media(reduced_motion='reduce',forced_colors='active')
  p.goto(url+'/?case=quantityLive');
  # This visual fixture does not boot the production audio engine on its own.
  # Start its real controller after the saved preference is available.
  if h<280:
   p.wait_for_function('()=>Boolean(globalThis.fixture)')
   p.evaluate('()=>{fixture.audioProbeStart();return true}')
  open_fire(p);
  if h<520:resize(p,{'width':w,'height':h});settled_panel(p)
  row={'viewport':[w,h],'dpr':dpr,'initial':editor(p),'headings':[]};report['matrix'].append(row);save()
  try:
   for heading in [0,90,180,270,340,345,347,347.15,348,350,359,350,348,347.15,347,345,340]:
    p.evaluate('fixture.setHeading('+str(heading)+')');p.wait_for_timeout(40);row['headings'].append({'heading':heading,'state':editor(p)})
   p.locator('#aim-handle').focus() if p.locator('#aim-handle').is_visible() else p.locator('#board').focus()
   p.keyboard.press(']');p.keyboard.press('[');editor(p);base=p.evaluate('fixture.proposal()');camera=p.evaluate('fixture.summary().camera');box=p.locator('#quantity-controls').bounding_box()
   for _ in range(4):p.locator('#quantity-plus').click()
   assert p.locator('#quantity-count').text_content()=='5';assert p.evaluate('fixture.proposal().degrees')==base['degrees']and p.evaluate('fixture.summary().camera')==camera;assert p.locator('#quantity-controls').bounding_box()==box
   if w<700:
    r=p.locator('#quantity-minus').bounding_box();p.touchscreen.tap(r['x']+22,r['y']+22);assert p.locator('#quantity-count').text_content()=='4';assert p.evaluate('fixture.summary().camera')==camera
   editor(p);p.locator('[data-copy=text]').click();p.wait_for_function('()=>copyAudit.length>0');old=p.locator('#text-memo').text_content();count=p.locator('#quantity-count').text_content();p.locator('#quantity-plus').click();assert p.locator('#replace-choice').count()==0;assert p.locator('#quantity-count').text_content()==str(int(count)+1) and p.locator('#text-memo').text_content()!=old
   settled_panel(p);panel=p.locator('#workspace').bounding_box();fields=p.evaluate('''()=>['full-recipient','transfer-amount','text-memo','paying-account'].map(id=>{const n=document.getElementById(id);return n.value??n.textContent})''');row['statuses']=[]
   for k in ['protected','healthy','operational','healthy','delivery','healthy']:
    status(p,k);samples=[]
    for _ in range(6):p.wait_for_timeout(30);samples.append(p.locator('#workspace').bounding_box());editor(p)
    assert all(max(abs(b[key]-panel[key])for key in ['x','y','width','height'])==0 for b in samples),(k,panel,samples)
    assert p.locator('[data-copy=text]').is_disabled()==(k!='healthy');assert p.evaluate('''()=>['full-recipient','transfer-amount','text-memo','paying-account'].map(id=>{const n=document.getElementById(id);return n.value??n.textContent})''')==fields;row['statuses'].append({'kind':k,'rects':samples})
   copies=p.evaluate('copyAudit.length');p.locator('[data-copy=text]').click();p.wait_for_function('(n)=>copyAudit.length>n',arg=copies);status(p,'protected');before_protected=p.locator('#quantity-count').text_content();p.locator('#quantity-plus').click();assert p.locator('#quantity-count').text_content()==str(int(before_protected)+1)and p.locator('[data-copy=text]').is_disabled();editor(p);status(p,'healthy');assert p.locator('[data-copy=text]').is_enabled();row['protected_preview']='PASS local edit with Copy disabled until authority recovers'
   assert p.locator('#recipient-reveal,#payer-reveal').count()==0
   for selector in ['.payment-from .identity-summary','.payment-to .identity-summary']:
    summary=p.locator(selector)
    assert summary.evaluate("n=>!n.closest('button,a,summary,[role=button]')&&n.tabIndex===-1")
    summary.scroll_into_view_if_needed()
    settled_panel(p)
    panel=p.locator('#workspace')
    scroll=p.locator('.panel-scroll')
    before_summary=panel.bounding_box()
    before_scroll=scroll.evaluate('n=>n.scrollTop')
    summary.click()
    settled_panel(p);editor(p)
    assert panel.bounding_box()==before_summary and scroll.evaluate('n=>n.scrollTop')==before_scroll,(selector,before_summary,panel.bounding_box())
   r=p.locator('#quantity-plus').bounding_box();p.mouse.move(r['x']+22,r['y']+22);p.mouse.down();locked=p.locator('#quantity-controls').bounding_box();p.evaluate('fixture.setHeading(347.15)');p.wait_for_timeout(80);assert p.locator('#quantity-controls').bounding_box()==locked;p.mouse.up();editor(p)
   p.evaluate("globalThis.quantityEvents=[];for(const type of ['pointerdown','pointerup','click'])document.addEventListener(type,e=>{if(e.target.closest?.('#quantity-controls'))quantityEvents.push({type,at:performance.now(),height:innerHeight,count:document.getElementById('quantity-count').textContent,layout:fixture.shell.layoutState()})},true);addEventListener('resize',()=>quantityEvents.push({type:'resize',at:performance.now(),height:innerHeight,count:document.getElementById('quantity-count').textContent,layout:fixture.shell.layoutState()}))");n=p.locator('#quantity-count').text_content();r=p.locator('#quantity-plus').bounding_box();p.mouse.move(r['x']+22,r['y']+22);p.mouse.down();resize(p,{'width':w,'height':h-40 if h>300 else h+20});p.wait_for_timeout(80);p.mouse.up();row['resize_events']=p.evaluate('quantityEvents');save();assert p.locator('#quantity-count').text_content()==n and p.evaluate('fixture.proposal().mode')=='ball';editor(p);resize(p,{'width':w,'height':h});settled_panel(p);editor(p)
   p.screenshot(path=str(out/f'{w}-{h}-{dpr}-347.png'));row['final']=editor(p);row['audio_occlusion']=p.evaluate('fixture.audioProbe()');qr=row['final']['rect'];assert sum(abs(m['left']-qr['left'])<1 and abs(m['top']-qr['top'])<1 and abs(m['right']-qr['right'])<1 and abs(m['bottom']-qr['bottom'])<1 for m in row['audio_occlusion']['masks'])==1;row['payment_scrollport']=p.locator('.panel-scroll').bounding_box();assert row['payment_scrollport']['height']>=min(96,h-68)
   if w==320 and h==640 and dpr==1:
    p.evaluate("document.documentElement.style.setProperty('--quantity-safe-left','12px');document.documentElement.style.setProperty('--quantity-safe-right','12px');document.documentElement.style.setProperty('--quantity-safe-top','4px');document.documentElement.style.setProperty('--quantity-safe-bottom','8px')");resize(p,{'width':321,'height':640});resize(p,{'width':320,'height':640});settled_panel(p);row['safe_area']=editor(p)
    dev=c.new_cdp_session(p);dev.send('Emulation.setPageScaleFactor',{'pageScaleFactor':1.1});p.wait_for_timeout(200);row['visual_zoom']=editor(p);dev.send('Emulation.setPageScaleFactor',{'pageScaleFactor':1});p.wait_for_timeout(200)
    p.evaluate("document.documentElement.style.fontSize='20px'");resize(p,{'width':321,'height':640});resize(p,{'width':320,'height':640});settled_panel(p);row['text_zoom']=editor(p);gesture_probes(p,c,row)
   if w==1440:
    n=p.locator('#quantity-count').text_content();resize(p,{'width':320,'height':640});settled_panel(p)
    if p.locator('#locate-context').is_visible():
     assert not p.evaluate('fixture.camera.cellPoint(fixture.aim().cannon.cell).visible');assert p.locator('#quantity-controls').is_hidden();p.locator('#locate-context').click();settled_panel(p);row['dock_transition_navigation']='Explicit Locate restores source that real viewport contraction left offscreen'
    row['dock_transition']=editor(p);assert row['dock_transition']['placement']=='dock'and p.locator('#quantity-count').text_content()==n;p.screenshot(path=str(out/'desktop-to-dock.png'));resize(p,{'width':1440,'height':900});settled_panel(p);row['float_transition']=editor(p);assert row['float_transition']['placement']=='floating'and p.locator('#quantity-count').text_content()==n;p.screenshot(path=str(out/'dock-to-desktop.png'));native_edge_pans(p,row)
   if h<280:
    p.keyboard.press('Escape');assert p.locator('#quantity-controls').is_hidden();resize(p,{'width':w,'height':640});p.locator('#centre-cannon').click();settled(p)
    if p.locator('#own-cannons button').first.is_visible():p.locator('#own-cannons button').first.click();settled(p)
    speaker=p.locator('#audio-button')
    assert speaker.is_visible() and speaker.get_attribute('aria-label')=='Enable sound'
    assert not p.evaluate('document.documentElement.classList.contains("quantity-constrained")')
    row['exception_exit']='PASS Escape restores the available toolbar including the saved-muted speaker'
   for action in ['move','build']:
    p.locator('#'+action+'-action').click();assert p.locator('#quantity-controls').is_hidden()
   p.locator('#fire-action').click();editor(p)
   if w==320 and h==640 and dpr==3:
    p.evaluate("fixture.publish('mutual_last','expired')");assert p.locator('#quantity-controls').is_hidden()and p.evaluate('fixture.summary().selected')is None;row['source_removed']='PASS latest reference removes cannon while displayed view is retained'
   else:
    p.locator('#board').focus();p.keyboard.press('b');assert p.locator('#quantity-controls').is_hidden();p.keyboard.press('Escape');row['ball_follow_hide']='PASS native B shortcut and Escape'
   if p.locator('#close-panel').is_visible():p.locator('#close-panel').click()
   assert p.locator('#quantity-controls').is_hidden();assert not errors,errors;save()
  except Exception as e:
   row['error']=str(e);row['failure']=p.evaluate('({layout:fixture.shell.layoutState(),proposal:fixture.proposal(),camera:fixture.summary().camera,viewport:{width:innerWidth,height:innerHeight},quantity:document.getElementById("quantity-controls").getBoundingClientRect().toJSON()})');p.screenshot(path=str(out/f'{w}-{h}-{dpr}-failure.png'));save();raise
  finally:p.close();c.close()


def gesture_probes(p,c,row):
 # Real touch aim -> pinch preserves the target and cannot hit a relocated minus.
 p.evaluate("document.documentElement.style.fontSize='16px';for(const side of ['left','right','top','bottom'])document.documentElement.style.setProperty('--quantity-safe-'+side,'0px')");resize(p,{'width':321,'height':640});resize(p,{'width':320,'height':640});settled_panel(p)
 p.evaluate('''()=>{window.aimPinchTrace=[];for(const type of ['pointerdown','pointermove','pointerup','pointercancel','gotpointercapture','lostpointercapture'])document.addEventListener(type,event=>{if(aimPinchTrace.length<64)aimPinchTrace.push({type,id:event.pointerId,x:event.clientX,y:event.clientY,target:event.target.id,captured:document.getElementById('board').hasPointerCapture(event.pointerId),angles:fixture.proposal().degrees,camera:fixture.summary().camera})},true)}''')
 p.locator('#board').focus()
 q=p.locator('#quantity-controls').bounding_box()
 point=p.evaluate('fixture.camera.cellPoint(fixture.aim().cannon.cell)')
 x,y=point['sx']-26,point['sy']+4
 dev=c.new_cdp_session(p)
 row['native_pinch_start']=p.evaluate('''([x,y])=>({
   x,y,source:fixture.camera.cellPoint(fixture.aim().cannon.cell),
   viewport:[innerWidth,innerHeight,visualViewport.width,visualViewport.height,visualViewport.scale],
   hits:document.elementsFromPoint(x,y).map(e=>[e.id,e.tagName,e.className]),
   layout:fixture.shell.layoutState(),events:aimPinchTrace})''',[x,y])
 assert p.evaluate('([x,y])=>document.elementFromPoint(x,y)?.id==="board"',[x,y]),row['native_pinch_start']
 def touch(kind,*fingers):
  dev.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[{'id':i,'x':x,'y':y} for i,x,y in fingers]})
 touch('touchStart',(11,x,y))
 touch('touchMove',(11,x+15,y-14))
 assert p.locator('#quantity-controls').bounding_box()==q
 degrees=p.evaluate('fixture.proposal().degrees')
 camera=p.evaluate('fixture.summary().camera')
 assert p.evaluate('([x,y])=>document.elementFromPoint(x+90,y)?.id==="board"',[x,y])
 touch('touchStart',(11,x+15,y-14),(22,x+90,y))
 touch('touchMove',(11,x-5,y-25),(22,x+115,y+10))
 assert p.locator('#quantity-controls').bounding_box()==q
 touch('touchEnd')
 assert p.evaluate('fixture.summary().camera')!=camera and p.evaluate('fixture.proposal().degrees')==degrees
 editor(p)
 row['native_pinch_events']=p.evaluate('aimPinchTrace')
 down=[e['id'] for e in row['native_pinch_events'] if e['type']=='pointerdown' and e['target']=='board']
 assert len(set(down))==2,row['native_pinch_events']
 assert p.evaluate("(ids)=>ids.every(id=>!document.getElementById('board').hasPointerCapture(id))",down)
 row['native_aim_pinch']='PASS fixed editor, second finger remains board-owned, scale changes without heading mutation'

 n=p.locator('#quantity-count').text_content();r=p.locator('#quantity-plus').bounding_box();dev.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':r['x']+22,'y':r['y']+22,'id':33}]});dev.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});assert p.locator('#quantity-count').text_content()==n;editor(p)
 p.mouse.move(r['x']+22,r['y']+22);p.mouse.down();p.evaluate('document.dispatchEvent(new Event("freeze"))');p.wait_for_timeout(1200);p.mouse.up();assert p.locator('#quantity-count').text_content()==n;editor(p);row['cancelled_release']='PASS native touch cancellation and controlled freeze; no late release after1.2s'


def native_edge_pans(p,row):
 row['edge_pans']=[]
 for target in [(90,400),(1350,400),(720,130),(720,800)]:
  p.locator('#board').focus();origin=p.evaluate('fixture.camera.cellPoint(fixture.aim().cannon.cell)');dx,dy=target[0]-origin['sx'],target[1]-origin['sy'];start=None
  for x,y in [(1000,600),(400,600),(600,200),(100,200),(1200,200),(700,700),(200,500),(1000,300)]:
   if not(8<x+dx<1432 and 8<y+dy<892):continue
   # The Fire cursor covers the board. Start the native pan beyond the
   # 110px aiming guide and its hit tolerance.
   if (x-origin["sx"])**2+(y-origin["sy"])**2<130**2:continue
   if not p.evaluate('([x,y])=>document.elementFromPoint(x,y)?.id==="board"',[x,y]):continue
   p.mouse.move(x,y);start=(x,y);break
  assert start,('No native pan start',target,origin)
  before=p.evaluate('fixture.proposal()');box=p.locator('#quantity-controls').bounding_box();p.mouse.down();p.mouse.move(start[0]+dx,start[1]+dy,steps=8);assert p.locator('#quantity-controls').bounding_box()==box;p.mouse.up();p.wait_for_timeout(100);d=editor(p);assert p.evaluate('fixture.proposal()')==before;at=p.evaluate('fixture.camera.cellPoint(fixture.aim().cannon.cell)');assert abs(at['sx']-target[0])<1 and abs(at['sy']-target[1])<1;row['edge_pans'].append({'target':target,'actual':at,'editor':d})
