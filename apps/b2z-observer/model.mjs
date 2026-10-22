/** B2Z-specific observer, not a simulator. Integer trajectories become floats ONLY for drawing. */
import {TORUS_IDENTITY,V3_IDENTITIES} from './torus-identity.generated.mjs';
import {PlayoutClock} from '../../node_modules/@dtr/timeline-runtime/packages/client/playout.mjs';
import {decodeCanonical} from '../../node_modules/@dtr/timeline-runtime/packages/runtime/canonical.mjs';
import {sha256Web} from '../../node_modules/@dtr/timeline-runtime/packages/client/verification.mjs';
import {cmp, validRat, rat} from '../../packages/kernels/b2z/math.mjs';
import {projectAnimationEvents} from '../../packages/kernels/b2z/animation-projection.mjs';
export const FORMAT='btz-animation-1';
const MAX_EVENTS=131072;
function check(ok,message){if(!ok)throw new Error('observer: '+message);}
function integer(n,max=4294967295){check(Number.isSafeInteger(n)&&n>=0&&n<=max,'integer bounds');return n;}
export function timeNumber(r){validRat(r);const n=Number(r[0])/Number(r[1]);check(Number.isFinite(n)&&n>=0&&n<=1e9,'time bounds');return n;}
function track(b){
  check(b&&typeof b==='object','ball');integer(b.id);integer(b.owner,65535);
  for(const k of ['vx','vy'])check(Number.isSafeInteger(b[k])&&Math.abs(b[k])<=4096,'velocity');
  for(const k of ['x0','y0'])check(typeof b[k]==='bigint'&&b[k]>=-100000000000000n&&b[k]<=100000000000000n,'intercept');
  return {id:b.id,owner:b.owner,x0:b.x0,y0:b.y0,vx:b.vx,vy:b.vy};
}
export function snapshot(bytes,identity){
  check(bytes instanceof Uint8Array&&bytes.length<=1048576,'snapshot bounds');
  const w=decodeCanonical(bytes);check([3,4].includes(w.version),'snapshot version');
  check(Number.isInteger(w.width)&&w.width>=1&&w.width<=32&&Number.isInteger(w.height)&&w.height>=1&&w.height<=32,'dimensions');
  check(Array.isArray(w.cells)&&w.cells.length===w.width*w.height,'cells');
  check(Array.isArray(w.cannons)&&w.cannons.length<=32&&Array.isArray(w.balls)&&w.balls.length<=64,'entity bounds');
  check(Array.isArray(w.pending)&&w.pending.length<=64,'pending bounds');timeNumber(w.time);
  const ids=new Set(),anchors=new Set();
  for(const c of w.cannons){integer(c.id,65535);integer(c.cell,w.cells.length-1);
    if(c.heading!==undefined){check(w.version===4,'legacy heading');integer(c.heading,65535);}
    check(c.id!==0&&!ids.has(c.id)&&!anchors.has(c.cell)&&w.cells[c.cell]===c.id,'cannon identity');ids.add(c.id);anchors.add(c.cell);}
  w.cells.forEach(id=>check(id===0||ids.has(id),'cell owner'));
  const balls=new Set();for(const b of w.balls){track(b);check(ids.has(b.owner)&&!balls.has(b.id),'ball identity');balls.add(b.id);}
  if(w.version===3&&identity)check(V3_IDENTITIES.some(known=>Object.keys(known).every(k=>identity[k]===known[k])),'v3 rules/config/schema identity');
  if(w.version===4&&identity)check(Object.keys(TORUS_IDENTITY).every(k=>identity[k]===TORUS_IDENTITY[k]),'torus rules/config/schema identity');
  return w;
}
/** Mutable presentation state. No ledger account/price/scoring decisions are made here. */
export class B2zView {
  constructor(w){
    this.torus=w.version===4;this.version=w.version;this.width=w.width;this.height=w.height;this.cells=[...w.cells];
    this.cannons=new Map(w.cannons.map(c=>[c.id,{...c}]));
    this.balls=new Map(w.balls.map(b=>[b.id,track(b)]));
    this.pending=new Map(w.pending.map(p=>[p.id,structuredClone(p)]));
    this.effects=[];this.lastEvent='Waiting for verified playback';
  }
  /** Carry only ephemeral effects/status across chained segments; never game state. */
  continuePresentation(previous,time){
    if(!previous||previous===this)return;
    this.effects=previous.effects.filter(e=>time-e.t<.9&&time>=e.t).map(e=>({...e})).slice(-64);
    this.lastEvent=previous.lastEvent;
  }
  cell(n){integer(n,this.cells.length-1);return n;}
  removeBalls(ids){for(const id of ids){this.balls.delete(id);for(const [key,p] of this.pending)if(p.ball===id)this.pending.delete(key);}}
  apply(e){
    const t=timeNumber(e.time);this.lastEvent=e.kind.replaceAll('_',' ');
    if(e.kind==='trajectory'){
      check(this.balls.has(e.ball.id),'unknown trajectory');const b=track(e.ball);
      check(this.balls.get(b.id).owner===b.owner,'trajectory owner');this.balls.set(b.id,b);
    }else if(e.kind==='ball_spawned'){
      const b=track(e.ball);check(!this.balls.has(b.id)&&this.cannons.has(b.owner),'spawned ball');this.balls.set(b.id,b);if(this.torus){integer(e.heading,65535);this.cannons.get(b.owner).heading=e.heading;}
    }else if(e.kind==='cannon_spawned'){
      const c=e.cannon;integer(c.id,65535);this.cell(c.cell);check(!this.cannons.has(c.id),'duplicate cannon');
      check(Array.isArray(e.patch)&&e.patch.length===9,'spawn patch');for(const n of e.patch)this.cells[this.cell(n)]=c.id;
      const b=track(e.ball);check(b.owner===c.id&&!this.balls.has(b.id),'initial ball');
      this.cannons.set(c.id,{...c});this.balls.set(b.id,b);this.effects.push({kind:'spawn',cell:c.cell,t,owner:c.id});
    }else if(e.kind==='cannon_moved'){
      check(this.cannons.has(e.cannon),'moved cannon');this.cannons.get(e.cannon).cell=this.cell(e.after);
    }else if(e.kind==='strike_armed'){
      const p=e.strike;this.cell(p.from);this.cell(p.to);timeNumber(p.deadline);this.pending.set(p.id,structuredClone(p));
    }else if(e.kind==='strike_cancelled')this.pending.delete(e.strike);
    else if(e.kind==='annihilation'){
      check(Array.isArray(e.pairs)&&e.pairs.length<=64,'annihilation pairs');
      for(const pair of e.pairs){check(Array.isArray(pair)&&pair.length===2,'pair');
        for(const id of pair){const b=this.balls.get(id);if(b)this.effects.push({kind:'burst',x:(Number(b.x0)+b.vx*t)/1024,y:(Number(b.y0)+b.vy*t)/1024,t,owner:b.owner});}
        this.removeBalls(pair);
      }
    }else if(e.kind==='capture'||e.kind==='annihilation_cleanup'){
      check(Array.isArray(e.cells)&&e.cells.length<=1024&&Array.isArray(e.destroyed_balls)&&e.destroyed_balls.length<=64
        &&Array.isArray(e.eliminated_cannons)&&e.eliminated_cannons.length<=32,'topology event');
      if(e.kind==='capture'){
        check(this.cannons.has(e.attacker),'capture attacker');for(const n of e.cells)this.cells[this.cell(n)]=e.attacker;
        this.effects.push({kind:'capture',cell:this.cell(e.target),t,owner:e.attacker});
      }
      this.removeBalls(e.destroyed_balls);
      const gone=new Set(e.eliminated_cannons);for(let n=0;n<this.cells.length;n++)if(gone.has(this.cells[n]))this.cells[n]=0;
      for(const id of gone)this.cannons.delete(id);if(e.strike!==undefined)this.pending.delete(e.strike);
    }else throw new Error('observer: unsupported event '+String(e.kind));
    // Visual effects are bounded and ephemeral, never consensus state.
    this.effects=this.effects.filter(x=>t-x.t<2).slice(-64);
  }
  matches(w){
    const same=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
    check(this.width===w.width&&this.height===w.height&&same(this.cells,w.cells),'final territory mismatch');
    check(this.cannons.size===w.cannons.length&&w.cannons.every(c=>this.cannons.get(c.id)?.cell===c.cell&&this.cannons.get(c.id)?.heading===c.heading),'final cannon mismatch');
    check(this.balls.size===w.balls.length&&w.balls.every(b=>{const a=this.balls.get(b.id);return a&&['owner','x0','y0','vx','vy'].every(k=>a[k]===b[k]);}),'final trajectory mismatch');
    return true;
  }
  stats(){return [...this.cannons.values()].map(c=>({id:c.id,area:this.cells.filter(n=>n===c.id).length,
    balls:[...this.balls.values()].filter(b=>b.owner===c.id).length})).sort((a,b)=>b.area-a.area||a.id-b.id);}
}
/** Integrity links + exact ordering + end-state visual conformance BEFORE buffer admission.
 * Endpoint equality is not a proof that intermediate game rules were executed correctly.
 */
