#!/usr/bin/env node
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {performance} from 'node:perf_hooks';
import {decodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {unhex, hex} from '@dtr/timeline-runtime/protocol/bytes';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
import {TimelineCoordinator} from '@dtr/timeline-runtime/runtime/coordinator';
import {PublicationWindow, publication} from '@dtr/timeline-runtime/observation/publication';
import {BtzKernel, BtzCursor} from '../packages/kernels/btz/kernel.mjs';

const [fixturePath, outputPath, repetitionsText = '3'] = process.argv.slice(2);
if (!fixturePath || !outputPath) throw new Error('usage: s12_game_bench.mjs FIXTURES OUTPUT [REPETITIONS]');
const repetitions = Number(repetitionsText);
if (!Number.isInteger(repetitions) || repetitions < 1 || repetitions > 20) throw new Error('repetitions must be 1..20');
const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
const rows = [];
const multiSegmentCoordinator = [];
for (const workload of fixture.workloads.filter(row => row.segments > 1)) {
  let host = TimelineCoordinator.create(unhex(workload.initial_state_hex), {source_id: '00'.repeat(32), ...workload.rules},
    {logical_start: BigInt(workload.logical_start), source_from: 0n}, BtzKernel);
  const window = new PublicationWindow({maxSegments: 3});
  const publications = [];
  for (let segment = 0; segment < workload.segments; segment++) {
    const ticks = BigInt(workload.logical_end) - BigInt(workload.logical_start);
    host.apply({kind: 'seal', logical_end: BigInt(workload.logical_start) + BigInt(segment + 1) * ticks});
    let callbacks = 0;
    while (host.status().phase === 'running') {
      host.apply({kind: 'step', budget: 512}); callbacks++;
      if (callbacks > 2_000_000) throw new Error('multi-segment callback cap');
    }
    host.apply({kind: 'publish', manifest_hash: host.status().ready_hash});
    const bytes = host.snapshot();
    host = TimelineCoordinator.restore(bytes, sha256(bytes), BtzKernel);
    const view = publication(host.publicationRecord());
    window.retain(host.publicationRecord());
    publications.push({segment, callbacks, snapshot_bytes: bytes.length, publication_bytes: view.bytes.length,
      publication_hash: view.sha256, retained_segments: window.status().segments, retained_bytes: window.status().bytes});
  }
  if (publications.length !== workload.segments) throw new Error('declared segment mismatch');
  multiSegmentCoordinator.push({workload: workload.name, declared_segments: workload.segments,
    executed_segments: publications.length, publications, scope: 'JS coordinator snapshot/restore, publication v6 and bounded memory window; IC stable writes NOT_MEASURED'});
}
for (const workload of fixture.workloads) {
  const state = unhex(workload.initial_state_hex);
  const inputs = workload.inputs.map(input => ({position: BigInt(input.position), payload_hex: input.payload_hex}));
  for (const budget of workload.work_budgets) {
    const samples = [];
    let measured;
    for (let repetition = 0; repetition < repetitions; repetition++) {
      let chainedState = state, work = 0, callbacks = 0, output;
      const intervals = [];
      const started = performance.now();
      for (let segment = 0; segment < workload.segments; segment++) {
        const ticks = BigInt(workload.logical_end) - BigInt(workload.logical_start);
        const start = BigInt(workload.logical_start) + BigInt(segment) * ticks;
        const cursor = new BtzCursor(chainedState, segment === 0 ? inputs : [], {...workload.rules,
          logical_start: start, logical_end: start + ticks});
        let segmentWork = 0, segmentCallbacks = 0;
        while (cursor.phase !== 'done') {
          const progress = cursor.step(budget); segmentWork += progress.used; segmentCallbacks++;
          if (segmentCallbacks > 2_000_000) throw new Error(`${workload.name}: callback cap`);
        }
        output = cursor.result();
        const hashes = Object.fromEntries(['state', 'events', 'scores'].map(key => [key, sha256(output[key])]));
        if (segment === 0 && ['state', 'events', 'scores'].some(key => hashes[key] !== workload.expected.output_hashes[key])) {
          throw new Error(`${workload.name}: first interval output mismatch`);
        }
        intervals.push({segment, logical_start: start.toString(), logical_end: (start + ticks).toString(),
          input_state_hash: sha256(chainedState), output_hashes: hashes, work_units: segmentWork, callbacks: segmentCallbacks});
        chainedState = output.state; work += segmentWork; callbacks += segmentCallbacks;
      }
      samples.push(performance.now() - started);
      measured = {work, callbacks, output, intervals};
    }
    const hashes = Object.fromEntries(['state', 'events', 'scores'].map(key => [key, sha256(measured.output[key])]));
    const prior = rows.find(row => row.workload === workload.name);
    const pass = measured.intervals.length === workload.segments &&
      (!prior || JSON.stringify(prior.intervals.map(row => row.output_hashes)) === JSON.stringify(measured.intervals.map(row => row.output_hashes)));
    const finalWorld = decodeCanonical(measured.output.state);
    rows.push({
      executed_segments: measured.intervals.length, intervals: measured.intervals,
      scope: 'chained pure kernel intervals; publication/stable retention NOT_MEASURED',
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
await writeFile(outputPath, `${JSON.stringify({schema: 'btz-s12-game-measurements-v1', rows, multi_segment_coordinator: multiSegmentCoordinator}, null, 2)}\n`);
console.log(JSON.stringify({outcome: 'PASS', workloads: fixture.workloads.length, rows: rows.length}));
