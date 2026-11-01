#!/usr/bin/env node
/** Synthetic v6 atomic capture/replay fixtures. Not production/IC evidence. */
import fs from 'node:fs/promises';
import {encodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
import {decodeWorld,encodeWorld,validateWorld,setOwner,Q,scaledOwnership} from '../packages/kernels/b2z/world.mjs';
import {CaptureJob} from '../packages/kernels/b2z/capture-v6.mjs';
const islands=JSON.parse(await fs.readFile('tests/fixtures/islands-v6.json','utf8'));
export function ballAt(w,prototype,id,owner,cell){return {...prototype,id,owner,cell,vx:32000,vy:0,x0:BigInt((cell%1000)*Q+Q/2)-32000n*w.time[0],y0:BigInt(Math.floor(cell/1000)*Q+Q/2)};}
export function scenario(name){
 const base=['left','right','both','unanchored'].includes(name)?name:['unpaired_survives','direct_priority'].includes(name)?'unanchored':'both';
 const w=decodeWorld(Buffer.from(islands.cases[base].before_hex,'hex')),prototype=w.balls[0];
 if(name==='direct'){w.balls[0]=ballAt(w,prototype,1,1,103);}
 if(name==='direct_priority')w.balls.push(ballAt(w,prototype,2,1,103));
 if(name==='unpaired_survives')w.balls.push(ballAt(w,prototype,2,1,106));
 const id=w.balls.at(-1).id+1,account='02'.repeat(32);
 w.playability.players.push({id:2,account});w.playability.next_player_id=3;
 w.playability.territories.push({id:3,player:2});w.playability.next_territory_id=4;
 w.cannons.push({id:3,cell:1103,account,heading:0});w.next_cannon_id=4;
 w.playability.lifecycle.push({cannon:3,player:2,generation:1});setOwner(w,1103,3);
 w.balls.push(ballAt(w,prototype,id,2,1103));w.next_ball_id=id+1;
 let target=103,ball=id,pairs=null;
 if(name==='uniform'){w.ownership=scaledOwnership(Array(1024).fill(1));setOwner(w,1103,3);}
 if(name==='reconnect'||name==='seam'){
   const cell=name==='seam'?1998:1105,source=name==='seam'?1000:1103;
   if(name==='seam'){setOwner(w,1103,0);setOwner(w,source,3);w.cannons.at(-1).cell=source;w.balls[w.balls.length-1]=ballAt(w,prototype,id,2,source);}
   w.playability.territories.push({id:4,player:2});w.playability.next_territory_id=5;
   w.cannons.push({id:4,cell,account,heading:0});w.next_cannon_id=5;
   w.playability.lifecycle.push({cannon:4,player:2,generation:2,dormant_since_ns:w.playability.elapsed_ns,deadline_ns:w.playability.elapsed_ns+86400000000000n});setOwner(w,cell,4);
   target=name==='seam'?1999:1104;
 }
 if(name==='wall_cleanup')pairs=[[id,1]];
 if(name==='wall_all')pairs=[[id,1]],w.balls=w.balls.filter(b=>b.id!==2);
 validateWorld(w);return {w,target,ball,pairs};
}
export function run(name){const{w,target,ball,pairs}=scenario(name),before=encodeWorld(w);const j=pairs?CaptureJob.cleanup(w,pairs):CaptureJob.capture(w,target,ball);let work=0;while(!j.step(w)){if(++work>10000)throw Error('capture work bound');}validateWorld(w);return {before_hex:Buffer.from(before).toString('hex'),target,ball,pairs,work,state_sha256:sha256(encodeWorld(w)),event_sha256:sha256(encodeCanonical(j.event()))};}
if(process.argv[1]?.endsWith('/capture_vectors.mjs')||process.argv[1]==='tools/capture_vectors.mjs'){
 const cases=Object.fromEntries(['left','right','both','unanchored','unpaired_survives','direct','direct_priority','reconnect','seam','wall_cleanup','wall_all','uniform'].map(n=>[n,run(n)]));
 const path='tests/fixtures/capture-v6.json',body=JSON.stringify({scope:'Synthetic atomic capture and mutual destruction; not installed-runtime or capacity evidence',cases},null,2)+'\n';
 if(process.argv.includes('--check')){if(await fs.readFile(path,'utf8')!==body)throw Error('Capture fixtures stale');}else await fs.writeFile(path,body);
 console.log('PASS: atomic v6 capture vectors');
}
