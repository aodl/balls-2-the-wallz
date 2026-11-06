"""Focused read-only rules-7 handoff and first join on the owned disposable IC."""
import json,re,time
from browser_observer import wait_until,wait_file

def verify_entry_scene(page,context,out,configuration,record,report,save):
    navigations=[]
    page.on('framenavigated',lambda f:navigations.append(f.url)if f==page.main_frame else None)
    assert page.title()=='Balls 2 the wallZ - B2Z'
    page.locator('#identify-button').click();page.locator('#identify-dialog details').first.evaluate('(e)=>e.open=true')
    page.locator('#identity-account').fill(configuration['new_player_account']);page.locator('#identity-save').click();page.locator('#join-action').click()
    wait_until(page,lambda:'no eligible spawn' in page.locator('#preparation-note').inner_text(),30000)
    assert page.locator('[data-copy="amount"]').is_disabled()
    camera=page.evaluate('({x:__b2zCamera.x,y:__b2zCamera.y,scale:__b2zCamera.scale})')
    (out/'browser-v6-ready').write_text(json.dumps({'head':page.evaluate('__dtrLive.heads.at(-1)'),'camera':camera})+'\n')
    wait_until(page,lambda:'furthest from the nearest cannon' in page.locator('#first-placement-policy').text_content(),90000)
    wait_until(page,lambda:page.locator('[data-copy="amount"]').is_enabled(),30000)
    assert page.evaluate('({x:__b2zCamera.x,y:__b2zCamera.y,scale:__b2zCamera.scale})')==camera
    page.locator('#angle-degrees').fill('0');page.locator('#ball-quantity').fill('2')
    wait_until(page,lambda:page.locator('#transfer-amount').inner_text()=='1.1 ICP'and page.locator('#text-memo').inner_text()=='NEW 0 2',15000)
    page.screenshot(path=str(out/'before-join-desktop.png'))
    (out/'browser-entry-ready').write_text('verified rules-7 quote from occupied world\n')
    sent=json.loads(wait_file(page,out/'join-sent.json',90000));started=time.monotonic()
    row=lambda:page.locator('#live-receipts tr').filter(has=page.locator('td:first-child',has_text=re.compile('^'+str(sent['position'])+'$')))
    wait_until(page,lambda:row().count()>0,90000)
    receipt=row().inner_text();assert 'applied' in receipt.lower(),receipt
    confirmed=time.monotonic();wait_until(page,lambda:page.locator('#cannons').inner_text()=='2'and page.locator('#balls').inner_text()=='6',60000)
    page.locator('#centre-cannon').click();page.locator('#own-cannons button').filter(has_text='#2 ·').click()
    assert not navigations,navigations
    page.locator('#close-action').click();page.locator('#centre-cannon').click();page.screenshot(path=str(out/'after-join-desktop.png'))
    page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(300);page.screenshot(path=str(out/'after-join-mobile.png'))
    report['entry']={'status':'PASS','existing_session':True,'navigation_after_initial':len(navigations),'rules6_full_world_quote_blocked':True,'rules7_full_world_quote_amount':'1.1 ICP','memo':'NEW 0 2','receipt':receipt,'position':sent['position'],'receipt_wait_seconds':confirmed-started,'confirmed_to_visible_seconds':time.monotonic()-confirmed,'heads':page.evaluate('__dtrLive.heads'),'camera_preserved_through_rules_handoff':True,'source':'Actual valueless Ledger/Index admission and authenticated artifacts, not inferred from counts'}
    record('rules-7-occupied-world-join-receipt-and-presentation',report['entry']);save()
    (out/'browser-join-seen').write_text('genuine receipt and same-page presentation verified\n')
