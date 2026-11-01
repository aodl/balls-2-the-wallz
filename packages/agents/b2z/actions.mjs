/** Typed planning only. Same legality/price helper and memo codec as the browser. */
import {quoteV6,legalMove,legalAdjacentSites} from '../../../apps/b2z-observer/action-quote-v6.mjs';
import {encodeV6Memo} from '../../protocol/memo-v6.mjs';
import {parseTextMemo} from '../../protocol/memo.mjs';
import {canonicalAccount} from '../../../apps/b2z-observer/identity.mjs';
import {check,integer,freeze} from './common.mjs';
export function typedAction(action){check(action&&typeof action==='object'&&Object.keys(action).length===1,'TYPED_ACTION_REQUIRED');const type=Object.keys(action)[0],v=action[type];check(v&&typeof v==='object'&&!Array.isArray(v),'ACTION_FIELDS');const fields={Wait:[],Fire:['cannon','angle','quantity'],New:['angle','quantity','cell'],Move:['cannon','cell']}[type];check(fields&&Object.keys(v).every(k=>fields.includes(k)),'ACTION_FIELDS');if(type==='Wait')return{Wait:{}};if(type!=='New')integer(v.cannon,1,4294967294);if(type!=='Move'){integer(v.angle,0,65535,'HEADING_BOUNDS');integer(v.quantity,1,64,'QUANTITY_BOUNDS');}if(type==='Move'||v.cell!==undefined&&v.cell!==null)integer(v.cell,0,999999,'CELL_BOUNDS');return freeze({[type]:{...v,...(type==='New'?{cell:v.cell??null}:{})}});}
export function memoCommand(action){const a=typedAction(action),type=Object.keys(a)[0],v=a[type];check(type!=='Wait','WAIT_IS_NOT_A_PAYMENT');return{kind:{Fire:'fire',New:'new',Move:'move_cannon'}[type],...v};}
export function exactDegrees(angle){for(const n of [Math.floor(angle*36000/65536)-1,Math.floor(angle*36000/65536),Math.floor(angle*36000/65536)+1])if(n>=0&&n<36000){const t=`${Math.floor(n/100)}.${String(n%100).padStart(2,'0')}`;if(parseTextMemo(new TextEncoder().encode('ANGLE '+t)).value===angle)return t;}return null;}
export function quoteAction(snapshot,account,action){canonicalAccount(account);action=typedAction(action);const type=Object.keys(action)[0],v=action[type];if(type==='Wait')return{action,amount_e8s:0n,memo_hex:null,maximum_fill:0,non_reservation:true};
 const kind={Fire:'fire',New:'new',Move:'move'}[type],q=quoteV6(snapshot.world,snapshot.configuration,account,{kind,...v,angle:'0'}),memo=encodeV6Memo(memoCommand(action)),degrees=type==='Move'?null:exactDegrees(v.angle),text=type==='Move'?`MOVE ${v.cannon} ${v.cell}`:degrees===null?null:type==='Fire'?`FIRE ${v.cannon} ${degrees} ${v.quantity}`:`NEW ${degrees} ${v.quantity}${v.cell===null?'':' '+v.cell}`;
 return{action,amount_e8s:q.amount,per_item_e8s:q.per_item,maximum_fill:q.maximum_fill,requested_quantity:v.quantity??1,island_pool:q.pool,memo_hex:Buffer.from(memo).toString('hex'),text_memo:text,non_reservation:true,notice:'Wallet fee is extra. Legality/prices are rechecked at processing. Partial fills, rejected payments and surplus remain retained.'};
}
export function candidates(board,account,{max=8,budgetE8s=0n,feeE8s=10000n,quantityMax=2}={}){integer(max,1,16);integer(quantityMax,1,64);const s=board.snapshot,w=s.world,out=[{id:'wait',action:{Wait:{}},quote:{amount_e8s:0n},rationale:'No new expenditure; existing trajectories continue.'}],mine=w.cannons.filter(c=>c.account===account);
 const add=(id,action,rationale)=>{if(out.length>=max)return;try{const quote=quoteAction(s,account,action);if(quote.amount_e8s+feeE8s<=budgetE8s)out.push({id,action,quote,rationale});}catch(e){if(!/CAPACITY|ILLEGAL|SITE|SPAWN|NOT_OWNER|PLACEMENT|QUANTITY/.test(e.message))throw e;}};
 if(!mine.length){for(const angle of [0,16384,32768,49152])add('new-'+angle,{New:{angle,quantity:1,cell:null}},'First spawn is deterministic from future sealed payment inputs; location is not reserved.');}
 else{
  const c=mine[0],r=board.islands.get(w.ownership?board.rows[Math.floor(c.cell/1000)].find(([a,b])=>a<=c.cell&&c.cell<b)[2]:c.id);
  const moveCells=[...new Set(r.narrow.concat(board.rows.flatMap(row=>row.filter(x=>x[2]===r.id).slice(0,1).map(x=>x[0])).slice(0,4)))];
  for(const cell of (r.frontier_edges?moveCells:[]).filter(cell=>cell!==c.cell&&legalMove(w,account,c.id,cell)).slice(0,2))add(`move-${c.id}-${cell}`,{Move:{cannon:c.id,cell}},'Legal owned cell near sampled frontier/connection; final admission may reject a stale destination.');
  const site=legalAdjacentSites(w,account)[0];if(site!==undefined)add('new-adjacent-'+site,{New:{angle:0,quantity:1,cell:site}},'Additional active adjacent anchor; account-wide scaling and capacity apply.');
  for(const angle of [...new Set([c.heading??0,0,16384,32768,49152])].slice(0,3))for(const quantity of [1,Math.min(2,quantityMax)].filter((n,i,a)=>a.indexOf(n)===i))add(`fire-${c.id}-${angle}-${quantity}`,{Fire:{cannon:c.id,angle,quantity}},'Bounded coarse headings; shared-island sequential pricing.');

 }
 return out;
}
