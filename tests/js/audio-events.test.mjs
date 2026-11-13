import test from 'node:test';import assert from 'node:assert/strict';
import {SegmentPlayer,prepareDerivedSegment,prepareSegment,B2zView} from '../../apps/b2z-observer/model.mjs';
import {DisplayedAudioEvents,publicationAudioDescriptor} from '../../apps/b2z-observer/audio-events.mjs';
import {publication} from '@dtr/timeline-runtime/observation/publication';
import {coordinatorScenario} from '../scenarios/coordinator.mjs';
import fs from 'node:fs';
import {projectAnimation} from '../../packages/kernels/b2z/animation.mjs';
import {encodeWorld,decodeWorld} from '../../packages/kernels/b2z/world.mjs';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
import {SoundBudget,MusicPresence} from '../../apps/b2z-observer/audio-policy.mjs';
const descriptor=Object.freeze({namespace:'fixture',identity:'epoch',root:'H',segment:'1'});
const b={id:7,owner:99,x0:1024n,y0:2048n,vx:10,vy:20};
const view={version:6,width:1000,height:1000,torus:true,balls:new Map([[7,b]]),cannons:new Map([[3,{id:3,cell:501}]])};
const ev=(vx=-10,vy=20)=>({kind:'trajectory',ball:{...b,vx,vy},time:[1n,1n],sequence:0});
function collector(){const c=new DisplayedAudioEvents();c.arm(0);c.begin({enabled:true,previous:.9,time:1,elapsed:.1,now:1});return c;}
test('old rational trajectory supplies one corner impact, wraps are silent',()=>{const c=collector();const q=c.prepare(ev(-10,-20),view,descriptor,0,1);assert.equal(q.kind,'wall');assert.deepEqual([q.x,q.y],[(1024+10)/1024,(2048+20)/1024]);assert.equal(c.prepare(ev(10,20),view,descriptor,0,1),null);});
test('v6 launch uses cannon ID instead of player owner; volleys share identity',()=>{const c=collector(),e={kind:'ball_spawned',ball:b,cannon:3,time:[1n,1n],sequence:3},q=c.prepare(e,view,descriptor,0,1);assert.equal(q.entity,3);assert.equal(q.x,501.5);assert.equal(q.y,.5);assert.equal(c.prepare({...e,cannon:99},view,descriptor,0,1),null);});
test('immutable per-publication provenance survives changing latest head',()=>{const c=collector(),a=c.prepare(ev(),view,descriptor,0,1),next=c.prepare(ev(),view,{...descriptor,root:'H+1'},0,1);assert.notEqual(a.key,next.key);assert(a.key.includes('/H/'));});
test('100,000 due events are consumed with <=128 inspections and <=32 retained',()=>{const c=collector();for(let i=0;i<100000;i++){const e=i%999===0?{kind:'ball_spawned',ball:b,cannon:3,time:[1n,1n],sequence:i}:{...ev(),sequence:i};c.accept(c.prepare(e,view,descriptor,i,100000));}assert(c.stats.inspected<=128);assert(c.rows.length<=32);assert(c.rows.some(q=>q.kind==='cannon'));});
test('mute, overview gate and >250ms gap perform no cue inspection; old arms cannot replay',()=>{const c=collector();for(const enabled of [false,true]){c.begin({enabled,previous:0,time:1,elapsed:.251,now:2});assert.equal(c.prepare(ev(),view,descriptor,0,1),null);assert.equal(c.stats.inspected,0);}c.arm(1);c.begin({enabled:true,previous:1,time:1,elapsed:.01,now:3});assert.equal(c.prepare(ev(),view,descriptor,0,1),null);});
test('late events drop and decisions are final after take',()=>{const c=collector();c.begin({enabled:true,previous:0,time:1,elapsed:.2,now:2});assert.equal(c.prepare({...ev(),time:[1n,10n]},view,descriptor,0,1),null);c.accept(c.prepare(ev(),view,descriptor,0,1));assert.equal(c.take().length,1);assert.equal(c.take().length,0);});
test('class rejection does not drain shared tokens; tables bounded under unique entities',()=>{const b=new SoundBudget();assert(b.accept({kind:'cannon',entity:1},0,0));const before=b.total.tokens;assert(!b.accept({kind:'cannon',entity:2},1,.1));assert.equal(b.total.tokens,Math.min(3,before+.5));for(let i=0;i<2000;i++)b.accept({kind:'wall',entity:i},i%24,i);assert(b.entities.size<=512);assert(b.bins.size<=48);});
test('presence uses displayed ticks, keeps tempo independent and dwells through short stalls',()=>{const p=new MusicPresence();for(let i=0;i<1000;i++)p.sample(.01,.01);assert(p.db> -1.2&&p.db<-.7);const before=p.db;for(let i=0;i<500;i++)p.sample(0,.01);assert.equal(p.db,before);for(let i=0;i<3000;i++)p.sample(0,.01);assert(p.db<-3);});

