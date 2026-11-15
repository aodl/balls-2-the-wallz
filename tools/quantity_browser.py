"""Native-input availability invariant; controlled canonical UI fixture, not IC authenticity."""
from fluid_playability_browser import settled_panel,settled

def editor(page):
 d=page.evaluate('''()=>{const n=document.getElementById('quantity-controls'),r=n.getBoundingClientRect(),v=visualViewport;return{hidden:n.hidden,inert:n.inert,style:getComputedStyle(n).display,rect:r.toJSON(),viewport:{left:v.offsetLeft,top:v.offsetTop,right:v.offsetLeft+v.width,bottom:v.offsetTop+v.height},placement:n.dataset.placement,focus:document.activeElement.id,identity:n===globalThis.quantityIdentity,count:document.querySelectorAll('#quantity-controls').length,targets:[...n.querySelectorAll('button')].map(b=>{const q=b.getBoundingClientRect();return{id:b.id,rect:q.toJSON(),hit:document.elementFromPoint(q.x+q.width/2,q.y+q.height/2)===b}}),corners:[[r.left+2,r.top+2],[r.right-2,r.top+2],[r.left+2,r.bottom-2],[r.right-2,r.bottom-2]].map(([x,y])=>document.elementFromPoint(x,y)?.closest('#quantity-controls')===n),layout:fixture.shell.layoutState(),proposal:fixture.proposal(),camera:fixture.summary().camera}}''')
 assert not d['hidden']and not d['inert']and d['style']!='none'and d['identity']and d['count']==1,d
 r=d['rect'];v=d['viewport'];assert r['left']>=v['left']and r['right']<=v['right']and r['top']>=v['top']and r['bottom']<=v['bottom'],d
 assert all(b['hit']and b['rect']['width']>=44 and b['rect']['height']>=44 for b in d['targets'])and all(d['corners']),d
 if d['placement']=='dock':
  body=page.locator('.panel-body').bounding_box();assert r['bottom']<=body['y'],d
 return d

def status(page,kind):
 page.evaluate('''kind=>fixture.status({phase:'PLAYING',live:true,verified:true,fresh:true,healthy:true,operationalFresh:kind!=='operational',world:fixture.world(),deliveryError:kind==='delivery'?'Controlled read failure':null,operational:{run:{running:true,last_error:[],pace:{mode:kind==='protected'?'ReserveProtection':'Normal',nominal_milli:kind==='protected'?0:1000,supported_milli:1000,admission_open:kind!=='protected'}},source:{binding_checked:true,last_error:[]}}})''',kind)

def open_fire(page):
 page.wait_for_function('()=>Boolean(globalThis.fixture)');account=page.evaluate('fixture.world().cannons[0].account');page.locator('#join-action').click();page.locator('#sending-account').fill(account);page.locator('#identity-save').click();page.wait_for_function('()=>document.getElementById("workspace").hidden');settled(page);page.locator('#centre-cannon').click();settled(page)
 if page.locator('#own-cannons button').first.is_visible():page.locator('#own-cannons button').first.click();settled(page)
 if page.locator('#focus-cannon').is_enabled():page.locator('#focus-cannon').click();settled(page)
 page.locator('#fire-action').click();settled_panel(page);settled(page);page.evaluate('globalThis.quantityIdentity=document.getElementById("quantity-controls")')

