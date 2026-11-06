/** Bounded public local records only. No payment submission or authority. */
export const packetKey=q=>JSON.stringify(q,(_,v)=>typeof v==='bigint'?v.toString():v);
export const instructionKey=q=>packetKey(q&&Object.fromEntries(Object.entries(q).filter(([k])=>!['snapshot','prepared_at','id','state','index','receipt','cached'].includes(k))));
export function createHandoffs(storage,key){
 let records=[],cached=[];try{const v=JSON.parse(storage?.getItem(key+':receipts'));if(Array.isArray(v)&&JSON.stringify(v).length<=96000)cached=v.filter(r=>r&&/^[a-f0-9]{64}$/.test(r.account)&&/^\d{1,20}$/.test(r.amount)&&/^\d{1,20}$/.test(r.position)&&typeof r.reason==='string').slice(-64);}catch{}
try{const v=JSON.parse(storage?.getItem(key));if(Array.isArray(v)&&JSON.stringify(v).length<=96000)records=v.filter(r=>r&&typeof r.id==='string'&&typeof r.memo==='string'&&r.memo.length<=256&&/^\d{1,20}$/.test(r.amount)&&/^[a-f0-9]{64}$/.test(r.account)&&['copied','reported','unknown'].includes(r.state)).slice(0,32);}catch{}
 const save=()=>{records=records.slice(0,32);try{storage?.setItem(key,packetKey(records));return true;}catch{return false;}};
 return {records:()=>records,cachedReceipts:()=>cached,rememberReceipts(rows,snapshot){const merged=new Map(cached.map(r=>[r.position,r]));for(const row of rows)if(!merged.has(String(row.position)))merged.set(String(row.position),JSON.parse(packetKey({...row,snapshot}))); cached=[...merged.values()].slice(-64);try{storage?.setItem(key+':receipts',packetKey(cached));}catch{}},freeze(q){const r=JSON.parse(packetKey({...q,id:`${Date.now()}-${Math.random().toString(36).slice(2)}`,prepared_at:Date.now(),state:'copied'}));records.unshift(r);save();return r;},sent(id,index=''){if(index&&!/^\d{1,20}$/.test(index))throw Error('Use a numeric Ledger transaction index');const r=records.find(r=>r.id===id);if(r){r.state='reported';r.index=index;save();}return r;}};
}
export function receiptSummary(r,format=n=>`${n} e8s`){
 if(r.actual_quantity!==undefined)return `${r.status.replaceAll('_',' ')} · ${r.actual_quantity}/${r.requested_quantity} balls · used ${format(r.amount_used)} · retained ${format(r.remainder)} · ${r.stop_reason.replaceAll('_',' ')}`;
 return r.reason==='ACCEPTED'?'Applied':`Rejected · ${r.reason.replaceAll('_',' ').toLowerCase()} · payment retained`;
}
// Existing public receipts omit original memo bytes. Never claim a packet match
// on counts, amount, payer, or a user-reported block index alone.
export function receiptMatchesPacket(r,p){return Boolean(r.ledger&&p.ledger&&r.ledger===p.ledger&&r.memo===p.memo&&r.account===p.account&&String(r.amount)===String(p.amount)&&String(r.position)===p.index);}
