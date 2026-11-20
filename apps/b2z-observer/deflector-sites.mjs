/** Cached local proposals from authenticated state, never gameplay execution. */
import{deflectorSupported}from'./deflector-policy.mjs';
import{hasEnemyClearance}from'../../packages/protocol/territory-clearance.mjs';
import{islandAt,playerAt}from'./action-quote-v6.mjs';
const caches=new WeakMap();
export function deflectorSites(w,config,account){
 let entries=caches.get(w);if(!entries){entries=[];caches.set(w,entries);}const cached=entries.find(e=>e.config===config&&e.account===account);if(cached)return cached.result;
 const player=w.playability?.players.find(p=>p.account===account)?.id,ds=w.deflectors??[],active=new Set(w.balls.filter(b=>b.owner===player).map(b=>islandAt(w,b.cell)));
 let reason=!deflectorSupported(config)||w.version!==7?'Unsupported rules':player===undefined?'Choose a sending account':ds.length>=config.max_deflectors?'Diverter capacity reached':ds.filter(d=>d.owner===player).length>=config.max_deflectors_per_player?'Your Diverter capacity is reached':w.next_deflector_id===4294967295?'Diverter identifiers exhausted':!active.size?'Revive an island before building':'';
 const separated=new Set();
 const blocked=new Set([...w.cannons.map(c=>c.cell),...ds.map(d=>d.cell)]),wrap=(x,y)=>((y%1000+1000)%1000)*1000+(x%1000+1000)%1000;
 for(const d of ds)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)separated.add(wrap(d.cell%1000+dx,Math.floor(d.cell/1000)+dy));
 for(const b of w.balls){
  const den=b.den??1n,[n,t]=w.time,unit=1024n*t*den,axis=(a,v)=>{const q=a*t+BigInt(v)*n*den,raw=q/unit,cell=Number((raw%1000n+1000n)%1000n);return q%unit===0n?[cell,(cell+999)%1000]:[cell];};
  for(const x of axis(b.x0,b.vx))for(const y of axis(b.y0,b.vy))blocked.add(wrap(x,y));
 }
 const result={available:!reason,reason,test(cell){return !reason&&Number.isSafeInteger(cell)&&cell>=0&&cell<1000000&&!blocked.has(cell)&&!separated.has(cell)&&active.has(islandAt(w,cell))&&playerAt(w,cell)===player&&hasEnemyClearance(1000,1000,cell,player,c=>playerAt(w,c));}};
 entries.push({config,account,result});if(entries.length>8)entries.shift();return result;
}
