/** Read-only frozen-file and archived-proof check; no deployment or live freshness claim. */
import assert from 'node:assert/strict';
import {mock} from 'node:test';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {certificateVerifier} from '@dtr/timeline-runtime/client/ic-certificate';
import {verifyCertificatePublication,ArtifactAssembler} from '@dtr/timeline-runtime/client/verification';
import {verifiedSourceDescriptor} from '../../../apps/b2z-observer/mainnet.mjs';
import {paymentDestination} from '../../../apps/b2z-observer/identity.mjs';

const here=fileURLToPath(new URL('.',import.meta.url));
const root=resolve(here,'../../..'),read=name=>readFile(resolve(here,name));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const release=JSON.parse(await read('release.json'));
const manifest=JSON.parse(await read('frontend-files.json'));
assert.equal(sha(await read('frontend-files.json')),release.complete_files_manifest_sha256);
const assets=resolve(root,release.frozen_frontend);
assert.deepEqual((await readdir(assets)).sort(),Object.keys(manifest).sort());
for(const [name,want]of Object.entries(manifest)){
 const bytes=await readFile(resolve(assets,name));
 assert.equal(sha(bytes),want.sha256,name);assert.equal(bytes.length,want.bytes,name);
}
const build=JSON.parse(await readFile(resolve(assets,'build-manifest.json')));
assert.equal(build.source_commit,release.source);assert.equal(build.source_dirty,false);
assert.equal(sha(await readFile(resolve(root,release.normal_backend_file))),release.backend_module);

// Evaluate archived evidence at its recorded observation time using the normal
// IC root, canister, delegation and 300s/30s freshness/future policy. This is not
// an assertion that an archived certificate is fresh at the time of this script.
const proof=JSON.parse(await read('production-readonly.json'));
const policy={...proof.policy,now_ns:BigInt(Date.parse(proof.at))*1000000n,
 max_age_ns:300000000000n,max_future_ns:30000000000n};
// Match the existing archived-certificate tests: the SDK also reads Date.
mock.timers.enable({apis:['Date'],now:Date.parse(proof.at)});
try{
const ticket=await verifyCertificatePublication(await read('production-publication.bin'),
 await read('production-certificate.bin'),policy,certificateVerifier({network:'ic'}));
assert.equal(ticket.root_hash,proof.root);
assert.equal(sha(await read('production-configuration.bin')),ticket.publication.identity.config_hash);
for(const kind of ['state','events','scores']){
 const bytes=await read('production-'+kind+'.bin'),assembler=new ArtifactAssembler(ticket,kind);
 const size=ticket.publication.chunk_bytes;
 for(let i=0;i<assembler.descriptor.chunks.length;i++)await assembler.accept(i,bytes.slice(i*size,(i+1)*size));
 assert.equal(sha(await assembler.finish()),proof.artifacts_sha256[kind]);
}
const source=await verifiedSourceDescriptor(await read('production-source.bin'),ticket,
 {network:'ic',canister_id:proof.policy.canister_id,ledger:proof.source.ledger,index:proof.source.index});
assert.equal(source.subaccount,0n);
assert.equal(paymentDestination(source).primary,'s5ir5-gqaaa-aaaas-amyna-cai');
assert.equal(paymentDestination(source).legacy,'c58487869d46ef0494c7d7c0312b2760abb7164eafd23f0009a42b9545f53bde');
mock.timers.tick(301000);
await assert.rejects(verifyCertificatePublication(await read('production-publication.bin'),
 await read('production-certificate.bin'),{...policy,now_ns:BigInt(Date.now())*1000000n},certificateVerifier({network:'ic'})));
}finally{mock.timers.reset();}
console.log('PASS: 15 frozen assets, preserved normal Wasm, archived IC proof/source/destination and rejection after expiry. CI and served verification are separate gates.');