export async function prepareSegment(initialBytes,finalBytes,renderBytes,publication){
  check(renderBytes instanceof Uint8Array&&renderBytes.length<=1048576,'animation bounds');
  check(await sha256Web(renderBytes)===publication.artifacts.find(a=>a.kind==='render')?.sha256,'animation artifact hash');
  const initial=snapshot(initialBytes),final=snapshot(finalBytes),p=decodeCanonical(renderBytes),h=publication.head,s=h.seal;
  check(s&&p.version===1&&p.format===FORMAT&&publication.render_format===FORMAT,'animation version');
  check(p.initial_state_hash===await sha256Web(initialBytes)&&p.initial_state_hash===s.previous_state,'animation predecessor');
  check(await sha256Web(finalBytes)===h.state_hash,'final snapshot hash');
  check(p.source_events_hash===publication.artifacts.find(a=>a.kind==='events')?.sha256,'animation audit binding');
  check(Array.isArray(p.events)&&p.events.length<=MAX_EVENTS&&Array.isArray(p.receipts)&&p.receipts.length<=4096,'animation structure');
  check(cmp(initial.time,rat(s.logical_start))===0&&cmp(final.time,rat(s.logical_end))===0,'snapshot timeline');
  if(initial.version===4||final.version===4)check(initial.version===4&&final.version===4&&Object.keys(TORUS_IDENTITY).every(k=>publication.identity?.[k]===TORUS_IDENTITY[k]),'torus rules/config/schema identity');
  const model=new B2zView(initial);let prior=initial.time,seq=-1;
  for(const e of p.events){
    timeNumber(e.time);check(Number.isSafeInteger(e.sequence)&&e.sequence>seq&&cmp(e.time,prior)>=0&&cmp(e.time,final.time)<0,'animation event order/range');
    seq=e.sequence;prior=e.time;model.apply(e);
  }
  model.matches(final);
  return {start:Number(s.logical_start),end:Number(s.logical_end),initial,final,events:p.events,receipts:p.receipts,
    bytes:initialBytes.length+finalBytes.length+renderBytes.length};
}
/** The native host intentionally publishes no render artifact. Derive the
 * existing compact presentation from its authenticated predecessor and audit
 * events, then apply the same endpoint validation as recorded playback. */
