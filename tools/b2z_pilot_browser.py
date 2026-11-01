from pathlib import Path
import json,time,re,sys,argparse
from playwright.sync_api import sync_playwright
sys.path.insert(0,str(Path('tools').resolve()))
from browser_observer import wait_until
from b2z_pilot_receipt import receipt_row_matches
args=argparse.ArgumentParser(description='Read-only B2Z paid-action browser witness; no signing or controller operations.');args.add_argument('--directory',required=True);args.add_argument('--skip-existing-request',action='store_true');opts=args.parse_args()
out=Path(opts.directory);out.mkdir(parents=True,exist_ok=True);accounts={p['account_identifier']for p in json.loads(Path('config/agents/players.public.json').read_text())['players']}
def save(name,v):
 p=out/name;t=p.with_suffix(p.suffix+'.tmp');t.write_text(json.dumps(v,indent=2)+'\n');t.replace(p)
def number(v):return int(v['$integer'])if isinstance(v,dict)else int(v)
nav=[];errors=[];current=None;seen={};started=time.monotonic();ignored=json.loads((out/'request.json').read_text())['plan_id'] if opts.skip_existing_request and (out/'request.json').exists() else None
with sync_playwright()as p:
 b=p.chromium.launch(headless=True,chromium_sandbox=True);c=b.new_context(viewport={'width':1440,'height':900});page=c.new_page();page.on('framenavigated',lambda f:nav.append(f.url)if f==page.main_frame else None);page.on('pageerror',lambda e:errors.append(str(e)))
 try:
  page.goto('https://s45ab-wiaaa-aaaar-qcifq-cai.icp0.io/',timeout=60000);wait_until(page,lambda:page.evaluate('Boolean(globalThis.__dtrLive?.connected)'),60000);save('connected.json',{'at_ms':time.time()*1000,'head':page.evaluate('__dtrLive.heads.at(-1)')})
  while time.monotonic()-started<8*3600+600 and not (out.parent/'browser-stop').exists():
   request=out/'request.json'
   if request.exists():
    r=json.loads(request.read_text());pid=r['plan_id'];assert re.fullmatch('[0-9a-f]{64}',pid);assert r['account']in accounts
    if pid==ignored:page.wait_for_timeout(500);continue
    if current!=pid:
     if page.locator('#play-dialog').evaluate('(e)=>e.open'):page.locator('#play-dialog [data-close]').click()
     page.locator('#identify-button').click();page.locator('#identify-dialog details').first.evaluate('(e)=>e.open=true');page.locator('#identity-account').fill(r['account']);page.locator('#identity-principal').fill('');page.locator('#identity-save').click();page.locator('#join-action' if 'New' in r['action'] else '#fire-action').click();
     if 'New' not in r['action']:page.locator('#selected-cannon').select_option(str((r['action'].get('Fire')or r['action'].get('Move'))['cannon']))
     current=pid;seen.setdefault(pid,{'started_at_ms':time.time()*1000});save('ready.json',{'plan_id':pid,'head':page.evaluate('__dtrLive.heads.at(-1)')})
    if r.get('block_index')is not None:
     pos=number(r['block_index']);row=page.locator('#live-receipts tr').filter(has=page.locator('td:first-child',has_text=re.compile('^'+str(pos)+'$')))
     if row.count():
      text=row.inner_text();s=seen[pid];s.setdefault('receipt_seen_at_ms',time.time()*1000);s['receipt_text']=text
      if r.get('receipt')and receipt_row_matches(row.locator('td').all_text_contents(),row.get_attribute('data-reason'),row.get_attribute('data-kind'),r['receipt']['receipt']):
       rr=r['receipt'];logical=number(rr['reference']['logical_time']);cannon=rr['receipt']['cannon'];live=page.evaluate('({heads:__dtrLive.heads.slice(-1),delivery:{acceptedHeads:__dtrLive.delivery.acceptedHeads.slice(-1),failures:__dtrLive.delivery.failures},playback:__dtrLive.playback,resyncs:__dtrLive.resyncs})');playback=live.get('playback')or{}
       if playback.get('consumed_ticks',-1)>=logical and page.locator('#selected-cannon option[value="'+str(cannon)+'"]').count():
        
        if not s.get('screenshot'):page.locator('#selected-cannon').select_option(str(cannon))
        if page.locator('#play-dialog').evaluate('(e)=>e.open'):page.locator('#play-dialog [data-close]').click()
        page.locator('#centre-cannon').click();camera=page.evaluate('({x:__b2zCamera.x,y:__b2zCamera.y})');cell=int(camera['y'])*1000+int(camera['x']);expected=rr['receipt'].get('after',r.get('expected_cannon_cell'))
        if expected is not None and cell!=number(expected):page.wait_for_timeout(500);continue
        accepted=live['delivery']['acceptedHeads'][-1];s.setdefault('visible_at_ms',time.time()*1000)
        witness={'version':'b2z-pilot-browser-3','presentation_cannon_cell':cell,'expected_cannon_cell':expected,'status':'PASS','plan_id':pid,'cannon':cannon,'visible_cannon_ids':[cannon],'rendered_logical_time':playback['consumed_ticks'],'head':live['heads'][-1],'root':accepted['root'],'navigations_after_initial':len(nav)-1,'page_errors':errors,'receipt_text':text,'receipt_seen_at_ms':s['receipt_seen_at_ms'],'visible_at_ms':s['visible_at_ms'],'at_ms':time.time()*1000,'resyncs':live['resyncs'],'delivery_failures':live['delivery']['failures']};assert len(nav)==1;assert not errors;save(pid+'.json',witness)
        if not s.get('screenshot'):
         page.screenshot(path=str(out/(pid+'.png')));s['screenshot']=True
   if int(time.monotonic()-started)%30==0:save('status.json',{'at_ms':time.time()*1000,'head':page.evaluate('__dtrLive.heads.at(-1)'),'navigations':len(nav),'errors':errors})
   page.wait_for_timeout(500)
 except BaseException as e:
  save('failure.json',{'error':repr(e),'page_errors':errors,'navigations':nav});page.screenshot(path=str(out/'failure.png'));raise
 finally:
  save('final.json',{'heads':page.evaluate('globalThis.__dtrLive?.heads'),'page_errors':errors,'navigations':nav,'requests':seen});c.close();b.close()