def verify_quantity_matrix(browser,url,out,report,save):
 report['matrix']=[]
 cases=[(320,640,1),(390,844,2),(1440,900,1),(320,350,1),(320,300,2),(390,430,1),(640,320,1),(320,640,3)]
 for w,h,dpr in cases:
  print('quantity matrix',w,h,dpr,flush=True);c=browser.new_context(viewport={'width':w,'height':h},device_scale_factor=dpr,has_touch=w<700,permissions=['clipboard-write'],record_video_dir=str(out/f'video-{w}-{h}-{dpr}'));c.add_init_script("globalThis.copyAudit=[];const write=navigator.clipboard.writeText.bind(navigator.clipboard);navigator.clipboard.writeText=async v=>{await write(v);copyAudit.push(v)}");p=c.new_page();p.goto(url+'/?case=quantityLive');open_fire(p);row={'viewport':[w,h],'dpr':dpr,'initial':editor(p),'headings':[]};report['matrix'].append(row);save()
  try:
   for heading in [0,90,180,270,340,345,347,347.15,348,350,359,350,348,347.15,347,345,340]:
    p.evaluate('fixture.setHeading('+str(heading)+')');p.wait_for_timeout(40);row['headings'].append({'heading':heading,'state':editor(p)})
   p.locator('#aim-handle').focus() if p.locator('#aim-handle').is_visible() else p.locator('#board').focus()
   p.keyboard.press(']');p.keyboard.press('[');editor(p);base=p.evaluate('fixture.proposal()');camera=p.evaluate('fixture.summary().camera');box=p.locator('#quantity-controls').bounding_box()
   for _ in range(4):p.locator('#quantity-plus').click()
   assert p.locator('#quantity-count').text_content()=='5';assert p.evaluate('fixture.proposal().degrees')==base['degrees']and p.evaluate('fixture.summary().camera')==camera;assert p.locator('#quantity-controls').bounding_box()==box
   if w<700:
    r=p.locator('#quantity-minus').bounding_box();p.touchscreen.tap(r['x']+22,r['y']+22);assert p.locator('#quantity-count').text_content()=='4';assert p.evaluate('fixture.summary().camera')==camera
   editor(p);p.locator('[data-copy=text]').click();p.wait_for_function('()=>copyAudit.length>0');old=p.locator('#text-memo').text_content();count=p.locator('#quantity-count').text_content();p.locator('#quantity-plus').click();assert p.locator('#replace-choice').is_visible();p.locator('#keep-instructions').click();assert p.locator('#quantity-count').text_content()==count and p.locator('#text-memo').text_content()==old;p.locator('#quantity-plus').click();p.locator('#replace-instructions').click();assert p.locator('#quantity-count').text_content()==str(int(count)+1)
   settled_panel(p);panel=p.locator('#workspace').bounding_box();fields=p.evaluate('''()=>['full-recipient','transfer-amount','text-memo','paying-account'].map(id=>{const n=document.getElementById(id);return n.value??n.textContent})''');row['statuses']=[]
   for k in ['protected','healthy','operational','healthy','delivery','healthy']:
    status(p,k);samples=[]
    for _ in range(6):p.wait_for_timeout(30);samples.append(p.locator('#workspace').bounding_box());editor(p)
    assert all(max(abs(b[key]-panel[key])for key in ['x','y','width','height'])==0 for b in samples),(k,panel,samples)
    assert p.locator('#transfer-controls').evaluate('(n)=>n.disabled')==(k!='healthy');assert p.evaluate('''()=>['full-recipient','transfer-amount','text-memo','paying-account'].map(id=>{const n=document.getElementById(id);return n.value??n.textContent})''')==fields;row['statuses'].append({'kind':k,'rects':samples})
   p.locator('#recipient-reveal').click();settled_panel(p);editor(p);p.locator('#recipient-reveal').click();settled_panel(p);editor(p)
   r=p.locator('#quantity-plus').bounding_box();p.mouse.move(r['x']+22,r['y']+22);p.mouse.down();locked=p.locator('#quantity-controls').bounding_box();p.evaluate('fixture.setHeading(347.15)');p.wait_for_timeout(80);assert p.locator('#quantity-controls').bounding_box()==locked;p.mouse.up();editor(p)
   n=p.locator('#quantity-count').text_content();r=p.locator('#quantity-plus').bounding_box();p.mouse.move(r['x']+22,r['y']+22);p.mouse.down();p.set_viewport_size({'width':w,'height':max(300,h-40)});p.wait_for_timeout(80);p.mouse.up();assert p.locator('#quantity-count').text_content()==n;editor(p);p.set_viewport_size({'width':w,'height':h});settled_panel(p);editor(p)
   p.screenshot(path=str(out/f'{w}-{h}-{dpr}-347.png'));row['final']=editor(p);row['payment_scrollport']=p.locator('.panel-scroll').bounding_box();assert row['payment_scrollport']['height']>=96
   if w==320 and h==640 and dpr==1:
    p.evaluate("document.documentElement.style.setProperty('--quantity-safe-left','12px');document.documentElement.style.setProperty('--quantity-safe-right','12px');document.documentElement.style.setProperty('--quantity-safe-top','4px');document.documentElement.style.setProperty('--quantity-safe-bottom','8px')");p.set_viewport_size({'width':321,'height':640});p.set_viewport_size({'width':320,'height':640});settled_panel(p);row['safe_area']=editor(p)
    dev=c.new_cdp_session(p);dev.send('Emulation.setPageScaleFactor',{'pageScaleFactor':1.1});p.wait_for_timeout(200);row['visual_zoom']=editor(p);dev.send('Emulation.setPageScaleFactor',{'pageScaleFactor':1});p.wait_for_timeout(200)
   p.locator('#close-panel').click();assert p.locator('#quantity-controls').is_hidden();save()
  except Exception as e:
   row['error']=str(e);row['failure']=p.evaluate('({layout:fixture.shell.layoutState(),proposal:fixture.proposal(),camera:fixture.summary().camera,viewport:{width:innerWidth,height:innerHeight},quantity:document.getElementById("quantity-controls").getBoundingClientRect().toJSON()})');p.screenshot(path=str(out/f'{w}-{h}-{dpr}-failure.png'));save();raise
  finally:p.close();c.close()
