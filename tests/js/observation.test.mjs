// HISTORICAL v5 conformance. Active stable-identity coverage is observation-v6.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {decodeCanonical,encodeCanonical} from '../../packages/runtime/canonical.mjs';
import {TimelineCoordinator} from '../../packages/runtime/coordinator.mjs';
import {sha256} from '../../packages/runtime/seal.mjs';
import {hex,unhex} from '../../packages/protocol/bytes.mjs';
import {publicationV5 as publication,publishedChunkV5 as publishedChunk,describeArtifact} from '../../packages/observation/publication.mjs';
import {ArtifactAssembler,PublicationSequence,verifyPinnedPublication,verifyCertificatePublication} from '../../packages/client/verification.mjs';
import {coordinatorScenario} from '../scenarios/coordinator.mjs';
const rows=JSON.parse(fs.readFileSync(new URL('../fixtures/coordinator-v5.json',import.meta.url),'utf8')).rows;
const fixture=name=>decodeCanonical(unhex(rows.find(r=>r.name===name).actions.at(-1).image_hex));
for(const name of ['life','admission','severance','near-impact','dense']){
  test(`${name}: verified published artifacts reassemble byte-identically out of order`,async()=>{
    const r=fixture(name),p=publication(r),ticket=await verifyPinnedPublication(p.bytes,p.sha256);
    assert.equal(ticket.mode,'offline-pinned-content');
    for(const [index,kind] of ['state','events','scores'].entries()){
      const a=new ArtifactAssembler(ticket,kind),desc=p.data.artifacts[index];
      for(let i=desc.chunks.length-1;i>=0;i--){await a.accept(i,publishedChunk(r,p.sha256,kind,i));await a.accept(i,publishedChunk(r,p.sha256,kind,i));}
      assert.deepEqual(await a.finish(),p.artifacts[index]);
    }
  });
  test(`${name}: staged computation is not disclosed as committed state`,()=>{
    const row=rows.find(r=>r.name===name),before=publication(decodeCanonical(unhex(row.genesis_hex)));
    for(const action of row.actions){
      const r=decodeCanonical(unhex(action.image_hex));if(!r.journal.stage)continue;
      const p=publication(r);assert.deepEqual(p.data.artifacts,before.data.artifacts);
      assert.equal(p.data.head.segment_id,null);assert(!Object.hasOwn(p.data,'cursor_hex'));
    }
  });
}
for(const length of [0,1,16383,16384,16385,65536,1048576])
  test(`artifact descriptor boundary ${length}`,()=>{
    const bytes=new Uint8Array(length).fill(17),d=describeArtifact('state',bytes);
    assert.equal(d.chunks.length,Math.ceil(length/16384));assert.equal(d.sha256,sha256(bytes));
  });
test('oversize or unknown artifact is rejected',()=>{
  assert.throws(()=>describeArtifact('state',new Uint8Array(1048577)),/bounds/);
  assert.throws(()=>describeArtifact('cursor',new Uint8Array(1)),/bounds/);
});
test('old publication cannot mix chunks after another update',()=>{
  const r=fixture('life'),p=publication(r);r.revision++;
  assert.throws(()=>publishedChunk(r,p.sha256,'state',0),/stale/);
  assert.throws(()=>publishedChunk(r,publication(r).sha256,'cursor',0),/bounds/);
});
test('bad, incomplete, mismatched and out-of-range chunks fail closed',async()=>{
  const r=fixture('admission'),p=publication(r),ticket=await verifyPinnedPublication(p.bytes,p.sha256),a=new ArtifactAssembler(ticket,'state');
  await assert.rejects(a.finish(),/incomplete/);
  const bytes=publishedChunk(r,p.sha256,'state',0),bad=bytes.slice();bad[0]^=1;
  await assert.rejects(a.accept(0,bad),/integrity/);await assert.rejects(a.accept(1000,bytes),/shape/);
  await assert.rejects(a.accept(0,bytes.slice(1)),/shape/);
  assert.throws(()=>new ArtifactAssembler({...ticket},'state'),/verified/);
});
test('publication and chunks copy transport memory before asynchronous hashing',async()=>{
  const p=publication(fixture('life')),raw=p.bytes.slice();const waiting=verifyPinnedPublication(raw,p.sha256);raw[0]^=1;
  const ticket=await waiting,a=new ArtifactAssembler(ticket,'state'),bytes=p.artifacts[0].slice();
  const accepted=a.accept(0,bytes);bytes[0]^=1;await accepted;assert.deepEqual(await a.finish(),p.artifacts[0]);
});
for(const change of ['version','revision','head','artifact','kind','chunks','identity','extra'])
  test(`signed/pinned bytes still require schema consistency: ${change}`,async()=>{
    const p=publication(fixture('life')).data;
    if(change==='version')p.version=4;if(change==='revision')p.revision=-1;
    if(change==='head')p.head.logical_end=99n;if(change==='artifact')p.artifacts[0].length=2000000;
    if(change==='kind')p.artifacts[0].kind='cursor';if(change==='chunks')p.artifacts[0].chunks=[];
    if(change==='identity')p.identity.rules_hash='ff'.repeat(32);if(change==='extra')p.unsafe=true;
    const bytes=encodeCanonical(p);await assert.rejects(verifyPinnedPublication(bytes,sha256(bytes)));
  });
