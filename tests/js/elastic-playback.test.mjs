/** UX-04/05/06: application pacing over the actual immutable DTR clock. */
import test from'node:test';import assert from'node:assert/strict';
import{PlayoutClock}from'@dtr/timeline-runtime/client/playout';
import{recentPresentationPoint}from'../../apps/b2z-observer/warm-return.mjs';
for(const seconds of[5,35,300])test(`UX-04 same-head return after ${seconds}s preserves unconsumed coverage`,()=>{const clock=new PlayoutClock({target:1,low:.01});clock.append(0,1);clock.sample(.2);const point=recentPresentationPoint(clock.state(),.01,seconds);assert.equal(point,clock.playhead);assert.ok(clock.available-point>.7);});
test('UX-05 no coverage is neither replayed nor extrapolated',()=>{assert.equal(recentPresentationPoint({playhead:1,available:1},.01,300),1);});
test('UX-06 only distinct advancing publications provide cadence evidence',async()=>{const{elasticPlayback}=await import('../../apps/b2z-observer/elastic-playback.mjs');const p=elasticPlayback();p.observe({key:'a',end:0,at:0,nominal:.01,ticks:1});for(let i=1;i<100;i++)p.observe({key:'a',end:0,at:i*1000,nominal:.01,ticks:1});assert.equal(p.state().samples,0);assert.equal(p.rate({now:99000,nominal:.01,remaining:.6,seconds:1}),.01);});
import{LIVE_BUFFER_LIMITS}from'../../apps/b2z-observer/model.mjs';
import{retainLatestVerifiedInterval}from'../../apps/b2z-observer/warm-return.mjs';
import{elasticPlayback}from'../../apps/b2z-observer/elastic-playback.mjs';
import{intervals}from'../../tools/fixtures/elastic-intervals.mjs';
function session(rows){const clock=new PlayoutClock({start:rows[0].segment.start,target:1,low:.01,min_rate:1,max_rate:1,max_frame_delta:1});for(const q of rows)clock.append(q.segment.start,q.segment.end);return{clock,queue:rows,bytes:rows.reduce((n,q)=>n+q.segment.bytes,0),referenceWorld:rows.at(-1).segment.final,receipts:new Map([[1,'verified']]),packet:Object.freeze({memo:'MOVE 1 0',amount:10000n})};}
test('UX-04/05 five minutes of hidden arrivals retain the latest entire verified interval',async()=>{const s=session(await intervals()),clock=s.clock,queue=s.queue,world=s.referenceWorld,packet=s.packet,receipts=s.receipts;const before=s.clock.playhead;assert.equal(retainLatestVerifiedInterval(s,LIVE_BUFFER_LIMITS),true);assert.equal(s.clock,clock);assert.equal(s.queue,queue);assert.equal(queue.length,1);assert.equal(s.clock.available-s.clock.playhead,1);assert.ok(s.clock.playhead>before);assert.equal(s.referenceWorld,world);assert.equal(s.packet,packet);assert.equal(s.receipts,receipts);s.clock.started=true;s.clock.phase='PLAYING';const t=s.clock.sample(.01).playhead;const v=queue[0].player.advance(t);assert.ok(t>queue[0].segment.start);assert.ok(v.balls.size);assert.ok(s.bytes<=LIVE_BUFFER_LIMITS.bytes);});
test('UX-05 already consumed material is never rewound or looped',async()=>{const s=session(await intervals(1));s.clock.started=true;for(let i=0;i<100;i++)s.clock.sample(.1);const time=s.clock.playhead;retainLatestVerifiedInterval(s,LIVE_BUFFER_LIMITS);assert.equal(s.clock.playhead,time);assert.equal(s.clock.sample(.1).playhead,time);assert.equal(s.clock.state().phase,'STALLED');});
test('UX-05 retained players execute canonical events in order after forward skips',async()=>{const s=session(await intervals());retainLatestVerifiedInterval(s,LIVE_BUFFER_LIMITS);const q=s.queue[0];for(let t=q.segment.start;t<q.segment.end;t+=.01)q.player.advance(t);q.player.advance(q.segment.end).matches(q.segment.final);assert.equal(q.player.index,q.segment.events.length);});
test('UX-05 late/early timing adapts smoothly in .5–1.5 bounds, never beyond the pinned endpoint',()=>{const p=elasticPlayback();for(let i=0;i<3;i++)p.observe({key:String(i),end:i,at:i*100000,nominal:.01,ticks:1});assert.equal(p.state().samples,2);let rate;for(let i=0;i<10;i++)rate=p.rate({now:225000,nominal:.01,remaining:.6,seconds:1});assert.ok(Math.abs(rate-.008)<1e-12);for(let i=0;i<20;i++){const next=p.rate({now:350000,nominal:.01,remaining:.2,seconds:1});assert.ok(Math.abs(next-rate)<=.001200001);rate=next;}assert.equal(rate,.005);for(let i=0;i<20;i++)rate=p.rate({now:201000,nominal:.01,remaining:2,seconds:1});assert.equal(rate,.015);const c=new PlayoutClock({target:1,low:.01,min_rate:1,max_rate:1});c.append(0,1);for(let i=0;i<10000;i++)c.sample(rate);assert.equal(c.playhead,1);});
test('UX-06 pace/context changes and insufficient or expired timing evidence use nominal rate',()=>{const p=elasticPlayback();for(let i=0;i<3;i++)p.observe({key:String(i),end:i,at:i*100000,nominal:.01,ticks:1,identity:'a'});assert.equal(p.rate({now:600001,nominal:.01,remaining:.01,seconds:1}),.01);assert.equal(p.rate({now:210000,nominal:.05,remaining:.01,seconds:1}),.05);p.observe({key:'new',end:4,at:220000,nominal:.01,ticks:1,identity:'b'});assert.equal(p.state().samples,0);assert.equal(p.rate({now:220001,nominal:0,remaining:1,seconds:1}),0);});
import{bridgeVerifiedPresentation,resumeVerifiedClock}from'../../apps/b2z-observer/warm-return.mjs';
test('UX-04 explicit return starts a complete retained interval without waiting for nominal jitter target',async()=>{const s=session(await intervals(1));s.clock.target=18;assert.equal(s.clock.sample(.01).playhead,s.clock.playhead);const clock=s.clock,queue=s.queue;assert.equal(resumeVerifiedClock(s),true);assert.ok(s.clock.sample(.001).playhead>s.queue[0].segment.start);assert.equal(s.clock,clock);assert.equal(s.queue,queue);});
test('UX-05 same-context authenticated resync fences a future interval without animating the missing span',async()=>{const s=session(await intervals(1));const q=s.queue,clock=s.clock;s.presentationFence=10;assert.equal(resumeVerifiedClock(s),true);const before=clock.playhead;assert.ok(clock.sample(.1).playhead>before);assert.throws(()=>bridgeVerifiedPresentation(s,9),/fence mismatch/);assert.equal(s.queue.length,1);bridgeVerifiedPresentation(s,10);assert.equal(s.clock,clock);assert.equal(s.queue,q);assert.equal(clock.available,10);assert.equal(clock.playhead,10);assert.equal(s.queue.length,0);assert.equal(s.bytes,0);clock.append(10,11);assert.ok(clock.sample(.01).playhead>10);assert.ok(clock.playhead<=11);});
test('UX-06 delayed presentation is disclosed without blocking latest-head preparation or hiding verification failure',async()=>{const{experienceStatus}=await import('../../apps/b2z-observer/experience-status.mjs');const input={live:true,verified:true,fresh:true,operationalFresh:true,healthy:true,advancing:true,world:{balls:[{}]},operational:{run:{running:true,pace:{mode:'Trickle',nominal_milli:10,supported_milli:10,admission_open:true}},source:{binding_checked:true,last_error:[]}},presentationLagSeconds:90};const s=experienceStatus(input);assert.equal(s.label,'Slow · delayed');assert.equal(s.canPrepare,true);assert.equal(experienceStatus({...input,failureKind:'verification'}).label,'Unable to verify game');assert.equal(experienceStatus({...input,phase:'STALLED',advancing:false}).label,'Waiting for next update');});
import{Camera}from'../../apps/b2z-observer/camera.mjs';
import{CameraController}from'../../apps/b2z-observer/camera-controller.mjs';
import{displayedBall}from'../../apps/b2z-observer/ball-presentation.mjs';
test('UX-04/05 verified seam-follow reacquires after a skip and stops with the actual interval',async()=>{const s=session(await intervals(4,{wrap:true})),first=s.queue[0].player.view,b=first.balls.values().next().value,p=displayedBall(first,b,0),c=new Camera();c.configure(1000,1000,390,844,true);c.scale=96;c.centre(p.x,p.y);let now=0;const m=new CameraController(c,{now:()=>now});m.follow(b.id,'same',p);now=300;m.update(now,{point:p,time:0,identity:'same'});const start=[c.x,c.y];retainLatestVerifiedInterval(s,LIVE_BUFFER_LIMITS);resumeVerifiedClock(s);const q=s.queue[0],v=q.player.advance(s.clock.playhead),at=displayedBall(v,v.balls.get(b.id),s.clock.playhead);m.follow(b.id,'same',at);for(let i=0;i<30;i++){now+=16;m.update(now,{point:at,time:s.clock.playhead,identity:'same'});const dx=c.x-start[0]-Math.round((c.x-start[0])/1000)*1000;assert.ok(Math.abs(dx)<10);assert.equal(c.scale,96);}for(let i=0;i<100;i++){now+=16;const t=s.clock.sample(.02).playhead,view=q.player.advance(t);m.update(now,{point:displayedBall(view,view.balls.get(b.id),t),time:t,identity:'same'});}const stopped=[c.x,c.y],t=s.clock.playhead;now+=1000;m.update(now,{point:displayedBall(v,v.balls.get(b.id),t),time:t,identity:'same'});assert.deepEqual([c.x,c.y],stopped);assert.equal(s.packet.memo,'MOVE 1 0');assert.equal(m.following.id,b.id);});

