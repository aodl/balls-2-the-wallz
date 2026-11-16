import functools,http.server,json,sys,threading,time
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.path.insert(0,'tools');from fluid_playability_browser import settled_panel,TILE_PAYMENT_WARNING
root=Path('.work/frontend80-deployment-20261116');out=root/'live-controls-observed-readiness';out.mkdir(exist_ok=False);url='https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/'
(out/'wallet.html').write_text('<!doctype html><title>Read-only wallet paste surface</title><label>Exact value<textarea id="paste"></textarea></label>')
class H(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(H,directory=str(out.resolve())));threading.Thread(target=server.serve_forever,daemon=True).start();pasteurl=f'http://127.0.0.1:{server.server_port}/wallet.html';report={'status':'RUNNING','scope':'Actual deployed authenticated mainnet state, native mouse/keyboard/emulated-touch and copy/paste. No payments. Emulated viewport is not physical hardware.','views':[]}
def save():(out/'results.json').write_text(json.dumps(report,indent=2)+'\n')
def state(p):return p.evaluate('''()=>JSON.parse(JSON.stringify({camera:[__b2zCamera.x,__b2zCamera.y,__b2zCamera.scale],composer:__b2zExperience.composer,identity:__b2zExperience.session.sequence.last.publication.identity,head:__b2zExperience.session.sequence.last.publication.head,error:String(__b2zExperience.session.error??''),ready:__b2zExperience.session.ready,status:__b2zExperience.status,available:__b2zExperience.clock.available,playhead:__b2zExperience.clock.playhead},(_,v)=>typeof v==='bigint'?String(v):v))''')
def settle(p):p.evaluate('''()=>new Promise((resolve,reject)=>{let old='',stable=0,start=performance.now();function step(){const c=__b2zCamera,k=[c.x,c.y,c.scale].join('/');stable=k===old?stable+1:0;old=k;if(stable>=8)return resolve();if(performance.now()-start>8000)return reject(Error('Camera not settled'));requestAnimationFrame(step)}requestAnimationFrame(step)})''')
def payment(p):return p.evaluate('''()=>({amount:document.getElementById('transfer-amount').textContent,recipient:document.getElementById('full-recipient').textContent,abbreviated:document.getElementById('payment-owner').textContent,memo:document.getElementById('text-memo').textContent,payer:document.getElementById('full-payer').textContent,fee:'Help: Ledger fee separate',warning:document.getElementById('payment-risk').textContent,prompt:document.getElementById('action-prompt').textContent,disabled:document.getElementById('transfer-controls').disabled,panel:document.getElementById('workspace').getBoundingClientRect().toJSON()})''')
def ready(p):
 if p.locator('#replace-instructions').is_visible():p.locator('#replace-instructions').click()
 p.wait_for_function('()=>!document.getElementById("prepared-card").hidden&&!document.getElementById("transfer-controls").disabled',timeout=60000);p.wait_for_function('()=>__b2zExperience.status.canPrepare&&!document.hidden&&performance.now()-__b2zExperience.session.operationalAt<15000');settled_panel(p)
def pasted(ctx,p):
 wallet=ctx.new_page();wallet.goto(pasteurl);wallet.locator('#paste').focus();wallet.keyboard.press('Control+V');wallet.wait_for_timeout(100);v=wallet.locator('#paste').input_value();wallet.close();p.bring_to_front();return v

def alignment(p):
 d=p.evaluate("""()=>{const r=s=>document.querySelector(s).getBoundingClientRect().toJSON();return{title:r('.payment-title'),from:r('.payment-from'),to:r('.payment-to'),copies:[...document.querySelectorAll('#prepared-card [data-copy]')].map(n=>({rect:n.getBoundingClientRect().toJSON(),font:parseFloat(getComputedStyle(n).fontSize)})),finance:[...document.querySelectorAll('#transfer-amount,#text-memo,#paying-account,#payment-owner')].map(n=>({id:n.id,font:parseFloat(getComputedStyle(n).fontSize)})),payerIcon:document.querySelector('#payer-change svg').innerHTML}}""");assert abs(d['title']['right']-d['from']['right'])<=1,d;centers=[x['rect']['x']+x['rect']['width']/2 for x in d['copies']];assert max(centers)-min(centers)<=1,d;assert all(x['rect']['width']>=44 and x['rect']['height']>=44 for x in d['copies']);assert all(x['font']>=14 for x in d['finance']);assert '<circle'in d['payerIcon'];return d

