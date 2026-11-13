/** Presentation-only. Never imported by the kernel, verifier or event projection. */
import {LIMITS,reflection,impactPoint,BoundedSeen} from './audio-policy.mjs';
export function publicationAudioDescriptor(ticket,recording){
 const p=ticket.publication;return Object.freeze({namespace:`${recording.network??'offline'}/${recording.canister_id??recording.id}`,root:ticket.root_hash,
 identity:JSON.stringify(p.identity??{},Object.keys(p.identity??{}).sort()),segment:String(p.head.segment_id)});
}
export class DisplayedAudioEvents{
 constructor(){this.limit=128;this.observations={frames:0,lateFrames:0,disabled:0,inspected:0,classified:0};this.rows=[];this.seen=new BoundedSeen();this.generation=0;this.frame=0;this.fence=Infinity;this.stats={inspected:0,retained:0,dropped:0};}
 arm(time){this.reset();this.fence=time;}
 reset(){this.generation++;this.rows.length=0;this.enabled=false;this.fence=Infinity;}
 begin({enabled,previous,time,elapsed,now}){this.observations.frames++;if(elapsed>.25)this.observations.lateFrames++;if(!enabled)this.observations.disabled++;this.rows.length=0;this.frame++;this.stats={inspected:0,retained:0,dropped:0};this.previous=previous;this.time=time;this.elapsed=elapsed;this.now=now;this.wallInspections=0;this.launchInspections=0;this.launchSeen=0;this.wallLimit=Math.floor(this.limit*.75);this.launchLimit=this.limit-this.wallLimit;this.firstLaunches=Math.min(8,Math.max(1,Math.floor(this.launchLimit/2)));this.enabled=Boolean(enabled&&elapsed>0&&elapsed<=.25&&time>=previous&&Number.isFinite(this.fence));}
 prepare(e,view,descriptor,index,count){
  if(!this.enabled||!descriptor)return null;
  const wall=e.kind==='trajectory',launch=e.kind==='ball_spawned'||e.kind==='cannon_spawned';if(!wall&&!launch)return null;
  // Constant work per mandatory event; stratify before trajectory math/allocation.
  if(wall){const stride=Math.max(1,Math.ceil(count/this.wallLimit));if(this.wallInspections>=this.wallLimit||(index+this.frame)%stride)return null;this.wallInspections++;}
  else{this.launchSeen++;if(this.launchInspections>=this.launchLimit||this.launchSeen>this.firstLaunches&&(index+this.frame)%Math.max(1,Math.ceil(count/(this.launchLimit-this.firstLaunches))))return null;this.launchInspections++;}
  this.stats.inspected++;this.observations.inspected++;const t=Number(e.time[0])/Number(e.time[1]);if(!Number.isFinite(t))return null;if(t<=this.fence)return null;
  const fraction=this.time>this.previous?Math.max(0,Math.min(1,(t-this.previous)/(this.time-this.previous))):1;
  if((1-fraction)*this.elapsed>LIMITS.lateSeconds)return null;
  let entity,point,kind;
  if(wall){const b=view.balls.get(e.ball.id);if(!reflection(b,e.ball))return null;point=impactPoint(b,e.time,view.width,view.height,view.torus);entity=b.id;kind='wall';}
  else{const c=e.kind==='cannon_spawned'?e.cannon:view.cannons.get(view.version===6?e.cannon:e.ball.owner);if(!c)return null;entity=c.id;point={x:c.cell%view.width+.5,y:Math.floor(c.cell/view.width)+.5};kind='cannon';}
  if(!point)return null;this.observations.classified++;return Object.freeze({kind,entity,...point,width:view.width,height:view.height,torus:view.torus,time:t,key:`${descriptor.namespace}/${descriptor.identity}/${descriptor.root}/${descriptor.segment}/${e.sequence}/${kind}/${entity}`,volley:`${entity}/${e.time[0]}/${e.time[1]}`});
 }
 accept(cue){if(!cue)return; // Launches displace wall candidates, but allocation is always bounded.
  if(this.rows.length<Math.min(32,this.limit))this.rows.push(cue);else if(cue.kind==='cannon'){const i=this.rows.findIndex(c=>c.kind==='wall');if(i>=0)this.rows[i]=cue;else this.stats.dropped++;}else this.stats.dropped++;this.stats.retained=this.rows.length;
 }
 take(){const rows=this.rows;this.rows=[];return rows.filter(c=>this.seen.consume(c.key,this.now));}
 fail(){this.rows.length=0;this.enabled=false;}
}
