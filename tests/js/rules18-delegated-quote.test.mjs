import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
import {DAY_NS} from '../../packages/protocol/economy17.generated.mjs';
import {migrateEconomy} from '../../packages/kernels/b2z/economy17.mjs';
import {migrateReservoirs} from '../../packages/kernels/b2z/reservoirs.mjs';
import {decodeWorld,encodeWorld,ECONOMY_CONFIG} from '../../packages/kernels/b2z/world.mjs';
import {quoteForMemo} from '../../apps/b2z-observer/delegated-payments/quote.mjs';

test('delegated quote matches current Rules17 quotes for all seven action types',()=>{
 const vector=JSON.parse(readFileSync(new URL('../fixtures/context-structures-v13.json',import.meta.url))).rows[0];
 const predecessor=decodeWorld(Buffer.from(vector.initial_hex,'hex'));
 predecessor.deflectors.push({id:1,cell:4007,owner:1,orientation:'NW'});
 predecessor.next_deflector_id=2;
 const base=migrateReservoirs(predecessor);
 const midnight=20000n*DAY_NS;
 const world=migrateEconomy(base,midnight-1n,sha256(encodeWorld(base)));
 const account=world.cannons[0].account;
 for(const [memo,price] of [
  ['FIRE 1 37.5 1|Hi',80_000n],['MOVE 1 3003',10_000n],['NEW 37.5 2 0|Build',8_180_000n],
  ['DEFLECT 0 S|Build',800_000n],['DROT 1 E|Turn',10_000n],['DMOVE 1 0|Shift',10_000n],
  ['RESERVOIR 4005',10_000_000n]
 ]){
  const quote=quoteForMemo(world,ECONOMY_CONFIG,account,memo,midnight-1n);
  assert.equal(quote.memo,memo);
  assert.equal(new TextDecoder().decode(quote.memo_bytes),memo);
  assert.equal(quote.amount,price,memo);
 }
 assert.throws(()=>quoteForMemo(world,ECONOMY_CONFIG,account,'RESERVOIR 4005|x'));
 assert.throws(()=>quoteForMemo(world,ECONOMY_CONFIG,account,'MOVE 1 4004'));
});
