import {affordableBalls} from '../../protocol/economy17.mjs';
import {economyAt,observeEconomy} from './economy17.mjs';
import {playerBalls} from './purchases-v6.mjs';
import {prepareReservoir} from './reservoirs.mjs';
import {reservoirCell,reservoirPut} from '../../protocol/reservoir.mjs';
import {prepareContextDeflector} from './context-structures.mjs';
/** Pure v6 command/capture continuations. No ambient clock, IC or Ledger calls. */
import {encodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
import {beginSpawn,beginEntrySpawn,spawnStep} from './spawn.mjs';
import {preparePurchaseClearance,preparePurchase,PurchaseBatch,chooseAdjacent,placeNew} from './purchases-v6.mjs';
import {CaptureJob} from './capture-v6.mjs';
import {finalizeElapsed,V6_POLICY} from './playability.mjs';
import {validateWorld} from './world.mjs';
import{prepareDeflectorPurchase}from'./deflectors-v12.mjs';
const rejected=(c,p,reason)=>c.receipt(p,{reason,status:'rejected',amount_used:0n,remainder:p.amount});
function place(c,p,plan,r){
 const made=placeNew(c.world,p.account,p.amount,plan,r,!!c.v6.entry_rules,!!c.v6.context_rules,!!c.v6.spacing_rules,p.tariff?.multiplier??null),batch=PurchaseBatch.afterNew(p.account,p.amount,made.cannon.id,plan);
 if(p.tariff)batch.economy_multiplier=p.tariff.multiplier;
 c.world=made.world;c.emit(made.event);c.areaDirty=true;
 Object.assign(c.v6,{plan:null,payment:p,batch:{...batch}});c.phase='v6_purchase';
}
function pricingPlan(c,p,reservoir){
 const w=c.world;
 const {current,previous}=economyAt(w.economy,p.recordedNs);
 const tariff=multiplier=>({ledger_recorded_ns:p.recordedNs,multiplier});
 if(reservoir!==null)return [prepareReservoir(w,p.account,p.amount,reservoir),tariff(current)];
 const plan=rate=>prepareContextDeflector(w,p.account,p.amount,p.memo,true,rate)
    ??preparePurchase(w,p.account,p.amount,p.memo,c.moved,true,true,rate);
 const primary=plan(current);
 if(previous===null||previous>=current)return [primary,tariff(current)];
 const older=plan(previous),slots=0xffffffff-w.next_ball_id;
 const count=(candidate,rate)=>{
  if(candidate.kind==='rejected')return 0;
  if(candidate.kind==='new')return 1+affordableBalls(p.amount-candidate.price,rate,playerBalls(w,p.account)+1,Math.min(candidate.quantity-1,slots-1));
  if(candidate.kind==='fire')return affordableBalls(p.amount,rate,playerBalls(w,p.account),Math.min(candidate.quantity,slots));
  return 1;
 };
 return count(older,previous)>count(primary,current)?[older,tariff(previous)]:[primary,tariff(current)];
}

export function workV6(c,readPayment){
 if(c.phase==='commands'){
   if(c.inputIndex===c.inputs.length){c.restartSearch();return true;}
   const p=readPayment(c.inputs[c.inputIndex].payload_hex);if(c.v6.war_cry_rules)c.v6.pending_cry=p.cry||null;
   if(c.world.received_e8s+p.amount>=1n<<128n)throw Error('treasury overflow');
   const reservoir=c.v6.reservoir_rules?reservoirCell(p.memo):null;
   const [economyPlan,tariff]=c.world.version===9?pricingPlan(c,p,reservoir):[];
   const plan=economyPlan??(reservoir!==null?prepareReservoir(c.world,p.account,p.amount,reservoir):c.v6.context_rules?(prepareContextDeflector(c.world,p.account,p.amount,p.memo,!!c.v6.spacing_rules)??preparePurchase(c.world,p.account,p.amount,p.memo,c.moved,true,!!c.v6.spacing_rules)):(c.v6.deflector_rules?prepareDeflectorPurchase(c.world,p.account,p.amount,p.memo):null)??(c.v6.clearance_rules?preparePurchaseClearance:preparePurchase)(c.world,p.account,p.amount,p.memo,c.moved));
   c.world.received_e8s+=p.amount;
   const payment={account:p.account,amount:p.amount,...(tariff?{tariff}:{})};
   if(plan.kind==='rejected')rejected(c,payment,plan.reason);
   else if(plan.kind==='reservoir'){
     c.world.reservoirs=reservoirPut(c.world.reservoirs,plan.cell);
     c.receipt(payment,{reason:'ACCEPTED',kind:'reservoir_built',cell:plan.cell,status:'applied',amount_used:plan.price,remainder:p.amount-plan.price});
   }else if(plan.kind==='deflect'){
     const structure={id:c.world.next_deflector_id++,cell:plan.cell,owner:plan.owner,orientation:plan.orientation};
     c.world.deflectors.push(structure);c.world.deflectors.sort((a,b)=>a.cell-b.cell);
     c.receipt(payment,{reason:'ACCEPTED',kind:'deflector_built',structure:{...structure},status:'applied',amount_used:plan.price,remainder:p.amount-plan.price});
   }else if(plan.kind==='deflector_move'||plan.kind==='deflector_reorient'){
     const structure=c.world.deflectors.find(d=>d.id===plan.id),before={...structure};
     if(plan.kind==='deflector_move'){
       structure.cell=plan.cell;
       c.world.deflectors.sort((a,b)=>a.cell-b.cell);
     }else structure.orientation=plan.orientation;
     c.receipt(payment,{reason:'ACCEPTED',kind:plan.kind==='deflector_move'?'deflector_moved':'deflector_reoriented',before,structure:{...structure},status:'applied',amount_used:plan.price,remainder:p.amount-plan.price});
   }else if(plan.kind==='move'){
     const cannon=c.world.cannons.find(x=>x.id===plan.cannon),before=cannon.cell;cannon.cell=plan.cell;c.moved.push(cannon.id);
     c.receipt(payment,{reason:'ACCEPTED',kind:'cannon_moved',status:'applied',cannon:cannon.id,before,after:plan.cell,amount_used:plan.price,remainder:p.amount-plan.price});
   }else if(plan.kind==='fire'){
     c.v6.batch={...PurchaseBatch.fire(p.account,p.amount,plan),...(tariff?{economy_multiplier:tariff.multiplier}:{})};c.v6.payment=payment;c.phase='v6_purchase';
   }else if(plan.kind==='new'){
     if(c.spawnSearches>=8)rejected(c,payment,'SPAWN_SEARCH_CAPACITY');
     else{
       c.spawnSearches++;const seed=sha256(encodeCanonical({base:c.seedBase,position:BigInt(c.inputs[c.inputIndex].position),cannon:c.world.next_cannon_id}));
       if(plan.first){c.spawnJob=c.v6.entry_rules?beginEntrySpawn(c.world,seed,!!c.v6.spacing_rules):beginSpawn(seed);c.spawnAngle=plan.angle;c.v6.payment=payment;c.v6.plan=plan;c.phase='v6_spawn';}
       else{const cell=plan.cell??chooseAdjacent(c.world,plan.player,seed,!!c.v6.clearance_rules);if(cell===null)rejected(c,payment,'NO_ADJACENT_SITE');else place(c,payment,plan,{cell,patch:[cell],kind:4,other:-1,checked:1});}
     }
   }else throw Error('PURCHASE_PLAN');
 }else if(c.phase==='v6_spawn'){
   if(spawnStep(c.world,c.spawnJob,!!c.v6.spacing_rules)){
     const job=c.spawnJob,payment=c.v6.payment,plan=c.v6.plan;c.spawnJob=null;c.v6.payment=null;c.v6.plan=null;
     if(job.result)place(c,payment,plan,job.result);else{rejected(c,payment,'NO_ELIGIBLE_SPAWN');c.phase='commands';}
   }
 }else if(c.phase==='v6_purchase'){
   const batch=Object.assign(Object.create(PurchaseBatch.prototype),c.v6.batch),l=batch.step(c.world);c.v6.batch={...batch};
   if(l){c.emit({kind:'ball_spawned',cannon:batch.cannon,ball:l.ball,heading:batch.angle,revived:l.revived,reactivated_cannons:l.reactivated,metadata_delta:l.metadata_delta});c.areaDirty=true;}
   if(batch.stop_reason!==null){c.receipt(c.v6.payment,batch.receipt());c.v6.payment=null;c.v6.batch=null;c.phase='commands';}
 }else if(c.phase==='v6_topology'){
   const j=CaptureJob.fromState(c.v6.capture),done=j.step(c.world);c.v6.capture=j.toState();
   if(done){
     for(const f of j.fences){c.v6.births=c.v6.births.filter(old=>old.cannon!==f.cannon);c.v6.births.push(f);}
     const e=j.event();if(c.jobMeta?.strike!==undefined)e.strike=c.jobMeta.strike;
     c.emit(e);c.v6.capture=null;c.jobMeta=null;c.areaDirty=true;c.phase=c.afterTopology;
   }
 }else return false;
 return true;
}
export function captureV6(c,target,ball,after,meta={}){
 c.v6.capture=CaptureJob.capture(c.world,target,ball).toState();c.afterTopology=after;c.jobMeta=meta;c.phase='v6_topology';
}
export function cleanupV6(c,pairs){c.v6.capture=CaptureJob.cleanup(c.world,pairs).toState();c.afterTopology='resolve';c.phase='v6_topology';}
export function finalizeCursorElapsed(c,observedNs){
 if(!c.needsElapsed())throw Error('LIFECYCLE_FINALIZATION_STATE');
 const previous=c.world.playability.elapsed_ns,anchor=c.v6.economy_predecessor;
 const snapshot=anchor?observeEconomy(c.world.economy,previous,observedNs,anchor.population,anchor.state_hash):null;
 const stamped=finalizeElapsed(c.world,observedNs,c.v6.births),deadline=observedNs+V6_POLICY.dormancy_grace_ns;
 for(const e of c.events){
  for(const row of e.metadata_delta?.lifecycle??[])if((e.dormant??[]).some(f=>f.cannon===row.cannon&&f.generation===row.generation)){row.dormant_since_ns=observedNs;row.deadline_ns=deadline;}
  for(const f of e.dormant??[])f.deadline_ns=deadline;
 }
 if(snapshot)c.emit({kind:'economy_snapshot',snapshot});
 c.emit({kind:'lifecycle_time',previous_elapsed_ns:previous,observed_ns:observedNs,stamped});c.v6.finalized=true;validateWorld(c.world);
}

export function validateV6Cursor(c){
 const s=c.v6;
 if(!s||Boolean(s.reservoir_rules)!==(c.world.version>=8)||Boolean(s.economy_predecessor)!==(c.world.version===9)||s.reservoir_rules&&!s.spacing_rules||s.spacing_rules&&!s.shout_rules||s.shout_rules&&!s.context_rules||s.context_rules&&!s.deflector_rules||Boolean(s.deflector_rules)!==(c.world.version>=7)||s.finalized&&c.phase!=='done'||c.world.version<9&&s.births.length>V6_POLICY.max_cannons||new Set(s.births.map(f=>f.cannon)).size!==s.births.length
   ||(s.capture!==null)!==(c.phase==='v6_topology')||(s.batch!==null)!==(c.phase==='v6_purchase')
   ||(s.plan!==null)!==(c.phase==='v6_spawn')||(s.payment!==null)!==['v6_spawn','v6_purchase'].includes(c.phase)
   ||c.phase==='v6_spawn'&&!c.spawnJob||['spawn','topology'].includes(c.phase))throw Error('V6_CURSOR_PHASE');
 if(s.batch){
  Object.assign(Object.create(PurchaseBatch.prototype),s.batch).validate(c.world);
  if(s.batch.economy_multiplier!==s.payment?.tariff?.multiplier)throw Error('ECONOMY_PURCHASE_CONTINUATION');
 }
 if(s.plan&&!(s.plan.kind==='new'&&s.plan.first))throw Error('V6_SPAWN_PLAN');
}
