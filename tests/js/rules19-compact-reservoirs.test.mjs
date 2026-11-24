import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {prepareReservoir} from '../../packages/kernels/b2z/reservoirs.mjs';
import {decodeCanonical, encodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
import {B2zKernel} from '../../packages/kernels/b2z/kernel.mjs';
import {COMPACT_RESERVOIR_IDENTITY, DELEGATED_IDENTITY, decodeWorld, encodeWorld, migrateCompactReservoirs, ownerAt} from '../../packages/kernels/b2z/world.mjs';
import {encodeDelegatedPayment, decodeDelegatedPayment, icpAccount} from '../../packages/protocol/delegation.mjs';
import {legacyReservoirBitmap, MAX_COMPACT_RANGES, placeReservoir, reservoirHas, reservoirOccupancy, reservoirSites, validateReservoirs} from '../../packages/protocol/reservoir.mjs';
import {B2zView, snapshot} from '../../apps/b2z-observer/model.mjs';

const vector=JSON.parse(readFileSync(new URL('../fixtures/b2z-delegation-v18.json',import.meta.url)));
const exactSites=[998000,998001,999000,999001];
const bytes=value=>Buffer.from(value).toString('hex');
const seal={...vector.execution.seal,logical_start:BigInt(vector.execution.seal.logical_start),logical_end:BigInt(vector.execution.seal.logical_end)};
const observed=BigInt(vector.execution.observed_ns);
function legacyWorld() {
  const w=decodeWorld(Buffer.from(vector.execution.state,'hex'));
  w.reservoirs='';
  for (const site of exactSites) placeReservoir(w,site);
  return w;
}

function normalize(w) {
  const result=structuredClone(w);
  result.reservoirs=legacyReservoirBitmap(w);
  delete result.reservoir_ranges;
  result.version=10;
  return result;
}

function execute(w, inputs, commit, budget, elapsed=observed) {
  const logical_start=w.time[0];
  let cursor=B2zKernel.begin(encodeWorld(w),inputs,{...seal,...commit,logical_start,logical_end:logical_start+1n});
  const seed=cursor.seedBase;
  for (let i=0; !cursor.step(budget).complete; i++) {
    assert.ok(i<20000);
    const image=cursor.snapshot();
    cursor=B2zKernel.restore(image,sha256(image));
  }
  cursor.finalizeElapsed(elapsed);
  return {seed,...cursor.result()};
}

test('the exact high-cell terrain migrates without changing any other world field',()=>{
  const prior=legacyWorld(), before=encodeWorld(prior);
  assert.equal(prior.reservoirs.length,249751);
  const compact=migrateCompactReservoirs(prior);
  assert.deepEqual(compact.reservoir_ranges,[[998000,998002],[999000,999002]]);
  assert.equal(compact.reservoirs,undefined);
  assert.deepEqual(normalize(compact),prior);
  assert.deepEqual(encodeWorld(prior),before);
  assert.ok(before.length-encodeWorld(compact).length>249650);
  for (const [world, id] of [[prior,DELEGATED_IDENTITY],[compact,COMPACT_RESERVOIR_IDENTITY]]) {
    const verified=snapshot(encodeWorld(world),id);
    assert.deepEqual([...new B2zView(verified).reservoirs],exactSites);
  }
});

test('encoding is canonical at board bounds and across dense representation changes',()=>{
  const fixture=()=>({version:11,width:1000,height:1000,cannons:[],deflectors:[],reservoir_ranges:[]});
  const sparse=fixture();
  for(const site of [999999,0,3,1,2,500123])placeReservoir(sparse,site);
  assert.deepEqual(sparse.reservoir_ranges,[[0,4],[500123,500124],[999999,1000000]]);
  for(const at of [0,3,500123,999999])assert.equal(reservoirHas(reservoirOccupancy(sparse),at),true);
  for(const at of [4,500124,999998])assert.equal(reservoirHas(reservoirOccupancy(sparse),at),false);
  assert.throws(()=>placeReservoir(sparse,999999),/OCCUPANCY/);
  assert.throws(()=>placeReservoir(sparse,1000000),/OCCUPANCY/);
  assert.doesNotThrow(()=>validateReservoirs(sparse));
  assert.doesNotThrow(()=>validateReservoirs({...fixture(),reservoir_ranges:[[0,1000000]]}));
  for(const ranges of [null,[[0,0]],[[0,1],[1,2]],[[2,4],[3,5]],[[3,4],[0,2]],[[-1,1]],[[999999,1000001]],[[0,1,2]],[[1.5,3]]]){
    assert.throws(()=>validateReservoirs({...fixture(),reservoir_ranges:ranges}),/RANGE_SCHEMA/);
  }
  assert.throws(()=>validateReservoirs({...fixture(),reservoirs:''}),/RANGE_SCHEMA/);
  assert.throws(()=>validateReservoirs({...fixture(),reservoir_ranges:undefined,reservoirs:'1'}),/NONCANONICAL_DENSE/);
  assert.throws(()=>validateReservoirs({...sparse,cannons:[{cell:999999}]}),/OCCUPANCY/);
  const dense=fixture();
  dense.reservoir_ranges=Array.from({length:MAX_COMPACT_RANGES},(_,n)=>[n*2,n*2+1]);
  placeReservoir(dense,999999);
  assert.equal(dense.reservoir_ranges,undefined);
  assert.equal(dense.reservoirs.length,250000);
  assert.doesNotThrow(()=>validateReservoirs(dense));
  placeReservoir(dense,1);
  assert.equal(dense.reservoirs,undefined);
  assert.deepEqual(dense.reservoir_ranges.at(-1),[999999,1000000]);
  assert.equal([...reservoirSites(dense.reservoir_ranges)].length, MAX_COMPACT_RANGES+2);
});

test('legacy input projection preserves placement, events, scores and auth outcomes',()=>{
  const legacy=legacyWorld(), compact=migrateCompactReservoirs(legacy);
  const normal=vector.execution.inputs.map(i=>({...i,position:BigInt(i.position)}));
  const payment=decodeDelegatedPayment(vector.envelope);
  const joining={...payment,from:icpAccount('rrkah-fqaaa-aaaaa-aaaaq-cai'),spender:null,position:1n,
    amount:100000000n,memo:Buffer.from('NEW 0 1')};
  const join=[{position:1n,payload_hex:bytes(encodeDelegatedPayment(joining))}];
  for(const inputs of [[],normal,join]){
    const a=execute(legacy,inputs,DELEGATED_IDENTITY,211);
    const b=execute(compact,inputs,COMPACT_RESERVOIR_IDENTITY,109);
    if(inputs===join) {
      assert.equal(a.seed,b.seed);
    } else if(inputs.length===0){
      assert.equal(b.seed,'');
    }
    const stateA=decodeWorld(a.state), stateB=normalize(decodeWorld(b.state));
    const oldHash=sha256(encodeWorld(legacy)), newHash=sha256(encodeWorld(compact));
    const history=legacy.economy.snapshots.length;
    for (const item of stateB.economy.snapshots.slice(history)) {
      assert.equal(item.predecessor_state_hash,newHash);
      item.predecessor_state_hash=oldHash;
    }
    assert.deepEqual(stateB,stateA);
    for(const key of ['events','scores']){
      const old=decodeCanonical(a[key]),current=decodeCanonical(b[key]);
      for (const event of current.events??[]) if(event.kind==='economy_snapshot') {
        assert.equal(event.snapshot.predecessor_state_hash,newHash);
        event.snapshot.predecessor_state_hash=oldHash;
      }
      assert.deepEqual(encodeCanonical({...current,version:10}),encodeCanonical(old));
    }
  }
});

test('Adapter12 buys Reservoirs at both ends and preserves the occupied-site refusals',()=>{
  const exact=gunzipSync(readFileSync(new URL('../fixtures/rules19-paid-world-17529-state.bin.gz',import.meta.url)));
  assert.equal(sha256(exact),'25c2bb87e0ebeabd2f93bd4295e3296fb2e7ffba26b6a2c5cd3dc420f1bf3f10');
  const legacy=decodeWorld(exact), compact=migrateCompactReservoirs(legacy);
  const account=legacy.playability.players[0].account;
  const at=(start, step)=>{
    for(let cell=start;cell>=0&&cell<1000000;cell+=step)
      if(ownerAt(legacy,cell)>0&&prepareReservoir(legacy,account,100000000n,cell)?.kind==='reservoir')return cell;
    throw Error('No eligible fixture cell');
  };
  const near=at(0,1),far=at(999999,-1);
  assert.ok(near<20000&&far>980000,[near,far]);
  const facts=decodeDelegatedPayment(vector.envelope);
  const elapsed=legacy.playability.elapsed_ns+1000000000n;
  const directives=[
    ['RESERVOIR '+near,100000000n],
    ['RESERVOIR '+far,100000000n],
    ['NEW 0 1 '+near,100000000n],
    ['DEFLECT '+far+' N',100000000n],
    ['RESERVOIR '+far,999999n],
  ];
  const inputs=directives.map(([memo,amount],i)=>{
    const position=(legacy.authorization.last_position??0n)+BigInt(i)+1n;
    return {position,payload_hex:bytes(encodeDelegatedPayment({...facts,from:account,to:legacy.authorization.recipient,
      spender:null,position,ledger_time_ns:elapsed-100n+BigInt(i),memo:Buffer.from(memo),amount}))};
  });
  const old=execute(legacy,inputs,DELEGATED_IDENTITY,277,elapsed);
  const next=execute(compact,inputs,COMPACT_RESERVOIR_IDENTITY,87,elapsed);
  assert.equal(next.seed,old.seed);
  const receipts=decodeCanonical(next.events).receipts;
  assert.deepEqual(receipts.map(row=>row.reason),['ACCEPTED','ACCEPTED','SITE_OCCUPIED','STRUCTURE_TOO_CLOSE','UNDERFUNDED']);
  assert.deepEqual(receipts,decodeCanonical(old.events).receipts);
  assert.equal(sha256(encodeWorld(normalize(decodeWorld(next.state)))),sha256(old.state));
  assert.deepEqual([...reservoirSites(reservoirOccupancy(decodeWorld(next.state)))].sort((a,b)=>a-b),
    [...exactSites,near,far].sort((a,b)=>a-b));
  assert.throws(()=>B2zKernel.begin(encodeWorld(compact),[inputs[0],inputs[0]],{...COMPACT_RESERVOIR_IDENTITY,
    logical_start:legacy.time[0],logical_end:legacy.time[0]+1n}),/order|duplicate/i);
});
