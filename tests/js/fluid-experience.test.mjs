/** UX-02/03/04/05/07/08/11/12: fluid presentation; canonical rules stay unchanged. */
import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
import{Camera}from'../../apps/b2z-observer/camera.mjs';import{diamondMap}from'../../apps/b2z-observer/minimap-projection.mjs';
const close=(a,b,e=1e-7)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
test('UX-04/12 programmatic camera has intermediate frames and logarithmic zoom',async()=>{
 const {CameraController}=await import('../../apps/b2z-observer/camera-controller.mjs');let now=0,settled=0;const c=new Camera();c.configure(1000,1000,1440,900,true);c.centre(998,5);c.scale=10;
 const m=new CameraController(c,{now:()=>now,onSettled:()=>settled++});m.go({x:2,y:5,scale:40},{duration:300});close(c.x,998);now=150;m.update(now);assert.ok(c.x>998||c.x<2);close(c.scale,20);now=300;m.update(now);close(c.x,2);assert.equal(c.scale,40);assert.equal(settled,1);
 m.go({x:100,y:100,scale:80});now=400;m.update(now);const current=[c.x,c.y,c.scale];m.cancel();now=2000;m.update(now);assert.deepEqual([c.x,c.y,c.scale],current);
});
test('UX-12 diamond centre/inverse use the shifted toroidal cut',()=>{
 const map=diamondMap(1000,1000,160,160/Math.sqrt(3),{x:999,y:3});let p=map.inverse(80,80/Math.sqrt(3));close(p.x,999);close(p.y,3);
 for(const [x,y]of [[0,0],[998,4],[450,900],[700,99]]){const q=map.project(x,y),r=map.inverse(q.x,q.y);close(r.x,x);close(r.y,y);}
 assert.equal(map.contains(0,0),false);
});
test('UX-10 UI Move excludes same cell but retains valid cell zero and canonical backend helper',async()=>{
 const {quoteV6,prepareQuoteV6,legalMoveDestination}=await import('../../apps/b2z-observer/action-quote-v6.mjs');const account='01'.repeat(32),world={version:6,cannons:[{id:1,account,cell:1}],balls:[],ownership:{base:Array(1024).fill(1),overrides:[]},playability:{territories:[{id:1,player:1}],lifecycle:[{cannon:1,player:1}],players:[{id:1,account}]}};const config={move_e8s:1n,max_balls:64};
 assert.equal(quoteV6(world,config,account,{kind:'move',cannon:1,cell:1}).memo,'MOVE 1 1');
 assert.throws(()=>prepareQuoteV6(world,config,account,{kind:'move',cannon:1,cell:1}),/DIFFERENT_TILE/);assert.equal(legalMoveDestination(world,account,1,1),false);assert.equal(prepareQuoteV6(world,config,account,{kind:'move',cannon:1,cell:0}).memo,'MOVE 1 0');world.cannons[0].cell=0;assert.equal(legalMoveDestination(world,account,1,0),false);
});
test('UX-12 local ground guide is depth tested, never an always-on-top overlay',()=>{
 const source=readFileSync('apps/b2z-observer/render.mjs','utf8');assert.doesNotMatch(source,/linewidth:[24],depthTest:false/);assert.doesNotMatch(source,/guideUnder\.renderOrder=10/);
});
import{playerAnchor,territoryCentre}from'../../apps/b2z-observer/player-anchor.mjs';
import{displayedBall}from'../../apps/b2z-observer/ball-presentation.mjs';
import{CameraController,focusedOn}from'../../apps/b2z-observer/camera-controller.mjs';
import{resolveInteraction}from'../../apps/b2z-observer/interaction.mjs';
import{displayedMotion}from'../../apps/b2z-observer/motion-effects.mjs';
test('UX-12 seam territory centroid, deterministic fallback and stable cache',()=>{
 const rects=[{owner:1,x:998,y:10,width:2,height:2},{owner:1,x:0,y:10,width:2,height:2}],fallback={x:998.5,y:10.5};const c=territoryCentre(rects,1,1000,1000,fallback);assert.ok(c.x<1e-7||c.x>999.99999);close(c.y,11);
 assert.deepEqual(territoryCentre([{owner:1,x:0,y:0,width:1000,height:1000}],1,1000,1000,fallback),fallback);
 const v={width:1000,height:1000,torus:true,cannons:new Map([[1,{id:1,account:'a',cell:10998}]]),owner:()=>1},cache=playerAnchor();const a=cache.resolve(v,{layout:{rects}},'a',1,fallback);rects.push({owner:1,x:400,y:400,width:5,height:5});assert.equal(cache.resolve(v,{layout:{rects}},'a',1,fallback),a);assert.notEqual(cache.resolve(v,{layout:{rects}},'a',1,fallback,{recenter:true}),a);
});
test('UX-12 shifted atlas parts cover every canonical cell exactly once and preserve footprint area',()=>{
 for(const origin of[{x:999.5,y:.5},{x:4,y:123.4},{x:500,y:500}]){const m=diamondMap(1000,1000,160,100,origin),parts=m.parts();close(parts.reduce((n,p)=>n+p.width*p.height,0),1000000,.001);assert.ok(parts.length<=4);const camera=new Camera();camera.configure(1000,1000,390,844,true);camera.centre(999,0);const ps=camera.minimapPolygons(origin);assert.ok(ps.length);assert.ok(ps.flat().every(p=>p.x>=0&&p.x<=1000&&p.y>=0&&p.y<=1000));}
});
test('UX-04 anchored zoom, interruptions, clamping, reduced motion and suspension',()=>{
 let now=0;const c=new Camera();c.configure(1000,1000,390,844,true);c.scale=20;c.centre(999.5,1);const m=new CameraController(c,{now:()=>now}),p=c.world(80,200);m.zoom(1.65,80,200);for(now of[40,80,160,500]){m.update(now);const q=c.world(80,200);close(q.x-p.x-Math.round((q.x-p.x)/1000)*1000,0);close(q.y-p.y-Math.round((q.y-p.y)/1000)*1000,0);assert.ok(c.scale>=c.fitScale);}
 m.go({x:50,y:60,scale:25},{duration:300});now+=100;m.update(now);const before={x:c.x,y:c.y};m.go({x:80,y:90,scale:30});close(c.x,before.x);close(c.y,before.y);now+=10000;m.update(now);close(c.x,80);assert.equal(m.active,false);
 c.scale=c.maxScale;const at=[c.x,c.y,c.scale];assert.equal(m.zoom(1.65,12,40),false);assert.deepEqual([c.x,c.y,c.scale],at);
 const reduced=new CameraController(c,{now:()=>now,reducedMotion:()=>true});reduced.go({x:10,y:20,scale:48});close(c.x,10);assert.equal(reduced.active,false);assert.equal(focusedOn(c,20010),false);reduced.focus(20010);assert.equal(focusedOn(c,20010),true);assert.equal(focusedOn(c,999999),false);
});
test('UX-05 ball following preserves zoom and stops at the verified playhead; destruction/identity cancels',()=>{
 let now=0;const c=new Camera();c.configure(1000,1000,390,844,true);c.scale=48;c.centre(999.8,10);const m=new CameraController(c,{now:()=>now});m.follow(1,'world',{x:999.8,y:10});now=400;m.update(now,{point:{x:999.8,y:10},time:0,identity:'world'});const scale=c.scale;
 now+=16;m.update(now,{point:{x:.9,y:10},time:.1,identity:'world'});assert.equal(c.scale,scale);const at=[c.x,c.y];now+=5000;m.update(now,{point:{x:.9,y:10},time:.1,identity:'world'});assert.deepEqual([c.x,c.y],at);assert.ok(Math.abs(c.x-999.8)<5||c.x<5);
 now+=16;m.update(now,{point:{x:4,y:10},time:.2,identity:'world'});assert.notDeepEqual([c.x,c.y],at);m.update(now+1,{identity:'new',time:.2,point:{x:4,y:10}});assert.equal(m.following,null);
 m.follow(1,'world',{x:1,y:10});m.update(now+2,{identity:'world',time:.2,point:null});assert.equal(m.following,null);
});
test('UX-12 rendering and picking share verified wrapped ball position and deterministic overlap depth',()=>{
 const v={width:1000,height:1000,torus:true},ball={id:4,owner:1,x0:1024n*999n,y0:1024n*20n,vx:1024,vy:0};assert.deepEqual(displayedBall(v,ball,1),{id:4,owner:1,x:0,y:20});
 const c=new Camera();c.configure(1000,1000,1440,900,true);c.frameCell(20000);let p=c.point(0,20,.14);assert.equal(resolveInteraction(c,new Map(),{x:p.sx,y:p.sy},null,null,[displayedBall(v,ball,1)]).kind,'ball');
 const cannons=new Map([[1,{id:1,cell:20000,heading:0}]]),b={id:4,x:.5,y:20.5};p=c.point(b.x,b.y,.14);assert.equal(resolveInteraction(c,cannons,{x:p.sx,y:p.sy},null,null,[b]).kind,'cannon');
});
test('UX-12 tile wake persists independently of short tail; neither is generated by a stationary frame',()=>{
 const m=displayedMotion({tailLifetime:350,tileLifetime:1250,tileHold:0}),sample=(x,time,wallMs)=>m.sample([{id:1,x,y:1}],{width:1000,height:1000,torus:true,time,wallMs});sample(999.9,0,0);sample(.1,.1,100);assert.equal(m.tails(600).length,0);const e=sample(.1,.1,600);assert.ok(e.length&&e.every(x=>x.alpha>0&&x.alpha<1));assert.equal(sample(.1,.1,1500).length,0);m.reset();assert.equal(sample(.1,.1,1600).length,0);
});

