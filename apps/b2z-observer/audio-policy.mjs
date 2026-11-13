/** Pure reference policy, NOT an integrated audio engine. No DOM/network/state mutation.
 * Copy deliberately into maintained source only after reading the implementation brief.
 */
export const LIMITS=Object.freeze({candidateInspections:128,candidates:32,startsPerFrame:2,
 voices:8,wallVoices:6,cannonVoices:2,seenKeys:4096,entityCooldownKeys:512,
 wallRate:4,wallBurst:2,cannonRate:1,cannonBurst:1,totalRate:5,totalBurst:3,
 wallCooldownSeconds:.35,cannonCooldownSeconds:.8,lateSeconds:.1,
 discontinuitySeconds:.25,musicDecodedBytes:32*1024*1024,fxDecodedBytes:4*1024*1024});
export function clamp(x,a,b){return Math.max(a,Math.min(b,x));}
export function smoothstep(a,b,x){if(![a,b,x].every(Number.isFinite)||b<=a)return 0;
 const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);}
// scale is the repository Camera.scale, not device pixels and not fitScale ratio.
export function zoomGain(scale){if(!Number.isFinite(scale)||scale<=0)return 0;
 return smoothstep(12,40,scale*Math.sqrt(2/3));}
export function viewportGain({x,y,width,height,radius=0,occluders=[]}){
 if(![x,y,width,height,radius].every(Number.isFinite)||width<=0||height<=0||radius<0)return 0;
 if(!Array.isArray(occluders)||occluders.length>16)return 0; // malformed/unbounded layout input fails silent
 const inset=clamp(.06*Math.min(width,height),16,48);
 const distance=Math.min(x,y,width-x,height-y)-radius;
 if(distance<=inset)return 0;
 for(const r of occluders){
  if(!r||![r.left,r.right,r.top,r.bottom].every(Number.isFinite)||r.right<r.left||r.bottom<r.top)return 0;
  // Conservative disk bounding square + 8 CSS px clearance; deliberate silence at UI edges.
  const pad=radius+8;
  if(x>=r.left-pad&&x<=r.right+pad&&y>=r.top-pad&&y<=r.bottom+pad)return 0;
 }
 return smoothstep(inset,inset+32,distance);
}
export function reflection(before,after){
 if(!before||!after||before.id!==after.id)return false;
 const valid=k=>Number.isSafeInteger(before[k])&&Number.isSafeInteger(after[k])&&
  (before[k]===after[k]||before[k]===-after[k]);
 return valid('vx')&&valid('vy')&&['vx','vy'].some(k=>before[k]!==0&&after[k]===-before[k]);
}
export function impactPoint(ball,time,width,height,torus=true){
 if(!ball||!Array.isArray(time)||time.length!==2||typeof time[0]!=='bigint'||typeof time[1]!=='bigint'||time[1]<=0n)return null;
 if(![width,height].every(n=>Number.isSafeInteger(n)&&n>0))return null;
 const [n,d]=time;
 function axis(k,v,extent){
  if(typeof ball[k]!=='bigint'||!Number.isSafeInteger(ball[v]))throw Error('bad trajectory');
  let q=ball[k]*d+BigInt(ball[v])*n;
  if(torus){const period=BigInt(extent)*1024n*d;q=((q%period)+period)%period;}
  const result=(Number(q/d)+Number((q%d)*4294967296n/d)/4294967296)/1024;
  if(!Number.isFinite(result))throw Error('unprojectable trajectory');return result;
 }
 try{return{x:axis('x0','vx',width),y:axis('y0','vy',height)};}catch{return null;}
}
export function paceTargetDb(rate){
 if(!Number.isFinite(rate)||rate<0)return -3;
 if(rate===0)return -5; // Apply ONLY after sustained no-progress dwell; see brief.
 const p=clamp(Math.log(clamp(rate,.01,1)/.01)/Math.log(100),0,1);
 return -3+3*p;
}
export function exponentialApproach(current,target,dt,tau){
 if(![current,target,dt,tau].every(Number.isFinite)||dt<=0||tau<=0)return current;
 return target+(current-target)*Math.exp(-dt/tau);
}
export class TokenBucket{
 constructor(rate,burst,now=0){if(![rate,burst,now].every(Number.isFinite)||rate<=0||burst<1)throw Error('bucket config');
  this.rate=rate;this.burst=burst;this.tokens=burst;this.at=now;}
 refill(now){if(!Number.isFinite(now)||now<this.at)return false;
  this.tokens=Math.min(this.burst,this.tokens+(now-this.at)*this.rate);this.at=now;return true;}
 available(now,cost=1){return Number.isFinite(cost)&&cost>0&&this.refill(now)&&this.tokens+1e-9>=cost;}
 take(now,cost=1){if(!this.available(now,cost))return false;this.tokens=Math.max(0,this.tokens-cost);return true;}
}
/** Evict oldest keys individually; never clear all keys on capacity. Cursor fences
 * are still mandatory: this is a secondary guard, NOT complete replay protection. */
