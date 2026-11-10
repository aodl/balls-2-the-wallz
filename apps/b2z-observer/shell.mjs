/** One local gesture/camera owner. Never touches observation, quotes or clocks. */
import{resolveInteraction}from'./interaction.mjs';
import{createMinimap}from'./minimap.mjs';
import{CameraController,focusedOn}from'./camera-controller.mjs';
import{playerAnchor}from'./player-anchor.mjs';
import{displayedBalls}from'./ball-presentation.mjs';
export function createShell(doc,camera,arcade,onPick){
 const $=id=>doc.getElementById(id),canvas=$('board'),card=$('workspace'),handle=$('aim-handle'),ring=$('aim-ring'),cleanups=[];
 let hover=null,pointer=null,cardSide=null,saveTimer=null,disposed=false,lastView=null,lastSurface=null,lastPoints=[],lastTime=0,lastIdentity='',positionKey='',lastViewport='',layoutDirty=true,layout=null,anchor=null,selectedBall=null,pendingBall=null,pendingTap=null,lastTap=null;
 const anchorCache=playerAnchor(),reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 function save(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{if(!disposed)arcade.camera({projection:'isometric-1',x:camera.x,y:camera.y,scale:camera.scale});},400);}
 const motion=new CameraController(camera,{reducedMotion,onSettled:save});
 const listen=(node,event,fn,options)=>{if(!node)return;node.addEventListener(event,fn,options);cleanups.push(()=>node.removeEventListener(event,fn,options));};
 const map=createMinimap($('minimap'),camera,save,{controller:motion,origin:()=>anchor});
 const pointers=new Map();let origin=null,last=null,owner=null,moved=false,pinched=false,pinch=null,aimOrigin=null;
 const point=e=>{const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};};
 const pair=()=>{const[a,b]=[...pointers.values()];return{x:(a.x+b.x)/2,y:(a.y+b.y)/2,d:Math.hypot(a.x-b.x,a.y-b.y)};};
 function stopFollowing(){selectedBall=pendingBall=null;motion.stopFollow();$('stop-follow').hidden=true;}
 function cancelTap(){pendingTap=pendingBall=lastTap=null;}
 function aimAt(p){if(!aimOrigin)return;const w=camera.world(p.x,p.y);arcade.aimAt(w.x-aimOrigin.x,w.y-aimOrigin.y);}
 function measure(){if(!layoutDirty&&layout)return layout;layoutDirty=false;const header=card.querySelector('.panel-header'),body=card.querySelector('.panel-body');layout={top:doc.querySelector('.arena-chrome').getBoundingClientRect().bottom+10,mini:$('minimap').getBoundingClientRect(),cycles:$('cycles-display').getBoundingClientRect(),buttons:doc.querySelector('.camera-controls').getBoundingClientRect(),desired:header.offsetHeight+body.scrollHeight+2};return layout;}
 const observer=new ResizeObserver(()=>{layoutDirty=true;});for(const n of [doc.querySelector('.arena-chrome'),card.querySelector('.panel-header'),$('action-view'),$('inspect-view'),$('account-view'),$('status-view'),$('roster-view'),$('minimap'),$('cycles-display')])observer.observe(n);
 const measureChrome=()=>{const chrome=doc.querySelector('.arena-chrome');doc.documentElement.style.setProperty('--chrome-bottom',Math.ceil(chrome.getBoundingClientRect().bottom+12)+'px');layoutDirty=true;};measureChrome();if(globalThis.visualViewport)listen(visualViewport,'resize',measureChrome);
 function locate(){const c=arcade.anchor?.()??onPick.selected();if(!c||pointers.size)return;stopFollowing();cancelTap();const top=measure().top;motion.focus(c.cell,{sy:camera.viewport.width<=700?top+80:camera.viewport.height*.42});}
 listen(doc,'b2z-locate',locate);listen(doc,'b2z-precision',()=>{});
 $('locate-context').onclick=$('focus-cannon').onclick=locate;
 $('status-button').onclick=()=>arcade.openStatus();$('help-button').onclick=()=>arcade.openHelp();$('centre-cannon').onclick=()=>arcade.openRoster();
 $('fit').onclick=()=>{stopFollowing();cancelTap();if(lastView)anchor=anchorCache.resolve(lastView,lastSurface,arcade.account(),arcade.selectedCannon(),{x:camera.x,y:camera.y},{recenter:true,identity:lastIdentity});motion.overview(anchor??{x:camera.x,y:camera.y});};
 $('zoom-in').onclick=()=>motion.zoom(1.4);$('zoom-out').onclick=()=>motion.zoom(1/1.4);$('stop-follow').onclick=stopFollowing;
 listen(doc,'keydown',e=>{if(e.key==='Escape'){cancelTap();stopFollowing();arcade.cancel();e.preventDefault();}});
 function down(e){if(e.button!==0)return;const p=point(e);pointers.set(e.pointerId,p);canvas.setPointerCapture(e.pointerId);motion.cancel();
  if(pointers.size===1){origin=last=p;moved=false;pinched=false;owner=e.currentTarget===handle?'aim':'pan';canvas.dataset.cursor=owner==='aim'?'aim':'camera';aimOrigin=arcade.aim()?camera.cellPoint(arcade.aim().cannon.cell):null;}
  else{pinch=pair();owner='camera';pinched=true;moved=true;cancelTap();stopFollowing();motion.manual();}
  if(e.currentTarget!==handle)canvas.focus({preventScroll:true});e.preventDefault();
 }
 listen(canvas,'pointerdown',down);listen(handle,'pointerdown',down);
 listen(canvas,'pointermove',e=>{if(!pointers.has(e.pointerId))return;const p=point(e);pointers.set(e.pointerId,p);
  if(pointers.size>=2){const next=pair();if(pinch){camera.zoom(next.d/Math.max(1,pinch.d),pinch.x,pinch.y);camera.pan(next.x-pinch.x,next.y-pinch.y);}pinch=next;save();return;}
  if(!last||pinched)return;if(owner==='aim'){aimAt(p);moved=true;}else{if(Math.hypot(p.x-origin.x,p.y-origin.y)>6){moved=true;cancelTap();stopFollowing();motion.manual();}if(moved){camera.pan(p.x-last.x,p.y-last.y);save();}}last=p;
 });
 function resolve(p){const hit=resolveInteraction(camera,onPick.cannons?.()??lastView?.cannons??new Map(),p,arcade.moveSelection(),arcade.aim(),lastPoints);return hit.kind==='cannon'&&arcade.hasCannon&&!arcade.hasCannon(hit.id)?{kind:'camera',cell:hit.cell}:hit;}
 function activate(hit,p,{deferBall=false}={}){
  if(hit.kind==='place'||hit.kind==='invalid'){if(hit.cell!==null)arcade.chooseCell(hit.cell);return;}
  if(hit.kind==='cannon'){stopFollowing();motion.cancel();arcade.selectCannon(hit.id);return;}
  if(hit.kind==='ball'){stopFollowing();motion.cancel();arcade.selectBall();selectedBall=hit.id;const b=lastPoints.find(b=>b.id===hit.id);if(deferBall)pendingBall={id:hit.id,due:performance.now()+400,identity:lastIdentity};else motion.follow(hit.id,lastIdentity,b);return;}
  const w=camera.world(p.x,p.y),n=camera.cell(p.x,p.y);if(n!==null)onPick.cell(n,w,p);
 }
 function tap(p,type){const now=performance.now(),hit=resolve(p);
  if(type==='touch'){lastTap=null;activate(hit,p);return;}
  if(lastTap&&now-lastTap.at<=400&&Math.hypot(p.x-lastTap.p.x,p.y-lastTap.p.y)<=7){const target=lastTap.world;cancelTap();stopFollowing();motion.zoom(1.65,p.x,p.y,{keepFollow:false,world:target});return;}
  lastTap={at:now,p,world:camera.world(p.x,p.y)};
  if(hit.kind==='place'||hit.kind==='invalid')pendingTap={due:now+400,hit,p,mode:arcade.mode(),selected:arcade.selectedCannon()};else activate(hit,p,{deferBall:true});
 }
 listen(canvas,'dblclick',e=>{e.preventDefault();e.stopPropagation();});
 function updateHover(){
  if(disposed||doc.hidden||pointers.size||!pointer){hover=null;canvas.dataset.cursor=owner==='aim'?'aim':pointers.size&&moved?'grabbing':'camera';return;}
  const r=canvas.getBoundingClientRect(),node=doc.elementFromPoint?.(pointer.x+r.left,pointer.y+r.top);hover=node&&node!==canvas?null:resolve(pointer);canvas.dataset.cursor=hover?.kind??'camera';
 }
 listen(canvas,'pointermove',e=>{if(e.pointerType!=='touch')pointer=point(e);});
 listen(canvas,'pointerleave',()=>{pointer=null;hover=null;canvas.dataset.cursor='camera';});
 function clearInput(){pointer=null;hover=null;cancelTap();motion.cancel();for(const id of pointers.keys())if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);pointers.clear();owner=null;origin=last=pinch=aimOrigin=null;moved=true;pinched=true;canvas.dataset.cursor='camera';}
 listen(doc,'visibilitychange',()=>{if(doc.hidden)clearInput();});listen(doc,'freeze',clearInput);listen(canvas,'webglcontextlost',()=>{clearInput();stopFollowing();});
 listen(canvas,'pointerup',e=>{const isTap=pointers.has(e.pointerId)&&owner==='pan'&&!moved&&!pinched,p=point(e);pointers.delete(e.pointerId);if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(isTap)tap(p,e.pointerType);if(!pointers.size){origin=last=pinch=aimOrigin=null;owner=null;pinched=false;}});
 const cancel=e=>{if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);owner=null;moved=true;pinched=true;pinch=null;cancelTap();};listen(canvas,'pointercancel',cancel);listen(canvas,'lostpointercapture',cancel);
 listen(canvas,'wheel',e=>{e.preventDefault();cancelTap();stopFollowing();motion.manual();const p=point(e);camera.zoom(Math.exp(-Math.max(-100,Math.min(100,e.deltaY))*.002),p.x,p.y);save();},{passive:false});
 listen(handle,'keydown',e=>{const n={ArrowLeft:-1,ArrowRight:1,ArrowUp:-1,ArrowDown:1}[e.key];if(n){arcade.adjustAngle(n*(e.shiftKey?5:1));e.preventDefault();e.stopPropagation();}});
 listen(canvas,'keydown',e=>{const d={ArrowLeft:[40,0],ArrowRight:[-40,0],ArrowUp:[0,40],ArrowDown:[0,-40]}[e.key];
  if(d){cancelTap();stopFollowing();motion.go(motion.target(c=>c.pan(...d)),{owner:'keyboard'});e.preventDefault();}
  else if(['+','=','-','Home'].includes(e.key)){if(e.key==='Home')$('fit').click();else motion.zoom(e.key==='-'?1/1.25:1.25);e.preventDefault();}
  else if(e.key==='Enter'){activate(resolve({x:camera.viewport.width/2,y:camera.viewport.height/2}),{x:camera.viewport.width/2,y:camera.viewport.height/2});e.preventDefault();}
  else if(e.key.toLowerCase()==='b'&&lastPoints.length){const ids=lastPoints.map(b=>b.id).sort((a,b)=>a-b),id=ids[(ids.indexOf(selectedBall)+1)%ids.length];activate({kind:'ball',id},{x:0,y:0});e.preventDefault();}
  else if(['[',']'].includes(e.key)){arcade.adjustAngle(e.key==='['?-5:5);e.preventDefault();}
 });
 function position(){
  const editing=Boolean(doc.activeElement?.closest?.('#action-inputs')),height=Math.min(camera.viewport.height,globalThis.visualViewport?.height??Infinity),short=editing&&height<520;doc.documentElement.classList.toggle('short-edit',short);
  const viewport=[camera.viewport.width,height].join('/');if(viewport!==lastViewport){lastViewport=viewport;layoutDirty=true;const c=arcade.anchor?.();if(editing&&c&&!pointers.size){const p=camera.cellPoint(c.cell);if(short||!p.visible){motion.cancel();camera.pan(0,measure().top+(short?26:80)-p.sy);}}}
  const aim=arcade.aim(),p=aim?camera.cellPoint(aim.cannon.cell):null;handle.hidden=ring.hidden=short||!p?.visible;
  if(p?.visible){const a=aim.angle*Math.PI/180,end=camera.screen(p.x+Math.cos(a),p.y+Math.sin(a)),dx=end.x-p.sx,dy=end.y-p.sy,d=Math.hypot(dx,dy);handle.style.left=`${p.sx+dx/d*48-22}px`;handle.style.top=`${p.sy+dy/d*48-22}px`;ring.style.left=`${p.sx-48}px`;ring.style.top=`${p.sy-48}px`;}
  const context=arcade.context?.(),c=['inspect','action'].includes(context)?arcade.anchor?.():null,at=c?camera.cellPoint(c.cell):null,off=Boolean(at&&!at.visible);$('locate-context').hidden=card.hidden||!off;card.classList.toggle('offscreen',off);card.inert=off;$('focus-cannon').hidden=!c;
  const m=measure();$('focus-cannon').disabled=Boolean(c&&focusedOn(camera,c.cell,{top:m.top,obstacles:[m.mini,m.cycles,m.buttons]}));$('focus-cannon').title=$('focus-cannon').disabled?'Already focused':'Focus cannon';
  if(card.hidden||off)return;const vv=globalThis.visualViewport,W=Math.min(camera.viewport.width,vv?.width??Infinity),H=Math.min(camera.viewport.height,vv?.height??Infinity),top=m.top,mini=m.mini,collapsed=context==='inspect',tools=Number(card.style.getPropertyValue('--tool-count'))||5,cw=Math.min(collapsed?12+tools*44+(tools-1)*4:360,W-16),desired=m.desired;
  let x=W-cw-8,y=top,available=H-top-80;
  if(at){const right=at.sx+74,left=at.sx-74-cw,side=cardSide==='right'&&right+cw<=W-4?'right':cardSide==='left'&&left>=4?'left':right+cw<=W-16?'right':left>=16?'left':null;cardSide=side;if(side==='right')x=right;else if(side==='left')x=left;else x=Math.max(8,Math.min(W-cw-8,at.sx-cw/2));
   let bottom=H-74;for(const obstacle of[mini,m.cycles,m.buttons])if(obstacle.width&&x+cw>obstacle.left&&x<obstacle.right)bottom=Math.min(bottom,obstacle.top-8);
   if(right+cw<=W-8||left>=8){y=Math.max(top,Math.min(bottom-56,at.sy-26));available=bottom-y;}
   else{const below=bottom-at.sy-74,above=at.sy-74-top;if(below>=above){y=at.sy+74;available=below;}else{available=above;y=at.sy-74-Math.min(desired,available);}}
  }else if(x+cw>mini.left)available=Math.min(available,mini.top-8-top);
  const h=Math.max(52,Math.floor(Math.min(desired,available))),next=[Math.round(x),Math.round(y),Math.round(cw),Math.round(h)].join('/');if(next!==positionKey){positionKey=next;card.style.left=`${Math.round(x)}px`;card.style.top=`${Math.max(top,Math.round(y))}px`;card.style.width=`${cw}px`;card.style.maxHeight=`${h}px`;}
 }
 listen(doc,'b2z-overlay',()=>{layoutDirty=true;position();});
 return{
  hover:()=>hover,followedBall:()=>selectedBall,controller:motion,mapAnchor:()=>anchor,invalidateFollow(){cancelTap();stopFollowing();anchorCache.reset();},overlays(){},
  advance(v,time,now=performance.now(),identity=lastIdentity,points=displayedBalls(v,time)){
   if(disposed||doc.hidden)return;lastView=v;lastTime=time;lastPoints=points;lastIdentity=identity;
   if(selectedBall!==null&&(arcade.selectedCannon()!==null||!v.balls.has(selectedBall)||motion.following&&motion.following.identity!==identity))stopFollowing();
   if(pendingTap&&now>=pendingTap.due){const t=pendingTap;pendingTap=null;if(t.mode===arcade.mode()&&t.selected===arcade.selectedCannon()&&arcade.moveSelection())activate(resolve(t.p),t.p);}
   if(pendingBall&&now>=pendingBall.due){const p=pendingBall;pendingBall=null;if(p.identity===identity&&v.balls.has(p.id))motion.follow(p.id,identity,points.find(b=>b.id===p.id));else stopFollowing();}
   motion.update(now,{point:points.find(b=>b.id===motion.following?.id),time,identity});
   if(selectedBall!==null&&!pendingBall&&!motion.following)selectedBall=null;$('stop-follow').hidden=selectedBall===null;
  },
  update(v,surface){if(v)lastView=v;if(surface)lastSurface=surface;if(lastView){anchor=anchorCache.resolve(lastView,lastSurface,arcade.account(),arcade.selectedCannon(),{x:camera.x,y:camera.y},{identity:lastIdentity});updateHover();position();map.draw(lastView,lastSurface,arcade.selectedCannon(),arcade.account(),lastPoints.find(b=>b.id===selectedBall));}},
  dispose(){disposed=true;motion.cancel({follow:true});map.dispose();observer.disconnect();clearTimeout(saveTimer);for(const fn of cleanups)fn();pointers.clear();},open:()=>arcade.openAccount()
 };
}
