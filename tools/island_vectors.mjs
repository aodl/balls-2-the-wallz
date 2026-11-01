#!/usr/bin/env node
/** Synthetic rules-v6 island split vectors; no production action or IC claim. */
import fs from'node:fs/promises';import{encodeCanonical,decodeCanonical}from'@dtr/timeline-runtime/runtime/canonical';import{sha256}from'@dtr/timeline-runtime/runtime/seal';
import{decodeWorld,encodeWorld,scaledOwnership,setOwnerRange,setOwner}from'../packages/kernels/b2z/world.mjs';import{stageMillionWorld}from'../packages/kernels/b2z/migration.mjs';import{migratePlayability}from'../packages/kernels/b2z/playability.mjs';import{SplitJob}from'../packages/kernels/b2z/territory-topology-v6.mjs';
const f=JSON.parse(await fs.readFile('tests/fixtures/b2z-torus-v4.json','utf8')),cases={};
for(const side of['left','right','both','unanchored']){
 const w=migratePlayability(decodeWorld(stageMillionWorld(Buffer.from(f.migration.new_hex,'hex'))),9007199254740993n),c=w.cannons[0],prototype=w.balls[0];w.ownership=scaledOwnership(Array(1024).fill(0));setOwnerRange(w,100,107,0,1);w.cannons=[{...c,cell:100},...(side==='unanchored'?[]:[{...c,id:2,cell:106}])];w.next_cannon_id=3;w.playability.lifecycle=w.cannons.map(c=>({cannon:c.id,player:1,generation:1}));
 w.balls=(side==='both'?[101,105]:[side==='left'?101:105]).map((cell,i)=>({...prototype,id:i+1,owner:1,cell,x0:BigInt(cell*1024+512)-BigInt(prototype.vx)*w.time[0],y0:512n-BigInt(prototype.vy)*w.time[0]}));w.next_ball_id=w.balls.length+1;
 const before=encodeWorld(w);setOwner(w,103,0);const cut=encodeWorld(w);let job=new SplitJob(w,1,103),steps=0;while(!job.step(w)){if(++steps>1000)throw Error('split work bound');}
 cases[side]={before_hex:Buffer.from(before).toString('hex'),cut_hex:Buffer.from(cut).toString('hex'),phase:job.phase,steps,unanchored_balls:job.unanchored_balls,fences_hex:Buffer.from(encodeCanonical(job.fences)).toString('hex'),state_sha256:sha256(encodeWorld(w))};
}
const path='tests/fixtures/islands-v6.json',body=JSON.stringify({scope:'Pure resumable island reconciliation; not installed-runtime or IC authenticity evidence',cases},null,2)+'\n';if(process.argv.includes('--check')){if(await fs.readFile(path,'utf8')!==body)throw Error('Island fixtures stale');}else await fs.writeFile(path,body);console.log('PASS: connected-island split vectors');