export async function prepareDerivedSegment(initialBytes,finalBytes,eventBytes,publication){
  check([6,7].includes(publication.version)&&publication.render_format===null&&!publication.artifacts.some(a=>a.kind==='render'),'native publication shape');
  const events=publication.artifacts.find(a=>a.kind==='events');
  check(events&&await sha256Web(eventBytes)===events.sha256,'authenticated audit artifact');
  const initial=snapshot(initialBytes),final=snapshot(finalBytes),projected=projectAnimationEvents(initial,eventBytes),h=publication.head,s=h.seal;
  const p={version:1,format:FORMAT,initial_state_hash:await sha256Web(initialBytes),source_events_hash:await sha256Web(eventBytes),
    receipts:projected.receipts,events:projected.events};
  check(s&&p.version===1&&p.format===FORMAT,'derived animation version');
  check(p.initial_state_hash===await sha256Web(initialBytes)&&p.initial_state_hash===s.previous_state,'derived animation predecessor');
  check(await sha256Web(finalBytes)===h.state_hash,'derived final snapshot hash');
  check(p.source_events_hash===events.sha256,'derived audit binding');
  check(Array.isArray(p.events)&&p.events.length<=MAX_EVENTS&&Array.isArray(p.receipts)&&p.receipts.length<=4096,'derived animation structure');
  check(cmp(initial.time,rat(s.logical_start))===0&&cmp(final.time,rat(s.logical_end))===0,'derived snapshot timeline');
  if(initial.version===4||final.version===4)check(initial.version===4&&final.version===4&&Object.keys(TORUS_IDENTITY).every(k=>publication.identity?.[k]===TORUS_IDENTITY[k]),'torus rules/config/schema identity');
  const model=new B2zView(initial);let prior=initial.time,seq=-1;
  for(const e of p.events){
    timeNumber(e.time);check(Number.isSafeInteger(e.sequence)&&e.sequence>seq&&cmp(e.time,prior)>=0&&cmp(e.time,final.time)<0,'derived animation event order/range');
    seq=e.sequence;prior=e.time;model.apply(e);
  }
  model.matches(final);
  return {start:Number(s.logical_start),end:Number(s.logical_end),initial,final,events:p.events,receipts:p.receipts,
    bytes:initialBytes.length+finalBytes.length+eventBytes.length};
}
export class SegmentPlayer {
  constructor(segment){this.segment=segment;this.view=new B2zView(segment.initial);this.index=0;this.time=segment.start;}
  advance(time){
    check(Number.isFinite(time)&&time>=this.time&&time<=this.segment.end,'playhead bounds');this.time=time;
    while(this.index<this.segment.events.length&&timeNumber(this.segment.events[this.index].time)<=time)this.view.apply(this.segment.events[this.index++]);
    return this.view;
  }
}

