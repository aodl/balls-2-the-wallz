import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {decodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
import {B2zKernel} from '../../packages/kernels/b2z/kernel.mjs';
const [ancestor,directory]=process.argv.slice(2);
const raw=await fs.readFile(directory+'/snapshot.json','utf8');
const old=decodeCanonical(await fs.readFile(ancestor+'/publication.bin'));
const report=JSON.parse(raw);
let previous=old;
let state=await fs.readFile(ancestor+'/'+old.head.segment_id+'-state.bin');
const rows=[];
for(const fact of [...report.chain].reverse().filter(f=>!f.prior)){
 const id=fact.head;
 const pub=decodeCanonical(await fs.readFile(directory+'/'+(String(id)===report.publication.head.segment_id?'publication.bin':id+'-publication.bin')));
 const seal=pub.head.seal;
 assert.equal(seal?.input_count,0);
 assert.equal(seal.source_from,seal.source_to_exclusive);
 assert.equal(previous.head.state_hash,sha256(state));
 const audit=decodeCanonical(await fs.readFile(directory+'/'+id+'-events.bin'));
 const time=audit.events.at(-1);
 assert.equal(time.kind,'lifecycle_time');
 assert.deepEqual(time.time,[seal.logical_end,1n]);
 const cursor=B2zKernel.begin(state,[],seal);
 let iters=0;
 while(!cursor.step(23).complete)assert(++iters<20000);
 assert(cursor.needsElapsed());
 cursor.finalizeElapsed(time.observed_ns);
 const output=cursor.result();
 for(const kind of ['state','events','scores']){
  const expected=await fs.readFile(directory+'/'+id+'-'+kind+'.bin');
  assert(Buffer.from(output[kind]).equals(expected),'independent playback mismatch '+id+' '+kind);
 }
 state=output.state;
 previous=pub;
 rows.push({segment:id,work_iterations:iters,input_count:0,state_hash:pub.head.state_hash,manif:pub.head.manifest_hash});
}
console.log(JSON.stringify({status:'PASS',exact:['state','events','scores'],rows},null,2));
