import {DELEGATION_ADAPTER,DELEGATION_LIFETIME_NS} from '../../protocol/delegation.mjs';
import {emptyAuthorization,validateAuthorization} from './delegation-v18.mjs';
import {ECONOMY_ADAPTER,ECONOMY_PAYMENT} from '../../protocol/economy17.mjs';
import {BALL_BASE_E8S,CANNON_BASE_E8S,DIVERTER_BASE_E8S,RESERVOIR_PRICE_E8S as ECONOMY_RESERVOIR_PRICE,FIXED_ACTION_E8S,DAY_NS,GRACE_NS} from '../../protocol/economy17.generated.mjs';
import {validateEconomy} from './economy17.mjs';
import {RESERVOIR_ADAPTER,RESERVOIR_PRICE_E8S} from '../../protocol/reservoir.mjs';
import {validateReservoirs,migrateReservoirEncoding,MAX_COMPACT_RANGES} from '../../protocol/reservoir.mjs';
import {STRUCTURE_MIN_DISTANCE} from '../../protocol/structure-sites.mjs';
import {CONTEXT_POLICY} from '../../protocol/context-structures.generated.mjs';
import {CLEARANCE_POLICY} from './clearance.generated.mjs';
import {COMBINED_POLICY} from './combined.generated.mjs';
import {DEFLECTOR_POLICY} from './deflector.generated.mjs';
import {validateDeflectorState,validateDeflectorBall,deflectorAt} from './deflectors-v12.mjs';
import {ENTRY_POLICY} from './entry.generated.mjs';
import{territoryPlayer,territoryBalls,territoryForCannon}from'./territory-v6.mjs';
import {PRICING,LEGACY_JOIN_E8S,LEGACY_BALL_BASE_E8S,LEGACY_MOVE_E8S} from './economics.generated.mjs';
import {cloneCanonical, decodeCanonical, encodeCanonical} from '../../../node_modules/@dtr/timeline-runtime/packages/runtime/canonical.mjs';
import {sha256} from '../../../node_modules/@dtr/timeline-runtime/packages/runtime/seal.mjs';
import {cmp, rat, validRat} from './math.mjs';
import {V6_POLICY} from './playability.generated.mjs';
import {playerForCannon,validatePlayability} from './playability.mjs';
export const Q = 1024;
export const LIMITS = Object.freeze({max_cells: 1024, max_width: 32, max_balls: 64, max_cannons: 32, max_per_cannon: 32, max_segment_ticks: 64});
export const TEST_CONFIG = Object.freeze({version: 3, ...LIMITS, speed: 1024, ball_base_e8s: LEGACY_BALL_BASE_E8S,
  move_e8s: LEGACY_MOVE_E8S, annihilation_distance: 64, annihilation_time_window: [1n, 16n], join_e8s: LEGACY_JOIN_E8S, max_spawn_searches_per_segment: 8});
export const B2Z_IDENTITY = Object.freeze({rules_hash: sha256(new TextEncoder().encode('BTZ_SMALL_BOARD_RULES_03')),
  config_hash: sha256(encodeCanonical(TEST_CONFIG)), schema_hash: sha256(new TextEncoder().encode('BTZ_STATE_03_TYPED_JSON'))});
