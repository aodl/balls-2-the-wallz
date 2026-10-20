import {neighbors} from './world.mjs';
/** All scratch is plain canonical data. A work unit scans one vertex, board cell, or ball. */
export function beginCapture(world, target, attacker, optimized = true) {
  if (!world.cannons.some(c => c.id === attacker) || target < 0 || target >= world.cells.length
      || !Number.isInteger(target) || world.cells[target] === attacker || world.cannons.some(c => c.cell === target))
    throw new Error('invalid capture');
  if (!neighbors(target, world.width, world.height).some(n => world.cells[n] === attacker)) throw new Error('disconnected attack');
  const defender = world.cells[target], anchor = world.cannons.find(c => c.id === defender)?.cell;
  const mustSearch = defender && (!optimized || neighbors(target, world.width, world.height).filter(n => world.cells[n] === defender).length > 1);
  const job = {phase: mustSearch ? 'flood' : 'balls', defender, attacker, target, queue: [], head: 0,
    seen: Array(world.cells.length).fill(false), scan: 0, cells: [target], killed: [], survivors: [], eliminated: []};
  world.cells[target] = attacker;
  if (mustSearch) { job.queue.push(anchor); job.seen[anchor] = true; }
  return job;
}
export function beginCleanup(world, killed = []) {
  const kill = new Set(killed);
  world.balls = world.balls.filter(b => !kill.has(b.id));
  if (world.pending) world.pending = world.pending.filter(p => !kill.has(p.ball));
  const eliminated = world.cannons.filter(c => !world.balls.some(b => b.owner === c.id)).map(c => c.id);
  return {phase: 'neutral', scan: 0, eliminated, killed, cells: [], defender: 0, attacker: 0, target: null,
    queue: [], head: 0, seen: [], survivors: []};
}
export function topologyStep(world, job) {
  if (job.phase === 'done') return true;
  if (job.phase === 'flood') {
    if (job.head < job.queue.length) {
      const cell = job.queue[job.head++];
      for (const n of neighbors(cell, world.width, world.height))
        if (world.cells[n] === job.defender && !job.seen[n]) { job.seen[n] = true; job.queue.push(n); }
    } else { job.phase = 'transfer'; job.scan = 0; }
  } else if (job.phase === 'transfer') {
    if (job.scan < world.cells.length) {
      const cell = job.scan++;
      if (world.cells[cell] === job.defender && !job.seen[cell]) { world.cells[cell] = job.attacker; job.cells.push(cell); }
    } else { job.phase = 'balls'; job.scan = 0; }
  } else if (job.phase === 'balls') {
    if (job.scan < world.balls.length) {
      const b = world.balls[job.scan++];
      if (world.cells[b.cell] !== b.owner) job.killed.push(b.id); else job.survivors.push(b);
    } else {
      world.balls = job.survivors;
      if (world.pending) world.pending = world.pending.filter(p => world.balls.some(b => b.id === p.ball));
      job.eliminated = world.cannons.filter(c => !world.balls.some(b => b.owner === c.id)).map(c => c.id);
      job.phase = 'neutral'; job.scan = 0;
    }
  } else if (job.phase === 'neutral') {
    if (job.scan < world.cells.length) {
      const cell = job.scan++;
      if (job.eliminated.includes(world.cells[cell])) world.cells[cell] = 0;
    } else { world.cannons = world.cannons.filter(c => !job.eliminated.includes(c.id)); job.phase = 'done'; }
  } else throw new Error('unknown topology phase');
  return job.phase === 'done';
}
