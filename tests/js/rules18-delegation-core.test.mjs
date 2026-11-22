import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeDelegatedPayment,encodeDelegatedPayment,pricingEnvelope,encodeAuthorization,icpAccount,DELEGATION_LIFETIME_NS} from '../../packages/protocol/delegation.mjs';
import {untimedPayment} from '../../packages/protocol/economy17.mjs';
import {emptyAuthorization,authorizePayment,validateAuthorization} from '../../packages/kernels/b2z/delegation-v18.mjs';
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