import{liveSessionBufferPolicy}from'../../apps/b2z-observer/model.mjs';
test('UX-05 optional operational failure retains the last observed slow buffer policy without authorising payments',()=>{const lastPaceStatus={run:{publication_ticks:1n,pace:{mode:'Trickle',nominal_milli:10,supported_milli:10}}};const policy=liveSessionBufferPolicy({operational:null,lastPaceStatus,queue:[],bytes:0});assert.equal(policy.target,1);});

import{B2zView}from'../../apps/b2z-observer/model.mjs';
test('UX-05 an exhausted retained interval adopts the cached authenticated anchor instead of leaving a stale scene',async()=>{const all=await intervals(5),s=session([all[0]]);s.referenceWorld=all[3].segment.final;s.presentationFence=all[3].segment.end;const packet=s.packet,clock=s.clock;resumeVerifiedClock(s);while(clock.playhead<clock.available)clock.sample(.1);s.queue.shift().player.advance(clock.playhead).matches(all[0].segment.final);const at=s.presentationFence;bridgeVerifiedPresentation(s,at);new B2zView(s.referenceWorld).matches(s.referenceWorld);assert.equal(clock.playhead,all[3].segment.end);assert.equal(clock.available,clock.playhead);assert.equal(clock.sample(.1).playhead,at);clock.append(all[4].segment.start,all[4].segment.end);assert.ok(clock.sample(.01).playhead>at);assert.equal(s.packet,packet);});

