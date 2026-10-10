#!/usr/bin/env node
/** Synthetic prefix -> atomic seal -> simulation -> publication + retirement, across processes. */
import fs from 'node:fs';import path from 'node:path';
import {coordinatorScenario} from '../tests/scenarios/coordinator.mjs';
import {TimelineCoordinator} from '../packages/runtime/coordinator.mjs';
import {decodeCanonical,encodeCanonical} from '../packages/runtime/canonical.mjs';
import {sha256} from '../packages/runtime/seal.mjs';
import {hex,unhex} from '../packages/protocol/bytes.mjs';
import {publication,publishedChunk} from '../packages/observation/publication.mjs';
import {verifyPinnedPublication,ArtifactAssembler} from '../packages/client/verification.mjs';
const usage='node tools/orchestrated_demo.mjs admission|life --journal PATH [--budget 127] [--actions 10000] [--fault seal:before|publish:after]';
function options(args){
  const [name,...rest]=args;if(!['admission','life'].includes(name))throw new Error(usage);
  const o={name,budget:127,actions:10000,fault:null};
  for(let i=0;i<rest.length;i+=2){if(!['--journal','--budget','--actions','--fault'].includes(rest[i])||rest[i+1]===undefined)throw new Error(usage);
    const key=rest[i].slice(2);o[key]=['budget','actions'].includes(key)?Number(rest[i+1]):rest[i+1];}
  if(!o.journal||!Number.isSafeInteger(o.budget)||o.budget<1||o.budget>100000||!Number.isSafeInteger(o.actions)||o.actions<1||o.actions>10000
    ||(o.fault!==null&&!/^(ingest|seal|step|publish):(before|after)$/.test(o.fault)))throw new Error(usage);
  o.journal=path.resolve(o.journal);return o;
}
function save(file,name,host){
  const b=host.snapshot(),out=encodeCanonical({version:5,scenario:name,host_hex:hex(b),host_hash:sha256(b)}),temp=file+'.tmp-'+process.pid;
  let fd;try{fd=fs.openSync(temp,'wx',0o600);fs.writeFileSync(fd,out);fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;
    fs.renameSync(temp,file);const dir=fs.openSync(path.dirname(file),'r');try{fs.fsyncSync(dir);}finally{fs.closeSync(dir);}
  }finally{if(fd!==undefined)fs.closeSync(fd);if(fs.existsSync(temp))fs.unlinkSync(temp);}
}
let lock=null;
try{
  const o=options(process.argv.slice(2));fs.mkdirSync(path.dirname(o.journal),{recursive:true});
  const fd=fs.openSync(o.journal+'.lock','wx',0o600);fs.closeSync(fd);lock=o.journal+'.lock';
  const spec=coordinatorScenario(o.name);let host=spec.host;
  if(fs.existsSync(o.journal)){
    const saved=decodeCanonical(fs.readFileSync(o.journal));if(saved.version!==5||saved.scenario!==o.name)throw new Error('journal schema/scenario');
    host=TimelineCoordinator.restore(unhex(saved.host_hex),saved.host_hash,spec.kernel);
  }else save(o.journal,o.name,host);
  let interrupted=false,count=0;
  for(;count<o.actions;count++){
    const s=host.status();let action;
    if(s.ingest_head===0n)action={kind:'ingest',start:0n,records:spec.records,anchor:'ab'.repeat(32)};
    else if(s.phase==='idle'&&s.segment_id===null)action={kind:'seal',logical_end:spec.end};
    else if(s.phase==='running')action={kind:'step',budget:o.budget};
    else if(s.phase==='ready')action={kind:'publish',manifest_hash:s.ready_hash};
    else break;
    const fault=o.fault?.startsWith(action.kind+':')?o.fault.split(':')[1]:null;
    try{host.apply(action,fault);}catch(e){if(fault&&/injected/.test(e.message))interrupted=true;else throw e;}
    save(o.journal,o.name,host);if(interrupted){count++;break;}
  }
  const s=host.status(),p=publication(host.publicationRecord()),verified=await verifyPinnedPublication(p.bytes,p.sha256);
  for(const kind of ['state','events','scores']){
    const a=new ArtifactAssembler(verified,kind),d=p.data.artifacts.find(a=>a.kind===kind);
    for(let i=d.chunks.length-1;i>=0;i--)await a.accept(i,publishedChunk(host.publicationRecord(),p.sha256,kind,i));
    await a.finish();
  }
  console.log(JSON.stringify({checkpoint:'S06',scenario:o.name,status:interrupted?'INTERRUPTED':s.segment_id===null?'RUNNING':'COMMITTED',
    phase:s.phase,revision:s.revision,actions_this_process:count,ingest_head:s.ingest_head.toString(),retired_to:s.retired_to.toString(),
    pending_inputs:s.pending_inputs,manifest_hash:s.manifest_hash,publication_hash:p.sha256,observer_verification:verified.mode,
    source:'synthetic test inputs; no network, ledger verification, IC certificate or transfers',cycles_consumed:null},null,2));
}catch(e){console.error(e.message);process.exitCode=1;}finally{if(lock)fs.unlinkSync(lock);}
