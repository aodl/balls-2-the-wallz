#!/usr/bin/env node
/** Complete pure v6 logical segments, independent of IC/authenticity claims. */
import fs from 'node:fs/promises';
import {encodeCanonical,decodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
import {B2zCursor} from '../packages/kernels/b2z/kernel.mjs';
import {decodeWorld,encodeWorld,PLAYABILITY_IDENTITY,neighbors,ownerAt,setOwner} from '../packages/kernels/b2z/world.mjs';
import {scenario as captureScenario} from './capture_vectors.mjs';
import {migratePlayability,markDormant,clearUnsupportedPlayer} from '../packages/kernels/b2z/playability.mjs';
import {stageMillionWorld} from '../packages/kernels/b2z/migration.mjs';
import {encodeV6Memo,parseV6TextMemo} from '../packages/protocol/memo-v6.mjs';
const old=JSON.parse(await fs.readFile('tests/fixtures/b2z-torus-v4.json','utf8'));
const raw=(account,amount,memo)=>{const n=Buffer.alloc(8);n.writeBigUInt64BE(amount);return Buffer.concat([Buffer.from('BTZPAY02'),Buffer.from(account,'hex'),n,memo]).toString('hex');};
export const normalized=(account,amount,text)=>raw(account,amount,encodeV6Memo(parseV6TextMemo(new TextEncoder().encode(text))));
export function scenario(name){
 const w=migratePlayability(decodeWorld(stageMillionWorld(Buffer.from(old.migration.new_hex,'hex'))),9007199254740993n),account=w.cannons[0].account,other='02'.repeat(32),c=w.cannons[0];
 if(['bridge_left','bridge_both','mutual','mutual_last','wall_pair'].includes(name)){
  const base=captureScenario(name==='bridge_both'?'both':['mutual','wall_pair'].includes(name)?'both':'left'),w=base.w;
  if(name.startsWith('mutual')||name==='wall_pair')w.balls[0].cell=103;
  for(const b of w.balls){b.vx=1;b.vy=0;b.x0=BigInt((b.cell%1000)*1024+512)-w.time[0];b.y0=BigInt(Math.floor(b.cell/1000)*1024+512);}
  if(name==='wall_pair'){w.cannons.find(c=>c.id===3).cell=2103;setOwner(w,2103,3);for(const b of [w.balls[0],w.balls.at(-1)]){b.vx=0;b.vy=b.owner===1?32000:-32000;b.x0=BigInt((b.cell%1000)*1024+512);b.y0=BigInt(Math.floor(b.cell/1000)*1024+512)-BigInt(b.vy)*w.time[0];}}
  w.pending=[{id:1,from:1103,to:103,axis:'y',ball:base.ball,owner:2,defender:1,born:[...w.time],deadline:[w.time[0]*16n+1n,16n],position:[103n*1024n+512n,1n]}];w.next_strike_id=2;if(name==='wall_pair'){w.pending=[];w.next_strike_id=1;}
  return {w,inputs:[],seal:{...PLAYABILITY_IDENTITY,logical_start:w.time[0],logical_end:w.time[0]+1n},observed_ns:w.playability.elapsed_ns+1000000000n};
 }
 if(name==='revival'){w.balls=[];w.pending=[];markDormant(w,1);clearUnsupportedPlayer(w,1);}
 const move=neighbors(c.cell,w.width,w.height,true).find(cell=>ownerAt(w,cell)===1);
 const defs={revival:[[account,10000000n,'FIRE 1 0 1']],idle:[],fire:[[account,50000000n,'FIRE 1 0 2']],first:[[other,150000000n,'NEW 0 3']],additional:[[account,530000000n,'NEW 0 3']],
  legacy:[[account,140000000n,'ANGLE 0']],move:[[account,10000n,`MOVE 1 ${move}`],[account,10000n,`MOVE 1 ${c.cell}`]],
  rejected:[[other,100000000n,'FIRE 1 0 1']],ordered:[[account,50000000n,'FIRE 1 0 2'],[account,10000000n,'FIRE 1 90 1'],[other,150000000n,'NEW 180 3']]};
 const inputs=(defs[name]??[]).map(([a,amount,text],i)=>({position:BigInt(100+i),payload_hex:normalized(a,amount,text)}));
 if(name==='malformed')inputs.push({position:100n,payload_hex:raw(account,12345n,Buffer.alloc(8,255))});
 return {w,inputs,seal:{...PLAYABILITY_IDENTITY,logical_start:w.time[0],logical_end:w.time[0]+1n},observed_ns:w.playability.elapsed_ns+1000000000n};
}
export function run(name){const {w,inputs,seal,observed_ns}=scenario(name),state=encodeWorld(w);let c=new B2zCursor(state,inputs,seal),work=0;for(;;){const r=c.step(7);work+=r.used;if(r.complete)break;c=B2zCursor.restore(c.snapshot(),sha256(c.snapshot()));if(work>100000)throw Error('rules work bound');}c.finalizeElapsed(observed_ns);const o=c.result();return {state_hex:Buffer.from(state).toString('hex'),inputs_hex:Buffer.from(encodeCanonical(inputs)).toString('hex'),seal_hex:Buffer.from(encodeCanonical(seal)).toString('hex'),observed_ns:String(observed_ns),work,...Object.fromEntries(Object.entries(o).map(([k,b])=>[`${k}_sha256`,sha256(b)]))};}
if(process.argv[1]?.endsWith('/rules_vectors.mjs')||process.argv[1]==='tools/rules_vectors.mjs'){
 const cases={};for(const name of ['idle','fire','first','additional','legacy','move','rejected','ordered','malformed','revival','bridge_left','bridge_both','mutual','mutual_last','wall_pair'])cases[name]=run(name);
 const path='tests/fixtures/rules-v6.json',body=JSON.stringify({scope:'Pure complete v6 segments, explicit time, Rust/JS conformance; no installed capacity/authentication claim',cases},null,2)+'\n';
 if(process.argv.includes('--check')){if(await fs.readFile(path,'utf8')!==body)throw Error('Rules fixtures stale');}else await fs.writeFile(path,body);
 console.log('PASS: complete v6 rules vectors');
}
