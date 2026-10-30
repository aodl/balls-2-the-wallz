import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {encodeCanonical,decodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
import {B2zCursor} from '../../packages/kernels/b2z/kernel.mjs';
import {decodeWorld,encodeWorld,validateWorld,territoryBallCount} from '../../packages/kernels/b2z/world.mjs';
const cache=new Map();
const f=JSON.parse(fs.readFileSync(new URL('../fixtures/rules-v6.json',import.meta.url)));
function execute(name){if(cache.has(name))return cache.get(name);const v=f.cases[name],state=Buffer.from(v.state_hex,'hex'),inputs=decodeCanonical(Buffer.from(v.inputs_hex,'hex')),seal=decodeCanonical(Buffer.from(v.seal_hex,'hex'));let c=new B2zCursor(state,inputs,seal),work=0;
 for(;;){const r=c.step(1);work+=r.used;c=B2zCursor.restore(c.snapshot(),sha256(c.snapshot()));if(r.complete)break;assert.ok(work<100000);}
 assert.throws(()=>c.result(),/incomplete/);const pending=c.snapshot();assert.throws(()=>c.finalizeElapsed(0n),/TIME_ROLLBACK/);assert.deepEqual(c.snapshot(),pending);
 c.finalizeElapsed(BigInt(v.observed_ns));assert.throws(()=>c.finalizeElapsed(BigInt(v.observed_ns)),/FINALIZATION_STATE/);
 const o=c.result();for(const[k,b]of Object.entries(o))assert.equal(sha256(b),v[`${k}_sha256`],`${name}: ${k}`);validateWorld(decodeWorld(o.state));const result={c,o,events:decodeCanonical(o.events),before:decodeWorld(state),inputs};cache.set(name,result);return result;}
for(const n of Object.keys(f.cases))test(`complete v6 ${n} segment restores at every work boundary and matches output bytes`,()=>{execute(n);});
test('ordered payments are tallied once, with explicit partial-fill and rejection outcomes',()=>{
 const{c,events,before,inputs}=execute('ordered'),total=inputs.reduce((sum,i)=>sum+Buffer.from(i.payload_hex,'hex').readBigUInt64BE(40),0n);
 assert.equal(c.world.received_e8s,before.received_e8s+total);assert.equal(events.receipts.length,3);assert.deepEqual(events.receipts.map(r=>r.position),[100n,101n,102n]);assert.deepEqual(events.receipts.map(r=>r.status),['applied','rejected','applied']);
 assert.deepEqual(events.receipts[0].per_item_prices,[10000000n,40000000n]);assert.equal(events.receipts[1].remainder,10000000n);assert.equal(events.receipts[1].amount_used,0n);
});
test('explicit New buys one cannon and the requested prefix, not another cannon',()=>{const{events,before,c}=execute('additional');const r=events.receipts[0];assert.deepEqual(r.per_item_prices,[400000000n,40000000n,90000000n]);assert.equal(r.actual_quantity,3);assert.equal(c.world.cannons.length,before.cannons.length+1);assert.equal(c.world.balls.length,before.balls.length+3);});
test('illegal second move preserves the first committed position and reports retained payment',()=>{const{c,events}=execute('move');const[a,b]=events.receipts;assert.equal(a.kind,'cannon_moved');assert.equal(b.reason,'MOVE_LIMIT');assert.equal(b.amount_used,0n);assert.equal(b.remainder,10000n);assert.equal(c.world.cannons[0].cell,a.after);});
test('the full interpreter pairs a defended capture, preserves unpaired balls and stamps real elapsed grace',()=>{
 const {c,events}=execute('mutual'),pair=events.events.find(e=>e.kind==='capture_annihilation');assert.ok(pair);assert.equal(pair.cancelled_capture,true);assert.deepEqual(pair.pairs.map(p=>p.balls),[[3,1]]);assert.ok(c.world.balls.some(b=>b.id===2));assert.equal(territoryBallCount(c.world,1),1);assert.equal(territoryBallCount(c.world,2),1);assert.equal(c.world.playability.lifecycle[2].deadline_ns,c.world.playability.elapsed_ns+86400000000000n);assert.equal(pair.dormant[0].deadline_ns,c.world.playability.lifecycle[2].deadline_ns);
});
test('a completed bridge capture marks only the empty island dormant without silently deleting balls',()=>{
 const {c,events}=execute('bridge_left');assert.equal(c.world.balls.length,2);assert.equal(territoryBallCount(c.world,1),1);assert.equal(territoryBallCount(c.world,2),0);const birth=events.events.find(e=>e.kind==='capture'&&e.dormant.length);assert.ok(birth);assert.equal(birth.dormant[0].cannon,2);assert.equal(birth.dormant[0].deadline_ns,c.world.playability.elapsed_ns+86400000000000n);
});
test('a paid zero-ball island revival cancels grace without restoring the lost territory',()=>{
 const v=f.cases.revival,st=Buffer.from(v.state_hex,'hex'),inputs=decodeCanonical(Buffer.from(v.inputs_hex,'hex')),seal=decodeCanonical(Buffer.from(v.seal_hex,'hex')),atCommand=new B2zCursor(st,inputs,seal);
 while(atCommand.phase!=='search')atCommand.step(1);
 assert.equal(atCommand.world.ownership.counts[0].cells,1,'revival itself restores no ordinary land');
 const {before,c,events}=execute('revival');assert.equal(before.balls.length,0);assert.equal(c.world.playability.lifecycle[0].deadline_ns,undefined);assert.equal(events.receipts[0].amount_used,10000000n);assert.equal(events.events.find(e=>e.kind==='ball_spawned').revived,true);
 assert.ok(events.events.some(e=>e.kind==='capture'),'later verified simulation can earn new territory');
});
