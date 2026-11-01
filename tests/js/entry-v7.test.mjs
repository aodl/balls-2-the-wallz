import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
import{decodeWorld,encodeWorld,validateWorld,ownerAt,ENTRY_IDENTITY,PLAYABILITY_IDENTITY}from'../../packages/kernels/b2z/world.mjs';
import{beginEntrySpawn,beginSpawn,spawnStep}from'../../packages/kernels/b2z/spawn.mjs';
import{distanceSquared,rectangleBound}from'../../packages/kernels/b2z/entry-v7.mjs';
import{preparePurchase,placeNew}from'../../packages/kernels/b2z/purchases-v6.mjs';import{encodeV6Memo}from'../../packages/protocol/memo-v6.mjs';
import{B2zCursor,encodePayment}from'../../packages/kernels/b2z/kernel.mjs';import{decodeCanonical}from'@dtr/timeline-runtime/runtime/canonical';import{sha256}from'@dtr/timeline-runtime/runtime/seal';
import{prepareCheckpoint,CheckpointPlayer}from'../../apps/b2z-observer/model.mjs';
const f=JSON.parse(readFileSync(new URL('../fixtures/rules-v6.json',import.meta.url))),account='02'.repeat(32);
function full(){const w=decodeWorld(Buffer.from(f.cases.idle.state_hex,'hex'));w.ownership.base.fill(1);w.ownership.overrides=[];w.ownership.counts=[{owner:1,cells:1000000}];return validateWorld(w);}
function search(w,{recover=false}={}){let job=beginEntrySpawn(w,'ab'.repeat(32)),steps=0;for(;;){const done=spawnStep(w,job);steps++;if(done)break;if(recover&&steps%7===0)job=decodeCanonical((awaitEncode(job)));assert.ok(steps<500000,'bounded test work');}return{job,steps};}
const awaitEncode=j=>encodeCanonical(j);
import{encodeCanonical}from'@dtr/timeline-runtime/runtime/canonical';
test('a fully coloured world admits the exact antipodal first cannon and takes only its nine seed cells',()=>{const w=full(),before=encodeWorld(w),{job,steps}=search(w),c=w.cannons[0],expected=((Math.floor(c.cell/1000)+500)%1000)*1000+(c.cell%1000+500)%1000;assert.equal(job.result.cell,expected);assert.equal(distanceSquared(w,expected),500000);assert.ok(steps<300);const memo=encodeV6Memo({kind:'new',angle:0,quantity:1,cell:null}),p=preparePurchase(w,account,100000000n,memo),made=placeNew(w,account,100000000n,p,job.result,true);validateWorld(made.world);assert.equal(made.world.ownership.counts.find(c=>c.owner===1).cells,999991);assert.deepEqual(made.world.credits,w.credits);assert.deepEqual(made.world.balls.slice(0,w.balls.length),w.balls);assert.deepEqual(encodeWorld(w),before);assert.throws(()=>placeNew(w,account,100000000n,p,job.result),/NEUTRAL/);});
test('entry geometry is exact against an independent million-cell brute force and lowest-cell tie break',()=>{const w=full(),c=w.cannons[0];w.cannons.push({...c,id:2,cell:(c.cell+500)%1000000});w.playability.lifecycle.push({cannon:2,player:1,generation:1});w.next_cannon_id=3;validateWorld(w);let best=-1,cell=-1;for(let y=0;y<1000;y++)for(let x=0;x<1000;x++){let near=Infinity;for(const c of w.cannons){let dx=Math.abs(x-c.cell%1000),dy=Math.abs(y-Math.floor(c.cell/1000));dx=Math.min(dx,1000-dx);dy=Math.min(dy,1000-dy);near=Math.min(near,dx*dx+dy*dy);}if(near>best){best=near;cell=y*1000+x;}}const{job}=search(w);assert.equal(job.result.cell,cell);assert.equal(distanceSquared(w,cell),best);});
test('rectangle bounds dominate every cell even across seams',()=>{const w=full();for(const r of [[0,13,990,999],[400,420,200,215],[0,999,0,999]]){const bound=rectangleBound(w,r);for(const x of[r[0],Math.floor((r[0]+r[1])/2),r[1]])for(const y of[r[2],Math.floor((r[2]+r[3])/2),r[3]])assert.ok(distanceSquared(w,y*1000+x)<=bound);}});
test('resuming the private search preserves deterministic placement',()=>{const w=full();assert.deepEqual(search(w,{recover:true}).job.result,search(w).job.result);});
test('historical v6 still rejects a fully occupied first spawn',()=>{const w=full(),j=beginSpawn('ab'.repeat(32));let steps=0;while(!spawnStep(w,j))assert.ok(++steps<2000);assert.equal(j.result,null);});
test('rules-7 identity runs the unchanged memo/payment path while historical identity remains distinct',()=>{const w=full(),memo=encodeV6Memo({kind:'new',angle:16384,quantity:2,cell:null}),payment=encodePayment(account,110000000n,{kind:'angle',value:0});payment.set(memo,48);const c=new B2zCursor(encodeWorld(w),[{position:99n,payload_hex:Buffer.from(payment).toString('hex')}],{...ENTRY_IDENTITY,logical_start:w.time[0],logical_end:w.time[0]+1n});let steps=0;for(;;){const r=c.step(1);steps+=r.used;if(r.complete)break;assert.ok(steps<500000);if(steps%13===0){const bytes=c.snapshot();Object.assign(c,B2zCursor.restore(bytes,sha256(bytes)));}}c.finalizeElapsed(w.playability.elapsed_ns+1000000000n);const out=c.result(),receipt=decodeCanonical(out.events).receipts[0];assert.equal(receipt.status,'applied');assert.equal(receipt.actual_quantity,2);assert.equal(receipt.amount_used,110000000n);assert.notEqual(ENTRY_IDENTITY.rules_hash,PLAYABILITY_IDENTITY.rules_hash);assert.equal(ENTRY_IDENTITY.schema_hash,PLAYABILITY_IDENTITY.schema_hash);});

