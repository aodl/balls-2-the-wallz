/** Adapter7 only. No historical parser accepts DEFLECT or BTZPAY04. */
import{encodeV6Memo,decodeV6Memo}from'./memo-v6.mjs';
import{parseWarCryMemo,encodeAnnotatedPayment,readAnnotatedPayment}from'./war-cry.mjs';
import{be,uint}from'../../node_modules/@dtr/timeline-runtime/packages/protocol/bytes.mjs';
export const DEFLECTOR_ADAPTER=7;
import{ORIENTATIONS}from'./deflector-orientation.generated.mjs';
export{ORIENTATIONS}from'./deflector-orientation.generated.mjs';
export function encodeDeflectorMemo(c){
 if(c?.kind!=='deflect')return encodeV6Memo(c);
 const o=ORIENTATIONS.indexOf(c.orientation);
 if(!Number.isSafeInteger(c.cell)||c.cell<0||c.cell>=1000000||o<0)throw Error('deflector command');
 return Uint8Array.of(0xb7,c.cell>>>16,c.cell>>>8&255,c.cell&255,o,0,0,0);
}
export function decodeDeflectorMemo(b){
 if(!(b instanceof Uint8Array)||b.length!==8)throw Error('memo length');
 if(b[0]!==0xb7)return decodeV6Memo(b);
 if(b[4]>3||b.slice(5).some(x=>x))throw Error('deflector reserved bits');
 const c={kind:'deflect',cell:b[1]*65536+b[2]*256+b[3],orientation:ORIENTATIONS[b[4]]};encodeDeflectorMemo(c);return c;
}
export function parseDeflectorText(bytes){
 if(!(bytes instanceof Uint8Array)||!bytes.length||bytes.length>32)throw Error('memo length');
 // A present malformed DEFLECT does not fall back to any other command.
 if(bytes[0]===68||bytes[0]===100){
  if(bytes.some(b=>b<32||b>126))throw Error('deflector ASCII');
  const text=String.fromCharCode(...bytes),m=/^DEFLECT (0|[1-9][0-9]{0,5}) (NE|SE|SW|NW)$/.exec(text);
  if(!m)throw Error('canonical deflector memo');
  const command={kind:'deflect',cell:Number(m[1]),orientation:m[2]};encodeDeflectorMemo(command);return{command,cry:''};
 }
 return parseWarCryMemo(bytes);
}
export function decodeDeflectorLedgerMemo(legacy,blob=null){
 if(blob===null)return{command:decodeDeflectorMemo(be(uint(legacy,64,'legacy memo'),8)),cry:''};
 if(!(blob instanceof Uint8Array))throw Error('memo bytes');
 if(blob.length===8&&[0xb7,0xc6,0xd6,0xf6,0x42].includes(blob[0]))return{command:decodeDeflectorMemo(blob),cry:''};
 return parseDeflectorText(blob);
}
export function encodeDeflectorPayment(account,amount,command,cry=''){
 if(command.kind!=='deflect'){
  const b=encodeAnnotatedPayment(account,amount,command,cry);b[7]=52;return b;
 }
 if(cry)throw Error('deflector cannot carry War Cry');
 // Reuse exact account/amount validation without teaching old codecs new opcodes.
 const b=encodeAnnotatedPayment(account,amount,{kind:'angle',value:0},'');b[7]=52;b.set(encodeDeflectorMemo(command),48);return b;
}
export function readDeflectorPayment(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.length<57||bytes.length>88||new TextDecoder().decode(bytes.slice(0,8))!=='BTZPAY04')throw Error('deflector envelope');
 const legacy=bytes.slice();legacy[7]=51;
 // Invalid paid memos still reach the deterministic rejection/receipt path;
 // envelope validation must not turn them into a source-processing failure.
 if(bytes[48]===0xb7){
  if(bytes[56]!==0||bytes.length!==57)throw Error('deflector annotation');
  legacy.set(encodeV6Memo({kind:'angle',value:0}),48);
 }
 const p=readAnnotatedPayment(legacy);return{...p,memo:bytes.slice(48,56)};
}
export function semanticDeflectorPayment(bytes){
 if(new TextDecoder().decode(bytes.slice(0,8))!=='BTZPAY04')throw Error('adapter7 envelope');
 readDeflectorPayment(bytes);const b=bytes.slice(0,56);b[7]=50;return b;
}
