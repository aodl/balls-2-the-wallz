"""Real account/Join input; canonical fixture world, not a new IC authentication claim."""
import json

def verify_returning_entry(browser,url,out):
 rows=[]
 for name,scene,account,sub,delayed,cancel in [
  ('multiple','additional','aaaaa-aa','',False,False),
  ('dormant','mutual_last','aaaaa-aa','',False,False),
  ('wrapped','wrap','aaaaa-aa','',False,False),
  ('wrong-subaccount','additional','aaaaa-aa','01'*32,False,False),
  ('new-account','additional','2vxsx-fae','',False,False),
  ('delayed','additional','aaaaa-aa','',True,False),
  ('cancel-delayed','additional','aaaaa-aa','',True,True)]:
  ctx=browser.new_context(viewport={'width':390,'height':844});page=ctx.new_page();page.goto(url+'/?case='+scene+'&phase=final');page.wait_for_function('()=>Boolean(globalThis.fixture)')
  if delayed:page.evaluate('fixture.status({worldReady:false,resolved:{kind:"reconnecting",label:"Retrying automatically",canPrepare:false}})')
  page.locator('#join-action').click();page.locator('#sending-account').fill(account)
  if sub:page.locator('#identity-form details').evaluate('(n)=>n.open=true');page.locator('#identity-subaccount').fill(sub)
  page.locator('#identity-save').click()
  if delayed:
   assert page.locator('#entry-note').is_visible();assert page.locator('#prepared-card').is_hidden();assert page.evaluate('fixture.entryState().pending');assert page.evaluate('fixture.summary().selected')is None
   if cancel:page.locator('#close-panel').click()
   page.evaluate('fixture.status({worldReady:true,resolved:{kind:"waiting",label:"Waiting for next on-chain update",canPrepare:true}})')
  if sub or account=='2vxsx-fae':
   page.wait_for_selector('#prepared-card',state='visible');assert page.locator('#action-prompt').text_content()=='Join & Pay';assert page.locator('#text-memo').text_content().startswith('NEW ');result='PASS exact absent account enters first Join'
  else:
   page.wait_for_function('()=>document.getElementById("workspace").hidden&&!fixture.shell.controller.active');assert page.evaluate('fixture.summary().selected')is None;assert not page.evaluate('fixture.entryState().pending');assert page.locator('#text-memo').text_content()=='';result='PASS no unsolicited NEW; once-only returning navigation'if not cancel else'PASS close cancels pending navigation'
  rows.append({'case':name,'status':result,'camera':page.evaluate('fixture.summary().camera'),'selected':page.evaluate('fixture.summary().selected')});page.screenshot(path=str(out/f'entry-{name}.png'));ctx.close()
 (out/'entry-results.json').write_text(json.dumps({'status':'PASS','scope':__doc__,'rows':rows},indent=2)+'\n')
 return rows
