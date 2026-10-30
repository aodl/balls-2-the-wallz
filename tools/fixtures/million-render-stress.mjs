import {createArenaRenderer} from '../../apps/b2z-observer/render.mjs';
import {Camera} from '../../apps/b2z-observer/camera.mjs';
import {B2zView} from '../../apps/b2z-observer/model.mjs';
import {decodeCanonical,encodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
const world=decodeCanonical(new Uint8Array(await(await fetch('./state.bin')).arrayBuffer())),canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');let rasters=[];let view,camera,renderer,queryCalls=0,queryVisits=0;
function setup({count,scale,width,height}){
 const seedWorld=structuredClone(world);seedWorld.ownership.base.fill(1);seedWorld.ownership.overrides=[];
 // Small isolated capture fragments, randomly distributed across the arena.
 // Fixed seed, real integer cells, disjoint intervals and truthful owner replacement.
 const positions=Array.from({length:333*500},(_,n)=>Math.floor(n/333)*2000+(n%333)*3);let seed=0xB2A5;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
 for(let n=positions.length-1;n>0;n--){const i=random()%(n+1);[positions[n],positions[i]]=[positions[i],positions[n]];}
 const overrides=positions.slice(0,count).map((start,i)=>({start,end:start+1+(i%3===0?1:0),owner:2+i%3})).sort((a,b)=>a.start-b.start);seedWorld.ownership.overrides=overrides;
 const changed=overrides.reduce((n,r)=>n+r.end-r.start,0);seedWorld.ownership.counts=[{owner:1,cells:1000000-changed},...Array.from({length:3},(_,i)=>({owner:i+2,cells:overrides.filter(r=>r.owner===i+2).reduce((n,r)=>n+r.end-r.start,0)}))];
 view=new B2zView(seedWorld);camera=new Camera();camera.configure(1000,1000,width,height,true);camera.scale=scale;camera.centre(500,500);rasters=[];renderer=createArenaRenderer(()=>{const c=document.createElement("canvas");rasters.push(c);return c;});canvas.width=width;canvas.height=height;
 const started=performance.now();draw();const build_ms=performance.now()-started,layer=renderer.terrain(view),bounds=camera.bounds();
 const visit=layer.index.visit;layer.index.visit=(...args)=>{queryCalls++;const count=visit(...args);queryVisits+=count;return count;};
 let intersections=0,traversed=0;
 for(const tile of camera.copies()){
  const x0=Math.max(0,Math.floor(bounds.x-tile.x)),y0=Math.max(0,Math.floor(bounds.y-tile.y)),x1=Math.min(1000,Math.ceil(bounds.x+bounds.width-tile.x)),y1=Math.min(1000,Math.ceil(bounds.y+bounds.height-tile.y));if(x1<=x0||y1<=y0)continue;
  traversed+=layer.edges.length;for(const e of layer.edges)if(!(Math.max(e.x1,e.x2)<x0||Math.min(e.x1,e.x2)>x1||Math.max(e.y1,e.y2)<y0||Math.min(e.y1,e.y2)>y1))intersections++;
 }
 return {count,modified_cells:changed,encoded_state_bytes:encodeCanonical(seedWorld).length,scale,viewport:[width,height],ownership_rectangles:layer.rects.length,ownership_edges:layer.edges.length,old_edges_traversed_per_frame:traversed,visible_edges:intersections,build_ms,raster_bytes:rasters.reduce((n,c)=>n+c.width*c.height*4,0)};
}
function draw(){ctx.clearRect(0,0,canvas.width,canvas.height);renderer.draw(ctx,view,camera,{time:Number(world.time[0])/Number(world.time[1])});}
const stats=a=>{a.sort((x,y)=>x-y);return {samples:a.length,p50:a[Math.floor(a.length/2)],p95:a[Math.floor(a.length*.95)],max:a.at(-1)};};
globalThis.stress={setup,async measure(frames=120,pan=false){queryCalls=0;queryVisits=0;const draw_ms=[],interval_ms=[];let prior=null;for(let n=0;n<frames;n++)await new Promise(resolve=>requestAnimationFrame(t=>{if(prior!==null)interval_ms.push(t-prior);prior=t;if(pan)camera.x+=.07;const start=performance.now();draw();draw_ms.push(performance.now()-start);resolve();}));return {draw_ms:stats(draw_ms),frame_interval_ms:stats(interval_ms),boundary_query_calls:queryCalls,boundary_candidate_visits:queryVisits};}};
