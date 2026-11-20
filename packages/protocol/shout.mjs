/** Proposed adapter9. A Shout extends the text envelope, never the directive. */
import {decodeContextLedgerMemo,decodeContextMemo,encodeContextMemo,encodeContextPayment,parseContextText,readContextPayment} from './context-structures.mjs';
import {MEMO_LIMIT,memoByteLength,validateCry} from './war-cry.mjs';

export const SHOUT_ADAPTER=9;
const encoder=new TextEncoder();
const decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
const payable=new Set(['fire','new','move_cannon','deflect','deflector_reorient','deflector_move']);

export function parseShoutMemo(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.length<1||bytes.length>MEMO_LIMIT)throw Error('memo length');
 const text=decoder.decode(bytes),split=text.indexOf('|');
 if(split<0)return parseContextText(bytes);
 const {command}=parseContextText(encoder.encode(text.slice(0,split)));
 if(!payable.has(command.kind))throw Error('Shout requires a payable action directive');
 return {command,cry:validateCry(text.slice(split+1))};
}

export function decodeShoutLedgerMemo(legacy,blob=null){
 if(blob!==null&&!(blob instanceof Uint8Array))throw Error('memo bytes');
 if(blob===null||blob.length===8&&[0xc6,0xd6,0xf6,0x42].includes(blob[0]))return decodeContextLedgerMemo(legacy,blob);
 return parseShoutMemo(blob);
}

export function fitShout(directive,text){
 const parsed=parseContextText(encoder.encode(directive));
 if(parsed.cry||!payable.has(parsed.command.kind))throw Error('Shout requires a bare payable action directive');
 const available=Math.max(0,MEMO_LIMIT-memoByteLength(directive)-1);
 if(!text)return {cry:'',memo:directive,available,bytes:memoByteLength(directive),shortened:false};
 validateCry(text);
 if(!globalThis.Intl?.Segmenter)throw Error('Grapheme support unavailable');
 let cry='',used=0;
 for(const {segment} of new Intl.Segmenter('und',{granularity:'grapheme'}).segment(text)){
  const size=memoByteLength(segment);
  if(used+size>available)break;
  cry+=segment;used+=size;
 }
 const memo=directive+(cry?'|'+cry:'');
 return {cry,memo,available,bytes:memoByteLength(memo),shortened:cry!==text};
}

export function encodeShoutPayment(account,amount,command,cry=''){
 const bare=encodeContextPayment(account,amount,command);
 if(cry&&!payable.has(command.kind))throw Error('Shout requires a payable action directive');
 const suffix=cry?encoder.encode(validateCry(cry)):new Uint8Array();
 if(suffix.length>31)throw Error('annotation length');
 const bytes=new Uint8Array(bare.length+suffix.length);
 bytes.set(bare);bytes[7]=54;bytes[56]=suffix.length;bytes.set(suffix,57);
 return bytes;
}

export function readShoutPayment(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.length<57||bytes.length>88||
    String.fromCharCode(...bytes.subarray(0,8))!=='BTZPAY06'||bytes[56]!==bytes.length-57)throw Error('adapter9 payment envelope');
 const bare=bytes.slice(0,57);bare[7]=53;bare[56]=0;
 const payment=readContextPayment(bare);
 if(bytes.length===57)return payment;
 if(!payable.has(decodeContextMemo(payment.memo).kind))throw Error('Shout requires a payable action directive');
 return {...payment,cry:validateCry(decoder.decode(bytes.subarray(57)))};
}

export function semanticShoutPayment(bytes){
 readShoutPayment(bytes);
 const result=bytes.slice(0,56);result[7]=50;return result;
}
