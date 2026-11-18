import json,sys
from pathlib import Path
from importlib.machinery import SourceFileLoader
from playwright.sync_api import sync_playwright
work=Path(__file__).resolve().parent
qa=SourceFileLoader('qa',str(work/'live-common.py')).load_module()
out=Path(sys.argv[1])
out.mkdir(parents=True,exist_ok=True)
rules7=qa.RULES7
rules11='5d0ca4591a782b609ef10d9db46d4bd93042b0fcdd738d8d1f920840c05b7756'
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,chromium_sandbox=True)
    context=browser.new_context(viewport={'width':1440,'height':900})
    context.grant_permissions(['clipboard-read','clipboard-write'])
    context.add_init_script("globalThis.copiedBytes=[];const write=navigator.clipboard.writeText.bind(navigator.clipboard);navigator.clipboard.writeText=async v=>{await write(v);copiedBytes.push(v)};")
    forbidden=[]
    errors=[]
    requests=[]
    def route_readonly(route):
        request=route.request
        if request.method=='POST' and not request.url.endswith(('/query','/read_state')):
            forbidden.append(request.url)
            route.abort()
        else:
            route.continue_()
    context.route('**/*',route_readonly)
    page=context.new_page()
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('response',lambda r:requests.append({'url':r.url,'status':r.status}) if r.request.method=='POST' else None)
    page.goto(qa.URL,wait_until='domcontentloaded')
    qa.enter_fire(page)
    page.wait_for_function('()=>__b2zExperience.status.canPrepare&&!document.getElementById("transfer-controls").disabled',timeout=90000)
    begin=qa.snap(page)
    payment=qa.payment(page)
    assert begin['ready'] and not begin['error'] and begin['identity']['rules_hash']==rules7,begin
    assert page.locator('#war-cry-editor').is_hidden() and page.locator('#deflect-action').is_hidden()
    page.locator('[data-copy=text]').click()
    page.wait_for_function('()=>document.getElementById("copy-feedback").textContent.includes("Copied.")')
    assert page.evaluate('copiedBytes.at(-1)')==payment['memo']
    def capture(name):
        state=qa.snap(page)
        payment=qa.payment(page)
        page.screenshot(path=str(out/(name+'.png')))
        data={'state':state,'payment':payment,'war_cry_hidden':page.locator('#war-cry-editor').is_hidden(),'deflector_hidden':page.locator('#deflect-action').is_hidden(),'recent_http':requests[-12:],'forbidden_posts':forbidden,'errors':errors,'browser':browser.version}
        assert not forbidden and not errors,data
        (out/(name+'.json')).write_text(json.dumps(data,indent=2)+'\n')
    capture('rules7-running')
    page.wait_for_function('()=>{const e=__b2zExperience,s=e.session;return s.operational?.run.running===false&&!e.status.canPrepare&&document.getElementById("transfer-controls").disabled}',timeout=300000)
    capture('rules7-paused')
    page.wait_for_function('(hash)=>__b2zExperience.session.sequence.last.publication.identity.rules_hash===hash',arg=rules11,timeout=400000)
    page.wait_for_function('()=>!__b2zExperience.status.canPrepare&&document.getElementById("transfer-controls").disabled',timeout=60000)
    capture('rules11-epoch-paused')
    page.wait_for_function('()=>__b2zExperience.session.operational?.run.running===true&&__b2zExperience.status.canPrepare&&!document.getElementById("transfer-controls").disabled',timeout=260000)
    assert page.locator('#war-cry-editor').is_visible() and page.locator('#deflect-action').is_hidden()
    page.locator('#war-cry').fill('CHARGE!')
    page.wait_for_function('()=>document.getElementById("text-memo").textContent.endsWith("|CHARGE!")')
    capture('rules11-running')
    context.close()
    browser.close()