const policy={canister_id:'synthetic-canister',network:'test-fixture',now_ns:10000n,max_age_ns:100n,max_future_ns:10n};
for(const defect of ['missing','empty','root','canister','network','old','future'])
  test(`certificate adapter refuses ${defect}; stub is NOT a signature test`,async()=>{
    const p=publication(fixture('life'));
    const result={canister_id:policy.canister_id,network:policy.network,certificate_time_ns:10000n,certified_data_hex:p.sha256};
    if(defect==='root')result.certified_data_hex='00'.repeat(32);if(defect==='canister')result.canister_id='other';if(defect==='network')result.network='mainnet';
    if(defect==='old')result.certificate_time_ns=9899n;if(defect==='future')result.certificate_time_ns=10011n;
    await assert.rejects(verifyCertificatePublication(p.bytes,defect==='empty'?new Uint8Array():Uint8Array.of(1),policy,defect==='missing'?undefined:async()=>result));
  });
test('certificate verification dependency receives copied certificate and pinned deployment',async()=>{
  const p=publication(fixture('life')),cert=Uint8Array.of(1);
  const ticket=await verifyCertificatePublication(p.bytes,cert,policy,async(bytes,deployment)=>{
    assert.deepEqual(deployment,{canister_id:policy.canister_id,network:policy.network});assert.notEqual(bytes,cert);
    return {...deployment,certificate_time_ns:10000n,certified_data_hex:p.sha256};
  });
  assert.equal(ticket.mode,'certificate-verifier');assert(Object.isFrozen(ticket.publication.artifacts[0]));
});
test('sequence tracks same-height status and refuses rollback',async()=>{
  const row=rows.find(r=>r.name==='life'),track=new PublicationSequence();
  const pubs=[];for(const a of [row.genesis_hex,...row.actions.map(a=>a.image_hex)]){const p=publication(decodeCanonical(unhex(a)));pubs.push(await verifyPinnedPublication(p.bytes,p.sha256));}
  for(const p of pubs)track.accept(p);assert.throws(()=>track.accept(pubs[0]),/rollback/);
});
test('sequence refuses a future snapshot gap rather than playing through missing history',async()=>{
  const {host,kernel}=coordinatorScenario('life'),tracker=new PublicationSequence();
  let p=publication(host.store.read());tracker.accept(await verifyPinnedPublication(p.bytes,p.sha256));
  for(let i=1;i<=2;i++){
    host.seal(BigInt(i));while(host.status().phase==='running')host.advance(127);host.publish(host.status().ready_hash);
  }
  p=publication(host.store.read());const next=await verifyPinnedPublication(p.bytes,p.sha256);
  assert.throws(()=>tracker.accept(next),/resync/);
});
test('a different root at the same operational revision is rejected',async()=>{
  const r=fixture('life'),a=publication(r),tracker=new PublicationSequence();
  tracker.accept(await verifyPinnedPublication(a.bytes,a.sha256));r.inbox.cursor++;
  const b=publication(r),ticket=await verifyPinnedPublication(b.bytes,b.sha256);
  assert.throws(()=>tracker.accept(ticket),/same-revision/);
});
test('Node Buffer inputs also copy rather than sharing Buffer.slice views across awaits',async()=>{
  const p=publication(fixture('life')),raw=Buffer.from(p.bytes),waiting=verifyPinnedPublication(raw,p.sha256);raw[0]^=1;
  const ticket=await waiting,a=new ArtifactAssembler(ticket,'state'),bytes=Buffer.from(p.artifacts[0]);
  const accepted=a.accept(0,bytes);bytes[0]^=1;await accepted;assert.deepEqual(await a.finish(),p.artifacts[0]);
});
