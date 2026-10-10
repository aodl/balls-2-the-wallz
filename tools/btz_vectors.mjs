#!/usr/bin/env node
/** Golden regressions from the executed JS implementation, NOT an independent oracle. */
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {scenario} from '../tests/scenarios/btz.mjs';
import {BtzCursor} from '../packages/kernels/btz/kernel.mjs';
import {BTZ_IDENTITY,encodeWorld} from '../packages/kernels/btz/world.mjs';
import {encodeCanonical} from '../packages/runtime/canonical.mjs';
import {sha256} from '../packages/runtime/seal.mjs';
import {hex} from '../packages/protocol/bytes.mjs';
const flag=process.argv[2];if(process.argv.length!==3||!['--write','--check'].includes(flag))throw new Error('usage: node tools/btz_vectors.mjs --write|--check');
const cases=[];
for(const name of ['admission','near-impact','duel','severance','corner','wall-bounce','dense']){
  const s=scenario(name),initial=encodeWorld(s.world),inputs=s.inputs??[],context={...BTZ_IDENTITY,logical_start:0n,logical_end:s.ticks};
  const c=new BtzCursor(initial,inputs,context);let work=0;
  while(c.phase!=='done'){work+=c.step(127).used;if(work>20000000)throw new Error('vector work cap');}
  const output=c.result();
  cases.push({name,initial_hex:hex(initial),inputs_hex:hex(encodeCanonical(inputs)),context_hex:hex(encodeCanonical(context)),
    outputs:Object.fromEntries(Object.entries(output).map(([key,value])=>[key,{hex:hex(value),sha256:sha256(value)}]))});
}
const text=JSON.stringify({version:3,provenance:'Executed JavaScript regression traces. Independent correctness coverage is in spawn/impact and prior geometry/connectivity fixtures.',cases},null,2)+'\n';
const path=fileURLToPath(new URL('../tests/fixtures/btz-v3-golden.json',import.meta.url));
if(flag==='--write')fs.writeFileSync(path,text);else if(fs.readFileSync(path,'utf8')!==text)throw new Error('BTZ full-trace golden drift');
console.log(`PASS: ${cases.length} complete BTZ v3 trace vectors ${flag==='--write'?'written':'verified'}; no native execution implied.`);
