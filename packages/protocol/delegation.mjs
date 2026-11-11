/** Application authorization v1 and source envelope v5. Never initiates a transfer. */
import{Principal,getCrc32}from'@icp-sdk/core/principal';
import{sha224}from'@noble/hashes/sha2.js';
import{hex,unhex,be,concat,Reader,uint}from'@dtr/timeline-runtime/protocol/bytes';
import{canonicalAccount}from'./account.mjs';
export const DELEGATION_ADAPTER=5,DELEGATION_LIFETIME_NS=604800000000000n,MAX_DELEGATION_ACCOUNTS=1024;
const magic=new TextEncoder().encode('B2ZPAY05');
export function icpAccount(owner,subaccount=new Uint8Array(32)){
 const p=typeof owner==='string'?Principal.fromText(owner):Principal.fromUint8Array(owner);if(subaccount.length!==32)throw Error('ACCOUNT_SUBACCOUNT');const h=sha224(concat(Uint8Array.of(10),new TextEncoder().encode('account-id'),p.toUint8Array(),subaccount));return hex(concat(be(getCrc32(h),4),h));
}
export function encodeAuthorization({kind,spender}){if(kind==='revoke')return Uint8Array.of(0xb2,0xd1,0x80);if(kind!=='grant')throw Error('AUTH_MEMO_KIND');const p=Principal.fromText(spender),b=p.toUint8Array();if(p.toText()!==spender||b.length!==29||b[28]!==2)throw Error('AUTH_PRINCIPAL');return concat(Uint8Array.of(0xb2,0xd1,29),b);}
export function decodeAuthorization(b){
 if(b[0]!==0xb2)return null;if(b.length<3||b[1]!==0xd1)throw Error('AUTH_MEMO_VERSION');if(b[2]===0x80){if(b.length!==3)throw Error('AUTH_MEMO_LENGTH');return{kind:'revoke'};}if(b.length!==32||b[2]!==29||b[31]!==2)throw Error('AUTH_MEMO_LENGTH');const spender=Principal.fromUint8Array(b.slice(3)).toText();return{kind:'grant',spender};
}
const u64=n=>{const v=uint(n);if(v>=1n<<64n)throw Error('AUTH_U64');return v;};
export function encodeDelegatedPayment(p){
 const from=unhex(canonicalAccount(p.from),32),to=unhex(canonicalAccount(p.to),32),spender=p.spender===null?new Uint8Array(32):unhex(canonicalAccount(p.spender),32);if(p.memo!==null&&(!(p.memo instanceof Uint8Array)||p.memo.length>32))throw Error('AUTH_MEMO_LENGTH');
 const flags=Number(p.spender!==null)|(Number(p.memo!==null)<<1)|(Number(p.created_at_ns!==null)<<2),memo=p.memo??new Uint8Array();return concat(magic,Uint8Array.of(flags),from,spender,to,...['amount','fee','position','ledger_time_ns','created_at_ns','legacy_memo'].map(k=>be(u64(p[k]??(k==='created_at_ns'?0n:undefined)),8)),Uint8Array.of(memo.length),memo,unhex(p.raw_digest,32));
}
export function decodeDelegatedPayment(bytes){
 const b=typeof bytes==='string'?unhex(bytes):bytes;if(b.length<186||b.length>218)throw Error('AUTH_PAYMENT_ENVELOPE');const r=new Reader(b);if(hex(r.take(8))!==hex(magic))throw Error('AUTH_PAYMENT_ENVELOPE');const flags=Number(r.integer(1));if(flags&~7)throw Error('AUTH_PAYMENT_ENVELOPE');const from=hex(r.take(32)),s=hex(r.take(32)),to=hex(r.take(32)),p={from,spender:flags&1?s:null,to};for(const k of['amount','fee','position','ledger_time_ns','created_at_ns','legacy_memo'])p[k]=r.integer(8);if(!(flags&4)&&p.created_at_ns!==0n)throw Error('AUTH_PAYMENT_CANONICAL');if(!(flags&4))p.created_at_ns=null;const len=Number(r.integer(1));if(len>32||!(flags&1)&&s!=='00'.repeat(32)||!(flags&2)&&len)throw Error('AUTH_PAYMENT_CANONICAL');p.memo=flags&2?r.take(len):(r.take(len),null);p.raw_digest=hex(r.take(32));r.end();if(hex(encodeDelegatedPayment(p))!==hex(b))throw Error('AUTH_PAYMENT_CANONICAL');return p;
}
