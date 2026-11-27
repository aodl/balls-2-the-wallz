import {decodeV6Memo} from '../../protocol/memo-v6.mjs';
import {decodeDelegatedPayment,pricingEnvelope} from '../../protocol/delegation.mjs';
import {authorizePayment} from './delegation-v18.mjs';
import {authorizePaymentV3} from './delegation-v20.mjs';
import {untimedPayment} from '../../protocol/economy17.mjs';
import {participatingPlayers} from './economy17.mjs';
import {ECONOMY_IDENTITY,DELEGATED_IDENTITY,COMPACT_RESERVOIR_IDENTITY,RULES20_IDENTITY} from './world.mjs';
import {readReservoirPayment,semanticReservoirPayment,legacyReservoirBitmap} from '../../protocol/reservoir.mjs';
import {readContextPayment,semanticContextPayment} from '../../protocol/context-structures.mjs';
import {readShoutPayment,semanticShoutPayment} from '../../protocol/shout.mjs';
import {SHOUT_IDENTITY,SPACING_IDENTITY,RESERVOIR_IDENTITY} from './world.mjs';
import{packDeflectorEvent}from'./deflector-events.mjs';
import{readDeflectorPayment,semanticDeflectorPayment}from'../../protocol/deflector.mjs';
import{deflectorAt}from'./deflectors-v12.mjs';
import{contactResponse}from'./deflector-boundary.mjs';
import {readAnnotatedPayment,semanticPayment} from '../../protocol/war-cry.mjs';
import {workV6,captureV6,cleanupV6,finalizeCursorElapsed,validateV6Cursor} from './cursor-v6.mjs';
import {scoreAreas,V6_POLICY,playerForCannon} from './playability.mjs';
/** Version 3 reference. Pure logical-time gameplay; no IC calls or presentation authority. */
import {ascii, be, concat, hex, Reader, unhex, uint} from '../../../node_modules/@dtr/timeline-runtime/packages/protocol/bytes.mjs';
import {decodeMemo, encodeMemo} from '../../protocol/memo.mjs';
import {cloneCanonical, decodeCanonical, encodeCanonical} from '../../../node_modules/@dtr/timeline-runtime/packages/runtime/canonical.mjs';
import {canonicalInputs, sha256} from '../../../node_modules/@dtr/timeline-runtime/packages/runtime/seal.mjs';
import {add, cmp, heading, mulInt, rat, sub, validRat} from './math.mjs';
import {B2Z_IDENTITY, TORUS_IDENTITY, MILLION_IDENTITY, PLAYABILITY_IDENTITY, ENTRY_IDENTITY, CLEARANCE_IDENTITY, WAR_CRY_IDENTITY, COMBINED_IDENTITY, DEFLECTOR_IDENTITY, CONTEXT_IDENTITY, DEFLECTOR_CONFIG, wrapCell, PRELAUNCH_IDENTITY, PRELAUNCH_CONFIG, decodeWorld, encodeWorld, LIMITS, position, Q, TEST_CONFIG, validateWorld, cellCount, ownerAt,playerAt, setOwner, ownershipCounts,validStrike} from './world.mjs';
import {nextCrossing, reflected} from './geometry.mjs';
import {exempts,retireAfterContact,pruneRemoved} from './passage-v20.mjs';
import {beginCapture, beginCleanup, topologyStep} from './topology.mjs';
import {beginSpawn, spawnStep} from './spawn.mjs';

