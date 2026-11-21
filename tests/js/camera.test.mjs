import test from 'node:test';import assert from 'node:assert/strict';
import {Camera,splitInterval,polygonArea} from '../../apps/b2z-observer/camera.mjs';
import {CameraController} from '../../apps/b2z-observer/camera-controller.mjs';
import {diamondMap} from '../../apps/b2z-observer/minimap-projection.mjs';
import {trajectoryGuide} from '../../apps/b2z-observer/guide-clearance.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('camera preserves world aspect and pointer anchor at bounded zoom',()=>{
 const c=new Camera();c.configure(32,32,1200,800);near(c.scale,.9*Math.min(1200/(64/Math.SQRT2),800/(64/Math.sqrt(6))));
 const a=c.world(250,320);c.zoom(2,250,320);const b=c.world(250,320);near(a.x,b.x);near(a.y,b.y);
 for(const factor of [1e9,1e-9]){c.zoom(factor);assert.ok(c.scale>=c.fitScale&&c.scale<=c.maxScale);}
});
test('pan, resize and publications preserve local camera centre and picking',()=>{
 const c=new Camera();c.configure(16,8,1000,800);c.zoom(3);c.pan(100,-90);const {x,y,scale}=c;
 c.configure(16,8,900,700);near(c.x,x);near(c.y,y);near(c.scale,scale);
 const screen=c.screen(4.5,2.5);assert.equal(c.cell(screen.x,screen.y),36);assert.equal(c.cell(-1e6,-1e6),null);
 c.fit();near(c.x,8);near(c.y,4);
});
test('wrap picking and split minimap rectangles refer to one underlying world',()=>{
 const c=new Camera();c.configure(32,32,800,800,true);c.zoom(4);c.centre(.5,.5);
 const screen=c.screen(-.5,-.5);assert.equal(c.cell(screen.x,screen.y),1023);
 assert.equal(c.minimapPolygons().length,4);const area=c.minimapPolygons().reduce((n,p)=>n+polygonArea(p),0);near(area,800*800*Math.sqrt(3)/c.scale**2);
 for(const p of c.minimapPolygons())for(const r of p)assert.ok(r.x>=-1e-8&&r.y>=-1e-8&&r.x<=32+1e-8&&r.y<=32+1e-8);
 assert.ok(c.copies().length<=4);c.pan(1e5,-1e5);assert.ok(c.x>=0&&c.x<32&&c.y>=0&&c.y<32);
 assert.deepEqual(splitInterval(30,4,32),[[30,32],[0,2]]);assert.deepEqual(splitInterval(-100,64,32),[[0,32]]);
});
test('million-cell desktop and mobile reach a useful absolute cell scale without losing pointer picking',()=>{
 for(const [width,height] of [[1440,900],[390,844]]){
  const c=new Camera();c.configure(1000,1000,width,height,true);c.frameCell(47297);near(c.scale,48);near(c.x,297.5);near(c.y,47.5);
  c.zoom(1e6,width*.3,height*.4);near(c.scale,96);const p=c.screen(297.5,47.5);assert.equal(c.cell(p.x,p.y),47297);
  const anchor=c.world(75,100);c.zoom(.5,75,100);near(c.world(75,100).x,anchor.x);near(c.world(75,100).y,anchor.y);
  c.pan(12,-7);const prior={x:c.x,y:c.y,scale:c.scale};c.configure(1000,1000,width,height,true);assert.deepEqual({x:c.x,y:c.y,scale:c.scale},prior);
  c.fit();near(c.scale,c.fitScale);
 }
});
test('each canonical direction becomes up and rotated projection still picks wrapped tiles',()=>{
 for(const [width,height] of [[1440,900],[390,844],[320,640]]){
  const c=new Camera();c.configure(1000,1000,width,height,true);c.frameCell(0);
  for(const [quarter,[dx,dy]] of [[-1,-1],[1,-1],[1,1],[-1,1]].entries()){
   c.angle=-quarter*Math.PI/2;
   const p=c.screen(c.x+dx,c.y+dy),picking=c.screen(-.5,-.5);
   near(p.x,width/2);assert.ok(p.y<height/2);assert.equal(c.cell(picking.x,picking.y),999999);
   const map=diamondMap(1000,1000,124,72,{x:.5,y:.5},c.angle),q=map.project(.5+dx,.5+dy);
   near(q.x,62);assert.ok(q.y<36);
   const recovered=map.inverse(q.x,q.y);
   near(recovered.x,(1000+.5+dx)%1000);near(recovered.y,(1000+.5+dy)%1000);
  }
 }
});
test('rotation keeps centre and zoom fixed, supports interruption and reduced motion',()=>{
 const c=new Camera();c.configure(1000,1000,320,640,true);c.frameCell(0);
 let now=0,reduced=false;
 const controller=new CameraController(c,{now:()=>now,reducedMotion:()=>reduced});
 const pose=[c.x,c.y,c.scale];controller.rotate(1);now=160;controller.update(now);near(c.angle,-Math.PI/4);
 controller.rotate(3);now=480;controller.update(now);near(c.angle,-3*Math.PI/2);
 reduced=true;controller.rotate(2);near(c.angle,-Math.PI);assert.deepEqual([c.x,c.y,c.scale],pose);
});
test('ball heading guide follows the rotated verified vector and clips before controls',()=>{
 const c=new Camera();c.configure(1000,1000,320,640,true);c.frameCell(0);c.angle=-Math.PI;
 const ball={x:.5,y:.5},velocity={vx:1024,vy:1024};
 const guide=trajectoryGuide(c,ball,velocity,[{left:110,right:210,top:180,bottom:224,width:100,height:44}]);
 near(guide.start.x,guide.end.x);assert.ok(guide.end.y<guide.start.y&&guide.end.y>224);
 assert.equal(trajectoryGuide(c,ball,{vx:0,vy:0}),null);
});

