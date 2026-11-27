import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {decodeWorld,encodeWorld,migrateCompactReservoirs,migrateAuthorizationRows,validateWorld,setOwner} from '../../packages/kernels/b2z/world.mjs';
import {registerPassage,exempts,retireAfterContact,pruneRemoved} from '../../packages/kernels/b2z/passage-v20.mjs';
import {B2zKernel,classify,passage} from '../../packages/kernels/b2z/kernel.mjs';
import {nextCrossing} from '../../packages/kernels/b2z/geometry.mjs';
import {prepareDeflectorPurchase} from '../../packages/kernels/b2z/deflectors-v12.mjs';
import {encodeDeflectorMemo} from '../../packages/protocol/deflector.mjs';
import {preparePurchase,placeNew} from '../../packages/kernels/b2z/purchases-v6.mjs';
import {encodeV6Memo} from '../../packages/protocol/memo-v6.mjs';

function world(){
 const vector=JSON.parse(readFileSync(new URL('../fixtures/b2z-delegation-v18.json',import.meta.url)));
 const w=migrateAuthorizationRows(migrateCompactReservoirs(decodeWorld(Buffer.from(vector.execution.state,'hex'))));
 const b=w.balls[0];b.cell=500501;b.x0=501n*1024n;b.y0=500n*1024n+512n;b.vx=-32000;b.vy=0;b.den=1n;
 return w;
}
function structure(w){
 const d={id:w.next_deflector_id++,cell:500500,owner:1,orientation:'NE'};
 w.deflectors.push(d);w.deflectors.sort((a,b)=>a.cell-b.cell);return d;
}
test('successor entry-boundary exception survives canonical world roundtrip and retires on exit',()=>{
 const w=world(),d=structure(w),b=w.balls[0];
 registerPassage(w,'deflector',d.id,d.cell);
 assert.equal(w.passage_exceptions.length,1);
 assert.equal(exempts(w,b.id,'deflector',d.id,d.cell),true);
 assert.equal(exempts(w,b.id+1,'deflector',d.id,d.cell),false);
 assert.deepEqual(decodeWorld(encodeWorld(w)),w);
 b.cell=d.cell;
 assert.doesNotThrow(()=>validateWorld(w));
 b.cell=500499;retireAfterContact(w,b.id);
 assert.equal(w.passage_exceptions,undefined);
 assert.equal(exempts(w,b.id,'deflector',d.id,d.cell),false);
});
test('away-boundary and unrelated arriving Ball acquire no passage authority',()=>{
 const w=world(),d=structure(w),b=w.balls[0];
 b.vx=32000; // At the west boundary but travelling away from the new site.
 registerPassage(w,'deflector',d.id,d.cell);
 assert.equal(w.passage_exceptions,undefined);
 b.vx=-32000;
 registerPassage(w,'deflector',d.id,d.cell);
 assert.equal(w.passage_exceptions.length,1);
 d.cell=500600;pruneRemoved(w);
 assert.equal(w.passage_exceptions,undefined);
});
test('only the existing Ball crosses the new structure; later arrivals and returns are blocked',()=>{
 const w=world(),d=structure(w),b=w.balls[0];
 registerPassage(w,'deflector',d.id,d.cell);
 const first=classify(w,b,nextCrossing(b,w.width,w.time,b.den));
 assert.equal(first.targets[0].pass,true);
 assert.deepEqual(passage(w,b,first),{passX:true,passY:false,vertexBlocked:false});
 const arriving={...b,id:w.next_ball_id++,x0:502n*1024n};
 assert.equal(classify(w,arriving,nextCrossing(arriving,w.width,w.time,arriving.den)).targets[0].pass,false);
 b.cell=d.cell;
 assert.equal(exempts(w,b.id,'deflector',d.id,d.cell),true);
 b.cell=500499;retireAfterContact(w,b.id);
 assert.equal(w.passage_exceptions,undefined);
 b.cell=500501;
 assert.equal(classify(w,b,nextCrossing(b,w.width,w.time,b.den)).targets[0].pass,false);
});
test('multiple existing overlapping Balls receive separate bounded passage rows',()=>{
 const w=world(),first=w.balls[0];
 first.cell=500500;first.x0=500n*1024n+512n;first.y0=500n*1024n+512n;
 const second={...first,id:w.next_ball_id++};
 w.balls.push(second);
 const d=structure(w);
 registerPassage(w,'deflector',d.id,d.cell);
 assert.deepEqual(w.passage_exceptions.map(row=>row.ball),[first.id,second.id].sort((a,b)=>a-b));
 assert.equal(exempts(w,first.id,'deflector',d.id,d.cell),true);
 assert.equal(exempts(w,second.id,'deflector',d.id,d.cell),true);
 first.cell=500499;retireAfterContact(w,first.id);
 assert.deepEqual(w.passage_exceptions.map(row=>row.ball),[second.id]);
 assert.equal(exempts(w,first.id,'deflector',d.id,d.cell),false);
});
test('an exact corner tangency does not grant passage through a side tile',()=>{
 const w=world(),d=structure(w),b=w.balls[0];
 b.vx=-22630;b.vy=22625;b.y0=501n*1024n;
 registerPassage(w,'deflector',d.id,d.cell);
 assert.equal(w.passage_exceptions,undefined);
 // If the diagonal is foreign, the successor single-face law enters the
 // preferred friendly side; that is a genuine first traversal.
 setOwner(w,501500,0);
 registerPassage(w,'deflector',d.id,d.cell);
 assert.equal(w.passage_exceptions.length,1);
});
test('explicit Diverter planning relaxes only the successor Ball-occupancy rule',()=>{
 const vector=JSON.parse(readFileSync(new URL('../fixtures/b2z-delegation-v18.json',import.meta.url)));
 const historical=migrateCompactReservoirs(decodeWorld(Buffer.from(vector.execution.state,'hex')));
 const successor=migrateAuthorizationRows(historical);
 const account=successor.playability.players.find(p=>p.id===1).account;
 const memo=encodeDeflectorMemo({kind:'deflect',cell:500500,orientation:'NE'});
 for(const w of [historical,successor]){
  const b=w.balls[0];b.cell=500500;b.x0=500n*1024n+512n;b.y0=500n*1024n+512n;b.vx=32000;b.vy=0;b.den=1n;
 }
 assert.equal(prepareDeflectorPurchase(historical,account,10_000_000n,memo,true).reason,'SITE_OCCUPIED');
 assert.equal(prepareDeflectorPurchase(successor,account,10_000_000n,memo,true).kind,'deflect');
});
test('explicit Cannon planning admits a Ball-occupied successor site without changing historical policy',()=>{
 const vector=JSON.parse(readFileSync(new URL('../fixtures/b2z-delegation-v18.json',import.meta.url)));
 const historical=migrateCompactReservoirs(decodeWorld(Buffer.from(vector.execution.state,'hex')));
 const successor=migrateAuthorizationRows(historical);
 const account=successor.playability.players.find(p=>p.id===1).account;
 const memo=encodeV6Memo({kind:'new',angle:0,quantity:1,cell:500500});
 for(const w of [historical,successor]){
  const b=w.balls[0];b.cell=500500;b.x0=500n*1024n+512n;b.y0=500n*1024n+512n;b.vx=32000;b.vy=0;b.den=1n;
 }
 assert.equal(preparePurchase(historical,account,1_000_000_000n,memo,[],true,true,1).reason,'SITE_OCCUPIED');
 assert.equal(preparePurchase(successor,account,1_000_000_000n,memo,[],true,true,1).kind,'new');
});
test('Cannon birth grants passage only to a Ball already traversing its new tile',()=>{
 const w=world(),b=w.balls[0];
 b.cell=500500;b.x0=500n*1024n+512n;b.y0=500n*1024n+512n;b.vx=32000;b.vy=0;b.den=1n;
 const account=w.playability.players.find(p=>p.id===1).account;
 const memo=encodeV6Memo({kind:'new',angle:0,quantity:1,cell:500500});
 const plan=preparePurchase(w,account,1_000_000_000n,memo,[],true,true,1);
 assert.equal(plan.kind,'new');
 const made=placeNew(w,account,1_000_000_000n,plan,
  {kind:4,cell:500500,patch:[500500],other:0,checked:0},true,true,true,1);
 const exceptions=made.world.passage_exceptions;
 assert.equal(exceptions.length,1);
 assert.equal(exceptions[0].ball,b.id);
 assert.equal(exceptions[0].structure,made.cannon.id);
 assert.equal(exempts(made.world,made.ball.id,'cannon',made.cannon.id,made.cannon.cell),false);
 assert.deepEqual(decodeWorld(encodeWorld(made.world)),made.world);
});
test('Rules20 public continuation lets only the initial Ball pass and retires its exception',()=>{
 const vectors=JSON.parse(readFileSync(new URL('../fixtures/rules20-passage-public-equality.json',import.meta.url))).rows;
 for(const row of vectors){
  const cursor=B2zKernel.begin(Buffer.from(row.initial_hex,'hex'),
   decodeCanonical(Buffer.from(row.inputs_hex,'hex')),
   decodeCanonical(Buffer.from(row.context_hex,'hex')));
  let complete=false;
  for(let n=0;n<1000&&!complete;n++)complete=cursor.step(127).complete;
  assert.equal(complete,true,row.name);
  cursor.finalizeElapsed(BigInt(row.observed_ns));
  const output=cursor.result();
  for(const kind of ['state','events','scores'])
   assert.equal(Buffer.from(output[kind]).toString('hex'),row.outputs[kind].hex,`${row.name} ${kind}`);
  const state=decodeWorld(output.state);
  assert.equal(state.balls.find(ball=>ball.id===1)?.vx,row.expected.ball1_vx,row.name);
  if(row.expected.ball2_vx!==null)
   assert.equal(state.balls.find(ball=>ball.id===2)?.vx,row.expected.ball2_vx,row.name);
  assert.equal(state.passage_exceptions?.length??0,row.expected.passage_count,row.name);
 }
});
