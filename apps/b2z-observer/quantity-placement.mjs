/** Screen-space local editor placement. Fixed slots + hysteresis; never a camera command. */
const intersects=(a,b,pad=2)=>a.left<b.right+pad&&a.right>b.left-pad&&a.top<b.bottom+pad&&a.bottom>b.top-pad;
export function quantityPlacement({origin,direction,width,height,scale,viewport,top=74,obstacles=[],previous=null,locked=false,arrow=[]}){
 const rect=(x,y)=>({left:x,top:y,right:x+width,bottom:y+height,width,height}),fits=r=>r.left>=8&&r.right<=viewport.width-8&&r.top>=top&&r.bottom<=viewport.height-8;
 if(locked&&previous&&fits(previous.rect))return previous;
 const radius=Math.max(38,scale*.62+4),half=Math.max(24,scale*.62+2),body=rect(origin.x-half,origin.y-Math.max(24,scale*.60+2));body.right=origin.x+half;body.bottom=origin.y+Math.max(18,scale*.17+2);
 const d=Math.hypot(direction.x,direction.y)||1,dx=direction.x/d,dy=direction.y/d,blocked=r=>obstacles.some(o=>o&&o.right>o.left&&o.bottom>o.top&&intersects(r,o))||intersects(r,body,2);
 const hitsArrow=r=>arrow.some((b,i)=>{if(!i)return false;const a=arrow[i-1];let enter=0,exit=1;for(const [p,d,lo,hi]of[[a.x,b.x-a.x,r.left-9,r.right+9],[a.y,b.y-a.y,r.top-9,r.bottom+9]]){if(Math.abs(d)<1e-9){if(p<lo||p>hi)return false;}else{const u=(lo-p)/d,v=(hi-p)/d;enter=Math.max(enter,Math.min(u,v));exit=Math.min(exit,Math.max(u,v));}}return enter<=exit;});
 const candidates=[];
 for(let i=0;i<8;i++){const a=i*Math.PI/4,x=Math.cos(a),y=Math.sin(a),distance=radius+Math.abs(x)*width/2+Math.abs(y)*height/2+10,r=rect(origin.x+x*distance-width/2,origin.y+y*distance-height/2);if(fits(r)&&!blocked(r)&&!hitsArrow(r))candidates.push({slot:i,rect:r,score:-x*dx-y*dy});}
 // Nearby safe-area slots remain available on contracted viewports.
 for(const [i,x]of[[8,8],[9,8+Math.max(0,viewport.width-width-16)/2],[10,viewport.width-width-8],[11,Math.max(8,viewport.width-width-64)],[12,Math.max(8,viewport.width-width-56)]] ){const r=rect(x,top);if(fits(r)&&!blocked(r)&&!hitsArrow(r))candidates.push({slot:i,rect:r,score:-2-Math.hypot(x+width/2-origin.x,top+height/2-origin.y)/1000});}
 candidates.sort((a,b)=>b.score-a.score||a.slot-b.slot);const best=candidates[0],prior=candidates.find(c=>c.slot===previous?.slot);return prior&&best.score-prior.score<.3?prior:best??null;
}
