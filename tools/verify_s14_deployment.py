#!/usr/bin/env python3
"""Actual deployment bundle against an owned live PocketIC. No wallet/update calls.
The Rust acceptance harness owns valueless transfers, upgrade and service startup.
"""
import argparse,json,os,shutil,signal,subprocess,sys,time
from pathlib import Path
from browser_observer import wait_until,wait_file
from verify_observer_http import free_port,wait_for_server
ROOT=Path(__file__).resolve().parents[1]

def main():
    p=argparse.ArgumentParser();p.add_argument('--configuration',type=Path,required=True);p.add_argument('--gateway',required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    out=a.output.resolve();out.mkdir(parents=True,exist_ok=True);configuration=json.loads(a.configuration.read_text());port=free_port()
    asset_canister=os.environ.get('S14_ASSET_CANISTER')=='1'
    configuration['host']=a.gateway.rstrip('/') if asset_canister else f'http://127.0.0.1:{port}'
    local=out/'local-test-policy.json';local.write_text(json.dumps(configuration)+'\n')
    report={'status':'NOT_RUN','mode':'DFX_ASSET_CANISTER_LIVE_LOCAL' if asset_canister else 'BUILT_DEPLOYMENT_LIVE_LOCAL','checks':[],'qualification':'Explicit compile-time local-only adapter, same bundled observer/renderer/SDK verifier. Production mainnet policy unchanged.'}
    def record(name,details=''):
        report['checks'].append({'name':name,'status':'PASS','details':details});save()
    def save():(out/'results.json').write_text(json.dumps(report,indent=2)+'\n')
    def terminated(_signal,_frame):raise SystemExit(143)
    signal.signal(signal.SIGTERM,terminated)
    server=None;browser=None
    try:
        assets=out/'assets';production=out/'mainnet-assets'
        subprocess.run(['node','tools/build_observer_mainnet.mjs','--local-test-config',str(local),'--output',str(assets)],cwd=ROOT,check=True,timeout=120)
        # A committed real deployment mapping must never be bypassed to build
        # mainnet assets for a disposable test principal. Production-policy
        # inspection uses that real ID; only the explicit local bundle runs here.
        ids=ROOT/'canister_ids.json'
        production_id=json.loads(ids.read_text()).get('btz',{}).get('ic',configuration['canister_id']) if ids.exists() else configuration['canister_id']
        subprocess.run(['node','tools/build_observer_mainnet.mjs','--canister',production_id,'--output',str(production)],cwd=ROOT,check=True,timeout=120)
        for directory in [assets,production]:
            assert {'index.html','app.mjs','configuration.bin','deployment.json','build-manifest.json','.ic-assets.json5','style.css','icon.svg'}.issubset({x.name for x in directory.iterdir()})
        manifest=json.loads((production/'build-manifest.json').read_text());assert manifest['deployment']['canister_id']==production_id;assert not manifest['local_test_only'];assert not any('s14-local-deployment' in name for name in manifest['inputs'])
        record('real-asset-build-and-mainnet-test-adapter-exclusion',manifest)
        if asset_canister:
            # The Rust harness owns this disposable network. No dfx start/stop,
            # shared network reset, external wallet or real cycles are involved.
            project=out/'dfx-project';project.mkdir()
            dfx=json.loads((ROOT/'dfx.json').read_text())
            shutil.copytree(assets,project/'.work/s14/assets')
            dfx['canisters']={'observer':dfx['canisters']['observer']}
            backend=json.loads((ROOT/'dfx.json').read_text())['canisters']['btz']
            dfx['canisters']['btz']={**backend,'candid':str(ROOT/backend['candid']),'wasm':os.environ['BTZ_S14_WASM']}
            dfx['networks']={'local':{'providers':[a.gateway],'type':'ephemeral'}}
            (project/'dfx.json').write_text(json.dumps(dfx,indent=2)+'\n')
            def dfx_run(*args):
                command=['dfx','--identity','codex_local',*args,'--network','local']
                p=subprocess.run(command,cwd=project,text=True,capture_output=True,timeout=90,env={**os.environ,'DFX_IDENTITY':'codex_local'})
                with (out/'dfx.log').open('a') as log:log.write(' '.join(command)+'\n'+p.stdout+p.stderr+'\n')
                if p.returncode:raise RuntimeError('Local dfx asset deployment failed; see dfx.log')
                return p.stdout.strip()
            dfx_run('canister','create','observer','--no-wallet')
            dfx_run('deploy','observer','--mode','install')
            observer=dfx_run('canister','id','observer')
            # A separate disposable constructor probe exercises the same custom
            # backend install route with the generated local Candid arguments.
            # It receives no payments and is deleted with this owned instance.
            dfx_run('canister','create','btz','--no-wallet')
            init=project/'local-init.did'
            subprocess.run(['node','tools/prepare_s14_init.mjs','--network','pocketic-local',
                '--ledger',configuration['ledger'],'--index',configuration['index'],'--output',str(init)],cwd=ROOT,check=True,timeout=30)
            dfx_run('canister','install','btz','--mode','install','--wasm',os.environ['BTZ_S14_WASM'],'--argument-file',str(init))
            probe=dfx_run('canister','id','btz')
            info=dfx_run('canister','info','btz')
            from hashlib import sha256
            assert sha256(Path(os.environ['BTZ_S14_WASM']).read_bytes()).hexdigest() in info
            deadline=time.monotonic()+15
            while True:
                status=dfx_run('canister','call','btz','lab_status','()','--query')
                if 'binding_checked = true' in status:break
                if time.monotonic()>deadline:raise TimeoutError('generated constructor index binding not ready')
                time.sleep(.2)
            account=dfx_run('ledger','account-id','--of-principal',probe,'--subaccount','00'*32)
            assert len(account)==64 and 'event_horizon = null' in status,status
            record('dfx-normal-backend-generated-constructor-and-binding',{'backend':probe,'receiving_account':account,'module':info,'pokes':'disabled, fallback enabled'})
            from urllib.parse import urlparse
            endpoint=urlparse(a.gateway)
            url=f'http://{observer}.localhost:{endpoint.port}/'
            record('dfx-asset-canister-install',{'observer':observer,'url':url,'configuration':'dfx.json observer type=assets; owned disposable gateway'})
        else:
            with (out/'server.log').open('w') as log:
                server=subprocess.Popen([sys.executable,'-B','tools/serve_observer.py','--port',str(port),'--deployment-assets',str(assets),'--live-config',str(a.configuration.parent),'--ic-gateway',a.gateway,'--live-canister',configuration['canister_id']],cwd=ROOT,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
            url=configuration['host']+'/';wait_for_server(url,server)
        from playwright.sync_api import sync_playwright
        with sync_playwright() as pw:
            browser=pw.chromium.launch(headless=True,chromium_sandbox=True)
            context=browser.new_context(permissions=['clipboard-write']);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            posts=[];page.on('request',lambda r:posts.append(r.url) if r.method=='POST' else None)
            def retire_genesis_before_artifact(route):
                (out/'bootstrap-anchor-read').write_text('certified genesis observed before game start\n')
                deadline=time.monotonic()+20
                while not (out/'harness-genesis-retired').exists():
                    if time.monotonic()>deadline:raise TimeoutError('harness did not publish after genesis observation')
                    time.sleep(.05)
                route.continue_()
            page.route('**/configuration.bin',retire_genesis_before_artifact)
            response=page.goto(url,timeout=30000)
            if asset_canister:
                assert response.status==200
                assert 'text/html' in response.headers['content-type']
                assert 'ic-certificate' in response.headers
                assert configuration['host'] in response.headers['content-security-policy']
                for path,mime in [('app.mjs','javascript'),('style.css','text/css'),('configuration.bin','application/octet-stream')]:
                    fetched=context.request.get(url+path);assert fetched.status==200
                    assert mime in fetched.headers['content-type'],fetched.headers
                record('asset-http-certificate-mime-and-csp',response.headers)
            wait_until(page,lambda:page.evaluate('Boolean(globalThis.__dtrLive?.connected)') or page.locator('body').get_attribute('data-phase')=='ERROR',30000)
            if page.locator('body').get_attribute('data-phase')=='ERROR':
                message=page.locator('#error-text').inner_text();page.screenshot(path=str(out/'startup-failure.png'))
                raise RuntimeError('deployed observer startup: '+message)
            assert page.evaluate('globalThis.__dtrLive.startupRetries')>=1
            record('retired-genesis-restarts-with-fresh-certified-head')
            page.locator('.diagnostics').evaluate('(node)=>node.open=true')
            assert page.locator('#receiving-account').inner_text()==configuration['recipient']
            assert page.locator('#backend-identity').inner_text()==configuration['canister_id']
            assert 'join 100000000 e8s; relocation 10000 e8s' in page.locator('#command-prices').inner_text()
            assert 'Rules ' in page.locator('#rules-identity').inner_text()
            record('certified-backend-receiving-account-and-price-identities')
            page.locator('.diagnostics').evaluate('(node)=>node.open=false')
            wait_until(page,lambda:not page.locator('[data-copy="recipient"]').is_disabled(),15000)
            assert page.locator('#join-price').inner_text()=='1 ICP'
            assert page.locator('#hero-join-price').inner_text()=='1 ICP join'
            assert page.locator('#payment-address').inner_text()==configuration['recipient']
            page.bring_to_front()
            assert 'clipboard-write=(self)' in response.headers.get('permissions-policy','')
            assert 'clipboard-read=()' in response.headers.get('permissions-policy','')
            # Observe arguments while still invoking native clipboard writes under
            # an actual click; do not enable clipboard reading in production.
            page.evaluate('''() => {const write=navigator.clipboard.writeText.bind(navigator.clipboard);navigator.clipboard.writeText=async text=>{await write(text);globalThis.__copiedText=text;};}''')
            for selector,expected in [('[data-copy="recipient"]',configuration['recipient']),('[data-copy="numeric"]','4779544133607882752'),('[data-copy="hex"]','42545a1100000000')]:
                if 'hex' in selector:page.locator('#transfer-controls details summary').click()
                page.locator(selector).click()
                wait_until(page,lambda:page.evaluate('globalThis.__copiedText')==expected,5000)
            page.locator('[data-angle="16384"]').click()
            assert page.locator('#numeric-memo').inner_text()=='4779544133607899136'
            assert page.locator('#hex-memo').inner_text()=='42545a1100004000'
            page.locator('#transfer-controls details').evaluate('(node)=>node.open=false')
            record('exact-authenticated-transfer-copy-and-angle-controls')
            for width,height in [(1440,900),(768,1024),(390,844)]:
                page.set_viewport_size({'width':width,'height':height});page.evaluate('scrollTo(0,0)')
                page.wait_for_timeout(150)
                board=page.locator('#board').bounding_box()
                assert board['y']<height*.4 and board['height']>100
                assert abs(board['width']/board['height']-2)<.01
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                assert page.locator('.hero a[href="#join"]').is_visible()
                page.screenshot(path=str(out/f'arcade-empty-{width}x{height}.png'),full_page=True)
            record('arcade-responsive-arena-and-empty-state')
            page.set_viewport_size({'width':1440,'height':900})

            initial=page.evaluate('globalThis.__dtrLive.heads.at(-1) ?? -1')
            wait_until(page,lambda:page.evaluate('globalThis.__dtrLive.heads.at(-1)') is not None and page.evaluate('globalThis.__dtrLive.heads.at(-1)')>initial,30000)
            record('fresh-publications-after-browser-connection')
            (out/'browser-connected').write_text('ready\n')
            wait_until(page,lambda:page.locator('#live-cannons tr').count()==1,60000)
            page.screenshot(path=str(out/'arcade-first-cannon.png'),full_page=True)
            (out/'browser-first-cannon-seen').write_text('certified join visible\n')
            paid=json.loads(wait_file(page,out/'harness-payments-done',120000))
            wait_until(page,lambda:page.locator('#live-receipts tr').count()>=len(paid),30000)
            receipts=page.locator('#live-receipts tr').all_inner_texts()
            for tx,kind in zip(paid,['Joined arena','Launched ball','Moved cannon']):
                matching=[row for row in receipts if row.split('\t')[0]==str(tx)]
                assert len(matching)==1 and 'Accepted' in matching[0] and kind in matching[0],receipts
            assert page.locator('#live-cannons tr').count()==1
            assert 'Gameplay running' in page.locator('#service-status').text_content()
            record('paid-join-ball-fallback-and-legal-move-visible-once',receipts)
            assert page.locator('#live-cannons').inner_text().find('0.4 ICP')>=0
            assert not page.locator('#empty-arena').is_visible()
            page.screenshot(path=str(out/'arcade-paid-cannon.png'),full_page=True)
            page.locator('.players details summary').click()
            page.locator('#selected-cannon').select_option('1')
            page.locator('#move-cell').select_option(index=1)
            assert page.locator('#move-memo').inner_text().startswith('47795441379')
            record('certified-ball-price-and-owned-relocation-reference')

            page.locator('.diagnostics').evaluate('(node)=>node.open=true')
            page.locator('#network-pause').check();(out/'browser-disconnected').write_text('paused\n')
            target=int(wait_file(page,out/'harness-upgrade-ready',45000))
            page.locator('#network-pause').uncheck()
            wait_until(page,lambda:page.evaluate('globalThis.__dtrLive.resyncs')>=1 and page.evaluate('globalThis.__dtrLive.heads.at(-1)')>=target,30000)
            heads=page.evaluate('globalThis.__dtrLive.heads.slice()');assert all(b>a for a,b in zip(heads,heads[1:])),heads
            assert page.locator('#receiving-account').inner_text()==configuration['recipient']
            if asset_canister:
                page.reload(timeout=30000)
                wait_until(page,lambda:page.evaluate('Boolean(globalThis.__dtrLive?.connected)'),30000)
                assert page.locator('#receiving-account').inner_text()==configuration['recipient']
                record('asset-entry-refresh-authenticates-same-backend')
            record('authenticated-reconnect-after-retention-gap-and-upgrade',heads)
            # Negative cases keep the genuine pinned-root local deployment and
            # its verifier. Only a browser-local response is damaged.
            for fault in ['unavailable-config','tampered-config','tampered-query']:
                negative=context.new_page()
                if fault=='unavailable-config':
                    negative.route('**/configuration.bin',lambda route:route.fulfill(status=503,body='unavailable'))
                elif fault=='tampered-config':
                    def corrupt_config(route):
                        response=route.fetch();data=bytearray(response.body());data[-1]^=1
                        route.fulfill(response=response,body=bytes(data))
                    negative.route('**/configuration.bin',corrupt_config)
                else:
                    def corrupt_query(route):
                        response=route.fetch();data=bytearray(response.body());data[-1]^=1
                        route.fulfill(response=response,body=bytes(data))
                    negative.route('**/api/v*/canister/*/query',corrupt_query)
                negative.goto(url,timeout=30000)
                wait_until(negative,lambda:negative.locator('body').get_attribute('data-phase')=='ERROR',30000)
                assert negative.locator('[data-copy="recipient"]').is_disabled()
                assert negative.locator('#live-status').inner_text()=='Connection error'
                assert not negative.evaluate('Boolean(globalThis.__dtrLive?.connected)')
                negative.close()
            record('unavailable-or-unbound-configuration-and-tampered-certified-query-fail-closed')
            reduced=browser.new_context(reduced_motion='reduce');still=reduced.new_page();still.goto(url,timeout=30000)
            wait_until(still,lambda:still.evaluate('Boolean(globalThis.__dtrLive?.connected)'),30000)
            assert still.locator('body').get_attribute('data-phase')=='PAUSED'
            wait_until(still,lambda:still.locator('#live-status').inner_text()=='Playback paused',15000)
            reduced.close();record('deployment-bundle-reduced-motion-pauses-playback')

            assert posts and all(url.endswith(('/query','/read_state')) for url in posts),posts
            record('read-only-transport-and-native-webcrypto','All observed browser POSTs are query/read_state; no signing or ledger updates.')
            assert page.evaluate("isSecureContext && typeof crypto.subtle.digest==='function'");assert not errors,errors
            page.screenshot(path=str(out/'deployment.png'),full_page=True)
            report['sandbox']=True;report['browser_version']=browser.version;report['status']='PASS';save()
            (out/'browser-complete').write_text('PASS\n');browser.close();browser=None
        return 0
    except Exception as error:
        __import__('traceback').print_exc()
        report['status']='FAIL';report['error']=repr(error);save();print(report['error'],flush=True);return 1
    finally:
        if browser:
            try:browser.close()
            except Exception:pass
        if server and server.poll() is None:
            os.killpg(server.pid,signal.SIGTERM)
            try:server.wait(timeout=5)
            except subprocess.TimeoutExpired:os.killpg(server.pid,signal.SIGKILL);server.wait()
if __name__=='__main__':raise SystemExit(main())
