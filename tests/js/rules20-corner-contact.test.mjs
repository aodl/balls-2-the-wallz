import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeWorld,setOwner,wrapCell,neighbors} from '../../packages/kernels/b2z/world.mjs';
import {B2zKernel,classify,passage} from '../../packages/kernels/b2z/kernel.mjs';
import {decodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';

const rows=JSON.parse(readFileSync(new URL('../fixtures/context-structures-v13.json',import.meta.url))).rows;
const publicCorners=JSON.parse(readFileSync(new URL('../fixtures/rules20-corner-public-equality.json',import.meta.url))).rows;
function world(){
 const w=decodeWorld(Buffer.from(rows[0].initial_hex,'hex'));
 w.version=12; // Exercise the successor contact law without claiming a migration.
 return w;
}
function contact(w,x,y,sx,sy){
 const source=y*w.width+x,sideX=wrapCell(x+sx,y,w.width,w.height),sideY=wrapCell(x,y+sy,w.width,w.height),diagonal=wrapCell(x+sx,y+sy,w.width,w.height);
 const b={...w.balls[0],cell:source,vx:sx*32000,vy:sy*32000};
 return {b,crossing:{ball:b.id,time:[0n,1n],x:true,y:true,xwall:0,ywall:0},sideX,sideY,diagonal};
}
test('Rules20 vertex chooses one eligible side with canonical checkerboard bias',()=>{
 for(const [sx,sy] of [[1,1],[1,-1],[-1,1],[-1,-1]])for(const x of [500,501]){
  const w=world(),{b,crossing,sideX,sideY}=contact(w,x,500,sx,sy);
  setOwner(w,sideX,0);setOwner(w,sideY,0);
  const i=classify(w,b,crossing),xIsLeft=sx===sy;
  const expectedX=(((x+500)&1)===0)===xIsLeft;
  assert.equal(i.attack.target,expectedX?sideX:sideY);
  assert.deepEqual(passage(w,b,i),{passX:false,passY:false,vertexBlocked:false});
 }
});
test('mixed side ownership selects exactly one foreign contact in every diagonal direction',()=>{
 for(const [sx,sy] of [[1,1],[1,-1],[-1,1],[-1,-1]])for(const x of [500,501]){
  for(const [ownerX,ownerY] of [[0,0],[2,2],[0,2],[2,0],[1,0],[1,2],[0,1],[2,1]]){
   const w=world(),{b,crossing,sideX,sideY,diagonal}=contact(w,x,500,sx,sy);
   setOwner(w,sideX,ownerX);setOwner(w,sideY,ownerY);setOwner(w,diagonal,1);
   const preferredX=((((x+500)&1)===0)===(sx===sy));
   const expected=ownerX===1?sideY:ownerY===1?sideX:preferredX?sideX:sideY;
   const intent=classify(w,b,crossing);
   assert.equal(intent.attack?.target,expected,`${sx},${sy} ${x} ${ownerX}/${ownerY}`);
   assert.equal(intent.targets.filter(t=>t.capturable).length,(ownerX!==1)+(ownerY!==1));
  }
 }
});
test('Rules20 foreign diagonal after friendly sides uses one face; a Cannon corner remains solid',()=>{
 for(const x of [500,501]){
  const w=world(),{b,crossing,diagonal}=contact(w,x,500,1,1);
  setOwner(w,diagonal,0);
  const i=classify(w,b,crossing);
  assert.equal(i.attack.target,diagonal);
  assert.deepEqual(passage(w,b,i),x%2===0?{passX:true,passY:false,vertexBlocked:false}:{passX:false,passY:true,vertexBlocked:false});
  w.cannons[0].cell=diagonal;
  const solid=classify(w,b,crossing);
  assert.equal(solid.attack,null);
  assert.deepEqual(passage(w,b,solid),{passX:false,passY:false,vertexBlocked:true});
 }
});
test('Rules19 retains the historical lowest-cell side and blocked diagonal law',()=>{
 const w=world(),{b,crossing,sideX,sideY,diagonal}=contact(w,500,500,1,1);
 w.version=11;setOwner(w,sideX,0);setOwner(w,sideY,0);
 assert.equal(classify(w,b,crossing).attack.target,Math.min(sideX,sideY));
 setOwner(w,sideX,1);setOwner(w,sideY,1);setOwner(w,diagonal,0);
 const historical=classify(w,b,crossing);
 assert.equal(historical.attack,null);
 assert.deepEqual(passage(w,b,historical),{passX:false,passY:false,vertexBlocked:true});
});
test('Rules20 chooses the only eligible side and wraps the canonical checkerboard across both seams',()=>{
 for(const [x,y,sx,sy] of [[0,0,-1,-1],[999,999,1,1],[0,999,-1,1],[999,0,1,-1]]){
  const w=world(),{b,crossing,sideX,sideY}=contact(w,x,y,sx,sy);
  setOwner(w,sideX,2);setOwner(w,sideY,0);
  const both=classify(w,b,crossing),xIsLeft=sx===sy,expectedX=(((x+y)&1)===0)===xIsLeft;
  assert.equal(both.attack.target,expectedX?sideX:sideY);
  setOwner(w,sideX,1);
  const one=classify(w,b,crossing);
  assert.equal(one.attack.target,sideY);
  assert.deepEqual(passage(w,b,one),{passX:true,passY:false,vertexBlocked:false});
 }
});
test('a foreign diagonal strike originates in the passed friendly side cell',()=>{
 const w=world(),{b,crossing,sideX,sideY,diagonal}=contact(w,500,500,1,1);
 setOwner(w,diagonal,2);
 const i=classify(w,b,crossing);
 assert.equal(i.attack.target,diagonal);
 assert.equal(i.attack.from,sideX);
 assert.equal(i.attack.axis,'y');
 assert.equal(neighbors(i.attack.from,w.width,w.height,true).includes(diagonal),true);
 assert.deepEqual(passage(w,b,i),{passX:true,passY:false,vertexBlocked:false});
 const odd=world(),other=contact(odd,501,500,1,1);
 setOwner(odd,other.diagonal,2);
 const j=classify(odd,other.b,other.crossing);
 assert.equal(j.attack.from,other.sideY);
 assert.equal(j.attack.axis,'x');
});
test('eight exact diagonal contacts capture once and preserve Rules20 public bytes',()=>{
 for(const row of publicCorners){
  const initial=Buffer.from(row.initial_hex,'hex');
  const inputs=decodeCanonical(Buffer.from(row.inputs_hex,'hex'));
  const context=decodeCanonical(Buffer.from(row.context_hex,'hex'));
  const cursor=B2zKernel.begin(initial,inputs,context);
  let complete=false;
  for(let n=0;n<1000&&!complete;n++)complete=cursor.step(127).complete;
  assert.equal(complete,true,row.name);
  cursor.finalizeElapsed(BigInt(row.observed_ns));
  const output=cursor.result();
  for(const kind of ['state','events','scores'])
   assert.equal(Buffer.from(output[kind]).toString('hex'),row.outputs[kind].hex,`${row.name} ${kind}`);
  const captures=decodeCanonical(output.events).events.filter(event=>event.kind==='capture');
  assert.deepEqual(captures.map(event=>event.target),[row.expected_capture],row.name);
 }
});
