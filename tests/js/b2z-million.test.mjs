import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {unhex} from '../../node_modules/@dtr/timeline-runtime/packages/protocol/bytes.mjs';
import {encodeCanonical} from '../../node_modules/@dtr/timeline-runtime/packages/runtime/canonical.mjs';
import {sha256} from '../../node_modules/@dtr/timeline-runtime/packages/runtime/seal.mjs';
import {stageMillionWorld} from '../../packages/kernels/b2z/migration.mjs';
import {beginCapture,topologyStep} from '../../packages/kernels/b2z/topology.mjs';
import {B2zCursor} from '../../packages/kernels/b2z/kernel.mjs';
import {B2zView,snapshot} from '../../apps/b2z-observer/model.mjs';
import {
  MILLION_IDENTITY,
  decodeWorld,
  encodeWorld,
  ownerAt,
  ownershipCounts,
  setOwner,
  setOwnerRange,
  fixtureWorld,
} from '../../packages/kernels/b2z/world.mjs';

const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/b2z-torus-v4.json',import.meta.url),'utf8'));

test('v4 to v5 migration is byte-exact, compact, topology-preserving and independently mutable',()=>{
  assert.deepEqual(MILLION_IDENTITY,{
    rules_hash:'0bb2169c5ccd71b6c43e0e47bb0ea341c577881ab3193bf1bbd3eed3b02ffb14',
    schema_hash:'a9317c0f2449e8c511c6d0aaef8d1988054b4b61f3f58984ead3a42c85a73d03',
    config_hash:'cfd4fa714ee1c835b56e7f5939d9f1f56312bbbfc0c09775681e581dc3250c03',
  });
  const old=decodeWorld(unhex(fixture.migration.new_hex));
  const bytes=stageMillionWorld(unhex(fixture.migration.new_hex));
  assert.equal(bytes.length,2742);
  assert.equal(sha256(bytes),'72a73e5e53072848d9b38f30000240adf65baf802da5351bbbeb81d490e14444');
  const world=decodeWorld(bytes);
  assert.deepEqual([world.version,world.width,world.height],[5,1000,1000]);
  assert.equal(world.cells,undefined);
  assert.equal(world.ownership.overrides.length,0);
  assert.deepEqual(world.credits,old.credits);
  assert.equal(world.received_e8s,old.received_e8s);
  assert.deepEqual(ownershipCounts(world),[[1,125000]]);
  for(const cannon of world.cannons)assert.equal(ownerAt(world,cannon.cell),cannon.id);
  for(const ball of world.balls)assert.equal(ownerAt(world,ball.cell),ball.owner);

  const changed=world.cannons[0].cell+1,previous=ownerAt(world,changed);
  setOwner(world,changed,0);
  assert.equal(previous,1);assert.equal(ownerAt(world,changed),0);
  assert.deepEqual(ownershipCounts(world),[[1,124999]]);
  assert.equal(decodeWorld(encodeWorld(world)).ownership.overrides.length,1);
  setOwner(world,changed,previous);
  assert.equal(world.ownership.overrides.length,0,'returning to base compacts the override');
  assert.equal(encodeWorld(world).length,bytes.length);
});

test('v5 migration rejects a transient strike boundary',()=>{
  const old=decodeWorld(unhex(fixture.migration.new_hex));
  old.pending=[{id:1,from:old.balls[0].cell,to:old.balls[0].cell+1,axis:'x',ball:old.balls[0].id,owner:1,defender:2,born:old.time,deadline:[old.time[0]+1n,1n],position:[0n,1n]}];
  assert.throws(()=>stageMillionWorld(encodeWorld(old)),/pending|strike|boundary/);
});

test('ordinary million-cell capture is local, compact and interruption-safe',()=>{
  const account=id=>id.toString(16).padStart(64,'0');
  const cells=Array(1024).fill(0).map((_,cell)=>cell%32<16?1:2);
  const cannon=(id,cell)=>({id,cell,account:account(id),heading:0});
  const ball=(id,owner,cell)=>({id,owner,cell,x0:BigInt((cell%32)*1024+512),y0:BigInt(Math.floor(cell/32)*1024+512),vx:1024,vy:1});
  const v4=fixtureWorld({version:4,width:32,height:32,cells,cannons:[cannon(1,264),cannon(2,279)],balls:[ball(1,1,264),ball(2,2,279)]});
  const world=decodeWorld(stageMillionWorld(encodeWorld(v4)));
  const target=400*1000+500;
  assert.equal(ownerAt(world,target),2);assert.equal(ownerAt(world,target-1),1);
  const job=beginCapture(world,target,1);
  let units=0;
  while(!topologyStep(world,job)){units++;assert(units<100,'ordinary boundary capture must not flood a scaled territory');
    const snapshot=encodeCanonical(job);assert(snapshot.length<20000);
  }
  assert.equal(ownerAt(world,target),1);
  assert.deepEqual(job.changed_ranges,[[target,target+1]]);
  assert.deepEqual(ownershipCounts(world),[[1,500001],[2,499999]]);
  assert.equal(world.balls.length,2);
  encodeWorld(world);
});

