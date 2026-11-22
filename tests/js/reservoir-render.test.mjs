import test from 'node:test';
import assert from 'node:assert/strict';
import {ReservoirOccupancy, reservoirChunk} from '../../apps/b2z-observer/reservoir-occupancy.mjs';
import {reservoirMarbling} from '../../apps/b2z-observer/reservoir-art.mjs';

const area = chunks => chunks.flatMap(c => c.water).reduce((sum, [x,z,toX,toZ]) => sum + (toX-x)*(toZ-z), 0);
const perimeter = chunks => chunks.flatMap(c => c.walls).reduce((sum, [x,z,toX,toZ]) => sum + Math.abs(toX-x)+Math.abs(toZ-z), 0);
const occupiedChunks = mask => [...mask.chunkCounts.keys()].map(key => reservoirChunk(mask,key));

test('connected 6×4 basin removes the whole footprint and has four exposed walls', () => {
  const mask = new ReservoirOccupancy(1000,1000,true);
  mask.setCells(Array.from({length:24},(_,i) => (32+Math.floor(i/6))*1000+32+i%6));
  const chunks=occupiedChunks(mask);
  assert.equal(mask.bytes.byteLength,1_000_000);
  assert.equal(chunks.length,1);
  assert.deepEqual(chunks[0].water,[[32,32,38,36]]);
  assert.equal(chunks[0].walls.length,4);
  assert.equal(perimeter(chunks),20);
});

test('irregular and diagonal joins cut exactly the occupied cells', () => {
  const mask = new ReservoirOccupancy(100,100,false);
  mask.setCells([101,102,201,303]);
  let chunks=occupiedChunks(mask);
  assert.equal(area(chunks),4);
  assert.equal(perimeter(chunks),12);
  mask.setCells([102],false);
  chunks=occupiedChunks(mask);
  assert.equal(area(chunks),3);
  assert.equal(perimeter(chunks),10);
});

test('orthogonal adjacency crosses both the toroidal and geometry chunk cuts', () => {
  const mask = new ReservoirOccupancy(1000,1000,true);
  mask.setCells([0,999,999000,999999, 5*1000+15,5*1000+16]);
  const chunks=occupiedChunks(mask);
  assert.equal(area(chunks),6);
  assert.equal(perimeter(chunks),14);
  assert.ok(mask.has(-1,-1));
  assert.ok(mask.has(1000,1000));
  const {chunks:touched}=mask.takeChanges();
  assert.equal(touched.size,5);
  mask.setCells([0],false);
  const {rows,chunks:changed}=mask.takeChanges();
  assert.deepEqual([...rows],[[0,{first:0,last:0}]]);
  assert.equal(changed.size,3);
  assert.equal(perimeter(occupiedChunks(mask)),14);
});

test('one packed texel contains four separate cells and no-op edits remain clean', () => {
  const mask = new ReservoirOccupancy(5,3,false);
  mask.setCells([1,3,4]);
  assert.deepEqual([...mask.bytes.subarray(0,8)],[0,255,0,255,255,0,0,0]);
  assert.equal(mask.index(-1,0),-1);
  mask.takeChanges();
  const rev=mask.revision;
  mask.setCells([1,3]);
  assert.equal(mask.revision,rev);
  assert.equal(mask.takeChanges().rows.size,0);
  assert.throws(()=>mask.setCells([0,15]),RangeError);
  assert.equal(mask.has(0,0),false);
});

test('original marbling bakes once into opaque mipmap-sized RGBA pixels', () => {
  const art=reservoirMarbling();
  assert.equal(art,reservoirMarbling());
  assert.equal(art.pixels.length,256*256*4);
  const groups=new Set();
  for(let i=0;i<art.pixels.length;i+=4){
    const [r,g,b,a]=art.pixels.subarray(i,i+4);
    assert.equal(a,255);
    groups.add(r>g&&r>b?'warm':b>r&&g>r?'cyan':b>g&&r>g?'violet':'other');
  }
  assert.equal(groups.size,4);
});
