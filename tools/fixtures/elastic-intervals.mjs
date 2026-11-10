/** Disposable canonical intervals; not IC-certificate or financial evidence. */
import{readFileSync}from'node:fs';
import{decodeCanonical}from'@dtr/timeline-runtime/runtime/canonical';
import{sha256Web}from'@dtr/timeline-runtime/client/verification';
import{B2zCursor}from'../../packages/kernels/b2z/kernel.mjs';
import{decodeWorld,encodeWorld}from'../../packages/kernels/b2z/world.mjs';
import{prepareDerivedSegment,SegmentPlayer}from'../../apps/b2z-observer/model.mjs';
const fixture=JSON.parse(readFileSync('tests/fixtures/rules-v6.json')).cases.idle,bytes=h=>new Uint8Array(Buffer.from(h,'hex'));
export async function intervals(count=4,{wrap=false}={}){let initial=bytes(fixture.state_hex);if(wrap){const w=decodeWorld(initial);w.cannons[0].cell=999997;w.ownership.base.fill(1);w.ownership.overrides=[];w.ownership.counts=[{owner:1,cells:1000000}];for(const b of w.balls){b.cell=999999;b.vx=1024;b.vy=0;b.x0=1023900n-BigInt(b.vx)*w.time[0];b.y0=1023488n;}initial=encodeWorld(w);}const rows=[];for(let i=0;i<count;i++){const w=decodeWorld(initial),seal={...decodeCanonical(bytes(fixture.seal_hex)),logical_start:w.time[0],logical_end:w.time[0]+1n};const cursor=new B2zCursor(initial,[],seal);while(!cursor.step(512).complete){}cursor.finalizeElapsed(w.playability.elapsed_ns+1000000000n);const o=cursor.result(),p={version:8,identity:{config_hash:seal.config_hash,rules_hash:seal.rules_hash,schema_hash:seal.schema_hash},render_format:null,head:{seal:{...seal,previous_state:await sha256Web(initial)},state_hash:await sha256Web(o.state)},artifacts:[{kind:'events',sha256:await sha256Web(o.events)}]};const segment=await prepareDerivedSegment(initial,o.state,o.events,p);rows.push({segment,player:new SegmentPlayer(segment)});initial=o.state;}return rows;}
