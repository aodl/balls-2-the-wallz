#!/usr/bin/env python3
"""Sandboxed v6 widget checks. Synthetic data; no IC, payments or release claim."""
import argparse, functools, hashlib, http.server, json, subprocess, threading
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output',type=Path,required=True)
parser.add_argument('--capacity-state',type=Path)
parser.add_argument('--capacity-events',type=Path)
args=parser.parse_args();root=Path(__file__).resolve().parents[1];out=args.output.resolve();out.mkdir(parents=True,exist_ok=False)
if bool(args.capacity_state)!=bool(args.capacity_events):parser.error('capacity state and event bytes must be supplied together')
subprocess.run(['node','tools/fixtures/prepare-playability-actions.mjs',str(out/'fixture.json'),*([str(args.capacity_state),str(args.capacity_events)] if args.capacity_state else [])],cwd=root,check=True)
subprocess.run(['node_modules/.bin/esbuild','tools/fixtures/playability-action-browser.mjs','--bundle','--platform=browser','--format=esm','--outfile='+str(out/'fixture.mjs')],cwd=root,check=True)
html=(root/'apps/b2z-observer/index.html').read_text().replace('src="./app.mjs"','src="./fixture.mjs"').replace('<body>','<body><p id="fixture-warning">SYNTHETIC LOCAL UI FIXTURE — NO IC AUTHENTICATION OR REAL PAYMENT</p>')
(out/'index.html').write_text(html)
for name in ['style.css','icon.svg']:(out/name).write_bytes((root/'apps/b2z-observer'/name).read_bytes())
(out/'style.css').write_text((out/'style.css').read_text()+'\n#fixture-warning{position:fixed;top:60px;z-index:10000;background:#8b301d;color:white;pointer-events:none}\n')
class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; object-src 'none'; base-uri 'none'")
        super().end_headers()
    def log_message(self,*_args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(out)))
threading.Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}';rows=[];errors=[]
def identify(page,principal='aaaaa-aa'):
    page.locator('#identify-button').click();page.locator('#identity-mode').select_option('principal');page.locator('#identity-principal').fill(principal);page.locator('#identity-save').click()
def pick(page,n):
    page.locator('#centre-cannon').click();page.locator('#own-cannons button').filter(has_text=f'#{n} ·').click();page.wait_for_timeout(60)
