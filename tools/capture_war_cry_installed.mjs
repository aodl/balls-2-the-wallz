import {dirname,join} from 'node:path';
/** Pinned disposable certificate + predecessor/artifact verification, then independent replay.
 * Never a mainnet client, never a wire-repair or timeout-acceptance path. */
import {readFile,writeFile,mkdir}from'node:fs/promises';import assert from'node:assert/strict';
import{liveClient,certificateVerifier}from'@dtr/timeline-runtime/client/ic-certificate';
import{verifyCertificatePublication,verifyRetainedPredecessor,ArtifactAssembler}from'@dtr/timeline-runtime/client/verification';
import{sha256}from'@dtr/timeline-runtime/runtime/seal';import{decodeCanonical,encodeCanonical}from'@dtr/timeline-runtime/runtime/canonical';
import{Cbor}from'@icp-sdk/core/agent';import{replayHistory}from'./lib/replay_s14_history.mjs';
const [configPath,seedPath,out]=process.argv.slice(2);const c=JSON.parse(await readFile(configPath)),revive=(_,v)=>v?.$integer!==undefined?BigInt(v.$integer):v,seed=JSON.parse(await readFile(seedPath,'utf8'),revive);const endpoint=new URL(c.host);assert.equal(c.network,'pocketic-local');assert.equal(endpoint.protocol,'http:');assert.ok(['localhost','127.0.0.1'].includes(endpoint.hostname));assert.match(c.root_key_hex,/^([0-9a-f]{2}){32,1024}$/);
const nowNs=()=>{
 if(c.verification_time_ns===undefined)return BigInt(Date.now())*1000000n;
 assert.match(c.verification_time_ns,/^[0-9]{1,20}$/);
 return BigInt(c.verification_time_ns);
};
await mkdir(out,{recursive:true});await mkdir(out+'/wire',{recursive:true});const packets=[],original=globalThis.fetch,get=(o,k)=>o instanceof Map?o.get(k):o?.[k];let total=0;
globalThis.fetch=async(...args)=>{const r=await original(...args);if(String(args[0]).endsWith('/query')){const body=new Uint8Array(args[1].body),req=Cbor.decode(body),method=get(get(req,'content'),'method_name');const raw=new Uint8Array(await r.clone().arrayBuffer());total+=raw.length;assert.ok(packets.length<4096&&total<=128*1024*1024);assert.equal(r.status,200);const n=String(packets.length).padStart(4,'0')+'.cbor';await writeFile(out+'/wire/'+n,raw);packets.push({method,file:n,request_sha256:sha256(body),response_sha256:sha256(raw),bytes:raw.length,status:r.status});}return r;};
try{
 const rootKey=Uint8Array.from(c.root_key_hex.match(/../g),h=>parseInt(h,16)),policy={network:c.network,canister_id:c.canister_id},verify=certificateVerifier({...policy,rootKey}),client=await liveClient({...policy,rootKey,host:c.host}),observation=await client.observation(),ticket=await verifyCertificatePublication(observation.publication,observation.certificate,{...policy,now_ns:nowNs(),max_age_ns:300000000000n,max_future_ns:30000000000n},verify);
 const tickets=[ticket],head=Number(ticket.publication.head.segment_id),evicted=new Set();
 assert.ok(Number.isSafeInteger(head)&&head>=0&&head<24,'complete declared test history required');
 for(let n=head-1;n>=0;n--){
  let bytes;
  try{bytes=await client.publication(n);}
  catch(error){
   if(c.replay_evicted_artifacts!==true||error?.message!=='publication unavailable: snapshot resync required')throw error;
   // The local harness collected these exact query bytes before eviction.
   // Admit them only if they match the authenticated successor link below.
   bytes=await readFile(join(dirname(seedPath),`publication-${n}.bin`));
   evicted.add(n);
  }
  tickets.unshift(await verifyRetainedPredecessor(bytes,tickets[0]));
 }
 if(evicted.size){
  const n=Math.max(...evicted),bytes=await readFile(join(dirname(seedPath),`publication-${n}.bin`));
  bytes[bytes.length-1]^=1;
  await assert.rejects(()=>verifyRetainedPredecessor(bytes,tickets[n+1]));
 }
 const events=[];
 for(const t of tickets){
  for(let kind=0;kind<t.publication.artifacts.length;kind++){
   const descriptor=t.publication.artifacts[kind],assembler=new ArtifactAssembler(t,descriptor.kind),n=Number(t.publication.head.segment_id);
   const saved=evicted.has(n)?await readFile(join(dirname(seedPath),`publication-${n}-artifact-${kind}.bin`)):null;
   if(saved)assert.equal(saved.length,descriptor.length);
   for(let chunk=0;chunk<descriptor.chunks.length;chunk++){
    const bytes=saved?saved.subarray(chunk*16384,(chunk+1)*16384):await client.chunk(n,t.root_hash,kind,chunk);
    await assembler.accept(chunk,bytes);
   }
   const bytes=await assembler.finish();
   await writeFile(out+`/publication-${n}-${descriptor.kind}.bin`,bytes);
   if(n===0&&descriptor.kind==='state'){
    assert.equal(sha256(bytes),t.publication.head.state_hash);
    assert.equal(t.publication.head.seal.previous_state,sha256(Buffer.from(seed.initial_world_hex,'hex')),'declared initial world must be the authenticated first interval predecessor');
   }
   if(descriptor.kind==='events')events.push({segment_id:String(n),events_hex:Buffer.from(bytes).toString('hex')});
  }
 }
 const assigned=[];for(const t of tickets){const s=t.publication.head.seal;if(s)assigned.push(...seed.inputs.filter(i=>BigInt(i.position)>=s.source_from&&BigInt(i.position)<s.source_to_exclusive).map(i=>String(i.position)));}
 const trace={...seed,publications:tickets.map(t=>t.publication),artifact_events:events,assigned};const result=replayHistory(trace);assert.ok(seed.inputs.every(i=>assigned.includes(String(i.position))),'no paid input left pending at test completion');
 const {RESERVOIR_IDENTITY,ECONOMY_IDENTITY,DELEGATED_IDENTITY,COMPACT_RESERVOIR_IDENTITY}=await import('../packages/kernels/b2z/world.mjs');
 const lastConfig=trace.publications.at(-1).identity.config_hash,delegation=[DELEGATED_IDENTITY,COMPACT_RESERVOIR_IDENTITY].some(identity=>lastConfig===identity.config_hash),economy=delegation||lastConfig===ECONOMY_IDENTITY.config_hash;
 if(economy||lastConfig===RESERVOIR_IDENTITY.config_hash){
  const {prepareCheckpoint,prepareDerivedSegment,CheckpointPlayer,SegmentPlayer}=await import('../apps/b2z-observer/model.mjs');
  const open=(publication,kind)=>readFile(out+'/publication-'+publication.head.segment_id+'-'+kind+'.bin');
  for(let index=1;index<trace.publications.length;index++){
   const p=trace.publications[index],prior=trace.publications[index-1];
   const [initial,state,events,scores]=await Promise.all([open(prior,'state'),open(p,'state'),open(p,'events'),open(p,'scores')]);
   const segment=p.head.seal===null?await prepareCheckpoint(initial,{state,events,scores},p,prior):await prepareDerivedSegment(initial,state,events,p);
   const View=segment.checkpoint?CheckpointPlayer:SegmentPlayer;
   new View(segment).advance(segment.end);
  }
  result.observer='Authenticated artifact sequence plays through both schema versions';
 }
 // Negatives retain the real source/artifact commitments and must fail.
 if(economy){
  const tampered=structuredClone(trace),timed=tampered.inputs.find(i=>i.payload_hex.startsWith('42545a5041593038'));
  assert.ok(timed);
  timed.payload_hex=timed.payload_hex.slice(0,-2)+(timed.payload_hex.endsWith('00')?'01':'00');
  assert.throws(()=>replayHistory(tampered));
 }
 if(delegation){
  const tampered=structuredClone(trace),delegated=tampered.inputs.find(i=>i.payload_hex.startsWith('42545a5041593039'));
  assert.ok(delegated);
  delegated.payload_hex=delegated.payload_hex.slice(0,-2)+(delegated.payload_hex.endsWith('00')?'01':'00');
  assert.throws(()=>replayHistory(tampered));
 }
 const wrongInput=structuredClone(trace),annotated=wrongInput.inputs.find(i=>['BTZPAY03','BTZPAY04','BTZPAY05','BTZPAY06'].some(m=>i.payload_hex.startsWith(Buffer.from(m).toString('hex')))&&i.payload_hex.length>114);assert.ok(annotated);annotated.payload_hex=annotated.payload_hex.slice(0,-2)+(annotated.payload_hex.endsWith('41')?'42':'41');assert.throws(()=>replayHistory(wrongInput));
 const incomplete=structuredClone(trace);incomplete.artifact_events.pop();assert.throws(()=>replayHistory(incomplete));
 const altered=structuredClone(trace),reservoir=economy||lastConfig===RESERVOIR_IDENTITY.config_hash, target=e=>reservoir?e.kind==='reservoir_built':e.launch_annotation,row=altered.artifact_events.find(x=>decodeCanonical(Buffer.from(x.events_hex,'hex')).events.some(target));const decoded=decodeCanonical(Buffer.from(row.events_hex,'hex')),item=decoded.events.find(target);if(reservoir)item.cell=(item.cell+1)%1000000;else item.launch_annotation.cry='Forged';row.events_hex=Buffer.from(encodeCanonical(decoded)).toString('hex');assert.throws(()=>replayHistory(altered));
 const wrongSource=decodeCanonical(observation.publication);wrongSource.identity.source_id='ef'.repeat(32);await assert.rejects(()=>verifyCertificatePublication(encodeCanonical(wrongSource),observation.certificate,{...policy,now_ns:nowNs(),max_age_ns:300000000000n,max_future_ns:30000000000n},verify));
 await assert.rejects(()=>verifyCertificatePublication(observation.publication,observation.certificate,{...policy,canister_id:'aaaaa-aa',now_ns:nowNs(),max_age_ns:300000000000n,max_future_ns:30000000000n},verify));
 await assert.rejects(()=>verifyCertificatePublication(observation.publication,observation.certificate,{...policy,now_ns:nowNs()+360000000000n,max_age_ns:300000000000n,max_future_ns:30000000000n},verify),/certificate freshness/);
 const damaged=Uint8Array.from(observation.certificate);damaged[damaged.length-1]^=1;await assert.rejects(()=>verifyCertificatePublication(observation.publication,damaged,{...policy,now_ns:nowNs(),max_age_ns:300000000000n,max_future_ns:30000000000n},verify));
 await writeFile(out+'/authenticated-history.json',JSON.stringify(trace,(_,v)=>typeof v==='bigint'?{$integer:String(v)}:v)+'\n');await writeFile(out+'/result.json',JSON.stringify({status:'PASS',scope:'Actual disposable IC; pinned BLS/canister/freshness, signed query transport, authenticated predecessor/artifacts, independent replay; not production',root_key_sha256:sha256(rootKey),certificate_root:ticket.root_hash,head,packets,wire_bytes:total,evicted_publications_verified:[...evicted].sort((a,b)=>a-b),freshness_clock:c.verification_time_ns===undefined?'wall clock':'disposable PocketIC consensus clock',independent:result,negatives:['changed normalized cry','incomplete events',reservoir?'altered reservoir destination':'altered launch text','wrong source publication','wrong canister binding','damaged certificate']},null,2)+'\n');console.log('PASS authenticated annotation capture and independent replay',head+1,'publications');
}finally{globalThis.fetch=original;}
