import test from 'node:test';import assert from 'node:assert/strict';
import {Camera,splitInterval} from '../../apps/b2z-observer/camera.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('camera preserves world aspect and pointer anchor at bounded zoom',()=>{
 const c=new Camera();c.configure(32,32,1200,800);assert.equal(c.scale,37.5);
 const a=c.world(250,320);c.zoom(2,250,320);const b=c.world(250,320);near(a.x,b.x);near(a.y,b.y);
 for(const factor of [1e9,1e-9]){c.zoom(factor);assert.ok(c.scale>=c.fitScale&&c.scale<=c.fitScale*24);}
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
 assert.equal(c.minimapRects().length,4);const area=c.minimapRects().reduce((n,r)=>n+r.width*r.height,0),bounds=c.bounds();near(area,bounds.width*bounds.height);
 for(const r of c.minimapRects())assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=32&&r.y+r.height<=32);
 assert.ok(c.copies().length<=4);c.pan(1e5,-1e5);assert.ok(c.x>=0&&c.x<32&&c.y>=0&&c.y<32);
 assert.deepEqual(splitInterval(30,4,32),[[30,32],[0,2]]);assert.deepEqual(splitInterval(-100,64,32),[[0,32]]);
});
test('million-cell desktop and mobile reach a useful absolute cell scale without losing pointer picking',()=>{
 for(const [width,height] of [[1440,900],[390,844]]){
  const c=new Camera();c.configure(1000,1000,width,height,true);c.frameCell(47297);near(c.scale,24);near(c.x,297.5);near(c.y,47.5);
  c.zoom(1e6,width*.3,height*.4);near(c.scale,96);const p=c.screen(297.5,47.5);assert.equal(c.cell(p.x,p.y),47297);
  const anchor=c.world(75,100);c.zoom(.5,75,100);near(c.world(75,100).x,anchor.x);near(c.world(75,100).y,anchor.y);
  c.pan(12,-7);const prior={x:c.x,y:c.y,scale:c.scale};c.configure(1000,1000,width,height,true);assert.deepEqual({x:c.x,y:c.y,scale:c.scale},prior);
  c.fit();near(c.scale,c.fitScale);
 }
});