// Historical TEST_CONFIG/B2Z_IDENTITY retain byte-for-byte S03–S14 fixtures.
export const PRELAUNCH_CONFIG=Object.freeze({...TEST_CONFIG,...PRICING});
export const PRELAUNCH_IDENTITY=Object.freeze({...B2Z_IDENTITY,config_hash:sha256(encodeCanonical(PRELAUNCH_CONFIG))});
function integer(n, low, high, label) {
  if (!Number.isSafeInteger(n) || n < low || n > high) throw new Error(label);
}
export const TORUS_CONFIG=Object.freeze({...PRELAUNCH_CONFIG,version:4,topology:'torus'});
export const TORUS_IDENTITY=Object.freeze({rules_hash:sha256(new TextEncoder().encode('B2Z_TORUS_RULES_04')),schema_hash:sha256(new TextEncoder().encode('B2Z_STATE_04_TYPED_JSON')),config_hash:sha256(encodeCanonical(TORUS_CONFIG))});
export const MILLION_CONFIG=Object.freeze({version:5,topology:'torus',width:1000,height:1000,ownership:'scaled32-v1',score_area_numerator:1024,score_area_denominator:1000000,max_balls:64,max_cannons:32,max_per_cannon:32,max_segment_ticks:64,speed:32000,ball_base_e8s:PRICING.ball_base_e8s,move_e8s:PRICING.move_e8s,annihilation_distance:64,annihilation_time_window:[1n,16n],join_e8s:PRICING.join_e8s,max_spawn_searches_per_segment:8});
export const MILLION_IDENTITY=Object.freeze({rules_hash:sha256(new TextEncoder().encode('B2Z_MILLION_TORUS_RULES_05')),schema_hash:sha256(new TextEncoder().encode('B2Z_STATE_05_SCALED_OWNERSHIP')),config_hash:sha256(encodeCanonical(MILLION_CONFIG))});
const {max_per_cannon:_historicalCannonLimit,...ISLAND_BASE_CONFIG}=MILLION_CONFIG;
export const PLAYABILITY_CONFIG=Object.freeze({...ISLAND_BASE_CONFIG,...V6_POLICY,memo_adapter_version:4,lifecycle_input_version:1,max_purchase_quantity:64,move_limit_per_cannon_segment:1,
  player_identity:'authenticated-funding-account',ball_ownership:'funding-player',cannon_activity:'connected-island-ball-pool',ball_price:'island-pool-floor-1-square',cannon_price:'retained-plus-1-square',dormancy_clock:'consensus-observed-ns-1',capture_resolution:'pair-and-cancel-1'});
export const PLAYABILITY_IDENTITY=Object.freeze({rules_hash:sha256(new TextEncoder().encode('B2Z_PLAYABILITY_RULES_06')),schema_hash:sha256(new TextEncoder().encode('B2Z_STATE_06_PLAYERS_LIFECYCLE')),config_hash:sha256(encodeCanonical(PLAYABILITY_CONFIG))});
// Rules 7 preserve world-schema 6, memo 4, existing economics and event format.
export const ENTRY_CONFIG=Object.freeze({...PLAYABILITY_CONFIG,...ENTRY_POLICY});
export const ENTRY_IDENTITY=Object.freeze({...PLAYABILITY_IDENTITY,rules_hash:sha256(new TextEncoder().encode('B2Z_ENTRY_RULES_07')),config_hash:sha256(encodeCanonical(ENTRY_CONFIG))});
// v8 is reserved for experimental delegated payments; no activation is implicit.
export const CLEARANCE_CONFIG=Object.freeze({...ENTRY_CONFIG,...CLEARANCE_POLICY});
export const CLEARANCE_IDENTITY=Object.freeze({...ENTRY_IDENTITY,rules_hash:sha256(new TextEncoder().encode('B2Z_TERRITORY_CLEARANCE_RULES_09')),config_hash:sha256(encodeCanonical(CLEARANCE_CONFIG))});
// Annotation successor uses Rules7 admission, not Rules9 clearance or delegated authority.
export const WAR_CRY_CONFIG=Object.freeze({...ENTRY_CONFIG,rules_version:10,memo_adapter_version:6,war_cry_capability:'btz-war-cry-1',war_cry_memo_limit:32,normalized_payment:'BTZPAY03',spawn_seed_projection:'gameplay-semantic-1'});
export const WAR_CRY_IDENTITY=Object.freeze({...ENTRY_IDENTITY,rules_hash:sha256(new TextEncoder().encode('B2Z_WAR_CRY_RULES_10')),config_hash:sha256(encodeCanonical(WAR_CRY_CONFIG))});
// Rules11 compose clearance and authenticated annotations; prior identities stay immutable.
export const COMBINED_CONFIG=Object.freeze({...ENTRY_CONFIG,...COMBINED_POLICY});
export const COMBINED_IDENTITY=Object.freeze({...ENTRY_IDENTITY,rules_hash:sha256(new TextEncoder().encode('B2Z_CLEARANCE_WAR_CRY_RULES_11')),config_hash:sha256(encodeCanonical(COMBINED_CONFIG))});
export const DEFLECTOR_CONFIG=Object.freeze({...COMBINED_CONFIG,...DEFLECTOR_POLICY,version:7});
export const DEFLECTOR_IDENTITY=Object.freeze({rules_hash:sha256(new TextEncoder().encode('B2Z_BOUNDARY_DEFLECTOR_RULES_12')),schema_hash:sha256(new TextEncoder().encode('B2Z_STATE_07_BOUNDED_DIAGONAL_DEFLECTORS')),config_hash:sha256(encodeCanonical(DEFLECTOR_CONFIG))});
// Rules13 retains schema7, while configuration gates new commands and pricing.
export const CONTEXT_CONFIG=Object.freeze({...DEFLECTOR_CONFIG,...CONTEXT_POLICY});
export const CONTEXT_IDENTITY=Object.freeze({...DEFLECTOR_IDENTITY,rules_hash:sha256(new TextEncoder().encode('B2Z_CONTEXT_STRUCTURES_RULES_13')),config_hash:sha256(encodeCanonical(CONTEXT_CONFIG))});
export const SHOUT_CONFIG=Object.freeze({...CONTEXT_CONFIG,rules_version:14,memo_adapter_version:9,normalized_payment:'BTZPAY06',shout_capability:'btz-successful-action-shout-1'});
export const SHOUT_IDENTITY=Object.freeze({...CONTEXT_IDENTITY,rules_hash:sha256(new TextEncoder().encode('B2Z_ACTION_SHOUT_RULES_14')),config_hash:sha256(encodeCanonical(SHOUT_CONFIG))});
// Rules15 keeps the world and memo encoding while replacing the purchase-site policy.
const {friendly_structure_max_chebyshev: _historicalRadius, ...spacingBase}=SHOUT_CONFIG;
export const SPACING_CONFIG=Object.freeze({...spacingBase,rules_version:15,deflector_min_chebyshev:STRUCTURE_MIN_DISTANCE,structure_min_chebyshev:STRUCTURE_MIN_DISTANCE});
export const SPACING_IDENTITY=Object.freeze({...SHOUT_IDENTITY,rules_hash:sha256(new TextEncoder().encode('B2Z_STRUCTURE_SPACING_RULES_15')),config_hash:sha256(encodeCanonical(SPACING_CONFIG))});
export const RESERVOIR_CONFIG=Object.freeze({...SPACING_CONFIG,version:8,rules_version:16,
  memo_adapter_version:RESERVOIR_ADAPTER,normalized_payment:'BTZPAY07',reservoir_price_e8s:RESERVOIR_PRICE_E8S,
  reservoir_terrain:'inert-excavation-1'});
