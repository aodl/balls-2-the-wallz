import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chooseTariff,marginalPrice,tariffs20} from '../../packages/kernels/b2z/economy20.mjs';
import {DAY_NS,GRACE_NS} from '../../packages/protocol/economy17.generated.mjs';
import {CANNON_BASE_E8S,DIVERTER_BASE_E8S} from '../../packages/protocol/economy17.generated.mjs';
import {decodeWorld,migrateCompactReservoirs,migrateAuthorizationRows} from '../../packages/kernels/b2z/world.mjs';
import {preparePurchase} from '../../packages/kernels/b2z/purchases-v6.mjs';
import {prepareDeflectorPurchase} from '../../packages/kernels/b2z/deflectors-v12.mjs';
import {encodeV6Memo} from '../../packages/protocol/memo-v6.mjs';
import {encodeDeflectorMemo} from '../../packages/protocol/deflector.mjs';

const rows=JSON.parse(readFileSync(new URL('../fixtures/economy20-prices.json',import.meta.url)));
test('successor price vectors preserve exact doubling and Ledger bounds',()=>{
 for(const row of rows){
  const expected=row.amount===null?null:BigInt(row.amount);
  assert.equal(marginalPrice(BigInt(row.base),row.population,row.held),expected,row.name);
 }
});

const purchases=JSON.parse(readFileSync(new URL('../fixtures/economy20-prefix.json',import.meta.url)));
test('unrepresentable current prices preserve independent grace-prefix selection',()=>{
 for(const row of purchases){
  const structure=row.structure&&{...row.structure,base:BigInt(row.structure.base)};
  assert.deepEqual(chooseTariff(row.current,row.previous,{...row,structure},BigInt(row.budget)),
   {tariff:row[row.selected],count:row.count,spent:BigInt(row.spent)},row.name);
 }
});
test('the first successor effective tariff retains a linear predecessor through grace',()=>{
 const day=DAY_NS,grace=GRACE_NS;
 const snapshot=(boundary,population,previous_multiplier)=>({effective_ns:boundary+day,
  grace_end_ns:boundary+day+grace,multiplier:population,previous_multiplier});
 const schedule={initial_multiplier:1000,snapshots:[snapshot(day,1001,1000),snapshot(2n*day,1002,1001)]};
 assert.deepEqual(tariffs20(schedule,2n*day,2n*day-1n),{current:{formula:'linear',multiplier:1000},previous:null});
 assert.deepEqual(tariffs20(schedule,2n*day,2n*day),{current:{formula:'exponential',population:1001},previous:{formula:'linear',multiplier:1000}});
 assert.deepEqual(tariffs20(schedule,2n*day,2n*day+grace),{current:{formula:'exponential',population:1001},previous:null});
 assert.deepEqual(tariffs20(schedule,2n*day,3n*day),{current:{formula:'exponential',population:1002},previous:{formula:'exponential',population:1001}});
 const samePopulation={...schedule,snapshots:[{...schedule.snapshots[0],multiplier:1000},{...schedule.snapshots[1],previous_multiplier:1000}]};
 assert.deepEqual(tariffs20(samePopulation,2n*day,2n*day),{current:{formula:'exponential',population:1000},previous:{formula:'linear',multiplier:1000}});
});
test('real successor Cannon and Diverter planners use the bounded symbolic tariff',()=>{
 const vector=JSON.parse(readFileSync(new URL('../fixtures/b2z-delegation-v18.json',import.meta.url)));
 const w=migrateAuthorizationRows(migrateCompactReservoirs(decodeWorld(Buffer.from(vector.execution.state,'hex'))));
 const account=w.playability.players.find(p=>p.id===1).account;
 const rate={formula:'exponential',population:1001};
 const cannons=w.cannons.filter(c=>c.account===account).length;
 const cannonPrice=marginalPrice(CANNON_BASE_E8S,1001,cannons);
 const memo=encodeV6Memo({kind:'new',angle:0,quantity:1,cell:500500});
 const cannon=preparePurchase(w,account,cannonPrice,memo,[],true,true,rate);
 assert.equal(cannon.kind,'new');assert.equal(cannon.price,cannonPrice);
 assert.equal(preparePurchase(w,account,cannonPrice-1n,memo,[],true,true,rate).reason,'UNDERFUNDED');
 const diverters=w.deflectors.filter(d=>d.owner===1).length;
 const diverterPrice=marginalPrice(DIVERTER_BASE_E8S,1001,diverters);
 const diverterMemo=encodeDeflectorMemo({kind:'deflect',cell:500500,orientation:'NE'});
 const diverter=prepareDeflectorPurchase(w,account,diverterPrice,diverterMemo,true,rate);
 assert.equal(diverter.kind,'deflect');assert.equal(diverter.price,diverterPrice);
 assert.equal(prepareDeflectorPurchase(w,account,diverterPrice-1n,diverterMemo,true,rate).reason,'UNDERFUNDED');
 assert.equal(preparePurchase(w,account,(1n<<64n)-1n,memo,[],true,true,{formula:'exponential',population:1035}).reason,'PRICE_OVERFLOW');
});
