import{allocateTerritory,mergeTerritories,territoryForCannon,territoryBalls}from'./territory-v6.mjs';
/** Versioned pure purchase planning; the enclosing cursor owns receipt admission. */
import {decodeV6Memo,encodeV6Memo,MAX_QUANTITY} from '../../protocol/memo-v6.mjs';
import {encodeCanonical,cloneCanonical} from '../../../node_modules/@dtr/timeline-runtime/packages/runtime/canonical.mjs';
import {sha256} from '../../../node_modules/@dtr/timeline-runtime/packages/runtime/seal.mjs';
import {ballPrice,cannonPrice} from './pricing-v6.mjs';
import {V6_POLICY,playerForCannon,reviveTerritory,metadataDelta,emptyMetadataDelta} from './playability.mjs';
import {ownerAt,playerAt,territoryBallCount,setOwner,validateWorld,neighbors,wrapCell,position,Q,PRELAUNCH_CONFIG} from './world.mjs';
import {cmp,rat} from './math.mjs';
import {launch} from './kernel.mjs';
import {seedPatch} from './spawn.mjs';
const U64=18446744073709551615n,U32=4294967295;
function amount(n){if(typeof n!=='bigint'||n<0n||n>U64)throw Error('PAYMENT_AMOUNT');return n;}
const reject=reason=>({kind:'rejected',reason});
export const playerByAccount=(w,account)=>w.playability?.players.find(p=>p.account===account)?.id;
export function adjacentSites(w,id){
 if(w.version!==6)throw Error('EXPECTED_V6');const sites=new Set(),blocked=occupiedCells(w);
 for(const c of w.cannons)if(playerForCannon(w,c.id)===id&&territoryBallCount(w,c.id)>0)for(const n of neighbors(c.cell,w.width,w.height,true))sites.add(n);
 return [...sites].filter(c=>!blocked.has(c)&&(ownerAt(w,c)===0||playerAt(w,c)===id)).sort((a,b)=>a-b);
}
function occupiedCells(w){
 const blocked=new Set(w.cannons.map(c=>c.cell));
 for(const b of w.balls){const [x,y]=position(b,w.time),cx=b.cell%w.width,cy=Math.floor(b.cell/w.width),xs=[cx],ys=[cy];
  if(cmp(x,rat(cx*Q))===0)xs.push(cx-1);else if(cmp(x,rat((cx+1)*Q))===0)xs.push(cx+1);
  if(cmp(y,rat(cy*Q))===0)ys.push(cy-1);else if(cmp(y,rat((cy+1)*Q))===0)ys.push(cy+1);
  for(const x of xs)for(const y of ys)blocked.add(wrapCell(x,y,w.width,w.height));
 }
 return blocked;
}
/** Isolated proposal, before enclosing cursor receipt/tally commit. */
export function placeNew(w,account,budget,p,r){
 if(p.kind!=='new')throw Error('NEW_CANNON_PLAN');
 const command=p.explicit?{kind:'new',angle:p.angle,quantity:p.quantity,cell:p.cell}:{kind:'angle',value:p.angle};
 const fresh=preparePurchase(w,account,budget,encodeV6Memo(command));
 if(sha256(encodeCanonical(fresh))!==sha256(encodeCanonical(p)))throw Error('STALE_PURCHASE_PLAN');
 let patch;
 if(p.first){
  patch=seedPatch(r.cell,w.width,w.height,true);
  if(r.kind!==2||patch.join(',')!==r.patch.join(',')||patch.some(c=>ownerAt(w,c)!==0))throw Error('FIRST_PLACEMENT_NEUTRAL_PATCH');
 }else{
  if(r.kind!==4||r.patch.length!==1||r.patch[0]!==r.cell||p.cell!==null&&p.cell!==r.cell||!adjacentSites(w,p.player).includes(r.cell))throw Error('ILLEGAL_ADJACENT_SITE');
  patch=[r.cell];
 }
 const blocked=occupiedCells(w);if(patch.some(c=>blocked.has(c)))throw Error('PLACEMENT_OCCUPIED');
 const previous_owners=patch.map(c=>ownerAt(w,c)),next=cloneCanonical(w),state=next.playability;
 let player=p.player;
 if(player===null){player=state.next_player_id++;state.players.push({id:player,account});}
 const cannon={id:next.next_cannon_id++,cell:r.cell,account,heading:p.angle};
 state.lifecycle.push({cannon:cannon.id,player,generation:1});
 const ownership_ops=[];
 const labels=p.first?[]:[...new Set([r.cell,...neighbors(r.cell,next.width,next.height,true)].filter(c=>playerAt(next,c)===player).map(c=>ownerAt(next,c)))].sort((a,b)=>a-b);
 for(const from of labels)if(from!==labels[0])ownership_ops.push({kind:"relabel",from,to:labels[0]});
 const territory=p.first?allocateTerritory(next,player):mergeTerritories(next,labels);
 if(territoryBalls(next,territory)>=V6_POLICY.max_purchase_balls_per_island)throw Error('BALL_CAPACITY');
 for(const c of patch){setOwner(next,c,territory);ownership_ops.push({kind:"set",cell:c,owner:territory});}next.cannons.push(cannon);
 const ball=cloneCanonical(launch(next,cannon,p.angle)),reactivated=reviveTerritory(next,territory);validateWorld(next);
 return {world:next,cannon,ball,event:{kind:'cannon_spawned',cannon:cloneCanonical(cannon),player,patch,previous_owners,placement_class:r.kind,frontier_other:r.other,ball:cloneCanonical(ball),reactivated_cannons:reactivated,ownership_ops,metadata_delta:metadataDelta(w.playability,next.playability)}};
}
export function sitePoolCount(w,player,cell){return [...new Set([cell,...neighbors(cell,w.width,w.height,true)].filter(c=>playerAt(w,c)===player).map(c=>ownerAt(w,c)))].reduce((sum,id)=>sum+territoryBalls(w,id),0);}
export function chooseAdjacent(w,id,seed){
 if(!/^[0-9a-f]{64}$/.test(seed))throw Error('spawn seed');const ranked=adjacentSites(w,id).filter(cell=>sitePoolCount(w,id,cell)<V6_POLICY.max_purchase_balls_per_island).map(cell=>[sha256(encodeCanonical({domain:'B2Z-ADJACENT-SPAWN-06',seed,cell})),cell]);
 ranked.sort((a,b)=>a[0]===b[0]?a[1]-b[1]:a[0]<b[0]?-1:1);return ranked[0]?.[1]??null;
}
export function preparePurchase(w,account,budget,memo,moved=[]){
 if(w.version!==6)throw Error('EXPECTED_V6');amount(budget);let c;try{c=decodeV6Memo(memo);}catch{return reject('MALFORMED_MEMO');}
 const mine=w.cannons.filter(c=>c.account===account);let explicit=true;
 if(c.kind==='angle'){explicit=false;c=mine.length?{kind:'fire',cannon:mine[0].id,angle:c.value,quantity:MAX_QUANTITY}:{kind:'new',angle:c.value,quantity:MAX_QUANTITY,cell:null};}
 else if(c.kind==='move'){explicit=false;if(!mine.length)return reject('NO_CANNON');c={kind:'move_cannon',cannon:mine[0].id,cell:c.value};}
 if(c.kind==='new'){
  if(mine.length>=V6_POLICY.max_retained_per_player)return reject('PLAYER_CANNON_CAPACITY');
  if(w.cannons.length>=V6_POLICY.max_cannons)return reject('CANNON_CAPACITY');if(w.next_cannon_id===U32)return reject('CANNON_ID_EXHAUSTED');
  if(w.balls.length>=V6_POLICY.max_balls||w.next_ball_id===U32)return reject('BALL_CAPACITY');
  const id=playerByAccount(w,account),s=w.playability;
  if(id===undefined&&(s.players.length>=V6_POLICY.max_players||s.next_player_id===U32||(!w.credits.some(c=>c.account===account)&&w.credits.length>=V6_POLICY.max_players)))return reject('ACCOUNTING_CAPACITY');
  const price=cannonPrice(mine.length);if(budget<price)return reject('UNDERFUNDED');
  if(!mine.length){if(c.cell!==null)return reject('FIRST_PLACEMENT_AUTOMATIC');}
  else{if(!mine.some(c=>territoryBallCount(w,c.id)>0))return reject('NO_ACTIVE_ANCHOR');const sites=adjacentSites(w,id);if(!sites.length)return reject('NO_ADJACENT_SITE');if(c.cell!==null&&!sites.includes(c.cell))return reject('ILLEGAL_ADJACENT_SITE');if(c.cell!==null?sitePoolCount(w,id,c.cell)>=V6_POLICY.max_purchase_balls_per_island:sites.every(cell=>sitePoolCount(w,id,cell)>=V6_POLICY.max_purchase_balls_per_island))return reject('BALL_CAPACITY');}
  return {kind:'new',angle:c.angle,quantity:c.quantity,explicit,cell:c.cell,price,player:id??null,first:!mine.length};
 }
 const cannon=w.cannons.find(x=>x.id===c.cannon);if(!cannon)return reject('NO_CANNON');if(cannon.account!==account)return reject('NOT_OWNER');
 const attached=territoryBallCount(w,c.cannon);
 if(c.kind==='fire'){
  if(budget<ballPrice(attached))return reject('UNDERFUNDED');if(attached>=V6_POLICY.max_purchase_balls_per_island||w.balls.length>=V6_POLICY.max_balls||w.next_ball_id===U32)return reject('BALL_CAPACITY');
  return {kind:'fire',cannon:c.cannon,angle:c.angle,quantity:c.quantity,explicit};
 }
 if(c.kind!=='move_cannon')throw Error('unresolved command');if(!attached)return reject('DORMANT_REVIVAL_REQUIRED');
 if(budget<PRELAUNCH_CONFIG.move_e8s)return reject('UNDERFUNDED');if(moved.includes(c.cannon))return reject('MOVE_LIMIT');
 if(playerAt(w,c.cell)!==playerForCannon(w,c.cannon))return reject('NOT_OWN_TERRITORY');if(w.cannons.some(x=>x.id!==c.cannon&&x.cell===c.cell))return reject('CANNON_OCCUPIED');
 const old=ownerAt(w,cannon.cell);if(ownerAt(w,c.cell)!==old&&w.cannons.filter(c=>ownerAt(w,c.cell)===old).length===1)return reject('WOULD_STRAND_ISLAND');
 return {kind:'move',cannon:c.cannon,cell:c.cell,price:PRELAUNCH_CONFIG.move_e8s};
}
export class PurchaseBatch{
 static fire(account,budget,p){if(p.kind!=='fire')throw Error('fire plan');return Object.assign(new PurchaseBatch(),{account,amount:amount(budget),cannon:p.cannon,angle:p.angle,requested:p.quantity,explicit:p.explicit,new_cannon:false,prices:[],used:0n,remainder:budget,stop_reason:null});}
 static afterNew(account,budget,cannon,p){if(p.kind!=='new'||amount(budget)<p.price)throw Error('new cannon plan');return Object.assign(new PurchaseBatch(),{account,amount:budget,cannon,angle:p.angle,requested:p.quantity,explicit:p.explicit,new_cannon:true,prices:[p.price],used:p.price,remainder:budget-p.price,stop_reason:p.quantity===1?'quantity_limit':null});}
 validate(w){
  if(w.version!==6||!Number.isInteger(this.requested)||this.requested<1||this.requested>MAX_QUANTITY||this.prices.length>this.requested||!w.cannons.some(c=>c.id===this.cannon&&c.account===this.account))throw Error('PURCHASE_CONTINUATION');
  amount(this.amount);amount(this.used);amount(this.remainder);if(this.used+this.remainder!==this.amount||this.prices.some(p=>amount(p)===0n)||this.prices.reduce((s,p)=>s+p,0n)!==this.used||this.stop_reason!==null&&!['quantity_limit','capacity','insufficient_payment','ball_id_exhausted'].includes(this.stop_reason))throw Error('PURCHASE_CONTINUATION');
 }
 step(w){
  this.validate(w);if(this.stop_reason!==null)return null;if(this.prices.length>=this.requested){this.stop_reason='quantity_limit';return null;}
  const attached=territoryBallCount(w,this.cannon);
  if(attached>=V6_POLICY.max_purchase_balls_per_island||w.balls.length>=V6_POLICY.max_balls){this.stop_reason='capacity';return null;}
  if(w.next_ball_id===U32){this.stop_reason='ball_id_exhausted';return null;}const price=ballPrice(attached);
  if(price>this.remainder){this.stop_reason='insufficient_payment';return null;}
  const c=w.cannons.find(c=>c.id===this.cannon),ball=cloneCanonical(launch(w,c,this.angle)),reactivated=reviveTerritory(w,territoryForCannon(w,this.cannon)),revived=reactivated.includes(this.cannon);
  this.prices.push(price);this.used+=price;this.remainder-=price;if(this.prices.length===this.requested)this.stop_reason='quantity_limit';const metadata_delta=emptyMetadataDelta(w.playability);metadata_delta.lifecycle=reactivated.map(id=>({...w.playability.lifecycle.find(l=>l.cannon===id)}));return {ball,revived,reactivated,metadata_delta};
 }
 receipt(){
  const stop=this.stop_reason;if(stop===null)throw Error('incomplete purchase');const actual=this.prices.length;
  return {reason:actual?'ACCEPTED':'REJECTED',kind:'purchase_completed',status:!actual?'rejected':actual<this.requested&&(this.explicit||stop!=='insufficient_payment')?'partially_applied':'applied',cannon:this.cannon,new_cannon:this.new_cannon,requested_quantity:this.requested,quantity_explicit:this.explicit,actual_quantity:actual,per_item_prices:this.prices,amount_used:this.used,remainder:this.remainder,stop_reason:stop};
 }
}