export const RESERVOIR_IDENTITY=Object.freeze({rules_hash:sha256(new TextEncoder().encode('B2Z_RESERVOIR_RULES_16')),
 schema_hash:sha256(new TextEncoder().encode('B2Z_STATE_08_RESERVOIR_TERRAIN')),config_hash:sha256(encodeCanonical(RESERVOIR_CONFIG))});
const {
  max_balls:_oldBallLimit,max_cannons:_oldCannonLimit,max_players:_oldPlayerLimit,
  max_purchase_balls_per_island:_oldIslandLimit,max_retained_per_player:_oldRetainedLimit,
  max_deflectors:_oldDiverterLimit,max_deflectors_per_player:_oldPersonalDiverterLimit,
  ...economyBase
}=RESERVOIR_CONFIG;
export const ECONOMY_CONFIG=Object.freeze({
  ...economyBase,version:9,rules_version:17,memo_adapter_version:ECONOMY_ADAPTER,normalized_payment:ECONOMY_PAYMENT,
  join_e8s:CANNON_BASE_E8S,ball_base_e8s:BALL_BASE_E8S,deflector_price_e8s:DIVERTER_BASE_E8S,
  reservoir_price_e8s:ECONOMY_RESERVOIR_PRICE,move_e8s:FIXED_ACTION_E8S,
  deflector_move_e8s:FIXED_ACTION_E8S.toString(),deflector_reorient_e8s:FIXED_ACTION_E8S.toString(),
  ball_price:'player-inventory-plus-1-square',price_schedule:'utc-committed-population-1',price_day_ns:DAY_NS,price_grace_ns:GRACE_NS,
});
export const ECONOMY_IDENTITY=Object.freeze({
  rules_hash:sha256(new TextEncoder().encode('B2Z_DAILY_ECONOMY_RULES_17')),
  schema_hash:sha256(new TextEncoder().encode('B2Z_STATE_09_DAILY_TARIFFS')),
  config_hash:sha256(encodeCanonical(ECONOMY_CONFIG)),
});
export const DELEGATED_CONFIG=Object.freeze({
  ...ECONOMY_CONFIG,version:10,rules_version:18,memo_adapter_version:DELEGATION_ADAPTER,
  normalized_payment:'BTZPAY09',delegation_capability:'ordered-owner-grant-2',delegation_lifetime_ns:DELEGATION_LIFETIME_NS,
});
export const DELEGATED_IDENTITY=Object.freeze({
  rules_hash:sha256(new TextEncoder().encode('B2Z_DELEGATED_PAYMENT_RULES_18')),
  schema_hash:sha256(new TextEncoder().encode('B2Z_STATE_10_ORDERED_AUTHORIZATION')),
  config_hash:sha256(encodeCanonical(DELEGATED_CONFIG)),
});

