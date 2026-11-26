import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chooseTariff,marginalPrice} from '../../packages/kernels/b2z/economy20.mjs';

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
