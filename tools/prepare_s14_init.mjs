#!/usr/bin/env node
/** Offline constructor argument generation. Never calls dfx or any network. */
import {parseArgs} from 'node:util';
import {writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {Principal} from '@icp-sdk/core/principal';
import {fixtureWorld,encodeWorld,PRELAUNCH_CONFIG,PRELAUNCH_IDENTITY} from '../packages/kernels/b2z/world.mjs';
const {values}=parseArgs({options:{network:{type:'string',default:'ic'},ledger:{type:'string',default:'ryjl3-tyaaa-aaaaa-aaaba-cai'},index:{type:'string',default:'qhbym-qaaaa-aaaaa-aaafq-cai'},'event-horizon':{type:'string'},subaccount:{type:'string',default:'0'},output:{type:'string',default:'.work/s14/init.did'},'world-output':{type:'string'},'profile-output':{type:'string'}}});
if(!['ic','pocketic-local'].includes(values.network))throw new Error('network');
for(const key of ['ledger','index'])Principal.fromText(values[key]);
if(values['event-horizon'])Principal.fromText(values['event-horizon']);
const n=BigInt(values.subaccount);if(n<0n||n>=(1n<<64n))throw new Error('numeric subaccount');
if(values.network==='ic'&&(values.ledger!=='ryjl3-tyaaa-aaaaa-aaaba-cai'||values.index!=='qhbym-qaaaa-aaaaa-aaafq-cai'))throw new Error('official ICP ledger/index required');
const world=encodeWorld(fixtureWorld({width:16,height:8,cells:Array(128).fill(0),cannons:[],balls:[]}));
const blob=Array.from(world,b=>'\\'+b.toString(16).padStart(2,'0')).join('');
const sender=values['event-horizon']?`opt principal "${Principal.fromText(values['event-horizon']).toText()}"`:'null';
const text=`(blob "${blob}", 0 : nat64, record {network="${values.network}";ledger=principal "${values.ledger}";index=principal "${values.index}";receiving_subaccount=${n} : nat64;event_horizon=${sender};starting_policy=variant {FromBeginning}})\n`;
if(values['world-output']){await mkdir(dirname(values['world-output']),{recursive:true});await writeFile(values['world-output'],world);}
if(values['profile-output']){
 const profile={network:values.network,backend_name:'b2z',observer_name:'observer',ledger:values.ledger,index:values.index,
  receiving_numeric_subaccount:n.toString(),subaccount_hex:'00'.repeat(24)+n.toString(16).padStart(16,'0'),
  receiving_account:'Derive after creation with dfx ledger account-id; compare with certified source descriptor.',
  event_horizon:values['event-horizon']??'DISABLED',fallback_seconds:60,delayed_rechecks_seconds:[2,10],
  board:{width:16,height:8,starting_cannons:0,starting_balls:0},rules:PRELAUNCH_CONFIG,identity:PRELAUNCH_IDENTITY,
  run:{segment_ticks:2,pacing_seconds:1,work_budget:512},retention:{publications:3,max_bytes:8388608},
  ball_price:'ball_base_e8s × active balls belonging to this cannon squared, evaluated when applied',
  payments:'Retained, including rejected commands and overpayments; no refunds. Wallet fees separate.',
  cycles:'Operator funded separately; gameplay ICP is not converted into cycles.',automatic_payouts:false};
 await mkdir(dirname(values['profile-output']),{recursive:true});
 await writeFile(values['profile-output'],JSON.stringify(profile,(_key,value)=>typeof value==='bigint'?value.toString():value,2)+'\n');
}
await mkdir(dirname(values.output),{recursive:true});await writeFile(values.output,text);console.log(`Prepared fresh empty 16×8 game constructor: ${values.output}`);
