import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
import {decodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {decodeShoutLedgerMemo,encodeShoutPayment} from '../../packages/protocol/shout.mjs';
import {decodeReservoirLedgerMemo,encodeReservoirPayment,readReservoirPayment,semanticReservoirPayment,reservoirCell,reservoirPut,reservoirSites,RESERVOIR_PRICE_E8S} from '../../packages/protocol/reservoir.mjs';
import {migrateReservoirs,prepareReservoir} from '../../packages/kernels/b2z/reservoirs.mjs';
import {decodeWorld,encodeWorld,setOwner,playerAt,RESERVOIR_CONFIG,SPACING_CONFIG,RESERVOIR_IDENTITY,SPACING_IDENTITY} from '../../packages/kernels/b2z/world.mjs';
import {quoteV6} from '../../apps/b2z-observer/action-quote-v6.mjs';
import {migrateDeflectorWorld} from '../../packages/kernels/b2z/deflectors-v12.mjs';
import {B2zKernel,B2zCursor} from '../../packages/kernels/b2z/kernel.mjs';

const encoder = new TextEncoder();
const RAW = Buffer.from(JSON.parse(readFileSync('tests/fixtures/context-structures-v13.json')).rows[0].initial_hex, 'hex');
const world = () => migrateReservoirs(decodeWorld(RAW));
const price = RESERVOIR_PRICE_E8S;
const raw = (cell,account,amount=price) => encodeReservoirPayment(account,amount,{kind:'reservoir',cell});
const seal = {...RESERVOIR_IDENTITY,logical_start:0n,logical_end:1n};

test('epoch has a new schema and upgrade keeps every predecessor field', () => {
  const previous=decodeWorld(RAW);
  const next=migrateReservoirs(previous);
  const {version,reservoirs,...rest}=next;
  assert.equal(version,8);
  assert.equal(reservoirs,'');
  assert.deepEqual({...rest,version:7},previous);
  for(const field of ['rules_hash','schema_hash','config_hash'])assert.notEqual(RESERVOIR_IDENTITY[field],SPACING_IDENTITY[field]);
  assert.deepEqual(encodeWorld(previous),new Uint8Array(RAW));
  assert.throws(()=>B2zKernel.begin(RAW,[],seal),/world\/identity mismatch/);
  assert.throws(()=>B2zKernel.begin(encodeWorld(next),[],{...seal,...SPACING_IDENTITY}),/world\/identity mismatch/);
});

test('adapter10 accepts only canonical reservoir text and preserves historical commands', () => {
  const account=world().cannons[0].account;
  for(const cell of [0,1,999999]){
    const bytes=encoder.encode('RESERVOIR '+cell);
    assert.throws(()=>decodeShoutLedgerMemo(0n,bytes));
    const {command}=decodeReservoirLedgerMemo(0n,bytes);
    assert.deepEqual(command,{kind:'reservoir',cell});
    const payment=readReservoirPayment(raw(cell,account));
    assert.equal(reservoirCell(payment.memo),cell);
    assert.equal(payment.amount,price);
  }
  for(const text of ['RESERVOIR 00','RESERVOIR 1\n','RESERVOIR -1','RESERVOIR 1000000','RESERVOIR 1|hi','reservoir 1','RESERVOIR +1']){
    assert.throws(()=>decodeReservoirLedgerMemo(0n,encoder.encode(text)),text);
  }
  const cmd={kind:'move_cannon',cannon:1,cell:199};
  const bytes=encodeReservoirPayment(account,10000n,cmd,'é');
  assert.equal(readReservoirPayment(bytes).cry,'é');
  assert.deepEqual(bytes.slice(8),encodeShoutPayment(account,10000n,cmd,'é').slice(8));
  assert.deepEqual(semanticReservoirPayment(bytes).slice(8),bytes.slice(8,56));
});

test('site exemptions keep ownership, exact occupancy and distance-four enemy clearance', () => {
  const w=world(),account=w.cannons[0].account;
  w.deflectors.push({id:1,cell:4007,owner:1,orientation:'NW'});
  w.next_deflector_id=2;
  w.reservoirs=reservoirPut(w.reservoirs,4008);
  assert.equal(prepareReservoir(w,account,price,4005).kind,'reservoir'); // next to Cannon
  assert.equal(prepareReservoir(w,account,price,4006).kind,'reservoir'); // next to Diverter
  assert.equal(prepareReservoir(w,account,price,4009).price,price); // next to Reservoir, enemy distance 4
  for(const [cell,reason] of [[4010,'ENEMY_TERRITORY_TOO_CLOSE'],[4004,'SITE_OCCUPIED'],[4007,'SITE_OCCUPIED'],[4008,'SITE_OCCUPIED'],[1001,'SITE_OCCUPIED'],[5004,'NOT_OWN_TERRITORY']]){
    assert.equal(prepareReservoir(w,account,price,cell).reason,reason);
  }
  assert.equal(prepareReservoir(w,account,price-1n,4009).reason,'UNDERFUNDED');
  for(const cell of [0,999,999000,999999]){
    const w=world();
    const enemy=(((Math.floor(cell/1000)+997)%1000)*1000+(cell%1000+997)%1000);
    setOwner(w,enemy,2);
    assert.equal(prepareReservoir(w,account,price,cell).reason,'ENEMY_TERRITORY_TOO_CLOSE');
  }
});

test('charged receipts are exact, duplicates are rejected and reservoirs do not change ball trajectories', () => {
  const w=world(),account=w.cannons[0].account,initial=encodeWorld(w);
  const rows=[[4005,price],[4005,price],[4006,price+12n],[4010,price],[4009,price-1n]];
  const items=rows.map(([cell,amount],i)=>({position:BigInt(i+1),payload_hex:Buffer.from(raw(cell,account,amount)).toString('hex')}));
  function run(items,restore) {
    let cursor=B2zKernel.begin(initial,items,seal);
    for(let steps=0;;steps++){
      assert.ok(steps<3000);
      if(cursor.step(73).complete)break;
      if(restore){const checkpoint=cursor.snapshot();cursor=B2zCursor.restore(checkpoint,sha256(checkpoint));}
    }
    cursor.finalizeElapsed(1n);
    return cursor.result();
  }
  const control=run([],false), result=run(items,false), restored=run(items,true);
  assert.deepEqual(result,restored);
  const final=decodeWorld(result.state), dry=decodeWorld(control.state);
  assert.deepEqual([...reservoirSites(final.reservoirs)],[4005,4006]);
  assert.deepEqual(final.balls,dry.balls);
  assert.deepEqual(final.credits,dry.credits);
  assert.equal(final.received_e8s,4_000_000n+price+11n);
  const audit=decodeCanonical(result.events);
  assert.equal(audit.version,8);
  assert.deepEqual(audit.receipts.map(r=>r.reason),['ACCEPTED','SITE_OCCUPIED','ACCEPTED','ENEMY_TERRITORY_TOO_CLOSE','UNDERFUNDED']);
  assert.deepEqual(audit.receipts.map(r=>r.amount_used),[price,0n,price,0n,0n]);
  assert.deepEqual(audit.events.filter(e=>e.kind==='reservoir_built').map(e=>e.cell),[4005,4006]);
  const comparable=e=>Array.isArray(e)?[e[0],...e.slice(2)]:Object.fromEntries(Object.entries(e).filter(([key])=>key!=='sequence'));
  assert.deepEqual(audit.events.filter(e=>e.kind!=='reservoir_built').map(comparable),decodeCanonical(control.events).events.map(comparable));
});

test('a ball captures a reservoir as ordinary territory without removing the excavation', () => {
  const row=JSON.parse(readFileSync('tests/fixtures/rules-v6.json')).cases.bridge_left;
  const start=migrateReservoirs(migrateDeflectorWorld(decodeWorld(Buffer.from(row.state_hex,'hex'))));
  const {logical_start,logical_end}=decodeCanonical(Buffer.from(row.seal_hex,'hex'));
  const target=103;
  assert.equal(playerAt(start,target),1);
  const run=w=>{
    const cursor=B2zKernel.begin(encodeWorld(w),[],{...RESERVOIR_IDENTITY,logical_start,logical_end});
    while(!cursor.step(512).complete){}
    cursor.finalizeElapsed(BigInt(row.observed_ns));
    return cursor.result();
  };
  const dry=run(start);
  start.reservoirs=reservoirPut(start.reservoirs,target);
  const wet=run(start),final=decodeWorld(wet.state);
  assert.equal(playerAt(final,target),2);
  assert.deepEqual([...reservoirSites(final.reservoirs)],[target]);
  assert.deepEqual(wet.events,dry.events);
  assert.deepEqual(wet.scores,dry.scores);
  assert.deepEqual(final.balls,decodeWorld(dry.state).balls);
});

test('the bitmap fits the board and quotes do not depend on counts', () => {
  const w=world(), account=w.cannons[0].account;
  const quote=()=>quoteV6(w,RESERVOIR_CONFIG,account,{kind:'reservoir',cell:4005});
  const first=quote();
  assert.equal(first.amount,1_000_000n);
  assert.equal(first.memo,'RESERVOIR 4005');
  assert.throws(()=>quoteV6(w,SPACING_CONFIG,account,{kind:'reservoir',cell:4005}),/UNSUPPORTED_RESERVOIR/);
  for(let cell=5000;cell<5099;cell++)w.reservoirs=reservoirPut(w.reservoirs,cell);
  assert.deepEqual(quote(),first);
  w.reservoirs=reservoirPut(w.reservoirs,999999);
  assert.equal(w.reservoirs.length,250000);
  assert.deepEqual(decodeWorld(encodeWorld(w)).reservoirs,w.reservoirs);
  assert.ok(encodeWorld(w).length<1048576);
});
