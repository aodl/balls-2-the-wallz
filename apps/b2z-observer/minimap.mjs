import {diamondMap} from './minimap-projection.mjs';
/** The same exact ownership raster as the arena; fixed canonical orientation. */
export function createMinimap(canvas,camera,onNavigate=()=>{}){
 if(!canvas)return {draw(){},dispose(){}};
 const ctx=canvas.getContext('2d'),image=document.createElement('canvas');let revision=-1,key='',listeners=[];
 const listen=(event,fn)=>{canvas.addEventListener(event,fn);listeners.push(()=>canvas.removeEventListener(event,fn));};
 function transform(){const r=canvas.getBoundingClientRect();return{r,map:diamondMap(camera.width,camera.height,r.width,r.height)};}
 function navigate(e){const {r,map}=transform(),x=e.clientX-r.left,y=e.clientY-r.top;if(!map.contains(x,y))return false;const p=map.inverse(x,y);camera.centre(p.x,p.y);onNavigate();e.preventDefault();e.stopPropagation();return true;}
 let pointer=null;listen('pointerdown',e=>{if(e.button!==0||!navigate(e))return;pointer=e.pointerId;canvas.setPointerCapture(pointer);canvas.focus({preventScroll:true});navigate(e);});listen('pointermove',e=>{if(e.pointerId===pointer)navigate(e);});
 const end=e=>{if(e.pointerId===pointer){if(canvas.hasPointerCapture(pointer))canvas.releasePointerCapture(pointer);pointer=null;}e.stopPropagation();};for(const event of ['pointerup','pointercancel','lostpointercapture'])listen(event,end);
 listen('keydown',e=>{const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(d){const {map}=transform(),p=map.project(camera.x,camera.y),w=map.inverse(p.x+d[0]*12,p.y+d[1]*12);camera.centre(w.x,w.y);onNavigate();e.preventDefault();e.stopPropagation();}});
 return {draw(v,surface,selected,account){if(!surface)return;const r=canvas.getBoundingClientRect(),size=Math.max(1,Math.round(r.width)),next=[surface.revision,camera.x,camera.y,camera.scale,camera.viewport.width,camera.viewport.height,size,selected,account,v.entityKey()].join('/');if(next===key)return;key=next;
  if(revision!==surface.revision){const initial=revision<0||image.width!==v.width||image.height!==v.height;revision=surface.revision;if(initial){image.width=v.width;image.height=v.height;}const paint=image.getContext('2d'),rects=initial?surface.layout.rects:surface.dirtyRows.flatMap(y=>surface.layout.rows[y].map(r=>({x:r.start,y,width:r.end-r.start,height:1})));for(const tile of rects){const n=(tile.y*v.width+tile.x)*4;paint.fillStyle=`rgb(${surface.rgba[n]},${surface.rgba[n+1]},${surface.rgba[n+2]})`;paint.fillRect(tile.x,tile.y,tile.width,tile.height);}}
  canvas.width=size;canvas.height=Math.max(1,Math.round(r.height));const map=diamondMap(v.width,v.height,size,canvas.height),origin=map.project(0,0),a=map.project(1,0),b=map.project(0,1);
  ctx.imageSmoothingEnabled=false;ctx.save();ctx.setTransform(a.x-origin.x,a.y-origin.y,b.x-origin.x,b.y-origin.y,origin.x,origin.y);ctx.drawImage(image,0,0);ctx.restore();
  ctx.strokeStyle='#aeb9bd';ctx.lineWidth=1;ctx.beginPath();[[0,0],[v.width,0],[v.width,v.height],[0,v.height]].forEach(([x,y],i)=>{const p=map.project(x,y);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);});ctx.closePath();ctx.stroke();
  ctx.fillStyle='#ffffff16';ctx.strokeStyle='#fff';ctx.lineWidth=1.5;for(const polygon of camera.minimapPolygons()){ctx.beginPath();polygon.forEach((p,i)=>{const q=map.project(p.x,p.y);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);});ctx.closePath();ctx.fill();ctx.stroke();}
  for(const c of v.cannons.values())if(c.id===selected||c.account===account){ctx.beginPath();const p=map.project(c.cell%v.width+.5,Math.floor(c.cell/v.width)+.5);ctx.arc(p.x,p.y,c.id===selected?3.5:2.5,0,Math.PI*2);ctx.fillStyle=c.id===selected?'#fff':v.color(c.id);ctx.fill();ctx.strokeStyle='#172029';ctx.stroke();}
 },dispose(){for(const stop of listeners)stop();}};
}
