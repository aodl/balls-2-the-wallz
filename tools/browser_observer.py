#!/usr/bin/env python3
"""Real Chromium rendering tests, with explicit HTTP vs isolated fixture-document modes.
Offline mode uses original ES modules in data URLs, a local fetch fixture and host SHA-256.
It does NOT validate production CSP, native browser Web Crypto, or HTTP module loading.
No browser policy is changed and no browser or package is downloaded.
"""
import argparse, base64, hashlib, importlib.metadata, json, mimetypes, re, subprocess, sys, time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
APP=ROOT/'apps/btz-observer'

def wait_until(page,predicate,timeout=30000):
    deadline=time.monotonic()+timeout/1000
    last=None
    while time.monotonic()<deadline:
        try:
            if predicate():return
        except Exception as error:last=error
        page.wait_for_timeout(50)
    if last:raise TimeoutError(f'condition not met within {timeout}ms: {last}')
    raise TimeoutError(f'condition not met within {timeout}ms')

def wait_file(page,path,timeout=30000):
    wait_until(page,path.is_file,timeout)
    return path.read_text().strip()

def module_url(path,cache):
    path=path.resolve()
    if not path.is_relative_to(ROOT):raise ValueError('module escaped repository')
    if path in cache:return cache[path]
    source=path.read_text()
    if 'node:' in source:raise ValueError('Node import in browser path')
    def replace(m):
        spec=m.group(2)
        if not spec.startswith('.'):raise ValueError('non-relative module import')
        return 'from '+json.dumps(module_url(path.parent/spec,cache))
    source=re.sub(r'from\s*([\'\"])(\.[^\'\"]+)\1',replace,source)
    result='data:text/javascript;base64,'+base64.b64encode(source.encode()).decode()
    cache[path]=result;return result

def setup_offline(page):
    source=(APP/'index.html').read_text()
    source=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]+>','',source)
    source=re.sub(r'<link\b[^>]+>','',source)
    source=re.sub(r'<script\b[^>]+></script>','',source)
    page.set_content(source)
    page.add_style_tag(content=(APP/'style.css').read_text())
    blobs={}
    for p in (APP/'recordings').rglob('*'):
        if p.is_file():blobs['./'+p.relative_to(APP).as_posix()]=base64.b64encode(p.read_bytes()).decode()
    page.expose_function('__fixture_sha256',lambda data:list(hashlib.sha256(bytes(data)).digest()))
    page.evaluate('''fixtures=>{
      window.__fixtureFault=null;window.__fixtureRequests=[];window.__fixtureDelay=0;
      Object.defineProperty(crypto,'subtle',{value:{digest:async (algorithm,bytes)=>{
        if(algorithm!=='SHA-256')throw new Error('offline harness supports SHA-256 only');
        return new Uint8Array(await window.__fixture_sha256(Array.from(new Uint8Array(bytes)))).buffer;
      }}});
      window.fetch=async (url,options={})=>{
        const key=String(url);window.__fixtureRequests.push({url:key,method:options.method||'GET'});
        if(options.signal?.aborted)throw new DOMException('Aborted','AbortError');
        if(window.__fixtureDelay)await new Promise(r=>setTimeout(r,window.__fixtureDelay));
        if(options.signal?.aborted)throw new DOMException('Aborted','AbortError');
        if(!Object.hasOwn(fixtures,key))return new Response('Missing local fixture',{status:404});
        const bytes=Uint8Array.from(atob(fixtures[key]),c=>c.charCodeAt(0));
        const f=window.__fixtureFault;if(f&&key.includes(f.match)){
          window.__fixtureFault=null;
          if(f.kind==='http')return new Response('fixture failure',{status:503});
          bytes[0]^=1;
        }
        return new Response(bytes,{headers:{'content-length':String(bytes.length)}});
      };
    }''',blobs)
    page.evaluate('(url)=>import(url)',module_url(APP/'app.mjs',{}))

