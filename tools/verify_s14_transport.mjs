#!/usr/bin/env node
/** Read-only SDK transport check against the owned, live PocketIC gateway. */
import {readFile,writeFile} from 'node:fs/promises';
import {parseArgs} from 'node:util';
import {localLiveClient,localCertificateVerifier} from '@dtr/timeline-runtime/client/ic-certificate';
import {ArtifactAssembler,PublicationSequence,verifyCertificatePublication} from '@dtr/timeline-runtime/client/verification';
const {values}=parseArgs({options:{snapshot:{type:'string'},host:{type:'string'},canister:{type:'string'},output:{type:'string'}}});
const root=new Uint8Array(await readFile(values.snapshot+'/root-key.der'));
const client=await localLiveClient(root,{network:'pocketic-local',canister_id:values.canister,host:values.host});
const verify=localCertificateVerifier(root),sequence=new PublicationSequence();
const ticket=async()=>{
 const o=await client.observation();return verifyCertificatePublication(o.publication,o.certificate,{network:'pocketic-local',canister_id:values.canister,now_ns:BigInt(Date.now())*1000000n,max_age_ns:300000000000n,max_future_ns:30000000000n},verify);
};
const first=await ticket();sequence.accept(first);const segment=first.publication.head.segment_id;
if(segment===null)throw new Error('committed segment required');
for(const [kindIndex,kind] of ['state','events','scores'].entries()){
 const assembler=new ArtifactAssembler(first,kind);
 for(let index=0;index<assembler.descriptor.chunks.length;index++)await assembler.accept(index,await client.chunk(Number(segment),first.root_hash,kindIndex,index));
 await assembler.finish();
}
const retained=await client.retention();
if(retained.max_segments!==16||retained.max_bytes!==8*1024*1024||retained.retained_bytes>retained.max_bytes
 ||retained.entries.length<1||retained.entries.length>16)throw new Error('retention policy');
if(retained.entries.reduce((total,entry)=>total+entry.bytes,0)!==retained.retained_bytes
 ||retained.entries.filter(entry=>entry.current).length!==1||!retained.entries.at(-1).current
 ||retained.entries.some((entry,index)=>!/^[0-9a-f]{64}$/.test(entry.publication_hash)
   ||index>0&&entry.segment_id!==retained.entries[index-1].segment_id+1))throw new Error('retention metadata');
const deadline=Date.now()+30000;let next;
while(Date.now()<deadline){next=await ticket();if(next.publication.head.segment_id>segment)break;await new Promise(r=>setTimeout(r,500));}
if(next.publication.head.segment_id<=segment)throw new Error('autonomous service did not publish');
if(next.publication.head.segment_id===segment+1n)sequence.accept(next);else sequence.resync(next);
const result={status:'PASS',mode:'LIVE_READ_ONLY_LOCAL_SDK',first_segment:segment.toString(),next_segment:next.publication.head.segment_id.toString(),certificate_root:'explicit disposable root; no root fetching',authenticated_artifacts:['state','events','scores'],retention:retained};
await writeFile(values.output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
