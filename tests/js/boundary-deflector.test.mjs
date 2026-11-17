import{unpackDeflectorAudit}from'../../packages/kernels/b2z/deflector-events.mjs';
import test from'node:test';import assert from'node:assert/strict';
import{B2zCursor}from'../../packages/kernels/b2z/kernel.mjs';
import{DEFLECTOR_IDENTITY,COMBINED_IDENTITY,encodeWorld,decodeWorld,position,validateWorld}from'../../packages/kernels/b2z/world.mjs';
import{decodeCanonical,encodeCanonical}from'@dtr/timeline-runtime/runtime/canonical';
import{sha256}from'@dtr/timeline-runtime/runtime/seal';
import{encodeDeflectorPayment,encodeDeflectorMemo,decodeDeflectorMemo,parseDeflectorText,readDeflectorPayment}from'../../packages/protocol/deflector.mjs';
import{parseWarCryMemo,readAnnotatedPayment}from'../../packages/protocol/war-cry.mjs';
import{decodeV6Memo}from'../../packages/protocol/memo-v6.mjs';
import{faceVelocity,canonicalTrajectory,contactResponse}from'../../packages/kernels/b2z/deflector-boundary.mjs';
import{prepareDeflectorPurchase,deflectorAt}from'../../packages/kernels/b2z/deflectors-v12.mjs';
import{ACCOUNT,successorWorld,predecessorWorld,enemyWorld,capacityWorld}from'../scenarios/boundary-deflector.mjs';
const bytes=s=>new TextEncoder().encode(s),hex=b=>Buffer.from(b).toString('hex');
export function run(w,commands,budget=1000000,recover=false){
 const seal={...DEFLECTOR_IDENTITY,logical_start:0n,logical_end:1n},inputs=commands.map((c,i)=>({position:BigInt(i),payload_hex:hex(encodeDeflectorPayment(c.account??ACCOUNT,c.amount??10000000n,c.command,c.cry??''))}));
 let c=new B2zCursor(encodeWorld(w),inputs,seal),steps=0;
 while(!c.step(budget).complete){assert(++steps<100000);if(recover){const b=c.snapshot();c=B2zCursor.restore(b,sha256(b));}}
 c.finalizeElapsed(1n);return c.result();
}
test('front/rear direction depends only on orientation and genuine face',()=>{
 const expected={NE:{N:[22627,-22627],E:[22627,-22627],S:[-22627,22627],W:[-22627,22627]},SE:{N:[-22627,-22627],E:[22627,22627],S:[22627,22627],W:[-22627,-22627]},SW:{N:[22627,-22627],E:[22627,-22627],S:[-22627,22627],W:[-22627,22627]},NW:{N:[-22627,-22627],E:[22627,22627],S:[22627,22627],W:[-22627,-22627]}};
 for(const[o,faces]of Object.entries(expected))for(const[f,v]of Object.entries(faces)){const r=faceVelocity(o,f);assert.deepEqual([r.vx,r.vy],v);}
 assert.throws(()=>faceVelocity('NE','corner'));
});
test('adapter7 canonical command is byte-safe and rejected by all historical codecs',()=>{
 const c={kind:'deflect',cell:998007,orientation:'NE'},memo=bytes('DEFLECT 998007 NE'),binary=encodeDeflectorMemo(c);
 assert.deepEqual(parseDeflectorText(memo),{command:c,cry:''});assert.deepEqual(decodeDeflectorMemo(binary),c);assert(memo.length<=32);
 assert.throws(()=>decodeV6Memo(binary));assert.throws(()=>parseWarCryMemo(memo));
 for(const s of ['DEFLECT 099 NE','deflect 1 NE','DEFLECT 1 45','DEFLECT 1 NE|hello','DEFLECT 1000000 SW','DEFLECT 1 NE ',' DEFLECT 1 NE','DEFLECT 1 NÉ'])assert.throws(()=>parseDeflectorText(bytes(s)));
 const p=encodeDeflectorPayment(ACCOUNT,10000000n,c);assert.equal(readDeflectorPayment(p).amount,10000000n);assert.throws(()=>readAnnotatedPayment(p));assert.throws(()=>encodeDeflectorPayment(ACCOUNT,10000000n,c,'no'));
});
test('two real cursor purchases create separate structures, exact motion and durable recovery',()=>{
 const commands=[1002,3000].map(cell=>({command:{kind:'deflect',cell,orientation:'NE'}}));
 const direct=run(successorWorld(),commands),recovered=run(successorWorld(),commands,1,true);assert.deepEqual(recovered,direct);
 const w=decodeWorld(direct.state),e=unpackDeflectorAudit(decodeCanonical(direct.events),successorWorld().balls);assert.equal(w.deflectors.length,2);assert.equal(w.cannons.length,1);assert.equal(w.balls.length,1);assert.equal(w.received_e8s,20000000n);
 assert(e.receipts.every(r=>r.amount_used===10000000n&&r.reason==='ACCEPTED'));assert.equal(e.events.filter(e=>e.kind==='deflector_built').length,2);assert(!e.events.some(e=>e.launch_annotation));
 const contacts=e.events.filter(e=>e.deflector_contact);assert(contacts.length>=2&&contacts.length<100);assert.equal(contacts[0].deflector_contact.kind,'deflector_redirect');assert(contacts.every(e=>e.deflector_contact.kind==='deflector_redirect'));
 let prior=successorWorld().balls[0];for(const motion of e.events.filter(e=>e.kind==='motion')){const a=position(prior,motion.time),b=position(motion.ball_state,motion.time);if(motion.deflector_contact)assert.deepEqual(a,b);else for(let i=0;i<2;i++){const n=a[i][0]*b[i][1]-b[i][0]*a[i][1],d=a[i][1]*b[i][1];assert.equal(n%(1024000n*d),0n,'exact toroidal continuity');}prior=motion.ball_state;}
});
test('processing-time placement respects ownership, occupancy and paid rejection semantics',()=>{
 const w=successorWorld(),memo=encodeDeflectorMemo({kind:'deflect',cell:1002,orientation:'NW'});
 assert.equal(prepareDeflectorPurchase(w,ACCOUNT,9999999n,memo).reason,'UNDERFUNDED');assert.equal(prepareDeflectorPurchase(w,'02'.repeat(32),10000000n,memo).reason,'NOT_OWN_TERRITORY');
 const r=run(w,[{amount:9999999n,command:{kind:'deflect',cell:1002,orientation:'NE'}}]),state=decodeWorld(r.state),receipt=unpackDeflectorAudit(decodeCanonical(r.events),successorWorld().balls).receipts[0];assert.equal(state.deflectors.length,0);assert.equal(state.received_e8s,9999999n);assert.equal(receipt.amount_used,0n);
 assert.equal(prepareDeflectorPurchase(w,ACCOUNT,10000000n,encodeDeflectorMemo({kind:'deflect',cell:4004,orientation:'NE'})).reason,'SITE_OCCUPIED');
 assert.throws(()=>new B2zCursor(encodeWorld(w),[],{...COMBINED_IDENTITY,logical_start:0n,logical_end:1n}));
});
test('bounded canonical numerator/denominator and historical worlds reject extensions',()=>{
 assert.throws(()=>canonicalTrajectory(1n,0n,65537n,22627,22627));assert.throws(()=>canonicalTrajectory(1n<<100n,0n,1n,22627,22627));
 const w=successorWorld();w.balls[0].den=0n;assert.throws(()=>validateWorld(w));const old=predecessorWorld();old.balls[0].den=1n;assert.throws(()=>validateWorld(old));
});
test('all ordinary faces and incoming angles use the same orientation-defined outgoing vector',()=>{
 const poses={W:{cell:1002,heading:0},N:{cell:2001,heading:16384},E:{cell:1000,heading:32768},S:{cell:1,heading:49152}};
 for(const orientation of ['NE','SE','SW','NW'])for(const[face,p]of Object.entries(poses))for(const delta of[-4096,0,4096]){
  const w=successorWorld((p.heading+delta+65536)%65536),result=run(w,[{command:{kind:'deflect',cell:p.cell,orientation}}]);
  const events=unpackDeflectorAudit(decodeCanonical(result.events),successorWorld().balls).events,impact=events.find(e=>e.deflector_contact);assert(impact,`${orientation}/${face}/${delta}`);assert.equal(impact.deflector_contact.face,face);
  const v=faceVelocity(orientation,face);assert.deepEqual([impact.ball_state.vx,impact.ball_state.vy],[v.vx,v.vy]);assert.deepEqual(position(w.balls[0],impact.time),position(impact.ball_state,impact.time));
  const next=events.find(e=>e.kind==='motion'&&e.sequence>impact.sequence);if(next)assert(next.time[0]*impact.time[1]>impact.time[0]*next.time[1]);
 }
});
test('exact blocked vertex retains cannon response with no invented front/rear face',()=>{
 const r=run(successorWorld(8192),[{command:{kind:'deflect',cell:2002,orientation:'NE'}}]),e=unpackDeflectorAudit(decodeCanonical(r.events),successorWorld().balls).events.find(e=>e.kind==='motion');
 assert(e.vertex_blocked);assert.equal(e.deflector_contact,undefined);assert.equal(e.ball_state.cell,1001);assert.deepEqual([e.ball_state.vx,e.ball_state.vy],[-22627,-22627]);
});
test('a Deflector at the opposite toroidal seam preserves exact contact and source cell',()=>{
 const w=successorWorld(32768,0),r=run(w,[{command:{kind:'deflect',cell:999,orientation:'NE'}}]),e=unpackDeflectorAudit(decodeCanonical(r.events),successorWorld().balls).events.find(e=>e.deflector_contact);
 assert(e);assert.equal(e.ball_state.cell,0);assert.equal(e.deflector_contact.face,'E');assert.deepEqual(position(w.balls[0],e.time),position(e.ball_state,e.time));
});
test('malformed adapter7 payment is receipted without poisoning source/cursor processing',()=>{
 const w=successorWorld(),payload=encodeDeflectorPayment(ACCOUNT,10000000n,{kind:'deflect',cell:1002,orientation:'NE'});payload[55]=1;
 assert.equal(readDeflectorPayment(payload).memo[7],1);
 const c=new B2zCursor(encodeWorld(w),[{position:0n,payload_hex:hex(payload)}],{...DEFLECTOR_IDENTITY,logical_start:0n,logical_end:1n});
 while(!c.step(1000000).complete){}c.finalizeElapsed(1n);const r=c.result(),receipt=unpackDeflectorAudit(decodeCanonical(r.events),successorWorld().balls).receipts[0];assert.equal(receipt.reason,'MALFORMED_MEMO');assert.equal(receipt.amount_used,0n);assert.equal(decodeWorld(r.state).received_e8s,10000000n);
});
test('processing-time enemy clearance covers distances, diagonals, seams and dormant territory',()=>{
 for(const candidate of[0,300300])for(const diagonal of[false,true])for(let distance=0;distance<=5;distance++){
  const x=candidate%1000,y=Math.floor(candidate/1000),enemy=((y+1000-(diagonal?distance:0))%1000)*1000+(x+1000-distance)%1000;
  const w=enemyWorld(enemy),p=prepareDeflectorPurchase(w,ACCOUNT,10000000n,encodeDeflectorMemo({kind:'deflect',cell:candidate,orientation:'SE'}));
  assert.equal(p.reason??'ACCEPTED',distance===0?'NOT_OWN_TERRITORY':distance<4?'ENEMY_TERRITORY_TOO_CLOSE':'ACCEPTED');
 }
 const w=enemyWorld(4008),result=run(w,[{command:{kind:'deflect',cell:4005,orientation:'NW'}},{command:{kind:'move_cannon',cannon:1,cell:4005}},{amount:1000000000n,command:{kind:'new',angle:0,quantity:1,cell:4005},cry:'Unsafe!'}]);
 const audit=unpackDeflectorAudit(decodeCanonical(result.events),w.balls);
 assert(audit.receipts.every(r=>r.reason==='ENEMY_TERRITORY_TOO_CLOSE'&&r.amount_used===0n&&r.remainder===r.amount));assert(!audit.events.some(e=>e.launch_annotation));assert.equal(decodeWorld(result.state).deflectors.length,0);
});
test('paid capacity and processing-order occupancy are deterministic and nonrefunding',()=>{
 const w=successorWorld();w.deflectors=Array.from({length:16},(_,i)=>({id:i+1,owner:1,cell:300300+2*i,orientation:'NE'}));w.next_deflector_id=17;validateWorld(w);
 assert.equal(prepareDeflectorPurchase(w,ACCOUNT,10000000n,encodeDeflectorMemo({kind:'deflect',cell:300340,orientation:'NE'})).reason,'PLAYER_DEFLECTOR_CAPACITY');
 assert.equal(prepareDeflectorPurchase(capacityWorld(),ACCOUNT,10000000n,encodeDeflectorMemo({kind:'deflect',cell:300031,orientation:'NE'})).reason,'DEFLECTOR_CAPACITY');
 const result=run(successorWorld(),[0,1].map(()=>({command:{kind:'deflect',cell:300300,orientation:'SW'}}))),a=decodeCanonical(result.events);
 assert.deepEqual(a.receipts.map(r=>r.reason),['ACCEPTED','SITE_OCCUPIED']);assert.equal(decodeWorld(result.state).deflectors.length,1);assert.equal(decodeWorld(result.state).received_e8s,20000000n);
});
test('successor seal allowance is bounded without weakening historical Rules11',()=>{
 assert.throws(()=>new B2zCursor(encodeWorld(successorWorld()),[],{...DEFLECTOR_IDENTITY,logical_start:0n,logical_end:2n}));
 assert.doesNotThrow(()=>new B2zCursor(encodeWorld(predecessorWorld()),[],{...COMBINED_IDENTITY,logical_start:0n,logical_end:2n}));
});

