/** Positions only at the supplied verified presentation time; no prediction. */
import{wrap}from'./camera.mjs';
export function displayedBall(view,ball,time){
 if(!ball||!Number.isFinite(time))return null;
 let x=(Number(ball.x0)/Number(ball.den??1n)+ball.vx*time)/1024,y=(Number(ball.y0)/Number(ball.den??1n)+ball.vy*time)/1024;
 if(view.torus){x=wrap(x,view.width);y=wrap(y,view.height);}return{id:ball.id,owner:ball.owner,x,y};
}
export const displayedBalls=(view,time)=>[...view.balls.values()].map(b=>displayedBall(view,b,time));
/** Reuse stationary verified coverage; no full ball allocation on idle render frames. */
export function ballPresentation(){let view=null,time=null,map=null,size=-1,points=[];return{get(v,t){if(view!==v||time!==t||map!==v.balls||size!==v.balls.size){view=v;time=t;map=v.balls;size=v.balls.size;points=displayedBalls(v,t);}return points;},clear(){view=map=null;time=null;size=-1;points=[];}};}

export const trajectoryColors=Object.freeze(['#fcf5e0','#9ee8ee','#ffc8e7']);

/** Stable slots keep guide and ball colours matched as the selection changes. */
export function selectTrajectory(slots,id,additive){
 if(additive&&slots.has(id)){slots.delete(id);return;}
 if(!additive||slots.size===trajectoryColors.length)slots.clear();
 const used=new Set(slots.values());
 slots.set(id,trajectoryColors.findIndex((_,index)=>!used.has(index)));
}

/** Place a small pointer-transparent chip outside the occupied HUD rectangles. */
export function trajectoryChip(bounds,obstacles,width=100,height=23){
 const pad=5;
 const xs=[bounds.left,bounds.right-width],ys=[bounds.top,bounds.bottom-height];
 for(const r of obstacles){
  xs.push(r.right+pad,r.left-pad-width);
  ys.push(r.bottom+pad,r.top-pad-height);
 }
 const lefts=[...new Set(xs)].sort((a,b)=>a-b);
 const tops=[...new Set(ys)].sort((a,b)=>a-b);
 for(const top of tops)for(const left of lefts){
  if(left<bounds.left||left+width>bounds.right||top<bounds.top||top+height>bounds.bottom)continue;
  const right=left+width,bottom=top+height;
  if(obstacles.every(r=>right+pad<=r.left||left-pad>=r.right||bottom+pad<=r.top||top-pad>=r.bottom))return {left,top,right,bottom,width,height};
 }
 return null;
}
