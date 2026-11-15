import {readFile,writeFile}from'node:fs/promises';
import{decodeWorld,encodeWorld,WAR_CRY_IDENTITY,ENTRY_IDENTITY}from'../packages/kernels/b2z/world.mjs';
import{B2zCursor}from'../packages/kernels/b2z/kernel.mjs';
import{encodeAnnotatedPayment,parseWarCryMemo}from'../packages/protocol/war-cry.mjs';
import{decodeCanonical,encodeCanonical}from'@dtr/timeline-runtime/runtime/canonical';import{sha256}from'@dtr/timeline-runtime/runtime/seal';
const f=JSON.parse(await readFile('tests/fixtures/rules-v6.json','utf8')),rows=[];
for(const [name,base,directive,cry,budget]of [
 ['fire','idle','FIRE 1 0 1','Charge!',10000000n],['fire-alt','idle','FIRE 1 0 1','é😀',10000000n],['fire-empty','idle','FIRE 1 0 1','',10000000n],['partial','idle','FIRE 1 0 64','Onward',10000000n],['zero','idle','FIRE 1 0 64','No',0n],['revive','revival','FIRE 1 90 1','Again',10000000n],['join','idle','NEW 0 1','Hi',100000000n],['additional','idle','NEW 0 1','Here',400000000n],
]){
 const w=decodeWorld(Buffer.from(f.cases[base].state_hex,'hex')),account=name==='join'?'02'.repeat(32):w.cannons[0].account,{command}=parseWarCryMemo(new TextEncoder().encode(directive)),inputs=[{position:100n,payload_hex:Buffer.from(encodeAnnotatedPayment(account,budget,command,cry)).toString('hex')}],state=encodeWorld(w),context={...WAR_CRY_IDENTITY,logical_start:w.time[0],logical_end:w.time[0]+1n};
 let c=new B2zCursor(state,inputs,context),steps=0;
 while(!c.step(1).complete){if(++steps>100000)throw Error('bounded fixture');const b=c.snapshot();c=B2zCursor.restore(b,sha256(b));}
 c.finalizeElapsed(w.playability.elapsed_ns+1000000000n);const out=c.result(),events=decodeCanonical(out.events);
 rows.push({name,initial_hex:Buffer.from(state).toString('hex'),inputs,context,inputs_hex:Buffer.from(encodeCanonical(inputs)).toString('hex'),context_hex:Buffer.from(encodeCanonical(context)).toString('hex'),observed_ns:String(w.playability.elapsed_ns+1000000000n),outputs:Object.fromEntries(Object.entries(out).map(([k,b])=>[k,{hex:Buffer.from(b).toString('hex'),sha256:sha256(b)}])),annotation_count:events.events.filter(e=>e.launch_annotation).length,receipts:events.receipts});
}
await writeFile('tests/fixtures/war-cry.json',JSON.stringify({version:1,identity:WAR_CRY_IDENTITY,rows},(_,v)=>typeof v==='bigint'?{$integer:String(v)}:v,2)+'\n');console.log('PASS generated',rows.length,'independently replayable annotation vectors');
