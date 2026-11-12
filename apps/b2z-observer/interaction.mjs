/** UX-02/12: one cheap displayed-copy resolver for hover and activation. */
import {heading} from '../../packages/kernels/b2z/math.mjs';
function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
/** Pointer-down owns the entire gesture. Move never supplies an aim. */
export function aimingVicinity(camera,aim,p,pointerType='mouse',selection=null){
 if(!aim)return false;
 // An explicitly eligible different Build tile remains a destination target,
 // including a neighbour whose centre falls inside the generous touch halo.
 if(selection?.kind==='new'){const cell=camera.cell(p.x,p.y);if(cell!==selection.cell&&selection.cells.includes(cell))return false;}
 const at=camera.cellPoint(aim.cannon.cell);
 const radius=Math.min(pointerType==='touch'?88:76,Math.max(pointerType==='touch'?60:52,camera.scale*.72));
 return at.visible&&Math.hypot(p.x-at.sx,p.y-at.sy)<=radius;
}
export function resolveInteraction(camera,cannons,p,selection=null,aim=null,balls=[]){
 const cell=camera.cell(p.x,p.y);
 if(selection)return{kind:cell!==null&&(selection.legal?selection.legal(cell):selection.cells.includes(cell))?'place':'invalid',cell};
 let best=null;
 for(const c of cannons.values()){
  const at=camera.cellPoint(c.cell),lod=camera.scale<4?Math.min(8,4/camera.scale):1,[dx,dy]=heading(aim?.cannon.id===c.id&&aim.cannon.cell===c.cell?aim.heading:c.heading??0),top=camera.screen(at.x,at.y,.24*lod),end=camera.screen(at.x+dx/1024*.52*lod,at.y+dy/1024*.52*lod,.27*lod);
  const distance=Math.min(Math.hypot(p.x-at.sx,p.y-at.sy),segmentDistance(p,top,end)),radius=Math.max(18,camera.scale*.36*lod);
  if(distance<=radius&&(!best||distance<best.distance))best={kind:'cannon',id:c.id,cell:c.cell,distance,depth:at.x+at.y+.24*lod};
 }
 // Larger x+y+height is nearer this fixed orthographic camera. A hidden ball
 // behind a cannon cannot steal its hit; practical halos still have bounded targets.
 let ballHit=null;
 for(const b of balls){const lod=Math.max(1,10/camera.scale),at=camera.point(b.x,b.y,.14*lod),distance=Math.hypot(p.x-at.sx,p.y-at.sy),radius=Math.max(12,camera.scale*.16*lod);
  if(at.visible&&distance<=radius&&(!ballHit||distance<ballHit.distance))ballHit={kind:'ball',id:b.id,distance,depth:at.x+at.y+.14*lod};}
 if(ballHit&&(!best||ballHit.depth>best.depth))return ballHit;
 return best??ballHit??{kind:'camera',cell};
}

/** UXR-01: pixels are discarded at activation, never reinterpreted later. */
export function placementIntent(hit,{context,identity,sequence,revision}){
 return Object.freeze({cell:hit.cell,kind:hit.kind,context,identity,sequence,revision});
}
export function samePlacementContext(intent,{context,identity,sequence}){
 return intent.context===context&&intent.identity===identity&&intent.sequence===sequence;
}
