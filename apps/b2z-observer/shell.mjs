/** One local input owner per gesture. No observation/playback lifecycle operations. */
import {createMinimap} from './minimap.mjs';
export function createShell(doc,camera,arcade,onPick){
 const $=id=>doc.getElementById(id),canvas=$('board'),card=$('workspace'),handle=$('aim-handle'),ring=$('aim-ring'),cleanups=[];
 let saveTimer=null,disposed=false,lastView=null,lastSurface=null,positionKey='',lastViewport='';
 const listen=(node,event,fn,options)=>{if(!node)return;node.addEventListener(event,fn,options);cleanups.push(()=>node.removeEventListener(event,fn,options));};
 function save(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{if(!disposed)arcade.camera({projection:'isometric-1',x:camera.x,y:camera.y,scale:camera.scale});},400);}
 const map=createMinimap($('minimap'),camera,save);
 const pointers=new Map();let origin=null,last=null,owner=null,moved=false,pinched=false,pinch=null,aimOrigin=null;
 const point=e=>{const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
 const pair=()=>{const [a,b]=[...pointers.values()];return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,d:Math.hypot(a.x-b.x,a.y-b.y)};};
 function aimAt(p){if(!aimOrigin)return;const w=camera.world(p.x,p.y);arcade.aimAt(w.x-aimOrigin.x,w.y-aimOrigin.y);}
 function locate(precision=false){const c=arcade.anchor?.()??onPick.selected();if(!c||pointers.size)return;if(!precision||camera.scale<24)camera.frameCell(c.cell);else if(!camera.cellPoint(c.cell).visible)camera.centre(c.cell%camera.width+.5,Math.floor(c.cell/camera.width)+.5);
  if(precision&&camera.viewport.width<=700){const p=camera.cellPoint(c.cell),top=doc.querySelector('.arena-chrome').getBoundingClientRect().bottom;camera.pan(0,top+80-p.sy);}save();}
 listen(doc,'b2z-locate',()=>locate());listen(doc,'b2z-precision',()=>locate(true));
 $('locate-context').onclick=$('focus-cannon').onclick=()=>locate(true);
 $('status-button').onclick=()=>arcade.openStatus();$('help-button').onclick=()=>arcade.openHelp();$('centre-cannon').onclick=()=>arcade.openRoster();
 $('fit').onclick=()=>{camera.fit();save();};$('zoom-in').onclick=()=>{camera.zoom(1.4);save();};$('zoom-out').onclick=()=>{camera.zoom(1/1.4);save();};
 listen(doc,'keydown',e=>{if(e.key==='Escape'){arcade.cancel();e.preventDefault();}});
 const measureChrome=()=>{const chrome=doc.querySelector('.arena-chrome');if(chrome)doc.documentElement.style.setProperty('--chrome-bottom',Math.ceil(chrome.getBoundingClientRect().bottom+12)+'px');positionKey='';};
 const chromeObserver=new ResizeObserver(measureChrome);chromeObserver.observe(doc.querySelector('.arena-chrome'));measureChrome();if(globalThis.visualViewport)listen(visualViewport,'resize',measureChrome);
 function down(e){if(e.button!==0)return;const p=point(e);pointers.set(e.pointerId,p);canvas.setPointerCapture(e.pointerId);
  if(pointers.size===1){origin=last=p;moved=false;pinched=false;owner=e.currentTarget===handle?'aim':'pan';aimOrigin=arcade.aim()?camera.cellPoint(arcade.aim().cannon.cell):null;}
  else{pinch=pair();owner='camera';pinched=true;moved=true;}
  if(e.currentTarget!==handle)canvas.focus({preventScroll:true});e.preventDefault();
 }
 listen(canvas,'pointerdown',down);listen(handle,'pointerdown',down);
 listen(canvas,'pointermove',e=>{if(!pointers.has(e.pointerId))return;const p=point(e);pointers.set(e.pointerId,p);
  if(pointers.size>=2){const next=pair();if(pinch){camera.zoom(next.d/Math.max(1,pinch.d),pinch.x,pinch.y);camera.pan(next.x-pinch.x,next.y-pinch.y);}pinch=next;save();return;}
  if(!last||pinched)return;if(owner==='aim'){aimAt(p);moved=true;}else{if(Math.hypot(p.x-origin.x,p.y-origin.y)>6)moved=true;if(moved){camera.pan(p.x-last.x,p.y-last.y);save();}}last=p;
 });
 function pick(p){const w=camera.world(p.x,p.y),n=camera.cell(p.x,p.y);
  // Invalid paid destinations are consumed here, never reinterpreted as aiming.
  if(arcade.moveSelection()){if(n!==null)arcade.chooseCell(n);return;}
  if(n!==null&&onPick.cell(n,w,p))return;const aim=arcade.aim();if(aim){aimOrigin=camera.cellPoint(aim.cannon.cell);aimAt(p);}
 }
 listen(canvas,'pointerup',e=>{const tap=pointers.has(e.pointerId)&&owner==='pan'&&!moved&&!pinched,p=point(e);pointers.delete(e.pointerId);if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(tap)pick(p);if(!pointers.size){origin=last=pinch=aimOrigin=null;owner=null;pinched=false;}});
 const cancel=e=>{if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);owner=null;moved=true;pinched=true;pinch=null;};listen(canvas,'pointercancel',cancel);listen(canvas,'lostpointercapture',cancel);
 listen(canvas,'wheel',e=>{e.preventDefault();const p=point(e);camera.zoom(Math.exp(-Math.max(-100,Math.min(100,e.deltaY))*.002),p.x,p.y);save();},{passive:false});
 listen(handle,'keydown',e=>{const n={ArrowLeft:-1,ArrowRight:1,ArrowUp:-1,ArrowDown:1}[e.key];if(n){arcade.adjustAngle(n*(e.shiftKey?5:1));e.preventDefault();e.stopPropagation();}});
 listen(canvas,'keydown',e=>{const d={ArrowLeft:[40,0],ArrowRight:[-40,0],ArrowUp:[0,40],ArrowDown:[0,-40]}[e.key];if(d){camera.pan(...d);e.preventDefault();save();}else if(['+','=','-','Home'].includes(e.key)){if(e.key==='Home')camera.fit();else camera.zoom(e.key==='-'?1/1.25:1.25);e.preventDefault();save();}else if(e.key==='Enter'){pick({x:camera.viewport.width/2,y:camera.viewport.height/2});e.preventDefault();}else if(['[',']'].includes(e.key)){arcade.adjustAngle(e.key==='['?-5:5);e.preventDefault();}});
 function position(){
  const editing=Boolean(doc.activeElement?.closest?.('#action-inputs')),height=Math.min(camera.viewport.height,globalThis.visualViewport?.height??Infinity),short=editing&&height<520;
  doc.documentElement.classList.toggle('short-edit',short);
  const viewport=[camera.viewport.width,height].join('/');
  if(viewport!==lastViewport){lastViewport=viewport;const anchor=arcade.anchor?.();if(editing&&anchor&&!pointers.size){const p=camera.cellPoint(anchor.cell);if(short||!p.visible){const y=doc.querySelector('.arena-header').getBoundingClientRect().bottom+(short?26:80);camera.pan(0,y-p.sy);}}}
  const aim=arcade.aim(),p=aim?camera.cellPoint(aim.cannon.cell):null;handle.hidden=ring.hidden=short||!p?.visible;
  if(p?.visible){const a=aim.angle*Math.PI/180,end=camera.screen(p.x+Math.cos(a),p.y+Math.sin(a)),dx=end.x-p.sx,dy=end.y-p.sy,d=Math.hypot(dx,dy);handle.style.left=`${p.sx+dx/d*48-22}px`;handle.style.top=`${p.sy+dy/d*48-22}px`;ring.style.left=`${p.sx-48}px`;ring.style.top=`${p.sy-48}px`;}
  const context=arcade.context?.(),anchor=['inspect','action'].includes(context)?arcade.anchor?.():null,at=anchor?camera.cellPoint(anchor.cell):null,off=Boolean(at&&!at.visible);
  $('locate-context').hidden=card.hidden||!off;card.classList.toggle('offscreen',off);card.inert=off;$('focus-cannon').hidden=!anchor;card.dataset.surface=anchor?'context':'global';if(card.hidden||off)return;
  const vv=globalThis.visualViewport,W=Math.min(camera.viewport.width,vv?.width??Infinity),H=Math.min(camera.viewport.height,vv?.height??Infinity),top=doc.querySelector('.arena-chrome').getBoundingClientRect().bottom+10,mini=$('minimap').getBoundingClientRect(),cw=Math.min(360,W-16,H<520&&W>700?Math.max(260,W/2-90):360),desired=card.querySelector('.panel-header').offsetHeight+card.querySelector('.panel-body').scrollHeight+4;
  let x=W-cw-8,y=top,available=H-top-80;
  if(at){const right=at.sx+74,left=at.sx-74-cw;if(right+cw<=W-8)x=right;else if(left>=8)x=left;else x=Math.max(8,Math.min(W-cw-8,at.sx-cw/2));
   let bottom=H-74;for(const obstacle of [mini,$('cycles-display').getBoundingClientRect(),doc.querySelector('.camera-controls').getBoundingClientRect()])if(obstacle.width&&x+cw>obstacle.left&&x<obstacle.right)bottom=Math.min(bottom,obstacle.top-8);
   if(right+cw<=W-8||left>=8){y=Math.max(top,Math.min(bottom-120,at.sy-60));available=bottom-y;}
   else{const below=bottom-at.sy-74,above=at.sy-74-top;if(below>=above){y=at.sy+74;available=below;}else{available=above;y=at.sy-74-Math.min(desired,available);}}
  }else if(x+cw>mini.left)available=Math.min(available,mini.top-8-top);
  const h=Math.max(64,Math.min(desired,available)),next=[Math.round(x),Math.round(y),Math.round(cw),Math.round(h)].join('/');
  if(next!==positionKey){positionKey=next;card.style.left=`${Math.round(x)}px`;card.style.top=`${Math.max(top,Math.round(y))}px`;card.style.width=`${cw}px`;card.style.maxHeight=`${h}px`;}
 }
 listen(doc,'b2z-overlay',position);
 return {overlays(){},update(v,surface){if(v)lastView=v;if(surface)lastSurface=surface;position();if(lastView)map.draw(lastView,lastSurface,arcade.selectedCannon(),arcade.account());},dispose(){disposed=true;map.dispose();chromeObserver.disconnect();clearTimeout(saveTimer);for(const fn of cleanups)fn();pointers.clear();},open:()=>arcade.openAccount()};
}
