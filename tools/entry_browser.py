"""Focused read-only rules-7 handoff and first join on the owned disposable IC."""
import json,re,time
from browser_observer import wait_until,wait_file

def verify_entry_scene(page,context,out,configuration,record,report,save):
    navigations=[]
    page.on('framenavigated',lambda f:navigations.append(f.url)if f==page.main_frame else None)
    assert page.title()=='B2Z · on ICP'
    from verify_s14_deployment import identify_account,select_cannon
    identify_account(page,configuration['new_player_account']);page.locator('#join-action').click()
    wait_until(page,lambda:'No first site' in page.locator('#preparation-note').inner_text(),30000)
    assert page.locator('[data-copy="amount"]').is_disabled()
    camera=page.evaluate('({x:__b2zCamera.x,y:__b2zCamera.y,scale:__b2zCamera.scale})')
    (out/'browser-v6-ready').write_text(json.dumps({'head':page.evaluate('__dtrLive.heads.at(-1)'),'camera':camera})+'\n')
    wait_until(page,lambda:page.evaluate('__b2zExperience.session.config.rules_version')==7,90000)
    wait_until(page,lambda:page.locator('[data-copy="amount"]').is_enabled(),30000)
    assert page.evaluate('({x:__b2zCamera.x,y:__b2zCamera.y,scale:__b2zCamera.scale})')==camera
    page.locator('#angle-degrees').fill('0');assert page.locator('#quantity-controls').is_hidden()
    wait_until(page,lambda:page.locator('#transfer-amount').inner_text()=='1 ICP'and page.locator('#text-memo').inner_text()=='NEW 0 1',15000)
    page.screenshot(path=str(out/'before-join-desktop.png'))
    (out/'browser-entry-ready').write_text('verified rules-7 quote from occupied world\n')
    sent=json.loads(wait_file(page,out/'join-sent.json',90000));started=time.monotonic()
    row=lambda:page.evaluate('(p)=>__b2zExperience.session.receipts.get(String(p))??null',sent['position'])
    wait_until(page,lambda:row()is not None,90000)
    receipt=row();assert receipt['actual_quantity']>0,receipt
    confirmed=time.monotonic();wait_until(page,lambda:page.evaluate('__b2zExperience.visible.cannons.size===2&&__b2zExperience.visible.balls.size===6'),60000)
    select_cannon(page,2)
    assert not navigations,navigations
    page.locator('#close-panel').click();page.locator('#centre-cannon').click();page.screenshot(path=str(out/'after-join-desktop.png'))
    page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(300);page.screenshot(path=str(out/'after-join-mobile.png'))
    report['entry']={'status':'PASS','existing_session':True,'navigation_after_initial':len(navigations),'rules6_full_world_quote_blocked':True,'rules7_full_world_quote_amount':'1 ICP','memo':'NEW 0 1','independent_disposable_payment':'Harness independently sends two-ball NEW; UI defaults to one included ball. This receipt is not associated with saved instructions.','receipt':receipt,'position':sent['position'],'receipt_wait_seconds':confirmed-started,'confirmed_to_visible_seconds':time.monotonic()-confirmed,'heads':page.evaluate('__dtrLive.heads'),'camera_preserved_through_rules_handoff':True,'source':'Actual valueless Ledger/Index admission and authenticated artifacts, not inferred from counts'}
    record('rules-7-occupied-world-join-receipt-and-presentation',report['entry']);save()
    (out/'browser-join-seen').write_text('genuine receipt and same-page presentation verified\n')
