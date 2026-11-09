/** UX-04/05/11/12 tactical continuation; pure geometry plus real scheduling. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {diamondMap} from '../../apps/b2z-observer/minimap-projection.mjs';
import {resolveInteraction} from '../../apps/b2z-observer/interaction.mjs';
import {Camera} from '../../apps/b2z-observer/camera.mjs';
import {observationLoop} from '../../apps/b2z-observer/observation-loop.mjs';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('UX-12 diamond matches ground projection, inverse and transparent corners',()=>{
 const m=diamondMap(1000,1000,160,160/Math.sqrt(3));
 for(const [x,y]of [[0,0],[1000,0],[0,1000],[1000,1000],[500,500],[22,998]]){const p=m.project(x,y),q=m.inverse(p.x,p.y);close(q.x,x);close(q.y,y);}
 assert.equal(m.contains(0,0),false);assert.equal(m.contains(80,46),true);
 close(m.project(0,0).x,80);close(m.project(1000,0).x,160);close(m.project(0,1000).x,0);
});
test('UX-02/12 shared picking consumes illegal placement without retargeting',()=>{
 const camera=new Camera();camera.configure(1000,1000,390,844,true);camera.frameCell(0);
 const cannons=new Map([[1,{id:1,cell:0,heading:0}]]),p=camera.cellPoint(0);
 assert.equal(resolveInteraction(camera,cannons,{x:p.sx,y:p.sy}).id,1);
 const h=resolveInteraction(camera,cannons,{x:p.sx,y:p.sy},{legal:()=>false});assert.equal(h.kind,'invalid');assert.equal(h.cell,0);
});
test('UX-04 hidden due-time work is quiet, single-flight, resumes and never resurrects',async()=>{
 let t=0,hidden=false,serial=0;const jobs=new Map(),calls=[],health=[];let release;
 const loop=observationLoop({now:()=>t,hidden:()=>hidden,schedule:(fn,ms)=>{jobs.set(++serial,{fn,at:t+ms});return serial;},cancel:id=>jobs.delete(id),work:async()=>{calls.push(t);if(calls.length===2)await new Promise(r=>release=r);},refresh:async()=>health.push(t)});
 const step=async at=>{t=at;for(const [id,j]of [...jobs])if(j.at<=t){jobs.delete(id);j.fn();}await new Promise(r=>setImmediate(r));};
 await step(250);assert.equal(calls.length,1);hidden=true;loop.visibility();await step(15250);assert.equal(calls.length,2);
 assert.ok([...jobs.values()].every(j=>j.at-t>=15000));await step(30250);assert.equal(calls.length,2);
 hidden=false;loop.visibility();await step(30500);assert.equal(calls.length,2);release();await new Promise(r=>setImmediate(r));await step(30750);assert.equal(calls.length,3);
 loop.suspend();assert.equal(jobs.size,0);loop.resume();loop.stop();await step(100000);assert.equal(jobs.size,0);
});

import {recentPresentationPoint} from '../../apps/b2z-observer/warm-return.mjs';
import {PlayoutClock} from '@dtr/timeline-runtime/client/playout';
test('UX-04/05 warm return preserves usable slow coverage and bounds playback lag',()=>{
 const clock=new PlayoutClock({start:0,target:1,low:.05});clock.append(0,1);
 close(recentPresentationPoint(clock.state(),.01,35),.98);
 close(recentPresentationPoint(clock.state(),.01,1),.01);
 close(recentPresentationPoint(clock.state(),.01,3600),.98);
 const point=recentPresentationPoint(clock.state(),1,3600);assert.equal(point,0,'no extra unverified coverage');
 close(recentPresentationPoint({playhead:4,available:4},.01,3600),4);
});

import {boundedObservationClient,observationFetch} from '../../apps/b2z-observer/bounded-observation.mjs';
test('UX-04 scoped observation deadline reaches the underlying fetch; abort never changes global fetch',async()=>{
 const original=globalThis.fetch,keepAlive=setTimeout(()=>{},100),controller=new AbortController();let received;
 const transport=observationFetch((url,{signal})=>{received=signal;return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));},controller.signal,10);
 await assert.rejects(transport('https://icp-api.io/'),e=>e.name==='TimeoutError');assert.equal(received.aborted,true);assert.equal(controller.signal.aborted,false);assert.equal(globalThis.fetch,original);clearTimeout(keepAlive);
});

import {displayedMotion} from '../../apps/b2z-observer/motion-effects.mjs';
test('UX-12 reflected tails retain bounded real path and expire by wall time at varied sampling rates',()=>{
 for(const hz of [30,60,120]){const m=displayedMotion();for(let i=0;i<hz;i++){const f=i/hz;m.sample([{id:1,x:10+(f<.5?f:1-f),y:10}],{time:f,wallMs:f*1000,width:1000,height:1000});}
 const tails=m.tails(1000);assert.ok(tails.length<=12);assert.ok(tails.reduce((n,t)=>n+t.distance,0)<=1.2);assert.ok(tails.every(t=>t.dx<0));assert.equal(m.tails(1500).length,0);}
});

test('UX-04 actual SDK observation query cancellation reaches its pending transport',async()=>{
 const controller=new AbortController(),seen=[];
 const client=await boundedObservationClient({network:'ic',host:'https://icp-api.io',canister_id:'s5ir5-gqaaa-aaaas-amyna-cai'},{signal:controller.signal,fetch:async(input,{signal})=>{seen.push(signal);if(signal.aborted)throw signal.reason;return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));}});
 const pending=client.observation(),timer=setTimeout(()=>controller.abort(),15);await assert.rejects(pending);clearTimeout(timer);assert.ok(seen.length>0);assert.ok(seen.every(s=>s.aborted));
});
