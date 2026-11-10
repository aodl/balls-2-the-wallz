/** UX-04/05/11/12. One presentation owner; no observer, quote or game mutations. */
const delta=(a,b,size,torus)=>torus?((b-a+size/2)%size+size)%size-size/2:b-a;
const pose=c=>({x:c.x,y:c.y,scale:c.scale});
export function focusedOn(camera,cell,{top=0,obstacles=[]}={}){
 if(cell===null||cell===undefined||camera.scale<36)return false;
 const p=camera.cellPoint(cell),{width,height}=camera.viewport,margin=52;
 return p.visible&&p.sx>=margin&&p.sx<=width-margin&&p.sy>=top+margin&&p.sy<=height-100&&!obstacles.some(r=>r&&p.sx+48>r.left&&p.sx-48<r.right&&p.sy+48>r.top&&p.sy-48<r.bottom);
}
export class CameraController{
 constructor(camera,{now=()=>performance.now(),reducedMotion=()=>false,onSettled=()=>{}}={}){this.camera=camera;this.now=now;this.reducedMotion=reducedMotion;this.onSettled=onSettled;this.animation=null;this.following=null;this.lastFrame=null;}
 target(fn){const c=Object.assign(Object.create(Object.getPrototypeOf(this.camera)),this.camera);fn(c);return pose(c);}
 sample(now){
  const a=this.animation;if(!a)return false;const c=this.camera,p=Math.max(0,Math.min(1,(now-a.start)/a.duration)),e=p*p*(3-2*p);
  c.scale=p===1?a.to.scale:a.from.scale===a.to.scale?a.from.scale:Math.exp(Math.log(a.from.scale)+(Math.log(a.to.scale)-Math.log(a.from.scale))*e);c.constrain();
  c.centre(a.from.x+a.dx*e,a.from.y+a.dy*e);
  if(a.anchor){const q=c.world(a.anchor.sx,a.anchor.sy);c.centre(c.x+a.anchor.x-q.x,c.y+a.anchor.y-q.y);}
  if(p===1){this.animation=null;this.onSettled(pose(c));}return true;
 }
 go(target,{owner='command',duration,keepFollow=false,anchor=null}={}){
  const now=this.now();this.sample(now);this.animation=null;if(!keepFollow)this.stopFollow();const c=this.camera,from=pose(c),to=this.target(d=>{Object.assign(d,target);d.constrain();}),dx=delta(from.x,to.x,c.width,c.torus),dy=delta(from.y,to.y,c.height,c.torus);
  if(![from.x,from.y,from.scale,to.x,to.y,to.scale].every(Number.isFinite)||c.width<=0||c.height<=0)return false;
  if(!dx&&!dy&&Math.abs(from.scale-to.scale)<1e-10)return false;
  duration=this.reducedMotion()?0:duration??Math.min(380,220+Math.hypot(dx,dy)*.12+Math.abs(Math.log(to.scale/from.scale))*35);
  if(duration<=0){Object.assign(c,to);c.constrain();if(anchor){const q=c.world(anchor.sx,anchor.sy);c.centre(c.x+anchor.x-q.x,c.y+anchor.y-q.y);}this.onSettled(pose(c));return true;}
  this.animation={owner,from,to,dx,dy,start:now,duration,anchor};return true;
 }
 cancel({follow=false}={}){this.sample(this.now());this.animation=null;if(follow)this.stopFollow();}
 manual(){this.cancel({follow:true});}
 stopFollow(){this.following=null;if(this.animation?.owner==='follow-entry')this.animation=null;}
 focus(cell,{sx=this.camera.viewport.width/2,sy=this.camera.viewport.height*.42}={}){
  const target=this.target(c=>{c.frameCell(cell);c.scale=Math.max(c.scale,48);c.constrain();const p=c.cellPoint(cell);c.pan(sx-p.sx,sy-p.sy);});return this.go(target,{owner:'focus'});
 }
 overview(anchor){return this.go({...anchor,scale:this.camera.fitScale},{owner:'overview'});}
 zoom(factor,sx=this.camera.viewport.width/2,sy=this.camera.viewport.height/2,{keepFollow=true,world=null}={}){
  this.sample(this.now());const c=this.camera,scale=Math.max(c.fitScale,Math.min(c.maxScale,c.scale*factor));if(Math.abs(scale-c.scale)<1e-10)return false;
  const p=world??c.world(sx,sy),target=this.target(d=>d.zoom(scale/d.scale,sx,sy));return this.go({...target,scale},{owner:'zoom',keepFollow,anchor:{...p,sx,sy}});
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
 get active(){return Boolean(this.animation);}
}
