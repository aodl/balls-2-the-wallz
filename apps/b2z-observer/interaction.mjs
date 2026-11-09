/** UX-02/12: one cheap displayed-copy resolver for hover and activation. */
import {heading} from '../../packages/kernels/b2z/math.mjs';
function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
export function resolveInteraction(camera,cannons,p,selection=null,aim=null){
 const cell=camera.cell(p.x,p.y);
 if(selection)return{kind:cell!==null&&(selection.legal?selection.legal(cell):selection.cells.includes(cell))?'place':'invalid',cell};
 let best=null;
 for(const c of cannons.values()){
  const at=camera.cellPoint(c.cell),lod=camera.scale<4?Math.min(8,4/camera.scale):1,[dx,dy]=heading(aim?.cannon.id===c.id&&aim.cannon.cell===c.cell?aim.heading:c.heading??0),top=camera.screen(at.x,at.y,.24*lod),end=camera.screen(at.x+dx/1024*.52*lod,at.y+dy/1024*.52*lod,.27*lod);
  const distance=Math.min(Math.hypot(p.x-at.sx,p.y-at.sy),segmentDistance(p,top,end)),radius=Math.max(18,camera.scale*.36*lod);
  if(distance<=radius&&(!best||distance<best.distance))best={kind:'cannon',id:c.id,cell:c.cell,distance};
 }
 return best??{kind:'camera',cell};
}
