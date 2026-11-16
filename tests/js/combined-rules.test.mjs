import test from'node:test';import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import{decodeCanonical}from'@dtr/timeline-runtime/runtime/canonical';
import{sha256}from'@dtr/timeline-runtime/runtime/seal';
import{COMBINED_CONFIG,COMBINED_IDENTITY,CLEARANCE_CONFIG,WAR_CRY_CONFIG,ENTRY_CONFIG}from'../../packages/kernels/b2z/world.mjs';
import{warCrySupported}from'../../apps/b2z-observer/war-cry-policy.mjs';
import{clearanceActive,hasEnemyClearance}from'../../packages/protocol/territory-clearance.mjs';
import{B2zCursor}from'../../packages/kernels/b2z/kernel.mjs';
test('combined identity pins both complete policies, preserving economics and old identities',()=>{
 assert.equal(COMBINED_IDENTITY.rules_hash,'5d0ca4591a782b609ef10d9db46d4bd93042b0fcdd738d8d1f920840c05b7756');
 assert.equal(COMBINED_IDENTITY.config_hash,'b2fcfaabecc226e4b99e1660b2341690e4ffb0eace29e152e26bc37d71f9e5df');
 assert.deepEqual(COMBINED_CONFIG,{...CLEARANCE_CONFIG,...WAR_CRY_CONFIG,rules_version:11});
 assert(warCrySupported(COMBINED_CONFIG));assert(clearanceActive(COMBINED_CONFIG));assert(!warCrySupported(CLEARANCE_CONFIG));assert(!clearanceActive(WAR_CRY_CONFIG));assert(!clearanceActive(ENTRY_CONFIG));
 for(const changed of[{...COMBINED_CONFIG,memo_adapter_version:4},{...COMBINED_CONFIG,enemy_territory_min_chebyshev:3},{...COMBINED_CONFIG,move_e8s:1n}])assert(!warCrySupported(changed));
});
test('combined vectors bind exact reference fixtures and composed cursor recovery',async()=>{
 const f=JSON.parse(await readFile(new URL('../fixtures/combined-v11.json',import.meta.url)));
 for(const[path,key]of[['clearance-v9.json','clearance_v9'],['war-cry.json','war_cry']])assert.equal(sha256(await readFile(new URL('../fixtures/'+path,import.meta.url))),f.reference_sha256[key]);
 for(const r of f.rows){const c=new B2zCursor(Buffer.from(r.initial_hex,'hex'),decodeCanonical(Buffer.from(r.inputs_hex,'hex')),decodeCanonical(Buffer.from(r.context_hex,'hex')));const b=c.snapshot(),restored=B2zCursor.restore(b,sha256(b));assert.equal(restored.v6.clearance_rules,true);assert.equal(restored.v6.war_cry_rules,true);}
 const bad=f.rows.find(r=>r.name==='interaction/additional-explicit-unsafe');assert.equal(bad.annotation_count,0);assert.equal(bad.receipts[0].reason,'ENEMY_TERRITORY_TOO_CLOSE');assert.equal(bad.receipts[0].amount_used.$integer,'0');
});
test('clearance remains at most49 canonical-player ownership reads including seams',()=>{
 for(let distance=0;distance<=5;distance++){let reads=0;const cell=distance+distance*1000;const safe=hasEnemyClearance(1000,1000,cell,1,c=>{reads++;return c===0?2:0;});assert.equal(safe,distance>=4);assert(reads<=49);}
});

test('combined launch annotations retain strict receipt and identity binding',async()=>{
 const{validateLaunchAnnotations}=await import('../../apps/b2z-observer/war-cry-events.mjs');
 const f=JSON.parse(await readFile(new URL('../fixtures/combined-v11.json',import.meta.url)));
 const row=f.rows.find(r=>r.name==='annotation/fire');
 const audit=decodeCanonical(Buffer.from(row.outputs.events.hex,'hex'));
 validateLaunchAnnotations(audit.events,audit.receipts,COMBINED_IDENTITY);
 assert.throws(()=>validateLaunchAnnotations(audit.events,audit.receipts,{...COMBINED_IDENTITY,rules_hash:'00'.repeat(32)}));
 assert.throws(()=>validateLaunchAnnotations(audit.events,audit.receipts.map(r=>({...r,actual_quantity:0})),COMBINED_IDENTITY));
 const launches=audit.events.filter(e=>e.launch_annotation);
 assert.throws(()=>validateLaunchAnnotations([...launches,...launches],audit.receipts,COMBINED_IDENTITY));
});
