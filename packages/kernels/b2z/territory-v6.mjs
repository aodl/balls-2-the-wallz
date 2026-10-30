/** Connected-island labels; funding players own balls independently of cannons. */
import{ownerAt,setOwner,clearOwner,neighbors}from'./world.mjs';import{markDormant}from'./playability.mjs';
export function territoryPlayer(w,id){return id===0?0:w.playability?.territories.find(r=>r.id===id)?.player;}
export function territoryForCannon(w,id){const c=w.cannons.find(c=>c.id===id);return c?ownerAt(w,c.cell):undefined;}
export function territoryBalls(w,id){const owner=territoryPlayer(w,id);return w.balls.filter(b=>b.owner===owner&&ownerAt(w,b.cell)===id).length;}
export function allocateTerritory(w,player){const s=w.playability;if(!s.players.some(p=>p.id===player))throw Error('UNKNOWN_PLAYER');const id=s.next_territory_id;if(!id||id>=4294967295)throw Error('TERRITORY_ID_EXHAUSTED');s.next_territory_id++;s.territories.push({id,player});return id;}
export function relabelTerritory(w,from,to){
 if(!from||from===to)throw Error('TERRITORY_RELABEL');const o=w.ownership;o.base=o.base.map(id=>id===from?to:id);const changes=[];
 for(const old of o.overrides){const r={...old,owner:old.owner===from?to:old.owner},last=changes.at(-1);if(last&&last.end===r.start&&last.owner===r.owner)last.end=r.end;else changes.push(r);}o.overrides=changes;
 const counts=new Map();for(const r of o.counts){const id=r.owner===from?to:r.owner;if(id)counts.set(id,(counts.get(id)??0)+r.cells);}o.counts=[...counts].sort((a,b)=>a[0]-b[0]).map(([owner,cells])=>({owner,cells}));
}
export function mergeTerritories(w,ids){ids=[...new Set(ids)].sort((a,b)=>a-b);if(!ids.length)throw Error('EMPTY_TERRITORY_MERGE');const id=ids[0],owner=territoryPlayer(w,id);if(owner===undefined||ids.some(id=>territoryPlayer(w,id)!==owner))throw Error('HOSTILE_TERRITORY_MERGE');for(const other of ids)if(other!==id)relabelTerritory(w,other,id);w.playability.territories=w.playability.territories.filter(r=>r.id===id||!ids.includes(r.id));return id;}
export function regroupMarkers(w,id){
 if(territoryBalls(w,id))throw Error('TERRITORY_HAS_BALLS');const owner=territoryPlayer(w,id);if(owner===undefined)throw Error('UNKNOWN_TERRITORY');const anchors=w.cannons.filter(c=>ownerAt(w,c.cell)===id);
 if((w.ownership.counts.find(r=>r.owner===id)?.cells??0)!==anchors.length)throw Error('EMPTY_TERRITORY_NOT_PRUNED');
 const seen=new Set(),groups=[];for(const c of anchors){if(seen.has(c.cell))continue;seen.add(c.cell);const queue=[c.cell];for(let head=0;head<queue.length;head++)for(const n of neighbors(queue[head],w.width,w.height,true))if(anchors.some(c=>c.cell===n)&&!seen.has(n)){seen.add(n);queue.push(n);}groups.push(queue);}
 if(w.playability.next_territory_id+Math.max(0,groups.length-1)>4294967295)throw Error('TERRITORY_ID_EXHAUSTED');if(!groups.length){w.playability.territories=w.playability.territories.filter(r=>r.id!==id);return;}
 groups.forEach((cells,i)=>{const label=i?allocateTerritory(w,owner):id;for(const cell of cells)setOwner(w,cell,label);});
}
/** Mutates a private proposal; the enclosing kernel commits it atomically. */
export function pruneEmptyTerritory(w,id){if(territoryBalls(w,id))throw Error('TERRITORY_HAS_BALLS');const cannons=w.cannons.filter(c=>ownerAt(w,c.cell)===id),fences=[];for(const c of cannons){const f=markDormant(w,c.id);if(f)fences.push(f);}clearOwner(w,id);for(const c of cannons)setOwner(w,c.cell,id);regroupMarkers(w,id);return fences;}
