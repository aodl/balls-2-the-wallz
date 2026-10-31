/** Local dialogs and camera gestures. Opening controls never pauses gameplay. */
export function createShell(doc,camera,arcade,onPick){
 const $=id=>doc.getElementById(id),dialogs=[...doc.querySelectorAll('dialog')];let returnFocus=null,offered=false,dismissed=false,empty=false;
 function placeAim(){$('empty-arena').hidden=!(empty&&!dismissed&&$('play-dialog').hidden);}
 function open(id){returnFocus=doc.activeElement;for(const d of dialogs)if(d.open)d.close();if(id==='play-dialog'){$(id).hidden=false;}else $(id).showModal();placeAim();}
 for(const b of doc.querySelectorAll('[data-dialog]'))b.addEventListener('click',()=>open(b.dataset.dialog));
 for(const b of doc.querySelectorAll('[data-close]'))b.addEventListener('click',()=>(b.closest('dialog')?b.closest('dialog').close():$('play-dialog').hidden=true));
 for(const d of dialogs){d.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const items=[...d.querySelectorAll('button,input,select,textarea,summary,a[href],[tabindex]')].filter(n=>!n.matches(':disabled')&&n.tabIndex>=0&&n.getClientRects().length);const first=items[0],last=items.at(-1);if(!first){e.preventDefault();d.focus();}else if(e.shiftKey&&doc.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&doc.activeElement===last){e.preventDefault();first.focus();}});d.addEventListener('close',()=>{placeAim();if(!dialogs.some(x=>x.open)){if(returnFocus?.isConnected&&returnFocus.getClientRects().length)returnFocus.focus();else $('toolbar-play').focus();}});d.addEventListener('click',e=>{const r=d.getBoundingClientRect();if(e.target===d&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))d.close();});}
 $('dismiss-empty').addEventListener('click',()=>{dismissed=true;placeAim();$('toolbar-play').focus();});
 $('empty-prepare').addEventListener('click',()=>open('play-dialog'));
 $('pick-move').addEventListener('click',()=>{$('play-dialog').hidden=true;$('board').focus();$('camera-help').textContent='Choose a highlighted owned cell. Clicking prepares a memo; it never executes a move.';});
 $('fit-world').addEventListener('click',()=>camera.fit());
 $('centre-cannon').addEventListener('click',()=>{const c=onPick.selected();if(c)camera.frameCell(c.cell);});
 for(const [id,factor]of[['zoom-in',1.5],['zoom-out',1/1.5]])$(id).addEventListener('click',()=>camera.zoom(factor));
 doc.addEventListener('keydown',e=>{if(e.key==='Escape')$('play-dialog').hidden=true;});
 const canvas=$('board'),pointers=new Map();let gesture=null;
 const point=e=>{const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
 const summary=()=>{const ps=[...pointers.values()];return {x:ps.reduce((n,p)=>n+p.x,0)/ps.length,y:ps.reduce((n,p)=>n+p.y,0)/ps.length,d:ps.length===2?Math.hypot(ps[1].x-ps[0].x,ps[1].y-ps[0].y):0};};
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;canvas.focus();canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,point(e));gesture={...summary(),start:point(e),moved:pointers.size>1};e.preventDefault();});
 canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const prior=summary();pointers.set(e.pointerId,point(e));const next=summary();if(Math.hypot(next.x-gesture.start.x,next.y-gesture.start.y)>5||pointers.size>1)gesture.moved=true;if(gesture.moved){if(prior.d&&next.d)camera.zoom(next.d/prior.d,prior.x,prior.y);camera.pan(next.x-prior.x,next.y-prior.y);}});
 canvas.addEventListener('pointerup',e=>{if(!pointers.has(e.pointerId))return;const p=point(e);if(!gesture.moved&&pointers.size===1){const cell=camera.cell(p.x,p.y);if(cell!==null&&onPick.cell(cell,camera.world(p.x,p.y)))open('play-dialog');}pointers.delete(e.pointerId);if(pointers.size)gesture={...summary(),start:summary(),moved:true};});
 for(const event of ['pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>pointers.delete(e.pointerId));
 canvas.addEventListener('wheel',e=>{e.preventDefault();const p=point(e);camera.zoom(Math.exp(-Math.max(-300,Math.min(300,e.deltaY))*.003),p.x,p.y);},{passive:false});
 canvas.addEventListener('keydown',e=>{const move={ArrowLeft:[60,0],ArrowRight:[-60,0],ArrowUp:[0,60],ArrowDown:[0,-60]}[e.key];if(move){camera.pan(...move);e.preventDefault();}else if(['+','=','-','Home'].includes(e.key)){e.preventDefault();if(e.key==='Home')camera.fit();else camera.zoom(e.key==='-'?.8:1.25);}});
 $('minimap').addEventListener('pointerdown',e=>{const r=$('minimap').getBoundingClientRect();camera.centre((e.clientX-r.left)/r.width*camera.width,(e.clientY-r.top)/r.height*camera.height);e.preventDefault();});
 $('minimap').addEventListener('keydown',e=>{if(e.key==='Home'){camera.fit();e.preventDefault();}const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(d){camera.centre(camera.x+d[0],camera.y+d[1]);e.preventDefault();}});
 return {open,update(world,verified){const isEmpty=verified&&world&&world.cannons.size===0;if(world?.cannons.size){dismissed=true;offered=true;}if(isEmpty&&!offered){offered=true;dismissed=false;}empty=isEmpty;placeAim();},get dismissed(){return dismissed;}};
}
