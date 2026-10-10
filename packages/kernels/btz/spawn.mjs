/** Exhaustive, resumable placement. Hash ordering is predictable, not manipulation-resistant. */
import {encodeCanonical} from '../../runtime/canonical.mjs';
import {sha256} from '../../runtime/seal.mjs';
import {cmp, rat} from './math.mjs';
import {neighbors, position, Q} from './world.mjs';

export function seedPatch(cell, width, height) {
  const x = cell % width, y = Math.floor(cell / width);
  if (x < 1 || y < 1 || x + 1 >= width || y + 1 >= height) return null;
  const cells = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) cells.push(cell + dy * width + dx);
  return cells;
}
export function spawnRank(seed, kind, cell, other) {
  if (!/^[0-9a-f]{64}$/.test(seed)) throw new Error('spawn seed');
  return sha256(encodeCanonical({domain: 'BTZ-SPAWN-RANK-03', seed, kind, cell, other}));
}
export function beginSpawn(seed) {
  return {version: 3, seed, phase: 'enumerate', scan: 0, candidates: [], candidate: 0,
    current: null, patch: [], owners: [], ownerIndex: 0, queue: [], head: 0, seen: [],
    checked: 0, rejection_counts: {}, result: null};
}
function reject(job, reason) {
  job.rejection_counts[reason] = (job.rejection_counts[reason] ?? 0) + 1;
  job.phase = 'candidate'; job.current = null;
}
/** The board is immutable during this job. The host must not execute later inputs concurrently. */
export function spawnStep(world, job) {
  if (job.phase === 'done') return true;
  if (job.phase === 'enumerate') {
    if (job.scan < world.cells.length) {
      const cell = job.scan++;
      if (!seedPatch(cell, world.width, world.height)) return false;
      for (const other of neighbors(cell, world.width, world.height)) {
        const a = world.cells[cell], b = world.cells[other];
        if (a !== b) {
          const kind = a && b ? 0 : 1;
          job.candidates.push({kind, cell, other, rank: spawnRank(job.seed, kind, cell, other)});
        }
      }
      // Neutral is a preference, not permission to steal through a neutral-centred mixed patch.
      const patch = seedPatch(cell, world.width, world.height);
      const kind = patch.every(c => world.cells[c] === 0) ? 2 : 3;
      job.candidates.push({kind, cell, other: -1, rank: spawnRank(job.seed, kind, cell, -1)});
    } else {
      // At most five candidates per cell; this bounded sort is not an instruction quota.
      job.candidates.sort((a, b) => a.kind - b.kind || (a.rank < b.rank ? -1 : a.rank > b.rank ? 1 : 0)
        || a.cell - b.cell || a.other - b.other);
      job.phase = 'candidate';
    }
  } else if (job.phase === 'candidate') {
    if (job.candidate >= job.candidates.length) { job.phase = 'done'; return true; }
    job.current = job.candidates[job.candidate++]; job.checked++;
    job.patch = seedPatch(job.current.cell, world.width, world.height);
    if (world.cannons.some(c => job.patch.includes(c.cell))) { reject(job, 'ANCHOR'); return false; }
    const cx = job.current.cell % world.width, cy = Math.floor(job.current.cell / world.width);
    // Inclusive closure protects a ball exactly on a seed edge as well as one in its interior.
    if (world.balls.some(b => {
      const [x, y] = position(b, world.time);
      return cmp(x, rat((cx - 1) * Q)) >= 0 && cmp(x, rat((cx + 2) * Q)) <= 0
        && cmp(y, rat((cy - 1) * Q)) >= 0 && cmp(y, rat((cy + 2) * Q)) <= 0;
    })) { reject(job, 'BALL'); return false; }
    job.owners = [...new Set(job.patch.map(c => world.cells[c]).filter(Boolean))].sort((a, b) => a - b);
    job.ownerIndex = 0; job.phase = 'owner';
  } else if (job.phase === 'owner') {
    if (job.ownerIndex >= job.owners.length) {
      job.result = {cell: job.current.cell, patch: [...job.patch], kind: job.current.kind,
        other: job.current.other, checked: job.checked};
      job.phase = 'done'; return true;
    }
    const anchor = world.cannons.find(c => c.id === job.owners[job.ownerIndex]).cell;
    job.queue = [anchor]; job.head = 0; job.seen = Array(world.cells.length).fill(false); job.seen[anchor] = true;
    job.phase = 'flood';
  } else if (job.phase === 'flood') {
    if (job.head < job.queue.length) {
      const cell = job.queue[job.head++], owner = job.owners[job.ownerIndex];
      for (const n of neighbors(cell, world.width, world.height))
        if (world.cells[n] === owner && !job.seen[n] && !job.patch.includes(n)) { job.seen[n] = true; job.queue.push(n); }
    } else { job.scan = 0; job.phase = 'verify'; }
  } else if (job.phase === 'verify') {
    if (job.scan < world.cells.length) {
      const c = job.scan++;
      if (world.cells[c] === job.owners[job.ownerIndex] && !job.patch.includes(c) && !job.seen[c]) reject(job, 'SPLIT');
    } else { job.ownerIndex++; job.phase = 'owner'; }
  } else throw new Error('spawn phase');
  return job.phase === 'done';
}
