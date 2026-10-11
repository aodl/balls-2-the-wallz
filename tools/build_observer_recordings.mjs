#!/usr/bin/env node
/** Finite, synthetic recordings of the EXISTING coordinator/kernel. No live inputs. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {coordinatorScenario} from '../tests/scenarios/coordinator.mjs';
import {publication, CHUNK_BYTES} from '@dtr/timeline-runtime/observation/publication';
import {projectAnimation, ANIMATION_FORMAT} from '../packages/kernels/btz/animation.mjs';
import {encodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
import {unhex} from '@dtr/timeline-runtime/protocol/bytes';
const DEST=fileURLToPath(new URL('../apps/btz-observer/recordings/',import.meta.url));
const CONFIG=[
  ['dense','Frontier pressure','32 balls, two territories. Watch the border evolve.',12],
  ['admission','New arrivals','Two synthetic purchases create cannons on an empty board.',12],
  ['severance','The bridge breaks','A one-cell attack cuts off a territory and eliminates its cannon.',4],
  ['near-impact','Mutual destruction','Opposing impacts arrive slightly apart and annihilate.',4],
];
export function buildRecordings(){
  const files=new Map(),index={version:1,trust:'offline-pinned-content',provenance:'Synthetic local coordinator output; no ledger, certificate, real funds or measured cycles.',recordings:[]};
  for(const [id,title,description,count] of CONFIG){
    const {host,records,end}=coordinatorScenario(id),roots=[];
    let initial=unhex(host.committed().state_hex),audit=new Uint8Array();
    let render={format:ANIMATION_FORMAT,bytes:encodeCanonical({version:1,format:ANIMATION_FORMAT,
      initial_state_hash:sha256(initial),source_events_hash:sha256(audit),receipts:[],events:[]})};
    const add=n=>{
      const p=publication(host.publicationRecord(),{render}),prefix=`${id}/${String(n).padStart(3,'0')}`;
      files.set(`${prefix}/catalog.bin`,p.bytes);roots.push(p.sha256);
      for(let i=0;i<p.artifacts.length;i++)for(let at=0;at<p.artifacts[i].length;at+=CHUNK_BYTES)
        files.set(`${prefix}/${p.data.artifacts[i].kind}-${at/CHUNK_BYTES}.bin`,p.artifacts[i].slice(at,at+CHUNK_BYTES));
    };
    add(0);
    if(records.length)host.ingestPrefix(0n,records,'ab'.repeat(32));
    for(let i=1;i<=count;i++){
      initial=unhex(host.committed().state_hex);host.seal(end*BigInt(i));
      let slices=0;while(host.status().phase==='running'){
        host.advance(100000);if(++slices>128)throw new Error('recording workload limit');
      }
      host.publish(host.status().ready_hash);audit=unhex(host.committed().event_hex);
      const p=projectAnimation(initial,audit);render={format:p.format,bytes:p.bytes};add(i);
    }
    index.recordings.push({id,title,description,tick_seconds:0.25,roots,logical_end:Number(host.status().logical_end??end*BigInt(count)),segments:count});
  }
  files.set('index.json',new TextEncoder().encode(JSON.stringify(index,null,2)+'\n'));
  const total=[...files.values()].reduce((s,b)=>s+b.length,0);
  if(total>16*1024*1024)throw new Error('recording byte budget');
  return {files,total};
}
function allFiles(dir,prefix=''){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?allFiles(path.join(dir,e.name),prefix+e.name+'/'):[prefix+e.name]).sort();
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const mode=process.argv[2];if(!['--write','--check'].includes(mode))throw new Error('use --write or --check');
  const {files,total}=buildRecordings();
  if(mode==='--write'){
    fs.rmSync(DEST,{recursive:true,force:true});fs.mkdirSync(DEST,{recursive:true});
    for(const [name,bytes] of files){fs.mkdirSync(path.dirname(path.join(DEST,name)),{recursive:true});fs.writeFileSync(path.join(DEST,name),bytes);}
  }else{
    if(JSON.stringify(allFiles(DEST))!==JSON.stringify([...files.keys()].sort()))throw new Error('recording file inventory mismatch');
    for(const [name,bytes] of files)if(!fs.readFileSync(path.join(DEST,name)).equals(bytes))throw new Error('recording changed: '+name);
  }
  console.log(`PASS: ${CONFIG.length} deterministic recordings, ${files.size} files, ${total} bytes (${mode}).`);
}
