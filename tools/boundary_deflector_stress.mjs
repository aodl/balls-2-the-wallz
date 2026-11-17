/** Exact numerical/progress research. Not an authenticated game scheduler. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {heading,rat,cmp} from '../packages/kernels/b2z/math.mjs';
import {nextCrossing} from '../packages/kernels/b2z/geometry.mjs';
import {canonicalTrajectory,faceVelocity,redirectAt,timeAtFace,exactPosition,assertContinuous,reflectExact,translateExact} from '../packages/kernels/b2z/deflector-boundary.mjs';
const Q=1024n,D=22627n;
const bits=n=>(n<0n?-n:n).toString(2).length;
const stats={contacts:0,corners:0,max_den:'1',max_numerator_bits:0,max_time_numerator_bits:0,max_time_denominator_bits:0};
function record(b,t){
 stats.contacts++;stats.max_den=String(b.den>BigInt(stats.max_den)?b.den:BigInt(stats.max_den));
 stats.max_numerator_bits=Math.max(stats.max_numerator_bits,bits(b.x0),bits(b.y0));
 stats.max_time_numerator_bits=Math.max(stats.max_time_numerator_bits,bits(t[0]));
 stats.max_time_denominator_bits=Math.max(stats.max_time_denominator_bits,bits(t[1]));
 assert(b.den<=65536n);assert(bits(b.x0)<=63&&bits(b.y0)<=63);assert(bits(t[0])<=63);assert(bits(t[1])<=32);
}
// Every ordinary cannon heading, first real boundary candidate from the old
// authoritative helper, retaining its simultaneous-axis classification.
let maxComponent=0,ordinary=0,closest=null;
for(let angle=0;angle<65536;angle++){
 const [vx,vy]=heading(angle,32000);maxComponent=Math.max(maxComponent,Math.abs(vx),Math.abs(vy));
 const old={id:1,cell:0,x0:512n,y0:512n,vx,vy};
 // Choose a translated interior source cell so negative components hit its
 // lower boundary at positive time rather than an exterior board convention.
 old.cell=1001;old.x0+=Q;old.y0+=Q;
 const crossing=nextCrossing(old,1000,rat(0));
 let b=canonicalTrajectory(old.x0,old.y0,1n,vx,vy);
 if(crossing.x&&crossing.y){stats.corners++;continue;}
 const axis=crossing.x?'x':'y',face=axis==='x'?(vx>0?'W':'E'):(vy>0?'N':'S');
 const out=faceVelocity(['NE','SE','SW','NW'][angle%4],face),next=redirectAt(b,crossing.time,out.vx,out.vy);
 const p=exactPosition(b,crossing.time)[axis==='x'?1:0];
 const low=rat(p[0]-Q*p[1],p[1]),high=rat(2n*Q*p[1]-p[0],p[1]),epsilon=cmp(low,high)<0?low:high;
 if(!closest||cmp(epsilon,closest.epsilon)<0)closest={angle,vx,vy,axis,epsilon,time:crossing.time,point:exactPosition(b,crossing.time)};
 assertContinuous(b,next,crossing.time);assert(BigInt(Math.abs(axis==='x'?vx:vy))%next.den===0n);
 record(next,crossing.time);ordinary++;
}
const durations=[];
for(const count of [1500,10000,100000]){
 let b=canonicalTrajectory(512n,512n,1n,30001,11113),now=rat(0),start=performance.now(),minStep=null;
 const initial=timeAtFace(b,'x',1024),out=faceVelocity('NE','W');b=redirectAt(b,initial,out.vx,out.vy);now=initial;
 const denBound=b.den;
 for(let n=0;n<count;n++){
  // Open source cell remains [0,Q]^2; all four sides are blocked. Ordinary
  // contact always points out of the occupied neighbour and into this cell.
  const tx=timeAtFace(b,'x',b.vx>0?1024:0),ty=timeAtFace(b,'y',b.vy>0?1024:0),both=cmp(tx,ty)===0;
  const axis=cmp(tx,ty)<=0?'x':'y',t=axis==='x'?tx:ty;
  assert(cmp(t,now)>0,'zero-time recontact');const step=rat(t[0]*now[1]-now[0]*t[1],t[1]*now[1]);
  if(!minStep||cmp(step,minStep)<0)minStep=step;
  const old=b;
  if(both){b=reflectExact(reflectExact(b,'x',b.vx>0?1024:0),'y',b.vy>0?1024:0);stats.corners++;}
  else if(n%7===0)b=reflectExact(b,axis,(axis==='x'?b.vx:b.vy)>0?1024:0);
  else {const face=axis==='x'?(b.vx>0?'W':'E'):(b.vy>0?'N':'S'),v=faceVelocity(['NE','NW','SW','SE'][(n*17)%4],face);b=redirectAt(b,t,v.vx,v.vy);}
  assertContinuous(old,b,t);assert(denBound%b.den===0n);assert(Math.abs(b.vx)===Number(D)&&Math.abs(b.vy)===Number(D));
  // Both toroidal seam translations are exact integer-affine maps and reduce
  // back to the identical stored state, independently of interaction count.
  if(n%11===0){const wrapped=translateExact(b,1024000,-1024000);assert.deepEqual(translateExact(wrapped,-1024000,1024000),b);}
  now=t;record(b,t);
 }
 durations.push({interactions:count,elapsed_ms:performance.now()-start,final_den:String(b.den),initial_den:String(denBound),minimum_step:minStep.map(String),final_time:now.map(String)});
}
// Two adjacent perpendicular NE deflectors return an incoming diagonal back
// along itself. A positive interval does not imply economical event density.
const epsilon=closest.epsilon,loopStep=rat(epsilon[0],epsilon[1]*D);
const result={status:'PASS_NUMERIC_CHECKPOINT_ONLY',scope:'No source admission, structure purchase, migration or installed-game qualification',heading_orientation_conflict:'Names/front faces use NE=(+D,-D); existing helper8192 is SE. Cannon helper unchanged.',all_heading_count:65536,first_ordinary_contacts:ordinary,max_canonical_component:maxComponent,stats,chains:durations,
 adversarial_corner_corridor:{canonical_launch:{...closest,epsilon:closest.epsilon.map(String),time:closest.time.map(String),point:closest.point.map(v=>v.map(String))},epsilon:epsilon.map(String),step:loopStep.map(String),contacts_per_tick_floor:String(loopStep[1]/loopStep[0]),conclusion:'Strictly positive times alone are insufficient for economical scheduling. A separately specified candidate progress policy is required.'}};
fs.writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
