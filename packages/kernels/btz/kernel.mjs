/** Version 3 reference. Pure logical-time gameplay; no IC calls or presentation authority. */
import {ascii, be, concat, hex, Reader, unhex, uint} from '../../protocol/bytes.mjs';
import {decodeMemo, encodeMemo} from '../../protocol/memo.mjs';
import {cloneCanonical, decodeCanonical, encodeCanonical} from '../../runtime/canonical.mjs';
import {canonicalInputs, sha256} from '../../runtime/seal.mjs';
import {add, cmp, heading, mulInt, rat, sub, validRat} from './math.mjs';
import {BTZ_IDENTITY, decodeWorld, encodeWorld, LIMITS, position, Q, TEST_CONFIG, validateWorld} from './world.mjs';
import {nextCrossing, reflected} from './geometry.mjs';
import {beginCapture, beginCleanup, topologyStep} from './topology.mjs';
import {beginSpawn, spawnStep} from './spawn.mjs';

/** Synthetic adapter envelope, NOT an ICP ledger receipt. Wire format unchanged since S02. */
export function encodePayment(account, amount, command) {
  return concat(ascii('BTZPAY02'), unhex(account, 32), be(amount, 8), encodeMemo(command));
}
function readPayment(payload) {
  const r = new Reader(unhex(payload), 56);
  if (hex(r.take(8)) !== hex(ascii('BTZPAY02'))) throw new Error('unreadable normalized payment');
  const account = hex(r.take(32)), amount = r.integer(8), memo = r.take(8); r.end();
  return {account, amount, memo};
}
export const ballPrice = active => {
  if (!Number.isInteger(active) || active < 1 || active > LIMITS.max_per_cannon) throw new Error('price count');
  return TEST_CONFIG.ball_base_e8s * BigInt(active) ** 2n;
};
function launch(world, cannon, angle) {
  if (world.time[1] !== 1n) throw new Error('commands require integer checkpoint');
  const [vx, vy] = heading(angle), x = (cannon.cell % world.width) * Q + Q / 2,
    y = Math.floor(cannon.cell / world.width) * Q + Q / 2;
  const b = {id: world.next_ball_id++, owner: cannon.id, cell: cannon.cell,
    x0: BigInt(x) - BigInt(vx) * world.time[0], y0: BigInt(y) - BigInt(vy) * world.time[0], vx, vy};
  world.balls.push(b); return b;
}
function mutation(world, payment, moved) {
  if (world.received_e8s + payment.amount >= (1n << 128n)) throw new Error('treasury counter overflow');
  world.received_e8s += payment.amount;
  let command;
  try { command = decodeMemo(payment.memo); } catch { return {reason: 'MALFORMED_MEMO'}; }
  const cannon = world.cannons.find(c => c.account === payment.account);
  if (!cannon) {
    if (command.kind !== 'angle') return {reason: 'NO_CANNON'};
    if (payment.amount < TEST_CONFIG.join_e8s) return {reason: 'UNDERFUNDED'};
    if (world.cannons.length >= LIMITS.max_cannons) return {reason: 'CANNON_CAPACITY'};
    if (world.next_cannon_id > 65535) return {reason: 'CANNON_ID_EXHAUSTED'};
    if (world.balls.length >= LIMITS.max_balls || world.next_ball_id >= 4294967295) return {reason: 'BALL_CAPACITY'};
    const accounts = new Set([...world.credits.map(s => s.account), ...world.cannons.map(c => c.account)]);
    if (!accounts.has(payment.account) && accounts.size >= 1024) return {reason: 'ACCOUNTING_CAPACITY'};
    return {reason: 'PENDING_SPAWN', angle: command.value};
  }
  if (command.kind === 'move') {
    if (payment.amount < TEST_CONFIG.move_e8s) return {reason: 'UNDERFUNDED'};
    if (moved.includes(cannon.id)) return {reason: 'MOVE_LIMIT'};
    if (command.value >= world.cells.length || world.cells[command.value] !== cannon.id) return {reason: 'NOT_OWN_TERRITORY'};
    const before = cannon.cell; cannon.cell = command.value; moved.push(cannon.id);
    return {reason: 'ACCEPTED', kind: 'cannon_moved', cannon: cannon.id, before, after: cannon.cell};
  }
  const count = world.balls.filter(b => b.owner === cannon.id).length;
  if (payment.amount < ballPrice(count)) return {reason: 'UNDERFUNDED'};
  if (count >= LIMITS.max_per_cannon || world.balls.length >= LIMITS.max_balls || world.next_ball_id >= 4294967295)
    return {reason: 'BALL_CAPACITY'};
  return {reason: 'ACCEPTED', kind: 'ball_spawned', cannon: cannon.id, ball: cloneCanonical(launch(world, cannon, command.value))};
}
function classify(world, ball, crossing) {
  const cx = ball.cell % world.width, cy = Math.floor(ball.cell / world.width), targets = [];
  for (const axis of ['x', 'y']) if (crossing[axis]) {
    const x = cx + (axis === 'x' ? Math.sign(ball.vx) : 0), y = cy + (axis === 'y' ? Math.sign(ball.vy) : 0);
    const target = x < 0 || y < 0 || x >= world.width || y >= world.height ? null : y * world.width + x;
    const cannon = target !== null && world.cannons.some(c => c.cell === target);
    const pass = target !== null && world.cells[target] === ball.owner && !cannon;
    targets.push({axis, target, pass, capturable: target !== null && !cannon && world.cells[target] !== ball.owner,
      defender: target === null ? 0 : world.cells[target]});
  }
  const attack = targets.filter(t => t.capturable).sort((a, b) => a.target - b.target)[0] ?? null;
  return {...crossing, owner: ball.owner, cell: ball.cell, targets, attack};
}
function validStrike(world, p) {
  return world.balls.some(b => b.id === p.ball && b.owner === p.owner)
    && world.cells[p.from] === p.owner && world.cells[p.to] === p.defender
    && !world.cannons.some(c => c.cell === p.to);
}
function incomingStrike(world, intent) {
  const t = intent.attack;
  if (!t || !t.defender || world.pending.some(p => p.ball === intent.ball)) return null;
  const ball = world.balls.find(b => b.id === intent.ball);
  return {id: 0, from: intent.cell, to: t.target, axis: t.axis, ball: intent.ball,
    owner: intent.owner, defender: t.defender, born: world.time,
    deadline: add(world.time, TEST_CONFIG.annihilation_time_window), position: position(ball, world.time)[t.axis === 'x' ? 1 : 0]};
}
/** Frozen candidates, then greedy ascending edge/ball pairing. One pair maximum per ball. */
export function matchStrikes(world, incoming) {
  const edges = [...world.pending.filter(p => validStrike(world, p)), ...incoming];
  edges.sort((a, b) => Math.min(a.from, a.to) - Math.min(b.from, b.to)
    || Math.max(a.from, a.to) - Math.max(b.from, b.to) || a.ball - b.ball);
  const used = new Set(), pairs = [];
  for (let i = 0; i < edges.length; i++) {
    const a = edges[i]; if (used.has(a.ball)) continue;
    for (let j = i + 1; j < edges.length; j++) {
      const b = edges[j]; if (used.has(b.ball) || a.ball === b.ball) continue;
      const distance = sub(a.position, b.position);
      if (a.from === b.to && a.to === b.from && a.owner === b.defender && b.owner === a.defender
          && cmp(world.time, a.deadline) <= 0 && cmp(world.time, b.deadline) <= 0
          && (distance[0] < 0n ? -distance[0] : distance[0]) <= BigInt(TEST_CONFIG.annihilation_distance) * distance[1]) {
        used.add(a.ball); used.add(b.ball); pairs.push([a.ball, b.ball]); break;
      }
    }
  }
  return pairs;
}