/** Consume only the verified finite remainder when the authoritative arena idles. */
export function prepareIdlePlayout(session,idle){
  const {playhead:start,available:end}=session.clock;
  if(idle&&!session.idleDrain&&end>start){
    const target=Math.min(.25,(end-start)/2);
    session.clock=new PlayoutClock({start,target,low:target/2,max_frame_delta:.25});
    session.clock.append(start,end);session.idleDrain=true;
  }else if(!idle&&session.idleDrain){
    session.clock=new PlayoutClock({start,...liveBufferPolicy(session.operational),max_frame_delta:1});
    if(end>start)session.clock.append(start,end);session.idleDrain=false;
  }
}

/** Shared operational speed is presentation input only; the verified clock remains the ceiling. */
export function nominalPace(status){
 const p=status?.run.pace;if(!p)return .5;
 if(!['Normal','Economy','Conserve','ReserveProtection','Legacy'].includes(p.mode)||!Number.isInteger(p.nominal_milli)||p.nominal_milli<0||p.nominal_milli>1000)return .25;
 return p.nominal_milli/1000;
}
export function approachPace(current,target,seconds){return current+Math.max(-.25*seconds,Math.min(.25*seconds,target-current));}

/** Two-tick publication plus four wall seconds of measured delivery jitter. */
export function liveBufferPolicy(status){const pace=nominalPace(status);return {target:2+4*pace,low:Math.max(.5,pace)};}
