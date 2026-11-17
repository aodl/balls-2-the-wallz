/** Immutable four-blocker box, real successive kernel seals; synthetic state. */
import fs from'node:fs';import assert from'node:assert/strict';
import{B2zCursor}from'../packages/kernels/b2z/kernel.mjs';import{decodeWorld,encodeWorld,DEFLECTOR_IDENTITY}from'../packages/kernels/b2z/world.mjs';
import{decodeCanonical}from'@dtr/timeline-runtime/runtime/canonical';import{sha256}from'@dtr/timeline-runtime/runtime/seal';import{rat,cmp,sub}from'../packages/kernels/b2z/math.mjs';
import{successorWorld}from'../tests/scenarios/boundary-deflector.mjs';
if(process.argv[2]==='--input'){
 const w=successorWorld();w.deflectors=[1,1000,1002,2001].map((cell,i)=>({id:i+1,owner:1,cell,orientation:'NE'}));w.next_deflector_id=5;
 fs.writeFileSync(process.argv[3],JSON.stringify({initial_hex:Buffer.from(encodeWorld(w)).toString('hex'),target:Number(process.argv[4]??100000)})+'\n');
}else{
 const input=JSON.parse(fs.readFileSync(process.argv[2])),result={contacts:0,redirects:0,reflections:0,ticks:0,max_den:'1',max_numerator_bits:0,chain:'0'.repeat(64),samples:[]};
 let state=Buffer.from(input.initial_hex,'hex'),prior=decodeWorld(state).time,min=null;
 while(result.contacts<input.target){
  const w=decodeWorld(state),start=w.time[0]/w.time[1];let c=new B2zCursor(state,[],{...DEFLECTOR_IDENTITY,logical_start:start,logical_end:start+1n});
  for(;;){const r=c.step(17);if(r.complete)break;if(result.ticks%23===0){const b=c.snapshot();c=B2zCursor.restore(b,sha256(b));}}
  c.finalizeElapsed(BigInt(++result.ticks));const output=c.result(),audit=decodeCanonical(output.events);
  for(const e of audit.events)if(Array.isArray(e)&&e[6]!==null){assert(cmp(e[2],prior)>0);const dt=sub(e[2],prior);if(min===null||cmp(dt,min)<0)min=dt;prior=e[2];result.contacts++;if(e[6][3]===0)result.redirects++;else result.reflections++;}
  state=output.state;const b=decodeWorld(state).balls[0];result.max_den=String(BigInt(result.max_den)>b.den?BigInt(result.max_den):b.den);result.max_numerator_bits=Math.max(result.max_numerator_bits,...[b.x0,b.y0].map(n=>(n<0n?-n:n).toString(2).length));
  result.chain=sha256(new TextEncoder().encode(result.chain+sha256(output.state)+sha256(output.events)+sha256(output.scores)));
  for(const target of[1500,10000,100000])if(result.contacts>=target&&!result.samples.some(s=>s.target===target))result.samples.push({target,tick:result.ticks,contacts:result.contacts,state_hash:sha256(state),chain:result.chain});
 }
 result.minimum_step=min.map(String);console.log(JSON.stringify(result));
}