export class BtzCursor {
  constructor(state, inputs, seal, {cacheAreas = true, fastTopology = true} = {}) {
    for (const k of Object.keys(BTZ_IDENTITY)) if (seal[k] !== BTZ_IDENTITY[k]) throw new Error('BTZ rule/config/schema identity');
    this.world = decodeWorld(state); this.inputs = canonicalInputs(inputs); this.inputIndex = 0; this.moved = [];
    this.start = rat(uint(seal.logical_start)); this.end = rat(uint(seal.logical_end));
    if (cmp(this.world.time, this.start) !== 0 || cmp(this.end, this.start) <= 0
        || cmp(sub(this.end, this.start), rat(LIMITS.max_segment_ticks)) > 0
        || cmp(this.end, rat(1000000000)) > 0 || inputs.length > 4096) throw new Error('BTZ segment context');
    this.seedBase = sha256(encodeCanonical({domain: 'BTZ-SPAWN-INPUT-03', state: sha256(state),
      inputs: sha256(encodeCanonical(this.inputs)), logical_start: this.start}));
    this.initialCredits = cloneCanonical(this.world.credits);
    this.phase = 'commands'; this.events = []; this.receipts = [];
    this.scan = 0; this.candidates = []; this.intents = []; this.nextTime = this.start;
    this.areas = []; this.areaDirty = true; this.cacheAreas = cacheAreas; this.fastTopology = fastTopology;
    this.resolving = 0; this.claimed = []; this.job = null; this.jobMeta = null; this.afterTopology = 'resolve';
    this.spawnJob = null; this.spawnPayment = null; this.spawnAngle = 0; this.spawnSearches = 0;
  }
  emit(event) {
    if (this.events.length >= 131072) throw new Error('small-board event capacity');
    this.events.push({sequence: this.events.length, time: this.world.time, ...structuredClone(event)});
  }
  receipt(payment, outcome) {
    const i = this.inputs[this.inputIndex++];
    this.receipts.push({position: uint(i.position), account: payment.account, amount: payment.amount, ...outcome});
    if (outcome.reason === 'ACCEPTED') this.emit(outcome);
  }
  restartSearch() {
    this.phase = 'search'; this.scan = 0; this.candidates = []; this.intents = [];
    this.claimed = []; this.resolving = 0; this.job = null; this.jobMeta = null;
    const valid = [];
    for (const p of this.world.pending) {
      if (validStrike(this.world, p)) valid.push(p);
      else this.emit({kind: 'strike_cancelled', strike: p.id, reason: 'INVALIDATED'});
    }
    this.world.pending = valid;
  }
  work() {
    if (this.phase === 'commands') {
      if (this.inputIndex < this.inputs.length) {
        const i = this.inputs[this.inputIndex], payment = readPayment(i.payload_hex);
        const outcome = mutation(this.world, payment, this.moved);
        if (outcome.reason === 'PENDING_SPAWN' && this.spawnSearches >= TEST_CONFIG.max_spawn_searches_per_segment) {
          this.receipt(payment, {reason: 'SPAWN_SEARCH_CAPACITY'});
        } else if (outcome.reason === 'PENDING_SPAWN') {
          this.spawnSearches++;
          const seed = sha256(encodeCanonical({base: this.seedBase, position: uint(i.position), cannon: this.world.next_cannon_id}));
          this.spawnJob = beginSpawn(seed); this.spawnPayment = {account: payment.account, amount: payment.amount}; this.spawnAngle = outcome.angle; this.phase = 'spawn';
        } else this.receipt(payment, outcome);
      } else this.restartSearch();
    } else if (this.phase === 'spawn') {
      if (spawnStep(this.world, this.spawnJob)) {
        const r = this.spawnJob.result; let outcome;
        if (!r) outcome = {reason: 'NO_ELIGIBLE_SPAWN', checked: this.spawnJob.checked};
        else {
          const cannon = {id: this.world.next_cannon_id++, cell: r.cell, account: this.spawnPayment.account};
          const previous_owners = r.patch.map(c => this.world.cells[c]);
          for (const c of r.patch) this.world.cells[c] = cannon.id;
          this.world.cannons.push(cannon);
          outcome = {reason: 'ACCEPTED', kind: 'cannon_spawned', cannon: cloneCanonical(cannon),
            patch: r.patch, previous_owners, placement_class: r.kind, frontier_other: r.other,
            ball: cloneCanonical(launch(this.world, cannon, this.spawnAngle))};
          this.areaDirty = true;
        }
        this.receipt(this.spawnPayment, outcome);
        this.spawnJob = null; this.spawnPayment = null; this.phase = 'commands';
      }
    } else if (this.phase === 'search') {
      if (this.scan < this.world.balls.length) {
        const crossing = nextCrossing(this.world.balls[this.scan++], this.world.width, this.world.time);
        if (cmp(crossing.time, this.end) < 0) this.candidates.push(crossing);
      } else {
        this.nextTime = [...this.candidates.map(c => c.time), ...this.world.pending.map(p => p.deadline)]
          .reduce((t, c) => cmp(c, t) < 0 ? c : t, this.end);
        this.candidates = this.candidates.filter(c => cmp(c.time, this.nextTime) === 0);
        if (!this.cacheAreas || this.areaDirty) { this.areas = this.world.cannons.map(c => [c.id, 0]); this.scan = 0; }
        else this.scan = this.world.cells.length;
        this.phase = 'area';
      }
    } else if (this.phase === 'area') {
      if (this.scan < this.world.cells.length) {
        const owner = this.world.cells[this.scan++], item = this.areas.find(a => a[0] === owner);
        if (item) item[1]++;
      } else {
        const dt = sub(this.nextTime, this.world.time);
        for (const [id, area] of this.areas) {
          const account = this.world.cannons.find(c => c.id === id).account;
          let s = this.world.credits.find(s => s.account === account);
          if (!s) { s = {account, units: rat(0)}; this.world.credits.push(s); }
          s.units = add(s.units, mulInt(dt, area));
        }
        this.world.credits.sort((a, b) => a.account < b.account ? -1 : a.account > b.account ? 1 : 0);
        this.areaDirty = false; this.world.time = this.nextTime;
        if (cmp(this.world.time, this.end) === 0) { validateWorld(this.world); this.phase = 'done'; }
        else this.phase = 'batch';
      }
    } else if (this.phase === 'batch') {
      this.intents = this.candidates.map(c => classify(this.world, this.world.balls.find(b => b.id === c.ball), c))
        .sort((a, b) => a.owner - b.owner || a.ball - b.ball);
      const pairs = matchStrikes(this.world, this.intents.map(i => incomingStrike(this.world, i)).filter(Boolean));
      if (pairs.length) {
        this.emit({kind: 'annihilation', pairs});
        this.job = beginCleanup(this.world, pairs.flat()); this.jobMeta = {kind: 'annihilation_cleanup'};
        this.afterTopology = 'resolve'; this.phase = 'topology';
      } else this.phase = 'resolve';
    } else if (this.phase === 'resolve') {
      if (this.resolving >= this.intents.length) { this.phase = 'expire'; return; }
      const i = this.intents[this.resolving++], b = this.world.balls.find(b => b.id === i.ball);
      if (!b) return;
      let passX = false, passY = false;
      for (const t of i.targets) {
        const pass = t.pass && this.world.cells[t.target] === b.owner && !this.world.cannons.some(c => c.cell === t.target);
        if (t.axis === 'x') passX = pass; else passY = pass;
      }
      const sx = Math.sign(b.vx), sy = Math.sign(b.vy); let vertexBlocked = false;
      if (i.x && i.y && passX && passY) {
        const diagonal = b.cell + sx + sy * this.world.width;
        if (this.world.cells[diagonal] !== b.owner || this.world.cannons.some(c => c.cell === diagonal)) {
          passX = false; passY = false; vertexBlocked = true;
        }
      }
      const xy = position(b, this.world.time);
      if (i.x && !passX) reflected(b, 'x', i.xwall);
      if (i.y && !passY) reflected(b, 'y', i.ywall);
      const oldCell = b.cell; b.cell += (passX ? sx : 0) + (passY ? sy * this.world.width : 0);
      this.emit({kind: 'motion', ball: b.id, from_cell: oldCell, ball_state: structuredClone(b), vertex_blocked: vertexBlocked});
      const t = i.attack;
      const attack = !vertexBlocked && t && !this.claimed.includes(t.target)
        && this.world.cells[t.target] === t.defender && !this.world.cannons.some(c => c.cell === t.target)
        && !this.world.pending.some(p => p.ball === b.id) ? t : null;
      if (attack && attack.defender) {
        if (this.world.next_strike_id >= 4294967295) throw new Error('strike ID exhausted');
        const p = {id: this.world.next_strike_id++, from: oldCell, to: attack.target, axis: attack.axis,
          ball: b.id, owner: b.owner, defender: attack.defender, born: this.world.time,
          deadline: add(this.world.time, TEST_CONFIG.annihilation_time_window), position: xy[attack.axis === 'x' ? 1 : 0]};
        this.world.pending.push(p); this.emit({kind: 'strike_armed', strike: cloneCanonical(p)});
      } else if (attack) {
        this.claimed.push(attack.target);
        this.job = beginCapture(this.world, attack.target, b.owner, this.fastTopology);
        this.jobMeta = {kind: 'capture', attacker: b.owner, ball: b.id, target: attack.target};
        this.afterTopology = 'resolve'; this.phase = 'topology';
      }
    } else if (this.phase === 'expire') {
      const due = this.world.pending.filter(p => cmp(p.deadline, this.world.time) <= 0)
        .sort((a, b) => a.owner - b.owner || a.ball - b.ball || a.id - b.id);
      if (!due.length) { validateWorld(this.world); this.restartSearch(); return; }
      const p = due[0]; this.world.pending = this.world.pending.filter(s => s.id !== p.id);
      if (validStrike(this.world, p)) {
        this.job = beginCapture(this.world, p.to, p.owner, this.fastTopology);
        this.jobMeta = {kind: 'capture', attacker: p.owner, ball: p.ball, target: p.to, strike: p.id};
        this.afterTopology = 'expire'; this.phase = 'topology';
      } else this.emit({kind: 'strike_cancelled', strike: p.id, reason: 'INVALIDATED'});
    } else if (this.phase === 'topology') {
      if (topologyStep(this.world, this.job)) {
        this.emit({...this.jobMeta, cells: [...this.job.cells].sort((a, b) => a - b),
          destroyed_balls: this.job.killed, eliminated_cannons: this.job.eliminated});
        this.areaDirty = true; this.job = null; this.jobMeta = null; this.phase = this.afterTopology;
      }
    } else if (this.phase !== 'done') throw new Error('unknown BTZ cursor phase');
  }
  step(budget) {
    if (!Number.isInteger(budget) || budget < 1 || budget > 1000000) throw new Error('BTZ work budget');
    let used = 0;
    while (this.phase !== 'done' && used < budget) { this.work(); used++; }
    return {used, complete: this.phase === 'done'};
  }
  result() {
    if (this.phase !== 'done') throw new Error('incomplete BTZ segment');
    const scores = this.world.credits.map(s => ({account: s.account,
      units: sub(s.units, this.initialCredits.find(p => p.account === s.account)?.units ?? rat(0))}));
    return {state: encodeWorld(this.world), events: encodeCanonical({version: 3, receipts: this.receipts, events: this.events}),
      scores: encodeCanonical({version: 3, area_time: scores})};
  }
  snapshot() { return encodeCanonical({version: 3, cursor: {...this}}); }
  static restore(bytes, trustedHash) {
    if (sha256(bytes) !== trustedHash) throw new Error('BTZ snapshot integrity');
    const p = decodeCanonical(bytes);
    if (p.version !== 3 || !p.cursor || !['commands','spawn','search','area','batch','resolve','expire','topology','done'].includes(p.cursor.phase))
      throw new Error('BTZ cursor schema');
    const c = Object.assign(Object.create(BtzCursor.prototype), p.cursor);
    validRat(c.world.time); validRat(c.start); validRat(c.end);
    if (cmp(c.world.time, c.start) < 0 || cmp(c.world.time, c.end) > 0 || c.inputIndex > c.inputs.length
        || c.inputIndex < 0 || c.receipts.length !== c.inputIndex || c.world.cells.length > LIMITS.max_cells
        || c.events.length > 131072 || c.world.balls.length > LIMITS.max_balls || c.intents.length > LIMITS.max_balls
        || c.world.pending.length > LIMITS.max_balls || (c.spawnJob && c.spawnJob.candidates.length > 5 * LIMITS.max_cells))
      throw new Error('BTZ cursor bounds');
    if (['done','commands','spawn','search','area'].includes(c.phase)) validateWorld(c.world);
    // The expected hash is a trusted durable commitment, never an untrusted caller's self-supplied checksum.
    return c;
  }
}
export const BtzKernel = {begin: (s, i, c) => new BtzCursor(s, i, c), restore: BtzCursor.restore,
  fork: cursor => Object.assign(Object.create(BtzCursor.prototype), structuredClone({...cursor}))};
