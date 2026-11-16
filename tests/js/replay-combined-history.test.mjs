/** Controlled coordinator history; real Rust/IC parity is the installed-game gate. */
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {TimelineCoordinator} from '@dtr/timeline-runtime/runtime/coordinator';
import {publication} from '@dtr/timeline-runtime/observation/publication';
import {encodeCanonical,decodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {hex,unhex} from '@dtr/timeline-runtime/protocol/bytes';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
import {ENTRY_IDENTITY,COMBINED_IDENTITY,decodeWorld} from '../../packages/kernels/b2z/world.mjs';
import {B2zKernel} from '../../packages/kernels/b2z/kernel.mjs';
import {replayHistory} from '../../tools/lib/replay_s14_history.mjs';
function history(detail=false){
 const vector=JSON.parse(fs.readFileSync(new URL('../fixtures/clearance-v9.json',import.meta.url))),state=unhex(vector.rows[0].initial_hex),identity={...ENTRY_IDENTITY,source_id:'ab'.repeat(32)};let elapsed=0n;
 const wrap=c=>({step(n){const r=c.step(n);if(r.complete&&c.needsElapsed())c.finalizeElapsed(elapsed);return r;},snapshot:()=>c.snapshot(),result:()=>c.result(),cursor:c});
 const kernel={begin:(...a)=>wrap(B2zKernel.begin(...a)),restore:(...a)=>wrap(B2zKernel.restore(...a)),fork:c=>wrap(B2zKernel.fork(c.cursor))},h=TimelineCoordinator.create(state,identity,{logical_start:0n,source_from:0n,source_anchor:'00'.repeat(32)},kernel),trace={status:'PASS',initial_world_hex:hex(state),inputs:[],assigned:[],publications:[],artifact_events:[]};
 const record=()=>{const p=publication(h.publicationRecord()).data;trace.publications.push(p);trace.artifact_events.push({segment_id:p.head.segment_id,events_hex:h.committed().event_hex});};
 const segment=t=>{elapsed=decodeWorld(state).playability.elapsed_ns+t*1000000000n;h.ingestOrdered(0n,0n,[],'00'.repeat(32));h.seal(t);while(h.status().phase==='running')h.advance(23);h.publish(h.status().ready_hash);record();};
 segment(1n);const before=unhex(h.committed().state_hex),world=decodeWorld(before),next={...COMBINED_IDENTITY,source_id:identity.source_id},context={version:7,migration:'B2Z_CLEARANCE_WAR_CRY_RULES_11',old_identity:identity,new_identity:next,previous_state:sha256(before),new_state:sha256(before),logical_boundary:world.time,source_cursor:0n,ledger_cutover:0n,account_history_complete_through:0n,index_synced:0n,source_anchor:h.committed().seal.source_anchor,memo_adapter_before:4,memo_adapter_after:6},out={state:before,events:encodeCanonical({version:6,receipts:[],events:[{kind:'rules_activated',sequence:0,time:world.time,context}]}),scores:encodeCanonical({version:6,area_time:[]})};
 const epoch=h.prepareTransition(next,out,sha256(encodeCanonical(context)));h.apply({kind:'transition',epoch,state_hex:hex(out.state),event_hex:hex(out.events),score_hex:hex(out.scores)});record();const checkpoint={prior:trace.publications[0],initial:before,artifacts:out,p:trace.publications[1]};segment(2n);return detail?checkpoint:trace;
}
test('independent replay supports the exact rules7 to combined rules11 epoch and subsequent elapsed segments',()=>{const r=replayHistory(history());assert.equal(r.status,'PASS');assert.equal(r.application_checkpoints,1);assert.equal(r.gameplay_segments,2);});
test('combined replay rejects a conflicting identity or cutover context even with rehashed event bytes',()=>{for(const mutate of [c=>c.version=6,c=>c.ledger_cutover=-1n,c=>c.memo_adapter_after=4,c=>c.source_anchor='ef'.repeat(32),c=>c.new_state='ff'.repeat(32),c=>c.unreviewed=true]){const t=history(),p=t.publications[1],row=t.artifact_events[1],e=decodeCanonical(unhex(row.events_hex));mutate(e.events[0].context);row.events_hex=hex(encodeCanonical(e));p.artifacts.find(a=>a.kind==='events').sha256=sha256(unhex(row.events_hex));assert.throws(()=>replayHistory(t),/cutover context mismatch/);}const t=history();t.publications[1].identity.rules_hash=ENTRY_IDENTITY.rules_hash;assert.throws(()=>replayHistory(t),/entry transition identity/);});

import{prepareCheckpoint,CheckpointPlayer}from'../../apps/b2z-observer/model.mjs';
test('combined observer checkpoint preserves every entity and requires exact predecessor/cutover',async()=>{
 const x=history(true),segment=await prepareCheckpoint(x.initial,x.artifacts,x.p,x.prior);
 const view=new CheckpointPlayer(segment).advance(segment.start);view.matches(decodeWorld(x.initial));
 for(const mutate of[c=>c.version=6,c=>c.index_synced=-1n,c=>c.source_anchor='ab'.repeat(32),c=>c.memo_adapter_after=4,c=>c.new_identity.rules_hash=ENTRY_IDENTITY.rules_hash]){
  const e=decodeCanonical(x.artifacts.events);mutate(e.events[0].context);const bytes=encodeCanonical(e),artifacts={...x.artifacts,events:bytes};
  const p={...x.p,artifacts:x.p.artifacts.map(d=>d.kind==='events'?{...d,sha256:sha256(bytes)}:d),epoch:{...x.p.epoch,metadata_hash:sha256(encodeCanonical(e.events[0].context))}};
  await assert.rejects(prepareCheckpoint(x.initial,artifacts,p,x.prior));
 }
});
