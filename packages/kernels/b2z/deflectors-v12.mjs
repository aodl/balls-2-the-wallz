/** Provisional Rules12 structures; all state mutations belong to the cursor. */
import{playerAt,ownerAt,cellCount,position,wrapCell,Q,validateWorld}from'./world.mjs';
import{DIAGONAL_COMPONENT}from'./deflector-boundary.mjs';
import{gcd,validRat,cmp,rat}from'./math.mjs';
import{territoryBalls}from'./territory-v6.mjs';
import{hasEnemyClearance}from'../../protocol/territory-clearance.mjs';
import{decodeDeflectorMemo,ORIENTATIONS}from'../../protocol/deflector.mjs';
export function deflectorAt(w,cell){
 const rows=w.deflectors??[];let low=0,high=rows.length;
 while(low<high){const m=(low+high)>>1;if(rows[m].cell<cell)low=m+1;else high=m;}
 return rows[low]?.cell===cell?rows[low]:null;
}
export function validateDeflectorBall(b){
 if(typeof b.den!=='bigint'||b.den<1n||b.den>65536n||gcd(gcd(b.x0,b.y0),b.den)!==1n)throw Error('trajectory canonical denominator');
 if(b.den>1n&&(Math.abs(b.vx)!==DIAGONAL_COMPONENT||Math.abs(b.vy)!==DIAGONAL_COMPONENT))throw Error('fractional velocity class');
 if(b.vx*b.vx+b.vy*b.vy>32001*32001)throw Error('successor normal speed bound');
 if(b.deflector_rearm!==undefined)throw Error('rearm is not part of the boundary policy');
}
export function deflectorSeparation(w,cell){
 const x=cell%w.width,y=Math.floor(cell/w.width);
 for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if((dx||dy)&&deflectorAt(w,wrapCell(x+dx,y+dy,w.width,w.height)))return false;
 return true;
}
export function validateDeflectorState(w){
 if(!Array.isArray(w.deflectors)||w.deflectors.length>256||!Number.isSafeInteger(w.next_deflector_id)||w.next_deflector_id<1||w.next_deflector_id>4294967295)throw Error('structure capacity');
 let previous=-1;const ids=new Set(),counts=new Map(),cannons=new Set(w.cannons.map(c=>c.cell));
 for(const d of w.deflectors){
  if(Object.keys(d).sort().join(',')!=='cell,id,orientation,owner'||!Number.isSafeInteger(d.cell)||d.cell<=previous||d.cell>=cellCount(w)||!Number.isInteger(d.id)||d.id<1||d.id>=w.next_deflector_id||ids.has(d.id)||!ORIENTATIONS.includes(d.orientation)||!w.playability.players.some(p=>p.id===d.owner)||playerAt(w,d.cell)!==d.owner||cannons.has(d.cell))throw Error('deflector identity/occupancy');
  if(!deflectorSeparation(w,d.cell))throw Error('deflector spacing');
  previous=d.cell;ids.add(d.id);counts.set(d.owner,(counts.get(d.owner)??0)+1);if(counts.get(d.owner)>16)throw Error('player structure capacity');
 }
 for(const b of w.balls){validateDeflectorBall(b);if(deflectorAt(w,b.cell))throw Error('ball in blocked structure');}
}
export function removeLostDeflectors(w){
 if(w.version<7)return[];const gone=w.deflectors.filter(d=>playerAt(w,d.cell)!==d.owner);
 if(gone.length){const ids=new Set(gone.map(d=>d.id));w.deflectors=w.deflectors.filter(d=>!ids.has(d.id));}return gone;
}
export function prepareDeflectorPurchase(w,account,amount,memo,spacing=false){
 const fail=reason=>({kind:'rejected',reason});if(w.version<7)throw Error('unsupported deflector rules');
 if(typeof amount!=='bigint'||amount<0n||amount>18446744073709551615n)throw Error('PAYMENT_AMOUNT');
 let command;try{command=decodeDeflectorMemo(memo);}catch{return fail('MALFORMED_MEMO');}if(command.kind!=='deflect')return null;
 const player=w.playability.players.find(p=>p.account===account)?.id;
 if(player===undefined||playerAt(w,command.cell)!==player)return fail('NOT_OWN_TERRITORY');
 if(amount<10000000n)return fail('UNDERFUNDED');
 if(w.deflectors.length>=256)return fail('DEFLECTOR_CAPACITY');
 if(w.deflectors.filter(d=>d.owner===player).length>=16)return fail('PLAYER_DEFLECTOR_CAPACITY');
 if(w.next_deflector_id===4294967295)return fail('DEFLECTOR_ID_EXHAUSTED');
 if(!territoryBalls(w,ownerAt(w,command.cell)))return fail('NO_ACTIVE_ISLAND');
 if(deflectorAt(w,command.cell)||w.cannons.some(c=>c.cell===command.cell))return fail('SITE_OCCUPIED');
 // Inclusive contact closure matches existing cannon construction restrictions.
 for(const b of w.balls){const [x,y]=position(b,w.time),cx=b.cell%w.width,cy=Math.floor(b.cell/w.width),xs=[cx],ys=[cy];
  if(cmp(x,rat(cx*Q))===0)xs.push(cx-1);else if(cmp(x,rat((cx+1)*Q))===0)xs.push(cx+1);
  if(cmp(y,rat(cy*Q))===0)ys.push(cy-1);else if(cmp(y,rat((cy+1)*Q))===0)ys.push(cy+1);
  if(xs.some(x=>ys.some(y=>wrapCell(x,y,w.width,w.height)===command.cell)))return fail('SITE_OCCUPIED');
 }
 if(!spacing&&!deflectorSeparation(w,command.cell))return fail('DEFLECTOR_TOO_CLOSE');
 if(!hasEnemyClearance(w.width,w.height,command.cell,player,c=>playerAt(w,c)))return fail('ENEMY_TERRITORY_TOO_CLOSE');
 return{kind:'deflect',owner:player,cell:command.cell,orientation:command.orientation,price:10000000n};
}
export function migrateDeflectorWorld(old){
 validateWorld(old);
 if(old.version!==6||old.balls.some(b=>b.vx*b.vx+b.vy*b.vy>32001*32001))throw Error('exact normal Rules11 predecessor required');
 const w=structuredClone(old);w.version=7;w.deflectors=[];w.next_deflector_id=1;
 for(const b of w.balls)b.den=1n;return w;
}