test('million-cell one-tick replay is exact, compact and restart invariant',()=>{
  const account=id=>id.toString(16).padStart(64,'0');
  const cells=Array(1024).fill(0).map((_,cell)=>cell%32<16?1:2);
  const cannon=(id,cell)=>({id,cell,account:account(id),heading:0});
  const ball=(id,owner,cell)=>({id,owner,cell,x0:BigInt((cell%32)*1024+512),y0:BigInt(Math.floor(cell/32)*1024+512),vx:1024,vy:1});
  const v4=fixtureWorld({version:4,width:32,height:32,cells,cannons:[cannon(1,264),cannon(2,279)],balls:[ball(1,1,264),ball(2,2,279)]});
  const state=stageMillionWorld(encodeWorld(v4));
  const seal={...MILLION_IDENTITY,source_id:'00'.repeat(32),logical_start:0n,logical_end:1n};
  let cursor=new B2zCursor(state,[],seal),units=0,maxSnapshot=0;
  while(cursor.phase!=='done'){
    cursor.step(1);units++;
    const snapshot=cursor.snapshot();maxSnapshot=Math.max(maxSnapshot,snapshot.length);
    if(units%11===0)cursor=B2zCursor.restore(snapshot,sha256(snapshot));
    assert(units<10000);
  }
  const output=cursor.result();
  assert.equal(units,313);assert(maxSnapshot<20000);
  assert.deepEqual([output.state,output.events,output.scores].map(sha256),[
    '7cb53a379c66bf09b44eadb249a83b41fa86247aa9243fcea2561ee3dd0c3a03',
    '7865dc45b7bd47d54ccd885457c7bfcfe68aef38a885d2c1db3578146d1d318b',
    '05e60abb7576697f0334c3e8da1ab284f41526bdb4e8f5408b07d177483aee42',
  ]);
  assert.deepEqual(decodeWorld(output.state).time,[1n,1n]);
});

test('neutral v5 captures checkpoint and recover at every bounded cursor yield',()=>{
  const account='01'.padStart(64,'0'),cell=16*32+15;
  const old=fixtureWorld({version:4,width:32,height:32,cells:Array.from({length:1024},(_,i)=>i%32<16?1:0),cannons:[{id:1,cell:264,account,heading:0}],balls:[{id:1,owner:1,cell,x0:15872n,y0:16896n,vx:1024,vy:0}]});
  const state=stageMillionWorld(encodeWorld(old)),seal={...MILLION_IDENTITY,source_id:'00'.repeat(32),logical_start:0n,logical_end:1n};
  const run=(budget,recover)=>{let c=new B2zCursor(state,[],seal),turns=0,sawNeutral=false;while(c.phase!=='done'){
    c.step(budget);sawNeutral||=c.phase==='topology'&&c.job.defender===0;
    const bytes=c.snapshot();if(recover)c=B2zCursor.restore(bytes,sha256(bytes));assert(++turns<10000);
  }return {output:c.result(),sawNeutral};};
  const expected=run(512,false).output;
  for(const budget of [1,23]){const got=run(budget,true);assert.deepEqual(got.output,expected);if(budget===1)assert(got.sawNeutral);}
});

test('observer verifies compact v5 ownership and applies authenticated range deltas',()=>{
  const account=id=>id.toString(16).padStart(64,'0');
  const cells=Array(1024).fill(0).map((_,cell)=>cell%32<16?1:2);
  const cannon=(id,cell)=>({id,cell,account:account(id),heading:0});
  const ball=(id,owner,cell)=>({id,owner,cell,x0:BigInt((cell%32)*1024+512),y0:BigInt(Math.floor(cell/32)*1024+512),vx:1024,vy:1});
  const v4=fixtureWorld({version:4,width:32,height:32,cells,cannons:[cannon(1,264),cannon(2,279)],balls:[ball(1,1,264),ball(2,2,279)]});
  const state=stageMillionWorld(encodeWorld(v4)),initial=snapshot(state,MILLION_IDENTITY),view=new B2zView(initial),target=400500;
  assert.equal(view.owner(target),2);assert.equal([...view.ownershipRects()].length,1024);
  view.apply({kind:'capture',sequence:0,time:[0n,1n],attacker:1,ball:1,target,cell_ranges:[[target,target+1]],destroyed_balls:[],eliminated_cannons:[]});
  const final=decodeWorld(state);setOwner(final,target,1);
  assert(view.matches(final));assert.equal(view.owner(target),1);
  assert.deepEqual(view.stats().map(s=>[s.id,s.area]),[[1,500001],[2,499999]]);
  assert.throws(()=>snapshot(state,{...MILLION_IDENTITY,config_hash:'00'.repeat(32)}),/million rules/);
});

test('adversarial 249,500-cell severance stays resumable and compact',()=>{
  const account=id=>id.toString(16).padStart(64,'0');
  const cells=Array(1024).fill(0).map((_,cell)=>cell%32<16?1:2);
  const cannon=(id,cell)=>({id,cell,account:account(id),heading:0});
  const ball=(id,owner,cell)=>({id,owner,cell,x0:BigInt((cell%32)*1024+512),y0:BigInt(Math.floor(cell/32)*1024+512),vx:1024,vy:1});
  const v4=fixtureWorld({version:4,width:32,height:32,cells,cannons:[cannon(1,264),cannon(2,279)],balls:[ball(1,1,264),ball(2,2,279)]});
  const world=decodeWorld(stageMillionWorld(encodeWorld(v4)));
  setOwnerRange(world,500,1000,2,1);setOwnerRange(world,500500,500750,2,1);setOwnerRange(world,500751,501000,2,1);
  const job=beginCapture(world,500750,1);let units=0;
  while(!topologyStep(world,job)){units++;assert(units<600000);}
  const state=encodeWorld(world);
  assert.equal(units,499508);assert.equal(state.length,22900);
  assert.equal(sha256(state),'8a82b10e8d426e9bd19b54669094781b020b9de5e73ffd7290a2a07b34104dd2');
  assert.deepEqual(ownershipCounts(world),[[1,750500],[2,249500]]);assert.equal(job.changed_ranges.length,500);
});
