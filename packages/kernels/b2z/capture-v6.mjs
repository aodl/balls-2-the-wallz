/** Atomic capture proposals; continuation authentication belongs to the cursor.
 * Pair one live attacker/defender and cancel the whole transfer. Other balls
 * survive, and dormancy depends only on the current island pool. */
import {ownerAt,playerAt,neighbors,setOwner,validateWorld,validStrike,position} from './world.mjs';
import {SplitJob,rowRuns} from './territory-topology-v6.mjs';
import {territoryPlayer,territoryBalls,pruneEmptyTerritory,mergeTerritories} from './territory-v6.mjs';
import {reviveTerritory,metadataDelta} from './playability.mjs';

export class CaptureJob {
  constructor(w) {
    if(w.version!==6)throw Error('EXPECTED_V6');
    Object.assign(this,{phase:'cleanup',proposal:structuredClone(w),split:null,ball:null,target:null,
      attacker:0,root:0,affected:[],at:0,ranges:[],row:0,merge_ids:[],pairs:[],fences:[],
      reactivated:[],operations:[],cancelled_strikes:[],metadata_delta:null});
  }
  toState(){return structuredClone({...this,split:this.split?.toState()??null});}
  static fromState(s){const j=Object.assign(Object.create(CaptureJob.prototype),structuredClone(s));if(j.split)j.split=SplitJob.fromState(j.split);return j;}
  static capture(w,target,ball){
    const b=w.balls.find(b=>b.id===ball);if(!b)throw Error('CAPTURE_BALL');
    const root=ownerAt(w,b.cell);
    if(!Number.isInteger(target)||target<0||target>=w.width*w.height||playerAt(w,target)===b.owner
        ||w.cannons.some(c=>c.cell===target)||!neighbors(target,w.width,w.height,true).some(c=>ownerAt(w,c)===root))throw Error('INVALID_CAPTURE');
    const j=new CaptureJob(w);Object.assign(j,{ball,target,attacker:b.owner,root});
    const defender=w.balls.filter(d=>d.cell===target&&d.owner!==b.owner).sort((a,b)=>a.id-b.id)[0];
    if(defender){j.pair(w,[[ball,defender.id]]);return j;}
    const previous=ownerAt(w,target);setOwner(j.proposal,target,root);
    j.operations.push({kind:'set_range',start:target,end:target+1,from:previous,to:root});
    j.ranges.push([target,target+1]);j.merge_ids=[root];j.phase=previous?'split':'merge_scan';
    if(previous)j.split=SplitJob.forCapture(j.proposal,previous,target,root);
    return j;
  }
  static cleanup(w,pairs){const j=new CaptureJob(w);j.pair(w,pairs);return j;}
  pair(w,pairs){
    const killed=new Set(),affected=new Set();
    this.proposal=structuredClone(w);this.operations=[];this.fences=[];this.reactivated=[];this.pairs=[];
    for(const ids of pairs){
      const a=w.balls.find(b=>b.id===ids[0]),b=w.balls.find(b=>b.id===ids[1]);
      if(!a||!b)throw Error('PAIR_BALL');
      if(a.owner===b.owner||killed.has(a.id)||killed.has(b.id)||a.id===b.id)throw Error('INVALID_DESTRUCTION_PAIR');
      killed.add(a.id);killed.add(b.id);affected.add(ownerAt(w,a.cell));affected.add(ownerAt(w,b.cell));
      this.pairs.push({balls:[...ids],positions:[position(a,w.time),position(b,w.time)]});
    }
    this.proposal.balls=this.proposal.balls.filter(b=>!killed.has(b.id));
    this.proposal.pending=this.proposal.pending.filter(p=>!killed.has(p.ball));
    this.cancelled_strikes=w.pending.filter(p=>killed.has(p.ball)).map(p=>p.id);
    this.affected=[...affected].sort((a,b)=>a-b);this.at=0;this.phase='cleanup';this.split=null;
  }
  step(original){
    const w=this.proposal;
    if(this.phase==='split'){
      const j=this.split,done=j.step(w);this.operations.push(...j.takeOperations());
      if(done){
        if(j.phase==='needs_pair'){const d=j.unanchored_balls[0];if(d===undefined)throw Error('MISSING_CAPTURE_PAIR');this.pair(original,[[this.ball,d]]);}
        else{this.fences.push(...j.fences);for(const p of j.parts)if(!p.cannons.length)this.ranges.push(...p.ranges);this.split=null;this.phase='merge_scan';}
      }
    }else if(this.phase==='cleanup'){
      if(this.at===this.affected.length)this.phase='commit';
      else{const id=this.affected[this.at++];if(territoryPlayer(w,id)!==undefined&&territoryBalls(w,id)===0){
        const cells=w.cannons.filter(c=>ownerAt(w,c.cell)===id).map(c=>c.cell);
        this.fences.push(...pruneEmptyTerritory(w,id));this.operations.push({kind:'clear',owner:id},...cells.map(cell=>({kind:'set',cell,owner:ownerAt(w,cell)})));
      }}
    }else if(this.phase==='merge_scan'){
      if(this.at===this.ranges.length){this.merge_ids.sort((a,b)=>a-b);this.root=this.merge_ids[0];this.phase='merge';}
      else{
        const[a,b]=this.ranges[this.at],start=Math.max(a,this.row),y=Math.floor(start/w.width),end=Math.min(b,(y+1)*w.width),x0=start%w.width,x1=end-y*w.width;
        const add=id=>{if(territoryPlayer(w,id)===this.attacker&&!this.merge_ids.includes(id))this.merge_ids.push(id);};
        for(const cell of[y*w.width+(x0+w.width-1)%w.width,y*w.width+x1%w.width])add(ownerAt(w,cell));
        for(const ny of[(y+w.height-1)%w.height,(y+1)%w.height])for(const[c,d,id]of rowRuns(w,ny))if(c%w.width<x1&&x0<d-ny*w.width)add(id);
        if(end===b){this.at++;this.row=0;}else this.row=end;
      }
    }else if(this.phase==='merge'){
      const id=this.merge_ids.find(id=>id!==this.root);
      if(id!==undefined){mergeTerritories(w,[this.root,id]);this.operations.push({kind:'relabel',from:id,to:this.root});this.merge_ids=this.merge_ids.filter(n=>n!==id);}
      else{this.reactivated=reviveTerritory(w,this.root);this.phase='commit';}
    }else if(this.phase==='commit'){
      w.pending=w.pending.filter(p=>{if(validStrike(w,p))return true;this.cancelled_strikes.push(p.id);return false;});validateWorld(w);
      this.metadata_delta=metadataDelta(original.playability,w.playability);
      for(const key of Object.keys(original))delete original[key];Object.assign(original,w);this.phase='done';
    }else if(this.phase!=='done')throw Error('CAPTURE_PHASE');
    if(this.operations.length>65536)throw Error('CAPTURE_OPERATION_CAPACITY');
    return this.phase==='done';
  }
  event(){
    if(this.phase!=='done')throw Error('INCOMPLETE_CAPTURE');
    return{kind:this.target===null?'annihilation_cleanup':this.pairs.length?'capture_annihilation':'capture',target:this.target,ball:this.ball,attacker:this.attacker,
      cancelled_capture:this.target!==null&&this.pairs.length>0,pairs:this.pairs,ownership_ops:this.operations,dormant:this.fences,
      reactivated_cannons:this.reactivated,cancelled_strikes:this.cancelled_strikes,metadata_delta:this.metadata_delta};
  }
}
