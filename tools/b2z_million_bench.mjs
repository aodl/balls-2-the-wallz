#!/usr/bin/env node
/** Bounded local v5 kernel probe. Elapsed time is not IC instruction evidence. */
import {performance} from 'node:perf_hooks';
import {B2zCursor} from '../packages/kernels/b2z/kernel.mjs';
import {stageMillionWorld} from '../packages/kernels/b2z/migration.mjs';
import {fixtureWorld,MILLION_IDENTITY,encodeWorld} from '../packages/kernels/b2z/world.mjs';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';

function world(ballCount){
  const cannonCount=Math.min(32,Math.max(1,Math.ceil(ballCount/2)));
  const owner=x=>Math.min(cannonCount-1,Math.floor(x*cannonCount/32))+1;
  const cells=Array.from({length:1024},(_,cell)=>owner(cell%32));
  const cannons=Array.from({length:cannonCount},(_,n)=>{
    const x=Math.floor((n+.5)*32/cannonCount),cell=16*32+x;
    return {id:n+1,cell,account:(n+1).toString(16).padStart(64,'0'),heading:0};
  });
  const vectors=[[1024,1],[724,724],[1,1024],[-724,724],[-1024,1],[-724,-724],[1,-1024],[724,-724]];
  const balls=Array.from({length:ballCount},(_,n)=>{
    const cannon=cannons[n%cannonCount],x=cannon.cell%32,y=(3+n*7)%32,cell=y*32+x,[vx,vy]=vectors[n%vectors.length];
    return {id:n+1,owner:cannon.id,cell,x0:BigInt(x*1024+512),y0:BigInt(y*1024+512),vx,vy};
  });
  return fixtureWorld({version:4,width:32,height:32,cells,cannons,balls});
}

const results=[];
for(const balls of [1,4,16,64]){
  const state=stageMillionWorld(encodeWorld(world(balls)));
  const cursor=new B2zCursor(state,[],{...MILLION_IDENTITY,source_id:'00'.repeat(32),logical_start:0n,logical_end:1n});
  const began=performance.now();let work=0,slices=0;
  while(cursor.phase!=='done'){
    const progress=cursor.step(100000);work+=progress.used;slices++;
    if(slices>1000)throw new Error('million benchmark work cap');
  }
  const output=cursor.result(),elapsed=performance.now()-began;
  if(output.state.length>=1048576||output.events.length>=1048576||output.scores.length>=1048576)throw new Error('DTR artifact capacity');
  results.push({balls,cannons:cursor.world.cannons.length,cells:1_000_000,logical_ticks:1,abstract_work_units:work,slices,
    local_elapsed_ms:Math.round(elapsed*1000)/1000,state_bytes:output.state.length,event_bytes:output.events.length,score_bytes:output.scores.length,
    state_hash:sha256(output.state),event_hash:sha256(output.events),score_hash:sha256(output.scores)});
}
console.log(JSON.stringify({checkpoint:'B2Z_V5_DEVELOPMENT',method:'Single-run local Node kernel probe without cursor snapshots. Work units are not IC instructions or cycles.',results},null,2));