test('spacing rejects the measured adjacent trap while preserving every accepted front/rear impact',()=>{const r=run(successorWorld(),[1002,2001].map(cell=>({command:{kind:'deflect',cell,orientation:'NE'}}))),a=decodeCanonical(r.events);assert.deepEqual(a.receipts.map(r=>r.reason),['ACCEPTED','DEFLECTOR_TOO_CLOSE']);assert.equal(decodeWorld(r.state).deflectors.length,1);assert.equal(a.receipts[1].amount_used,0n);assert.equal(a.receipts[1].remainder,10000000n);});

test('spacing is toroidal and corner tangencies never invent front/rear contacts',()=>{
 for(const [a,b]of[[0,999],[0,999000],[0,999999]]){const w=successorWorld(0,500500);w.deflectors=[{id:1,owner:1,cell:a,orientation:'NE'}];w.next_deflector_id=2;validateWorld(w);assert.equal(prepareDeflectorPurchase(w,ACCOUNT,10000000n,encodeDeflectorMemo({kind:'deflect',cell:b,orientation:'SW'})).reason,'DEFLECTOR_TOO_CLOSE');}
 for(const b of[998,998000,998998]){const w=successorWorld(0,500500);w.deflectors=[{id:1,owner:1,cell:0,orientation:'NE'}];w.next_deflector_id=2;assert.equal(prepareDeflectorPurchase(w,ACCOUNT,10000000n,encodeDeflectorMemo({kind:'deflect',cell:b,orientation:'SW'})).reason,undefined);}
 const w=successorWorld(0);w.balls[0].y0=1024n;w.deflectors=[{id:1,owner:1,cell:1,orientation:'NE'}];w.next_deflector_id=2;const r=run(w,[]),e=unpackDeflectorAudit(decodeCanonical(r.events),w.balls);assert(!e.events.some(e=>e.deflector_contact));
});
test('outward or tangent synthetic face claims fail instead of redirecting',()=>{
 const b=canonicalTrajectory(0n,0n,1n,32000,0);assert.throws(()=>contactResponse(b,[0n,1n],'NE','E',0));assert.throws(()=>contactResponse(b,[0n,1n],'NE','N',0));assert.throws(()=>contactResponse(b,[1n,1n],'NE','W',0));
});