def layout(page):
    return page.evaluate("""()=>{const r=id=>{const n=document.getElementById(id);return n.getClientRects().length?n.getBoundingClientRect().toJSON():null},overlap=(a,b)=>a&&b&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;const card=r('action-card'),aim=r('aim-pad'),rail=document.querySelector('.toolbar').getBoundingClientRect().toJSON();return {card,aim,rail,cardRail:overlap(card,rail),aimCard:overlap(card,aim),overflow:document.documentElement.scrollWidth>innerWidth,targets:[...document.querySelectorAll('.toolbar button')].map(n=>({width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height}))}}""")
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,chromium_sandbox=True)
    try:
        for width,height in [(320,640),(390,844),(844,390),(768,1024),(1440,900)]:
            context=browser.new_context(viewport={'width':width,'height':height},permissions=['clipboard-write']);context.add_init_script("const write=navigator.clipboard.writeText.bind(navigator.clipboard);window.copied=[];window.realClipboardWrite=write;navigator.clipboard.writeText=async value=>{await write(value);window.copied.push({text:value,bytes:[...new TextEncoder().encode(value)]})}");page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(origin);page.wait_for_function('()=>Boolean(globalThis.fixture)')
            assert not page.locator('#identify-dialog').evaluate('(n)=>n.open')
            page.locator('#just-watch').click();page.locator('#fire-action').click();page.locator('#identity-principal').fill('aaaaa-aa');page.locator('#identity-save').click();page.wait_for_timeout(80)
            assert page.locator('#action-title').inner_text().startswith('Fire')
            page.locator('#close-action').click();page.evaluate('fixture.render("additional","final")');pick(page,2);page.locator('#fire-action').click();page.locator('#ball-quantity').fill('2');page.wait_for_timeout(60)
            assert page.locator('#text-memo').inner_text()=='FIRE 2 37.5 2'
            assert page.locator('#transfer-amount').inner_text()=='4.1 ICP'
            page.locator('#close-action').click();point=page.evaluate('fixture.point(2)');page.mouse.click(point['x'],point['y']);assert 'Cannon #2' in page.locator('#action-title').inner_text();page.locator('#fire-action').click()
            page.locator('#angle-degrees').fill('90');assert page.locator('#text-memo').inner_text()=='FIRE 2 90 2'
            # Complete the external-wallet task with the disclosure closed. The full
            # AccountIdentifier uses a nondefault receiving subaccount in this fixture.
            assert not page.locator('#transfer-controls details').evaluate('(n)=>n.open')
            expected_recipient='3112deb17c0ab9ce3386430dfe9af5ca916fe8522ce8fcb9f652399f4d2ac649'
            assert page.locator('#payment-address').inner_text()==expected_recipient
            assert page.locator('#paying-account').inner_text()==page.evaluate('fixture.summary().account')
            payment_fields={}
            for selector in ['#transfer-amount','#text-memo','#payment-address','#paying-account','#payment-risk','[data-copy="amount"]','[data-copy="recipient"]','[data-copy="text"]']:
                field=page.locator(selector);field.scroll_into_view_if_needed();page.wait_for_timeout(30)
                assert field.is_visible() and field.evaluate('(n)=>{const r=n.getBoundingClientRect(),c=document.getElementById("action-card").getBoundingClientRect();return r.top>=c.top&&r.bottom<=c.bottom&&r.left>=c.left&&r.right<=c.right}'),selector
                measured=layout(page);assert not measured['cardRail'] and not measured['aimCard'] and not measured['overflow'],measured
                payment_fields[selector]=field.bounding_box()
                if selector=='#payment-address':page.screenshot(path=str(out/f'{width}x{height}-payment.png'))
                if selector=='#payment-risk':
                    assert 'no automatic refunds' in field.inner_text()
                    page.screenshot(path=str(out/f'{width}x{height}-risks.png'))
            for kind,expected in [('amount','4.1'),('recipient',expected_recipient),('text','FIRE 2 90 2')]:
                copied_before=page.evaluate('window.copied.length')
                page.locator(f'[data-copy="{kind}"]').click()
                page.wait_for_function('(count)=>window.copied.length===count+1',arg=copied_before)
                expect(page.locator('#copy-feedback')).to_contain_text('Copied.')
                assert page.evaluate('window.copied.at(-1)')=={'text':expected,'bytes':list(expected.encode('utf-8'))}
            assert not page.locator('#transfer-controls details').evaluate('(n)=>n.open')
            page.locator('#angle-degrees').fill('0');assert page.locator('#replace-choice').is_visible();assert not page.locator('#prepared-card').is_visible()
            page.locator('#keep-instructions').click();assert page.locator('#angle-degrees').input_value()=='90';assert page.locator('#text-memo').inner_text()=='FIRE 2 90 2'
            page.locator('#angle-degrees').fill('180');page.locator('#replace-instructions').click()
            assert page.locator('#text-memo').inner_text()=='FIRE 2 180 2'
            page.locator('[data-copy="text"]').click();page.wait_for_function('()=>window.copied.at(-1).text==="FIRE 2 180 2"');expect(page.locator('#copy-feedback')).to_contain_text('Copied.');assert page.evaluate('window.copied.at(-1).bytes')==list(b'FIRE 2 180 2')
            page.locator('#reported-sent').click();assert 'Still checking' in page.locator('#activity-list').inner_text();assert 'Applied' not in page.locator('#activity-list').inner_text();page.locator('#close-activity').click()
            restored=context.new_page();restored.goto(origin+'/?case=additional&phase=final');restored.wait_for_function('()=>!!window.fixture');assert restored.evaluate('fixture.summary().selected')==2;restored.locator('#activity-button').click();assert 'Still checking' in restored.locator('#activity-list').inner_text();assert not restored.locator('#action-inputs').is_visible();restored.close()
            page.locator('#replace-instructions').click() if page.locator('#replace-instructions').is_visible() else None
            page.locator('#close-action').click();page.locator('#move-action').click();page.locator('#move-cell').fill('999999');assert page.locator('[data-copy="text"]').count() and page.locator('#prepared-card').is_hidden();before=page.evaluate('fixture.summary().cannons');page.keyboard.press('Escape');assert page.evaluate('fixture.summary().cannons')==before
            # Explicit new-account mode ignores old Principal input, with no hidden precedence.
            identify(page,'rrkah-fqaaa-aaaaa-aaaaq-cai');page.locator('#join-action').click();assert 'Automatic placement preview' in page.locator('#placement-note').inner_text();assert page.locator('#text-memo').inner_text().startswith('NEW ')
            # Clipboard denial never says Copied; manual handoff freezes exactly the shown fields.
            page.evaluate('()=>{navigator.clipboard.writeText=async()=>{throw Error("denied")}}');page.locator('[data-copy="recipient"]').click();assert page.locator('#manual-value').input_value()==expected_recipient;assert 'Clipboard unavailable' in page.locator('#copy-feedback').inner_text();assert page.locator('#manual-copy').is_visible();page.locator('[data-copy="text"]').click();assert page.locator('#manual-value').input_value()==page.locator('#text-memo').inner_text();page.locator('#manual-handoff').click();assert 'Manual handoff saved' in page.locator('#copy-feedback').inner_text()
            page.locator('#close-action').click();identify(page);page.evaluate('fixture.render("mutual_last","final")');pick(page,1);page.locator('#fire-action').click();assert 'Revive' in page.locator('#action-title').inner_text();assert 'Dormant' in page.locator('#cannon-life').inner_text()
            page.evaluate('fixture.render("mutual_last","expired")');assert page.locator('#cannon-roster').is_visible();assert page.evaluate('fixture.summary().selected') is None;page.locator('#close-roster').click()
            # Unfrozen disappearance feedback expires with the next cannon/draft,
            # while the earlier reported payment remains unresolved in Activity.
            assert 'no longer present' in page.locator('#copy-feedback').inner_text()
            page.evaluate('fixture.render("additional","final")');pick(page,2);page.locator('#fire-action').click();page.wait_for_timeout(100)
            assert page.locator('#copy-feedback').inner_text()==''
            assert 'no longer present' not in page.locator('#roster-note').inner_text()
            assert page.locator('#text-memo').inner_text().startswith('FIRE 2 ')
            assert page.locator('[data-copy="text"]').is_enabled()
            page.locator('#activity-button').click();assert 'Still checking this payment. Do not send it again.' in page.locator('#activity-list').inner_text();page.locator('#close-activity').click()
            # A frozen packet for a missing target still requires explicit replacement.
            page.evaluate('navigator.clipboard.writeText=window.realClipboardWrite')
            page.locator('[data-copy="text"]').click();expect(page.locator('#copy-feedback')).to_contain_text('Copied.');page.evaluate('fixture.render("mutual_last","expired")');page.locator('#close-roster').click()
            page.evaluate('fixture.render("additional","final")');pick(page,1);page.locator('#fire-action').click()
            assert page.locator('#replace-choice').is_visible()
            assert 'no longer present' in page.locator('#copy-feedback').inner_text()
            assert page.locator('#transfer-controls').evaluate('(n)=>n.disabled')
            page.locator('#replace-instructions').click();assert page.locator('[data-copy="text"]').is_enabled()
            assert 'no longer present' not in page.locator('#copy-feedback').inner_text()
            measured=layout(page);assert not measured['cardRail'] and not measured['aimCard'] and not measured['overflow'],measured
            assert all(r['width']>=44 and r['height']>=44 for r in measured['targets']),measured
            if height>=640:assert measured['aim'],measured
            page.screenshot(path=str(out/f'{width}x{height}-after.png'))
            # Keyboard-only secondary selection and exact direction/quantity/copy/activity.
            page.locator('#close-action').click();page.locator('#centre-cannon').focus();page.keyboard.press('Enter');page.locator('#own-cannons button').first.focus();page.keyboard.press('Enter');page.locator('#fire-action').focus();page.keyboard.press('Enter');page.locator('#angle-degrees').focus();page.keyboard.press('ControlOrMeta+A');page.keyboard.type('180');page.locator('#ball-quantity').focus();page.keyboard.press('ControlOrMeta+A');page.keyboard.type('2');page.locator('[data-copy="text"]').focus();page.keyboard.press('Enter');page.locator('#activity-button').focus();page.keyboard.press('Enter');assert page.locator('#activity-drawer').is_visible()
            print(f'PASS: {width}x{height}',flush=True)
            rows.append({'viewport':[width,height],'status':'PASS','rectangles':measured,'dom_nodes':page.locator('*').count(),'payment_fields':payment_fields,'copied_recipient':expected_recipient,'copied_memo_utf8':list(b'FIRE 2 90 2'),'checks':['identify resumes Fire','two own cannons and exact target','wallet fields reachable with disclosure closed','exact clipboard recipient/amount/memo bytes','batch quote','frozen packet and explicit replacement','reported sent is unresolved','wallet return restores Activity','illegal move blocked','first placement automatic','clipboard denial/manual handoff','dormant revival and missing target','new cannon clears obsolete feedback; historical Activity retained','missing frozen target keeps warning and replacement gate','keyboard selection/aim/quantity/copy/Activity']});context.close()
        # Operational precedence is independent of local animation pause.
        context=browser.new_context(viewport={'width':390,'height':844});page=context.new_page();page.goto(origin);page.wait_for_function('()=>!!window.fixture');identify(page,'rrkah-fqaaa-aaaaa-aaaaq-cai');page.evaluate('fixture.render("rejected","final")');page.locator('#activity-button').click();assert 'rejected' in page.locator('#activity-list').inner_text().lower();page.locator('#close-activity').click();restored=context.new_page();restored.goto(origin);restored.wait_for_function('()=>!!window.fixture');restored.locator('#activity-button').click();assert 'Historical cached receipt' in restored.locator('#activity-list').inner_text();assert 'not newly verified' in restored.locator('#activity-list').inner_text();restored.close()
        common={'phase':'BUFFERING','live':True,'verified':True,'fresh':True,'healthy':False,'paused':True,'operationalFresh':True,'operational':{'run':{'running':False,'last_error':[]},'source':{'binding_checked':False,'last_error':[]}},'pace':{'mode':'ReserveProtection','admission_open':False}}
        page.evaluate('(v)=>fixture.status(v)',common);assert 'processing error' in page.locator('#arena-note').inner_text();common['operational']['source']['binding_checked']=True;page.evaluate('(v)=>fixture.status(v)',common);assert page.locator('#arena-note').inner_text()=='Gameplay paused by the operator.'
        common['operational']['run']['running']=True;page.evaluate('(v)=>fixture.status(v)',common);assert page.locator('#arena-note').inner_text()=='Gameplay paused to conserve cycles.'
        common.update(phase='BUFFERING',healthy=True,paused=False,pace={'mode':'Trickle','nominal_milli':10,'supported_milli':10,'admission_open':True})
        page.evaluate('(v)=>fixture.status(v)',common);assert 'Gameplay progressing very slowly' in page.locator('#arena-note').inner_text()
        common['phase']='DEGRADED_BUFFER';page.evaluate('(v)=>fixture.status(v)',common);assert 'Catching up' in page.locator('#arena-note').inner_text()
        common['phase']='ERROR';page.evaluate('(v)=>fixture.status(v)',common);assert 'Verification failed' in page.locator('#arena-note').inner_text()
        context.close()
        # In-memory operation survives storage denial.
        context=browser.new_context(viewport={'width':390,'height':844});context.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw Error('blocked')}})");page=context.new_page();page.goto(origin);page.wait_for_function('()=>!!window.fixture');identify(page);page.locator('#fire-action').click();assert page.locator('#text-memo').inner_text().startswith('FIRE 1 ');context.close()
        assert not errors,errors
    except Exception:
        page.screenshot(path=str(out/'failure.png'))
        (out/'failure.json').write_text(json.dumps({'viewport':page.viewport_size,'feedback':page.locator('#copy-feedback').inner_text(),'copied':page.evaluate('window.copied??null')},indent=2)+'\n')
        raise
    finally:browser.close();server.shutdown()
(out/'results.json').write_text(json.dumps({'status':'PASS','scope':__doc__,'sandbox':True,'rows':rows,'page_errors':errors},indent=2)+'\n')
print('PASS: five responsive player journeys; synthetic content only')
