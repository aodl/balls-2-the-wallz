import fs from 'node:fs/promises';
import {HttpAgent,CanisterStatus} from '@icp-sdk/core/agent';
import {liveClient,certificateVerifier} from '@dtr/timeline-runtime/client/ic-certificate';
import {verifyCertificatePublication,verifyRetainedPredecessor,ArtifactAssembler} from '@dtr/timeline-runtime/client/verification';
import {decodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
import {operationalReader} from '../../apps/b2z-observer/mainnet.mjs';

const [directory,ancestorDir]=process.argv.slice(2);
const host='https://icp-api.io',canister_id='s5ir5-gqaaa-aaaas-amyna-cai',policy={host,network:'ic',canister_id};
await fs.mkdir(directory,{recursive:true});
const client=await liveClient(policy), agent=await HttpAgent.create({host,shouldFetchRootKey:false,shouldSyncTime:false,verifyQuerySignatures:true});
const observation=await client.observation();
const ticket=await verifyCertificatePublication(observation.publication,observation.certificate,{...policy,now_ns:BigInt(Date.now())*1000000n,max_age_ns:300000000000n,max_future_ns:30000000000n},certificateVerifier({network:'ic'}));
const module=(await CanisterStatus.request({agent,canisterId:canister_id,paths:['module_hash']})).get('module_hash');
const at=new Date().toISOString(),p=ticket.publication;
const report={at,module,root:ticket.root_hash,publication:p};
await fs.writeFile(directory+'/publication.bin',observation.publication);
await fs.writeFile(directory+'/certificate.cbor',observation.certificate);
const ancestor=ancestorDir?decodeCanonical(await fs.readFile(ancestorDir+'/publication.bin')):null;
let item=ticket;
const chain=[];
for(;;){
 const pub=item.publication,id=Number(pub.head.segment_id);
 if(ancestor && pub.head.segment_id===ancestor.head.segment_id){
  if(item.root_hash!==sha256(await fs.readFile(ancestorDir+'/publication.bin')))throw Error('Authenticated predecessor bytes changed');
  chain.push({head:id,root:item.root_hash,manifest:pub.head.manifest_hash,prior:true});break;
 }
 const facts={head:id,root:item.root_hash,manifest:pub.head.manifest_hash,source_cursor:pub.head.source_to_exclusive};
 const artifacts={};
 for(const [index,descriptor] of pub.artifacts.entries()){
  const assembler=new ArtifactAssembler(item,descriptor.kind);
  for(let n=0;n<descriptor.chunks.length;n++)await assembler.accept(n,await client.chunk(id,item.root_hash,index,n));
  const bytes=await assembler.finish();
  await fs.writeFile(directory+'/'+id+'-'+descriptor.kind+'.bin',bytes);
  artifacts[descriptor.kind]=decodeCanonical(bytes);
  facts[descriptor.kind]=sha256(bytes);
 }
 facts.receipts=artifacts.events.receipts;
 facts.received_e8s=artifacts.state.received_e8s;
 chain.push(facts);
 if(item===ticket)Object.assign(report,artifacts);
 if(!ancestor)break;
 if(chain.length>=16||pub.head.segment_id<ancestor.head.segment_id)throw Error('Cannot establish successor continuity within retained history');
 const bytes=await client.publication(id-1);
 item=await verifyRetainedPredecessor(bytes,item);
 await fs.writeFile(directory+'/'+(id-1)+'-publication.bin',bytes);
}
report.chain=chain;
try{report.operational=await operationalReader(agent,canister_id)();}catch(error){report.operational_error=String(error);}
await fs.writeFile(directory+'/snapshot.json',JSON.stringify(report,(_key,value)=>typeof value==='bigint'?String(value):value,2)+'\n');
console.log(JSON.stringify({at,module,root:report.root,identity:p.identity,head:p.head,chain},(_key,value)=>typeof value==='bigint'?String(value):value,2));
