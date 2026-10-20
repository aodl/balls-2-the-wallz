#!/usr/bin/env node
/** Same-rule differential benchmark. Abstract work is NEVER labelled instructions or cycles. */
import {performance} from 'node:perf_hooks';
import {scenario} from '../tests/scenarios/b2z.mjs';
import {B2zCursor} from '../packages/kernels/b2z/kernel.mjs';
import {B2Z_IDENTITY, encodeWorld} from '../packages/kernels/b2z/world.mjs';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
const rows=[];
for(const name of ['admission','near-impact','duel','severance','corner','wall-bounce','dense']){
  const spec=scenario(name),initial=encodeWorld(spec.world),modes=[];
  for(const optimized of [false,true]){
    const c=new B2zCursor(initial,spec.inputs??[],{...B2Z_IDENTITY,logical_start:0n,logical_end:spec.ticks},
      {cacheAreas:optimized,fastTopology:optimized});
    const start=performance.now();let work=0,slices=0,maxSnapshot=0;
    while(c.phase!=='done'){
      work+=c.step(127).used;slices++;maxSnapshot=Math.max(maxSnapshot,c.snapshot().length);
      if(slices>100000)throw new Error('benchmark work cap');
    }
    const result=c.result(),creditBits=c.world.credits.map(s=>({account:s.account,
      numerator_bits:s.units[0].toString(2).length,denominator_bits:s.units[1].toString(2).length}));
    modes.push({mode:optimized?'cached-area/local-cut-precheck':'full-area/full-cut-search',abstract_work_units:work,slices,
      sampled_max_snapshot_bytes:maxSnapshot,state_bytes:result.state.length,event_bytes:result.events.length,
      score_bytes:result.scores.length,local_elapsed_ms:Math.round((performance.now()-start)*1000)/1000,
      state_hash:sha256(result.state),event_hash:sha256(result.events),score_hash:sha256(result.scores),credit_bits:creditBits});
  }
  const equivalent=['state_hash','event_hash','score_hash'].every(k=>modes[0][k]===modes[1][k]);
  if(!equivalent)throw new Error('optimization changed canonical output');
  rows.push({name,initial_balls:spec.world.balls.length,cells:spec.world.cells.length,logical_ticks:spec.ticks.toString(),
    identical_outputs:equivalent,work_reduction_percent:Math.round(10000*(1-modes[1].abstract_work_units/modes[0].abstract_work_units))/100,modes});
}
console.log(JSON.stringify({checkpoint:'S03',method:'Single-run local Node reference; elapsed includes snapshots; sampled maxima at 127-unit intervals, not proven maxima. Work units are not IC instructions.',
  cycles_consumed:null,eth_equivalent:null,results:rows},null,2));