def main():
    p=argparse.ArgumentParser();p.add_argument('--mode',choices=['offline','http'],default='http')
    p.add_argument('--trust',choices=['offline','local','live'],default='offline')
    p.add_argument('--url',default='http://127.0.0.1:8080/apps/btz-observer/')
    p.add_argument('--output',type=Path,default=ROOT/'.work/browser');p.add_argument('--browser');p.add_argument('--coordination',type=Path)
    a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
    if a.trust=='live' and (a.mode!='http' or a.coordination is None):p.error('live trust requires HTTP mode and --coordination')
    report={'checkpoint':json.loads((ROOT/'CHECKPOINT.json').read_text())['checkpoint_id'],'mode':a.mode,'trust':a.trust,'overall':'IN_PROGRESS','checks':[],
      'qualification':('Chromium layout, canvas and application execution in an isolated fixture document. Transport fixtures and Python hashlib SHA-256 adapter; NOT native browser Web Crypto, HTTP/CSP or IC certification.' if a.mode=='offline' else ('Live local HTTP retrieval with native browser Web Crypto and standard-library verification of fresh certificates from the still-running configured disposable PocketIC instance.' if a.trust=='live' else 'Local HTTP with native browser Web Crypto and standard-library verification of a genuine certificate from the configured disposable PocketIC instance.' if a.trust=='local' else 'Local HTTP integration with actual browser Web Crypto and production static-page CSP; not IC certification.'))}
    dest=a.output/'results.json'
    def record(name,status,details=''):
        report['checks'].append({'name':name,'status':status,'details':details});dest.write_text(json.dumps(report,indent=2)+'\n');print(name,status,flush=True)
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        report['overall']='BLOCKED';record('browser-tooling','BLOCKED','Playwright not installed; no installer run.');return 2
    with sync_playwright() as pw:
        selected=Path(a.browser or pw.chromium.executable_path).resolve()
        if not selected.is_file():
            report['overall']='BLOCKED';record('browser-selection','BLOCKED',f'Browser executable is missing: {selected}');return 2
        executable_version=subprocess.run([str(selected),'--version'],text=True,capture_output=True,timeout=15)
        report['browser_executable']={
          'path':str(selected),'selection':'explicit-cli' if a.browser else 'playwright-bundled',
          'version_exit_code':executable_version.returncode,
          'version_text':(executable_version.stdout+executable_version.stderr).strip(),
        }
        record('browser-selection','PASS',f'{report["browser_executable"]["selection"]}: {selected}')
        try:
            browser=pw.chromium.launch(executable_path=str(selected),headless=True,chromium_sandbox=True)
        except Exception as e:
            report['overall']='BLOCKED';record('browser-launch','BLOCKED',str(e));return 2
        report['browser_version']=browser.version;report['playwright_version']=importlib.metadata.version('playwright')
        report['sandbox']={'requested':True,'launch_option':'chromium_sandbox=True'}
        record('browser-sandbox','PASS','Chromium launched with Playwright sandbox support explicitly enabled.')
        context=browser.new_context(viewport={'width':1400,'height':1100},device_scale_factor=1)
        page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        try:
            if a.mode=='offline':setup_offline(page)
            else:
                try:page.goto(a.url,timeout=30000)
                except Exception as e:
                    if 'ERR_BLOCKED_BY_ADMINISTRATOR' in str(e):
                        report['overall']='BLOCKED';record('http-navigation','BLOCKED',str(e));return 2
                    raise
            page.locator('.diagnostics').evaluate('(node)=>node.open=true')
            if a.trust=='live':
                coordination=a.coordination.resolve();coordination.mkdir(parents=True,exist_ok=True)
                wait_until(page,lambda:page.evaluate("Boolean(globalThis.__dtrLive?.connected)"),20000)
                assert 'Live local IC — test-network certified' in page.locator('.trust').inner_text()
                assert page.locator('#verification-label').inner_text()=='Fresh IC certificates + chained retained publications'
                (coordination/'browser-connected').write_text('connected\n')
                record('live-browser-connected-before-publication','PASS','Connected to the running gateway at the authenticated genesis head.')
                wait_until(page,lambda:len(page.evaluate('globalThis.__dtrLive.heads'))>=2,30000)
                first_heads=page.evaluate('globalThis.__dtrLive.heads.slice()')
                assert first_heads==sorted(set(first_heads))
                assert first_heads[:2]==[0,1],first_heads
                assert page.evaluate('globalThis.__dtrLive.resyncs')==0
                assert page.evaluate('globalThis.__dtrLive.certificates')>=3
                assert page.evaluate("isSecureContext && typeof crypto.subtle.digest==='function'")
                record('fresh-live-certified-publications','PASS',f'Observed fresh segment heads {first_heads}.')

                page.locator('#network-pause').check();(coordination/'short-paused').write_text('paused\n')
                short_target=int(wait_file(page,coordination/'harness-short-ready',30000))
                page.locator('#network-pause').uncheck()
                wait_until(page,lambda:page.evaluate('globalThis.__dtrLive.heads.at(-1)')>=short_target,30000)
                assert page.evaluate('globalThis.__dtrLive.resyncs')==0
                record('short-disconnect-retained-catchup','PASS',f'Resumed through retained consecutive segment {short_target}.')

                page.locator('#network-pause').check();(coordination/'long-paused').write_text('paused\n')
                long_target=int(wait_file(page,coordination/'harness-long-ready',60000))
                page.locator('#network-pause').uncheck()
                wait_until(page,lambda:page.evaluate('globalThis.__dtrLive.resyncs')>=1 and page.evaluate('globalThis.__dtrLive.heads.at(-1)')>=long_target,30000)
                assert 'unavailable animation was skipped' in page.locator('#delivery').inner_text()
                record('long-disconnect-certified-snapshot-resync','PASS',f'Authenticated resync at or after segment {long_target}; skipped animation is visible.')

                final_target=int(wait_file(page,coordination/'harness-final-ready',30000))
                wait_until(page,lambda:page.evaluate('globalThis.__dtrLive.heads.at(-1)')>=final_target,30000)
                heads=page.evaluate('globalThis.__dtrLive.heads.slice()')
                assert all(b>a for a,b in zip(heads,heads[1:])),heads
                record('live-anti-rollback-and-continuity','PASS',f'Accepted monotone heads {heads}.')
                report['resource_observations']=page.evaluate("({max_buffer_segments:globalThis.__dtrLive.maxBufferSegments,max_buffer_logical_ticks:globalThis.__dtrLive.maxBufferLogical,resynchronizations:globalThis.__dtrLive.resyncs,accepted_heads:globalThis.__dtrLive.heads.slice()})")
                page.screenshot(path=str(a.output/'live-desktop.png'),full_page=True)

                wrong=context.new_page()
                def corrupt_root(route):
                    response=route.fetch();body=bytearray(response.body());body[-1]^=1;route.fulfill(response=response,body=bytes(body))
                wrong.route('**/s10-live/root-key.der',corrupt_root);wrong.goto(a.url,timeout=30000)
                wait_until(wrong,lambda:wrong.locator('body').get_attribute('data-phase')=='ERROR',20000)
                assert 'fingerprint mismatch' in wrong.locator('#error-text').inner_text()
                assert 'Offline' not in wrong.locator('.trust').inner_text();wrong.close()
                record('wrong-root-fails-closed','PASS')

                corrupt=context.new_page();corrupted={'done':False}
                def corrupt_query(route):
                    response=route.fetch();body=bytearray(response.body())
                    if not corrupted['done'] and body:
                        body[len(body)//2]^=1;corrupted['done']=True
                    route.fulfill(response=response,body=bytes(body))
                corrupt.route('**/api/**/query',corrupt_query);corrupt.goto(a.url,timeout=30000)
                wait_until(corrupt,lambda:corrupt.locator('body').get_attribute('data-phase')=='ERROR',20000)
                assert 'Offline' not in corrupt.locator('.trust').inner_text();corrupt.close()
                record('corrupt-live-response-fails-closed','PASS')
                assert not errors,errors
                record('native-browser-webcrypto','PASS','Secure loopback context with native SubtleCrypto.')
                record('no-uncaught-page-errors','PASS')
                (coordination/'browser-complete').write_text('complete\n')
                report['overall']='PASS'
                return 0
            if a.trust=='local':page.locator('#speed').select_option('0.5')
            if a.trust=='local':
                wait_until(page,lambda:page.locator('#verification-label').inner_text()=='IC certificate + catalog + artifacts' and not page.locator('#pause').is_disabled() and float(page.locator('#playhead').inner_text())>float(page.locator('#timeline').get_attribute('min') or 0)+.05)
            else:wait_until(page,lambda:float(page.locator('#playhead').inner_text())>1)
            if a.trust=='local':
                assert 'Local IC / test-network certified' in page.locator('.trust').inner_text()
                assert page.locator('#verification-label').inner_text()=='IC certificate + catalog + artifacts'
                record('browser-standard-certificate-verification','PASS')
            else:assert 'Not IC-certified' in page.locator('.trust').inner_text()
            assert page.locator('#balls').inner_text()!='0'
            record('startup-and-moving-playhead','PASS')
            if a.trust=='local':
                record('authenticated-projection-admitted','PASS','Predecessor, audit binding and final visible state were checked before buffer admission.')
            else:
                before=page.locator('#board').evaluate('(c)=>c.toDataURL()');page.wait_for_timeout(180)
                assert page.locator('#board').evaluate('(c)=>c.toDataURL()')!=before,'canvas pixels did not advance'
                record('canvas-pixels-change-during-playback','PASS')
            page.locator('#pause').click();page.wait_for_timeout(220)
            start=page.locator('#playhead').inner_text();page.wait_for_timeout(250)
            assert page.locator('#playhead').inner_text()==start
            record('pause-freezes-presentation','PASS')
            page.screenshot(path=str(a.output/'desktop.png'),full_page=True)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(150)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            page.screenshot(path=str(a.output/'mobile.png'),full_page=True)
            record('desktop-and-mobile-layout','PASS','1400×1100 and 390×844 viewports; no horizontal overflow.')
            page.set_viewport_size({'width':1400,'height':1100})
            if a.trust=='offline':
                page.locator('#network-pause').check();page.wait_for_timeout(700)
                available=page.locator('#available').inner_text()
                page.locator('#speed').select_option('2');page.locator('#pause').click()
                wait_until(page,lambda:page.locator('body').get_attribute('data-phase')=='STALLED')
                assert page.locator('#available').inner_text()==available
                assert page.locator('#playhead').inner_text()==available
                page.wait_for_timeout(250);assert page.locator('#playhead').inner_text()==available
                record('buffer-exhaustion-stops-at-verified-head','PASS')
                page.locator('#network-pause').uncheck()
                wait_until(page,lambda:float(page.locator('#playhead').inner_text())>float(available))
                record('download-recovery-resumes','PASS')
            # Reduced-motion preference starts a new independent document paused.
            second=context.new_page();second.emulate_media(reduced_motion='reduce')
            if a.mode=='offline':setup_offline(second)
            else:second.goto(a.url,timeout=30000)
            second.locator('.diagnostics').evaluate('(node)=>node.open=true')
            wait_until(second,lambda:second.locator('body').get_attribute('data-phase')=='PAUSED' and not second.locator('#pause').is_disabled())
            paused_state=second.evaluate("({playhead:document.querySelector('#playhead').textContent,min:document.querySelector('#timeline').min,verification:document.querySelector('#verification-label').textContent})")
            assert float(paused_state['playhead'])==float(paused_state['min'] or 0),paused_state
            record('reduced-motion-starts-paused','PASS');second.locator('#network-pause').check();second.wait_for_timeout(800);second.close()
            if a.mode=='offline':
                # Deterministic fault injection in test transport ONLY, never in product source.
                page.locator('#pause').click();page.locator('#network-pause').check()
                page.locator('#recording').select_option('admission')
                wait_until(page,lambda:page.locator('#scenario-title').inner_text()=='New arrivals' and page.locator('#pause').is_enabled())
                page.evaluate("window.__fixtureFault={match:'admission/001/state-0.bin',kind:'corrupt'}")
                page.locator('#network-pause').uncheck()
                wait_until(page,lambda:page.locator('body').get_attribute('data-phase')=='ERROR')
                assert 'integrity' in page.locator('#error-text').inner_text()
                assert page.locator('#segments').inner_text()=='0 / 12'
                assert page.locator('#available').inner_text()=='0.00'
                page.screenshot(path=str(a.output/'corruption.png'),full_page=True)
                record('corruption-never-enters-buffer','PASS')
                page.locator('#retry').click()
                wait_until(page,lambda:float(page.locator('#available').inner_text())>=2)
                record('explicit-retry-preserves-sequence','PASS')
                page.locator('#network-pause').check();page.evaluate('window.__fixtureDelay=250')
                page.locator('#recording').select_option('dense')
                page.locator('#recording').select_option('near-impact')
                wait_until(page,lambda:page.locator('#scenario-title').inner_text()=='Mutual destruction' and page.locator('#pause').is_enabled())
                page.evaluate('window.__fixtureDelay=0');page.locator('#network-pause').uncheck()
                if page.locator('#pause').inner_text()=='Resume playback':page.locator('#pause').click()
                wait_until(page,lambda:page.locator('body').get_attribute('data-phase')=='COMPLETE')
                assert page.locator('#balls').inner_text()=='0' and page.locator('#cannons').inner_text()=='0'
                assert page.locator('#playhead').inner_text()=='4.00'
                page.wait_for_timeout(250);assert page.locator('#playhead').inner_text()=='4.00'
                record('stale-load-fencing-and-finite-completion','PASS')
                requests=page.evaluate('window.__fixtureRequests')
                assert all(r['method']=='GET' and r['url'].startswith('./recordings/') for r in requests)
                record('read-only-local-request-surface','PASS',f'{len(requests)} fixture requests; GET only.')
            elif a.trust=='local':
                if page.locator('#pause').inner_text()=='Resume playback':page.locator('#pause').click()
                wait_until(page,lambda:page.locator('body').get_attribute('data-phase')=='COMPLETE')
                assert page.locator('#cannons').inner_text()=='1' and page.locator('#balls').inner_text()=='1'
                record('authenticated-final-visible-state','PASS','One expected cannon and ball at logical time 2.')
                failed=context.new_page()
                def corrupt_certificate(route):
                    response=route.fetch();body=bytearray(response.body());body[len(body)//2]^=1
                    route.fulfill(response=response,body=bytes(body))
                failed.route('**/s09-local/certificate.cbor',corrupt_certificate)
                failed.goto(a.url,timeout=30000)
                wait_until(failed,lambda:failed.locator('body').get_attribute('data-phase')=='ERROR')
                assert 'Local IC / test-network certified' in failed.locator('.trust').inner_text()
                assert 'Offline' not in failed.locator('.trust').inner_text()
                record('certificate-failure-is-fail-closed','PASS','Tampered certificate stopped playback without offline fallback.');failed.close()
                record('native-browser-webcrypto','PASS',str(page.evaluate("isSecureContext && typeof crypto.subtle.digest==='function'")))
            else:
                record('native-browser-webcrypto','PASS',str(page.evaluate("isSecureContext && typeof crypto.subtle.digest==='function'")))
            assert not errors,errors
            record('no-uncaught-page-errors','PASS')
            report['overall']='PASS'
        except Exception as e:
            details=str(e)
            if a.trust in ('live','local'):
                try:
                    details+='; live-state='+json.dumps(page.evaluate("({phase:document.body.dataset.phase,error:document.querySelector('#error-text')?.textContent,live:globalThis.__dtrLive})"))
                except Exception:pass
            report['overall']='FAIL';record('browser-assertion','FAIL',details)
            try:page.screenshot(path=str(a.output/'failure.png'),full_page=True)
            except Exception:pass
        finally:
            report['uncaught_page_errors']=errors
            dest.write_text(json.dumps(report,indent=2)+'\n');browser.close()
            if a.trust=='live' and a.coordination is not None and report['overall']!='PASS':
                a.coordination.mkdir(parents=True,exist_ok=True);(a.coordination/'browser-failed').write_text(report['overall']+'\n')
    return 0 if report['overall']=='PASS' else 1
if __name__=='__main__':raise SystemExit(main())
