/** Clip only a guide that actually intersects cached screen-space controls. */
export function guideClearance(origin,end,rectangles=[],padding=8){
 const dx=end.x-origin.x,dy=end.y-origin.y,length=Math.hypot(dx,dy);let fraction=1;
 for(const r of rectangles){
  if(!r||!r.width||!r.height)continue;
  let enter=0,exit=1;
  for(const [p,d,lo,hi]of[[origin.x,dx,r.left-padding,r.right+padding],[origin.y,dy,r.top-padding,r.bottom+padding]]){
   if(Math.abs(d)<1e-9){if(p<lo||p>hi){enter=2;break;}}
   else{const a=(lo-p)/d,b=(hi-p)/d;enter=Math.max(enter,Math.min(a,b));exit=Math.min(exit,Math.max(a,b));}
  }
  if(enter<=exit&&enter<=1&&exit>=0)fraction=Math.min(fraction,Math.max(0,enter-4/Math.max(1,length)));
 }
 return fraction;
}

/** Shared visible guide geometry for rendering and gesture ownership. */
export function aimingArrow(camera,aim,obstacles=[]){
 if(!aim)return null;const p=camera.cellPoint(aim.cannon.cell),a=Number(aim.angle)*Math.PI/180,dx=Math.cos(a),dy=Math.sin(a),full=Math.min(3.5,110/(camera.scale*Math.hypot((dx-dy)/Math.SQRT2,(dx+dy)/Math.sqrt(6)))),fraction=guideClearance(camera.screen(p.x,p.y,.028),camera.screen(p.x+dx*full,p.y+dy*full,.028),obstacles),length=full*fraction;
 if(length<=.42)return null;
 const x=p.x+dx*length,y=p.y+dy*length,tip=Math.min(.20,length*.2),world=[[p.x+dx*.42,p.y+dy*.42],[x,y],[x+Math.cos(a+2.6)*tip,y+Math.sin(a+2.6)*tip],[x,y],[x+Math.cos(a-2.6)*tip,y+Math.sin(a-2.6)*tip]];
 return {height:.028,world,screen:world.map(([x,y])=>camera.screen(x,y,.028))};
}
/** Relocation direction only; shortest toroidal displacement, bounded in pixels. */
export function movementArrow(camera,source,destination){
 if(source===null||source===undefined||destination===null||destination===undefined||source===destination)return null;
 const delta=(a,b,size)=>((b-a+size/2)%size+size)%size-size/2,p=camera.cellPoint(source),dx=delta(source%camera.width,destination%camera.width,camera.width),dy=delta(Math.floor(source/camera.width),Math.floor(destination/camera.width),camera.height),end=camera.screen(p.x+dx,p.y+dy,.028),start=camera.screen(p.x,p.y,.028),pixels=Math.hypot(end.x-start.x,end.y-start.y),fraction=Math.min(1,160/Math.max(1,pixels)),a=Math.atan2(dy,dx),distance=Math.min(Math.hypot(dx,dy)-.44,Math.hypot(dx,dy)*fraction);
 if(!p.visible||distance<=.34)return null;
 const x=p.x+Math.cos(a)*distance,y=p.y+Math.sin(a)*distance,tip=Math.min(.24,distance*.2);return{height:.38,world:[[p.x+Math.cos(a)*.34,p.y+Math.sin(a)*.34],[x,y],[x+Math.cos(a+2.6)*tip,y+Math.sin(a+2.6)*tip],[x,y],[x+Math.cos(a-2.6)*tip,y+Math.sin(a-2.6)*tip]]};
}