export const COMPACT_RESERVOIR_CONFIG=Object.freeze({
  ...DELEGATED_CONFIG,version:11,rules_version:19,reservoir_encoding:'canonical-ranges-or-dense-1',
  reservoir_max_compact_ranges:MAX_COMPACT_RANGES,
});
export const COMPACT_RESERVOIR_IDENTITY=Object.freeze({
  rules_hash:sha256(new TextEncoder().encode('B2Z_COMPACT_RESERVOIR_RULES_19')),
  schema_hash:sha256(new TextEncoder().encode('B2Z_STATE_11_CANONICAL_RESERVOIR_RANGES')),
  config_hash:sha256(encodeCanonical(COMPACT_RESERVOIR_CONFIG)),
});
export function migrateCompactReservoirs(predecessor) {
  if(predecessor.version!==10)throw Error('RESERVOIR_COMPACT_PREDECESSOR');
  return validateWorld(migrateReservoirEncoding(cloneCanonical(validateWorld(predecessor))));
}

/** Exact predecessor migration. Only the authenticated transition may call this in production. */
export function migrateDelegation(predecessor,recipient) {
  if(predecessor.version!==9)throw Error('EXPECTED_ECONOMY_PREDECESSOR');
  const next=cloneCanonical(validateWorld(predecessor));
  next.version=10;
  next.authorization=emptyAuthorization(recipient);
  return validateWorld(next);
}
export const wrapCell=(x,y,w,h)=>((y%h+h)%h)*w+(x%w+w)%w;
export const cellCount=w=>w.width*w.height;
const baseCell=(w,cell)=>{
  const o=w.ownership,x=cell%w.width,y=Math.floor(cell/w.width);
  return Math.floor(y*o.source_height/w.height)*o.source_width+Math.floor(x*o.source_width/w.width);
};
export function ownerAt(w,cell) {
  if(!Number.isSafeInteger(cell)||cell<0||cell>=cellCount(w))return undefined;
  if(w.version<5)return w.cells[cell];
  let low=0,high=w.ownership.overrides.length;
  while(low<high){const mid=(low+high)>>1;if(w.ownership.overrides[mid].start<=cell)low=mid+1;else high=mid;}
  return low&&cell<w.ownership.overrides[low-1].end?w.ownership.overrides[low-1].owner:w.ownership.base[baseCell(w,cell)];
}
export function playerAt(w,cell){const id=ownerAt(w,cell);return w.version>=6?territoryPlayer(w,id):id;}
export function territoryBallCount(w,cannon){const id=territoryForCannon(w,cannon);return id===undefined?0:territoryBalls(w,id);}
function adjustCount(counts,owner,delta){
  if(!owner)return;
  const at=counts.findIndex(c=>c.owner>=owner);
  if(at>=0&&counts[at].owner===owner){const next=counts[at].cells+delta;if(next<0)throw new Error('ownership count');if(next)counts[at].cells=next;else counts.splice(at,1);}
  else if(delta>0)counts.splice(at<0?counts.length:at,0,{owner,cells:delta});
  else throw new Error('ownership count');
}
export function setOwner(w,cell,owner){
  const previous=ownerAt(w,cell);if(previous===undefined)throw new Error('cell bounds');if(previous===owner)return previous;
  if(w.version<5){w.cells[cell]=owner;return previous;}
  setOwnerRange(w,cell,cell+1,previous,owner);return previous;
}
export function setOwnerRange(w,start,end,previous,owner){
  if(w.version<5||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=end||end>cellCount(w))throw new Error('ownership range');
  const o=w.ownership,next=[];
  for(const change of o.overrides){if(change.end<=start||change.start>=end){next.push({...change});continue;}if(change.start<start)next.push({start:change.start,end:start,owner:change.owner});if(change.end>end)next.push({start:end,end:change.end,owner:change.owner});}
  if(end!==start+1||o.base[baseCell(w,start)]!==owner)next.push({start,end,owner});
  next.sort((a,b)=>a.start-b.start);o.overrides=[];
  for(const change of next){const last=o.overrides.at(-1);if(last&&last.end===change.start&&last.owner===change.owner)last.end=change.end;else o.overrides.push(change);}
  const length=end-start;adjustCount(o.counts,previous,-length);adjustCount(o.counts,owner,length);
}
export function clearOwner(w,owner){
  if(!Number.isInteger(owner)||owner<=0)throw new Error('cannot clear neutral owner');
  if(w.version<5){for(let cell=0;cell<w.cells.length;cell++)if(w.cells[cell]===owner)w.cells[cell]=0;return;}
  const o=w.ownership;for(let at=0;at<o.base.length;at++)if(o.base[at]===owner)o.base[at]=0;
  for(const change of o.overrides)if(change.owner===owner)change.owner=0;
  o.counts=o.counts.filter(count=>count.owner!==owner);
}
const sourceSpan=(at,total,source)=>Math.ceil((at+1)*total/source)-Math.ceil(at*total/source);
export function scaledOwnership(base,width=1000,height=1000){
  if(!Array.isArray(base)||base.length!==1024||width!==1000||height!==1000)throw new Error('v5 ownership base');
  const counts=new Map();
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){const owner=base[y*32+x];if(owner)counts.set(owner,(counts.get(owner)??0)+sourceSpan(x,width,32)*sourceSpan(y,height,32));}
  return {format:'scaled32-v1',source_width:32,source_height:32,base:[...base],overrides:[],counts:[...counts].sort((a,b)=>a[0]-b[0]).map(([owner,cells])=>({owner,cells}))};
}
export function ownershipCounts(w){
  if(w.version>=5)return w.ownership.counts.map(c=>[c.owner,c.cells]);
  const counts=new Map();for(const owner of w.cells)if(owner)counts.set(owner,(counts.get(owner)??0)+1);
  return [...counts].sort((a,b)=>a[0]-b[0]);
}
export function neighbors(cell, width, height, torus=false) {
  if(torus){const x=cell%width,y=Math.floor(cell/width);return [wrapCell(x,y-1,width,height),wrapCell(x-1,y,width,height),wrapCell(x+1,y,width,height),wrapCell(x,y+1,width,height)];}
  const x = cell % width, y = Math.floor(cell / width), out = [];
  if (y) out.push(cell - width);
  if (x) out.push(cell - 1);
  if (x + 1 < width) out.push(cell + 1);
  if (y + 1 < height) out.push(cell + width);
  return out;
}
export function position(ball, time) {
  if(ball.den===undefined||ball.den===1n)return [rat(ball.x0*time[1]+BigInt(ball.vx)*time[0],time[1]),rat(ball.y0*time[1]+BigInt(ball.vy)*time[0],time[1])];
  const d=ball.den;
  return [rat(ball.x0 * time[1] + BigInt(ball.vx) * time[0]*d, time[1]*d),
    rat(ball.y0 * time[1] + BigInt(ball.vy) * time[0]*d, time[1]*d)];
}
export function connected(cells, width, height, owner, anchor, torus=false) {
  if (cells[anchor] !== owner) return false;
  const seen = new Set([anchor]), queue = [anchor];
  for (let i = 0; i < queue.length; i++) for (const n of neighbors(queue[i], width, height, torus))
    if (cells[n] === owner && !seen.has(n)) { seen.add(n); queue.push(n); }
  return cells.every((v, i) => v !== owner || seen.has(i));
}
/** Validate fully resolved states only; intermediate capture scratch may deliberately violate connectivity. */
export function validateWorld(w) {
  if (![3,4,5,6,7,8,9,10,11].includes(w.version)) throw new Error('B2Z state version');
  if(w.version===4&&(w.width!==32||w.height!==32))throw new Error('torus dimensions');
  if(w.version>=5&&(w.width!==1000||w.height!==1000))throw new Error('million dimensions');
  if((w.version>=6)!==(w.playability!==undefined))throw new Error('B2Z lifecycle version');
  integer(w.width, 1, 1000, 'width'); integer(w.height, 1, 1000, 'height');
  if(w.version<5){if(!Array.isArray(w.cells)||w.cells.length!==cellCount(w)||w.cells.length>LIMITS.max_cells||w.ownership!==undefined)throw new Error('board bounds');}
  else {
    const o=w.ownership;
    if(w.cells!==undefined||!o||o.format!=='scaled32-v1'||o.source_width!==32||o.source_height!==32||!Array.isArray(o.base)||o.base.length!==1024||!Array.isArray(o.overrides)||!Array.isArray(o.counts)||o.overrides.length>cellCount(w))throw new Error('v5 ownership encoding');
    let prior=0;for(const p of o.overrides){integer(p.start,0,cellCount(w)-1,'override start');integer(p.end,1,cellCount(w),'override end');integer(p.owner,0,w.version>=6?4294967294:65535,'override owner');if(p.start>=p.end||p.start<prior)throw new Error('v5 ownership encoding');prior=p.end;}
    const expected=new Map();for(let y=0;y<32;y++)for(let x=0;x<32;x++){const owner=o.base[y*32+x];integer(owner,0,w.version>=6?4294967294:65535,'base owner');if(owner)expected.set(owner,(expected.get(owner)??0)+sourceSpan(x,w.width,32)*sourceSpan(y,w.height,32));}
    for(const p of o.overrides){let cell=p.start;while(cell<p.end){const x=cell%w.width,y=Math.floor(cell/w.width),sx=Math.floor(x*o.source_width/w.width),sy=Math.floor(y*o.source_height/w.height),xEnd=Math.min(w.width,Math.ceil((sx+1)*w.width/o.source_width)),length=Math.min(xEnd-x,p.end-cell),base=o.base[sy*o.source_width+sx];if(base)expected.set(base,expected.get(base)-length);cell+=length;}if(p.owner)expected.set(p.owner,(expected.get(p.owner)??0)+p.end-p.start);}
    const expectedCounts=[...expected].filter(([,cells])=>cells).sort((a,b)=>a[0]-b[0]).map(([owner,cells])=>({owner,cells}));
    if(o.counts.length!==expectedCounts.length||o.counts.some((c,i)=>c.owner!==expectedCounts[i].owner||c.cells!==expectedCounts[i].cells))throw new Error('v5 ownership counts');
  }
  validRat(w.time);
  if (cmp(w.time, rat(0)) < 0 || cmp(w.time, rat(1000000000)) > 0) throw new Error('time bounds');
  const limits=w.version>=6?V6_POLICY:LIMITS;
  if (w.version<9 && (w.cannons.length > limits.max_cannons || w.balls.length > limits.max_balls)) throw new Error('entity capacity');
  const owners = new Set(), accounts = new Set(), anchors = new Set(); let last = 0;
  for (const c of w.cannons) {
    integer(c.id, last + 1, w.version>=6?4294967294:65535, 'cannon order'); last = c.id;
    if(c.heading!==undefined){if(w.version<4)throw new Error('legacy heading');integer(c.heading,0,65535,'cannon heading');}
    integer(c.cell, 0, cellCount(w) - 1, 'anchor');
    if (!/^[0-9a-f]{64}$/.test(c.account) || w.version<6&&accounts.has(c.account) || anchors.has(c.cell)) throw new Error('account/anchor identity');
    owners.add(w.version>=6?ownerAt(w,c.cell):c.id); accounts.add(c.account); anchors.add(c.cell);
    if (w.version<5&&!connected(w.cells, w.width, w.height, c.id, c.cell,w.version===4)) throw new Error('territory disconnected');
  }
  const represented=w.version>=5?[...w.ownership.base,...w.ownership.overrides.map(p=>p.owner)]:w.cells;
  for (const owner of represented) if (!Number.isInteger(owner) || (owner !== 0 && !owners.has(owner))) throw new Error('unknown cell owner');
  const players=w.version>=6?new Set(w.playability.players.map(p=>p.id)):owners;
  const counts = new Map(); last = 0;
  for (const b of w.balls) {
    integer(b.id, last + 1, 4294967294, 'ball order'); last = b.id;
    integer(b.cell, 0, cellCount(w) - 1, 'ball cell');
    integer(b.vx, -65536, 65536, 'vx'); integer(b.vy, -65536, 65536, 'vy');
    if (!b.vx && !b.vy) throw new Error('stationary ball');
    const player=b.owner;
    if (player===undefined || !players.has(b.owner) || playerAt(w,b.cell) !== player) throw new Error('ball outside owner territory');
    const maxIntercept=w.version>=7?6553600000000000000n:100000000000000n;
    for (const n of [b.x0, b.y0]) if (typeof n !== 'bigint' || n < -maxIntercept || n > maxIntercept) throw new Error('motion intercept');
    if(w.version<7&&(b.den!==undefined||b.deflector_rearm!==undefined))throw Error('historical trajectory extension');
    if(w.version>=7)validateDeflectorBall(b);
    const [x, y] = position(b, w.time), cx = b.cell % w.width, cy = Math.floor(b.cell / w.width);
    if (cmp(x, rat(cx * Q)) < 0 || cmp(x, rat((cx + 1) * Q)) > 0 || cmp(y, rat(cy * Q)) < 0 || cmp(y, rat((cy + 1) * Q)) > 0)
      throw new Error('ball cell/position mismatch');
    counts.set(b.owner, (counts.get(b.owner) ?? 0) + 1);
  }
  for (const c of w.cannons) if (w.version<6&&(!counts.get(c.id) || (counts.get(c.id)??0) > limits.max_per_cannon)) throw new Error('cannon ball invariant');
  integer(w.next_ball_id, last + 1, 4294967295, 'next ball ID');
  integer(w.next_cannon_id, Math.max(0, ...w.cannons.map(c => c.id)) + 1, w.version>=6?4294967295:65536, 'next cannon ID');
  if (!Array.isArray(w.pending) || w.pending.length > w.balls.length) throw new Error('pending strike capacity');
  const armed = new Set(); let priorStrike = 0;
  for (const p of w.pending) {
    integer(p.id, priorStrike + 1, 4294967294, 'strike order'); priorStrike = p.id;
    if (armed.has(p.ball) || !w.balls.some(b => b.id === p.ball && b.owner === p.owner)) throw new Error('pending live ball');
    armed.add(p.ball); integer(p.from, 0, cellCount(w) - 1, 'strike origin'); integer(p.to, 0, cellCount(w) - 1, 'strike target');
    if (!neighbors(p.from, w.width, w.height,w.version>=4).includes(p.to) || p.owner === p.defender || p.defender === 0) throw new Error('strike edge');
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
  if (w.version<9 && w.credits.length > 1024) throw new Error('credit demonstration limit');
  if(w.version>=6)validatePlayability(w);
  if(w.version>=7)validateDeflectorState(w);else if(w.deflectors!==undefined||w.next_deflector_id!==undefined)throw Error('historical structure extension');
  validateReservoirs(w);
  validateEconomy(w);
  if(w.version>=10)validateAuthorization(w.authorization);
  else if(w.authorization!==undefined)throw Error('authorization schema');
  return w;
}
export function encodeWorld(w) { validateWorld(w); return encodeCanonical(w); }
export function decodeWorld(bytes) { return validateWorld(decodeCanonical(bytes)); }
export function fixtureWorld({width, height, cells, cannons, balls, time = rat(0), credits = [], version=3}) {
  const out = {version, width, height, cells: [...cells], cannons: cloneCanonical(cannons), balls: cloneCanonical(balls),
    time, next_cannon_id: Math.max(0, ...cannons.map(c => c.id)) + 1, pending: [], next_strike_id: 1, next_ball_id: Math.max(0, ...balls.map(b => b.id)) + 1, received_e8s: 0n, credits: cloneCanonical(credits)};
  return validateWorld(out);
}

export function validStrike(world, p) {
  return world.balls.some(b => b.id === p.ball && b.owner === p.owner)
    && playerAt(world,p.from) === p.owner && playerAt(world,p.to) === p.defender
    && !world.cannons.some(c => c.cell === p.to)&&!deflectorAt(world,p.to);
}
