#!/usr/bin/env python3
"""Actual deployment bundle against an owned live PocketIC. No wallet/update calls.
The Rust acceptance harness owns valueless transfers, upgrade and service startup.
"""
from human_input import set_heading,choose_cell,chosen_cell,heading_value
from fluid_playability_browser import action_field
import argparse,hashlib,json,os,shutil,signal,subprocess,sys,time
from pathlib import Path
from contextlib import ExitStack
from browser_observer import wait_until,wait_file,open_settings,close_settings
from verify_observer_http import free_port,wait_for_server
from wire_capture import WireCapture
ROOT=Path(__file__).resolve().parents[1]

def world_text(page):
    return page.evaluate('()=>{const w=__b2zExperience.visible;return w?`${w.width.toLocaleString("en-US")} × ${w.height.toLocaleString("en-US")} cells · ${w.torus?"wraparound":"bounded"}`:"";}')
def source_value(page,key):return page.evaluate('(key)=>__b2zExperience.session.source[key]',key)
def identify_account(page,account=None):
    if account is None:account=page.evaluate('__b2zExperience.session.referenceWorld.cannons[0].account')
    page.locator('#identify-button').click()
    if page.locator('#account-summary').is_visible():page.locator('#change-account').click()
    page.locator('#sending-account').fill(account);page.locator('#identity-save').click()
    assert page.locator('#identity-form').is_hidden(),page.locator('#identity-note').inner_text()
    page.locator('#close-panel').click()
def review_instructions(page):
    if page.locator('#replace-instructions').is_visible():
        assert page.locator('#transfer-controls').evaluate('(node)=>node.disabled')
        page.locator('#replace-instructions').click()
def select_cannon(page,cannon=None):
    selected=page.evaluate('__b2zTools.selection()')
    if selected is not None and page.locator('#workspace').is_visible() and (cannon is None or selected==cannon):
        return
    if page.locator('#workspace').is_visible():page.locator('#close-panel').click()
    page.locator('#centre-cannon').click()
    if page.locator('#roster-view').is_visible():
        if cannon is None:page.locator('#own-cannons button').first.click()
        else:page.locator('#own-cannons button').filter(has_text=f'Cannon #{cannon} ·').click()
    elif cannon is not None and not page.locator('#panel-title').inner_text().endswith('#'+str(cannon)):
        raise AssertionError('Requested cannon is unavailable')
def choose_action(page,kind,review=True):
    if kind=='start' and page.locator('#join-action').is_visible():page.locator('#join-action').click()
    else:
        cannon=page.evaluate('__b2zTools.selection()');select_cannon(page,cannon)
        button=page.locator({'start':'#build-action','ball':'#fire-action','move':'#move-action'}[kind])
        if button.get_attribute('aria-pressed')!='true':button.click()
    if review:review_instructions(page)
def different_owned_cell(page):
    return page.evaluate('''()=>{const w=__b2zExperience.session.referenceWorld,id=__b2zTools.selection(),c=w.cannons.find(c=>c.id===id);if(w.version>=5)throw Error('Use canonical compact-world fixture');const n=w.cells.findIndex((owner,n)=>owner===c.id&&n!==c.cell);if(n<0)throw Error('No different owned fixture cell');return n;}''')
def selected_cell(page):
    return page.evaluate('()=>{const id=__b2zTools.selection();return __b2zExperience.session.referenceWorld.cannons.find(c=>c.id===id).cell;}')
def camera_settled(page):
    # UX-04/12: Focus/Home are now animated. Do not overwrite their geometry
    # while their controller is still advancing, or sample a moving wheel anchor.
    page.evaluate('()=>{globalThis.__s14CameraSettle={pose:null,at:performance.now(),frames:0};}')
    page.wait_for_function('()=>{const c=__b2zCamera,p=globalThis.__s14CameraSettle,next=[c.x,c.y,c.scale],now=performance.now();if(!p.pose||next.some((n,i)=>Math.abs(n-p.pose[i])>1e-8)){p.pose=next;p.at=now;p.frames=0;return false;}p.frames++;return p.frames>=3&&now-p.at>=450;}',polling='raf',timeout=8000)

def trace_seam_click(page):
    page.evaluate('''()=>{globalThis.__s14ClickTrace=[];for(const event of ['pointerdown','pointerup','pointercancel','lostpointercapture','dblclick'])document.addEventListener(event,e=>{if(__s14ClickTrace.length<20)__s14ClickTrace.push({event,target:e.target.id,x:e.clientX,y:e.clientY,cell:__b2zCamera.cell(e.clientX,e.clientY),selected:__b2zTools.selection(),mode:document.querySelector('#move-action').getAttribute('aria-pressed'),card:document.getElementById('workspace').getBoundingClientRect().toJSON()})},{capture:true});}''')

def seam_pointer_target(page,centre,point):
    # Geometry mutations in this harness are not user input: flush the app's
    # normal rendered layout before sending a native pointer into the new view.
    # Otherwise the previous contextual card can still intercept the old pixels.
    before=page.evaluate('''([centre,point])=>{__b2zCamera.fit();__b2zCamera.zoom(4);__b2zCamera.centre(centre,centre);const p=__b2zCamera.screen(point,point);return{point:p,beforeLayoutTarget:document.elementFromPoint(p.x,p.y)?.id};}''',[centre,point])
    page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
    target=before['point']
    assert page.evaluate('p=>document.elementFromPoint(p.x,p.y)?.id==="board"',target),before
    assert page.evaluate('p=>__b2zCamera.cell(p.x,p.y)',target)==0,before
    print('seam-pointer-layout',before,flush=True)
    return target

def wait_committed_cell(page,cell):
    # This predicate must be read-only. action_field() may press Locate, which
    # intentionally cancels a pending gesture and would erase the test's tap.
    try:wait_until(page,lambda:chosen_cell(page)==str(cell),5000)
    except Exception:
        print('seam-click-diagnostic',page.evaluate('({events:globalThis.__s14ClickTrace,phase:document.body.dataset.phase,note:document.getElementById("preparation-note").textContent,cell:String(fixture.proposal().cell??""),memo:document.getElementById("text-memo").textContent})'),flush=True)
        raise

def locate_seam_action(page):
    # UX-03/04/12: panning away hides the anchored card, not the draft.
    # Compare in one JS turn: genuine authenticated recovery between browser
    # RPCs may replace a clock independently of navigation. Invoke the actual
    # control handler; native pointer Locate is also covered by the UX journeys.
    assert page.evaluate('''() => {
      const clock=__b2zExperience.clock,queue=__b2zExperience.queue,cannon=__b2zTools.selection();
      const locate=document.getElementById('locate-context');
      if(locate&&!locate.hidden)locate.click();
      return Boolean(clock&&queue)&&clock===__b2zExperience.clock&&queue===__b2zExperience.queue&&cannon===__b2zTools.selection();
    }''')
    wait_until(page,lambda:not page.locator('#workspace').evaluate('(n)=>n.inert'),8000)
    assert page.locator('#action-view').is_visible()
def tab_in_modal(page):
    # UX-03/11 supersedes modal focus trapping: the background remains interactive.
    assert page.locator('#workspace').is_visible()
    assert page.locator('#workspace').get_attribute('aria-modal') is None
    page.locator('#board').focus();assert page.locator('#board').evaluate('(n)=>n===document.activeElement')
def open_players(page):page.locator('#identify-button').click()
def close_players(page):
    if page.locator('#workspace').is_visible():page.locator('#close-panel').click()
