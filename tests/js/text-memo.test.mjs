import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {parseTextMemo,decodeLedgerMemo,encodeMemo,describeTextMemo,decodeLedgerMemoV1} from '../../packages/protocol/memo.mjs';
const rows=readFileSync(new URL('../fixtures/text-memos.tsv',import.meta.url),'utf8').trimEnd().split('\n').filter(l=>!l.startsWith('#'));
for(const line of rows){
 const [name,blob,legacy,expected]=line.split('\t');
 test(`text adapter shared bytes: ${name}`,()=>{
  const normalize=()=>Buffer.from(encodeMemo(decodeLedgerMemo(legacy,blob==='-'?null:blob))).toString('hex');
  if(expected==='INVALID')assert.throws(normalize);else assert.equal(normalize(),expected);
 });
}
test('all 36000 centidegrees map with the integer rounding rule',()=>{
 for(let c=0;c<36000;c++)assert.equal(parseTextMemo(new TextEncoder().encode(`BTZ ANGLE ${(c/100).toFixed(2)}`)).value,Number((BigInt(c)*65536n+18000n)/36000n%65536n));
});
test('canonical builder and CLI share grammar; heading and degrees are distinct',()=>{
 for(const [kind,value,text] of [['angle','037.50','BTZ ANGLE 37.5'],['angle','225','BTZ ANGLE 225'],['move','00083','BTZ MOVE 83']]){
  const m=describeTextMemo(kind,value);assert.equal(m.text,text);assert.equal(m.blob_hex,Buffer.from(text).toString('hex'));
  assert.deepEqual(JSON.parse(execFileSync(process.execPath,['tools/command.mjs','memo',kind,value])),m);
 }
 for(const value of ['360','65535','NaN','-1','1e2','1.234'])assert.throws(()=>describeTextMemo('angle',value));
 assert.throws(()=>decodeLedgerMemoV1(0,Buffer.from('BTZ ANGLE 37.5').toString('hex')));
});
