// Shared exact placement geometry. Callers supply verified canonical ownership.
import {CONTEXT_POLICY} from './context-structures.generated.mjs';
import {hasEnemyClearance} from './territory-clearance.mjs';

const radius = CONTEXT_POLICY.friendly_structure_max_chebyshev;
export const STRUCTURE_MIN_DISTANCE = 4;
const tile = 1024;
export const wrapSite=(x,y,width,height)=>((y%height+height)%height)*width+(x%width+width)%width;
export const sameStructure=(a,b)=>a?.kind===b?.kind&&a?.id===b?.id;
export function structureOccupancy(world) {
  const blocked=new Set([...world.cannons.map(c=>c.cell),...(world.deflectors??[]).map(d=>d.cell)]);
  const [numerator,denominator]=world.time;
  for(const b of world.balls){
    const cx=b.cell%world.width,cy=Math.floor(b.cell/world.width),scale=b.den??1n;
    const closed=(cell,origin,speed)=>{
      const coordinate=origin*denominator+BigInt(speed)*numerator*scale;
      const unit=BigInt(tile)*denominator*scale;
      if(coordinate===BigInt(cell)*unit)return [cell,cell-1];
      if(coordinate===BigInt(cell+1)*unit)return [cell,cell+1];
      return [cell];
    };
    for(const x of closed(cx,b.x0,b.vx))for(const y of closed(cy,b.y0,b.vy))blocked.add(wrapSite(x,y,world.width,world.height));
  }
  return blocked;
}
export function structureMap(world,cannonOwner){
  return new Map([
    ...world.cannons.map(c=>[c.cell,{kind:'cannon',id:c.id,owner:cannonOwner(c.id)}]),
    ...world.deflectors.map(d=>[d.cell,{kind:'deflector',id:d.id,owner:d.owner}]),
  ]);
}
export function hasFriendlyStructure(width,height,cell,owner,moving,structures) {
  const x=cell%width,y=Math.floor(cell/width);
  for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
    const neighbour=wrapSite(x+dx,y+dy,width,height),structure=structures.get(neighbour);
    if(neighbour!==cell&&structure?.owner===owner&&!sameStructure(structure,moving))return true;
  }
  return false;
}
export function hasStructureClearance(width,height,cell,moving,structures) {
  const x=cell%width,y=Math.floor(cell/width),radius=STRUCTURE_MIN_DISTANCE-1;
  for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
    const structure=structures.get(wrapSite(x+dx,y+dy,width,height));
    if(structure&&!sameStructure(structure,moving))return false;
  }
  return true;
}
export function structureSiteReason({width,height,owner,cell,moving,deflector,spacing=false,occupied,structures,ownerAt,active}) {
  if(!Number.isInteger(cell)||cell<0||cell>=width*height||owner===undefined||ownerAt(cell)!==owner)return 'NOT_OWN_TERRITORY';
  if(!active(cell))return 'NO_ACTIVE_ISLAND';
  if(occupied.has(cell))return 'SITE_OCCUPIED';
  if(deflector&&!spacing){
    const x=cell%width,y=Math.floor(cell/width);
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const d=structures.get(wrapSite(x+dx,y+dy,width,height));
      if(d?.kind==='deflector'&&!sameStructure(d,moving))return 'DEFLECTOR_TOO_CLOSE';
    }
  }
  if(!hasEnemyClearance(width,height,cell,owner,ownerAt))return 'ENEMY_TERRITORY_TOO_CLOSE';
  if(spacing)return hasStructureClearance(width,height,cell,moving,structures)?null:'STRUCTURE_TOO_CLOSE';
  return hasFriendlyStructure(width,height,cell,owner,moving,structures)?null:'NO_FRIENDLY_STRUCTURE_NEARBY';
}
