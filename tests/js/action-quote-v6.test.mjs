import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {decodeWorld,encodeWorld} from '../../packages/kernels/b2z/world.mjs';
import {V6_POLICY} from '../../packages/kernels/b2z/playability.generated.mjs';
import {PRICING} from '../../packages/kernels/b2z/economics.generated.mjs';
import {preparePurchase,PurchaseBatch,adjacentSites} from '../../packages/kernels/b2z/purchases-v6.mjs';
import {quoteV6,legalMove,legalAdjacentSites} from '../../apps/b2z-observer/action-quote-v6.mjs';
const f=JSON.parse(fs.readFileSync(new URL('../fixtures/rules-v6.json',import.meta.url))),config={...V6_POLICY,...PRICING},world=(name='idle')=>decodeWorld(Buffer.from(f.cases[name].state_hex,'hex'));
test('targeted quotes use the shared island count, exact integers and the explicit ceiling',()=>{
 const w=world(),c=w.cannons[0],before=encodeWorld(w),q=quoteV6(w,config,c.account,{kind:'fire',cannon:c.id,angle:'37.5',quantity:2});assert.equal(q.amount,50000000n);assert.deepEqual(q.per_item,[10000000n,40000000n]);assert.equal(q.memo,`FIRE ${c.id} 37.5 2`);assert.equal(q.non_reservation,true);
 const plan=preparePurchase(w,c.account,q.amount,q.numeric_memo_bytes),batch=PurchaseBatch.fire(c.account,q.amount,plan);while(batch.step(w)){}assert.equal(batch.receipt().amount_used,q.amount);assert.equal(batch.receipt().actual_quantity,2);assert.notDeepEqual(encodeWorld(w),before);
});
test('first and additional cannon quotes include the first ball and price the merged pool',()=>{
 const w=world(),c=w.cannons[0],newAccount='ab'.repeat(32),first=quoteV6(w,config,newAccount,{kind:'new',quantity:3,angle:'0'});assert.equal(first.amount,150000000n);assert.deepEqual(first.per_item,[100000000n,10000000n,40000000n]);assert.throws(()=>quoteV6(w,config,newAccount,{kind:'new',cell:123}),/FIRST_PLACEMENT/);
 const sites=legalAdjacentSites(w,c.account);assert.deepEqual(sites,adjacentSites(w,w.playability.lifecycle[0].player));const q=quoteV6(w,config,c.account,{kind:'new',quantity:3,cell:sites[0]});assert.equal(q.amount,530000000n);assert.equal(preparePurchase(w,c.account,q.amount,q.numeric_memo_bytes).kind,'new');
});
test('declaring another account, bad quantities and stale move destinations cannot prepare an action',()=>{
 const w=world(),c=w.cannons[0];assert.throws(()=>quoteV6(w,config,'ab'.repeat(32),{kind:'fire',cannon:c.id}),/NOT_OWNER/);for(const quantity of[0,65,NaN,1.5])assert.throws(()=>quoteV6(w,config,c.account,{kind:'fire',cannon:c.id,quantity}),/QUANTITY/);assert.equal(legalMove(w,c.account,c.id,999999),false);assert.throws(()=>quoteV6(w,config,c.account,{kind:'move',cannon:c.id,cell:999999}),/ILLEGAL_MOVE/);
});
test('a dormant island quotes paid revival, forbids movement and supplies no new-cannon anchor',()=>{
 const w=world('revival'),c=w.cannons[0],q=quoteV6(w,config,c.account,{kind:'fire',cannon:c.id});assert.equal(q.pool,0);assert.equal(q.amount,10000000n);assert.equal(legalMove(w,c.account,c.id,c.cell),false);assert.deepEqual(legalAdjacentSites(w,c.account),[]);assert.throws(()=>quoteV6(w,config,c.account,{kind:'new'}),/NO_ADJACENT/);
});