with sync_playwright()as pw:
 browser=pw.chromium.launch(headless=True,chromium_sandbox=True)
 try:
  for w,h in [(1440,900),(390,844),(320,640)]:
   ctx=browser.new_context(viewport={'width':w,'height':h},has_touch=w<700,record_video_dir=str(out/f'video-{w}'));ctx.grant_permissions(['clipboard-read','clipboard-write']);ctx.add_init_script("globalThis.copyAudit=[];globalThis.nativeCopies=[];addEventListener('copy',e=>nativeCopies.push({ready:globalThis.__b2zExperience?.status.canPrepare,hidden:document.hidden,at:performance.now(),operationalAge:performance.now()-__b2zExperience.session.operationalAt,disabled:document.getElementById('transfer-controls').disabled,value:e.clipboardData?.getData('text/plain'),prevented:e.defaultPrevented}),false);globalThis.denyClipboard=false;const write=navigator.clipboard.writeText.bind(navigator.clipboard);navigator.clipboard.writeText=async v=>{if(denyClipboard)throw new DOMException('Controlled Clipboard API denial','NotAllowedError');await write(v);copyAudit.push(v)};")
   ctx.add_init_script('''globalThis.startupFrames=[];function frame(){const e=globalThis.__b2zExperience,s=e?.session;if(startupFrames.length<1800)startupFrames.push({at:performance.now(),ready:Boolean(s?.ready),head:s?.ready?String(s.sequence.last.publication.head.segment_id):null,reference:s?.referenceWorld?String(s.referenceWorld.time):null,display:e?.visibleTime,available:e?.clock?.available,history:s?.startupHistory,note:document.getElementById('arena-note')?.textContent,spinnerVisible:document.getElementById('motion-wait')?.hidden===false,balls:e?.visible?[...e.visible.balls.values()].slice(0,4).map(b=>[b.id,(Number(b.x0)+b.vx*e.visibleTime)/1024,(Number(b.y0)+b.vy*e.visibleTime)/1024]):[]});requestAnimationFrame(frame)}requestAnimationFrame(frame);''')
   forbidden=[];errors=[]
   def guard(route):
    r=route.request
    if r.method=='POST'and not r.url.endswith(('/query','/read_state')):forbidden.append(r.url);route.abort()
    else:route.continue_()
   ctx.route('**/*',guard);p=ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)));t=time.monotonic();p.goto(url,wait_until='domcontentloaded');p.wait_for_function('()=>__b2zExperience?.session?.ready',timeout=90000);initial=state(p);assert not initial['error'];assert initial['identity']['rules_hash']=='982a6f78d3187d62e9a79240407cdeffa2fc830d4c385aaeffb1d507a2d9d82f';assert p.locator('#workspace').is_hidden();row={'viewport':[w,h],'startup_seconds':time.monotonic()-t,'initial':initial};report['views'].append(row);save()
   roster=p.evaluate('()=>__b2zExperience.session.referenceWorld.cannons.map(c=>({id:c.id,cell:c.cell,account:c.account,dormant:c.dormant}))');assert roster;source=next((c for c in roster if not c.get('dormant')),roster[0]);account=source['account'];row['available_cannons']=roster
   p.locator('#join-action').click();p.locator('#sending-account').fill(account);p.locator('#identity-save').click();p.wait_for_function('()=>document.getElementById("workspace").hidden',timeout=15000);settle(p);assert not p.locator('#text-memo').text_content();row['returning_owner']={'status':'PASS','account':account,'owned_cannons':sum(c['account']==account for c in roster),'camera':state(p)['camera'],'no_new_proposal':True};p.screenshot(path=str(out/f'{w}-returning-territory.png'))
   # Explicit navigation is allowed to focus; ordinary subsequent cannon click is not.
   p.locator('#centre-cannon').click();settle(p)
   if p.locator('#own-cannons button').first.is_visible():p.locator('#own-cannons button').first.click();settle(p)
   if p.locator('#close-panel').is_visible():p.locator('#close-panel').click()
   settle(p);source=p.evaluate('()=>{const s=__b2zExperience.session,w=s.referenceWorld;const a=document.getElementById("paying-account").textContent;return w.cannons.find(c=>c.account===a)??w.cannons[0]}');sourcecell=source['cell'];point=p.evaluate('cell=>{const r=document.getElementById("board").getBoundingClientRect(),q=__b2zCamera.cellPoint(cell,.18);return{x:r.x+q.sx,y:r.y+q.sy}}',sourcecell);assert p.evaluate('q=>document.elementFromPoint(q.x,q.y)?.id==="board"',point),point
   camera=state(p)['camera'];p.mouse.click(point['x'],point['y']);p.wait_for_timeout(250);assert not p.locator('#workspace').is_hidden();assert state(p)['camera']==camera;row['selection_no_focus']='PASS';p.mouse.move(20,h*.5);p.screenshot(path=str(out/f'{w}-selected.png'))
   if p.locator('#focus-cannon').is_enabled():p.locator('#focus-cannon').click();settle(p)
   row['actions']={}
   for action,prompt in [('fire','Aim & Pay'),('move','Move & Pay'),('build','Build, Aim & Pay')]:
    button=p.locator('#'+action+'-action')
    if not button.is_enabled():row['actions'][action]={'status':'UNAVAILABLE','reason':button.get_attribute('title')};continue
    button.click();ready(p);v=payment(p);assert v['recipient']=='s5ir5-gqaaa-aaaas-amyna-cai';assert v['payer']==account;assert v['prompt']==prompt and v['fee']=='Help: Ledger fee separate';assert '…'in v['abbreviated'];assert not p.locator('#angle-degrees,#move-cell,#new-cell,#ball-quantity,#stop-follow').count()
    if action in ['move','build']:assert v['warning']==TILE_PAYMENT_WARNING and state(p)['composer']['cell']is not None
    for key,value in [('owner',v['recipient']),('amount',v['amount'].replace(' ICP','')),('text',v['memo'])]:
     ready(p);p.locator('[data-copy='+key+']').click();p.wait_for_function('()=>document.getElementById("copy-feedback").textContent.includes("Copied.")',timeout=10000);assert p.evaluate('copyAudit.at(-1)')==value;assert pasted(ctx,p)==value
    p.locator('#recipient-reveal').click()
    native_attempts=[]
    for attempt in range(3):
     ready(p);p.locator('#full-recipient').focus();p.locator('#full-recipient').select_text();p.wait_for_function('()=>__b2zExperience.status.canPrepare&&!document.getElementById("transfer-controls").disabled');p.keyboard.press('Control+C');event=p.evaluate('nativeCopies.at(-1)');actual=pasted(ctx,p);native_attempts.append({'event':event,'pasted':actual,'state_after_return':state(p)});v['native_copy_attempts']=native_attempts;row['actions'][action]=v;save()
     if event['ready']and not event['disabled']:assert actual==v['recipient'],native_attempts;break
     assert actual==''and event['prevented'],native_attempts
    else:raise AssertionError('No ready native copy within bounded recovery attempts')
    v['native_copy_attempts']=native_attempts;p.locator('#recipient-reveal').click();v['exact_copy']='PASS native API, Control+C and external read-only Control+V';row['actions'][action]=v;row['actions'][action]['geometry']=alignment(p);assert p.locator('#war-cry-editor').is_hidden();assert '|' not in v['memo'];assert p.locator('#prepared-card input,#prepared-card textarea,#payment-fee').count()==0
    payload=p.evaluate('()=>JSON.stringify({world:__b2zExperience.session.referenceWorld,config:__b2zExperience.session.config,composer:__b2zExperience.composer},(_,v)=>typeof v==="bigint"?{$integer:String(v)}:v)');(out/f'{w}-{action}-quote.json').write_text(payload);(out/f'{w}-{action}-payment.json').write_text(json.dumps(v,indent=2)+'\n')
    if action=='fire':
     assert p.locator('#quantity-controls').is_visible();before=state(p);count=int(p.locator('#quantity-count').text_content());box=p.locator('#quantity-controls').bounding_box();p.locator('#quantity-plus').click();assert p.locator('#replace-choice').is_visible();p.locator('#keep-instructions').click();assert int(p.locator('#quantity-count').text_content())==count;assert payment(p)['memo']==v['memo'];p.locator('#quantity-plus').click();p.locator('#replace-instructions').click();ready(p);assert int(p.locator('#quantity-count').text_content())==count+1;assert state(p)['camera']==before['camera'] and state(p)['composer']['degrees']==before['composer']['degrees'];assert p.locator('#quantity-controls').bounding_box()==box;row['quantity_update_keep']='PASS exact restored count/memo, stationary button slot, no camera/heading movement'
     p.locator('#aim-handle').focus();row['headings']=[]
     for _ in range(8):
      for _ in range(9):p.keyboard.press('Shift+ArrowRight')
      p.wait_for_timeout(80);assert p.locator('#quantity-controls').is_visible();row['headings'].append({'composer':state(p)['composer'],'quantity_box':p.locator('#quantity-controls').bounding_box()})
     if p.locator('#replace-instructions').is_visible():p.locator('#replace-instructions').click()
     p.evaluate('denyClipboard=true');ready(p);p.locator('[data-copy=owner]').click();assert p.locator('#manual-value').input_value()==v['recipient'];p.locator('#manual-value').focus();p.locator('#manual-value').select_text();p.keyboard.press('Control+C');assert pasted(ctx,p)==v['recipient'];p.locator('#manual-handoff').click();p.evaluate('denyClipboard=false');row['denied_clipboard_fallback']='PASS controlled native-API rejection, full-value manual native selection/paste'
    p.locator('.panel-scroll').evaluate('(n)=>n.scrollTop=0');settled_panel(p);p.screenshot(path=str(out/f'{w}-{action}.png'));save()
   # Browser-only transient game-read failure; preserve actual action/camera/values.
   if w==1440:
    ready(p);baseline=payment(p);before=state(p);p.evaluate('globalThis.outageIdentity={session:__b2zExperience.session,clock:__b2zExperience.clock,queue:__b2zExperience.queue}');calls=[]
    def fault(route):calls.append(time.monotonic());route.fulfill(status=503,content_type='text/plain',body='Controlled browser read-only acceptance interruption')
    p.route('**/api/v*/canister/*/query',fault);began=time.monotonic();samples=[]
    while time.monotonic()-began<24:
     p.wait_for_timeout(250);samples.append({'payment':payment(p),'state':state(p)})
    assert payment(p)['disabled'];assert all(not s['state']['error']and s['state']['camera']==before['camera']and s['state']['composer']==before['composer']and s['payment']['memo']==baseline['memo']for s in samples);drift=max(abs(s['payment']['panel'][k]-baseline['panel'][k])for s in samples for k in ['x','y','width','height']);assert drift==0;assert all(s['state']['playhead']<=s['state']['available']for s in samples);p.screenshot(path=str(out/'reconnecting.png'));p.unroute('**/api/v*/canister/*/query',fault);p.wait_for_function('()=>!__b2zExperience.session.deliveryError&&__b2zExperience.status.canPrepare',timeout=60000);assert p.evaluate('outageIdentity.session===__b2zExperience.session&&outageIdentity.clock===__b2zExperience.clock&&outageIdentity.queue===__b2zExperience.queue');row['outage']={'status':'PASS browser-only24s read fault','requests':len(calls),'max_drift_px':drift,'samples':samples,'after':state(p)}
   if w==320:
    p.set_viewport_size({'width':320,'height':350});settled_panel(p);p.screenshot(path=str(out/'320-keyboard-contracted.png'));row['contracted']={'viewport':[320,350],'payment':payment(p)};assert p.locator('#text-memo').is_visible();p.set_viewport_size({'width':320,'height':640})
   p.locator('#close-panel').click();p.locator('#fit').click();settle(p);assert p.locator('#fit').is_disabled()and p.locator('#zoom-out').is_disabled();n=0
   while p.locator('#zoom-in').is_enabled()and n<30:p.locator('#zoom-in').click();n+=1
   assert p.locator('#zoom-in').is_disabled();settle(p);row['zoom_bounds']='PASS actual min/max and intended target disabled states';
   if w==320:
    before_zoom=p.evaluate('({dpr:devicePixelRatio,width:innerWidth,visual:visualViewport.width})');p.keyboard.press('Control+Equal');p.wait_for_timeout(200);after_zoom=p.evaluate('({dpr:devicePixelRatio,width:innerWidth,visual:visualViewport.width})');row['text_zoom']={'before':before_zoom,'after':after_zoom,'status':'OBSERVED browser shortcut geometry change'if before_zoom!=after_zoom else'NOT VERIFIED native text zoom shortcut does not alter this browser context'}
   row['startup_frames']=p.evaluate('startupFrames');row['final']=state(p);row['errors']=errors;row['forbidden_posts']=forbidden;assert not errors and not forbidden;save();p.close();ctx.close()
  report['status']='PASS'
 except Exception as e:
  report.update(status='FAIL',error=repr(e))
  try:p.screenshot(path=str(out/'failure.png'));report['failure_state']=state(p);report['failure_payment']=payment(p)
  except Exception:pass
  raise
 finally:save();browser.close();server.shutdown()
