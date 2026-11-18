/** New successor-only atomic topology vectors. Historical fixtures stay immutable. */
import fs from'node:fs';import assert from'node:assert/strict';
import{encodeCanonical,decodeCanonical}from'@dtr/timeline-runtime/runtime/canonical';import{sha256}from'@dtr/timeline-runtime/runtime/seal';
import{decodeWorld,encodeWorld,validateWorld,scaledOwnership,setOwner,validStrike}from'../packages/kernels/b2z/world.mjs';
import{migrateDeflectorWorld}from'../packages/kernels/b2z/deflectors-v12.mjs';import{CaptureJob}from'../packages/kernels/b2z/capture-v6.mjs';
import{expireV6}from'../packages/kernels/b2z/lifecycle-v6.mjs';import{dueFences}from'../packages/kernels/b2z/playability.mjs';
import{classify}from'../packages/kernels/b2z/kernel.mjs';import{nextCrossing}from'../packages/kernels/b2z/geometry.mjs';
import{interactionWorld}from'../tests/scenarios/boundary-deflector.mjs';
const source=JSON.parse(fs.readFileSync('tests/fixtures/capture-v6.json')),cases={};
for(const name of[...Object.keys(source.cases),'unsupported-no-cannon','toroidal-split']){
 const v=source.cases[name==='unsupported-no-cannon'||name==='toroidal-split'?'left':name],w=migrateDeflectorWorld(decodeWorld(Buffer.from(v.before_hex,'hex')));let target=v.target;
 w.deflectors=[102,104].map((cell,i)=>({id:i+1,owner:1,cell,orientation:i?'NW':'SE'}));w.next_deflector_id=3;
 if(name==='unsupported-no-cannon'){w.cannons=w.cannons.filter(c=>c.id!==2);w.playability.lifecycle=w.playability.lifecycle.filter(l=>l.cannon!==2);}
 if(name==='toroidal-split'){
  const shift=c=>Math.floor(c/1000)*1000+(c%1000+897)%1000,old=w.ownership.overrides;w.ownership=scaledOwnership(Array(1024).fill(0));
  for(const r of old)for(let c=r.start;c<r.end;c++)setOwner(w,shift(c),r.owner);
  for(const c of w.cannons)c.cell=shift(c.cell);for(const d of w.deflectors)d.cell=shift(d.cell);w.deflectors.sort((a,b)=>a.cell-b.cell);
  for(const b of w.balls){b.cell=shift(b.cell);b.x0=(b.x0-105472n+1024000n)%1024000n;}target=shift(target);
 }
 validateWorld(w);const before=encodeWorld(w);let j=v.pairs?CaptureJob.cleanup(w,v.pairs):CaptureJob.capture(w,target,v.ball),work=0;
 while(!j.step(w)){assert.deepEqual(encodeWorld(w),before);j=CaptureJob.fromState(decodeCanonical(encodeCanonical(j.toState())));assert(++work<10000);}
 validateWorld(w);const event=j.event(),removed=event.removed_deflectors.map(d=>d.id).sort(),retained=w.deflectors.map(d=>d.id).sort();
 assert.deepEqual([...removed,...retained].sort(),[1,2]);assert.equal(new Set(removed).size,removed.length);
 if(name==='left'||name==='toroidal-split'||name==='unsupported-no-cannon')assert.deepEqual(retained,[1]);
 if(name==='right')assert.deepEqual(retained,[2]);if(name==='both'||name==='unpaired_survives'||name==='direct_priority')assert.deepEqual(retained,[1,2]);
 if(name==='unpaired_survives'||name==='direct_priority'){assert.equal(event.cancelled_capture,true);assert.equal(w.balls.length,1);assert.deepEqual(removed,[]);}
 if(name==='unanchored'||name==='wall_all')assert.deepEqual(retained,[]);
 const deadline=w.playability.lifecycle.filter(l=>l.deadline_ns!==undefined).reduce((n,l)=>l.deadline_ns>n?l.deadline_ns:n,0n);let expiry=null;if(deadline){const fences=dueFences(w,deadline),e=expireV6(w,deadline,fences);expiry={observed_ns:String(deadline),fences_hex:Buffer.from(encodeCanonical(fences)).toString('hex'),outputs:Object.fromEntries(Object.entries(e.output).map(([k,b])=>[k,{hex:Buffer.from(b).toString('hex'),sha256:sha256(b)}]))};assert(!decodeWorld(e.output.state).deflectors.some(d=>removed.includes(d.id)));}
 cases[name]={expiry,before_hex:Buffer.from(before).toString('hex'),target,ball:v.ball,pairs:v.pairs,state_hex:Buffer.from(encodeWorld(w)).toString('hex'),event_hex:Buffer.from(encodeCanonical(event)).toString('hex'),state_sha256:sha256(encodeWorld(w)),event_sha256:sha256(encodeCanonical(event)),removed,retained,work};
}
const w=interactionWorld(1,2);for(let cell=1500;cell<=1502;cell++)setOwner(w,cell,1);w.balls[0].cell=1502;w.balls[0].x0=514560n;validateWorld(w);const before=encodeWorld(w),strike={id:1,ball:1,owner:1,defender:2,from:1502,to:1503,axis:'x',born:[0n,1n],deadline:[1n,16n],position:[1536n,1n]};assert(validStrike(w,strike));assert.doesNotThrow(()=>CaptureJob.capture(w,1503,1));w.deflectors=[{id:1,owner:2,cell:1503,orientation:'NE'}];w.next_deflector_id=2;validateWorld(w);assert(!validStrike(w,strike));assert.throws(()=>CaptureJob.capture(w,1503,1));const protection={before_hex:Buffer.from(before).toString('hex'),protected_hex:Buffer.from(encodeWorld(w)).toString('hex'),strike_hex:Buffer.from(encodeCanonical(strike)).toString('hex'),ball:1,target:1503};
const lost=migrateDeflectorWorld(decodeWorld(Buffer.from(source.cases.left.before_hex,'hex')));setOwner(lost,1104,3);lost.balls[1].cell=1104;lost.balls[1].x0=107008n;lost.balls[1].y0=1536n;lost.balls[1].vx=0;lost.balls[1].vy=-32000;lost.deflectors=[{id:1,owner:1,cell:102,orientation:'SE'},{id:2,owner:1,cell:104,orientation:'NW'}];lost.next_deflector_id=3;validateWorld(lost);const lostBefore=encodeWorld(lost),crossing=nextCrossing(lost.balls[1],1000,lost.time,1n),frozen=classify(lost,lost.balls[1],crossing);assert.equal(frozen.deflector_target,2);let job=CaptureJob.capture(lost,103,2);while(!job.step(lost)){}const afterIntent=classify(lost,lost.balls[1],crossing);assert.equal(afterIntent.deflector_target,null);assert.equal(afterIntent.attack.target,104);assert.equal(afterIntent.attack.defender,0);assert(!lost.deflectors.some(d=>d.id===frozen.deflector_target));const stale_contact={before_hex:Buffer.from(lostBefore).toString('hex'),after_hex:Buffer.from(encodeWorld(lost)).toString('hex'),event_hex:Buffer.from(encodeCanonical(job.event())).toString('hex')};
const text=JSON.stringify({stale_contact,protection,scope:'Successor atomic proposals restored after every work unit. Separate from installed qualification.',cases},null,2)+'\n',path=process.argv[2];
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(path,'utf8'),text);else fs.writeFileSync(path,text);console.log('PASS',Object.keys(cases).length,'successor capture/cancellation/dormancy/seam vectors');
