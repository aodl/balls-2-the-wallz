/** New successor-only atomic topology vectors. Historical fixtures stay immutable. */
import fs from'node:fs';import assert from'node:assert/strict';
import{encodeCanonical,decodeCanonical}from'@dtr/timeline-runtime/runtime/canonical';import{sha256}from'@dtr/timeline-runtime/runtime/seal';
import{decodeWorld,encodeWorld,validateWorld,scaledOwnership,setOwner}from'../packages/kernels/b2z/world.mjs';
import{migrateDeflectorWorld}from'../packages/kernels/b2z/deflectors-v12.mjs';import{CaptureJob}from'../packages/kernels/b2z/capture-v6.mjs';
import{expireV6}from'../packages/kernels/b2z/lifecycle-v6.mjs';import{dueFences}from'../packages/kernels/b2z/playability.mjs';
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
const text=JSON.stringify({scope:'Successor atomic proposals restored after every work unit. Separate from installed qualification.',cases},null,2)+'\n',path=process.argv[2];
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(path,'utf8'),text);else fs.writeFileSync(path,text);console.log('PASS',Object.keys(cases).length,'successor capture/cancellation/dormancy/seam vectors');
