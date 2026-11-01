import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {decodeV6LedgerMemo,decodeV6Memo,encodeV6Memo,parseV6TextMemo} from '../../packages/protocol/memo-v6.mjs';
import {decodeLedgerMemo,decodeMemo,numericMemo} from '../../packages/protocol/memo.mjs';
const text=s=>new TextEncoder().encode(s),hex=b=>Buffer.from(b).toString('hex');
for(const line of fs.readFileSync(new URL('../fixtures/memos-v6.tsv',import.meta.url),'utf8').split('\n').filter(s=>s&&!s.startsWith('#'))){
 const [source,expected]=line.split('\t');test('v6 memo '+source,()=>{
  if(expected==='INVALID'){assert.throws(()=>parseV6TextMemo(text(source)));return;}
  const command=parseV6TextMemo(text(source)),bytes=encodeV6Memo(command);assert.equal(hex(bytes),expected);assert.deepEqual(decodeV6Memo(bytes),command);
  assert.deepEqual(decodeV6LedgerMemo(18446744073709551615n,text(source)),command);assert.deepEqual(decodeV6LedgerMemo(BigInt('0x'+expected)),command);
  if(!['angle','move'].includes(command.kind)){assert.throws(()=>decodeMemo(bytes));assert.throws(()=>decodeLedgerMemo(0n,hex(text(source))));}
 });
}
test('v6 malformed blobs and binary fields cannot fall back',()=>{
 const old=numericMemo({kind:'angle',value:0});assert.throws(()=>decodeV6LedgerMemo(old,new Uint8Array()));
 for(const h of ['f600000000000001','f600000001000000','c6000001ffffff01','d600000001ffffff'])assert.throws(()=>decodeV6Memo(Buffer.from(h,'hex')));
 assert.throws(()=>decodeV6LedgerMemo(Number(old)));
});
