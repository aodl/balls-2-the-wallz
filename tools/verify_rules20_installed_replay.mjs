#!/usr/bin/env node
/** Independent browser checkpoint and paid successor replay from captured PocketIC bytes. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {decodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {B2zKernel} from '../packages/kernels/b2z/kernel.mjs';
import {prepareCheckpoint,prepareDerivedSegment} from '../apps/b2z-observer/model.mjs';

const directory=process.argv[2];
if(!directory)throw Error('usage: node tools/verify_rules20_installed_replay.mjs <capture-directory>');
const last=process.argv[3]===undefined?4:Number(process.argv[3]);
if(!Number.isInteger(last)||last<2||last>32)throw Error('invalid final capture ordinal');
const read=(n,kind)=>readFileSync(join(directory,`${n}-${kind}.bin`));
const publication=n=>decodeCanonical(read(n,'publication'));
const predecessor=publication(0),successor=publication(1);
assert.equal(successor.version,8);
await prepareCheckpoint(read(0,'state'),{
 state:read(1,'state'),events:read(1,'events'),scores:read(1,'scores'),
},successor,predecessor);
const rows=[];
for(let n=2;n<=last;n++){
 const prior=publication(n-1),current=publication(n);
 assert.equal(current.head.segment_id,prior.head.segment_id+1n,'consecutive paid history');
 const start=read(n-1,'state'),end=read(n,'state'),events=read(n,'events');
 if(current.head.seal===null){
  assert.equal(current.version,9,'post-activation lifecycle checkpoint');
  await prepareCheckpoint(start,{state:end,events,scores:read(n,'scores')},current,prior);
  continue;
 }
 const inputs=decodeCanonical(read(n,'inputs'));
 assert.equal(current.head.seal.input_count,inputs.length,'complete source input count');
 await prepareDerivedSegment(start,end,events,current);
 const audit=decodeCanonical(events),observed=audit.events.at(-1)?.observed_ns;
 assert.equal(typeof observed,'bigint','authenticated elapsed observation');
 const cursor=B2zKernel.begin(start,inputs,current.head.seal);
 while(!cursor.step(113).complete){}
 cursor.finalizeElapsed(observed);
 const actual=cursor.result();
 for(const kind of ['state','events','scores'])
  assert.deepEqual(Buffer.from(actual[kind]),read(n,kind),`${n} ${kind} independent bytes`);
 rows.push({segment:current.head.segment_id.toString(),source_from:current.head.seal.source_from.toString(),
  source_to_exclusive:current.head.seal.source_to_exclusive.toString(),inputs:inputs.length});
}
writeFileSync(join(directory,'independent-replay.json'),JSON.stringify({status:'PASS',
 predecessor_manifest:predecessor.head.manifest_hash,successor_manifest:successor.head.manifest_hash,rows},null,2)+'\n');
console.log(`PASS independent Rules20 epoch and ${rows.length} genuine paid segment(s)`);
