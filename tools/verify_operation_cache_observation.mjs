/** Authenticated disposable-IC observation; no offline or mainnet-root fallback. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {localCertificateVerifier} from '@dtr/timeline-runtime/client/ic-certificate';
import {ArtifactAssembler,verifyCertificatePublication} from '@dtr/timeline-runtime/client/verification';
import {snapshot} from '../apps/b2z-observer/model.mjs';
import {Certificate,lookupResultToBuffer} from '@icp-sdk/core/agent';
import {Principal} from '@icp-sdk/core/principal';
const dir=process.argv[2],read=async name=>new Uint8Array(await readFile(`${dir}/${name}`));
const meta=JSON.parse(await readFile(`${dir}/metadata.json`,'utf8'));
const policy={network:'pocketic-local',canister_id:meta.canister_id,now_ns:BigInt(meta.now_ns),max_age_ns:300000000000n,max_future_ns:30000000000n};
const catalog=await read('catalog.bin'),certificate=await read('certificate.cbor'),root=await read('root-key.der');
// An explicit, trusted PocketIC virtual clock is needed after install-rate-limit
// cooldowns. This retains the SDK's time checks and the outer freshness policy;
// it is never selected as a fallback following an authentication failure.
const offset=Number(BigInt(meta.now_ns)/1000000n)-Date.now();
const virtualAgent={getTimeDiffMsecs:()=>offset,hasSyncedTime:()=>true,syncTime:async()=>{throw new Error("explicit PocketIC clock already supplied");}};
const verify=meta.virtual_clock ? async(bytes,deployment)=>{
 const canister=Principal.fromText(deployment.canister_id);
 const cert=await Certificate.create({certificate:bytes,rootKey:root,principal:{canisterId:canister},maxAgeInMinutes:5,agent:virtualAgent});
 const data=lookupResultToBuffer(cert.lookup_path(['canister',canister.toUint8Array(),'certified_data'])),time=lookupResultToBuffer(cert.lookup_path(['time']));
 assert(data instanceof Uint8Array&&data.length===32&&time instanceof Uint8Array);
 let ns=0n,shift=0n;for(const byte of time){ns|=BigInt(byte&127)<<shift;if(!(byte&128))break;shift+=7n;}
 return {network:'pocketic-local',canister_id:canister.toText(),certified_data_hex:Buffer.from(data).toString('hex'),certificate_time_ns:ns};
} : localCertificateVerifier(root);
const ticket=await verifyCertificatePublication(catalog,certificate,policy,verify);
// Profile worlds are initialized in disposable IC, so their DTR history is v6.
// Paid recovery is a distinct authenticated v8/epoch-2 scenario. Never accept a
// downgrade there or reinterpret a profile as a paid checkpoint.
const scenario=meta.scenario??(meta.virtual_clock?(meta.zero_genesis?'empty-v5-genesis-v6':'paid-v8'):'v5-profile-v6');
assert(['paid-v8','v5-profile-v6','empty-v5-genesis-v6'].includes(scenario));
const expected=scenario==='paid-v8'?8:6;
assert.equal(meta.publication_version,expected);
assert.equal(ticket.publication.version,expected);
if(scenario==='paid-v8')assert.equal(ticket.publication.epoch.version,2);
else assert.equal(ticket.publication.epoch,undefined);
if(scenario==='empty-v5-genesis-v6')assert.equal(ticket.publication.head.segment_id,null);
for(const kind of ['state','events','scores']){
 const assembler=new ArtifactAssembler(ticket,kind),data=await read(`${kind}.bin`);
 for(let i=0;i<assembler.descriptor.chunks.length;i++)await assembler.accept(i,data.slice(i*16384,(i+1)*16384));
 const bytes=await assembler.finish();if(kind==='state'){const world=snapshot(bytes,ticket.publication.identity);assert.equal(world.version,5);assert.equal(world.width,1000);assert.equal(world.height,1000);if(scenario==='empty-v5-genesis-v6'){assert.equal(world.cannons.length,0);assert.equal(world.balls.length,0);}}
}
await assert.rejects(()=>verifyCertificatePublication(catalog,certificate,{...policy,canister_id:'2vxsx-fae'},verify));
await assert.rejects(()=>verifyCertificatePublication(catalog,certificate,{...policy,now_ns:policy.now_ns+600000000000n},verify));
await writeFile(`${dir}/verification.json`,JSON.stringify({status:'PASS',scenario,trust:'explicit disposable root, canister binding and certificate freshness',publication_version:ticket.publication.version,root_hash:ticket.root_hash,artifacts:['state','events','scores']},null,2)+'\n');
