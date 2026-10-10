/** Small-board authoritative reference slice. No canister calls, timers, floats or browser authority. */
import {ascii, be, concat, hex, Reader, unhex, uint} from '../../protocol/bytes.mjs';
import {decodeMemo, encodeMemo} from '../../protocol/memo.mjs';
import {cloneCanonical, decodeCanonical, encodeCanonical} from '../../runtime/canonical.mjs';
import {sha256} from '../../runtime/seal.mjs';
import {add, cmp, heading, mulInt, rat, sub, validRat} from './math.mjs';
import {BTZ_IDENTITY, decodeWorld, encodeWorld, LIMITS, position, Q, TEST_CONFIG, validateWorld} from './world.mjs';
import {nextCrossing, reflected} from './geometry.mjs';
import {beginCapture, beginCleanup, topologyStep} from './topology.mjs';

/** Synthetic normalized adapter envelope. This is NOT an ICP ledger block or authenticated receipt. */
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
function classify(world, ball, crossing) {
  const cx = ball.cell % world.width, cy = Math.floor(ball.cell / world.width);
  const targets = [];
  for (const axis of ['x', 'y']) if (crossing[axis]) {
    const x = cx + (axis === 'x' ? Math.sign(ball.vx) : 0), y = cy + (axis === 'y' ? Math.sign(ball.vy) : 0);
    const target = x < 0 || y < 0 || x >= world.width || y >= world.height ? null : y * world.width + x;
    const cannon = target !== null && world.cannons.some(c => c.cell === target);
    const pass = target !== null && world.cells[target] === ball.owner && !cannon;
    targets.push({axis, target, pass, capturable: target !== null && !cannon && world.cells[target] !== ball.owner,
      defender: target === null ? 0 : world.cells[target]});
  }
  return {...crossing, owner: ball.owner, cell: ball.cell, targets};
}
function pairsFor(world, intents) {
  const edges = [];
  for (const i of intents) {
    const b = world.balls.find(b => b.id === i.ball), xy = position(b, world.time);
    for (const t of i.targets) if (t.capturable && t.defender) {
      const lo = Math.min(i.cell, t.target), hi = Math.max(i.cell, t.target);
      edges.push({lo, hi, from: i.cell, to: t.target, ball: i.ball, owner: i.owner, defender: t.defender,
        position: xy[t.axis === 'x' ? 1 : 0]});
    }
  }
  edges.sort((a, b) => a.lo - b.lo || a.hi - b.hi || a.ball - b.ball);
  const used = new Set(), pairs = [];
  for (let i = 0; i < edges.length; i++) {
    const a = edges[i]; if (used.has(a.ball)) continue;
    for (let j = i + 1; j < edges.length; j++) {
      const b = edges[j]; if (a.lo !== b.lo || a.hi !== b.hi || used.has(b.ball) || a.ball === b.ball) continue;
      const distance = sub(a.position, b.position);
      if (a.from === b.to && a.to === b.from && a.owner === b.defender && b.owner === a.defender
          && (distance[0] < 0n ? -distance[0] : distance[0]) <= BigInt(TEST_CONFIG.annihilation_distance) * distance[1]) {
        used.add(a.ball); used.add(b.ball); pairs.push([a.ball, b.ball]); break;
      }
    }
  }
  return pairs;
}
function mutation(world, payment, moved) {
  if (world.received_e8s + payment.amount >= (1n << 128n)) throw new Error('treasury counter overflow');
  world.received_e8s += payment.amount;
  let command;
  try { command = decodeMemo(payment.memo); } catch { return {reason: 'MALFORMED_MEMO'}; }
  const cannon = world.cannons.find(c => c.account === payment.account);
  if (!cannon) return {reason: 'JOIN_NOT_IMPLEMENTED_IN_S02'};
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
  if (world.time[1] !== 1n) throw new Error('commands require integer checkpoint');
  const [vx, vy] = heading(command.value), x = (cannon.cell % world.width) * Q + Q / 2,
    y = Math.floor(cannon.cell / world.width) * Q + Q / 2;
  const b = {id: world.next_ball_id++, owner: cannon.id, cell: cannon.cell,
    x0: BigInt(x) - BigInt(vx) * world.time[0], y0: BigInt(y) - BigInt(vy) * world.time[0], vx, vy};
  world.balls.push(b);
  return {reason: 'ACCEPTED', kind: 'ball_spawned', cannon: cannon.id, ball: cloneCanonical(b)};
}

