/** Authenticated disposable-IC observation; no offline or mainnet-root fallback. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {localCertificateVerifier} from '@dtr/timeline-runtime/client/ic-certificate';
import {ArtifactAssembler,verifyCertificatePublication,sha256Web} from '@dtr/timeline-runtime/client/verification';
import{verifiedSourceDescriptor}from'../apps/b2z-observer/mainnet.mjs';
import{paymentDestination}from'../apps/b2z-observer/identity.mjs';
import {snapshot} from '../apps/b2z-observer/model.mjs';
import {recordedCertificateVerifier} from '../packages/protocol/recorded-certificate.mjs';
const dir=process.argv[2],read=async name=>new Uint8Array(await readFile(`${dir}/${name}`));
const meta=JSON.parse(await readFile(`${dir}/metadata.json`,'utf8'));
const policy={network:'pocketic-local',canister_id:meta.canister_id,now_ns:BigInt(meta.now_ns),max_age_ns:300000000000n,max_future_ns:30000000000n};
const catalog=await read('catalog.bin'),certificate=await read('certificate.cbor'),root=await read('root-key.der');
// An explicit, trusted PocketIC virtual clock is needed after install-rate-limit
// cooldowns. This retains the SDK's time checks and the outer freshness policy;
// it is never selected as a fallback following an authentication failure.
const verify=meta.virtual_clock ? recordedCertificateVerifier({network:'pocketic-local',rootKey:root,recordedNs:BigInt(meta.now_ns)}) : localCertificateVerifier(root);
const ticket=await verifyCertificatePublication(catalog,certificate,policy,verify);
// Profile worlds are initialized in disposable IC, so their DTR history is v6.
// Paid recovery is a distinct authenticated v8/epoch-2 scenario. Never accept a
// downgrade there or reinterpret a profile as a paid checkpoint.
const scenario=meta.scenario??(meta.virtual_clock?(meta.zero_genesis?'empty-v5-genesis-v6':'paid-v8'):'v5-profile-v6');
assert(['paid-v8','v5-profile-v6','empty-v5-genesis-v6','paid-playability-v8','paid-playability-v9','paid-delegation-v8'].includes(scenario));
const playability=scenario.startsWith('paid-playability-'),delegation=scenario==='paid-delegation-v8';
const expected=scenario==='paid-playability-v9'?9:scenario==='paid-v8'||playability||delegation?8:6;
assert.equal(meta.publication_version,expected);
assert.equal(ticket.publication.version,expected);
if(scenario==='paid-v8'||playability||delegation)assert.equal(ticket.publication.epoch.version,expected===9?3:2);
else assert.equal(ticket.publication.epoch,undefined);
if(scenario==='empty-v5-genesis-v6')assert.equal(ticket.publication.head.segment_id,null);
for(const kind of ['state','events','scores']){
 const assembler=new ArtifactAssembler(ticket,kind),data=await read(`${kind}.bin`);
 for(let i=0;i<assembler.descriptor.chunks.length;i++)await assembler.accept(i,data.slice(i*16384,(i+1)*16384));
 const bytes=await assembler.finish();if(kind==='state'){const world=snapshot(bytes,ticket.publication.identity);assert.equal(world.version,playability||delegation?6:5);assert.equal(world.width,1000);assert.equal(world.height,1000);if(delegation){assert.ok(world.playability.authorization);assert.equal(world.playability.authorization.version,1);}if(scenario==='empty-v5-genesis-v6'){assert.equal(world.cannons.length,0);assert.equal(world.balls.length,0);}}
}
if(delegation&&meta.source_binding_required===true){const source=await verifiedSourceDescriptor(await read('source.bin'),ticket,{network:'pocketic-local',canister_id:meta.canister_id,ledger:meta.ledger,index:meta.index});assert.equal(paymentDestination(source).primary,meta.canister_id);assert.equal(await sha256Web(await read('configuration.bin')),ticket.publication.identity.config_hash);}
await assert.rejects(()=>verifyCertificatePublication(catalog,certificate,{...policy,canister_id:'2vxsx-fae'},verify));
await assert.rejects(()=>verifyCertificatePublication(catalog,certificate,{...policy,now_ns:policy.now_ns+600000000000n},verify));
await writeFile(`${dir}/verification.json`,JSON.stringify({status:'PASS',scenario,source_binding:delegation?meta.source_binding_required===true:false,trust:'explicit disposable root, canister binding and certificate freshness',publication_version:ticket.publication.version,root_hash:ticket.root_hash,artifacts:['state','events','scores']},null,2)+'\n');
