import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {encodeCanonical,decodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
import {decodeDelegatedPayment} from '../../packages/protocol/delegation.mjs';
import {emptyAuthorization,authorizePayment} from '../../packages/kernels/b2z/delegation-v18.mjs';
import {authorizationV3FromV2,authorizationV2FromV3,validateAuthorizationV3} from '../../packages/kernels/b2z/delegation-v20.mjs';

const vector=JSON.parse(readFileSync(new URL('../fixtures/b2z-delegation-v18.json',import.meta.url)));

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
