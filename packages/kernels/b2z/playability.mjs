import{pruneEmptyTerritory,territoryBalls,territoryPlayer}from'./territory-v6.mjs';
/** Rules-v6 state/time helpers. Every clock value is supplied explicitly. */
import {cloneCanonical} from '../../../node_modules/@dtr/timeline-runtime/packages/runtime/canonical.mjs';
import {validateWorld,ownerAt,playerAt,ownershipCounts,territoryBallCount} from './world.mjs';
import {V6_POLICY} from './playability.generated.mjs';
export {V6_POLICY};
const MAX_U32=4294967295,MAX_U64=18446744073709551615n;
function integer(n,min=0,max=MAX_U32){if(!Number.isInteger(n)||n<min||n>max)throw Error('PLAYER_IDENTITY');return n;}
export function elapsed(n){if(typeof n!=='bigint'||n<0n||n>MAX_U64)throw Error('LIFECYCLE_TIME_BOUNDS');return n;}
function deadline(n){const d=elapsed(n)+V6_POLICY.dormancy_grace_ns;if(d>MAX_U64)throw Error('LIFECYCLE_TIME_OVERFLOW');return d;}
function ordered(xs,key){return xs.every((x,i)=>integer(x[key],1,MAX_U32-1)&&(!i||xs[i-1][key]<x[key]));}
function find(xs,id,key){let lo=0,hi=xs.length;while(lo<hi){const m=(lo+hi)>>1;if(xs[m][key]<id)lo=m+1;else hi=m;}return xs[lo]?.[key]===id?xs[lo]:undefined;}
export const life=(w,id)=>find(w.playability?.lifecycle??[],id,'cannon');
export const player=(w,id)=>find(w.playability?.players??[],id,'id');
export function playerForCannon(w,id){return w.version===6?life(w,id)?.player:w.cannons.find(c=>c.id===id)?.id;}
export function accountForPlayer(w,id){return w.version===6?player(w,id)?.account:w.cannons.find(c=>c.id===id)?.account;}
export function validatePlayability(w){
 const s=w.playability;if(!s||Object.keys(s).sort().join(',')!=='elapsed_ns,lifecycle,next_player_id,next_territory_id,players,territories')throw Error('PLAYER_IDENTITY');elapsed(s.elapsed_ns);
 if(!Array.isArray(s.players)||s.players.length>V6_POLICY.max_players||!ordered(s.players,'id')||!Array.isArray(s.lifecycle)||s.lifecycle.length!==w.cannons.length)throw Error('PLAYER_IDENTITY');
 integer(s.next_player_id,(s.players.at(-1)?.id??0)+1);const accounts=new Set(),retained=new Map(),anchors=new Map(),pools=new Map();
 for(const p of s.players){if(Object.keys(p).sort().join(',')!=='account,id'||!/^[0-9a-f]{64}$/.test(p.account))throw Error('PLAYER_IDENTITY');if(accounts.has(p.account))throw Error('PLAYER_ACCOUNT_CONFLICT');accounts.add(p.account);}
 if(!Array.isArray(s.territories)||s.territories.length>V6_POLICY.max_cannons||!ordered(s.territories,'id')||s.territories.some(r=>Object.keys(r).sort().join(',')!=='id,player'||!player(w,r.player)))throw Error('TERRITORY_IDENTITY');integer(s.next_territory_id,(s.territories.at(-1)?.id??0)+1);
 for(const b of w.balls){const id=ownerAt(w,b.cell);pools.set(id,(pools.get(id)??0)+1);}
 for(let i=0;i<w.cannons.length;i++){
  const c=w.cannons[i],l=s.lifecycle[i],p=player(w,l.player),id=ownerAt(w,c.cell),keys=Object.keys(l).sort().join(',');if(!['cannon,generation,player','cannon,deadline_ns,dormant_since_ns,generation,player'].includes(keys))throw Error('CANNON_LIFECYCLE');integer(l.generation,1);
  if(l.cannon!==c.id||!p||p.account!==c.account||playerAt(w,c.cell)!==l.player)throw Error('CANNON_PLAYER_BINDING');retained.set(l.player,(retained.get(l.player)??0)+1);if(retained.get(l.player)>V6_POLICY.max_retained_per_player)throw Error('PLAYER_CANNON_CAPACITY');anchors.set(id,(anchors.get(id)??0)+1);
  if(pools.get(id)){if(l.dormant_since_ns!==undefined||l.deadline_ns!==undefined)throw Error('CANNON_LIFECYCLE');}
  else if(l.dormant_since_ns===undefined||l.deadline_ns===undefined||elapsed(l.dormant_since_ns)>s.elapsed_ns||elapsed(l.deadline_ns)!==deadline(l.dormant_since_ns))throw Error('CANNON_LIFECYCLE');
 }
 const areas=ownershipCounts(w);for(const r of s.territories){const count=anchors.get(r.id)??0;if(!count)throw Error('TERRITORY_WITHOUT_CANNON');if(!pools.get(r.id)&&(areas.find(([id])=>id===r.id)?.[1]??0)!==count)throw Error('DORMANT_TERRITORY_RETAINED');}
 return w;
}
export function migratePlayability(w,observedNs){
 validateWorld(w);elapsed(observedNs);if(w.version!==5||w.playability!==undefined)throw Error('EXPECTED_V5_PREDECESSOR');
 const next=cloneCanonical(w);next.version=6;next.playability={elapsed_ns:observedNs,next_player_id:w.next_cannon_id,next_territory_id:w.next_cannon_id,territories:w.cannons.map(c=>({id:c.id,player:c.id})),
  players:w.cannons.map(c=>({id:c.id,account:c.account})),lifecycle:w.cannons.map(c=>({cannon:c.id,player:c.id,generation:1}))};
 return validateWorld(next);
}
export function markDormant(w,cannon){
 if(territoryBallCount(w,cannon)>0)throw Error('CANNON_HAS_BALLS');const s=w.playability,l=life(w,cannon);if(!s||!l)throw Error('UNKNOWN_CANNON');
 if(l.deadline_ns!==undefined)return null;if(l.generation===MAX_U32)throw Error('LIFECYCLE_GENERATION_EXHAUSTED');
 const d=deadline(s.elapsed_ns);l.generation++;l.dormant_since_ns=s.elapsed_ns;l.deadline_ns=d;return {cannon,generation:l.generation,deadline_ns:d};
}
export function revive(w,cannon){
 if(territoryBallCount(w,cannon)===0)throw Error('REVIVAL_REQUIRES_PAID_BALL');const l=life(w,cannon);if(!l)throw Error('UNKNOWN_CANNON');
 if(l.deadline_ns===undefined)return false;if(l.generation===MAX_U32)throw Error('LIFECYCLE_GENERATION_EXHAUSTED');l.generation++;delete l.deadline_ns;delete l.dormant_since_ns;return true;
}
export function finalizeElapsed(w,observedNs,pending){
 const unique=new Set();if(pending.length>V6_POLICY.max_cannons||pending.some(f=>{const key=f.cannon+'/'+f.generation;if(unique.has(key))return true;unique.add(key);return false;}))throw Error('LIFECYCLE_FENCE_DUPLICATE');
 if(elapsed(observedNs)<elapsed(w.playability.elapsed_ns))throw Error('LIFECYCLE_TIME_ROLLBACK');const d=deadline(observedNs),s=cloneCanonical(w.playability),stamped=[];
 for(const f of pending){const l=find(s.lifecycle,f.cannon,'cannon');if(l&&l.generation===f.generation&&l.deadline_ns===f.deadline_ns){l.dormant_since_ns=observedNs;l.deadline_ns=d;stamped.push({cannon:l.cannon,generation:l.generation,deadline_ns:d});}}
 s.elapsed_ns=observedNs;w.playability=s;return stamped;
}
export function dueFences(w,observedNs){
 elapsed(observedNs);return w.playability.lifecycle.filter(l=>l.deadline_ns!==undefined&&l.deadline_ns<=observedNs).map(l=>({cannon:l.cannon,generation:l.generation,deadline_ns:l.deadline_ns})).sort((a,b)=>a.deadline_ns<b.deadline_ns?-1:a.deadline_ns>b.deadline_ns?1:a.cannon-b.cannon||a.generation-b.generation);
}
export function clearUnsupportedPlayer(w,id){
 if(!player(w,id))throw Error('UNKNOWN_PLAYER');if(w.balls.some(b=>b.owner===id))return false;
 for(const r of [...w.playability.territories].filter(r=>r.player===id))pruneEmptyTerritory(w,r.id);return true;
}
export function scoreAreas(w){if(w.version<6)return ownershipCounts(w);const out=new Map();for(const[id,n]of ownershipCounts(w))if(territoryBalls(w,id)){const player=territoryPlayer(w,id);out.set(player,(out.get(player)??0)+n);}return [...out].sort((a,b)=>a[0]-b[0]);}
export function reviveTerritory(w,id){const out=[];for(const c of w.cannons.filter(c=>ownerAt(w,c.cell)===id))if(revive(w,c.id))out.push(c.id);return out;}
