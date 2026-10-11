import test from 'node:test';import assert from 'node:assert/strict';
import {coordinatorScenario} from '../scenarios/coordinator.mjs';
import {publication,publishedChunk,PublicationWindow} from '@dtr/timeline-runtime/observation/publication';
import {projectAnimation} from '../../packages/kernels/btz/animation.mjs';
import {verifyPinnedPublication,verifyCertificatePublication,verifyRetainedPredecessor,ArtifactAssembler,PublicationSequence} from '@dtr/timeline-runtime/client/verification';
import {unhex} from '@dtr/timeline-runtime/protocol/bytes';import{decodeCanonical,encodeCanonical}from'@dtr/timeline-runtime/runtime/canonical';import{sha256}from'@dtr/timeline-runtime/runtime/seal';
function complete(host,end){host.seal(end);while(host.status().phase==='running')host.advance(127);host.publish(host.status().ready_hash);}
for(const name of ['life','admission','severance','near-impact','dense']){
 test(`${name}: private ingest/seal/step never invalidates committed publication`,async()=>{
  const {host,records,end}=coordinatorScenario(name),old=publication(host.publicationRecord()),window=new PublicationWindow();
  window.retain(host.publicationRecord());const reader=new ArtifactAssembler(await verifyPinnedPublication(old.bytes,old.sha256),'state');
  host.ingestPrefix(0n,records,records.length?'ab'.repeat(32):'00'.repeat(32));
  assert.equal(publication(host.publicationRecord()).sha256,old.sha256);host.seal(end);
  for(let n=0;n<3&&host.status().phase==='running';n++){
   host.advance(1);assert.equal(publication(host.publicationRecord()).sha256,old.sha256);
   assert.equal(window.retain(host.publicationRecord()),old.sha256);assert.equal(window.status().segments,1);
  }
  while(host.status().phase==='running')host.advance(127);
  host.publish(host.status().ready_hash);const current=window.retain(host.publicationRecord());assert.notEqual(current,old.sha256);
  for(let i=0;i<old.data.artifacts[0].chunks.length;i++)await reader.accept(i,window.chunk(old.sha256,'state',i));
  assert.deepEqual(await reader.finish(),old.artifacts[0]);
  assert(!Object.hasOwn(publication(host.publicationRecord()).data,'revision'));assert(!Object.hasOwn(old.data,'ingest_head'));
 });
}
test('sealing and stepping AFTER a completed segment also leave identity stable',()=>{
 const {host}=coordinatorScenario('life');complete(host,1n);const old=publication(host.publicationRecord());
 host.ingestPrefix(0n,[null],'aa'.repeat(32));host.seal(2n);host.advance(1);
 assert.equal(publication(host.publicationRecord()).sha256,old.sha256);
 assert.deepEqual(publishedChunk(host.publicationRecord(),old.sha256,'state',0),old.artifacts[0]);
});
test('two-segment retention evicts oldest only; missing history requests resync',()=>{
 const {host}=coordinatorScenario('life'),window=new PublicationWindow({maxSegments:2});
 const a=window.retain(host.publicationRecord());complete(host,1n);const b=window.retain(host.publicationRecord());complete(host,2n);const c=window.retain(host.publicationRecord());
 assert.throws(()=>window.catalog(a),/resync/);assert.deepEqual(window.status().hashes,[b,c]);assert(window.catalog(b).length>0);
});
test('byte-bound rejection is atomic and invalid retention parameters fail',()=>{
 const {host}=coordinatorScenario('life');const w=new PublicationWindow({maxBytes:1});assert.throws(()=>w.retain(host.publicationRecord()),/capacity/);assert.equal(w.status().segments,0);
 for(const x of [0,-1,1.5,33])assert.throws(()=>new PublicationWindow({maxSegments:x}),/bounds/);
});
test('retained chunks/catalogs return copies, and wrong indices/kinds fail',()=>{
 const {host}=coordinatorScenario('life'),w=new PublicationWindow(),h=w.retain(host.publicationRecord());
 const a=w.catalog(h);a[0]^=1;assert.notDeepEqual(w.catalog(h),a);const b=w.chunk(h,'state',0);b[0]^=1;assert.notDeepEqual(w.chunk(h,'state',0),b);
 for(const k of ['cursor','pending','fake'])assert.throws(()=>w.chunk(h,k,0),/bounds/);assert.throws(()=>w.chunk(h,'state',100),/bounds/);
});
test('sequences use committed chain, not operational revisions',async()=>{
 const {host}=coordinatorScenario('life'),seq=new PublicationSequence();let p=publication(host.publicationRecord()),g=await verifyPinnedPublication(p.bytes,p.sha256);seq.accept(g);
 host.seal(1n);host.advance(1);p=publication(host.publicationRecord());seq.accept(await verifyPinnedPublication(p.bytes,p.sha256));
 while(host.status().phase==='running')host.advance(127);host.publish(host.status().ready_hash);p=publication(host.publicationRecord());seq.accept(await verifyPinnedPublication(p.bytes,p.sha256));
 assert.throws(()=>seq.accept(g),/rollback/);
});
test('v6 rejects operational metadata, invalid projection shape, and missing certificate verifier',async()=>{
 const {host}=coordinatorScenario('life'),p=publication(host.publicationRecord());const bad=decodeCanonical(p.bytes);bad.revision=3;
 const b=encodeCanonical(bad);await assert.rejects(verifyPinnedPublication(b,sha256(b)),/schema/);
 await assert.rejects(verifyCertificatePublication(p.bytes,Uint8Array.of(1),{},undefined),/unavailable/);
 assert.throws(()=>publication(host.publicationRecord(),{render:{format:'x',bytes:'abc'}}),/schema/);
});
test('certified/pinned catalog binds a compact BTZ render artifact alongside unchanged audit events',async()=>{
 const {host,records,end}=coordinatorScenario('dense'),initial=unhex(host.committed().state_hex);
 host.ingestPrefix(0n,records,records.length?'ab'.repeat(32):'00'.repeat(32));complete(host,end);
 const h=host.committed(),out=projectAnimation(initial,unhex(h.event_hex)),render={format:out.format,bytes:out.bytes};
 const w=new PublicationWindow(),hash=w.retain(host.publicationRecord(),{render}),verified=await verifyPinnedPublication(w.catalog(hash),hash);
 const a=new ArtifactAssembler(verified,'render');for(let n=0;n<a.descriptor.chunks.length;n++)await a.accept(n,w.chunk(hash,'render',n));
 assert.deepEqual(await a.finish(),out.bytes);assert.equal(verified.publication.head.manifest_hash,h.manifest_hash);
 assert.equal(verified.publication.artifacts[1].sha256,sha256(unhex(h.event_hex)));
});
test('same committed segment with a conflicting authenticated render root is rejected',async()=>{
 const {host}=coordinatorScenario('life');complete(host,1n);const r=host.publicationRecord(),s=new PublicationSequence();
 const first=publication(r,{render:{format:'test-format-1',bytes:Uint8Array.of(1)}});s.accept(await verifyPinnedPublication(first.bytes,first.sha256));
 const next=publication(r,{render:{format:'test-format-1',bytes:Uint8Array.of(2)}});
 const ticket=await verifyPinnedPublication(next.bytes,next.sha256);assert.throws(()=>s.accept(ticket),/same-height/);
});
for(const defect of ['head','identity','chunks','render-count','version','ingest-metadata'])test(`v6 authenticated bytes still reject inconsistent ${defect}`,async()=>{
 const {host}=coordinatorScenario('life');complete(host,1n);const d=publication(host.publicationRecord()).data;
 if(defect==='head')d.head.logical_end=99n;if(defect==='identity')d.identity.rules_hash='ff'.repeat(32);
 if(defect==='chunks')d.artifacts[0].chunks=[];if(defect==='render-count')d.render_format='btz-animation-1';
 if(defect==='version')d.version=7;if(defect==='ingest-metadata')d.ingest_head=0n;
 const bytes=encodeCanonical(d);await assert.rejects(verifyPinnedPublication(bytes,sha256(bytes)));
});
test('a client cannot silently mix legacy and current publication contracts',async()=>{
 const {host}=coordinatorScenario('life'),seq=new PublicationSequence(),old=publication(host.store.read(),{version:5});
 seq.accept(await verifyPinnedPublication(old.bytes,old.sha256));const current=publication(host.publicationRecord());
 const ticket=await verifyPinnedPublication(current.bytes,current.sha256);assert.throws(()=>seq.accept(ticket),/version changed/);
});
test('render corruption fails integrity even with a valid catalog',async()=>{
 const {host}=coordinatorScenario('life');complete(host,1n);
 const p=publication(host.publicationRecord(),{render:{format:'test-1',bytes:Uint8Array.of(1,2,3)}});
 const ticket=await verifyPinnedPublication(p.bytes,p.sha256),a=new ArtifactAssembler(ticket,'render');
 await assert.rejects(a.accept(0,Uint8Array.of(1,2,4)),/integrity/);
});
test('retained publications authenticate backward from the certified head and admit forward in order',async()=>{
 const {host}=coordinatorScenario('life'),publications=[publication(host.publicationRecord())];
 for(let end=1n;end<=3n;end++){complete(host,end);publications.push(publication(host.publicationRecord()));}
 const head=await verifyPinnedPublication(publications[3].bytes,publications[3].sha256);
 const two=await verifyRetainedPredecessor(publications[2].bytes,head);
 const one=await verifyRetainedPredecessor(publications[1].bytes,two);
 const sequence=new PublicationSequence();sequence.accept(await verifyPinnedPublication(publications[0].bytes,publications[0].sha256));
 sequence.accept(one);sequence.accept(two);sequence.accept(head);
 const corrupt=publications[2].bytes.slice();corrupt[corrupt.length-1]^=1;
 await assert.rejects(verifyRetainedPredecessor(corrupt,head));
 await assert.rejects(verifyRetainedPredecessor(publications[1].bytes,head),/not certified predecessor/);
});
test('an optional render cannot gain authentication through a retained predecessor chain',async()=>{
 const {host}=coordinatorScenario('life');complete(host,1n);const prior=host.publicationRecord();complete(host,2n);
 const successor=publication(host.publicationRecord(),{render:{format:'test-render-1',bytes:Uint8Array.of(7)}});
 const authenticated=await verifyPinnedPublication(successor.bytes,successor.sha256);
 const altered=publication(prior,{render:{format:'test-render-1',bytes:Uint8Array.of(99)}});
 await assert.rejects(verifyRetainedPredecessor(altered.bytes,authenticated),/render.*direct/i);
});
test('retained predecessor authentication rejects altered authoritative commitments',async()=>{
 const {host}=coordinatorScenario('life');complete(host,1n);const prior=publication(host.publicationRecord());complete(host,2n);
 const successor=publication(host.publicationRecord()),authenticated=await verifyPinnedPublication(successor.bytes,successor.sha256);
 for(const kind of ['state','events','scores']){
  const altered=decodeCanonical(prior.bytes),artifact=altered.artifacts.find(a=>a.kind===kind);
  artifact.sha256='ff'.repeat(32);if(artifact.chunks.length)artifact.chunks[0]='ff'.repeat(32);
  const bytes=encodeCanonical(altered);
  await assert.rejects(verifyRetainedPredecessor(bytes,authenticated));
 }
});
test('explicit snapshot resync preserves the anti-rollback floor and rejects conflict or older heads',async()=>{
 const {host}=coordinatorScenario('life'),p=[publication(host.publicationRecord())];
 for(let end=1n;end<=3n;end++){complete(host,end);p.push(publication(host.publicationRecord()));}
 const sequence=new PublicationSequence(),genesis=await verifyPinnedPublication(p[0].bytes,p[0].sha256);
 sequence.accept(genesis);const latest=await verifyPinnedPublication(p[3].bytes,p[3].sha256);sequence.resync(latest);
 assert.throws(()=>sequence.resync(genesis),/rollback/);
 assert.throws(()=>sequence.resync(latest),/rollback/);
 const conflicting=decodeCanonical(p[3].bytes);conflicting.head.logical_end+=1n;
 const bytes=encodeCanonical(conflicting);
 await assert.rejects(verifyPinnedPublication(bytes,sha256(bytes)),/head\/seal/);
});
