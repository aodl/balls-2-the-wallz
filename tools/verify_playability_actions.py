#!/usr/bin/env python3
"""Sandboxed v6 widget checks. Synthetic data; no IC, payments or release claim."""
import argparse, functools, http.server, json, subprocess, threading
from pathlib import Path
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output',type=Path,required=True)
args=parser.parse_args();root=Path(__file__).resolve().parents[1];out=args.output.resolve();out.mkdir(parents=True,exist_ok=False)
subprocess.run(['node','tools/fixtures/prepare-playability-actions.mjs',str(out/'fixture.json')],cwd=root,check=True)
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
def identify(page,principal):
    page.locator('#identity-principal').fill(principal);page.evaluate('document.getElementById("identity-account").value=""');page.locator('#identity-save').click();page.wait_for_timeout(30)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,chromium_sandbox=True)
    try:
        for width,height in [(1440,900),(390,844)]:
            context=browser.new_context(viewport={'width':width,'height':height});page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(origin);page.wait_for_function('Boolean(globalThis.fixture)')
            page.screenshot(path=str(out/f'{width}-before.png'))
            # Identify before joining, then update one existing page to confirmed state.
            page.evaluate('document.getElementById("identify-dialog").showModal()');identify(page,'rrkah-fqaaa-aaaaa-aaaaq-cai');page.evaluate('fixture.open()');page.locator('#ball-quantity').fill('3');page.wait_for_function('document.getElementById("transfer-amount").textContent==="1.5 ICP"')
            page.evaluate('fixture.render("first","final")');assert page.evaluate('fixture.summary().selected')==2
            assert not page.evaluate('fixture.select(1)');assert page.evaluate('fixture.summary().selected')==2
            account=page.evaluate('fixture.summary().account')
            second=context.new_page();second.goto(origin+'/?case=first&phase=final');second.wait_for_function('Boolean(globalThis.fixture)');assert second.evaluate('fixture.summary().account')==account;second.close()
            # The two-cannon quote uses the island pool, and selects the confirmed new one.
            page.evaluate('document.getElementById("identify-dialog").showModal()');identify(page,'aaaaa-aa');page.evaluate('fixture.render("additional","initial");fixture.action("start");fixture.open()');page.locator('#ball-quantity').fill('3');page.wait_for_timeout(30);assert page.locator('#transfer-amount').inner_text()=='5.3 ICP'
            page.evaluate('fixture.render("additional","final")');assert page.evaluate('fixture.summary().selected')==2
            # Fire changes one open session without moving its camera or reloading.
            page.evaluate('fixture.render("fire","initial")');before=page.evaluate('fixture.summary()');page.evaluate('fixture.render("fire","final")');after=page.evaluate('fixture.summary()');assert after['balls']>before['balls'];assert after['camera']==before['camera'];assert after['navigations']==1
            page.evaluate('fixture.render("move","initial");fixture.action("move");fixture.open()');assert not page.evaluate('fixture.choose(999999)');page.evaluate('fixture.render("move","final")')
            page.evaluate('fixture.render("mutual_last","final");fixture.select(1);fixture.open()');assert 'Dormant' in page.locator('#cannon-life').inner_text();assert page.evaluate('fixture.summary().balls')==0
            page.evaluate('fixture.render("mutual_last","expired")');assert page.evaluate('fixture.summary().cannons')==0;assert page.evaluate('fixture.summary().navigations')==1
            page.evaluate('fixture.render("additional","final");fixture.action("ball");fixture.open()');page.screenshot(path=str(out/f'{width}-after.png'))
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');rows.append({'viewport':[width,height],'status':'PASS','checks':['identify before join','no-refresh new cannon/fire/move/dormancy/expiry','island batch prices','selected target authority boundary','persistent declaration','camera preservation','responsive toolbar/action overlay']});context.close()
        assert not errors,errors
    finally:browser.close();server.shutdown()
(out/'results.json').write_text(json.dumps({'status':'PASS','scope':__doc__,'sandbox':True,'rows':rows,'page_errors':errors},indent=2)+'\n')
print('PASS: desktop/mobile v6 action widget cases; synthetic content only')
