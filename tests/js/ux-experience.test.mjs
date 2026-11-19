import test from 'node:test';import assert from 'node:assert/strict';
import {experienceStatus} from '../../apps/b2z-observer/experience-status.mjs';
import {observationLoop} from '../../apps/b2z-observer/observation-loop.mjs';
import {displayedMotion} from '../../apps/b2z-observer/motion-effects.mjs';
const base={verified:true,fresh:true,operationalFresh:true,healthy:true,advancing:true,phase:'PLAYING',world:{balls:[{}],cannons:[{}]},operational:{run:{running:true,idle:false,last_error:[],pace:{mode:'Normal',supported_milli:1000,nominal_milli:1000,admission_open:true}},source:{binding_checked:true,last_error:[]}}};
const status=override=>experienceStatus({...base,...override});
test('UX-06 precedence distinguishes producer, verification, delivery and presentation',()=>{
 assert.equal(status({live:false}).label,'Replay · offline');assert.match(status({live:false}).detail,/not IC-certified/);assert.equal(status({live:false,trust:'certificate'}).label,'Verified recording');
 assert.equal(status({}).label,'Live');assert.equal(status({advancing:false}).label,'Waiting for next on-chain update');
 const slow={...base.operational,run:{...base.operational.run,pace:{mode:'Trickle',supported_milli:10,admission_open:true}}};
 assert.equal(status({operational:slow}).label,'Slow');assert.equal(status({operational:slow,phase:'BUFFERING'}).label,'Waiting for next on-chain update');
 assert.equal(status({operational:slow,phase:'ERROR'}).label,'Unable to verify game data.');
 assert.equal(status({operational:slow,fresh:false}).label,'Verification delayed');
 const protectedRun={...slow,run:{...slow.run,pace:{mode:'ReserveProtection',admission_open:false}}};
 assert.equal(status({operational:protectedRun}).label,'Game paused · low energy');assert.equal(status({operational:protectedRun,fundingActive:true}).label,'Refuelling');
 assert.equal(status({operational:{...protectedRun,run:{...protectedRun.run,running:false}}}).label,'Game paused');
 assert.equal(status({world:{balls:[],cannons:[]},operational:{...slow,run:{...slow.run,idle:true}}}).label,'Waiting for players');
 assert.equal(status({world:{balls:[],cannons:[{}]},operational:{...slow,run:{...slow.run,idle:true}}}).label,'No active balls');
 assert.equal(status({operational:{...protectedRun,source:{binding_checked:false,last_error:[]}}}).label,'Payment processing unavailable');
 assert.equal(status({phase:'STALLED'}).canPrepare,true);assert.equal(status({fresh:false}).canPrepare,false);assert.equal(status({operational:protectedRun}).canPrepare,false);
});
test('UX-04/11 workers are independently single-flight, visibility-safe and fenced on teardown',async()=>{
 const pending=[];let hidden=false,time=0,calls=0,refresh=0,release,releaseHealth,returned=[];
 const settle=()=>new Promise(resolve=>setImmediate(resolve));
 const loop=observationLoop({work:async()=>{calls++;await new Promise(r=>release=r);},refresh:async()=>{refresh++;await new Promise(r=>releaseHealth=r);},schedule:f=>(pending.push(f),f),cancel:f=>{const i=pending.indexOf(f);if(i>=0)pending.splice(i,1);},hidden:()=>hidden,now:()=>time,onReturn:g=>returned.push(g)});
 time+=250;pending.shift()();await settle();assert.equal(calls,1);assert.equal(refresh,1);
 time+=250;pending.shift()();await settle();assert.equal(calls,1);assert.equal(refresh,1);
 release();await settle();time+=250;pending.shift()();await settle();assert.equal(calls,2);assert.equal(refresh,1,'slow health must not hold observation');
 hidden=true;loop.visibility();time+=60000;hidden=false;loop.visibility();await settle();assert.deepEqual(returned,[60000]);assert.equal(calls,2);
 loop.suspend();time+=40000;loop.resume();await settle();assert.deepEqual(returned,[60000,40000]);
 loop.stop();release();releaseHealth();await settle();assert.equal(pending.length,0);
});
test('UX-12 effects use displayed displacement, unwrap seams and clear discontinuities',()=>{
 const m=displayedMotion({limit:4});const sample=(x,y,time,wallMs=0,more={})=>m.sample([{id:1,x,y}],{width:1000,height:1000,torus:true,time,wallMs,...more});
 assert.equal(sample(999.8,1,0).length,0);assert.equal(sample(999.8,1,.1).length,0);
 const e=sample(.2,1,.2);assert.ok(e.length>0&&e.length<=2);assert.ok(e.every(e=>[1000,1999].includes(e.cell)));
 assert.ok(sample(.2,1,.3,500).length>0,'UXR-08 tile wake holds then fades independently of tails');assert.equal(sample(.2,1,.3,2300).length,0);assert.equal(sample(500,500,.4,600).length,0);
 m.reset();assert.equal(sample(.5,1,.5,700).length,0);assert.equal(sample(.7,1,.6,800,{reducedMotion:true}).length,0);
});
test('UX-06 transport, authority and verifier states are independent',()=>{
 const recentLoss={failureKind:'delivery',deliveryError:'HTTP 503'};
 assert.equal(status({...recentLoss,verified:false}).label,'Connection delayed · retrying');
 assert.equal(status(recentLoss).label,'Live');
 assert.equal(status(recentLoss).canPrepare,true,'recent certified and operational authority still applies');
 for(const input of [{...recentLoss,deliverySustained:true},{...recentLoss,fresh:false}]){
  assert.equal(status(input).label,'Connection delayed · retrying');
  assert.equal(status(input).canPrepare,false);
 }
 assert.equal(status({authorityPending:true}).canPrepare,false);
 assert.equal(status({operationalFresh:false}).label,'Copy unavailable');
 assert.equal(status({operationalFresh:false}).canPrepare,false);
 assert.equal(status({failureKind:'verification',deliverySustained:true}).label,'Unable to verify game data.');
 assert.equal(status({failureKind:'verification'}).canPrepare,false);
 assert.equal(status({}).label,'Live','recovery clears the global warning without a hold timer');
});

