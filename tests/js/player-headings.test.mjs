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

test('all 65,536 stored headings produce the nearest canonical Fire angle in every view',async()=>{
 const {storedHeadingForMemo}=await import('../../apps/b2z-observer/headings.mjs');
 const {parseContextText}=await import('../../packages/protocol/context-structures.mjs');
 const {Camera}=await import('../../apps/b2z-observer/camera.mjs');
 const {describeTextMemo}=await import('../../packages/protocol/memo.mjs');
 const encode=new TextEncoder(),camera=new Camera();
 camera.configure(1000,1000,320,640,true);
 for(let heading=0;heading<65536;heading++){
  const angle=storedHeadingForMemo(heading),memo=`FIRE 1 ${angle} 1`;
  assert.match(angle,/^(?:0|[1-9][0-9]{0,2})(?:\.[0-9]?[1-9])?$/);
  assert.equal(describeTextMemo('angle',angle).text,`ANGLE ${angle}`);
  const parsed=parseContextText(encode.encode(memo)).command;
  assert.equal(parsed.kind,'fire');
  const [whole,fraction='']=angle.split('.'),centi=Number(whole)*100+Number(fraction.padEnd(2,'0'));
  const gap=Math.abs(heading*36000-centi*65536);
  assert(centi<36000&&Math.min(gap,36000*65536-gap)<=32768);
  assert(Math.min(Math.abs(parsed.angle-heading),65536-Math.abs(parsed.angle-heading))<=1);
  const radians=Number(angle)*Math.PI/180;
  for(let quarter=0;quarter<4;quarter++){
   camera.angle=-quarter*Math.PI/2;
   const p=camera.screen(camera.x+Math.cos(radians),camera.y+Math.sin(radians));
   assert(Number.isFinite(p.x)&&Number.isFinite(p.y));
   assert(Math.hypot(p.x-160,p.y-320)>0);
  }
 }
 for(const invalid of [-1,65536,1.1,NaN,'1'])assert.throws(()=>storedHeadingForMemo(invalid),/HEADING_BOUNDS/);
});
