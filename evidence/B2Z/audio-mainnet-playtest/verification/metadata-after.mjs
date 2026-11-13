import {HttpAgent, Actor, CanisterStatus} from '@icp-sdk/core/agent';
import {IDL} from '@icp-sdk/core/candid';
import {readFile, writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='.work/audio-mainnet-playtest';
const agent=await HttpAgent.create({host:'https://icp-api.io',shouldFetchRootKey:false,shouldSyncTime:false,verifyQuerySignatures:true,fetchOptions:{signal:AbortSignal.timeout(45000)}});
const records=[];
for (const canisterId of ['s5ir5-gqaaa-aaaas-amyna-cai','s2jxj-liaaa-aaaas-amynq-cai']) {
 const s=await CanisterStatus.request({agent,canisterId,paths:['subnet','module_hash','controllers']});
 const subnet=s.get('subnet');
 records.push({canisterId,module_hash:s.get('module_hash'),controllers:s.get('controllers').map(p=>p.toText()).sort(),subnet:subnet.subnetId,nodes:subnet.nodeKeys.size,certificate_verified:true});
}
const prior=JSON.parse(await readFile('evidence/B2Z/human-playtest-corrections/production/metadata-after.json','utf8'));
for(let i=0;i<records.length;i++){
 for(const key of ['canisterId','module_hash','controllers','subnet'])assert.deepEqual(records[i][key],prior.records[i][key],key);
}
await writeFile(root+'/metadata-after.json',JSON.stringify({at:new Date().toISOString(),records},null,2)+'\n');
const actor=Actor.createActor(()=>IDL.Service({list:IDL.Func([IDL.Record({})],[IDL.Vec(IDL.Record({key:IDL.Text,content_type:IDL.Text,encodings:IDL.Vec(IDL.Record({content_encoding:IDL.Text,sha256:IDL.Opt(IDL.Vec(IDL.Nat8)),length:IDL.Nat}))}))],['query'])}),{agent,canisterId:'s2jxj-liaaa-aaaas-amynq-cai'});
const files=(await actor.list({})).map(f=>({key:f.key,content_type:f.content_type,encodings:f.encodings.map(e=>({encoding:e.content_encoding,sha256:e.sha256[0]?Buffer.from(e.sha256[0]).toString('hex'):null,length:String(e.length)}))})).sort((a,b)=>a.key.localeCompare(b.key));
const expected=Object.fromEntries(JSON.parse(await readFile('evidence/B2Z/audio-corrective-qualification/frozen-inventory.json')).map(x=>[x.path,x]));
assert.deepEqual(files.map(f=>f.key).sort(),Object.keys(expected).filter(n=>n!=='.ic-assets.json5').map(n=>'/'+n).sort());
for(const f of files){if(f.key.endsWith('.flac'))assert.deepEqual(f.encodings.map(e=>e.encoding),['identity']);const e=f.encodings.find(e=>e.encoding==='identity'),w=expected[f.key.slice(1)];assert.equal(e.sha256,w.sha256);assert.equal(e.length,String(w.bytes));}
await writeFile(root+'/inventory-after.json',JSON.stringify({at:new Date().toISOString(),files,identity_encodings_match:true,query_signatures_verified:true},null,2)+'\n');
console.log('PASS pinned-mainnet certified modules/controllers/subnet and signed fifteen-asset inventory');
