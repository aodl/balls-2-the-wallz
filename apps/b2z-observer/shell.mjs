/** UX-03/04/11/12. A single nonmodal panel; gestures affect only the local camera/preview. */
import {wrap} from './camera.mjs';
export function createShell(doc,camera,arcade,onPick){
 const $=id=>doc.getElementById(id),canvas=$('board');let saveTimer=null,disposed=false;
 const listen=(node,event,fn,options)=>{node.addEventListener(event,fn,options);cleanups.push(()=>node.removeEventListener(event,fn,options));};const cleanups=[];
 function save(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{if(!disposed)arcade.camera({projection:'isometric-1',x:camera.x,y:camera.y,scale:camera.scale});},400);}
 let panelOpen=false,accommodation=null;
 const accommodate=()=>{const open=!$('workspace').hidden;if(!open){panelOpen=false;clearTimeout(accommodation);return;}if(panelOpen)return;panelOpen=true;accommodation=setTimeout(()=>{const c=onPick.selected();if(!c)return;let x=c.cell%camera.width+.5,y=Math.floor(c.cell/camera.width)+.5;if(camera.torus){x=camera.x+(x-camera.x)-Math.round((x-camera.x)/camera.width)*camera.width;y=camera.y+(y-camera.y)-Math.round((y-camera.y)/camera.height)*camera.height;}const p=camera.screen(x,y),r=$('workspace').getBoundingClientRect();if(p.x>r.left-24&&p.x<r.right+24&&p.y>r.top-24&&p.y<r.bottom+24){if(innerWidth<=700)camera.pan(0,Math.max(110,r.top-40)-p.y);else camera.pan(r.left-48-p.x,0);}},0);};
 listen(doc,'b2z-overlay',accommodate);
 const locate=()=>{const c=onPick.selected();if(c){camera.frameCell(c.cell);save();}};
 listen(doc,'b2z-locate',locate);
 $('status-button').onclick=()=>arcade.openStatus();$('help-button').onclick=()=>arcade.openHelp();$('centre-cannon').onclick=()=>arcade.openRoster();
 $('fit').onclick=()=>{camera.fit();save();};$('zoom-in').onclick=()=>{camera.zoom(1.4);save();};$('zoom-out').onclick=()=>{camera.zoom(1/1.4);save();};
 listen(doc,'keydown',event=>{if(event.key==='Escape'){arcade.cancel();event.preventDefault();}});
 const measureChrome=()=>{const chrome=doc.querySelector('.arena-chrome');if(chrome)doc.documentElement.style.setProperty('--chrome-bottom',Math.ceil(chrome.getBoundingClientRect().bottom+12)+'px');};
 const chromeObserver=new ResizeObserver(measureChrome);chromeObserver.observe(doc.querySelector('.arena-chrome'));measureChrome();if(globalThis.visualViewport)listen(visualViewport,'resize',measureChrome);
 const pointers=new Map();let origin=null,last=null,moved=false,pinched=false,pinch=null;
 const point=event=>{const r=canvas.getBoundingClientRect();return {x:event.clientX-r.left,y:event.clientY-r.top};};
 const pair=()=>{const [a,b]=[...pointers.values()];return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,d:Math.hypot(a.x-b.x,a.y-b.y)};};
 listen(canvas,'pointerdown',event=>{if(event.button!==0)return;canvas.focus({preventScroll:true});const p=point(event);pointers.set(event.pointerId,p);canvas.setPointerCapture(event.pointerId);if(pointers.size===1){origin=last=p;moved=false;pinched=false;}else{pinch=pair();pinched=true;moved=true;}event.preventDefault();});
 listen(canvas,'pointermove',event=>{if(!pointers.has(event.pointerId))return;const p=point(event);pointers.set(event.pointerId,p);if(pointers.size>=2){const next=pair();if(pinch){camera.zoom(next.d/Math.max(1,pinch.d),pinch.x,pinch.y);camera.pan(next.x-pinch.x,next.y-pinch.y);}pinch=next;save();return;}if(!last||pinched)return;if(Math.hypot(p.x-origin.x,p.y-origin.y)>6)moved=true;if(moved){camera.pan(p.x-last.x,p.y-last.y);save();}last=p;});
 function pick(p){
  const world=camera.world(p.x,p.y),n=camera.cell(p.x,p.y);
  // An aim direction may point outside a bounded board; a paid destination may not.
  const hit=n===null?false:onPick.cell(n,world,p);if(hit)return;
  const aim=arcade.aim();if(aim){let dx=world.x-(aim.cannon.cell%camera.width+.5),dy=world.y-(Math.floor(aim.cannon.cell/camera.width)+.5);if(camera.torus){dx-=Math.round(dx/camera.width)*camera.width;dy-=Math.round(dy/camera.height)*camera.height;}arcade.aimAt(dx,dy);}
 }
 listen(canvas,'pointerup',event=>{const p=point(event),tap=pointers.has(event.pointerId)&&!moved&&!pinched;pointers.delete(event.pointerId);if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);if(tap)pick(p);if(!pointers.size){origin=last=pinch=null;pinched=false;}});
 listen(canvas,'pointercancel',event=>{pointers.delete(event.pointerId);moved=true;pinch=null;});
 listen(canvas,'wheel',event=>{event.preventDefault();const p=point(event);camera.zoom(Math.exp(-Math.max(-100,Math.min(100,event.deltaY))*.002),p.x,p.y);save();},{passive:false});
 listen(canvas,'keydown',event=>{const directions={ArrowLeft:[40,0],ArrowRight:[-40,0],ArrowUp:[0,40],ArrowDown:[0,-40]};if(directions[event.key]){camera.pan(...directions[event.key]);event.preventDefault();save();}else if(['+','=','-','Home'].includes(event.key)){if(event.key==='Home')camera.fit();else camera.zoom(event.key==='-'?1/1.25:1.25);event.preventDefault();save();}else if(event.key==='Enter'){const {width,height}=camera.viewport;pick({x:width/2,y:height/2});event.preventDefault();}});
 return {overlays(){},update(){},dispose(){disposed=true;chromeObserver.disconnect();clearTimeout(saveTimer);clearTimeout(accommodation);for(const fn of cleanups)fn();pointers.clear();},open:()=>arcade.openAccount()};
}
