import test from 'node:test';import assert from 'node:assert/strict';
import {screenToWorld,worldToScreen,encodedHeading} from '../../apps/b2z-observer/headings.mjs';
import {parseTextMemo} from '../../packages/protocol/memo.mjs';
for(const [screen,world]of [[0,225],[45,255],[90,315],[135,15],[180,45],[225,75],[270,135],[315,195]])test(`screen heading ${screen} -> canonical ${world}`,()=>{assert.ok(Math.abs(screenToWorld(screen)-world)<1e-9);assert.ok(Math.abs(worldToScreen(world)-screen)<1e-9);assert.equal(Number(encodedHeading(String(screen))),world);});
test('heading boundary precision is canonical, empty/invalid values are rejected',()=>{for(const n of ['',-1,360,NaN,'no'])assert.throws(()=>encodedHeading(n));for(const angle of [0,.01,12.34,359.99]){const text=encodedHeading(angle),wire=parseTextMemo(new TextEncoder().encode('ANGLE '+text));assert.ok(Number.isInteger(wire.value)&&wire.value<=65535);assert.ok(Math.abs(((worldToScreen(wire.value*360/65536)-angle+540)%360)-180)<.03);}});

test('a stored binary heading feeds an immediate Fire quote at Ledger memo precision',async()=>{
 const {storedHeadingForMemo}=await import('../../apps/b2z-observer/headings.mjs');
 const {parseV6TextMemo}=await import('../../packages/protocol/memo-v6.mjs');
 const encode=new TextEncoder();
 for(const [heading,text] of [[0,'0'],[6827,'37.5'],[40960,'225'],[65535,'359.99']]){
  assert.equal(storedHeadingForMemo(heading),text);
  assert.equal(parseV6TextMemo(encode.encode(`FIRE 1 ${text} 1`)).kind,'fire');
 }
});
