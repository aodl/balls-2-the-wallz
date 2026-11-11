/** UX-05/12. Only displayed world displacement can darken a tile or leave a tail. */
export function displayedMotion({limit=128,tailLifetime=null,tileLifetime=2200,tileHold=450}={}){
 let prior=new Map(),effects=new Map(),trails=new Map(),lastTime=null;
 return {
  reset(){prior.clear();effects.clear();trails.clear();lastTime=null;},
  inspect(){return{balls:prior.size,tiles:effects.size,pathPoints:[...trails.values()].reduce((n,t)=>n+t.path.length,0),pointLimit:64,totalPointLimit:8192,ballLimit:4096,tileLimit:limit};},
  tails(wallMs){for(const [id,t]of trails)if(t.until<=wallMs)trails.delete(id);return [...trails.values()].flatMap(t=>t.path.filter(p=>p.until>wallMs).map(p=>({...p,id:t.id,alpha:Math.min(1,(t.until-wallMs)/250)*Math.max(.12,1-(wallMs-p.created)/p.lifetime)})));},
  sample(points,{time,wallMs,width,height,torus=false,reducedMotion=false,pixelsPerCell=48,trajectories=null}={}){
   if(lastTime===null||time<lastTime||time-lastTime>1){prior.clear();effects.clear();trails.clear();}
   const next=new Map();
   for(const p of points){const old=prior.get(p.id),line=trajectories?.get(p.id);next.set(p.id,{x:p.x,y:p.y,wallMs,vx:line?.vx,vy:line?.vy,x0:line?.x0,y0:line?.y0});
    if(!old||time===lastTime||reducedMotion)continue;
    let dx=p.x-old.x,dy=p.y-old.y;if(torus){dx-=Math.round(dx/width)*width;dy-=Math.round(dy/height)*height;}
    const distance=Math.hypot(dx,dy),sameLine=line&&['vx','vy','x0','y0'].every(k=>old[k]===line[k]);if(distance>2&&!sameLine){effects.clear();trails.delete(p.id);continue;}if(distance<1e-8)continue;
    const t=trails.get(p.id)??{id:p.id,path:[]};
    const speed=distance/Math.max(.001,(wallMs-old.wallMs)/1000),projection=Math.max(1,pixelsPerCell*Math.hypot((dx-dy)/Math.SQRT2,(dx+dy)/Math.sqrt(6))/distance),lifetime=tailLifetime??Math.min(30000,Math.max(350,26000/(speed*projection))),maxLength=Math.min(1.2,32/projection);
    const previous=t.path.at(-1),aligned=previous&&previous.dx*dx/distance+previous.dy*dy/distance>.995;
    // Merge tiny collinear samples; expiry is tied to actual movement, not frame count.
    if(aligned&&previous.until>wallMs&&previous.distance+distance<.03){previous.x=p.x;previous.y=p.y;previous.distance+=distance;}
    else t.path.push({x:p.x,y:p.y,dx:dx/distance,dy:dy/distance,distance,created:wallMs,until:wallMs+lifetime,lifetime});
    t.path=t.path.filter(p=>p.until>wallMs);while(t.path.length>64)t.path.shift();
    // Trim a travelled segment's oldest portion instead of dropping the entire
    // path when one legitimate fast frame already spans the screen budget.
    let excess=t.path.reduce((n,p)=>n+p.distance,0)-maxLength;
    while(excess>1e-9&&t.path.length){const first=t.path[0];if(first.distance<=excess){excess-=first.distance;t.path.shift();}else{first.distance-=excess;excess=0;}}
    t.until=wallMs+(tailLifetime??700);trails.set(p.id,t);
    const steps=Math.min(32,Math.max(1,Math.ceil(distance*4)));
    for(let i=1;i<=steps;i++){
     let x=Math.floor(old.x+dx*i/steps),y=Math.floor(old.y+dy*i/steps);
     if(torus){x=(x%width+width)%width;y=(y%height+height)%height;}
     if(x<0||y<0||x>=width||y>=height)continue;const cell=y*width+x;
     effects.delete(cell);effects.set(cell,{cell,created:wallMs,until:wallMs+tileLifetime});
    }
   }
   prior=next;lastTime=time;
   if(reducedMotion){effects.clear();trails.clear();}
   for(const id of trails.keys())if(!next.has(id))trails.delete(id);
   let count=[...trails.values()].reduce((n,t)=>n+t.path.length,0);
   while(trails.size>4096||count>8192){const id=trails.keys().next().value;count-=trails.get(id).path.length;trails.delete(id);}
   for(const [cell,e]of effects)if(e.until<=wallMs)effects.delete(cell);
   while(effects.size>limit)effects.delete(effects.keys().next().value);
   return [...effects.values()].map(e=>({...e,alpha:Math.max(0,Math.min(1,(e.until-wallMs)/(tileLifetime-tileHold)))}));
  }
 };
}
