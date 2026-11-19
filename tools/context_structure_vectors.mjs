#!/usr/bin/env node
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {decodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
import {B2zCursor} from '../packages/kernels/b2z/kernel.mjs';
import {CONTEXT_IDENTITY,encodeWorld} from '../packages/kernels/b2z/world.mjs';
import {encodeContextPayment,parseContextText} from '../packages/protocol/context-structures.mjs';
import {ACCOUNT,commercialCases,contextualWorld,orderedWorld} from '../tests/scenarios/context-structures.mjs';

const hex=bytes=>Buffer.from(bytes).toString('hex');
const encode=text=>new TextEncoder().encode(text);
function run(name,world,cases){
 const initial=encodeWorld(world),seal={...CONTEXT_IDENTITY,logical_start:0n,logical_end:1n};
 const inputs=cases.map(([text,amount,,account=ACCOUNT],i)=>{
  const {command,cry}=parseContextText(encode(text));
  return {position:BigInt(i),payload_hex:hex(encodeContextPayment(account,BigInt(amount),command,cry))};
 });
 let cursor=new B2zCursor(initial,inputs,seal),count=0;
 while(!cursor.step(37).complete){
  const checkpoint=cursor.snapshot();cursor=B2zCursor.restore(checkpoint,sha256(checkpoint));
  assert(++count<10000,'bounded execution');
 }
 cursor.finalizeElapsed(1n);
 const result=cursor.result(),audit=decodeCanonical(result.events);
 const reasons=audit.receipts.map(r=>r.reason);
 assert.deepEqual(reasons,cases.map(row=>row[2]),name);
 for(const receipt of audit.receipts)assert.equal(receipt.amount,receipt.amount_used+receipt.remainder);
 for(const receipt of audit.receipts.filter(r=>r.structure)){
  const event=audit.events.find(e=>e.kind===receipt.kind&&e.structure.id===receipt.structure.id&&e.structure.cell===receipt.structure.cell&&e.structure.orientation===receipt.structure.orientation);
  assert(event,'receipts retain the structure as it was at payment commit');
 }
 const facts=audit.events.filter(e=>['deflector_moved','deflector_reoriented'].includes(e.kind));
 for(const event of facts){assert.equal(event.before.id,event.structure.id);assert.equal(event.before.owner,event.structure.owner);}
 return {name,initial_hex:hex(initial),inputs:inputs.map(i=>({...i,position:String(i.position)})),expected:{state:sha256(result.state),events:sha256(result.events),scores:sha256(result.scores),reasons}};
}
const rows=[
 run('construction-and-relocation',contextualWorld(),commercialCases),
 run('rotation-before-first-contact',orderedWorld(),[['DROT 1 E',10000,'ACCEPTED'],['DROT 1 N',10000,'NOT_OWNER','02'.repeat(32)]]),
 run('occupied-move-retains-old-geometry',orderedWorld(),[['DMOVE 1 4006',10000,'SITE_OCCUPIED']]),
];
const output=JSON.stringify({identity:CONTEXT_IDENTITY,rows},null,2)+'\n';
if(process.argv.includes('--check'))assert.equal(readFileSync(process.argv[2],'utf8'),output);
else writeFileSync(process.argv[2],output);
console.log('PASS Rules13 canonical vectors');
