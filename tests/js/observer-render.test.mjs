import test from 'node:test';import assert from 'node:assert/strict';
import {territoryLayout,territoryColor,pieceGeometry,gridLines,createArenaRenderer} from '../../apps/b2z-observer/render.mjs';
import {Camera} from '../../apps/b2z-observer/camera.mjs';
import {B2zView} from '../../apps/b2z-observer/model.mjs';
import {decodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {unhex} from '@dtr/timeline-runtime/protocol/bytes';
import {stageMillionWorld} from '../../packages/kernels/b2z/migration.mjs';
import fs from 'node:fs';
const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/b2z-torus-v4.json',import.meta.url),'utf8'));
function view(){return new B2zView(decodeCanonical(stageMillionWorld(unhex(fixture.migration.new_hex))));}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function mock(){const calls=[];let settings={};const target={calls,save(){calls.push(['save']);},restore(){calls.push(['restore']);}};return new Proxy(target,{get(o,k){if(k in o)return o[k];if(k in settings)return settings[k];return(...args)=>calls.push([k,...args]);},set(o,k,v){settings[k]=v;calls.push(['set',k,v]);return true;}});}
test('opaque territory partitions compact ownership exactly, including cross-row and unowned overrides',()=>{
 const v=view();v.ownership.base.fill(1);v.ownership.overrides=[{start:10020,end:10050,owner:2},{start:10990,end:11010,owner:0},{start:32000,end:33000,owner:3}];
 const layout=territoryLayout(v);assert.equal(layout.rects.reduce((n,r)=>n+r.width*r.height,0),1000000);
 const at=(x,y)=>layout.rects.filter(r=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height);
 for(let y=0;y<1000;y+=7)for(let x=0;x<1000;x+=11){const hits=at(x,y);assert.equal(hits.length,1);assert.equal(hits[0].owner,v.owner(y*1000+x));}
 for(const n of [10019,10020,10049,10050,10989,10990,10999,11000,11009,11010,32000,32999,33000]){const hits=at(n%1000,Math.floor(n/1000));assert.equal(hits.length,1);assert.equal(hits[0].owner,v.owner(n));}
 assert.match(territoryColor(2),/^#[0-9a-f]{6}$/);assert.notEqual(territoryColor(0),territoryColor(1));
 assert.ok(layout.rects.length<30,'compact intervals coalesce instead of expanding one million cells');
});
test('storage divisions disappear for a single owner and genuine integer geography remains',()=>{
 const v=view();v.ownership.base.fill(3);v.ownership.overrides=[];v.owner=()=>{throw Error('v5 layout must not expand per-cell ownership');};
 assert.deepEqual(territoryLayout(v),{rects:[{x:0,y:0,width:1000,height:1000,owner:3}],edges:[]});
 v.ownership.base=v.ownership.base.map((_,i)=>i%32<16?1:2);
 const p=territoryLayout(v);assert.equal(p.rects.length,2);assert.deepEqual(new Set(p.edges.map(e=>e.x1)),new Set([0,500]));
 assert.ok(p.edges.every(e=>e.y1===0&&e.y2===1000));
});
test('every body, outline, barrel, ring, tail, glow and effect scales with cells without a pixel floor',()=>{
 for(const scale of [.05,.35,1,8,24,48,96])for(const ratio of [1,2]){
  const a=pieceGeometry(scale,{vx:27875,vy:-15688},ratio),b=pieceGeometry(scale*2,{vx:27875,vy:-15688},ratio);
  for(const key of Object.keys(a))near(b[key],a[key]*2);
  near(a.cannonRadius/scale,.28);near(a.ballRadius/scale,.073);near(a.tailX/scale,27875/1024*.12);
 }
 assert.ok(pieceGeometry(.35).ballRadius<.03);assert.ok(pieceGeometry(.35).cannonRadius<.1);
});
test('fine grid fades in at resolvable zoom and uses only actual integer cell coordinates',()=>{
 const bounds={x:296.25,y:47.1,width:12.5,height:8.5};
 assert.deepEqual(gridLines(bounds,1000,1000,12),{x:[],y:[],alpha:0});
 const grid=gridLines(bounds,1000,1000,18);near(grid.alpha,.5);assert.deepEqual(grid.x,Array.from({length:12},(_,i)=>i+297));assert.deepEqual(grid.y,Array.from({length:8},(_,i)=>i+48));
 assert.ok(!grid.x.some(x=>x%1));assert.ok(grid.x.some(x=>x===298),'not inherited 31/32-cell storage boundaries');
});
test('production renderer draws proportional geometry and reuses its opaque, culled territory raster',()=>{
 const v=view();v.ownership.base.fill(1);v.ownership.overrides=[];v.cannons=new Map([[1,{id:1,cell:500500,heading:0}]]);v.balls=new Map([[1,{id:1,owner:1,x0:500.6*1024,y0:500.6*1024,vx:1024,vy:-512}]]);v.pending=new Map();
 let allocations=0;const paint=mock(),renderer=createArenaRenderer(()=>{allocations++;return {getContext:()=>paint};});
 const camera=new Camera();camera.configure(1000,1000,390,844,true);camera.centre(500.5,500.5);
 const run=scale=>{camera.scale=scale;const ctx=mock();renderer.draw(ctx,v,camera,{selected:1});return ctx;};
 const a=run(24),fills=paint.calls.filter(c=>c[0]==='fillRect').length,b=run(48);
 assert.equal(allocations,1);assert.equal(paint.calls.filter(c=>c[0]==='fillRect').length,fills,'static territory is not rebuilt per frame');
 const arcs=c=>c.calls.filter(x=>x[0]==='arc').map(x=>x[3]);assert.equal(arcs(a).length,3);arcs(a).forEach((r,i)=>near(arcs(b)[i],r*2));
 const next=view();next.ownership.base.fill(1);next.ownership.overrides=[];renderer.draw(mock(),next,camera);assert.equal(paint.calls.filter(c=>c[0]==='fillRect').length,fills,'trajectory-only new snapshots reuse the terrain');
 const strokes=c=>c.calls.filter(x=>x[0]==='set'&&x[1]==='lineWidth').map(x=>x[2]);strokes(a).forEach((width,i)=>near(strokes(b)[i],width*2));
 const glow=c=>c.calls.find(x=>x[0]==='set'&&x[1]==='shadowBlur'&&x[2]>0)[2];near(glow(b),glow(a)*2);
 const body=c=>c.calls.find(x=>x[0]==='fillRect');near(body(b)[3],body(a)[3]*2);
 const image=b.calls.find(c=>c[0]==='drawImage');assert.ok(image[4]<30&&image[5]<30,'only the visible source rectangle is drawn');
 v.setRange(500500,500501,1,2);run(48);assert.ok(paint.calls.filter(c=>c[0]==='fillRect').length>fills,'certified ownership changes invalidate the raster');assert.equal(allocations,1);
});
test('wrapped ball bodies and velocity tails survive a seam even before the viewport crosses it',()=>{
 const v=view();v.ownership.base.fill(1);v.ownership.overrides=[];v.cannons.clear();v.pending.clear();
 v.balls=new Map([[1,{id:1,owner:1,x0:10n,y0:512000n,vx:1024,vy:0}]]);
 const camera=new Camera();camera.configure(1000,1000,390,844,true);camera.scale=96;camera.centre(997.9,500);
 assert.ok(camera.bounds().x+camera.bounds().width<1000);
 const ctx=mock(),renderer=createArenaRenderer(()=>({getContext:()=>mock()}));renderer.draw(ctx,v,camera);
 assert.ok(ctx.calls.some(c=>c[0]==='arc'),'wrapped body portion is culled with its physical extent, not just its centre');
 const tail=ctx.calls.find(c=>c[0]==='moveTo'&&Math.abs(c[1]-(10/1024-.12)*96)<1e-8);assert.ok(tail,'tail uses original signed velocity and follows its own wrapped ball');
});
