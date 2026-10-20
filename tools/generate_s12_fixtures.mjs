#!/usr/bin/env node
// Legacy fixture metadata is preserved byte-for-byte; current application naming is B2Z.
/** Generate new S12-only deterministic workloads; never rewrites historical goldens. */
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {encodeCanonical, decodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {hex} from '@dtr/timeline-runtime/protocol/bytes';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
import {B2zCursor, encodePayment} from '../packages/kernels/b2z/kernel.mjs';
import {B2Z_IDENTITY, TEST_CONFIG, encodeWorld, fixtureWorld} from '../packages/kernels/b2z/world.mjs';
import {heading} from '../packages/kernels/b2z/math.mjs';
import {scenario} from '../tests/scenarios/b2z.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(here, '../benchmarks/s12/workloads.json');
const account = id => id.toString(16).padStart(2, '0').repeat(32);
const ball = (id, owner, cell, width, vx, vy = 0, dx = 512, dy = 512) => ({
  id, owner, cell, x0: BigInt(cell % width * 1024 + dx),
  y0: BigInt(Math.floor(cell / width) * 1024 + dy), vx, vy
});
const world = (width, height, cells, anchors, balls) => fixtureWorld({
  width, height, cells,
  cannons: anchors.map((cell, i) => ({id: i + 1, cell, account: account(i + 1)})), balls
});
const payment = (id, amount, kind = 'angle', value = 0, position = 0) => ({
  position: BigInt(position), payload_hex: hex(encodePayment(account(id), amount, {kind, value}))
});

function highBalls() {
  const width = 16, height = 8;
  const cells = Array.from({length: width * height}, (_, i) => i % width < 8 ? 1 : 2);
  const balls = [];
  for (let i = 0; i < 64; i++) {
    const owner = i < 32 ? 1 : 2;
    const local = i % 32;
    const x = owner === 1 ? local % 8 : 8 + local % 8;
    const y = Math.floor(local / 8) * 2 + (local % 2);
    const [vx, vy] = heading((i * 997 + owner * 7919) % 65536);
    balls.push(ball(i + 1, owner, y * width + x, width, vx || 1, vy));
  }
  return {ticks: 4n, world: world(width, height, cells, [48, 63], balls)};
}

function cannonFrontier() {
  const width = 32, height = 8;
  const cells = Array.from({length: width * height}, (_, i) => i % width + 1);
  const anchors = Array.from({length: 32}, (_, i) => 3 * width + i);
  const balls = anchors.map((cell, i) => ball(i + 1, i + 1, cell, width, i % 2 ? -1024 : 1024));
  return {ticks: 1n, world: world(width, height, cells, anchors, balls)};
}

function spawnPressure() {
  const inputs = [];
  for (let i = 0; i < 10; i++) {
    const amount = i === 0 ? 1n : TEST_CONFIG.join_e8s;
    inputs.push(payment(i + 1, amount, i % 3 === 0 ? 'move' : 'angle', (i * 8191) % 65536, i));
  }
  return {ticks: 1n, world: world(32, 32, Array(1024).fill(0), [], []), inputs};
}

const definitions = [
  {name: 'small-reference', family: 'existing-small-reference', ...scenario('admission')},
  {name: 'empty-motion', family: 'empty-input-motion', ...scenario('wall-bounce'), ticks: 32n},
  {name: 'ball-dense-medium', family: 'ball-dense-simulation', ...scenario('dense')},
  {name: 'ball-dense-high', family: 'ball-dense-simulation', ...highBalls()},
  {name: 'many-cannon-frontier', family: 'many-cannon-frontier', ...cannonFrontier()},
  {name: 'fragmentation-severance', family: 'territory-fragmentation-and-severance', ...scenario('severance')},
  {name: 'collision-intensive', family: 'collision-intensive-simulation', ...scenario('near-impact')},
  {name: 'spawn-admission-pressure', family: 'spawn-and-admission-pressure', ...spawnPressure()},
  {name: 'multi-segment-persistence', family: 'multi-segment-persistence', ...scenario('duel'), ticks: 1n,
    segments: 8}
];

function complete(definition, budget) {
  const state = encodeWorld(definition.world);
  const inputs = definition.inputs ?? [];
  const cursor = new B2zCursor(state, inputs, {
    ...B2Z_IDENTITY, logical_start: definition.world.time[0], logical_end: definition.ticks
  });
  let work = 0, slices = 0;
  while (cursor.phase !== 'done') {
    const progress = cursor.step(budget);
    work += progress.used; slices++;
    if (slices > 2_000_000) throw new Error(`${definition.name}: work cap`);
  }
  const output = cursor.result();
  const finalWorld = decodeCanonical(output.state);
  const events = decodeCanonical(output.events);
  return {output, finalWorld, events, work, slices};
}

const workloads = definitions.map(definition => {
  const low = complete(definition, 1);
  const high = complete(definition, 100000);
  for (const key of ['state', 'events', 'scores']) {
    if (hex(low.output[key]) !== hex(high.output[key])) throw new Error(`${definition.name}: budget-dependent ${key}`);
  }
  const initial = encodeWorld(definition.world);
  const outputHashes = Object.fromEntries(['state', 'events', 'scores'].map(key => [key, sha256(low.output[key])]));
  return {
    name: definition.name,
    family: definition.family,
    rules: {...B2Z_IDENTITY},
    logical_start: definition.world.time[0].toString(),
    logical_end: definition.ticks.toString(),
    segments: definition.segments ?? 1,
    work_budgets: [1, 100000],
    initial_state_hex: hex(initial),
    initial_state_hash: sha256(initial),
    inputs: (definition.inputs ?? []).map(input => ({position: input.position.toString(), payload_hex: input.payload_hex})),
    expected: {
      output_hashes: outputHashes,
      output_bytes: Object.fromEntries(['state', 'events', 'scores'].map(key => [key, low.output[key].length])),
      work_units: low.work,
      low_budget_slices: low.slices,
      high_budget_slices: high.slices,
      cannons: low.finalWorld.cannons.length,
      balls: low.finalWorld.balls.length,
      audit_events: low.events.events.length,
      receipts: low.events.receipts.length,
      final_ownership_hash: sha256(encodeCanonical(low.finalWorld.cells)),
      source_positions: (definition.inputs ?? []).map(input => input.position.toString())
    }
  };
});

const document = {
  schema: 'btz-s12-workloads-v1',
  generated_by: 'tools/generate_s12_fixtures.mjs',
  definitions: {
    canonical_encoding: 'DTR canonical typed JSON',
    work_units: 'BTZ kernel abstract work units; not Wasm instructions',
    elapsed_time: 'excluded from deterministic fixture'
  },
  limits: {
    max_cells: 1024, max_width: 32, max_height: 32, max_cannons: 32,
    max_balls: 64, max_balls_per_cannon: 32, max_inputs: 4096,
    max_segment_ticks: 64, max_spawn_searches_per_segment: 8, max_audit_events: 131072
  },
  workloads
};
const rendered = `${JSON.stringify(document, null, 2)}\n`;
if (process.argv.includes('--check')) {
  const existing = await readFile(target, 'utf8');
  if (existing !== rendered) throw new Error(`${target} is stale; regenerate without --check`);
  console.log(`PASS: ${target}`);
} else {
  await mkdir(dirname(target), {recursive: true});
  await writeFile(target, rendered);
  console.log(target);
}