test('only current-root acceptance renews authority and older witnesses cannot shorten it',async()=>{
 const {acceptObservationFreshness,freshObservation}=await import('../../apps/b2z-observer/warm-return.mjs');
 const ticket=(root_hash,head,ms)=>({root_hash,certificate_time_ns:BigInt(ms)*1000000n,publication:{head:{segment_id:BigInt(head)}}});
 const good=ticket('accepted',21,9000),old=ticket('rejected',20,1000),s={sequence:{last:good}};
 assert(acceptObservationFreshness(s,good,1000,10000));
 assert.equal(acceptObservationFreshness(s,old,5000,14000),false);
 assert.equal(acceptObservationFreshness(s,ticket('accepted',21,2000),5000,14000),false);
 assert.equal(s.certificateTimeNs,'9000000000');
 assert(freshObservation(s,9000,18000));
 assert(!freshObservation(s,31000,40000),'unchanged old witness must still expire');
 s.pendingAuthorityHead=22n;
 assert(acceptObservationFreshness(s,ticket('accepted',21,40000),32000,41000));
 assert.equal(s.pendingAuthorityHead,22n,'accepted old head cannot clear the signed newer-head barrier');
 const next=ticket('successor',22,41000);s.sequence.last=next;
 assert(acceptObservationFreshness(s,next,33000,42000));
 assert.equal(s.pendingAuthorityHead,undefined);
});

test('unchanged Trickle head is observed at bounded cadence without delaying fast producers',async()=>{
 const {unchangedObservationMs,sustainedDelivery}=await import('../../apps/b2z-observer/live-delivery.mjs');
 const rate=(milli,ticks=1)=>({run:{running:true,publication_ticks:ticks,pace:{supported_milli:milli}}});
 assert.equal(unchangedObservationMs(),500);
 assert.equal(unchangedObservationMs(rate(1000)),500);
 assert.equal(unchangedObservationMs(rate(10)),4000);
 assert.equal(unchangedObservationMs(rate(50,2)),2000);
 const s={deliveryError:'HTTP 503',retryFailures:1,deliveryFailureSince:200};
 assert.equal(sustainedDelivery(s,9000),false);
 s.retryFailures=3;assert.equal(sustainedDelivery(s,2200),false);assert.equal(sustainedDelivery(s,2700),true);
 delete s.deliveryError;assert.equal(sustainedDelivery(s,3000),false);
});

test('observation transport retires an ignored abort and fences its late response',async()=>{
 const {observationFetch}=await import('../../apps/b2z-observer/bounded-observation.mjs');const abort=new AbortController();let release;const request=observationFetch(()=>new Promise(r=>release=r),abort.signal,1000)('/query');await Promise.resolve();abort.abort(new DOMException('Page frozen','AbortError'));await assert.rejects(request,{name:'AbortError'});release(new Response('late'));await new Promise(r=>setImmediate(r));
});