const goldens=JSON.parse(fs.readFileSync(new URL('../fixtures/b2z-v3-golden.json',import.meta.url))).cases;
for(const r of goldens)test(`actual player audio on/off, silent validation and throwing collector: ${r.name}`,async()=>{
 const initial=Buffer.from(r.initial_hex,'hex'),final=Buffer.from(r.outputs.state.hex,'hex'),raw=Buffer.from(r.outputs.events.hex,'hex'),render=projectAnimation(initial,raw).bytes;
 const w=decodeWorld(initial),end=decodeWorld(final),p={render_format:'btz-animation-1',head:{seal:{previous_state:sha256(initial),logical_start:0n,logical_end:end.time[0]/end.time[1]},state_hash:sha256(final)},artifacts:[{kind:'render',sha256:sha256(render)},{kind:'events',sha256:sha256(raw)}]};
 const segment=await prepareSegment(initial,final,render,p);let calls=0;const noisy={enabled:true,prepare(){calls++;throw Error('audio fault');},fail(){throw Error('audio cleanup fault');}};
 const off=new SegmentPlayer(segment),on=new SegmentPlayer(segment,descriptor),broken=new SegmentPlayer(segment,descriptor),c=new DisplayedAudioEvents();c.arm(0);
 c.begin({enabled:true,previous:0,time:segment.end,elapsed:.1,now:1});on.advance(segment.end,c);off.advance(segment.end);broken.advance(segment.end,noisy);
 assert.equal(off.index,on.index);assert.equal(broken.index,off.index);assert.equal(calls,segment.events.length?1:0);on.view.matches(segment.final);broken.view.matches(segment.final);assert.deepEqual([...off.view.balls],[...on.view.balls]);assert.deepEqual([...off.view.cannons],[...on.view.cannons]);
 const derived=await prepareDerivedSegment(initial,final,raw,{...p,version:6,render_format:null,artifacts:p.artifacts.filter(a=>a.kind!=='render')});assert.equal(derived.events.length,segment.events.length);assert.equal(off.index,segment.events.length);
});

test('actual v6 additional-cannon publication preserves state and launch source identity',async()=>{
 const f=JSON.parse(fs.readFileSync(new URL('../fixtures/rules-v6.json',import.meta.url))),v=f.cases.additional,{decodeCanonical}=await import('@dtr/timeline-runtime/runtime/canonical'),{B2zCursor}=await import('../../packages/kernels/b2z/kernel.mjs'),{PLAYABILITY_IDENTITY}=await import('../../packages/kernels/b2z/world.mjs');
 const initial=Buffer.from(v.state_hex,'hex'),seal=decodeCanonical(Buffer.from(v.seal_hex,'hex')),cursor=new B2zCursor(initial,decodeCanonical(Buffer.from(v.inputs_hex,'hex')),seal);while(!cursor.step(512).complete){}cursor.finalizeElapsed(BigInt(v.observed_ns));const out=cursor.result(),publication={version:8,identity:PLAYABILITY_IDENTITY,render_format:null,head:{seal:{...seal,previous_state:sha256(initial)},state_hash:sha256(out.state)},artifacts:[{kind:'events',sha256:sha256(out.events)}]};
 const segment=await prepareDerivedSegment(initial,out.state,out.events,publication),off=new SegmentPlayer(segment),on=new SegmentPlayer(segment,descriptor),c=collector();c.arm(segment.start-1);c.begin({enabled:true,previous:segment.start,time:segment.end,elapsed:.1,now:2});on.advance(segment.end,c);off.advance(segment.end);on.view.matches(segment.final);assert.deepEqual([...on.view.balls],[...off.view.balls]);assert.deepEqual([...on.view.cannons],[...off.view.cannons]);assert.equal(on.index,off.index);const launches=c.take().filter(q=>q.kind==='cannon');assert(launches.length);for(const q of launches)assert(on.view.cannons.has(q.entity));
});
