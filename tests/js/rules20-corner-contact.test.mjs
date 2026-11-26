import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeWorld,setOwner,wrapCell,neighbors} from '../../packages/kernels/b2z/world.mjs';
import {classify,passage} from '../../packages/kernels/b2z/kernel.mjs';

const rows=JSON.parse(readFileSync(new URL('../fixtures/context-structures-v13.json',import.meta.url))).rows;
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
