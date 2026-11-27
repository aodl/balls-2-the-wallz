import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeWorld,setOwner,wrapCell,neighbors,validateWorld} from '../../packages/kernels/b2z/world.mjs';
import {B2zKernel,classify,passage} from '../../packages/kernels/b2z/kernel.mjs';
import {decodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';

const rows=JSON.parse(readFileSync(new URL('../fixtures/context-structures-v13.json',import.meta.url))).rows;
const publicCorners=JSON.parse(readFileSync(new URL('../fixtures/rules20-corner-public-equality.json',import.meta.url))).rows;
const opponentMatrix=JSON.parse(readFileSync(new URL('../fixtures/rules20-corner-matrix-public-equality.json',import.meta.url))).rows;
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
test('a genuine mixed structure corner takes precedence over a simultaneous territory contact',()=>{
 for(const structure of ['side-cannon','diagonal-cannon','side-deflector','diagonal-deflector']){
  const w=world(),{b,crossing,sideX,sideY,diagonal}=contact(w,500,500,1,1);
  setOwner(w,sideX,0);setOwner(w,sideY,0);setOwner(w,diagonal,0);
  const site=structure.startsWith('side')?sideX:diagonal;
  if(structure.endsWith('cannon'))w.cannons[0].cell=site;
  else w.deflectors.push({id:w.next_deflector_id++,cell:site,owner:1,orientation:'NE'});
  const intent=classify(w,b,crossing);
  assert.equal(intent.attack,null,structure);
  assert.deepEqual(passage(w,b,intent),{passX:false,passY:false,vertexBlocked:false},structure);
 }
 const w=world(),{b,crossing,sideX,sideY}=contact(w,500,500,1,1);
 setOwner(w,sideX,0);setOwner(w,sideY,1);
 w.cannons[0].cell=sideX;
 const intent=classify(w,b,crossing);
 assert.equal(intent.attack,null);
 assert.deepEqual(passage(w,b,intent),{passX:false,passY:true,vertexBlocked:false});
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
test('exact diagonal captures and mixed structure corners preserve Rules20 public bytes',()=>{
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
  assert.deepEqual(captures.map(event=>event.target),row.expected_capture===null?[]:[row.expected_capture],row.name);
  if(row.expected_motion){
   const balls=decodeWorld(output.state).balls.map(ball=>[ball.id,ball.cell,ball.vx,ball.vy]);
   assert.deepEqual(balls,row.expected_motion,row.name);
   const motion=decodeCanonical(output.events).events.filter(Array.isArray);
   assert.equal(motion.length,balls.length,row.name);
   assert.ok(motion.every(event=>event[2][0]==='0'),row.name);
  }
 }
});
test('active opponent corners, protected contact and simultaneous Balls retain exact public motion',()=>{
 for(const row of opponentMatrix){
  const cursor=B2zKernel.begin(Buffer.from(row.initial_hex,'hex'),
   decodeCanonical(Buffer.from(row.inputs_hex,'hex')),
   decodeCanonical(Buffer.from(row.context_hex,'hex')));
  let complete=false;
  for(let n=0;n<1000&&!complete;n++)complete=cursor.step(31).complete;
  assert.equal(complete,true,row.name);
  cursor.finalizeElapsed(BigInt(row.observed_ns));
  const output=cursor.result();
  for(const kind of ['state','events','scores'])
   assert.equal(Buffer.from(output[kind]).toString('hex'),row.outputs[kind].hex,`${row.name} ${kind}`);
  const world=decodeWorld(output.state),events=decodeCanonical(output.events).events;
  validateWorld(world);
  assert.deepEqual(events.filter(event=>event.kind==='capture').map(event=>event.target),
   row.expected_capture===null?[]:[row.expected_capture],row.name);
  assert.deepEqual(events.filter(event=>event.kind==='strike_armed').map(event=>event.strike.to),
   row.expected_strike===null?[]:[row.expected_strike],row.name);
  assert.deepEqual(world.balls.map(ball=>[ball.id,ball.cell,ball.vx,ball.vy]),row.expected_motion,row.name);
  const last=new Map(),motions=events.filter(Array.isArray);
  assert.ok(motions.length>0&&motions.length<100,row.name);
  for(const event of motions){
   const [numerator,denominator]=event[2].map(BigInt),previous=last.get(event[3]);
   if(previous)assert.ok(numerator*previous[1]>previous[0]*denominator,`${row.name} repeated contact time`);
   last.set(event[3],[numerator,denominator]);
  }
 }
});
