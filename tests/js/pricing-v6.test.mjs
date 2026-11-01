import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {ballPrice,cannonPrice,sequentialCost,newCannonCost,affordablePrefix} from '../../packages/kernels/b2z/pricing-v6.mjs';
for(const line of fs.readFileSync(new URL('../fixtures/prices-v6.tsv',import.meta.url),'utf8').split('\n').filter(s=>s&&!s.startsWith('#'))){
 const [kind,n,q,expected]=line.split('\t');test('v6 price '+line,()=>{
  const run=()=>({ball:ballPrice,cannon:cannonPrice,batch:sequentialCost,new:newCannonCost})[kind](Number(n),Number(q));
  if(expected==='OVERFLOW')assert.throws(run,/PRICE_OVERFLOW/);else assert.equal(run(),BigInt(expected));
 });
}
test('batch uses an affordable prefix and leaves surplus explicitly retained',()=>{
 for(const [n,q,budget,slots,count,used,reason] of [
  [1,3,139999999n,64,2,50000000n,'insufficient_payment'],[0,3,50000000n,64,2,20000000n,'insufficient_payment'],
  [1,3,140000000n,2,2,50000000n,'capacity'],[1,1,100000000n,64,1,10000000n,'quantity_limit'],
  [0,1,9999999n,64,0,0n,'insufficient_payment'],[0,1,100000000n,0,0,0n,'capacity'],
 ]){const p=affordablePrefix(n,q,budget,slots);assert.equal(p.prices.length,count);assert.equal(p.used,used);assert.equal(p.used+p.remainder,budget);assert.equal(p.stop_reason,reason);}
 for(const q of [0,65,4294967295]){assert.throws(()=>affordablePrefix(0,q,100000000n,64),/QUANTITY_BOUNDS/);assert.throws(()=>newCannonCost(0,q),/QUANTITY_BOUNDS/);}
 for(const bad of [1,NaN,'100000000',-1n,18446744073709551616n])assert.throws(()=>affordablePrefix(0,1,bad,64));
});
