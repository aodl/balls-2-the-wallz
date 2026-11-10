/** Positions only at the supplied verified presentation time; no prediction. */
import{wrap}from'./camera.mjs';
export function displayedBall(view,ball,time){
 if(!ball||!Number.isFinite(time))return null;
 let x=(Number(ball.x0)+ball.vx*time)/1024,y=(Number(ball.y0)+ball.vy*time)/1024;
 if(view.torus){x=wrap(x,view.width);y=wrap(y,view.height);}return{id:ball.id,owner:ball.owner,x,y};
}
export const displayedBalls=(view,time)=>[...view.balls.values()].map(b=>displayedBall(view,b,time));
/** Reuse stationary verified coverage; no full ball allocation on idle render frames. */
export function ballPresentation(){let view=null,time=null,map=null,size=-1,points=[];return{get(v,t){if(view!==v||time!==t||map!==v.balls||size!==v.balls.size){view=v;time=t;map=v.balls;size=v.balls.size;points=displayedBalls(v,t);}return points;},clear(){view=map=null;time=null;size=-1;points=[];}};}
