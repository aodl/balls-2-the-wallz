"""Focused read-only rules-7 handoff and first join on the owned disposable IC."""
from human_input import set_heading,choose_cell,chosen_cell,heading_value
import json,re,time
from browser_observer import wait_until,wait_file

def verify_entry_scene(page,context,out,configuration,record,report,save):
    navigations=[]
    page.on('framenavigated',lambda f:navigations.append(f.url)if f==page.main_frame else None)
    assert page.title()=='B2Z · on ICP'
    from verify_s14_deployment import identify_account,select_cannon
    identify_account(page,configuration['new_player_account']);page.locator('#join-action').click()
    initial_rules=configuration.get('entry_initial_rules_version',6);assert initial_rules in (6,7)
    if initial_rules==6:
        wait_until(page,lambda:'No first site' in page.locator('#preparation-note').inner_text(),30000)
        assert page.locator('[data-copy="amount"]').is_disabled()
    else:
        assert page.evaluate('__b2zExperience.session.config.rules_version')==7
        assert page.locator('[data-copy="amount"]').is_disabled()  # real controller remains paused
    camera=page.evaluate('({x:__b2zCamera.x,y:__b2zCamera.y,scale:__b2zCamera.scale})')
    (out/'browser-v6-ready').write_text(json.dumps({'head':page.evaluate('__dtrLive.heads.at(-1)'),'camera':camera})+'\n')
    wait_until(page,lambda:page.evaluate('__b2zExperience.session.config.rules_version')==7,90000)
    (out/'browser-entry-policy-seen').write_text('authenticated Rules7 checkpoint; resume setup only after verification\n')
    wait_until(page,lambda:page.locator('[data-copy="amount"]').is_enabled(),30000)
    assert page.evaluate('({x:__b2zCamera.x,y:__b2zCamera.y,scale:__b2zCamera.scale})')==camera
    # Screen heading120 is canonical world heading0; preserve the exact NEW0 assertion.
    set_heading(page,'120');assert page.locator('#quantity-controls').is_hidden()
    wait_until(page,lambda:page.locator('#transfer-amount').inner_text()=='1 ICP'and page.locator('#text-memo').inner_text()=='NEW 0 1',15000)
    page.screenshot(path=str(out/'before-join-desktop.png'))
    (out/'browser-entry-ready').write_text('verified rules-7 quote from occupied world\n')
    sent=json.loads(wait_file(page,out/'join-sent.json',90000));started=time.monotonic()
    row=lambda:page.evaluate('(p)=>__b2zExperience.session.receipts.get(String(p))??null',sent['position'])
    wait_until(page,lambda:row()is not None,90000)
    receipt=row();assert receipt['actual_quantity']>0,receipt
    confirmed=time.monotonic();wait_until(page,lambda:page.evaluate('__b2zExperience.visible.cannons.size===2&&__b2zExperience.visible.balls.size===6'),60000)
    (out/'browser-join-receipt-seen').write_text('authenticated real Join receipt and visible entities; release setup publication hold\n')
    select_cannon(page,2)
    assert not navigations,navigations
    page.locator('#close-panel').click();page.locator('#centre-cannon').click();page.screenshot(path=str(out/'after-join-desktop.png'))
    page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(300);page.screenshot(path=str(out/'after-join-mobile.png'))
    report['entry']={'status':'PASS','existing_session':True,'navigation_after_initial':len(navigations),'rules6_full_world_quote_blocked':True,'rules7_full_world_quote_amount':'1 ICP','memo':'NEW 0 1','independent_disposable_payment':'Harness independently sends two-ball NEW; UI defaults to one included ball. This receipt is not associated with saved instructions.','receipt':receipt,'position':sent['position'],'receipt_wait_seconds':confirmed-started,'confirmed_to_visible_seconds':time.monotonic()-confirmed,'heads':page.evaluate('__dtrLive.heads'),'camera_preserved_through_rules_handoff':True,'source':'Actual valueless Ledger/Index admission and authenticated artifacts, not inferred from counts'}
    report['entry']['initial_rules_version']=initial_rules
    report['entry']['rules6_full_world_quote_blocked']=True if initial_rules==6 else 'NOT_APPLICABLE: exact European Rules7 predecessor; separate normal-module test covers Rules6'
    record('rules-7-occupied-world-join-receipt-and-presentation',report['entry']);save()
    old_packet=None
    if configuration.get('clearance_rules_version')==11:
        select_cannon(page,2);page.locator('#fire-action').click()
        wait_until(page,lambda:page.locator('[data-copy=amount]').is_enabled(),30000)
        page.evaluate('''()=>{const write=navigator.clipboard.writeText.bind(navigator.clipboard);navigator.clipboard.writeText=async value=>{globalThis.combinedCopyAttempt=value;try{await write(value);globalThis.combinedCopied=value}catch(error){globalThis.combinedCopyError=String(error);throw error}}}''')
        old_packet={'memo':page.locator('#text-memo').inner_text(),'amount':page.locator('#transfer-amount').inner_text()}
        assert '|'not in old_packet['memo']and page.locator('#war-cry-editor').is_hidden()
        page.locator('[data-copy=text]').click()
        try:
            wait_until(page,lambda:page.evaluate('globalThis.combinedCopied')==old_packet['memo'],10000)
        except TimeoutError as error:
            # Preserve the exact-copy assertion; distinguish an uninvoked handler,
            # a rejected native write, and a slow pending browser write.
            state=page.evaluate('''()=>({attempt:globalThis.combinedCopyAttempt??null,
              copied:globalThis.combinedCopied??null,error:globalThis.combinedCopyError??null,
              disabled:document.querySelector('[data-copy=text]').disabled,
              feedback:document.querySelector('#copy-feedback')?.textContent??null,
              memo:document.querySelector('#text-memo')?.textContent??null})''')
            raise AssertionError(f'old-rule native copy did not complete: {state}') from error
        page.screenshot(path=str(out/'rules7-copied-before-combined.png'))
    (out/'browser-join-seen').write_text('genuine receipt and same-page presentation verified\n')
    if old_packet:
        # A certificate checkpoint and the two-second operational query are
        # independent deliveries. First establish the actual observed pause;
        # do not infer it from a controller-side marker or an identity change.
        wait_file(page,out/'clearance-paused',180000)
        wait_until(page,lambda:page.evaluate('''()=>{const s=__b2zExperience.session;return s.operational?.run.running===false&&performance.now()-s.operationalAt<15000}''')and page.locator('[data-copy=text]').is_disabled(),30000)
        assert page.locator('[data-copy=text]').is_disabled()
        paused=page.evaluate('''()=>({at:performance.now(),head:String(__b2zExperience.session.sequence.last.publication.head.segment_id),rules:__b2zExperience.session.config.rules_version,running:__b2zExperience.session.operational.run.running,operationalAge:performance.now()-__b2zExperience.session.operationalAt,canPay:__b2zExperience.arcade?.canPay?.()??null,label:document.querySelector('#arena-note').textContent,copyDisabled:document.querySelector('[data-copy=text]').disabled,memo:document.querySelector('#text-memo').textContent})''')
        assert paused['rules']==7 and paused['running']is False and paused['copyDisabled']
        (out/'browser-clearance-pause-seen').write_text(json.dumps(paused,indent=2)+'\n')
        report['combined_operational_pause']=paused;save()
    wait_file(page,out/'clearance-activated',180000)
    target_rules=configuration.get('clearance_rules_version',9)
    assert target_rules in (9,11)
    wait_until(page,lambda:page.evaluate('__b2zExperience.session.config.rules_version')==target_rules,60000)
    if old_packet:
        wait_until(page,lambda:page.locator('#war-cry-editor').is_visible(),30000)
        assert page.locator('[data-copy=text]').is_disabled()
        assert page.locator('#replace-choice').count()==0
        page.locator('#quantity-plus').click()
        assert page.locator('[data-copy=text]').is_disabled()
        page.locator('#war-cry').fill('Combined!')
        wait_until(page,lambda:page.locator('#text-memo').inner_text().endswith('|Combined!'),10000)
        assert len(page.locator('#text-memo').inner_text().encode())<=32
        report['combined_packet_transition']={'old':old_packet,'new_memo':page.locator('#text-memo').inner_text(),'fresh_quote_after_cutover':True,'supported_cry':True,'copy_remains_disabled_while_real_controller_paused':page.locator('[data-copy=text]').is_disabled()}
        page.screenshot(path=str(out/'rules11-replaced-packet-and-cry.png'));save()
    wait_until(page,lambda:page.locator('#move-action').is_disabled()and page.locator('#build-action').is_disabled()and page.locator('#move-action').get_attribute('title')=='No legal move destination',30000)
    assert page.locator('#move-action').get_attribute('title')=='No legal move destination'
    page.screenshot(path=str(out/'rules9-no-safe-destinations.png'))
    report['clearance']={'status':'PASS','same_page':True,'active_rules':target_rules,'move_disabled':True,'build_disabled':True,'certificate_mode':page.evaluate('__dtrLive.delivery.acceptedHeads.at(-1).mode')}
    assert report['clearance']['certificate_mode']=='certificate-verifier'
    record(f'rules-{target_rules}-authenticated-handoff-and-no-safe-destinations',report['clearance']);save()
