import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {encodeCanonical,decodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
import {CaptureJob} from '../../packages/kernels/b2z/capture-v6.mjs';
import {encodeWorld,decodeWorld,validateWorld,ownerAt,clearOwner,setOwner,setOwnerRange,territoryBallCount} from '../../packages/kernels/b2z/world.mjs';
import {relabelTerritory} from '../../packages/kernels/b2z/territory-v6.mjs';
const f=JSON.parse(fs.readFileSync(new URL('../fixtures/capture-v6.json',import.meta.url)));
function execute(name){
 const v=f.cases[name],w=decodeWorld(Buffer.from(v.before_hex,'hex')),original=encodeWorld(w),ownership=structuredClone(w);
 let j=v.pairs?CaptureJob.cleanup(w,v.pairs):CaptureJob.capture(w,v.target,v.ball),steps=0;
 while(!j.step(w)){
   assert.deepEqual(encodeWorld(w),original,'unfinished private proposal must not modify committed world');
   j=CaptureJob.fromState(decodeCanonical(encodeCanonical(j.toState())));assert.ok(++steps<10000);
 }
 validateWorld(w);assert.equal(sha256(encodeWorld(w)),v.state_sha256);const e=j.event();assert.equal(sha256(encodeCanonical(e)),v.event_sha256);
 // The exact emitted ownership operations independently reconstruct storage,
 // including island labels, marker-only pruning and friendly island merging.
 for(const op of e.ownership_ops){
   if(op.kind==='clear')clearOwner(ownership,op.owner);
   else if(op.kind==='relabel')relabelTerritory(ownership,op.from,op.to);
   else if(op.kind==='set')setOwner(ownership,op.cell,op.owner);
   else if(op.kind==='set_range')setOwnerRange(ownership,op.start,op.end,op.from,op.to);
   else assert.fail('unknown certified ownership operation');
 }
 assert.deepEqual(ownership.ownership,w.ownership);
 return {w,e,v};
}
for(const name of Object.keys(f.cases))test(`atomic capture ${name}: checkpoint/replay and ownership bytes agree`,()=>{execute(name);});
test('a bridge capture preserves every unpaired ball; only the ball-free island becomes dormant',()=>{
 for(const name of ['left','right','both']){const{w,e}=execute(name);assert.equal(e.cancelled_capture,false);assert.equal(e.pairs.length,0);assert.equal(ownerAt(w,103),3);assert.equal(territoryBallCount(w,1),name==='right'?0:1);assert.equal(territoryBallCount(w,2),name==='left'?0:1);assert.equal(w.balls.length,name==='both'?3:2);}
});
test('direct occupants take precedence, then stable ball IDs; topology cannot silently kill survivors',()=>{
 const a=execute('direct_priority');assert.deepEqual(a.e.pairs.map(p=>p.balls),[[3,2]]);assert.equal(ownerAt(a.w,103),1);assert.ok(a.w.balls.some(b=>b.id===1));
 const b=execute('unpaired_survives');assert.deepEqual(b.e.pairs.map(p=>p.balls),[[3,1]]);assert.ok(b.w.balls.some(b=>b.id===2));assert.equal(ownerAt(b.w,103),1);assert.equal(territoryBallCount(b.w,1),1);assert.equal(b.w.playability.lifecycle[0].deadline_ns,undefined);
});
test('pairing the last balls retains all empty cannon markers exactly once',()=>{
 const{w,e}=execute('wall_all');assert.equal(w.balls.length,0);assert.equal(w.cannons.length,3);assert.equal(e.dormant.length,3);assert.deepEqual(w.ownership.counts.map(r=>r.cells),[1,1,1]);assert.ok(w.playability.lifecycle.every(l=>l.generation===2&&l.deadline_ns!==undefined));
});
test('friendly islands share their current pool after connection, including toroidal seams',()=>{
 for(const name of ['reconnect','seam']){const{w,e}=execute(name);assert.deepEqual(e.reactivated_cannons,[4]);assert.equal(territoryBallCount(w,3),1);assert.equal(territoryBallCount(w,4),1);assert.ok(e.ownership_ops.some(op=>op.kind==='relabel'&&op.from===4&&op.to===3));}
});
test('occupied cannon cells, friendly fire and repeated participants are rejected without mutation',()=>{
 const v=f.cases.both,w=decodeWorld(Buffer.from(v.before_hex,'hex')),bytes=encodeWorld(w);
 for(const cell of [100,106,1103])assert.throws(()=>CaptureJob.capture(w,cell,v.ball),/INVALID_CAPTURE/);
 assert.throws(()=>CaptureJob.cleanup(w,[[1,2]]),/INVALID_DESTRUCTION_PAIR/);
 assert.throws(()=>CaptureJob.cleanup(w,[[v.ball,1],[v.ball,2]]),/INVALID_DESTRUCTION_PAIR/);
 assert.deepEqual(encodeWorld(w),bytes);
});

test('an ordinary cut in a connected million-cell island retains the early-connectivity shortcut',()=>{const {v,e}=execute('uniform');assert.ok(v.work<50);assert.equal(e.pairs.length,0);});