def receipt_rows(page):
    return page.evaluate('()=>[...__b2zExperience.session.receipts.values()].map(r=>`${r.position}\t${r.account}\t${r.reason==="ACCEPTED"?"Accepted":r.reason}\t${({cannon_spawned:"Joined arena",ball_spawned:"Launched ball",cannon_moved:"Moved cannon"})[r.kind]??r.kind}`)')

def verify_torus_scene(page,context,out,record,report,save):
    (out/'browser-scene-ready').write_text('certified genesis visible\n')
    choose_action(page,'ball')
    wait_until(page,lambda:not page.locator('#transfer-controls').evaluate('(node)=>node.disabled'),30000)
    assert '32 × 32' in world_text(page)
    assert 'wraparound' in world_text(page)
    select_cannon(page);choose_action(page,'ball');wait_until(page,lambda:page.locator('[data-copy="text"]').is_enabled(),15000)
    assert page.locator('#transfer-amount').inner_text()=='0.4 ICP'
    set_heading(page,'0');review_instructions(page);assert page.locator('#text-memo').inner_text()=='ANGLE 225'
    choose_action(page,'move');choose_cell(page,'1');assert selected_cell(page)!=0
    camera_settled(page)
    trace_seam_click(page)
    point=seam_pointer_target(page,31.8,32.5);page.mouse.click(point['x'],point['y'])
    wait_committed_cell(page,0)
    locate_seam_action(page)
    assert chosen_cell(page)=='0';wait_until(page,lambda:page.locator('[data-copy="text"]').is_enabled(),15000);assert page.locator('#text-memo').inner_text()=='MOVE 0'
    page.keyboard.press('Escape');assert page.evaluate('__b2zCamera.copies().length')<=25 # UX-12 torus copies remain bounded; persistent minimap supplies the canonical overview
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
        report['epoch_failure_state']=page.evaluate('''() => ({phase:document.body.dataset.phase,live:globalThis.__dtrLive,error:document.querySelector('#observation-error').textContent,service:document.querySelector('#arena-note').textContent})''')
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
    page.locator('#identify-button').click();page.locator('#help-button').click();before=samples[-1]['backend_segments'];page.wait_for_timeout(6000);assert page.evaluate('__dtrLive.playback.backend_segments')>before;page.keyboard.press('Escape')
    record('native-dialogs-do-not-pause-shared-gameplay')
    verify_controlled_verified_return(page,out,record)

def verify_controlled_verified_return(page,out,record):
    # Real installed application + SDK/certificates, controlled document.hidden.
    # This does NOT establish native tab throttling or background CPU behaviour.
    wait_until(page,lambda:page.evaluate('__b2zExperience.clock.available>__b2zExperience.clock.playhead&&__b2zExperience.session.queue.length>0'),15000)
    cdp=page.context.new_cdp_session(page);cdp.send('Network.enable');wire=[];cdp.on('Network.loadingFinished',lambda event:wire.append(event['encodedDataLength']))
    before=page.evaluate('''()=>{const s=__b2zExperience.session;window.__warmControl={clock:s.clock,queue:s.queue,session:s,camera:[__b2zCamera.x,__b2zCamera.y,__b2zCamera.scale]};const r={head:s.root,accepted:s.accepted,certificates:__dtrLive.certificates,playhead:s.clock.playhead,available:s.clock.available,queue:s.queue.length,bytes:s.bytes};Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));return r;}''')
    start=time.monotonic()
    try:
        page.wait_for_timeout(35000)
        away=page.evaluate('''()=>{const s=__b2zExperience.session;return{accepted:s.accepted,head:s.root,certificates:__dtrLive.certificates,playhead:s.clock.playhead,available:s.clock.available,queue:s.queue.length,bytes:s.bytes,sameClock:s.clock===__warmControl.clock,sameQueue:s.queue===__warmControl.queue};}''');encoded=sum(wire)
    finally:
        page.evaluate("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))")
    elapsed=time.monotonic()-start
    returned=page.evaluate('''()=>{const s=__b2zExperience.session;return{sameClock:s.clock===__warmControl.clock,sameQueue:s.queue===__warmControl.queue,sameSession:s===__warmControl.session,camera:[__b2zCamera.x,__b2zCamera.y,__b2zCamera.scale],oldCamera:__warmControl.camera,playhead:s.clock.playhead,available:s.clock.available,firstVerifiedRenderSubmissionMs:s.firstWarmRenderAt===null?null:s.firstWarmRenderAt-s.returnStartedAt};}''')
    assert returned['sameClock']and returned['sameQueue']and returned['sameSession'],returned
    assert returned['camera']==returned['oldCamera'],returned
    assert returned['firstVerifiedRenderSubmissionMs']is not None,returned
    assert returned['playhead']<=returned['available'],returned
    assert away['queue']<=24 and away['bytes']<=8*1024*1024,away
    assert away['certificates']-before['certificates']<=4,away
    if away['head']==before['head']:assert away['playhead']==before['playhead'],(before,away)
    if returned['playhead']<returned['available']:
        wait_until(page,lambda:page.evaluate('(t)=>__b2zExperience.clock.playhead>t',returned['playhead']),5000)
    result={'scope':'Actual disposable installed app and authenticated heads; controlled visibility input, not native hidden-tab or hardware evidence','away_seconds':elapsed,'before':before,'away':away,'returned':returned,'encoded_bytes_received_during_controlled_away':encoded}
    (out/'controlled-verified-return.json').write_text(json.dumps(result,indent=2)+'\n');record('controlled-verified-return-retains-motion-and-one-session',result)

def install_boundary_trace(page):
    # Observe diagnostic counters only. Original values, requests, authentication,
    # admission, buffers and array return values are unchanged.
    page.evaluate('''() => {
      const s=globalThis.__dtrLive;if(!s||s.__qualificationTrace)return;
      Object.defineProperty(s,'__qualificationTrace',{value:true});
      globalThis.__qualificationEvents??=[];
      const log=(kind,data)=>{if(__qualificationEvents.length<32768)__qualificationEvents.push({kind,epoch_ms:performance.timeOrigin+performance.now(),...data});};
      let count=s.certificates;
      Object.defineProperty(s,'certificates',{enumerable:true,configurable:true,get(){return count;},set(v){count=v;log('certificate_verified_counter',{count:v});}});
      const push=s.heads.push;
      Object.defineProperty(s.heads,'push',{value:function(...v){const result=push.apply(this,v);log('publication_admitted_or_resynced',{heads:v,resyncs:s.resyncs,certificate_count:s.certificates});return result;}});
    }''')

def save_boundary_trace(page,out,name):
    (out/name).write_text(json.dumps(page.evaluate('globalThis.__qualificationEvents??[]'),indent=2)+'\n')

def verify_paid_v8_scene(page,out,record):
    assert '1,000 × 1,000' in world_text(page)
    for attempt in range(2):
        wait_until(page,lambda:page.locator('body').get_attribute('data-phase')=='PLAYING',60000)
        first=page.evaluate('__dtrLive.heads.at(-1)');resync=page.evaluate('__dtrLive.resyncs')
        samples=[];started=time.monotonic()
        while time.monotonic()-started<30:
            samples.append(page.evaluate('({...__dtrLive.playback})'));page.wait_for_timeout(500)
        assert all(r['phase']in ['PLAYING','DEGRADED_BUFFER']for r in samples)
        assert page.evaluate('__dtrLive.resyncs')==resync
        assert page.evaluate('__dtrLive.heads.at(-1)')>=first+3
        page.screenshot(path=str(out/f'paid-v8-{attempt}.png'))
        record('paid-v8-certified-playback'if attempt==0 else'paid-v8-certified-cold-reconnect',{'first':first,'last':page.evaluate('__dtrLive.heads.at(-1)'),'samples':len(samples)})
        if attempt==0:
            page.reload();wait_until(page,lambda:page.evaluate('Boolean(globalThis.__dtrLive?.connected)'),30000)

