import test from 'node:test';import assert from 'node:assert/strict';
import {B2zCursor} from '../../packages/kernels/b2z/kernel.mjs';
import {TORUS_IDENTITY,PRELAUNCH_IDENTITY,encodeWorld,decodeWorld,neighbors,validateWorld,fixtureWorld} from '../../packages/kernels/b2z/world.mjs';
import {beginCapture,topologyStep}from '../../packages/kernels/b2z/topology.mjs';
import {seedPatch,beginSpawn,spawnStep}from '../../packages/kernels/b2z/spawn.mjs';
import {encodeCanonical,decodeCanonical}from '@dtr/timeline-runtime/runtime/canonical';import {sha256}from '@dtr/timeline-runtime/runtime/seal';
import{torusCases,world,ball}from '../scenarios/b2z-torus.mjs';import{stageTorusMigration}from '../../packages/kernels/b2z/migration.mjs';
import{B2zView,snapshot,prepareDerivedSegment}from '../../apps/b2z-observer/model.mjs';import{projectAnimationEvents}from '../../packages/kernels/b2z/animation-projection.mjs';
import{Camera}from '../../apps/b2z-observer/camera.mjs';
export function run(v,budgets=[512]){let c=new B2zCursor(encodeWorld(v.world),v.inputs,v.context),i=0,work=0;while(c.phase!=='done'){work+=c.step(budgets[i++%budgets.length]).used;if(i%13===0){const b=c.snapshot();c=B2zCursor.restore(b,sha256(b));}assert(i<100000);}return{raw:c.result(),work};}
for(const v of torusCases())test(`torus: ${v.name}, exact interrupted replay and presentation`,()=>{
 const a=run(v,[512]),b=run(v,[7,31,127]);assert.deepEqual(a.raw,b.raw);
 const final=decodeWorld(a.raw.state),events=decodeCanonical(a.raw.events),view=new B2zView(v.world);
 for(const e of projectAnimationEvents(v.world,a.raw.events).events)view.apply(e);assert(view.matches(final));assert(view.torus);
 if(v.name.includes('seam')&&!v.name.includes('territory')&&!v.name.includes('connected')&&!v.name.includes('severance')&&!v.name.includes('connectivity'))assert.equal(events.events.filter(e=>e.kind==='capture').length,0);
 if(v.name==='horizontal-right-seam'){assert.equal(final.balls[0].cell,321);assert.equal(final.balls[0].vx,1024);}
 if(v.name==='horizontal-left-seam')assert.equal(final.balls[0].cell,350);
 if(v.name==='vertical-down-seam')assert.equal(final.balls[0].cell,42);
 if(v.name==='vertical-up-seam')assert.equal(final.balls[0].cell,970);
 if(v.name==='simultaneous-corner-blocked-across-seam'){assert.equal(final.balls[0].vx,-724);assert.equal(final.balls[0].vy,-724);assert(events.events.some(e=>e.kind==='motion'&&e.vertex_blocked));assert.deepEqual(final.credits.map(c=>c.units),[[2046n,1n],[2n,1n]]);}
 if(v.name==='capture-preserves-alternate-seam-connectivity'){const capture=events.events.find(e=>e.kind==='capture'&&e.target===325);assert.deepEqual(capture.cells,[325]);assert(final.balls.some(b=>b.id===1));}
 if(v.name==='seam-severance-through-collision'){const capture=events.events.find(e=>e.kind==='capture'&&e.target===351);assert(capture.cells.includes(350));assert(capture.destroyed_balls.includes(2));}
 if(v.name==='simultaneous-corner'){assert.equal(final.balls[0].cell,0);assert.equal(final.balls[0].vx,724);}
 if(v.name.includes('annihilation')){assert.equal(final.balls.length,0);assert.equal(final.cannons.length,0);}
 if(v.name.includes('accepted-heading')){assert.equal(final.cannons[0].heading,6827);assert.equal(snapshot(a.raw.state).cannons[0].heading,6827);}
 if(v.name.includes('rejected-shot'))assert.equal(final.cannons[0].heading,undefined);
 assert(a.work<60000);
});
test('seam neighbors and patches contain unique underlying cells',()=>{assert.deepEqual(neighbors(0,32,32,true),[992,31,1,32]);assert.deepEqual(seedPatch(0,32,32,true),[1023,992,993,31,0,1,63,32,33]);});
test('capture floods through seams and transfers only genuinely severed territory',()=>{
 const cells=Array(1024).fill(0);for(const n of[350,351,320,321])cells[n]=1;cells[318]=cells[319]=2;
 const w=world(cells,[321,318],[ball(1,1,320,0,1),ball(2,1,350,0,1),ball(3,2,319,0,1)]);
 const j=beginCapture(w,351,2);let n=0;while(!topologyStep(w,j))assert(n++<10000);
 assert.deepEqual(j.cells,[351,350]);assert.deepEqual(j.killed,[2]);assert.equal(w.cells[320],1);validateWorld(w);
 const legacy={...w,version:3};assert.throws(()=>validateWorld({...legacy,cells:cells.map(x=>x),cannons:w.cannons,balls:w.balls}),/disconnected|outside/);
});
test('wrapped spawn excludes anchors and inclusive ball closure at the seam',()=>{
 const w=world(Array(1024).fill(1),[400],[ball(1,1,351,0,1)]),j=beginSpawn('01'.repeat(32));
 j.phase='candidate';j.candidates=[{kind:3,cell:320,other:-1,rank:'00'.repeat(32)}];spawnStep(w,j);assert.equal(j.rejection_counts.BALL,1);
 const a=beginSpawn('02'.repeat(32));a.phase='candidate';a.candidates=[{kind:3,cell:399,other:-1,rank:'00'.repeat(32)}];spawnStep(w,a);assert.equal(a.rejection_counts.ANCHOR,1);
});
test('migration preserves players, motion, payment totals, scores and source boundary; never rewrites pending MOVE',()=>{
 const account='01'.repeat(32),old=fixtureWorld({width:16,height:8,cells:Array(128).fill(1),cannons:[{id:1,cell:42,account}],balls:[{...ball(1,1,42),x0:10752n,y0:2560n}],credits:[{account,units:[37n,3n]}]});old.received_e8s=100000000n;
 const boundary={identity:{...PRELAUNCH_IDENTITY,source_id:'cd'.repeat(32)},source_cursor:39526412,ledger_cutover:39526500,account_history_complete_through:39526500,source_anchor:'ab'.repeat(32)};
 const result=stageTorusMigration(encodeWorld(old),boundary),w=decodeWorld(result.state);assert.equal(result.deployable,false);assert.equal(w.cannons[0].cell,466);assert.equal(w.balls[0].x0,old.balls[0].x0+8192n);assert.deepEqual(w.credits,old.credits);assert.equal(w.received_e8s,old.received_e8s);assert.equal(w.next_ball_id,old.next_ball_id);assert.equal(w.cannons[0].heading,undefined);
 for(const guard of[{pending_inputs:1},{staged:true},{source_pending:true},{source_in_flight:true}])assert.throws(()=>stageTorusMigration(encodeWorld(old),{...boundary,...guard}),/Drain old inputs/);
 assert.throws(()=>stageTorusMigration(encodeWorld(old),{...boundary,account_history_complete_through:39526499}),/Index history barrier/);assert.throws(()=>stageTorusMigration(encodeWorld(old),{...boundary,ledger_cutover:undefined}),/Index history barrier/);
 assert.equal(result.transition.source_cursor,39526412n);assert.equal(result.transition.new_identity.source_id,boundary.identity.source_id);
 assert.notEqual(TORUS_IDENTITY.rules_hash,PRELAUNCH_IDENTITY.rules_hash);assert.notEqual(TORUS_IDENTITY.schema_hash,PRELAUNCH_IDENTITY.schema_hash);
});
test('toroidal camera picks, repeated copies and minimap seam outlines share one world',()=>{
 const c=new Camera();c.configure(32,32,1000,600,true);c.zoom(5);c.centre(31.8,31.8);assert.equal(c.cell(...Object.values(c.screen(32.25,32.25))),0);assert.equal(c.minimapRects().length,4);assert(c.copies().length<=4);
});

