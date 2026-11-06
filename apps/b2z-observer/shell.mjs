/** Local navigation and measured overlays; never sends a gameplay command. */
import {nearestPoint,placeCard,intersects} from './workspace.mjs';
export function createShell(doc,camera,arcade,onPick){
 const $=id=>doc.getElementById(id),dialogs=[...doc.querySelectorAll('dialog')],canvas=$('board'),pad=$('aim-pad');let returnFocus=null,dismissed=false,restored=false,framed=false,saveTimer,overlaySignature='';
 const rect=id=>$(id).getBoundingClientRect();
 function open(id){returnFocus=doc.activeElement;for(const d of dialogs)if(d.open)d.close();$(id).showModal();}
 for(const b of doc.querySelectorAll('[data-dialog]'))b.addEventListener('click',()=>open(b.dataset.dialog));
 for(const b of doc.querySelectorAll('[data-close]'))b.addEventListener('click',()=>b.closest('dialog').close());
 for(const d of dialogs){d.addEventListener('close',()=>{if(d.id==='identify-dialog')arcade.cancelIdentify();if(returnFocus?.isConnected)returnFocus.focus();else $('identify-button').focus();});d.addEventListener('click',e=>{const r=d.getBoundingClientRect();if(e.target===d&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))d.close();});}
 doc.addEventListener('b2z-identify',()=>open('identify-dialog'));
 for(const [id,value]of[['fire-action','ball'],['move-action','move'],['join-action','start']])$(id).addEventListener('click',()=>arcade.action(value));
 function save(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>arcade.camera({x:camera.x,y:camera.y,scale:camera.scale,width:camera.width,height:camera.height}),500);}
 function locate(){const c=onPick.selected();if(c){camera.frameCell(c.cell);framed=false;frameTool();save();}}
 doc.addEventListener('b2z-locate',locate);$('locate-selection').onclick=locate;
 $('centre-cannon').onclick=()=>{locate();arcade.openRoster();};$('fit-world').onclick=()=>{camera.fit();save();};
 for(const [id,factor]of[['zoom-in',1.5],['zoom-out',1/1.5]])$(id).onclick=()=>{camera.zoom(factor);save();};

 // Classes are measured directly; avoid assumptions about header or status height.
 function safeRect(){const vv=globalThis.visualViewport,brand=doc.querySelector('.arena-brand').getBoundingClientRect(),status=doc.querySelector('.arena-status').getBoundingClientRect();return {left:(vv?.offsetLeft??0)+12,top:(vv?.offsetTop??0)+Math.max(brand.bottom,rect('identify-button').bottom,rect('cycle-meter').bottom)+12,right:rect('fire-action').left-12,bottom:Math.min(vv?.height??innerHeight,status.top)-12};}
 function frameTool(){const c=onPick.selected();if(!c||!camera.initialized||arcade.mode()==='inspect'||arcade.mode()==='start'||framed)return;const s=safeRect(),p=nearestPoint(camera,c.cell),mobile=innerWidth<1024;const target={x:(s.left+s.right)/2,y:mobile?s.top+108:(s.top+s.bottom)/2};camera.pan(target.x-p.x,target.y-p.y);framed=true;}
 doc.addEventListener('b2z-plan',()=>{framed=false;queueMicrotask(frameTool);});
 function overlays(){
  const signature=[camera.x,camera.y,camera.scale,camera.viewport.width,camera.viewport.height,arcade.selectedCannon(),arcade.mode(),$('action-card').hidden,$('action-card').offsetHeight,doc.querySelector('.arena-status').offsetHeight,globalThis.visualViewport?.height,globalThis.visualViewport?.offsetTop].join('/');if(signature===overlaySignature)return;overlaySignature=signature;
  const card=$('action-card'),s=safeRect(),c=onPick.selected();let p=c?nearestPoint(camera,c.cell):null;
  if(camera.initialized&&!restored){const pref=arcade.camera();if(pref&&pref.width===camera.width&&pref.height===camera.height&&[pref.x,pref.y,pref.scale].every(Number.isFinite)){camera.x=pref.x;camera.y=pref.y;camera.scale=pref.scale;camera.constrain();}else if(c)camera.frameCell(c.cell);else if(onPick.first?.())camera.frameCell(onPick.first().cell);restored=true;}
  if(card.hidden){pad.setAttribute('hidden','');doc.body.classList.remove('action-open');return;}
  doc.body.classList.add('action-open');const mobile=innerWidth<1024;card.style.width=`${Math.min(304,s.right-s.left)}px`;card.style.maxHeight=`${Math.max(100,mobile?Math.min((s.bottom-s.top)*.58,s.bottom-s.top-224):s.bottom-s.top)}px`;
  const size={width:card.offsetWidth,height:card.offsetHeight},position=placeCard(s,size,p,mobile);card.style.left=`${position.left}px`;card.style.top=`${position.top}px`;
  const onScreen=p&&p.x>=s.left+99&&p.x<=s.right-99&&p.y>=s.top+99&&p.y<=s.bottom-99;
  const ring=p?{left:p.x-100,right:p.x+100,top:p.y-100,bottom:p.y+100}:null;
  pad.toggleAttribute('hidden',arcade.mode()!=='ball'||!onScreen||intersects(ring,card.getBoundingClientRect(),8));
  if(!pad.hasAttribute('hidden')){pad.style.left=`${p.x-100}px`;pad.style.top=`${p.y-100}px`;}
  $('locate-selection').hidden=!c||onScreen&&!pad.hasAttribute('hidden')||arcade.mode()==='start';
 }
 const observer=new ResizeObserver(overlays);for(const n of ['action-card','cycle-meter','identify-button','fire-action'])observer.observe($(n));observer.observe(doc.querySelector('.arena-status'));globalThis.visualViewport?.addEventListener('resize',overlays);globalThis.visualViewport?.addEventListener('scroll',overlays);doc.addEventListener('b2z-overlay',overlays);
 $('dismiss-welcome').onclick=$('just-watch').onclick=()=>{dismissed=true;$('welcome').hidden=true;};$('start-playing').onclick=()=>{dismissed=true;$('welcome').hidden=true;arcade.action('start');};
 for(const toolbar of doc.querySelectorAll('[role="toolbar"]'))toolbar.addEventListener('keydown',e=>{if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;const bs=[...toolbar.querySelectorAll('button')],i=bs.indexOf(doc.activeElement);bs[e.key==='Home'?0:e.key==='End'?bs.length-1:(i+(e.key==='ArrowDown'?1:-1)+bs.length)%bs.length].focus();e.preventDefault();});
 doc.addEventListener('keydown',e=>{if(e.key==='Escape'&&!dialogs.some(d=>d.open)){arcade.cancel();}});
 const pointers=new Map();let gesture=null,aimDrag=null;
 const point=e=>{const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
 const summary=()=>{const ps=[...pointers.values()];return {x:ps.reduce((n,p)=>n+p.x,0)/ps.length,y:ps.reduce((n,p)=>n+p.y,0)/ps.length,d:ps.length===2?Math.hypot(ps[1].x-ps[0].x,ps[1].y-ps[0].y):0};};
 function aim(e){const r=pad.getBoundingClientRect();arcade.aimAt(e.clientX-r.left-r.width/2,e.clientY-r.top-r.height/2);}
 doc.addEventListener('pointerdown',e=>{if(aimDrag!==null&&e.pointerId!==aimDrag){aimDrag=null;pointers.clear();gesture=null;}},true);
 pad.addEventListener('pointerdown',e=>{if(e.button!==0||!e.isPrimary)return;aimDrag=e.pointerId;pad.setPointerCapture(e.pointerId);pad.focus({preventScroll:true});aim(e);e.preventDefault();});
 pad.addEventListener('pointermove',e=>{if(aimDrag===e.pointerId)aim(e);});for(const name of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(name,()=>aimDrag=null);
 pad.addEventListener('keydown',e=>{const delta={ArrowRight:1,ArrowDown:1,ArrowLeft:-1,ArrowUp:-1,PageDown:10,PageUp:-10}[e.key];if(delta!==undefined){e.preventDefault();arcade.adjustAngle(delta*(e.shiftKey?10:e.altKey?.01:1));}});
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;canvas.focus();canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,point(e));gesture={...summary(),start:point(e),moved:pointers.size>1||!e.isPrimary};e.preventDefault();});
 canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId)||!gesture)return;const prior=summary();pointers.set(e.pointerId,point(e));const next=summary();if(Math.hypot(next.x-gesture.start.x,next.y-gesture.start.y)>5||pointers.size>1)gesture.moved=true;if(gesture.moved){if(prior.d&&next.d)camera.zoom(next.d/prior.d,prior.x,prior.y);camera.pan(next.x-prior.x,next.y-prior.y);save();}});
 canvas.addEventListener('pointerup',e=>{if(!pointers.has(e.pointerId)||!gesture)return;const p=point(e);if(!gesture.moved&&pointers.size===1){const cell=camera.cell(p.x,p.y);if(cell!==null)onPick.cell(cell,camera.world(p.x,p.y));}pointers.delete(e.pointerId);if(pointers.size)gesture={...summary(),start:summary(),moved:true};});
 for(const name of ['pointercancel','lostpointercapture'])canvas.addEventListener(name,e=>{pointers.delete(e.pointerId);if(!pointers.size)gesture=null;});
 canvas.addEventListener('wheel',e=>{e.preventDefault();const p=point(e);camera.zoom(Math.exp(-Math.max(-300,Math.min(300,e.deltaY))*.003),p.x,p.y);save();},{passive:false});
 canvas.addEventListener('keydown',e=>{const move={ArrowLeft:[60,0],ArrowRight:[-60,0],ArrowUp:[0,60],ArrowDown:[0,-60]}[e.key];if(move){camera.pan(...move);e.preventDefault();}else if(['+','=','-','Home'].includes(e.key)){e.preventDefault();if(e.key==='Home')camera.fit();else camera.zoom(e.key==='-'?.8:1.25);}save();});
 $('minimap').addEventListener('pointerdown',e=>{const r=rect('minimap');camera.centre((e.clientX-r.left)/r.width*camera.width,(e.clientY-r.top)/r.height*camera.height);save();e.preventDefault();});
 $('minimap').addEventListener('keydown',e=>{const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(d){camera.centre(camera.x+d[0],camera.y+d[1]);save();e.preventDefault();}});
 return {open,overlays,update(world,verified){if(!dismissed&&!arcade.account()&&!arcade.active()){$('welcome').hidden=!world;text('welcome-title',verified?'Claim territory. Keep your cannons alive.':'Explore the verified arena.');text('welcome-note',verified?'Watch the live arena, or identify the ICP account you will play from.':'Gameplay is unavailable. Explore the latest verified board or identify for later.');text('start-playing',verified?'Start playing':'Identify for later');text('just-watch',verified?'Just watch':'Explore arena');}else $('welcome').hidden=true;},get dismissed(){return dismissed;}};
 function text(id,value){if($(id).textContent!==value)$(id).textContent=value;}
}