test('UX-05 Normal elasticity preserves the established delivery reserve rather than draining it',()=>{const p=elasticPlayback();for(let i=0;i<3;i++)p.observe({key:String(i),end:i*2,at:i*2000,nominal:1,ticks:2,deliverySeconds:.4});const rate=p.rate({now:4000,nominal:1,remaining:18,seconds:1,reserveTicks:16});assert.ok(rate<=1,'18 ticks includes the existing 16-tick delivery reserve, not surplus animation');});

import{publicationTicks,liveBufferPolicy}from'../../apps/b2z-observer/model.mjs';
test('UX-05 delivery reserve shares canonical publication-size validation for large and older segments',()=>{for(const key of['publication_ticks','segment_ticks']){const status={run:{[key]:64n,pace:{mode:'Normal',nominal_milli:1000,supported_milli:1000}}};assert.equal(publicationTicks(status),64);assert.equal(liveBufferPolicy(status).target-publicationTicks(status),16);}assert.equal(publicationTicks({run:{publication_ticks:0n}}),2);});
test('UX-05 measured delivery work conserves a modest slow-tier margin without a second startup interval',()=>{const p=elasticPlayback();for(let i=0;i<3;i++)p.observe({key:String(i),end:i,at:i*100000,nominal:.01,ticks:1,deliverySeconds:4});let rate;for(let i=0;i<10;i++)rate=p.rate({now:225000,nominal:.01,remaining:.6,seconds:1});assert.ok(rate>=.005&&rate<.008);assert.equal(p.state().max_delivery_seconds,4);});

import{assertForwardPresentation}from'../../apps/b2z-observer/warm-return.mjs';
test('UX-05 a resynchronised anchor cannot rewind the ordinary live playhead',()=>{assert.throws(()=>assertForwardPresentation({playhead:4},3),/rollback/);assert.throws(()=>assertForwardPresentation({playhead:4},NaN),/rollback/);assertForwardPresentation({playhead:4},4);assertForwardPresentation({playhead:4},8);});

