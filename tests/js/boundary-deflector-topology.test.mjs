import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import{encodeCanonical,decodeCanonical}from'@dtr/timeline-runtime/runtime/canonical';import{sha256}from'@dtr/timeline-runtime/runtime/seal';
import{CaptureJob}from'../../packages/kernels/b2z/capture-v6.mjs';import{encodeWorld,decodeWorld,validateWorld,playerAt,validStrike,position}from'../../packages/kernels/b2z/world.mjs';import{prepareDeflectorPurchase}from'../../packages/kernels/b2z/deflectors-v12.mjs';import{occupiedCells,preparePurchaseClearance}from'../../packages/kernels/b2z/purchases-v6.mjs';import{encodeV6Memo}from'../../packages/protocol/memo-v6.mjs';import{encodeDeflectorMemo}from'../../packages/protocol/deflector.mjs';import{ACCOUNT,successorWorld}from'../scenarios/boundary-deflector.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/boundary-deflector-topology-v12.json',import.meta.url)));
for(const[name,v]of Object.entries(fixture.cases))test(`successor topology ${name}: commit-only structure removals and every-unit recovery`,()=>{
 const w=decodeWorld(Buffer.from(v.before_hex,'hex')),before=encodeWorld(w);let j=v.pairs?CaptureJob.cleanup(w,v.pairs):CaptureJob.capture(w,v.target,v.ball),work=0;
 while(!j.step(w)){assert.deepEqual(encodeWorld(w),before);j=CaptureJob.fromState(decodeCanonical(encodeCanonical(j.toState())));assert(++work<10000);}
 validateWorld(w);assert.equal(sha256(encodeWorld(w)),v.state_sha256);assert.equal(sha256(encodeCanonical(j.event())),v.event_sha256);assert.deepEqual(w.deflectors.map(d=>d.id).sort(),v.retained);for(const d of w.deflectors)assert.equal(playerAt(w,d.cell),d.owner);assert.deepEqual(j.event().removed_deflectors.map(d=>d.id).sort(),v.removed);const after=encodeWorld(w);assert(j.step(w));assert.deepEqual(encodeWorld(w),after);
});
test('all construction planners share protected structure occupancy, including inclusive live-ball closure',()=>{
 const w=successorWorld();w.deflectors=[{id:1,owner:1,cell:4005,orientation:'NW'}];w.next_deflector_id=2;validateWorld(w);
 assert(occupiedCells(w).has(4005));assert.equal(preparePurchaseClearance(w,ACCOUNT,1000000000n,encodeV6Memo({kind:'move_cannon',cannon:1,cell:4005})).reason,'SITE_OCCUPIED');assert.equal(preparePurchaseClearance(w,ACCOUNT,1000000000n,encodeV6Memo({kind:'new',angle:0,quantity:1,cell:4005})).reason,'ILLEGAL_ADJACENT_SITE');assert.equal(prepareDeflectorPurchase(w,ACCOUNT,10000000n,encodeDeflectorMemo({kind:'deflect',cell:4005,orientation:'NE'})).reason,'SITE_OCCUPIED');
 for(const cell of[4004,1001])assert.equal(prepareDeflectorPurchase(w,ACCOUNT,10000000n,encodeDeflectorMemo({kind:'deflect',cell,orientation:'NE'})).reason,'SITE_OCCUPIED');
 const b=w.balls[0];b.x0=2048n;b.vx=-32000;b.vy=0;validateWorld(w);for(const cell of[1001,1002]){assert(occupiedCells(w).has(cell));assert.equal(prepareDeflectorPurchase(w,ACCOUNT,10000000n,encodeDeflectorMemo({kind:'deflect',cell,orientation:'NE'})).reason,'SITE_OCCUPIED');}
});

test('a genuine adjacent hostile strike and capture are blocked specifically by protected occupancy',()=>{
 const v=fixture.protection,w=decodeWorld(Buffer.from(v.before_hex,'hex')),protectedWorld=decodeWorld(Buffer.from(v.protected_hex,'hex')),strike=decodeCanonical(Buffer.from(v.strike_hex,'hex'));assert(validStrike(w,strike));assert.doesNotThrow(()=>CaptureJob.capture(w,v.target,v.ball));assert.equal(validStrike(protectedWorld,strike),false);assert.throws(()=>CaptureJob.capture(protectedWorld,v.target,v.ball),/INVALID_CAPTURE/);assert.equal(protectedWorld.deflectors.length,1);
});
test('reviving or expiring the dormant cannon never restores a destroyed Deflector',async()=>{
 const {B2zCursor}=await import('../../packages/kernels/b2z/kernel.mjs'),{DEFLECTOR_IDENTITY}=await import('../../packages/kernels/b2z/world.mjs'),{encodeDeflectorPayment}=await import('../../packages/protocol/deflector.mjs'),{expireV6}=await import('../../packages/kernels/b2z/lifecycle-v6.mjs');
 const v=fixture.cases.left,w=decodeWorld(Buffer.from(v.state_hex,'hex')),destroyed=104;assert(!w.deflectors.some(d=>d.cell===destroyed));const life=w.playability.lifecycle.find(l=>l.cannon===2);assert(life.deadline_ns!==undefined);
 const expiry=expireV6(w,life.deadline_ns,[{cannon:2,generation:life.generation,deadline_ns:life.deadline_ns}]),expired=decodeWorld(expiry.output.state);assert(!expired.cannons.some(c=>c.id===2));assert(!expired.deflectors.some(d=>d.cell===destroyed));validateWorld(expired);
 const payload=encodeDeflectorPayment(ACCOUNT,1000000000n,{kind:'fire',cannon:2,angle:0,quantity:1}),c=new B2zCursor(encodeWorld(w),[{position:0n,payload_hex:Buffer.from(payload).toString('hex')}],{...DEFLECTOR_IDENTITY,logical_start:0n,logical_end:1n});while(!c.step(37).complete){}c.finalizeElapsed(w.playability.elapsed_ns+1n);const revived=decodeWorld(c.result().state);assert(revived.balls.some(b=>b.owner===1));assert.equal(revived.playability.lifecycle.find(l=>l.cannon===2).deadline_ns,undefined);assert(!revived.deflectors.some(d=>d.cell===destroyed));
});

test('first-entry candidate search rejects an occupied Deflector through the shared blocked set',async()=>{
 const{beginEntry,entryStep}=await import('../../packages/kernels/b2z/entry-v7.mjs'),w=successorWorld();w.deflectors=[{id:1,owner:1,cell:504504,orientation:'NE'}];w.next_deflector_id=2;validateWorld(w);const s=beginEntry(w,occupiedCells(w));s.stack=[[504,504,504,504]];assert.equal(entryStep(w,s,c=>[c]),false);assert.equal(s.best,null);assert.equal(entryStep(w,s,c=>[c]),true);assert.equal(s.best,null);
});
