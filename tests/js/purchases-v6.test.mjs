import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import{createHash}from'node:crypto';
import{encodeCanonical,decodeCanonical}from'@dtr/timeline-runtime/runtime/canonical';
import{decodeWorld,encodeWorld,validateWorld,scaledOwnership,setOwner,Q}from'../../packages/kernels/b2z/world.mjs';import{stageMillionWorld}from'../../packages/kernels/b2z/migration.mjs';
import{migratePlayability,markDormant,clearUnsupportedPlayer,life,V6_POLICY}from'../../packages/kernels/b2z/playability.mjs';
import{encodeV6Memo,parseV6TextMemo}from'../../packages/protocol/memo-v6.mjs';import{PurchaseBatch,preparePurchase,adjacentSites,chooseAdjacent,placeNew}from'../../packages/kernels/b2z/purchases-v6.mjs';
const f=JSON.parse(fs.readFileSync(new URL('../fixtures/b2z-torus-v4.json',import.meta.url))),vector=JSON.parse(fs.readFileSync(new URL('../fixtures/purchases-v6.json',import.meta.url)));
const world=()=>migratePlayability(decodeWorld(stageMillionWorld(Buffer.from(f.migration.new_hex,'hex'))),9007199254740993n),memo=s=>encodeV6Memo(parseV6TextMemo(new TextEncoder().encode(s))),sha=b=>createHash('sha256').update(b).digest('hex');
function run(w,p,budget){let b=PurchaseBatch.fire(w.cannons[0].account,budget,p);let steps=0;while(b.stop_reason===null){b.step(w);b=Object.assign(new PurchaseBatch(),decodeCanonical(encodeCanonical({...b})));b.validate(w);validateWorld(w);assert.ok(++steps<=65);}return b.receipt();}
test('resumable fire preserves exact Rust/JS state, prices and receipt bytes',()=>{
 const w=world(),p=preparePurchase(w,w.cannons[0].account,50000000n,memo('FIRE 1 0 2')),r=run(w,p,50000000n);
 assert.deepEqual(r.per_item_prices,[10000000n,40000000n]);assert.equal(r.actual_quantity,2);assert.equal(r.amount_used,50000000n);assert.equal(r.remainder,0n);assert.equal(sha(encodeWorld(w)),vector.state_sha256);assert.equal(sha(encodeCanonical(r)),vector.receipt_sha256);
});
test('quantity ceilings, stale price partial fills and zero-ball paid recovery',()=>{
 for(const [q,budget,actual,used,stop]of[[1,140000000n,1,10000000n,'quantity_limit'],[3,139999999n,2,50000000n,'insufficient_payment']]){
  const w=world(),p=preparePurchase(w,w.cannons[0].account,budget,memo(`FIRE 1 0 ${q}`)),r=run(w,p,budget);assert.equal(r.actual_quantity,actual);assert.equal(r.amount_used,used);assert.equal(r.remainder,budget-used);assert.equal(r.stop_reason,stop);
 }
 const w=world();w.balls=[];w.pending=[];markDormant(w,1);clearUnsupportedPlayer(w,1);const p=preparePurchase(w,w.cannons[0].account,10000000n,memo('FIRE 1 0 1'));
 const r=run(w,p,10000000n);assert.equal(r.amount_used,10000000n);assert.equal(life(w,1).deadline_ns,undefined);assert.equal(life(w,1).generation,3);assert.equal(w.ownership.counts[0].cells,1);
});
test('planning cannot give a declared account authority over another cannon',()=>{
 const w=world(),before=encodeWorld(w),other='02'.repeat(32);
 assert.equal(preparePurchase(w,other,100000000n,memo('FIRE 1 0 1')).reason,'NOT_OWNER');assert.equal(preparePurchase(w,other,100000000n,memo('MOVE 1 0')).reason,'NOT_OWNER');
 assert.equal(preparePurchase(w,other,100000000n,memo('NEW 0 1 0')).reason,'FIRST_PLACEMENT_AUTOMATIC');assert.deepEqual(encodeWorld(w),before);
});
test('retained dormant islands count for new-cannon pricing and legacy targets remain deterministic',()=>{
 const w=world(),c={...w.cannons[0],id:2,cell:0};w.cannons.push(c);w.next_cannon_id=3;w.playability.territories.push({id:2,player:1});w.playability.next_territory_id=3;w.playability.lifecycle.push({cannon:2,player:1,generation:1,dormant_since_ns:w.playability.elapsed_ns,deadline_ns:w.playability.elapsed_ns+V6_POLICY.dormancy_grace_ns});setOwner(w,0,2);validateWorld(w);
 const p=preparePurchase(w,c.account,900000000n,memo('NEW 0 1'));assert.equal(p.price,900000000n);assert.equal(p.first,false);const legacy=preparePurchase(w,c.account,50000000n,memo('ANGLE 0'));assert.equal(legacy.cannon,1);assert.equal(legacy.explicit,false);assert.equal(preparePurchase(w,c.account,10000n,memo('MOVE 1 0')).reason,'CANNON_OCCUPIED');assert.equal(preparePurchase(w,c.account,10000n,memo('MOVE 2 0')).reason,'DORMANT_REVIVAL_REQUIRED');
});
test('adjacent placement is deterministic and excludes closed-boundary seam occupancy',()=>{
 const w=world();assert.deepEqual(adjacentSites(w,1),vector.adjacent_sites);assert.equal(chooseAdjacent(w,1,'ab'.repeat(32)),vector.selected_adjacent);
 w.ownership=scaledOwnership(Array(1024).fill(1));w.cannons[0].cell=999;w.balls[0].cell=999;w.balls[0].x0=1000n*BigInt(Q);w.balls[0].y0=512n;validateWorld(w);
 assert.ok(!adjacentSites(w,1).includes(0));assert.ok(adjacentSites(w,1).includes(998));
});
test('per-item island and global capacity checks charge only the spawned prefix',()=>{
 for(const global of[false,true]){const w=world(),template={...w.cannons[0]},prototype={...w.balls[0]};w.ownership=scaledOwnership(Array(1024).fill(0));w.cannons=[];w.balls=[];w.playability.lifecycle=[];w.playability.territories=[];
 const groups=global?[2]:[V6_POLICY.max_purchase_balls_per_island-1];if(global)for(let left=V6_POLICY.max_balls-3;left>0;){const count=Math.min(left,V6_POLICY.max_purchase_balls_per_island);groups.push(count);left-=count;}groups.forEach((count,index)=>{const id=index+1,cell=100+index*2;w.cannons.push({...template,id,cell});w.playability.territories.push({id,player:1});w.playability.lifecycle.push({cannon:id,player:1,generation:1});setOwner(w,cell,id);for(let j=0;j<count;j++)w.balls.push({...prototype,id:w.balls.length+1,owner:1,cell,x0:BigInt(cell*Q+Q/2)-BigInt(prototype.vx)*w.time[0],y0:512n-BigInt(prototype.vy)*w.time[0]});});w.next_ball_id=w.balls.length+1;w.next_cannon_id=w.cannons.length+1;w.playability.next_territory_id=w.next_cannon_id;validateWorld(w);
 const amount=18446744073709551615n,before=w.balls.length,p=preparePurchase(w,template.account,amount,memo('FIRE 1 0 2')),r=run(w,p,amount),price=10000000n*BigInt(groups[0])**2n;assert.equal(w.balls.length,before+1);assert.equal(r.actual_quantity,1);assert.equal(r.stop_reason,'capacity');assert.equal(r.status,'partially_applied');assert.equal(r.amount_used,price);assert.equal(r.remainder,amount-price);}
});
test('new cannon plus surplus is atomic, account-owned and Rust/JS reproducible',()=>{
 for(const first of[true,false]){
  const w=world(),account=first?'02'.repeat(32):w.cannons[0].account,budget=first?150000000n:530000000n,p=preparePurchase(w,account,budget,memo('NEW 0 3')),v=vector.spawns[first?'first':'additional'],before=encodeWorld(w),created=placeNew(w,account,budget,p,v.placement);
  assert.deepEqual(encodeWorld(w),before);const b=PurchaseBatch.afterNew(account,budget,created.cannon.id,p);while(b.stop_reason===null){b.step(created.world);validateWorld(created.world);}
  assert.equal(created.world.cannons.length,w.cannons.length+1);assert.equal(created.world.balls.length,w.balls.length+3);assert.equal(b.receipt().actual_quantity,3);assert.equal(b.receipt().remainder,0n);assert.deepEqual(b.receipt().per_item_prices,[first?100000000n:400000000n,first?10000000n:40000000n,first?40000000n:90000000n]);
  assert.equal(sha(encodeWorld(created.world)),v.state_sha256);assert.equal(sha(encodeCanonical(created.event)),v.event_sha256);assert.equal(sha(encodeCanonical(b.receipt())),v.receipt_sha256);
  const invalid={...v.placement,kind:first?4:2};assert.throws(()=>placeNew(w,account,budget,p,invalid));assert.deepEqual(encodeWorld(w),before);
 }
});
test('shared-owner crossing respects every cannon footprint, corners and toroidal seams',async()=>{
 const {classify,passage}=await import('../../packages/kernels/b2z/kernel.mjs'),{nextCrossing}=await import('../../packages/kernels/b2z/geometry.mjs');
 for(const anchor of[0,1])for(const [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
  const base=world(),p=preparePurchase(base,base.cannons[0].account,400000000n,memo('NEW 0 1')),w=placeNew(base,base.cannons[0].account,400000000n,p,vector.spawns.additional.placement).world;
  w.ownership=scaledOwnership(Array(1024).fill(1));w.cannons[anchor].cell=0;const b=w.balls.find(b=>b.id===2),x=(1000-dx)%1000,y=(1000-dy)%1000;b.cell=y*1000+x;b.vx=dx*32000;b.vy=dy*32000;b.x0=BigInt(x*Q+(dx>0?Q:dx<0?0:Q/2))-BigInt(b.vx)*w.time[0];b.y0=BigInt(y*Q+(dy>0?Q:dy<0?0:Q/2))-BigInt(b.vy)*w.time[0];validateWorld(w);
  const intent=classify(w,b,nextCrossing(b,w.width,w.time));assert.equal(intent.attack,null);assert.ok(intent.targets.every(t=>!t.capturable));assert.deepEqual(passage(w,b,intent),{passX:false,passY:false,vertexBlocked:!!(dx&&dy)});
 }
});
test('friendly land passes and a cannon moved into a frozen crossing remains reflective',async()=>{
 const {classify,passage}=await import('../../packages/kernels/b2z/kernel.mjs'),{nextCrossing}=await import('../../packages/kernels/b2z/geometry.mjs');const base=world(),p=preparePurchase(base,base.cannons[0].account,400000000n,memo('NEW 0 1')),w=placeNew(base,base.cannons[0].account,400000000n,p,vector.spawns.additional.placement).world;
 w.ownership=scaledOwnership(Array(1024).fill(1));const b=w.balls.find(b=>b.id===2);b.cell=100099;b.vx=32000;b.vy=0;b.x0=100n*BigInt(Q)-BigInt(b.vx)*w.time[0];b.y0=100n*BigInt(Q)+512n;validateWorld(w);const intent=classify(w,b,nextCrossing(b,w.width,w.time));assert.equal(intent.targets[0].pass,true);assert.equal(intent.attack,null);assert.equal(passage(w,b,intent).passX,true);
 w.cannons[0].cell=100100;validateWorld(w);assert.equal(passage(w,b,intent).passX,false);assert.equal(classify(w,b,nextCrossing(b,w.width,w.time)).attack,null);
});
