import test from 'node:test';
import assert from 'node:assert/strict';
import {cannonReference,operationalText,idleArena} from '../../apps/b2z-observer/play-reference.mjs';
import {TEST_CONFIG} from '../../packages/kernels/b2z/world.mjs';
import {ballPrice} from '../../packages/kernels/b2z/kernel.mjs';
test('public price reference agrees with kernel occupancy pricing and capacity',()=>{
  for(const n of [1,2,3,31,32]){
    const world={cannons:[{id:7,account:'ab'.repeat(32),cell:1}],cells:[0,7,7,0],balls:Array.from({length:n},()=>({owner:7}))};
    const [row]=cannonReference(world,TEST_CONFIG);
    assert.equal(row.next_ball_e8s,n===32?null:ballPrice(n));
    assert.deepEqual(row.owned_cells,[1,2]);assert.equal(row.account,world.cannons[0].account);
    assert.equal(row.cell,1);assert.equal(row.balls,n);
    world.balls.push(...Array.from({length:64-n},()=>({owner:8})));
    assert.equal(cannonReference(world,TEST_CONFIG)[0].next_ball_e8s,null);
  }
});
test('operational reference withholds purchase encouragement while paused, unbound or unhealthy',()=>{
 const s={run:{running:true,last_error:[]},source:{binding_checked:true,last_error:[],pending_records:1,admitted_to_exclusive:9007199254740993n}};
 assert.match(operationalText(s),/9007199254740993/);
 s.run.running=false;assert.match(operationalText(s),/paused — do not make purchases/);
 s.source.binding_checked=false;assert.match(operationalText(s),/binding pending/);
 s.source.last_error=['index unavailable'];assert.match(operationalText(s),/index unavailable/);
 assert.match(operationalText(null),/unavailable — wait/);
});

test('healthy idle is distinct from pause, errors and an active authenticated world',()=>{
 const s={run:{running:true,idle:true,last_error:[]},source:{binding_checked:true,last_error:[]}};
 const empty={cannons:[],balls:[],pending:[]};
 assert.equal(idleArena(s,empty),true);assert.match(operationalText(s),/Arena idle.*60-second/);
 for(const field of ['cannons','balls','pending'])assert.equal(idleArena(s,{...empty,[field]:[{}]}),false);
 assert.equal(idleArena(s,null),false);
 s.run.running=false;assert.equal(idleArena(s,empty),false);assert.match(operationalText(s),/paused/);
 s.run.running=true;s.source.last_error=['unavailable'];assert.equal(idleArena(s,empty),false);assert.match(operationalText(s),/Service error/);
});
test('reserve protection disables encouragement and never disguises preserved pending payments',()=>{
 const s={run:{running:true,idle:false,pace:{mode:'ReserveProtection',nominal_milli:0,admission_open:false},last_error:[]},source:{binding_checked:true,last_error:[],pending_records:5}};
 assert.match(operationalText(s),/Reserve protection.*pending payments are preserved.*funding recovery remains active/);
});


test('reserve protection replaces the indefinite catch-up spinner only after verification and fresh healthy operations',async()=>{
 const {catchupIndicator}=await import('../../apps/b2z-observer/play-reference.mjs'),operational={run:{running:true,world_transition:false,pace:{mode:'ReserveProtection',admission_open:false},last_error:[]},source:{binding_checked:true,last_error:[]}},args={phase:'BUFFERING',verified:true,operationalFresh:true,operational};
 const view=catchupIndicator(args);assert.equal(view.spinner,false);assert.equal(view.kind,'reserve');assert.match(view.title,/paused to conserve/);
 for(const change of [{verified:false},{operationalFresh:false},{phase:'ERROR'},{operational:{...operational,run:{...operational.run,world_transition:true}}}])assert.notEqual(catchupIndicator({...args,...change}).kind,'reserve');
 assert.equal(catchupIndicator({phase:'PLAYING',verified:true}).visible,false);
});

test('operator pause and unverified source cannot promise funding-only resumption',async()=>{
 const {catchupIndicator}=await import('../../apps/b2z-observer/play-reference.mjs');
 const args={phase:'BUFFERING',verified:true,operationalFresh:true,operational:{run:{running:true,world_transition:false,last_error:[],pace:{mode:'ReserveProtection',admission_open:false}},source:{binding_checked:true,last_error:[]}}};
 for(const operational of [{...args.operational,run:{...args.operational.run,running:false}},{...args.operational,source:{...args.operational.source,binding_checked:false}}]){const v=catchupIndicator({...args,operational});assert.notEqual(v.kind,'reserve');assert.doesNotMatch(v.description,/resumes when funding/);}
});
