import test from 'node:test';import assert from 'node:assert/strict';
import {Camera} from '../../apps/b2z-observer/camera.mjs';
import {OrthographicCamera,Vector3} from 'three';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
for(const [width,height]of[[1440,900],[390,844],[320,640]])test(`UX-12 one ground mapping equals actual Three projection ${width}×${height}`,()=>{
 const c=new Camera();c.configure(1000,1000,width,height,true);c.frameCell(999999);
 const t=new OrthographicCamera(-width/c.scale/2,width/c.scale/2,height/c.scale/2,-height/c.scale/2,.1,10000);t.position.set(c.x+2500,2500,c.y+2500);t.lookAt(c.x,0,c.y);t.updateProjectionMatrix();t.updateMatrixWorld();
 for(const [x,y,h]of[[999.5,999.5,0],[1000.2,999.8,0],[1000.2,1000.3,.27],[998.4,997.9,.14]]){const p=c.screen(x,y,h),v=new Vector3(x,h,y).project(t);near(p.x,(v.x+1)*width/2);near(p.y,(1-v.y)*height/2);if(!h){const q=c.world(p.x,p.y);near(q.x,x);near(q.y,y);}}
 for(const angle of [0,37.5,90,135,180,225,270,315,359.99]){const r=angle*Math.PI/180,p=c.screen(c.x+Math.cos(r)*2,c.y+Math.sin(r)*2),q=c.world(p.x,p.y),actual=(Math.atan2(q.y-c.y,q.x-c.x)*180/Math.PI+360)%360;near((actual-angle+540)%360-180,0);}
 for(const [x,y,cell]of[[1000.5,1000.5,0],[-.5,-.5,999999],[1000.5,-.5,999000],[-.5,1000.5,999]]){const p=c.screen(x,y);assert.equal(c.cell(p.x,p.y),cell);}
 const anchor=c.world(70,120);c.zoom(1.2,70,120);near(c.world(70,120).x,anchor.x);near(c.world(70,120).y,anchor.y);assert.ok(c.copies().length<=25);
});
