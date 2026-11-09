/** The same exact ownership raster as the arena; fixed canonical orientation. */
export function createMinimap(canvas,camera,onNavigate=()=>{}){
 if(!canvas)return {draw(){},dispose(){}};
 const ctx=canvas.getContext('2d'),image=document.createElement('canvas');let revision=-1,key='',listeners=[];
 const listen=(event,fn)=>{canvas.addEventListener(event,fn);listeners.push(()=>canvas.removeEventListener(event,fn));};
 function navigate(e){const r=canvas.getBoundingClientRect();camera.centre(Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*camera.width,Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))*camera.height);onNavigate();e.preventDefault();e.stopPropagation();}
 let pointer=null;listen('pointerdown',e=>{if(e.button!==0)return;pointer=e.pointerId;canvas.setPointerCapture(pointer);canvas.focus({preventScroll:true});navigate(e);});listen('pointermove',e=>{if(e.pointerId===pointer)navigate(e);});
 const end=e=>{if(e.pointerId===pointer){if(canvas.hasPointerCapture(pointer))canvas.releasePointerCapture(pointer);pointer=null;}e.stopPropagation();};for(const event of ['pointerup','pointercancel','lostpointercapture'])listen(event,end);
 listen('keydown',e=>{const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(d){camera.centre(camera.x+d[0]*camera.width/10,camera.y+d[1]*camera.height/10);onNavigate();e.preventDefault();e.stopPropagation();}});
 return {draw(v,surface,selected,account){if(!surface)return;const r=canvas.getBoundingClientRect(),size=Math.max(1,Math.round(r.width)),next=[surface.revision,camera.x,camera.y,camera.scale,camera.viewport.width,camera.viewport.height,size,selected,account,v.entityKey()].join('/');if(next===key)return;key=next;
  if(revision!==surface.revision){const initial=revision<0||image.width!==v.width||image.height!==v.height;revision=surface.revision;if(initial){image.width=v.width;image.height=v.height;}const paint=image.getContext('2d'),rects=initial?surface.layout.rects:surface.dirtyRows.flatMap(y=>surface.layout.rows[y].map(r=>({x:r.start,y,width:r.end-r.start,height:1})));for(const tile of rects){const n=(tile.y*v.width+tile.x)*4;paint.fillStyle=`rgb(${surface.rgba[n]},${surface.rgba[n+1]},${surface.rgba[n+2]})`;paint.fillRect(tile.x,tile.y,tile.width,tile.height);}}
  canvas.width=canvas.height=size;ctx.imageSmoothingEnabled=false;ctx.drawImage(image,0,0,size,size);const sx=size/v.width,sy=size/v.height;
  ctx.fillStyle='#ffffff16';ctx.strokeStyle='#fff';ctx.lineWidth=1.5;for(const polygon of camera.minimapPolygons()){ctx.beginPath();polygon.forEach((p,i)=>i?ctx.lineTo(p.x*sx,p.y*sy):ctx.moveTo(p.x*sx,p.y*sy));ctx.closePath();ctx.fill();ctx.stroke();}
  const top=camera.world(camera.viewport.width/2,0),tx=((top.x%v.width+v.width)%v.width)*sx,ty=((top.y%v.height+v.height)%v.height)*sy;ctx.strokeStyle='#fff';ctx.beginPath();ctx.moveTo(tx+5,ty);ctx.lineTo(tx,ty);ctx.lineTo(tx,ty+5);ctx.stroke();
  for(const c of v.cannons.values())if(c.id===selected||c.account===account){ctx.beginPath();ctx.arc((c.cell%v.width+.5)*sx,(Math.floor(c.cell/v.width)+.5)*sy,c.id===selected?3.5:2.5,0,Math.PI*2);ctx.fillStyle=c.id===selected?'#fff':v.color(c.id);ctx.fill();ctx.strokeStyle='#172029';ctx.stroke();}
 },dispose(){for(const stop of listeners)stop();}};
}
