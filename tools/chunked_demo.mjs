#!/usr/bin/env node
/** Offline subprocess-restart demo. No network, signing, deployment or token transfers. */
import fs from 'node:fs';
import path from 'node:path';
import {scenario} from '../tests/scenarios/b2z.mjs';
import {B2zKernel, B2zCursor} from '../packages/kernels/b2z/kernel.mjs';
import {B2Z_IDENTITY, encodeWorld, decodeWorld} from '../packages/kernels/b2z/world.mjs';
import {decodeCanonical, encodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {SegmentJournal} from '@dtr/timeline-runtime/runtime/journal';
import {ChunkedJournalStore} from '@dtr/timeline-runtime/storage/chunks';
import {makeSeal, sha256} from '@dtr/timeline-runtime/runtime/seal';
import {hex, unhex} from '@dtr/timeline-runtime/protocol/bytes';
const usage = 'node tools/chunked_demo.mjs b2z <scenario> --journal <local-path> [--fault chunk:0|before_root|after] [--recover yes] [--budget 127] [--slices 10000]';
function options(args) {
  const [game,name,...rest]=args;if(game!=='b2z'||!name)throw new Error(usage);
  const out={name,budget:127,slices:10000,fault:null,recover:null};
  for(let i=0;i<rest.length;i+=2){
    if(!['--journal','--budget','--slices','--fault','--recover'].includes(rest[i])||rest[i+1]===undefined)throw new Error(usage);
    const key=rest[i].slice(2);out[key]=key==='journal'?path.resolve(rest[i+1]):['fault','recover'].includes(key)?rest[i+1]:Number(rest[i+1]);
  }
  if(!out.journal||!Number.isInteger(out.budget)||out.budget<1||out.budget>1000000
    ||!Number.isInteger(out.slices)||out.slices<1||out.slices>100000)throw new Error(usage);
  if(out.fault!==null&&!['chunk:0','before_root','after'].includes(out.fault))throw new Error('fault mode');
  if(out.recover!==null&&out.recover!=='yes')throw new Error('recovery requires --recover yes');
  return out;
}
function save(file,host,name) {
  const b=host.store.snapshot();
  const bytes=encodeCanonical({version:4,scenario:name,journal_hex:hex(b),journal_hash:sha256(b)});
  const temp=file+'.tmp-'+process.pid;
  let fd;
  try {
    fd=fs.openSync(temp,'wx',0o600);fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;
    fs.renameSync(temp,file);
    const dir=fs.openSync(path.dirname(file),'r');try{fs.fsyncSync(dir);}finally{fs.closeSync(dir);}
  } finally { if(fd!==undefined)fs.closeSync(fd);if(fs.existsSync(temp))fs.unlinkSync(temp); }
}
let lock=null;
try {
  const o=options(process.argv.slice(2));fs.mkdirSync(path.dirname(o.journal),{recursive:true});
  const lockPath=o.journal+'.lock';const fd=fs.openSync(lockPath,'wx',0o600);fs.closeSync(fd);lock=lockPath;
  let host;
  if(fs.existsSync(o.journal)){
    const p=decodeCanonical(fs.readFileSync(o.journal));if(p.version!==4||p.scenario!==o.name)throw new Error('journal scenario/version mismatch');
    host=new SegmentJournal(ChunkedJournalStore.restore(unhex(p.journal_hex),p.journal_hash),B2zKernel);
  }else{
    const spec=scenario(o.name),state=encodeWorld(spec.world),source_id=sha256(new TextEncoder().encode('DTR_OFFLINE_DEMO_SOURCE'));
    host=SegmentJournal.create(state,{source_id,...B2Z_IDENTITY},{logical_start:0n,source_from:0n},B2zKernel);
    const seal=makeSeal({source_id,...B2Z_IDENTITY,segment_id:0n,logical_start:0n,logical_end:spec.ticks,
      source_from:0n,source_to_exclusive:BigInt(spec.inputs?.length??0),source_anchor:'00'.repeat(32),previous_state:sha256(state),previous_manifest:'00'.repeat(32)},spec.inputs??[],BigInt(spec.inputs?.length??0));
    host=new SegmentJournal(ChunkedJournalStore.create(host.store.read()),B2zKernel);
    host.prepare(seal,spec.inputs??[]);save(o.journal,host,o.name);
  }
  if(o.recover==='yes'){host.store.discardUnpublished();save(o.journal,host,o.name);}
  else if(host.store.pages.pending)throw new Error('unpublished upload: inspect then explicitly --recover yes');
  let slices=0,work=0,interrupted=false;
  while(host.store.read().stage?.phase==='running'&&slices<o.slices){
    let progress;
    try{progress=host.advance(host.store.read().stage.fence,o.budget,slices===0?o.fault:null);}
    catch(e){if(!String(e.message).startsWith('injected'))throw e;interrupted=true;save(o.journal,host,o.name);break;}
    work+=progress.used;slices++;host.store.pages.collect(8192);
    // Each completed host slice is saved before the next. This is intentionally inefficient evidence code.
    save(o.journal,host,o.name);
  }
  if(!interrupted&&host.store.read().stage?.phase==='ready'){
    host.publish(host.store.read().stage.ready_hash);save(o.journal,host,o.name);
  }
  const r=host.store.read();const pending=r.stage?B2zCursor.restore(unhex(r.stage.cursor_hex),r.stage.cursor_hash):null;
  const w=decodeWorld(unhex(r.head.state_hex));
  const report={checkpoint:'S04',scenario:o.name,status:interrupted?'INTERRUPTED':r.stage?'RUNNING':'COMMITTED',unpublished_upload:host.store.pages.pending!==null,kernel_phase:pending?.phase??'done',
    slices_this_process:slices,logical_work_this_process:work,journal_revision:r.revision,
    published_state_hash:r.head.state_hash,published_manifest_hash:r.head.manifest_hash,
    published_ball_count:w.balls.length,published_cannon_count:w.cannons.length,published_pending_strikes:w.pending.length,
    published_area_time:w.credits.map(s=>({account:s.account,numerator:s.units[0].toString(),denominator:s.units[1].toString()})),
    source:'synthetic genesis; no live ICP; local file checksum is integrity, not certification',cycles_consumed:null};
  console.log(JSON.stringify(report,null,2));
}catch(e){console.error(e.message);process.exitCode=1;}
finally{if(lock)fs.unlinkSync(lock);}
