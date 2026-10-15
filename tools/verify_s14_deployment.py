#!/usr/bin/env python3
"""Actual deployment bundle against an owned live PocketIC. No wallet/update calls.
The Rust acceptance harness owns valueless transfers, upgrade and service startup.
"""
import argparse,json,os,signal,subprocess,sys,time
from pathlib import Path
from browser_observer import wait_until,wait_file
from verify_observer_http import free_port,wait_for_server
ROOT=Path(__file__).resolve().parents[1]

def main():
    p=argparse.ArgumentParser();p.add_argument('--configuration',type=Path,required=True);p.add_argument('--gateway',required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    out=a.output.resolve();out.mkdir(parents=True,exist_ok=True);configuration=json.loads(a.configuration.read_text());port=free_port();configuration['host']=f'http://127.0.0.1:{port}'
    local=out/'local-test-policy.json';local.write_text(json.dumps(configuration)+'\n')
    report={'status':'NOT_RUN','mode':'BUILT_DEPLOYMENT_LIVE_LOCAL','checks':[],'qualification':'Explicit compile-time local-only adapter, same bundled observer/renderer/SDK verifier. Production mainnet policy unchanged.'}
    def record(name,details=''):
        report['checks'].append({'name':name,'status':'PASS','details':details});save()
    def save():(out/'results.json').write_text(json.dumps(report,indent=2)+'\n')
    def terminated(_signal,_frame):raise SystemExit(143)
    signal.signal(signal.SIGTERM,terminated)
    server=None;browser=None
    try:
        assets=out/'assets';production=out/'mainnet-assets'
        subprocess.run(['node','tools/build_observer_mainnet.mjs','--local-test-config',str(local),'--output',str(assets)],cwd=ROOT,check=True,timeout=120)
        subprocess.run(['node','tools/build_observer_mainnet.mjs','--canister',configuration['canister_id'],'--output',str(production)],cwd=ROOT,check=True,timeout=120)
        for directory in [assets,production]:
            assert {'index.html','app.mjs','configuration.bin','deployment.json','build-manifest.json','.ic-assets.json5','style.css','icon.svg'}.issubset({x.name for x in directory.iterdir()})
        manifest=json.loads((production/'build-manifest.json').read_text());assert not manifest['local_test_only'];assert not any('s14-local-deployment' in name for name in manifest['inputs'])
        record('real-asset-build-and-mainnet-test-adapter-exclusion',manifest)
        with (out/'server.log').open('w') as log:
            server=subprocess.Popen([sys.executable,'-B','tools/serve_observer.py','--port',str(port),'--deployment-assets',str(assets),'--live-config',str(a.configuration.parent),'--ic-gateway',a.gateway,'--live-canister',configuration['canister_id']],cwd=ROOT,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
        url=configuration['host']+'/';wait_for_server(url,server)
        from playwright.sync_api import sync_playwright
        with sync_playwright() as pw:
            browser=pw.chromium.launch(headless=True,chromium_sandbox=True)
            context=browser.new_context();page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            def retire_genesis_before_artifact(route):
                (out/'bootstrap-anchor-read').write_text('certified genesis observed before game start\n')
                deadline=time.monotonic()+20
                while not (out/'harness-genesis-retired').exists():
                    if time.monotonic()>deadline:raise TimeoutError('harness did not publish after genesis observation')
                    time.sleep(.05)
                route.continue_()
            page.route('**/configuration.bin',retire_genesis_before_artifact)
            page.goto(url,timeout=30000)
            wait_until(page,lambda:page.evaluate('Boolean(globalThis.__dtrLive?.connected)') or page.locator('body').get_attribute('data-phase')=='ERROR',30000)
            if page.locator('body').get_attribute('data-phase')=='ERROR':
                message=page.locator('#error-text').inner_text();page.screenshot(path=str(out/'startup-failure.png'))
                raise RuntimeError('deployed observer startup: '+message)
            assert page.evaluate('globalThis.__dtrLive.startupRetries')>=1
            record('retired-genesis-restarts-with-fresh-certified-head')
            assert page.locator('#receiving-account').inner_text()==configuration['recipient']
            assert page.locator('#backend-identity').inner_text()==configuration['canister_id']
            assert 'join 1000000000 e8s; relocation 10000 e8s' in page.locator('#command-prices').inner_text()
            assert 'Rules ' in page.locator('#rules-identity').inner_text()
            record('certified-backend-receiving-account-and-price-identities')
            initial=page.evaluate('globalThis.__dtrLive.heads.at(-1) ?? -1')
            wait_until(page,lambda:page.evaluate('globalThis.__dtrLive.heads.at(-1)') is not None and page.evaluate('globalThis.__dtrLive.heads.at(-1)')>initial,30000)
            record('fresh-publications-after-browser-connection')
            (out/'browser-connected').write_text('ready\n')
            wait_file(page,out/'harness-payments-done',100000)
            page.locator('#network-pause').check();(out/'browser-disconnected').write_text('paused\n')
            target=int(wait_file(page,out/'harness-upgrade-ready',45000))
            page.locator('#network-pause').uncheck()
            wait_until(page,lambda:page.evaluate('globalThis.__dtrLive.resyncs')>=1 and page.evaluate('globalThis.__dtrLive.heads.at(-1)')>=target,30000)
            heads=page.evaluate('globalThis.__dtrLive.heads.slice()');assert all(b>a for a,b in zip(heads,heads[1:])),heads
            assert page.locator('#receiving-account').inner_text()==configuration['recipient']
            record('authenticated-reconnect-after-retention-gap-and-upgrade',heads)
            record('read-only-transport-and-native-webcrypto','Server accepts only query/read_state; no signing or ledger update transport.')
            assert page.evaluate("isSecureContext && typeof crypto.subtle.digest==='function'");assert not errors,errors
            page.screenshot(path=str(out/'deployment.png'),full_page=True)
            report['sandbox']=True;report['browser_version']=browser.version;report['status']='PASS';save()
            (out/'browser-complete').write_text('PASS\n');browser.close();browser=None
        return 0
    except Exception as error:
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
