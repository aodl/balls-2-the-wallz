import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {encodeCanonical,decodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
import {decodeDelegatedPayment,icpAccount} from '../../packages/protocol/delegation.mjs';
import {emptyAuthorization,authorizePayment,receiptTransfer,verifyAuthorizationReceipts} from '../../packages/kernels/b2z/delegation-v18.mjs';
import {authorizationV3FromV2,authorizationV2FromV3,authorizePaymentV3,validateAuthorizationV3} from '../../packages/kernels/b2z/delegation-v20.mjs';
import {decodeWorld,encodeWorld,migrateCompactReservoirs,migrateAuthorizationRows,RULES20_IDENTITY} from '../../packages/kernels/b2z/world.mjs';
import {B2zCursor} from '../../packages/kernels/b2z/kernel.mjs';
import {DAY_NS} from '../../packages/protocol/economy17.generated.mjs';

const vector=JSON.parse(readFileSync(new URL('../fixtures/b2z-delegation-v18.json',import.meta.url)));

test('successor identity accepts a migrated world without changing Rules19 bytes',()=>{
 assert.deepEqual(RULES20_IDENTITY,{
  rules_hash:'4e5ddc6f2108115e567894c5827047d76915d84c74d797f951a518390d62cc21',
  schema_hash:'efedaa4a8350dcc126369de4c911c564abc0b61b79d64ddb7a18e43788958778',
  config_hash:'cc9a7925c7818976750738aa614d2df6d2972aa5efe57080c4fa021832912f4c',
 });
 const previous=decodeWorld(Buffer.from(vector.execution.state,'hex'));
 const world=migrateAuthorizationRows(migrateCompactReservoirs(previous));
 const cursor=new B2zCursor(encodeWorld(world),[],{...RULES20_IDENTITY,logical_start:0n,logical_end:1n});
 assert.equal(cursor.world.version,12);
 assert.equal(Buffer.from(encodeWorld(previous)).toString('hex'),vector.execution.state);
 let current=cursor;
 for(let i=0;i<20_000;i++){
  if(current.step(127).complete)break;
  const saved=current.snapshot();current=B2zCursor.restore(saved,sha256(saved));
 }
 assert.equal(current.step(127).complete,true);
 current.finalizeElapsed(BigInt(vector.execution.observed_ns));
 const output=current.result();
 assert.deepEqual(Object.fromEntries(['state','events','scores'].map(key=>[key,sha256(output[key])])),{
  state:'38a1855c940655a2821c24941ea5f11340d90de3ee5096e8bc0fba7bf5ebb2db',
  events:'87279010cd20574e0ef332d9d3ca6761258cc8b474916715b7e319d805399dd3',
  scores:'56367ab13890ae5cf0d28e6a530860598de9c52a8305afb2de2fd4705367e467',
 });
});

test('exact paid Rules19 world migrates to canonical grant rows without changing predecessor bytes',()=>{
 const original=gunzipSync(readFileSync(new URL('../fixtures/rules19-paid-world-17529-state.bin.gz',import.meta.url)));
 const paid=decodeWorld(original);
 assert.equal(paid.version,10);
 const predecessor=migrateCompactReservoirs(paid);
 assert.equal(predecessor.version,11);
 const successor=migrateAuthorizationRows(predecessor);
 assert.equal(successor.version,12);
 assert.equal(predecessor.economy_formula_start_ns,undefined);
 assert.equal(successor.economy_formula_start_ns,(predecessor.playability.elapsed_ns/DAY_NS+2n)*DAY_NS);
 assert.equal(successor.authorization.version,3);
 assert.deepEqual(authorizationV2FromV3(successor.authorization),predecessor.authorization);
 assert.deepEqual(decodeWorld(encodeWorld(successor)),successor);
 assert.deepEqual(Buffer.from(encodeWorld(paid)),original);
 assert.throws(()=>migrateAuthorizationRows(successor),/AUTH_V3_PREDECESSOR/);
});

test('successor rows canonically store a valid digit-leading account while preserving the historical in-memory grant',()=>{
 const payment=decodeDelegatedPayment(vector.envelope);
 assert.equal(payment.from[0],'2');
 const previous=emptyAuthorization(payment.to);
 const grant={...payment,position:4n,amount:0n,spender:null,memo:Uint8Array.from(Buffer.from(vector.grant_memo,'hex'))};
 assert.equal(authorizePayment(previous,grant,4n),'granted');
 assert.throws(()=>encodeCanonical(previous));
 const successor=authorizationV3FromV2(previous);
 const bytes=encodeCanonical(successor);
 assert.equal(sha256(bytes),'d50ecde672ae35c869752e3b8267e92e046735694fe60622df74b540869ffe6d');
 assert.deepEqual(decodeCanonical(bytes),successor);
 assert.deepEqual(authorizationV2FromV3(successor),previous);
});

test('Schema12 world itself encodes a live digit-leading grant',()=>{
 const paid=decodeWorld(gunzipSync(readFileSync(new URL('../fixtures/rules19-paid-world-17529-state.bin.gz',import.meta.url))));
 const world=migrateAuthorizationRows(migrateCompactReservoirs(paid));
 const payment=decodeDelegatedPayment(vector.envelope),registry=world.authorization;
 const grant={...payment,to:registry.recipient,position:(registry.last_position??0n)+1n,
  ledger_time_ns:(payment.ledger_time_ns>registry.ledger_time_ns?payment.ledger_time_ns:registry.ledger_time_ns)+1n,
  amount:0n,spender:null,memo:Uint8Array.from(Buffer.from(vector.grant_memo,'hex'))};
 assert.equal(grant.from[0],'2');
 assert.equal(authorizePaymentV3(registry,grant,grant.position),'granted');
 const bytes=encodeWorld(world);
 assert.deepEqual(decodeWorld(bytes),world);
 assert.equal(decodeWorld(bytes).authorization.grants[0].account,grant.from);
});

test('successor grants reject duplicates, unsorted rows and invalid version',()=>{
 const payment=decodeDelegatedPayment(vector.envelope);
 const previous=emptyAuthorization(payment.to);
 const grant={...payment,position:4n,amount:0n,spender:null,memo:Uint8Array.from(Buffer.from(vector.grant_memo,'hex'))};
 authorizePayment(previous,grant,4n);
 const successor=authorizationV3FromV2(previous);
 const duplicate=structuredClone(successor);
 duplicate.grants.push(structuredClone(duplicate.grants[0]));
 assert.throws(()=>validateAuthorizationV3(duplicate),/AUTH_V3_ORDER/);
 const badVersion=structuredClone(successor);
 badVersion.version=2;
 assert.throws(()=>validateAuthorizationV3(badVersion),/AUTH_V3_VERSION/);
 const second=payment.spender;
 assert.notEqual(second,payment.from);
 authorizePayment(previous,{...grant,from:second,position:5n},5n);
 const two=authorizationV3FromV2(previous);
 assert.equal(two.grants.length,2);
 assert.deepEqual(two.grants.map(row=>row.account),[second,payment.from]);
 assert.equal(sha256(encodeCanonical(two)),'21553782195144ba08f801724dd016868aa077bda59e2d7c6e8696108ac66c53');
 two.grants.reverse();
 assert.throws(()=>validateAuthorizationV3(two),/AUTH_V3_ORDER/);
});

test('direct successor grant and revoke match historical decisions without a canonical map',()=>{
 const payment=decodeDelegatedPayment(vector.envelope);
 const old=emptyAuthorization(payment.to),rows=authorizationV3FromV2(old);
 const grant={...payment,position:4n,amount:0n,spender:null,memo:Uint8Array.from(Buffer.from(vector.grant_memo,'hex'))};
 assert.equal(authorizePayment(old,grant,4n),authorizePaymentV3(rows,grant,4n));
 assert.deepEqual(authorizationV2FromV3(rows),old);
 assert.equal(sha256(encodeCanonical(rows)),'d50ecde672ae35c869752e3b8267e92e046735694fe60622df74b540869ffe6d');
 const revoke={...grant,position:5n,memo:Uint8Array.of(0xb2,0xd1,0x80)};
 assert.equal(authorizePayment(old,revoke,5n),authorizePaymentV3(rows,revoke,5n));
 assert.deepEqual(authorizationV2FromV3(rows),old);
 assert.equal(rows.grants.length,0);
});

test('direct successor rows accept all 16 account-leading hex digits',()=>{
 const payment=decodeDelegatedPayment(vector.envelope);
 const accounts=new Map();
 for(let n=0;n<256;n++){
  const principal=Uint8Array.from({length:29},(_,i)=>i===28?2:n);
  const account=icpAccount(principal);
  accounts.set(account[0],account);
 }
 assert.deepEqual([...accounts.keys()].sort(),[...'0123456789abcdef']);
 for(const account of accounts.values()){
  const rows=authorizationV3FromV2(emptyAuthorization(payment.to));
  const grant={...payment,from:account,position:4n,amount:0n,spender:null,
   memo:Uint8Array.from(Buffer.from(vector.grant_memo,'hex'))};
  assert.equal(authorizePaymentV3(rows,grant,4n),'granted');
  assert.equal(validateAuthorizationV3(decodeCanonical(encodeCanonical(rows))).grants[0].account,account);
 }
});

test('successor receipt verification binds the exact digit-leading grant and rejects altered records',()=>{
 const payment=decodeDelegatedPayment(vector.envelope);
 const grant={...payment,position:4n,amount:0n,spender:null,memo:Uint8Array.from(Buffer.from(vector.grant_memo,'hex'))};
 const initial={authorization:authorizationV3FromV2(emptyAuthorization(payment.to)),received_e8s:17n};
 const final=structuredClone(initial);
 assert.equal(authorizePaymentV3(final.authorization,grant,4n),'granted');
 const receipt={account:grant.from,amount:0n,position:4n,spender:null,
  ledger_recorded_ns:grant.ledger_time_ns,transfer:receiptTransfer(grant),
  status:'configured',reason:'DELEGATION_GRANTED',amount_used:0n,remainder:0n};
 const scope={source_from:4n,source_to_exclusive:5n,input_count:1n};
 assert.doesNotThrow(()=>verifyAuthorizationReceipts(initial,final,[receipt],scope,authorizePaymentV3));
 const altered=structuredClone(receipt);
 altered.transfer.memo='00';
 assert.throws(()=>verifyAuthorizationReceipts(initial,final,[altered],scope,authorizePaymentV3));
});
