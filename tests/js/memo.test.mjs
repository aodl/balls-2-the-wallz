import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync}from'node:fs';
import {decodeMemo,encodeMemo,decodeLedgerMemo,numericMemo,describeMemo}from'../../packages/protocol/memo.mjs';
import {hex,unhex,uint}from'../../packages/protocol/bytes.mjs';
const rows=readFileSync(new URL('../fixtures/memos.tsv',import.meta.url),'utf8').trim().split('\n').filter(l=>!l.startsWith('#'));
for(const line of rows){const[k,v,h,n]=line.split('\t');test(`memo fixture ${k}/${v}`,()=>{const c={kind:k,value:Number(v)};assert.equal(hex(encodeMemo(c)),h);assert.deepEqual(decodeMemo(unhex(h)),c);assert.equal(numericMemo(c).toString(),n);assert.deepEqual(decodeLedgerMemo(n,null),c);assert.deepEqual(decodeLedgerMemo('0',h),c);});}
test('every u16 angle roundtrips',()=>{for(let i=0;i<65536;++i)assert.deepEqual(decodeMemo(encodeMemo({kind:'angle',value:i})),{kind:'angle',value:i});});
for(const h of ['','00','42545a110000','42545a110000000000','42545b1100000000','42545a1300000000','42545a2100000000','42545a1100010000'])test(`invalid memo ${h}`,()=>assert.throws(()=>decodeMemo(unhex(h))));
test('blob and legacy conflict always rejects',()=>assert.throws(()=>decodeLedgerMemo(numericMemo({kind:'angle',value:0}),'42545a1100000000'),/mixed/));
test('malformed blob does not fall back',()=>assert.throws(()=>decodeLedgerMemo('0',''),/length/));
test('u64 memo Number is unsafe, decimal output is string',()=>{const d=describeMemo({kind:'move',value:4294967295});assert.equal(typeof d.legacy_nat64_decimal,'string');assert.throws(()=>uint(Number(d.legacy_nat64_decimal)));});
for(const value of [-1,65536,NaN,Infinity,1.5,'01',true])test(`invalid angle input ${String(value)}`,()=>assert.throws(()=>encodeMemo({kind:'angle',value})));
test('invalid move width',()=>assert.throws(()=>encodeMemo({kind:'move',value:4294967296})));
