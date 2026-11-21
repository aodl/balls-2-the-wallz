/** One local gesture/camera owner. Never touches observation, quotes or clocks. */
import{resolveInteraction,placementIntent,samePlacementContext,aimingVicinity}from'./interaction.mjs';
import{createMinimap}from'./minimap.mjs';
import{CameraController,focusedOn,wheelZoom,previewComposition}from'./camera-controller.mjs';
import{playerAnchor}from'./player-anchor.mjs';
import{accountTerritoryFrame}from'./territory-entry.mjs';
import{aimingArrow,trajectoryGuide}from'./guide-clearance.mjs';
import{quantityPlacement,quantityDockStrip}from'./quantity-placement.mjs';
import{displayedBalls}from'./ball-presentation.mjs';
export function createShell(doc,camera,arcade,onPick){
 const $=id=>doc.getElementById(id),canvas=$('board'),card=$('workspace'),handle=$('aim-handle'),ring=$('aim-ring'),cleanups=[];
 let hover=null,pointer=null,cardSide=null,saveTimer=null,disposed=false,lastView=null,lastSurface=null,lastPoints=[],lastTime=0,lastIdentity='',positionKey='',lastViewport='',layoutDirty=true,layout=null,cardBounds=null,wasShort=false,anchor=null,selectedBall=null,pendingTap=null,lastTap=null,followRebase=false,gestureSequence=0,doubleHandled=false,nativePairWorld=null,compositionKey='',locateGeneration=0,completedTouch=null,narrowPositionKey='',narrowY=null,narrowAimClearance=0,narrowAimTop=0,narrowAimBottom=Infinity,narrowQuarter=camera.quarter;
 let pendingTerritory=null,quantitySlot=null;const quantityPointers=new Map(),quantityWidget=$('launch-editors');let quantitySize={width:130,height:46},quantityDocked=false,quantityContext='',quantityReserved=false,quantityReservation='none',quantityClickCancelled=false;
 let contractedCamera=null;
 const cameraPose=()=>[camera.x,camera.y,camera.scale,camera.angle];
 const anchorCache=playerAnchor(),reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 function save(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{if(!disposed)arcade.camera({projection:'isometric-1',x:camera.x,y:camera.y,scale:camera.scale,quarter:camera.quarter});},400);}
 function zoomButtons(){const a=motion.zoomAvailability();for(const [id,enabled] of [['zoom-in',a.in],['zoom-out',a.out],['fit',a.overview]]){const b=$(id);if(b.disabled===enabled)b.disabled=!enabled;}}
 const motion=new CameraController(camera,{reducedMotion,onChange:zoomButtons,onSettled:save});
 const listen=(node,event,fn,options)=>{if(!node)return;node.addEventListener(event,fn,options);cleanups.push(()=>node.removeEventListener(event,fn,options));};
 const quantityObserver=new ResizeObserver(entries=>{const r=entries[0]?.borderBoxSize?.[0];if(r?.inlineSize>0&&r.blockSize>0){const changed=quantitySize.width!==r.inlineSize||quantitySize.height!==r.blockSize;quantitySize={width:r.inlineSize,height:r.blockSize};if(changed)invalidateLayout();}else{const b=quantityWidget.getBoundingClientRect();if(b.width)quantitySize={width:b.width,height:b.height};}});quantityObserver.observe(quantityWidget);
 const quantityViewport=()=>[innerWidth,innerHeight,globalThis.visualViewport?.width,globalThis.visualViewport?.height,globalThis.visualViewport?.offsetLeft,globalThis.visualViewport?.offsetTop,devicePixelRatio].join('/');
 listen(quantityWidget,'pointerdown',e=>{quantityPointers.set(e.pointerId,{target:e.target,viewport:quantityViewport()});quantityClickCancelled=false;e.stopPropagation();});
 for(const event of ['pointerup','pointercancel'])listen(doc,event,e=>{const press=quantityPointers.get(e.pointerId);if(press&&(event==='pointercancel'||press.viewport!==quantityViewport()))quantityClickCancelled=true;quantityPointers.delete(e.pointerId);},true);
 listen(quantityWidget,'keydown',e=>{if(!e.repeat&&['Enter',' '].includes(e.key))quantityClickCancelled=false;});
 for(const event of ['dblclick','click']){listen(quantityWidget,event,e=>{if(quantityClickCancelled){quantityClickCancelled=false;e.preventDefault();e.stopImmediatePropagation();}},true);listen(quantityWidget,event,e=>e.stopPropagation());}
 const compass=[...doc.querySelectorAll('[data-board-quarter]')];
 function syncCompass(){const target=motion.rotation?.target??camera.angle,quarter=(Math.round(-target/(Math.PI/2))+4)%4;for(const b of compass){const pressed=String(Number(b.dataset.boardQuarter)===quarter);if(b.getAttribute('aria-pressed')!==pressed)b.setAttribute('aria-pressed',pressed);b.disabled=pressed==='true';const slot=String((Number(b.dataset.boardQuarter)-quarter+4)%4);if(b.dataset.compassSlot!==slot)b.dataset.compassSlot=slot;}}
 for(const button of compass)listen(button,'click',()=>{cancelTap();motion.rotate(Number(button.dataset.boardQuarter));syncCompass();});
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
 const point=e=>{const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top,pointerType:e.pointerType??'mouse'};};
 const pair=()=>{const[a,b]=[...pointers.values()];return{x:(a.x+b.x)/2,y:(a.y+b.y)/2,d:Math.hypot(a.x-b.x,a.y-b.y)};};
 function stopFollowing(){followRebase=false;selectedBall=null;motion.stopFollow();}
 function cancelTap(){gestureSequence++;pendingTap=lastTap=null;}
 function aimAt(p){if(!aimOrigin)return;const w=camera.world(p.x,p.y);arcade.aimAt(w.x-aimOrigin.x,w.y-aimOrigin.y);}
 let pendingAim=null;
 function flushAim(){const point=pendingAim;pendingAim=null;if(point&&owner==='aim')aimAt(point);}

 function measure(){if(!layoutDirty&&layout)return layout;layoutDirty=false;const editor=quantityWidget.getBoundingClientRect();if(editor.width>0&&editor.height>0)quantitySize={width:editor.width,height:editor.height};const header=card.querySelector('.panel-header'),body=card.querySelector('.panel-content');const safe=getComputedStyle(doc.documentElement);layout={safe:Object.fromEntries(['left','right','top','bottom'].map(k=>[k,parseFloat(safe.getPropertyValue('--quantity-safe-'+k))||0])),guideObstacles:[$('status-button'),$('identify-button'),doc.querySelector('.brand')].map(n=>n.getBoundingClientRect().toJSON()),top:Math.ceil(doc.querySelector('.arena-chrome').getBoundingClientRect().bottom)+10,headerBottom:Math.ceil(doc.querySelector('.arena-header').getBoundingClientRect().bottom),mini:$('minimap').getBoundingClientRect(),compass:compass.map(b=>b.getBoundingClientRect()),cycles:$('cycles-display').getBoundingClientRect(),buttons:doc.querySelector('.camera-controls').getBoundingClientRect(),sound:doc.querySelector('.audio-controls').getBoundingClientRect(),headerHeight:header.offsetHeight,desired:header.offsetHeight+body.scrollHeight+20};return layout;}
 let layoutFrame=null,layoutRevision=0,committedLayoutRevision=0;
 function invalidateLayout(){
  if(disposed)return;layoutDirty=true;layoutRevision++;
  if(layoutFrame===null)layoutFrame=requestAnimationFrame(()=>{layoutFrame=null;if(!disposed)position();});
 }
 const observer=new ResizeObserver(invalidateLayout);for(const n of [doc.querySelector('.audio-controls'),doc.querySelector('.arena-chrome'),card.querySelector('.panel-header'),card.querySelector('.panel-content'),$('minimap'),$('cycles-display'),$('status-button')])observer.observe(n);
 // Content can hide and return to its previous size within one task. In that
 // case ResizeObserver reports no change, although a synchronous overlay read
 // may have cached the intermediate height. Invalidate from actual content
 // mutations too; readiness-only disabled/ARIA writes are not layout changes.
 const contentObserver=new MutationObserver(records=>{
  if(records.some(r=>{
   const node=r.target.nodeType===1?r.target:r.target.parentElement;
   if(node?.closest('.panel-view')?.hidden)return false;
   return r.type!=='attributes'||r.oldValue!==r.target.getAttribute(r.attributeName);
  }))invalidateLayout();
 });
 contentObserver.observe(card.querySelector('.panel-content'),{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','open'],attributeOldValue:true});
 const measureChrome=()=>{const chrome=doc.querySelector('.arena-chrome'),root=doc.documentElement,safe=getComputedStyle(root),insets=['left','right'].map(k=>parseFloat(safe.getPropertyValue('--quantity-safe-'+k))||0);root.style.setProperty('--launch-editor-space',Math.max(0,Math.min(globalThis.innerWidth,globalThis.visualViewport?.width??Infinity)-insets[0]-insets[1])+'px');root.style.setProperty('--chrome-bottom',Math.ceil(chrome.getBoundingClientRect().bottom+12)+'px');layoutDirty=true;};measureChrome();function resized(){if(quantityPointers.size){quantityClickCancelled=true;for(const[id,{target}]of quantityPointers)if(target.hasPointerCapture?.(id))target.releasePointerCapture(id);}clearInput();quantitySlot=null;quantityContext='';measureChrome();invalidateLayout();}
 listen(globalThis,'resize',resized);if(globalThis.visualViewport){listen(visualViewport,'resize',resized);listen(visualViewport,'scroll',resized);}
 listen(doc,'b2z-entry-cancel',()=>{pendingTerritory=null;if(motion.animation?.owner==='entry')motion.cancel();});
 listen(doc,'b2z-return-territory',e=>{if(e.detail?.current?.()){stopFollowing();cancelTap();pendingTerritory={...e.detail,until:performance.now()+10000};}});
 listen($('minimap'),'pointerdown',()=>arcade.cancelEntryNavigation?.(),true);listen($('minimap'),'keydown',()=>arcade.cancelEntryNavigation?.(),true);
 function locate(){arcade.cancelEntryNavigation?.();locateGeneration++;const c=arcade.anchor?.()??onPick.selected();if(!c||pointers.size)return;stopFollowing();cancelTap();motion.focus(c.cell,focusOptions(measure()));}
 listen(doc,'b2z-locate',locate);listen(doc,'b2z-precision',()=>{});
 $('locate-context').onclick=$('focus-cannon').onclick=locate;
 $('status-button').onclick=()=>arcade.openStatus();$('help-button').onclick=()=>arcade.openHelp();$('centre-cannon').onclick=()=>arcade.openRoster();
 $('fit').onclick=()=>{arcade.cancelEntryNavigation?.();stopFollowing();cancelTap();if(lastView)anchor=anchorCache.resolve(lastView,lastSurface,arcade.account(),arcade.selectedCannon(),{x:camera.x,y:camera.y},{recenter:true,identity:lastIdentity});motion.overview(anchor??{x:camera.x,y:camera.y});zoomButtons();};
 $('zoom-in').onclick=()=>{arcade.cancelEntryNavigation?.();motion.zoom(1.4);zoomButtons();};$('zoom-out').onclick=()=>{arcade.cancelEntryNavigation?.();motion.zoom(1/1.4);zoomButtons();};
 listen(doc,'keydown',e=>{if(e.key==='Escape'){cancelTap();stopFollowing();arcade.cancel();e.preventDefault();}});
 function preferSite(cell){
  if(!arcade.structureContexts?.())return false;
  return arcade.tileSelectable?.(cell)||[...(lastView?.deflectors?.values()??[]),...(lastView?.cannons?.values()??[])].some(d=>d.cell===cell);
 }
 function down(e){if(e.button!==0)return;arcade.cancelEntryNavigation?.();keyboardTarget=null;const p=point(e);nativePairWorld=lastTap&&Math.hypot(p.x-lastTap.p.x,p.y-lastTap.p.y)<=7?lastTap.world:null;pointers.set(e.pointerId,p);canvas.setPointerCapture(e.pointerId);motion.cancel();
  if(pointers.size===1){origin=last=p;moved=false;pinched=false;owner=e.currentTarget===handle||aimingVicinity(camera,arcade.aim(),p,e.pointerType,arcade.moveSelection(),guideRects(),preferSite)?'aim':'pan';canvas.dataset.cursor=owner==='aim'?'aim':'camera';aimOrigin=arcade.aim()?camera.cellPoint(arcade.aim().cannon.cell):null;
   const hit=resolve(p);if(hit.kind!=='ball'||hit.id!==selectedBall)motion.stopFollow();
   if(owner==='aim'){cancelTap();if(e.currentTarget!==handle&&Math.hypot(p.x-aimOrigin.sx,p.y-aimOrigin.sy)>6)aimAt(p);}
  }
  else{pendingAim=null;pinch=pair();owner='camera';pinched=true;moved=true;cancelTap();motion.manual();}
  if(e.currentTarget!==handle)canvas.focus({preventScroll:true});e.preventDefault();
 }
 listen(canvas,'pointerdown',down);listen(handle,'pointerdown',down);
 listen(canvas,'pointermove',e=>{if(!pointers.has(e.pointerId))return;const p=point(e);pointers.set(e.pointerId,p);
  if(pointers.size>=2){const next=pair();if(pinch){camera.zoom(next.d/Math.max(1,pinch.d),pinch.x,pinch.y);camera.pan(next.x-pinch.x,next.y-pinch.y);}pinch=next;save();zoomButtons();return;}
  if(!last||pinched)return;if(owner==='aim'){pendingAim=p;moved=true;}else{if(Math.hypot(p.x-origin.x,p.y-origin.y)>6){moved=true;cancelTap();motion.manual();}if(moved){camera.pan(p.x-last.x,p.y-last.y);save();}}last=p;
 });
 function resolve(p){
  if(aimingVicinity(camera,arcade.aim(),p,p.pointerType??'mouse',arcade.moveSelection(),guideRects(),preferSite))return {kind:'aim'};
  const hit=resolveInteraction(camera,onPick.cannons?.()??lastView?.cannons??new Map(),p,arcade.moveSelection(),arcade.aim(),lastPoints,arcade.structureContexts?.()?lastView?.deflectors:null);
  if(hit.kind==='cannon'&&arcade.hasCannon&&!arcade.hasCannon(hit.id))return {kind:'camera',cell:hit.cell};
  if(hit.kind==='camera'&&arcade.tileSelectable?.(hit.cell))return {kind:'tile',cell:hit.cell};
  return hit;
 }
 function activate(hit,p){
  if(hit.kind==='place'||hit.kind==='invalid'){if(hit.cell!==null)arcade.chooseCell(hit.cell);return;}
  if(hit.kind==='cannon'||hit.kind==='deflector'||hit.kind==='tile'){
   stopFollowing();motion.cancel();
   const picked=hit.kind==='cannon'?arcade.selectCannon(hit.id):hit.kind==='deflector'?arcade.selectDeflector(hit.id):arcade.selectTile(hit.cell);
   if(picked)layoutDirty=true;return;
  }
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
  if(keyboardTarget&&keyboardTarget.context===arcade.intentContext()&&!pointers.size){const selection=arcade.moveSelection(),cell=keyboardTarget.cell;hover={kind:selection?(selection.legal?selection.legal(cell):selection.cells.includes(cell))?'place':'invalid':arcade.tileSelectable?.(cell)?'tile':'invalid',cell};return;}
  if(disposed||doc.hidden||pointers.size||!pointer){hover=null;canvas.dataset.cursor=owner==='aim'?'aim':pointers.size&&moved?'grabbing':'camera';return;}
  const node=doc.elementFromPoint?.(pointer.x,pointer.y);hover=node&&node!==canvas?null:resolve(pointer);canvas.dataset.cursor=hover?.kind??'camera';
 }
 listen(canvas,'pointermove',e=>{if(e.pointerType!=='touch')pointer=point(e);});
 listen(canvas,'pointerleave',()=>{pointer=null;hover=null;canvas.dataset.cursor='camera';});
 function clearInput(){pendingAim=null;if(quantityPointers.size)quantityClickCancelled=true;quantityPointers.clear();hideHelp();clearHelp();pointer=null;hover=null;cancelTap();motion.cancel();for(const id of pointers.keys())if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);pointers.clear();owner=null;origin=last=pinch=aimOrigin=null;moved=true;pinched=true;canvas.dataset.cursor='camera';}
 listen(doc,'visibilitychange',()=>{if(doc.hidden)clearInput();});listen(doc,'freeze',clearInput);listen(canvas,'webglcontextlost',()=>{clearInput();stopFollowing();});
 listen(canvas,'pointerup',e=>{const isTap=pointers.has(e.pointerId)&&owner==='pan'&&!moved&&!pinched,p=point(e);if(pointers.has(e.pointerId))flushAim();pointers.delete(e.pointerId);if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(isTap){if(e.pointerType==='touch')completedTouch={at:performance.now(),x:e.clientX,y:e.clientY};tap(p,e.pointerType,e.timeStamp);}if(!pointers.size){origin=last=pinch=aimOrigin=null;owner=null;pinched=false;}});
 const cancel=e=>{if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);pendingAim=null;owner=null;moved=true;pinched=true;pinch=null;cancelTap();};listen(canvas,'pointercancel',cancel);listen(canvas,'lostpointercapture',cancel);
 listen(canvas,'wheel',e=>{e.preventDefault();const p=point(e),{discrete,factor}=wheelZoom(e,camera.viewport.height);
  if(discrete){arcade.cancelEntryNavigation?.();motion.zoom(factor,p.x,p.y,{keepFollow:false,duration:130});}
  else{arcade.cancelEntryNavigation?.();motion.manual();camera.zoom(factor,p.x,p.y);save();zoomButtons();}
 },{passive:false});
 listen(handle,'keydown',e=>{const n={ArrowLeft:-1,ArrowRight:1,ArrowUp:-1,ArrowDown:1}[e.key];if(n){arcade.adjustAngle(n*(e.altKey?.01:e.shiftKey?5:1));e.preventDefault();e.stopPropagation();}});
 listen(canvas,'keydown',e=>{const d={ArrowLeft:[40,0],ArrowRight:[-40,0],ArrowUp:[0,40],ArrowDown:[0,-40]}[e.key];
  if(d&&e.altKey&&(arcade.moveSelection()||arcade.structureContexts?.())){
   cancelTap();stopFollowing();const selection=arcade.moveSelection(),context=arcade.intentContext(),n=keyboardTarget?.context===context?keyboardTarget.cell:selection?.cell??arcade.anchor()?.cell??camera.cell(camera.viewport.width/2,camera.viewport.height/2)??0,step=camera.tileStep(...{ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key]),x=(n%camera.width+step[0]+camera.width)%camera.width,y=(Math.floor(n/camera.width)+step[1]+camera.height)%camera.height;
   keyboardTarget={cell:y*camera.width+x,context};pointer=null;const p=camera.cellPoint(keyboardTarget.cell);if(!p.visible)motion.go(motion.target(c=>c.centre(x+.5,y+.5)),{owner:'keyboard'});e.preventDefault();
  }
  else if(d){arcade.cancelEntryNavigation?.();keyboardTarget=null;cancelTap();stopFollowing();motion.go(motion.target(c=>c.pan(...d)),{owner:'keyboard'});e.preventDefault();}
  else if(['+','=','-','Home'].includes(e.key)){if(e.key!=='Home')arcade.cancelEntryNavigation?.();if(e.key==='Home')$('fit').click();else motion.zoom(e.key==='-'?1/1.25:1.25);e.preventDefault();}
  else if(e.key==='Enter'){if(keyboardTarget?.context===arcade.intentContext()){if(arcade.moveSelection())arcade.chooseCell(keyboardTarget.cell);else arcade.selectTile?.(keyboardTarget.cell);}else activate(resolve({x:camera.viewport.width/2,y:camera.viewport.height/2}),{x:camera.viewport.width/2,y:camera.viewport.height/2});e.preventDefault();}
  else if(e.key.toLowerCase()==='b'&&lastPoints.length){const ids=lastPoints.map(b=>b.id).sort((a,b)=>a-b),id=ids[(ids.indexOf(selectedBall)+1)%ids.length];activate({kind:'ball',id},{x:0,y:0});e.preventDefault();}
  else if(['[',']'].includes(e.key)){arcade.adjustAngle((e.key==='['?-1:1)*(e.altKey?.01:e.shiftKey?5:1));e.preventDefault();}
 });
 function visibleBounds(){const v=globalThis.visualViewport,m=measure(),left=(v?.offsetLeft??0)+m.safe.left,top=(v?.offsetTop??0)+m.safe.top;return{left,top,width:Math.max(0,Math.min(camera.viewport.width,v?.width??Infinity)-m.safe.left-m.safe.right),height:Math.max(0,Math.min(camera.viewport.height,v?.height??Infinity)-m.safe.top-m.safe.bottom)};}
 function quantityStrip(m,viewport){
  return quantityReservation==='strip'?quantityDockStrip({viewport,top:Math.max(m.headerBottom+10,viewport.top+8),...quantitySize,obstacles:[...m.guideObstacles,m.sound,m.cycles]}):null;
 }
 function quantityRail(m,viewport){
  const left=Math.max(viewport.left+8,Math.min(m.buttons.left,viewport.left+viewport.width-quantitySize.width-8));
  // An empty corner of the compass cluster leaves space for the editor.
  const obstacles=[m.mini,...m.compass,m.cycles].filter(r=>left<r.right&&left+quantitySize.width>r.left);
  const top=Math.min(m.buttons.top,viewport.top+viewport.height,...obstacles.map(r=>r.top))-quantitySize.height-4;
  return{left,top,right:left+quantitySize.width,bottom:top+quantitySize.height,...quantitySize};
 }
 function guideRects(){const m=measure(),r=[...m.guideObstacles,m.cycles];return quantitySlot&&!quantityWidget.hidden?[...r,quantitySlot.rect]:r;}
 function minimapArea(rect){
  if(wasShort)return {left:0,right:0,top:0,bottom:0,width:0};
  const bounds=[rect,...measure().compass],left=Math.min(...bounds.map(b=>b.left)),right=Math.max(...bounds.map(b=>b.right));
  return{left,right,top:Math.min(...bounds.map(b=>b.top)),bottom:Math.max(...bounds.map(b=>b.bottom)),width:right-left};
 }
 function lowerChrome(m){return [minimapArea(m.mini),m.cycles,...(quantityReservation==='rail'?[quantityRail(m,visibleBounds())]:[]),m.buttons];}
 function focusOptions(m,obstacles=lowerChrome(m)){
  const expanded=arcade.context()==='action';
  return {top:m.top,safeTop:m.headerBottom+8,expanded,obstacles:expanded&&cardBounds?[...obstacles,cardBounds]:obstacles};
 }
 function positionQuantity(){
  const q=arcade.quantity?.(),editor=arcade.launchEditor?.(),qa=arcade.aim();$('quantity-controls').hidden=!q?.active;if(editor?.first||editor?.kind==='action'){quantityWidget.hidden=!editor.active;quantitySlot=null;quantityContext='';quantityWidget.dataset.first='true';const slot=$('action-inputs');if(quantityWidget.parentElement!==slot)slot.append(quantityWidget);return;}else{delete quantityWidget.dataset.first;if(quantityWidget.parentElement!==$('arena'))$('arena').append(quantityWidget);}quantityWidget.hidden=!editor?.active||!qa||!camera.cellPoint(qa.cannon.cell).visible;
  if(quantityWidget.hidden){quantitySlot=null;quantityContext='';return;}
  if(!qa){const m=measure(),v=visibleBounds(),rail=quantityRail(m,v);quantityWidget.style.left=Math.round(rail.left)+'px';quantityWidget.style.top=Math.round(rail.top)+'px';return;}
  const origin=camera.cellPoint(qa.cannon.cell),a=qa.angle*Math.PI/180,end=camera.screen(origin.x+Math.cos(a),origin.y+Math.sin(a)),m=measure(),viewport=visibleBounds(),obstacles=[...m.guideObstacles,minimapArea(m.mini),m.cycles,m.buttons,m.sound];if(!card.hidden&&!card.inert&&cardBounds)obstacles.push(cardBounds);
  const context=[qa.cannon.id,qa.cannon.cell,viewport.left,viewport.top,viewport.width,viewport.height,quantitySize.width,quantitySize.height].join('/');
  if(context!==quantityContext){quantityContext=context;quantityDocked=viewport.height<520||viewport.width<2*(Math.max(24,camera.scale*.62+2)+quantitySize.width+8);}
  const strip=quantityStrip(m,viewport);
  const rail=quantityReservation==='rail'?quantityRail(m,viewport):null;
  const dockLeft=rail?rail.left:strip?strip.left:quantityReservation==='inline'?Math.max(viewport.left+8,cardBounds.left+6):Math.max(viewport.left+8,Math.min(viewport.left+viewport.width-quantitySize.width-8,cardBounds.left+(cardBounds.right-cardBounds.left-quantitySize.width)/2)),dockTop=rail?rail.top:strip?strip.top:cardBounds.top+m.headerHeight-quantitySize.height-4,dock={left:dockLeft,top:dockTop,right:dockLeft+quantitySize.width,bottom:dockTop+quantitySize.height,...quantitySize};
  const next=quantityPlacement({origin:{x:origin.sx,y:origin.sy},direction:{x:end.x-origin.sx,y:end.y-origin.sy},...quantitySize,scale:camera.scale,viewport,top:quantityReservation==='inline'?viewport.top+8:Math.max(m.headerBottom+10,viewport.top+8),obstacles,arrow:aimingArrow(camera,qa,m.guideObstacles)?.screen??[],dock,preferDock:quantityDocked,previous:quantitySlot,locked:quantityPointers.size>0||pointers.size>0||quantityWidget.contains(doc.activeElement)});
  // A supported visible action has reserved measured space; never hide on slot exhaustion.
  if(!next)throw Error('Quantity dock outside usable viewport');
  quantitySlot=next;if(next.mode==='dock')quantityDocked=true;quantityWidget.dataset.placement=next.mode;$('quantity-controls').dataset.placement=next.mode;
  const left=`${Math.round(next.rect.left)}px`,top=`${Math.round(next.rect.top)}px`;if(quantityWidget.style.left!==left)quantityWidget.style.left=left;if(quantityWidget.style.top!==top)quantityWidget.style.top=top;
 }
 function position(){
  if([...quantityPointers.values()].some(p=>p.viewport!==quantityViewport())){quantityClickCancelled=true;clearInput();quantitySlot=null;quantityContext='';}
  const reserve=Boolean(arcade.launchEditor?.().active&&arcade.aim()),reservation=reserve?(Math.min(camera.viewport.height,globalThis.visualViewport?.height??Infinity)<280?'inline':Math.min(camera.viewport.height,globalThis.visualViewport?.height??Infinity)<520?'strip':'rail'):'none';if(reservation!==quantityReservation){quantityReserved=reserve;quantityReservation=reservation;card.dataset.quantityReserved=reservation;doc.documentElement.classList.toggle('quantity-constrained',reservation==='inline');doc.documentElement.classList.toggle('quantity-rail',reservation==='rail');audioMask=null;layoutDirty=true;}
  const editing=Boolean(doc.activeElement?.closest?.('#action-inputs')),height=Math.min(camera.viewport.height,globalThis.visualViewport?.height??Infinity),short=(editing||arcade.context()==='action')&&height<520;
  const changedShort=short!==wasShort,viewport=[camera.viewport.width,height].join('/');
  if(contractedCamera&&(contractedCamera.context!==arcade.intentContext()||cameraPose().some((n,i)=>n!==contractedCamera.applied[i])))contractedCamera=null;
  if(changedShort&&short&&lastViewport&&arcade.anchor?.()&&!pointers.size){
   const pose=cameraPose();contractedCamera={context:arcade.intentContext(),pose,applied:pose};
  }
  doc.documentElement.classList.toggle('short-edit',short);if(changedShort){wasShort=short;layoutDirty=true;}
  if(viewport!==lastViewport){
   lastViewport=viewport;layoutDirty=true;
   const c=arcade.anchor?.();
   if(!short&&contractedCamera&&!pointers.size){
    // Leaving the keyboard layout removes its temporary pan. The player may
    // have changed the view while contracted, in which case it was released above.
    const [x,y,scale]=contractedCamera.pose;
    motion.cancel();camera.scale=scale;camera.centre(x,y);
   }else if((editing||arcade.context()==='action')&&c&&!pointers.size){
    const p=camera.cellPoint(c.cell);
    if(short||!p.visible){motion.cancel();camera.pan(short?camera.viewport.width-42-p.sx:0,measure().top+(short?24:80)-p.sy);}
   }
  }
  if(!short)contractedCamera=null;
  else if(contractedCamera)contractedCamera.applied=cameraPose();
  const aim=arcade.aim(),p=aim?camera.cellPoint(aim.cannon.cell):null;const aimLabel=aim?.kind==='deflect'?`Diverter direction ${aim.direction??aim.orientation}. Use arrow keys to cycle four directions.`:'Aim cannon',hideAim=short||!p?.visible;if(handle.getAttribute('aria-label')!==aimLabel)handle.setAttribute('aria-label',aimLabel);if(handle.hidden!==hideAim)handle.hidden=ring.hidden=hideAim;
  if(p?.visible){const a=aim.angle*Math.PI/180,end=camera.screen(p.x+Math.cos(a),p.y+Math.sin(a)),dx=end.x-p.sx,dy=end.y-p.sy,d=Math.hypot(dx,dy);for(const [node,k,value]of [[handle,'left',p.sx+dx/d*38-22],[handle,'top',p.sy+dy/d*38-22],[ring,'left',p.sx-38],[ring,'top',p.sy-38]]){const px=`${value}px`;if(node.style[k]!==px)node.style[k]=px;}}
  const context=arcade.context?.(),c=['inspect','action'].includes(context)?arcade.anchor?.():null,at=c?camera.cellPoint(c.cell):null,off=Boolean(at&&!at.visible);$('locate-context').hidden=card.hidden||!off;card.classList.toggle('offscreen',off);card.inert=off;$('focus-cannon').hidden=!c;
  doc.documentElement.classList.toggle('cannon-context',Boolean(c&&!card.hidden&&!off));
  const m=measure(),expanded=context==='action',lowerObstacles=lowerChrome(m);
  $('focus-cannon').disabled=Boolean(c&&focusedOn(camera,c.cell,focusOptions(m,lowerObstacles)));$('focus-cannon').title=$('focus-cannon').disabled?'Already focused':$('focus-cannon').getAttribute('aria-label');
  if(card.hidden||off){positionQuantity();if(card.hidden)narrowPositionKey='';committedLayoutRevision=layoutRevision;return;}
  const bounds=visibleBounds(),W=bounds.width,H=bounds.height,narrow=W<=700,cw=Math.min(360,W-16);
  if(!motion.rotation)narrowQuarter=camera.quarter;
  let top=quantityReservation==='inline'?bounds.top+8:Math.max(m.top,bounds.top+8);
  if(narrow&&narrowQuarter&&!short&&at&&arcade.structureContexts?.()){
   // The hidden roster still contributes to the chrome's bounding box. The
   // four-button toolbar fits beside audio, and the body starts below it.
   top=Math.max(bounds.top+8,m.headerBottom+8,m.sound.bottom-m.headerHeight+8);
  }
  if(short&&!quantityReserved)top=Math.max(top,m.cycles.bottom+6);
  let x=bounds.left+W-cw-8,y=top,bottom=bounds.top+H-(short?8:72);
  if(short&&m.cycles.top>bounds.top+H/2)bottom=Math.min(bottom,m.cycles.top-4);
  if(at){
   if(narrow){x=bounds.left+8;y=short?Math.max(top,Math.min(154,H-158)):Math.min(top+96,Math.max(top,H-360));
    // Keep the layout fixed during the quarter turn, then clear the new aim
    // orbit using the card. The selected tile and camera centre stay put.
    // Focus uses the current card as an obstacle. Keep its clearance stable
    // across that explicit camera movement, just as during ordinary panning.
    const key=[c.id,c.cell,bounds.left,bounds.top,W,H,short,narrowQuarter].join('/');
    if(key!==narrowPositionKey){narrowPositionKey=key;narrowY=y;narrowAimClearance=0;narrowAimTop=0;narrowAimBottom=Infinity;
     if(!short&&narrowQuarter&&at.sx+64>x&&at.sx-64<x+cw){
      const upper=at.sy-64,lower=at.sy+64;
      const hudBottom=Math.min(bottom,...[minimapArea(m.mini),m.buttons].filter(r=>r.width&&x+cw>r.left&&x<r.right).map(r=>r.top-8));
      if(upper-top>=hudBottom-lower&&upper-top>=m.headerHeight+96)narrowAimBottom=upper;
      else if(hudBottom-lower>=m.headerHeight+96)narrowAimTop=lower;
     }
     const above=camera.scale*.60+2,below=camera.scale*.17+2,half=camera.scale*.62+2;
     if(!short&&at.sy>=top&&at.sy<y+m.headerHeight&&at.sx+half>x&&at.sx-half<x+cw)narrowAimClearance=at.sy+below+8;
     if(!short&&motion.animation?.owner!=='focus'&&at.sx+half>x&&at.sx-half<x+cw&&at.sy+below+4>y&&at.sy-above-4<y+m.headerHeight){const bottom=Math.min(H-72,...lowerObstacles.filter(r=>r.width).map(r=>r.top-8));narrowY=Math.max(top,Math.min(at.sy+below+8,bottom-m.headerHeight-96));}
    }y=narrowY;
   }
   else{const clearance=Math.ceil(camera.scale/Math.SQRT2+68),right=at.sx+clearance,left=at.sx-clearance-cw;const side=cardSide==='right'&&right+cw<=W-8?'right':cardSide==='left'&&left>=8?'left':right+cw<=W-8?'right':left>=8?'left':null;cardSide=side;x=side==='right'?right:side==='left'?left:Math.max(8,Math.min(W-cw-8,at.sx-cw/2));y=Math.max(top,Math.min(H-310,at.sy-26));}
  }
  const strip=quantityStrip(m,bounds);
  if(quantityReservation==='inline')y=top;
  else if(quantityReserved&&short){y=Math.max(strip?strip.bottom+8:top,Math.min(y,bottom-m.headerHeight-96));}
  for(const obstacle of(short?[]:lowerObstacles))if(obstacle.width&&x+cw>obstacle.left&&x<obstacle.right)bottom=Math.min(bottom,obstacle.top-8);
  if(narrow&&at&&!short){
   // The collapsed toolbar and its expanded actions share an anchor. The
   // quantity rail can shorten the scrollport without moving that anchor.
   const panelBottom=Math.min(bounds.top+H-72,...[minimapArea(m.mini),m.buttons].filter(r=>r.width&&x+cw>r.left&&x<r.right).map(r=>r.top-8));
   bottom=Math.min(bottom,narrowAimBottom);
   const clear=Math.min(Math.max(narrowAimClearance,narrowAimTop),bottom-m.headerHeight-96);
   y=Math.max(top,clear,Math.min(y,Math.min(panelBottom,narrowAimBottom)-m.headerHeight-240));
  }else if(quantityReserved&&!short){
   const useful=Math.min(240,Math.max(0,m.desired-m.headerHeight));
   y=Math.max(top,Math.min(y,bottom-m.headerHeight-useful));
  }
  // One natural scroll, with useful space even under a contracted keyboard.
  const minimum=quantityReserved?Math.min(96,Math.max(0,bottom-top-m.headerHeight)):96,room=Math.floor(Math.max(minimum,bottom-y-m.headerHeight)),bodyHeight=context==='inspect'?0:Math.min(room,Math.max(0,m.desired-m.headerHeight)),next=[Math.round(x),Math.round(y),Math.round(cw),Math.round(room),Math.ceil(bodyHeight)].join('/');
  if(next!==positionKey){audioMask=null;positionKey=next;card.style.left=`${Math.round(x)}px`;card.style.top=`${Math.round(y)}px`;card.style.width=`${cw}px`;card.style.maxHeight='none';card.style.setProperty('--body-space',`${Math.floor(room)}px`);card.style.setProperty('--body-height',`${Math.ceil(bodyHeight)}px`);}
  cardBounds={left:x,right:x+cw,top:y,bottom:y+m.headerHeight+bodyHeight};
  const site=aim?.cannon.cell??arcade.moveSelection()?.cell??c?.cell,compose=[context,arcade.mode(),c?.id,c?.cell,site,W,H,short,locateGeneration].join('/');
  if(compose!==compositionKey){compositionKey=compose;if(narrow&&c&&expanded&&!pointers.size&&!arcade.structureContexts?.()){
   const intended=motion.animation?.owner==='focus'?Object.assign(Object.create(Object.getPrototypeOf(camera)),camera,motion.animation.to):camera;
   // The dock can sit where a keyboard-contracted shot used to frame the cannon.
   const clearTop=Math.max(m.headerBottom+8,strip?strip.bottom+4:0);
   const target=previewComposition(intended,c.cell,site,{left:8,right:W-8,top:clearTop,bottom:y-6},{interactive:!short&&Boolean(aim)});
   if(target){if(short){motion.cancel();Object.assign(camera,target);if(contractedCamera)contractedCamera.applied=cameraPose();}else motion.go(target,{owner:'composition'});}
  }}
  positionQuantity();committedLayoutRevision=layoutRevision;
 }
 listen(doc,'b2z-overlay',()=>{hideHelp();clearHelp();layoutDirty=true;position();});
 let trajectoryKey='';
 function drawTrajectory(){
  const ball=lastPoints.find(b=>b.id===selectedBall),layer=$('trajectory-guide');
  if(!ball||!lastView){layer.toggleAttribute('hidden',true);return;}
  const m=measure(),rects=[...m.guideObstacles,minimapArea(m.mini),m.cycles,m.buttons,m.sound,!card.hidden&&cardBounds,quantitySlot?.rect].filter(Boolean);
  const guide=trajectoryGuide(camera,ball,lastView.balls.get(ball.id),rects);
  layer.toggleAttribute('hidden',!guide);if(!guide)return;
  const {start,end,wings}=guide,key=[start.x,start.y,end.x,end.y].join('/');
  if(trajectoryKey===key)return;trajectoryKey=key;
  for(const n of [$('trajectory-dots'),$('trajectory-fade')])for(const [k,v] of Object.entries({x1:start.x,y1:start.y,x2:end.x,y2:end.y}))n.setAttribute(k,v);
  $('trajectory-tip').setAttribute('d',`M${wings[0].x} ${wings[0].y}L${end.x} ${end.y}L${wings[1].x} ${wings[1].y}`);
 }
 const audioNodes=[doc.querySelector('.arena-chrome'),card,$('minimap'),$('cycles-display'),doc.querySelector('.camera-controls'),doc.querySelector('.audio-controls'),quantityWidget,$('motion-wait'),$('render-error'),$('locate-context')].filter(Boolean);
 let audioMask=null,audioMaskKey='';const dirtyAudio=()=>{audioMask=null;};const audioObserver=new ResizeObserver(dirtyAudio);for(const node of audioNodes)audioObserver.observe(node);
 const audioMutation=new MutationObserver(dirtyAudio);for(const node of audioNodes)audioMutation.observe(node,{attributes:true,attributeFilter:['hidden','style','class']});listen(doc,'b2z-audio-layout',dirtyAudio);listen(globalThis,'resize',dirtyAudio);listen(doc,'scroll',dirtyAudio,true);
 return{
  audioOccluders(canvasRect=canvas.getBoundingClientRect()){const key=[canvasRect.left,canvasRect.top,canvasRect.width,canvasRect.height].join('/')+'/'+audioNodes.map(n=>n.hidden).join('/')+'/'+cardBounds?.bottom;if(key===audioMaskKey&&audioMask)return audioMask;audioMaskKey=key;audioMask=[];for(const node of audioNodes){if(node.hidden||node.closest('[hidden]')||getComputedStyle(node).visibility==='hidden')continue;let r=node.getBoundingClientRect();if(node===card&&cardBounds)r={...r.toJSON(),left:Math.min(r.left,cardBounds.left),right:Math.max(r.right,cardBounds.right),top:Math.min(r.top,cardBounds.top),bottom:Math.max(r.bottom,cardBounds.bottom)};if(r.width&&r.height)audioMask.push({left:r.left-canvasRect.left,right:r.right-canvasRect.left,top:r.top-canvasRect.top,bottom:r.bottom-canvasRect.top});}return audioMask;},
  speechObstacles(canvasRect){const rows=[...this.audioOccluders(canvasRect)],qa=arcade.aim(),arrow=qa&&aimingArrow(camera,qa,guideRects())?.screen;if(arrow)for(let i=1;i<arrow.length;i++){const a=arrow[i-1],b=arrow[i];rows.push({left:Math.min(a.x,b.x)-12,right:Math.max(a.x,b.x)+12,top:Math.min(a.y,b.y)-12,bottom:Math.max(a.y,b.y)+12});}return rows;},
  layoutState:()=>({quantity:quantitySlot&&{...quantitySlot},quantityDocked,quantityReserved,quantityReservation,quantitySize:{...quantitySize},quantityPointers:quantityPointers.size,quantityClickCancelled,dirty:layoutDirty,pendingFrame:layoutFrame!==null,revision:layoutRevision,committedRevision:committedLayoutRevision,desired:layout?.desired,positionKey,compositionKey,cardBounds:cardBounds&&{...cardBounds}}),
  guideObstacles:guideRects,hover:()=>hover,followedBall:()=>selectedBall,controller:motion,mapAnchor:()=>anchor,rebaseFollow(){if(selectedBall!==null)followRebase=true;},invalidateFollow(){cancelTap();stopFollowing();anchorCache.reset();},overlays(){},
  advance(v,time,now=performance.now(),identity=lastIdentity,points=displayedBalls(v,time)){
   flushAim();
   if(disposed||doc.hidden)return;lastView=v;lastTime=time;lastPoints=points;lastIdentity=identity;
   if(pendingTerritory){const p=pendingTerritory;if(!p.current()||now>p.until)pendingTerritory=null;else if(camera.width===p.world.width&&camera.height===p.world.height){pendingTerritory=null;const m=measure(),bottom=Math.min(camera.viewport.height-24,...[m.mini,m.cycles,m.buttons].filter(r=>r.width).map(r=>r.top-12));motion.territory(accountTerritoryFrame(p.world,p.account,camera.basis),{left:24,right:camera.viewport.width-24,top:m.headerBottom+24,bottom:Math.max(m.headerBottom+100,bottom)});}}
   if(selectedBall!==null&&(arcade.selectedCannon()!==null||!v.balls.has(selectedBall)||motion.following&&motion.following.identity!==identity))stopFollowing();
   if(pendingTap&&!pointers.size&&now>=pendingTap.due){const t=pendingTap;pendingTap=null;if(samePlacementContext(t.intent,{context:arcade.intentContext(),identity,sequence:gestureSequence})&&arcade.moveSelection())arcade.chooseCell(t.intent.cell);}

   if(followRebase&&motion.following){const p=points.find(b=>b.id===selectedBall);if(p)motion.follow(selectedBall,identity,p);followRebase=false;}
   motion.update(now,{point:points.find(b=>b.id===motion.following?.id),time,identity});syncCompass();zoomButtons();
   const announcement=selectedBall===null?'':`${motion.following?'Following':'Selected'} ball ${selectedBall}. Press Escape to clear.`;if($('follow-announcement').textContent!==announcement)$('follow-announcement').textContent=announcement;
  },
  update(v,surface){zoomButtons();if(v)lastView=v;if(surface)lastSurface=surface;if(lastView){anchor=anchorCache.resolve(lastView,lastSurface,arcade.account(),arcade.selectedCannon(),{x:camera.x,y:camera.y},{identity:lastIdentity});updateHover();position();map.draw(lastView,lastSurface,arcade.selectedCannon(),arcade.account(),lastPoints.find(b=>b.id===selectedBall),arcade.moveSelection(),arcade.selectedDeflector?.());drawTrajectory();}},
  dispose(){audioObserver.disconnect();audioMutation.disconnect();quantityObserver.disconnect();quantityPointers.clear();disposed=true;motion.cancel({follow:true});map.dispose();observer.disconnect();contentObserver.disconnect();cancelAnimationFrame(layoutFrame);clearTimeout(saveTimer);clearHelp();clearTimeout(helpHide);doc.documentElement.classList.remove('cannon-context','quantity-constrained','quantity-rail');for(const fn of cleanups)fn();pointers.clear();},open:()=>arcade.openAccount()
 };
}
