import test from 'node:test';
import assert from 'node:assert/strict';
import {mainnetPolicy} from '../../apps/btz-observer/mainnet.mjs';
test('observer mainnet deployment is explicit and cannot carry roots or alternate endpoints',()=>{
 const policy={network:'ic',host:'https://icp-api.io',canister_id:'rwlgt-iiaaa-aaaaa-aaaaa-cai'};
 assert.equal(mainnetPolicy(policy).canister_id,policy.canister_id);
 for(const changed of [{...policy,rootKey:'attacker'},{...policy,host:'http://localhost:4943'},{...policy,network:'pocketic-local'},{...policy,canister_id:'aaaaa-aa'},{...policy,canister_id:'2vxsx-fae'}])assert.throws(()=>mainnetPolicy(changed));
});
