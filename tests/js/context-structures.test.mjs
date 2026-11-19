import test from 'node:test';
import assert from 'node:assert/strict';
import {Camera} from '../../apps/b2z-observer/camera.mjs';
import {displayHeading} from '../../apps/b2z-observer/headings.mjs';
import {prepareQuoteV6} from '../../apps/b2z-observer/action-quote-v6.mjs';
import {contextSites,firstContextDestination} from '../../apps/b2z-observer/context-sites.mjs';
import {contextSiteReason,friendlyStructureNearby,prepareContextDeflector} from '../../packages/kernels/b2z/context-structures.mjs';
import {CONTEXT_CONFIG,CONTEXT_IDENTITY,DEFLECTOR_CONFIG,setOwner,validateWorld,wrapCell,encodeWorld} from '../../packages/kernels/b2z/world.mjs';
import {parseContextText,encodeContextMemo,readContextPayment,encodeContextPayment,decodeContextLedgerMemo,SCREEN_ORIENTATIONS} from '../../packages/protocol/context-structures.mjs';
import {parseDeflectorText,readDeflectorPayment} from '../../packages/protocol/deflector.mjs';
import {DEFLECTOR_HEADINGS} from '../../packages/protocol/deflector-orientation.generated.mjs';
import {heading} from '../../packages/kernels/b2z/math.mjs';
import {preparePurchase} from '../../packages/kernels/b2z/purchases-v6.mjs';
import {B2zCursor} from '../../packages/kernels/b2z/kernel.mjs';
import {decodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {unpackDeflectorAudit} from '../../packages/kernels/b2z/deflector-events.mjs';
import {enemyWorld,successorWorld,capacityWorld} from '../scenarios/boundary-deflector.mjs';
import {ACCOUNT,contextualWorld,orderedWorld} from '../scenarios/context-structures.mjs';

const bytes=text=>new TextEncoder().encode(text),memo=text=>encodeContextMemo(parseContextText(bytes(text)).command);
test('screen facing directions use the actual isometric camera and unchanged stored headings',()=>{
 const camera=new Camera();camera.configure(1000,1000,1440,900,true);
 const origin=camera.screen(0,0),directions={N:[0,-1],E:[1,0],S:[0,1],W:[-1,0]};
 for(const [name,orientation] of Object.entries(SCREEN_ORIENTATIONS)){
  const code=DEFLECTOR_HEADINGS[orientation],velocity=heading(code,32000),p=camera.screen(...velocity.map(v=>v/32000));
  const [dx,dy]=[p.x-origin.x,p.y-origin.y].map(v=>Math.abs(v)<1e-8?0:Math.sign(v));
  assert.deepEqual([dx,dy],directions[name]);
  assert.equal(displayHeading(code*360/65536),String(['N','E','S','W'].indexOf(name)*90));
  for(const action of [`DROT 4294967295 ${name}`,`DEFLECT 998007 ${name}`]){
   const parsed=parseContextText(bytes(action));assert.equal(parsed.command.orientation,orientation);
   assert.throws(()=>parseDeflectorText(bytes(action)));
   const raw=encodeContextPayment(ACCOUNT,10000n,parsed.command);
   assert.deepEqual(readContextPayment(raw).memo,memo(action));
   assert.throws(()=>readDeflectorPayment(raw));
  }
 }
 for(const action of ['DROT 1 N\n','DROT 0 N','DROT 01 N','DROT 1 N|cry','DEFLECT 1 NE','DEFLECT 1 N ','DMOVE 1 1000000','DMOVE 4294967296 0'])
  assert.throws(()=>parseContextText(bytes(action)));
 assert.throws(()=>decodeContextLedgerMemo(0n,memo('DROT 1 N')));
 assert.equal(parseDeflectorText(bytes('DEFLECT 1 NW')).command.orientation,'NW');
});

test('friendly distances zero through four, diagonals and both toroidal seams',()=>{
 const world=successorWorld();world.cannons[0].cell=0;
 for(const [x,y] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]){
  for(let d=0;d<=4;d++){
   const cell=wrapCell(x*d,y*d,1000,1000);
   assert.equal(friendlyStructureNearby(world,cell,1),d>=1&&d<=3);
   assert.equal(friendlyStructureNearby(world,cell,1,{kind:'cannon',id:1}),false);
   assert.equal(friendlyStructureNearby(world,cell,2),false);
  }
 }
 world.deflectors.push({id:1,owner:1,cell:999999,orientation:'NE'});
 world.next_deflector_id=2;
 assert.equal(friendlyStructureNearby(world,999998,1,{kind:'cannon',id:1}),true);
 assert.equal(friendlyStructureNearby(world,998996,1,{kind:'deflector',id:1}),false);
 assert.equal(contextSiteReason(world,1,0),'SITE_OCCUPIED');
 assert.equal(contextSiteReason(world,1,999998,{deflector:true}),'DEFLECTOR_TOO_CLOSE');
});

