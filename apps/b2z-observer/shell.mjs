/** One local gesture/camera owner. Never touches observation, quotes or clocks. */
import{resolveInteraction,placementIntent,samePlacementContext,aimingVicinity}from'./interaction.mjs';
import{createMinimap}from'./minimap.mjs';
import{CameraController,focusedOn,wheelZoom,previewComposition}from'./camera-controller.mjs';
import{playerAnchor}from'./player-anchor.mjs';
import{displayedBalls}from'./ball-presentation.mjs';
export function createShell(doc,camera,arcade,onPick){
 const $=id=>doc.getElementById(id),canvas=$('board'),card=$('workspace'),handle=$('aim-handle'),ring=$('aim-ring'),cleanups=[];
 let hover=null,pointer=null,cardSide=null,saveTimer=null,disposed=false,lastView=null,lastSurface=null,lastPoints=[],lastTime=0,lastIdentity='',positionKey='',lastViewport='',layoutDirty=true,layout=null,cardBounds=null,wasShort=false,anchor=null,selectedBall=null,pendingTap=null,lastTap=null,followRebase=false,gestureSequence=0,doubleHandled=false,nativePairWorld=null,compositionKey='',locateGeneration=0,completedTouch=null,narrowPositionKey='',narrowY=null;
 const anchorCache=playerAnchor(),reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 function save(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{if(!disposed)arcade.camera({projection:'isometric-1',x:camera.x,y:camera.y,scale:camera.scale});},400);}
 const motion=new CameraController(camera,{reducedMotion,onSettled:save});
 const listen=(node,event,fn,options)=>{if(!node)return;node.addEventListener(event,fn,options);cleanups.push(()=>node.removeEventListener(event,fn,options));};
 const map=createMinimap($('minimap'),camera,save,{controller:motion,origin:()=>anchor});
 // Long-press discovers an icon without activating it; keyboard gets the same
 // explicit name/reason. This is local feedback, never a gesture/game command.
 let helpTimer=null,helpHide=null,helpConsumed=false,keyboardFocus=false;
 const header=card.querySelector('.panel-header'),hint=$('toolbar-hint');
 const clearHelp=()=>{clearTimeout(helpTimer);helpTimer=null;};
 const hideHelp=()=>{clearTimeout(helpHide);hint.hidden=true;};
 const showHelp=b=>{hint.textContent=b.title||b.getAttribute('aria-label');hint.hidden=false;clearTimeout(helpHide);helpHide=setTimeout(hideHelp,2000);};
 listen(doc,'pointerdown',()=>{completedTouch=null;keyboardFocus=false;hideHelp();clearHelp();},true);
 // A handled touch can reveal a toolbar under its original coordinates. Its
 // later compatibility click must not activate that newly revealed control.
 listen(doc,'click',e=>{const t=completedTouch;completedTouch=null;if(t&&e.detail>0&&e.target!==canvas&&performance.now()-t.at<750&&Math.hypot(e.clientX-t.x,e.clientY-t.y)<4){e.preventDefault();e.stopImmediatePropagation();}},true);
 listen(doc,'keydown',()=>{keyboardFocus=true;},true);
 listen(header,'pointerdown',e=>{const b=e.target.closest('button');helpConsumed=false;if(!b||e.pointerType!=='touch')return;helpTimer=setTimeout(()=>{helpConsumed=true;showHelp(b);},550);});
 listen(header,'pointerup',clearHelp);
 listen(header,'pointercancel',()=>{clearHelp();helpConsumed=false;hideHelp();});
 listen(header,'pointerleave',e=>{clearHelp();if(e.pointerType!=='touch')hideHelp();});
 listen(header,'click',e=>{if(helpConsumed){e.preventDefault();e.stopImmediatePropagation();helpConsumed=false;}else hideHelp();},true);
 listen(header,'focusin',e=>{if(keyboardFocus&&e.target.matches('button:focus-visible'))showHelp(e.target);});
 listen(header,'focusout',hideHelp);
 const pointers=new Map();let origin=null,last=null,owner=null,moved=false,pinched=false,pinch=null,aimOrigin=null,keyboardTarget=null;
 const point=e=>{const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};};
 const pair=()=>{const[a,b]=[...pointers.values()];return{x:(a.x+b.x)/2,y:(a.y+b.y)/2,d:Math.hypot(a.x-b.x,a.y-b.y)};};
 function stopFollowing(){followRebase=false;selectedBall=null;motion.stopFollow();}
 function cancelTap(){gestureSequence++;pendingTap=lastTap=null;}
 function aimAt(p){if(!aimOrigin)return;const w=camera.world(p.x,p.y);arcade.aimAt(w.x-aimOrigin.x,w.y-aimOrigin.y);}
 function measure(){if(!layoutDirty&&layout)return layout;layoutDirty=false;const header=card.querySelector('.panel-header'),body=card.querySelector('.panel-content');layout={guideObstacles:[$('status-button'),$('identify-button'),doc.querySelector('.brand')].map(n=>n.getBoundingClientRect().toJSON()),top:Math.ceil(doc.querySelector('.arena-chrome').getBoundingClientRect().bottom)+10,headerBottom:Math.ceil(doc.querySelector('.arena-header').getBoundingClientRect().bottom),mini:$('minimap').getBoundingClientRect(),cycles:$('cycles-display').getBoundingClientRect(),buttons:doc.querySelector('.camera-controls').getBoundingClientRect(),headerHeight:header.offsetHeight,desired:header.offsetHeight+body.scrollHeight+20};return layout;}
 const observer=new ResizeObserver(()=>{layoutDirty=true;});for(const n of [doc.querySelector('.arena-chrome'),card.querySelector('.panel-header'),$('action-view'),$('inspect-view'),$('account-view'),$('status-view'),$('roster-view'),$('minimap'),$('cycles-display'),$('status-button')])observer.observe(n);
 const measureChrome=()=>{const chrome=doc.querySelector('.arena-chrome');doc.documentElement.style.setProperty('--chrome-bottom',Math.ceil(chrome.getBoundingClientRect().bottom+12)+'px');layoutDirty=true;};measureChrome();if(globalThis.visualViewport)listen(visualViewport,'resize',measureChrome);
 function locate(){locateGeneration++;const c=arcade.anchor?.()??onPick.selected();if(!c||pointers.size)return;stopFollowing();cancelTap();const m=measure();motion.focus(c.cell,{top:m.top,expanded:arcade.context()==='action'});}
 listen(doc,'b2z-locate',locate);listen(doc,'b2z-precision',()=>{});
 $('locate-context').onclick=$('focus-cannon').onclick=locate;
 $('status-button').onclick=()=>arcade.openStatus();$('help-button').onclick=()=>arcade.openHelp();$('centre-cannon').onclick=()=>arcade.openRoster();
 $('fit').onclick=()=>{stopFollowing();cancelTap();if(lastView)anchor=anchorCache.resolve(lastView,lastSurface,arcade.account(),arcade.selectedCannon(),{x:camera.x,y:camera.y},{recenter:true,identity:lastIdentity});motion.overview(anchor??{x:camera.x,y:camera.y});};
 $('zoom-in').onclick=()=>motion.zoom(1.4);$('zoom-out').onclick=()=>motion.zoom(1/1.4);
 listen(doc,'keydown',e=>{if(e.key==='Escape'){cancelTap();stopFollowing();arcade.cancel();e.preventDefault();}});
 function down(e){if(e.button!==0)return;keyboardTarget=null;const p=point(e);nativePairWorld=lastTap&&Math.hypot(p.x-lastTap.p.x,p.y-lastTap.p.y)<=7?lastTap.world:null;pointers.set(e.pointerId,p);canvas.setPointerCapture(e.pointerId);motion.cancel();
  if(pointers.size===1){origin=last=p;moved=false;pinched=false;owner=e.currentTarget===handle||aimingVicinity(camera,arcade.aim(),p,e.pointerType,arcade.moveSelection())?'aim':'pan';canvas.dataset.cursor=owner==='aim'?'aim':'camera';aimOrigin=arcade.aim()?camera.cellPoint(arcade.aim().cannon.cell):null;
   const hit=resolve(p);if(hit.kind!=='ball'||hit.id!==selectedBall)stopFollowing();
   if(owner==='aim'){cancelTap();if(e.currentTarget!==handle&&Math.hypot(p.x-aimOrigin.sx,p.y-aimOrigin.sy)>6)aimAt(p);}
  }
  else{pinch=pair();owner='camera';pinched=true;moved=true;cancelTap();stopFollowing();motion.manual();}
  if(e.currentTarget!==handle)canvas.focus({preventScroll:true});e.preventDefault();
 }
 listen(canvas,'pointerdown',down);listen(handle,'pointerdown',down);
 listen(canvas,'pointermove',e=>{if(!pointers.has(e.pointerId))return;const p=point(e);pointers.set(e.pointerId,p);
  if(pointers.size>=2){const next=pair();if(pinch){camera.zoom(next.d/Math.max(1,pinch.d),pinch.x,pinch.y);camera.pan(next.x-pinch.x,next.y-pinch.y);}pinch=next;save();return;}
  if(!last||pinched)return;if(owner==='aim'){aimAt(p);moved=true;}else{if(Math.hypot(p.x-origin.x,p.y-origin.y)>6){moved=true;cancelTap();stopFollowing();motion.manual();}if(moved){camera.pan(p.x-last.x,p.y-last.y);save();}}last=p;
 });
 function resolve(p){const hit=resolveInteraction(camera,onPick.cannons?.()??lastView?.cannons??new Map(),p,arcade.moveSelection(),arcade.aim(),lastPoints);return hit.kind==='cannon'&&arcade.hasCannon&&!arcade.hasCannon(hit.id)?{kind:'camera',cell:hit.cell}:hit;}
 function activate(hit,p){
  if(hit.kind==='place'||hit.kind==='invalid'){if(hit.cell!==null)arcade.chooseCell(hit.cell);return;}
  if(hit.kind==='cannon'){stopFollowing();motion.cancel();if(arcade.selectCannon(hit.id))layoutDirty=true;return;}
  if(hit.kind==='ball'){if(selectedBall===hit.id&&motion.following)return;stopFollowing();motion.cancel();arcade.selectBall();selectedBall=hit.id;const b=lastPoints.find(b=>b.id===hit.id);motion.follow(hit.id,lastIdentity,b);return;}
  stopFollowing();const w=camera.world(p.x,p.y),n=camera.cell(p.x,p.y);if(n!==null)onPick.cell(n,w,p);
 }
 function tap(p,type,eventTime=performance.now()){const now=eventTime,hit=resolve(p);
  if(type==='touch'){lastTap=null;activate(hit,p);return;}
  if(lastTap&&now-lastTap.at<=400&&Math.hypot(p.x-lastTap.p.x,p.y-lastTap.p.y)<=7){const target=lastTap.world;cancelTap();doubleHandled=true;if(motion.zoom(1.65,p.x,p.y,{keepFollow:false,world:target}))stopFollowing();return;}
  doubleHandled=false;lastTap={at:now,p,world:camera.world(p.x,p.y)};
  if(hit.kind==='place'||hit.kind==='invalid')pendingTap={due:performance.now()+400,intent:placementIntent(hit,{context:arcade.intentContext(),identity:lastIdentity,sequence:gestureSequence,revision:arcade.revision()})};else activate(hit,p);
 }
 listen(canvas,'dblclick',e=>{e.preventDefault();e.stopPropagation();
  // Native click count remains decisive when a busy renderer delays event
  // handling past our modest pair window. Never commit while a pointer is down.
  if(doubleHandled){doubleHandled=false;return;}
  const p=point(e),target=nativePairWorld??lastTap?.world??camera.world(p.x,p.y);cancelTap();if(motion.zoom(1.65,p.x,p.y,{keepFollow:false,world:target}))stopFollowing();
 });
 function updateHover(){
  if(keyboardTarget&&keyboardTarget.context===arcade.intentContext()&&!pointers.size){const selection=arcade.moveSelection(),cell=keyboardTarget.cell;hover={kind:selection&&(selection.legal?selection.legal(cell):selection.cells.includes(cell))?'place':'invalid',cell};return;}
  if(disposed||doc.hidden||pointers.size||!pointer){hover=null;canvas.dataset.cursor=owner==='aim'?'aim':pointers.size&&moved?'grabbing':'camera';return;}
  const node=doc.elementFromPoint?.(pointer.x,pointer.y);hover=node&&node!==canvas?null:resolve(pointer);canvas.dataset.cursor=hover?.kind??'camera';
 }
 listen(canvas,'pointermove',e=>{if(e.pointerType!=='touch')pointer=point(e);});
 listen(canvas,'pointerleave',()=>{pointer=null;hover=null;canvas.dataset.cursor='camera';});
 function clearInput(){hideHelp();clearHelp();pointer=null;hover=null;cancelTap();motion.cancel();for(const id of pointers.keys())if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);pointers.clear();owner=null;origin=last=pinch=aimOrigin=null;moved=true;pinched=true;canvas.dataset.cursor='camera';}
 listen(doc,'visibilitychange',()=>{if(doc.hidden)clearInput();});listen(doc,'freeze',clearInput);listen(canvas,'webglcontextlost',()=>{clearInput();stopFollowing();});
 listen(canvas,'pointerup',e=>{const isTap=pointers.has(e.pointerId)&&owner==='pan'&&!moved&&!pinched,p=point(e);pointers.delete(e.pointerId);if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(isTap){if(e.pointerType==='touch')completedTouch={at:performance.now(),x:e.clientX,y:e.clientY};tap(p,e.pointerType,e.timeStamp);}if(!pointers.size){origin=last=pinch=aimOrigin=null;owner=null;pinched=false;}});
 const cancel=e=>{if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);owner=null;moved=true;pinched=true;pinch=null;cancelTap();};listen(canvas,'pointercancel',cancel);listen(canvas,'lostpointercapture',cancel);
 listen(canvas,'wheel',e=>{e.preventDefault();const p=point(e),{discrete,factor}=wheelZoom(e,camera.viewport.height);
  if(discrete){if(motion.zoom(factor,p.x,p.y,{keepFollow:false,duration:130}))stopFollowing();}
  else{motion.manual();stopFollowing();camera.zoom(factor,p.x,p.y);save();}
 },{passive:false});
 listen(handle,'keydown',e=>{const n={ArrowLeft:-1,ArrowRight:1,ArrowUp:-1,ArrowDown:1}[e.key];if(n){arcade.adjustAngle(n*(e.altKey?.01:e.shiftKey?5:1));e.preventDefault();e.stopPropagation();}});
 listen(canvas,'keydown',e=>{const d={ArrowLeft:[40,0],ArrowRight:[-40,0],ArrowUp:[0,40],ArrowDown:[0,-40]}[e.key];
  if(d&&e.altKey&&arcade.moveSelection()){
   cancelTap();stopFollowing();const selection=arcade.moveSelection(),context=arcade.intentContext(),n=keyboardTarget?.context===context?keyboardTarget.cell:selection.cell??arcade.selected()?.cell??0,step={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key],x=(n%camera.width+step[0]+camera.width)%camera.width,y=(Math.floor(n/camera.width)+step[1]+camera.height)%camera.height;
   keyboardTarget={cell:y*camera.width+x,context};pointer=null;const p=camera.cellPoint(keyboardTarget.cell);if(!p.visible)motion.go(motion.target(c=>c.centre(x+.5,y+.5)),{owner:'keyboard'});e.preventDefault();
  }
  else if(d){keyboardTarget=null;cancelTap();stopFollowing();motion.go(motion.target(c=>c.pan(...d)),{owner:'keyboard'});e.preventDefault();}
  else if(['+','=','-','Home'].includes(e.key)){if(e.key==='Home')$('fit').click();else motion.zoom(e.key==='-'?1/1.25:1.25);e.preventDefault();}
  else if(e.key==='Enter'){if(keyboardTarget?.context===arcade.intentContext()&&arcade.moveSelection())arcade.chooseCell(keyboardTarget.cell);else activate(resolve({x:camera.viewport.width/2,y:camera.viewport.height/2}),{x:camera.viewport.width/2,y:camera.viewport.height/2});e.preventDefault();}
  else if(e.key.toLowerCase()==='b'&&lastPoints.length){const ids=lastPoints.map(b=>b.id).sort((a,b)=>a-b),id=ids[(ids.indexOf(selectedBall)+1)%ids.length];activate({kind:'ball',id},{x:0,y:0});e.preventDefault();}
  else if(['[',']'].includes(e.key)){arcade.adjustAngle((e.key==='['?-1:1)*(e.altKey?.01:e.shiftKey?5:1));e.preventDefault();}
 });
 function position(){
  const editing=Boolean(doc.activeElement?.closest?.('#action-inputs')),height=Math.min(camera.viewport.height,globalThis.visualViewport?.height??Infinity),short=(editing||arcade.context()==='action')&&height<520;doc.documentElement.classList.toggle('short-edit',short);if(short!==wasShort){wasShort=short;layoutDirty=true;}
  const viewport=[camera.viewport.width,height].join('/');if(viewport!==lastViewport){lastViewport=viewport;layoutDirty=true;const c=arcade.anchor?.();if((editing||arcade.context()==='action')&&c&&!pointers.size){const p=camera.cellPoint(c.cell);if(short||!p.visible){motion.cancel();camera.pan(short?camera.viewport.width-42-p.sx:0,measure().top+(short?24:80)-p.sy);}}}
  const aim=arcade.aim(),p=aim?camera.cellPoint(aim.cannon.cell):null;handle.hidden=ring.hidden=short||!p?.visible;
  if(p?.visible){const a=aim.angle*Math.PI/180,end=camera.screen(p.x+Math.cos(a),p.y+Math.sin(a)),dx=end.x-p.sx,dy=end.y-p.sy,d=Math.hypot(dx,dy);handle.style.left=`${p.sx+dx/d*38-22}px`;handle.style.top=`${p.sy+dy/d*38-22}px`;ring.style.left=`${p.sx-38}px`;ring.style.top=`${p.sy-38}px`;}
  const context=arcade.context?.(),c=['inspect','action'].includes(context)?arcade.anchor?.():null,at=c?camera.cellPoint(c.cell):null,off=Boolean(at&&!at.visible);$('locate-context').hidden=card.hidden||!off;card.classList.toggle('offscreen',off);card.inert=off;$('focus-cannon').hidden=!c;
  doc.documentElement.classList.toggle('cannon-context',Boolean(c&&!card.hidden&&!off));
  const m=measure(),expanded=context==='action';
  const obstacles=[m.mini,m.cycles,m.buttons];if(expanded&&cardBounds)obstacles.push(cardBounds);
  $('focus-cannon').disabled=Boolean(c&&focusedOn(camera,c.cell,{top:m.top,safeTop:m.headerBottom+8,expanded,obstacles}));$('focus-cannon').title=$('focus-cannon').disabled?'Already focused':'Focus cannon';
  if(card.hidden||off){if(card.hidden)narrowPositionKey='';return;}
  const vv=globalThis.visualViewport,W=Math.min(camera.viewport.width,vv?.width??Infinity),H=Math.min(camera.viewport.height,vv?.height??Infinity),top=m.top,narrow=W<=700,cw=Math.min(360,W-16);
  let x=W-cw-8,y=top,bottom=H-(short?8:72);
  if(at){
   if(narrow){x=8;y=short?Math.max(top,Math.min(154,H-158)):Math.min(top+96,Math.max(top,H-360));
    const key=[c.id,c.cell,W,H,short,locateGeneration].join('/');
    if(key!==narrowPositionKey){narrowPositionKey=key;narrowY=y;
     const above=camera.scale*.60+2,below=camera.scale*.17+2,half=camera.scale*.62+2;
     if(!short&&motion.animation?.owner!=='focus'&&at.sx+half>x&&at.sx-half<x+cw&&at.sy+below+4>y&&at.sy-above-4<y+m.headerHeight){const bottom=Math.min(H-72,...[m.mini,m.cycles,m.buttons].filter(r=>r.width).map(r=>r.top-8));narrowY=Math.max(top,Math.min(at.sy+below+8,bottom-m.headerHeight-96));}
    }y=narrowY;
   }
   else{const clearance=Math.ceil(camera.scale/Math.SQRT2+68),right=at.sx+clearance,left=at.sx-clearance-cw;const side=cardSide==='right'&&right+cw<=W-8?'right':cardSide==='left'&&left>=8?'left':right+cw<=W-8?'right':left>=8?'left':null;cardSide=side;x=side==='right'?right:side==='left'?left:Math.max(8,Math.min(W-cw-8,at.sx-cw/2));y=Math.max(top,Math.min(H-310,at.sy-26));}
  }
  for(const obstacle of(short?[]:[m.mini,m.cycles,m.buttons]))if(obstacle.width&&x+cw>obstacle.left&&x<obstacle.right)bottom=Math.min(bottom,obstacle.top-8);
  // One natural scroll, with useful space even under a contracted keyboard.
  const room=Math.max(96,bottom-y-m.headerHeight),bodyHeight=context==='inspect'?0:Math.min(room,Math.max(0,m.desired-m.headerHeight)),next=[Math.round(x),Math.round(y),Math.round(cw),Math.round(room),Math.ceil(bodyHeight)].join('/');
  if(next!==positionKey){positionKey=next;card.style.left=`${Math.round(x)}px`;card.style.top=`${Math.round(y)}px`;card.style.width=`${cw}px`;card.style.maxHeight='none';card.style.setProperty('--body-space',`${Math.floor(room)}px`);card.style.setProperty('--body-height',`${Math.ceil(bodyHeight)}px`);}
  cardBounds={left:x,right:x+cw,top:y,bottom:y+m.headerHeight+bodyHeight};
  const site=aim?.cannon.cell??arcade.moveSelection()?.cell??c?.cell,compose=[context,arcade.mode(),c?.id,c?.cell,site,W,H,short,locateGeneration].join('/');
  if(compose!==compositionKey){compositionKey=compose;if(narrow&&c&&expanded&&!pointers.size){
   const intended=motion.animation?.owner==='focus'?Object.assign(Object.create(Object.getPrototypeOf(camera)),camera,motion.animation.to):camera;
   const target=previewComposition(intended,c.cell,site,{left:8,right:W-8,top:m.headerBottom+8,bottom:y-6},{interactive:!short&&Boolean(aim)});
   if(target){if(short){motion.cancel();Object.assign(camera,target);}else motion.go(target,{owner:'composition'});}
  }}


 }
 listen(doc,'b2z-overlay',()=>{hideHelp();clearHelp();layoutDirty=true;position();});
 return{
  guideObstacles:()=>measure().guideObstacles,hover:()=>hover,followedBall:()=>selectedBall,controller:motion,mapAnchor:()=>anchor,rebaseFollow(){if(selectedBall!==null)followRebase=true;},invalidateFollow(){cancelTap();stopFollowing();anchorCache.reset();},overlays(){},
  advance(v,time,now=performance.now(),identity=lastIdentity,points=displayedBalls(v,time)){
   if(disposed||doc.hidden)return;lastView=v;lastTime=time;lastPoints=points;lastIdentity=identity;
   if(selectedBall!==null&&(arcade.selectedCannon()!==null||!v.balls.has(selectedBall)||motion.following&&motion.following.identity!==identity))stopFollowing();
   if(pendingTap&&!pointers.size&&now>=pendingTap.due){const t=pendingTap;pendingTap=null;if(samePlacementContext(t.intent,{context:arcade.intentContext(),identity,sequence:gestureSequence})&&arcade.moveSelection())arcade.chooseCell(t.intent.cell);}

   if(followRebase&&motion.following){const p=points.find(b=>b.id===selectedBall);if(p)motion.follow(selectedBall,identity,p);followRebase=false;}
   motion.update(now,{point:points.find(b=>b.id===motion.following?.id),time,identity});
   if(selectedBall!==null&&!motion.following)selectedBall=null;const announcement=selectedBall===null?'':`Following ball ${selectedBall}. Click elsewhere or press Escape to stop.`;if($('follow-announcement').textContent!==announcement)$('follow-announcement').textContent=announcement;
  },
  update(v,surface){if(v)lastView=v;if(surface)lastSurface=surface;if(lastView){anchor=anchorCache.resolve(lastView,lastSurface,arcade.account(),arcade.selectedCannon(),{x:camera.x,y:camera.y},{identity:lastIdentity});updateHover();position();map.draw(lastView,lastSurface,arcade.selectedCannon(),arcade.account(),lastPoints.find(b=>b.id===selectedBall));}},
  dispose(){disposed=true;motion.cancel({follow:true});map.dispose();observer.disconnect();clearTimeout(saveTimer);clearHelp();clearTimeout(helpHide);doc.documentElement.classList.remove('cannon-context');for(const fn of cleanups)fn();pointers.clear();},open:()=>arcade.openAccount()
 };
}
