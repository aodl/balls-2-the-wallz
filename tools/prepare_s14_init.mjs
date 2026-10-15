#!/usr/bin/env node
/** Offline constructor argument generation. Never calls dfx or any network. */
import {parseArgs} from 'node:util';
import {writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {Principal} from '@icp-sdk/core/principal';
import {fixtureWorld,encodeWorld} from '../packages/kernels/btz/world.mjs';
const {values}=parseArgs({options:{network:{type:'string',default:'ic'},ledger:{type:'string',default:'ryjl3-tyaaa-aaaaa-aaaba-cai'},index:{type:'string',default:'qhbym-qaaaa-aaaaa-aaafq-cai'},'event-horizon':{type:'string'},subaccount:{type:'string',default:'0'},output:{type:'string',default:'.work/s14/init.did'}}});
if(!['ic','pocketic-local'].includes(values.network))throw new Error('network');
for(const key of ['ledger','index'])Principal.fromText(values[key]);
if(values['event-horizon'])Principal.fromText(values['event-horizon']);
const n=BigInt(values.subaccount);if(n<0n||n>=(1n<<64n))throw new Error('numeric subaccount');
if(values.network==='ic'&&(values.ledger!=='ryjl3-tyaaa-aaaaa-aaaba-cai'||values.index!=='qhbym-qaaaa-aaaaa-aaafq-cai'))throw new Error('official ICP ledger/index required');
const world=encodeWorld(fixtureWorld({width:16,height:8,cells:Array(128).fill(0),cannons:[],balls:[]}));
const blob=Array.from(world,b=>'\\'+b.toString(16).padStart(2,'0')).join('');
const sender=values['event-horizon']?`opt principal "${Principal.fromText(values['event-horizon']).toText()}"`:'null';
const text=`(blob "${blob}", 0 : nat64, record {network="${values.network}";ledger=principal "${values.ledger}";index=principal "${values.index}";receiving_subaccount=${n} : nat64;event_horizon=${sender};starting_policy=variant {FromBeginning}})\n`;
await mkdir(dirname(values.output),{recursive:true});await writeFile(values.output,text);console.log(`Prepared fresh empty 16×8 game constructor: ${values.output}`);
