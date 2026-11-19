/** Verify a restored disposable legacy website before declaring snapshot recovery. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {Actor} from '@icp-sdk/core/agent';
import {IDL} from '@icp-sdk/core/candid';
import {disposableProofs,hex} from './lib/disposable_http_proofs.mjs';
const [host,id,inventoryPath,out]=process.argv.slice(2);
const inventory=JSON.parse(await readFile(inventoryPath)).filter(e=>e.path!=='.ic-assets.json5');
const {module,agent,canisterId,request,checkProof}=await disposableProofs(host,id);
assert.equal(module,'04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62');
const Enc=IDL.Record({content_encoding:IDL.Text,sha256:IDL.Opt(IDL.Vec(IDL.Nat8)),length:IDL.Nat});
const Asset=IDL.Record({key:IDL.Text,content_type:IDL.Text,encodings:IDL.Vec(Enc)});
const list=Actor.createActor(()=>IDL.Service({list:IDL.Func([IDL.Record({})],[IDL.Vec(Asset)],['query'])}),{agent,canisterId});
const entries=await list.list({});
assert.deepEqual(entries.map(e=>e.key).sort(),inventory.map(e=>'/'+e.path).sort());
const files=[];
for(const e of inventory){
 const path='/'+e.path,identity=entries.find(entry=>entry.key===path).encodings.find(v=>v.content_encoding==='identity');
 assert.equal(Buffer.from(identity.sha256[0]).toString('hex'),e.sha256,path);
 assert.equal(Number(identity.length),e.bytes,path);
 const response=await request(path,'identity');
 assert.equal(response.status,200,path);
 assert.equal(hex(response.body),e.sha256,path);
 assert.deepEqual(await checkProof(response),['http_expr',...e.path.split('/'),'<$>'],path);
 files.push(e);
}
await writeFile(out,JSON.stringify({status:'PASS',module,id,files},null,2)+'\n');
console.log('PASS restored exact legacy module and',files.length,'certified public bodies');
