/** V6 presentation facts only. No physics, Ledger admission or action authority. */
import {V6_POLICY} from '../../packages/kernels/b2z/playability.generated.mjs';
import {encodeCanonical} from '../../node_modules/@dtr/timeline-runtime/packages/runtime/canonical.mjs';
import {cmp,rat} from '../../packages/kernels/b2z/math.mjs';
const check=(v,s)=>{if(!v)throw Error('observer: v6 '+s);};
const integer=(v,max=4294967294,min=0)=>check(Number.isSafeInteger(v)&&v>=min&&v<=max,'integer');
const ns=n=>check(typeof n==='bigint'&&n>=0n&&n<=18446744073709551615n,'elapsed time');
const same=(a,b)=>{const x=encodeCanonical(a),y=encodeCanonical(b);return x.length===y.length&&x.every((v,i)=>v===y[i]);};
export function trackV6(b){integer(b.id,4294967294,1);integer(b.owner,4294967294,1);for(const k of ['vx','vy'])check(Number.isSafeInteger(b[k])&&Math.abs(b[k])<=65536,'velocity');for(const k of ['x0','y0'])check(typeof b[k]==='bigint'&&b[k]>=-100000000000000n&&b[k]<=100000000000000n,'intercept');check(b.vx||b.vy,'zero velocity');return {id:b.id,owner:b.owner,x0:b.x0,y0:b.y0,vx:b.vx,vy:b.vy};}
export function validateV6Snapshot(w,ownerAt){
 const s=w.playability;check(s&&w.width===1000&&w.height===1000,'snapshot');ns(s.elapsed_ns);
 const bounded=(v,n)=>check(Array.isArray(v)&&v.length<=n,'array bounds');
 bounded(w.cannons,V6_POLICY.max_cannons);bounded(w.balls,V6_POLICY.max_balls);bounded(w.pending,V6_POLICY.max_balls);
 bounded(s.players,V6_POLICY.max_players);bounded(s.territories,V6_POLICY.max_cannons);bounded(s.lifecycle,V6_POLICY.max_cannons);
 const ordered=(rows,key)=>{let prior=0;for(const v of rows){integer(v[key],4294967294,1);check(v[key]>prior,'ordered identities');prior=v[key];}};
 ordered(s.players,'id');ordered(s.territories,'id');ordered(s.lifecycle,'cannon');ordered(w.cannons,'id');ordered(w.balls,'id');
 const players=new Map(),accounts=new Set();for(const p of s.players){check(/^[0-9a-f]{64}$/.test(p.account)&&!accounts.has(p.account),'player account');players.set(p.id,p);accounts.add(p.account);}
 const territories=new Map();for(const r of s.territories){check(players.has(r.player),'territory player');territories.set(r.id,r.player);}
 integer(s.next_player_id,4294967295);integer(s.next_territory_id,4294967295);check(s.next_player_id>(s.players.at(-1)?.id??0)&&s.next_territory_id>(s.territories.at(-1)?.id??0),'next identities');
 for(const id of [...w.ownership.base,...w.ownership.overrides.map(r=>r.owner)])check(id===0||territories.has(id),'territory binding');
 const anchors=new Map(),cells=new Set(),retained=new Map();check(s.lifecycle.length===w.cannons.length,'lifecycle cardinality');
 const pools=new Map();for(const b of w.balls){trackV6(b);integer(b.cell,999999);const label=ownerAt(w,b.cell);check(players.has(b.owner)&&territories.get(label)===b.owner,'ball player');pools.set(label,(pools.get(label)??0)+1);const x=rat(b.x0*w.time[1]+BigInt(b.vx)*w.time[0],w.time[1]),y=rat(b.y0*w.time[1]+BigInt(b.vy)*w.time[0],w.time[1]),cx=b.cell%1000,cy=Math.floor(b.cell/1000);check(cmp(x,rat(cx*1024))>=0&&cmp(x,rat((cx+1)*1024))<=0&&cmp(y,rat(cy*1024))>=0&&cmp(y,rat((cy+1)*1024))<=0,'ball position');}
 for(let i=0;i<w.cannons.length;i++){
  const c=w.cannons[i],l=s.lifecycle[i],label=ownerAt(w,c.cell);integer(c.cell,999999);if(c.heading!==undefined)integer(c.heading,65535);integer(l.generation,4294967295,1);
  check(!cells.has(c.cell)&&l.cannon===c.id&&territories.get(label)===l.player&&players.get(l.player)?.account===c.account,'cannon player');cells.add(c.cell);anchors.set(label,(anchors.get(label)??0)+1);retained.set(l.player,(retained.get(l.player)??0)+1);check(retained.get(l.player)<=V6_POLICY.max_retained_per_player,'retained limit');
  if(pools.get(label)){check(l.deadline_ns===undefined&&l.dormant_since_ns===undefined,'active deadline');}
  else{ns(l.deadline_ns);ns(l.dormant_since_ns);check(l.dormant_since_ns<=s.elapsed_ns&&l.deadline_ns===l.dormant_since_ns+V6_POLICY.dormancy_grace_ns,'dormant deadline');}
 }
 for(const r of s.territories){check(anchors.has(r.id),'island anchor');if(!pools.has(r.id))check(w.ownership.counts.find(v=>v.owner===r.id)?.cells===anchors.get(r.id),'dormant land');}
 integer(w.next_ball_id,4294967295,1);integer(w.next_cannon_id,4294967295,1);check(w.next_ball_id>(w.balls.at(-1)?.id??0)&&w.next_cannon_id>(w.cannons.at(-1)?.id??0),'next entities');
}
export function applyMetadata(view,d){
 check(d&&typeof d==='object','metadata delta');const s=view.playability;
 integer(d.next_player_id,4294967295);integer(d.next_territory_id,4294967295);check(d.next_player_id>=s.next_player_id&&d.next_territory_id>=s.next_territory_id,'counter rollback');
 for(const[field,key,max]of[['players','id',V6_POLICY.max_players],['territories','id',V6_POLICY.max_cannons],['lifecycle','cannon',V6_POLICY.max_cannons]]){
  check(Array.isArray(d[field])&&d[field].length<=max,'delta bounds');const map=new Map(s[field].map(v=>[v[key],v]));let prior=0;
  for(const v of d[field]){integer(v[key],4294967294,1);check(v[key]>prior,'delta order');prior=v[key];const old=map.get(v[key]);if(field==='players'&&old)check(old.account===v.account,'changed player');if(field==='lifecycle'&&old)check(v.generation>=old.generation,'generation rollback');map.set(v[key],structuredClone(v));}
  s[field]=[...map.values()].sort((a,b)=>a[key]-b[key]);
 }
 for(const[field,rows,key]of[['retired_territories','territories','id'],['retired_cannons','lifecycle','cannon']]){check(Array.isArray(d[field])&&d[field].length<=V6_POLICY.max_cannons,'retirement bounds');const gone=new Set(d[field]);check(gone.size===d[field].length,'duplicate retirement');for(const id of gone)integer(id,4294967294,1);s[rows]=s[rows].filter(v=>!gone.has(v[key]));}
 s.next_player_id=d.next_player_id;s.next_territory_id=d.next_territory_id;
 if(d.territories.length||d.retired_territories.length||d.players.length)view.territoryRevision++;
}
function ownership(view,ops){
 check(Array.isArray(ops)&&ops.length<=65536,'ownership operations');
 for(const op of ops){
  if(op.kind==='set'){integer(op.owner);view.setOwner(view.cell(op.cell),op.owner);}
  else if(op.kind==='set_range'){view.cell(op.start);integer(op.end,1000000);integer(op.from);integer(op.to);check(op.start<op.end,'range');view.setRange(op.start,op.end,op.from,op.to);}
  else if(op.kind==='clear'){integer(op.owner,4294967294,1);view.clearOwner(op.owner);}
  else if(op.kind==='relabel'){
   integer(op.from,4294967294,1);integer(op.to,4294967294,1);check(op.from!==op.to,'relabel');view.territoryRevision++;
   for(let i=0;i<view.ownership.base.length;i++)if(view.ownership.base[i]===op.from)view.ownership.base[i]=op.to;
   const changes=[];for(const old of view.ownership.overrides){const r={...old,owner:old.owner===op.from?op.to:old.owner},last=changes.at(-1);if(last&&last.end===r.start&&last.owner===r.owner)last.end=r.end;else changes.push(r);}view.ownership.overrides=changes;
   const counts=new Map();for(const r of view.ownership.counts){const id=r.owner===op.from?op.to:r.owner;counts.set(id,(counts.get(id)??0)+r.cells);}view.ownership.counts=[...counts].sort((a,b)=>a[0]-b[0]).map(([owner,cells])=>({owner,cells}));
  }else throw Error('observer: v6 unsupported ownership operation');
 }
}
export function applyV6Event(view,e){
 const t=Number(e.time[0])/Number(e.time[1]);view.logicalTime=t;
 if(e.kind==='cannon_spawned'){
  const c=e.cannon;integer(c.id,4294967294,1);view.cell(c.cell);check(!view.cannons.has(c.id),'duplicate cannon');check(Array.isArray(e.patch)&&[1,9].includes(e.patch.length),'patch');
  view.cannons.set(c.id,{...c});ownership(view,e.ownership_ops);applyMetadata(view,e.metadata_delta);
  const b=trackV6(e.ball);check(b.owner===view.playerForCannon(c.id)&&!view.balls.has(b.id),'initial ball');view.balls.set(b.id,b);view.effects.push({kind:'spawn',cell:c.cell,t,owner:b.owner});
 }else if(e.kind==='ball_spawned'){
  check(view.cannons.has(e.cannon),'launch cannon');applyMetadata(view,e.metadata_delta);const b=trackV6(e.ball);check(b.owner===view.playerForCannon(e.cannon)&&!view.balls.has(b.id),'spawn player');view.balls.set(b.id,b);integer(e.heading,65535);view.cannons.get(e.cannon).heading=e.heading;
 }else if(['capture','capture_annihilation','annihilation_cleanup'].includes(e.kind)){
  check(Array.isArray(e.pairs)&&e.pairs.length<=Math.floor(V6_POLICY.max_balls/2),'pairs');const used=new Set();
  for(const pair of e.pairs){check(Array.isArray(pair.balls)&&pair.balls.length===2&&Array.isArray(pair.positions)&&pair.positions.length===2,'pair');const balls=pair.balls.map(id=>view.balls.get(id));check(balls.every(Boolean)&&balls[0].owner!==balls[1].owner,'pair participants');
   for(let i=0;i<2;i++){const b=balls[i];check(!used.has(b.id),'repeated participant');used.add(b.id);const p=pair.positions[i];check(Array.isArray(p)&&p.length===2,'pair position');for(let axis=0;axis<2;axis++){const k=axis?'y0':'x0',v=axis?'vy':'vx';check(cmp(p[axis],rat(b[k]*e.time[1]+BigInt(b[v])*e.time[0],e.time[1]))===0,'pair trajectory');}}
   const [[x,y],[x2,y2]]=pair.positions.map(p=>p.map(r=>((Number(r[0])/Number(r[1])/1024)%1000+1000)%1000));view.effects.push({kind:'mutual',x,y,x2,y2,t,owner:balls[0].owner});
  }
  view.removeBalls([...used]);ownership(view,e.ownership_ops);applyMetadata(view,e.metadata_delta);
  check(Array.isArray(e.cancelled_strikes)&&e.cancelled_strikes.length<=V6_POLICY.max_balls,'cancelled strikes');for(const id of e.cancelled_strikes)view.pending.delete(id);if(e.strike!==undefined)view.pending.delete(e.strike);
  if(e.kind==='capture')view.effects.push({kind:'capture',cell:view.cell(e.target),t,owner:e.attacker});
 }else if(e.kind==='purchase_completed'){
  check(['applied','partially_applied','rejected'].includes(e.status),'purchase status');
 }else if(e.kind==='lifecycle_time'){
  const s=view.playability;ns(e.previous_elapsed_ns);ns(e.observed_ns);check(s.elapsed_ns===e.previous_elapsed_ns&&e.observed_ns>=s.elapsed_ns,'completion time rollback');check(Array.isArray(e.stamped)&&e.stamped.length<=V6_POLICY.max_cannons,'time fences');
  for(const f of e.stamped){const l=s.lifecycle.find(l=>l.cannon===f.cannon);check(l&&l.generation===f.generation&&l.deadline_ns===f.deadline_ns&&l.dormant_since_ns===e.observed_ns,'completion fence');}s.elapsed_ns=e.observed_ns;
 }else return false;
 return true;
}
export function matchesV6(view,w){check(same(view.playability,w.playability),'final player/island/lifecycle mismatch');check(same([...view.pending.values()].sort((a,b)=>a.id-b.id),w.pending),'final strikes');}
export function statsV6(view){const counts=new Map(view.ownership.counts.map(r=>[r.owner,r.cells])),pools=new Map(),t=view.logicalTime??0;
 for(const b of view.balls.values()){let x=(Number(b.x0)+b.vx*t)/1024,y=(Number(b.y0)+b.vy*t)/1024;x=(Math.floor(x)%view.width+view.width)%view.width;y=(Math.floor(y)%view.height+view.height)%view.height;const label=view.owner(y*view.width+x);if(view.playerForTerritory(label)===b.owner)pools.set(label,(pools.get(label)??0)+1);}
 return [...view.cannons.values()].map(c=>{const label=view.owner(c.cell),l=view.playability.lifecycle.find(l=>l.cannon===c.id);return{id:c.id,area:counts.get(label)??0,balls:pools.get(label)??0,dormant:l?.deadline_ns!==undefined,deadline_ns:l?.deadline_ns};}).sort((a,b)=>b.area-a.area||a.id-b.id);}
