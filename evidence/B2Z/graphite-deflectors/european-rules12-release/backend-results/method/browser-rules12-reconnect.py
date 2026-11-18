import json,re,sys,time
from pathlib import Path
from importlib.machinery import SourceFileLoader
from playwright.sync_api import sync_playwright
work=Path(__file__).resolve().parent
qa=SourceFileLoader('qa',str(work/'live-common.py')).load_module()
out=Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True)
rules='1b44508ad27a714b43888e3d0cf84beeb9a2450bb25112bfd3b650b865105c1c'
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,chromium_sandbox=True)
    context=browser.new_context(viewport={'width':1440,'height':900})
    forbidden=[];errors=[]
    def guard(route):
        r=route.request
        if r.method=='POST' and not r.url.endswith(('/query','/read_state')):
            forbidden.append(r.url);route.abort()
        else: route.continue_()
    context.route('**/*',guard)
    page=context.new_page()
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(qa.URL,wait_until='domcontentloaded')
    cannon,roster=qa.enter_fire(page)
    state=qa.snap(page)
    assert state['ready'] and state['identity']['rules_hash']==rules and not state['error']
    assert page.locator('#war-cry-editor').is_visible()
    quotes={}
    for act,prompt,grammar in [('move','Move & Pay',r'MOVE [0-9]+ [0-9]+'),('build','Build, Aim & Pay',r'NEW .+')]:
        page.locator('#'+act+'-action').click()
        qa.settle(page)
        q=qa.payment(page)
        assert q['prompt']==prompt and re.fullmatch(grammar,q['memo']),q
        assert q['recipient']=='s5ir5-gqaaa-aaaas-amyna-cai' and 'claim' in q['warning']
        assert 'within four cells' in (page.locator('#payment-risk').get_attribute('title') or '')
        quotes[act]=q
    page.locator('#payer-change').click()
    assert page.locator('#sending-account').is_visible()
    page.locator('#close-panel').click()
    page.locator('#centre-cannon').click()
    button=page.locator('#own-cannons button')
    if button.count() and button.first.is_visible():button.first.click()
    page.locator('#fire-action').click()
    page.wait_for_function('()=>__b2zExperience.status.canPrepare&&!document.getElementById("transfer-controls").disabled',timeout=90000)
    qa.settle(page)
    before=qa.snap(page);p0=qa.payment(page);calls=[]
    page.evaluate('globalThis.cutoverTest={session:__b2zExperience.session,clock:__b2zExperience.clock,queue:__b2zExperience.queue}')
    def fault(route):
        calls.append(route.request.url)
        route.fulfill(status=503,content_type='text/plain',body='Browser-only acceptance interruption')
    page.route('**/api/v*/canister/*/query',fault);begin=time.monotonic()
    page.wait_for_function('()=>!__b2zExperience.status.canPrepare&&document.getElementById("transfer-controls").disabled',timeout=47000)
    during=qa.snap(page);p1=qa.payment(page)
    duration=time.monotonic()-begin
    assert calls and not during['error']
    assert before['camera']==during['camera'] and before['composer']==during['composer'] and p0['memo']==p1['memo'] and p0['panel']==p1['panel']
    page.screenshot(path=str(out/'reconnecting.png'))
    page.unroute('**/api/v*/canister/*/query',fault)
    page.wait_for_function('()=>!__b2zExperience.session.deliveryError&&__b2zExperience.status.canPrepare&&!document.getElementById("transfer-controls").disabled',timeout=90000)
    after=qa.snap(page);p2=qa.payment(page)
    same=page.evaluate('cutoverTest.session===__b2zExperience.session&&cutoverTest.clock===__b2zExperience.clock&&cutoverTest.queue===__b2zExperience.queue')
    assert same and after['identity']==before['identity'] and p0['panel']==p2['panel'] and p0['memo']==p2['memo']
    assert not forbidden and not errors
    (out/'result.json').write_text(json.dumps({'status':'PASS','identity':after['identity'],'cannon':cannon,'quotes':quotes,'outage':{'blocked_reads':len(calls),'duration_seconds':duration,'copy_disabled':p1['disabled'],'same_session_clock_queue':same,'panel_before':p0['panel'],'panel_during':p1['panel'],'panel_after':p2['panel']},'errors':errors,'forbidden_posts':forbidden},indent=2)+'\n')
    context.close();browser.close()
