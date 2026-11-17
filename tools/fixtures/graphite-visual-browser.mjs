/** Synthetic render-only art/cost fixtures. Never source, payment or IC evidence. */
import {createArenaRenderer}from'../../apps/b2z-observer/render.mjs';
import{Camera}from'../../apps/b2z-observer/camera.mjs';
import{B2zView}from'../../apps/b2z-observer/model.mjs';
import{decodeCanonical}from'@dtr/timeline-runtime/runtime/canonical';
const data=await(await fetch('./fixture.json')).json(),w=decodeCanonical(Uint8Array.fromHex(data.cases.quantityLive.initial));
const canvas=document.getElementById('board'),renderer=createArenaRenderer(canvas),camera=new Camera();
const inks=['#baff44','#20ddff','#ff00ee','#ffaa00','#ff0000','#000078','#020204','#fdf9f5'];
let view,now=0,selected=null,stats;
function scene({cannons=1,deflectors=0,scale=64,angle=0,ink=0,select=false}={}){
 view=new B2zView(w);view.cannons.clear();view.balls.clear();selected=select?1:null;
 for(let i=0;i<cannons;i++)view.cannons.set(i+1,{id:i+1,cell:(500+Math.floor(i/16)*2)*1000+500+i%16*2,heading:Math.round(angle*65536/360)%65536,account:String(i).padStart(64,'0')});
 view.color=id=>inks[(id-1+ink)%inks.length];view.playerColor=id=>inks[(id-1+ink)%inks.length];
 view.deflectors=new Map();for(let i=0;i<deflectors;i++)view.deflectors.set(i+1,{id:i+1,generation:1,cell:(501+Math.floor(i/16)*2)*1000+500+i%16*2,owner:i%8+1,heading:Math.round((angle+i*22.5)*65536/360)%65536});
 camera.configure(1000,1000,innerWidth,innerHeight,true);camera.centre(500.5+(cannons>1?15:0),500.5+(cannons>1?7:0));camera.scale=scale;renderer.reset();return draw();
}
function draw(){camera.configure(1000,1000,innerWidth,innerHeight,true);stats=renderer.draw(view,camera,{time:now,selected});return stats;}
globalThis.graphite={scene,draw,camera,heading(a){view.cannons.get(1).heading=a;now+=.000001;return draw();},inspect:()=>renderer.inspect(),async measure(n=120){const times=[];for(let i=0;i<n+20;i++){now+=.000001;const begin=performance.now();draw();const ms=performance.now()-begin;if(i>=20)times.push(ms);await new Promise(requestAnimationFrame);}times.sort((a,b)=>a-b);return{p50:times[Math.floor(n*.50)],p95:times[Math.floor(n*.95)],p99:times[Math.floor(n*.99)],stats,renderer:canvas.getContext('webgl2').getParameter(canvas.getContext('webgl2').RENDERER),gpuTimerAvailable:Boolean(canvas.getContext('webgl2').getExtension('EXT_disjoint_timer_query_webgl2'))};},contextLoss(){canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext();}};
scene();
