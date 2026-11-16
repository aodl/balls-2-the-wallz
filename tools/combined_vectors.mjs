#!/usr/bin/env node
/** Additive Rules11 vectors; independently retain all Rules7/9/10 fixtures. */
import {readFile,writeFile}from'node:fs/promises';
import assert from'node:assert/strict';
import {encodeCanonical,decodeCanonical}from'@dtr/timeline-runtime/runtime/canonical';
import {sha256}from'@dtr/timeline-runtime/runtime/seal';
import {COMBINED_IDENTITY}from'../packages/kernels/b2z/world.mjs';
import {B2zCursor}from'../packages/kernels/b2z/kernel.mjs';
import {encodeAnnotatedPayment,semanticPayment}from'../packages/protocol/war-cry.mjs';
import {decodeV6Memo}from'../packages/protocol/memo-v6.mjs';
const hex=b=>Buffer.from(b).toString('hex'),unhex=h=>Buffer.from(h,'hex'),rows=[];
const clearanceBytes=await readFile('tests/fixtures/clearance-v9.json'),annotationBytes=await readFile('tests/fixtures/war-cry.json');
const clearance=JSON.parse(clearanceBytes),annotation=JSON.parse(annotationBytes);
const strip=b=>{const e=decodeCanonical(b);for(const x of e.events)delete x.launch_annotation;return encodeCanonical(e);};
function converted(inputs,cry=''){
 return inputs.map(i=>{
  const b=unhex(i.payload_hex);if(b.subarray(0,8).toString()!=='BTZPAY02')return i;
  const command=decodeV6Memo(b.subarray(48,56));
  const text=['fire','new'].includes(command.kind)?cry:'';
  const out=encodeAnnotatedPayment(b.subarray(8,40).toString('hex'),b.readBigUInt64BE(40),command,text);
  assert.deepEqual(Buffer.from(semanticPayment(out)),b,'cosmetic input projection');
  return {...i,payload_hex:hex(out)};
 });
}
function run(name,r,inputs,{same=r.outputs,cosmetic=false,reason=null,recover=false}={}){
 const context={...decodeCanonical(unhex(r.context_hex)),...COMBINED_IDENTITY},state=unhex(r.initial_hex);
 let c=new B2zCursor(state,inputs,context),work=0,pending=false;
 for(;;){const q=c.step(recover?1:17);work+=q.used;if(q.complete)break;assert(work<500000,'bounded combined vector');if(recover||Math.floor(work/17)%13===0){const b=c.snapshot();pending ||= typeof decodeCanonical(b).cursor.v6.pending_cry==='string';c=B2zCursor.restore(b,sha256(b));}}
 c.finalizeElapsed(BigInt(r.observed_ns));const output=c.result(),events=decodeCanonical(output.events);
 if(same)for(const k of ['state','events','scores'])assert.equal(sha256(k==='events'&&cosmetic?strip(output[k]):output[k]),same[k].sha256,name+' preserved '+k);
 if(reason)assert.equal(events.receipts[0].reason,reason,name);
 const launches=events.events.filter(e=>e.launch_annotation);
 for(const e of launches){const receipt=events.receipts.find(r=>r.position===e.launch_annotation.position);assert(receipt&&receipt.reason==='ACCEPTED'&&receipt.actual_quantity>0);assert.equal(receipt.account,e.launch_annotation.account);}
 if(reason&&reason!=='ACCEPTED')assert.equal(launches.length,0,'rejected command cannot speak');
 const row={name,initial_hex:r.initial_hex,context_hex:hex(encodeCanonical(context)),inputs_hex:hex(encodeCanonical(inputs)),observed_ns:r.observed_ns,recover_each_work_unit:recover,recovered_pending_annotation:pending,work,receipts:events.receipts,annotation_count:launches.length,outputs:Object.fromEntries(Object.entries(output).map(([k,b])=>[k,{hex:hex(b),sha256:sha256(b)}]))};rows.push(row);console.log(name,'work',work,'annotations',launches.length);return row;
}
for(const r of clearance.rows){
 const inputs=decodeCanonical(unhex(r.inputs_hex));
 run('clearance/'+r.name,r,converted(inputs),r.name==='historical-v7-move-distance-three'?{same:null,reason:'ENEMY_TERRITORY_TOO_CLOSE'}:{});
}
for(const r of annotation.rows)run('annotation/'+r.name,r,decodeCanonical(unhex(r.inputs_hex)),{recover:true});
for(const name of ['additional-explicit-unsafe','additional-explicit-safe','additional-implicit-safe-alternative','additional-implicit-no-safe-sites','first-join-v9','fire-v9','enemy-claim-before-move-processing','enemy-claim-before-additional-build-processing']){
 const r=clearance.rows.find(r=>r.name===name);assert(r,'known clearance interaction '+name);
 const a=run('interaction/'+name,r,converted(decodeCanonical(unhex(r.inputs_hex)),'Charge!'),{cosmetic:true,recover:!name.startsWith('first-join')&&!name.startsWith('enemy-claim')});
 if(name==='additional-explicit-unsafe'||name==='additional-implicit-no-safe-sites')assert.equal(a.annotation_count,0);
 if(name==='enemy-claim-before-move-processing')assert.equal(a.receipts[1].reason,'ENEMY_TERRITORY_TOO_CLOSE');
}
// Different words cannot reroll the implicit site, even while clearance filters it.
const implicit=clearance.rows.find(r=>r.name==='additional-implicit-safe-alternative');
const a=run('implicit-words-A',implicit,converted(decodeCanonical(unhex(implicit.inputs_hex)),'A'),{cosmetic:true});
const b=run('implicit-words-B',implicit,converted(decodeCanonical(unhex(implicit.inputs_hex)),'B'),{cosmetic:true});
assert.equal(a.outputs.state.sha256,b.outputs.state.sha256);
// A rejected annotated Build must not donate its pending words to the next launch.
const unsafe=clearance.rows.find(r=>r.name==='additional-explicit-unsafe'),unsafeInput=converted(decodeCanonical(unhex(unsafe.inputs_hex)),'Sneak!')[0];
const fireMemo={kind:'fire',cannon:1,angle:0,quantity:1};
const account=unhex(unsafeInput.payload_hex).subarray(8,40).toString('hex');
const fire=(position,cry)=>({position,payload_hex:hex(encodeAnnotatedPayment(account,1000000000n,fireMemo,cry))});
const noLeak=run('rejected-build-then-bare-fire',unsafe,[unsafeInput,fire(100n,'')],{same:null,recover:true});
assert.equal(noLeak.receipts[0].reason,'ENEMY_TERRITORY_TOO_CLOSE');assert.equal(noLeak.annotation_count,0);assert.equal(noLeak.receipts[1].reason,'ACCEPTED');
const next=run('rejected-build-then-own-cry',unsafe,[unsafeInput,fire(100n,'Go')],{same:null,recover:true});
assert.equal(next.annotation_count,1);const nextEvents=decodeCanonical(unhex(next.outputs.events.hex));assert.equal(nextEvents.events.find(e=>e.launch_annotation).launch_annotation.cry,'Go');
const twin=run('distinct-payments-identical-cry',unsafe,[fire(100n,'Twin'),fire(101n,'Twin')],{same:null,recover:true});
assert.equal(twin.annotation_count,2);assert.deepEqual(decodeCanonical(unhex(twin.outputs.events.hex)).events.filter(e=>e.launch_annotation).map(e=>e.launch_annotation.position),[100n,101n]);
const text=JSON.stringify({version:1,scope:'Combined deterministic interpreter, not IC authenticity; old fixture hashes retained, native exact-output parity required',identity:COMBINED_IDENTITY,reference_sha256:{clearance_v9:sha256(clearanceBytes),war_cry:sha256(annotationBytes)},rows},(_,v)=>typeof v==='bigint'?{$integer:String(v)}:v,2)+'\n';
const path='tests/fixtures/combined-v11.json';if(process.argv.includes('--check'))assert.equal(await readFile(path,'utf8'),text,'combined vectors changed');else await writeFile(path,text);
console.log('PASS combined exact-output vectors',rows.length);
