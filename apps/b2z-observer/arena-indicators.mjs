import {heading} from '../../packages/kernels/b2z/math.mjs';

const turn = 2*Math.PI;
function angleOf(value){const [x,y]=heading(value);return Math.atan2(y,x);}
const shortestTurn = (from, to) => (to-from+3*Math.PI)%turn-Math.PI;

/** The displayed turret heading is never written back to the aim or world. */
export function turretPresentation(){
 const shown=new Map();
 let previousAim=null,revision=0;
 return {
  sample(cannons,aim,now,reducedMotion){
   const aimed=aim?.cannon.id==null?null:aim;
   let changed=false;
   for(const id of shown.keys())if(!cannons.has(id)){shown.delete(id);changed=true;}
   for(const c of cannons.values()){
    const facing=Number.isInteger(c.heading)?c.heading:0;
    const active=aimed?.cannon.id===c.id&&aimed.cannon.cell===c.cell;
    const prior=previousAim?.cannon.id===c.id&&previousAim.cannon.cell===c.cell;
    const target=active?aim.heading:facing;
    let state=shown.get(c.id);
    if(!state||state.cell!==c.cell||state.generation!==c.generation){
     state={cell:c.cell,generation:c.generation,target:facing,angle:angleOf(facing),motion:null};
     shown.set(c.id,state);changed=true;
    }
    const initial=state.angle;
    if(state.motion){
     const {from,to,delta,start}=state.motion,t=Math.max(0,Math.min(1,(now-start)/280));
     state.angle=t===1?to:from+delta*t*t*(3-2*t);
     if(t===1)state.motion=null;
    }
    if(reducedMotion||target!==state.target){
     const to=angleOf(target);
     // Dragging or stepping the active aim always updates in the same frame.
     if(reducedMotion||active&&prior||!active&&!prior&&!state.motion){
      state.angle=to;state.motion=null;
     }else{
      const delta=shortestTurn(state.angle,to);
      state.motion=Math.abs(delta)<1e-9?null:{from:state.angle,to,delta,start:now};
      if(!state.motion)state.angle=to;
     }
     state.target=target;
    }
    changed ||= initial!==state.angle;
   }
   previousAim=aimed;
   if(changed)revision++;
   return revision;
  },
  angle:id=>shown.get(id)?.angle??0,
  reset(){shown.clear();previousAim=null;revision++;}
 };
}

/** Ground-projected tile edges, or a centred marker below legible tile size. */
export function tileIndicator(camera,cell,kind){
 const {x,y,sx,sy,visible}=camera.cellPoint(cell);
 if(!visible)return null;
 const corners=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]];
 const ys=corners.map(([dx,dy])=>camera.screen(x+dx,y+dy).y);
 const marker=Math.max(...ys)-Math.min(...ys)<8;
 const radius=kind==='hover'?4.5:6;
 const world=marker?[[0,-radius],[radius,0],[0,radius],[-radius,0]].map(([dx,dy])=>{
  const p=camera.world(sx+dx,sy+dy);
  return [p.x,p.y];
 }):corners.map(([dx,dy])=>[x+dx,y+dy]);
 const segments=world.map((p,i)=>[p,world[(i+1)%4]]);
 if(kind==='invalid')segments.push([world[0],world[2]],[world[1],world[3]]);
 return {cell,kind,marker,segments};
}
