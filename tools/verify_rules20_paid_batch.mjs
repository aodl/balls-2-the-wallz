#!/usr/bin/env node
/** Independent installed partial-batch replay and frontend quote comparison. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {decodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {B2zKernel} from '../packages/kernels/b2z/kernel.mjs';
import {RULES20_CONFIG} from '../packages/kernels/b2z/world.mjs';
import {quoteV6} from '../apps/b2z-observer/action-quote-v6.mjs';
import {prepareDerivedSegment} from '../apps/b2z-observer/model.mjs';

const directory=process.argv[2];
if(!directory)throw Error('usage: node tools/verify_rules20_paid_batch.mjs <capture-directory>');
const overflow=process.argv[3]==='overflow';
const read=(n,kind)=>readFileSync(join(directory,`${n}-${kind}.bin`));
const prior=decodeCanonical(read(3,'publication'));
const current=decodeCanonical(read(4,'publication'));
assert.equal(current.head.segment_id,prior.head.segment_id+1n,'consecutive batch publication');
const start=read(3,'state'),end=read(4,'state'),events=read(4,'events');
const inputs=decodeCanonical(read(4,'inputs'));
assert.equal(inputs.length,1,'one genuine Ledger batch input');
assert.equal(current.head.seal.input_count,inputs.length,'complete source input count');
await prepareDerivedSegment(start,end,events,current);
const eventLog=decodeCanonical(events);
const receipt=eventLog.receipts.find(row=>row.position===inputs[0].position);
assert.ok(receipt,'batch receipt');
assert.equal(receipt.status,'partially_applied');
assert.equal(receipt.actual_quantity,overflow?1:2);
assert.equal(receipt.requested_quantity,overflow?2:3);
const quote=quoteV6(decodeCanonical(start),RULES20_CONFIG,receipt.account,
 {kind:'fire',cannon:receipt.cannon,angle:'0',quantity:overflow?1:3,priced_at_ns:receipt.ledger_recorded_ns});
assert.deepEqual(quote.per_item.slice(0,receipt.actual_quantity),receipt.per_item_prices,'frontend prefix prices equal receipt');
assert.equal(receipt.per_item_prices.reduce((a,b)=>a+b,0n),receipt.amount_used,'frontend prefix total equals receipt');
if(overflow){
 assert.throws(()=>quoteV6(decodeCanonical(start),RULES20_CONFIG,receipt.account,
  {kind:'fire',cannon:receipt.cannon,angle:'0',quantity:2,priced_at_ns:receipt.ledger_recorded_ns}),/PRICE_OVERFLOW/,
  'frontend rejects an unrepresentable second item');
 assert.equal(receipt.remainder,0n);
}else assert.ok(quote.per_item[2]>receipt.remainder,'third item unaffordable');
const observed=eventLog.events.at(-1)?.observed_ns;
assert.equal(typeof observed,'bigint','authenticated elapsed observation');
const cursor=B2zKernel.begin(start,inputs,current.head.seal);
while(!cursor.step(113).complete){}
cursor.finalizeElapsed(observed);
const actual=cursor.result();
for(const kind of ['state','events','scores'])
 assert.deepEqual(Buffer.from(actual[kind]),read(4,kind),`${kind} independent public bytes`);
writeFileSync(join(directory,'independent-paid-batch.json'),JSON.stringify({status:'PASS',
 segment:current.head.segment_id.toString(),source_from:current.head.seal.source_from.toString(),
 source_to_exclusive:current.head.seal.source_to_exclusive.toString(),inputs:inputs.length,
 actual_quantity:receipt.actual_quantity,requested_quantity:receipt.requested_quantity,
 overflow_boundary:overflow},null,2)+'\n');
console.log('PASS independent Rules20 partial batch');
