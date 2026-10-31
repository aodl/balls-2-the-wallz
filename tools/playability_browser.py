"""One read-only browser scene on the owned disposable IC. No wallet or updates.

The Rust S09 harness owns valueless payments and its declared clock experiment.
The normal-rate sample uses real time. Only the separately labelled elapsed
expiry/reconnect phase uses Playwright's explicit clock to match PocketIC time;
certificate freshness, query signatures and the sandbox remain enabled.
"""
import hashlib
import json
import os
import re
import statistics
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

from browser_observer import wait_until, wait_file, open_settings, close_settings

ROOT = Path(__file__).resolve().parents[1]


def browser_time(consensus_ns):
    """Use an explicit UTC datetime; Playwright numeric time uses seconds."""
    return datetime.fromtimestamp(int(consensus_ns) / 1_000_000_000, timezone.utc)


def short_summary(rows, polls):
    if len(rows) < 2:
        raise ValueError('missing playback samples')
    first, last = rows[0], rows[-1]
    seconds = (last['wall_epoch_ms'] - first['wall_epoch_ms']) / 1000
    if seconds < 45:
        raise ValueError('complete declared 45-second sample required')
    def bound(at):
        before = [p for p in polls if p['query_completed_epoch_ms'] <= at]
        after = [p for p in polls if p['query_started_epoch_ms'] >= at]
        if not before or not after:
            raise ValueError('independent production polls must bracket both endpoints')
        return [before[-1]['completed_ticks'], after[0]['completed_ticks']]
    start, end = bound(first['wall_epoch_ms']), bound(last['wall_epoch_ms'])
    produced = [end[0]-start[1], end[1]-start[0]]
    admitted = last['admitted_ticks']-first['admitted_ticks']
    displayed = last['played_ticks']-first['played_ticks']
    error = last['buffer_ticks']-first['buffer_ticks']-(admitted-displayed)
    checks = {
        'rates': all(.9 <= r <= 1.15 for r in [admitted/seconds, displayed/seconds, *[n/seconds for n in produced]]),
        'no_stall_or_rebuffer': all(r['phase'] in ['PLAYING', 'DEGRADED_BUFFER'] for r in rows),
        'no_resynchronisation': all(r['resyncs'] == first['resyncs'] for r in rows),
        'normal_not_performance_limited': all(r['nominal_rate'] == 1 and r['target_rate'] == 1 and not r['performance_limited'] for r in rows),
        'buffer_accounting': abs(error) < 1e-5,
        'bounded_queue': all(r['queue_segments'] <= 24 and r['buffer_bytes'] <= 8*1024*1024 for r in rows),
    }
    return {'status': 'PASS' if all(checks.values()) else 'FAIL', 'checks': checks, 'seconds': seconds,
            'produced_ticks_bounds': produced, 'produced_ticks_per_second_bounds': [n/seconds for n in produced],
            'admitted_ticks_per_second': admitted/seconds, 'displayed_ticks_per_second': displayed/seconds,
            'buffer_conservation_error': error, 'buffer_change_ticks': last['buffer_ticks']-first['buffer_ticks'],
            'ball_count_range': [min(r['visible_balls'] for r in rows), max(r['visible_balls'] for r in rows)],
            'http_last_operation_ms': {k: {'median': statistics.median(r[k] for r in rows), 'max': max(r[k] for r in rows)} for k in ['fetch_ms','verify_ms','artifact_ms','derive_ms','catchup_ms']},
            'qualification': 'One complete real-time 45s Normal representative sample, not the historical sustained 900s gate or a 15-minute buffer-deficit result. All samples retained; independent timed production bounds. The original sustained-analysis code and thresholds are unchanged.'}


