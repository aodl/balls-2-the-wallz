import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hex} from '@dtr/timeline-runtime/protocol/bytes';
import {encodeCanonical, decodeCanonical, cloneCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
import {rat, cmp} from '../../packages/kernels/b2z/math.mjs';
import {fixtureWorld, encodeWorld, decodeWorld, validateWorld, B2Z_IDENTITY, TEST_CONFIG, position} from '../../packages/kernels/b2z/world.mjs';
import {beginSpawn, spawnStep, spawnRank} from '../../packages/kernels/b2z/spawn.mjs';
import {B2zCursor, encodePayment, matchStrikes} from '../../packages/kernels/b2z/kernel.mjs';
import {scenario} from '../scenarios/b2z.mjs';
const account = n => n.toString(16).padStart(2,'0').repeat(32);
function ball(id, owner, cell, width, vx=1024, vy=0, dx=512, dy=512) {
  return {id,owner,cell,x0:BigInt(cell%width*1024+dx),y0:BigInt(Math.floor(cell/width)*1024+dy),vx,vy};
}
function world(width,height,cells,anchors=[],balls=[]) {
  return fixtureWorld({width,height,cells,cannons:anchors.map((cell,i)=>({id:i+1,cell,account:account(i+1)})),balls});
}
const payment=(n,amount,kind='angle',value=0,pos=0)=>({position:BigInt(pos),payload_hex:hex(encodePayment(account(n),amount,{kind,value}))});
function run(w, end=2n, inputs=[], options={}, budgets=[1000000], restore=false) {
  let c=new B2zCursor(encodeWorld(w),inputs,{...B2Z_IDENTITY,logical_start:w.time[0],logical_end:end},options),slices=0,work=0;
  const phases=new Set();
  while(c.phase!=='done') {
    phases.add(c.phase);work+=c.step(budgets[slices++%budgets.length]).used;
    if(restore){const b=c.snapshot();c=B2zCursor.restore(b,sha256(b));}
    if(slices>300000)throw new Error('test work cap');
  }
  const raw=c.result();return {world:decodeWorld(raw.state),events:decodeCanonical(raw.events),scores:decodeCanonical(raw.scores),raw,work,phases};
}
const fixtures=JSON.parse(readFileSync(new URL('../fixtures/spawn-reference.json',import.meta.url))).cases;
for(const v of fixtures) test(`${v.name}: exhaustive placement agrees with independent masked union-find`,()=>{
  const w=fixtureWorld({...v,time:v.time.map(BigInt),balls:v.balls.map(b=>({...b,x0:BigInt(b.x0),y0:BigInt(b.y0)}))});
  let job=beginSpawn(v.seed),work=0;
  while(!spawnStep(w,job)) {
    if(work++%17===0)job=decodeCanonical(encodeCanonical(job));
    assert(work<200000);
  }
  assert.deepEqual(job.result,v.expected);assert.deepEqual(job.candidates,v.ranked_candidates);
  assert.deepEqual(w.cells,v.cells,'search cannot mutate a rejected candidate');
});
test('all-neutral bootstrap creates one live cannon, nine cells and chosen heading',()=>{
  const w=world(7,7,Array(49).fill(0)),r=run(w,1n,[payment(1,TEST_CONFIG.join_e8s,'angle',16384)],{},[1,13],true);
  const receipt=r.events.receipts[0];assert.equal(receipt.reason,'ACCEPTED');assert.equal(receipt.placement_class,2);
  assert.equal(r.world.cannons.length,1);assert.equal(receipt.patch.length,9);assert.equal(receipt.ball.vx,0);assert.equal(receipt.ball.vy,1024);
  assert.equal(r.world.next_cannon_id,2);assert.equal(r.world.received_e8s,TEST_CONFIG.join_e8s);
  assert(r.phases.has('spawn'));
});
test('two joins in one sealed batch rebuild eligibility and never reuse ordinals',()=>{
  const w=world(12,8,Array(96).fill(0)),inputs=[payment(1,TEST_CONFIG.join_e8s),payment(2,TEST_CONFIG.join_e8s,'angle',32768,1)],r=run(w,1n,inputs,{},[1,17],true);
  assert.deepEqual(r.events.receipts.map(x=>x.reason),['ACCEPTED','ACCEPTED']);
  assert.deepEqual(r.events.receipts.map(x=>x.cannon.id),[1,2]);assert.equal(r.world.next_cannon_id,3);validateWorld(r.world);
});
test('same-account join then fire obeys existing-cannon pricing, not another join',()=>{
  const w=world(7,7,Array(49).fill(0)),r=run(w,1n,[payment(1,TEST_CONFIG.join_e8s),payment(1,10000000n,'angle',0,1)]);
  assert.deepEqual(r.events.receipts.map(x=>x.kind),['cannon_spawned','ball_spawned']);assert.equal(r.world.next_cannon_id,2);
});
test('full-board single-owner fallback steals exactly nine cells without disconnection',()=>{
  const w=world(9,9,Array(81).fill(1),[0],[ball(1,1,0,9,1)]),r=run(w,1n,[payment(2,TEST_CONFIG.join_e8s)]);
  const e=r.events.receipts[0];assert.equal(e.reason,'ACCEPTED');assert.equal(e.placement_class,3);
  assert.deepEqual(e.previous_owners,Array(9).fill(1));assert.equal(e.patch.length,9);validateWorld(r.world);
});
test('live/live frontiers take precedence over interior fallback',()=>{
  const w=world(10,8,Array.from({length:80},(_,i)=>i%10<5?1:2),[0,9],[ball(1,1,0,10,1),ball(2,2,9,10,-1)]);
  const r=run(w,1n,[payment(3,TEST_CONFIG.join_e8s)]);assert.equal(r.events.receipts[0].placement_class,0);
});
test('underfunded and impossible joins retain funds but consume no cannon ordinal',()=>{
  const w=world(2,2,Array(4).fill(0)),r=run(w,1n,[payment(1,1n),payment(2,TEST_CONFIG.join_e8s,'angle',0,1)]);
  assert.deepEqual(r.events.receipts.map(x=>x.reason),['UNDERFUNDED','NO_ELIGIBLE_SPAWN']);assert.equal(r.world.next_cannon_id,1);
  assert.equal(r.world.received_e8s,TEST_CONFIG.join_e8s+1n);
});
test('MOVE without a cannon cannot accidentally create one',()=>{
  const r=run(world(7,7,Array(49).fill(0)),1n,[payment(1,TEST_CONFIG.join_e8s,'move',24)]);
  assert.equal(r.events.receipts[0].reason,'NO_CANNON');assert.equal(r.world.cannons.length,0);
});
test('lifetime ordinal exhaustion fails closed, despite vacant board',()=>{
  const w=world(7,7,Array(49).fill(0));w.next_cannon_id=65536;
  const r=run(w,1n,[payment(1,TEST_CONFIG.join_e8s)]);assert.equal(r.events.receipts[0].reason,'CANNON_ID_EXHAUSTED');
});
test('maximum cannon count gives a retained capacity rejection',()=>{
  const w=world(32,3,Array.from({length:96},(_,i)=>i%32+1),Array.from({length:32},(_,i)=>i),Array.from({length:32},(_,i)=>ball(i+1,i+1,i,32,0,1)));
  const r=run(w,1n,[payment(33,TEST_CONFIG.join_e8s)]);assert.equal(r.events.receipts[0].reason,'CANNON_CAPACITY');
});
function duel(late=32, dy=512) {
  return world(6,3,Array.from({length:18},(_,i)=>i%6<3?1:2),[6,11],
    [ball(1,1,8,6),ball(2,2,9,6,-1024,0,512+late,dy)]);
}
test('near-time opposite strikes annihilate causally at the second arrival',()=>{
  const r=run(duel(),1n,[],{},[1,7],true);
  const e=r.events.events.find(e=>e.kind==='annihilation');assert.deepEqual(e.time,rat(17,32));
  assert.equal(r.world.balls.length,0);assert(!r.events.events.some(e=>e.kind==='capture'));
  assert.deepEqual(r.scores.area_time.map(s=>s.units),[rat(153,32),rat(153,32)]);
});
test('exact inclusive fuse deadline admits opposite arrival before expiry',()=>{
  const r=run(duel(64),1n);assert(r.events.events.some(e=>e.kind==='annihilation'));
  assert(!r.events.events.some(e=>e.kind==='capture'));
});
test('one coordinate unit too late does not undo the earlier committed capture',()=>{
  const r=run(duel(65),1n);assert(!r.events.events.some(e=>e.kind==='annihilation'));
  const e=r.events.events.find(e=>e.kind==='capture');assert.deepEqual(e.time,rat(9,16));assert.deepEqual(e.destroyed_balls,[2]);
});
test('outside spatial tolerance does not match even inside time window',()=>{
  const r=run(duel(32,577),1n);assert(!r.events.events.some(e=>e.kind==='annihilation'));assert(r.events.events.some(e=>e.kind==='capture'));
});
test('pending wall effects survive an exact checkpoint without late mutation of old output',()=>{
  const w=duel(0);w.balls[0].x0-=480n;w.balls[1].x0+=512n; // arrivals 31/32 and 1
  const before=run(w,1n),saved=hex(before.raw.state);assert.equal(before.world.pending.length,1);assert.equal(before.world.balls.length,2);
  const after=run(before.world,2n),whole=run(w,2n);
  assert.deepEqual(after.raw.state,whole.raw.state);assert.equal(hex(before.raw.state),saved);
  assert(after.events.events.some(e=>e.kind==='annihilation'&&cmp(e.time,rat(1))===0));
});
test('checkpoint MOVE can protect a target before its pending strike expires',()=>{
  const w=duel(0);w.balls[0].x0-=480n;w.balls[1].vx=1;
  const a=run(w,1n);assert.equal(a.world.pending.length,1);
  const b=run(a.world,2n,[payment(2,10000n,'move',9)]);
  assert.equal(b.world.cells[9],2);assert(b.events.events.some(e=>e.kind==='strike_cancelled'));
});
test('neutral capture is immediate and cannot arm an opposing-player fuse',()=>{
  const w=world(5,3,[1,1,0,0,0,1,1,0,0,0,1,1,0,0,0],[0],[ball(1,1,6,5)]),r=run(w,1n);
  assert.deepEqual(r.events.events.find(e=>e.kind==='capture').time,rat(1,2));assert.equal(r.world.pending.length,0);
});
test('tie pairing preserves one-to-one matches with unequal ball counts',()=>{
  const w=duel();w.balls.splice(1,0,ball(3,1,8,6));w.balls.sort((a,b)=>a.id-b.id);w.next_ball_id=4;
  const r=run(w,1n);const e=r.events.events.find(e=>e.kind==='annihilation');assert.deepEqual(e.pairs,[[1,2]]);assert(r.world.balls.some(b=>b.id===3));
});
test('strike matcher never pairs same-side records',()=>{
  const w=duel();w.time=rat(1,2);const a={id:0,from:8,to:9,axis:'x',ball:1,owner:1,defender:2,born:w.time,deadline:rat(9,16),position:rat(1536)};
  assert.deepEqual(matchStrikes(w,[a,{...a,ball:10}]),[]);
});
test('fused severance preserves earned credits and neutralizes dead anchor',()=>{
  const {world:w,ticks}=scenario('severance'),r=run(w,ticks,[],{},[1,3,17],true);
  assert.deepEqual(r.world.cannons.map(c=>c.id),[1]);assert.equal(r.world.cells[6],0);
  assert.deepEqual(r.scores.area_time.map(s=>s.units),[rat(197,16),rat(9,4)]);
});
for(const name of ['duel','severance','corner','wall-bounce','dense']) test(`${name}: optimized and full-scan modes produce identical canonical outputs`,()=>{
  const s=scenario(name),a=run(s.world,s.ticks,[],{cacheAreas:true,fastTopology:true}),b=run(s.world,s.ticks,[],{cacheAreas:false,fastTopology:false});
  assert.deepEqual(a.raw,b.raw);assert(a.work<=b.work);
});
for(let seed=0;seed<20;seed++) test(`v3 mixed workload ${seed}: interruptions and input-free segmentation preserve final bytes`,()=>{
  const w=world(10,6,Array.from({length:60},(_,i)=>i%10<5?1:2),[0,9],
    [ball(1,1,22,10,913-seed,207+seed),ball(2,2,27,10,-511-seed,223+seed),ball(3,1,41,10,121+seed,-771+seed),ball(4,2,48,10,-987+seed,-87-seed)]);
  const a=run(w,3n),b=run(w,3n,[],{},[1,19,113],true),first=run(w,1n),second=run(first.world,3n);
  assert.deepEqual(a.raw,b.raw);assert.deepEqual(a.raw.state,second.raw.state);
});
test('v2 state is not silently reinterpreted as v3',()=>{
  const w=world(7,7,Array(49).fill(0));w.version=2;assert.throws(()=>encodeWorld(w),/version/);
});
test('pending strike corruption and cursor checksum mismatch fail closed',()=>{
  const w=duel();w.balls[0].x0-=480n;w.balls[1].vx=1;
  const r=run(w,1n);const bad=cloneCanonical(r.world);bad.pending[0].deadline=rat(0);assert.throws(()=>encodeWorld(bad),/clock/);
  const c=new B2zCursor(encodeWorld(duel()),[],{...B2Z_IDENTITY,logical_start:0n,logical_end:1n});
  assert.throws(()=>B2zCursor.restore(c.snapshot(),'00'.repeat(32)),/integrity/);
});
test('bounded search admissions have a distinct reason from exhaustive absence',()=>{
  const w=world(2,2,Array(4).fill(0)),inputs=Array.from({length:10},(_,i)=>payment(i+1,TEST_CONFIG.join_e8s,'angle',0,i));
  const r=run(w,1n,inputs);assert.deepEqual(r.events.receipts.map(x=>x.reason),
    [...Array(8).fill('NO_ELIGIBLE_SPAWN'),...Array(2).fill('SPAWN_SEARCH_CAPACITY')]);
  assert.equal(r.world.received_e8s,10n*TEST_CONFIG.join_e8s);
});
test('one outstanding strike per ball bounds rapid corner-fire effects',()=>{
  const w=world(3,3,[1,1,2,1,1,2,2,2,2],[0,8],[ball(1,1,4,3,1024,1024,1000,980),ball(2,2,8,3,1)]),r=run(w,1n,[],{},[1],true);
  const arms=r.events.events.filter(e=>e.kind==='strike_armed'&&e.strike.ball===1);
  assert.equal(arms.length,1);assert.equal(arms[0].strike.to,5);
});
test('rejoining after extinction keeps accrued score and creates a younger ordinal',()=>{
  const dead=run(duel(),1n).world,old=cloneCanonical(dead.credits);
  const r=run(dead,2n,[payment(1,TEST_CONFIG.join_e8s)]);
  assert.equal(r.events.receipts[0].cannon.id,3);assert.equal(r.world.next_cannon_id,4);
  for(const s of old)assert(cmp(r.world.credits.find(x=>x.account===s.account).units,s.units)>=0);
});
test('global ball cap is enforced before expensive spawn',()=>{
  const w=world(16,4,Array.from({length:64},(_,i)=>i%16<8?1:2),[0,15],
    Array.from({length:64},(_,i)=>ball(i+1,i<32?1:2,i<32?0:15,16,0,1)));
  const r=run(w,1n,[payment(3,TEST_CONFIG.join_e8s)]);assert.equal(r.events.receipts[0].reason,'BALL_CAPACITY');
});
test('fully occupied fixture masks cannot sacrifice a cannon or ball to force a join',()=>{
  const w=world(3,3,Array(9).fill(1),[0],[ball(1,1,4,3,1)]),r=run(w,1n,[payment(2,TEST_CONFIG.join_e8s)]);
  assert.equal(r.events.receipts[0].reason,'NO_ELIGIBLE_SPAWN');assert.deepEqual(r.world.cannons.map(c=>c.id),[1]);
});
const impactCases=JSON.parse(readFileSync(new URL('../fixtures/impact-reference.json',import.meta.url))).cases;
for(const v of impactCases) test(`${v.name}: exact causal outcome and scores match independent closed-form oracle`,()=>{
  const w=duel();w.balls[0].x0=BigInt(v.left_x0);w.balls[1].x0=BigInt(v.right_x0);
  w.balls[0].y0=BigInt(v.left_y0);w.balls[1].y0=BigInt(v.right_y0);
  const r=run(w,1n,[],{},[1,7,31],true),e=v.expected;
  assert.equal(r.events.events.some(x=>x.kind==='annihilation'),e.annihilates);
  const resolution=r.events.events.find(x=>x.kind===(e.annihilates?'annihilation':'capture'));
  assert.deepEqual(resolution.time,e.resolved_at.map(BigInt));
  assert.deepEqual(r.world.cannons.map(c=>c.id),e.winner?[e.winner]:[]);
  assert.deepEqual(r.scores.area_time.map(s=>s.units),e.scores.map(s=>s.map(BigInt)));
});
test('credit values beyond signed 128 bits remain exact in the reference',()=>{
  const w=world(5,5,Array(25).fill(1),[0],[ball(1,1,6,5,1)]);
  w.credits=[{account:account(1),units:rat((1n<<180n)+1n,65537n)}];
  const r=run(w,1n);assert.deepEqual(r.world.credits[0].units,rat((1n<<180n)+1n+25n*65537n,65537n));
  assert.deepEqual(r.scores.area_time[0].units,rat(25));
});
test('spawn rejects a centre exactly on the patch boundary even when ball.cell is outside',()=>{
  const w=world(7,7,Array(49).fill(1),[0],[ball(1,1,23,7,-1,0,1024,512)]);
  const j=beginSpawn('01'.repeat(32));j.phase='candidate';j.candidates=[{kind:3,cell:25,other:-1,rank:'00'.repeat(32)}];
  while(!spawnStep(w,j)){}
  assert.equal(j.result,null);assert.equal(j.rejection_counts.BALL,1);
});

test('spawn depends on committed inputs, not JS position types or transport metadata',()=>{
  const w=world(7,7,Array(49).fill(0)),base=payment(1,TEST_CONFIG.join_e8s,'angle',8192);
  const expected=run(w,1n,[base]).raw;
  for(const position of [0,'0',0n]) {
    const actual=run(w,1n,[{...base,position,uncommitted_extra:{hint:'ignored'}}],{},[1,31],true).raw;
    assert.deepEqual(actual,expected);
  }
});
