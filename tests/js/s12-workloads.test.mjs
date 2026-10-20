import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {unhex} from '@dtr/timeline-runtime/protocol/bytes';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
import {B2zCursor} from '../../packages/kernels/b2z/kernel.mjs';

const fixture = JSON.parse(readFileSync(new URL('../../benchmarks/s12/workloads.json', import.meta.url)));

function run(workload, budget) {
  const cursor = new B2zCursor(
    unhex(workload.initial_state_hex),
    workload.inputs.map(input => ({position: BigInt(input.position), payload_hex: input.payload_hex})),
    {...workload.rules, logical_start: BigInt(workload.logical_start), logical_end: BigInt(workload.logical_end)}
  );
  let work = 0, slices = 0;
  while (cursor.phase !== 'done') {
    const progress = cursor.step(budget); work += progress.used; slices++;
    assert(slices < 2_000_000, 'bounded fixture execution');
  }
  return {output: cursor.result(), work, slices};
}

for (const workload of fixture.workloads) test(`S12 ${workload.name}: budgets preserve authoritative bytes`, () => {
  const low = run(workload, workload.work_budgets[0]);
  const high = run(workload, workload.work_budgets[1]);
  assert.equal(low.work, workload.expected.work_units);
  assert.equal(high.work, workload.expected.work_units);
  assert.equal(low.slices, workload.expected.low_budget_slices);
  assert.equal(high.slices, workload.expected.high_budget_slices);
  for (const key of ['state', 'events', 'scores']) {
    assert.deepEqual(low.output[key], high.output[key]);
    assert.equal(sha256(low.output[key]), workload.expected.output_hashes[key]);
    assert.equal(low.output[key].length, workload.expected.output_bytes[key]);
  }
});
