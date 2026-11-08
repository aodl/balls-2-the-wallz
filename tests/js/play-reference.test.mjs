import test from 'node:test';
import assert from 'node:assert/strict';
import {cannonReference,idleArena} from '../../apps/b2z-observer/play-reference.mjs';
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
// UX-06 supersedes duplicated operationalText/catchupIndicator copy resolvers.
// The complete producer/delivery/presentation precedence is in ux-experience.test.
test('healthy idle requires an authenticated empty or fully dormant world',()=>{
 const s={run:{running:true,idle:true,last_error:[]},source:{binding_checked:true,last_error:[]}},empty={cannons:[],balls:[],pending:[]};
 assert.equal(idleArena(s,empty),true);for(const field of ['cannons','balls','pending'])assert.equal(idleArena(s,{...empty,[field]:[{}]}),false);
 assert.equal(idleArena(s,null),false);s.run.running=false;assert.equal(idleArena(s,empty),false);s.run.running=true;s.source.last_error=['unavailable'];assert.equal(idleArena(s,empty),false);
});
