/** One explicit navigation from the latest authenticated world. No purchases. */
import {territoryLayout} from './terrain.mjs';
import {wrap} from './camera.mjs';
export function compactAxis(intervals,size){
 const rows=intervals.filter(r=>r[1]>r[0]).sort((a,b)=>a[0]-b[0]),merged=[];
 for(const r of rows){const last=merged.at(-1);if(last&&r[0]<=last[1])last[1]=Math.max(last[1],r[1]);else merged.push([...r]);}
 if(!merged.length)return null;let gap=-1,origin=0;
 for(let i=0;i<merged.length;i++){const end=merged[i][1],next=merged[(i+1)%merged.length][0]+(i===merged.length-1?size:0),d=next-end;if(d>gap){gap=d;origin=wrap(next,size);}}
 return{origin,span:size-gap};
}
export function accountTerritoryFrame(world,account){
 const mine=world.cannons.filter(c=>c.account===account);if(!mine.length)return null;
 const players=world.version===6?new Map(world.playability.players.map(p=>[p.id,p.account])):null,territories=world.version===6?new Map(world.playability.territories.map(t=>[t.id,t.player])):null,cannons=new Map(world.cannons.map(c=>[c.id,c.account]));
 const owner=id=>world.version===6?players.get(territories.get(id)):cannons.get(id);
 const rects=territoryLayout({...world,torus:world.version>=4,owner:n=>world.cells[n]}).rects.filter(r=>r.owner&&owner(r.owner)===account);
 if(!rects.length)return{x:mine[0].cell%world.width+.5,y:Math.floor(mine[0].cell/world.width)+.5,projectedWidth:1,projectedHeight:1,regions:0};
 const x=compactAxis(rects.map(r=>[r.x,r.x+r.width]),world.width),y=compactAxis(rects.map(r=>[r.y,r.y+r.height]),world.height);let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
 for(const r of rects){const a=wrap(r.x-x.origin,world.width),b=wrap(r.y-y.origin,world.height);for(const [dx,dy]of[[0,0],[r.width,0],[0,r.height],[r.width,r.height]]){const sx=(a+dx-b-dy)/Math.SQRT2,sy=(a+dx+b+dy)/Math.sqrt(6);left=Math.min(left,sx);right=Math.max(right,sx);top=Math.min(top,sy);bottom=Math.max(bottom,sy);}}
 const sx=(left+right)/2,sy=(top+bottom)/2;return{x:wrap(x.origin+(Math.SQRT2*sx+Math.sqrt(6)*sy)/2,world.width),y:wrap(y.origin+(-Math.SQRT2*sx+Math.sqrt(6)*sy)/2,world.height),projectedWidth:Math.max(1,right-left),projectedHeight:Math.max(1,bottom-top),regions:rects.length,xSpan:x.span,ySpan:y.span};
}
