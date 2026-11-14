/** UX-04/05/11/12. One presentation owner; no observer, quote or game mutations. */
const delta=(a,b,size,torus)=>torus?((b-a+size/2)%size+size)%size-size/2:b-a;
const pose=c=>({x:c.x,y:c.y,scale:c.scale});
/** UXR-03/21: one working composition for Focus and its disabled predicate. */
export function focusComposition(camera,{top=74,safeTop=top,expanded=false,obstacles=[]}={}){
 const {width:w,height:h}=camera.viewport,narrow=w<=700;
 const sx=narrow?w/2:Math.max(90,(w-380)/2),sy=narrow?Math.min(top+44,h*.27):Math.max(top+80,h*.40);
 // An ordinary cannon is about .8 projected cells across; favour a readable
 // 50–64px silhouette without globally changing model size or hitboxes.
 const scale=Math.min(camera.maxScale,Math.max(camera.fitScale,narrow?64:76,Math.min(88,Math.min(w,h)*.1)));
 return{sx,sy,scale,top,safeTop,expanded,obstacles};
}
export function focusedOn(camera,cell,options={}){
 if(cell===null||cell===undefined)return false;
 const {sx,sy,scale,safeTop,obstacles}=focusComposition(camera,options),p=camera.cellPoint(cell),{width,height}=camera.viewport;
 const tolerance=Math.min(76,width*.12);
 return camera.scale>=scale*.92&&p.visible&&Math.abs(p.sx-sx)<=tolerance&&Math.abs(p.sy-sy)<=64&&p.sy>=safeTop+32&&p.sy<=height-70&&!obstacles.some(r=>r&&p.sx+42>r.left&&p.sx-42<r.right&&p.sy+42>r.top&&p.sy-42<r.bottom);
}
/** One explicit action/target/viewport accommodation, using Camera's projection.
 * Includes the actual source and preview, never changes a draft or world. */
