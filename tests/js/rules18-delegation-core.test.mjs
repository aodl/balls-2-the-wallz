import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeDelegatedPayment,encodeDelegatedPayment,pricingEnvelope,encodeAuthorization,icpAccount,DELEGATION_LIFETIME_NS} from '../../packages/protocol/delegation.mjs';
import {untimedPayment} from '../../packages/protocol/economy17.mjs';
import {emptyAuthorization,authorizePayment,validateAuthorization,verifyAuthorizationReceipts} from '../../packages/kernels/b2z/delegation-v18.mjs';
const vector=JSON.parse(readFileSync(new URL('../fixtures/b2z-delegation-v18.json',import.meta.url)));
const hex=value=>Buffer.from(value).toString('hex');
const facts=decodeDelegatedPayment(vector.envelope);
const grant=Buffer.from(vector.grant_memo,'hex');
const revoke=encodeAuthorization({kind:'revoke'});

test('versioned wire retains actual spender, exact Rules17 payload and block tariff time',()=>{
 assert.equal(hex(encodeDelegatedPayment(facts)),vector.envelope);
 assert.equal(hex(pricingEnvelope(facts)),vector.rules17_payload);
 assert.equal(untimedPayment(pricingEnvelope(facts)).recordedNs,facts.ledger_time_ns);
 assert.notEqual(facts.ledger_time_ns,facts.created_at_ns);
 const hidden=Buffer.from(vector.envelope,'hex');
 hidden[8]&=~1;
 assert.throws(()=>decodeDelegatedPayment(hidden),/AUTH_PAYMENT_CANONICAL/);
 assert.throws(()=>encodeDelegatedPayment({...facts,ledger_time_ns:0n}),/AUTH_PAYMENT_FIELDS/);
 const historical=Buffer.from(vector.envelope,'hex');
 historical.write('B2ZPAY05');
 assert.throws(()=>decodeDelegatedPayment(historical),/AUTH_PAYMENT_ENVELOPE/);
 assert.throws(()=>pricingEnvelope({...facts,memo:grant}),/AUTH_SETUP_IS_NOT_GAMEPLAY/);
});

test('only ordered payer grants authorize the exact spender, with expiry and revoke',()=>{
 const registry=emptyAuthorization(facts.to);
 const authorize=(position,payment={})=>authorizePayment(registry,{...facts,position,...payment},position);
 assert.equal(authorize(1n),'UNAUTHORIZED_SPENDER');
 assert.equal(authorize(2n,{memo:grant}),'DELEGATED_SETUP_FORBIDDEN');
 assert.equal(authorize(3n,{memo:grant,spender:null}),'DELEGATION_SETUP_AMOUNT');
 assert.equal(authorize(4n,{memo:grant,spender:null,amount:0n}),'granted');
 assert.throws(()=>authorize(4n),/AUTH_SOURCE_ORDER_OR_DESTINATION/);
 assert.equal(authorize(5n,{spender:icpAccount('rrkah-fqaaa-aaaaa-aaaaq-cai')}),'UNAUTHORIZED_SPENDER');
 assert.equal(authorize(6n,{ledger_time_ns:facts.ledger_time_ns+DELEGATION_LIFETIME_NS-1n}),'gameplay');
 const expired=facts.ledger_time_ns+DELEGATION_LIFETIME_NS;
 assert.equal(authorize(7n,{ledger_time_ns:expired}),'UNAUTHORIZED_SPENDER');
 assert.equal(authorize(8n,{memo:revoke,spender:null,amount:0n,ledger_time_ns:expired}),'revoked');
 assert.equal(authorize(9n,{spender:null,ledger_time_ns:expired}),'gameplay');
 assert.deepEqual(validateAuthorization(registry).grants,{});
});

test('keyed authorization admits thousands of distinct grants without the previous quota',()=>{
 const registry=emptyAuthorization(facts.to);
 for(let n=0;n<2048;n++){
  const raw=new Uint8Array(29);new DataView(raw.buffer).setUint16(0,n);raw[28]=2;
  const position=BigInt(n);
  const payment={...facts,from:icpAccount(raw),position,memo:grant,spender:null,amount:0n};
  assert.equal(authorizePayment(registry,payment,position),'granted');
 }
 assert.equal(Object.keys(validateAuthorization(registry).grants).length,2048);
});

