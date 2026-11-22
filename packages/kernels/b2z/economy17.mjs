import {DAY_NS,GRACE_NS} from '../../protocol/economy17.generated.mjs';
import {U64_MAX} from '../../protocol/economy17.mjs';

const isHash=value=>typeof value==='string'&&/^[0-9a-f]{64}$/.test(value);
const isNs=value=>typeof value==='bigint'&&value>=0n&&value<=U64_MAX;
const isCount=value=>Number.isSafeInteger(value)&&value>=0&&value<=1_000_000;
const boundaryAt=ns=>ns/DAY_NS*DAY_NS;
const exactKeys=(value,keys)=>value&&Object.keys(value).sort().join(',')===keys;

export const participatingPlayers=world=>new Set(world.cannons.map(cannon=>cannon.account)).size;

export function validateEconomy(world){
  if(world.version!==9&&world.version!==10){
    if(world.economy!==undefined)throw Error('economy schema');
    return;
  }
  const schedule=world.economy,commit=world.playability?.elapsed_ns;
  if(!exactKeys(schedule,'activated_ns,initial_multiplier,population,predecessor_state_hash,snapshots')||
     !isNs(commit)||!isNs(schedule.activated_ns)||schedule.activated_ns>commit||!isHash(schedule.predecessor_state_hash)||
     !isCount(schedule.population)||schedule.initial_multiplier!==Math.max(1,schedule.population)||!Array.isArray(schedule.snapshots))throw Error('ECONOMY_BOOTSTRAP');
  let previous=boundaryAt(schedule.activated_ns),announcement=schedule.activated_ns,multiplier=schedule.initial_multiplier;
  for(const item of schedule.snapshots){
    if(!exactKeys(item,'announced_ns,boundary_ns,effective_ns,first_boundary_ns,grace_end_ns,multiplier,population,predecessor_commit_ns,predecessor_state_hash,previous_multiplier')||
       ![item.first_boundary_ns,item.boundary_ns,item.announced_ns,item.effective_ns,item.predecessor_commit_ns,item.grace_end_ns].every(isNs)||
       item.first_boundary_ns!==previous+DAY_NS||item.boundary_ns<item.first_boundary_ns||item.boundary_ns%DAY_NS!==0n||
       item.predecessor_commit_ns<announcement||item.predecessor_commit_ns>=item.first_boundary_ns||
       item.announced_ns<item.boundary_ns||item.announced_ns>commit||
       item.effective_ns!==item.boundary_ns+DAY_NS||item.announced_ns>=item.effective_ns||item.grace_end_ns!==item.effective_ns+GRACE_NS||
       !isCount(item.population)||item.multiplier!==Math.max(1,item.population)||item.previous_multiplier!==multiplier||!isHash(item.predecessor_state_hash))throw Error('ECONOMY_SNAPSHOT');
    previous=item.boundary_ns;
    announcement=item.announced_ns;
    multiplier=item.multiplier;
  }
  if(boundaryAt(commit)!==previous)throw Error('ECONOMY_UNRECORDED_BOUNDARY');
}

export function economyAt(schedule,time){
  let lo=0,hi=schedule.snapshots.length;
  while(lo<hi){
    const mid=lo+Math.floor((hi-lo)/2);
    if(schedule.snapshots[mid].effective_ns<=time)lo=mid+1;
    else hi=mid;
  }
  const active=schedule.snapshots[lo-1],next=schedule.snapshots[lo];
  return {current:active?.multiplier??schedule.initial_multiplier,
    previous:active&&time<active.grace_end_ns&&active.previous_multiplier!==active.multiplier?active.previous_multiplier:null,
    active,next};
}

export function observeEconomy(schedule,predecessorNs,observedNs,population,predecessorHash){
  if(observedNs<predecessorNs)throw Error('ECONOMY_TIME_ROLLBACK');
  const first=boundaryAt(predecessorNs)+DAY_NS,boundary=boundaryAt(observedNs);
  if(first>boundary)return null;
  const effective=boundary+DAY_NS,grace=effective+GRACE_NS;
  if(!isNs(grace))throw Error('ECONOMY_TIMESTAMP_OVERFLOW');
  const snapshot={first_boundary_ns:first,boundary_ns:boundary,population,multiplier:Math.max(1,population),
    previous_multiplier:economyAt(schedule,observedNs).current,announced_ns:observedNs,effective_ns:effective,grace_end_ns:grace,
    predecessor_commit_ns:predecessorNs,predecessor_state_hash:predecessorHash};
  schedule.snapshots.push(snapshot);
  return snapshot;
}

export function migrateEconomy(old,observedNs,predecessorStateHash){
  if(old.version!==8)throw Error('ECONOMY_PREDECESSOR');
  if(!isNs(observedNs)||observedNs<old.playability.elapsed_ns)throw Error('ECONOMY_TIME_ROLLBACK');
  const next=structuredClone(old),population=participatingPlayers(old);
  next.version=9;
  next.playability.elapsed_ns=observedNs;
  next.economy={activated_ns:observedNs,population,initial_multiplier:Math.max(1,population),
    predecessor_state_hash:predecessorStateHash,snapshots:[]};
  validateEconomy(next);
  return next;
}
