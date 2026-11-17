/** Four-direction numerical checkpoint. Not yet an admitted rules identity. */
import {gcd, heading, rat, cmp, add} from './math.mjs';

export const DIAGONAL_COMPONENT = 22627;
export const REARM_TICKS = Object.freeze([4096n,22627n]);
export const DEFLECTOR_DIRECTIONS = Object.freeze(['NE', 'SE', 'SW', 'NW']);
// Canonical heading increases towards positive y (south). Preserve cannon math;
// the owner's direction/face table takes precedence over its inverted angles.
const ANGLES = Object.freeze([57344, 8192, 24576, 40960]);
export function orientationHeading(orientation){const i=DEFLECTOR_DIRECTIONS.indexOf(orientation);if(i<0)throw Error('deflector orientation');return ANGLES[i];}
export function directionVelocity(orientation) {
  const i = DEFLECTOR_DIRECTIONS.indexOf(orientation);
  if (i < 0) throw new Error('deflector orientation');
  return heading(ANGLES[i], 32000);
}
export function faceVelocity(orientation, face) {
  const normals = {N:[0,-1], E:[1,0], S:[0,1], W:[-1,0]};
  const n = normals[face];
  if (!n) throw new Error('single face required');
  const [x,y] = directionVelocity(orientation), front = x*n[0]+y*n[1] > 0;
  return {front, vx:front?x:-x, vy:front?y:-y};
}
export function canonicalTrajectory(x0, y0, den, vx, vy) {
  if (typeof x0 !== 'bigint' || typeof y0 !== 'bigint' || typeof den !== 'bigint' || den <= 0n
      || !Number.isInteger(vx) || !Number.isInteger(vy) || Math.abs(vx)>65536 || Math.abs(vy)>65536 || !vx&&!vy)
    throw new Error('rational trajectory');
  const g = gcd(gcd(x0,y0),den);
  const b={x0:x0/g,y0:y0/g,den:den/g,vx,vy};
  if(b.den>65536n||[b.x0,b.y0].some(n=>n< -6553600000000000000n||n>6553600000000000000n))throw new Error('trajectory capacity');
  return b;
}
export function exactPosition(b, time) {
  return [rat(b.x0*time[1]+BigInt(b.vx)*time[0]*b.den,b.den*time[1]),
    rat(b.y0*time[1]+BigInt(b.vy)*time[0]*b.den,b.den*time[1])];
}
/** Exact continuation at a real boundary time, with no cell-centre snapping. */
export function redirectAt(b, time, vx, vy) {
  const d=b.den*time[1];
  return canonicalTrajectory(b.x0*time[1]+BigInt(b.vx-vx)*time[0]*b.den,
    b.y0*time[1]+BigInt(b.vy-vy)*time[0]*b.den,d,vx,vy);
}
export function reflectExact(b, axis, wall) {
  const x=axis==='x';
  if (!x&&axis!=='y') throw new Error('reflection axis');
  return canonicalTrajectory(x?2n*BigInt(wall)*b.den-b.x0:b.x0,
    x?b.y0:2n*BigInt(wall)*b.den-b.y0,b.den,x?-b.vx:b.vx,x?b.vy:-b.vy);
}
export function translateExact(b, x, y) {
  return canonicalTrajectory(b.x0+BigInt(x)*b.den,b.y0+BigInt(y)*b.den,b.den,b.vx,b.vy);
}
export function timeAtFace(b, axis, wall) {
  const v=axis==='x'?b.vx:axis==='y'?b.vy:NaN;
  if (!v) throw new Error('no genuine axis crossing');
  return rat(BigInt(wall)*b.den-(axis==='x'?b.x0:b.y0),b.den*BigInt(v));
}
export function assertContinuous(before, after, time) {
  const a=exactPosition(before,time),b=exactPosition(after,time);
  if (a.some((v,i)=>cmp(v,b[i])!==0)) throw new Error('discontinuous contact');
}
/** Provisional resource safeguard: each suppressed turn is an explicit ordinary
 * blocked-face reflection, never a dropped crossing or delayed simulation time.
 * Four tile lengths at canonical diagonal component speed separate active turns.
 */
export function contactResponse(b, time, orientation, face, wall, armedAt=null) {
  const faceAxis=['E','W'].includes(face)?'x':face==='N'||face==='S'?'y':null;
  if(!faceAxis)throw new Error('single face required');
  if(cmp(time,timeAtFace(b,faceAxis,wall))!==0)throw new Error('wrong contact time');
  const normal={N:[0,-1],E:[1,0],S:[0,1],W:[-1,0]}[face];
  if(b.vx*normal[0]+b.vy*normal[1]>=0)throw new Error('not attempting entry');
  if(armedAt&&cmp(time,armedAt)<0){
    const next=reflectExact(b,faceAxis,wall);assertContinuous(b,next,time);
    return{trajectory:next,armed_at:armedAt,kind:'deflector_rearm_reflection'};
  }
  const out=faceVelocity(orientation,face),next=redirectAt(b,time,out.vx,out.vy);
  assertContinuous(b,next,time);
  return{trajectory:next,armed_at:add(time,REARM_TICKS),kind:'deflector_redirect',front:out.front};
}
