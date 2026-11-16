/** Actual disposable IC certificate anchors the complete recorded purchase history.
 * This supplements native HTTP wire capture; it never repairs an incomplete wire
 * response or treats a content pin as an IC certificate. Read-only loopback only. */
import {readFile,writeFile,stat,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {certificateVerifier,liveClient} from '@dtr/timeline-runtime/client/ic-certificate';
import {Cbor} from '@icp-sdk/core/agent';
import {verifyCertificatePublication,verifyRetainedPredecessor,ArtifactAssembler} from '@dtr/timeline-runtime/client/verification';
import {encodeCanonical,decodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
import {replayHistory} from './lib/replay_s14_history.mjs';

const [directory]=process.argv.slice(2),revive=(_,v)=>v?.$integer!==undefined?BigInt(v.$integer):v;
async function bounded(name,max){const s=await stat(directory+'/'+name);assert.ok(s.isFile()&&s.size<=max,'bounded recorded file');return new Uint8Array(await readFile(directory+'/'+name));}
const c=JSON.parse(new TextDecoder().decode(await bounded('browser/configuration.json',1024*1024))),metadata=JSON.parse(new TextDecoder().decode(await bounded('browser/metadata.json',1024*1024)));
assert.equal(c.network,'pocketic-local');const host=new URL(c.host);assert.equal(host.protocol,'http:');assert.ok(['127.0.0.1','localhost'].includes(host.hostname));assert.equal(c.canister_id,metadata.canister_id);
assert.match(c.root_key_hex,/^(?:[0-9a-f]{2}){32,1024}$/);const rootKey=Uint8Array.from(c.root_key_hex.match(/../g),x=>parseInt(x,16));assert.equal(sha256(rootKey),metadata.root_key_sha256);
const trace=JSON.parse(new TextDecoder().decode(await bounded('trace.json',128*1024*1024)),revive),raw=await bounded('final-publication.bin',65536),certificate=await bounded('final-certificate.cbor',1024*1024),policy={network:c.network,canister_id:c.canister_id},verify=certificateVerifier({...policy,rootKey});
const options={...policy,now_ns:BigInt(Date.now())*1000000n,max_age_ns:300000000000n,max_future_ns:30000000000n};
await verifyCertificatePublication(raw,certificate,options,verify);
await mkdir(directory+'/authenticated/wire',{recursive:true});const originalFetch=globalThis.fetch,packets=[],latestBodies=new Map(),get=(v,k)=>v instanceof Map?v.get(k):v?.[k];let wireBytes=0,tip;
globalThis.fetch=async(url,init)=>{const endpoint=new URL(url);assert.equal(endpoint.origin,host.origin);if(init?.method==='POST')assert.ok(endpoint.pathname.endsWith('/query')||endpoint.pathname.endsWith('/read_state'));
 const signal=init?.signal?AbortSignal.any([init.signal,AbortSignal.timeout(10000)]):AbortSignal.timeout(10000),response=await originalFetch(url,{...init,signal});
 if(endpoint.pathname.endsWith('/query')){const request=new Uint8Array(init.body),body=new Uint8Array(await response.clone().arrayBuffer());assert.equal(response.status,200);wireBytes+=body.length;assert.ok(packets.length<4096&&wireBytes<=128*1024*1024);const name=String(packets.length).padStart(4,'0')+'.cbor';await writeFile(directory+'/authenticated/wire/'+name,body);const decoded=Cbor.decode(request);packets.push({method:get(get(decoded,'content'),'method_name'),file:name,status:response.status,bytes:body.length,request_sha256:sha256(request),response_sha256:sha256(body)});}return response;};
try{
 const client=await liveClient({...policy,rootKey,host:c.host}),observation=await client.observation();assert.deepEqual(observation.publication,raw);
 tip=await verifyCertificatePublication(observation.publication,observation.certificate,options,verify);
 await writeFile(directory+'/authenticated/final-publication.bin',observation.publication);await writeFile(directory+'/authenticated/final-certificate.cbor',observation.certificate);
 for(const [kind,d]of tip.publication.artifacts.entries()){const pieces=[];for(let i=0;i<d.chunks.length;i++)pieces.push(await client.chunk(Number(tip.publication.head.segment_id),tip.root_hash,kind,i));latestBodies.set(kind,Uint8Array.from(Buffer.concat(pieces.map(x=>Buffer.from(x)))));}
}finally{globalThis.fetch=originalFetch;}
const head=Number(tip.publication.head.segment_id);
assert.ok(Number.isSafeInteger(head)&&head>=0&&head<4096);assert.equal(trace.publications.length,head+1);assert.deepEqual(encodeCanonical(trace.publications.at(-1)),raw);
assert.equal(tip.publication.identity.rules_hash,'5d0ca4591a782b609ef10d9db46d4bd93042b0fcdd738d8d1f920840c05b7756');
const tickets=[tip];for(let n=head-1;n>=0;n--)tickets.unshift(await verifyRetainedPredecessor(encodeCanonical(trace.publications[n]),tickets[0]));
let total=raw.length+certificate.length;const events=[];
for(const t of tickets){const n=Number(t.publication.head.segment_id);assert.equal(n,events.length);for(const [kind,d] of t.publication.artifacts.entries()){
 assert.ok(['state','events','scores'].includes(d.kind));const body=await bounded(`publication-${n}-artifact-${kind}.bin`,1024*1024);total+=body.length;assert.ok(total<=128*1024*1024);
 if(n===head)assert.deepEqual(body,latestBodies.get(kind),'final paid receipt artifacts must match complete HTTP bytes');
 const assembler=new ArtifactAssembler(t,d.kind);for(let i=0;i<d.chunks.length;i++)await assembler.accept(i,body.subarray(i*t.publication.chunk_bytes,(i+1)*t.publication.chunk_bytes));const verified=await assembler.finish();assert.deepEqual(verified,body);
 if(d.kind==='events')events.push({segment_id:String(n),events_hex:Buffer.from(body).toString('hex')});
}}
assert.deepEqual(trace.artifact_events,events);assert.ok(trace.inputs.every(i=>trace.assigned.includes(String(i.position))),'no paid input pending');const replay=replayHistory({...trace,publications:tickets.map(t=>t.publication),artifact_events:events});
const altered=structuredClone(trace),annotated=altered.inputs.find(i=>i.payload_hex.startsWith(Buffer.from('BTZPAY03').toString('hex'))&&i.payload_hex.length>114);assert.ok(annotated);annotated.payload_hex=annotated.payload_hex.slice(0,-2)+(annotated.payload_hex.endsWith('41')?'42':'41');assert.throws(()=>replayHistory(altered));
const missing=structuredClone(trace);missing.publications.pop();assert.throws(()=>replayHistory(missing));
const changed=structuredClone(trace),row=changed.artifact_events.find(r=>decodeCanonical(Buffer.from(r.events_hex,'hex')).receipts.length>0);assert.ok(row);const decoded=decodeCanonical(Buffer.from(row.events_hex,'hex'));decoded.receipts[0].reason='FORGED';row.events_hex=Buffer.from(encodeCanonical(decoded)).toString('hex');assert.throws(()=>replayHistory(changed));
const last=tickets.at(-1),descriptor=last.publication.artifacts[0],state=await bounded(`publication-${head}-artifact-0.bin`,1024*1024),incomplete=new ArtifactAssembler(last,descriptor.kind);await assert.rejects(async()=>{for(let i=0;i<descriptor.chunks.length;i++)await incomplete.accept(i,state.subarray(i*last.publication.chunk_bytes,Math.min((i+1)*last.publication.chunk_bytes,state.length-1)));await incomplete.finish();});
const wrong=decodeCanonical(raw);wrong.identity.source_id='ef'.repeat(32);await assert.rejects(()=>verifyCertificatePublication(encodeCanonical(wrong),certificate,options,verify));
await assert.rejects(()=>verifyCertificatePublication(raw,certificate,{...options,canister_id:'aaaaa-aa'},verify));const damaged=Uint8Array.from(certificate);damaged[damaged.length-1]^=1;await assert.rejects(()=>verifyCertificatePublication(raw,damaged,options,verify));
await writeFile(directory+'/replay.json',JSON.stringify(replay,null,2)+'\n');await writeFile(directory+'/authenticated/result.json',JSON.stringify({status:'PASS',scope:'Actual disposable signed-query HTTP observation and final paid artifacts; pinned BLS/root/canister/freshness anchors the entire recorded predecessor/artifact chain and independent replay; supplements separate strict native HTTP capture, not production',head,certificate_root:tip.root_hash,root_key_sha256:sha256(rootKey),verified_recorded_bytes:total,packets,wire_bytes:wireBytes,per_request_deadline_ms:10000,independent:replay,negatives:['changed normalized cry','missing publication','forged receipt','truncated artifact','wrong source','wrong canister','damaged certificate']},null,2)+'\n');console.log('PASS certified combined history including final paid receipts',head+1,'publications');