test('capture pruning removes Deflectors atomically and never treats one as an anchor',async()=>{
 const fs=await import('node:fs'),{migrateDeflectorWorld}=await import('../../packages/kernels/b2z/deflectors-v12.mjs'),{CaptureJob}=await import('../../packages/kernels/b2z/capture-v6.mjs');
 const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/capture-v6.json',import.meta.url)));
 for(const name of['left','unanchored']){const row=fixture.cases[name],w=migrateDeflectorWorld(decodeWorld(Buffer.from(row.before_hex,'hex')));w.deflectors=[{id:1,owner:1,cell:104,orientation:'NE'}];w.next_deflector_id=2;validateWorld(w);const original=encodeWorld(w);let job=CaptureJob.capture(w,row.target,row.ball),work=0;
  while(!job.step(w)){assert.deepEqual(encodeWorld(w),original);job=CaptureJob.fromState(decodeCanonical(encodeCanonical(job.toState())));assert(++work<10000);}
  validateWorld(w);assert.deepEqual(w.deflectors,[]);assert.deepEqual(job.event().removed_deflectors,[{id:1,owner:1,cell:104,orientation:'NE'}]);assert.equal(w.cannons.length,decodeWorld(original).cannons.length);
 }
});

test('new decimal motion wire rejects incomplete, noncanonical or rearm evidence',async()=>{
 const {unpackDeflectorEvent}=await import('../../packages/kernels/b2z/deflector-events.mjs'),wire=[0,0,['1','2'],1,1001,[1001,'1536','1536',22627,-22627,'1'],[1,0,0,0,true],false];
 assert.equal(unpackDeflectorEvent(wire,1).ball_state.den,1n);
 for(const change of [x=>x[2][0]='01',x=>x[2][1]='0',x=>x[5][1]='-0',x=>x[5][2]='9'.repeat(21),x=>x[5][5]='655360',x=>x[6][3]=1,x=>x[6][4]=null,x=>x[7]=0,x=>x[5].push(null)]){const bad=structuredClone(wire);change(bad);assert.throws(()=>unpackDeflectorEvent(bad,1));}
 assert.throws(()=>unpackDeflectorEvent({kind:'motion'},1));assert.throws(()=>unpackDeflectorEvent(wire,undefined));
});

