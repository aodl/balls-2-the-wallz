/** Verify the immutable installed module and its exact served bytes. Local only. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {disposableProofs,hex} from './lib/disposable_http_proofs.mjs';

const [host,id,release,out]=process.argv.slice(2);
const info=JSON.parse(await readFile(release+'/module.json'));
const entries=JSON.parse(await readFile(release+'/embedded-inventory.json'));
const {module,request:requestOnce,checkProof}=await disposableProofs(host,id);
assert.equal(module,info.sha256);
const timeouts=[];
async function request(path,encoding,method='GET'){
 try{return await requestOnce(path,encoding,method);}
 catch(error){
  if(!error.message.endsWith(' timed out'))throw error;
  timeouts.push(error.message);
  console.warn(error.message+'; retrying the read once');
  return requestOnce(path,encoding,method);
 }
}
const certifiedHeaders=['content-type','content-length','content-encoding','cache-control','content-security-policy','permissions-policy',
 'referrer-policy','strict-transport-security','x-content-type-options','x-frame-options','x-xss-protection','cross-origin-resource-policy'];
const header=(response,key)=>response.h[key];
function security(response){
 assert.match(header(response,'content-security-policy'),/default-src 'none'/);
 assert.match(header(response,'content-security-policy'),/frame-ancestors 'none'/);
 assert.equal(header(response,'x-content-type-options'),'nosniff');
 assert.equal(header(response,'referrer-policy'),'no-referrer');
 assert.equal(header(response,'cross-origin-resource-policy'),'same-origin');
 assert.ok(header(response,'permissions-policy')?.includes('payment=()'));
}
const exactPath=path=>['http_expr',...path.slice(1).split('/'),'<$>'];
const results=[];
let negative=false;
for(const asset of entries){
 const variants=[];
 for(const variant of asset.variants){
  const response=await request(asset.path,variant.encoding);
  assert.equal(response.status,200,asset.path);
  assert.equal(header(response,'content-encoding')??'identity',variant.encoding);
  assert.equal(hex(response.body),variant.sha256,asset.path);
  assert.equal(response.body.byteLength,variant.bytes,asset.path);
  security(response);
  assert.deepEqual(await checkProof(response,'GET',certifiedHeaders),exactPath(asset.path));
  if(!negative){
   const mutated=Buffer.from(response.body);
   mutated[0]^=1;
   await assert.rejects(()=>checkProof({...response,body:mutated},'GET',certifiedHeaders));
   await assert.rejects(()=>checkProof({...response,status:404},'GET',certifiedHeaders));
   negative=true;
  }
  if(asset.path.endsWith('.flac')){
   assert.equal(header(response,'content-type'),'audio/flac');
   assert.equal(header(response,'cache-control'),'public, max-age=31536000, immutable');
  }
  variants.push({encoding:variant.encoding,sha256:hex(response.body),bytes:response.body.byteLength,elapsed_ms:response.elapsedMs});
 }
 const head=await request(asset.path,'identity','HEAD');
 const mime={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',mjs:'text/javascript; charset=utf-8',
  json:'application/json',ico:'image/x-icon',svg:'image/svg+xml',bin:'application/octet-stream',
  did:'text/plain; charset=utf-8',md:'text/plain; charset=utf-8',flac:'audio/flac'};
 assert.equal(header(head,'content-type'),mime[asset.path.split('.').at(-1)],asset.path);
 assert.equal(head.status,200,asset.path);
 assert.equal(head.body.length,0,asset.path);
 assert.equal(Number(header(head,'content-length')),asset.variants[0].bytes,asset.path);
 security(head);
 assert.deepEqual(await checkProof(head,'HEAD',certifiedHeaders),exactPath(asset.path));
 results.push({...asset,verified_variants:variants,head:true,mime:header(head,'content-type')});
}
const index=entries.find(a=>a.path==='/index.html').variants[0];
const fallback=entries.find(a=>a.path==='/404.html').variants[0];
const routes=[];
for(const url of ['/','/blah','/nonexistent/page','/nonexistent/page/','/nonexistent/page?example=1',
 '/missing.js','/missing.css','/missing.svg','/missing.bin','/missing.flac','/app.mjs.gz','/.ic-assets.json5','/build-manifest.json','/deployment.json']){
 for(const method of ['GET','HEAD']){
  const response=await request(url,'identity',method), root=url==='/';
  assert.equal(response.status,root?200:404,url);
  assert.match(header(response,'content-type'),/^text\/html/);
  security(response);
  if(method==='GET')assert.equal(hex(response.body),root?index.sha256:fallback.sha256,url);
  else{
   assert.equal(response.body.length,0,url);
   assert.equal(Number(header(response,'content-length')),root?index.bytes:fallback.bytes,url);
  }
  const proof=await checkProof(response,method,certifiedHeaders);
  if(root)assert.deepEqual(proof,exactPath('/'));
  else{
   assert.equal(proof[0],'http_expr');
   assert.equal(proof.at(-1),'<*>');
   assert.ok(proof.slice(1,-1).every(part=>part===''),'root wildcard only');
  }
  routes.push({url,method,status:response.status,proof});
 }
}
await writeFile(out,JSON.stringify({status:'PASS',module,id,files:results,routes,negative,timeouts},null,2)+'\n');
console.log('PASS immutable frontend',module,results.length+' actual GET/HEAD responses',routes.length+' alternate routes');
