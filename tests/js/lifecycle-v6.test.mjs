import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';
import{decodeCanonical,encodeCanonical}from'@dtr/timeline-runtime/runtime/canonical';import{sha256}from'@dtr/timeline-runtime/runtime/seal';
import{decodeWorld,encodeWorld,validateWorld,ownerAt,setOwner}from'../../packages/kernels/b2z/world.mjs';import{V6_POLICY,dueFences}from'../../packages/kernels/b2z/playability.mjs';
import{preparePurchase,PurchaseBatch}from'../../packages/kernels/b2z/purchases-v6.mjs';import{encodeV6Memo,parseV6TextMemo}from'../../packages/protocol/memo-v6.mjs';import{expireV6}from'../../packages/kernels/b2z/lifecycle-v6.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/lifecycle-v6.json',import.meta.url))),world=()=>decodeWorld(Buffer.from(fixture.previous_state_hex,'hex')),fences=()=>decodeCanonical(Buffer.from(fixture.fences_hex,'hex')),now=BigInt(fixture.observed_ns);
test('elapsed expiry changes no ticks or paid value and exactly matches Rust outputs',()=>{
 const w=world(),before=encodeWorld(w),r=expireV6(w,now,fences()),next=decodeWorld(r.output.state);assert.equal(sha256(r.metadata),fixture.metadata_sha256);assert.equal(Buffer.from(r.metadata).toString('hex'),fixture.metadata_hex);
 for(const[k,v]of Object.entries(r.output))assert.equal(sha256(v),fixture.outputs[k]);assert.deepEqual(next.time,w.time);assert.deepEqual(next.credits,w.credits);assert.equal(next.received_e8s,w.received_e8s);assert.equal(next.next_cannon_id,w.next_cannon_id);assert.equal(next.next_ball_id,w.next_ball_id);assert.equal(next.cannons.length,0);assert.equal(ownerAt(next,w.cannons[0].cell),0);assert.deepEqual(next.playability.players,w.playability.players);assert.deepEqual(encodeWorld(w),before);assert.equal(expireV6(next,now,fences()),null);
});
test('exact boundary, overdue downtime and a paid revival fence remain deterministic',()=>{
 const w=world(),before=encodeWorld(w);assert.throws(()=>expireV6(w,now-1n,fences()),/EXPIRY_NOT_DUE/);assert.deepEqual(encodeWorld(w),before);
 const late=expireV6(w,now+30n*86400000000000n,fences());assert.deepEqual(decodeWorld(late.output.state).time,w.time);
 const c=w.cannons[0],memo=encodeV6Memo(parseV6TextMemo(new TextEncoder().encode(`FIRE ${c.id} 0 1`))),plan=preparePurchase(w,c.account,10000000n,memo),batch=PurchaseBatch.fire(c.account,10000000n,plan);assert.equal(batch.step(w).revived,true);assert.equal(batch.receipt().amount_used,10000000n);validateWorld(w);assert.equal(expireV6(w,now,fences()),null);assert.equal(w.playability.lifecycle[0].deadline_ns,undefined);
});
test('malformed, duplicate, premature and rollback context facts fail without mutation',()=>{
 const w=world(),before=encodeWorld(w),f=fences()[0];for(const [time,fs]of[[w.playability.elapsed_ns-1n,[f]],[now,[f,f]],[now,[{...f,generation:f.generation+1}]],[now,[{...f,deadline_ns:f.deadline_ns-1n}]],[now,[{...f,cannon:w.next_cannon_id}]]]){assert.throws(()=>expireV6(w,time,fs));assert.deepEqual(encodeWorld(w),before);}
 const e=decodeCanonical(expireV6(w,now,[f]).output.events);assert.deepEqual(e.receipts,[]);assert.equal(e.events[0].kind,'lifecycle_context');assert.equal(sha256(encodeCanonical(e.events[0].context)),fixture.metadata_sha256);
});
test('an expired friendly marker leaves land supported by a surviving active cannon',()=>{
 const w=world(),a=w.cannons[0],plan=preparePurchase(w,a.account,10000000n,encodeV6Memo(parseV6TextMemo(new TextEncoder().encode('FIRE 1 0 1'))));PurchaseBatch.fire(a.account,10000000n,plan).step(w);
 const cell=a.cell+1,c={...a,id:w.next_cannon_id++,cell};w.cannons.push(c);setOwner(w,cell,1);const deadline=w.playability.elapsed_ns+V6_POLICY.dormancy_grace_ns;w.playability.lifecycle.push({cannon:c.id,player:1,generation:1,dormant_since_ns:w.playability.elapsed_ns,deadline_ns:deadline});validateWorld(w);
 const r=expireV6(w,deadline,[{cannon:c.id,generation:1,deadline_ns:deadline}]),next=decodeWorld(r.output.state);assert.equal(next.cannons.length,1);assert.deepEqual(next.balls,w.balls);assert.equal(ownerAt(next,cell),1);assert.equal(decodeCanonical(r.output.events).events[1].cell_retained,true);assert.deepEqual(next.credits,w.credits);
});
test('all configured dormant deadlines expire in bounded entity work with no board scan',()=>{
 const w=world(),template=w.cannons[0],account=template.account,count=V6_POLICY.max_cannons,since=w.playability.elapsed_ns,deadline=since+V6_POLICY.dormancy_grace_ns;
 // A synthetic maximum metadata fixture, not a capacity/performance claim.
 w.ownership.base.fill(0);w.ownership.overrides=[];w.ownership.counts=[];w.cannons=[];w.balls=[];w.pending=[];w.playability.players=[];w.playability.lifecycle=[];
 for(let i=0;i<count;i++){const id=i+1,player=Math.floor(i/V6_POLICY.max_retained_per_player)+1,owner=player===1?account:player.toString(16).padStart(2,'0').repeat(32);if(!w.playability.players.some(p=>p.id===player))w.playability.players.push({id:player,account:owner});w.cannons.push({...template,id,cell:i*2,account:owner});w.playability.lifecycle.push({cannon:id,player,generation:1,dormant_since_ns:since,deadline_ns:deadline});setOwner(w,i*2,player);}
 w.next_cannon_id=count+1;w.playability.next_player_id=w.playability.players.length+1;validateWorld(w);const f=dueFences(w,deadline),r=expireV6(w,deadline,f),next=decodeWorld(r.output.state);assert.equal(r.expired.length,count);assert.equal(next.cannons.length,0);assert.deepEqual(next.ownership.counts,[]);assert.deepEqual(next.time,w.time);assert.deepEqual(next.credits,w.credits);assert.ok(r.output.events.length<1024*1024);assert.equal(expireV6(next,deadline,f),null);
});
