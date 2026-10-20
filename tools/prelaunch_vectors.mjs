#!/usr/bin/env node
/** New-profile public-output vectors. Historical goldens are never modified. */
import {readFileSync,writeFileSync} from 'node:fs';
import {B2zCursor,encodePayment} from '../packages/kernels/b2z/kernel.mjs';
import {PRELAUNCH_CONFIG as C,PRELAUNCH_IDENTITY,fixtureWorld,encodeWorld,decodeWorld} from '../packages/kernels/b2z/world.mjs';
import {hex} from '@dtr/timeline-runtime/protocol/bytes';
import {encodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
const cases=[],account='01'.repeat(32),empty=encodeWorld(fixtureWorld({width:16,height:8,cells:Array(128).fill(0),cannons:[],balls:[]}));
function run(name,amounts,initial=empty,command={kind:'angle',value:0}){
 const world=decodeWorld(initial),context={...PRELAUNCH_IDENTITY,logical_start:world.time[0],logical_end:world.time[0]+2n};
 const inputs=amounts.map((amount,i)=>({position:BigInt(i),payload_hex:hex(encodePayment(account,amount,command))}));
 const c=new B2zCursor(initial,inputs,context);let work=0;while(c.phase!=='done'){work+=c.step(127).used;if(work>1000000)throw Error('work bound');}
 const output=c.result();cases.push({name,initial_hex:hex(initial),inputs_hex:hex(encodeCanonical(inputs)),context_hex:hex(encodeCanonical(context)),outputs:Object.fromEntries(Object.entries(output).map(([key,value])=>[key,{hex:hex(value),sha256:sha256(value)}]))});return output;
}
run('underfunded',[C.join_e8s-1n]);const join=run('exact-join',[C.join_e8s]);run('excess-join',[C.join_e8s+1n]);run('same-account-balls',[C.join_e8s,C.ball_base_e8s,4n*C.ball_base_e8s-1n,4n*C.ball_base_e8s]);
const cell=decodeWorld(join.state).cannons[0].cell;
run('move-underfunded',[C.move_e8s-1n],join.state,{kind:'move',value:cell});run('move-exact',[C.move_e8s],join.state,{kind:'move',value:cell});
const path='tests/fixtures/prelaunch-pricing.json',text=JSON.stringify({profile:'prelaunch-1',provenance:'Executed JS outputs; independently executed and compared in native Rust.',cases},null,2)+'\n';
if(process.argv[2]==='--write')writeFileSync(path,text);else if(process.argv[2]!=='--check'||readFileSync(path,'utf8')!==text)throw Error('prelaunch public-output vector drift');
console.log(`PASS ${cases.length} prelaunch vectors`);
