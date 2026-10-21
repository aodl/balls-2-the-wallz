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
        production_id=json.loads(ids.read_text()).get('b2z',{}).get('ic',configuration['canister_id']) if ids.exists() else configuration['canister_id']
        subprocess.run(['node','tools/build_observer_mainnet.mjs','--canister',production_id,'--output',str(production)],cwd=ROOT,check=True,timeout=120)
        for directory in [assets,production]:
            assert {'index.html','app.mjs','configuration.bin','deployment.json','build-manifest.json','.ic-assets.json5','style.css','icon.svg'}.issubset({x.name for x in directory.iterdir()})
        manifest=json.loads((production/'build-manifest.json').read_text());assert manifest['deployment']['canister_id']==production_id;assert not manifest['local_test_only'];assert not any('s14-local-deployment' in name for name in manifest['inputs'])
        # Both modes inspect the generated production policy. The loopback
        # query proxy is not an asset canister and does not serve that header.
        policy=json.loads((production/'.ic-assets.json5').read_text())
        assert len(policy)==1 and policy[0]['match']=='**/*' and policy[0]['security_policy']=='hardened'
        permissions=policy[0]['headers']['Permissions-Policy']
        assert 'clipboard-write=(self)' in permissions and 'clipboard-read=()' in permissions
        report['production_permissions_policy']=permissions
        record('real-asset-build-and-mainnet-test-adapter-exclusion',manifest)
        if asset_canister:
            # The Rust harness owns this disposable network. No dfx start/stop,
            # shared network reset, external wallet or real cycles are involved.
            project=out/'dfx-project';project.mkdir()
            dfx=json.loads((ROOT/'dfx.json').read_text())
            shutil.copytree(assets,project/'.work/s14/assets')
            dfx['canisters']={'observer':dfx['canisters']['observer']}
            backend=json.loads((ROOT/'dfx.json').read_text())['canisters']['b2z']
            dfx['canisters']['b2z']={**backend,'candid':str(ROOT/backend['candid']),'wasm':os.environ['B2Z_S14_WASM']}
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
            dfx_run('canister','create','b2z','--no-wallet')
            init=project/'local-init.did'
            subprocess.run(['node','tools/prepare_s14_init.mjs','--network','pocketic-local',
                '--ledger',configuration['ledger'],'--index',configuration['index'],'--output',str(init)],cwd=ROOT,check=True,timeout=30)
            dfx_run('canister','install','b2z','--mode','install','--wasm',os.environ['B2Z_S14_WASM'],'--argument-file',str(init))
            probe=dfx_run('canister','id','b2z')
            info=dfx_run('canister','info','b2z')
            from hashlib import sha256
            assert sha256(Path(os.environ['B2Z_S14_WASM']).read_bytes()).hexdigest() in info
            deadline=time.monotonic()+15
            while True:
                status=dfx_run('canister','call','b2z','lab_status','()','--query')
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
            context=browser.new_context(permissions=['clipboard-write'],has_touch=True,viewport={'width':1440,'height':900},record_video_dir=str(out/'video'));page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            posts=[];page.on('request',lambda r:posts.append(r.url) if r.method=='POST' else None)
            def observe_genesis_before_artifact(route):
                (out/'bootstrap-anchor-read').write_text('certified genesis observed before game start\n')
                route.continue_()
            page.route('**/configuration.bin',observe_genesis_before_artifact)
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
            wait_until(page,lambda:page.locator('body').get_attribute('data-phase')=='IDLE',20000)
            assert 'Waiting for players' in page.locator('#live-status').text_content()
            page.screenshot(path=str(out/'healthy-idle.png'))
            record('certified-idle-genesis-allows-transfer-preparation')
            page.locator('#dismiss-empty').click();assert not page.locator('#empty-arena').is_visible()
            assert page.title().startswith('B2Z — Balls 2 The Wallz')
            assert page.locator('.mark').inner_text()=='B2Z'
            assert 'BTZ' not in page.locator('body').inner_text()
            record('B2Z-branding-without-legacy-player-prefix')
            page.locator('#toolbar-settings').click();page.locator('.diagnostics').evaluate('(node)=>node.open=true')
            assert page.locator('#receiving-account').text_content()==configuration['recipient']
            assert page.locator('#backend-identity').text_content()==configuration['canister_id']
            assert 'join 100000000 e8s; relocation 10000 e8s' in page.locator('#command-prices').text_content()
            assert 'Rules ' in page.locator('#rules-identity').text_content()
            record('certified-backend-receiving-account-and-price-identities')
            page.keyboard.press('Escape');page.locator('#toolbar-play').click()
            wait_until(page,lambda:not page.locator('#prepare-transfer').is_disabled(),15000)
            page.locator('#prepare-transfer').click()
            assert page.locator('#join-price').inner_text()=='1 ICP'
            assert page.locator('.hero,footer').count()==0
            assert page.locator('#payment-address').text_content()==configuration['recipient']
            page.bring_to_front()
            if asset_canister:
                assert 'clipboard-write=(self)' in response.headers.get('permissions-policy','')
                assert 'clipboard-read=()' in response.headers.get('permissions-policy','')
            # Observe arguments while still invoking native clipboard writes under
            # an actual click; do not enable clipboard reading in production.
            page.evaluate('''() => {const write=navigator.clipboard.writeText.bind(navigator.clipboard);navigator.clipboard.writeText=async text=>{await write(text);globalThis.__copiedText=text;};}''')
            for selector,expected in [('[data-copy="text"]','ANGLE 37.5'),('[data-copy="owner"]',configuration['canister_id']),('[data-copy="amount"]','1'),('[data-copy="recipient"]',configuration['recipient']),('[data-copy="hex"]','414e474c452033372e35')]:
                if 'recipient' in selector:page.locator('#transfer-controls details').evaluate('(node)=>node.open=true')
                page.locator(selector).click()
                wait_until(page,lambda:page.evaluate('globalThis.__copiedText')==expected,5000)
            page.locator('#transfer-controls details').evaluate('(node)=>node.open=false')
            record('exact-authenticated-text-and-UTF8-hex-copy')
            page.evaluate('''()=>{globalThis.__s15Timing=[];setInterval(()=>{const p=globalThis.__dtrLive?.playback;if(p&&globalThis.__s15Timing.length<1200)globalThis.__s15Timing.push({...p,resyncs:globalThis.__dtrLive.resyncs});},250);}''')
            # Real mouse geometry and pointer capture, every quadrant and non-cardinal defaults.
            pad=page.locator('#aim-pad');pad.scroll_into_view_if_needed();box=pad.bounding_box()
            import math
            for angle in [0,37.5,90,135,180,225,270,315,359.99]:
                r=math.radians(angle);page.mouse.click(box['x']+box['width']/2+70*math.cos(r),box['y']+box['height']/2+70*math.sin(r))
                assert abs(float(page.locator('#angle-degrees').input_value())-angle)<.02,(angle,page.locator('#angle-degrees').input_value(),box,pad.bounding_box())
                expected=int((round(angle*100)*65536+18000)//36000)%65536
                assert abs(int(pad.get_attribute('data-heading'))-expected)<=2
            page.mouse.move(box['x']+box['width']/2+65,box['y']+box['height']/2);page.mouse.down()
            page.mouse.move(box['x']+box['width']/2-65,box['y']+box['height']/2-65,steps=10);page.mouse.up()
            assert page.locator('#angle-degrees').input_value()=='225'
            pad.focus();page.keyboard.press('Home');page.keyboard.press('ArrowDown');assert page.locator('#angle-degrees').input_value()=='1'
            page.keyboard.press('Shift+ArrowDown');page.keyboard.press('Alt+ArrowLeft');assert page.locator('#angle-degrees').input_value()=='10.99'
            page.keyboard.press('End');page.keyboard.press('ArrowRight');assert page.locator('#angle-degrees').input_value()=='0.99'
            page.locator('#angle-degrees').fill('360');assert page.locator('#angle-degrees').input_value()=='0'
            page.locator('[data-angle="90"]').click();assert page.locator('[data-angle="90"]').get_attribute('aria-pressed')=='true'
            assert page.locator('[data-angle="0"]').get_attribute('aria-pressed')=='false'
            styles=page.locator('[data-angle]').evaluate_all('(els)=>els.map(e=>({selected:e.getAttribute("aria-pressed"),background:getComputedStyle(e).backgroundColor,disabled:e.matches(":disabled")}))')
            assert len({x['background'] for x in styles})==2 and all(not x['disabled'] for x in styles)
            # Touch input uses browser-dispatched native touch events, no gesture library.
            box=pad.bounding_box();cdp=context.new_cdp_session(page)
            for kind,points in [('touchStart',[{'x':box['x']+box['width']/2,'y':box['y']+box['height']/2-65}]),('touchMove',[{'x':box['x']+box['width']/2+65,'y':box['y']+box['height']/2}]),('touchEnd',[])]:
                cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':points})
            assert page.locator('#angle-degrees').input_value()=='0'
            page.locator('#angle-degrees').fill('37.5')
            page.locator('#prepare-transfer').click()
            record('full-circle-pointer-touch-keyboard-and-selected-styling',styles)
            for width,height in [(1440,900),(768,1024),(390,844)]:
                page.set_viewport_size({'width':width,'height':height});page.evaluate('scrollTo(0,0)')
                page.wait_for_timeout(150)
                board=page.locator('#board').bounding_box()
                assert board['y']<height*.4 and board['height']>100
                assert board['width']==width and board['height']==height
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                page.keyboard.press('Escape')
                page.screenshot(path=str(out/f'arcade-empty-{width}x{height}.png'),full_page=True)
            record('arena-fills-desktop-tablet-mobile-without-page-content')
            assert page.locator('.hero,footer').count()==0
            for name in ['play','players','rules','view','settings']:
                page.locator('#toolbar-'+name).click();page.keyboard.press('Tab')
                assert page.evaluate('document.activeElement.closest("dialog")!==null')
                page.keyboard.press('Escape');assert page.locator('#toolbar-'+name).evaluate('(e)=>document.activeElement===e')
            page.locator('#board').focus();page.keyboard.press('Home')
            page.mouse.move(190,300);anchor=page.evaluate('__b2zCamera.world(190,300)')
            page.mouse.wheel(0,-240);page.wait_for_timeout(200)
            actual=page.evaluate('__b2zCamera.world(190,300)');assert abs(actual['x']-anchor['x'])<.001 and abs(actual['y']-anchor['y'])<.001
            assert page.locator('#minimap').is_visible()
            before=page.evaluate('({x:__b2zCamera.x,y:__b2zCamera.y})')
            page.mouse.move(180,400);page.mouse.down();page.mouse.move(280,450,steps=8);page.mouse.up()
            assert page.evaluate('({x:__b2zCamera.x,y:__b2zCamera.y})')!=before
            page.locator('#minimap').click(position={'x':25,'y':25})
            page.locator('#board').focus();page.keyboard.press('Home')
            record('modal-focus-restore-anchored-zoom-pan-and-minimap')
            page.set_viewport_size({'width':1440,'height':900})

            page.locator('#toolbar-play').click()
            initial=page.evaluate('globalThis.__dtrLive.heads.at(-1) ?? -1')
            certificates=page.evaluate('globalThis.__dtrLive.certificates')
            wait_until(page,lambda:page.evaluate('globalThis.__dtrLive.certificates')>certificates,15000)
            assert page.locator('body').get_attribute('data-phase')=='IDLE'
            assert page.evaluate('globalThis.__dtrLive.heads.at(-1) ?? -1')==initial
            assert page.locator('[data-copy="text"]').is_enabled()
            assert not page.locator('#empty-arena').is_visible()
            record('fresh-idle-certificates-with-stable-publication-and-copyable-transfer')
            (out/'browser-connected').write_text('ready\n')
            wait_until(page,lambda:page.locator('#live-cannons tr').count()==1,60000)
            assert page.evaluate('globalThis.__dtrLive.heads.at(-1)')>initial
            record('first-index-payment-wakes-idle-arena')
            page.screenshot(path=str(out/'arcade-first-cannon.png'),full_page=True)
            page.locator('#action-mode').select_option('ball');page.locator('#selected-cannon').select_option('1')
            page.locator('#prepare-transfer').click()
            assert page.locator('#transfer-amount').inner_text()=='0.1 ICP'
            assert page.locator('#prepared-action').inner_text()=='Add a ball'
            (out/'browser-first-cannon-seen').write_text('certified join visible\n')
            paid=json.loads(wait_file(page,out/'harness-payments-done',120000))
            wait_until(page,lambda:page.locator('#live-receipts tr').count()>=len(paid),30000)
            page.keyboard.press('Escape');page.locator('#toolbar-players').click()
            receipts=page.locator('#live-receipts tr').evaluate_all('(rows)=>rows.map(r=>Array.from(r.cells,c=>c.textContent).join("\\t"))')
            for tx,kind in zip(paid,['Joined arena','Launched ball','Moved cannon']):
                matching=[row for row in receipts if row.split('\t')[0]==str(tx)]
                assert len(matching)==1 and 'Accepted' in matching[0] and kind in matching[0],receipts
            assert page.locator('#live-cannons tr').count()==1
            assert page.evaluate('globalThis.__dtrLive.operational?.run?.running ?? true')
            record('paid-join-ball-fallback-and-legal-move-visible-once',receipts)
            assert page.locator('#live-cannons').inner_text().find('0.4 ICP')>=0
            assert not page.locator('#empty-arena').is_visible()
            page.screenshot(path=str(out/'arcade-paid-cannon.png'),full_page=True)
            page.keyboard.press('Escape');page.locator('#toolbar-play').click()
            # A new ball changed its next price. The prepared amount must stay stable until refresh.
            assert page.locator('#transfer-amount').inner_text()=='0.1 ICP'
            assert page.locator('[data-copy="text"]').is_disabled()
            assert 'Refresh' in page.locator('#preparation-note').inner_text()
            page.locator('#prepare-transfer').click();assert page.locator('#transfer-amount').inner_text()=='0.4 ICP'
            assert page.locator('#text-memo').inner_text()=='ANGLE 37.5'
            page.locator('#action-mode').select_option('move')
            page.locator('#move-cell').select_option(index=1)
            cell=int(page.locator('#move-cell').input_value())
            page.locator('#pick-move').click()
            point=page.evaluate('(cell)=>__b2zCamera.screen(cell%16+.5,Math.floor(cell/16)+.5)',cell)
            page.mouse.click(point['x'],point['y'])
            assert page.locator('#move-cell').input_value()==str(cell)
            page.locator('#prepare-transfer').click()
            assert page.locator('#text-memo').inner_text()==f'MOVE {cell}'
            assert page.locator('#transfer-amount').inner_text()=='0.0001 ICP'
            page.screenshot(path=str(out/'s15-move-selection.png'),full_page=True)
            record('action-price-pairing-stable-card-and-visual-owned-move')
            # A publication and resize never reset local aim selection.
            page.locator('#action-mode').select_option('start');assert page.locator('#angle-degrees').input_value()=='37.5'
            record('aim-survives-certified-state-updates-and-resize')

            page.keyboard.press('Escape')
            # Inspect sustained populated motion in normal playback, rather than screenshots alone.
            trace_start=page.evaluate('performance.now()');report['recording_playback_start_ms']=trace_start;page.wait_for_timeout(45000)
            samples=page.evaluate('globalThis.__s15Timing');(out/'playback-telemetry.json').write_text(json.dumps(samples,indent=2)+'\n')
            steady=[x for x in samples if x['wall_ms']>trace_start+10000]
            if len(steady)>2:
                seconds=(steady[-1]['wall_ms']-steady[0]['wall_ms'])/1000
                report['steady_playback']={'seconds':seconds,'produced_ticks_per_second':(steady[-1]['verified_ticks']-steady[0]['verified_ticks'])/seconds,'consumed_ticks_per_second':(steady[-1]['consumed_ticks']-steady[0]['consumed_ticks'])/seconds,'stalled_samples':sum(x['phase']=='STALLED' for x in steady),'buffer_min':min(x['buffer_ticks'] for x in steady),'buffer_max':max(x['buffer_ticks'] for x in steady),'fetch_ms_max':max(x['fetch_ms'] for x in steady),'verification_ms_max':max(x['verify_ms'] for x in steady),'artifact_ms_max':max(x['artifact_ms'] for x in steady),'backend_reported_ticks_per_second':(steady[-1]['backend_segments']-steady[0]['backend_segments'])*steady[-1]['segment_ticks']/seconds,'nominal_rate':steady[-1]['nominal_rate']}
                assert report['steady_playback']['stalled_samples']==0,report['steady_playback']
            report['playback_telemetry']={'first':samples[0] if samples else None,'last':samples[-1] if samples else None,'phases':sorted(set(x['phase'] for x in samples)),'qualification':'Verified logical time retrieved versus consumed; finite bounded local observation, not a production throughput claim.'}
            page.locator('#toolbar-settings').click();page.locator('.diagnostics').evaluate('(node)=>node.open=true')
            page.locator('#network-pause').check();(out/'browser-disconnected').write_text('paused\n')
            target=int(wait_file(page,out/'harness-upgrade-ready',45000))
            wait_until(page,lambda:page.locator('#prepare-transfer').is_disabled(),20000)
            page.keyboard.press('Escape');page.locator('#toolbar-play').click()
            page.locator('#angle-degrees').fill('225');assert page.locator('#aim-preview').inner_text()=='ANGLE 225'
            assert not page.locator('#aim-pad').is_disabled()
            page.locator('#angle-degrees').fill('37.5')
            record('disconnected-local-aim-with-unavailable-payment-preparation')
            # Negative verification below also covers local aiming before authentication.
            page.keyboard.press('Escape');page.locator('#toolbar-settings').click()
            page.locator('#network-pause').uncheck()
            wait_until(page,lambda:page.evaluate('globalThis.__dtrLive.resyncs')>=1 and page.evaluate('globalThis.__dtrLive.heads.at(-1)')>=target,30000)
            heads=page.evaluate('globalThis.__dtrLive.heads.slice()');assert all(b>a for a,b in zip(heads,heads[1:])),heads
            assert page.locator('#receiving-account').text_content()==configuration['recipient']
            if asset_canister:
                page.reload(timeout=30000)
                wait_until(page,lambda:page.evaluate('Boolean(globalThis.__dtrLive?.connected)'),30000)
                assert page.locator('#receiving-account').text_content()==configuration['recipient']
                record('asset-entry-refresh-authenticates-same-backend')
            record('authenticated-reconnect-after-retention-gap-and-upgrade',heads)
            # Negative cases keep the genuine pinned-root local deployment and
            # its verifier. Only a browser-local response is damaged.
            mainnet_root=subprocess.check_output(['node','--input-type=module','-e',"import {IC_ROOT_KEY} from '@icp-sdk/core/agent'; process.stdout.write(IC_ROOT_KEY)"],cwd=ROOT,text=True).strip()
            for fault in ['unavailable-config','tampered-config','wrong-certificate-root']:
                report['current_negative_case']=fault;save()
                negative=context.new_page()
                if fault=='unavailable-config':
                    negative.route('**/configuration.bin',lambda route:route.fulfill(status=503,body='unavailable'))
                elif fault=='tampered-config':
                    damaged=bytearray((assets/'configuration.bin').read_bytes());damaged[-1]^=1
                    negative.route('**/configuration.bin',lambda route:route.fulfill(status=200,content_type='application/octet-stream',body=bytes(damaged)))
                else:
                    # Deliberately wrong *public* trust root in the explicit
                    # local-only test bundle. The production mainnet root policy
                    # is never replaced or relaxed; standard SDK crypto must fail.
                    script=(assets/'app.mjs').read_text()
                    assert configuration['root_key_hex'] in script
                    damaged_script=script.replace(configuration['root_key_hex'],mainnet_root)
                    negative.route('**/app.mjs',lambda route:route.fulfill(status=200,content_type='text/javascript',body=damaged_script))
                negative.goto(url,timeout=30000)
                try:wait_until(negative,lambda:negative.locator('body').get_attribute('data-phase')=='ERROR',30000)
                except Exception:
                    report['negative_state']=negative.evaluate("({phase:document.body.dataset.phase,error:document.querySelector('#error-text').textContent,connected:Boolean(globalThis.__dtrLive?.connected)})");save();raise
                assert negative.locator('[data-copy="recipient"]').is_disabled()
                assert not negative.locator('#angle-degrees').is_disabled()
                negative.locator('#toolbar-play').click()
                negative.locator('#angle-degrees').fill('225')
                assert negative.locator('#aim-preview').inner_text()=='ANGLE 225'
                assert negative.locator('#prepare-transfer').is_disabled()
                assert negative.locator('#live-status').inner_text()=='Disconnected'
                assert not negative.evaluate('Boolean(globalThis.__dtrLive?.connected)')
                if fault=='wrong-certificate-root':
                    message=negative.locator('#error-text').inner_text().lower()
                    assert any(word in message for word in ['certificate','signature','root','bls']),message
                negative.close()
            report.pop('current_negative_case',None)
            record('unavailable-or-unbound-configuration-and-wrong-certificate-root-fail-closed')
            reduced=browser.new_context(reduced_motion='reduce');still=reduced.new_page();still.goto(url,timeout=30000)
            wait_until(still,lambda:still.evaluate('Boolean(globalThis.__dtrLive?.connected)'),30000)
            assert still.locator('body').get_attribute('data-phase')=='PAUSED'
            wait_until(still,lambda:'Catching up' in still.locator('#live-status').inner_text(),15000)
            reduced.close();record('deployment-bundle-reduced-motion-pauses-playback')

            assert posts and all(url.endswith(('/query','/read_state')) for url in posts),posts
            record('read-only-transport-and-native-webcrypto','All observed browser POSTs are query/read_state; no signing or ledger updates.')
            assert page.evaluate("isSecureContext && typeof crypto.subtle.digest==='function'");assert not errors,errors
            page.screenshot(path=str(out/'deployment.png'),full_page=True)
            report['sandbox']=True;report['browser_version']=browser.version;report['status']='PASS';save()
            (out/'browser-complete').write_text('PASS\n');context.close();browser.close();browser=None
        return 0
    except Exception as error:
        __import__('traceback').print_exc()
        try:page.screenshot(path=str(out/'failure.png'),full_page=True)
        except Exception:pass
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
