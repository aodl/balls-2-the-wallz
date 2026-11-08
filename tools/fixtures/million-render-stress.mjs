/** Existing disposable fragmented-terrain probe, updated for UX-12 instancing. */
import {createArenaRenderer} from '../../apps/b2z-observer/render.mjs';
import {Camera} from '../../apps/b2z-observer/camera.mjs';
import {B2zView} from '../../apps/b2z-observer/model.mjs';
import {decodeCanonical,encodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
const world=decodeCanonical(new Uint8Array(await(await fetch('./state.bin')).arrayBuffer())),canvas=document.querySelector('canvas');let view,camera,renderer,stats;
function setup({count,scale,width,height}){
 const seedWorld=structuredClone(world);seedWorld.ownership.base.fill(1);seedWorld.ownership.overrides=[];
 const positions=Array.from({length:333*500},(_,n)=>Math.floor(n/333)*2000+(n%333)*3);let seed=0xB2A5;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
 for(let n=positions.length-1;n>0;n--){const i=random()%(n+1);[positions[n],positions[i]]=[positions[i],positions[n]];}
 const overrides=positions.slice(0,count).map((start,i)=>({start,end:start+1+(i%3===0?1:0),owner:2+i%3})).sort((a,b)=>a.start-b.start);seedWorld.ownership.overrides=overrides;
 const changed=overrides.reduce((n,r)=>n+r.end-r.start,0);seedWorld.ownership.counts=[{owner:1,cells:1000000-changed},...Array.from({length:3},(_,i)=>({owner:i+2,cells:overrides.filter(r=>r.owner===i+2).reduce((n,r)=>n+r.end-r.start,0)}))];
 renderer?.dispose();view=new B2zView(seedWorld);camera=new Camera();camera.configure(1000,1000,width,height,true);camera.scale=Math.max(camera.fitScale,scale);camera.centre(500,500);renderer=createArenaRenderer(canvas);
 const began=performance.now();draw();return {count,modified_cells:changed,encoded_state_bytes:encodeCanonical(seedWorld).length,scale:camera.scale,viewport:[width,height],build_ms:performance.now()-began,instances:stats};
}
function draw(){stats=renderer.draw(view,camera,{time:Number(world.time[0])/Number(world.time[1])});}
const summary=a=>{a.sort((x,y)=>x-y);return {samples:a.length,p50:a[Math.floor(a.length/2)],p95:a[Math.floor(a.length*.95)],max:a.at(-1)};};
globalThis.stress={setup,async measure(frames=120,pan=false){const draw_ms=[],interval_ms=[];let prior=null;for(let n=0;n<frames;n++)await new Promise(resolve=>requestAnimationFrame(t=>{if(prior!==null)interval_ms.push(t-prior);prior=t;if(pan)camera.x+=.07;const start=performance.now();draw();draw_ms.push(performance.now()-start);resolve();}));return {draw_ms:summary(draw_ms),frame_interval_ms:summary(interval_ms),instances:stats};}};
