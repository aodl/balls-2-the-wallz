import assert from 'node:assert/strict';
import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {coordinatorScenario} from '../instrumented/tests/scenarios/coordinator.mjs';
import {auditCounters} from '../instrumented/node_modules/@dtr/timeline-runtime/packages/runtime/canonical.mjs';
const reset=()=>{for(const k of Object.keys(auditCounters))auditCounters[k]=0;};
const rows=[];
for(const name of ['life','admission','dense']){
 for(const budget of [127,100000]){
  const {host,records,end,kernel}=coordinatorScenario(name);
  host.ingestPrefix(0n,records,records.length?'ab'.repeat(32):'00'.repeat(32));host.seal(end);
  const r=host.store.read(),stage=r.journal.stage;
  // Match the work actually assigned to the coordinator without changing its rules or cursor.
  const cursor=kernel.restore(Buffer.from(stage.cursor_hex,'hex'),stage.cursor_hash);
  reset();const t0=performance.now();let work=0;
  let p;do{p=cursor.step(budget);work+=p.used;}while(!p.complete);
  const direct=cursor.result(),directMs=performance.now()-t0,directCounters={...auditCounters};
  reset();const t1=performance.now();let calls=0,hostWork=0;
  do{p=host.advance(budget);calls++;hostWork+=p.used;}while(!p.complete);
  const stepMs=performance.now()-t1,hostCounters={...auditCounters};
  assert.equal(hostWork,work);
  host.publish(host.status().ready_hash);
  const head=host.committed();
  for(const [k,h] of [['state','state_hex'],['events','event_hex'],['scores','score_hex']])assert.equal(Buffer.from(direct[k]).toString('hex'),head[h]);
  const row={scenario:name,budget,work_units:work,advance_calls:calls,output_bytes:Object.values(direct).reduce((n,b)=>n+b.length,0),direct_kernel_encoding:directCounters,coordinator_advance_encoding:hostCounters,direct_kernel_ms:Math.round(directMs*100)/100,coordinator_advance_ms:Math.round(stepMs*100)/100,qualification:'Instrumented JS copy; direct run excludes restore, includes result encoding; coordinator measured advance only, excluding setup/publish/status/snapshot. Timings are single-run diagnostics, not Wasm, cycles or capacity.'};
  rows.push(row);
 }
}
console.log(JSON.stringify({instrumentation:'Counters added only to canonical encoder/decoder in an isolated copy; original source retained unchanged; outputs compared byte-for-byte.',rows},null,2));
