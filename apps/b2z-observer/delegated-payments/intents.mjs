/** DP-10/11 nonsecret journal. Never stores an identity or signs by itself. */
import{sha256 as sha256Bytes}from'@noble/hashes/sha2.js';
const sha256=b=>Array.from(sha256Bytes(b),v=>v.toString(16).padStart(2,'0')).join('');
import{encodeCanonical}from'@dtr/timeline-runtime/runtime/canonical';
import{Principal}from'@icp-sdk/core/principal';
import{icpAccount}from'../../../packages/protocol/delegation.mjs';
const LEDGER='ryjl3-tyaaa-aaaaa-aaaba-cai',KEY='B2Z-ICRC2-intents-v1',LOCK='B2Z-ICRC2-payments-v1',MAX=32,MAX_BYTES=128000;
const STATES=['Ready','Submitting','Ledger confirmed','Ledger rejected','Outcome unknown','Game outcome verified'];
const keys=o=>Object.keys(o).sort().join(','),eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const u64=s=>{if(typeof s!=='string'||!/^(0|[1-9][0-9]{0,19})$/.test(s)||BigInt(s)>=1n<<64n)throw Error('INTENT_INTEGER');return BigInt(s);};
const account=a=>{if(!a||keys(a)!=='owner,subaccount'||Principal.fromText(a.owner).toText()!==a.owner||!/^[0-9a-f]{64}$/.test(a.subaccount))throw Error('INTENT_ACCOUNT');return icpAccount(a.owner,Uint8Array.from(a.subaccount.match(/../g),h=>parseInt(h,16)));};
function body(x){return {verified_root:x.verified_root,version:x.version,network:x.network,ledger:x.ledger,backend:x.backend,from:x.from,spender:x.spender,to:x.to,amount:x.amount,fee:x.fee,memo:x.memo,created_at_time:x.created_at_time,quote:x.quote,grant_position:x.grant_position};}
export function intentId(x){return sha256(encodeCanonical(body(x)));}
export function validateIntent(x,{localLedger=null}={}){
 if(!x||keys(x)!=='amount,backend,created_at_time,error,fee,from,game_result,grant_position,id,index,ledger,memo,network,quote,spender,state,to,verified_root,version'||x.version!==1||!STATES.includes(x.state))throw Error('INTENT_SCHEMA');
 if(!['ic','pocketic-local'].includes(x.network)||x.network==='ic'&&x.ledger!==LEDGER||x.network==='pocketic-local'&&x.ledger!==localLedger)throw Error('INTENT_LEDGER');
 if(Principal.fromText(x.backend).toText()!==x.backend||account(x.to)!==icpAccount(x.backend)||x.to.owner!==x.backend||x.to.subaccount!=='00'.repeat(32))throw Error('INTENT_RECIPIENT');
 account(x.from);if(Principal.fromText(x.spender).toText()!==x.spender||Principal.fromText(x.spender).isAnonymous())throw Error('INTENT_SPENDER');
 for(const k of['amount','fee','created_at_time','grant_position'])u64(x[k]);if(BigInt(x.amount)===0n)throw Error('INTENT_AMOUNT');
 if(typeof x.memo!=='string'||!/^(?:[0-9a-f]{2}){1,32}$/.test(x.memo)||typeof x.quote!=='string'||!/^[0-9a-f]{64}$/.test(x.quote)||intentId(x)!==x.id)throw Error('INTENT_BINDING');
 if(typeof x.verified_root!=='string'||!/^[0-9a-f]{64}$/.test(x.verified_root))throw Error('INTENT_VERIFIED_REFERENCE');if(x.index!==null)u64(x.index);if(x.error!==null&&(typeof x.error!=='string'||x.error.length>160))throw Error('INTENT_ERROR');
 if(x.game_result!==null&&(!x.game_result||typeof x.game_result!=='object'||keys(x.game_result)!=='reason,status'||!['applied','partially_applied','rejected'].includes(x.game_result.status)||typeof x.game_result.reason!=='string'||x.game_result.reason.length>96))throw Error('INTENT_GAME_RESULT');
 if(['Ledger confirmed','Game outcome verified'].includes(x.state)&&x.index===null||x.state==='Game outcome verified'&&x.game_result===null)throw Error('INTENT_STATE');return x;
}
export function makeIntent(fields,options){const x={version:1,...structuredClone(fields),state:'Ready',index:null,error:null,game_result:null};x.id=intentId(x);return Object.freeze(validateIntent(x,options));}
export function intentRequest(x,options){validateIntent(x,options);return{spender_subaccount:[],from:{owner:Principal.fromText(x.from.owner),subaccount:[Uint8Array.from(x.from.subaccount.match(/../g),h=>parseInt(h,16))]},to:{owner:Principal.fromText(x.to.owner),subaccount:[]},amount:BigInt(x.amount),fee:[BigInt(x.fee)],memo:[Uint8Array.from(x.memo.match(/../g),h=>parseInt(h,16))],created_at_time:[BigInt(x.created_at_time)]};}
export function paymentJournal({storage,locks,localLedger=null,nowNs=()=>BigInt(Date.now())*1000000n,retryWindowNs=86100000000000n}){
 const options={localLedger};
 function read(){let raw;try{raw=storage.getItem(KEY);}catch{throw Error('PAYMENT_STORAGE_UNAVAILABLE');}if(raw===null)return[];if(typeof raw!=='string'||raw.length>MAX_BYTES)throw Error('PAYMENT_JOURNAL_INVALID');const rows=JSON.parse(raw);if(!Array.isArray(rows)||rows.length>MAX)throw Error('PAYMENT_JOURNAL_INVALID');for(const r of rows)validateIntent(r,options);if(new Set(rows.map(r=>r.id)).size!==rows.length)throw Error('PAYMENT_JOURNAL_INVALID');return rows;}
 function save(rows){const data=JSON.stringify(rows);if(data.length>MAX_BYTES)throw Error('PAYMENT_JOURNAL_FULL');try{storage.setItem(KEY,data);if(storage.getItem(KEY)!==data)throw Error('write did not persist');}catch{throw Error('PAYMENT_STORAGE_UNAVAILABLE');}}
 function store(rows,next){validateIntent(next,options);const i=rows.findIndex(r=>r.id===next.id);if(i<0){if(rows.length===MAX){const obsolete=rows.findIndex(r=>['Ledger rejected','Game outcome verified'].includes(r.state));if(obsolete<0)throw Error('PAYMENT_JOURNAL_FULL');rows.splice(obsolete,1);}rows.push(next);}else rows[i]=next;save(rows);return structuredClone(next);}
 async function locked(run){if(!locks?.request)throw Error('PAYMENT_LOCK_UNAVAILABLE');return locks.request(LOCK,{mode:'exclusive',ifAvailable:true},lock=>{if(!lock)throw Error('PAYMENT_BUSY');return run();});}
 return{
  records:()=>structuredClone(read()),
  async submit(intent,{send,verify,retry=false}){return locked(async()=>{
   validateIntent(intent,options);const rows=read(),existing=rows.find(r=>r.id===intent.id);if(existing&&!eq(body(existing),body(intent)))throw Error('INTENT_CHANGED');
   let item=structuredClone(existing??intent);
   // A crash with Submitting persisted is ambiguous. No automatic fresh attempt.
   if(item.state==='Submitting'){item={...item,state:'Outcome unknown',error:'Response unavailable after interrupted submission'};store(rows,item);}
   if(['Ledger confirmed','Ledger rejected','Game outcome verified'].includes(item.state))return structuredClone(item);
   if(item.state==='Outcome unknown'&&!retry)return structuredClone(item);
   if(retry&&(item.state!=='Outcome unknown'||nowNs()<BigInt(item.created_at_time)||nowNs()-BigInt(item.created_at_time)>retryWindowNs))throw Error('PAYMENT_RECONCILIATION_REQUIRED');
   // No new intent for an unresolved identical quote, even across reload/tabs.
   const other=rows.find(r=>r.id!==item.id&&r.quote===item.quote&&r.ledger===item.ledger&&eq(r.from,item.from)&&r.spender===item.spender&&!['Ledger rejected','Game outcome verified'].includes(r.state));if(other)throw Error('PAYMENT_ALREADY_PENDING');
   await verify(structuredClone(item));const uncertain=item.state==='Outcome unknown';item={...item,state:'Submitting',error:null};store(rows,item);
   let response;try{response=await send(intentRequest(item,options));}catch{item={...item,state:'Outcome unknown',error:'Payment status unknown'};return store(rows,item);}
   if(response&&typeof response==='object'&&'Ok'in response)item={...item,state:'Ledger confirmed',index:String(response.Ok),error:null};
   else if(response?.Err&&'Duplicate'in response.Err)item={...item,state:'Ledger confirmed',index:String(response.Err.Duplicate.duplicate_of),error:null};
   else if(response?.Err&&Object.keys(response.Err).length===1){const code=Object.keys(response.Err)[0];item={...item,state:uncertain?'Outcome unknown':'Ledger rejected',error:code};}
   else item={...item,state:'Outcome unknown',error:'Unrecognized Ledger response'};
   return store(rows,item);
  });},
  async reconcile(id,receipt,verifyReceipt){return locked(async()=>{const rows=read(),item=rows.find(r=>r.id===id);if(!item||!['Submitting','Outcome unknown','Ledger confirmed'].includes(item.state))throw Error('PAYMENT_RECONCILIATION_STATE');const index=String(receipt.position);if(item.index!==null&&item.index!==index)throw Error('PAYMENT_RESULT_UNBOUND');const candidate={...item,index,state:'Ledger confirmed'};await verifyReceipt(candidate,receipt);return store(rows,{...candidate,state:'Game outcome verified',error:null,game_result:{reason:receipt.reason,status:receipt.status}});});},
  async gameOutcome(id,receipt,verifyReceipt){return locked(async()=>{const rows=read(),item=rows.find(r=>r.id===id);if(!item||item.index===null||item.state!=='Ledger confirmed')throw Error('PAYMENT_RESULT_UNBOUND');await verifyReceipt(item,receipt);return store(rows,{...item,state:'Game outcome verified',game_result:{reason:receipt.reason,status:receipt.status}});});},
 };
}
