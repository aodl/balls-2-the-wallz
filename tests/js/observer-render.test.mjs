import test from 'node:test';import assert from 'node:assert/strict';
import {boundaryIndex,territoryLayout,territoryColor,pieceGeometry,gridLines,createArenaRenderer} from '../../apps/b2z-observer/render.mjs';
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
 assert.equal(allocations,2);assert.equal(paint.calls.filter(c=>c[0]==='fillRect').length,fills,'static territory is not rebuilt per frame');
 const arcs=c=>c.calls.filter(x=>x[0]==='arc').map(x=>x[3]);assert.equal(arcs(a).length,3);arcs(a).forEach((r,i)=>near(arcs(b)[i],r*2));
 const next=view();next.ownership.base.fill(1);next.ownership.overrides=[];renderer.draw(mock(),next,camera);assert.equal(paint.calls.filter(c=>c[0]==='fillRect').length,fills,'trajectory-only new snapshots reuse the terrain');
 const strokes=c=>c.calls.filter(x=>x[0]==='set'&&x[1]==='lineWidth').map(x=>x[2]);strokes(a).forEach((width,i)=>near(strokes(b)[i],width*2));
 const glow=c=>c.calls.find(x=>x[0]==='set'&&x[1]==='shadowBlur'&&x[2]>0)[2];near(glow(b),glow(a)*2);
 const body=c=>c.calls.find(x=>x[0]==='fillRect');near(body(b)[3],body(a)[3]*2);
 const image=b.calls.find(c=>c[0]==='drawImage');assert.ok(image[4]<30&&image[5]<30,'only the visible source rectangle is drawn');
 v.setRange(500500,500501,1,2);run(48);assert.ok(paint.calls.filter(c=>c[0]==='fillRect').length>fills,'certified ownership changes invalidate the raster');assert.equal(allocations,2);
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

test('boundary bins equal brute traversal, deduplicate long edges and preserve outer seams',()=>{
 for(const width of [32,1000]){
  const edges=[{x1:0,y1:0,x2:width,y2:0},{x1:width,y1:0,x2:width,y2:width},{x1:0,y1:width,x2:width,y2:width},{x1:16,y1:0,x2:16,y2:width}];
  const index=boundaryIndex(edges,width,width);
  for(const [x0,y0,x1,y1] of [[0,0,width,width],[width,0,width,width],[0,width,width,width],[7,5,18,22],[17,9,23,20]]){
   const expected=edges.filter(e=>!(Math.max(e.x1,e.x2)<x0||Math.min(e.x1,e.x2)>x1||Math.max(e.y1,e.y2)<y0||Math.min(e.y1,e.y2)>y1)),found=[];
   index.visit(x0,y0,x1,y1,e=>found.push(e));assert.deepEqual(new Set(found),new Set(expected));assert.equal(found.length,expected.length);
  }
 }
 const edges=Array.from({length:50000},(_,i)=>({x1:i%1000,y1:Math.floor(i/1000)*20,x2:i%1000,y2:Math.floor(i/1000)*20+1}));
 assert.ok(boundaryIndex(edges,1000,1000).visit(496,496,504,504,()=>{})<200,'offscreen edges are not traversed');
});
test('single bounded viewport overlay is invalidated by camera, DPR and ownership only',()=>{
 const v=view();v.ownership.base.fill(1);v.ownership.overrides=[];
 const canvases=[],renderer=createArenaRenderer(()=>{const context=mock(),c={getContext:()=>context,context};canvases.push(c);return c;});
 const camera=new Camera();camera.configure(1000,1000,390,844,true);camera.scale=48;camera.centre(500,500);
 const draw=(ratio=1)=>renderer.draw(mock(),v,camera,{ratio});draw();const overlay=canvases[1],clears=()=>overlay.context.calls.filter(c=>c[0]==='clearRect').length;assert.equal(clears(),1);
 draw();assert.equal(clears(),1);camera.x+=.1;draw();assert.equal(clears(),2);camera.scale*=2;draw();assert.equal(clears(),3);draw(2);assert.equal(clears(),4);assert.equal(overlay.width,780);assert.equal(overlay.height,1688);
 camera.viewport.width=400;draw(2);assert.equal(clears(),5);v.setRange(500500,500501,1,2);draw(2);assert.equal(clears(),6);assert.equal(canvases.length,2);
});

test('overview pans reuse a bounded boundary raster and preserve both halves of toroidal seam strokes',()=>{
 const v=view();v.ownership.base=v.ownership.base.map((_,i)=>i%32<16?1:2);v.ownership.overrides=[];
 const canvases=[],renderer=createArenaRenderer(()=>{const context=mock(),c={getContext:()=>context,context};canvases.push(c);return c;});
 const camera=new Camera();camera.configure(1000,1000,1440,900,true);camera.fit();renderer.draw(mock(),v,camera);
 const raster=canvases[1],calls=raster.context.calls.length;assert.equal(raster.width,2000);assert.equal(raster.height,2000);
 assert.ok(raster.context.calls.some(c=>c[0]==='moveTo'&&c[1]===1000),'wrapped half of x=0 boundary');
 renderer.terrain(v).index.visit=()=>{throw Error('overview must not traverse edges when panning');};
 camera.x+=.5;renderer.draw(mock(),v,camera);assert.equal(raster.context.calls.length,calls);assert.equal(canvases.length,2);
});
