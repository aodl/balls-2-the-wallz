import test from 'node:test';import assert from 'node:assert/strict';
import {formatCycles,publicStatusReader,statusInterface,cycleReadout} from '../../apps/b2z-observer/public-cycles.mjs';
import {IDL} from '@icp-sdk/core/candid';
import {HttpAgent,IC_ROOT_KEY} from '@icp-sdk/core/agent';
const backend='s5ir5-gqaaa-aaaas-amyna-cai',status=(cycles=1000000000000n,more={})=>({backend,cycles,reserved_cycles:0n,idle_cycles_burned_per_day:100n,version:1n,module_hash:[Uint8Array.of(1)],settings:{status_visibility:{public:null}},...more});
test('public status uses an isolated, signed mainnet management query with request signal',async t=>{let calls=0;const resultType=statusInterface({IDL})._fields[0][1].retTypes[0];t.mock.method(HttpAgent.prototype,'query',async function(id,options){calls++;assert.equal(id.toText(),'aaaaa-aa');assert.equal(options.methodName,'canister_status');assert.equal(options.effectiveTarget.canisterId.toText(),backend);assert.equal(IDL.decode([IDL.Record({canister_id:IDL.Principal})],options.arg)[0].canister_id.toText(),backend);assert.equal(this.config.verifyQuerySignatures,true);assert.equal(this.config.shouldFetchRootKey,false);assert.equal(this.config.shouldSyncTime,false);assert.equal(this.config.retryTimes,0);assert.ok(this.config.fetchOptions.signal instanceof AbortSignal);assert.equal(Buffer.from(this.rootKey).toString('hex'),IC_ROOT_KEY);return{status:'replied',reply:{arg:IDL.encode([resultType],[status()])}};});const read=publicStatusReader({network:'ic',host:'https://icp-api.io',canister_id:backend});assert.equal((await read()).cycles,1000000000000n);assert.equal(calls,1);});

test('one-line readout omits estimates from an older backend and formats exact daily rates',()=>{
 assert.equal(formatCycles(1000000000000000000000n),'1.00e21');
 assert.equal(cycleReadout({balance:2430000000000n,label:'Available'}).balance,'2.43T');
 assert.equal(cycleReadout({balance:2430000000000n,rate:25n,label:'Available'}).burn,'');
 assert.equal(cycleReadout({balance:2430000000000n,verifiedBurn:{cyclesPerDay:8000000000n,detail:'Partial window.'}}).burn,'(~8B/day)');
 assert.equal(cycleReadout({balance:9n,verifiedBurn:{cyclesPerDay:-1n}}).burn,'');
});
