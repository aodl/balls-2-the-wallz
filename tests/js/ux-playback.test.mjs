/** UX-04/05/06/11: actual pinned DTR clock and maintained application policy. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PlayoutClock} from '@dtr/timeline-runtime/client/playout';
import {liveBufferPolicy} from '../../apps/b2z-observer/model.mjs';
const app=readFileSync(new URL('../../apps/b2z-observer/app.mjs',import.meta.url),'utf8');
for(const [mode,rate] of [['Trickle',10],['Lifeline',50],['Survival',100]])test(`UX-05 one complete ${mode} interval starts the actual clock`,()=>{
 const clock=new PlayoutClock({start:0,...liveBufferPolicy({run:{pace:{mode,nominal_milli:rate,supported_milli:rate},publication_ticks:1n}})});
 clock.append(0,1);assert.ok(clock.sample(.01).playhead>0);
 for(let i=0;i<200;i++)clock.sample(.01);assert.equal(clock.playhead,1);
 clock.append(1,2);assert.ok(clock.sample(.01).playhead>1);assert.ok(clock.playhead<=2);
});
test('UX-04 action planning never resets live presentation',()=>{
 const handler=app.slice(app.indexOf("document.addEventListener('b2z-plan'"));
 assert.ok(!handler.includes('resetLiveClock('),'planning must read referenceWorld without touching the clock');
});
test('UX-11 reduced motion never initializes live playback paused',()=>{
 assert.ok(!/paused=matchMedia/.test(app));
 assert.ok(!/paused=pref.paused/.test(app));
});
