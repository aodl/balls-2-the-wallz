#!/usr/bin/env node
/** Offline subprocess-restart demo. No network, signing, deployment or token transfers. */
import fs from 'node:fs';
import path from 'node:path';
import {scenario} from '../tests/scenarios/btz.mjs';
import {BtzKernel, BtzCursor} from '../packages/kernels/btz/kernel.mjs';
import {BTZ_IDENTITY, encodeWorld, decodeWorld} from '../packages/kernels/btz/world.mjs';
import {decodeCanonical, encodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {SegmentJournal, AtomicJournalStore} from '@dtr/timeline-runtime/runtime/journal';
import {makeSeal, sha256} from '@dtr/timeline-runtime/runtime/seal';
import {hex, unhex} from '@dtr/timeline-runtime/protocol/bytes';
const usage = 'node tools/demo.mjs btz <scenario> --journal <local-path> [--budget 64] [--slices 10000]';
function options(args) {
  const [game,name,...rest]=args;if(game!=='btz'||!name)throw new Error(usage);
  const out={name,budget:64,slices:10000};
  for(let i=0;i<rest.length;i+=2){
    if(!['--journal','--budget','--slices'].includes(rest[i])||rest[i+1]===undefined)throw new Error(usage);
    const key=rest[i].slice(2);out[key]=key==='journal'?path.resolve(rest[i+1]):Number(rest[i+1]);
  }
  if(!out.journal||!Number.isInteger(out.budget)||out.budget<1||out.budget>1000000
    ||!Number.isInteger(out.slices)||out.slices<1||out.slices>100000)throw new Error(usage);
  return out;
}
function save(file,host,name) {
  const b=host.store.snapshot();
  const bytes=encodeCanonical({version:3,scenario:name,journal_hex:hex(b),journal_hash:sha256(b)});
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
    const p=decodeCanonical(fs.readFileSync(o.journal));if(p.version!==3||p.scenario!==o.name)throw new Error('journal scenario/version mismatch');
    host=new SegmentJournal(AtomicJournalStore.restore(unhex(p.journal_hex),p.journal_hash),BtzKernel);
  }else{
    const spec=scenario(o.name),state=encodeWorld(spec.world),source_id=sha256(new TextEncoder().encode('DTR_OFFLINE_DEMO_SOURCE'));
    host=SegmentJournal.create(state,{source_id,...BTZ_IDENTITY},{logical_start:0n,source_from:0n},BtzKernel);
    const seal=makeSeal({source_id,...BTZ_IDENTITY,segment_id:0n,logical_start:0n,logical_end:spec.ticks,
      source_from:0n,source_to_exclusive:BigInt(spec.inputs?.length??0),source_anchor:'00'.repeat(32),previous_state:sha256(state),previous_manifest:'00'.repeat(32)},spec.inputs??[],BigInt(spec.inputs?.length??0));
    host.prepare(seal,spec.inputs??[]);save(o.journal,host,o.name);
  }
  let slices=0,work=0;
  while(host.store.read().stage?.phase==='running'&&slices<o.slices){
    const progress=host.advance(host.store.read().stage.fence,o.budget);work+=progress.used;slices++;
    // Each completed host slice is saved before the next. This is intentionally inefficient evidence code.
    save(o.journal,host,o.name);
  }
  if(host.store.read().stage?.phase==='ready'){
    host.publish(host.store.read().stage.ready_hash);save(o.journal,host,o.name);
  }
  const r=host.store.read();const pending=r.stage?BtzCursor.restore(unhex(r.stage.cursor_hex),r.stage.cursor_hash):null;
  const w=decodeWorld(unhex(r.head.state_hex));
  const report={checkpoint:'S03',scenario:o.name,status:r.stage?'RUNNING':'COMMITTED',kernel_phase:pending?.phase??'done',
    slices_this_process:slices,logical_work_this_process:work,journal_revision:r.revision,
    published_state_hash:r.head.state_hash,published_manifest_hash:r.head.manifest_hash,
    published_ball_count:w.balls.length,published_cannon_count:w.cannons.length,published_pending_strikes:w.pending.length,
    published_area_time:w.credits.map(s=>({account:s.account,numerator:s.units[0].toString(),denominator:s.units[1].toString()})),
    source:'synthetic genesis; no live ICP; local file checksum is integrity, not certification',cycles_consumed:null};
  console.log(JSON.stringify(report,null,2));
}catch(e){console.error(e.message);process.exitCode=1;}
finally{if(lock)fs.unlinkSync(lock);}
