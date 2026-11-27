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
if(!directory)throw Error('usage: node tools/verify_rules20_paid_segment.mjs <capture-directory> [paid-ordinal]');
const ordinal=process.argv[3]===undefined?2:Number(process.argv[3]);
if(!Number.isInteger(ordinal)||ordinal<2||ordinal>32)throw Error('invalid paid ordinal');
const read=(n,kind)=>readFileSync(join(directory,`${n}-${kind}.bin`));
const prior=decodeCanonical(read(ordinal-1,'publication'));
const current=decodeCanonical(read(ordinal,'publication'));
assert.equal(current.head.segment_id,prior.head.segment_id+1n,'consecutive paid publication');
const start=read(ordinal-1,'state'),end=read(ordinal,'state'),events=read(ordinal,'events');
const inputs=decodeCanonical(read(ordinal,'inputs'));
assert.equal(current.head.seal.input_count,inputs.length,'complete source input count');
await prepareDerivedSegment(start,end,events,current);
const decodedEvents=decodeCanonical(events);
const receipt=decodedEvents.receipts.find(row=>row.position===inputs[0].position);
assert.equal(inputs.length,1,'one genuine Ledger input');
const memo=Buffer.from(receipt.transfer.memo,'hex');
const cannon=/^NEW 0 1(?: ([0-9]+))?$/.exec(memo.toString('utf8'));
const diverter=/^DEFLECT ([0-9]+) N$/.exec(memo.toString('utf8'));
assert.ok(cannon||diverter,'genuine initial/additional Cannon or north-facing Diverter memo');
const command=cannon
 ?{kind:'new',quantity:1,cell:cannon[1]===undefined?null:Number(cannon[1]),priced_at_ns:receipt.ledger_recorded_ns}
 :{kind:'deflect',cell:Number(diverter[1]),angle:'180',priced_at_ns:receipt.ledger_recorded_ns};
const world=decodeCanonical(start);
if(receipt.status==='applied'){
 const quote=quoteV6(world,RULES20_CONFIG,receipt.account,command);
 assert.equal(quote.amount,receipt.amount_used,'frontend quote matches paid amount');
 if(diverter){
  assert.equal(receipt.per_item_prices,undefined,'single Diverter receipt has no batch price list');
  assert.deepEqual(quote.per_item,[receipt.amount_used],'frontend Diverter item matches paid amount');
 }else assert.deepEqual(quote.per_item,receipt.per_item_prices,'frontend quote matches receipt prices');
 assert.deepEqual(Buffer.from(quote.memo_bytes),memo,'frontend quote preserves wallet memo bytes');
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
 assert.deepEqual(Buffer.from(actual[kind]),read(ordinal,kind),`${kind} independent public bytes`);
writeFileSync(join(directory,ordinal===2?'independent-paid-replay.json':`independent-paid-replay-${ordinal}.json`),JSON.stringify({status:'PASS',
 segment:current.head.segment_id.toString(),source_from:current.head.seal.source_from.toString(),
 source_to_exclusive:current.head.seal.source_to_exclusive.toString(),inputs:inputs.length},null,2)+'\n');
console.log('PASS independent Rules20 paid segment');
