#!/usr/bin/env node
/** Reconstruct one complete declared disposable history; never forensic repair. */
import {readFile,writeFile,lstat} from 'node:fs/promises';
import {capturePlayabilityHistory} from './lib/playability_capture_history.mjs';
const[dir,seedPath]=process.argv.slice(2);if(!dir||!seedPath)throw Error('usage: capture_playability_history.mjs capture-directory replay-seed.json');
const revive=(_k,v)=>v&&typeof v==='object'&&Object.keys(v).join(',')==='$integer'?BigInt(v.$integer):v;
const bounded=async(path,max)=>{const stat=await lstat(path);if(!stat.isFile()||stat.size>max)throw Error('capture file bounds: '+path);return readFile(path);};
const index=JSON.parse(await bounded(dir+'/wire-index.json',16*1024*1024)),seed=JSON.parse(await bounded(seedPath,16*1024*1024),revive),files=new Map();
if(!Array.isArray(index.packets)||index.packets.length>4096)throw Error('capture packet bound');let total=0;
for(const p of index.packets){if(!/^\d{4,8}\.cbor$/.test(p.file))throw Error('capture filename');const bytes=await bounded(dir+'/wire-catalogs/'+p.file,4*1024*1024);total+=bytes.length;if(total>128*1024*1024)throw Error('capture byte bound');files.set(p.file,new Uint8Array(bytes));}
const trace=await capturePlayabilityHistory(index,files,seed);
await writeFile(dir+'/history.json',JSON.stringify(trace,(_k,v)=>typeof v==='bigint'?{$integer:v.toString()}:v)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:'PASS',publications:trace.publications.length,event_artifacts:trace.artifact_events.length,complete_through:trace.complete_through,query_reply_errors:trace.query_reply_errors.length}));
