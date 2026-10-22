#!/usr/bin/env node
/** Independent JS replay of the installed Rust host's captured seals/inputs. */
import {readFile,writeFile} from 'node:fs/promises';
import {TimelineCoordinator} from '@dtr/timeline-runtime/runtime/coordinator';
import {encodeCanonical,decodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {publication} from '@dtr/timeline-runtime/observation/publication';
import {unhex,hex} from '@dtr/timeline-runtime/protocol/bytes';
import {stageTorusMigration} from '../packages/kernels/b2z/migration.mjs';
import {B2zKernel} from '../packages/kernels/b2z/kernel.mjs';
const [input,output]=process.argv.slice(2);if(!input)throw new Error('usage: replay_s14.mjs trace.json [result.json]');
const trace=JSON.parse(await readFile(input,'utf8'),(_k,v)=>v&&typeof v==='object'&&Object.keys(v).join(',')==='$integer'?BigInt(v.$integer):v);
if(trace.status!=='PASS'||!trace.publications?.length||!Array.isArray(trace.inputs))throw new Error('complete captured history required');
const inputs=trace.inputs.map(i=>({position:BigInt(i.position),payload_hex:i.payload_hex}));
const first=trace.publications[0],host=TimelineCoordinator.create(unhex(trace.initial_world_hex),first.identity,{logical_start:0n,source_from:0n},B2zKernel);
let assigned=[];
for(const p of trace.publications){
 if(p.version===7&&p.head.seal===null){
  const proof=decodeCanonical(unhex(trace.metadata_hex));
  const proposed=stageTorusMigration(unhex(host.committed().state_hex),{...proof,identity:host.publicationRecord().journal.identity});
  if(hex(encodeCanonical(proposed.transition))!==trace.metadata_hex)throw new Error('application transition metadata mismatch');
  host.apply({kind:'transition',epoch:p.epoch,state_hex:hex(proposed.state),event_hex:hex(encodeCanonical({version:4,receipts:[],events:[]})),score_hex:hex(encodeCanonical({version:4,area_time:[]}))});
  if(hex(publication(host.publicationRecord()).bytes)!==hex(encodeCanonical(p)))throw new Error('transition publication mismatch');
  continue;
 }
 const seal=p.head.seal,selected=inputs.filter(i=>i.position>=seal.source_from&&i.position<seal.source_to_exclusive);
 assigned.push(...selected.map(i=>i.position.toString()));
 if(selected.length===0)host.ingestOrdered(seal.source_from,seal.source_to_exclusive,[],seal.source_anchor);
 else {
  let start=seal.source_from;
  for(let offset=0;offset<selected.length;offset+=256){
   const part=selected.slice(offset,offset+256),end=offset+256>=selected.length?seal.source_to_exclusive:part.at(-1).position+1n;
   host.ingestOrdered(start,end,part,seal.source_anchor);start=end;
  }
 }
 host.seal(seal.logical_end);
 while(host.status().phase==='running')host.advance(23);
 host.publish(host.status().ready_hash);
 if(hex(publication(host.publicationRecord()).bytes)!==hex(encodeCanonical(p)))throw new Error('authoritative replay mismatch at '+seal.segment_id);
}
if(new Set(assigned).size!==assigned.length||assigned.length!==trace.assigned.length)throw new Error('exactly-once assignment mismatch');
const result={status:'PASS',segments:trace.publications.length,assigned,comparison:'Exact canonical publication bytes / state-events-scores hashes against installed Rust history',work_budget:23};
if(output)await writeFile(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
