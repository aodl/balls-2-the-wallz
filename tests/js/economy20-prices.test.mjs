import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {marginalPrice} from '../../packages/kernels/b2z/economy20.mjs';

const rows=JSON.parse(readFileSync(new URL('../fixtures/economy20-prices.json',import.meta.url)));
test('successor price vectors preserve exact doubling and Ledger bounds',()=>{
 for(const row of rows){
  const expected=row.amount===null?null:BigInt(row.amount);
  assert.equal(marginalPrice(BigInt(row.base),row.population,row.held),expected,row.name);
 }
});
