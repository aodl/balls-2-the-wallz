import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {projectAnimation,trajectory} from '../../packages/kernels/btz/animation.mjs';
import {decodeWorld,position} from '../../packages/kernels/btz/world.mjs';
import {decodeCanonical,encodeCanonical} from '../../packages/runtime/canonical.mjs';
import {sha256} from '../../packages/runtime/seal.mjs';import {unhex} from '../../packages/protocol/bytes.mjs';
const rows=JSON.parse(fs.readFileSync(new URL('../fixtures/btz-v3-golden.json',import.meta.url),'utf8')).cases;
function trackEvent(tracks,e){
  if(e.kind==='motion')tracks.set(e.ball,trajectory(e.ball_state));
  if(['ball_spawned','cannon_spawned','trajectory'].includes(e.kind))tracks.set(e.ball.id,trajectory(e.ball));
  if(e.kind==='annihilation')for(const pair of e.pairs)for(const b of pair)tracks.delete(b);
  for(const b of e.destroyed_balls??[])tracks.delete(b);
}
for(const r of rows){
  test(`${r.name}: compact playback equals the full trajectory at every event boundary`,()=>{
    const initial=unhex(r.initial_hex),raw=unhex(r.outputs.events.hex),source=decodeCanonical(raw),out=projectAnimation(initial,raw);
    const view=decodeCanonical(out.bytes);assert.equal(view.initial_state_hash,sha256(initial));assert.equal(view.source_events_hash,sha256(raw));
    assert.deepEqual(view.receipts,source.receipts);
    const seed=()=>new Map(decodeWorld(initial).balls.map(b=>[b.id,trajectory(b)]));const full=seed(),compact=seed();
    const byId=new Map(view.events.map(e=>[e.sequence,e]));
    for(const e of source.events){
      trackEvent(full,e);if(byId.has(e.sequence))trackEvent(compact,byId.get(e.sequence));
      assert.deepEqual(compact,full);
      for(const [id,b] of full)assert.deepEqual(position(b,e.time),position(compact.get(id),e.time));
      if(e.kind!=='motion')assert.deepEqual(byId.get(e.sequence),e); // no ownership/score/cannon/annihilation loss
    }
    assert.deepEqual([...compact].sort(),decodeWorld(unhex(r.outputs.state.hex)).balls.map(b=>[b.id,trajectory(b)]).sort());
    assert.deepEqual(projectAnimation(initial,raw).bytes,out.bytes); // deterministic derived codec
    assert.equal(sha256(raw),r.outputs.events.sha256);
  });
}
test('dense fixture omits 146 motion records without changing canonical source',()=>{
  const r=rows.find(r=>r.name==='dense'),raw=unhex(r.outputs.events.hex),out=projectAnimation(unhex(r.initial_hex),raw);
  assert.equal(out.statistics.omitted_motion_events,146);assert(out.bytes.length<raw.length/3);
});
test('projection rejects a wrong source version rather than guessing',()=>{
  const r=rows[0],s=decodeCanonical(unhex(r.outputs.events.hex));s.version=4;
  assert.throws(()=>projectAnimation(unhex(r.initial_hex),encodeCanonical(s)),/version/);
});
test('projection rejects missing or out-of-order source events',()=>{
  const r=rows.find(r=>r.name==='dense'),s=decodeCanonical(unhex(r.outputs.events.hex));s.events.shift();
  assert.throws(()=>projectAnimation(unhex(r.initial_hex),encodeCanonical(s)),/order/);
});
