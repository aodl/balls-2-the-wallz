// Legacy fixture metadata is preserved byte-for-byte; current application naming is B2Z.
import test from 'node:test';
import assert from 'node:assert/strict';
import {TimelineCoordinator} from '@dtr/timeline-runtime/runtime/coordinator';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
import {decodeCanonical,encodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {LifeInputKernel,encodeLifeSet} from '@dtr/timeline-runtime/examples/life-input';
import {board,encodeBoard} from '@dtr/timeline-runtime/examples/life';
import {B2zKernel} from '../../packages/kernels/b2z/kernel.mjs';
import {B2Z_IDENTITY} from '../../packages/kernels/b2z/world.mjs';
import {hex,unhex} from '@dtr/timeline-runtime/protocol/bytes';
import fs from 'node:fs';
const cases=JSON.parse(fs.readFileSync(new URL('../fixtures/b2z-v3-golden.json',import.meta.url),'utf8')).cases;
const lifeIdentity={source_id:'01'.repeat(32),rules_hash:'02'.repeat(32),config_hash:'03'.repeat(32),schema_hash:'04'.repeat(32)};
export function setup(game) {
  if(game==='life')return {kernel:LifeInputKernel,host:TimelineCoordinator.create(encodeBoard(board(4,4,Array(16).fill(0))),lifeIdentity,{logical_start:0n,source_from:0n},LifeInputKernel),
    records:[hex(encodeLifeSet(1,5)),null,hex(encodeLifeSet(1,6)),hex(encodeLifeSet(1,9)),hex(encodeLifeSet(1,10))],end:2n};
  const row=cases.find(r=>r.name==='admission');
  const state=unhex(row.initial_hex);
  return {kernel:B2zKernel,host:TimelineCoordinator.create(state,{source_id:'01'.repeat(32),...B2Z_IDENTITY},{logical_start:0n,source_from:0n},B2zKernel),records:decodeCanonical(unhex(row.inputs_hex)).map(i=>i.payload_hex),end:decodeCanonical(unhex(row.context_hex)).logical_end};
}
function restore(host,kernel) {const bytes=host.snapshot();return TimelineCoordinator.restore(bytes,sha256(bytes),kernel);}
function complete(host,kernel,roundtrip=false,budget=127) {
  for(let n=0;n<100000;n++){
    if(host.status().phase==='ready')return host;
    host.advance(budget);if(roundtrip)host=restore(host,kernel);
  }throw new Error('test work limit');
}
for(const game of ['life','btz']){
  test(`${game}: atomic coordinator carries source through commit and retirement`,()=>{
    let {host,kernel,records,end}=setup(game);const genesis=host.committed();
    host.ingestPrefix(0n,records,'ab'.repeat(32));host.seal(end);
    assert.deepEqual(host.committed(),genesis);host=complete(host,kernel,true,31);
    assert.equal(host.status().retired_to,0n);assert.deepEqual(host.committed(),genesis);
    host.publish(host.status().ready_hash);
    assert.equal(host.status().retired_to,BigInt(records.length));assert.equal(host.status().pending_inputs,0);
    assert.equal(host.status().phase,'idle');const bytes=host.snapshot();
    host.publish(host.status().manifest_hash);assert.deepEqual(host.snapshot(),bytes);
  });
  for(const op of ['ingest','seal','step','publish'])for(const fault of ['before','after'])
    test(`${game}: composite ${op}/${fault} restart preserves exact-once command effect`,()=>{
      let {host,kernel,records,end}=setup(game);const clean=setup(game).host;
      clean.ingestPrefix(0n,records,'ab'.repeat(32));clean.seal(end);complete(clean,kernel);clean.publish(clean.status().ready_hash);
      if(op!=='ingest')host.ingestPrefix(0n,records,'ab'.repeat(32));
      if(['step','publish'].includes(op))host.seal(end);
      if(op==='publish')host=complete(host,kernel);
      const before=host.snapshot(),expected=host.status().ready_hash;
      assert.throws(()=>op==='ingest'?host.ingestPrefix(0n,records,'ab'.repeat(32),fault):op==='seal'?host.seal(end,fault):op==='step'?host.advance(1,fault):host.publish(expected,fault),/injected/);
      if(fault==='before')assert.deepEqual(host.snapshot(),before);
      host=restore(host,kernel);
      if(host.status().ingest_head===0n)host.ingestPrefix(0n,records,'ab'.repeat(32));
      if(host.status().phase==='idle'&&host.status().segment_id===null)host.seal(end);
      if(host.status().phase!=='idle'){host=complete(host,kernel,true,127);host.publish(host.status().ready_hash);}
      assert.deepEqual(host.committed(),clean.committed());assert.equal(host.status().pending_inputs,0);
    });
  test(`${game}: new inputs after sealing remain for the next checkpoint`,()=>{
    let {host,kernel,records,end}=setup(game);host.ingestPrefix(0n,records,'ab'.repeat(32));host.seal(end);
    host.ingestPrefix(BigInt(records.length),[records.find(x=>x!==null),null],'cd'.repeat(32));
    host=complete(host,kernel);host.publish(host.status().ready_hash);
    assert.equal(host.status().pending_inputs,1);assert.equal(host.status().retired_to,BigInt(records.length));
    host.seal(end+1n);host=complete(host,kernel);host.publish(host.status().ready_hash);
    assert.equal(host.status().pending_inputs,0);assert.equal(host.status().retired_to,BigInt(records.length+2));
  });
}
test('stale source callback cannot erase a newly sealed segment',()=>{
  const {host}=setup('life');host.ingestPrefix(0n,[null],'aa'.repeat(32));
  const page=host.propose({kind:'ingest',start:1n,records:['00'],anchor:'bb'.repeat(32)});
  host.seal(1n);const old=host.snapshot();assert.throws(()=>host.commit(page),/stale/);assert.deepEqual(host.snapshot(),old);
});
test('failed kernel begin cannot leave an orphan input reservation',()=>{
  const base=setup('life');const bad={...LifeInputKernel,begin(){throw new Error('begin fails');}};
  const host=new TimelineCoordinator(base.host.store,bad);host.ingestPrefix(0n,['00'],'11'.repeat(32));const before=host.snapshot();
  assert.throws(()=>host.seal(1n),/begin fails/);assert.deepEqual(host.snapshot(),before);
});
for(const field of ['version','revision','source','retired','ack','reservation'])
  test(`coordinator restore rejects inconsistent ${field}`,()=>{
    const {host,kernel}=setup('life');const r=decodeCanonical(host.snapshot());
    if(field==='version')r.version=4;if(field==='revision')r.revision=-1;
    if(field==='source')r.inbox.source_id='00'.repeat(32);
    if(field==='retired')r.inbox.retired_to=1n;
    if(field==='ack')r.inbox.last_ack='22'.repeat(32);
    if(field==='reservation')r.inbox.reservation={seal:{}};
    const b=encodeCanonical(r);assert.throws(()=>TimelineCoordinator.restore(b,sha256(b),kernel));
  });
test('unknown host action metadata is rejected rather than differing between native and JS',()=>{
  const {host}=setup('life');const before=host.snapshot();
  assert.throws(()=>host.propose({kind:'seal',logical_end:1n,uncommitted:true}),/schema/);
  assert.deepEqual(host.snapshot(),before);
});
