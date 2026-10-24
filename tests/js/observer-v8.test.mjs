import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {ArtifactAssembler,PublicationSequence,verifyPinnedPublication,verifyRetainedPredecessor} from '@dtr/timeline-runtime/client/verification';
import {publication} from '@dtr/timeline-runtime/observation/publication';
import {hex,unhex} from '@dtr/timeline-runtime/protocol/bytes';
import {encodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {TimelineCoordinator} from '@dtr/timeline-runtime/runtime/coordinator';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
import {prepareDerivedSegment,snapshot} from '../../apps/b2z-observer/model.mjs';
import {B2zKernel} from '../../packages/kernels/b2z/kernel.mjs';
import {stageMillionWorld,stageTorusMigration} from '../../packages/kernels/b2z/migration.mjs';
import {MILLION_IDENTITY,PRELAUNCH_IDENTITY,TORUS_IDENTITY} from '../../packages/kernels/b2z/world.mjs';

const clientPackage=JSON.parse(fs.readFileSync(new URL('../../node_modules/@dtr/timeline-runtime/package.json',import.meta.url)));
assert.equal(clientPackage.version,'0.14.0','real immutable DTR 0.14 package required');
const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/b2z-torus-v4.json',import.meta.url)));

function finish(host,end){
  host.seal(end);
  while(host.status().phase==='running')host.advance(10000);
  host.publish(host.status().ready_hash);
}

function transition(host,identity,state,version,label){
  const output={
    state,
    events:encodeCanonical({version,receipts:[],events:[]}),
    scores:encodeCanonical({version,area_time:[]}),
  };
  const epoch=host.prepareTransition(identity,output,sha256(encodeCanonical({migration:label})));
  host.apply({kind:'transition',epoch,state_hex:hex(output.state),event_hex:hex(output.events),score_hex:hex(output.scores)});
  return epoch;
}

async function artifact(ticket,record,kind){
  const bytes=unhex(record[{state:'state_hex',events:'event_hex',scores:'score_hex'}[kind]]);
  const reader=new ArtifactAssembler(ticket,kind);
  for(let index=0;index<reader.descriptor.chunks.length;index++){
    await reader.accept(index,bytes.slice(index*16384,(index+1)*16384));
  }
  return reader.finish();
}

test('v8 observer authenticates the second epoch, reconstructs v5, and follows its first segment',async()=>{
  const source_id='11'.repeat(32),oldIdentity={source_id,...PRELAUNCH_IDENTITY};
  const host=TimelineCoordinator.create(unhex(fixture.migration.old_hex),oldIdentity,{logical_start:0n,source_from:0n},B2zKernel);
  finish(host,1n);
  const first=stageTorusMigration(unhex(host.committed().state_hex),{
    source_cursor:0n,ledger_cutover:0n,account_history_complete_through:0n,index_synced:0n,
    source_anchor:host.committed().seal.source_anchor,identity:oldIdentity,
  });
  transition(host,{source_id,...TORUS_IDENTITY},first.state,4,'v3-to-v4');
  finish(host,2n);

  const predecessor=publication(host.publicationRecord());
  const second=transition(host,{source_id,...MILLION_IDENTITY},stageMillionWorld(unhex(host.committed().state_hex)),5,'v4-to-v5');
  const checkpoint=publication(host.publicationRecord()),sequence=new PublicationSequence();
  const before=await verifyPinnedPublication(predecessor.bytes,predecessor.sha256);
  const current=await verifyPinnedPublication(checkpoint.bytes,checkpoint.sha256);
  sequence.accept(before);sequence.accept(current);
  const retained=await verifyRetainedPredecessor(predecessor.bytes,current);
  assert.equal(retained.root_hash,predecessor.sha256);
  assert.equal(checkpoint.data.version,8);assert.equal(second.version,2);assert.equal(second.transition_index,2n);

  const checkpointRecord=host.committed();
  const checkpointState=await artifact(current,checkpointRecord,'state');
  assert.deepEqual(checkpointState,unhex(checkpointRecord.state_hex));
  const world=snapshot(checkpointState,checkpoint.data.identity);
  assert.deepEqual([world.version,world.width,world.height],[5,1000,1000]);

  finish(host,3n);
  const successor=publication(host.publicationRecord()),next=await verifyPinnedPublication(successor.bytes,successor.sha256);
  sequence.accept(next);
  const record=host.committed(),state=await artifact(next,record,'state'),events=await artifact(next,record,'events');
  const segment=await prepareDerivedSegment(checkpointState,state,events,successor.data);
  assert.deepEqual([successor.data.version,segment.start,segment.end],[8,2,3]);
  assert.equal(snapshot(state,successor.data.identity).version,5);
});
