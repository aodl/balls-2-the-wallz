import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {encodeCanonical,decodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
import {decodeDelegatedPayment,icpAccount} from '../../packages/protocol/delegation.mjs';
import {emptyAuthorization,authorizePayment} from '../../packages/kernels/b2z/delegation-v18.mjs';
import {authorizationV3FromV2,authorizationV2FromV3,authorizePaymentV3,validateAuthorizationV3} from '../../packages/kernels/b2z/delegation-v20.mjs';
import {decodeWorld,encodeWorld,migrateCompactReservoirs,migrateAuthorizationRows} from '../../packages/kernels/b2z/world.mjs';

const vector=JSON.parse(readFileSync(new URL('../fixtures/b2z-delegation-v18.json',import.meta.url)));

test('exact paid Rules19 world migrates to canonical grant rows without changing predecessor bytes',()=>{
 const original=gunzipSync(readFileSync(new URL('../fixtures/rules19-paid-world-17529-state.bin.gz',import.meta.url)));
 const paid=decodeWorld(original);
 assert.equal(paid.version,10);
 const predecessor=migrateCompactReservoirs(paid);
 assert.equal(predecessor.version,11);
 const successor=migrateAuthorizationRows(predecessor);
 assert.equal(successor.version,12);
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
