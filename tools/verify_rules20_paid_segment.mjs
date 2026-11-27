#!/usr/bin/env node
/** Independent one-segment replay of genuine installed Rules20 Ledger input. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {decodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {B2zKernel} from '../packages/kernels/b2z/kernel.mjs';
import {RULES20_CONFIG} from '../packages/kernels/b2z/world.mjs';
import {quoteV6} from '../apps/b2z-observer/action-quote-v6.mjs';
import {prepareDerivedSegment} from '../apps/b2z-observer/model.mjs';

const directory=process.argv[2];
if(!directory)throw Error('usage: node tools/verify_rules20_paid_segment.mjs <capture-directory>');
const read=(n,kind)=>readFileSync(join(directory,`${n}-${kind}.bin`));
const prior=decodeCanonical(read(1,'publication'));
const current=decodeCanonical(read(2,'publication'));
assert.equal(current.head.segment_id,prior.head.segment_id+1n,'consecutive paid publication');
const start=read(1,'state'),end=read(2,'state'),events=read(2,'events');
const inputs=decodeCanonical(read(2,'inputs'));
assert.equal(current.head.seal.input_count,inputs.length,'complete source input count');
await prepareDerivedSegment(start,end,events,current);
const decodedEvents=decodeCanonical(events);
const receipt=decodedEvents.receipts.find(row=>row.position===inputs[0].position);
assert.equal(inputs.length,1,'one genuine Ledger input');
const command={kind:'new',quantity:1,priced_at_ns:receipt.ledger_recorded_ns};
const world=decodeCanonical(start);
if(receipt.status==='applied'){
 const quote=quoteV6(world,RULES20_CONFIG,receipt.account,command);
 assert.equal(quote.amount,receipt.amount_used,'frontend quote matches paid amount');
 assert.deepEqual(quote.per_item,receipt.per_item_prices,'frontend quote matches receipt prices');
}else{
 assert.equal(receipt.amount_used,0n);
 assert.throws(()=>quoteV6(world,RULES20_CONFIG,receipt.account,command),/PRICE_OVERFLOW/);
}
const observed=decodedEvents.events.at(-1)?.observed_ns;
assert.equal(typeof observed,'bigint','authenticated elapsed observation');
const cursor=B2zKernel.begin(start,inputs,current.head.seal);
while(!cursor.step(113).complete){}
cursor.finalizeElapsed(observed);
const actual=cursor.result();
for(const kind of ['state','events','scores'])
 assert.deepEqual(Buffer.from(actual[kind]),read(2,kind),`${kind} independent public bytes`);
writeFileSync(join(directory,'independent-paid-replay.json'),JSON.stringify({status:'PASS',
 segment:current.head.segment_id.toString(),source_from:current.head.seal.source_from.toString(),
 source_to_exclusive:current.head.seal.source_to_exclusive.toString(),inputs:inputs.length},null,2)+'\n');
console.log('PASS independent Rules20 paid segment');
