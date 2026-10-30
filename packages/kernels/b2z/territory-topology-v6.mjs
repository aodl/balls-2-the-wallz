/** Resumable row-span discovery; no million-cell flood arrays. Private proposal only. */
import{ownerAt,neighbors,setOwnerRange,validateWorld}from'./world.mjs';import{territoryPlayer,allocateTerritory,pruneEmptyTerritory}from'./territory-v6.mjs';import{reviveTerritory}from'./playability.mjs';
const has=(rs,c)=>{let a=0,b=rs.length;while(a<b){const m=(a+b)>>1;if(rs[m][0]<=c)a=m+1;else b=m;}return a>0&&c<rs[a-1][1];};
function add(rs,r){let at=0;while(at<rs.length&&rs[at][1]<r[0])at++;while(at<rs.length&&rs[at][0]<=r[1]){const p=rs.splice(at,1)[0];r=[Math.min(p[0],r[0]),Math.max(p[1],r[1])];}rs.splice(at,0,r);}
export function rowRuns(w,y){if(w.version!==6||y<0||y>=w.height)throw Error('ISLAND_ROW');const o=w.ownership,start=y*w.width,end=start+w.width,out=[];let at=start,low=0,high=o.overrides.length;while(low<high){const mid=(low+high)>>1;if(o.overrides[mid].end<=start)low=mid+1;else high=mid;}let change=low;
 while(at<end){while(change<o.overrides.length&&o.overrides[change].end<=at)change++;const r=o.overrides[change];let next,owner;if(r&&r.start<=at){next=Math.min(r.end,end);owner=r.owner;}else{const sx=Math.floor((at%w.width)*32/w.width),sy=Math.floor(y*32/w.height);next=Math.min(start+Math.ceil((sx+1)*w.width/32),end,r?.start??end);owner=o.base[sy*32+sx];}if(next<=at)throw Error('ISLAND_ROW_PROGRESS');const last=out.at(-1);if(last&&last[1]===at&&last[2]===owner)last[1]=next;else out.push([at,next,owner]);at=next;}return out;}
export class Flood{
 constructor(label,seed){Object.assign(this,{label,queue:[seed],head:0,pending:[seed],ranges:[]});}
 enqueue(cell){if(!has(this.ranges,cell)&&!this.pending.includes(cell)){this.pending.push(cell);this.queue.push(cell);}}
 step(w){if(this.head===this.queue.length)return true;const cell=this.queue[this.head++];this.pending=this.pending.filter(c=>c!==cell);if(has(this.ranges,cell))return false;const y=Math.floor(cell/w.width),r=rowRuns(w,y).find(([a,b,id])=>a<=cell&&cell<b&&id===this.label);if(!r)throw Error('ISLAND_FLOOD_CHANGED');const[a,b]=r;add(this.ranges,[a,b]);const x0=a%w.width,x1=b-y*w.width;
 for(const ny of[(y+w.height-1)%w.height,(y+1)%w.height])for(const[c,d,id]of rowRuns(w,ny)){const c0=c%w.width,d1=d-ny*w.width;if(id===this.label&&c0<x1&&x0<d1)this.enqueue(ny*w.width+Math.max(c0,x0));}
 if(x0===0&&ownerAt(w,y*w.width+w.width-1)===this.label)this.enqueue(y*w.width+w.width-1);if(x1===w.width&&ownerAt(w,y*w.width)===this.label)this.enqueue(y*w.width);if(this.head>=1024){this.queue.splice(0,this.head);this.head=0;}if(this.ranges.length>65536||this.queue.length>65536)throw Error('ISLAND_SCRATCH_CAPACITY');return false;}
}
export class SplitJob{
 // Authentication belongs to the enclosing cursor's trusted hash and schema.
 toState(){return structuredClone({...this,flood:this.flood?{...this.flood}:null});}
 static fromState(state){const j=Object.assign(Object.create(SplitJob.prototype),structuredClone(state));if(j.flood)j.flood=Object.assign(Object.create(Flood.prototype),j.flood);return j;}

 constructor(w,label,removed,fill=0){if(ownerAt(w,removed)===label||territoryPlayer(w,label)===undefined||label===fill||fill!==0&&territoryPlayer(w,fill)===undefined)throw Error('ISLAND_SPLIT_CONTEXT');Object.assign(this,{label,fill,seeds:[...new Set(neighbors(removed,w.width,w.height,true).filter(c=>ownerAt(w,c)===label))].sort((a,b)=>a-b),flood:null,parts:[],phase:'discover',part:0,range:0,fences:[],unanchored_balls:[]});}
 step(w){if(this.phase==='discover'){
  if(this.flood){if(this.flood.step(w)){const ranges=this.flood.ranges;this.parts.push({ranges,cannons:w.cannons.filter(c=>has(ranges,c.cell)).map(c=>c.id),balls:w.balls.filter(b=>has(ranges,b.cell)).map(b=>b.id),label:0});this.flood=null;}}
  else{const seed=this.seeds.find(c=>!this.parts.some(p=>has(p.ranges,c)));if(seed!==undefined)this.flood=new Flood(this.label,seed);else{this.parts.sort((a,b)=>(a.cannons[0]??4294967295)-(b.cannons[0]??4294967295)||a.ranges[0][0]-b.ranges[0][0]);this.unanchored_balls=this.parts.filter(p=>!p.cannons.length).flatMap(p=>p.balls).sort((a,b)=>a-b);this.phase=this.unanchored_balls.length?'needs_pair':'assign';}}
 }else if(this.phase==='assign'){const player=territoryPlayer(w,this.label),extra=Math.max(0,this.parts.filter(p=>p.cannons.length).length-1);if(w.playability.next_territory_id+extra>4294967295)throw Error('TERRITORY_ID_EXHAUSTED');let kept=false;for(const p of this.parts){if(!p.cannons.length)p.label=this.fill;else if(!kept){p.label=this.label;kept=true;}else p.label=allocateTerritory(w,player);}if(!kept)throw Error('ISLAND_WITHOUT_CANNON');this.phase='label';
 }else if(this.phase==='label'){if(this.part===this.parts.length){this.phase='reconcile';this.part=0;}else{const p=this.parts[this.part];if(this.range===p.ranges.length){this.range=0;this.part++;}else{const[a,b]=p.ranges[this.range++];if(p.label!==this.label)setOwnerRange(w,a,b,this.label,p.label);}}}
 else if(this.phase==='reconcile'){if(this.part===this.parts.length){validateWorld(w);this.phase='done';}else{const p=this.parts[this.part++];if(p.cannons.length){if(!p.balls.length)this.fences.push(...pruneEmptyTerritory(w,p.label));else reviveTerritory(w,p.label);}}}
 else if(!['done','needs_pair'].includes(this.phase))throw Error('ISLAND_SPLIT_PHASE');return ['done','needs_pair'].includes(this.phase);}
}