export function previewComposition(camera,sourceCell,previewCell,rect,{interactive=true}={}){
 const c=Object.assign(Object.create(Object.getPrototypeOf(camera)),camera);
 const bounds=()=>{const a=c.cellPoint(sourceCell),b=c.cellPoint(previewCell??sourceCell),body=c.scale*.62+2,top=c.scale*.60+2,bottom=c.scale*.17+2,r=Math.max(60,c.scale*.62);
  return{left:Math.min(a.sx-body,b.sx-(interactive?r:body)),right:Math.max(a.sx+body,b.sx+(interactive?r:body)),top:Math.min(a.sy-top,b.sy-(interactive?r:top)),bottom:Math.max(a.sy+bottom,b.sy+(interactive?r:bottom))};};
 let box=bounds(),w=rect.right-rect.left,h=rect.bottom-rect.top;
 if(w<=0||h<=0)return null;
 if(!interactive&&(box.right-box.left>w||box.bottom-box.top>h)){c.scale*=Math.min(w/(box.right-box.left),h/(box.bottom-box.top))*.98;c.constrain();box=bounds();}
 if(box.right-box.left>w||box.bottom-box.top>h)return null;
 const dx=box.left<rect.left?rect.left-box.left:box.right>rect.right?rect.right-box.right:0,dy=box.top<rect.top?rect.top-box.top:box.bottom>rect.bottom?rect.bottom-box.bottom:0;
 if(!dx&&!dy&&c.scale===camera.scale)return null;
 c.pan(dx,dy);return pose(c);
}
/** UXR-14: preserve coalesced notch magnitude; fine trackpad deltas stay direct. */
export function wheelZoom({deltaY,deltaMode=0,ctrlKey=false},height=800){
 const amount=deltaY*(deltaMode===1?16:deltaMode===2?height:1),n=Math.abs(deltaY);
 return{factor:Math.exp(-Math.max(-500,Math.min(500,amount))*.002),discrete:deltaMode!==0||(!ctrlKey&&Number.isInteger(deltaY)&&n>=40&&(n%40===0||n%100===0))};
}
export class CameraController{
 constructor(camera,{now=()=>performance.now(),reducedMotion=()=>false,onSettled=()=>{},onChange=()=>{}}={}){this.camera=camera;this.now=now;this.reducedMotion=reducedMotion;this.onSettled=onSettled;this.onChange=onChange;this.animation=null;this.following=null;this.lastFrame=null;}
 target(fn){const c=Object.assign(Object.create(Object.getPrototypeOf(this.camera)),this.camera);fn(c);return pose(c);}
 sample(now){
  const a=this.animation;if(!a)return false;const c=this.camera,p=Math.max(0,Math.min(1,(now-a.start)/a.duration)),e=p*p*(3-2*p);
  c.scale=p===1?a.to.scale:a.from.scale===a.to.scale?a.from.scale:Math.exp(Math.log(a.from.scale)+(Math.log(a.to.scale)-Math.log(a.from.scale))*e);c.constrain();
  c.centre(a.from.x+a.dx*e,a.from.y+a.dy*e);
  if(a.anchor){const q=c.world(a.anchor.sx,a.anchor.sy);c.centre(c.x+a.anchor.x-q.x,c.y+a.anchor.y-q.y);}
  if(p===1){this.animation=null;this.onSettled(pose(c));this.onChange();}return true;
 }
 go(target,{owner='command',duration,keepFollow=false,anchor=null}={}){
  const now=this.now();this.sample(now);this.animation=null;if(!keepFollow)this.stopFollow();const c=this.camera,from=pose(c),to=this.target(d=>{Object.assign(d,target);d.constrain();}),dx=delta(from.x,to.x,c.width,c.torus),dy=delta(from.y,to.y,c.height,c.torus);
  if(![from.x,from.y,from.scale,to.x,to.y,to.scale].every(Number.isFinite)||c.width<=0||c.height<=0)return false;
  if(!dx&&!dy&&Math.abs(from.scale-to.scale)<1e-10){this.onChange();return false;}
  duration=this.reducedMotion()?0:duration??Math.min(380,220+Math.hypot(dx,dy)*.12+Math.abs(Math.log(to.scale/from.scale))*35);
  if(duration<=0){Object.assign(c,to);c.constrain();if(anchor){const q=c.world(anchor.sx,anchor.sy);c.centre(c.x+anchor.x-q.x,c.y+anchor.y-q.y);}this.onSettled(pose(c));this.onChange();return true;}
  this.animation={owner,from,to,dx,dy,start:now,duration,anchor};this.onChange();return true;
 }
 cancel({follow=false}={}){this.sample(this.now());this.animation=null;if(follow)this.stopFollow();this.onChange();}
 manual(){this.cancel({follow:true});}
 stopFollow(){this.following=null;if(this.animation?.owner==='follow-entry')this.animation=null;}
 focus(cell,options={}){
  const {sx,sy,scale}=focusComposition(this.camera,options);const target=this.target(c=>{c.frameCell(cell);c.scale=Math.max(c.scale,scale);c.constrain();const p=c.cellPoint(cell);c.pan(sx-p.sx,sy-p.sy);});return this.go(target,{owner:'focus'});
 }
 overview(anchor){return this.go({...anchor,scale:this.camera.fitScale},{owner:'overview'});}
 zoom(factor,sx=this.camera.viewport.width/2,sy=this.camera.viewport.height/2,{keepFollow=true,world=null,duration}={}){
  if(!Number.isFinite(factor)||factor<=0)return false;
  const intended=this.animation?.owner==='zoom'?this.animation.to.scale:this.camera.scale;
  this.sample(this.now());const c=this.camera,scale=Math.max(c.fitScale,Math.min(c.maxScale,intended*factor));
  // A maximum-zoom command is a true no-op, including follow/selection state.
  if(Math.abs(scale-intended)<1e-10)return false;
  const p=world??c.world(sx,sy),target=this.target(d=>d.zoom(scale/d.scale,sx,sy));return this.go({...target,scale},{owner:'zoom',keepFollow,anchor:{...p,sx,sy},duration});
 }

 follow(id,identity,point){
  this.cancel({follow:true});this.following={id,identity,time:null};if(point)this.go({x:point.x,y:point.y,scale:this.camera.scale},{owner:'follow-entry',keepFollow:true,duration:this.reducedMotion()?0:260});
 }
 update(now,{point,time,identity}={}){
  const elapsed=this.lastFrame===null?0:Math.min(.1,Math.max(0,(now-this.lastFrame)/1000));this.lastFrame=now;
  if(this.following&&identity!==undefined&&(this.following.identity!==identity||!point)){this.cancel({follow:true});return;}
  if(this.sample(now))return;
  const f=this.following,c=this.camera;if(!f||!point||time===f.time)return;if(f.time!==null&&time<f.time){this.stopFollow();return;}f.time=time;
  const p=c.point(point.x,point.y),sx=p.sx-c.viewport.width/2,sy=p.sy-c.viewport.height*.46,radius=32;
  if(Math.hypot(sx,sy)<=radius)return;
  const k=this.reducedMotion()?1:1-Math.exp(-elapsed/.12),fraction=1-radius/Math.hypot(sx,sy),q=c.world(c.viewport.width/2+sx*fraction,c.viewport.height/2+sy*fraction);
  c.centre(c.x+(q.x-c.x)*k,c.y+(q.y-c.y)*k);
 }
 zoomAvailability(){const c=this.camera,s=Math.max(c.fitScale,Math.min(c.maxScale,this.animation?.to.scale??c.scale)),e=Math.max(1e-10,c.maxScale*1e-9);return{in:s<c.maxScale-e,out:s>c.fitScale+e,overview:s>c.fitScale+e};}
 get active(){return Boolean(this.animation);}
}