test('UX-05 ball acquisition leaves the exact current zoom unchanged',()=>{let t=0;const c=new Camera();c.configure(1000,1000,1440,900,true);c.scale=96;const m=new CameraController(c,{now:()=>t});m.follow(1,'world',{x:3,y:4});for(t of[16,100,300]){m.update(t,{point:{x:3,y:4},time:0,identity:'world'});assert.equal(c.scale,96);}});

test('UX-04 a replacement at the current pose cancels the old camera command',()=>{let now=0;const c=new Camera();c.configure(1000,1000,390,844,true);c.scale=48;const m=new CameraController(c,{now:()=>now});m.go({x:100,y:100,scale:60},{duration:300});now=100;m.update(now);const current={x:c.x,y:c.y,scale:c.scale};m.go(current);assert.equal(m.active,false);now=1000;m.update(now);assert.deepEqual({x:c.x,y:c.y,scale:c.scale},current);});

test('UX-12 Focus also reaches interaction scale on a bounded historical board',()=>{const c=new Camera();c.configure(32,32,390,844,false);const m=new CameraController(c,{reducedMotion:()=>true});m.focus(528);assert.ok(c.scale>=48);assert.equal(c.torus,false);assert.equal(focusedOn(c,528),true);});

test('UX-12 stable island tie and anchor cache do not revisit ownership on each frame',()=>{
 const c1={id:1,account:'a',cell:1001},c2={id:2,account:'a',cell:999999},v={width:1000,height:1000,torus:true,cannons:new Map([[2,c2],[1,c1]]),owner:n=>n===1001?1:2},rects=[{owner:2,x:998,y:998,width:2,height:2},{owner:1,x:0,y:0,width:2,height:2}];let reads=0;const surface={revision:1,get layout(){reads++;return{rects}}},cache=playerAnchor(),a=cache.resolve(v,surface,'a',null,{x:500,y:500});assert.equal(a.owner,1);const initial=reads;for(let frame=0;frame<100;frame++)assert.equal(cache.resolve(v,surface,'a',null,{x:600,y:600}),a);assert.equal(reads,initial);surface.revision++;assert.equal(cache.resolve(v,surface,'a',null,{x:600,y:600}),a);assert.equal(reads,initial+1);assert.equal(cache.resolve(v,surface,'a',2,{x:500,y:500}).owner,2);
});

test('UX-12 explicit legacy short-tail policy cannot refresh arbitrarily old merged travel',()=>{const m=displayedMotion({tailLifetime:350});for(let i=0;i<=200;i++)m.sample([{id:1,x:10+i*.001,y:10}],{width:1000,height:1000,time:i*.001,wallMs:i*100});const tail=m.tails(20000);assert.ok(tail.reduce((n,p)=>n+p.distance,0)<=.00501,'tail must represent recent displayed movement, not twenty seconds of refreshed history');});
