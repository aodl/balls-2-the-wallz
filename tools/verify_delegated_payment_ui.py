#!/usr/bin/env python3
"""Actual optional composer/UI and Web Locks; simulated II/Ledger. No payment/certificate claim."""
import argparse,functools,http.server,json,re,subprocess,threading,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);a=p.parse_args();root=Path(__file__).resolve().parents[1];out=a.output.resolve();out.mkdir(parents=True,exist_ok=False)
subprocess.run(['node','tools/fixtures/prepare-playability-actions.mjs',str(out/'fixture.json')],cwd=root,check=True)
subprocess.run(['node_modules/.bin/esbuild','tools/fixtures/delegated-payment-ui.mjs','--bundle','--platform=browser','--format=esm','--outfile='+str(out/'fixture.mjs')],cwd=root,check=True)
(out/'authorization-fixture.json').write_bytes((root/'tests/fixtures/delegated-kernel-v8.json').read_bytes());(out/'index.html').write_text((root/'apps/b2z-observer/index.html').read_text().replace('src="./app.mjs"','src="./fixture.mjs"'))
for n in ['style.css','icon.svg','configuration-delegation.bin']:(out/n).write_bytes((root/'apps/b2z-observer'/n).read_bytes())
(out/'cursors').mkdir();(out/'cursors/reticle.svg').write_bytes((root/'apps/b2z-observer/cursors/reticle.svg').read_bytes())
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
 def end_headers(self):self.send_header('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'");super().end_headers()
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(out)));threading.Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}';rows=[];errors=[]
def setup(page,ready=True):
 page.goto(origin);page.wait_for_function('()=>!!window.paymentFixture');page.locator('#identify-button').click();page.locator('#sending-account').fill(page.evaluate('paymentFixture.funding'));page.locator('#identity-save').click();page.locator('.payment-setup summary').first.click();page.locator('#payment-sign-in').click();page.locator('#funding-account').fill(page.evaluate('paymentFixture.funding'));page.locator('#funding-save').click();expect(page.locator('#allowance-status')).to_contain_text('Spending allowance:');expect(page.locator('#game-access-status')).to_have_text('Game access verified');page.keyboard.press('Escape');page.evaluate('paymentFixture.select()');
 if ready:page.wait_for_function('()=>!document.querySelector("#direct-pay").disabled');
def owner_panel(page):
 page.keyboard.press('Escape');page.locator('#identify-button').click()
 if not page.locator('.payment-setup').evaluate('(n)=>n.open'):page.locator('.payment-setup summary').first.click()
def funding_edit_clears_owner_instructions(page):
 owner_panel(page);page.locator('#owner-setup').click();expect(page.locator('#owner-instructions')).to_be_visible();expect(page.locator('#owner-command-text')).to_contain_text('expected_allowance')
 page.locator('#funding-account').fill(page.evaluate('paymentFixture.spender'));expect(page.locator('#owner-instructions')).to_be_hidden();expect(page.locator('#owner-command-text')).to_be_empty()
 page.locator('#funding-account').fill(page.evaluate('paymentFixture.funding'));page.locator('#funding-save').click();expect(page.locator('#allowance-status')).to_contain_text('Spending allowance:');page.keyboard.press('Escape');page.evaluate('paymentFixture.select()');page.wait_for_function('()=>!document.querySelector("#direct-pay").disabled')
