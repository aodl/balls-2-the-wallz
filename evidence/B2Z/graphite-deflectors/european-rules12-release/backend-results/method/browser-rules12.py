import functools,http.server,json,re,sys,threading
from pathlib import Path
from importlib.machinery import SourceFileLoader
from playwright.sync_api import sync_playwright
work=Path(__file__).resolve().parent
qa=SourceFileLoader('qa',str(work/'live-common.py')).load_module()
out=Path(sys.argv[1]);width=int(sys.argv[2]);height=640 if width==320 else 900
out.mkdir(parents=True,exist_ok=True)
(out/'wallet.html').write_text('<!doctype html><title>Read-only wallet paste</title><textarea id="paste"></textarea>')
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(out.resolve())))
threading.Thread(target=server.serve_forever,daemon=True).start()
wallet_url=f'http://127.0.0.1:{server.server_port}/wallet.html'
rules='1b44508ad27a714b43888e3d0cf84beeb9a2450bb25112bfd3b650b865105c1c'
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,chromium_sandbox=True)
    context=browser.new_context(viewport={'width':width,'height':height},has_touch=width==320)
    context.grant_permissions(['clipboard-read','clipboard-write'])
    context.add_init_script("globalThis.copiedBytes=[];const write=navigator.clipboard.writeText.bind(navigator.clipboard);navigator.clipboard.writeText=async v=>{await write(v);copiedBytes.push(v)};")
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
    cannon,_=qa.enter_fire(page)
    s=qa.snap(page)
    assert s['ready'] and s['identity']['rules_hash']==rules and not s['error']
    assert page.locator('#war-cry-editor').is_visible()
    if width==320:
        qa.heading(page,347.15);qa.settle(page)
        qty=qa.snap(page)['quantity']
        assert not qty['hidden'] and qty['placement']=='dock' and all(t['hit'] for t in qty['targets'])
        page.screenshot(path=str(out/'320-fire-347.15.png'))
    else:qty=None
    page.locator('#war-cry').fill('CHARGE!')
    page.wait_for_function('()=>document.getElementById("text-memo").textContent.endsWith("|CHARGE!")')
    fire=qa.payment(page)
    def copy(key,value):
        page.wait_for_function('()=>__b2zExperience.status.canPrepare&&!document.getElementById("transfer-controls").disabled',timeout=120000)
        before=page.evaluate('copiedBytes.length')
        page.locator(f'[data-copy="{key}"]').click()
        page.wait_for_function('n=>copiedBytes.length>n',arg=before,timeout=10000)
        assert page.evaluate('copiedBytes.at(-1)')==value
        wallet=context.new_page();wallet.goto(wallet_url);wallet.locator('#paste').focus();wallet.keyboard.press('Control+V');wallet.wait_for_timeout(100)
        pasted=wallet.locator('#paste').input_value();wallet.close();page.bring_to_front()
        assert pasted==value, (key,value,pasted)
    page.locator('#deflect-action').click()
    assert page.locator('#deflector-directions').is_visible()
    assert page.locator('#war-cry-editor').is_hidden() and page.locator('#quantity-controls').is_hidden()
    prior=None
    orientations=[]
    for direction in ['NE','SE','SW','NW']:
        button=page.locator(f'[data-deflector-orientation="{direction}"]')
        button.click();qa.settle(page)
        memo=page.locator('#text-memo').text_content()
        assert re.fullmatch(r'DEFLECT [0-9]+ '+direction,memo),memo
        assert prior is None or prior==memo.split()[1];prior=memo.split()[1]
        rect=button.bounding_box()
        assert rect['width']>=44 and rect['height']>=44
        hit=page.evaluate('(r)=>document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest("button")?.dataset.deflectorOrientation',rect)
        assert direction==hit
        orientations.append({'direction':direction,'memo':memo,'hit':hit,'rect':rect})
    packet=qa.payment(page)
    assert packet['amount']=='0.1 ICP' and packet['recipient']=='s5ir5-gqaaa-aaaas-amyna-cai' and packet['prompt']=='Deflect & Pay'
    for key,value in [('owner',packet['recipient']),('amount','0.1'),('text',packet['memo'])]:
        copy(key,value)
    page.locator('[data-deflector-orientation="NE"]').click()
    assert page.locator('#replace-choice').is_visible()
    page.locator('#keep-instructions').click()
    assert qa.payment(page)['memo']==packet['memo']
    page.locator('[data-deflector-orientation="NE"]').click();page.locator('#replace-instructions').click()
    assert qa.payment(page)['memo']==f'DEFLECT {prior} NE'
    page.screenshot(path=str(out/'deflect.png'))
    assert not errors and not forbidden
    (out/'result.json').write_text(json.dumps({'status':'PASS','viewport':[width,height],'identity':s['identity'],'cannon':cannon,'quantity_pose':qty,'orientations':orientations,'payment':packet,'fire':fire,'clipboard':'exact native Copy and external paste','update_keep':'PASS','errors':errors,'forbidden_posts':forbidden},indent=2)+'\n')
    context.close();browser.close()
server.shutdown()
