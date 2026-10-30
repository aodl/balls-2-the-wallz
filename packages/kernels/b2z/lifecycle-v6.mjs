/** Explicit elapsed-time facts. No ambient clock, Ledger input or empty tick. */
import{encodeCanonical,cloneCanonical}from'@dtr/timeline-runtime/runtime/canonical';
import{sha256}from'@dtr/timeline-runtime/runtime/seal';
import{validateWorld,encodeWorld,ownerAt,setOwner,neighbors}from'./world.mjs';
import{elapsed,life,playerForCannon,V6_POLICY}from'./playability.mjs';
function supportedAnchor(w,cell,player){
 if(!w.balls.some(b=>playerForCannon(w,b.owner)===player))return false;
 const queue=[cell],seen=new Set(queue);
 for(let index=0;index<queue.length;index++)for(const n of neighbors(queue[index],w.width,w.height,true)){
  if(ownerAt(w,n)!==player)continue;const c=w.cannons.find(c=>c.cell===n);
  if(!c||w.balls.some(b=>b.owner===c.id))return true;
  if(!seen.has(n)){seen.add(n);queue.push(n);}
 }
 return false;
}
export function expireV6(w,observed_ns,fences){
 validateWorld(w);if(w.version!==6)throw Error('EXPECTED_V6');elapsed(observed_ns);
 if(observed_ns<w.playability.elapsed_ns)throw Error('LIFECYCLE_TIME_ROLLBACK');
 if(!Array.isArray(fences)||fences.length>V6_POLICY.max_cannons)throw Error('EXPIRY_CAPACITY');
 const seen=new Set(),due=[];let prior=null;
 for(const f of fences){
  const deadline=elapsed(f.deadline_ns),key=[deadline,BigInt(f.cannon),BigInt(f.generation)],id=`${f.cannon}/${f.generation}`;
  if(Object.keys(f).sort().join(',')!=='cannon,deadline_ns,generation'||!Number.isInteger(f.cannon)||f.cannon<1||f.cannon>=w.next_cannon_id||!Number.isInteger(f.generation)||f.generation<1||f.generation>4294967295||seen.has(id)||prior&&!(key[0]>prior[0]||key[0]===prior[0]&&(key[1]>prior[1]||key[1]===prior[1]&&key[2]>prior[2])))throw Error('EXPIRY_FENCE');
  seen.add(id);prior=key;const l=life(w,f.cannon);if(!l||f.generation<l.generation)continue;
  if(f.generation!==l.generation||f.deadline_ns!==l.deadline_ns)throw Error('EXPIRY_FENCE');if(deadline>observed_ns)throw Error('EXPIRY_NOT_DUE');due.push(f);
 }
 if(!due.length)return null;
 const context={domain:'B2Z-LIFECYCLE-CONTEXT-01',version:1,previous_state:sha256(encodeWorld(w)),observed_ns,fences:cloneCanonical(fences)},next=cloneCanonical(w);next.playability.elapsed_ns=observed_ns;
 const events=[{kind:'lifecycle_context',sequence:0,time:w.time,context}],expired=[];
 for(const f of due){const c=next.cannons.find(c=>c.id===f.cannon),player=playerForCannon(next,c.id);if(next.balls.some(b=>b.owner===c.id))throw Error('EXPIRY_REQUIRES_DORMANCY');
  const cell_retained=supportedAnchor(next,c.cell,player);if(!cell_retained)setOwner(next,c.cell,0);next.cannons=next.cannons.filter(c=>c.id!==f.cannon);next.playability.lifecycle=next.playability.lifecycle.filter(l=>l.cannon!==f.cannon);
  events.push({kind:'cannon_expired',sequence:events.length,time:w.time,cannon:c.id,cell:c.cell,player,generation:f.generation,deadline_ns:f.deadline_ns,observed_ns,cell_retained});expired.push(c.id);
 }
 return {metadata:encodeCanonical(context),expired,output:{state:encodeWorld(next),events:encodeCanonical({version:6,receipts:[],events}),scores:encodeCanonical({version:6,area_time:[]})}};
}
