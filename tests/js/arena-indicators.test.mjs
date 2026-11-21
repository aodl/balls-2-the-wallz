import assert from 'node:assert/strict';
import test from 'node:test';
import {Camera} from '../../apps/b2z-observer/camera.mjs';
import {tileIndicator,turretPresentation} from '../../apps/b2z-observer/arena-indicators.mjs';
import {movementArrow} from '../../apps/b2z-observer/guide-clearance.mjs';

test('tile indicators use the picked seam copy at all orientations and keep a compact low-zoom marker',()=>{
 const camera=new Camera();
 camera.configure(1000,1000,320,640,true);
 camera.centre(999.2,999.2);
 for(let i=0;i<4;i++){
  camera.angle=-i*Math.PI/2;
  for(const scale of [2,15,60]){
   camera.scale=scale;
   const at=camera.cellPoint(0),outline=tileIndicator(camera,0,'destination');
   assert.equal(camera.cell(at.sx,at.sy),0);
   assert.equal(outline.marker,scale===2);
   assert.equal(outline.segments.length,4);
   assert.equal(tileIndicator(camera,0,'invalid').segments.length,6);
   for(const [x,y] of outline.segments.map(([start])=>start)){
    if(!outline.marker)assert.deepEqual([Math.abs(x-at.x),Math.abs(y-at.y)],[.5,.5]);
    else {const p=camera.screen(x,y);assert.ok(Math.abs(Math.hypot(p.x-at.sx,p.y-at.sy)-6)<1e-8);}
   }
  }
 }
});

test('distant movement guide remains by the visible wrapped destination',()=>{
 const camera=new Camera();
 camera.configure(1000,1000,320,640,true);
 camera.scale=32;camera.centre(.5,.5);
 assert.ok(!camera.cellPoint(990).visible);
 const arrow=movementArrow(camera,990,0);
 assert.ok(arrow&&arrow.world[1][0]>arrow.world[0][0]);
 assert.ok(Math.hypot(arrow.screen[0].x-arrow.screen[1].x,arrow.screen[0].y-arrow.screen[1].y)<160);
 const [start,end]=arrow.screen,mid={x:(start.x+end.x)/2,y:(start.y+end.y)/2};
 const card={left:mid.x-12,right:mid.x+12,top:mid.y-12,bottom:mid.y+12,width:24,height:24};
 const clipped=movementArrow(camera,990,0,[card]);
 assert.deepEqual(clipped.screen[1],end);
 assert.ok(Math.hypot(clipped.screen[0].x-end.x,clipped.screen[0].y-end.y)<Math.hypot(start.x-end.x,start.y-end.y)/2);
});

test('turret wrap, interruption and direct aim are visual only',()=>{
 const model=turretPresentation(),c={id:1,cell:0,heading:64626,generation:0},cannons=new Map([[c.id,c]]);
 const aim={cannon:{id:1,cell:0},heading:910};
 model.sample(cannons,null,0,false);
 const initial=model.angle(1);
 model.sample(cannons,aim,10,false);
 assert.equal(model.angle(1),initial);
 model.sample(cannons,aim,150,false);
 assert.ok(Math.abs(model.angle(1))<.01);
 const middle=model.angle(1);
 model.sample(cannons,null,150,false);
 assert.equal(model.angle(1),middle);
 model.sample(cannons,null,290,false);
 assert.ok(model.angle(1)<middle&&model.angle(1)>initial);
 model.sample(cannons,aim,300,false);
 const retarget=model.angle(1);
 assert.ok(retarget<0&&retarget>initial);
 model.sample(cannons,{...aim,heading:16384},315,false);
 assert.equal(model.angle(1),Math.PI/2);
 assert.equal(c.heading,64626);
 assert.equal(aim.heading,910);
 model.sample(cannons,null,316,true);
 assert.equal(model.angle(1),initial);
 cannons.delete(1);model.sample(cannons,null,320,false);
 assert.equal(model.angle(1),0);
});

test('an authoritative relocation reinitializes the turret from the new structure',()=>{
 const model=turretPresentation(),cannons=new Map([[1,{id:1,cell:0,heading:0,generation:0}]]);
 const aim={cannon:{id:1,cell:0},heading:16384};
 model.sample(cannons,aim,0,false);
 model.sample(cannons,aim,140,false);
 assert.ok(model.angle(1)>0&&model.angle(1)<Math.PI/2);
 cannons.set(1,{id:1,cell:1000,heading:32768,generation:1});
 model.sample(cannons,aim,150,false);
 assert.ok(Math.abs(model.angle(1))===Math.PI);
});