import{approachPresentationPace}from'../../apps/b2z-observer/model.mjs';
test('UX-05 a hidden funding-tier change cannot replay Trickle coverage at the old Normal rate',()=>{assert.equal(approachPresentationPace(1,.01,.01,0),.015);assert.equal(approachPresentationPace(1,0,0,.016),0);assert.equal(approachPresentationPace(.01,1,1,.016),.5);let rate=.01;for(let i=0;i<30;i++){const next=approachPresentationPace(rate,.008,.01,1/60);assert.ok(next>=.005&&next<=.015);rate=next;}});

import{canRetainAcrossResync}from'../../apps/b2z-observer/warm-return.mjs';
test('UX-05 ordinary cold startup buffers; authenticated recovery retains cold/warm coverage',async()=>{const s=session(await intervals(1));s.clock.target=17;s.clock.sample(.01);assert.equal(s.clock.started,false);assert.equal(canRetainAcrossResync(s),true);assert.equal(canRetainAcrossResync(s,true),true);s.warmRecovery=true;assert.equal(canRetainAcrossResync(s),true);s.warmRecovery=false;s.clock.started=true;assert.equal(canRetainAcrossResync(s),true);s.clock.playhead=s.clock.available;assert.equal(canRetainAcrossResync(s),false);});

test('UX-05 retention-pressure recovery cannot discard every cold Normal interval before startup',async()=>{
 const s=session(await intervals(1)),clock=s.clock,queue=s.queue,packet=s.packet,authority=s.referenceWorld;
 clock.target=17;assert.equal(clock.sample(.1).playhead,queue[0].segment.start);assert.equal(clock.started,false);
 // Caller has authenticated a newer same-identity snapshot; old coverage remains
 // verified and useful. The missing span is an explicit source fence, not motion.
 assert.equal(canRetainAcrossResync(s),true);s.presentationFence=10;
 assert.equal(resumeVerifiedClock(s),true);const t=clock.sample(.1).playhead;assert.ok(t>queue[0].segment.start);
 queue[0].player.advance(clock.available).matches(queue[0].segment.final);
 for(let i=0;i<50;i++)clock.sample(.1);assert.equal(clock.playhead,clock.available);
 assert.equal(canRetainAcrossResync(s),false);assert.equal(clock.sample(1).playhead,clock.available);
 assert.equal(s.clock,clock);assert.equal(s.queue,queue);assert.equal(s.packet,packet);assert.equal(s.referenceWorld,authority);
 bridgeVerifiedPresentation(s,10);assert.equal(clock.playhead,10);assert.equal(clock.available,10);
 assert.equal(resumeVerifiedClock(s),false);assert.equal(clock.sample(1).playhead,10);
});

test('UX-05/06 a late Normal head retains cadence confidence for measured delivery variability',async()=>{
 const rows=await intervals(18),s=session(rows),clock=s.clock,packet=s.packet,authority=s.referenceWorld,p=elasticPlayback();
 // The installed trace had two-tick publications, 10.5-second observed delivery,
 // an 18-tick verified buffer, then a 22-second gap. These are presentation-only
 // data: one late request is not evidence that the producer/context changed.
 for(let i=0;i<3;i++)p.observe({key:String(i),end:i*2,at:i*2000,nominal:1,ticks:2,deliverySeconds:10.5});
 assert.equal(p.state().confidence_seconds,27);
 const remaining=[];
 for(let i=0;i<220;i++){
  const rate=p.rate({now:4000+i*100,nominal:1,remaining:clock.available-clock.playhead,seconds:.1,reserveTicks:16});
  assert.ok(rate>=.5&&rate<=1.5);const t=clock.sample(.1*rate).playhead;
  while(s.queue.length&&t>=s.queue[0].segment.end){const q=s.queue.shift();q.player.advance(q.segment.end).matches(q.segment.final);}
  if(s.queue.length)s.queue[0].player.advance(t);
  assert.notEqual(clock.phase,'STALLED','use the modest conservative rate while measured delivery evidence remains usable');remaining.push(clock.available-t);
 }
 assert.ok(remaining.at(-1)>0);assert.ok(clock.playhead>10);assert.equal(s.packet,packet);assert.equal(s.referenceWorld,authority);
 // Repeated certificates do not manufacture another distinct publication or
 // extend confidence indefinitely when no gameplay head advances.
 for(let i=0;i<30;i++)assert.equal(p.observe({key:'2',end:4,at:5000+i*1000,nominal:1,ticks:2,deliverySeconds:10.5}),false);
 assert.equal(p.state().samples,2);assert.equal(p.state().last_distinct_at,4000);
 assert.equal(p.rate({now:32001,nominal:1,remaining:1,seconds:1,reserveTicks:16}),1);
});
