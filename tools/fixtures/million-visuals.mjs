/** Pinned captured-state presentation, not a fresh IC certificate check. */
import {Camera} from '../../apps/b2z-observer/camera.mjs';
import {B2zView,timeNumber} from '../../apps/b2z-observer/model.mjs';
import {decodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {sha256Web} from '@dtr/timeline-runtime/client/verification';
import {createArenaRenderer} from '../../apps/b2z-observer/render.mjs';
const canvas=document.getElementById('board'),camera=new Camera(),metadata=await(await fetch('./reference.json')).json(),bytes=new Uint8Array(await(await fetch('./state.bin')).arrayBuffer());
if(await sha256Web(bytes)!==metadata.state_sha256)throw Error('Pinned visual reference changed');
const original=decodeCanonical(bytes);let visible=new B2zView(original),time=timeNumber(original.time),scenario='captured',selected=visible.cannons.keys().next().value,stats;
const renderer=createArenaRenderer(canvas);
function draw(){const {width,height}=canvas.getBoundingClientRect();camera.configure(visible.width,visible.height,width,height,true);stats=renderer.draw(visible,camera,{time,selected});}
function configure({x,y,scale,fixture='captured'}){
 visible=new B2zView(original);scenario=fixture;renderer.reset();
 if(fixture==='wrapped-ball'){const ball=[...visible.balls.values()][0];visible.balls=new Map([[ball.id,{...ball,x0:BigInt(Math.round(.02*1024))-BigInt(ball.vx)*original.time[0],y0:BigInt(Math.round(.02*1024))-BigInt(ball.vy)*original.time[0]}]]);}
 if(fixture==='ownership'){visible.ownership.base=visible.ownership.base.map((_,i)=>i%32<16?1:2);visible.ownership.overrides=[{start:46290,end:46310,owner:0},{start:47290,end:47310,owner:2},{start:48290,end:48310,owner:3}];}
 const {width,height}=canvas.getBoundingClientRect();camera.configure(1000,1000,width,height,true);camera.scale=scale??camera.fitScale;camera.centre(x,y);draw();return inspect();
}
function inspect(){return {scenario,camera:{x:camera.x,y:camera.y,scale:camera.scale},world_time:time,entities:[visible.cannons.size,visible.balls.size],instances:stats,frame:camera.bounds()};}
globalThis.visual={configure,inspect,draw,async measure(frames=120){const d=[],f=[];let prior=null;for(let i=0;i<frames;i++)await new Promise(resolve=>requestAnimationFrame(t=>{if(prior!==null)f.push(t-prior);prior=t;const began=performance.now();draw();d.push(performance.now()-began);resolve();}));const summary=a=>{a.sort((x,y)=>x-y);return{median:a[Math.floor(a.length/2)],p95:a[Math.floor(a.length*.95)],max:a.at(-1)};};return{frames,draw_ms:summary(d),frame_interval_ms:summary(f),...inspect()};}};
configure({x:297.5,y:47.5,scale:48});
