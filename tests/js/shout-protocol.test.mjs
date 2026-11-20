import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {parseContextText,encodeContextPayment,semanticContextPayment} from '../../packages/protocol/context-structures.mjs';
import {parseShoutMemo,fitShout,encodeShoutPayment,readShoutPayment,semanticShoutPayment} from '../../packages/protocol/shout.mjs';

const utf8=new TextEncoder(),account='7f'.repeat(32),amount=10000n;
test('shared Shout text fixtures preserve the directive and paid input seed',()=>{
 for(const line of readFileSync(new URL('../fixtures/shout-annotation.tsv',import.meta.url),'utf8').trimEnd().split('\n')){
  const [expect,text]=line.split('\t');
  const bytes=utf8.encode(text);
  if(expect==='reject'){assert.throws(()=>parseShoutMemo(bytes),undefined,text);continue;}
  const {command,cry}=parseShoutMemo(bytes);
  const [directive,expected]=text.split('|');
  assert.deepEqual(command,parseContextText(utf8.encode(directive)).command);
  assert.equal(cry,expected);
  const envelope=encodeShoutPayment(account,amount,command,cry);
  assert.equal(readShoutPayment(envelope).cry,cry);
  assert.deepEqual(semanticShoutPayment(envelope),semanticContextPayment(encodeContextPayment(account,amount,command)));
  if(!/^(FIRE|NEW) /.test(text))assert.throws(()=>parseContextText(bytes));
 }
});
test('Shout fitter keeps graphemes and rejects prohibited suffix input',()=>{
 const directive='DMOVE 4294967295 999999',value='🏳️‍🌈🏳️‍🌈';
 assert.deepEqual(fitShout(directive,value),{cry:'',memo:directive,available:8,bytes:23,shortened:true});
 for(const suffix of ['bad\nline','a\u202eb','a|b','\ud800'])assert.throws(()=>fitShout('DROT 1 N',suffix));
 assert.throws(()=>parseShoutMemo(Uint8Array.of(255)));
});

