#!/usr/bin/env node
/** Create distinct Rules20 opponent/contact vectors without changing historical fixtures. */
import {readFileSync,writeFileSync} from 'node:fs';
import {decodeCanonical,encodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {decodeWorld,encodeWorld,setOwner,validateWorld} from '../packages/kernels/b2z/world.mjs';
import {B2zKernel} from '../packages/kernels/b2z/kernel.mjs';

const source=new URL('../tests/fixtures/rules20-corner-public-equality.json',import.meta.url);
const target=new URL('../tests/fixtures/rules20-corner-matrix-public-equality.json',import.meta.url);
const base=JSON.parse(readFileSync(source)).rows;
const fixture=(index,third=false)=>{
 const row=base[index],world=decodeWorld(Buffer.from(row.initial_hex,'hex'));
 // Give the existing second player a genuine active Ball so its territory
 // can participate in the public contact law without violating dormancy.
 delete world.playability.lifecycle[1].dormant_since_ns;
 delete world.playability.lifecycle[1].deadline_ns;
 world.balls.push({...world.balls[0],id:world.next_ball_id++,owner:2,
  cell:4020,x0:20n*1024n+512n,y0:4n*1024n+512n,vx:1,vy:0});
 setOwner(world,4020,2);
 if(third){
  const account='03'.repeat(32),cannon=world.next_cannon_id++;
  world.playability.next_player_id=4;world.playability.next_territory_id=4;
  world.playability.players.push({id:3,account});
  world.playability.territories.push({id:3,player:3});
  world.playability.lifecycle.push({cannon,player:3,generation:1});
  world.cannons.push({id:cannon,account,cell:4050,heading:0});
  setOwner(world,4050,3);
  world.balls.push({...world.balls[0],id:world.next_ball_id++,owner:3,
   cell:4060,x0:60n*1024n+512n,y0:4n*1024n+512n,vx:1,vy:0});
  setOwner(world,4060,3);
 }
 return {row,world};
};
const cases=[
 {name:'even-foreign-preferred-neutral-other',index:0,x:2,y:0,capture:98007,strike:98007},
 {name:'even-neutral-preferred-foreign-other',index:0,x:0,y:2,capture:98007,strike:null},
 {name:'even-two-foreign-sides',index:0,x:2,y:2,capture:98007,strike:98007},
 {name:'odd-two-different-opponents',index:4,x:2,y:3,third:true,capture:97009,strike:97009},
 {name:'odd-reversed-opponent-ownership',index:4,x:3,y:2,third:true,capture:97009,strike:97009},
 {name:'foreign-cannon-protects-neutral-corner',index:0,x:2,y:0,anchor:true,capture:null,strike:null},
 {name:'foreign-cannon-obstructs-different-opponent',index:0,x:2,y:3,third:true,anchor:true,capture:null,strike:null},
 {name:'foreign-diverter-obstructs-different-opponent',index:0,x:2,y:3,third:true,deflector:'side',capture:null,strike:null},
 {name:'foreign-diagonal-diverter-obstructs-both-sides',index:0,x:2,y:3,third:true,deflector:'diagonal',capture:null,strike:null},
 {name:'friendly-side-foreign-other',index:0,x:1,y:2,capture:97008,strike:97008},
 {name:'friendly-side-third-opponent-other',index:0,x:1,y:3,third:true,capture:97008,strike:97008},
 {name:'simultaneous-separated-checkerboard-corners',index:0,x:2,y:0,simultaneous:true,
  capture:[98007,98107],strike:[98007,98107]},
 {name:'equal-time-shared-territory-corner',index:0,x:0,y:0,shared:true,
  capture:98007,strike:null},
];
const rows=[];
for(const spec of cases){
 const {row,world}=fixture(spec.index,spec.third);
 setOwner(world,row.side_x,spec.x);setOwner(world,row.side_y,spec.y);
 if(spec.simultaneous){
  const first=world.balls[0],shift=100;
  world.balls.push({...first,id:world.next_ball_id++,cell:first.cell+shift,
   x0:first.x0+BigInt(shift*1024)});
  setOwner(world,row.side_x+shift,2);setOwner(world,row.side_y+shift,0);
 }
 if(spec.shared){
  const first=world.balls[0];
  world.balls.push({...first,id:world.next_ball_id++,owner:2,
   cell:98006,x0:7n*1024n,vx:1,vy:-1});
  setOwner(world,98006,2);setOwner(world,97006,2);
 }
 if(spec.anchor){world.cannons[1].cell=row.side_x;setOwner(world,4013,0);}
 if(spec.deflector){
  const site=spec.deflector==='side'?row.side_x:row.side_x-1000;
  world.deflectors.push({id:world.next_deflector_id++,cell:site,owner:2,orientation:'NE'});
  world.deflectors.sort((a,b)=>a.cell-b.cell);
  setOwner(world,site,2);
 }
 validateWorld(world);
 const initial=encodeWorld(world),inputs=encodeCanonical([]),context=Buffer.from(row.context_hex,'hex');
 const cursor=B2zKernel.begin(initial,[],decodeCanonical(context));
 let complete=false;
 for(let n=0;n<1000&&!complete;n++)complete=cursor.step(31).complete;
 if(!complete)throw Error(`unbounded case ${spec.name}`);
 cursor.finalizeElapsed(BigInt(row.observed_ns));
 const outputs=cursor.result(),events=decodeCanonical(outputs.events).events;
 const captures=events.filter(event=>event.kind==='capture').map(event=>event.target);
 const strikes=events.filter(event=>event.kind==='strike_armed').map(event=>event.strike.to);
 const expected=value=>value===null?[]:Array.isArray(value)?value:[value];
 if(JSON.stringify(captures)!==JSON.stringify(expected(spec.capture))
  ||JSON.stringify(strikes)!==JSON.stringify(expected(spec.strike)))
  throw Error(`contact expectation ${spec.name}: ${captures} ${strikes}`);
 rows.push({name:spec.name,source:row.source,side_x:row.side_x,side_y:row.side_y,
  owner_x:spec.x,owner_y:spec.y,expected_capture:spec.capture,expected_strike:spec.strike,
  expected_motion:decodeWorld(outputs.state).balls.map(ball=>[ball.id,ball.cell,ball.vx,ball.vy]),
  initial_hex:Buffer.from(initial).toString('hex'),inputs_hex:Buffer.from(inputs).toString('hex'),
  context_hex:context.toString('hex'),observed_ns:row.observed_ns,
  outputs:Object.fromEntries(['state','events','scores'].map(kind=>[kind,{hex:Buffer.from(outputs[kind]).toString('hex')}]))});
}
const bytes=JSON.stringify({schema:'b2z-rules20-corner-matrix-public-equality-1',rows})+'\n';
if(process.argv.includes('--check')){
 if(readFileSync(target,'utf8')!==bytes)throw Error('corner matrix fixture drift');
}else if(process.argv.includes('--rewrite'))writeFileSync(target,bytes);
else writeFileSync(target,bytes,{flag:'wx'});
console.log(`Rules20 corner matrix ${rows.length} exact public rows`);
