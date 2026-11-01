import test from 'node:test';import assert from 'node:assert/strict';
import {createCycleMeterView} from '../../apps/b2z-observer/cycle-health.mjs';
const T=1000000000000n,S=1000000000n;
const health=(at,total,start=at-120n*S)=>({version:1,runtime_started_ns:1n,observed_at_ns:at,total_cycles:total,sample_start_ns:start,sample_end_ns:at-1n,net_decline_cycles:[T],discontinuity:''});
test('query balances are separate from same-context callback rate endpoints',()=>{const v=createCycleMeterView();const h=health(200n*S,20n*T);const a=v(h);assert.ok(Math.abs(a.rate-30)<.001);assert.deepEqual(v(h),a);assert.match(a.reason,/not gross/);});
test('unknown query increase invalidates display until the complete rate window follows it',()=>{const v=createCycleMeterView();v(health(200n*S,20n*T));assert.equal(v(health(215n*S,21n*T)).rate,null);assert.equal(v(health(230n*S,20n*T)).rate,null);assert.equal(v(health(400n*S,19n*T,220n*S)).rate!==null,true);});
test('upgrade, stale observations and insufficient data never invent a rate',()=>{const v=createCycleMeterView();v(health(200n*S,20n*T));assert.equal(v(health(190n*S,21n*T)).rate,null);assert.equal(v({...health(210n*S,20n*T),net_decline_cycles:[]}).rate,null);assert.equal(v({...health(220n*S,21n*T),runtime_started_ns:220n*S,net_decline_cycles:[]}).rate,null);assert.equal(v(null).rate,null);});
