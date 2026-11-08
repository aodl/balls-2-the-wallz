import test from 'node:test';import assert from 'node:assert/strict';
import {parseSendingAccount,textualAccount,paymentDestination,accountIdentifier} from '../../apps/b2z-observer/identity.mjs';
const owner='k2t6j-2nvnp-4zjm3-25dtz-6xhaa-c7boj-5gayf-oj3xs-i43lp-teztq-6ae';
test('UX-07 ICRC standard vectors and account formats retain actual subaccounts',()=>{
 assert.equal(textualAccount(owner),owner);
 const sub='0'.repeat(63)+'1';const text=owner+'-6cc627i.1';assert.equal(textualAccount(owner,sub),text);
 assert.deepEqual(parseSendingAccount(text),{principal:owner,subaccount:sub,account:accountIdentifier(owner,sub),display:text});
 assert.equal(parseSendingAccount(owner,sub).account,parseSendingAccount(text).account);
 assert.equal(textualAccount(owner,'0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20'),owner+'-dfxgiyy.102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20');
 for(const bad of [owner+'.1',owner+'-6cc627i.01',owner+'-aaaaaaa.1',owner+'-q6bn32y.'])assert.throws(()=>parseSendingAccount(bad));
 assert.throws(()=>parseSendingAccount(text,'0'.repeat(63)+'2'));
 const a=accountIdentifier(owner,sub);assert.equal(parseSendingAccount(a).principal,null);assert.equal(parseSendingAccount(a).account,a);assert.throws(()=>parseSendingAccount(a,sub));
});
test('UX-07 verified European principal and secondary legacy address describe identical account',()=>{
 const owner='s5ir5-gqaaa-aaaas-amyna-cai',recipient='c58487869d46ef0494c7d7c0312b2760abb7164eafd23f0009a42b9545f53bde';
 assert.equal(paymentDestination({owner,recipient,subaccount:0n}).primary,owner);
 assert.equal(paymentDestination({owner,recipient,subaccount:0n}).legacy,recipient);
 assert.throws(()=>paymentDestination({owner:'s2jxj-liaaa-aaaas-amynq-cai',recipient,subaccount:0n}));
 assert.throws(()=>paymentDestination({owner,recipient,subaccount:1n}));
});
