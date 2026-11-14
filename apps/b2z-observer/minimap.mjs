import{diamondMap}from'./minimap-projection.mjs';
/** One atlas; at most four source rectangles rebase its canonical cut. */
export function minimapBacking(width,height,dpr=1){const ratio=Math.min(3,Math.max(1,dpr),512/Math.max(width,height),Math.sqrt(262144/(width*height)));return{width:Math.max(1,Math.round(width*ratio)),height:Math.max(1,Math.round(height*ratio))};}
export function createMinimap(canvas,camera,onNavigate=()=>{},{controller=null,origin=()=>null}={}){
 if(!canvas)return{draw(){},dispose(){}};
 const ctx=canvas.getContext('2d'),image=document.createElement('canvas'),rebased=document.createElement('canvas');let revision=-1,key='',cutKey='',listeners=[],rect=canvas.getBoundingClientRect(),drag=null;
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
 return{draw(v,surface,selected,account,ball=null,proposal=null){
  if(!surface)return;const size=Math.max(1,rect.width),backing=minimapBacking(size,rect.height,globalThis.devicePixelRatio??1),anchor=currentOrigin(),next=[surface.revision,camera.x,camera.y,camera.scale,camera.viewport.width,camera.viewport.height,size,backing.width,backing.height,selected,account,proposal?.cell,proposal?.key,v.entityKey(),anchor?.x,anchor?.y,ball?.x,ball?.y].join('/');if(next===key)return;key=next;
  if(revision!==surface.revision){const initial=revision<0||image.width!==v.width||image.height!==v.height;revision=surface.revision;if(initial){image.width=v.width;image.height=v.height;}const paint=image.getContext('2d'),rects=initial?surface.layout.rects:surface.dirtyRows.flatMap(y=>surface.layout.rows[y].map(r=>({x:r.start,y,width:r.end-r.start,height:1})));for(const tile of rects){const n=(tile.y*v.width+tile.x)*4;paint.fillStyle=`rgb(${surface.rgba[n]},${surface.rgba[n+1]},${surface.rgba[n+2]})`;paint.fillRect(tile.x,tile.y,tile.width,tile.height);}}
  const height=Math.max(1,rect.height);if(canvas.width!==backing.width||canvas.height!==backing.height){canvas.width=backing.width;canvas.height=backing.height;}ctx.setTransform(backing.width/size,0,0,backing.height/height,0,0);ctx.clearRect(0,0,size,height);
  const map=diamondMap(v.width,v.height,size,height,anchor),o=map.projectCut(0,0),a=map.projectCut(1,0),b=map.projectCut(0,1);
  // Join the at-most-four canonical rectangles BEFORE diamond projection.
  // Projecting each independently antialiases their internal edges and leaves
  // a visible translucent cross even across a uniformly owned toroidal seam.
  const cut=[surface.revision,v.width,v.height,map.left,map.top].join('/');
  if(cut!==cutKey){cutKey=cut;if(rebased.width!==v.width||rebased.height!==v.height){rebased.width=v.width;rebased.height=v.height;}const paint=rebased.getContext('2d');paint.clearRect(0,0,v.width,v.height);paint.imageSmoothingEnabled=false;for(const p of map.parts())paint.drawImage(image,p.sx,p.sy,p.width,p.height,p.dx,p.dy,p.width,p.height);}
  ctx.imageSmoothingEnabled=false;ctx.save();ctx.transform(a.x-o.x,a.y-o.y,b.x-o.x,b.y-o.y,o.x,o.y);ctx.drawImage(rebased,0,0);ctx.restore();
  ctx.fillStyle='#ffffff16';ctx.strokeStyle='#fff';ctx.lineWidth=1.5;for(const polygon of camera.minimapPolygons(anchor)){ctx.beginPath();polygon.forEach((p,i)=>{const q=map.projectCut(p.x,p.y);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);});ctx.closePath();ctx.fill();ctx.stroke();}
  if(Number.isSafeInteger(proposal?.cell)&&(proposal.legal?proposal.legal(proposal.cell):proposal.cells.includes(proposal.cell))){const p=map.project(proposal.cell%v.width+.5,Math.floor(proposal.cell/v.width)+.5);ctx.beginPath();ctx.moveTo(p.x,p.y-4);ctx.lineTo(p.x+4,p.y);ctx.lineTo(p.x,p.y+4);ctx.lineTo(p.x-4,p.y);ctx.closePath();ctx.fillStyle='#ffe0a5';ctx.fill();ctx.strokeStyle='#172029';ctx.stroke();}
  for(const c of v.cannons.values())if(c.id===selected||c.account===account){ctx.beginPath();const p=map.project(c.cell%v.width+.5,Math.floor(c.cell/v.width)+.5);ctx.arc(p.x,p.y,c.id===selected?3.5:2.5,0,Math.PI*2);ctx.fillStyle=c.id===selected?'#fff':v.color(c.id);ctx.fill();ctx.strokeStyle='#172029';ctx.stroke();}
  if(ball){const p=map.project(ball.x,ball.y);ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.strokeStyle='#f5c77e';ctx.stroke();}
 },dispose(){resize.disconnect();for(const stop of listeners)stop();}};
}
