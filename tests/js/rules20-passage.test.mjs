import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeWorld,encodeWorld,migrateCompactReservoirs,migrateAuthorizationRows,validateWorld,setOwner} from '../../packages/kernels/b2z/world.mjs';
import {registerPassage,exempts,retireAfterContact,pruneRemoved} from '../../packages/kernels/b2z/passage-v20.mjs';
import {classify,passage} from '../../packages/kernels/b2z/kernel.mjs';
import {nextCrossing} from '../../packages/kernels/b2z/geometry.mjs';

function world(){
 const vector=JSON.parse(readFileSync(new URL('../fixtures/b2z-delegation-v18.json',import.meta.url)));
 const w=migrateAuthorizationRows(migrateCompactReservoirs(decodeWorld(Buffer.from(vector.execution.state,'hex'))));
 const b=w.balls[0];b.cell=500501;b.x0=501n*1024n;b.y0=500n*1024n+512n;b.vx=-32000;b.vy=0;b.den=1n;
 return w;
}
function structure(w){
 const d={id:w.next_deflector_id++,cell:500500,owner:1,orientation:'NE'};
 w.deflectors.push(d);w.deflectors.sort((a,b)=>a.cell-b.cell);return d;
}
test('successor entry-boundary exception survives canonical world roundtrip and retires on exit',()=>{
 const w=world(),d=structure(w),b=w.balls[0];
 registerPassage(w,'deflector',d.id,d.cell);
 assert.equal(w.passage_exceptions.length,1);
 assert.equal(exempts(w,b.id,'deflector',d.id,d.cell),true);
 assert.equal(exempts(w,b.id+1,'deflector',d.id,d.cell),false);
 assert.deepEqual(decodeWorld(encodeWorld(w)),w);
 b.cell=d.cell;
 assert.doesNotThrow(()=>validateWorld(w));
 b.cell=500499;retireAfterContact(w,b.id);
 assert.equal(w.passage_exceptions,undefined);
 assert.equal(exempts(w,b.id,'deflector',d.id,d.cell),false);
});
test('away-boundary and unrelated arriving Ball acquire no passage authority',()=>{
 const w=world(),d=structure(w),b=w.balls[0];
 b.vx=32000; // At the west boundary but travelling away from the new site.
 registerPassage(w,'deflector',d.id,d.cell);
 assert.equal(w.passage_exceptions,undefined);
 b.vx=-32000;
 registerPassage(w,'deflector',d.id,d.cell);
 assert.equal(w.passage_exceptions.length,1);
 d.cell=500600;pruneRemoved(w);
 assert.equal(w.passage_exceptions,undefined);
});
test('only the existing Ball crosses the new structure; later arrivals and returns are blocked',()=>{
 const w=world(),d=structure(w),b=w.balls[0];
 registerPassage(w,'deflector',d.id,d.cell);
 const first=classify(w,b,nextCrossing(b,w.width,w.time,b.den));
 assert.equal(first.targets[0].pass,true);
 assert.deepEqual(passage(w,b,first),{passX:true,passY:false,vertexBlocked:false});
 const arriving={...b,id:w.next_ball_id++,x0:502n*1024n};
 assert.equal(classify(w,arriving,nextCrossing(arriving,w.width,w.time,arriving.den)).targets[0].pass,false);
 b.cell=d.cell;
 assert.equal(exempts(w,b.id,'deflector',d.id,d.cell),true);
 b.cell=500499;retireAfterContact(w,b.id);
 assert.equal(w.passage_exceptions,undefined);
 b.cell=500501;
 assert.equal(classify(w,b,nextCrossing(b,w.width,w.time,b.den)).targets[0].pass,false);
});
test('an exact corner tangency does not grant passage through a side tile',()=>{
 const w=world(),d=structure(w),b=w.balls[0];
 b.vx=-22630;b.vy=22625;b.y0=501n*1024n;
 registerPassage(w,'deflector',d.id,d.cell);
 assert.equal(w.passage_exceptions,undefined);
 // If the diagonal is foreign, the successor single-face law enters the
 // preferred friendly side; that is a genuine first traversal.
 setOwner(w,501500,0);
 registerPassage(w,'deflector',d.id,d.cell);
 assert.equal(w.passage_exceptions.length,1);
});
