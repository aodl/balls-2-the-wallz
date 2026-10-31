/** Rust-produced fixture, independent JS execution. No IC-authenticity claim. */
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {replayHistory} from '../../tools/lib/replay_s14_history.mjs';
import {decodeCanonical,encodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {hex,unhex} from '@dtr/timeline-runtime/protocol/bytes';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
const history=()=>JSON.parse(fs.readFileSync(new URL('../fixtures/playability-host-history.json',import.meta.url),'utf8'),(_k,v)=>v&&typeof v==='object'&&Object.keys(v).join(',')==='$integer'?BigInt(v.$integer):v);
test('independent JS replays all Rust host epochs, mutual death, dormancy and elapsed expiry',()=>{
 const trace=history(),result=replayHistory(trace);assert.equal(result.status,'PASS');assert.equal(result.gameplay_segments,4);assert.equal(result.application_checkpoints,4);assert.deepEqual(result.assigned,[]);
 const checkpoint=trace.publications.at(-1);assert.equal(checkpoint.version,9);assert.equal(checkpoint.head.logical_end,4n);assert.equal(checkpoint.epoch.source_cursor,0n);
});
test('missing or altered elapsed-time facts remain replay failures',()=>{
 const trace=history(),p=trace.publications.at(-2);trace.artifact_events=trace.artifact_events.filter(a=>a.segment_id!==p.head.segment_id);assert.throws(()=>replayHistory(trace),/event artifact/);
 const changed=history(),row=changed.artifact_events.at(-2),events=decodeCanonical(unhex(row.events_hex));events.events.at(-1).observed_ns++;row.events_hex=hex(encodeCanonical(events));assert.throws(()=>replayHistory(changed),/event artifact/);
});
test('self-consistent expected event tampering does not replace independent gameplay execution',()=>{
 const trace=history(),row=trace.artifact_events.at(-2),events=decodeCanonical(unhex(row.events_hex));events.events=events.events.filter(e=>e.kind!=='annihilation_cleanup');row.events_hex=hex(encodeCanonical(events));
 const p=trace.publications.at(-2);p.artifacts.find(a=>a.kind==='events').sha256=sha256(unhex(row.events_hex));assert.throws(()=>replayHistory(trace),/authoritative replay mismatch/);
});
test('expiry omissions, incomplete histories and assignment claims stay failures',()=>{
 const trace=history(),row=trace.artifact_events.at(-1),events=decodeCanonical(unhex(row.events_hex));events.events[0].context.fences.pop();row.events_hex=hex(encodeCanonical(events));trace.publications.at(-1).artifacts.find(a=>a.kind==='events').sha256=sha256(unhex(row.events_hex));assert.throws(()=>replayHistory(trace),/incomplete lifecycle/);
 const gap=history();gap.publications.splice(2,1);assert.throws(()=>replayHistory(gap));const assigned=history();assigned.assigned=['1'];assert.throws(()=>replayHistory(assigned),/exactly-once/);const fail=history();fail.status='FAIL';assert.throws(()=>replayHistory(fail),/complete captured/);
});