def owner_journey(page,width):
 owner_panel(page)
 def hidden():
  expect(page.locator('#owner-instructions')).to_be_hidden();expect(page.locator('#owner-command-text')).to_be_empty()
 def prepare(button='#owner-setup'):
  before=page.evaluate('paymentFixture.stats().reads');page.locator(button).click();expect(page.locator('#owner-instructions')).to_be_visible();assert page.evaluate('paymentFixture.stats().reads')==before+1;expect(page.locator('#payment-setup-note')).to_contain_text('No on-chain permission was changed');return page.locator('#owner-command-text').inner_text()
 def timestamp(s):return int(re.search(r'created_at_time = opt \((\d+) : nat64\)',s).group(1))
 initial=prepare();assert initial.count('icrc2_approve')==1 and initial.count('icrc1_transfer')==1;assert 'Revoke spending allowance:'not in initial
 page.evaluate('paymentFixture.allowance(87654321);paymentFixture.fee(23456)');revoke=prepare('#owner-revoke-allowance');assert 'expected_allowance = opt (87654321 : nat)'in revoke;assert 'expires_at = null'in revoke;assert 'fee = opt (23456 : nat)'in revoke;assert timestamp(revoke)>timestamp(initial);assert 'AllowanceChanged requires a new allowance query and owner review'in revoke;assert 'icrc1_transfer'not in revoke
 page.screenshot(path=str(out/f'{width}-owner-revoke-allowance.png'))
 page.evaluate('paymentFixture.fee(34567)');game=prepare('#owner-revoke-game');assert 'memo = opt blob "\\b2\\d1\\80"'in game and 'amount = 0 : nat'in game;assert 'expected_allowance'not in game.split('Owner game access revocation:')[-1];assert timestamp(game)>timestamp(revoke)
 page.locator('#allowance-refresh').click();hidden();expect(page.locator('#allowance-status')).to_contain_text('Spending allowance:');assert page.evaluate('paymentFixture.stats().sends')==0
 prepare();page.evaluate('paymentFixture.policyPatch({canister_id:"aaaaa-aa"})');hidden();page.evaluate('paymentFixture.policyPatch({canister_id:"s5ir5-gqaaa-aaaas-amyna-cai"})');hidden()
 prepare();page.evaluate('paymentFixture.policyPatch({network:"ic"})');hidden();page.evaluate('paymentFixture.policyPatch({network:"pocketic-local"})');hidden()
 prepare();page.evaluate('window.savedOwnerGrant=paymentFixture.world.playability.authorization.grants[0];paymentFixture.world.playability.authorization.grants=[];paymentFixture.refresh()');hidden();page.evaluate('paymentFixture.world.playability.authorization.grants=[savedOwnerGrant];paymentFixture.refresh()')
 prepare();page.evaluate('paymentFixture.block()');hidden();page.evaluate('paymentFixture.unblock()');hidden()
 prepare();page.locator('#payment-sign-out').click();hidden();page.evaluate('paymentFixture.signer(4)');page.locator('#payment-sign-in').click();page.locator('#funding-save').click();expect(page.locator('#allowance-status')).to_contain_text('Spending allowance:');new=prepare();assert page.evaluate('paymentFixture.stats().status.spender')in new;assert page.evaluate('paymentFixture.spender')not in new
 page.locator('#payment-sign-out').click();hidden();page.evaluate('paymentFixture.signer(2)');page.locator('#payment-sign-in').click();page.locator('#funding-save').click();expect(page.locator('#allowance-status')).to_contain_text('Spending allowance:')
 # A late query cannot resurrect commands after an account edit.
 page.evaluate('paymentFixture.holdRead(true)');page.locator('#owner-revoke-allowance').click();page.wait_for_function('()=>document.querySelector("#owner-revoke-allowance").disabled');page.locator('#funding-account').fill(page.evaluate('paymentFixture.otherFunding'));hidden();page.evaluate('paymentFixture.holdRead(false);paymentFixture.resolveRead()');page.wait_for_timeout(100);hidden();page.locator('#funding-save').click();expect(page.locator('#allowance-status')).to_contain_text('Spending allowance:');other=prepare();assert page.evaluate('paymentFixture.otherFunding')in other;assert page.evaluate('paymentFixture.funding')not in other
 page.locator('#funding-account').fill(page.evaluate('paymentFixture.funding'));hidden();page.locator('#funding-save').click();expect(page.locator('#allowance-status')).to_contain_text('Spending allowance:');page.evaluate('paymentFixture.allowance(1000000000);paymentFixture.fee(12345)');page.locator('#allowance-refresh').click();expect(page.locator('#allowance-status')).to_contain_text('Spending allowance:');page.keyboard.press('Escape');page.evaluate('paymentFixture.select()');page.wait_for_function('()=>!document.querySelector("#direct-pay").disabled');print('PASS owner setup/revocation scopes',width,flush=True)
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,chromium_sandbox=True)
 try:
  for width,height in [(1440,900),(390,844),(320,640)]:
   context=browser.new_context(viewport={'width':width,'height':height},permissions=['clipboard-write'],record_video_dir=str(out/'video'),record_video_size={'width':width,'height':height});page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));setup(page)
   funding_edit_clears_owner_instructions(page)
   owner_journey(page,width)
   expect(page.locator('#payment-owner')).to_have_text('s5ir5-gqaaa-aaaas-amyna-cai');expect(page.locator('#payment-risk')).to_contain_text('no automatic refunds');assert not page.locator('[data-copy="hex"],[data-copy="legacy"]').count();assert page.evaluate('paymentFixture.stats().sends')==0
   # Double clicks while actual component is pending issue only one simulated call.
   page.evaluate('paymentFixture.mode("pending")');page.locator('#direct-pay').click();page.wait_for_function('()=>paymentFixture.stats().sends===1');assert page.locator('#direct-pay').is_disabled();page.evaluate('document.querySelector("#direct-pay").click()');assert page.evaluate('paymentFixture.stats().sends')==1;page.evaluate('paymentFixture.resolve()');expect(page.locator('#direct-pay-status')).to_have_text('Payment sent · awaiting game');assert page.locator('#direct-pay').is_disabled()
   before=page.evaluate('JSON.parse(localStorage.getItem("B2Z-ICRC2-intents-v1"))[0]');page.locator('#angle-degrees').fill('90');assert page.locator('#direct-pay').is_disabled();assert page.evaluate('JSON.parse(localStorage.getItem("B2Z-ICRC2-intents-v1"))[0]')==before
   page.evaluate('paymentFixture.remount()');expect(page.locator('#signed-payment-history')).to_contain_text('Payment sent · awaiting game');assert page.evaluate('paymentFixture.stats().sends')==1
   page.screenshot(path=str(out/f'{width}x{height}-pending.png'));rows.append({'viewport':[width,height],'status':'PASS','recording':str(Path(page.video.path()).relative_to(out)),'scope':'actual UI/composer, controlled auth/transport, native Web Locks, pending reload; no real sign-in/payment'});context.close();print('PASS',width,height,flush=True)
  # Exact receipt is separate from copied instructions and later grant validity.
  context=browser.new_context(viewport={'width':390,'height':844});page=context.new_page();setup(page);page.locator('#direct-pay').click();expect(page.locator('#direct-pay-status')).to_have_text('Payment sent · awaiting game');page.evaluate('paymentFixture.receipt()');expect(page.locator('#direct-pay-status')).to_have_text('Action completed');assert page.evaluate('paymentFixture.stats().sends')==1;page.keyboard.press('Escape');page.locator('#identify-button').click();expect(page.locator('#allowance-status')).to_contain_text('Last checked allowance:');page.locator('#payment-sign-out').click();expect(page.locator('#signed-payment-history')).to_contain_text('Saved: Action completed');context.close()
  # Failed optional telemetry/signing and storage never disable manual copying.
  context=browser.new_context(viewport={'width':320,'height':640});page=context.new_page();setup(page);page.evaluate('paymentFixture.mode("unknown")');page.locator('#direct-pay').click();expect(page.locator('#direct-pay-status')).to_have_text('Payment status unknown');assert page.locator('[data-copy="text"]').is_enabled();page.evaluate('paymentFixture.remount()');expect(page.locator('#signed-payment-history')).to_contain_text('Payment status unknown');assert page.evaluate('paymentFixture.stats().sends')==1;context.close()
  # Manual packet freezing and a later game revocation gate signing separately.
  context=browser.new_context(viewport={'width':390,'height':844},permissions=['clipboard-write']);page=context.new_page();setup(page);page.locator('[data-copy="text"]').click();page.locator('#angle-degrees').fill('90');expect(page.locator('#replace-choice')).to_be_visible();assert page.locator('#direct-pay').is_disabled();page.locator('#keep-instructions').click();expect(page.locator('#direct-pay')).to_be_enabled();page.evaluate('window.retainedGrant=paymentFixture.world.playability.authorization.grants[0];paymentFixture.world.playability.authorization.grants=[];paymentFixture.refresh()');expect(page.locator('#direct-pay')).to_be_disabled();assert page.locator('[data-copy="text"]').is_enabled();assert page.evaluate('paymentFixture.stats().sends')==0;context.close()
  # Storage/lock failures disable optional spending while the canonical manual route remains.
  for kind,script,reason in [('storage',"Object.defineProperty(window,'localStorage',{get(){throw Error('blocked')}})",'Payment storage unavailable'),('locks',"Object.defineProperty(navigator,'locks',{value:undefined})",'Browser payment locking unavailable')]:
   context=browser.new_context(viewport={'width':320,'height':640});context.add_init_script(script);page=context.new_page();setup(page,ready=False);assert page.locator('#direct-pay').is_disabled();expect(page.locator('#direct-pay-status')).to_contain_text(reason);assert page.locator('[data-copy="text"]').is_enabled();assert page.evaluate('paymentFixture.stats().sends')==0;context.close()
  # Controlled clock only: old prepared commands disappear rather than looking
  # executable indefinitely. This does not claim real II or Ledger execution.
  context=browser.new_context(viewport={'width':320,'height':640});page=context.new_page();page.clock.install();setup(page);owner_panel(page);page.locator('#owner-revoke-allowance').click();expect(page.locator('#owner-instructions')).to_be_visible();before=page.locator('#owner-command-text').inner_text();page.clock.fast_forward(61001);expect(page.locator('#owner-instructions')).to_be_hidden();expect(page.locator('#owner-command-text')).to_be_empty();page.locator('#owner-revoke-allowance').click();expect(page.locator('#owner-instructions')).to_be_visible();after=page.locator('#owner-command-text').inner_text();assert int(re.search(r'created_at_time = opt \((\d+) : nat64\)',after).group(1))>int(re.search(r'created_at_time = opt \((\d+) : nat64\)',before).group(1));context.close();print('PASS controlled owner instruction expiry and fresh regeneration',flush=True)
  context=browser.new_context(viewport={'width':390,'height':844});page=context.new_page();setup(page);page.evaluate('paymentFixture.fee(23456)');page.locator('#direct-pay').click();expect(page.locator('#direct-pay-status')).to_contain_text('Transfer fee changed');assert page.evaluate('paymentFixture.stats().sends')==0;expect(page.locator('#direct-fee')).to_contain_text('0.00023456 ICP');page.locator('#direct-pay').click();expect(page.locator('#direct-pay-status')).to_have_text('Payment sent · awaiting game');assert page.evaluate('paymentFixture.stats().sends')==1;context.close()
  # Native cross-tab exclusion, without a simulated lock implementation.
  context=browser.new_context();one=context.new_page();two=context.new_page();one.goto(origin);two.goto(origin);one.wait_for_function('()=>!!window.paymentFixture');two.wait_for_function('()=>!!window.paymentFixture');one.evaluate('window.lockHeld=false;window.lockTask=navigator.locks.request("B2Z-ICRC2-payments-v1",async()=>{lockHeld=true;await new Promise(r=>window.releaseLock=r)});void 0');one.wait_for_function('()=>lockHeld');assert two.evaluate('navigator.locks.request("B2Z-ICRC2-payments-v1",{ifAvailable:true},lock=>lock===null)');one.evaluate('releaseLock()');context.close();print('PASS receipt, unknown recovery and native two-tab exclusion',flush=True);assert not errors,errors
 except Exception:
  traceback.print_exc()
  try:page.screenshot(path=str(out/'failure.png'));(out/'failure.txt').write_text(page.locator('body').inner_text())
  except Exception:pass
  raise
 finally:browser.close();server.shutdown()
(out/'results.json').write_text(json.dumps({'status':'PASS','scope':__doc__,'rows':rows,'errors':errors},indent=2)+'\n')
