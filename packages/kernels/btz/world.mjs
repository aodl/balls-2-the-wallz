import {PRICING,LEGACY_JOIN_E8S,LEGACY_BALL_BASE_E8S,LEGACY_MOVE_E8S} from './economics.generated.mjs';
import {cloneCanonical, decodeCanonical, encodeCanonical} from '../../../node_modules/@dtr/timeline-runtime/packages/runtime/canonical.mjs';
import {sha256} from '../../../node_modules/@dtr/timeline-runtime/packages/runtime/seal.mjs';
import {cmp, rat, validRat} from './math.mjs';
export const Q = 1024;
export const LIMITS = Object.freeze({max_cells: 1024, max_width: 32, max_balls: 64, max_cannons: 32, max_per_cannon: 32, max_segment_ticks: 64});
export const TEST_CONFIG = Object.freeze({version: 3, ...LIMITS, speed: 1024, ball_base_e8s: LEGACY_BALL_BASE_E8S,
  move_e8s: LEGACY_MOVE_E8S, annihilation_distance: 64, annihilation_time_window: [1n, 16n], join_e8s: LEGACY_JOIN_E8S, max_spawn_searches_per_segment: 8});
export const BTZ_IDENTITY = Object.freeze({rules_hash: sha256(new TextEncoder().encode('BTZ_SMALL_BOARD_RULES_03')),
  config_hash: sha256(encodeCanonical(TEST_CONFIG)), schema_hash: sha256(new TextEncoder().encode('BTZ_STATE_03_TYPED_JSON'))});
