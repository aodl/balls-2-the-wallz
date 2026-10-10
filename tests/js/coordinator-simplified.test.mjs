import test from 'node:test';import assert from 'node:assert/strict';
import {coordinatorScenario} from '../scenarios/coordinator.mjs';
import {TimelineCoordinator} from '../../packages/runtime/coordinator.mjs';
import {sha256} from '../../packages/runtime/seal.mjs';
for(const name of ['life','admission','dense']){
 test(`${name}: uncommitted cached-cursor forks cannot mutate authoritative work`,()=>{
  const {host,records,end}=coordinatorScenario(name);host.ingestPrefix(0n,records,records.length?'aa'.repeat(32):'00'.repeat(32));host.seal(end);
  const before=host.snapshot(),first=host.propose({kind:'step',budget:1}),second=host.propose({kind:'step',budget:7});
  assert.deepEqual(host.snapshot(),before);host.commit(second);const committed=host.snapshot();assert.throws(()=>host.commit(first),/stale/);assert.deepEqual(host.snapshot(),committed);
 });
 test(`${name}: import validates once; ordinary advances use trusted forks, not repeated restores`,()=>{
  const s=coordinatorScenario(name);let restores=0,forks=0;
  const k={...s.kernel,restore(...a){restores++;return s.kernel.restore(...a);},fork(c){forks++;return s.kernel.fork(c);}};
  const host=new TimelineCoordinator(s.host.store,k);host.ingestPrefix(0n,s.records,s.records.length?'aa'.repeat(32):'00'.repeat(32));host.seal(s.end);
  const count=restores;host.advance(1);host.advance(1);assert.equal(restores,count);assert.equal(forks,2);
  const saved=host.snapshot();TimelineCoordinator.restore(saved,sha256(saved),k);assert(restores>count);
 });
}
test('caller cannot forge or reuse proposal capabilities',()=>{
 const {host}=coordinatorScenario('life');host.seal(1n);const p=host.propose({kind:'step',budget:1});
 assert(Object.isFrozen(p));assert.throws(()=>host.commit({...p}),/unknown/);host.commit(p);assert.throws(()=>host.commit(p),/consumed/);
});
test('read/export objects are detached; public record excludes working/source details',()=>{
 const {host}=coordinatorScenario('life');host.seal(1n);const before=host.snapshot(),r=host.store.read();r.journal.stage.phase='bad';
 const pub=host.publicationRecord();assert.deepEqual(Object.keys(pub.journal).sort(),['head','identity']);assert(!Object.hasOwn(pub,'inbox'));
 pub.journal.head.state_hex='';assert.deepEqual(host.snapshot(),before);
});
