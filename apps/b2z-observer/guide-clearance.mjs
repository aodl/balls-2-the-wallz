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
