import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
import {decodeWorld,encodeWorld,validateWorld,ownerAt,setOwner,ownershipCounts} from '../../packages/kernels/b2z/world.mjs';
import {stageMillionWorld} from '../../packages/kernels/b2z/migration.mjs';
import {migratePlayability,markDormant,clearUnsupportedPlayer,finalizeElapsed,revive,dueFences,scoreAreas,life,playerForCannon,V6_POLICY} from '../../packages/kernels/b2z/playability.mjs';
const old=JSON.parse(fs.readFileSync(new URL('../fixtures/b2z-torus-v4.json',import.meta.url),'utf8'));
const vector=JSON.parse(fs.readFileSync(new URL('../fixtures/playability-v6.json',import.meta.url),'utf8'));
const original=()=>decodeWorld(stageMillionWorld(Buffer.from(old.migration.new_hex,'hex'))),now=BigInt(vector.observed_ns),completed=BigInt(vector.completed_ns);
const digest=w=>createHash('sha256').update(encodeWorld(w)).digest('hex');
function dormant(){const w=migratePlayability(original(),now);w.balls=[];w.pending=[];const fence=markDormant(w,1);clearUnsupportedPlayer(w,1);const stamped=finalizeElapsed(w,completed,[fence]);validateWorld(w);return {w,fence:stamped[0]};}
test('v5 -> v6 metadata preserves the exact paid world and historical bytes',()=>{
 const before=original(),w=migratePlayability(before,now);assert.equal(digest(before),vector.v5_sha256);assert.equal(digest(w),vector.migration_sha256);
 const restored=structuredClone(w);delete restored.playability;restored.version=5;assert.deepEqual(encodeWorld(restored),encodeWorld(before));
 assert.deepEqual(w.credits,before.credits);assert.equal(w.received_e8s,before.received_e8s);assert.throws(()=>migratePlayability(w,now),/EXPECTED_V5/);
});
test('24-hour deadline uses completion elapsed time and never changes logical time',()=>{
 const {w,fence}=dormant();assert.equal(digest(w),vector.dormant_sha256);assert.deepEqual(w.time,original().time);assert.equal(fence.deadline_ns,completed+86400000000000n);
 assert.deepEqual(dueFences(w,fence.deadline_ns-1n),[]);assert.deepEqual(dueFences(w,fence.deadline_ns),[fence]);
 assert.equal(markDormant(w,1),null);assert.deepEqual(scoreAreas(w),[]);assert.deepEqual(ownershipCounts(w),[[1,1]]);assert.equal(ownerAt(w,w.cannons[0].cell),1);
 assert.deepEqual(w.credits,original().credits);assert.equal(w.received_e8s,original().received_e8s);
});
test('a paid revival fences stale deadlines and does not restore territory',()=>{
 const {w,fence}=dormant();assert.throws(()=>revive(w,1),/REVIVAL_REQUIRES_PAID_BALL/);w.balls=original().balls;assert.equal(revive(w,1),true);assert.equal(digest(w),vector.revived_sha256);
 assert.deepEqual(finalizeElapsed(w,completed+1n,[fence]),[]);assert.deepEqual(dueFences(w,fence.deadline_ns),[]);assert.deepEqual(ownershipCounts(w),[[1,1]]);
 assert.equal(life(w,1).generation,3);assert.equal(revive(w,1),false);validateWorld(w);
});
test('clock rollback, duplicate fences, malformed deadlines and overflow fail without mutation',()=>{
 const {w,fence}=dormant(),before=encodeWorld(w);
 for(const [time,pending]of [[completed-1n,[]],[completed,[fence,fence]],[18446744073709551615n,[fence]]]){assert.throws(()=>finalizeElapsed(w,time,pending));assert.deepEqual(encodeWorld(w),before);}
 life(w,1).deadline_ns++;assert.throws(()=>validateWorld(w),/CANNON_LIFECYCLE/);
 const x=migratePlayability(original(),now);x.playability.lifecycle[0].deadline_ns=null;assert.throws(()=>validateWorld(x));
});
test('multiple cannons share authenticated player ownership; dormant anchors do not score',()=>{
 const w=migratePlayability(original(),now),c={...w.cannons[0],id:2,cell:w.cannons[0].cell+1};assert.equal(ownerAt(w,c.cell),1);
 w.cannons.push(c);w.next_cannon_id=3;w.playability.lifecycle.push({cannon:2,player:1,generation:1,dormant_since_ns:now,deadline_ns:now+V6_POLICY.dormancy_grace_ns});validateWorld(w);
 assert.equal(playerForCannon(w,2),1);assert.equal(clearUnsupportedPlayer(w,1),false);assert.equal(scoreAreas(w)[0][1],ownershipCounts(w)[0][1]-1);
 c.account='02'.repeat(32);assert.throws(()=>validateWorld(w),/CANNON_PLAYER_BINDING/);c.account=w.cannons[0].account;
 const oldVersion=structuredClone(w);delete oldVersion.playability;oldVersion.version=5;assert.throws(()=>validateWorld(oldVersion),/account\/anchor/);
});
test('dormant-only terrain and undeclared player bindings cannot survive validation',()=>{
 const {w}=dormant();setOwner(w,(w.cannons[0].cell+10)%1000000,1);assert.throws(()=>validateWorld(w),/DORMANT_TERRITORY_RETAINED/);
 const x=migratePlayability(original(),now);x.playability.lifecycle[0].player=2;assert.throws(()=>validateWorld(x));
});
test('an expired player record retains identity but cannot retain unsupported land',()=>{
 const w=migratePlayability(original(),now);w.playability.players.push({id:100,account:'02'.repeat(32)});w.playability.next_player_id=101;validateWorld(w);
 setOwner(w,(w.cannons[0].cell+10)%1000000,100);assert.throws(()=>validateWorld(w),/unknown cell owner/);
});