// Historical TEST_CONFIG/BTZ_IDENTITY retain byte-for-byte S03–S14 fixtures.
export const PRELAUNCH_CONFIG=Object.freeze({...TEST_CONFIG,...PRICING});
export const PRELAUNCH_IDENTITY=Object.freeze({...BTZ_IDENTITY,config_hash:sha256(encodeCanonical(PRELAUNCH_CONFIG))});
function integer(n, low, high, label) {
  if (!Number.isSafeInteger(n) || n < low || n > high) throw new Error(label);
}
export function neighbors(cell, width, height) {
  const x = cell % width, y = Math.floor(cell / width), out = [];
  if (y) out.push(cell - width);
  if (x) out.push(cell - 1);
  if (x + 1 < width) out.push(cell + 1);
  if (y + 1 < height) out.push(cell + width);
  return out;
}
export function position(ball, time) {
  return [rat(ball.x0 * time[1] + BigInt(ball.vx) * time[0], time[1]),
    rat(ball.y0 * time[1] + BigInt(ball.vy) * time[0], time[1])];
}
export function connected(cells, width, height, owner, anchor) {
  if (cells[anchor] !== owner) return false;
  const seen = new Set([anchor]), queue = [anchor];
  for (let i = 0; i < queue.length; i++) for (const n of neighbors(queue[i], width, height))
    if (cells[n] === owner && !seen.has(n)) { seen.add(n); queue.push(n); }
  return cells.every((v, i) => v !== owner || seen.has(i));
}
/** Validate fully resolved states only; intermediate capture scratch may deliberately violate connectivity. */
export function validateWorld(w) {
  if (w.version !== 3) throw new Error('BTZ state version');
  integer(w.width, 1, 32, 'width'); integer(w.height, 1, 32, 'height');
  if (w.cells.length !== w.width * w.height || w.cells.length > LIMITS.max_cells) throw new Error('board bounds');
  validRat(w.time);
  if (cmp(w.time, rat(0)) < 0 || cmp(w.time, rat(1000000000)) > 0) throw new Error('time bounds');
  if (w.cannons.length > LIMITS.max_cannons || w.balls.length > LIMITS.max_balls) throw new Error('entity capacity');
  const owners = new Set(), accounts = new Set(), anchors = new Set(); let last = 0;
  for (const c of w.cannons) {
    integer(c.id, last + 1, 65535, 'cannon order'); last = c.id;
    integer(c.cell, 0, w.cells.length - 1, 'anchor');
    if (!/^[0-9a-f]{64}$/.test(c.account) || accounts.has(c.account) || anchors.has(c.cell)) throw new Error('account/anchor identity');
    owners.add(c.id); accounts.add(c.account); anchors.add(c.cell);
    if (!connected(w.cells, w.width, w.height, c.id, c.cell)) throw new Error('territory disconnected');
  }
  for (const owner of w.cells) if (!Number.isInteger(owner) || (owner !== 0 && !owners.has(owner))) throw new Error('unknown cell owner');
  const counts = new Map(); last = 0;
  for (const b of w.balls) {
    integer(b.id, last + 1, 4294967294, 'ball order'); last = b.id;
    integer(b.cell, 0, w.cells.length - 1, 'ball cell');
    integer(b.vx, -4096, 4096, 'vx'); integer(b.vy, -4096, 4096, 'vy');
    if (!b.vx && !b.vy) throw new Error('stationary ball');
    if (!owners.has(b.owner) || w.cells[b.cell] !== b.owner) throw new Error('ball outside owner territory');
    for (const n of [b.x0, b.y0]) if (typeof n !== 'bigint' || n < -100000000000000n || n > 100000000000000n) throw new Error('motion intercept');
    const [x, y] = position(b, w.time), cx = b.cell % w.width, cy = Math.floor(b.cell / w.width);
    if (cmp(x, rat(cx * Q)) < 0 || cmp(x, rat((cx + 1) * Q)) > 0 || cmp(y, rat(cy * Q)) < 0 || cmp(y, rat((cy + 1) * Q)) > 0)
      throw new Error('ball cell/position mismatch');
    counts.set(b.owner, (counts.get(b.owner) ?? 0) + 1);
  }
  for (const c of w.cannons) if (!counts.get(c.id) || counts.get(c.id) > LIMITS.max_per_cannon) throw new Error('cannon ball invariant');
  integer(w.next_ball_id, last + 1, 4294967295, 'next ball ID');
  integer(w.next_cannon_id, Math.max(0, ...w.cannons.map(c => c.id)) + 1, 65536, 'next cannon ID');
  if (!Array.isArray(w.pending) || w.pending.length > w.balls.length) throw new Error('pending strike capacity');
  const armed = new Set(); let priorStrike = 0;
  for (const p of w.pending) {
    integer(p.id, priorStrike + 1, 4294967294, 'strike order'); priorStrike = p.id;
    if (armed.has(p.ball) || !w.balls.some(b => b.id === p.ball && b.owner === p.owner)) throw new Error('pending live ball');
    armed.add(p.ball); integer(p.from, 0, w.cells.length - 1, 'strike origin'); integer(p.to, 0, w.cells.length - 1, 'strike target');
    if (!neighbors(p.from, w.width, w.height).includes(p.to) || p.owner === p.defender || p.defender === 0) throw new Error('strike edge');
    for (const t of [p.born, p.deadline, p.position]) validRat(t);
    if (cmp(p.born, w.time) > 0 || cmp(p.deadline, w.time) < 0 || cmp(p.deadline, p.born) <= 0) throw new Error('strike clock');
    if (p.axis !== 'x' && p.axis !== 'y') throw new Error('strike axis');
  }
  integer(w.next_strike_id, priorStrike + 1, 4294967295, 'next strike ID');
  if (typeof w.received_e8s !== 'bigint' || w.received_e8s < 0n || w.received_e8s >= (1n << 128n)) throw new Error('treasury tally');
  let previous = '';
  for (const s of w.credits) {
    if (!/^[0-9a-f]{64}$/.test(s.account) || s.account <= previous) throw new Error('score account order');
    previous = s.account; validRat(s.units);
    if (s.units[0] < 0n) throw new Error('negative score');
  }
  if (w.credits.length > 1024) throw new Error('credit demonstration limit');
  return w;
}
export function encodeWorld(w) { validateWorld(w); return encodeCanonical(w); }
export function decodeWorld(bytes) { return validateWorld(decodeCanonical(bytes)); }
export function fixtureWorld({width, height, cells, cannons, balls, time = rat(0), credits = []}) {
  const out = {version: 3, width, height, cells: [...cells], cannons: cloneCanonical(cannons), balls: cloneCanonical(balls),
    time, next_cannon_id: Math.max(0, ...cannons.map(c => c.id)) + 1, pending: [], next_strike_id: 1, next_ball_id: Math.max(0, ...balls.map(b => b.id)) + 1, received_e8s: 0n, credits: cloneCanonical(credits)};
  return validateWorld(out);
}
