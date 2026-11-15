import test from 'node:test';import assert from 'node:assert/strict';
import {fitCry,parseWarCryMemo,validateCry,memoByteLength}from'../../packages/protocol/war-cry.mjs';
import{parseV6TextMemo}from'../../packages/protocol/memo-v6.mjs';
const bytes=s=>new TextEncoder().encode(s);
test('old parser rejects suffix; new parser retains exact UTF8 annotation',()=>{assert.throws(()=>parseV6TextMemo(bytes('FIRE 1 0 1|Hi')));assert.equal(parseWarCryMemo(bytes('FIRE 1 0 1|é😀')).cry,'é😀');});
test('complete byte budget and exact grapheme-prefix, no directive edits',()=>{
 for(const text of ['a'.repeat(100),'é'.repeat(30),'漢'.repeat(30),'e\u0301'.repeat(20),'🇬🇧'.repeat(8),'👩🏽‍🚀'.repeat(8)]){const r=fitCry('FIRE 1 217.5 1',text);assert.ok(r.bytes<=32);assert.ok(text.startsWith(r.cry));assert.equal(parseWarCryMemo(bytes(r.memo)).cry,r.cry);}
 const a=fitCry('FIRE 1 217.5 1','a'.repeat(17));assert.equal(a.bytes,32);assert.equal(fitCry('FIRE 1 217.5 64',a.cry).cry.length,16);assert.equal(fitCry('FIRE 1 217.5 1',a.cry.slice(0,16)).cry.length,16);
 assert.equal(fitCry('FIRE 4294967295 359.99 64','👩🏽‍🚀Hi').cry,'');
});
test('strict malformed input and dangerous controls fail closed',()=>{
 for(const s of ['FIRE 1 0 1|','FIRE 1 0 1|a|b','MOVE 1 2|hi','ANGLE 0|hi','FIRE 1 0 1|a\nb','FIRE 1 0 1|a\u202eb','FIRE 1 0 1|'+('x'.repeat(32))])assert.throws(()=>parseWarCryMemo(bytes(s)),s);
 assert.throws(()=>parseWarCryMemo(Uint8Array.of(0xff)));assert.throws(()=>validateCry('\ud800'));assert.equal(fitCry('FIRE 1 0 1','').memo,'FIRE 1 0 1');assert.equal(fitCry('FIRE 1 0 1','None').cry,'None');assert.equal(validateCry('<b>Charge!</b>'),'<b>Charge!</b>');
});
test('exact configuration gate cannot be enabled by one local flag',async()=>{const {warCrySupported}=await import('../../apps/b2z-observer/war-cry-policy.mjs'),{WAR_CRY_CONFIG,ENTRY_CONFIG,CLEARANCE_CONFIG}=await import('../../packages/kernels/b2z/world.mjs');assert.equal(warCrySupported(WAR_CRY_CONFIG),true);for(const c of[ENTRY_CONFIG,CLEARANCE_CONFIG,{...ENTRY_CONFIG,war_cry_capability:'btz-war-cry-1'}, {...WAR_CRY_CONFIG,move_e8s:1n},{...WAR_CRY_CONFIG,memo_adapter_version:4}])assert.equal(warCrySupported(c),false);});

test('shared JS/native strict memo byte vectors',async()=>{const {readFile}=await import('node:fs/promises'),f=JSON.parse(await readFile(new URL('../fixtures/war-cry-memos.json',import.meta.url)));assert.equal(f.memo_limit,32);for(const r of f.rows){const b=Buffer.from(r.raw_hex,'hex');if(r.accepted)assert.equal(parseWarCryMemo(b).cry,r.cry,r.name);else assert.throws(()=>parseWarCryMemo(b),r.name);}});
