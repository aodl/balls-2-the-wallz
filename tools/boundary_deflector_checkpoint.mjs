import fs from 'node:fs';
import {canonicalTrajectory,faceVelocity,redirectAt,timeAtFace,exactPosition,assertContinuous,directionVelocity,reflectExact,translateExact} from '../packages/kernels/b2z/deflector-boundary.mjs';
import {rat,gcd,cmp,heading} from '../packages/kernels/b2z/math.mjs';
const text=([n,d])=>d===1n?String(n):`${n}/${d}`;
const fraction=s=>rat(...String(s).split('/').map(BigInt));
const incoming=r=>{
 const x=fraction(r.x0),y=fraction(r.y0),d=x[1]/gcd(x[1],y[1])*y[1];
 return canonicalTrajectory(x[0]*(d/x[1]),y[0]*(d/y[1]),d,r.vx,r.vy);
};
export function vector(row){
 const b=incoming(row.incoming),axis=['E','W'].includes(row.face)?'x':'y';
 const time=timeAtFace(b,axis,row.wall),out=faceVelocity(row.orientation,row.face),next=redirectAt(b,time,out.vx,out.vy);
 assertContinuous(b,next,time);
 return {id:row.id,time:text(time),point:exactPosition(b,time).map(text),front:out.front,outgoing:[next.vx,next.vy],intercept:[text(rat(next.x0,next.den)),text(rat(next.y0,next.den))]};
}
if(process.argv[2]){
 const input=JSON.parse(fs.readFileSync(process.argv[2]));
 console.log(JSON.stringify(input.vectors.map(vector)));
}