test('Three.js orbit and flat picker share the same upright projection at every azimuth', async()=>{
 const {OrthographicCamera,Vector3}=await import('three');
 const {orientSceneCamera}=await import('../../apps/b2z-observer/isometric-projection.mjs');
 const c=new Camera();c.configure(1000,1000,390,844,true);c.frameCell(0);
 const {width,height}=c.viewport,W=width/(2*c.scale),H=height/(2*c.scale);
 const ortho=new OrthographicCamera(-W,W,H,-H,1,10000);
 const ground=()=>[[0,0],[1,0],[1,1],[0,1]].map(([x,y])=>c.screen(x,y));
 const extent=(points,k)=>Math.max(...points.map(p=>p[k]))-Math.min(...points.map(p=>p[k]));
 for(let i=0;i<16;i++){
  c.angle=-i*Math.PI/8;orientSceneCamera(ortho,c);
  near(ortho.position.y,2500);
  near(Math.hypot(ortho.position.x-c.x,ortho.position.z-c.y),2500*Math.SQRT2);
  for(const [x,y,h] of [[-.5,-.5,0],[1.5,-.5,0],[.5,.5,1],[-.5,1.5,2]]){
   const flat=c.screen(x,y,h),actual=new Vector3(x,h,y).project(ortho);
   near((1+actual.x)*width/2,flat.x);near((1-actual.y)*height/2,flat.y);
   if(h===0){const picked=c.world(flat.x,flat.y);near(picked.x,x);near(picked.y,y);}
  }
  const floor=c.screen(.5,.5),roof=c.screen(.5,.5,1);
  near(roof.x,floor.x);near(floor.y-roof.y,c.scale*Math.sqrt(2/3));
  if(i%4===0){
   near(extent(ground(),'x')/extent(ground(),'y'),Math.sqrt(3));
   const map=diamondMap(1000,1000,124,72,null,c.angle);
   const corners=[[0,0],[1000,0],[1000,1000],[0,1000]].map(([x,y])=>map.projectCut(x,y));
   near(extent(corners,'x'),124);near(extent(corners,'y'),124/Math.sqrt(3));
  }
 }
});
