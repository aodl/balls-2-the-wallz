import json, os, sys
from pathlib import Path
from importlib.machinery import SourceFileLoader
from playwright.sync_api import sync_playwright

work=Path(__file__).resolve().parent
qa=SourceFileLoader('qa',str(work/'live-common.py')).load_module()
expected_rules, mode, output=sys.argv[1:]
out=Path(output)
out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as playwright:
    browser=playwright.chromium.launch(headless=True,chromium_sandbox=True)
    context=browser.new_context(viewport={'width':1440,'height':900})
    forbidden=[]
    errors=[]
    def route_readonly(route):
        request=route.request
        if request.method=='POST' and not request.url.endswith(('/query','/read_state')):
            forbidden.append(request.url)
            route.abort()
        else:
            route.continue_()
    context.route('**/*',route_readonly)
    page=context.new_page()
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(qa.URL,wait_until='domcontentloaded')
    cannon,roster=qa.enter_fire(page)
    condition='s.operational?.run.running===false&&!e.status.canPrepare&&document.getElementById("transfer-controls").disabled'
    if mode=='running':
        condition='s.operational?.run.running===true&&e.status.canPrepare&&!document.getElementById("transfer-controls").disabled'
    page.wait_for_function('()=>{const e=__b2zExperience,s=e.session;return '+condition+'}',timeout=90000)
    assert page.locator('#war-cry-editor').is_visible() and page.locator('#deflect-action').is_visible()
    state=qa.snap(page)
    payment=qa.payment(page)
    assert state['identity']['rules_hash']==expected_rules and state['ready'] and not state['error'],state
    assert state['operational']['run']['running']==(mode=='running'),state
    assert payment['disabled']==(mode=='paused'),payment
    assert not forbidden and not errors,(forbidden,errors)
    page.screenshot(path=str(out/'fire.png'))
    (out/'browser.json').write_text(json.dumps({'cannon':cannon,'state':state,'payment':payment,'war_cry_available':True,'deflector_available':True,'browser':browser.version,'forbidden_posts':forbidden,'errors':errors},indent=2)+'\n')
    context.close()
    browser.close()
