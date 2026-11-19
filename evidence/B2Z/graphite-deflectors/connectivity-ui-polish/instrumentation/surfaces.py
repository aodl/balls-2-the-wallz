"""Native action and clipboard checks. The app uses the authenticated live source throughout."""
import functools,http.server,json,os,sys,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
import live_common as qa

url,folder=sys.argv[1:]
out=Path(folder);out.mkdir(parents=True,exist_ok=False)
rows={}
(out/'paste.html').write_text('<!doctype html><title>Clipboard acceptance</title><textarea id="paste"></textarea>')
serve=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(out.resolve())))
threading.Thread(target=serve.serve_forever,daemon=True).start()
paste_url=f'http://127.0.0.1:{serve.server_port}/paste.html'
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,chromium_sandbox=True)
 for width,height in [(1440,900),(390,844),(320,640)]:
  if str(width) not in os.environ.get("B2Z_WIDTHS","1440,390,320").split(","):continue
  errs=[];forbidden=[]
  ctx=browser.new_context(viewport={'width':width,'height':height},has_touch=width<400,permissions=['clipboard-read','clipboard-write'])
  def guard(route):
   req=route.request
   if req.method=='POST' and not req.url.endswith(('/query','/read_state')):
    forbidden.append(req.url);route.abort()
   else:route.continue_()
  ctx.route('**/*',guard)
  ctx.add_init_script('''globalThis.surfaceTiming=[];
    globalThis.nativeWrites=[];
    const write=navigator.clipboard.writeText.bind(navigator.clipboard);
    navigator.clipboard.writeText=async value=>{await write(value);nativeWrites.push(value)};
    function collect(event){
      if(!event.isTrusted)return;
      const el=event.target.closest('button,input');
      if(!el)return;
      const start=event.timeStamp,key=el.id||el.dataset.copy||el.dataset.deflectorOrientation;
      requestAnimationFrame(()=>surfaceTiming.push({key,type:event.type,ms:performance.now()-start}));
    }
    addEventListener('click',collect,true);addEventListener('input',collect,true);''')
  page=ctx.new_page()
  page.on('pageerror',lambda err:errs.append(str(err)))
  page.goto(url,wait_until='domcontentloaded')
  page.wait_for_function('()=>globalThis.__b2zExperience?.session?.ready',timeout=90000)
  def click(css):
   page.locator(css).click();qa.settle(page)
  def shot(name,selector=None):
   if selector:page.locator(selector).screenshot(path=str(out/f'{width}-{name}.png'))
   else:page.screenshot(path=str(out/f'{width}-{name}.png'))
  click('#identify-button');shot('account-empty')
  click('#help-button');shot('help')
  click('#close-panel')
  source,_=qa.enter_fire(page)
  pose=None
  if width==320:
   qa.heading(page,347.15);qa.settle(page)
   qa.RULES7='1b44508ad27a714b43888e3d0cf84beeb9a2450bb25112bfd3b650b865105c1c'
   pose=qa.editor(page,source['cell'])
  cry='é🚀'+('x'*(32-len((qa.payment(page)['memo']+'|é🚀').encode())))
  page.locator('#war-cry').fill(cry)
  page.wait_for_function('s=>document.getElementById("text-memo").textContent.endsWith(s)',arg=cry)
  qa.settle(page)
  fire=qa.payment(page)
  assert len(fire['memo'].encode())==32
  geom=page.evaluate("""()=>{const r=n=>n.getBoundingClientRect();const c=getComputedStyle;
  const rail=document.querySelector('.panel-header'),body=document.querySelector('.panel-body'),price=document.querySelector('#transfer-amount');
  const copies=[...document.querySelectorAll('[data-copy]')].map(n=>{const t=r(n);return [t.x+t.width/2,t.width,t.height]});
  const from=document.querySelector('.payment-from'),title=document.querySelector('.payment-title');
  return {axes:[r(from).right,r(title).right],copies,price:c(price).color,
  paymentFonts:['#transfer-amount','#action-prompt','#text-memo','.payment-label'].map(s=>parseFloat(c(document.querySelector(s)).fontSize)),
  railBlur:c(rail).backdropFilter,cardBlur:c(body).backdropFilter,corner:c(body,'::before').backgroundImage,
  payer:c(document.documentElement).getPropertyValue('--player-accent').trim(),
  memoInside:r(document.querySelector('#text-memo')).right<=r(document.querySelector('.payment-memo')).right,
  scroll:[document.querySelector('.panel-scroll').clientHeight,document.querySelector('.panel-scroll').scrollHeight]}}""")
  assert abs(geom['axes'][0]-geom['axes'][1])<=1
  assert max(t[0] for t in geom['copies'])-min(t[0] for t in geom['copies'])<=1
  assert min(n for t in geom['copies'] for n in t[1:])>=44
  assert min(geom['paymentFonts'])>=14 and geom['memoInside']
  assert geom['railBlur']==geom['cardBlur']=='none'
  shot('32-byte-fire');shot('panel-crop','#workspace')
  def copy(key,expected):
   button=page.locator('[data-copy="'+key+'"]')
   page.wait_for_function('()=>__b2zExperience.session.error||!document.querySelector("[data-copy=text]").disabled',timeout=35000)
   err=page.evaluate('String(__b2zExperience.session.error??"")')
   assert not err,err
   seen=page.evaluate('nativeWrites.length')
   button.click()
   page.wait_for_function('([n,v])=>nativeWrites.length>n&&nativeWrites.at(-1)===v',arg=[seen,expected])
   wallet=ctx.new_page()
   wallet.goto(paste_url)
   wallet.locator('#paste').focus()
   wallet.keyboard.press('Control+V')
   wallet.wait_for_function('s=>document.getElementById("paste").value===s',arg=expected)
   wallet.close();page.bring_to_front()
  for key,expected in [('owner',fire['recipient']),('amount',fire['amount'].removesuffix(' ICP')),('text',fire['memo'])]:copy(key,expected)
  click('#recipient-reveal');shot('full-recipient')
  assert page.locator('#full-recipient').inner_text()==fire['recipient']
  click('#recipient-reveal')
  click('#quantity-plus')
  assert page.locator('#replace-choice').is_visible();shot('update-keep')
  click('#keep-instructions')
  assert qa.payment(page)['memo']==fire['memo']
  click('#quantity-plus');click('#replace-instructions')
  assert qa.payment(page)['memo']!=fire['memo']
  page.evaluate("()=>{navigator.clipboard.writeText=async()=>{throw Error('Clipboard denied by controlled browser test')};document.execCommand=()=>false}")
  expected_manual=qa.payment(page)['memo']
  click('[data-copy=text]')
  try:
   page.locator('#manual-copy').wait_for(state='visible',timeout=12000)
   page.wait_for_function('s=>document.getElementById("manual-value").value===s',arg=expected_manual,timeout=12000)
  except Exception:
   state={'expected':expected_manual,'actual':page.locator('#manual-value').input_value(),'status':qa.snap(page)}
   (out/f'{width}-manual-failure.json').write_text(json.dumps(state,indent=2)+'\n');shot('manual-failure')
   raise
  shot('manual-copy')
  click('#payer-change');shot('payer-reassociate')
  assert page.locator('#sending-account').is_visible()
  page.locator('#sending-account').fill(source['account'])
  click('#identity-save')
  if page.locator('#workspace').is_visible():click('#close-panel')
  click('#identify-button');shot('account-history')
  page.locator('#saved-list').scroll_into_view_if_needed();shot('saved-and-receipts')
  click('#close-panel')
  click('#status-button');click('#status-view summary');shot('verification-status')
  click('#close-panel')
  click('#centre-cannon')
  if page.locator('#own-cannons button').count() and page.locator('#own-cannons button').first.is_visible():click('#own-cannons button')
  for action in ['move','build','deflect']:
   click(f'#{action}-action')
   if action=='deflect':
    for direction in ['NE','SE','SW','NW']:
     click('[data-deflector-orientation='+direction+']')
     assert qa.payment(page)['memo'].endswith(' '+direction)
   shot(action)
  assert not (errs or forbidden),(errs,forbidden)
  rows[str(width)]={'geometry':geom,'mobile_pose':{k:pose[k] for k in ('camera','quantity','panel','scroll','source_point')} if pose else None,'32-byte-fire':{'memo_bytes': len(fire['memo'].encode()),'price':fire['amount'],'recipient_length':len(fire['recipient'])},'copy':'exact fields','update_keep':'exact before and after','manual':'full editable selection source is readonly','trusted_event_to_raf_ms':page.evaluate('surfaceTiming'),'errors':errs,'blocked_updates':forbidden}
  (out/'result.json').write_text(json.dumps(rows,indent=2)+'\n')
  ctx.close()
 browser.close()
