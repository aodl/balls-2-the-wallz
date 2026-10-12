#!/usr/bin/env node
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {performance} from 'node:perf_hooks';
import {decodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {unhex, hex} from '@dtr/timeline-runtime/protocol/bytes';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
import {BtzCursor} from '../packages/kernels/btz/kernel.mjs';

const [fixturePath, outputPath, repetitionsText = '3'] = process.argv.slice(2);
if (!fixturePath || !outputPath) throw new Error('usage: s12_game_bench.mjs FIXTURES OUTPUT [REPETITIONS]');
const repetitions = Number(repetitionsText);
if (!Number.isInteger(repetitions) || repetitions < 1 || repetitions > 20) throw new Error('repetitions must be 1..20');
const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
const rows = [];
for (const workload of fixture.workloads) {
  const state = unhex(workload.initial_state_hex);
  const inputs = workload.inputs.map(input => ({position: BigInt(input.position), payload_hex: input.payload_hex}));
  for (const budget of workload.work_budgets) {
    const samples = [];
    let measured;
    for (let repetition = 0; repetition < repetitions; repetition++) {
      let cursor = new BtzCursor(state, inputs, {...workload.rules,
        logical_start: BigInt(workload.logical_start), logical_end: BigInt(workload.logical_end)});
      let work = 0, callbacks = 0;
      const started = performance.now();
      while (cursor.phase !== 'done') {
        const progress = cursor.step(budget); work += progress.used; callbacks++;
        if (callbacks > 2_000_000) throw new Error(`${workload.name}: callback cap`);
      }
      const output = cursor.result();
      samples.push(performance.now() - started);
      measured = {work, callbacks, output};
    }
    const hashes = Object.fromEntries(['state', 'events', 'scores'].map(key => [key, sha256(measured.output[key])]));
    const expected = workload.expected.output_hashes;
    const pass = ['state', 'events', 'scores'].every(key => hashes[key] === expected[key]);
    const finalWorld = decodeCanonical(measured.output.state);
    rows.push({
      workload: workload.name, family: workload.family, budget, repetitions,
      work_units: measured.work, coordinator_step_equivalent: measured.callbacks,
      elapsed_ms: {kind: 'MEASURED_LOCAL_WARM', samples,
        min: Math.min(...samples), median: [...samples].sort((a, b) => a - b)[Math.floor(samples.length / 2)], max: Math.max(...samples)},
      initial_bytes: state.length,
      output_bytes: Object.fromEntries(['state', 'events', 'scores'].map(key => [key, measured.output[key].length])),
      output_hashes: hashes, final_cannons: finalWorld.cannons.length, final_balls: finalWorld.balls.length,
      wasm_instructions: {kind: 'NOT_MEASURED', reason: 'reported separately by canbench'},
      stable_memory: {kind: 'NOT_MEASURED', reason: 'pure kernel benchmark has no stable memory'},
      outcome: pass ? 'PASS' : 'FAIL'
    });
    if (!pass) throw new Error(`${workload.name}: output mismatch`);
  }
}
await mkdir(dirname(outputPath), {recursive: true});
await writeFile(outputPath, `${JSON.stringify({schema: 'btz-s12-game-measurements-v1', rows}, null, 2)}\n`);
console.log(JSON.stringify({outcome: 'PASS', workloads: fixture.workloads.length, rows: rows.length}));
