import test from 'node:test';
import assert from 'node:assert/strict';
import {mainnetPolicy} from '../../apps/btz-observer/mainnet.mjs';
test('observer mainnet deployment is explicit and cannot carry roots or alternate endpoints',()=>{
 const policy={network:'ic',host:'https://icp-api.io',canister_id:'rwlgt-iiaaa-aaaaa-aaaaa-cai'};
 assert.equal(mainnetPolicy(policy).canister_id,policy.canister_id);
 for(const changed of [{...policy,rootKey:'attacker'},{...policy,host:'http://localhost:4943'},{...policy,network:'pocketic-local'},{...policy,canister_id:'aaaaa-aa'},{...policy,canister_id:'2vxsx-fae'}])assert.throws(()=>mainnetPolicy(changed));
});

test('displayed prices require configuration bytes bound by the certified identity',async t=>{
 const {readFile}=await import('node:fs/promises');
 const {sha256Web}=await import('@dtr/timeline-runtime/client/verification');
 const {certifiedConfiguration}=await import('../../apps/btz-observer/mainnet.mjs');
 const bytes=new Uint8Array(await readFile(new URL('../../apps/btz-observer/configuration.bin',import.meta.url)));
 const ticket={publication:{identity:{config_hash:await sha256Web(bytes)}}};
 let response=bytes;t.mock.method(globalThis,'fetch',async()=>new Response(response));
 const config=await certifiedConfiguration(ticket);assert.equal(config.move_e8s,10000n);assert.equal(config.join_e8s,1000000000n);
 response=Uint8Array.from(bytes);response[10]^=1;
 await assert.rejects(certifiedConfiguration(ticket),/not bound/);
});
