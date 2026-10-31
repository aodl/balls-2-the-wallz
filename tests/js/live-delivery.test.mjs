import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PublicationSequence,verifyCertificatePublication,verifyPinnedPublication,verifyRetainedPredecessor} from '@dtr/timeline-runtime/client/verification';
import {certificateVerifier} from '@dtr/timeline-runtime/client/ic-certificate';
import {publication} from '@dtr/timeline-runtime/observation/publication';
import {coordinatorScenario} from '../scenarios/coordinator.mjs';
import {liveDeliveryDiagnostics,liveDeliveryFailure,liveDeliverySuccess,rememberLiveAcceptance} from '../../apps/b2z-observer/live-delivery.mjs';

const base=new URL('../fixtures/observer-delivery/',import.meta.url),capture=JSON.parse(fs.readFileSync(new URL('capture.json',base)));
const bytes=name=>new Uint8Array(fs.readFileSync(new URL(name,base)));
async function fixtures(t){
 // Historical fixture replay at its recorded time. The actual IC root,
 // signatures, delegation, canister binding and freshness checks remain enabled.
 t.mock.timers.enable({apis:['Date'],now:capture.clock_ms});
 const policy={network:'ic',canister_id:capture.backend,now_ns:BigInt(Date.now())*1000000n,max_age_ns:300000000000n,max_future_ns:30000000000n};
 const verify=certificateVerifier({network:'ic'}),tickets={};
 for(const name of ['accepted','rejected','forward'])tickets[name]=await verifyCertificatePublication(bytes(name+'-publication.bin'),bytes(name+'-certificate.bin'),policy,verify);
 return {...tickets,policy,verify};
}
function session(ticket){const sequence=new PublicationSequence();sequence.accept(ticket);return {sequence,retryFailures:0,error:null,deliveryDiagnostics:liveDeliveryDiagnostics()};}
function reject(s,ticket,now=10){
 const floor=s.sequence.last;let error;
 try{s.sequence.accept(ticket);}catch(e){error=e;}
 assert.ok(error,'the original DTR guard must reject');
 const persistent=liveDeliveryFailure(s,error,ticket,floor,now);
 if(persistent)s.error=error;
 assert.equal(s.sequence.last,floor);
 return error;
}

