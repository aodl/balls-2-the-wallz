/** Browser-only visual comparison harness. Never part of production assets. */
import {Camera} from '../../apps/b2z-observer/camera.mjs';
import {B2zView,timeNumber} from '../../apps/b2z-observer/model.mjs';
import {decodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {sha256Web} from '@dtr/timeline-runtime/client/verification';
import {createArenaRenderer,pieceGeometry,territoryLayout} from '../../apps/b2z-observer/render.mjs';
const canvas=document.getElementById('board'),ctx=canvas.getContext('2d'),camera=new Camera(),metadata=await(await fetch('./reference.json')).json(),bytes=new Uint8Array(await(await fetch('./state.bin')).arrayBuffer());
if(await sha256Web(bytes)!==metadata.state_sha256)throw Error('Pinned visual reference changed');
const original=decodeCanonical(bytes);let visible=new B2zView(original),visibleTime=timeNumber(original.time),scenario='captured',selected=visible.cannons.keys().next().value;
const renderer=createArenaRenderer(),baseline=new URL(location.href).searchParams.has('before');
let oldDraw=null;
if(baseline)oldDraw=(await import('./before-render.mjs')).createBefore({canvas,ctx,camera,getView:()=>visible,getTime:()=>visibleTime,getSelected:()=>selected});
function draw(){
 const {width,height}=canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio,2);if(canvas.width!==Math.round(width*ratio)||canvas.height!==Math.round(height*ratio)){canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);}ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);camera.configure(visible.width,visible.height,width,height,true);
 if(oldDraw)oldDraw();else renderer.draw(ctx,visible,camera,{time:visibleTime,selected,ratio});
}
function configure({x,y,scale,fixture='captured'}){
 visible=new B2zView(original);scenario=fixture;
 if(fixture==='wrapped-ball'){const ball=[...visible.balls.values()][0];visible.balls=new Map([[ball.id,{...ball,x0:BigInt(Math.round(.02*1024))-BigInt(ball.vx)*original.time[0],y0:BigInt(Math.round(.02*1024))-BigInt(ball.vy)*original.time[0]}]]);}
 if(fixture==='ownership'){
  visible.ownership.base=visible.ownership.base.map((_,i)=>i%32<16?1:2);
  visible.ownership.overrides=[{start:46000+290,end:46000+310,owner:0},{start:47000+290,end:47000+310,owner:2},{start:48000+290,end:48000+310,owner:3}];
 }
 const {width,height}=canvas.getBoundingClientRect();camera.configure(1000,1000,width,height,true);camera.scale=scale;camera.centre(x,y);
 document.getElementById('qualification').textContent=fixture==='captured'?'Pinned rendering of captured IC-authenticated v5 state; fixed logical time. Content comparison, not a live certificate check.':'Synthetic render-only '+fixture+' fixture; no network or certification claim.';
 draw();return inspect();
}
function inspect(){return {scenario,baseline,camera:{x:camera.x,y:camera.y,scale:camera.scale},world_time:visibleTime,cannon:[...visible.cannons.values()][0],balls:[...visible.balls.values()].map(b=>({id:b.id,x:((Number(b.x0)+b.vx*visibleTime)/1024%1000+1000)%1000,y:((Number(b.y0)+b.vy*visibleTime)/1024%1000+1000)%1000,...pieceGeometry(camera.scale,b)})),geometry:pieceGeometry(camera.scale),layout:baseline?null:{rectangles:renderer.terrain(visible).rects.length,edges:renderer.terrain(visible).edges.length},frame:camera.bounds()};}
function pixel(x,y){const p=camera.screen(x,y);return [...ctx.getImageData(Math.floor(p.x*devicePixelRatio),Math.floor(p.y*devicePixelRatio),1,1).data];}
globalThis.visual={configure,inspect,draw,pixel,async measure(frames=180){const durations=[],intervals=[];let prior=null;for(let i=0;i<frames;i++)await new Promise(resolve=>requestAnimationFrame(t=>{if(prior!==null)intervals.push(t-prior);prior=t;const start=performance.now();draw();durations.push(performance.now()-start);resolve();}));const stats=a=>{a.sort((x,y)=>x-y);return {median:a[Math.floor(a.length/2)],p95:a[Math.floor(a.length*.95)],max:a.at(-1)};};return {frames,draw_ms:stats(durations),frame_interval_ms:stats(intervals),...inspect()};}};
configure({x:297.5,y:47.5,scale:24});
