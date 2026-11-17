import{unpackDeflectorAudit}from'../packages/kernels/b2z/deflector-events.mjs';
/** Actual kernel budget/cursor/artifact measurement, synthetic stress only. */
import fs from'node:fs';import{performance}from'node:perf_hooks';
import{B2zCursor}from'../packages/kernels/b2z/kernel.mjs';import{encodeWorld,decodeWorld,DEFLECTOR_IDENTITY}from'../packages/kernels/b2z/world.mjs';
import{decodeCanonical}from'@dtr/timeline-runtime/runtime/canonical';import{sha256}from'@dtr/timeline-runtime/runtime/seal';
import{successorWorld,diamondWorld}from'../tests/scenarios/boundary-deflector.mjs';
const results=[];
for(const layout of["corridor","box"])for(const horizon of[0,999999999])for(const count of[1,64])for(const ticks of[1]){
 const w=layout==="box"?diamondWorld():successorWorld();w.deflectors=[{id:1,owner:1,cell:1002,orientation:'NE'},{id:2,owner:1,cell:3000,orientation:'NE'}];w.next_deflector_id=3;
 if(layout==="box")Object.assign(w,diamondWorld());
 if(horizon){w.time=[BigInt(horizon),1n];for(const b of w.balls){b.x0-=BigInt(b.vx)*BigInt(horizon);b.y0-=BigInt(b.vy)*BigInt(horizon);}}
 w.balls=Array.from({length:count},(_,i)=>({...w.balls[0],id:i+1}));w.next_ball_id=count+1;
 let c=new B2zCursor(encodeWorld(w),[],{...DEFLECTOR_IDENTITY,logical_start:BigInt(horizon),logical_end:BigInt(horizon+ticks)});const start=performance.now();let calls=0,snapshotMax=0,work=0;
 for(;;){const r=c.step(17);calls++;work+=r.used;if(calls%3===0){const b=c.snapshot();snapshotMax=Math.max(snapshotMax,b.length);const restored=B2zCursor.restore(b,sha256(b));if(sha256(restored.snapshot())!==sha256(b))throw Error('cursor recovery mismatch');c=restored;}if(r.complete)break;if(calls>100000)throw Error('starvation');}
 c.finalizeElapsed(1n);const output=c.result(),events=unpackDeflectorAudit(decodeCanonical(output.events),w.balls).events;decodeWorld(output.state);
 results.push({layout,horizon,balls:count,ticks,calls,work,snapshotMax,wall_ms:performance.now()-start,state_bytes:output.state.length,event_bytes:output.events.length,events:events.length,contacts:events.filter(e=>e.deflector_contact).length,redirects:events.filter(e=>e.deflector_contact?.kind==='deflector_redirect').length,heap_bytes:process.memoryUsage().heapUsed,within_artifact_limit:Object.values(output).every(b=>b.length<=1048576)});
 fs.writeFileSync(process.argv[2],JSON.stringify({scope:'Synthetic actual JS scheduler and serialization; not subnet instruction/cycle cost',rows:results},null,2)+'\n');console.log(results.at(-1));if(!results.at(-1).within_artifact_limit)throw Error("artifact capacity");
}