export class BtzCursor {
  constructor(state, inputs, seal) {
    for (const k of Object.keys(BTZ_IDENTITY)) if (seal[k] !== BTZ_IDENTITY[k]) throw new Error('BTZ rule/config/schema identity');
    this.world = decodeWorld(state); this.inputs = cloneCanonical(inputs); this.inputIndex = 0; this.moved = [];
    this.start = rat(uint(seal.logical_start)); this.end = rat(uint(seal.logical_end));
    if (cmp(this.world.time, this.start) !== 0 || cmp(this.end, this.start) <= 0
        || cmp(sub(this.end, this.start), rat(LIMITS.max_segment_ticks)) > 0
        || cmp(this.end, rat(1000000000)) > 0 || inputs.length > 4096) throw new Error('BTZ segment context');
    this.initialCredits = cloneCanonical(this.world.credits);
    this.phase = 'commands'; this.events = []; this.receipts = [];
    this.scan = 0; this.candidates = []; this.intents = []; this.nextTime = this.start;
    this.areas = []; this.resolving = 0; this.claimed = []; this.job = null; this.jobMeta = null;
  }
  emit(event) {
    if (this.events.length >= 131072) throw new Error('small-board event capacity');
    this.events.push({sequence: this.events.length, time: this.world.time, ...cloneCanonical(event)});
  }
  restartSearch() {
    this.phase = 'search'; this.scan = 0; this.candidates = []; this.intents = [];
    this.claimed = []; this.resolving = 0; this.job = null; this.jobMeta = null;
  }
  work() {
    if (this.phase === 'commands') {
      if (this.inputIndex < this.inputs.length) {
        const i = this.inputs[this.inputIndex++], payment = readPayment(i.payload_hex);
        const outcome = mutation(this.world, payment, this.moved);
        this.receipts.push({position: uint(i.position), account: payment.account, amount: payment.amount, ...outcome});
        if (outcome.reason === 'ACCEPTED') this.emit(outcome);
      } else this.restartSearch();
    } else if (this.phase === 'search') {
      if (this.scan < this.world.balls.length) {
        const crossing = nextCrossing(this.world.balls[this.scan++], this.world.width, this.world.time);
        // Segments are half-open: an impact exactly at end belongs to the next segment, after its commands.
        if (cmp(crossing.time, this.end) < 0) this.candidates.push(crossing);
      } else {
        this.nextTime = this.candidates.reduce((t, c) => cmp(c.time, t) < 0 ? c.time : t, this.end);
        this.candidates = this.candidates.filter(c => cmp(c.time, this.nextTime) === 0);
        this.areas = this.world.cannons.map(c => [c.id, 0]); this.scan = 0; this.phase = 'area';
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
        this.world.credits.sort((a,b) => a.account < b.account ? -1 : a.account > b.account ? 1 : 0);
        this.world.time = this.nextTime;
        if (!this.candidates.length) { validateWorld(this.world); this.phase = 'done'; }
        else this.phase = 'batch';
      }
    } else if (this.phase === 'batch') {
      this.intents = this.candidates.map(c => classify(this.world, this.world.balls.find(b => b.id === c.ball), c))
        .sort((a, b) => a.owner - b.owner || a.ball - b.ball);
      const pairs = pairsFor(this.world, this.intents);
      if (pairs.length) {
        this.emit({kind: 'annihilation', pairs});
        this.job = beginCleanup(this.world, pairs.flat()); this.jobMeta = {kind: 'annihilation_cleanup'};
        this.phase = 'topology';
      } else this.phase = 'resolve';
    } else if (this.phase === 'resolve') {
      if (this.resolving >= this.intents.length) { validateWorld(this.world); this.restartSearch(); return; }
      const i = this.intents[this.resolving++], b = this.world.balls.find(b => b.id === i.ball);
      if (!b) return; // An older simultaneous attack may have destroyed this ball already.
      let passX = false, passY = false;
      for (const t of i.targets) {
        const pass = t.pass && this.world.cells[t.target] === b.owner && !this.world.cannons.some(c => c.cell === t.target);
        if (t.axis === 'x') passX = pass; else passY = pass;
      }
      const sx = Math.sign(b.vx), sy = Math.sign(b.vy);
      let vertexBlocked = false;
      if (i.x && i.y && passX && passY) {
        const diagonal = b.cell + sx + sy * this.world.width;
        if (this.world.cells[diagonal] !== b.owner || this.world.cannons.some(c => c.cell === diagonal)) {
          passX = false; passY = false; vertexBlocked = true;
        }
      }
      if (i.x && !passX) reflected(b, 'x', i.xwall);
      if (i.y && !passY) reflected(b, 'y', i.ywall);
      const oldCell = b.cell; b.cell += (passX ? sx : 0) + (passY ? sy * this.world.width : 0);
      this.emit({kind: 'motion', ball: b.id, from_cell: oldCell, ball_state: cloneCanonical(b), vertex_blocked: vertexBlocked});
      // At most ONE target per ball at a compound corner. Row-major selects between eligible targets.
      const attack = vertexBlocked ? null : i.targets.filter(t => t.capturable && !this.claimed.includes(t.target)
        && this.world.cells[t.target] !== b.owner && !this.world.cannons.some(c => c.cell === t.target))
        .sort((a, b) => a.target - b.target)[0];
      if (attack) {
        this.claimed.push(attack.target);
        this.job = beginCapture(this.world, attack.target, b.owner);
        this.jobMeta = {kind: 'capture', attacker: b.owner, ball: b.id, target: attack.target}; this.phase = 'topology';
      }
    } else if (this.phase === 'topology') {
      if (topologyStep(this.world, this.job)) {
        this.emit({...this.jobMeta, cells: [...this.job.cells].sort((a,b)=>a-b),
          destroyed_balls: this.job.killed, eliminated_cannons: this.job.eliminated});
        this.job = null; this.jobMeta = null; this.phase = 'resolve';
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
    return {state: encodeWorld(this.world), events: encodeCanonical({version: 2, receipts: this.receipts, events: this.events}),
      scores: encodeCanonical({version: 2, area_time: scores})};
  }
  snapshot() { return encodeCanonical({version: 2, cursor: {...this}}); }
  static restore(bytes, trustedHash) {
    if (sha256(bytes) !== trustedHash) throw new Error('BTZ snapshot integrity');
    const p = decodeCanonical(bytes);
    if (p.version !== 2 || !p.cursor || !['commands','search','area','batch','resolve','topology','done'].includes(p.cursor.phase))
      throw new Error('BTZ cursor schema');
    const c = Object.assign(Object.create(BtzCursor.prototype), p.cursor);
    validRat(c.world.time); validRat(c.start); validRat(c.end);
    if (cmp(c.world.time, c.start) < 0 || cmp(c.world.time, c.end) > 0 || c.inputIndex > c.inputs.length
        || c.inputIndex < 0 || c.receipts.length !== c.inputIndex || c.world.cells.length > LIMITS.max_cells
        || c.events.length > 131072 || c.world.balls.length > LIMITS.max_balls || c.intents.length > LIMITS.max_balls)
      throw new Error('BTZ cursor bounds');
    if (c.phase === 'done' || c.phase === 'commands' || c.phase === 'search' || c.phase === 'area') validateWorld(c.world);
    // A restored hash must come from the trusted durable record; arbitrary rehashed scratch is NOT accepted as truth.
    return c;
  }
}
export const BtzKernel = {begin: (s, i, c) => new BtzCursor(s, i, c), restore: BtzCursor.restore};