test('captured authentic stale head stays rejected with its exact accepted floor',async t=>{
 const f=await fixtures(t),s=session(f.accepted);assert.equal(f.rejected.publication.head.segment_id,66540n);assert.equal(f.accepted.publication.head.segment_id,66541n);
 assert.match(reject(s,f.rejected).message,/observation rollback/);
 assert.equal(s.retryFailures,1);assert.equal(s.deliveryDiagnostics.active.kind,'stale-certified-observation');
 assert.equal(s.deliveryDiagnostics.history[0].rejected.root,f.rejected.root_hash);assert.equal(s.sequence.last,f.accepted);
});
test('verified current-head recovery clears active stale error and retains history',async t=>{
 const f=await fixtures(t),s=session(f.accepted);reject(s,f.rejected);
 liveDeliverySuccess(s,null,11);assert.equal(s.deliveryError,'observation rollback','no authenticated recovery evidence');
 s.sequence.accept(f.accepted);liveDeliverySuccess(s,f.accepted,12);
 assert.equal(s.deliveryError,null);assert.equal(s.retryFailures,0);assert.equal(s.deliveryDiagnostics.recoveries,1);
 assert.equal(s.deliveryDiagnostics.history[0].message,'observation rollback');assert.equal(s.deliveryDiagnostics.history[0].recovered_at_ms,12);assert.equal(s.deliveryDiagnostics.active,null);
});
test('authenticated retained catch-up and forward recovery preserve the DTR chain',async t=>{
 const f=await fixtures(t),s=session(f.accepted);reject(s,f.rejected);
 const predecessor=await verifyRetainedPredecessor(bytes('forward-predecessor.bin'),f.forward);
 s.sequence.accept(predecessor);s.sequence.accept(f.forward);liveDeliverySuccess(s,s.sequence.last,20);
 assert.equal(s.sequence.last.publication.head.segment_id,66543n);assert.equal(s.deliveryError,null);assert.equal(s.deliveryDiagnostics.history.length,1);
});
test('five persistent regressions retain the existing failure threshold and cannot auto-recover',async t=>{
 const f=await fixtures(t),s=session(f.accepted);
 for(let n=1;n<=5;n++){reject(s,f.rejected,n);assert.equal(Boolean(s.error),n===5);}
 liveDeliverySuccess(s,f.accepted,99);
 assert.ok(s.error);assert.equal(s.deliveryError,'observation rollback');assert.equal(s.deliveryDiagnostics.recoveries,0);assert.equal(s.sequence.last,f.accepted);
 assert.equal(s.deliveryDiagnostics.history.length,5);
});
test('same-height conflict stays rejected and is never cleared as a stale recovery',async()=>{
 // Content-pinned synthetic conflict, explicitly not a fabricated IC certificate.
 const {host}=coordinatorScenario('life'),a=publication(host.publicationRecord(),{render:{format:'test-format-1',bytes:Uint8Array.of(1)}}),b=publication(host.publicationRecord(),{render:{format:'test-format-1',bytes:Uint8Array.of(2)}});
 const good=await verifyPinnedPublication(a.bytes,a.sha256),bad=await verifyPinnedPublication(b.bytes,b.sha256),s=session(good);
 assert.match(reject(s,bad).message,/same-height conflicting/);assert.equal(s.deliveryDiagnostics.active.kind,'delivery-or-verification-error');
 liveDeliverySuccess(s,good,20);assert.match(s.deliveryError,/same-height conflicting/);assert.equal(s.sequence.last,good);
});
test('invalid certificate never reaches acceptance or becomes a recovered stale error',async t=>{
 const f=await fixtures(t),s=session(f.accepted),invalid=bytes('rejected-certificate.bin');invalid[invalid.length-1]^=1;
 let error;try{await verifyCertificatePublication(bytes('rejected-publication.bin'),invalid,f.policy,f.verify);}catch(e){error=e;}
 assert.ok(error);liveDeliveryFailure(s,error,null,s.sequence.last,10);liveDeliverySuccess(s,f.accepted,20);
 assert.equal(s.sequence.last,f.accepted);assert.ok(s.deliveryError);assert.equal(s.deliveryDiagnostics.active.kind,'delivery-or-verification-error');assert.equal(s.deliveryDiagnostics.recoveries,0);
});
test('expired historical certificate remains a failure under the unchanged freshness policy',async t=>{
 const f=await fixtures(t);t.mock.timers.tick(301000);
 await assert.rejects(verifyCertificatePublication(bytes('rejected-publication.bin'),bytes('rejected-certificate.bin'),{...f.policy,now_ns:BigInt(Date.now())*1000000n},f.verify));
});
test('retention availability clears only after authenticated snapshot recovery and retains its history',async t=>{
 const f=await fixtures(t),s=session(f.accepted);s.resyncs=0;rememberLiveAcceptance(s,f.accepted);
 liveDeliveryFailure(s,new Error('publication unavailable: snapshot resync required'),f.forward,f.accepted,1);
 assert.equal(s.deliveryDiagnostics.active.kind,'retained-publication-unavailable');
 liveDeliverySuccess(s,f.accepted,2);assert.ok(s.deliveryError);
 liveDeliverySuccess(s,f.forward,3);assert.ok(s.deliveryError,'a verified response alone is not completed snapshot recovery');
 s.sequence.resync(f.forward);rememberLiveAcceptance(s,f.forward);s.resyncs++;liveDeliverySuccess(s,f.forward,4);
 assert.equal(s.deliveryError,null);assert.equal(s.deliveryDiagnostics.history[0].message,'publication unavailable: snapshot resync required');assert.equal(s.deliveryDiagnostics.history[0].recovered_at_ms,4);assert.equal(s.sequence.last,f.forward);
});
test('availability recovery cannot erase certificate failures or relabel other errors',async t=>{
 const f=await fixtures(t),s=session(f.accepted);s.resyncs=0;rememberLiveAcceptance(s,f.accepted);
 liveDeliveryFailure(s,new Error('certificate verification failed'),null,f.accepted,1);
 liveDeliveryFailure(s,new Error('publication unavailable: snapshot resync required'),f.forward,f.accepted,2);
 s.sequence.resync(f.forward);rememberLiveAcceptance(s,f.forward);s.resyncs++;liveDeliverySuccess(s,f.forward,3);
 assert.equal(s.deliveryError,'certificate verification failed');assert.equal(s.deliveryDiagnostics.history[0].recovered_at_ms,null);
 const other=session(f.accepted);liveDeliveryFailure(other,new Error('publication unavailable: snapshot resync required'),null,f.accepted,1);assert.equal(other.deliveryDiagnostics.active.kind,'delivery-or-verification-error');
});
test('later stale recovery cannot hide an earlier certificate or delivery failure',async t=>{
 const f=await fixtures(t),s=session(f.accepted),failure=new Error('certificate verification failed');
 liveDeliveryFailure(s,failure,null,s.sequence.last,1);
 reject(s,f.rejected,2);s.sequence.accept(f.accepted);liveDeliverySuccess(s,f.accepted,3);
 assert.equal(s.deliveryError,failure.message);assert.equal(s.deliveryDiagnostics.active.kind,'delivery-or-verification-error');
 assert.equal(s.deliveryDiagnostics.history[0].recovered_at_ms,null);assert.equal(s.deliveryDiagnostics.history[1].recovered_at_ms,3);
});
// Diagnostic shape stubs ONLY. They are never passed to the verifier or DTR
// sequence and do not pretend to carry IC certificates. Real signatures and the
// sequence's cross-epoch rejection are exercised by separate tests above/v9.
const diagnosticTicket=(head,epoch)=>({mode:'certificate-verifier',network:'pocketic-local',canister_id:'local-fixture',root_hash:`root-${head}-${epoch}`,publication:{version:9,identity:{source_id:'same-source',rules_hash:'same-rules'},epoch:{transition_hash:epoch},render_format:null,head:{segment_id:BigInt(head)}}});
test('an exact previously accepted older epoch can recover without changing the authenticated floor',()=>{
 const old=diagnosticTicket(5,'old'),current=diagnosticTicket(6,'current'),s={retryFailures:0,error:null,sequence:{last:current},deliveryDiagnostics:liveDeliveryDiagnostics()};rememberLiveAcceptance(s,old);rememberLiveAcceptance(s,current);
 liveDeliveryFailure(s,new Error('observation epoch identity'),old,current,1);assert.equal(s.deliveryDiagnostics.active.kind,'stale-certified-observation');assert.equal(s.sequence.last,current);liveDeliverySuccess(s,current,2);assert.equal(s.deliveryError,null);assert.equal(s.deliveryDiagnostics.history[0].recovered_at_ms,2);assert.equal(s.sequence.last,current);
});
test('unknown epoch, same-height conflict, wrong deployment and certificate errors remain blocking',()=>{
 const old=diagnosticTicket(5,'old'),current=diagnosticTicket(6,'current');
 for(const [message,rejected]of[['observation epoch identity',old],['same-height conflicting observation',diagnosticTicket(6,'conflict')],['observation epoch identity',{...old,canister_id:'wrong-canister'}],['certificate verification failed',null]]){const s={retryFailures:0,error:null,sequence:{last:current},deliveryDiagnostics:liveDeliveryDiagnostics()};rememberLiveAcceptance(s,current);liveDeliveryFailure(s,new Error(message),rejected,current,1);liveDeliverySuccess(s,current,2);assert.equal(s.deliveryDiagnostics.active.kind,'delivery-or-verification-error');assert.equal(s.deliveryError,message);}
});
test('accepted-head context is bounded and verified forward epochs can recover only a known stale failure',()=>{
 const s={retryFailures:0,error:null,deliveryDiagnostics:liveDeliveryDiagnostics()};for(let i=0;i<70;i++)rememberLiveAcceptance(s,diagnosticTicket(i,'old'));assert.equal(s.deliveryDiagnostics.acceptedHeads.length,64);assert.equal(s.deliveryDiagnostics.acceptedEvicted,6);
 const old=diagnosticTicket(68,'old'),current=diagnosticTicket(70,'current'),forward=diagnosticTicket(71,'forward');rememberLiveAcceptance(s,current);s.sequence={last:current};liveDeliveryFailure(s,new Error('observation epoch identity'),old,current,1);rememberLiveAcceptance(s,forward);s.sequence.last=forward;liveDeliverySuccess(s,forward,2);assert.equal(s.deliveryError,null);assert.equal(s.deliveryDiagnostics.recoveries,1);
});