def verify_playability_scene(page, context, out, configuration, record, report, save, stop_capture, capture):
    assert urlparse(page.url).hostname == '127.0.0.1'
    assert configuration['network'] == 'pocketic-local'
    navigations = []
    page.on('framenavigated', lambda f: navigations.append(f.url) if f == page.main_frame else None)
    inflight = set()
    page.on('request', lambda r: inflight.add(r) if r.method == 'POST' else None)
    page.on('requestfinished', lambda r: inflight.discard(r))
    page.on('requestfailed', lambda r: inflight.discard(r))
    head = lambda: page.evaluate('globalThis.__dtrLive.heads.at(-1)')
    def identify(account):
        page.locator('#identify-button').click()
        page.locator('#identify-dialog details').first.evaluate('(e)=>e.open=true')
        page.locator('#identity-account').fill(account)
        page.locator('#identity-principal').fill('')
        page.locator('#identity-save').click()
        assert not page.locator('#identify-dialog').evaluate('(e)=>e.open')
    def phase(name, timeout=150000):
        return json.loads(wait_file(page, out/name, timeout))
    def counts(cannons, balls):
        return page.locator('#cannons').inner_text() == str(cannons) and page.locator('#balls').inner_text() == str(balls)
    def receipt(position):
        return page.locator('#live-receipts tr').filter(has=page.locator('td:first-child', has_text=re.compile('^'+str(position)+'$')))
    def sample():
        return page.evaluate('''()=>({...__dtrLive.playback,wall_epoch_ms:performance.timeOrigin+__dtrLive.playback.wall_ms,resyncs:__dtrLive.resyncs,visible_balls:Number(document.querySelector('#balls').textContent)})''')

    assert page.title() == 'Balls 2 the wallZ - BTZ'
    page.screenshot(path=str(out/'desktop-before.png'))
    # Hold one genuine query reply unchanged. Its signature still binds the
    # original request; no canned certificate or replay under a new request ID.
    delayed = []
    def delayed_reply(route):
        request = route.request
        if delayed or b'observation_bundle' not in (request.post_data_buffer or b''):
            route.continue_(); return
        response = route.fetch()
        body = response.body()
        row = {'request_sha256':hashlib.sha256(request.post_data_buffer or b'').hexdigest(),
               'response_sha256':hashlib.sha256(body).hexdigest(), 'preceding_accepted_head':head(),
               'delay_ms':2500, 'body_and_request_unchanged':True}
        delayed.append(row)
        page.wait_for_timeout(2500)
        route.fulfill(response=response, body=body)
    page.route('**/api/v*/canister/*/query', delayed_reply)
    (out/'browser-playability-ready').write_text('old v5 authenticated; client supports both identities\n')
    dormant = phase('phase-dormant.json')
    wait_until(page, lambda: head() >= dormant['head'] and counts(4,1), 60000)
    assert page.evaluate('globalThis.__dtrLive.checkpoints') >= 1
    identify(configuration['revival_account'])
    page.locator('#fire-action').click()
    wait_until(page, lambda: 'Dormant' in page.locator('#cannon-life').inner_text())
    page.screenshot(path=str(out/'dormant-verified.png'))
    assert '24 elapsed hours' in page.locator('#rules-lifecycle').inner_text()
    assert not page.locator('#error').is_visible()
    record('same-session-authenticated-v5-to-v6-and-island-dormancy', dormant)
    identify(configuration['new_player_account'])
    page.locator('#join-action').click()
    (out/'browser-dormant-checked').write_text('PASS\n')
    wait_until(page, lambda: page.locator('[data-copy="text"]').is_enabled() and page.locator('#transfer-amount').inner_text() == '1 ICP', 30000)
    page.screenshot(path=str(out/'new-player-before-payment.png'))
    (out/'browser-join-prepared').write_text('read-only payment preparation; Rust owns valueless transfer\n')

    purchases = phase('phase-purchases.json')
    wait_until(page, lambda: receipt(purchases['join']).count() == 1, 30000)
    confirmed = page.evaluate('performance.now()')
    wait_until(page, lambda: counts(5,4) and page.locator('#selected-cannon').input_value() == '5', 30000)
    report['no_refresh_join'] = {'confirmed_to_visible_ms':page.evaluate('performance.now()')-confirmed,
                                'navigations_after_initial_load':len(navigations), 'head':head()}
    assert not navigations
    assert 'retained 0.05 ICP' in receipt(purchases['join']).inner_text()
    assert 'partially applied' in receipt(purchases['partial_fire']).inner_text()
    identify(configuration['revival_account'])
    page.locator('#fire-action').click()
    wait_until(page, lambda:'Active' in page.locator('#cannon-life').inner_text())
    assert receipt(purchases['revival']).count() == 1
    record('genuine-ledger-join-partial-batch-and-dormant-revival-without-refresh', {**purchases, **report['no_refresh_join']})
    assert delayed
    report['delayed_genuine_response'] = delayed
    page.unroute('**/api/v*/canister/*/query', delayed_reply)
    page.keyboard.press('Escape')
    wait_until(page,lambda:page.locator('body').get_attribute('data-phase') in ['PLAYING','DEGRADED_BUFFER'],60000)
    # One declared warmup and one untrimmed short sample. No repeat/selection.
    actions_only=os.environ.get('B2Z_PLAYABILITY_BROWSER_ACTIONS_ONLY')=='1'
    if actions_only:
        result={'status':'NOT_RUN','qualification':'Affected API/lifecycle/capture follow-up only. No playback measurement or rate claim; the prior complete window retains its own verdict and exact executable identities.'}
        (out/'browser-normal-complete').write_text('NOT_RUN: explicit affected-closeout follow-up\n')
        phase('production-polls.json',30000)
    else:
        warm=[];began=time.monotonic()
        while time.monotonic()-began<15:
            warm.append(sample());page.wait_for_timeout(250)
        (out/'normal-warmup.json').write_text(json.dumps(warm,indent=2)+'\n')
        rows=[sample()]
        while rows[-1]['wall_ms'] < rows[0]['wall_ms']+45000:
            page.wait_for_timeout(250);rows.append(sample())
        (out/'normal-45s-samples.json').write_text(json.dumps(rows,indent=2)+'\n')
        (out/'browser-normal-complete').write_text('measurement retained; verdict pending independent polls\n')
        polls=phase('production-polls.json',30000)
        result=short_summary(rows,polls)
    report['normal_short_sample']=result;save()
    if result['status']=='PASS':
        record('complete-short-normal-sample-with-independent-production-bounds',result)
    elif result['status']=='FAIL':
        # Preserve a failed measurement and collect the separately identified
        # lifecycle/capture checks too. The final attempt still exits FAIL.
        report['checks'].append({'name':'complete-short-normal-sample-with-independent-production-bounds','status':'FAIL','details':result});save()
    identify(configuration['payer_account'])
    page.locator('#join-action').click()
    wait_until(page,lambda:page.locator('[data-copy="text"]').is_enabled(),30000)
    assert page.locator('#transfer-amount').inner_text()=='4 ICP'
    (out/'browser-actions-ready').write_text('PASS\n')
    actions=phase('phase-actions.json')
    wait_until(page,lambda:receipt(actions['illegal_move']).count()==1 and receipt(actions['wrong_owner']).count()==1,30000)
    wait_until(page,lambda:counts(6,5) and page.locator('#selected-cannon').input_value()=='6',30000)
    assert 'move limit' in receipt(actions['illegal_move']).inner_text()
    assert 'not owner' in receipt(actions['wrong_owner']).inner_text()
    page.locator('#fire-action').click()
    wait_until(page,lambda:page.locator('#transfer-amount').inner_text()=='0.9 ICP')
    camera=page.evaluate('({x:__b2zCamera.x,y:__b2zCamera.y,scale:__b2zCamera.scale})')
    page.locator('#selected-cannon').select_option('1')
    wait_until(page,lambda:page.locator('#transfer-amount').inner_text()=='0.9 ICP')
    assert page.evaluate('({x:__b2zCamera.x,y:__b2zCamera.y,scale:__b2zCamera.scale})')==camera
    assert page.locator('#territories tr').count()==5 # five funding players, six cannons
    for width,height in [(1440,900),(390,844),(900,500),(500,900)]:
        page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(100)
        assert page.evaluate('__b2zCamera.scale>=Math.max(innerWidth/1000,innerHeight/1000)')
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.screenshot(path=str(out/f'after-{width}x{height}.png'))
    page.set_viewport_size({'width':1440,'height':900})
    # A second page restores the same public declaration; primary page never reloads.
    restore=context.new_page();restore.goto(page.url);wait_until(restore,lambda:restore.evaluate('Boolean(globalThis.__dtrLive?.connected)'))
    wait_until(restore,lambda:restore.locator('#identity-label').inner_text().startswith(configuration['payer_account'][:10]))
    restore.close()
    high=context.browser.new_context(viewport={'width':390,'height':844},device_scale_factor=2)
    highpage=high.new_page();highpage.goto(page.url);wait_until(highpage,lambda:highpage.evaluate('Boolean(globalThis.__dtrLive?.connected)'))
    assert highpage.evaluate('devicePixelRatio')==2
    highpage.screenshot(path=str(out/'after-mobile-dpr2.png'));high.close()
    assert not page.locator('#error').is_visible()
    record('targeted-new-move-rejection-shared-island-price-account-stats-camera-and-responsive-ui',actions)

    # End real-time sampling. Drain all current requests before the explicit
    # consensus-clock jump; no old response may be hidden by clock manipulation.
    open_settings(page);page.locator('#network-pause').check();close_settings(page)
    wait_until(page,lambda:not inflight and not capture.pending,15000)
    page.wait_for_timeout(1000)
    assert not inflight and not capture.pending
    (out/'browser-clock-ready').write_text('downloads paused and requests/body callbacks drained\n')
    expiry=phase('phase-expiry.json')
    page.clock.set_fixed_time(browser_time(expiry['now_ns']))
    open_settings(page);page.locator('#network-pause').uncheck();close_settings(page)
    wait_until(page,lambda:head()>=expiry['head'] and counts(4,5),30000)
    assert not page.locator('#error').is_visible()
    assert not navigations
    page.screenshot(path=str(out/'elapsed-expiry-no-refresh.png'))
    report['elapsed_clock_phase']={'scope':'Explicit disposable PocketIC +24h clock; browser Date matched only after real-time sample and complete request drain. Original certificate policies/query signatures unchanged. No wall-time rate claim across this phase.',**expiry}
    record('authenticated-expiry-with-revived-cannon-preserved-on-the-same-page',report['elapsed_clock_phase'])
    fence=stop_capture();report['capture_fence']=fence
    (out/'wire-index.json').write_text(json.dumps(capture.index([]),indent=2)+'\n')
    wait_file(page,out/'replay-seed.json',30000)
    for command,name in [(['node','tools/capture_playability_history.mjs',str(out),str(out/'replay-seed.json')],'wire-history'),(['node','tools/replay_s14.mjs',str(out/'history.json'),str(out/'independent-replay.json')],'replay')]:
        result=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=180)
        (out/f'{name}.log').write_text(result.stdout+result.stderr)
        assert result.returncode==0,(name,result.stdout,result.stderr)
    record('error-free-fenced-wire-capture-and-independent-full-history-replay',json.loads((out/'independent-replay.json').read_text()))
    # One declared gap/reconnect regression follows the successful capture
    # boundary, just as historical fault phases are separate from strict samples.
    open_settings(page);page.locator('#network-pause').check();close_settings(page)
    before=head();resync=page.evaluate('__dtrLive.resyncs')
    (out/'browser-reconnect-ready').write_text(str(before)+'\n')
    reconnect=phase('phase-reconnect.json')
    page.clock.set_fixed_time(browser_time(reconnect['now_ns']))
    open_settings(page);page.locator('#network-pause').uncheck();close_settings(page)
    wait_until(page,lambda:head()>=reconnect['head'] and page.evaluate('__dtrLive.resyncs')==resync+1,30000)
    wait_until(page,lambda:counts(reconnect['cannons'],reconnect['balls']),30000)
    assert not page.locator('#error').is_visible() and not navigations
    record('declared-post-capture-retention-gap-reconnect-without-navigation',{'old_head':before,**reconnect,'expected_resynchronisations':1})
    report['primary_navigations_after_initial_load']=len(navigations)
    report['primary_final_state']=page.evaluate('({...__dtrLive,playback:{...__dtrLive.playback}})')
    save()
    assert actions_only or result['status']=='PASS',result
