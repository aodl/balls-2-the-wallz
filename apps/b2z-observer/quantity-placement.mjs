/** Bounded local preferences with a measured, layout-reserved toolbar dock. */
const intersects=(a,b,pad=2)=>a.left<b.right+pad&&a.right>b.left-pad&&a.top<b.bottom+pad&&a.bottom>b.top-pad;
export function quantityPlacement({origin,direction,width,height,scale,viewport,top=74,obstacles=[],previous=null,locked=false,arrow=[],dock=null,preferDock=false,diagnostics=null}){
 const left=viewport.left??0,upper=viewport.top??0,right=left+viewport.width,bottom=upper+viewport.height;
 const rect=(x,y)=>({left:x,top:y,right:x+width,bottom:y+height,width,height}),fits=r=>r.left>=left+8&&r.right<=right-8&&r.top>=Math.max(top,upper+8)&&r.bottom<=bottom-8;
 // The caller reserves this rectangle before sizing the payment scrollport.
 // It is not another guessed candidate, and the preferred arrow may be clipped.
 const fallback=dock&&fits(dock)?{slot:'dock',mode:'dock',rect:dock}:null;
 if(locked&&previous&&fits(previous.rect))return previous;
 if(preferDock&&fallback)return fallback;
 const radius=Math.max(38,scale*.62+4),half=Math.max(24,scale*.62+2),body=rect(origin.x-half,origin.y-Math.max(24,scale*.60+2));body.right=origin.x+half;body.bottom=origin.y+Math.max(18,scale*.17+2);
 const d=Math.hypot(direction.x,direction.y)||1,dx=direction.x/d,dy=direction.y/d;
 const hitsArrow=r=>arrow.some((b,i)=>{if(!i)return false;const a=arrow[i-1];let enter=0,exit=1;for(const[p,d,lo,hi]of[[a.x,b.x-a.x,r.left-9,r.right+9],[a.y,b.y-a.y,r.top-9,r.bottom+9]]){if(Math.abs(d)<1e-9){if(p<lo||p>hi)return false;}else{const u=(lo-p)/d,v=(hi-p)/d;enter=Math.max(enter,Math.min(u,v));exit=Math.min(exit,Math.max(u,v));}}return enter<=exit;});
 const candidates=[];
 function consider(slot,r,score){const viewport=fits(r),cannon=intersects(r,body,2),stroke=hitsArrow(r),ui=obstacles.some(o=>o&&o.right>o.left&&o.bottom>o.top&&intersects(r,o));if(diagnostics)diagnostics.push({slot,rect:r,viewport,cannon,arrow:stroke,ui,accepted:viewport&&!cannon&&!stroke&&!ui});if(viewport&&!cannon&&!stroke&&!ui)candidates.push({slot,mode:'floating',rect:r,score});}
 for(let i=0;i<8;i++){const a=i*Math.PI/4,x=Math.cos(a),y=Math.sin(a),distance=radius+Math.abs(x)*width/2+Math.abs(y)*height/2+10;consider(i,rect(origin.x+x*distance-width/2,origin.y+y*distance-height/2),-x*dx-y*dy);}
 for(const[i,x]of[[8,left+8],[9,left+8+Math.max(0,viewport.width-width-16)/2],[10,right-width-8],[11,Math.max(left+8,right-width-64)],[12,Math.max(left+8,right-width-56)]])consider(i,rect(x,top),-2-Math.hypot(x+width/2-origin.x,top+height/2-origin.y)/1000);
 candidates.sort((a,b)=>b.score-a.score||a.slot-b.slot);const best=candidates[0],prior=candidates.find(c=>c.slot===previous?.slot);
 return prior&&best.score-prior.score<.3?prior:best??fallback;
}

/** Reserve a keyboard-contracted strip around measured fixed controls, not angle slots. */
export function quantityDockStrip({viewport,top,width,height,obstacles=[]}){
 const left=(viewport.left??0)+8,right=(viewport.left??0)+viewport.width-8;
 const bands=[top,...obstacles.filter(o=>o&&o.bottom>=top).map(o=>o.bottom+8)].sort((a,b)=>a-b);
 for(const y of bands){if(y+height>(viewport.top??0)+viewport.height-8)continue;let intervals=[[left,right]];
  for(const o of obstacles){if(!o||o.bottom<=y-2||o.top>=y+height+2)continue;intervals=intervals.flatMap(([a,b])=>[[a,Math.min(b,o.left-8)],[Math.max(a,o.right+8),b]].filter(([x,z])=>z>x));}
  const fit=intervals.find(([a,b])=>b-a>=width);if(fit)return{left:fit[0],right:fit[0]+width,top:y,bottom:y+height,width,height};
 }
 return null;
}
