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

import {B2zCursor} from '../../packages/kernels/b2z/kernel.mjs';
import {encodeWorld,SHOUT_IDENTITY,CONTEXT_IDENTITY} from '../../packages/kernels/b2z/world.mjs';
import {decodeCanonical,encodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
import {unpackDeflectorAudit} from '../../packages/kernels/b2z/deflector-events.mjs';
import {ACCOUNT,contextualWorld,commercialCases} from '../scenarios/context-structures.mjs';
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
  const input=JSON.stringify({initial_hex:hex(state),inputs_hex:hex(encodeCanonical(annotated.items)),context_hex:hex(encodeCanonical(annotated.context)),observed_ns:'1',max_work:100000});
  const native=JSON.parse(execFileSync(process.env.B2Z_SHOUT_NATIVE,['segment-json'],{input,encoding:'utf8',timeout:20000,maxBuffer:1048576}));
  assert.equal(native.status,'complete');
  for(const name of ['state','scores','events'])assert.equal(native[name+'_hex'],hex(annotated.result[name]),name);
 }
});
