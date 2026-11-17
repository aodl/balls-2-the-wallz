/** Anonymous authenticated read-only preservation observation. No update methods. */
import{operationalReader}from'../apps/b2z-observer/mainnet.mjs';
import fs from'node:fs/promises';import{HttpAgent,CanisterStatus}from'@icp-sdk/core/agent';
import{liveClient,certificateVerifier}from'@dtr/timeline-runtime/client/ic-certificate';
import{verifyCertificatePublication,ArtifactAssembler}from'@dtr/timeline-runtime/client/verification';
import{decodeCanonical}from'@dtr/timeline-runtime/runtime/canonical';import{sha256}from'@dtr/timeline-runtime/runtime/seal';
const backend='s5ir5-gqaaa-aaaas-amyna-cai',frontend='s2jxj-liaaa-aaaas-amynq-cai',host='https://icp-api.io',out=process.argv[2];
const report={at:new Date().toISOString(),status:'RUNNING',scope:'Anonymous mainnet read-only queries and certified canister paths; no production mutation',modules:[]};
try{
 const agent=await HttpAgent.create({host,shouldFetchRootKey:false,shouldSyncTime:false,verifyQuerySignatures:true});
 for(const id of[backend,frontend]){const s=await CanisterStatus.request({agent,canisterId:id,paths:['module_hash']});report.modules.push({id,module_hash:s.get('module_hash'),certificate_verified:true});}
 const policy={network:'ic',canister_id:backend},client=await liveClient({...policy,host}),observation=await client.observation();
 const ticket=await verifyCertificatePublication(observation.publication,observation.certificate,{...policy,now_ns:BigInt(Date.now())*1000000n,max_age_ns:300000000000n,max_future_ns:30000000000n},certificateVerifier({network:'ic'}));
 report.identity=ticket.publication.identity;report.head=String(ticket.publication.head.segment_id);report.root=ticket.root_hash;
 const kind=ticket.publication.artifacts.findIndex(a=>a.kind==='state'),descriptor=ticket.publication.artifacts[kind],assembler=new ArtifactAssembler(ticket,'state');
 for(let n=0;n<descriptor.chunks.length;n++)await assembler.accept(n,await client.chunk(Number(ticket.publication.head.segment_id),ticket.root_hash,kind,n));
 const state=await assembler.finish(),w=decodeCanonical(state);report.world={version:w.version,cannons:w.cannons.length,balls:w.balls.length,state_hash:sha256(state)};
 const r=await fetch(`https://${frontend}.icp0.io/app.mjs`);if(!r.ok)throw Error('frontend body HTTP '+r.status);report.served_js_sha256=sha256(new Uint8Array(await r.arrayBuffer()));
 try{report.operational_signed_query=await operationalReader(agent,backend)();report.operational_scope='Signed operational query, not certified gameplay or payment authority';}catch(e){report.operational_unavailable=String(e);}
 report.status='PASS';
}catch(e){report.status='BLOCKED';report.error=String(e);process.exitCode=2;}
await fs.writeFile(out,JSON.stringify(report,(_k,v)=>typeof v==='bigint'?String(v):v,2)+'\n');console.log(JSON.stringify(report,(_k,v)=>typeof v==='bigint'?String(v):v));
