import test from 'node:test';import assert from 'node:assert/strict';
import {boundaryIndex,territoryLayout} from '../../apps/b2z-observer/terrain.mjs';
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

 assert.ok(layout.rects.length<30,'compact intervals coalesce instead of expanding one million cells');
});
test('storage divisions disappear for a single owner and genuine integer geography remains',()=>{
 const v=view();v.ownership.base.fill(3);v.ownership.overrides=[];v.owner=()=>{throw Error('v5 layout must not expand per-cell ownership');};
 assert.deepEqual(territoryLayout(v),{rects:[{x:0,y:0,width:1000,height:1000,owner:3}],edges:[]});
 v.ownership.base=v.ownership.base.map((_,i)=>i%32<16?1:2);
 const p=territoryLayout(v);assert.equal(p.rects.length,2);assert.deepEqual(new Set(p.edges.map(e=>e.x1)),new Set([0,500]));
 assert.ok(p.edges.every(e=>e.y1===0&&e.y2===1000));
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

// UX-12 supersedes top-down raster/pixel-floor/velocity-tail assertions. The actual
// instanced renderer is exercised by populated WebGL browser journeys, including
// bounded instance counts, ownership changes, stationary motion and toroidal seams.
