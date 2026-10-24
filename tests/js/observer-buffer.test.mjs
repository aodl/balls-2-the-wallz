import test from 'node:test';
import assert from 'node:assert/strict';
import {PlayoutClock} from '@dtr/timeline-runtime/client/playout';
import {LIVE_BUFFER_LIMITS,liveBufferPolicy,prepareIdlePlayout} from '../../apps/b2z-observer/model.mjs';

const modes=[['Normal',1000],['Cruise',750],['Economy',500],['Steady',300],['Conserve',200],['Survival',100],['Lifeline',50],['ReserveProtection',0]];
const status=(mode,milli)=>({run:{running:true,publication_ticks:1,pace:{mode,nominal_milli:milli,supported_milli:milli}}});

for(const [mode,milli] of modes){
 test(`${mode} startup, resume and reconnect fit both queue and byte budgets`,()=>{
  for(const bytes of [4096,600_000,2_000_000,LIVE_BUFFER_LIMITS.bytes]){
   const operational=status(mode,milli),policy=liveBufferPolicy(operational,bytes);
   const count=Math.ceil(policy.target),slots=Math.min(LIVE_BUFFER_LIMITS.segments,Math.floor(LIVE_BUFFER_LIMITS.bytes/bytes));
   assert.ok(count<=slots);assert.ok(count*bytes<=LIVE_BUFFER_LIMITS.bytes);
   if(slots>1)assert.ok(count<slots,'startup must leave room for another publication');
   for(const start of [0,1000]){
    const session={operational,largestSegmentBytes:bytes,bytes:count*bytes,queue:Array(count).fill(null),clock:new PlayoutClock({start,...policy})};
    session.clock.append(start,start+count);
    if(milli===0){assert.equal(session.clock.sample(0).playhead,start);continue;}
    assert.equal(session.clock.sample(.05).phase,'PLAYING');
    session.operational={run:{...operational.run,running:false}};prepareIdlePlayout(session,false);
    session.operational=operational;prepareIdlePlayout(session,false);
    if(session.clock.state().buffer<session.clock.target&&count<slots)session.clock.append(start+count,start+count+1);
    assert.equal(session.clock.sample(.05).phase,'PLAYING');
   }
  }
 });
 if(milli)test(`${mode} tolerates bounded delivery jitter with one-tick publications`,()=>{
  const rate=milli/1000,policy=liveBufferPolicy(status(mode,milli));
  const clock=new PlayoutClock({start:0,...policy,max_frame_delta:1});
  const initial=Math.ceil(policy.target);clock.append(0,initial);let produced=initial,received=initial;
  const pending=[];
  for(let frame=0;frame<2400;frame++){
   const wall=frame/10;
   const frontier=initial+Math.floor(wall*rate);
   while(produced<frontier){produced++;pending.push({end:produced,due:wall+(produced%7===0?2:0)});}
   while(pending.length&&pending[0].due<=wall){const next=pending.shift();clock.append(received,next.end);received=next.end;}
   assert.notEqual(clock.sample(.1*rate).phase,'STALLED');
   assert.ok(clock.state().buffer<=LIVE_BUFFER_LIMITS.segments);
  }
  assert.ok(clock.playhead>=240*rate*.9,'display must follow authoritative rate');
 });
}

test('a larger observed segment makes a previously unreachable startup target attainable',()=>{
 const operational=status('Normal',1000),clock=new PlayoutClock({start:0,...liveBufferPolicy(operational)});
 clock.append(0,3);assert.equal(clock.sample(1).phase,'BUFFERING');
 Object.assign(clock,liveBufferPolicy(operational,2_000_000));
 assert.equal(clock.sample(1).phase,'PLAYING');
 assert.equal(operational.run.pace.nominal_milli,1000);
});
