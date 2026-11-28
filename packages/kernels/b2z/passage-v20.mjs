/** Canonical Rules20 one-traversal construction exception. Never an authority
 * for a Ball arriving after the newly built structure's initial overlap. */
import {nextCrossing} from './geometry.mjs';
import {cmp} from './math.mjs';
import {wrapCell,playerAt} from './world.mjs';

function blocked(w,b,cell){
 return w.cannons.some(c=>c.cell===cell&&!exempts(w,b.id,'cannon',c.id,cell))
   ||(w.deflectors??[]).some(d=>d.cell===cell&&!exempts(w,b.id,'deflector',d.id,cell));
}
function friendlyClear(w,b,cell){return playerAt(w,cell)===b.owner&&!blocked(w,b,cell);}

function touchesForward(w,b,cell){
 const crossing=nextCrossing(b,w.width,w.time,b.den??1n);
 if(b.cell===cell)return cmp(crossing.time,w.time)>0;
 if(cmp(crossing.time,w.time)!==0)return false;
 const x=b.cell%w.width,y=Math.floor(b.cell/w.width),sx=Math.sign(b.vx),sy=Math.sign(b.vy);
 if(playerAt(w,cell)!==b.owner)return false;
 const sideX=crossing.x?wrapCell(x+sx,y,w.width,w.height):null;
 const sideY=crossing.y?wrapCell(x,y+sy,w.width,w.height):null;
 if(!crossing.x||!crossing.y)return sideX===cell||sideY===cell;
 const diagonal=wrapCell(x+sx,y+sy,w.width,w.height);
 const passX=sideX===cell||friendlyClear(w,b,sideX),passY=sideY===cell||friendlyClear(w,b,sideY);
 if(cell===diagonal)return passX&&passY;
 if(cell!==sideX&&cell!==sideY)return false;
 if(!(passX&&passY))return true;
 if(friendlyClear(w,b,diagonal)||blocked(w,b,diagonal))return false;
 const preferredX=(((x+y)&1)===0)===(sx===sy);
 return (cell===sideX)===preferredX;
}
export function registerPassage(w,kind,structure,cell){
 if(w.version<12)return;
 const rows=w.passage_exceptions??[];
 for(const b of w.balls)if(touchesForward(w,b,cell)){
  if(rows.some(row=>row.ball===b.id))throw Error('PASSAGE_EXCEPTION_CONFLICT');
  rows.push({ball:b.id,kind,structure,cell});
 }
 rows.sort((a,b)=>a.ball-b.ball);
 if(rows.length)w.passage_exceptions=rows;
}
export function exempts(w,ball,kind,structure,cell){
 if(w.version<12)return false;
 const rows=w.passage_exceptions??[];
 let low=0,high=rows.length;
 while(low<high){const mid=(low+high)>>1;if(rows[mid].ball<ball)low=mid+1;else high=mid;}
 const row=rows[low];return row?.ball===ball&&row.kind===kind&&row.structure===structure&&row.cell===cell;
}
export function retireAfterContact(w,ball){
 if(w.version<12)return;
 const rows=w.passage_exceptions??[],at=rows.findIndex(row=>row.ball===ball);
 if(at>=0&&!w.balls.some(b=>b.id===ball&&b.cell===rows[at].cell))rows.splice(at,1);
 if(!rows.length)delete w.passage_exceptions;
}
export function pruneRemoved(w){
 if(w.version<12||!w.passage_exceptions?.length)return;
 w.passage_exceptions=w.passage_exceptions.filter(row=>{
  const b=w.balls.find(b=>b.id===row.ball);
  return b&&(b.cell===row.cell||touchesForward(w,b,row.cell))
    &&(row.kind==='cannon'?w.cannons.some(c=>c.id===row.structure&&c.cell===row.cell)
      :w.deflectors?.some(d=>d.id===row.structure&&d.cell===row.cell));
 });
 if(!w.passage_exceptions.length)delete w.passage_exceptions;
}
export function validatePassage(w){
 const rows=w.passage_exceptions??[];
 if(w.version<12){if(rows.length)throw Error('historical passage exception');return;}
 if(!Array.isArray(rows)||rows.length>w.balls.length)throw Error('passage exception bound');
 let previous=0;
 for(const row of rows){
  if(Object.keys(row).sort().join(',')!=='ball,cell,kind,structure'||!Number.isInteger(row.ball)||row.ball<=previous||
     !Number.isInteger(row.structure)||row.structure<1||!Number.isInteger(row.cell)||row.cell<0||row.cell>=w.width*w.height||
     !['cannon','deflector'].includes(row.kind))throw Error('passage exception shape/order');
  previous=row.ball;
  const b=w.balls.find(b=>b.id===row.ball);
  if(!b||b.cell!==row.cell&&!touchesForward(w,b,row.cell))throw Error('passage exception traversal');
  const found=row.kind==='cannon'?w.cannons.some(c=>c.id===row.structure&&c.cell===row.cell)
    :w.deflectors?.some(d=>d.id===row.structure&&d.cell===row.cell);
  if(!found)throw Error('passage exception structure');
 }
}
