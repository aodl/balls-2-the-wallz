/** Annotation adapter6 only. Historical memo parsers and bytes are untouched. */
import {parseV6TextMemo,decodeV6LedgerMemo,encodeV6Memo} from './memo-v6.mjs';
export const WAR_CRY_ADAPTER=6;
export const WAR_CRY_CAPABILITY='btz-war-cry-1';
export const MEMO_LIMIT=32;
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
const forbidden=/[|\u0000-\u001f\u007f-\u009f\u2028-\u202e\u2066-\u2069]/u;
export function validateCry(text){
 if(typeof text!=='string'||!text||forbidden.test(text))throw Error('War Cry must be single-line public text without | or directional controls');
 // TextEncoder replaces lone surrogates; rejecting first prevents intent changes.
 for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);if(c>=0xd800&&c<=0xdbff){const n=text.charCodeAt(++i);if(!(n>=0xdc00&&n<=0xdfff))throw Error('War Cry Unicode');}else if(c>=0xdc00&&c<=0xdfff)throw Error('War Cry Unicode');}
 return text;
}
export const memoByteLength=text=>encoder.encode(text).length;
export function fitCry(directive,text,limit=MEMO_LIMIT){
 if(!Number.isSafeInteger(limit)||limit!==MEMO_LIMIT)throw Error('Unverified memo byte limit');
 const command=parseV6TextMemo(encoder.encode(directive));if(!['fire','new'].includes(command.kind)){if(text)throw Error('War Cry requires a launch');return{cry:'',memo:directive,available:0,bytes:memoByteLength(directive),shortened:false};}
 const available=Math.max(0,limit-memoByteLength(directive)-1);if(!text)return{cry:'',memo:directive,available,bytes:memoByteLength(directive),shortened:false};
 validateCry(text);if(!globalThis.Intl?.Segmenter)throw Error('Grapheme support unavailable');let cry='',used=0;
 for(const {segment}of new Intl.Segmenter('und',{granularity:'grapheme'}).segment(text)){const n=memoByteLength(segment);if(used+n>available)break;used+=n;cry+=segment;}
 const memo=directive+(cry?'|'+cry:'');return{cry,memo,available,bytes:memoByteLength(memo),shortened:cry!==text};
}
export function parseWarCryMemo(bytes){
 if(!(bytes instanceof Uint8Array)||!bytes.length||bytes.length>MEMO_LIMIT)throw Error('memo length');
 const text=decoder.decode(bytes),split=text.indexOf('|');
 if(split<0)return{command:parseV6TextMemo(bytes),cry:''};
 const directive=text.slice(0,split),cry=validateCry(text.slice(split+1)),command=parseV6TextMemo(encoder.encode(directive));
 // Prefix canonical casing/token formatting is deliberately the existing parser;
 // no additional operation or trailing token is introduced by the suffix.
 if(!['fire','new'].includes(command.kind))throw Error('War Cry requires FIRE or NEW');
 return{command,cry};
}
export function decodeWarCryLedgerMemo(legacy,blob=null){
 if(blob===null||blob.length===8&&[0xc6,0xd6,0xf6,0x42].includes(blob[0]))return{command:decodeV6LedgerMemo(legacy,blob),cry:''};
 return parseWarCryMemo(blob);
}
/** Distinct bounded normalized envelope: 8 magic +32 account +8 amount +8 command +1 byte length +UTF8. */
export function encodeAnnotatedPayment(account,amount,command,cry=''){
 const a=Uint8Array.from(account.match(/../g)??[],h=>parseInt(h,16));if(!/^[0-9a-f]{64}$/.test(account))throw Error('account');
 if(BigInt(amount)<0n||BigInt(amount)>18446744073709551615n)throw Error('amount');if(cry)validateCry(cry);const t=encoder.encode(cry);if(t.length>31)throw Error('annotation length');const out=new Uint8Array(57+t.length);out.set(encoder.encode('BTZPAY03'));out.set(a,8);new DataView(out.buffer).setBigUint64(40,BigInt(amount));out.set(encodeV6Memo(command),48);out[56]=t.length;out.set(t,57);return out;
}

export function readAnnotatedPayment(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.length<57||bytes.length>88||decoder.decode(bytes.slice(0,8))!=='BTZPAY03'||bytes[56]!==bytes.length-57)throw Error('annotated payment envelope');
 const cry=bytes.length>57?validateCry(decoder.decode(bytes.slice(57))):'';
 const memo=bytes.slice(48,56);if(cry){const c=decodeV6LedgerMemo(0n,memo);if(!['fire','new'].includes(c.kind))throw Error('annotated launch command');}
 return {account:Array.from(bytes.slice(8,40),b=>b.toString(16).padStart(2,'0')).join(''),amount:new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getBigUint64(40),memo,cry};
}
export function semanticPayment(bytes){
 if(decoder.decode(bytes.slice(0,8))!=='BTZPAY03')return bytes;
 readAnnotatedPayment(bytes);const out=bytes.slice(0,56);out.set(encoder.encode('BTZPAY02'));return out;
}