/** Synthetic adapter envelope, NOT an ICP ledger receipt. Wire format unchanged since S02. */
export function encodePayment(account, amount, command) {
  return concat(ascii('BTZPAY02'), unhex(account, 32), be(amount, 8), encodeMemo(command));
}
function readPayment(payload,annotations=false,deflectors=false) {
  if(deflectors===17){
    const {previous,recordedNs}=untimedPayment(unhex(payload));
    return {...readReservoirPayment(previous),recordedNs};
  }
  if(deflectors===16)return readReservoirPayment(unhex(payload));
  if(deflectors===14)return readShoutPayment(unhex(payload));
  if(deflectors===13)return readContextPayment(unhex(payload));
  if(deflectors)return readDeflectorPayment(unhex(payload));
  const bytes=unhex(payload);if(annotations&&bytes.length>=8&&new TextDecoder().decode(bytes.slice(0,8))==='BTZPAY03')return readAnnotatedPayment(bytes);
  const r = new Reader(unhex(payload), 56);
  if (hex(r.take(8)) !== hex(ascii('BTZPAY02'))) throw new Error('unreadable normalized payment');
  const account = hex(r.take(32)), amount = r.integer(8), memo = r.take(8); r.end();
  return {account, amount, memo};
}
export const ballPrice = (active,config=TEST_CONFIG) => {
  if (!Number.isInteger(active) || active < 1 || active > LIMITS.max_per_cannon) throw new Error('price count');
  return config.ball_base_e8s * BigInt(active) ** 2n;
};
export function launch(world, cannon, angle) {
  if (world.time[1] !== 1n) throw new Error('commands require integer checkpoint');
  const [vx, vy] = heading(angle,world.version>=5?32000:1024), x = (cannon.cell % world.width) * Q + Q / 2,
    y = Math.floor(cannon.cell / world.width) * Q + Q / 2;
  const b = {id: world.next_ball_id++, owner: world.version>=6?playerForCannon(world,cannon.id):cannon.id, cell: cannon.cell,
    x0: BigInt(x) - BigInt(vx) * world.time[0], y0: BigInt(y) - BigInt(vy) * world.time[0], vx, vy,...(world.version>=7?{den:1n}:{})};
  if(world.version>=4)cannon.heading=angle;
  world.balls.push(b); return b;
}
function mutation(world, payment, moved, config) {
  if (world.received_e8s + payment.amount >= (1n << 128n)) throw new Error('treasury counter overflow');
  world.received_e8s += payment.amount;
  let command;
  try { command = decodeMemo(payment.memo); } catch { return {reason: 'MALFORMED_MEMO'}; }
  const cannon = world.cannons.find(c => c.account === payment.account);
  if (!cannon) {
    if (command.kind !== 'angle') return {reason: 'NO_CANNON'};
    if (payment.amount < config.join_e8s) return {reason: 'UNDERFUNDED'};
    if (world.cannons.length >= LIMITS.max_cannons) return {reason: 'CANNON_CAPACITY'};
    if (world.next_cannon_id > 65535) return {reason: 'CANNON_ID_EXHAUSTED'};
    if (world.balls.length >= LIMITS.max_balls || world.next_ball_id >= 4294967295) return {reason: 'BALL_CAPACITY'};
    const accounts = new Set([...world.credits.map(s => s.account), ...world.cannons.map(c => c.account)]);
    if (!accounts.has(payment.account) && accounts.size >= 1024) return {reason: 'ACCOUNTING_CAPACITY'};
    return {reason: 'PENDING_SPAWN', angle: command.value};
  }
  if (command.kind === 'move') {
    if (payment.amount < config.move_e8s) return {reason: 'UNDERFUNDED'};
    if (moved.includes(cannon.id)) return {reason: 'MOVE_LIMIT'};
    if (command.value >= cellCount(world) || ownerAt(world,command.value) !== cannon.id) return {reason: 'NOT_OWN_TERRITORY'};
    const before = cannon.cell; cannon.cell = command.value; moved.push(cannon.id);
    return {reason: 'ACCEPTED', kind: 'cannon_moved', cannon: cannon.id, before, after: cannon.cell};
  }
  const count = world.balls.filter(b => b.owner === cannon.id).length;
  if (payment.amount < ballPrice(count,config)) return {reason: 'UNDERFUNDED'};
  if (count >= LIMITS.max_per_cannon || world.balls.length >= LIMITS.max_balls || world.next_ball_id >= 4294967295)
    return {reason: 'BALL_CAPACITY'};
  return {reason: 'ACCEPTED', kind: 'ball_spawned', cannon: cannon.id, ball: cloneCanonical(launch(world, cannon, command.value)),...(world.version>=4?{heading:command.value}:{})};
}
function blocksBall(w,b,cell){
 return w.cannons.some(c=>c.cell===cell&&!exempts(w,b.id,'cannon',c.id,cell))
   ||Boolean((d=>d&&!exempts(w,b.id,'deflector',d.id,cell))(deflectorAt(w,cell)));
}
function solidVertex(world,ball,crossing,targets){
 if(world.version<12||!crossing.x||!crossing.y)return false;
 const x=ball.cell%world.width,y=Math.floor(ball.cell/world.width);
 const diagonal=wrapCell(x+Math.sign(ball.vx),y+Math.sign(ball.vy),world.width,world.height);
 // A real structure at any simultaneously touched cell owns this vertex.
 // Territory bias cannot turn the structure contact into a capture.
 return targets.some(t=>t.target!==null&&blocksBall(world,ball,t.target))||blocksBall(world,ball,diagonal);
}
function cornerPreferredAxis(world,ball,crossing){
 if(!(crossing.x&&crossing.y))return 'x';
 // Canonical source-tile checkerboard; grid y increases down, so x is to
 // the geometric left of a diagonal motion exactly when vx and vy agree.
 const parity=((ball.cell%world.width)+Math.floor(ball.cell/world.width))&1;
 const xIsLeft=Math.sign(ball.vx)===Math.sign(ball.vy);
 return (parity===0)===xIsLeft?'x':'y';
}
export function classify(world, ball, crossing) {
  const player=ball.owner;
  const cx = ball.cell % world.width, cy = Math.floor(ball.cell / world.width), targets = [];
  for (const axis of ['x', 'y']) if (crossing[axis]) {
    const x = cx + (axis === 'x' ? Math.sign(ball.vx) : 0), y = cy + (axis === 'y' ? Math.sign(ball.vy) : 0);
    const target = world.version>=4?wrapCell(x,y,world.width,world.height):x < 0 || y < 0 || x >= world.width || y >= world.height ? null : y * world.width + x;
    const anchor=target!==null&&blocksBall(world,ball,target);
    const defender=target===null?0:playerAt(world,target),pass=target!==null&&defender===player&&!anchor;
    targets.push({axis, target, pass, capturable: target !== null && !anchor && player!==undefined&&defender !== player, defender});
  }
  const sideAttacks=targets.filter(t=>t.capturable);
  const preferred=cornerPreferredAxis(world,ball,crossing);
  let attack=solidVertex(world,ball,crossing,targets)?null:world.version>=12&&crossing.x&&crossing.y&&sideAttacks.length===2
    ?sideAttacks.find(t=>t.axis===preferred)
    :sideAttacks.sort((a,b)=>a.target-b.target)[0]??null;
  if(world.version>=12&&crossing.x&&crossing.y&&!attack&&targets.length===2&&targets.every(t=>t.pass)){
    const diagonal=wrapCell(cx+Math.sign(ball.vx),cy+Math.sign(ball.vy),world.width,world.height);
    const defender=playerAt(world,diagonal);
    if(defender!==player&&!world.cannons.some(c=>c.cell===diagonal)&&!deflectorAt(world,diagonal))
      attack={axis:preferred==='x'?'y':'x',target:diagonal,from:targets.find(t=>t.axis===preferred)?.target,pass:false,capturable:true,defender};
  }
  return {...crossing,...(world.version>=7&&(crossing.x!==crossing.y)?{deflector_target:targets.map(t=>deflectorAt(world,t.target)).find(d=>d&&!exempts(world,ball.id,'deflector',d.id,d.cell))?.id??null}:{}), owner: ball.owner, cell: ball.cell, targets, attack};
}
export function passage(world,b,i){
 const player=b.owner;
 let passX=false,passY=false;
 for(const t of i.targets){const pass=t.pass&&playerAt(world,t.target)===player&&!blocksBall(world,b,t.target);if(t.axis==='x')passX=pass;else passY=pass;}
 if(i.x&&i.y&&passX&&passY){const sx=Math.sign(b.vx),sy=Math.sign(b.vy),diagonal=world.version>=4?wrapCell(b.cell%world.width+sx,Math.floor(b.cell/world.width)+sy,world.width,world.height):b.cell+sx+sy*world.width;
  if(playerAt(world,diagonal)!==player||blocksBall(world,b,diagonal)){
    if(world.version>=12&&i.attack?.target===diagonal&&!world.cannons.some(c=>c.cell===diagonal)&&!deflectorAt(world,diagonal))
      return cornerPreferredAxis(world,b,i)==='x'?{passX:true,passY:false,vertexBlocked:false}:{passX:false,passY:true,vertexBlocked:false};
    return {passX:false,passY:false,vertexBlocked:true};
  }
 }
 return {passX,passY,vertexBlocked:false};
}
export {validStrike};
function incomingStrike(world, intent) {
  const t = intent.attack;
  if (!t || !t.defender || world.pending.some(p => p.ball === intent.ball)) return null;
  const ball = world.balls.find(b => b.id === intent.ball);
  return {id: 0, from: t.from??intent.cell, to: t.target, axis: t.axis, ball: intent.ball,
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
      const b = edges[j];
      if(world.version>=9&&(Math.min(a.from,a.to)!==Math.min(b.from,b.to)||Math.max(a.from,a.to)!==Math.max(b.from,b.to)))break;
      if (used.has(b.ball) || a.ball === b.ball) continue;
      let distance = sub(a.position, b.position);
      if(world.version>=4){const period=BigInt((a.axis==='x'?world.height:world.width)*Q)*distance[1];const n=(distance[0]%period+period)%period;distance=[n<=period-n?n:period-n,distance[1]];}
      if (a.from === b.to && a.to === b.from && (a.owner === b.defender && b.owner === a.defender)
          && cmp(world.time, a.deadline) <= 0 && cmp(world.time, b.deadline) <= 0
          && (distance[0] < 0n ? -distance[0] : distance[0]) <= BigInt(TEST_CONFIG.annihilation_distance) * distance[1]) {
        used.add(a.ball); used.add(b.ball); pairs.push([a.ball, b.ball]); break;
      }
    }
  }
  return pairs;
}