test('new-rule quotes and presentation accept occupied entry while old-rule quotes remain blocked',async()=>{const {projectAnimationEvents}=await import('../../packages/kernels/b2z/animation-projection.mjs');const {ENTRY_CONFIG,PLAYABILITY_CONFIG}=await import('../../packages/kernels/b2z/world.mjs'),{quoteV6}=await import('../../apps/b2z-observer/action-quote-v6.mjs'),{B2zView,snapshot}=await import('../../apps/b2z-observer/model.mjs'),vectors=JSON.parse(readFileSync(new URL('../fixtures/entry-v7.json',import.meta.url))),w=full();assert.equal(quoteV6(w,ENTRY_CONFIG,account,{kind:'new'}).amount,100000000n);assert.throws(()=>quoteV6(w,PLAYABILITY_CONFIG,account,{kind:'new'}),/NO_ELIGIBLE/);for(const row of vectors.rows){const initial=snapshot(Buffer.from(row.initial_hex,'hex'),ENTRY_IDENTITY),out=snapshot(Buffer.from(row.outputs.state.hex,'hex'),ENTRY_IDENTITY),view=new B2zView(initial);for(const e of projectAnimationEvents(initial,Buffer.from(row.outputs.events.hex,'hex')).events)view.apply(e);assert.equal(view.matches(out),true);}});

// Synthetic content checks supplement the installed certificate/sequence rehearsal.
function entryCheckpoint(priorVersion=8,change=()=>{}){
 const initial=full(),state=encodeWorld(initial),source_id='aa'.repeat(32),source_anchor='bb'.repeat(32),prior={version:priorVersion,identity:{...PLAYABILITY_IDENTITY,source_id},head:{state_hash:sha256(state),logical_end:initial.time[0],source_to_exclusive:3n,seal:{source_anchor}}};
 const identity={...ENTRY_IDENTITY,source_id},context={version:4,migration:'B2Z_FARTHEST_ENTRY_RULES_07',old_identity:prior.identity,new_identity:identity,previous_state:sha256(state),new_state:sha256(state),logical_boundary:initial.time,source_cursor:3n,ledger_cutover:5n,account_history_complete_through:5n,index_synced:5n,source_anchor,memo_adapter_before:4,memo_adapter_after:4},final=structuredClone(initial);
 change({context,final,identity,prior});
 const artifacts={state:encodeWorld(final),events:encodeCanonical({version:6,receipts:[],events:[{kind:'rules_activated',sequence:0,time:initial.time,context}]}),scores:encodeCanonical({version:6,area_time:[]})},publication={version:priorVersion===6?7:8,identity,head:{seal:null,logical_end:initial.time[0],state_hash:sha256(artifacts.state)},epoch:{version:priorVersion===6?1:2,metadata_hash:sha256(encodeCanonical(context))},artifacts:Object.entries(artifacts).map(([kind,bytes])=>({kind,sha256:sha256(bytes)}))};
 return{state,artifacts,publication,prior};
}
async function checkpoint(c){return prepareCheckpoint(c.state,c.artifacts,c.publication,c.prior);}
test('entry handoff accepts exact first and subsequent epochs without changing world bytes',async()=>{
 for(const version of[6,7,8,9]){const c=entryCheckpoint(version),prepared=await checkpoint(c),player=new CheckpointPlayer(prepared);assert.equal(prepared.start,prepared.end);assert.equal(player.advance(prepared.end).matches(prepared.initial),true);assert.equal(c.publication.head.state_hash,c.prior.head.state_hash);}
});
test('entry handoff rejects changed paid state and self-consistent forged cutover metadata',async()=>{
 for(const change of[
  ({context})=>context.memo_adapter_after=5,
  ({context})=>context.source_cursor=4n,
  ({context})=>context.source_anchor='cc'.repeat(32),
  ({context})=>context.index_synced=4n,
  ({context})=>context.migration='another-rule',
  ({context})=>context.account_history_complete_through=6n,
  ({context})=>context.unreviewed_field=true,
  ({final})=>final.received_e8s+=1n,
  ({final})=>final.playability.elapsed_ns+=1n,
  ({identity})=>identity.rules_hash=PLAYABILITY_IDENTITY.rules_hash,
  ({identity})=>identity.source_id='dd'.repeat(32),
 ])await assert.rejects(checkpoint(entryCheckpoint(8,change)),/observer:/);
 const wrong=entryCheckpoint();wrong.publication.epoch.metadata_hash='00'.repeat(32);await assert.rejects(checkpoint(wrong),/context commitment/);
});