import {B2zCursor,B2zKernel} from '../../packages/kernels/b2z/kernel.mjs';
import {decodeWorld,encodeWorld,SHOUT_IDENTITY,CONTEXT_IDENTITY} from '../../packages/kernels/b2z/world.mjs';
import {decodeCanonical,encodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
import {unpackDeflectorAudit} from '../../packages/kernels/b2z/deflector-events.mjs';
import {ACCOUNT,contextualWorld,commercialCases,orderedWorld} from '../scenarios/context-structures.mjs';
import {validateLaunchAnnotations} from '../../apps/b2z-observer/war-cry-events.mjs';

test('only accepted actions get a Shout and annotation cannot change play or receipts',()=>{
 const world=contextualWorld(),state=encodeWorld(world);
 function run(shouts,interrupt){
  const items=commercialCases.map(([memo,amount],i)=>{
   const {command,cry}=parseShoutMemo(utf8.encode(memo));
   const payment=shouts?encodeShoutPayment(ACCOUNT,BigInt(amount),command,cry||'Action'):encodeContextPayment(ACCOUNT,BigInt(amount),command,cry);
   return {position:BigInt(i+1),payload_hex:Buffer.from(payment).toString('hex')};
  });
  const context={...(shouts?SHOUT_IDENTITY:CONTEXT_IDENTITY),logical_start:0n,logical_end:1n};
  let cursor=new B2zCursor(state,items,context);
  for(let i=0;i<4000;i++){
   if(cursor.step(interrupt?1:32).complete)break;
   if(interrupt){const raw=cursor.snapshot();cursor=B2zCursor.restore(raw,sha256(raw));}
   if(i===3999)throw Error('work limit');
  }
  cursor.finalizeElapsed(1n);
  const result=cursor.result();
  return {seed:cursor.seedBase,result,items,context,audit:unpackDeflectorAudit(decodeCanonical(result.events),world.balls)};
 }
 const previous=run(false,false),annotated=run(true,true);
 assert.equal(annotated.seed,previous.seed);
 assert.deepEqual(annotated.result.state,previous.result.state);
 assert.deepEqual(annotated.audit.receipts,previous.audit.receipts);
 const annotations=annotated.audit.events.flatMap(e=>e.action_annotation?[e.action_annotation]:[]);
 assert.deepEqual(annotations.map(({position,kind,id,cell})=>[Number(position),kind,id,cell]),[
  [5,'deflector',1,4007],[8,'deflector',1,4007],[9,'deflector',1,4006],[10,'cannon',1,4009]
 ]);
 assert(annotations.every(a=>a.account===ACCOUNT&&a.cry==='Action'));
 assert.equal(annotated.audit.events.filter(e=>e.launch_annotation?.cry==='Ready').length,1);
 const {events,receipts}=annotated.audit;
 validateLaunchAnnotations(events,receipts,SHOUT_IDENTITY);
 assert.throws(()=>validateLaunchAnnotations(events,receipts,CONTEXT_IDENTITY));
 const event=events.find(e=>e.action_annotation);
 assert.throws(()=>validateLaunchAnnotations([event,event],receipts,SHOUT_IDENTITY));
 assert.throws(()=>validateLaunchAnnotations([{...event,action_annotation:{...event.action_annotation,cell:999999}}],receipts,SHOUT_IDENTITY));
 if(process.env.B2Z_SHOUT_NATIVE){
  const hex=bytes=>Buffer.from(bytes).toString('hex');
  const input=JSON.stringify({initial_hex:hex(state),inputs_hex:hex(encodeCanonical(annotated.items)),context_hex:hex(encodeCanonical(annotated.context)),observed_ns:'1',max_work:100000,restore_between_slices:true});
  const native=JSON.parse(execFileSync(process.env.B2Z_SHOUT_NATIVE,['segment-json'],{input,encoding:'utf8',timeout:120000,maxBuffer:1048576}));
  assert.equal(native.status,'complete');
  assert(native.restored>0);
  for(const name of ['state','scores','events'])assert.equal(native[name+'_hex'],hex(annotated.result[name]),name);
 }
});

import {TimelineCoordinator} from '@dtr/timeline-runtime/runtime/coordinator';
import {publication} from '@dtr/timeline-runtime/observation/publication';
import {hex,unhex} from '@dtr/timeline-runtime/protocol/bytes';
import {prepareCheckpoint} from '../../apps/b2z-observer/model.mjs';
import {replayHistory} from '../../tools/lib/replay_s14_history.mjs';

test('Rules14 schema7 epoch and paid Shout replay from the exact Rules13 predecessor',async()=>{
 const initial=encodeWorld(orderedWorld()),source_id='ab'.repeat(32),anchor='00'.repeat(32);
 const beforeIdentity={...CONTEXT_IDENTITY,source_id},afterIdentity={...SHOUT_IDENTITY,source_id};
 let elapsed=0n;
 const wrap=c=>({cursor:c,step(n){const r=c.step(n);if(r.complete&&c.needsElapsed())c.finalizeElapsed(elapsed);return r;},snapshot:()=>c.snapshot(),result:()=>c.result()});
 const kernel={begin:(...args)=>wrap(B2zKernel.begin(...args)),restore:(...args)=>wrap(B2zKernel.restore(...args)),fork:c=>wrap(B2zKernel.fork(c.cursor))};
 const host=TimelineCoordinator.create(initial,beforeIdentity,{logical_start:0n,source_from:0n,source_anchor:anchor},kernel);
 const trace={status:'PASS',initial_world_hex:hex(initial),inputs:[],assigned:[],publications:[],artifact_events:[]};
 const record=()=>{
  const p=publication(host.publicationRecord()).data;
  trace.publications.push(p);
  trace.artifact_events.push({segment_id:p.head.segment_id,events_hex:host.committed().event_hex});
  return p;
 };
 const segment=(end,to,rows)=>{
  elapsed=end;
  const cursor=host.committed().source_to_exclusive;
  host.ingestOrdered(cursor,to,rows,anchor);
  host.seal(end);
  while(host.status().phase==='running')host.advance(23);
  host.publish(host.status().ready_hash);
  return record();
 };
 const prior=segment(1n,0n,[]);
 const before=unhex(host.committed().state_hex),world=decodeWorld(before);
 const context={version:10,migration:'B2Z_ACTION_SHOUT_RULES_14',old_identity:beforeIdentity,new_identity:afterIdentity,
  previous_state:sha256(before),new_state:sha256(before),logical_boundary:world.time,source_cursor:0n,
  ledger_cutover:0n,account_history_complete_through:0n,index_synced:0n,source_anchor:anchor,memo_adapter_before:8,memo_adapter_after:9};
 const out={state:before,events:encodeCanonical({version:7,receipts:[],events:[{kind:'shout_rules_activated',sequence:0,time:world.time,context}]}),
  scores:encodeCanonical({version:7,area_time:[]})};
 const epoch=host.prepareTransition(afterIdentity,out,sha256(encodeCanonical(context)));
 host.apply({kind:'transition',epoch,state_hex:hex(out.state),event_hex:hex(out.events),score_hex:hex(out.scores)});
 const checkpoint=record();
 await prepareCheckpoint(before,out,checkpoint,prior);
 const parsed=parseShoutMemo(utf8.encode('DROT 1 E|Shield'));
 const input={position:1n,payload_hex:hex(encodeShoutPayment(ACCOUNT,10000n,parsed.command,parsed.cry))};
 trace.inputs.push(input);
 trace.assigned.push(1n);
 const after=segment(2n,2n,[input]);
 const audit=unpackDeflectorAudit(decodeCanonical(unhex(host.committed().event_hex)),world.balls);
 assert.equal(audit.events.find(e=>e.action_annotation)?.action_annotation.cry,'Shield');
 assert.equal(after.identity.rules_hash,SHOUT_IDENTITY.rules_hash);
 const replay=replayHistory(trace);
 assert.equal(replay.application_checkpoints,1);
 assert.deepEqual(replay.assigned,['1']);
 for(const patch of [{memo_adapter_before:7},{memo_adapter_after:8},{source_anchor:'ff'.repeat(32)}]){
  const contextCopy={...context,...patch},body=decodeCanonical(out.events);
  body.events[0].context=contextCopy;
  const forgedEvents=encodeCanonical(body);
  const forged={...checkpoint,artifacts:checkpoint.artifacts.map(a=>a.kind==='events'?{...a,sha256:sha256(forgedEvents)}:a),
   epoch:{...checkpoint.epoch,metadata_hash:sha256(encodeCanonical(contextCopy))}};
  await assert.rejects(prepareCheckpoint(before,{...out,events:forgedEvents},forged,prior),/source boundary/);
  const altered={...trace,publications:[prior,forged,after],artifact_events:trace.artifact_events.map((r,i)=>i===1?{...r,events_hex:hex(forgedEvents)}:r)};
  assert.throws(()=>replayHistory(altered),/cutover context mismatch/);
 }
});