export class BoundedSeen{
 constructor(cap=4096,ttl=60){if(!Number.isSafeInteger(cap)||cap<1||!Number.isFinite(ttl)||ttl<=0)throw Error('seen config');
  this.cap=cap;this.ttl=ttl;this.keys=new Map();}
 consume(key,now){if(typeof key!=='string'||!Number.isFinite(now))return false;
  const old=this.keys.get(key);if(old!==undefined&&now-old<=this.ttl)return false;
  this.keys.delete(key);this.keys.set(key,now);
  while(this.keys.size>this.cap)this.keys.delete(this.keys.keys().next().value);
  return true;}
}

/** Committed atomically only after all budgets and spatial predicates pass. */
export class SoundBudget{
 constructor(){this.total=new TokenBucket(5,3);this.wall=new TokenBucket(4,2);this.cannon=new TokenBucket(1,1);this.entities=new Map();this.bins=new Map();}
 available(cue,bin,now){const cls=this[cue.kind],key=`${cue.kind}/${cue.entity}`,spatial=`${cue.kind}/${bin}`,cooldown=cue.kind==='wall'?.35:.8;
  if(now-(this.entities.get(key)??-Infinity)<cooldown||now-(this.bins.get(spatial)??-Infinity)<.15||!this.total.available(now)||!cls.available(now))return false;
  return true;
 }
 accept(cue,bin,now){if(!this.available(cue,bin,now))return false;const cls=this[cue.kind],key=`${cue.kind}/${cue.entity}`,spatial=`${cue.kind}/${bin}`;
  this.total.take(now);cls.take(now);this.entities.delete(key);this.entities.set(key,now);while(this.entities.size>512)this.entities.delete(this.entities.keys().next().value);this.bins.set(spatial,now);return true;
 }
}
export class MusicPresence{
 constructor(){this.db=-3;this.idle=0;this.dwell=0;this.samples=[];}
 sample(delta,dt,{continuous=true,failed=false,original=false}={}){
  if(!Number.isFinite(dt)||dt<=0||dt>.25||!continuous){this.samples.length=0;return this.db;}
  this.samples.push([delta,dt]);if(this.samples.length>120)this.samples.shift();let ticks=0,seconds=0;
  for(let i=this.samples.length-1;i>=0&&seconds<1;i--){ticks+=this.samples[i][0];seconds+=this.samples[i][1];}
  this.idle=delta>0?0:this.idle+dt;const target=original?0:failed?-9:this.idle>8?-5:paceTargetDb(seconds?ticks/seconds:0);
  if(!failed&&!original&&this.idle>0&&this.idle<=8)return this.db;
  this.dwell+=dt;if(Math.abs(target-this.db)>=.5&&this.dwell>=.5){this.db=exponentialApproach(this.db,target,dt,failed?3:target>this.db?9:17);}return this.db;
 }
}