def verify_million_scene(page,context,out,record,report,save,stop_capture,sustained=False):
    install_boundary_trace(page)
    (out/'browser-million-ready').write_text('certified million-cell genesis visible; begin production\n')
    assert '1,000 × 1,000' in world_text(page)
    assert 'wraparound' in world_text(page)
    choose_action(page,'ball')
    wait_until(page,lambda:not page.locator('#transfer-controls').evaluate('(node)=>node.disabled'),30000)
    select_cannon(page);choose_action(page,'move')
    # Numeric entry and exact board picking avoid 1,000,000 DOM options.
    assert page.locator('#move-cell,#new-cell,#angle-degrees').count()==0
    # Settle the My-cannon animation before arranging the seam test view.
    camera_settled(page)
    assert selected_cell(page)!=0
    trace_seam_click(page)
    point=seam_pointer_target(page,999.8,1000.5);page.mouse.click(point['x'],point['y'])
    # UX-04/12: mouse placement waits for the bounded double-click window.
    # Assert the committed cell after that window, rather than a scheduler race.
    wait_committed_cell(page,0)
    locate_seam_action(page)
    wait_until(page,lambda:page.locator('[data-copy="text"]').is_enabled(),15000);assert page.locator('#text-memo').inner_text()=='MOVE 0'
    page.keyboard.press('Escape');assert page.evaluate('__b2zCamera.copies().length')<=25 # UX-12 torus copies remain bounded; persistent minimap supplies the canonical overview
    page.screenshot(path=str(out/'million-seam-pick.png'))
    record('million-cell-culling-seam-picking-and-sparse-move-selector')
    page.locator('#board').focus();page.keyboard.press('Home')
    page.evaluate('''limit=>{globalThis.__millionTiming=[];setInterval(()=>{const p=globalThis.__dtrLive?.playback;if(p&&__millionTiming.length<limit)__millionTiming.push({...p,wall_epoch_ms:performance.timeOrigin+p.wall_ms,resyncs:__dtrLive.resyncs});},250);}''',6400 if sustained else 2400)
    (out/'browser-million-drive').write_text('begin explicit disposable-IC clock progression\n')
    try:wait_until(page,lambda:page.locator('body').get_attribute('data-phase')in['PLAYING','DEGRADED_BUFFER'],60000)
    except Exception:
        (out/'million-startup-telemetry.json').write_text(json.dumps(page.evaluate('globalThis.__millionTiming'),indent=2))
        report['million_startup_failure']=page.evaluate('''() => ({phase:document.body.dataset.phase,live:globalThis.__dtrLive,error:document.querySelector('#observation-error').textContent,service:document.querySelector('#arena-note').textContent,arena:document.querySelector('#arena-note').textContent})''')
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
            save_boundary_trace(page,out,'browser-boundary-events-normal.json')
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
    if sustained and os.environ.get('S14_QUAL_NORMAL_ONLY')=='1':
        stop_capture()
        assert report['million_sustained_analysis']['status']=='PASS',report['million_sustained_analysis']
        record('normal-only-exact-production-artifact-no-fault-phases')
        return
    (out/'browser-million-normal-complete').write_text('normal playback measured\n')
    wait_until(page,lambda:page.evaluate('__dtrLive.playback.target_rate')==.5,30000);page.wait_for_timeout(4000)
    # The normal-to-hooks code upgrade may hold an in-flight query. Bound the
    # recovery before measuring steady Economy, so old Normal publications do
    # not count as newly produced Economy ticks. Keep all throughput bounds.
    wait_until(page,lambda:page.evaluate('''()=>{const p=__dtrLive.playback;return p.phase==='PLAYING'&&p.verified_ticks>=p.backend_segments*p.segment_ticks-2;}'''),30000)
    measure_mode('economy',40,.4,.6)
    (out/'browser-million-economy-complete').write_text('economy playback measured\n')
    # Funding tier names are diagnostic data, not player-facing status labels.
    # Qualify the actual operational rate and the requested conservation message.
    wait_until(page,lambda:page.evaluate('__dtrLive.playback.target_rate')==.05,30000)
    # UX-06: the frame's operational rate can precede the bounded HUD refresh.
    # Require Slow only once verified presentation actually advances; never let
    # producer wording conceal buffering, a delivery failure or an auth error.
    report['lifeline_status_before_settle']=page.evaluate('()=>({label:document.querySelector("#arena-note").textContent,status:__b2zExperience.status,playback:__dtrLive.playback})')
    wait_until(page,lambda:page.evaluate('''()=>{const p=__dtrLive.playback,s=__b2zExperience.status;const expected=p.presentation_lag_ticks/.05>10?'Slow · delayed':'Slow';return p.target_rate===.05&&p.consumed_ticks<p.verified_ticks&&['PLAYING','DEGRADED_BUFFER'].includes(p.phase)&&s.kind==='slow'&&s.label===expected&&document.querySelector('#arena-note').textContent===expected;}'''),15000)
    record('UX-06-lifeline-label-follows-advancing-verified-presentation')
    page.wait_for_timeout(4000)
    measure_mode('lifeline',50,.035,.065)
    stop_capture()
    save_boundary_trace(page,out,'browser-boundary-events-before-reconnect.json')
    page.reload();wait_until(page,lambda:page.evaluate('Boolean(__dtrLive?.connected)') and '1,000 × 1,000' in world_text(page),30000)
    assert page.locator('body').get_attribute('data-phase')!='ERROR'
    wait_until(page,lambda:page.locator('body').get_attribute('data-phase')=='PLAYING',60000)
    assert page.evaluate('__dtrLive.playback.nominal_rate')==.05
    record('million-cell-cold-browser-reconnect')
    install_boundary_trace(page)
    if sustained:
        cold=measure_mode('lifeline_reconnect',120,.035,.065)
        assert cold['admitted_ticks']>=5 and set(cold['phase_samples'])<= {'PLAYING','DEGRADED_BUFFER'},cold
        record('million-cell-cold-lifeline-five-subsequent-publications',cold)
        save_boundary_trace(page,out,'browser-boundary-events-after-reconnect.json')
        assert report['million_sustained_analysis']['status']=='PASS',report['million_sustained_analysis']

