import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {formatIcp,transferMemo} from '../../apps/btz-observer/arcade.mjs';
import {BtzCursor,encodePayment} from '../../packages/kernels/btz/kernel.mjs';
import {PRELAUNCH_CONFIG,PRELAUNCH_IDENTITY,TEST_CONFIG,BTZ_IDENTITY,fixtureWorld,encodeWorld,decodeWorld} from '../../packages/kernels/btz/world.mjs';
import {hex} from '@dtr/timeline-runtime/protocol/bytes';
import {decodeCanonical,encodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
const account='01'.repeat(32);
function run(amounts,identity=PRELAUNCH_IDENTITY){
 const world=fixtureWorld({width:16,height:8,cells:Array(128).fill(0),cannons:[],balls:[]});
 const inputs=amounts.map((amount,i)=>({position:BigInt(i),payload_hex:hex(encodePayment(account,amount,{kind:'angle',value:0}))}));
 let c=new BtzCursor(encodeWorld(world),inputs,{...identity,logical_start:0n,logical_end:2n});let work=0;
 while(c.phase!=='done'){work+=c.step(13).used;const bytes=c.snapshot();c=BtzCursor.restore(bytes,sha256(bytes));assert.ok(work<100000);}
 const r=c.result();return {world:decodeWorld(r.state),receipts:decodeCanonical(r.events).receipts};
}
test('exact e8s formatting never rounds or accepts floating point',()=>{
 for(const [n,s] of [[0n,'0 ICP'],[1n,'0.00000001 ICP'],[10000n,'0.0001 ICP'],[10000000n,'0.1 ICP'],[100000000n,'1 ICP'],[(1n<<64n)-1n,'184467440737.09551615 ICP']])assert.equal(formatIcp(n),s);
 for(const n of [1,-1n,NaN,'100000000'])assert.throws(()=>formatIcp(n));
});
test('join direction controls use the existing exact legacy and blob codec',()=>{
 assert.equal(transferMemo(0).legacy_nat64_decimal,'4779544133607882752');assert.equal(transferMemo(0).blob_hex,'42545a1100000000');
 for(const n of [0,16384,32768,49152])assert.equal(BigInt('0x'+transferMemo(n).blob_hex).toString(),transferMemo(n).legacy_nat64_decimal);
});
for(const [amount,reason] of [[99999999n,'UNDERFUNDED'],[100000000n,'ACCEPTED'],[100000001n,'ACCEPTED']])test(`prelaunch join ${amount}: ${reason}, with interruption recovery`,()=>{
 const r=run([amount]);assert.equal(r.receipts[0].reason,reason);assert.equal(r.world.received_e8s,amount);assert.equal(r.world.cannons.length,reason==='ACCEPTED'?1:0);
});
test('same funding account adds a priced ball instead of a duplicate cannon',()=>{
 const r=run([100000000n,10000000n,39999999n,40000000n]);assert.equal(r.world.cannons.length,1);
 assert.deepEqual(r.receipts.map(r=>r.reason),['ACCEPTED','ACCEPTED','UNDERFUNDED','ACCEPTED']);
 assert.equal(r.receipts[1].kind,'ball_spawned');assert.equal(r.receipts[3].kind,'ball_spawned');
});
test('historical profile remains 10 ICP and its hash/goldens remain meaningful',()=>{
 assert.equal(TEST_CONFIG.join_e8s,1000000000n);assert.equal(run([100000000n],BTZ_IDENTITY).receipts[0].reason,'UNDERFUNDED');
 assert.equal(BTZ_IDENTITY.config_hash,'3d15acf9031e65816c33e3987fe5bb28fee8f9a5acf742d83a7d97db5e3cd622');assert.notEqual(PRELAUNCH_IDENTITY.config_hash,BTZ_IDENTITY.config_hash);
});
test('canonical source, generated JS/Rust, and certified deployment configurations stay in sync',()=>{
 execFileSync(process.execPath,['tools/generate_economics.mjs','--check']);
 const source=JSON.parse(readFileSync('config/economics/prelaunch.json'));
 for(const key of ['join_e8s','ball_base_e8s','move_e8s'])assert.equal(PRELAUNCH_CONFIG[key],BigInt(source[key]));
 const bytes=readFileSync('apps/btz-observer/configuration.bin');assert.deepEqual(decodeCanonical(bytes),PRELAUNCH_CONFIG);assert.equal(sha256(bytes),PRELAUNCH_IDENTITY.config_hash);
 assert.deepEqual([...encodeCanonical(TEST_CONFIG)],[...readFileSync('references/S14/mvp-configuration.bin')]);
});
