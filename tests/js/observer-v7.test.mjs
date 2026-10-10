import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {prepareSegment,BtzView,snapshot,SegmentPlayer,timeNumber} from '../../apps/btz-observer/model.mjs';
import {loadEntry,readBytes,validateIndex} from '../../apps/btz-observer/transport.mjs';
import {PublicationSequence,sha256Web} from '../../packages/client/verification.mjs';
import {decodeCanonical,encodeCanonical} from '../../packages/runtime/canonical.mjs';
import {unhex} from '../../packages/protocol/bytes.mjs';
import {projectAnimation} from '../../packages/kernels/btz/animation.mjs';
import {publication} from '../../packages/observation/publication.mjs';
import {coordinatorScenario} from '../scenarios/coordinator.mjs';
const root=new URL('../../apps/btz-observer/',import.meta.url);
const index=validateIndex(JSON.parse(await fs.readFile(new URL('recordings/index.json',root),'utf8')));
const fetcher=async path=>{const b=await fs.readFile(new URL(path,root));return new Response(b);};
for(const r of index.recordings)test(`observer ${r.id}: every recorded segment verifies, chains and reconstructs`,async()=>{
  const seq=new PublicationSequence();let prior=await loadEntry(r,0,undefined,fetcher);seq.accept(prior.ticket);
  for(let n=1;n<r.roots.length;n++){
    const next=await loadEntry(r,n,undefined,fetcher),s=await prepareSegment(prior.state,next.state,next.render,next.ticket.publication);
    seq.accept(next.ticket);const p=new SegmentPlayer(s);
    for(let t=s.start;t<s.end;t+=.125)p.advance(t);
    p.advance(s.end).matches(snapshot(next.state));prior=next;
    assert.throws(()=>p.advance(s.start),/bounds/);
  }
  assert.equal(Number(prior.ticket.publication.head.logical_end),r.logical_end);
});
const goldens=JSON.parse(await fs.readFile(new URL('../fixtures/btz-v3-golden.json',import.meta.url),'utf8')).cases;
for(const g of goldens)test(`observer ${g.name}: visible world agrees with full audit at every event boundary`,()=>{
  const initial=unhex(g.initial_hex),audit=decodeCanonical(unhex(g.outputs.events.hex));
  const p=decodeCanonical(projectAnimation(initial,unhex(g.outputs.events.hex)).bytes);
  const full=new BtzView(snapshot(initial)),compact=new BtzView(snapshot(initial)),bySequence=new Map(p.events.map(e=>[e.sequence,e]));
  for(const e of audit.events){
    full.apply(e.kind==='motion'?{kind:'trajectory',ball:e.ball_state,time:e.time}:e);
    if(bySequence.has(e.sequence))compact.apply(bySequence.get(e.sequence));
    assert.deepEqual(compact.cells,full.cells);assert.deepEqual(compact.cannons,full.cannons);assert.deepEqual(compact.balls,full.balls);
  }
  compact.matches(snapshot(unhex(g.outputs.state.hex)));
});
const r=index.recordings[0],a=await loadEntry(r,0,undefined,fetcher),b=await loadEntry(r,1,undefined,fetcher);
for(const [label,change] of [
  ['predecessor',p=>{p.initial_state_hash='00'.repeat(32);} ],
  ['audit binding',p=>{p.source_events_hash='00'.repeat(32);} ],
  ['version',p=>{p.version=2;} ],
  ['out-of-range event',p=>{p.events[0].time=[100n,1n];} ],
  ['unknown event',p=>{p.events[0].kind='future_unknown';} ],
  ['descending sequence',p=>{p.events[1].sequence=p.events[0].sequence;} ],
  ['missing topology',p=>{p.events=p.events.filter(e=>e.kind!=='capture');} ],
])test(`observer rejects ${label} before admitting playback`,async()=>{
  const p=decodeCanonical(b.render);change(p);const bytes=encodeCanonical(p),pub=structuredClone(b.ticket.publication);
  // Locally recommit the malformed projector result to exercise semantics, not only byte hashes.
  pub.artifacts.find(a=>a.kind==='render').sha256=await sha256Web(bytes);
  await assert.rejects(prepareSegment(a.state,b.state,bytes,pub));
});
test('snapshot rejects non-finite visual time',()=>{const w=decodeCanonical(a.state);w.time=[10n**400n,1n];assert.throws(()=>snapshot(encodeCanonical(w)),/time/);});
test('snapshot rejects unknown territory owner',()=>{const w=decodeCanonical(a.state);w.cells[0]=65535;assert.throws(()=>snapshot(encodeCanonical(w)),/owner/);});
test('unknown event fails closed',()=>{const v=new BtzView(snapshot(a.state));assert.throws(()=>v.apply({kind:'mystery',time:[0n,1n]}),/unsupported/);});
test('altered final state is rejected by its hash',async()=>{const w=decodeCanonical(b.state);w.received_e8s++;await assert.rejects(prepareSegment(a.state,encodeCanonical(w),b.render,b.ticket.publication),/hash/);});
test('reader rejects declared oversize before reading',async()=>{await assert.rejects(readBytes('x',3,undefined,async()=>new Response('four',{headers:{'content-length':'4'}})),/limit/);});
test('reader bounds chunked bodies without a length header',async()=>{await assert.rejects(readBytes('x',3,undefined,async()=>new Response('four')),/limit/);});
test('reader rejects network error without returning partial bytes',async()=>{await assert.rejects(readBytes('x',100,undefined,async()=>new Response('error',{status:503})),/503/);});
test('reader applies no-credentials, no-cache and no-redirect policy',async()=>{let opts;const out=await readBytes('x',10,undefined,async(_,o)=>{opts=o;return new Response('ok');});assert.equal(opts.credentials,'omit');assert.equal(opts.redirect,'error');assert.equal(opts.cache,'no-store');assert.equal(new TextDecoder().decode(out),'ok');});
test('entry rejects corrupted state chunk',async()=>{await assert.rejects(loadEntry(r,1,undefined,async path=>{const b=new Uint8Array(await(await fetcher(path)).arrayBuffer());if(path.endsWith('state-0.bin'))b[0]^=1;return new Response(b);}),/integrity/);});
test('entry rejects catalog with wrong root',async()=>{await assert.rejects(loadEntry({...r,roots:['00'.repeat(32)]},0,undefined,fetcher),/root/);});
for(const [name,change] of [
 ['path traversal',x=>{x.recordings[0].id='../outside';}],['duplicate name',x=>{x.recordings.push(x.recordings[0]);}],
 ['unbounded recording',x=>{x.recordings[0].segments=500;}],['false certification',x=>{x.trust='ic-certified';}],
 ['bad root',x=>{x.recordings[0].roots[0]='bad';}],['invalid speed',x=>{x.recordings[0].tick_seconds=0;}],
])test(`index rejects ${name}`,()=>{const x=structuredClone(index);change(x);assert.throws(()=>validateIndex(x));});

test('render artifact cannot be substituted even with plausible semantics',async()=>{const x=decodeCanonical(b.render);x.receipts=[];x.extra=1;await assert.rejects(prepareSegment(a.state,b.state,encodeCanonical(x),b.ticket.publication),/artifact hash/);});
