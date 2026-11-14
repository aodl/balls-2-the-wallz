/** Disposable UI data only. No IC calls or authenticated-fixture claim. */
import fs from 'node:fs';
import {B2zCursor} from '../../packages/kernels/b2z/kernel.mjs';
import {decodeCanonical,encodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {hex,unhex} from '@dtr/timeline-runtime/protocol/bytes';
import {decodeWorld,encodeWorld,setOwner,validateWorld} from '../../packages/kernels/b2z/world.mjs';
import {expireV6} from '../../packages/kernels/b2z/lifecycle-v6.mjs';
import {dueFences} from '../../packages/kernels/b2z/playability.mjs';
import {V6_POLICY} from '../../packages/kernels/b2z/playability.generated.mjs';
import {PRICING} from '../../packages/kernels/b2z/economics.generated.mjs';
const f=JSON.parse(fs.readFileSync(new URL('../../tests/fixtures/rules-v6.json',import.meta.url))),cases={};
for(const[name,row]of Object.entries(f.cases)){
 const cursor=new B2zCursor(unhex(row.state_hex),decodeCanonical(unhex(row.inputs_hex)),decodeCanonical(unhex(row.seal_hex)));let work=0;while(!cursor.step(512).complete)if(++work>10000)throw Error('fixture work bound');cursor.finalizeElapsed(BigInt(row.observed_ns));const out=cursor.result(),w=decodeWorld(out.state);
 cases[name]={initial:row.state_hex,final:hex(out.state),events:hex(out.events),seal:row.seal_hex};
 const deadline=w.playability.lifecycle.reduce((last,l)=>l.deadline_ns!==undefined&&l.deadline_ns>last?l.deadline_ns:last,0n);
 if(deadline){const expiry=expireV6(w,deadline,dueFences(w,deadline));if(expiry)cases[name].expired=hex(expiry.output.state);}
}
// Synthetic seam scene; canonical kernel output, never a certified-world claim.
{
 const w=decodeWorld(Buffer.from(cases.idle.initial,'hex'));w.cannons[0].cell=999997;w.ownership.base.fill(1);w.ownership.overrides=[];w.ownership.counts=[{owner:1,cells:1000000}];
 for(const b of w.balls){b.cell=999999;b.vx=1024;b.vy=0;b.x0=1023900n-BigInt(b.vx)*w.time[0];b.y0=1023488n;}
 const initial=encodeWorld(w),seal={...decodeCanonical(bytesHex(cases.idle.seal)),logical_start:w.time[0],logical_end:w.time[0]+1n};
 const c=new B2zCursor(initial,[],seal);while(!c.step(512).complete){}c.finalizeElapsed(w.playability.elapsed_ns+1000000000n);const out=c.result();
 cases.wrap={initial:hex(initial),final:hex(out.state),events:hex(out.events),seal:hex(encodeCanonical(seal))};
}
// Static, valid one-cell territory for an exhaustive no-Move proof.
{const w=decodeWorld(bytesHex(cases.idle.initial));if(w.cannons.length!==1||w.balls.some(b=>b.cell!==w.cannons[0].cell))throw Error('no-Move fixture requires one active anchored cell');w.ownership.base.fill(0);w.ownership.overrides=[];w.ownership.counts=[];setOwner(w,w.cannons[0].cell,1);validateWorld(w);const bytes=hex(encodeWorld(w));cases.noMove={initial:bytes,final:bytes};}
const sequences={};
for(const name of ['idle','wrap']){
 let initial=bytesHex(cases[name].final);sequences[name]=[];
 for(let i=0;i<3;i++){
  const w=decodeWorld(initial),seal={...decodeCanonical(bytesHex(cases[name].seal)),logical_start:w.time[0],logical_end:w.time[0]+1n};
  const c=new B2zCursor(initial,[],seal);let work=0;while(!c.step(512).complete)if(++work>10000)throw Error('sequence bound');c.finalizeElapsed(w.playability.elapsed_ns+1000000000n);const out=c.result();
  sequences[name].push({initial:hex(initial),final:hex(out.state),events:hex(out.events),seal:hex(encodeCanonical(seal))});initial=out.state;
 }
}
function bytesHex(s){return Uint8Array.from(Buffer.from(s,'hex'));}
let capacity_events;
if(process.argv[3]){const raw=fs.readFileSync(process.argv[3]);if(raw.length>1048576)throw Error('capacity state bound');const w=decodeWorld(raw);if(w.version!==6||w.balls.length!==64||w.cannons.length!==128)throw Error('declared capacity fixture');cases.capacity={initial:hex(raw),final:hex(raw)};const events=fs.readFileSync(process.argv[4]);if(events.length>1048576||decodeCanonical(events).version!==6)throw Error('capacity event bound');capacity_events=hex(events);}
fs.writeFileSync(process.argv[2],JSON.stringify({qualification:'Synthetic widget/presentation data; not IC authentication or installed upgrade evidence',config:hex(encodeCanonical({...V6_POLICY,...PRICING})),cases,sequences,capacity_events}));
