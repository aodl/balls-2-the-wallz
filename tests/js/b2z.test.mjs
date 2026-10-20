import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hex, unhex} from '@dtr/timeline-runtime/protocol/bytes';
import {cloneCanonical, decodeCanonical, encodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {sha256, makeSeal} from '@dtr/timeline-runtime/runtime/seal';
import {SegmentJournal, AtomicJournalStore} from '@dtr/timeline-runtime/runtime/journal';
import {rat, cmp, heading} from '../../packages/kernels/b2z-v2/math.mjs';
import {nextCrossing, reflected} from '../../packages/kernels/b2z-v2/geometry.mjs';
import {beginCapture, topologyStep} from '../../packages/kernels/b2z-v2/topology.mjs';
import {fixtureWorld, encodeWorld, decodeWorld, validateWorld, position, B2Z_IDENTITY, TEST_CONFIG} from '../../packages/kernels/b2z-v2/world.mjs';
import {B2zCursor, B2zKernel, encodePayment, ballPrice} from '../../packages/kernels/b2z-v2/kernel.mjs';
const reference=JSON.parse(readFileSync(new URL('../fixtures/b2z-reference.json',import.meta.url),'utf8'));
const account=id=>id.toString(16).padStart(2,'0').repeat(32);
function ball(id,owner,cell,width,vx=1024,vy=0,dx=512,dy=512) {
  return {id,owner,cell,x0:BigInt(cell%width*1024+dx),y0:BigInt(Math.floor(cell/width)*1024+dy),vx,vy};
}
function world(width,height,cells,anchors,balls) {
  return fixtureWorld({width,height,cells,cannons:anchors.map((cell,i)=>({id:i+1,cell,account:account(i+1)})),balls});
}
function run(w,end=2n,inputs=[],budgets=[100000],restore=false) {
  let c=new B2zCursor(encodeWorld(w),inputs,{...B2Z_IDENTITY,logical_start:w.time[0],logical_end:end});let rounds=0,work=0;
  while(c.phase!=='done') {
    const p=c.step(budgets[rounds%budgets.length]);work+=p.used;rounds++;
    if(restore){const bytes=c.snapshot();c=B2zCursor.restore(bytes,sha256(bytes));}
    if(rounds>200000)throw new Error('test work cap');
  }
  const r=c.result();return {world:decodeWorld(r.state),events:decodeCanonical(r.events),scores:decodeCanonical(r.scores),raw:r,rounds,work};
}
for(const v of reference.geometry) test(v.name,()=>{
  const b={id:1,owner:1,cell:v.cell,x0:BigInt(v.x0),y0:BigInt(v.y0),vx:v.vx,vy:v.vy};
  const e=nextCrossing(b,v.width,rat(v.time));assert.deepEqual(e.time,v.crossing.map(BigInt));assert.equal(e.x,v.x);assert.equal(e.y,v.y);
  const before=position(b,e.time);if(e.x)reflected(b,'x',e.xwall);if(e.y)reflected(b,'y',e.ywall);
  assert.deepEqual(position(b,e.time),before);
  assert(cmp(nextCrossing(b,v.width,e.time).time,e.time)>0);
});
for(const v of reference.topology) test(`${v.name}: independent union-find comparison`,()=>{
  let w=world(v.width,v.height,v.cells,v.anchors,v.balls.map(b=>ball(b.id,b.owner,b.cell,v.width,1,0)));
  let job=beginCapture(w,v.target,v.attacker),n=0;
  while(!topologyStep(w,job)) {
    if(n++%7===0){const p=decodeCanonical(encodeCanonical({world:w,job}));w=p.world;job=p.job;}
    assert(n<10000);
  }
  validateWorld(w);assert.deepEqual(w.cells,v.expected.cells);assert.deepEqual(w.balls.map(b=>b.id),v.expected.ball_ids);
  assert.deepEqual([...job.cells].sort((a,b)=>a-b),v.expected.transferred);assert.deepEqual(job.eliminated,v.expected.dead);
});
test('all u16 headings: bounded speed error and quarter-turn symmetry',()=>{
  for(let a=0;a<65536;a++) {
    const [x,y]=heading(a);assert(x||y);
    const theta=a*Math.PI/32768;
    assert(Math.abs(x-1024*Math.cos(theta))<0.502);assert(Math.abs(y-1024*Math.sin(theta))<0.502);
    if(a<16384)assert.deepEqual(heading(a+16384),[y===0?0:-y,x]);
  }
  assert.deepEqual(heading(0),[1024,0]);assert.deepEqual(heading(16384),[0,1024]);
  assert.throws(()=>heading(65536));assert.throws(()=>heading(0,0));
});
test('one ball bounces from external board and integrates exact area-time',()=>{
  const w=world(5,5,Array(25).fill(1),[12],[ball(1,1,6,5)]),r=run(w,4n);
  assert.deepEqual(position(r.world.balls[0],r.world.time),[rat(4608),rat(1536)]);
  assert.equal(r.world.balls[0].vx,-1024);assert.deepEqual(r.scores.area_time,[{account:account(1),units:rat(100)}]);
});
test('own cannon is a solid entry obstacle',()=>{
  const w=world(5,5,Array(25).fill(1),[7],[ball(1,1,6,5)]),r=run(w,1n);
  assert.deepEqual(position(r.world.balls[0],r.world.time),[rat(1536),rat(1536)]);assert.equal(r.world.balls[0].vx,-1024);
  assert.equal(r.events.events.filter(e=>e.kind==='capture').length,0);
});
test('opponent cannon cell is not capturable',()=>{
  const cells=Array.from({length:18},(_,i)=>i%6<3?1:2);
  const w=world(6,3,cells,[6,9],[ball(1,1,8,6),ball(2,2,10,6,1)]),r=run(w,1n);
  assert.equal(r.world.cells[9],2);assert.equal(r.world.balls[0].vx,-1024);assert.equal(r.events.events.filter(e=>e.kind==='capture').length,0);
});
test('normal impact transfers one cell and reflects',()=>{
  const cells=Array.from({length:18},(_,i)=>i%6<3?1:2),w=world(6,3,cells,[6,11],[ball(1,1,8,6),ball(2,2,4,6,1)]),r=run(w,1n);
  assert.equal(r.world.cells[9],1);assert.equal(r.world.balls[0].vx,-1024);
  assert.deepEqual(r.events.events.find(e=>e.kind==='capture').cells,[9]);
});
test('opposing exact-time impacts annihilate, eliminate and preserve earned scores',()=>{
  const cells=Array.from({length:18},(_,i)=>i%6<3?1:2),w=world(6,3,cells,[6,11],[ball(1,1,8,6),ball(2,2,9,6,-1024)]),r=run(w,2n);
  assert.equal(r.world.balls.length,0);assert.equal(r.world.cannons.length,0);assert(r.world.cells.every(x=>x===0));
  assert.equal(r.events.events.filter(e=>e.kind==='capture').length,0);
  assert.deepEqual(r.scores.area_time,[{account:account(1),units:rat(9,2)},{account:account(2),units:rat(9,2)}]);
});
test('spatially separated wall impacts do not annihilate; a chip can destroy a resident ball',()=>{
  const cells=Array.from({length:18},(_,i)=>i%6<3?1:2),w=world(6,3,cells,[6,11],[ball(1,1,8,6,1024,0,512,100),ball(2,2,9,6,-1024,0,512,900)]),r=run(w,1n);
  assert.equal(r.events.events.filter(e=>e.kind==='annihilation').length,0);assert.deepEqual(r.world.cannons.map(c=>c.id),[1]);
  assert.deepEqual(r.events.events.find(e=>e.kind==='capture').destroyed_balls,[2]);
});
test('articulation capture transfers orphaned region and last-ball elimination neutralizes anchor region',()=>{
  const cells=Array(15).fill(1);for(const i of [6,7,8,9])cells[i]=2;
  const w=world(5,3,cells,[0,6],[ball(1,1,2,5,0,1024),ball(2,2,9,5,-1)]),r=run(w,1n,[],[1,7],true);
  const capture=r.events.events.find(e=>e.kind==='capture');assert.deepEqual(capture.cells,[7,8,9]);assert.deepEqual(capture.eliminated_cannons,[2]);
  assert.equal(r.world.cells[6],0);assert.deepEqual(r.world.cannons.map(c=>c.id),[1]);
  assert.deepEqual(r.scores.area_time,[{account:account(1),units:rat(25,2)},{account:account(2),units:rat(2)}]);
});
test('same-cell conflict favors older cannon, not earlier ball ordinal',()=>{
  const cells=[1,1,1,1,0,2,2,2,2],w=world(3,3,cells,[0,8],[ball(1,2,5,3,-1024),ball(20,1,3,3)]),r=run(w,1n);
  assert.equal(r.world.cells[4],1);assert.equal(r.events.events.filter(e=>e.kind==='capture').length,1);
  assert.equal(r.events.events.find(e=>e.kind==='capture').attacker,1);
});
test('compound corner reflects both axes but chips at most one target',()=>{
  const w=world(3,3,[1,1,2,1,1,2,2,2,2],[0,2],[ball(1,1,4,3,1024,1024),ball(2,2,8,3,1)]),r=run(w,1n);
  const b=r.world.balls.find(b=>b.id===1);assert.equal(b.vx,-1024);assert.equal(b.vy,-1024);
  const capture=r.events.events.filter(e=>e.kind==='capture');assert.equal(capture.length,1);assert.equal(capture[0].target,5);
});
test('no diagonal corner leak when both side cells are owned but diagonal is not',()=>{
  const w=world(3,3,[1,1,1,1,1,1,1,1,2],[0,8],[ball(1,1,4,3,1024,1024),ball(2,2,8,3,1)]),r=run(w,1n);
  assert(r.events.events.some(e=>e.vertex_blocked));assert.equal(r.world.balls[0].cell,4);
  assert.equal(r.events.events.filter(e=>e.kind==='capture').length,0);
});
test('ANGLE pricing uses current active count, retains underfunding and excess',()=>{
  const w=world(5,5,Array(25).fill(1),[12],[ball(1,1,6,5,1)]),inputs=[10000000n,10000000n,50000000n].map((amount,i)=>({position:BigInt(i),payload_hex:hex(encodePayment(account(1),amount,{kind:'angle',value:0}))}));
  const r=run(w,1n,inputs,[1],true);assert.deepEqual(r.events.receipts.map(r=>r.reason),['ACCEPTED','UNDERFUNDED','ACCEPTED']);
  assert.equal(r.world.received_e8s,70000000n);assert.equal(r.world.balls.length,3);assert.equal(ballPrice(2),40000000n);
});
test('MOVE over a ball permits exit; second successful move rejected',()=>{
  const w=world(5,5,Array(25).fill(1),[7],[ball(1,1,6,5)]),inputs=[6,8].map((value,i)=>({position:BigInt(i),payload_hex:hex(encodePayment(account(1),10000n,{kind:'move',value}))}));
  const r=run(w,1n,inputs);assert.equal(r.world.cannons[0].cell,6);assert.equal(r.world.balls[0].vx,1024);
  assert.deepEqual(r.events.receipts.map(x=>x.reason),['ACCEPTED','MOVE_LIMIT']);assert.equal(r.world.received_e8s,20000n);
});
test('MOVE then ANGLE launches at new anchor; reverse ordering launches at old anchor',()=>{
  const w=world(5,5,Array(25).fill(1),[12],[ball(1,1,6,5,1)]);
  const move=hex(encodePayment(account(1),10000n,{kind:'move',value:13})),fire=hex(encodePayment(account(1),10000000n,{kind:'angle',value:0}));
  const a=run(w,1n,[{position:0n,payload_hex:move},{position:1n,payload_hex:fire}]);
  const b=run(w,1n,[{position:0n,payload_hex:fire},{position:1n,payload_hex:move}]);
  assert.equal(a.events.receipts[1].ball.cell,13);assert.equal(b.events.receipts[0].ball.cell,12);
});
test('underfunded, foreign MOVE, malformed memo and unimplemented JOIN have explicit retained-payment receipts',()=>{
  const w=world(3,3,[1,1,1,1,1,1,1,1,2],[0,8],[ball(1,1,4,3,1),ball(2,2,8,3,1)]);
  const malformed=encodePayment(account(1),5n,{kind:'angle',value:0});malformed[51]=0xff;
  const inputs=[hex(encodePayment(account(1),1n,{kind:'move',value:4})),hex(encodePayment(account(1),10000n,{kind:'move',value:8})),hex(malformed),hex(encodePayment(account(3),1000000000n,{kind:'angle',value:0}))].map((payload_hex,i)=>({position:BigInt(i),payload_hex}));
  const r=run(w,1n,inputs);assert.deepEqual(r.events.receipts.map(x=>x.reason),['UNDERFUNDED','NOT_OWN_TERRITORY','MALFORMED_MEMO','JOIN_NOT_IMPLEMENTED_IN_S02']);
  assert.equal(r.world.received_e8s,1000010006n);
});
test('hard per-cannon cap rejects even a fully funded purchase',()=>{
  const w=world(3,3,Array(9).fill(1),[0],Array.from({length:32},(_,i)=>ball(i+1,1,4,3,1)));
  const r=run(w,1n,[{position:0n,payload_hex:hex(encodePayment(account(1),ballPrice(32),{kind:'angle',value:0}))}]);
  assert.equal(r.events.receipts[0].reason,'BALL_CAPACITY');assert.equal(r.world.balls.length,32);
});
test('half-open checkpoint boundary: split execution matches one uninterrupted segment',()=>{
  const b=ball(1,1,6,5);b.x0=1024n;
  const w=world(5,5,Array(25).fill(1),[12],[b]),whole=run(w,2n),first=run(w,1n),second=run(first.world,2n);
  assert.deepEqual(second.raw.state,whole.raw.state);
  assert(first.events.events.every(e=>cmp(e.time,rat(1))<0));
  assert(second.events.events.some(e=>cmp(e.time,rat(1))===0));
});
test('B2Z host journals survive interruption inside capture and publish only complete output',()=>{
  const cells=Array(15).fill(1);for(const i of [6,7,8,9])cells[i]=2;
  const w=world(5,3,cells,[0,6],[ball(1,1,2,5,0,1024),ball(2,2,9,5,-1)]),state=encodeWorld(w);
  let host=SegmentJournal.create(state,{source_id:'11'.repeat(32),...B2Z_IDENTITY},{logical_start:0n,source_from:0n},B2zKernel);
  const seal=makeSeal({source_id:'11'.repeat(32),...B2Z_IDENTITY,segment_id:0n,logical_start:0n,logical_end:1n,
    source_from:0n,source_to_exclusive:0n,source_anchor:'00'.repeat(32),previous_state:sha256(state),previous_manifest:'00'.repeat(32)},[],0n);
  host.prepare(seal,[]);let seenCapture=false;
  while(host.store.read().stage.phase!=='ready') {
    host.advance(1,1);const p=host.store.read();const cursor=B2zCursor.restore(unhex(p.stage.cursor_hex),p.stage.cursor_hash);
    if(cursor.phase==='topology'&&cursor.jobMeta.kind==='capture')seenCapture=true;
    assert.equal(host.committed().state_hash,sha256(state));const saved=host.store.snapshot();
    host=new SegmentJournal(AtomicJournalStore.restore(saved,sha256(saved)),B2zKernel);
  }
  assert(seenCapture);host.publish(host.store.read().stage.ready_hash);assert.deepEqual(unhex(host.committed().state_hex),run(w,1n).raw.state);
});
test('malformed normalized payment traps the stage rather than silently advancing source effects',()=>{
  const w=world(3,3,Array(9).fill(1),[0],[ball(1,1,4,3,1)]);
  assert.throws(()=>run(w,1n,[{position:0n,payload_hex:'00'}]));
});
test('B2Z rejects unexpected rules, invalid owner state and corrupt snapshots',()=>{
  const w=world(3,3,Array(9).fill(1),[0],[ball(1,1,4,3,1)]);
  assert.throws(()=>new B2zCursor(encodeWorld(w),[],{...B2Z_IDENTITY,config_hash:'00'.repeat(32),logical_start:0n,logical_end:1n}));
  const invalid=cloneCanonical(w);invalid.balls=[];assert.throws(()=>encodeWorld(invalid));
  const c=new B2zCursor(encodeWorld(w),[],{...B2Z_IDENTITY,logical_start:0n,logical_end:1n}),bytes=c.snapshot();bytes[0]^=1;
  assert.throws(()=>B2zCursor.restore(bytes,'00'.repeat(32)),/integrity/);
});
for(let seed=1;seed<=24;seed++)test(`mixed-trajectory conformance seed ${seed}: partition and restart invariant`,()=>{
  let x=seed;const rand=n=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x%n;};
  const width=8,height=6,cells=Array.from({length:48},(_,i)=>i%8<4?1:2),balls=[];
  for(let owner=1;owner<=2;owner++)for(let j=0;j<3;j++){
    const cell=rand(height)*width+rand(4)+(owner===1?0:4),[vx,vy]=heading(rand(65536));balls.push(ball(balls.length+1,owner,cell,width,vx,vy));
  }
  const w=world(width,height,cells,[16,23],balls),a=run(w,3n),b=run(w,3n,[],[7,31,113],true);
  assert.deepEqual(a.raw,b.raw);assert.equal(a.work,b.work);validateWorld(b.world);
});
