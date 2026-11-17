import fs from'node:fs';import assert from'node:assert/strict';
import{heading,rat,cmp}from'../packages/kernels/b2z/math.mjs';
import{nextCrossing}from'../packages/kernels/b2z/geometry.mjs';
import{canonicalTrajectory,faceVelocity,redirectAt,reflectExact,translateExact,assertContinuous}from'../packages/kernels/b2z/deflector-boundary.mjs';
export function chain(row){
 const time=BigInt(row.start),[vx,vy]=heading(row.heading,32000);
 let b=canonicalTrajectory(1536n-BigInt(vx)*time,1536n-BigInt(vy)*time,1n,vx,vy),now=rat(time),bound=null,maxDen=1n,maxBits=0,maxTimeBits=0;
 const samples=[];
 for(let n=0;n<row.count;n++){
  const c=nextCrossing({...b,id:1,cell:1001},1000,now,b.den);assert(cmp(c.time,now)>0);const before=b;
  if(c.x&&c.y){b=reflectExact(reflectExact(b,'x',c.xwall),'y',c.ywall);}
  else if(n&&n%7===0)b=reflectExact(b,c.x?'x':'y',c.x?c.xwall:c.ywall);
  else{const face=c.x?(b.vx>0?'W':'E'):(b.vy>0?'N':'S'),v=faceVelocity(['NE','NW','SW','SE'][(n*17)%4],face);b=redirectAt(b,c.time,v.vx,v.vy);if(bound===null)bound=b.den;}
  assertContinuous(before,b,c.time);if(bound!==null)assert(bound%b.den===0n);
  if(n%11===0){const w=translateExact(b,1024000,-1024000);assert.deepEqual(translateExact(w,-1024000,1024000),b);}
  now=c.time;maxDen=b.den>maxDen?b.den:maxDen;
  const bits=v=>(v<0n?-v:v).toString(2).length;
  maxBits=Math.max(maxBits,bits(b.x0),bits(b.y0));maxTimeBits=Math.max(maxTimeBits,bits(now[0]),bits(now[1]));
  if(n%1000===0||n===row.count-1)samples.push({n,x:String(b.x0),y:String(b.y0),den:String(b.den),vx:b.vx,vy:b.vy,time:now.map(String)});
 }
 return{id:row.id,max_den:String(maxDen),max_numerator_bits:maxBits,max_time_bits:maxTimeBits,samples};
}
if(process.argv[2])console.log(JSON.stringify(JSON.parse(fs.readFileSync(process.argv[2])).chains.map(chain)));