test('near-parallel arrival after cannon reflections still uses only the contacted face',async()=>{
 const {steepWorld}=await import('../scenarios/boundary-deflector.mjs');for(const orientation of['NE','SE','SW','NW']){const w=steepWorld(),r=run(w,[{command:{kind:'deflect',cell:1002,orientation}}]),a=unpackDeflectorAudit(decodeCanonical(r.events),w.balls),impact=a.events.find(e=>e.deflector_contact);assert(impact);assert.equal(impact.deflector_contact.face,'W');const v=faceVelocity(orientation,'W');assert.deepEqual([impact.ball_state.vx,impact.ball_state.vy],[v.vx,v.vy]);assert(a.events.filter(e=>e.kind==='motion'&&e.sequence<impact.sequence).length>3);assert(impact.ball_state.den<=BigInt(Math.abs(w.balls[0].vx)));}
});

test('a paid safe Deflector is removed by a subsequent genuine bridge strike',async()=>{
 const {lossWorld}=await import('../scenarios/boundary-deflector.mjs'),w=lossWorld(),r=run(w,[{command:{kind:'deflect',cell:119,orientation:'NW'}}]),a=unpackDeflectorAudit(decodeCanonical(r.events),w.balls);assert.equal(a.receipts[0].reason,'ACCEPTED');assert(a.events.some(e=>e.kind==='deflector_built'));const cut=a.events.find(e=>e.removed_deflectors?.length);assert(cut);assert.equal(cut.removed_deflectors[0].cell,119);assert.deepEqual(decodeWorld(r.state).deflectors,[]);assert.equal(decodeWorld(r.state).received_e8s,10000000n);
});