def verify_epoch_transition(page,context,out,record,report,save):
    began=time.monotonic()
    def progress(stage):
        report.setdefault('epoch_stages',[]).append({'stage':stage,'elapsed_seconds':round(time.monotonic()-began,3)})
        print('EPOCH_STAGE',json.dumps(report['epoch_stages'][-1]),flush=True);save()
    progress('bootstrap')
    wait_until(page,lambda:'16 × 8' in world_text(page),30000)
    choose_action(page,'ball')
    wait_until(page,lambda:not page.locator('#transfer-controls').evaluate('(node)=>node.disabled'),30000)
    select_cannon(page);choose_action(page,'move')
    old_cell=different_owned_cell(page);choose_action(page,'move');choose_cell(page,str(old_cell));wait_until(page,lambda:page.locator('[data-copy="text"]').is_enabled(),15000)
    assert page.locator('#text-memo').inner_text()==f'MOVE {old_cell}'
    assert source_value(page,'recipient')==report['receiving_account'];assert page.locator('#payment-owner').text_content().startswith(source_value(page,'owner'));assert not page.locator('#payment-address,#hex-memo').count()
    page.locator('[data-copy="text"]').click()
    wait_until(page,lambda:'Copied.' in page.locator('#copy-feedback').text_content(),5000)
    # Keep this packet active across the epoch. Escape now explicitly cancels
    # a local action; historical instructions remain separately in Activity.
    reconnect=context.new_page();reconnect.goto(page.url,timeout=30000)
    wait_until(reconnect,lambda:reconnect.evaluate('Boolean(globalThis.__dtrLive?.connected)') and '16 × 8' in world_text(reconnect),30000)
    reconnect.evaluate('__b2zTools.delivery(true)')
    old_head=reconnect.evaluate('globalThis.__dtrLive.heads.at(-1)')
    page.bring_to_front();(out/'browser-transition-ready').write_text('verified old-world MOVE prepared\n');progress('old-packet-verified')
    wait_until(page,lambda:'Game paused' in page.locator('#arena-note').text_content(),30000)
    choose_action(page,'move',review=False);assert page.locator('#transfer-controls').evaluate('(node)=>node.disabled');assert page.locator('[data-copy="text"]').is_disabled()
    (out/'browser-fence-seen').write_text('payment preparation held; frozen packet retained\n');progress('source-fence-verified')
    wait_until(page,lambda:'32 × 32' in world_text(page),60000)
    assert 'wraparound' in world_text(page)
    choose_action(page,'move',review=False)
    wait_until(page,lambda:page.locator('#replace-choice').is_visible() and page.locator('#replace-choice').is_visible(),30000)
    assert page.locator('#transfer-controls').evaluate('(node)=>node.disabled');assert page.locator('[data-copy="text"]').is_disabled()
    assert page.locator('#replace-choice').is_visible()
    assert page.evaluate('Boolean(__b2zExperience.session.ready)') # saved packet remains in scoped local history
    mapped=(old_cell//16+12)*32+old_cell%16+8
    choose_cell(page,str(mapped));review_instructions(page);wait_until(page,lambda:not page.locator('#transfer-controls').evaluate('(node)=>node.disabled'),30000);wait_until(page,lambda:page.locator('[data-copy="text"]').is_enabled(),15000)
    progress('new-epoch-packet-verified');assert page.locator('#text-memo').inner_text()==f'MOVE {mapped}'
    assert page.locator('#transfer-amount').inner_text()=='0.0001 ICP'
    page.evaluate('''() => {const write=navigator.clipboard.writeText.bind(navigator.clipboard);navigator.clipboard.writeText=async text=>{await write(text);globalThis.__copiedText=text;};}''')
    page.locator('[data-copy="text"]').click();wait_until(page,lambda:page.evaluate('globalThis.__copiedText')==f'MOVE {mapped}')
    # UX-07/08: modern handoff removes hex/legacy controls. Still verify the
    # exact UTF-8 bytes supplied by the real text-copy path across the epoch.
    assert page.evaluate('Array.from(new TextEncoder().encode(__copiedText))')==list(f'MOVE {mapped}'.encode())
    assert page.locator('[data-copy="hex"],[data-copy="recipient"]').count()==0
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
    record('new-epoch-continuous-verified-playback',report['epoch_playback']);progress('new-epoch-playback-measured')
    # Prove a real gap beyond the sixteen-publication window before reconnecting.
    wait_until(page,lambda:page.evaluate('globalThis.__dtrLive.heads.at(-1)')>=old_head+17,90000)
    reconnect.bring_to_front();reconnect.evaluate('__b2zTools.delivery(false)')
    wait_until(reconnect,lambda:reconnect.evaluate('globalThis.__dtrLive.resyncs')>=1 and '32 × 32' in world_text(reconnect),30000)
    progress('retained-gap-recovered');new_head=reconnect.evaluate('globalThis.__dtrLive.heads.at(-1)');assert new_head>=old_head+4,(old_head,new_head)
    assert reconnect.locator('body').get_attribute('data-phase')!='ERROR';reconnect.close();page.bring_to_front()
    record('old-session-reconnects-across-epoch-after-retained-history-gap',{'old_head':old_head,'new_head':new_head})
    page.reload();wait_until(page,lambda:page.evaluate('Boolean(__dtrLive?.connected)') and '32 × 32' in world_text(page),30000)
    assert page.locator('body').get_attribute('data-phase')!='ERROR'
    report['epoch_transition']={'old_cell':old_cell,'mapped_cell':mapped,'old_draft_stale':True,'reload_new_epoch':True,'qualification':'Genuine disposable IC; synthetic v3 player fixture. Real Ledger/Index paid cutover is verified separately.'}
    record('authenticated-epoch-crossing-stales-old-MOVE-and-restores-new-world',report['epoch_transition'])


def main():
    p=argparse.ArgumentParser();p.add_argument('--human-corrections-scene-only',action='store_true');p.add_argument('--entry-scene-only',action='store_true');p.add_argument('--scene-only',action='store_true');p.add_argument('--million-scene-only',action='store_true');p.add_argument('--million-sustained',action='store_true');p.add_argument('--paid-v8-scene-only',action='store_true');p.add_argument('--playability-scene-only',action='store_true');p.add_argument('--transition-only',action='store_true');p.add_argument('--configuration',type=Path,required=True);p.add_argument('--gateway',required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    if a.million_sustained and not a.million_scene_only:p.error('--million-sustained requires --million-scene-only')
    out=a.output.resolve();out.mkdir(parents=True,exist_ok=True);configuration=json.loads(a.configuration.read_text());port=int(os.environ['S14_QUAL_PROXY_PORT']) if os.environ.get('S14_QUAL_PROXY_PORT') else free_port()
    assert 1<=port<=65535
    asset_canister=os.environ.get('S14_ASSET_CANISTER')=='1'
    configuration['host']=a.gateway.rstrip('/') if asset_canister else f'http://127.0.0.1:{port}'
    local=out/'local-test-policy.json';local.write_text(json.dumps(configuration)+'\n')
    report={'receiving_account':configuration['recipient'],'status':'NOT_RUN','mode':'DFX_ASSET_CANISTER_LIVE_LOCAL' if asset_canister else 'BUILT_DEPLOYMENT_LIVE_LOCAL','checks':[],'qualification':'Explicit compile-time local-only adapter, same bundled observer/renderer/SDK verifier. Production mainnet policy unchanged.'}
    def record(name,details=''):
        report['checks'].append({'name':name,'status':'PASS','details':details});save()
    def save():(out/'results.json').write_text(json.dumps(report,indent=2)+'\n')
    def terminated(_signal,_frame):raise SystemExit(143)
    signal.signal(signal.SIGTERM,terminated)
    server=None;browser=None;wire_capture=None
    try:
        assets=out/'assets';production=out/'mainnet-assets'
        if os.environ.get('S14_QUAL_PREBUILT_ROOT'):
            prebuilt=Path(os.environ['S14_QUAL_PREBUILT_ROOT'])
            assert configuration==json.loads((prebuilt/'local-policy.json').read_text()),'prepared local root/canister/endpoint binding differs'
            shutil.copytree(prebuilt/'local-assets',assets)
            shutil.copytree(prebuilt/'mainnet-assets',production)
            production_id=json.loads((production/'build-manifest.json').read_text())['deployment']['canister_id']
        else:
            builder='tools/build_observer_playability.mjs' if (a.human_corrections_scene_only or a.playability_scene_only or a.entry_scene_only) else 'tools/build_observer_mainnet.mjs'
            subprocess.run(['node',builder,'--local-test-config',str(local),'--output',str(assets)],cwd=ROOT,check=True,timeout=120)
            # A committed real deployment mapping must never be bypassed to build
            # mainnet assets for a disposable test principal. Production-policy
            # inspection uses that real ID; only the explicit local bundle runs here.
            ids=ROOT/'canister_ids.json'
            production_id=json.loads(ids.read_text()).get('b2z',{}).get('ic',configuration['canister_id']) if ids.exists() else configuration['canister_id']
            subprocess.run(['node',builder,'--canister',production_id,'--output',str(production)],cwd=ROOT,check=True,timeout=120)
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
        if os.environ.get('S14_QUAL_PRODUCTION_REFERENCE'):
            assert manifest['files']==json.loads(Path(os.environ['S14_QUAL_PRODUCTION_REFERENCE']).read_text())['files'],'original production frontend assets differ'
        local_identity=json.loads((assets/'build-manifest.json').read_text())['files']
        (out/'local-assets-identity.json').write_text(json.dumps(local_identity,indent=2)+'\n')
        if os.environ.get('S14_QUAL_ASSET_REFERENCE'):
            assert local_identity==json.loads(Path(os.environ['S14_QUAL_ASSET_REFERENCE']).read_text()),'matched frontend bytes differ'
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
                proxy_trace=['--proxy-trace',str(out/'proxy-timing.jsonl')] if a.million_scene_only or (a.playability_scene_only or a.entry_scene_only) else []
                server=subprocess.Popen([sys.executable,'-B','tools/serve_observer.py','--port',str(port),'--deployment-assets',str(assets),'--live-config',str(a.configuration.parent),'--ic-gateway',a.gateway,'--live-canister',configuration['canister_id'],*proxy_trace],cwd=ROOT,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
            url=configuration['host']+'/';wait_for_server(url,server)
        from playwright.sync_api import sync_playwright
        with sync_playwright() as pw, ExitStack() as capture_finalizers:
            browser=pw.chromium.launch(executable_path=pw.chromium.executable_path,headless=True,chromium_sandbox=True)
            report['browser_version']=browser.version;save()
            context_options={'permissions':['clipboard-write'],'has_touch':True,'viewport':{'width':1440,'height':900}}
            # Video encoding is optional evidence, not part of observer delivery.
            # Keep the original 90-second cases recorded; the 15-minute timing
            # gate retains screenshots, raw wire data and dense telemetry without
            # the extra software screen-capture/GPU/ffmpeg workload on this host.
            # Explicit diagnostic override isolates encoding cost without changing
            # any throughput/continuity assertion or the normal CI capture policy.
            video_disabled=os.environ.get('S14_BROWSER_NO_VIDEO')=='1'
            capture_video=not (video_disabled or a.million_sustained or a.paid_v8_scene_only or a.playability_scene_only or a.entry_scene_only)
            if a.human_corrections_scene_only:capture_video=True
            if capture_video:context_options['record_video_dir']=str(out/'video')
            report['capture']={'video':capture_video,'diagnostic_no_video':video_disabled,'sandbox':True,'screenshots_and_raw_telemetry':True};save()
            context=browser.new_context(**context_options);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            if a.human_corrections_scene_only:page.add_init_script("""window.coldSamples=[];window.coldTiming={};function captureCold(){const e=globalThis.__b2zExperience,s=e?.session,at=performance.now();if(s?.ready){coldTiming.currentAuthorityAt??=s.firstWorldAt;coldTiming.firstVerifiedFrameAt??=at;if(coldSamples.length&&e.visibleTime>coldSamples[0].time)coldTiming.firstMotionFrameAt??=at;if(s.operational&&Number.isFinite(s.operationalAt)&&at-s.operationalAt<15000&&!s.error)coldTiming.operatingStateKnownAt??=at;}if(s?.ready&&coldSamples.length<180)coldSamples.push({at,head:String(s.sequence.last.publication.head.segment_id),root:s.root,time:e.visibleTime,available:s.clock.available,referenceTime:Number(s.referenceWorld.time[0])/Number(s.referenceWorld.time[1]),balls:[...e.visible.balls.values()].map(b=>({id:b.id,x:(Number(b.x0)+b.vx*e.visibleTime)/1024,y:(Number(b.y0)+b.vy*e.visibleTime)/1024}))});if(performance.now()<20000)requestAnimationFrame(captureCold)}requestAnimationFrame(captureCold)""")
            if a.playability_scene_only:
                # Arm before application timers exist. Late clock installation
                # resets performance.now(), stranding previously scheduled
                # polling deadlines. Time runs normally until the separately
                # declared post-measurement consensus-time experiment.
                page.clock.install()
            navigation_count=[];page.on('framenavigated',lambda frame:navigation_count.append(frame.url) if frame==page.main_frame else None)
            def preserve_exception_state():
                if report.get('status')=='PASS':return
                try:
                    state=page.evaluate('''()=>({phase:document.body.dataset.phase,live:JSON.parse(JSON.stringify(globalThis.__dtrLive,(_,v)=>typeof v==='bigint'?v.toString():v)),error:document.querySelector('#observation-error').textContent,service:document.querySelector('#arena-note').textContent,quote:document.querySelector('#preparation-note').textContent,displayed:{cannons:__b2zExperience.visible?.cannons.size,balls:__b2zExperience.visible?.balls.size}})''')
                    (out/'exception-browser-state.json').write_text(json.dumps(state,indent=2)+'\n')
                    page.screenshot(path=str(out/'exception-browser.png'),full_page=True)
                except Exception as error:
                    (out/'exception-diagnostics-error.txt').write_text(repr(error)+'\n')
            capture_finalizers.callback(preserve_exception_state)
            posts=[];page.on('request',lambda r:posts.append(r.url) if r.method=='POST' else None)
            query_timings=[]
            if a.human_corrections_scene_only or a.million_scene_only or a.paid_v8_scene_only or (a.playability_scene_only or a.entry_scene_only):
                wire_capture=WireCapture(page,out/'wire-catalogs',
                    max_packets=4096 if a.million_sustained or (a.playability_scene_only or a.entry_scene_only) else 1024,
                    max_bytes=(128 if a.million_sustained or (a.playability_scene_only or a.entry_scene_only) else 64)*1024*1024,
                    extra_methods=('artifact_bundle','artifact_chunk','retained_artifact_chunk') if (a.human_corrections_scene_only or a.playability_scene_only or a.entry_scene_only) else ())
                capture_finalizers.push(wire_capture)
                def capture_query_timing(request,failed=False):
                    if request.method!='POST' or not request.url.endswith(('/query','/read_state')):return
                    body=request.post_data_buffer or b''
                    from serve_observer import query_method
                    method=query_method(body) if request.url.endswith('/query') else 'read_state'
                    if method and len(query_timings)<(8192 if a.million_sustained else 4096):
                        # Use cached request metadata only: no extra browser RPC
                        # or body read from this timing callback. HTTP status is
                        # recorded by the independently correlated proxy trace.
                        query_timings.append({'method':method,'timing':request.timing,'request_sha256':hashlib.sha256(body).hexdigest(),'failure':request.failure if failed else None})
                page.on('requestfinished',capture_query_timing)
                page.on('requestfailed',lambda request:capture_query_timing(request,True))
                def stop_wire_capture():
                    return wire_capture.finish(lambda:page.evaluate('globalThis.__dtrLive.heads.at(-1)'))

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
                message=page.locator('#observation-error').inner_text();page.screenshot(path=str(out/'startup-failure.png'))
                raise RuntimeError('deployed observer startup: '+message)
            if a.human_corrections_scene_only or a.scene_only or a.million_scene_only or a.transition_only or a.paid_v8_scene_only or (a.playability_scene_only or a.entry_scene_only):
                if not (a.human_corrections_scene_only or a.paid_v8_scene_only or (a.playability_scene_only or a.entry_scene_only)):identify_account(page)
                if a.human_corrections_scene_only:
                    from human_corrections_browser import verify_certified_lifecycle
                    verify_certified_lifecycle(page,context,out,configuration,record,report,save)
                elif a.entry_scene_only:
                    from entry_browser import verify_entry_scene
                    verify_entry_scene(page,context,out,configuration,record,report,save)
                elif a.playability_scene_only:
                    from playability_browser import verify_playability_scene
                    verify_playability_scene(page,context,out,configuration,record,report,save,stop_wire_capture,wire_capture)
                elif a.paid_v8_scene_only:verify_paid_v8_scene(page,out,record)
                elif a.transition_only:verify_epoch_transition(page,context,out,record,report,save)
                elif a.million_scene_only or a.paid_v8_scene_only:verify_million_scene(page,context,out,record,report,save,stop_wire_capture,a.million_sustained)
                else:verify_torus_scene(page,context,out,record,report,save)
                if wire_capture:stop_wire_capture()
                assert not errors,errors
                assert posts and all(x.endswith(('/query','/read_state')) for x in posts)
                report['status']='PASS';report['sandbox']=True;report['page_errors']=errors;save();(out/'browser-complete').write_text('PASS\n');context.close();browser.close();browser=None;return 0
            wait_until(page,lambda:page.locator('body').get_attribute('data-phase')=='IDLE',20000)
            assert 'Waiting for players' in page.locator('#arena-note').text_content()
            page.screenshot(path=str(out/'healthy-idle.png'))
            record('certified-idle-genesis-allows-transfer-preparation')
            assert not page.locator('dialog').count()
            assert page.title()=='B2Z · on ICP'
            assert page.locator('.brand').inner_text().startswith('B2Z')
            assert 'on ICP' in page.locator('body').inner_text()
            record('B2Z-branding-with-preserved-wire-identity')
            open_settings(page)
            assert source_value(page,'recipient')==configuration['recipient']
            assert source_value(page,'owner')==configuration['canister_id']
            assert page.evaluate('__b2zExperience.session.config.join_e8s.toString()')=='100000000';assert page.evaluate('__b2zExperience.session.config.move_e8s.toString()')=='10000'
            assert page.evaluate('Boolean(__b2zExperience.session.sequence.last.publication.identity.rules_hash)')
            record('certified-backend-receiving-account-and-price-identities')
            page.keyboard.press('Escape');identify_account(page,configuration['payer_account'])
            choose_action(page,'start')
            set_heading(page,'167.15');review_instructions(page)
            wait_until(page,lambda:page.locator('[data-copy="text"]').is_enabled(),15000)
            assert page.locator('#transfer-amount').inner_text()=='1 ICP'
            assert page.locator('.hero,footer').count()==0
            assert source_value(page,'recipient')==configuration['recipient'];assert page.locator('#payment-owner').text_content().startswith(source_value(page,'owner'));assert not page.locator('#payment-address,#hex-memo').count()
            page.bring_to_front()
            if asset_canister:
                assert 'clipboard-write=(self)' in response.headers.get('permissions-policy','')
                assert 'clipboard-read=()' in response.headers.get('permissions-policy','')
            # Observe arguments while still invoking native clipboard writes under
            # an actual click; do not enable clipboard reading in production.
            page.evaluate('''() => {const write=navigator.clipboard.writeText.bind(navigator.clipboard);navigator.clipboard.writeText=async text=>{await write(text);globalThis.__copiedText=text;};}''')
            for selector,expected in [('[data-copy="text"]','ANGLE 37.5'),('[data-copy="owner"]',configuration['canister_id']),('[data-copy="amount"]','1')]:
                page.locator(selector).click()
                wait_until(page,lambda:page.evaluate('globalThis.__copiedText')==expected,5000)
                if selector=='[data-copy="text"]':assert page.evaluate('Array.from(new TextEncoder().encode(__copiedText))')==list(b'ANGLE 37.5')
            assert page.locator('[data-copy="hex"],[data-copy="recipient"]').count()==0
            record('exact-authenticated-principal-amount-and-UTF8-text-copy')
            page.evaluate('''()=>{globalThis.__s15Timing=[];setInterval(()=>{const p=globalThis.__dtrLive?.playback;if(p&&globalThis.__s15Timing.length<1200)globalThis.__s15Timing.push({...p,resyncs:globalThis.__dtrLive.resyncs});},250);}''')
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
            for selector in ['#help-button','#status-button','#identify-button']:
                if selector=='#help-button':page.locator('#identify-button').click()
                page.locator(selector).click();tab_in_modal(page)
                page.keyboard.press('Escape');assert page.locator('#identify-button'if selector=='#help-button'else selector).evaluate('(e)=>document.activeElement===e')
            page.locator('#fit').click();page.locator('#board').focus();page.keyboard.press('Home')
            camera_settled(page)
            page.mouse.move(190,300);anchor=page.evaluate('__b2zCamera.world(190,300)')
            page.mouse.wheel(0,-240);page.wait_for_timeout(200)
            actual=page.evaluate('__b2zCamera.world(190,300)');assert abs(actual['x']-anchor['x'])<.001 and abs(actual['y']-anchor['y'])<.001
            before=page.evaluate('({x:__b2zCamera.x,y:__b2zCamera.y})')
            page.mouse.move(180,400);page.mouse.down();page.mouse.move(280,450,steps=8);page.mouse.up()
            assert page.evaluate('({x:__b2zCamera.x,y:__b2zCamera.y})')!=before
            page.locator('#board').focus();page.keyboard.press('Home')
            record('UX-03-nonmodal-focus-and-UX-12-anchored-isometric-camera')
            page.set_viewport_size({'width':1440,'height':900})

            choose_action(page,'start')
            initial=page.evaluate('globalThis.__dtrLive.heads.at(-1) ?? -1')
            certificates=page.evaluate('globalThis.__dtrLive.certificates')
            wait_until(page,lambda:page.evaluate('globalThis.__dtrLive.certificates')>certificates,15000)
            assert page.locator('body').get_attribute('data-phase')=='IDLE'
            assert page.evaluate('globalThis.__dtrLive.heads.at(-1) ?? -1')==initial
            assert page.locator('[data-copy="text"]').is_enabled()
            assert not page.locator('dialog').count()
            record('fresh-idle-certificates-with-stable-publication-and-copyable-transfer')
            (out/'browser-connected').write_text('ready\n')
            wait_until(page,lambda:page.evaluate('__b2zExperience.session.referenceWorld.cannons.length')==1,60000)
            wait_until(page,lambda:page.evaluate('initial=>(globalThis.__dtrLive.heads.at(-1)??-1)>initial',initial),15000)
            assert page.evaluate('globalThis.__dtrLive.delivery.blocking') is None
            assert page.locator('#new-controls').count()==0
            first_tx=wait_file(page,out/'harness-first-payment',30000)
            receipt_seen=lambda tx:page.evaluate('(id)=>__b2zExperience.session.receipts.has(id)',str(tx))
            wait_until(page,lambda:receipt_seen(first_tx),60000)
            confirmed_ms=page.evaluate('performance.now()')
            wait_until(page,lambda:page.evaluate('__b2zExperience.visible.cannons.size===1&&__b2zExperience.visible.balls.size===1'),60000)
            assert len(navigation_count)==1,navigation_count
            report['join_no_refresh']={'confirmed_to_visible_ms':page.evaluate('performance.now()')-confirmed_ms,'navigations':len(navigation_count),'camera_scale':page.evaluate('__b2zCamera.scale'),'source':'Real disposable Ledger/Index admission, certified artifacts, verified playout, rendered entity counters'}
            (out/'browser-first-receipt-seen').write_text('first authenticated receipt and presentation observed\n')
            select_cannon(page);choose_action(page,'ball')
            wait_until(page,lambda:not page.locator('#transfer-controls').evaluate('(node)=>node.disabled'),30000)
            report['receipt_coordination']='Controller holds each paid setup publication until its receipt is authenticated; replica and certificates stay live. All holds end before measured playback/reconnect. Retention and full seal replay are unchanged.'
            record('first-index-payment-wakes-idle-arena')
            page.screenshot(path=str(out/'arcade-first-cannon.png'),full_page=True)
            select_cannon(page);choose_action(page,'ball')
            wait_until(page,lambda:page.locator('[data-copy="text"]').is_enabled(),15000)
            assert page.locator('#transfer-amount').inner_text()=='0.1 ICP'
            # UX-02/03: the icon toolbar replaces the old action dialog header.
            assert page.locator('#fire-action').get_attribute('aria-pressed')=='true'
            assert page.locator('#action-prompt').inner_text()=='Aim & Pay'
            # Player-centred UX-12: display angles are clockwise from screen up.
            # Pointer capture lets the handle aim across the card without panning.
            import math
            for angle in [0,37.5,90,135,180,225,270,315,359.99]:
                origin=page.evaluate('()=>{const w=__b2zExperience.session.referenceWorld,c=w.cannons.find(c=>c.id===__b2zTools.selection());return __b2zCamera.cellPoint(c.cell);}')
                h=page.locator('#aim-handle').bounding_box();page.mouse.move(h['x']+22,h['y']+22);page.mouse.down();page.mouse.move(origin['sx']+math.sin(math.radians(angle))*90,origin['sy']-math.cos(math.radians(angle))*90,steps=3);page.mouse.up();review_instructions(page)
                actual=float(heading_value(page));assert abs((actual-angle+180)%360-180)<.03,(angle,actual)
            # Numeric heading remains the keyboard alternative; empty drag/pinch are camera gestures.
            set_heading(page,'119.99');review_instructions(page);assert page.locator('#text-memo').inner_text()=='ANGLE 359.99'
            set_heading(page,'167.15');review_instructions(page)
            wait_until(page,lambda:page.locator('[data-copy="text"]').is_enabled(),15000)
            record('UX-12-world-plane-heading-and-keyboard-alternative')
            (out/'browser-first-cannon-seen').write_text('certified join visible\n')
            second_tx=wait_file(page,out/'harness-second-payment',120000)
            wait_until(page,lambda:receipt_seen(second_tx),60000)
            wait_until(page,lambda:page.evaluate('__b2zExperience.visible.balls.size===2'),60000)
            assert len(navigation_count)==1,navigation_count
            (out/'browser-second-receipt-seen').write_text('second authenticated receipt and ball presentation observed\n')
            paid=json.loads(wait_file(page,out/'harness-payments-done',120000))
            wait_until(page,lambda:len(receipt_rows(page))>=len(paid),30000)
            page.keyboard.press('Escape');open_players(page)
            receipts=receipt_rows(page)
            for tx,kind in zip(paid,['Joined arena','Launched ball','Moved cannon']):
                matching=[row for row in receipts if row.split('\t')[0]==str(tx)]
                assert len(matching)==1 and 'Accepted' in matching[0] and kind in matching[0],receipts
            assert page.evaluate('__b2zExperience.session.referenceWorld.cannons.length')==1
            (out/'browser-paid-receipts-seen').write_text('all three authenticated outcomes observed\n')
            close_players(page);choose_action(page,'ball')
            wait_until(page,lambda:not page.locator('#transfer-controls').evaluate('(node)=>node.disabled'),30000)
            page.keyboard.press('Escape');open_players(page)
            assert len(navigation_count)==1,navigation_count
            record('paid-join-ball-fallback-and-legal-move-visible-once-without-refresh',receipts)
            # Canonical quote below supplies the exact current price (UX-10).
            assert not page.locator('dialog').count()
            page.screenshot(path=str(out/'arcade-paid-cannon.png'),full_page=True)
            close_players(page);choose_action(page,'ball')
            # A new ball changes the automatic quote from the same verified revision.
            wait_until(page,lambda:page.locator('#transfer-amount').inner_text()=='0.4 ICP',15000)
            assert page.locator('[data-copy="text"]').is_enabled()
            # UX-04/08: this cannon's intentional draft survives Account and
            # inspection. It is scoped to this cannon, rather than a new default.
            assert page.evaluate('__b2zExperience.session.referenceWorld.version')==3
            assert page.evaluate('__b2zExperience.session.referenceWorld.cannons[0].heading===undefined')
            assert heading_value(page)=='167.15'
            assert page.locator('#text-memo').inner_text()=='ANGLE 37.5',page.locator('#text-memo').inner_text()
            record('same-cannon-draft-retains-screen-heading-and-exact-canonical-memo')
            cell=different_owned_cell(page);choose_action(page,'move')
            choose_cell(page,str(cell))
            # Move is selected from the cannon context.
            point=page.evaluate('(cell)=>__b2zCamera.screen(cell%16+.5,Math.floor(cell/16)+.5)',cell)
            page.mouse.click(point['x'],point['y'])
            assert chosen_cell(page)==str(cell)
            wait_until(page,lambda:page.locator('[data-copy="text"]').is_enabled(),15000)
            assert page.locator('#text-memo').inner_text()==f'MOVE {cell}'
            assert page.locator('#transfer-amount').inner_text()=='0.0001 ICP'
            page.screenshot(path=str(out/'s15-move-selection.png'),full_page=True)
            record('action-price-pairing-stable-card-and-visual-owned-move')
            # New action defaults use the selected cannon; intentional edits in
            # the current action must still survive resize/publication/restart.
            # UX-02: explicit Build belongs to v6, not this legacy ANGLE adapter.
            # Current-rules Build/site/ghost coverage lives in the populated UX
            # journeys; do not try to click a deliberately hidden legacy action.
            select_cannon(page);assert page.locator('#build-action').is_hidden()
            choose_action(page,'ball')
            assert heading_value(page)=='167.15'
            wait_until(page,lambda:page.locator('[data-copy="text"]').is_enabled(),15000)
            set_heading(page,'167.15');review_instructions(page)
            assert page.locator('#text-memo').inner_text()=='ANGLE 37.5'
            page.set_viewport_size({'width':390,'height':844});page.set_viewport_size({'width':1440,'height':900})
            assert heading_value(page)=='167.15'

            page.keyboard.press('Escape')
            # Receipt setup deliberately holds production at authenticated outcomes.
            # Start the continuous-motion measurement from a fresh certified anchor
            # after those holds, through the same restart control available to users.
            page.evaluate('globalThis.__beforeSteadyLive=globalThis.__dtrLive')
            page.evaluate('()=>{void __b2zTools.restart()}')
            wait_until(page,lambda:page.evaluate('Boolean(globalThis.__dtrLive?.connected && globalThis.__dtrLive !== globalThis.__beforeSteadyLive)'),30000)
            assert source_value(page,'recipient')==configuration['recipient']
            assert heading_value(page)=='167.15'
            assert page.locator('#text-memo').inner_text()=='ANGLE 37.5'
            record('aim-survives-certified-state-updates-and-resize')
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
            # UX-04/05/11: controlled Chromium engine suspension while the genuine
            # disposable producer runs. Headless focus emulation does not deliver
            # native tab freeze events; dispatch lifecycle inputs explicitly and
            # pause the real JS engine. This is not a native hidden-tab/device claim.
            page.evaluate("()=>{globalThis.__lifecycleEvents=[];for(const type of ['freeze','resume'])document.addEventListener(type,()=>__lifecycleEvents.push({type,at:performance.timeOrigin+performance.now()}));}")
            lifecycle_cdp=context.new_cdp_session(page)
            before_gap=page.evaluate('({head:__dtrLive.heads.at(-1).toString(),resyncs:__dtrLive.resyncs,camera:{x:__b2zCamera.x,y:__b2zCamera.y,scale:__b2zCamera.scale}})')
            page.evaluate("document.dispatchEvent(new Event('freeze'))");lifecycle_cdp.send('Debugger.enable');frozen_at=time.time();lifecycle_cdp.send('Debugger.pause');time.sleep(35)
            lifecycle_cdp.send('Debugger.resume');page.evaluate("document.dispatchEvent(new Event('resume'))");lifecycle_cdp.send('Debugger.disable');page.bring_to_front()
            (out/'suspension-diagnostics.json').write_text(json.dumps(page.evaluate('({events:__lifecycleEvents,wall:Date.now(),perf:performance.now(),hidden:document.hidden,resyncs:__dtrLive.resyncs,head:__dtrLive.heads.at(-1).toString()})'),indent=2)+'\n')
            wait_until(page,lambda:page.evaluate('__dtrLive.resyncs')>before_gap['resyncs'],30000)
            assert page.evaluate('({x:__b2zCamera.x,y:__b2zCamera.y,scale:__b2zCamera.scale})')==before_gap['camera']
            assert page.evaluate('__dtrLive.playback.consumed_ticks<=__dtrLive.playback.verified_ticks')
            lifecycle_events=page.evaluate('__lifecycleEvents');assert {'freeze','resume'}<={e['type']for e in lifecycle_events}
            report['suspended_return']={'frozen_at_epoch_seconds':frozen_at,'resumed_at_epoch_seconds':time.time(),'before':before_gap,'events':lifecycle_events,'after':page.evaluate('({...__dtrLive.playback,resyncs:__dtrLive.resyncs})'),'qualification':'Controlled lifecycle events plus actual Chromium debugger suspension; genuine disposable certified producer/retained-gap recovery. Native hidden-tab lifecycle is not established by this headless test. No physical-device or production timing claim.'}
            record('UX-04-05-11-controlled-suspended-return-authenticates-recent-view',report['suspended_return'])
            open_settings(page)
            page.evaluate('__b2zTools.delivery(true)');(out/'browser-disconnected').write_text('paused\n')
            target=int(wait_file(page,out/'harness-upgrade-ready',90000))
            wait_until(page,lambda:page.locator('#transfer-controls').evaluate('(node)=>node.disabled') and page.locator('[data-copy="text"]').is_disabled(),20000)
            close_players(page);choose_action(page,'ball')
            set_heading(page,'0');review_instructions(page);assert page.locator('#text-memo').inner_text()=='ANGLE 225'
            assert page.locator('#aim-handle').is_enabled()
            set_heading(page,'167.15')
            record('disconnected-local-aim-with-unavailable-payment-preparation')
            # Negative verification below also covers local aiming before authentication.
            page.keyboard.press('Escape');open_settings(page)
            page.evaluate('__b2zTools.delivery(false)')
            wait_until(page,lambda:page.evaluate('globalThis.__dtrLive.resyncs')>=1 and page.evaluate('globalThis.__dtrLive.heads.at(-1)')>=target,30000)
            heads=page.evaluate('globalThis.__dtrLive.heads.slice()');assert all(b>a for a,b in zip(heads,heads[1:])),heads
            assert source_value(page,'recipient')==configuration['recipient']
            if asset_canister:
                page.reload(timeout=30000)
                wait_until(page,lambda:page.evaluate('Boolean(globalThis.__dtrLive?.connected)'),30000)
                assert source_value(page,'recipient')==configuration['recipient']
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
                    report['negative_state']=negative.evaluate("({phase:document.body.dataset.phase,error:document.querySelector('#observation-error').textContent,connected:Boolean(globalThis.__dtrLive?.connected)})");save();raise
                assert negative.locator('#transfer-controls').evaluate('(n)=>n.disabled')
                assert negative.locator('#arena-note').inner_text()==('Reconnecting'if fault=='unavailable-config'else'Unable to verify game')
                assert not negative.evaluate('Boolean(globalThis.__dtrLive?.connected)')
                if fault=='wrong-certificate-root':
                    open_settings(negative)
                    message=negative.locator('#observation-error').inner_text().lower()
                    assert any(word in message for word in ['certificate','signature','root','bls']),message
                negative.close()
            report.pop('current_negative_case',None)
            record('unavailable-or-unbound-configuration-and-wrong-certificate-root-fail-closed')
            reduced=browser.new_context(reduced_motion='reduce');still=reduced.new_page();still.goto(url,timeout=30000)
            wait_until(still,lambda:still.evaluate('Boolean(globalThis.__dtrLive?.connected)'),30000)
            assert still.locator('body').get_attribute('data-phase')!='PAUSED'
            assert still.locator('#arena-note').inner_text()!='Animation paused'
            reduced.close();record('UX-11-reduced-motion-preserves-essential-playback')

            assert posts and all(url.endswith(('/query','/read_state')) for url in posts),posts
            record('read-only-transport-and-native-webcrypto','All observed browser POSTs are query/read_state; no signing or ledger updates.')
            assert page.evaluate("isSecureContext && typeof crypto.subtle.digest==='function'");assert not errors,errors
            page.screenshot(path=str(out/'deployment.png'),full_page=True)
            report['sandbox']=True;report['browser_version']=browser.version;report['status']='PASS';save()
            (out/'browser-complete').write_text('PASS\n');context.close();browser.close();browser=None
        return 0
    except Exception as error:
        __import__('traceback').print_exc()
        try:
            report['interaction_failure']=page.evaluate('''() => ({phase:document.body.dataset.phase,camera:globalThis.__b2zCamera?{x:__b2zCamera.x,y:__b2zCamera.y,scale:__b2zCamera.scale}:null,selected:globalThis.__b2zTools?.selection(),move:document.querySelector('#move-cell')?.value,memo:document.querySelector('#text-memo')?.textContent,note:document.querySelector('#preparation-note')?.textContent,action:document.querySelector('#action-prompt')?.textContent,offscreen:document.querySelector('#workspace')?.inert})''')
            page.screenshot(path=str(out/'exception-browser.png'))
        except Exception:pass
        report['status']='FAIL';report['error']=repr(error);save();print(report['error'],flush=True);return 1
    finally:
        if wire_capture:
            try:wire_capture.abort()
            except Exception:pass  # abort records explicit failure; never a PASS path
        if browser:
            try:browser.close()
            except Exception:pass
        if wire_capture:
            (out/'wire-index.json').write_text(json.dumps(wire_capture.index(query_timings),indent=2))
        if server and server.poll() is None:
            os.killpg(server.pid,signal.SIGTERM)
            try:server.wait(timeout=5)
            except subprocess.TimeoutExpired:os.killpg(server.pid,signal.SIGKILL);server.wait()
if __name__=='__main__':raise SystemExit(main())
