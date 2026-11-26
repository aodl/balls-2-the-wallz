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
 if(!aim)return null;const p=camera.cellPoint(aim.cannon.cell),a=Number(aim.angle)*Math.PI/180,dx=Math.cos(a),dy=Math.sin(a),direction=camera.basis.project(dx,dy),full=Math.min(3.5,110/(camera.scale*Math.hypot(direction.x,direction.y))),fraction=guideClearance(camera.screen(p.x,p.y,.028),camera.screen(p.x+dx*full,p.y+dy*full,.028),obstacles),length=full*fraction;
 if(length<=.42)return null;
 const x=p.x+dx*length,y=p.y+dy*length,tip=Math.min(.20,length*.2),world=[[p.x+dx*.42,p.y+dy*.42],[x,y],[x+Math.cos(a+2.6)*tip,y+Math.sin(a+2.6)*tip],[x,y],[x+Math.cos(a-2.6)*tip,y+Math.sin(a-2.6)*tip]];
 return {height:.028,world,screen:world.map(([x,y])=>camera.screen(x,y,.028))};
}
/** Relocation direction only; shortest toroidal displacement, bounded in pixels. */
export function movementArrow(camera,source,destination){
 if(source===null||source===undefined||destination===null||destination===undefined||source===destination)return null;
 const delta=(a,b,size)=>camera.torus?((b-a+size/2)%size+size)%size-size/2:b-a;
 const p=camera.cellPoint(source),q=camera.cellPoint(destination);
 const dx=delta(source%camera.width,destination%camera.width,camera.width);
 const dy=delta(Math.floor(source/camera.width),Math.floor(destination/camera.width),camera.height);
 const length=Math.hypot(dx,dy),a=Math.atan2(dy,dx),ux=dx/length,uy=dy/length;
 const projected=camera.basis.project(ux,uy),span=Math.min(length-.44,160/(camera.scale*Math.hypot(projected.x,projected.y)));
 if(span<=.34||!p.visible&&!q.visible)return null;
 // When the source has left the view, retain the incoming direction beside the destination.
 const nearSource=p.visible;
 const height=.38;
 const x=nearSource?p.x+ux*span:q.x-ux*.44,y=nearSource?p.y+uy*span:q.y-uy*.44;
 const from=nearSource?[p.x+ux*.34,p.y+uy*.34]:[q.x-ux*span,q.y-uy*span];
 const start=camera.screen(...from,height),end=camera.screen(x,y,height);
 if(Math.hypot(end.x-start.x,end.y-start.y)<8)return null;
 const tip=Math.min(.24,Math.hypot(x-from[0],y-from[1])*.2);
 const world=[from,[x,y],[x+Math.cos(a+2.6)*tip,y+Math.sin(a+2.6)*tip],[x,y],[x+Math.cos(a-2.6)*tip,y+Math.sin(a-2.6)*tip]];
 return {height,world,screen:world.map(([x,y])=>camera.screen(x,y,height))};
}

export function trajectoryDirection(camera,velocity){
 if(!velocity)return null;
 const {x,y}=camera.basis.project(velocity.vx,velocity.vy);
 const length=Math.hypot(x,y);
 return length?{dx:x/length,dy:y/length}:null;
}

// Traverse only the continuous friendly run in displayed territory. Expanding
// each adjacent foreign tile by the stroke radius also closes diagonal corners
// and prevents a round cap or wing from extending past an eligible edge.
export function friendlyGuideReach(view,owner,x,y,dx,dy,limit,pad=0){
 if(!owner||!limit||pad>=.5)return 0;
 const {width,height,torus}=view;
 const friendly=(i,j)=>{
  if(torus){i=(i%width+width)%width;j=(j%height+height)%height;}
  if(i<0||i>=width||j<0||j>=height)return false;
  return view.playerForTerritory(view.owner(j*width+i))===owner;
 };
 let i=Math.floor(x),j=Math.floor(y);
 if(!friendly(i,j))return 0;
 const sx=Math.sign(dx),sy=Math.sign(dy),stepX=sx?1/Math.abs(dx):Infinity,stepY=sy?1/Math.abs(dy):Infinity;
 let nextX=sx?((sx>0?i+1:i)-x)/dx:Infinity;
 let nextY=sy?((sy>0?j+1:j)-y)/dy:Infinity;
 let end=Math.min(limit,width,height);
 for(let visited=0;visited<=width+height;visited++){
  for(let b=j-1;b<=j+1;b++)for(let a=i-1;a<=i+1;a++){
   const l=a-pad,r=a+1+pad,t=b-pad,d=b+1+pad;
   if(!sx&&(x<l||x>r)||!sy&&(y<t||y>d))continue;
   const entry=Math.max(0,sx?((sx>0?l:r)-x)/dx:-Infinity,sy?((sy>0?t:d)-y)/dy:-Infinity);
   const exit=Math.min(end,sx?((sx>0?r:l)-x)/dx:Infinity,sy?((sy>0?d:t)-y)/dy:Infinity);
   if(entry<=exit&&!friendly(a,b))end=entry;
  }
  const next=Math.min(nextX,nextY);
  if(next>=end)break;
  if(next===nextX){nextX+=stepX;i+=sx;}
  if(next===nextY){nextY+=stepY;j+=sy;}
 }
 return end;
}

/** Local heading only, starting at the selected ball's verified presentation. */
export function trajectoryGuide(camera,ball,velocity,obstacles,view){
 const direction=trajectoryDirection(camera,velocity);
 if(!ball||!direction)return null;
 const {width,height}=camera.viewport,p=camera.point(ball.x,ball.y,.14);
 const start={x:p.sx,y:p.sy},margin=12;
 if(!p.visible||start.x<margin||start.y<margin||start.x>width-margin||start.y>height-margin)return null;
 const {dx,dy}=direction;
 const edgeX=dx>0?(width-margin-start.x)/dx:dx<0?(margin-start.x)/dx:Infinity;
 const edgeY=dy>0?(height-margin-start.y)/dy:dy<0?(margin-start.y)/dy:Infinity;
 const reach=Math.min(edgeX,edgeY,Math.hypot(width,height)*.72);
 const maxPixels=reach*guideClearance(start,{x:start.x+dx*reach,y:start.y+dy*reach},obstacles);
 const speed=Math.hypot(velocity.vx,velocity.vy),vx=velocity.vx/speed,vy=velocity.vy/speed;
 const projected=camera.basis.project(vx,vy),pixelsPerCell=Math.hypot(projected.x,projected.y)*camera.scale;
 // 0.75 CSS px stroke radius plus rasterization margin, converted through
 // the greatest stretch of the inclined inverse projection.
 const pad=1.25*Math.sqrt(3)/camera.scale;
 const allowed=friendlyGuideReach(view,velocity.owner,ball.x,ball.y,vx,vy,maxPixels/pixelsPerCell,pad);
 const length=allowed*pixelsPerCell-.25;
 if(length<22)return null;
 const x=start.x+dx*length,y=start.y+dy*length;
 const wings=[{x:x-9*dx+4*dy,y:y-9*dy-4*dx},{x:x-9*dx-4*dy,y:y-9*dy+4*dx}];
 const endX=ball.x+length/pixelsPerCell*vx,endY=ball.y+length/pixelsPerCell*vy;
 const room=wings.every(wing=>{
  const v=camera.basis.unproject((wing.x-x)/camera.scale,(wing.y-y)/camera.scale),span=Math.hypot(v.x,v.y);
  return friendlyGuideReach(view,velocity.owner,endX,endY,v.x/span,v.y/span,span,pad)>=span;
 });
 return {start,end:{x,y},wings:room?wings:null};
}