test('simultaneous toroidal corner retains canonical blocked vertex semantics',()=>{
 const w=successorWorld(40960,0),r=run(w,[{command:{kind:'deflect',cell:999999,orientation:'NE'}}]),a=unpackDeflectorAudit(decodeCanonical(r.events),w.balls),e=a.events.find(e=>e.kind==='motion');assert(e.vertex_blocked);assert.equal(e.deflector_contact,undefined);assert.equal(e.ball_state.cell,0);assert.deepEqual([e.ball_state.vx,e.ball_state.vy],[22627,22627]);const next=a.events.find(x=>x.kind==='motion'&&x.sequence>e.sequence);assert(next&&next.time[0]*e.time[1]>e.time[0]*next.time[1]);
});

test('owner-approved compass mapping is shared and opposite outputs preserve cannon headings',async()=>{
 const {ORIENTATIONS,DEFLECTOR_HEADINGS}=await import('../../packages/protocol/deflector-orientation.generated.mjs'),{orientationHeading,directionVelocity}=await import('../../packages/kernels/b2z/deflector-boundary.mjs'),{heading}=await import('../../packages/kernels/b2z/math.mjs'),{orientationFromDegrees,deflectorDegrees}=await import('../../apps/b2z-observer/deflector-policy.mjs');
 const expected={NE:[57344,22627,-22627,'N','S'],SE:[8192,22627,22627,'E','W'],SW:[24576,-22627,22627,'S','N'],NW:[40960,-22627,-22627,'W','E']};
 for(const [name,[angle,x,y,front,rear]]of Object.entries(expected)){assert.equal(DEFLECTOR_HEADINGS[name],angle);assert.equal(orientationHeading(name),angle);assert.deepEqual(directionVelocity(name),[x,y]);assert.deepEqual(heading(angle,32000),[x,y]);assert.equal(orientationFromDegrees(deflectorDegrees(name)),name);const a=faceVelocity(name,front),b=faceVelocity(name,rear);assert(a.front&&!b.front);assert.deepEqual([a.vx,a.vy],[x,y]);assert.deepEqual([b.vx,b.vy],[-x,-y]);const opposite=ORIENTATIONS[(ORIENTATIONS.indexOf(name)+2)%4];assert.equal((angle+32768)%65536,orientationHeading(opposite));}
 assert.deepEqual(heading(0,32000),[32000,0]);assert.deepEqual(heading(16384,32000),[0,32000]);assert.deepEqual(heading(32768,32000),[-32000,0]);assert.deepEqual(heading(49152,32000),[0,-32000]);
});

