/** Convenience estimates from a verified snapshot. Payments alone confer authority.
 * The authoritative interpreter rechecks the real sender and current state. */
import {cannonReference} from './play-reference.mjs';
import {ballPrice,cannonPrice,sequentialCost,newCannonCost} from '../../packages/kernels/b2z/pricing-v6.mjs';
import {encodeV6Memo,parseV6TextMemo} from '../../packages/protocol/memo-v6.mjs';
const check=(ok,code)=>{if(!ok)throw Error(code);};
const integer=(n,max)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
export function islandAt(w,cell){check(integer(cell,999999),'CELL_BOUNDS');let low=0,high=w.ownership.overrides.length;while(low<high){const mid=(low+high)>>1;if(w.ownership.overrides[mid].start<=cell)low=mid+1;else high=mid;}if(low&&cell<w.ownership.overrides[low-1].end)return w.ownership.overrides[low-1].owner;return w.ownership.base[Math.floor(Math.floor(cell/1000)*32/1000)*32+Math.floor((cell%1000)*32/1000)];}
const playerAt=(w,cell)=>w.playability.territories.find(r=>r.id===islandAt(w,cell))?.player??0;
const adjacent=cell=>{const x=cell%1000,y=Math.floor(cell/1000);return[((y+999)%1000)*1000+x,y*1000+(x+999)%1000,y*1000+(x+1)%1000,((y+1)%1000)*1000+x];};
export function legalAdjacentSites(w,account){
 check(w.version===6,'EXPECTED_V6');const player=w.playability.players.find(p=>p.account===account)?.id;if(player===undefined)return[];
 const pool=new Set(w.balls.filter(b=>b.owner===player).map(b=>islandAt(w,b.cell))),candidates=new Set(w.cannons.filter(c=>c.account===account&&pool.has(islandAt(w,c.cell))).flatMap(c=>adjacent(c.cell))),blocked=new Set(w.cannons.map(c=>c.cell));
 for(const b of w.balls){const [num,den]=w.time,axis=(intercept,velocity)=>{const v=intercept*den+BigInt(velocity)*num,unit=1024n*den,raw=v/unit,cell=Number((raw%1000n+1000n)%1000n);return v%unit===0n?[cell,(cell+999)%1000]:[cell];};for(const x of axis(b.x0,b.vx))for(const y of axis(b.y0,b.vy))blocked.add(y*1000+x);}
 return[...candidates].filter(c=>!blocked.has(c)&&(islandAt(w,c)===0||playerAt(w,c)===player)).sort((a,b)=>a-b);
}
export function legalMove(w,account,cannon,cell){
 if(w.version!==6||!integer(cell,999999))return false;const c=w.cannons.find(c=>c.id===cannon),life=w.playability.lifecycle.find(l=>l.cannon===cannon);
 if(c?.account!==account||!life||life.deadline_ns!==undefined||playerAt(w,cell)!==life.player||w.cannons.some(c=>c.id!==cannon&&c.cell===cell))return false;
 return islandAt(w,c.cell)===islandAt(w,cell)||w.cannons.filter(other=>islandAt(w,other.cell)===islandAt(w,c.cell)).length>1;
}
export function sitePool(w,account,cell){const player=w.playability.players.find(p=>p.account===account)?.id,labels=new Set([cell,...adjacent(cell)].filter(c=>playerAt(w,c)===player).map(c=>islandAt(w,c)));return w.balls.filter(b=>b.owner===player&&labels.has(islandAt(w,b.cell))).length;}
export function quoteV6(w,config,account,{kind,cannon,angle='0',quantity=1,cell=null}){
 check(w.version===6,'EXPECTED_V6');check(/^[0-9a-f]{64}$/.test(account),'ACCOUNT_BOUNDS');check(integer(quantity,64)&&quantity>=1,'QUANTITY_BOUNDS');
 const mine=w.cannons.filter(c=>c.account===account),free=config.max_balls-w.balls.length;let amount,fill,per_item=[],pool=0,text;
 if(kind==='fire'){
  const c=cannonReference(w,config).find(c=>c.id===cannon);check(c&&c.account===account,'NOT_OWNER');pool=c.balls;fill=Math.min(quantity,free,Math.max(0,config.max_purchase_balls_per_island-pool));check(fill>0,'BALL_CAPACITY');amount=sequentialCost(pool,fill);per_item=Array.from({length:fill},(_,i)=>ballPrice(pool+i));text=`FIRE ${cannon} ${angle} ${quantity}`;
 }else if(kind==='move'){
  check(legalMove(w,account,cannon,cell),'ILLEGAL_MOVE');amount=config.move_e8s;fill=1;per_item=[amount];text=`MOVE ${cannon} ${cell}`;
 }else if(kind==='new'){
  check(mine.length<config.max_retained_per_player,'PLAYER_CANNON_CAPACITY');check(w.cannons.length<config.max_cannons,'CANNON_CAPACITY');check(free>0,'BALL_CAPACITY');
  if(!mine.length)check(cell===null,'FIRST_PLACEMENT_AUTOMATIC');
  else{const sites=legalAdjacentSites(w,account).filter(c=>sitePool(w,account,c)<config.max_purchase_balls_per_island);check(sites.length>0,'NO_ADJACENT_SITE');if(cell!==null){check(sites.includes(cell),'ILLEGAL_ADJACENT_SITE');pool=sitePool(w,account,cell);}else{const counts=new Set(sites.map(c=>sitePool(w,account,c)));check(quantity===1||counts.size===1,'CHOOSE_SITE_FOR_EXACT_BATCH');pool=counts.size===1?[...counts][0]:null;}}
  // An automatic one-ball New has a site-independent cannon price. Its eventual
  // merged pool is deliberately unspecified when eligible sites differ.
  fill=Math.min(quantity,free,Math.max(0,config.max_purchase_balls_per_island-(pool??0)));check(fill>0,'BALL_CAPACITY');amount=newCannonCost(mine.length,fill,pool??0);per_item=[cannonPrice(mine.length),...Array.from({length:fill-1},(_,i)=>ballPrice(pool+1+i))];text=`NEW ${angle} ${quantity}${cell===null?'':` ${cell}`}`;
 }else throw Error('UNKNOWN_ACTION');
 const memo=encodeV6Memo(parseV6TextMemo(new TextEncoder().encode(text)));check(amount<=18446744073709551615n,'PRICE_OVERFLOW');
 return{amount,per_item,requested:kind==='move'?1:quantity,maximum_fill:fill,pool,cell,memo:text,memo_bytes:new TextEncoder().encode(text),numeric_memo_bytes:memo,non_reservation:true};
}
