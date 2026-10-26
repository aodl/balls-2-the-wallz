/** Verify an actual disposable-IC v8 checkpoint with its explicit SDK root. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {localCertificateVerifier} from '@dtr/timeline-runtime/client/ic-certificate';
import {ArtifactAssembler,PublicationSequence,verifyCertificatePublication} from '@dtr/timeline-runtime/client/verification';
import {snapshot} from '../apps/b2z-observer/model.mjs';
const dir=process.argv[2],read=async name=>new Uint8Array(await readFile(`${dir}/${name}`));
const meta=JSON.parse(await readFile(`${dir}/metadata.json`,'utf8'));
const policy={network:'pocketic-local',canister_id:meta.canister_id,now_ns:BigInt(meta.now_ns),max_age_ns:300000000000n,max_future_ns:30000000000n};
const catalog=await read('catalog.bin'),certificate=await read('certificate.cbor'),verify=localCertificateVerifier(await read('root-key.der'));
const ticket=await verifyCertificatePublication(catalog,certificate,policy,verify);
assert.equal(ticket.publication.version,8);assert.equal(ticket.publication.epoch.version,2);
new PublicationSequence().accept(ticket);
const verified={};
for(const kind of ['state','events','scores']){
 const assembler=new ArtifactAssembler(ticket,kind),data=await read(`${kind}.bin`);
 for(let i=0;i<assembler.descriptor.chunks.length;i++)await assembler.accept(i,data.slice(i*16384,(i+1)*16384));
 verified[kind]=await assembler.finish();
}
const world=snapshot(verified.state,ticket.publication.identity);
assert.equal(world.version,5);assert.equal(world.width,1000);assert.equal(world.height,1000);
await assert.rejects(()=>verifyCertificatePublication(catalog,certificate,{...policy,canister_id:'2vxsx-fae'},verify));
await assert.rejects(()=>verifyCertificatePublication(catalog,certificate,{...policy,now_ns:policy.now_ns+600000000000n},verify));
await writeFile(`${dir}/verification.json`,JSON.stringify({status:'PASS',trust:'explicit disposable IC SDK root and certificate; no offline fallback',publication_version:8,epoch_version:2,world:[1000,1000],root_hash:ticket.root_hash,verified_artifacts:Object.keys(verified)},null,2)+'\n');
