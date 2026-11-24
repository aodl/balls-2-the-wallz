import {reservoirHas,reservoirOccupancy} from '../../protocol/reservoir.mjs';
import {cellDistance,hasEnemyClearance} from '../../protocol/territory-clearance.mjs';
import {STRUCTURE_MIN_DISTANCE} from '../../protocol/structure-sites.mjs';
/** Exact maximin first entry. Bounded DFS geometry and existing resumable span flood. */
import {ownerAt,playerAt,neighbors,setOwner} from './world.mjs';
import {Flood} from './territory-topology-v6.mjs';
const distance=(a,b,size)=>{const d=Math.abs(a-b);return Math.min(d,size-d);};
const axisMax=(a,b,c,size)=>{const opposite=(c+Math.floor(size/2))%size;return Math.max(distance(a,c,size),distance(b,c,size),opposite>=a&&opposite<=b?Math.floor(size/2):0);};
export function distanceSquared(w,cell){const x=cell%w.width,y=Math.floor(cell/w.width);return w.cannons.reduce((best,c)=>Math.min(best,distance(x,c.cell%w.width,w.width)**2+distance(y,Math.floor(c.cell/w.width),w.height)**2),500001);}
export function rectangleBound(w,r){return w.cannons.reduce((best,c)=>Math.min(best,axisMax(r[0],r[1],c.cell%w.width,w.width)**2+axisMax(r[2],r[3],Math.floor(c.cell/w.width),w.height)**2),500001);}
const minimum=(w,r)=>r[2]*w.width+r[0];
const has=(rs,c)=>{let a=0,b=rs.length;while(a<b){const m=(a+b)>>1;if(rs[m][0]<=c)a=m+1;else b=m;}return a>0&&c<rs[a-1][1];};
export function beginEntry(w,blocked,spacing=false){const neutral=w.width*w.height-w.ownership.counts.reduce((sum,c)=>sum+c.cells,0);return{blocked:[...blocked].sort((a,b)=>a-b),stack:spacing&&neutral<(2*STRUCTURE_MIN_DISTANCE-1)**2?[]:[[0,w.width-1,0,w.height-1]],best:null,candidate:null,proposal:null,owners:[],seeds:[],owner_index:0,flood:null,visited:0};}
function clear(s){s.candidate=null;s.proposal=null;s.owners=[];s.seeds=[];s.owner_index=0;s.flood=null;}
/** blocked contains every closed occupied ball cell plus retained cannon cells. */
export function entryHasClearance(w,cell){
 const separated=shape=>cellDistance(shape.cell,cell,w.width,w.height)>=STRUCTURE_MIN_DISTANCE;
 return hasEnemyClearance(w.width,w.height,cell,0,c=>playerAt(w,c))
   &&w.cannons.every(separated)&&(w.deflectors??[]).every(separated);
}
export function entryStep(w,s,patchFor,spacing=false){
 if(s.candidate){
  if(s.owner_index===s.owners.length){s.best=s.candidate;clear(s);return false;}
  const label=s.owners[s.owner_index];
  if(!s.flood){const patch=patchFor(s.candidate.cell);s.seeds=[...new Set(patch.flatMap(c=>neighbors(c,w.width,w.height,true)).filter(c=>!patch.includes(c)&&ownerAt(s.proposal,c)===label))].sort((a,b)=>a-b);if(!s.seeds.length){clear(s);return false;}s.flood={...new Flood(label,s.seeds[0])};}
  const flood=Object.assign(Object.create(Flood.prototype),s.flood),done=flood.step(s.proposal);s.flood={...flood};
  if(s.seeds.every(c=>has(flood.ranges,c))){s.owner_index++;s.flood=null;s.seeds=[];}else if(done)clear(s);
  return false;
 }
 if(!s.stack.length)return true;
 const r=s.stack.pop(),upper=rectangleBound(w,r);if(s.best&&(upper<s.best.distance||upper===s.best.distance&&minimum(w,r)>=s.best.cell))return false;
 if(r[0]===r[1]&&r[2]===r[3]){
  const cell=minimum(w,r),patch=patchFor(cell);s.visited++;if(patch.some(c=>s.blocked.includes(c)||reservoirHas(reservoirOccupancy(w),c))||spacing&&!entryHasClearance(w,cell))return false;
  const candidate={cell,distance:distanceSquared(w,cell)};s.owners=[...new Set(patch.map(c=>ownerAt(w,c)).filter(Boolean))].sort((a,b)=>a-b);
  if(!s.owners.length){s.best=candidate;return false;}
  s.candidate=candidate;s.proposal=structuredClone(w);for(const c of patch)setOwner(s.proposal,c,0);return false;
 }
 const children=[];
 if(r[1]-r[0]>=r[3]-r[2]){const mid=Math.floor((r[0]+r[1])/2);children.push([r[0],mid,r[2],r[3]],[mid+1,r[1],r[2],r[3]]);}
 else{const mid=Math.floor((r[2]+r[3])/2);children.push([r[0],r[1],r[2],mid],[r[0],r[1],mid+1,r[3]]);}
 children.sort((a,b)=>rectangleBound(w,a)-rectangleBound(w,b)||minimum(w,b)-minimum(w,a));s.stack.push(...children);if(s.stack.length>32)throw Error('ENTRY_SEARCH_STACK');return false;
}
