/** Local strategic counterexamples, synthetic endowments; no mainnet saturation. */
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {decodeWorld,validateWorld,scaledOwnership,setOwner,Q} from '../../packages/kernels/b2z/world.mjs';
import {preparePurchase,PurchaseBatch} from '../../packages/kernels/b2z/purchases-v6.mjs';
import {markDormant} from '../../packages/kernels/b2z/playability.mjs';
import {encodeV6Memo} from '../../packages/protocol/memo-v6.mjs';
const fixture=JSON.parse(readFileSync(new URL('../fixtures/rules-v6.json',import.meta.url)));
test('a 64-ball player can deny both entry and a different player revival at global capacity',()=>{
 const w=decodeWorld(Buffer.from(fixture.cases.wall_pair.state_hex,'hex')),prototype=w.balls[0],a=w.cannons[0],b=w.cannons[2];
 w.cannons=[a,b];w.pending=[];w.ownership=scaledOwnership(Array(1024).fill(0));w.playability.territories=[{id:1,player:1},{id:3,player:2}];w.playability.lifecycle=w.playability.lifecycle.filter(l=>l.cannon!==2);setOwner(w,a.cell,1);setOwner(w,b.cell,3);
 w.balls=Array.from({length:63},(_,i)=>({...prototype,id:i+1,owner:1,cell:a.cell,x0:BigInt((a.cell%1000)*Q+Q/2)-BigInt(prototype.vx)*w.time[0],y0:BigInt(Math.floor(a.cell/1000)*Q+Q/2)-BigInt(prototype.vy)*w.time[0]}));w.next_ball_id=64;markDormant(w,b.id);validateWorld(w);
 const memo=encodeV6Memo({kind:'fire',cannon:a.id,angle:0,quantity:2}),amount=18446744073709551615n,p=preparePurchase(w,a.account,amount,memo),batch=PurchaseBatch.fire(a.account,amount,p);
 while(batch.stop_reason===null)batch.step(w);const receipt=batch.receipt();validateWorld(w);assert.equal(w.balls.length,64);assert.equal(receipt.actual_quantity,1);assert.equal(receipt.stop_reason,'capacity');assert.equal(receipt.amount_used,39690000000n);assert.equal(receipt.remainder,amount-receipt.amount_used);
 const recovery=preparePurchase(w,b.account,10000000n,encodeV6Memo({kind:'fire',cannon:b.id,angle:0,quantity:1})),join=preparePurchase(w,'03'.repeat(32),100000000n,encodeV6Memo({kind:'new',angle:0,quantity:1,cell:null}));
 assert.deepEqual(recovery,{kind:'rejected',reason:'BALL_CAPACITY'});assert.deepEqual(join,{kind:'rejected',reason:'BALL_CAPACITY'});assert.ok(w.playability.lifecycle.find(l=>l.cannon===b.id).deadline_ns);
});
