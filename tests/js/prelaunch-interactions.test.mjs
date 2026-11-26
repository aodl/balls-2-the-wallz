import assert from 'node:assert/strict';
import {test} from 'node:test';
import {friendlyGuideReach,trajectoryGuide} from '../../apps/b2z-observer/guide-clearance.mjs';
import {arenaClickPair} from '../../apps/b2z-observer/interaction.mjs';
import {clockwiseReorientation} from '../../apps/b2z-observer/headings.mjs';
import {SCREEN_ORIENTATIONS} from '../../packages/protocol/context-structures.mjs';
import {Camera} from '../../apps/b2z-observer/camera.mjs';

const grid=(cells,fallback=0)=>({width:1000,height:1000,torus:true,
 owner:cell=>cells.get(cell)??fallback,playerForTerritory:id=>id===11||id===12?1:id});
const diagonal=1/Math.sqrt(2);
test('a guide stays within contiguous territory and wraps on either axis',()=>{
 const v=grid(new Map([[0,11],[1,12],[3,11],[999,12],[999000,12],[1000,12],[2000,2],[3000,12]]));
 assert.equal(friendlyGuideReach(v,1,.5,.5,1,0,20),1.5);
 assert.equal(friendlyGuideReach(v,1,.5,.5,-1,0,20),1.5);
 assert.equal(friendlyGuideReach(v,1,.5,.5,0,-1,20),1.5);
 assert.equal(friendlyGuideReach(v,1,.5,.5,0,1,20),1.5);
 assert.equal(friendlyGuideReach(v,2,.5,.5,1,0,4),0);
 assert.equal(friendlyGuideReach(v,2,.5,2.5,0,1,4),.5);
});
test('corner and boundary clearance contains the complete stroke and suppresses ambiguous exits',()=>{
 const v=grid(new Map([[0,11],[1001,12]]));
 assert.equal(friendlyGuideReach(v,1,.5,.5,diagonal,diagonal,4),.5/diagonal);
 assert.ok(friendlyGuideReach(v,1,.5,.5,diagonal,diagonal,4,.1)<.5/diagonal);
 assert.equal(friendlyGuideReach(v,1,0,.5,0,1,4,.01),0);
 const c=new Camera();c.configure(1000,1000,390,844,true);c.frameCell(0);c.scale=96;
 for(let quarter=0;quarter<4;quarter++){
  c.angle=-quarter*Math.PI/2;
  const ball={x:.5,y:.5},guide=trajectoryGuide(c,ball,{vx:1,vy:0,owner:1},[],v);
  assert.ok(guide);
  assert.ok(Math.hypot(guide.end.x-guide.start.x,guide.end.y-guide.start.y)<48);
  assert.equal(trajectoryGuide(c,ball,{vx:1,vy:0,owner:2},[],v),null);
 }
});
test('mouse navigation claims only a second click within the established time and distance',()=>{
 const first={at:50,p:{x:10,y:10}};
 assert.ok(arenaClickPair(first,{x:17,y:10},450));
 assert.equal(arenaClickPair(first,{x:10,y:10},451),false);
 assert.equal(arenaClickPair(first,{x:16,y:15},54),false);
 assert.equal(arenaClickPair(null,{x:10,y:10},100),false);
});
test('default divergence uses canonical clockwise orientation order',()=>{
 const directions=['N','E','S','W'];
 for(const [i,direction] of directions.entries())
  assert.equal(clockwiseReorientation(SCREEN_ORIENTATIONS[direction]),SCREEN_ORIENTATIONS[directions[(i+1)%4]]);
});
