import{diamondMap}from'./minimap-projection.mjs';
/** One atlas; at most four source rectangles rebase its canonical cut. */
export function createMinimap(canvas,camera,onNavigate=()=>{},{controller=null,origin=()=>null}={}){
 if(!canvas)return{draw(){},dispose(){}};
 const ctx=canvas.getContext('2d'),image=document.createElement('canvas');let revision=-1,key='',listeners=[],rect=canvas.getBoundingClientRect(),drag=null;
 const resize=new ResizeObserver(()=>{rect=canvas.getBoundingClientRect();key='';});resize.observe(canvas);
 const listen=(event,fn)=>{canvas.addEventListener(event,fn);listeners.push(()=>canvas.removeEventListener(event,fn));};
 const currentOrigin=()=>drag?.origin??origin(),transform=()=>diamondMap(camera.width,camera.height,rect.width,rect.height,currentOrigin());
 function location(e){const map=transform(),x=e.clientX-rect.left,y=e.clientY-rect.top;return map.contains(x,y)?map.inverse(x,y):null;}
 function navigate(p,immediate){if(immediate){controller?.manual();camera.centre(p.x,p.y);}else if(controller)controller.go(p,{owner:'minimap'});else camera.centre(p.x,p.y);}
 listen('pointerdown',e=>{if(e.button!==0)return;const p=location(e);if(!p)return;controller?.cancel({follow:true});drag={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false,origin:origin(),last:p};canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});e.preventDefault();e.stopPropagation();});
 listen('pointermove',e=>{if(e.pointerId!==drag?.id)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>4)drag.moved=true;const p=location(e);if(drag.moved&&p){drag.last=p;navigate(p,true);}e.preventDefault();e.stopPropagation();});
 function end(e){if(e.pointerId!==drag?.id)return;const saved=drag;if(e.type==='pointerup'){if(!saved.moved)navigate(saved.last,false);onNavigate();}drag=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);key='';e.stopPropagation();}
 for(const event of ['pointerup','pointercancel','lostpointercapture'])listen(event,end);
 listen('keydown',e=>{const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(d){const map=transform(),p=map.project(camera.x,camera.y),w=map.inverse(p.x+d[0]*12,p.y+d[1]*12);navigate(w,false);onNavigate();e.preventDefault();e.stopPropagation();}});
 return{draw(v,surface,selected,account,ball=null){
  if(!surface)return;const size=Math.max(1,Math.round(rect.width)),anchor=currentOrigin(),next=[surface.revision,camera.x,camera.y,camera.scale,camera.viewport.width,camera.viewport.height,size,selected,account,v.entityKey(),anchor?.x,anchor?.y,ball?.x,ball?.y].join('/');if(next===key)return;key=next;
  if(revision!==surface.revision){const initial=revision<0||image.width!==v.width||image.height!==v.height;revision=surface.revision;if(initial){image.width=v.width;image.height=v.height;}const paint=image.getContext('2d'),rects=initial?surface.layout.rects:surface.dirtyRows.flatMap(y=>surface.layout.rows[y].map(r=>({x:r.start,y,width:r.end-r.start,height:1})));for(const tile of rects){const n=(tile.y*v.width+tile.x)*4;paint.fillStyle=`rgb(${surface.rgba[n]},${surface.rgba[n+1]},${surface.rgba[n+2]})`;paint.fillRect(tile.x,tile.y,tile.width,tile.height);}}
  const height=Math.max(1,Math.round(rect.height));if(canvas.width!==size||canvas.height!==height){canvas.width=size;canvas.height=height;}else ctx.clearRect(0,0,size,height);
  const map=diamondMap(v.width,v.height,size,height,anchor),o=map.projectCut(0,0),a=map.projectCut(1,0),b=map.projectCut(0,1);
  ctx.imageSmoothingEnabled=false;ctx.save();ctx.setTransform(a.x-o.x,a.y-o.y,b.x-o.x,b.y-o.y,o.x,o.y);for(const p of map.parts())ctx.drawImage(image,p.sx,p.sy,p.width,p.height,p.dx,p.dy,p.width,p.height);ctx.restore();
  ctx.strokeStyle='#aeb9bd';ctx.lineWidth=1;ctx.beginPath();[[0,0],[v.width,0],[v.width,v.height],[0,v.height]].forEach(([x,y],i)=>{const p=map.projectCut(x,y);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);});ctx.closePath();ctx.stroke();
  ctx.fillStyle='#ffffff16';ctx.strokeStyle='#fff';ctx.lineWidth=1.5;for(const polygon of camera.minimapPolygons(anchor)){ctx.beginPath();polygon.forEach((p,i)=>{const q=map.projectCut(p.x,p.y);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);});ctx.closePath();ctx.fill();ctx.stroke();}
  for(const c of v.cannons.values())if(c.id===selected||c.account===account){ctx.beginPath();const p=map.project(c.cell%v.width+.5,Math.floor(c.cell/v.width)+.5);ctx.arc(p.x,p.y,c.id===selected?3.5:2.5,0,Math.PI*2);ctx.fillStyle=c.id===selected?'#fff':v.color(c.id);ctx.fill();ctx.strokeStyle='#172029';ctx.stroke();}
  if(ball){const p=map.project(ball.x,ball.y);ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.strokeStyle='#f5c77e';ctx.stroke();}
 },dispose(){resize.disconnect();for(const stop of listeners)stop();}};
}
