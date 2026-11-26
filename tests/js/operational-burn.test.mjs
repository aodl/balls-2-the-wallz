import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {bindOperationalBurn,decodeBurnRecord} from '../../apps/b2z-observer/operational-burn.mjs';

const hash=value=>createHash('sha256').update(value).digest();
const publication=Buffer.from('independently checked canonical publication');
const end=3_600_000_000_001n,initial=Buffer.alloc(35);
initial.set([1,2,13]);
initial.writeBigUInt64BE(1n,3);
initial.writeBigUInt64BE(end,11);
initial.writeBigUInt64BE(525_000_000_000n,27);
function certificateClaim(record){
 const root=hash(Buffer.concat([Buffer.from('B2Z-CERTIFIED-OPERATIONAL-01'),hash(publication),hash(record)]));
 return {certified_data_hex:root.toString('hex'),certificate_time_ns:end,network:'pocketic-local',canister_id:'test'};
}
test('v1 binds exactly one operational record to the existing publication digest',async()=>{
 const claim=certificateClaim(initial),verified=await bindOperationalBurn(publication,initial,claim);
 assert.equal(verified.claim.certified_data_hex,hash(publication).toString('hex'));
 assert.equal(verified.claim.canister_id,claim.canister_id);
 assert.equal(verified.burn.cyclesPerDay,525_000_000_000n);
 for(const changed of [Buffer.from(initial),Buffer.from(initial)]){
  changed[34]^=1;
  await assert.rejects(bindOperationalBurn(publication,changed,claim),/root mismatch/);
 }
 await assert.rejects(bindOperationalBurn(Buffer.from('other'),initial,claim),/root mismatch/);
});
test('old direct-root claims preserve publication verification, and invalid records fail closed',async()=>{
 const claim={...certificateClaim(initial),certified_data_hex:hash(publication).toString('hex')};
 assert.deepEqual(await bindOperationalBurn(publication,null,claim),{claim,burn:null});
 await assert.rejects(bindOperationalBurn(publication,initial,claim),/root mismatch/);
 assert.equal(decodeBurnRecord(initial,end+13n*60_000_000_000n).quality,'stale');
 assert.throws(()=>decodeBurnRecord(initial,end-1n),/fields/);
 assert.throws(()=>decodeBurnRecord(initial.subarray(1),end),/record/);
 const unavailable=Buffer.alloc(35);unavailable[0]=1;
 assert.equal(decodeBurnRecord(unavailable,end),null);
});