test('all ownership combinations redirect at the protected boundary without capturing or arming it',async()=>{
 const{interactionWorld}=await import('../scenarios/boundary-deflector.mjs'),{playerAt}=await import('../../packages/kernels/b2z/world.mjs'),{CaptureJob}=await import('../../packages/kernels/b2z/capture-v6.mjs');
 for(const attacker of[1,2])for(const defender of[1,2])for(const face of['W','E'])for(const orientation of['NE','SE','SW','NW']){
  const w=interactionWorld(attacker,defender,face),cell=face==='W'?1503:1496,account=defender.toString(16).padStart(2,'0').repeat(32),r=run(w,[{account,command:{kind:'deflect',cell,orientation}}]),state=decodeWorld(r.state),audit=unpackDeflectorAudit(decodeCanonical(r.events),w.balls);
  assert.equal(audit.receipts[0].reason,'ACCEPTED');const impact=audit.events.find(e=>e.ball===1&&e.deflector_contact);assert(impact,`${attacker}/${defender}/${face}/${orientation}`);assert.equal(impact.deflector_contact.face,face);const v=faceVelocity(orientation,face);assert.deepEqual([impact.ball_state.vx,impact.ball_state.vy],[v.vx,v.vy]);assert.notEqual(impact.ball_state.cell,cell);assert.equal(state.balls.find(b=>b.id===1).owner,attacker);assert.equal(playerAt(state,cell),defender);assert.equal(state.deflectors[0].owner,defender);assert(!state.pending.some(p=>p.to===cell));assert(!audit.events.some(e=>(e.target===cell&&e.kind==='capture')||(e.kind==='strike_armed'&&e.strike.to===cell)));assert.equal(state.cannons.length,2);assert.equal(state.balls.length,2);
  const protectedWorld=structuredClone(w);protectedWorld.deflectors=[{id:1,cell,owner:defender,orientation}];protectedWorld.next_deflector_id=2;validateWorld(protectedWorld);assert.throws(()=>CaptureJob.capture(protectedWorld,cell,1),/INVALID_CAPTURE/);
 }
});