test('new owned construction and moves preserve historical policy and canonical quotes',()=>{
 const w=contextualWorld();
 assert.equal(preparePurchase(w,ACCOUNT,10000n,memo('MOVE 1 4005'),[],true).reason,'NO_FRIENDLY_STRUCTURE_NEARBY');
 assert.equal(preparePurchase(w,ACCOUNT,10000n,memo('MOVE 1 4005')).kind,'move');
 assert.equal(preparePurchase(w,ACCOUNT,400000000n,memo('NEW 0 1 5004')).kind,'new');
 assert.equal(preparePurchase(w,ACCOUNT,400000000n,memo('NEW 0 1 5004'),[],true).reason,'NOT_OWN_TERRITORY');
 assert.equal(preparePurchase(w,ACCOUNT,400000000n,memo('NEW 0 1 4007'),[],true).kind,'new');
 assert.equal(prepareQuoteV6(w,CONTEXT_CONFIG,ACCOUNT,{kind:'new',angle:'0',cell:4007}).memo,'NEW 0 1 4007');
 assert.equal(prepareQuoteV6(w,CONTEXT_CONFIG,ACCOUNT,{kind:'deflect',angle:'225',cell:4007}).memo,'DEFLECT 4007 N');
 assert.equal(prepareQuoteV6(w,DEFLECTOR_CONFIG,ACCOUNT,{kind:'deflect',angle:'225',cell:4007}).memo,'DEFLECT 4007 NW');
 assert.equal(preparePurchase(w,'12'.repeat(32),100000000n,memo('NEW 0 1'),[],true).first,true);
 assert.equal(prepareContextDeflector(w,ACCOUNT,10000n,memo('DROT 1 N')).reason,'NO_DEFLECTOR');
});

test('enemy clearance, active islands and closed live-ball occupancy remain distinct',()=>{
 const w=enemyWorld(1);w.cannons[0].cell=999998;
 assert.equal(contextSiteReason(w,1,999998),'SITE_OCCUPIED');
 assert.equal(contextSiteReason(w,1,999999),'ENEMY_TERRITORY_TOO_CLOSE');
 assert.equal(contextSiteReason(w,1,999997),null);
 assert.equal(contextSiteReason(w,2,1),'NO_ACTIVE_ISLAND');
 const ball=w.balls[0];ball.cell=0;ball.x0=0n;ball.y0=0n;
 assert.equal(contextSiteReason(w,1,999999),'SITE_OCCUPIED');
 const dense=capacityWorld();assert.equal(dense.deflectors.length,256);
 assert.equal(prepareContextDeflector(dense,ACCOUNT,10000000n,memo('DEFLECT 100033 W')).reason,'DEFLECTOR_CAPACITY');
});

test('first contact uses the paid reorientation before physics and never moves the trajectory origin',()=>{
 const world=orderedWorld();
 const payload=encodeContextPayment(ACCOUNT,10000n,{kind:'deflector_reorient',id:1,orientation:'NE'});
 const cursor=new B2zCursor(encodeWorld(world),[{position:1n,payload_hex:Buffer.from(payload).toString('hex')}],{...CONTEXT_IDENTITY,logical_start:0n,logical_end:1n});
 while(!cursor.step(32).complete){}
 cursor.finalizeElapsed(1n);
 const audit=unpackDeflectorAudit(decodeCanonical(cursor.result().events),world.balls);
 const turn=audit.events.find(event=>event.deflector_contact);
 assert.equal(turn.deflector_contact.orientation,'NE');
 assert.equal(turn.deflector_contact.face,'W');
 assert.equal(turn.deflector_contact.front,false);
 assert.deepEqual([turn.ball_state.vx,turn.ball_state.vy],[-22627,22627]);
 assert.equal(audit.events[0].kind,'deflector_reoriented');
});

test('cooperative movement candidates are bounded by structures and include another friendly Deflector',async()=>{
 const w=orderedWorld(),sites=contextSites(w),moving={kind:'cannon',id:1};
 const rows=sites.candidates(ACCOUNT,moving,4004);assert(rows.length<=48);
 assert(!rows.includes(4004));assert(rows.includes(4009));
 const job=firstContextDestination(rows,cell=>!sites.reason(ACCOUNT,cell,{moving}));
 assert.notEqual(await job.promise,null);
 assert(job.stats.tested<=48);
 const stop=firstContextDestination(rows,()=>false);stop.cancel();assert.equal(await stop.promise,null);
 validateWorld(w);
});
