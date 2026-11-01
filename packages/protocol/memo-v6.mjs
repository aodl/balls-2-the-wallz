/** Rules-v6 opt-in only. Existing v1/v2/v3 memo interpreters are unchanged. */
import {decodeMemo,encodeMemo,parseTextMemo} from './memo.mjs';
import {be,concat,readBE,uint} from '../../node_modules/@dtr/timeline-runtime/packages/protocol/bytes.mjs';
export const MAX_QUANTITY=64;
export const MEMO_ADAPTER_VERSION=4;
function bounded(c){
  if(['angle','move'].includes(c?.kind)){encodeMemo(c);return c;}
  if(!['fire','move_cannon','new'].includes(c?.kind))throw Error('v6 memo opcode');
  if(c.kind!=='new'&&uint(c.cannon,32,'cannon')===0n)throw Error('cannon must be positive');
  if(c.kind!=='move_cannon'){
    uint(c.angle,16,'angle');const q=uint(c.quantity,8,'quantity');if(q<1n||q>64n)throw Error('quantity must be 1–64');
  }
  if(c.kind==='move_cannon'||c.cell!==null&&c.cell!==undefined){if(uint(c.cell,24,'cell')>=1000000n)throw Error('cell bounds');}
  return c;
}
export function encodeV6Memo(command){
  const c=bounded(command);
  if(['angle','move'].includes(c.kind))return encodeMemo(c);
  if(c.kind==='fire')return concat(Uint8Array.of(0xf6),be(BigInt(c.cannon),4),be(BigInt(c.angle),2),Uint8Array.of(c.quantity));
  if(c.kind==='move_cannon')return concat(Uint8Array.of(0xd6),be(BigInt(c.cannon),4),be(BigInt(c.cell),3));
  return concat(Uint8Array.of(0xc6),be(BigInt(c.angle),2),Uint8Array.of(c.quantity),be(BigInt(c.cell??0xffffff),3),Uint8Array.of(0));
}
export function decodeV6Memo(bytes){
  if(!(bytes instanceof Uint8Array)||bytes.length!==8)throw Error('memo length');
  const number=(a,b)=>Number(readBE(bytes.slice(a,b)));
  if(bytes[0]===0xf6)return bounded({kind:'fire',cannon:number(1,5),angle:number(5,7),quantity:bytes[7]});
  if(bytes[0]===0xd6)return bounded({kind:'move_cannon',cannon:number(1,5),cell:number(5,8)});
  if(bytes[0]===0xc6){if(bytes[7])throw Error('memo reserved bits');const cell=number(4,7);return bounded({kind:'new',angle:number(1,3),quantity:bytes[3],cell:cell===0xffffff?null:cell});}
  return decodeMemo(bytes);
}
export function parseV6TextMemo(bytes){
  if(!(bytes instanceof Uint8Array)||!bytes.length||bytes.length>32)throw Error('memo length');
  if(bytes.some(b=>b<32||b>126))throw Error('memo ASCII');
  let text=String.fromCharCode(...bytes).replace(/^ +| +$/g,'');if(/^BTZ /i.test(text))text=text.slice(4);
  const p=text.split(' '),op=p[0].toUpperCase();
  const number=s=>{if(!/^[0-9]+$/.test(s??''))throw Error('memo integer');return Number(uint(BigInt(s),32,'memo integer'));};
  const angle=s=>parseTextMemo(new TextEncoder().encode('ANGLE '+s)).value;
  if(op==='FIRE'&&p.length===4)return bounded({kind:'fire',cannon:number(p[1]),angle:angle(p[2]),quantity:number(p[3])});
  if(op==='MOVE'&&p.length===3)return bounded({kind:'move_cannon',cannon:number(p[1]),cell:number(p[2])});
  if(op==='NEW'&&(p.length===3||p.length===4))return bounded({kind:'new',angle:angle(p[1]),quantity:number(p[2]),cell:p.length===4?number(p[3]):null});
  return parseTextMemo(bytes);
}
export function decodeV6LedgerMemo(legacy,blob=null){
  if(blob===null)return decodeV6Memo(be(uint(legacy,64,'legacy memo'),8));
  if(!(blob instanceof Uint8Array))throw Error('memo bytes');
  if(blob.length===8&&([0xc6,0xd6,0xf6].includes(blob[0])||blob[0]===0x42&&blob[1]===0x54&&blob[2]===0x5a))return decodeV6Memo(blob);
  return parseV6TextMemo(blob);
}
