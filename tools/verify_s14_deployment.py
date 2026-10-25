#!/usr/bin/env python3
"""Actual deployment bundle against an owned live PocketIC. No wallet/update calls.
The Rust acceptance harness owns valueless transfers, upgrade and service startup.
"""
import argparse,json,os,shutil,signal,subprocess,sys,time
from pathlib import Path
from browser_observer import wait_until,wait_file,open_settings,close_settings
from verify_observer_http import free_port,wait_for_server
ROOT=Path(__file__).resolve().parents[1]

def verify_torus_scene(page,context,out,record,report,save):
    (out/'browser-scene-ready').write_text('certified genesis visible\n')
    page.locator('#toolbar-play').click()
    wait_until(page,lambda:not page.locator('#prepare-transfer').is_disabled(),30000)
    assert '32 × 32' in page.locator('#world-rules').text_content()
    assert 'wraparound' in page.locator('#world-rules').text_content()
    page.locator('#action-mode').select_option('ball');page.locator('#selected-cannon').select_option('1');page.locator('#prepare-transfer').click()
    assert page.locator('#transfer-amount').inner_text()=='0.4 ICP'
    page.locator('#angle-degrees').fill('225');assert page.locator('#aim-preview').inner_text()=='ANGLE 225'
    page.locator('#action-mode').select_option('move');page.locator('#move-cell').select_option('0');page.locator('#pick-move').click()
    page.evaluate('()=>{__b2zCamera.fit();__b2zCamera.zoom(4);__b2zCamera.centre(31.8,31.8);}')
    point=page.evaluate('__b2zCamera.screen(32.5,32.5)');page.mouse.click(point['x'],point['y'])
    assert page.locator('#play-dialog').evaluate('(d)=>d.open')
    assert page.locator('#move-cell').input_value()=='0';page.locator('#prepare-transfer').click();assert page.locator('#text-memo').inner_text()=='MOVE 0'
    page.keyboard.press('Escape');assert page.locator('#minimap').is_visible();assert page.evaluate('__b2zCamera.minimapRects().length')==4
    page.screenshot(path=str(out/'torus-seam-move.png'));record('corner-seam-camera-hit-test-prepares-the-underlying-cell-once')
    # Native touch pan and pinch, preserving the numeric aim alternative.
    cdp=context.new_cdp_session(page);old=page.evaluate('__b2zCamera.scale')
    for kind,points in [('touchStart',[{'x':350,'y':350},{'x':550,'y':350}]),('touchMove',[{'x':300,'y':350},{'x':600,'y':350}]),('touchEnd',[])]:cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':points})
    assert page.evaluate('__b2zCamera.scale')>old
    page.locator('#board').focus();page.keyboard.press('Home')
    for w,h in[(1440,900),(768,1024),(390,844)]:
        page.set_viewport_size({'width':w,'height':h});page.locator('#board').focus();page.keyboard.press('Home');page.wait_for_timeout(100);r=page.locator('#board').bounding_box();assert r['width']==w and r['height']==h;page.screenshot(path=str(out/f'torus-{w}.png'))
    page.set_viewport_size({'width':1440,'height':900});page.locator('#board').focus();page.keyboard.press('Home')
    try:
        wait_until(page,lambda:page.locator('body').get_attribute('data-phase')in['PLAYING','DEGRADED_BUFFER'],60000)
    except Exception:
        report['epoch_failure_state']=page.evaluate('''() => ({phase:document.body.dataset.phase,live:globalThis.__dtrLive,error:document.querySelector('#error-text').textContent,service:document.querySelector('#service-status').textContent})''')
        save();page.screenshot(path=str(out/'epoch-playback-failure.png'));raise
    samples=[];start=time.monotonic();report['recording_playback_start_ms']=page.evaluate('performance.now()')
    while time.monotonic()-start<90:samples.append(page.evaluate('({...__dtrLive.playback,resyncs:__dtrLive.resyncs})'));page.wait_for_timeout(500)
    dt=(samples[-1]['wall_ms']-samples[0]['wall_ms'])/1000
    report['scene']={'qualification':'Staged 32x32 torus on a genuine disposable IC; synthetic populated genesis, no real funds or mainnet transition','seconds':dt,'verified_ticks_per_second':(samples[-1]['admitted_ticks']-samples[0]['admitted_ticks'])/dt,'displayed_ticks_per_second':(samples[-1]['played_ticks']-samples[0]['played_ticks'])/dt,'stalled_samples':sum(x['phase']=='STALLED'for x in samples),'nominal_rate':samples[-1]['nominal_rate']}
    report['scene']['backend_ticks_per_second']=(samples[-1]['backend_segments']-samples[0]['backend_segments'])*samples[-1]['segment_ticks']/dt
    report['scene']['resyncs']=samples[-1]['resyncs']-samples[0]['resyncs']
    report['scene']['queue_segments']={'min':min(x['queue_segments'] for x in samples),'max':max(x['queue_segments'] for x in samples)}
    report['scene']['buffer_ticks']={'min':min(x['buffer_ticks'] for x in samples),'max':max(x['buffer_ticks'] for x in samples)}
    report['scene']['latency_ms']={key:{'median':sorted(x[key] for x in samples)[len(samples)//2],'max':max(x[key] for x in samples)} for key in ['fetch_ms','verify_ms','artifact_ms','derive_ms','catchup_ms']}
    report['scene']['max_catchup_segments']=max(x['catchup_segments'] for x in samples)
    report['scene']['latency_qualification']='Frame-sampled last-operation durations. Atomic observation query includes artifact network delivery; artifact_ms normally measures cached bundle validation, and includes a network query for retained bundles.'
    report['scene']['timestamp_qualification']='Certificate timestamps authenticate the current root, not publication creation time. Backend capture records first-observed replica timestamps with a two-second polling bound.'
    (out/'scene-telemetry.json').write_text(json.dumps(samples,indent=2));save()
    assert report['scene']['stalled_samples']==0,report['scene']
    assert report['scene']['nominal_rate']==1,report['scene']
    for key in ['backend_ticks_per_second','verified_ticks_per_second','displayed_ticks_per_second']:
        assert .9<=report['scene'][key]<=1.15,(key,report['scene'])
    assert report['scene']['resyncs']==0,report['scene']
    record('populated-torus-sustained-authenticated-normal-playback',report['scene'])
    # A modal cannot pause the shared backend.
    page.locator('#toolbar-rules').click();before=samples[-1]['backend_segments'];page.wait_for_timeout(6000);assert page.evaluate('__dtrLive.playback.backend_segments')>before;page.keyboard.press('Escape')
    record('native-dialogs-do-not-pause-shared-gameplay')

def verify_million_scene(page,context,out,record,report,save,stop_capture,sustained=False):
    (out/'browser-million-ready').write_text('certified million-cell genesis visible; begin production\n')
    assert '1,000 × 1,000' in page.locator('#world-rules').text_content()
    assert 'wraparound' in page.locator('#world-rules').text_content()
    page.locator('#toolbar-play').click()
    wait_until(page,lambda:not page.locator('#prepare-transfer').is_disabled(),30000)
    page.locator('#action-mode').select_option('move');page.locator('#selected-cannon').select_option('1')
    # The selector is intentionally sparse; exact camera picking adds one
    # authenticated owned cell instead of constructing 1,000,000 DOM options.
    assert page.locator('#move-cell option').count()<=2
    page.locator('#pick-move').click()
    page.evaluate('()=>{__b2zCamera.fit();__b2zCamera.zoom(4);__b2zCamera.centre(999.8,999.8);}')
    point=page.evaluate('__b2zCamera.screen(1000.5,1000.5)');page.mouse.click(point['x'],point['y'])
    assert page.locator('#move-cell').input_value()=='0'
    page.locator('#prepare-transfer').click();assert page.locator('#text-memo').inner_text()=='MOVE 0'
    page.keyboard.press('Escape');assert page.locator('#minimap').is_visible();assert page.evaluate('__b2zCamera.minimapRects().length')==4
    page.screenshot(path=str(out/'million-seam-pick.png'))
    record('million-cell-culling-seam-picking-and-sparse-move-selector')
    page.locator('#board').focus();page.keyboard.press('Home')
    page.evaluate('''limit=>{globalThis.__millionTiming=[];setInterval(()=>{const p=globalThis.__dtrLive?.playback;if(p&&__millionTiming.length<limit)__millionTiming.push({...p,wall_epoch_ms:performance.timeOrigin+p.wall_ms,resyncs:__dtrLive.resyncs});},250);}''',6400 if sustained else 2400)
    (out/'browser-million-drive').write_text('begin explicit disposable-IC clock progression\n')
    try:wait_until(page,lambda:page.locator('body').get_attribute('data-phase')in['PLAYING','DEGRADED_BUFFER'],60000)
    except Exception:
        (out/'million-startup-telemetry.json').write_text(json.dumps(page.evaluate('globalThis.__millionTiming'),indent=2))
        report['million_startup_failure']=page.evaluate('''() => ({phase:document.body.dataset.phase,live:globalThis.__dtrLive,error:document.querySelector('#error-text').textContent,service:document.querySelector('#service-status').textContent,arena:document.querySelector('#arena-note').textContent})''')
        save();page.screenshot(path=str(out/'million-startup-failure.png'));raise
    def measure_mode(name,seconds,lower,upper,continuous=False):
        rows=[];began=time.monotonic()
        while time.monotonic()-began<seconds or continuous and rows and rows[-1]['wall_epoch_ms']-rows[0]['wall_epoch_ms']<seconds*1000:
            rows.append(page.evaluate('({...__dtrLive.playback,wall_epoch_ms:performance.timeOrigin+__dtrLive.playback.wall_ms,resyncs:__dtrLive.resyncs,certificates:__dtrLive.certificates})'))
            if continuous and len(rows)%20==0:
                (out/('million-'+name+'-telemetry.json')).write_text(json.dumps(rows,indent=2))
                (out/'sustained-progress.json').write_text(json.dumps({'elapsed':time.monotonic()-began,'first':rows[0],'latest':rows[-1]},indent=2))
            page.wait_for_timeout(500)
        dt=(rows[-1]['wall_ms']-rows[0]['wall_ms'])/1000
        result={'seconds':dt,'backend_ticks_per_second':(rows[-1]['backend_segments']-rows[0]['backend_segments'])*rows[-1]['segment_ticks']/dt,'admitted_ticks_per_second':(rows[-1]['admitted_ticks']-rows[0]['admitted_ticks'])/dt,'displayed_ticks_per_second':(rows[-1]['played_ticks']-rows[0]['played_ticks'])/dt,'stalled_samples':sum(x['phase']=='STALLED' for x in rows),'resyncs':rows[-1]['resyncs']-rows[0]['resyncs'],'nominal_rate':rows[-1]['nominal_rate'],'performance_limited':any(x['performance_limited'] for x in rows),'queue_segments':{'min':min(x['queue_segments'] for x in rows),'max':max(x['queue_segments'] for x in rows)},'buffer_ticks':{'min':min(x['buffer_ticks'] for x in rows),'max':max(x['buffer_ticks'] for x in rows)},'latency_ms':{k:{'median':sorted(x[k] for x in rows)[len(rows)//2],'max':max(x[k] for x in rows)} for k in ['fetch_ms','verify_ms','artifact_ms','derive_ms','catchup_ms']},'max_catchup_segments':max(x['catchup_segments'] for x in rows),'buffer_bytes':{'min':min(x['buffer_bytes'] for x in rows),'max':max(x['buffer_bytes'] for x in rows)},'buffer_target_ticks':{'min':min(x['buffer_target_ticks'] for x in rows),'max':max(x['buffer_target_ticks'] for x in rows)},'distinct_playheads':len({round(x['played_ticks'],3) for x in rows}),'certified_publications_per_second':(rows[-1]['admitted_ticks']-rows[0]['admitted_ticks'])/dt,'authenticated_observation_queries_per_second':(rows[-1]['certificates']-rows[0]['certificates'])/dt,'timing_qualification':'Frame-sampled last-operation durations. Atomic fetch includes current artifacts; certificate time is not publication creation time. Backend progress uses controller counts; admitted/played counters exclude resync jumps.'}
        result.update(buffer_start=rows[0]['buffer_ticks'],buffer_end=rows[-1]['buffer_ticks'],
                      admitted_ticks=rows[-1]['admitted_ticks']-rows[0]['admitted_ticks'],
                      displayed_ticks=rows[-1]['played_ticks']-rows[0]['played_ticks'],
                      phase_samples={p:sum(x['phase']==p for x in rows) for p in sorted({x['phase'] for x in rows})})
        report['million_'+name+'_playback']=result;(out/('million-'+name+'-telemetry.json')).write_text(json.dumps(rows,indent=2));save()
        if continuous:
            # Wait only for a subsequent independent poll to bracket the fixed
            # endpoint. The 900-second measurement is neither trimmed nor reset.
            page.wait_for_timeout(4000)
            from playback_qualification import continuous_summary
            summary,aligned=continuous_summary(rows,json.loads((out/'publication-timing.json').read_text()))
            dense=page.evaluate('globalThis.__millionTiming')
            (out/'million-all-telemetry.json').write_text(json.dumps(dense,indent=2))
            dense=[r for r in dense if rows[0]['wall_epoch_ms']<=r['wall_epoch_ms']<=rows[-1]['wall_epoch_ms']]
            summary['dense_phase_samples']={p:sum(r['phase']==p for r in dense) for p in sorted({r['phase'] for r in dense})}
            if any(r['phase'] not in ['PLAYING','DEGRADED_BUFFER'] for r in dense):
                summary['checks']['no_stall_or_rebuffer']=False;summary['status']='FAIL'
            report['million_sustained_analysis']=summary
            (out/'million-sustained-aligned.json').write_text(json.dumps(aligned,indent=2))
            (out/'million-sustained-analysis.json').write_text(json.dumps(summary,indent=2));save()
            if summary['status']=='PASS':record('million-cell-continuous-15-minute-normal',summary)
            else:report['checks'].append({'name':'million-cell-continuous-15-minute-normal','status':'FAIL','details':summary});save()
            return result
        assert result['stalled_samples']==0 and result['resyncs']==0,result
        assert result['queue_segments']['max']<=24 and result['buffer_bytes']['max']<=8*1024*1024,result
        if name=='lifeline':assert result['distinct_playheads']>=60,result
        assert not result['performance_limited'],result
        for key in ['backend_ticks_per_second','admitted_ticks_per_second','displayed_ticks_per_second']:assert lower<=result[key]<=upper,(key,result)
        record('million-cell-'+name+'-certified-playback',result)
        return result
    measure_mode('normal',90,.9,1.15)
    if sustained:measure_mode('normal_sustained',900,.9,1.15,continuous=True)
    (out/'browser-million-normal-complete').write_text('normal playback measured\n')
    wait_until(page,lambda:page.evaluate('__dtrLive.playback.target_rate')==.5,30000);page.wait_for_timeout(4000)
    # The normal-to-hooks code upgrade may hold an in-flight query. Bound the
    # recovery before measuring steady Economy, so old Normal publications do
    # not count as newly produced Economy ticks. Keep all throughput bounds.
    wait_until(page,lambda:page.evaluate('''()=>{const p=__dtrLive.playback;return p.phase==='PLAYING'&&p.verified_ticks>=p.backend_segments*p.segment_ticks-2;}'''),30000)
    measure_mode('economy',40,.4,.6)
    (out/'browser-million-economy-complete').write_text('economy playback measured\n')
    wait_until(page,lambda:'Lifeline' in page.locator('#arena-note').text_content(),30000)
    wait_until(page,lambda:page.evaluate('__dtrLive.playback.target_rate')==.05,30000);page.wait_for_timeout(4000)
    measure_mode('lifeline',50,.035,.065)
    stop_capture()
    page.reload();wait_until(page,lambda:page.evaluate('Boolean(__dtrLive?.connected)') and '1,000 × 1,000' in page.locator('#world-rules').text_content(),30000)
    assert not page.locator('#error').is_visible()
    wait_until(page,lambda:page.locator('body').get_attribute('data-phase')=='PLAYING',60000)
    assert page.evaluate('__dtrLive.playback.nominal_rate')==.05
    record('million-cell-cold-browser-reconnect')
    if sustained:
        cold=measure_mode('lifeline_reconnect',120,.035,.065)
        assert cold['admitted_ticks']>=5 and set(cold['phase_samples'])<= {'PLAYING','DEGRADED_BUFFER'},cold
        record('million-cell-cold-lifeline-five-subsequent-publications',cold)
        assert report['million_sustained_analysis']['status']=='PASS',report['million_sustained_analysis']

def verify_epoch_transition(page,context,out,record,report,save):
    wait_until(page,lambda:'16 × 8' in page.locator('#world-rules').text_content(),30000)
    page.locator('#toolbar-play').click()
    wait_until(page,lambda:not page.locator('#prepare-transfer').is_disabled(),30000)
    page.locator('#action-mode').select_option('move');page.locator('#selected-cannon').select_option('1')
    cells=page.locator('#move-cell option').evaluate_all('(xs)=>xs.map(x=>x.value).filter(Boolean)');assert cells
    old_cell=int(cells[0]);page.locator('#move-cell').select_option(str(old_cell));page.locator('#prepare-transfer').click()
    assert page.locator('#text-memo').inner_text()==f'MOVE {old_cell}'
    assert page.locator('#payment-address').text_content()==report['receiving_account']
    page.keyboard.press('Escape')
    reconnect=context.new_page();reconnect.goto(page.url,timeout=30000)
    wait_until(reconnect,lambda:reconnect.evaluate('Boolean(globalThis.__dtrLive?.connected)') and '16 × 8' in reconnect.locator('#world-rules').text_content(),30000)
    reconnect.locator('#toolbar-settings').click();reconnect.locator('.diagnostics').evaluate('(node)=>node.open=true');reconnect.locator('#network-pause').check();reconnect.keyboard.press('Escape')
    old_head=reconnect.evaluate('globalThis.__dtrLive.heads.at(-1)')
    page.bring_to_front();(out/'browser-transition-ready').write_text('verified old-world MOVE prepared\n')
    wait_until(page,lambda:'World transition' in page.locator('#arena-note').text_content(),30000)
    page.locator('#toolbar-play').click();assert page.locator('#prepare-transfer').is_disabled();assert page.locator('#transfer-controls').evaluate('(node)=>node.disabled');assert page.locator('[data-copy="text"]').is_disabled()
    page.keyboard.press('Escape');(out/'browser-fence-seen').write_text('payment preparation held\n')
    wait_until(page,lambda:'32 × 32' in page.locator('#world-rules').text_content(),60000)
    assert 'wraparound' in page.locator('#world-rules').text_content()
    page.locator('#toolbar-play').click()
    wait_until(page,lambda:'Refresh' in page.locator('#preparation-note').inner_text(),30000)
    assert page.locator('#transfer-controls').evaluate('(node)=>node.disabled');assert page.locator('[data-copy="text"]').is_disabled()
    assert 'Refresh' in page.locator('#preparation-note').inner_text()
    assert page.locator('#text-memo').inner_text()==f'MOVE {old_cell}'
    mapped=(old_cell//16+12)*32+old_cell%16+8
    page.locator('#move-cell').select_option(str(mapped));wait_until(page,lambda:not page.locator('#prepare-transfer').is_disabled(),30000);page.locator('#prepare-transfer').click()
    assert page.locator('#text-memo').inner_text()==f'MOVE {mapped}'
    assert page.locator('#transfer-amount').inner_text()=='0.0001 ICP'
    page.evaluate('''() => {const write=navigator.clipboard.writeText.bind(navigator.clipboard);navigator.clipboard.writeText=async text=>{await write(text);globalThis.__copiedText=text;};}''')
    page.locator('[data-copy="text"]').click();wait_until(page,lambda:page.evaluate('globalThis.__copiedText')==f'MOVE {mapped}')
    # The advanced details remain ordinary visible UI; select their summary if necessary.
    hex_copy=page.locator('[data-copy="hex"]')
    if not hex_copy.is_visible():page.locator('details').filter(has=hex_copy).locator('summary').click()
    hex_copy.click();wait_until(page,lambda:page.evaluate('globalThis.__copiedText')==f'MOVE {mapped}'.encode().hex())
    page.keyboard.press('Escape');page.screenshot(path=str(out/'transition-desktop.png'))
    for w,h in[(768,1024),(390,844)]:
        page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(150);r=page.locator('#board').bounding_box();assert r['width']==w and r['height']==h;page.screenshot(path=str(out/f'transition-{w}.png'))
    page.set_viewport_size({'width':1440,'height':900})
    wait_until(page,lambda:page.locator('body').get_attribute('data-phase')in['PLAYING','DEGRADED_BUFFER'],60000)
    # Reload after several new-epoch publications: fresh startup must not need a
    # retained old artifact or a remembered browser-only transition/orientation.
    samples=[];began=time.monotonic()
    while time.monotonic()-began<20:
        samples.append(page.evaluate('({...__dtrLive.playback,resyncs:__dtrLive.resyncs})'));page.wait_for_timeout(500)
    dt=(samples[-1]['wall_ms']-samples[0]['wall_ms'])/1000
    report['epoch_playback']={'seconds':dt,'verified_ticks_per_second':(samples[-1]['admitted_ticks']-samples[0]['admitted_ticks'])/dt,'displayed_ticks_per_second':(samples[-1]['played_ticks']-samples[0]['played_ticks'])/dt,'stalled_samples':sum(x['phase']=='STALLED' for x in samples),'nominal_rate':samples[-1]['nominal_rate'],'qualification':'One-ball authenticated v7 epoch on local IC wall time'}
    (out/'epoch-telemetry.json').write_text(json.dumps(samples,indent=2));assert report['epoch_playback']['stalled_samples']==0,report['epoch_playback'];assert samples[-1]['backend_segments']>samples[0]['backend_segments']
    record('new-epoch-continuous-verified-playback',report['epoch_playback'])
    # Prove a real gap beyond the sixteen-publication window before reconnecting.
    wait_until(page,lambda:page.evaluate('globalThis.__dtrLive.heads.at(-1)')>=old_head+17,90000)
    reconnect.bring_to_front();reconnect.locator('#toolbar-settings').click();reconnect.locator('#network-pause').uncheck();reconnect.keyboard.press('Escape')
    wait_until(reconnect,lambda:reconnect.evaluate('globalThis.__dtrLive.resyncs')>=1 and '32 × 32' in reconnect.locator('#world-rules').text_content(),30000)
    new_head=reconnect.evaluate('globalThis.__dtrLive.heads.at(-1)');assert new_head>=old_head+4,(old_head,new_head)
    assert not reconnect.locator('#error').is_visible();reconnect.close();page.bring_to_front()
    record('old-session-reconnects-across-epoch-after-retained-history-gap',{'old_head':old_head,'new_head':new_head})
    page.reload();wait_until(page,lambda:page.evaluate('Boolean(__dtrLive?.connected)') and '32 × 32' in page.locator('#world-rules').text_content(),30000)
    assert not page.locator('#error').is_visible()
    report['epoch_transition']={'old_cell':old_cell,'mapped_cell':mapped,'old_draft_stale':True,'reload_new_epoch':True,'qualification':'Genuine disposable IC; synthetic v3 player fixture. Real Ledger/Index paid cutover is verified separately.'}
    record('authenticated-epoch-crossing-stales-old-MOVE-and-restores-new-world',report['epoch_transition'])


def main():
    p=argparse.ArgumentParser();p.add_argument('--scene-only',action='store_true');p.add_argument('--million-scene-only',action='store_true');p.add_argument('--million-sustained',action='store_true');p.add_argument('--transition-only',action='store_true');p.add_argument('--configuration',type=Path,required=True);p.add_argument('--gateway',required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    if a.million_sustained and not a.million_scene_only:p.error('--million-sustained requires --million-scene-only')
    out=a.output.resolve();out.mkdir(parents=True,exist_ok=True);configuration=json.loads(a.configuration.read_text());port=free_port()
    asset_canister=os.environ.get('S14_ASSET_CANISTER')=='1'
    configuration['host']=a.gateway.rstrip('/') if asset_canister else f'http://127.0.0.1:{port}'
    local=out/'local-test-policy.json';local.write_text(json.dumps(configuration)+'\n')
    report={'receiving_account':configuration['recipient'],'status':'NOT_RUN','mode':'DFX_ASSET_CANISTER_LIVE_LOCAL' if asset_canister else 'BUILT_DEPLOYMENT_LIVE_LOCAL','checks':[],'qualification':'Explicit compile-time local-only adapter, same bundled observer/renderer/SDK verifier. Production mainnet policy unchanged.'}
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
            wire_packets=[];wire_errors=[];wire_bytes=0;wire_complete_through=None;query_timings=[]
            if a.million_scene_only:
                wire=out/'wire-catalogs';wire.mkdir()
                def capture_catalog(response):
                    nonlocal wire_bytes
                    request=response.request
                    if request.method!='POST' or not request.url.endswith('/query'):return
                    body=request.post_data_buffer or b''
                    method=next((name for name in ['observation_bundle','retained_publication','observation'] if name.encode() in body),None)
                    if not method:return
                    try:
                        data=response.body()
                        if len(wire_packets)>=(4096 if a.million_sustained else 1024) or wire_bytes+len(data)>(128 if a.million_sustained else 64)*1024*1024:raise ValueError('wire capture bound')
                        name=f'{len(wire_packets):04}.cbor';(wire/name).write_bytes(data);wire_bytes+=len(data)
                        wire_packets.append({'method':method,'file':name,'status':response.status,'timing':request.timing})
                    except Exception as error:wire_errors.append(str(error))
                page.on('response',capture_catalog)
                def capture_query_timing(request):
                    if request.method!='POST' or not request.url.endswith('/query'):return
                    body=request.post_data_buffer or b''
                    method=next((name for name in ['observation_bundle','retained_publication','artifact_bundle','lab_status','observation'] if name.encode() in body),None)
                    if method and len(query_timings)<(8192 if a.million_sustained else 4096):query_timings.append({'method':method,'timing':request.timing})
                page.on('requestfinished',capture_query_timing)
                def stop_wire_capture():
                    nonlocal wire_complete_through
                    wire_complete_through=page.evaluate('globalThis.__dtrLive.heads.at(-1)')
                    page.remove_listener('response',capture_catalog)

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
            if a.scene_only or a.million_scene_only or a.transition_only:
                if a.transition_only:verify_epoch_transition(page,context,out,record,report,save)
                elif a.million_scene_only:verify_million_scene(page,context,out,record,report,save,stop_wire_capture,a.million_sustained)
                else:verify_torus_scene(page,context,out,record,report,save)
                assert not errors,errors
                assert posts and all(x.endswith(('/query','/read_state')) for x in posts)
                report['status']='PASS';report['sandbox']=True;report['page_errors']=errors;save();(out/'browser-complete').write_text('PASS\n');context.close();browser.close();browser=None;return 0
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
            first_tx=wait_file(page,out/'harness-first-payment',30000)
            receipt_seen=lambda tx:page.locator('#live-receipts tr').evaluate_all('(rows,id)=>rows.some(r=>r.cells[0].textContent===id)',str(tx))
            wait_until(page,lambda:receipt_seen(first_tx),60000)
            (out/'browser-first-receipt-seen').write_text('first authenticated receipt observed\n')
            wait_until(page,lambda:not page.locator('#prepare-transfer').is_disabled(),30000)
            report['receipt_coordination']='Controller holds each paid setup publication until its receipt is authenticated; replica and certificates stay live. All holds end before measured playback/reconnect. Retention and full seal replay are unchanged.'
            record('first-index-payment-wakes-idle-arena')
            page.screenshot(path=str(out/'arcade-first-cannon.png'),full_page=True)
            page.locator('#action-mode').select_option('ball');page.locator('#selected-cannon').select_option('1')
            page.locator('#prepare-transfer').click()
            assert page.locator('#transfer-amount').inner_text()=='0.1 ICP'
            assert page.locator('#prepared-action').inner_text()=='Add a ball'
            (out/'browser-first-cannon-seen').write_text('certified join visible\n')
            second_tx=wait_file(page,out/'harness-second-payment',120000)
            wait_until(page,lambda:receipt_seen(second_tx),60000)
            (out/'browser-second-receipt-seen').write_text('second authenticated receipt observed\n')
            paid=json.loads(wait_file(page,out/'harness-payments-done',120000))
            wait_until(page,lambda:page.locator('#live-receipts tr').count()>=len(paid),30000)
            page.keyboard.press('Escape');page.locator('#toolbar-players').click()
            receipts=page.locator('#live-receipts tr').evaluate_all('(rows)=>rows.map(r=>Array.from(r.cells,c=>c.textContent).join("\\t"))')
            for tx,kind in zip(paid,['Joined arena','Launched ball','Moved cannon']):
                matching=[row for row in receipts if row.split('\t')[0]==str(tx)]
                assert len(matching)==1 and 'Accepted' in matching[0] and kind in matching[0],receipts
            assert page.locator('#live-cannons tr').count()==1
            (out/'browser-paid-receipts-seen').write_text('all three authenticated outcomes observed\n')
            page.keyboard.press('Escape');page.locator('#toolbar-play').click()
            wait_until(page,lambda:not page.locator('#prepare-transfer').is_disabled(),30000)
            page.keyboard.press('Escape');page.locator('#toolbar-players').click()
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
            # Receipt setup deliberately holds production at authenticated outcomes.
            # Start the continuous-motion measurement from a fresh certified anchor
            # after those holds, through the same restart control available to users.
            page.evaluate('globalThis.__beforeSteadyLive=globalThis.__dtrLive')
            open_settings(page);page.locator('#restart').click()
            wait_until(page,lambda:page.evaluate('Boolean(globalThis.__dtrLive?.connected && globalThis.__dtrLive !== globalThis.__beforeSteadyLive)'),30000)
            assert page.locator('#receiving-account').text_content()==configuration['recipient']
            assert page.locator('#angle-degrees').input_value()=='37.5'
            close_settings(page)
            report['steady_setup']='Fresh certified restart after controlled receipt holds; ordinary production remains running throughout the trace and reconnect.'
            # Inspect sustained populated motion in normal playback, rather than screenshots alone.
            wait_until(page,lambda:page.locator('body').get_attribute('data-phase')in['PLAYING','DEGRADED_BUFFER'],60000)
            trace_start=page.evaluate('performance.now()');report['recording_playback_start_ms']=trace_start;page.wait_for_timeout(45000)
            samples=page.evaluate('globalThis.__s15Timing');(out/'playback-telemetry.json').write_text(json.dumps(samples,indent=2)+'\n')
            steady=[x for x in samples if x['wall_ms']>trace_start+10000]
            if len(steady)>2:
                seconds=(steady[-1]['wall_ms']-steady[0]['wall_ms'])/1000
                report['steady_playback']={'seconds':seconds,'produced_ticks_per_second':(steady[-1]['admitted_ticks']-steady[0]['admitted_ticks'])/seconds,'consumed_ticks_per_second':(steady[-1]['played_ticks']-steady[0]['played_ticks'])/seconds,'stalled_samples':sum(x['phase']=='STALLED' for x in steady),'buffer_min':min(x['buffer_ticks'] for x in steady),'buffer_max':max(x['buffer_ticks'] for x in steady),'fetch_ms_max':max(x['fetch_ms'] for x in steady),'verification_ms_max':max(x['verify_ms'] for x in steady),'artifact_ms_max':max(x['artifact_ms'] for x in steady),'backend_reported_ticks_per_second':(steady[-1]['backend_segments']-steady[0]['backend_segments'])*steady[-1]['segment_ticks']/seconds,'nominal_rate':steady[-1]['nominal_rate']}
                assert report['steady_playback']['stalled_samples']==0,report['steady_playback']
                assert report['steady_playback']['nominal_rate']==1,report['steady_playback']
                for key in ['produced_ticks_per_second','consumed_ticks_per_second','backend_reported_ticks_per_second']:
                    assert .9<=report['steady_playback'][key]<=1.15,(key,report['steady_playback'])
                assert steady[-1]['resyncs']==steady[0]['resyncs'],report['steady_playback']
            report['playback_telemetry']={'first':samples[0] if samples else None,'last':samples[-1] if samples else None,'phases':sorted(set(x['phase'] for x in samples)),'qualification':'Verified logical time retrieved versus consumed; finite bounded local observation, not a production throughput claim.'}
            page.locator('#toolbar-settings').click();page.locator('.diagnostics').evaluate('(node)=>node.open=true')
            page.locator('#network-pause').check();(out/'browser-disconnected').write_text('paused\n')
            target=int(wait_file(page,out/'harness-upgrade-ready',90000))
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
        if a.million_scene_only and 'wire_packets' in locals():
            (out/'wire-index.json').write_text(json.dumps({'packets':wire_packets,'errors':wire_errors,'bytes':wire_bytes,'complete_through':wire_complete_through,'query_timings':query_timings},indent=2))
        if browser:
            try:browser.close()
            except Exception:pass
        if server and server.poll() is None:
            os.killpg(server.pid,signal.SIGTERM)
            try:server.wait(timeout=5)
            except subprocess.TimeoutExpired:os.killpg(server.pid,signal.SIGKILL);server.wait()
if __name__=='__main__':raise SystemExit(main())
