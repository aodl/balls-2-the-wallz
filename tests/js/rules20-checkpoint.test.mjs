import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {encodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
import {COMPACT_RESERVOIR_IDENTITY,RULES20_IDENTITY,RULES20_CONFIG,decodeWorld,encodeWorld,migrateCompactReservoirs,migrateAuthorizationRows} from '../../packages/kernels/b2z/world.mjs';
import {marginalPrice} from '../../packages/kernels/b2z/economy20.mjs';
import {grantForAccount} from '../../packages/kernels/b2z/delegation-v20.mjs';
import {quoteV6} from '../../apps/b2z-observer/action-quote-v6.mjs';
import {contextSites} from '../../apps/b2z-observer/context-sites.mjs';
import {prepareCheckpoint,snapshot} from '../../apps/b2z-observer/model.mjs';
import {projectAnimationEvents} from '../../packages/kernels/b2z/animation-projection.mjs';

const fixture=JSON.parse(readFileSync(new URL('../fixtures/b2z-delegation-v18.json',import.meta.url)));
function checkpoint(){
  const historical=decodeWorld(Buffer.from(fixture.execution.state,'hex'));
  historical.reservoirs='';
  const before=migrateCompactReservoirs(historical),after=migrateAuthorizationRows(before);
  const initial=encodeWorld(before),state=encodeWorld(after),source_id='rules20-checkpoint-fixture';
  const prior={identity:{...COMPACT_RESERVOIR_IDENTITY,source_id},head:{state_hash:sha256(initial),logical_end:before.time[0],source_to_exclusive:2n,seal:{source_anchor:'ab'.repeat(32)}}};
  const identity={...RULES20_IDENTITY,source_id};
  const context={version:16,migration:'B2Z_RULES_20',old_identity:prior.identity,new_identity:identity,
    previous_state:prior.head.state_hash,new_state:sha256(state),logical_boundary:before.time,
    source_cursor:2n,ledger_cutover:2n,account_history_complete_through:2n,index_synced:2n,
    source_anchor:prior.head.seal.source_anchor,memo_adapter_before:12,memo_adapter_after:12};
  const events=encodeCanonical({version:12,receipts:[],events:[{kind:'rules20_activated',sequence:0,time:before.time,context}]});
  const scores=encodeCanonical({version:12,area_time:[]});
  const artifacts={state,events,scores};
  const publication={version:8,identity,head:{seal:null,logical_end:before.time[0],state_hash:sha256(state)},
    epoch:{version:2,metadata_hash:sha256(encodeCanonical(context))},
    artifacts:Object.entries(artifacts).map(([kind,bytes])=>({kind,sha256:sha256(bytes)}))};
  return {initial,artifacts,publication,prior,after,context};
}

test('Rules20 checkpoint verifies the exact paid predecessor migration and source fence',async()=>{
  const row=checkpoint();
  const segment=await prepareCheckpoint(row.initial,row.artifacts,row.publication,row.prior);
  assert.equal(segment.checkpoint,true);
  assert.equal(segment.final.version,12);
  assert.deepEqual(segment.final,row.after);
  assert.deepEqual(snapshot(row.artifacts.state,row.publication.identity),row.after);
});

test('Rules20 derived animation accepts successor state and rejects a mismatched audit version',()=>{
  const world=checkpoint().after;
  const valid=projectAnimationEvents(world,encodeCanonical({version:12,receipts:[],events:[]}));
  assert.deepEqual(valid,{receipts:[],events:[],statistics:{source_events:0,render_events:0,omitted_motion_events:0}});
  assert.throws(()=>projectAnimationEvents(world,encodeCanonical({version:11,receipts:[],events:[]})),/source version/);
});

test('Rules20 checkpoint rejects an authenticated but incomplete source fence',async()=>{
  const row=checkpoint(),context={...row.context,index_synced:1n};
  const artifacts={...row.artifacts,events:encodeCanonical({version:12,receipts:[],events:[
    {kind:'rules20_activated',sequence:0,time:row.after.time,context} ]})};
  const publication={...row.publication,epoch:{...row.publication.epoch,metadata_hash:sha256(encodeCanonical(context))},
    artifacts:row.publication.artifacts.map(item=>item.kind==='events'?{...item,sha256:sha256(artifacts.events)}:item)};
  await assert.rejects(prepareCheckpoint(row.initial,artifacts,publication,row.prior),/Rules20 checkpoint source commitment/);
});

test('Rules20 checkpoint rejects a state-changing cutover despite rebound hashes',async()=>{
  const row=checkpoint(),changed=structuredClone(row.after);changed.received_e8s+=1n;
  const state=encodeWorld(changed),context={...row.context,new_state:sha256(state)};
  const artifacts={state,events:encodeCanonical({version:12,receipts:[],events:[
    {kind:'rules20_activated',sequence:0,time:changed.time,context}]}),scores:row.artifacts.scores};
  const publication={...row.publication,head:{...row.publication.head,state_hash:sha256(state)},
    epoch:{...row.publication.epoch,metadata_hash:sha256(encodeCanonical(context))},
    artifacts:Object.entries(artifacts).map(([kind,bytes])=>({kind,sha256:sha256(bytes)}))};
  await assert.rejects(prepareCheckpoint(row.initial,artifacts,publication,row.prior),/Rules20 checkpoint preserved world/);
});

test('Rules20 browser quote uses the authenticated symbolic tariff and sorted grant rows',()=>{
  const world=checkpoint().after,account=world.cannons[0].account,day=86400000000000n;
  const ballCount=world.balls.filter(b=>b.owner===world.playability.players.find(p=>p.account===account).id).length;
  world.economy_formula_start_ns=2n*day;
  world.economy.snapshots=[{effective_ns:2n*day,previous_multiplier:1000,multiplier:1001,grace_end_ns:2n*day+3600000000000n}];
  const quote=quoteV6(world,RULES20_CONFIG,account,{kind:'fire',cannon:world.cannons[0].id,angle:'0',quantity:1,priced_at_ns:3n*day});
  assert.equal(quote.amount,marginalPrice(RULES20_CONFIG.ball_base_e8s,1001,ballCount));
  assert.equal(grantForAccount(world.authorization,account),null);
  assert.equal(grantForAccount({version:3,grants:[{account:'1'.repeat(64),spender_principal:'a'}]},'1'.repeat(64)).spender_principal,'a');
});

test('Rules20 placement preview removes only the Ball occupancy prohibition',()=>{
  const world=checkpoint().after,ball=world.balls[0],account=world.playability.players.find(p=>p.id===ball.owner).account;
  // A separate spacing rejection remains authoritative at this fixture site.
  assert.notEqual(contextSites(world,RULES20_CONFIG).reason(account,ball.cell),'SITE_OCCUPIED');
  assert.equal(contextSites(world,RULES20_CONFIG).reason(account,ball.cell,{moving:{kind:'cannon',id:world.cannons[0].id}}),'SITE_OCCUPIED');
  const historical=decodeWorld(Buffer.from(fixture.execution.state,'hex'));
  historical.reservoirs='';
  const before=migrateCompactReservoirs(historical);
  assert.equal(contextSites(before,{...RULES20_CONFIG,version:11,rules_version:19}).reason(account,ball.cell),'SITE_OCCUPIED');
});
