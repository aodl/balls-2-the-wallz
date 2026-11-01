import {cellCount,clearOwner,neighbors,ownerAt,setOwner,setOwnerRange} from './world.mjs';
const has=(ranges,cell)=>{let low=0,high=ranges.length;while(low<high){const mid=(low+high)>>1,r=ranges[mid];if(cell<r[0])high=mid;else if(cell>=r[1])low=mid+1;else return true;}return false;};
const insertion=(ranges,cell)=>{let low=0,high=ranges.length;while(low<high){const mid=(low+high)>>1;if(ranges[mid][1]<=cell)low=mid+1;else high=mid;}return low;};
const add=(ranges,cell)=>{const at=insertion(ranges,cell);if(at<ranges.length&&ranges[at][0]<=cell&&cell<ranges[at][1])return;const left=at>0&&ranges[at-1][1]===cell,right=at<ranges.length&&ranges[at][0]===cell+1;if(left&&right){ranges[at-1][1]=ranges[at][1];ranges.splice(at,1);}else if(left)ranges[at-1][1]++;else if(right)ranges[at][0]=cell;else ranges.splice(at,0,[cell,cell+1]);};
const addRange=(ranges,change)=>{let at=insertion(ranges,change[0]);if(at&&ranges[at-1][1]===change[0])at--;while(at<ranges.length&&ranges[at][0]<=change[1]){change=[Math.min(change[0],ranges[at][0]),Math.max(change[1],ranges[at][1])];ranges.splice(at,1);}ranges.splice(at,0,change);};
/** All scratch is plain canonical data. A work unit scans one vertex, board cell, or ball. */
export function beginCapture(world, target, attacker, optimized = true) {
  if (!world.cannons.some(c => c.id === attacker) || target < 0 || target >= cellCount(world)
      || !Number.isInteger(target) || ownerAt(world,target) === attacker || world.cannons.some(c => c.cell === target))
    throw new Error('invalid capture');
  if (!neighbors(target, world.width, world.height,world.version>=4).some(n => ownerAt(world,n) === attacker)) throw new Error('disconnected attack');
  const defender = ownerAt(world,target), anchor = world.cannons.find(c => c.id === defender)?.cell;
  const seeds=neighbors(target,world.width,world.height,world.version>=4).filter(n=>ownerAt(world,n)===defender);
  const mustSearch = defender && (!optimized || seeds.length > 1),v5=world.version===5;
  const job = {phase: mustSearch ? v5?'v5_component':'flood' : 'balls', defender, attacker, target, queue: [], head: 0,
    seen: v5?[]:Array(cellCount(world)).fill(false), scan: 0, cells: [target], killed: [], survivors: [], eliminated: [],
    ...(v5?{seeds,visited_ranges:[],pending_ranges:[],component_ranges:[],changed_ranges:[[target,target+1]],...(anchor===undefined?{}:{defender_anchor:anchor})}: {})};
  setOwner(world,target,attacker);
  if (mustSearch&&!v5) { job.queue.push(anchor); job.seen[anchor] = true; }
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
  if(job.phase==='v5_component'){
    const seed=job.seeds.find(cell=>!has(job.visited_ranges,cell));
    if(seed===undefined){job.phase='balls';job.scan=0;}
    else{job.component_ranges=[];add(job.visited_ranges,seed);add(job.component_ranges,seed);job.queue=[seed];job.head=0;job.phase='v5_flood';}
  } else if(job.phase==='v5_flood'){
    const cell=job.head<job.queue.length?job.queue[job.head++]:null;
    if(cell!==null){for(const neighbor of neighbors(cell,world.width,world.height,true))if(ownerAt(world,neighbor)===job.defender&&!has(job.visited_ranges,neighbor)){add(job.visited_ranges,neighbor);add(job.component_ranges,neighbor);job.queue.push(neighbor);}
      if(job.seeds.every(seed=>has(job.component_ranges,seed))){job.queue=[];job.head=0;job.component_ranges=[];job.phase='balls';job.scan=0;}else if(job.head>=4096){job.queue.splice(0,job.head);job.head=0;}}
    else if(job.defender_anchor!==undefined&&has(job.component_ranges,job.defender_anchor)){job.component_ranges=[];job.phase='v5_component';}
    else job.phase='v5_transfer';
  } else if(job.phase==='v5_transfer'){
    const range=job.component_ranges.shift();if(!range)job.phase='v5_component';else{setOwnerRange(world,range[0],range[1],job.defender,job.attacker);addRange(job.changed_ranges,range);}
  } else if (job.phase === 'flood') {
    if (job.head < job.queue.length) {
      const cell = job.queue[job.head++];
      for (const n of neighbors(cell, world.width, world.height,world.version>=4))
        if (ownerAt(world,n) === job.defender && !job.seen[n]) { job.seen[n] = true; job.queue.push(n); }
    } else { job.phase = 'transfer'; job.scan = 0; }
  } else if (job.phase === 'transfer') {
    if (job.scan < cellCount(world)) {
      const cell = job.scan++;
      if (ownerAt(world,cell) === job.defender && !job.seen[cell]) { setOwner(world,cell,job.attacker); job.cells.push(cell); }
    } else { job.phase = 'balls'; job.scan = 0; }
  } else if (job.phase === 'balls') {
    if (job.scan < world.balls.length) {
      const b = world.balls[job.scan++];
      if (ownerAt(world,b.cell) !== b.owner) job.killed.push(b.id); else job.survivors.push(b);
    } else {
      world.balls = job.survivors;
      if (world.pending) world.pending = world.pending.filter(p => world.balls.some(b => b.id === p.ball));
      job.eliminated = world.cannons.filter(c => !world.balls.some(b => b.owner === c.id)).map(c => c.id);
      job.phase = 'neutral'; job.scan = 0;
    }
  } else if (job.phase === 'neutral') {
    if(world.version===5){if(job.scan<job.eliminated.length)clearOwner(world,job.eliminated[job.scan++]);else{world.cannons=world.cannons.filter(c=>!job.eliminated.includes(c.id));job.phase='done';}return job.phase==='done';}
    if (job.scan < cellCount(world)) {
      const cell = job.scan++;
      if (job.eliminated.includes(ownerAt(world,cell))) setOwner(world,cell,0);
    } else { world.cannons = world.cannons.filter(c => !job.eliminated.includes(c.id)); job.phase = 'done'; }
  } else throw new Error('unknown topology phase');
  return job.phase === 'done';
}
