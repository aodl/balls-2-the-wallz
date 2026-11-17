import json,math
from pathlib import Path
URL='http://127.0.0.1:45697/'
RULES7='982a6f78d3187d62e9a79240407cdeffa2fc830d4c385aaeffb1d507a2d9d82f'
def snap(p):return p.evaluate('''()=>JSON.parse(JSON.stringify((()=>{const e=__b2zExperience,s=e.session,q=document.getElementById('quantity-controls'),r=n=>n.getBoundingClientRect().toJSON();return{at:new Date().toISOString(),camera:[__b2zCamera.x,__b2zCamera.y,__b2zCamera.scale],viewport:{width:innerWidth,height:innerHeight,left:visualViewport?.offsetLeft??0,top:visualViewport?.offsetTop??0,visibleWidth:visualViewport?.width??innerWidth,visibleHeight:visualViewport?.height??innerHeight},composer:e.composer,identity:s.sequence.last.publication.identity,head:s.sequence.last.publication.head,ready:s.ready,error:String(s.error??''),deliveryError:String(s.deliveryError??''),status:e.status,available:e.clock.available,playhead:e.clock.playhead,operational:s.operational,quantity:{hidden:q.hidden,inert:q.inert,placement:q.dataset.placement,rect:r(q),text:document.getElementById('quantity-count').textContent,targets:[...q.querySelectorAll('button')].map(b=>{const t=r(b);return{id:b.id,disabled:b.disabled,rect:t,hit:document.elementFromPoint(t.x+t.width/2,t.y+t.height/2)===b}}),corners:(()=>{const t=r(q);return[[t.left+2,t.top+2],[t.right-2,t.top+2],[t.left+2,t.bottom-2],[t.right-2,t.bottom-2]].map(([x,y])=>document.elementFromPoint(x,y)?.closest('#quantity-controls')===q)})()},panel:r(document.getElementById('workspace')),scroll:r(document.querySelector('.panel-scroll')),scrollContent:document.querySelector('.panel-scroll').scrollHeight,board:r(document.getElementById('board')),cyclesVisibility:getComputedStyle(document.getElementById('cycles-display')).visibility,focus:document.activeElement.id}})(),(_,v)=>typeof v==='bigint'?String(v):v))''')
def payment(p):return p.evaluate('''()=>({amount:document.getElementById('transfer-amount').textContent,recipient:document.getElementById('full-recipient').textContent,abbreviated:document.getElementById('payment-owner').textContent,memo:document.getElementById('text-memo').textContent,payer:document.getElementById('paying-account').textContent,fee:'Help: Ledger fee separate',warning:document.getElementById('payment-risk').textContent,prompt:document.getElementById('action-prompt').textContent,disabled:document.getElementById('transfer-controls').disabled,panel:document.getElementById('workspace').getBoundingClientRect().toJSON()})''')
def settle(p):
 p.evaluate('''()=>new Promise((resolve,reject)=>{const start=performance.now();let old='',n=0;function f(){const c=__b2zCamera,b=document.querySelector('.panel-body'),key=JSON.stringify([c.x,c.y,c.scale,document.getElementById('workspace').getBoundingClientRect().toJSON(),b.getBoundingClientRect().toJSON()]);const moving=document.getAnimations().some(a=>(a.effect?.target===b||a.effect?.target===document.querySelector('.panel-scroll'))&&!['finished','idle'].includes(a.playState));n=!moving&&key===old?n+1:0;old=key;if(n>=5)resolve();else if(performance.now()-start>12000)reject(Error('Live geometry did not settle'));else requestAnimationFrame(f)}requestAnimationFrame(f)})''')
def editor(p,cell):
 d=snap(p);q=d['quantity'];assert not q['hidden']and not q['inert']and q['rect']['width']>0,('QUANTITY_UNAVAILABLE',d);r=q['rect'];v=d['viewport'];assert r['left']>=v['left']and r['right']<=v['left']+v['visibleWidth']and r['top']>=v['top']and r['bottom']<=v['top']+v['visibleHeight'],('QUANTITY_CLIPPED',d);assert all(t['hit']and t['rect']['width']>=44 and t['rect']['height']>=44 for t in q['targets'])and all(q['corners']),('QUANTITY_UNREACHABLE',d)
 obstacles=p.evaluate('''()=>['#workspace','#minimap','.camera-controls','.audio-controls'].map(s=>{const n=document.querySelector(s);return{selector:s,visible:!n.hidden&&getComputedStyle(n).visibility!=='hidden',rect:n.getBoundingClientRect().toJSON()}})''')
 for o in obstacles:
  b=o['rect'];assert not(o['visible']and r['left']<b['right']and r['right']>b['left']and r['top']<b['bottom']and r['bottom']>b['top']),('QUANTITY_UI_OVERLAP',o,d)
 point=p.evaluate('(cell)=>{const q=__b2zCamera.cellPoint(cell);return{...q,hit:document.elementFromPoint(q.sx,q.sy)?.id}}',cell);assert point['visible'],('SOURCE_OFFSCREEN',point,d);assert point['hit']in ['board','aim-handle'],('SOURCE_COVERED',point,d);assert not d['error']and d['identity']['rules_hash']==RULES7;d['source_point']=point;return d

def heading(p,target):
 p.locator('#aim-handle').focus();current=float(p.evaluate('__b2zExperience.composer.degrees'));delta=round((target-current+180)%360-180,2);key='ArrowRight'if delta>=0 else'ArrowLeft';units=round(abs(delta)*100)
 for _ in range(units//500):p.keyboard.press('Shift+'+key)
 for _ in range((units%500)//100):p.keyboard.press(key)
 for _ in range(units%100):p.keyboard.press('Alt+'+key)
 p.wait_for_function('(n)=>Math.abs(Number(__b2zExperience.composer.degrees)-n)<.001',arg=target)

def enter_fire(p,cell=0):
 p.wait_for_function('()=>globalThis.__b2zExperience?.session?.ready',timeout=90000);roster=p.evaluate('__b2zExperience.session.referenceWorld.cannons.map(c=>({id:c.id,cell:c.cell,account:c.account,dormant:c.dormant}))');source=next((c for c in roster if c['cell']==cell),roster[0]);p.locator('#join-action').click();p.locator('#sending-account').fill(source['account']);p.locator('#identity-save').click();p.wait_for_function('()=>document.getElementById("workspace").hidden');settle(p);assert p.locator('#text-memo').text_content()=='';p.locator('#centre-cannon').click();settle(p)
 buttons=p.locator('#own-cannons button')
 if buttons.count()and buttons.first.is_visible():
  # Choose the matching actual cannon from the public roster, never retarget a hidden model.
  target=buttons.filter(has_text=str(source['id']))
  (target.first if target.count()else buttons.first).click();settle(p)
 if p.locator('#focus-cannon').is_enabled():p.locator('#focus-cannon').click();settle(p)
 p.locator('#fire-action').click();settle(p);return source,roster

def frame(p):p.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
