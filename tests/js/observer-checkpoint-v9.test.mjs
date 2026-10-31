/** Exact content/ordering tests. IC authenticity is covered by the installed gate. */
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {TimelineCoordinator} from '@dtr/timeline-runtime/runtime/coordinator';
import {publication} from '@dtr/timeline-runtime/observation/publication';
import {encodeCanonical,decodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
import {hex,unhex} from '@dtr/timeline-runtime/protocol/bytes';
import {PublicationSequence,verifyPinnedPublication} from '@dtr/timeline-runtime/client/verification';
import {PlayoutClock} from '@dtr/timeline-runtime/client/playout';
import {B2zKernel} from '../../packages/kernels/b2z/kernel.mjs';
import {PRELAUNCH_IDENTITY,TORUS_IDENTITY,MILLION_IDENTITY,PLAYABILITY_IDENTITY,decodeWorld,encodeWorld} from '../../packages/kernels/b2z/world.mjs';
import {stageTorusMigration,stageMillionWorld} from '../../packages/kernels/b2z/migration.mjs';
import {migratePlayability,dueFences} from '../../packages/kernels/b2z/playability.mjs';
import {expireV6} from '../../packages/kernels/b2z/lifecycle-v6.mjs';
import {prepareCheckpoint,CheckpointPlayer,B2zView} from '../../apps/b2z-observer/model.mjs';
import {Camera} from '../../apps/b2z-observer/camera.mjs';
import {cannonReference,idleArena} from '../../apps/b2z-observer/play-reference.mjs';
import {V6_POLICY} from '../../packages/kernels/b2z/playability.generated.mjs';
const old=JSON.parse(fs.readFileSync(new URL('../fixtures/b2z-torus-v4.json',import.meta.url)));
const life=JSON.parse(fs.readFileSync(new URL('../fixtures/lifecycle-v6.json',import.meta.url)));
const source_id='11'.repeat(32),identity=i=>({source_id,...i});
const output=(state,version,events=[])=>({state,events:encodeCanonical({version,receipts:[],events}),scores:encodeCanonical({version,area_time:[]})});
function apply(host,out,id,metadata,checkpoint=false){const epoch=checkpoint?host.prepareCheckpoint(out,sha256(metadata)):host.prepareTransition(id,out,sha256(metadata));host.apply({kind:'transition',epoch,state_hex:hex(out.state),event_hex:hex(out.events),score_hex:hex(out.scores)});return publication(host.publicationRecord()).data;}
function finish(host,end){host.seal(end);while(host.status().phase==='running')host.advance(512);host.publish(host.status().ready_hash);}
function activation(dormantFixture=false){
 const host=TimelineCoordinator.create(unhex(old.migration.old_hex),identity(PRELAUNCH_IDENTITY),{logical_start:0n,source_from:0n},B2zKernel);finish(host,1n);
 const m=stageTorusMigration(unhex(host.committed().state_hex),{source_cursor:0n,ledger_cutover:0n,account_history_complete_through:0n,index_synced:0n,source_anchor:host.committed().seal.source_anchor,identity:identity(PRELAUNCH_IDENTITY)});
 apply(host,output(m.state,4),identity(TORUS_IDENTITY),encodeCanonical(m.transition));finish(host,2n);
 apply(host,output(stageMillionWorld(unhex(host.committed().state_hex)),5),identity(MILLION_IDENTITY),encodeCanonical({migration:'v4-to-v5'}));finish(host,3n);
 const prior=publication(host.publicationRecord()).data,initial=unhex(host.committed().state_hex),w=decodeWorld(initial),observed_ns=9007199254740993n,next=dormantFixture?decodeWorld(unhex(life.previous_state_hex)):migratePlayability(w,observed_ns);next.time=w.time;const state=encodeWorld(next);
 const context={version:3,migration:'B2Z_PLAYABILITY_FROM_V5_01',old_identity:prior.identity,new_identity:identity(PLAYABILITY_IDENTITY),previous_state:sha256(initial),new_state:sha256(state),logical_boundary:w.time,source_cursor:0n,ledger_cutover:0n,account_history_complete_through:0n,index_synced:0n,source_anchor:host.committed().seal.source_anchor,observed_ns,memo_adapter_before:3,memo_adapter_after:4};
 const artifacts=output(state,6,[{kind:'rules_activated',sequence:0,time:w.time,context}]),p=apply(host,artifacts,identity(PLAYABILITY_IDENTITY),encodeCanonical(context));return{host,prior,initial,artifacts,p};
}
function expiry(){
 // The dormant predecessor is synthetic. Only the following expiry is validated
 // as an application transition; this fixture does not qualify v5 migration.
 const {host}=activation(true),before=unhex(host.committed().state_hex),current=decodeWorld(before),at=BigInt(life.observed_ns),prior=publication(host.publicationRecord()).data;
 const r=expireV6(current,at,dueFences(current,at)),p=apply(host,r.output,null,r.metadata,true);return{host,prior,initial:before,artifacts:r.output,p};
}
const rebind=(p,a)=>({...p,head:{...p.head,state_hash:sha256(a.state)},artifacts:p.artifacts.map(d=>({...d,sha256:sha256(a[d.kind])}))});
test('the third authenticated epoch hands v5 to v6 at one buffered boundary without camera reset',async()=>{
 const {prior,initial,artifacts,p}=activation();assert.equal(p.version,8);assert.equal(p.epoch.transition_index,3n);
 const sequence=new PublicationSequence();for(const raw of[prior,p]){const bytes=encodeCanonical(raw);sequence.accept(await verifyPinnedPublication(bytes,sha256(bytes)));}
 const segment=await prepareCheckpoint(initial,artifacts,p,prior),clock=new PlayoutClock({start:2,target:.25,low:.1});clock.append(2,3);
 const before=clock.state(),player=new CheckpointPlayer(segment),camera=new Camera();camera.configure(1000,1000,390,844,true);camera.centre(425,525);camera.scale*=2;const position=[camera.x,camera.y,camera.scale];
 // Marker admission accounts bytes but adds no logical duration. Visibility waits.
 assert.equal(segment.start,3);assert.deepEqual(clock.state(),before);assert.throws(()=>player.advance(2.9),/boundary/);
 const visible=player.advance(3);assert.equal(visible.version,6);visible.matches(decodeWorld(artifacts.state));assert.deepEqual([camera.x,camera.y,camera.scale],position);assert.equal(segment.bytes,Object.values(artifacts).reduce((n,b)=>n+b.length,0));
});
test('an idle expiry checkpoint removes markers at the same verified time and keeps score/payment facts',async()=>{
 const{prior,initial,artifacts,p}=expiry(),segment=await prepareCheckpoint(initial,artifacts,p,prior),view=new CheckpointPlayer(segment).advance(segment.end),before=decodeWorld(initial),after=decodeWorld(artifacts.state);assert.equal(p.version,9);assert.equal(p.epoch.version,3);assert.equal(view.cannons.size,0);assert.deepEqual(after.time,before.time);assert.deepEqual(after.credits,before.credits);assert.equal(after.received_e8s,before.received_e8s);
});
test('a delayed preceding checkpoint cannot replace the accepted monotonic head',async()=>{
 const{prior,p}=expiry(),sequence=new PublicationSequence(),ticket=async raw=>verifyPinnedPublication(encodeCanonical(raw),sha256(encodeCanonical(raw)));const oldTicket=await ticket(prior),newTicket=await ticket(p);sequence.accept(oldTicket);sequence.accept(newTicket);assert.throws(()=>sequence.accept(oldTicket),/rollback|successor|order|epoch identity/);assert.equal(sequence.last.root_hash,newTicket.root_hash);
});
test('checkpoint context, artifact, paid-state and complete-deadline checks fail closed',async()=>{
 const x=expiry();await assert.rejects(prepareCheckpoint(x.initial,{...x.artifacts,events:x.artifacts.events.slice(1)},x.p,x.prior));
 const changed=decodeWorld(x.artifacts.state);changed.received_e8s++;let a={...x.artifacts,state:encodeWorld(changed)};await assert.rejects(prepareCheckpoint(x.initial,a,rebind(x.p,a),x.prior),/preserved received/);
 const e=decodeCanonical(x.artifacts.events);e.events[0].context.fences=[];a={...x.artifacts,events:encodeCanonical(e)};const p={...rebind(x.p,a),epoch:{...x.p.epoch,metadata_hash:sha256(encodeCanonical(e.events[0].context))}};await assert.rejects(prepareCheckpoint(x.initial,a,p,x.prior),/complete due/);
 const y=activation(),w=decodeWorld(y.artifacts.state);w.playability.next_player_id++;a={...y.artifacts,state:encodeWorld(w)};await assert.rejects(prepareCheckpoint(y.initial,a,rebind(y.p,a),y.prior),/preserved entities/);
});
test('v6 references price the current island pool and dormant-only state can drain its final buffer',()=>{
 const w=decodeWorld(unhex(life.previous_state_hex)),config={...V6_POLICY,ball_base_e8s:10000000n},c=cannonReference(w,config)[0];assert.equal(c.balls,0);assert.equal(c.dormant,true);assert.equal(c.next_ball_e8s,10000000n);
 const status={run:{running:true,idle:true,last_error:[]},source:{binding_checked:true,last_error:[]}};assert.equal(idleArena(status,w),true);const v=new B2zView(w);assert.equal(v.cannons.size,w.cannons.length);
});
