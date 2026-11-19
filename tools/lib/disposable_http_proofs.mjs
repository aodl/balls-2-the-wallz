/** Read-only signatures and response proofs against a dedicated loopback DFX network. */
import assert from 'node:assert/strict';
import {request as httpRequest} from 'node:http';
import {createHash} from 'node:crypto';
import {CanisterStatus,Certificate,Cbor,HttpAgent,lookup_path,lookupResultToBuffer,reconstruct,requestIdOf} from '@icp-sdk/core/agent';
import {Principal} from '@icp-sdk/core/principal';

const sha=bytes=>createHash('sha256').update(bytes).digest();
const hex=bytes=>sha(bytes).toString('hex');
export async function disposableProofs(host,id){
const server=new URL(host);
assert.equal(server.hostname,'127.0.0.1','Disposable verification only');
assert.equal(server.protocol,'http:');
assert.ok(server.port,'an explicit disposable gateway port is required');
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
function request(path,encoding,method="GET"){
 const began=performance.now();
 return new Promise((resolve,reject)=>{
  const req=httpRequest(new URL(path,host),{method,headers:{Host:id+'.localhost:'+server.port,'Accept-Encoding':encoding}},res=>{
   const chunks=[];
   res.on('data',c=>chunks.push(c));
   res.on('error',reject);
   res.on('end',()=>resolve({status:res.statusCode,h:res.headers,body:Buffer.concat(chunks),elapsedMs:performance.now()-began}));
  });
  req.on('error',reject);
  req.setTimeout(30_000,()=>req.destroy(new Error(method+' '+path+' ('+encoding+') timed out')));
  req.end();
 });
}
async function checkProof({status,h,body}, method="GET", certifiedHeaders=[]){
 const certificate=h['ic-certificate'],expression=h['ic-certificateexpression'];
 assert.match(certificate,/version=2/);
 const full=certifiedHeaders.length>0;
 assert.match(expression,full?/request_certification:RequestCertification\{certified_request_headers:\[\],certified_query_parameters:\[\]\}/ : /no_request_certification: Empty\{\}/);
 if(full)assert.match(expression,/response_header_exclusions:ResponseHeaderList\{headers:\[\]\}/);
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
 const names=full?certifiedHeaders:JSON.parse(expression.match(/ResponseHeaderList\{headers: (\[[^\]]*\])/)[1]).map(n=>n.toLowerCase());
 const headers=Object.fromEntries(Object.entries(h).filter(([k])=>names.includes(k)||k==='ic-certificateexpression').map(([key,value])=>{
  if(Array.isArray(value)){assert.equal(value.length,1,key);return [key,value[0]];}
  return [key,value];
 }));
 headers[':ic-cert-status']=status;
 const response=sha(Buffer.concat([Buffer.from(requestIdOf(headers)),sha(body)]));
 const requestBinding=full?sha(Buffer.concat([Buffer.from(requestIdOf({':ic-cert-method':method})),sha(new Uint8Array())])):'';
 const proof=lookupResultToBuffer(lookup_path([...path,sha(expression),requestBinding,response],tree));
 assert.ok(proof!==undefined,'response absent from the certified witness');
 assert.equal(proof.length,0);
 return path;
}
return {module:status.get('module_hash'),agent,canisterId,request,checkProof};
}
export {hex};