test('candidate Schema10 changes only the version and adds an empty recipient-bound registry',async()=>{
 const {sha256}=await import('@dtr/timeline-runtime/runtime/seal');
 const {decodeWorld,encodeWorld,migrateDelegation,DELEGATED_IDENTITY}=await import('../../packages/kernels/b2z/world.mjs');
 const {migrateReservoirs}=await import('../../packages/kernels/b2z/reservoirs.mjs');
 const {migrateEconomy}=await import('../../packages/kernels/b2z/economy17.mjs');
 const base=JSON.parse(readFileSync(new URL('../fixtures/context-structures-v13.json',import.meta.url))).rows[0];
 const old=migrateReservoirs(decodeWorld(Buffer.from(base.initial_hex,'hex')));
 const r17=migrateEconomy(old,BigInt(vector.migration.activated_ns),sha256(encodeWorld(old)));
 const r18=migrateDelegation(r17,facts.to);
 const {version,authorization,...retained}=r18;
 assert.equal(version,10);
 assert.equal(authorization.recipient,facts.to);
 assert.deepEqual(authorization.grants,{});
 assert.deepEqual({...retained,version:9},r17);
 assert.equal(sha256(encodeWorld(r17)),vector.migration.before_sha256);
 assert.equal(sha256(encodeWorld(r18)),vector.migration.after_sha256);
 assert.deepEqual(DELEGATED_IDENTITY,vector.migration.identity);
 assert.throws(()=>migrateDelegation(r18,facts.to),/EXPECTED_ECONOMY_PREDECESSOR/);
});

test('ordered Rules18 execution separates authorization, transfer and game outcomes across restores',async()=>{
 const {B2zKernel}=await import('../../packages/kernels/b2z/kernel.mjs');
 const {decodeCanonical}=await import('@dtr/timeline-runtime/runtime/canonical');
 const {sha256}=await import('@dtr/timeline-runtime/runtime/seal');
 const execution=vector.execution, state=Buffer.from(execution.state,'hex');
 const seal={...execution.seal,logical_start:BigInt(execution.seal.logical_start),logical_end:BigInt(execution.seal.logical_end)};
 const inputs=execution.inputs.map(i=>({...i,position:BigInt(i.position)}));
 let cursor=B2zKernel.begin(state,inputs,seal);
 for(let budget=0;!cursor.step(11).complete;budget++){
  assert.ok(budget<1000);
  const saved=cursor.snapshot();
  cursor=B2zKernel.restore(saved,sha256(saved));
 }
 cursor.finalizeElapsed(BigInt(execution.observed_ns));
 const output=cursor.result(),receipts=decodeCanonical(output.events).receipts;
 assert.deepEqual(receipts.map(r=>r.reason),execution.reasons);
 assert.ok(receipts.every(r=>r.account===facts.from));
 assert.equal(receipts[3].spender,facts.spender);
 assert.equal(receipts.at(-1).spender,null);
 assert.equal(receipts[4].price_multiplier,2);
 assert.equal(receipts[4].ledger_recorded_ns,facts.ledger_time_ns+5n);
 assert.equal(receipts[2].status,'configured');
 assert.equal(receipts[3].status,'applied');
 const initial=decodeCanonical(state),final=decodeCanonical(output.state);
 const scope={source_from:1n,source_to_exclusive:10n,input_count:9n};
 assert.doesNotThrow(()=>verifyAuthorizationReceipts(initial,final,receipts,scope));
 const wrong=structuredClone(receipts);wrong[3].spender=null;
 assert.throws(()=>verifyAuthorizationReceipts(initial,final,wrong,scope),/AUTH_RECEIPT_SCOPE/);
 for(const [key,bytes] of Object.entries(output))assert.equal(sha256(bytes),execution.output[key]);
});
