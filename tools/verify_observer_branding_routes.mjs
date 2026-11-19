/** Read-only HTTP-v2 and signed-inventory checks on a disposable asset canister. */
import assert from 'node:assert/strict';
import {get} from 'node:http';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {Actor,CanisterStatus,Certificate,Cbor,HttpAgent,lookup_path,lookupResultToBuffer,reconstruct,requestIdOf} from '@icp-sdk/core/agent';
import {IDL} from '@icp-sdk/core/candid';
import {Principal} from '@icp-sdk/core/principal';

const [host,id,assets,output]=process.argv.slice(2);
const server=new URL(host);
assert.equal(server.hostname,'127.0.0.1','Disposable verification only');
assert.equal(server.protocol,'http:');
const canisterId=Principal.fromText(id);
const agent=await HttpAgent.create({host,shouldFetchRootKey:true,shouldSyncTime:false,verifyQuerySignatures:true});
// The dfx disposable gateway omits the timestamp on its signed root-to-subnet
// delegation. Verify the SDK's signature/range proof and require freshness on
// each timestamped leaf explicitly. This adapter is fenced to loopback above.
const nowNs=()=>BigInt(Date.now())*1000000n;
function fresh(cert){
 const time=lookupResultToBuffer(cert.lookup_path(['time']));
 assert.ok(time?.length&&time.length<=10,'missing leaf timestamp');
 let value=0n;
 for(let i=0;i<time.length;i++){
  assert.equal(Boolean(time[i]&128),i+1<time.length,'malformed leaf timestamp');
  value|=BigInt(time[i]&127)<<BigInt(i*7);
 }
 const age=nowNs()-value;
 assert.ok(age>=-30000000000n&&age<=300000000000n,'stale disposable certificate');
}
const readState=agent.readState.bind(agent);
agent.readState=async(target,fields,...other)=>{
 const result=await readState(target,{...fields,disableTimeVerification:true},...other);
 fresh(result.verifiedCertificate);
 return result;
};
const status=await CanisterStatus.request({agent,canisterId,paths:['module_hash','subnet'],disableCertificateTimeVerification:true});
const subnetId=Principal.fromText(status.get('subnet').subnetId);
const statusProof=await agent.readState(canisterId,{paths:[[new TextEncoder().encode('subnet')]]});
const delegation=statusProof.verifiedCertificate.cert.delegation;
assert.deepEqual(Buffer.from(delegation.subnet_id),Buffer.from(subnetId.toUint8Array()));
const binding=await Certificate.create({certificate:delegation.certificate,rootKey:agent.rootKey,
 principal:{subnetId},disableTimeVerification:true});
