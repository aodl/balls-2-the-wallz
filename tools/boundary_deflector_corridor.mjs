/** Actual shared boundary helper; synthetic four-neighbour contact fixture. */
import fs from 'node:fs';import assert from 'node:assert/strict';
import {rat,cmp,heading,sub}from'../packages/kernels/b2z/math.mjs';
import{nextCrossing}from'../packages/kernels/b2z/geometry.mjs';
import{canonicalTrajectory,contactResponse,faceVelocity,redirectAt,reflectExact,assertContinuous}from'../packages/kernels/b2z/deflector-boundary.mjs';
function run(limit=250000){
 const [vx,vy]=heading(8191,32000);let b=canonicalTrajectory(1536n,1536n,1n,vx,vy),now=rat(0),armed=null,contacts=0,redirects=0,reflections=0,minStep=null;
 const first=[];
 for(;contacts<limit;contacts++){
  const c=nextCrossing({...b,id:1,cell:1001},1000,now,b.den);if(cmp(c.time,rat(1))>=0)break;
  const step=sub(c.time,now);assert(cmp(step,rat(0))>0);
  if(!minStep||cmp(step,minStep)<0)minStep=step;
  const before=b;let kind;
  if(c.x&&c.y){b=reflectExact(reflectExact(b,'x',c.xwall),'y',c.ywall);reflections++;kind='blocked_vertex';}
  else{
   const face=c.x?(b.vx>0?'W':'E'):(b.vy>0?'N':'S'),wall=c.x?c.xwall:c.ywall;
   {const v=faceVelocity('NE',face);b=redirectAt(b,c.time,v.vx,v.vy);kind='deflector_redirect';redirects++;}
  }
  assertContinuous(before,b,c.time);now=c.time;
  if(first.length<12)first.push({time:now.map(String),point_before:[before.x0.toString(),before.y0.toString(),before.den.toString()],kind,vx:b.vx,vy:b.vy});
 }
 return{contacts,redirects,reflections,minimum_step:minStep.map(String),first,last_time:now.map(String),denominator:String(b.den),reached_limit:contacts===limit};
}
const raw=run();
assert(raw.contacts>131072,'negative control must exceed existing event capacity');
const result={status:'EXPECTED_UNSAFE_ADJACENT_LAYOUT',scope:'Synthetic shared boundary helper negative control; this adjacent placement is rejected by current Rules12. Every impact redirects; no rearm fallback.',raw,policy:'Minimum toroidal Chebyshev Deflector spacing2; see paid spacing-rejection and immutable legal diamond vectors.'};
fs.writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({raw_contacts:raw.contacts,status:result.status}));
