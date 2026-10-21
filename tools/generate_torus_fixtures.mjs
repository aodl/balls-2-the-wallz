#!/usr/bin/env node
/** New, explicitly versioned local v4 fixtures. Historical goldens are untouched. */
import{writeFile}from'node:fs/promises';import{torusCases}from '../tests/scenarios/b2z-torus.mjs';import{B2zCursor}from '../packages/kernels/b2z/kernel.mjs';import{encodeWorld,TORUS_IDENTITY,fixtureWorld,PRELAUNCH_IDENTITY}from '../packages/kernels/b2z/world.mjs';import{encodeCanonical}from '@dtr/timeline-runtime/runtime/canonical';import{sha256}from '@dtr/timeline-runtime/runtime/seal';import{hex}from '@dtr/timeline-runtime/protocol/bytes';
import{stageTorusMigration}from '../packages/kernels/b2z/migration.mjs';
const cases=[];
for(const v of torusCases()){
 let c=new B2zCursor(encodeWorld(v.world),v.inputs,v.context),work=0;while(c.phase!=='done')work+=c.step(512).used;const raw=c.result();
 cases.push({name:v.name,initial_hex:hex(encodeWorld(v.world)),inputs_hex:hex(encodeCanonical(v.inputs)),context_hex:hex(encodeCanonical(v.context)),work,outputs:Object.fromEntries(Object.entries(raw).map(([kind,bytes])=>[kind,{hex:hex(bytes),sha256:sha256(bytes)}]))});
}
const old=fixtureWorld({width:16,height:8,cells:Array(128).fill(1),cannons:[{id:1,cell:42,account:'01'.repeat(32)}],balls:[{id:1,owner:1,cell:42,x0:10752n,y0:2560n,vx:812,vy:623}],credits:[{account:'01'.repeat(32),units:[37n,3n]}]});old.received_e8s=100000000n;const migration=stageTorusMigration(encodeWorld(old),{identity:{...PRELAUNCH_IDENTITY,source_id:'cd'.repeat(32)},source_cursor:39526412,ledger_cutover:39526500,account_history_complete_through:39526500,source_anchor:'ab'.repeat(32)});
await writeFile('tests/fixtures/b2z-torus-v4.json',JSON.stringify({migration:{old_hex:hex(encodeWorld(old)),new_hex:hex(migration.state)},version:4,status:'STAGED; no supported mainnet history transition in pinned DTR',identity:TORUS_IDENTITY,cases},null,2)+'\n');
