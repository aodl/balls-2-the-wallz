import {contextSupported} from './context-policy.mjs';
import {contextSites} from './context-sites.mjs';
import {encodeContextMemo,parseContextText,screenDirection} from '../../packages/protocol/context-structures.mjs';
import{deflectorSites}from'./deflector-sites.mjs';
import{deflectorSupported,orientationFromDegrees}from'./deflector-policy.mjs';
import{encodeDeflectorMemo}from'../../packages/protocol/deflector.mjs';
import {hasEnemyClearance,clearanceActive} from '../../packages/protocol/territory-clearance.mjs';
/** Convenience estimates from a verified snapshot. Payments alone confer authority.
 * The authoritative interpreter rechecks the real sender and current state. */
import {cannonReference} from './play-reference.mjs';
import {ballPrice,cannonPrice,sequentialCost,newCannonCost} from '../../packages/kernels/b2z/pricing-v6.mjs';
import {encodeV6Memo,parseV6TextMemo} from '../../packages/protocol/memo-v6.mjs';
const check=(ok,code)=>{if(!ok)throw Error(code);};
const integer=(n,max)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
export function islandAt(w,cell){check(integer(cell,999999),'CELL_BOUNDS');let low=0,high=w.ownership.overrides.length;while(low<high){const mid=(low+high)>>1;if(w.ownership.overrides[mid].start<=cell)low=mid+1;else high=mid;}if(low&&cell<w.ownership.overrides[low-1].end)return w.ownership.overrides[low-1].owner;return w.ownership.base[Math.floor(Math.floor(cell/1000)*32/1000)*32+Math.floor((cell%1000)*32/1000)];}
export const playerAt=(w,cell)=>w.playability.territories.find(r=>r.id===islandAt(w,cell))?.player??0;
const adjacent=cell=>{const x=cell%1000,y=Math.floor(cell/1000);return[((y+999)%1000)*1000+x,y*1000+(x+999)%1000,y*1000+(x+1)%1000,((y+1)%1000)*1000+x];};
export function legalAdjacentSites(w,account,config=null){
 check(w.version>=6,'EXPECTED_V6');const player=w.playability.players.find(p=>p.account===account)?.id;if(player===undefined)return[];
 const pool=new Set(w.balls.filter(b=>b.owner===player).map(b=>islandAt(w,b.cell))),candidates=new Set(w.cannons.filter(c=>c.account===account&&pool.has(islandAt(w,c.cell))).flatMap(c=>adjacent(c.cell))),blocked=new Set([...w.cannons.map(c=>c.cell),...(w.deflectors??[]).map(d=>d.cell)]);
 for(const b of w.balls){const [num,den]=w.time,axis=(intercept,velocity)=>{const scale=b.den??1n,v=intercept*den+BigInt(velocity)*num*scale,unit=1024n*den*scale,raw=v/unit,cell=Number((raw%1000n+1000n)%1000n);return v%unit===0n?[cell,(cell+999)%1000]:[cell];};for(const x of axis(b.x0,b.vx))for(const y of axis(b.y0,b.vy))blocked.add(y*1000+x);}
 return[...candidates].filter(c=>!blocked.has(c)&&(islandAt(w,c)===0||playerAt(w,c)===player)&&(!clearanceActive(config)||hasEnemyClearance(w.width,w.height,c,player,n=>playerAt(w,n)))).sort((a,b)=>a-b);
}
export function legalMove(w,account,cannon,cell,config=null){
 if(![6,7].includes(w.version)||!integer(cell,999999))return false;const c=w.cannons.find(c=>c.id===cannon),life=w.playability.lifecycle.find(l=>l.cannon===cannon);
 if(c?.account!==account||!life||life.deadline_ns!==undefined||playerAt(w,cell)!==life.player||w.cannons.some(c=>c.id!==cannon&&c.cell===cell)||(w.deflectors??[]).some(d=>d.cell===cell))return false;
 if(contextSupported(config)&&(c.cell===cell||contextSites(w).reason(account,cell,{moving:{kind:'cannon',id:cannon}})))return false;
 return (!clearanceActive(config)||hasEnemyClearance(w.width,w.height,cell,life.player,n=>playerAt(w,n)))&&(islandAt(w,c.cell)===islandAt(w,cell)||w.cannons.filter(other=>islandAt(w,other.cell)===islandAt(w,c.cell)).length>1);
}
export function sitePool(w,account,cell){const player=w.playability.players.find(p=>p.account===account)?.id,labels=new Set([cell,...adjacent(cell)].filter(c=>playerAt(w,c)===player).map(c=>islandAt(w,c)));return w.balls.filter(b=>b.owner===player&&labels.has(islandAt(w,b.cell))).length;}
export function quoteV6(w,config,account,{kind,cannon,deflector,angle='0',quantity=1,cell=null}){
 check(w.version>=6,'EXPECTED_V6');check(/^[0-9a-f]{64}$/.test(account),'ACCOUNT_BOUNDS');check(integer(quantity,64)&&quantity>=1,'QUANTITY_BOUNDS');
 const mine=w.cannons.filter(c=>c.account===account),free=config.max_balls-w.balls.length;let amount,fill,per_item=[],pool=0,text;
 const successor=contextSupported(config);
 if(successor&&['deflector_move','deflector_reorient'].includes(kind)){
  const d=w.deflectors.find(d=>d.id===deflector);
  check(d,'NO_DEFLECTOR');check(d.owner===contextSites(w).owner(account),'NOT_OWNER');
  if(kind==='deflector_move'){
   check(cell!==d.cell,'SAME_LOCATION');
   const why=contextSites(w).reason(account,cell,{moving:{kind:'deflector',id:deflector},deflector:true});check(!why,why);
   amount=BigInt(config.deflector_move_e8s);text=`DMOVE ${deflector} ${cell}`;
  }else{
   const next=orientationFromDegrees(angle);check(next!==d.orientation,'SAME_ORIENTATION');
   amount=BigInt(config.deflector_reorient_e8s);text=`DROT ${deflector} ${screenDirection(next)}`;
  }
  fill=1;per_item=[amount];
 }else if(kind==='deflect'){
  check(w.version===7&&deflectorSupported(config),'UNSUPPORTED_DEFLECTOR');
  if(successor){
   const owner=contextSites(w).owner(account),why=contextSites(w).reason(account,cell,{deflector:true});check(!why,why);
   check(w.deflectors.length<config.max_deflectors,'DEFLECTOR_CAPACITY');
   check(w.deflectors.filter(d=>d.owner===owner).length<config.max_deflectors_per_player,'PLAYER_DEFLECTOR_CAPACITY');
   check(w.next_deflector_id<0xffffffff,'DEFLECTOR_ID_EXHAUSTED');
  }else check(deflectorSites(w,config,account).test(cell),'ILLEGAL_DEFLECTOR_SITE');
  const orientation=orientationFromDegrees(angle);amount=BigInt(config.deflector_price_e8s);fill=1;per_item=[amount];text=`DEFLECT ${cell} ${successor?screenDirection(orientation):orientation}`;
 }else if(kind==='fire'){
  const c=cannonReference(w,config).find(c=>c.id===cannon);check(c&&c.account===account,'NOT_OWNER');pool=c.balls;fill=Math.min(quantity,free,Math.max(0,config.max_purchase_balls_per_island-pool));check(fill>0,'BALL_CAPACITY');amount=sequentialCost(pool,fill);per_item=Array.from({length:fill},(_,i)=>ballPrice(pool+i));text=`FIRE ${cannon} ${angle} ${quantity}`;
 }else if(kind==='move'){
  if(successor){
   const why=contextSites(w).reason(account,cell,{moving:{kind:'cannon',id:cannon}});check(!why,why);
  }
  if(clearanceActive(config)&&legalMove(w,account,cannon,cell)&&!legalMove(w,account,cannon,cell,config))throw Error('ENEMY_TERRITORY_TOO_CLOSE');
  check(legalMove(w,account,cannon,cell,config),'ILLEGAL_MOVE');amount=config.move_e8s;fill=1;per_item=[amount];text=`MOVE ${cannon} ${cell}`;
 }else if(kind==='new'){
  check(w.playability.players.some(p=>p.account===account)||w.playability.players.length<config.max_players,'ACCOUNTING_CAPACITY');
  check(mine.length<config.max_retained_per_player,'PLAYER_CANNON_CAPACITY');check(w.cannons.length<config.max_cannons,'CANNON_CAPACITY');if(successor)check(w.next_cannon_id<0xffffffff,'CANNON_ID_EXHAUSTED');check(free>0&&(!successor||w.next_ball_id<0xffffffff),'BALL_CAPACITY');
  if(!mine.length){check(cell===null,'FIRST_PLACEMENT_AUTOMATIC');if(![7,9,10,11,12,13].includes(config.rules_version))check(1000000-w.ownership.counts.reduce((sum,r)=>sum+r.cells,0)>=9,'NO_ELIGIBLE_SPAWN');}
  else if(successor){
   check(cell!==null,'EXPLICIT_OWNED_SITE_REQUIRED');
   const why=contextSites(w).reason(account,cell);check(!why,why);
   pool=sitePool(w,account,cell);
  }
  else{if(clearanceActive(config)){const old=legalAdjacentSites(w,account).filter(c=>sitePool(w,account,c)<config.max_purchase_balls_per_island),safe=legalAdjacentSites(w,account,config);if(cell!==null&&old.includes(cell)&&!safe.includes(cell)||old.length&&!safe.length)throw Error('ENEMY_TERRITORY_TOO_CLOSE');}const sites=legalAdjacentSites(w,account,config).filter(c=>sitePool(w,account,c)<config.max_purchase_balls_per_island);check(sites.length>0,'NO_ADJACENT_SITE');if(cell!==null){check(sites.includes(cell),'ILLEGAL_ADJACENT_SITE');pool=sitePool(w,account,cell);}else{const counts=new Set(sites.map(c=>sitePool(w,account,c)));check(quantity===1||counts.size===1,'CHOOSE_SITE_FOR_EXACT_BATCH');pool=counts.size===1?[...counts][0]:null;}}
  // An automatic one-ball New has a site-independent cannon price. Its eventual
  // merged pool is deliberately unspecified when eligible sites differ.
  fill=Math.min(quantity,free,Math.max(0,config.max_purchase_balls_per_island-(pool??0)));check(fill>0,'BALL_CAPACITY');amount=newCannonCost(mine.length,fill,pool??0);per_item=[cannonPrice(mine.length),...Array.from({length:fill-1},(_,i)=>ballPrice(pool+1+i))];text=`NEW ${angle} ${quantity}${cell===null?'':` ${cell}`}`;
 }else throw Error('UNKNOWN_ACTION');
 const memo=successor?encodeContextMemo(parseContextText(new TextEncoder().encode(text)).command):kind==='deflect'?encodeDeflectorMemo({kind:'deflect',cell,orientation:orientationFromDegrees(angle)}):encodeV6Memo(parseV6TextMemo(new TextEncoder().encode(text)));check(amount<=18446744073709551615n,'PRICE_OVERFLOW');
 return{amount,per_item,requested:['move','deflect','deflector_move','deflector_reorient'].includes(kind)?1:quantity,maximum_fill:fill,pool,cell,memo:text,memo_bytes:new TextEncoder().encode(text),numeric_memo_bytes:memo,non_reservation:true};
}

/** Observer safeguard only: the current Ledger interpreter still accepts no-op Move. */
export function legalMoveDestination(w,account,cannon,cell,config=null){return w.cannons.find(c=>c.id===cannon)?.cell!==cell&&legalMove(w,account,cannon,cell,config);}
export function prepareQuoteV6(w,config,account,command){
 const cannon=w.cannons.find(c=>c.id===command.cannon);if(command.kind==='move'&&cannon&&cannon.cell===command.cell)throw Error('DIFFERENT_TILE');
 return quoteV6(w,config,account,command);
}
