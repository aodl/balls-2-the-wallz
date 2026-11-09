/** UX-05/12. Only displayed world displacement can darken a tile or leave a tail. */
export function displayedMotion({limit=128,lifetime=350}={}){
 let prior=new Map(),effects=new Map(),trails=new Map(),lastTime=null;
 return {
  reset(){prior.clear();effects.clear();trails.clear();lastTime=null;},
  tails(wallMs){for(const [id,t]of trails)if(t.until<=wallMs)trails.delete(id);return [...trails.values()].flatMap(t=>t.path.filter(p=>p.until>wallMs).map(p=>({...p,id:t.id,alpha:Math.max(0,(p.until-wallMs)/lifetime)})));},
  sample(points,{time,wallMs,width,height,torus=false,reducedMotion=false}={}){
   if(lastTime===null||time<lastTime||time-lastTime>1){prior.clear();effects.clear();trails.clear();}
   const next=new Map();
   for(const p of points){const old=prior.get(p.id);next.set(p.id,{x:p.x,y:p.y});
    if(!old||time===lastTime||reducedMotion)continue;
    let dx=p.x-old.x,dy=p.y-old.y;if(torus){dx-=Math.round(dx/width)*width;dy-=Math.round(dy/height)*height;}
    const distance=Math.hypot(dx,dy);if(distance>2){effects.clear();trails.delete(p.id);continue;}if(distance<1e-8)continue;
    const t=trails.get(p.id)??{id:p.id,path:[]};
    const previous=t.path.at(-1),aligned=previous&&previous.dx*dx/distance+previous.dy*dy/distance>.995;
    // Merge tiny collinear samples; expiry is tied to actual movement, not frame count.
    if(aligned&&previous.distance+distance<.2){previous.x=p.x;previous.y=p.y;previous.distance+=distance;previous.until=wallMs+lifetime;}
    else t.path.push({x:p.x,y:p.y,dx:dx/distance,dy:dy/distance,distance,until:wallMs+lifetime});
    t.path=t.path.filter(p=>p.until>wallMs);while(t.path.length>12||t.path.reduce((n,p)=>n+p.distance,0)>1.2)t.path.shift();
    t.until=wallMs+lifetime;trails.set(p.id,t);
    const steps=Math.min(8,Math.max(1,Math.ceil(distance*4)));
    for(let i=1;i<=steps;i++){
     let x=Math.floor(old.x+dx*i/steps),y=Math.floor(old.y+dy*i/steps);
     if(torus){x=(x%width+width)%width;y=(y%height+height)%height;}
     if(x<0||y<0||x>=width||y>=height)continue;const cell=y*width+x;
     effects.delete(cell);effects.set(cell,{cell,until:wallMs+lifetime});
    }
   }
   prior=next;lastTime=time;
   if(reducedMotion){effects.clear();trails.clear();}
   for(const id of trails.keys())if(!next.has(id))trails.delete(id);
   while(trails.size>4096)trails.delete(trails.keys().next().value);
   for(const [cell,e]of effects)if(e.until<=wallMs)effects.delete(cell);
   while(effects.size>limit)effects.delete(effects.keys().next().value);
   return [...effects.values()].map(e=>({...e,alpha:(e.until-wallMs)/lifetime}));
  }
 };
}
