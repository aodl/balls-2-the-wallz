/** Diagnostics only: certificate verification and PublicationSequence own trust. */
export function liveDeliveryDiagnostics(){return {failures:0,recoveries:0,evicted:0,active:null,blocking:null,history:[],acceptedHeads:[],acceptedEvicted:0};}
function observation(ticket){
 if(!ticket)return null;
 const p=ticket.publication;
 return {mode:ticket.mode,network:ticket.network,canister:ticket.canister_id,version:p.version,identity:{...p.identity},epoch:p.epoch?.transition_hash??null,format:p.render_format,
  head:p.head.segment_id===null?null:String(p.head.segment_id),root:ticket.root_hash,certificate_time_ns:ticket.certificate_time_ns===undefined?null:String(ticket.certificate_time_ns)};
}
function sameContext(a,b){
 return a&&b&&a.mode===b.mode&&a.network===b.network&&a.canister===b.canister&&a.version===b.version&&a.epoch===b.epoch&&a.format===b.format
  &&Object.keys(a.identity).length===Object.keys(b.identity).length&&Object.keys(a.identity).every(k=>a.identity[k]===b.identity[k]);
}
export function rememberLiveAcceptance(s,ticket){
 const d=s.deliveryDiagnostics??=liveDeliveryDiagnostics(),row=observation(ticket);if(!row)return;
 if(d.acceptedHeads.at(-1)?.root!==row.root)d.acceptedHeads.push(row);
 if(d.acceptedHeads.length>64){d.acceptedHeads.shift();d.acceptedEvicted++;}
}
const sameDeployment=(a,b)=>a&&b&&a.mode===b.mode&&a.network===b.network&&a.canister===b.canister&&a.identity.source_id===b.identity.source_id;
const known=(d,row)=>d.acceptedHeads.some(old=>old.root===row.root&&old.head===row.head&&sameContext(old,row));
export function liveDeliveryFailure(s,error,current,accepted,now){
 const d=s.deliveryDiagnostics??=liveDeliveryDiagnostics(),message=String(error?.message??error).slice(0,160),rejected=observation(current),floor=observation(accepted);
 // Called only after the original verifier/sequence guard throws. Classification
 // neither accepts the ticket nor catches/weakens any authentication invariant.
 const ordinary=message==='observation rollback'&&sameContext(rejected,floor);
 // Across an epoch, recognise only an EXACT head this session already accepted.
 // Unknown identities/chains and same-height conflicts remain blocking errors.
 const olderEpoch=['observation epoch identity','observation epoch changed','observation epoch rollback'].includes(message)&&sameDeployment(rejected,floor)&&known(d,rejected);
 const stale=(ordinary||olderEpoch)&&rejected.mode==='certificate-verifier'&&rejected.head!==null&&floor.head!==null&&BigInt(rejected.head)<BigInt(floor.head);
 const unavailable=message==='publication unavailable: snapshot resync required'&&sameContext(rejected,floor)&&rejected.mode==='certificate-verifier'&&rejected.head!==null&&floor.head!==null&&BigInt(rejected.head)>BigInt(floor.head);
 const event={id:++d.failures,at_ms:now,message,kind:stale?'stale-certified-observation':unavailable?'retained-publication-unavailable':'delivery-or-verification-error',rejected,accepted:floor,resynchronisations:s.resyncs??0,recovered_at_ms:null};
 if(!stale&&!unavailable)d.blocking??=event;
 d.active=event;d.history.push(event);if(d.history.length>64){d.history.shift();d.evicted++;}
 s.deliveryError=message;s.retryFailures++;
 return s.retryFailures>=5; // Preserve the existing persistent-failure threshold.
}
export function liveDeliverySuccess(s,verifiedAccepted,now){
 s.retryFailures=0;
 const d=s.deliveryDiagnostics,event=d?.active,ticket=observation(verifiedAccepted);
 // Availability is recovered only after the existing artifact verification and
 // authenticated snapshot-resync path completes. An unchanged head, ordinary
 // retry success, invalid certificate or conflicting chain cannot clear it.
 if(!s.error&&event?.kind==='retained-publication-unavailable'&&sameContext(ticket,event.rejected)&&ticket.head!==null&&BigInt(ticket.head)>=BigInt(event.rejected.head)&&(s.resyncs??0)>event.resynchronisations&&s.sequence?.last?.root_hash===ticket.root&&known(d,ticket)){
  event.recovered_at_ms=now;d.recoveries++;d.active=d.blocking;s.deliveryError=d.blocking?.message??null;return;
 }
 const forwardEpoch=ticket&&sameDeployment(ticket,event?.accepted)&&known(d,event.accepted)&&s.sequence?.last?.root_hash===ticket.root;
 if(s.error||event?.kind!=='stale-certified-observation'||!(sameContext(ticket,event.accepted)||forwardEpoch)||ticket.head===null)return;
 const head=BigInt(ticket.head),floor=BigInt(event.accepted.head);
 if(head<floor||head===floor&&ticket.root!==event.accepted.root)return;
 event.recovered_at_ms=now;d.recoveries++;d.active=d.blocking;s.deliveryError=d.blocking?.message??null;
 // Keep the original event/context in bounded history, including after recovery.
}
