/** Actual pinned DTR chain/replay; content fixtures, not a fresh IC claim. */
import test from 'node:test';import assert from 'node:assert/strict';
import {publication} from '@dtr/timeline-runtime/observation/publication';
import {verifyPinnedPublication,PublicationSequence} from '@dtr/timeline-runtime/client/verification';
import {PlayoutClock} from '@dtr/timeline-runtime/client/playout';
import {coordinatorScenario} from '../scenarios/coordinator.mjs';
import {displayedBalls} from '../../apps/b2z-observer/ball-presentation.mjs';
import {SegmentPlayer} from '../../apps/b2z-observer/model.mjs';
import {startupPlayback} from '../../apps/b2z-observer/startup-playback.mjs';
import {resumeVerifiedClock} from '../../apps/b2z-observer/warm-return.mjs';
import {guideClearance} from '../../apps/b2z-observer/guide-clearance.mjs';
import {aimingVicinity} from '../../apps/b2z-observer/interaction.mjs';
import {Camera} from '../../apps/b2z-observer/camera.mjs';
async function fixture(){
 const {host}=coordinatorScenario('dense');const finish=end=>{host.seal(end);while(host.status().phase==='running')host.advance(512);host.publish(host.status().ready_hash);};
 finish(1n);const previous=publication(host.publicationRecord());finish(2n);const head=publication(host.publicationRecord()),ticket=await verifyPinnedPublication(head.bytes,head.sha256);let requests=0;
 return{ticket,head,previous,artifacts:Promise.resolve({state:head.artifacts[0],events:head.artifacts[1]}),client:{async publication(n){requests++;assert.equal(n,0);return previous.bytes;},async chunk(n,root,kind,i){requests++;assert.equal(root,previous.sha256);return previous.artifacts[kind].slice(i*16384,(i+1)*16384);}},requests:()=>requests};
}
test('cold H plays the completed authenticated interval without H+1 and keeps authority H',async()=>{
 const f=await fixture(),{segment,diagnostic}=await startupPlayback(f.ticket,f.artifacts,f.client);assert.ok(segment);assert.equal(diagnostic.outcome,'interval');
 const sequence=new PublicationSequence();sequence.accept(f.ticket);const clock=new PlayoutClock({start:segment.start,target:9,low:1}),player=new SegmentPlayer(segment);clock.append(segment.start,segment.end);resumeVerifiedClock({clock,queue:[{segment}]});
 const points=t=>displayedBalls(player.advance(t),t).map(b=>[b.id,b.x,b.y]);
 const before=points(segment.start),at=clock.sample(.4).playhead;assert.ok(at>segment.start&&at<segment.end);assert.notDeepEqual(points(at),before);assert.equal(sequence.last,f.ticket);for(let i=0;i<100;i++)clock.sample(1);assert.equal(clock.playhead,segment.end);assert.equal(f.requests(),diagnostic.requests);
});
test('pruned predecessor falls back without an unauthenticated segment',async()=>{const f=await fixture();f.client.publication=async()=>{throw Error('publication unavailable: snapshot resync required');};const r=await startupPlayback(f.ticket,f.artifacts,f.client);assert.equal(r.segment,null);assert.equal(r.diagnostic.outcome,'unavailable');});
test('late history cannot rewind the committed snapshot or continue downloading chunks',async()=>{const f=await fixture();let release,chunks=0;f.client.publication=()=>new Promise(r=>release=r);f.client.chunk=async()=>{chunks++;throw Error('late chunk');};const r=await startupPlayback(f.ticket,f.artifacts,f.client,{budget:5});assert.equal(r.segment,null);assert.equal(r.diagnostic.outcome,'deadline');release(f.previous.bytes);await new Promise(r=>setImmediate(r));assert.equal(chunks,0);});
test('bad predecessor/state rejects optional motion and preserves an explicit integrity failure alongside snapshot fallback',async()=>{const f=await fixture();const bad=f.previous.bytes.slice();bad[20]^=1;for(const client of[{...f.client,publication:async()=>bad},{...f.client,chunk:async()=>Uint8Array.of(0)}]){const r=await startupPlayback(f.ticket,f.artifacts,client);assert.equal(r.segment,null);assert.equal(r.diagnostic.outcome,'invalid');assert.ok(r.failure);}});
test('genesis and zero-time checkpoints do not query historical motion',async()=>{let calls=0;const client={publication(){calls++;}};for(const head of[{seal:null,segment_id:null},{seal:{logical_start:2n,logical_end:2n},segment_id:2n}])assert.equal((await startupPlayback({publication:{head}},null,client)).segment,null);assert.equal(calls,0);});
test('guide clipping is directional and only affects actual UI collisions',()=>{const r={left:80,right:120,top:0,bottom:40,width:40,height:40},o={x:100,y:120};assert.ok(guideClearance(o,{x:100,y:10},[r])<1);assert.equal(guideClearance(o,{x:200,y:120},[r]),1);assert.equal(guideClearance(o,{x:100,y:230},[r]),1);});
test('aim vicinity is bounded screen space and never active for Move/inspection',()=>{const c=new Camera();c.configure(1000,1000,390,844,true);c.scale=64;c.centre(500.5,500.5);const aim={cannon:{cell:500500}},p=c.cellPoint(500500);assert.ok(aimingVicinity(c,aim,{x:p.sx+35,y:p.sy},'touch'));assert.equal(aimingVicinity(c,aim,{x:p.sx+100,y:p.sy}),false);assert.equal(aimingVicinity(c,null,{x:p.sx,y:p.sy}),false);});

test('an eligible different Build tile wins over the surrounding aim halo',()=>{const c=new Camera();c.configure(1000,1000,390,844,true);c.scale=64;c.centre(500.5,500.5);const aim={cannon:{cell:500500}},at=c.cellPoint(501501),point={x:at.sx,y:at.sy};assert.ok(aimingVicinity(c,aim,point,'touch'));assert.equal(aimingVicinity(c,aim,point,'touch',{kind:'new',cell:500500,cells:[501501]}),false);});