const subnetKey=lookupResultToBuffer(binding.lookup_path(['subnet',subnetId.toUint8Array(),'public_key']));
assert.equal(subnetKey.length,133);
const module=status.get('module_hash');
assert.equal(module,'04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62');
const sha=bytes=>createHash('sha256').update(bytes).digest();
const hex=bytes=>sha(bytes).toString('hex');
const encoding=IDL.Record({content_encoding:IDL.Text,sha256:IDL.Opt(IDL.Vec(IDL.Nat8)),length:IDL.Nat});
const asset=IDL.Record({key:IDL.Text,content_type:IDL.Text,encodings:IDL.Vec(encoding)});
const actor=Actor.createActor(()=>IDL.Service({list:IDL.Func([IDL.Record({})],[IDL.Vec(asset)],['query'])}),{agent,canisterId});
const inventory=await actor.list({});
const paths=(await readdir(assets,{recursive:true,withFileTypes:true})).filter(f=>f.isFile()&&f.name!=='.ic-assets.json5')
  .map(f=>'/'+f.parentPath.slice(assets.length).replace(/^\//,'')+(f.parentPath===assets?'':'/')+f.name).sort();
assert.deepEqual(inventory.map(f=>f.key).sort(),paths);
function request(path,encoding){
 return new Promise((resolve,reject)=>{
  const req=get(new URL(path,host),{headers:{Host:id+'.localhost:'+server.port,'Accept-Encoding':encoding}},res=>{
   const chunks=[];
   res.on('data',c=>chunks.push(c));
   res.on('error',reject);
   res.on('end',()=>resolve({status:res.statusCode,h:res.headers,body:Buffer.concat(chunks)}));
  });
  req.on('error',reject);
  req.setTimeout(30_000,()=>req.destroy(new Error('asset request timed out')));
 });
}
async function checkProof({status,h,body}){
 const certificate=h['ic-certificate'],expression=h['ic-certificateexpression'];
 assert.match(certificate,/version=2/);
 assert.match(expression,/no_request_certification: Empty\{\}/);
 const part=key=>{
  const found=certificate.match(new RegExp('(?:^|,\\s*)'+key+'=:([^:]+):'));
  assert.ok(found,key);
  return Buffer.from(found[1],'base64');
 };
 const encoded=part('certificate'),decoded=Cbor.decode(encoded);
 // The gateway supplies a pruned delegation. Bind its subnet to the earlier
 // read_state proof, which checked the canister's authorised subnet range.
 assert.deepEqual(Buffer.from(decoded.delegation.subnet_id),Buffer.from(subnetId.toUint8Array()));
 const leaf=Cbor.encode({tree:decoded.tree,signature:decoded.signature});
 const c=await Certificate.create({certificate:leaf,rootKey:subnetKey,principal:{subnetId}});
 fresh(c);
 const root=lookupResultToBuffer(c.lookup_path(['canister',canisterId.toUint8Array(),'certified_data']));
 assert.ok(root);
 const tree=Cbor.decode(part('tree'));
 assert.deepEqual(Buffer.from(await reconstruct(tree)),Buffer.from(root));
 const path=Cbor.decode(part('expr_path')).map(v=>typeof v==='string'?v:new TextDecoder().decode(v));
 const names=JSON.parse(expression.match(/ResponseHeaderList\{headers: (\[[^\]]*\])/)[1]).map(n=>n.toLowerCase());
 const headers=Object.fromEntries(Object.entries(h).filter(([k])=>names.includes(k)||k==='ic-certificateexpression').map(([key,value])=>{
  if(Array.isArray(value)){assert.equal(value.length,1,key);return [key,value[0]];}
  return [key,value];
 }));
 headers[':ic-cert-status']=status;
 const response=sha(Buffer.concat([Buffer.from(requestIdOf(headers)),sha(body)]));
 const proof=lookupResultToBuffer(lookup_path([...path,sha(expression),'',response],tree));
 assert.ok(proof!==undefined,'response absent from the certified witness');
 assert.equal(proof.length,0);
 return path;
}
const files=[];
for(const f of inventory.sort((a,b)=>a.key.localeCompare(b.key))){
 const expected=await readFile(assets+f.key);
 const variants=[];
 for(const e of f.encodings){
  const response=await request(f.key,e.content_encoding);
  assert.equal(response.status,200);
  assert.equal(response.h['content-type'],f.content_type);
  assert.equal(response.h['content-encoding']??'identity',e.content_encoding);
  assert.equal(response.h['x-content-type-options'],'nosniff');
  assert.equal(response.h['referrer-policy'],'no-referrer');
  assert.ok(response.h['permissions-policy'],f.key);
  assert.match(response.h['content-security-policy'],/default-src 'none'/);
  assert.equal(BigInt(response.body.byteLength),e.length);
  assert.equal(hex(response.body),Buffer.from(e.sha256[0]).toString('hex'));
  assert.deepEqual(e.content_encoding==='gzip'?gunzipSync(response.body):response.body,expected);
  try {
   assert.deepEqual(await checkProof(response),['http_expr',...f.key.slice(1).split('/'),'<$>']);
  } catch(error) {
   throw new Error(f.key+' '+e.content_encoding+' '+response.h['ic-certificateexpression'],{cause:error});
  }
  variants.push({encoding:e.content_encoding,bytes:response.body.byteLength,sha256:hex(response.body)});
 }
 if(f.key.endsWith('.flac')||f.key.endsWith('/audio/b2z-v1/manifest.json'))assert.deepEqual(f.encodings.map(x=>x.content_encoding),['identity']);
 assert.ok(variants.some(v=>v.encoding==='identity'));
 files.push({path:f.key,mime:f.content_type,variants});
}
const routes=[];
for(const url of ['/blah','/nonexistent/page','/nonexistent/page/','/nonexistent/page?example=1','/missing.js','/missing.css','/missing.svg','/missing.bin','/404.html','/','/index.html']){
 const result=await request(url,'identity');
 let proof=null,proofError=null;
 try{proof=await checkProof(result);}catch(error){proofError=error.message;}
 routes.push({url,status:result.status,mime:result.h['content-type'],sha256:hex(result.body),proof,proofError});
}
assert.equal(routes.find(r=>r.url==='/404.html').sha256,hex(await readFile(assets+'/404.html')));
assert.equal(routes.find(r=>r.url==='/').sha256,hex(await readFile(assets+'/index.html')));
const fallback=routes.slice(0,8);
const custom404=fallback.every(r=>r.status===404&&r.sha256===routes.at(-3).sha256&&r.proof!==null);
const fallbackToGame=fallback.every(r=>r.status===200&&r.sha256===routes.at(-1).sha256);
assert.ok(custom404||fallbackToGame,'Unexplained fallback behaviour');
await writeFile(output,JSON.stringify({module,canisterId:id,staticFiles:'PASS',custom404:custom404?'PASS':'BLOCKED',fallbackToGame,files,routes},null,2)+'\n');
console.log('PASS '+files.length+' signed asset entries and all encoded HTTP-v2 variants. Custom 404: '+(custom404?'PASS':'BLOCKED'));
