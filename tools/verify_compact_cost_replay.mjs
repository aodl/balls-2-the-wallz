#!/usr/bin/env node
/** Independent JavaScript replay of the pinned PocketIC cost fixture and its epoch. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {decodeCanonical, encodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
import {B2zKernel} from '../packages/kernels/b2z/kernel.mjs';
import {decodeWorld, DELEGATED_IDENTITY, encodeWorld} from '../packages/kernels/b2z/world.mjs';
import {legacyReservoirBitmap, reservoirOccupancy, reservoirSites} from '../packages/protocol/reservoir.mjs';
import {prepareCheckpoint, prepareDerivedSegment} from '../apps/b2z-observer/model.mjs';

const [directory, count, cutover = join(directory,'cutover')] = process.argv.slice(2);
const read = (n, kind, base=directory) => readFileSync(join(base, `${n}-${kind}.bin`));
const decode = (n, kind, base) => decodeCanonical(read(n,kind,base));
const prior = decode(0,'publication',cutover), successor = decode(1,'publication',cutover);
const worlds = [read(0,'state',cutover), read(1,'state',cutover)];
const sites = body => [...reservoirSites(reservoirOccupancy(decodeWorld(body)))];
assert.deepEqual(sites(worlds[0]),sites(worlds[1]));
await prepareCheckpoint(worlds[0],{
  state:worlds[1],events:read(1,'events',cutover),scores:read(1,'scores',cutover)
},successor,prior);

function replay(body, inputs, seal, time) {
  const cursor = B2zKernel.begin(body,inputs,seal);
  const seed = cursor.seedBase;
  while (!cursor.step(113).complete) {}
  cursor.finalizeElapsed(time);
  return {seed,...cursor.result()};
}
function restoreLegacy(w) {
  w.reservoirs=legacyReservoirBitmap(w);
  delete w.reservoir_ranges;
  w.version=10;
  return w;
}

const inputs = decodeCanonical(readFileSync(join(directory,'replay-inputs.bin')));
const rows = [];
for(let number=1;number<=Number(count);number++) {
  const start=read(number-1,'state'), end=read(number,'state');
  const publication=decode(number,'publication');
  const audit=decode(number,'events');
  const time=audit.events.at(-1).observed_ns;
  assert.equal(typeof time,'bigint');
  await prepareDerivedSegment(start,end,read(number,'events'),publication);
  const actual=replay(start,inputs,publication.head.seal,time);
  for(const kind of ['state','events','scores'])assert.deepEqual(Buffer.from(actual[kind]),read(number,kind));
  const legacyStart=encodeWorld(restoreLegacy(decodeWorld(start)));
  const legacy=replay(legacyStart,inputs,{...publication.head.seal,...DELEGATED_IDENTITY},time);
  const normalization={compact:sha256(start),legacy:sha256(legacyStart)};
  const history=decodeWorld(start).economy.snapshots.length;
  const legacyEnd=restoreLegacy(decodeWorld(actual.state));
  for(const row of legacyEnd.economy.snapshots.slice(history)){
    assert.equal(row.predecessor_state_hash,normalization.compact);
    row.predecessor_state_hash=normalization.legacy;
  }
  assert.deepEqual(encodeWorld(legacyEnd),legacy.state);
  for(const kind of ['events','scores']){
    const normalized={...decodeCanonical(actual[kind]),version:10};
    for(const event of normalized.events??[])if(event.kind==='economy_snapshot'){
      assert.equal(event.snapshot.predecessor_state_hash,normalization.compact);
      event.snapshot.predecessor_state_hash=normalization.legacy;
    }
    assert.deepEqual(encodeCanonical(normalized),legacy[kind]);
  }
  if(actual.seed)assert.equal(actual.seed,legacy.seed);
  rows.push({segment:publication.head.segment_id.toString(),state:sha256(actual.state),seed:actual.seed||null});
}
writeFileSync(join(directory,'independent-replay.json'), JSON.stringify({status:'PASS',prior:prior.head.state_hash,
  successor:successor.head.state_hash,reservoirs:sites(worlds[1]),rows},null,2)+'\n');