export class B2zCursor {
  constructor(state, inputs, seal, {cacheAreas = true, fastTopology = true} = {}) {
    const identity=seal.config_hash===RULES20_IDENTITY.config_hash?RULES20_IDENTITY:seal.config_hash===COMPACT_RESERVOIR_IDENTITY.config_hash?COMPACT_RESERVOIR_IDENTITY:seal.config_hash===DELEGATED_IDENTITY.config_hash?DELEGATED_IDENTITY:seal.config_hash===ECONOMY_IDENTITY.config_hash?ECONOMY_IDENTITY:seal.config_hash===RESERVOIR_IDENTITY.config_hash?RESERVOIR_IDENTITY:seal.config_hash===SPACING_IDENTITY.config_hash?SPACING_IDENTITY:seal.config_hash===SHOUT_IDENTITY.config_hash?SHOUT_IDENTITY:seal.config_hash===CONTEXT_IDENTITY.config_hash?CONTEXT_IDENTITY:seal.config_hash===DEFLECTOR_IDENTITY.config_hash?DEFLECTOR_IDENTITY:seal.config_hash===COMBINED_IDENTITY.config_hash?COMBINED_IDENTITY:seal.config_hash===WAR_CRY_IDENTITY.config_hash?WAR_CRY_IDENTITY:seal.config_hash===CLEARANCE_IDENTITY.config_hash?CLEARANCE_IDENTITY:seal.config_hash===ENTRY_IDENTITY.config_hash?ENTRY_IDENTITY:seal.config_hash===PLAYABILITY_IDENTITY.config_hash?PLAYABILITY_IDENTITY:seal.config_hash===MILLION_IDENTITY.config_hash?MILLION_IDENTITY:seal.config_hash===TORUS_IDENTITY.config_hash?TORUS_IDENTITY:seal.config_hash===PRELAUNCH_IDENTITY.config_hash?PRELAUNCH_IDENTITY:B2Z_IDENTITY;
    for (const k of Object.keys(identity)) if (seal[k] !== identity[k]) throw new Error('B2Z rule/config/schema identity');
    if(identity!==B2Z_IDENTITY)this.joinE8s=PRELAUNCH_CONFIG.join_e8s;
    const successor=identity===RULES20_IDENTITY,compact=successor||identity===COMPACT_RESERVOIR_IDENTITY,delegated=compact||identity===DELEGATED_IDENTITY,daily=delegated||identity===ECONOMY_IDENTITY,reservoirRules=daily||identity===RESERVOIR_IDENTITY,spacingRules=reservoirRules||identity===SPACING_IDENTITY,shoutRules=spacingRules||identity===SHOUT_IDENTITY,contextRules=shoutRules||identity===CONTEXT_IDENTITY,deflectorRules=contextRules||identity===DEFLECTOR_IDENTITY;
    this.world = decodeWorld(state);if(deflectorRules||identity===COMBINED_IDENTITY||identity===WAR_CRY_IDENTITY||identity===PLAYABILITY_IDENTITY||identity===ENTRY_IDENTITY||identity===CLEARANCE_IDENTITY)this.v6={plan:null,payment:null,batch:null,capture:null,births:[],finalized:false,...([ENTRY_IDENTITY,CLEARANCE_IDENTITY,WAR_CRY_IDENTITY,COMBINED_IDENTITY,DEFLECTOR_IDENTITY,CONTEXT_IDENTITY,SHOUT_IDENTITY,SPACING_IDENTITY,RESERVOIR_IDENTITY,ECONOMY_IDENTITY,DELEGATED_IDENTITY,COMPACT_RESERVOIR_IDENTITY,RULES20_IDENTITY].includes(identity)?{entry_rules:true}:{}),...([CLEARANCE_IDENTITY,COMBINED_IDENTITY,DEFLECTOR_IDENTITY,CONTEXT_IDENTITY,SHOUT_IDENTITY,SPACING_IDENTITY,RESERVOIR_IDENTITY,ECONOMY_IDENTITY,DELEGATED_IDENTITY,COMPACT_RESERVOIR_IDENTITY,RULES20_IDENTITY].includes(identity)?{clearance_rules:true}:{}),...([WAR_CRY_IDENTITY,COMBINED_IDENTITY,DEFLECTOR_IDENTITY,CONTEXT_IDENTITY,SHOUT_IDENTITY,SPACING_IDENTITY,RESERVOIR_IDENTITY,ECONOMY_IDENTITY,DELEGATED_IDENTITY,COMPACT_RESERVOIR_IDENTITY,RULES20_IDENTITY].includes(identity)?{war_cry_rules:true,pending_cry:null}:{}),...(deflectorRules?{deflector_rules:true}:{}),...(contextRules?{context_rules:true}:{}),...(shoutRules?{shout_rules:true}:{}),...(spacingRules?{spacing_rules:true}:{}),...(reservoirRules?{reservoir_rules:true}:{}),...(daily?{economy_predecessor:{state_hash:sha256(state),population:participatingPlayers(this.world)}}:{})};if(this.world.version!==(successor?12:compact?11:delegated?10:daily?9:reservoirRules?8:deflectorRules?7:identity===COMBINED_IDENTITY||identity===WAR_CRY_IDENTITY||identity===PLAYABILITY_IDENTITY||identity===ENTRY_IDENTITY||identity===CLEARANCE_IDENTITY?6:identity===MILLION_IDENTITY?5:identity===TORUS_IDENTITY?4:3))throw new Error('world/identity mismatch'); this.inputs = canonicalInputs(inputs); this.inputIndex = 0; this.moved = [];
    this.start = rat(uint(seal.logical_start)); this.end = rat(uint(seal.logical_end));
    if (cmp(this.world.time, this.start) !== 0 || cmp(this.end, this.start) <= 0
        || cmp(sub(this.end, this.start), rat(deflectorRules?DEFLECTOR_CONFIG.max_segment_ticks:LIMITS.max_segment_ticks)) > 0
        || cmp(this.end, rat(1000000000)) > 0 || inputs.length > 4096) throw new Error('B2Z segment context');
    let semanticSource=this.inputs;
    if(delegated){
      const registry=structuredClone(this.world.authorization);
      semanticSource=this.inputs.flatMap(input=>{
        const payment=decodeDelegatedPayment(input.payload_hex);
        return (this.world.version>=12?authorizePaymentV3:authorizePayment)(registry,payment,input.position)==='gameplay'
          ?[{...input,payload_hex:hex(pricingEnvelope(payment))}]:[];
      });
    }
    const seedInputs=[WAR_CRY_IDENTITY,COMBINED_IDENTITY,DEFLECTOR_IDENTITY,CONTEXT_IDENTITY,SHOUT_IDENTITY,SPACING_IDENTITY,RESERVOIR_IDENTITY,ECONOMY_IDENTITY,DELEGATED_IDENTITY,COMPACT_RESERVOIR_IDENTITY,RULES20_IDENTITY].includes(identity)
      ? semanticSource.map(i=>({...i,payload_hex:hex((reservoirRules?semanticReservoirPayment:shoutRules?semanticShoutPayment:contextRules?semanticContextPayment:deflectorRules?semanticDeflectorPayment:semanticPayment)(daily?untimedPayment(unhex(i.payload_hex)).previous:unhex(i.payload_hex)))}))
      : this.inputs;
    const needsSeed=!compact||seedInputs.some(i=>{
      try {
        const command=decodeV6Memo(unhex(i.payload_hex).subarray(48,56));
        return command.kind==='new'||command.kind==='angle';
      } catch { return false; }
    });
    this.seedBase=needsSeed?sha256(encodeCanonical({domain:'BTZ-SPAWN-INPUT-03',state:sha256(deflectorRules?semanticDeflectorWorld(state):state),
      inputs:sha256(encodeCanonical(seedInputs)),logical_start:this.start})):'';
    this.initialCredits = cloneCanonical(this.world.credits);
    this.phase = 'commands'; this.events = []; this.receipts = [];
    this.scan = 0; this.candidates = []; this.intents = []; this.nextTime = this.start;
    this.areas = []; this.areaDirty = true; this.cacheAreas = cacheAreas; this.fastTopology = fastTopology;
    this.resolving = 0; this.claimed = []; this.job = null; this.jobMeta = null; this.afterTopology = 'resolve';
    this.spawnJob = null; this.spawnPayment = null; this.spawnAngle = 0; this.spawnSearches = 0;
  }
  emit(event) {
    if (this.events.length >= 131072) throw new Error('small-board event capacity');
    if(this.v6?.war_cry_rules&&this.v6.pending_cry&&['ball_spawned','cannon_spawned'].includes(event.kind)&&event.ball){
      const cannon=typeof event.cannon==='object'?event.cannon:this.world.cannons.find(c=>c.id===event.cannon);
      event={...event,launch_annotation:{version:1,position:uint(this.inputs[this.inputIndex].position),account:cannon.account,cry:this.v6.pending_cry}};this.v6.pending_cry=null;
    }
    this.events.push({sequence: this.events.length, time: this.world.time, ...structuredClone(event)});
  }
  receipt(payment, outcome) {
    const i = this.inputs[this.inputIndex++];
    this.receipts.push({position: uint(i.position), account: payment.account, amount: payment.amount, ...outcome,...(payment.tariff?{ledger_recorded_ns:payment.tariff.ledger_recorded_ns,price_multiplier:payment.tariff.multiplier}:{}),...(payment.tariff20?{ledger_recorded_ns:payment.tariff20.ledger_recorded_ns,price_tariff:payment.tariff20.rate}:{}),
      ...(payment.transfer?{spender:payment.transfer.spender,ledger_recorded_ns:payment.transfer.ledger_recorded_ns,transfer:payment.transfer}:{})});
    if (outcome.reason === 'ACCEPTED') {
      const cry=this.v6?.shout_rules&&this.v6.pending_cry;
      const action=outcome.kind==='cannon_moved'?{kind:'cannon',id:outcome.cannon,cell:outcome.after}
        : ['deflector_built','deflector_moved','deflector_reoriented'].includes(outcome.kind)?{kind:'deflector',id:outcome.structure.id,cell:outcome.structure.cell}:null;
      this.emit(cry&&action?{...outcome,action_annotation:{version:1,position:uint(i.position),account:payment.account,cry,...action}}:outcome);
    }
    if(this.v6?.war_cry_rules)this.v6.pending_cry=null;
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
    if(this.world.version>=6&&workV6(this,payload=>readPayment(payload,!!this.v6.war_cry_rules,this.world.version>=9?17:this.v6.reservoir_rules?16:this.v6.shout_rules?14:this.v6.context_rules?13:!!this.v6.deflector_rules)))return;
    if (this.phase === 'commands') {
      if (this.inputIndex < this.inputs.length) {
        const i = this.inputs[this.inputIndex], payment = readPayment(i.payload_hex);
        const outcome = mutation(this.world, payment, this.moved, this.joinE8s===undefined?TEST_CONFIG:PRELAUNCH_CONFIG);
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
          const cannon = {id: this.world.next_cannon_id++, cell: r.cell, account: this.spawnPayment.account,...(this.world.version>=4?{heading:this.spawnAngle}:{})};
          const previous_owners = r.patch.map(c => ownerAt(this.world,c));
          for (const c of r.patch) setOwner(this.world,c,cannon.id);
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
        const crossing = nextCrossing(this.world.balls[this.scan++], this.world.width, this.world.time,this.world.balls[this.scan-1].den??1n);
        if (cmp(crossing.time, this.end) < 0) this.candidates.push(crossing);
      } else {
        this.nextTime = [...this.candidates.map(c => c.time), ...this.world.pending.map(p => p.deadline)]
          .reduce((t, c) => cmp(c, t) < 0 ? c : t, this.end);
        this.candidates = this.candidates.filter(c => cmp(c.time, this.nextTime) === 0);
        if (!this.cacheAreas || this.areaDirty) { this.areas = this.world.cannons.map(c => [c.id, 0]); this.scan = 0; }
        else this.scan = cellCount(this.world);
        this.phase = 'area';
      }
    } else if (this.phase === 'area') {
      if(this.world.version>=5&&this.scan===0){this.areas=scoreAreas(this.world);this.scan=cellCount(this.world);}
      if (this.scan < cellCount(this.world)) {
        const owner = ownerAt(this.world,this.scan++), item = this.areas.find(a => a[0] === owner);
        if (item) item[1]++;
      } else {
        const dt = sub(this.nextTime, this.world.time);
        for (const [id, area] of this.areas) {
          const account = this.world.version>=6?this.world.playability.players.find(p=>p.id===id).account:this.world.cannons.find(c => c.id === id).account;
          let s = this.world.credits.find(s => s.account === account);
          if (!s) { s = {account, units: rat(0)}; this.world.credits.push(s); }
          const delta=this.world.version>=5?rat(dt[0]*BigInt(area)*1024n,dt[1]*1000000n):mulInt(dt,area);
          s.units = add(s.units, delta);
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
        if(this.world.version>=6){cleanupV6(this,pairs);return;}
        this.emit({kind: 'annihilation', pairs});
        this.job = beginCleanup(this.world, pairs.flat()); this.jobMeta = {kind: 'annihilation_cleanup'};
        this.afterTopology = 'resolve'; this.phase = 'topology';
      } else this.phase = 'resolve';
    } else if (this.phase === 'resolve') {
      if (this.resolving >= this.intents.length) { this.phase = 'expire'; return; }
      const i = this.intents[this.resolving++], b = this.world.balls.find(b => b.id === i.ball);
      if (!b) return;
      const {passX,passY,vertexBlocked}=passage(this.world,b,i);
      const sx=Math.sign(b.vx),sy=Math.sign(b.vy);
      const xy = position(b, this.world.time);
      let deflector_contact;
      const target=this.world.version>=7&&!(i.x&&i.y)?i.targets.find(t=>deflectorAt(this.world,t.target)?.id===i.deflector_target):null;
      if(target){const d=deflectorAt(this.world,target.target),face=i.x?(b.vx>0?'W':'E'):(b.vy>0?'N':'S');
        const response=contactResponse(b,this.world.time,d.orientation,face,i.x?i.xwall:i.ywall);
        Object.assign(b,response.trajectory);
        deflector_contact={id:d.id,orientation:d.orientation,face,kind:response.kind,...(response.front===undefined?{}:{front:response.front})};
      }else{if (i.x && !passX) reflected(b, 'x', i.xwall);if (i.y && !passY) reflected(b, 'y', i.ywall);}
      const oldCell = b.cell;
      if(this.world.version>=4){const x=b.cell%this.world.width+(passX?sx:0),y=Math.floor(b.cell/this.world.width)+(passY?sy:0);b.cell=wrapCell(x,y,this.world.width,this.world.height);
        if(x<0)b.x0+=BigInt(this.world.width*Q)*(b.den??1n);if(x>=this.world.width)b.x0-=BigInt(this.world.width*Q)*(b.den??1n);
        if(y<0)b.y0+=BigInt(this.world.height*Q)*(b.den??1n);if(y>=this.world.height)b.y0-=BigInt(this.world.height*Q)*(b.den??1n);
      }else b.cell += (passX ? sx : 0) + (passY ? sy * this.world.width : 0);
      retireAfterContact(this.world,b.id);
      this.emit({kind: 'motion', ball: b.id, from_cell: oldCell, ball_state: structuredClone(b), vertex_blocked: vertexBlocked,...(deflector_contact?{deflector_contact}:{})});
      const t = i.attack;
      const attack = !vertexBlocked && t && !this.claimed.includes(t.target)
        && playerAt(this.world,t.target) === t.defender && !this.world.cannons.some(c => c.cell === t.target)&&!deflectorAt(this.world,t.target)
        && !this.world.pending.some(p => p.ball === b.id) ? t : null;
      if (attack && attack.defender) {
        if (this.world.next_strike_id >= 4294967295) throw new Error('strike ID exhausted');
        const p = {id: this.world.next_strike_id++, from: attack.from??oldCell, to: attack.target, axis: attack.axis,
          ball: b.id, owner: b.owner, defender: attack.defender, born: this.world.time,
          deadline: add(this.world.time, TEST_CONFIG.annihilation_time_window), position: xy[attack.axis === 'x' ? 1 : 0]};
        this.world.pending.push(p); this.emit({kind: 'strike_armed', strike: cloneCanonical(p)});
      } else if (attack) {
        this.claimed.push(attack.target);
        if(this.world.version>=6){captureV6(this,attack.target,b.id,'resolve');return;}
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
        if(this.world.version>=6){captureV6(this,p.to,p.ball,'expire',{strike:p.id});return;}
        this.job = beginCapture(this.world, p.to, p.owner, this.fastTopology);
        this.jobMeta = {kind: 'capture', attacker: p.owner, ball: p.ball, target: p.to, strike: p.id};
        this.afterTopology = 'expire'; this.phase = 'topology';
      } else this.emit({kind: 'strike_cancelled', strike: p.id, reason: 'INVALIDATED'});
    } else if (this.phase === 'topology') {
      if (topologyStep(this.world, this.job)) {
        pruneRemoved(this.world);
        this.emit({...this.jobMeta, ...(this.world.version===5?{cell_ranges:this.job.changed_ranges??[]}:{cells:[...this.job.cells].sort((a, b) => a - b)}),
          destroyed_balls: this.job.killed, eliminated_cannons: this.job.eliminated});
        this.areaDirty = true; this.job = null; this.jobMeta = null; this.phase = this.afterTopology;
      }
    } else if (this.phase !== 'done') throw new Error('unknown B2Z cursor phase');
  }
  step(budget) {
    if (!Number.isInteger(budget) || budget < 1 || budget > 1000000) throw new Error('B2Z work budget');
    let used = 0;
    while (this.phase !== 'done' && used < budget) {
      const batched=this.world.version>=5&&(this.phase==='search'||this.phase==='resolve')?this.phase:null;
      this.work();
      // Keep the v5 bounded 64-entity chunk for v6. Larger populations yield
      // between chunks; neither the per-Step budget nor physics rate changes.
      for(let n=0;batched&&n<64&&this.phase===batched;n++)this.work();
      used++;
    }
    return {used, complete: this.phase === 'done'};
  }
  needsElapsed(){return this.world.version>=6&&this.phase==='done'&&!this.v6.finalized;}
  finalizeElapsed(observedNs){finalizeCursorElapsed(this,observedNs);}
  result() {
    if (this.phase !== 'done'||this.needsElapsed()) throw new Error('incomplete B2Z segment');
    const initial=new Map(this.initialCredits.map(row=>[row.account,row.units]));
    const scores = this.world.credits.map(s => ({account: s.account,
      units: sub(s.units, initial.get(s.account) ?? rat(0))}));
    return {state: encodeWorld(this.world), events: encodeCanonical({version: this.world.version, receipts: this.receipts, events: this.world.version>=7?this.events.map(packDeflectorEvent):this.events}),
      scores: encodeCanonical({version: this.world.version, area_time: scores})};
  }
  snapshot() { return encodeCanonical({version: 3, cursor: {...this}}); }
  static restore(bytes, trustedHash) {
    if (sha256(bytes) !== trustedHash) throw new Error('B2Z snapshot integrity');
    const p = decodeCanonical(bytes);
    if (p.version !== 3 || !p.cursor || !['commands','spawn','v6_spawn','v6_purchase','v6_topology','search','area','batch','resolve','expire','topology','done'].includes(p.cursor.phase))
      throw new Error('B2Z cursor schema');
    const c = Object.assign(Object.create(B2zCursor.prototype), p.cursor);
    if(c.joinE8s!==undefined&&c.joinE8s!==PRELAUNCH_CONFIG.join_e8s)throw new Error('B2Z cursor economics');
    validRat(c.world.time); validRat(c.start); validRat(c.end);
    if (cmp(c.world.time, c.start) < 0 || cmp(c.world.time, c.end) > 0 || c.inputIndex > c.inputs.length
        || c.inputIndex < 0 || c.receipts.length !== c.inputIndex || cellCount(c.world) > 1000000
        || c.events.length > 131072 || c.world.version<9 && [c.world.balls,c.intents,c.world.pending].some(rows=>rows.length>(c.world.version>=6?V6_POLICY.max_balls:LIMITS.max_balls)) || (c.spawnJob && c.spawnJob.candidates.length > (c.world.version>=5?8192:5*LIMITS.max_cells)))
      throw new Error('B2Z cursor bounds');
    if((c.world.version>=6)!==!!c.v6)throw Error('V6_CURSOR');
    if (c.world.version>=6||['done','commands','spawn','search','area'].includes(c.phase)) validateWorld(c.world);
    if(c.world.version>=6)validateV6Cursor(c);
    // The expected hash is a trusted durable commitment, never an untrusted caller's self-supplied checksum.
    return c;
  }
}
export const B2zKernel = {begin: (s, i, c) => new B2zCursor(s, i, c), restore: B2zCursor.restore,
  fork: cursor => Object.assign(Object.create(B2zCursor.prototype), structuredClone({...cursor}))};

function semanticDeflectorWorld(bytes){
 const w=decodeWorld(bytes);if(w.version>=9){if(w.version>=11){w.reservoirs=legacyReservoirBitmap(w);delete w.reservoir_ranges;}delete w.economy;delete w.authorization;if(w.version>=12){delete w.economy_formula_start_ns;delete w.passage_exceptions;}w.version=9;return encodeCanonical(w);}
 if(w.reservoirs?.length||w.deflectors.length||w.balls.some(b=>b.den!==1n||b.deflector_rearm!==undefined))return bytes;
 w.version=6;delete w.deflectors;delete w.next_deflector_id;delete w.reservoirs;for(const b of w.balls)delete b.den;return encodeWorld(w);
}
