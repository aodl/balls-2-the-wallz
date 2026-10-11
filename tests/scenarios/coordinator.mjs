/** Synthetic host workloads. There is no live ledger in these fixtures. */
import {TimelineCoordinator} from '@dtr/timeline-runtime/runtime/coordinator';
import {scenario} from './btz.mjs';
import {BtzKernel} from '../../packages/kernels/btz/kernel.mjs';
import {BTZ_IDENTITY,encodeWorld} from '../../packages/kernels/btz/world.mjs';
import {LifeInputKernel,encodeLifeSet} from '@dtr/timeline-runtime/examples/life-input';
import {board,encodeBoard} from '@dtr/timeline-runtime/examples/life';
import {hex} from '@dtr/timeline-runtime/protocol/bytes';
export function coordinatorScenario(name) {
  const source_id='01'.repeat(32);
  if(name==='life'){
    const kernel=LifeInputKernel,identity={source_id,rules_hash:'02'.repeat(32),config_hash:'03'.repeat(32),schema_hash:'04'.repeat(32)};
    return {kernel,host:TimelineCoordinator.create(encodeBoard(board(4,4,Array(16).fill(0))),identity,{logical_start:0n,source_from:0n},kernel),
      records:[hex(encodeLifeSet(1,5)),null,hex(encodeLifeSet(1,6)),hex(encodeLifeSet(1,9)),hex(encodeLifeSet(1,10))],end:2n};
  }
  const s=scenario(name),kernel=BtzKernel,records=[];
  for(const input of s.inputs??[]) {while(records.length<Number(input.position))records.push(null);records.push(input.payload_hex);}
  return {kernel,host:TimelineCoordinator.create(encodeWorld(s.world),{source_id,...BTZ_IDENTITY},{logical_start:0n,source_from:0n},kernel),records,end:s.ticks};
}
