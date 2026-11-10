/** UX-08/10: destination risk follows the displayed instruction packet. */
import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
import*as arcade from'../../apps/b2z-observer/arcade.mjs';
const specific='If another player claims your chosen tile before your action is processed, the action fails and your ICP remains spent.';
const ordinary='Payments and unused ICP are kept; no automatic refunds.';
test('UX-10 Move/additional Build use exact destination warning, including cell zero',()=>{
 assert.equal(typeof arcade.paymentWarning,'function');
 for(const action of['move','start'])for(const cell of[0,123])assert.equal(arcade.paymentWarning({action,cell}),specific);
});
test('UX-10 Fire, Revive, Join and unchosen destinations retain the ordinary warning',()=>{
 assert.equal(typeof arcade.paymentWarning,'function');
 for(const q of[{action:'ball',cell:null},{action:'ball',cell:0,dormant:true},{action:'start',cell:null},{action:'move',cell:null},{action:'start',cell:''},{action:'move',cell:-1}])assert.equal(arcade.paymentWarning(q),ordinary);
});
test('UX-08 warning derives from the displayed frozen packet without modifying it',()=>{
 assert.equal(typeof arcade.paymentWarning,'function');
 const saved=Object.freeze({action:'ball',cell:null,memo:'FIRE 1 255 1',amount:10000000n});
 const draft=Object.freeze({action:'move',cell:0,memo:'MOVE 1 0',amount:20000000n});
 assert.equal(arcade.paymentWarning(saved),ordinary);assert.equal(arcade.paymentWarning(draft),specific);assert.equal(saved.memo,'FIRE 1 255 1');assert.equal(saved.amount,10000000n);
});
test('UX-10 fee stays separate and the warning follows ordinary wallet fields',()=>{
 const html=readFileSync('apps/b2z-observer/index.html','utf8');assert.match(html,/<p id="payment-fee">Wallet fee extra\.<\/p>/);assert.ok(html.indexOf('id="payment-risk"')>html.indexOf('</dl>'));assert.match(html,/aria-describedby="payment-fee payment-risk"/);
});