test('v4 observer admits only its bound rules/schema and applies heading at the playback event',async()=>{
 const v=torusCases().find(v=>v.name==='accepted-heading-persists-through-reflection'),{raw}=run(v),initial=encodeWorld(v.world);
 const publication={version:6,render_format:null,identity:TORUS_IDENTITY,artifacts:[{kind:'events',sha256:sha256(raw.events)}],head:{state_hash:sha256(raw.state),seal:{previous_state:sha256(initial),logical_start:0n,logical_end:2n}}};
 const segment=await prepareDerivedSegment(initial,raw.state,raw.events,publication);
 const {SegmentPlayer}=await import('../../apps/b2z-observer/model.mjs');const player=new SegmentPlayer(segment);assert.equal(player.view.cannons.get(1).heading,undefined);player.advance(0);assert.equal(player.view.cannons.get(1).heading,6827);player.advance(2);assert.equal(player.view.cannons.get(1).heading,6827);
 await assert.rejects(prepareDerivedSegment(initial,raw.state,raw.events,{...publication,identity:PRELAUNCH_IDENTITY}),/torus rules\/config\/schema identity/);
 assert.throws(()=>snapshot(initial,PRELAUNCH_IDENTITY),/torus rules\/config\/schema identity/);
 const malformed=decodeCanonical(initial);malformed.cannons[0].heading=null;assert.throws(()=>snapshot(encodeCanonical(malformed)),/integer bounds/);
});
