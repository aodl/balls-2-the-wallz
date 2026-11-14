import {cellDistance} from '../../packages/protocol/territory-clearance.mjs';
/** Exact increasing toroidal Chebyshev rings. Deduplication is bounded to one ring. */
function* rings(width,height,source){
 const sx=source%width,sy=Math.floor(source/width),cell=(x,y)=>((y%height+height)%height)*width+(x%width+width)%width;
 for(let d=1;d<=Math.max(Math.floor(width/2),Math.floor(height/2));d++){
  const seen=new Set();
  for(let x=-d;x<=d;x++)for(const y of [-d,d])seen.add(cell(sx+x,sy+y));
  for(let y=-d+1;y<d;y++)for(const x of [-d,d])seen.add(cell(sx+x,sy+y));
  for(const c of seen)if(cellDistance(source,c,width,height)===d)yield c;
  yield null;
 }
}
/** Exhaustive, cancellable and cooperatively scheduled; nearest proposals resolve first. */
export function nearestDestination({width,height,source,legal,schedule=fn=>setTimeout(fn,0),chunk=2048}){
 let best=null,cancelled=false,resolve;const iterator=rings(width,height,source),promise=new Promise(r=>resolve=r),stats={tested:0,chunks:0,maxChunkMs:0};
 const step=()=>{if(cancelled){resolve(null);return;}const start=performance.now(),finish=value=>{stats.maxChunkMs=Math.max(stats.maxChunkMs,performance.now()-start);resolve(value);};stats.chunks++;
 for(let i=0;i<chunk;i++){
  const next=iterator.next();if(next.done){finish(best);return;}
  if(next.value===null){if(best!==null){finish(best);return;}}
  else{stats.tested++;if((best===null||next.value<best)&&legal(next.value))best=next.value;}
  if((i&31)===31&&performance.now()-start>=4)break;
 }
 stats.maxChunkMs=Math.max(stats.maxChunkMs,performance.now()-start);schedule(step);};schedule(step);
 return{promise,stats,cancel(){cancelled=true;}};
}

/** One selected-world eligibility cache, two bits/cell (250kB at one million).
 * This stores legality, not a redundant ownership atlas; it is discarded on identity change. */
export function destinationLegality(width,height,legal){
 const bits=new Uint8Array(Math.ceil(width*height/4));let inspected=0;
 return{bytes:bits.byteLength,test(cell){if(!Number.isSafeInteger(cell)||cell<0||cell>=width*height)return false;const at=cell>>2,shift=(cell&3)*2,value=(bits[at]>>shift)&3;if(value)return value===2;inspected++;const allowed=Boolean(legal(cell));bits[at]|=(allowed?2:1)<<shift;return allowed;},inspected:()=>inspected};
}

/** Exact equality of all Move-relevant verified facts permits reuse across heads
 * whose only changes are motion/time. Financial references still use the latest head. */
export function moveLegalityIdentity(w,config,account,cannon,dormant=false){return JSON.stringify([
 w.version,w.width,w.height,account,cannon,dormant,
 w.version>=5?w.ownership:w.cells,
 w.cannons.map(c=>[c.id,c.cell,c.account]),
 w.playability?.territories??null,w.playability?.lifecycle.map(l=>[l.cannon,l.player,l.deadline_ns!==undefined])??null,
 config?.rules_version,config?.enemy_territory_min_chebyshev,config?.enemy_clearance_actions
]);}
