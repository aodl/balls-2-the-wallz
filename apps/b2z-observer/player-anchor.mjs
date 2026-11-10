/** Stable presentation anchor from existing compact exact ownership regions. */
import{wrap}from'./camera.mjs';
function sum(start,length,size){const angle=2*Math.PI/size,a=Math.sin(length*angle/2)/Math.sin(angle/2),mid=angle*(start+length/2);return{x:a*Math.cos(mid),y:a*Math.sin(mid)};}
export function territoryCentre(rects,owner,width,height,fallback){
 let sx=0,cx=0,sy=0,cy=0,weight=0;
 for(const r of rects)if(r.owner===owner){const x=sum(r.x,r.width,width),y=sum(r.y,r.height,height);cx+=x.x*r.height;sx+=x.y*r.height;cy+=y.x*r.width;sy+=y.y*r.width;weight+=r.width*r.height;}
 if(!weight||Math.min(Math.hypot(sx,cx),Math.hypot(sy,cy))/weight<1e-4)return{...fallback};
 return{x:wrap(Math.atan2(sx,cx)*width/(2*Math.PI),width),y:wrap(Math.atan2(sy,cy)*height/(2*Math.PI),height)};
}
export function playerAnchor(){
 let key=null,inputKey=null,anchor=null;
 return{resolve(v,surface,account,selected,fallback,{recenter=false,identity=''}={}){
  const nextInput=[surface?.revision,account,selected,identity,v.width,v.height,v.torus].join('/');if(nextInput===inputKey&&!recenter)return anchor;inputKey=nextInput;
  const mine=[...v.cannons.values()].filter(c=>c.account===account).sort((a,b)=>a.id-b.id),chosen=mine.find(c=>c.id===selected),context=[identity,Boolean(surface),v.width,v.height,account,chosen?.id,chosen?v.owner(chosen.cell):null,mine.map(c=>c.id).join(',')].join('/');
  if(key===context&&!recenter)return anchor;key=context;
  const first=chosen??mine[0],point=first?{x:first.cell%v.width+.5,y:Math.floor(first.cell/v.width)+.5}:fallback;
  if(!first||!surface||!v.torus)return anchor={...point,owner:null,torus:Boolean(v.torus)};
  const active=new Set(mine.filter(c=>v.playability?.lifecycle.find(l=>l.cannon===c.id)?.deadline_ns===undefined).map(c=>v.owner(c.cell))),counts=new Map();
  for(const r of surface.layout.rects)if(active.has(r.owner))counts.set(r.owner,(counts.get(r.owner)??0)+r.width*r.height);
  const owner=chosen?v.owner(chosen.cell):[...counts].sort((a,b)=>b[1]-a[1]||a[0]-b[0])[0]?.[0]??v.owner(first.cell);
  return anchor={...territoryCentre(surface.layout.rects,owner,v.width,v.height,point),owner,torus:true};
 },reset(){key=inputKey=null;anchor=null;}};
}
