import {migrateEconomy,observeEconomy,participatingPlayers} from '../../packages/kernels/b2z/economy17.mjs';
import {DAY_NS} from '../../packages/protocol/economy17.generated.mjs';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
/** Disposable UI data only. No IC calls or authenticated-fixture claim. */
import fs from 'node:fs';
import {B2zCursor} from '../../packages/kernels/b2z/kernel.mjs';
import {decodeCanonical,encodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {hex,unhex} from '@dtr/timeline-runtime/protocol/bytes';
import {decodeWorld,encodeWorld,setOwner,validateWorld,WAR_CRY_CONFIG,COMBINED_CONFIG,DEFLECTOR_CONFIG,ENTRY_CONFIG,SHOUT_CONFIG,SPACING_CONFIG,RESERVOIR_CONFIG,ECONOMY_CONFIG} from '../../packages/kernels/b2z/world.mjs';
import {migrateReservoirs} from '../../packages/kernels/b2z/reservoirs.mjs';
import {reservoirPut} from '../../packages/protocol/reservoir.mjs';
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
// Retained canonical live scene; no new execution, payment or authenticity claim.
{const f=JSON.parse(fs.readFileSync(new URL('./quantity-live-pose.json',import.meta.url)),(_,v)=>v&&typeof v==='object'&&'$integer'in v?BigInt(v.$integer):v);const raw=encodeCanonical(f.world);validateWorld(decodeWorld(raw));cases.quantityLive={initial:hex(raw),final:hex(raw)};}
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
const boundary=JSON.parse(fs.readFileSync(new URL('../../tests/fixtures/boundary-deflector-v12.json',import.meta.url))).rows.find(r=>r.name==='corridor-with-recovery');
cases.deflector={initial:boundary.initial_hex,final:boundary.outputs.state.hex,events:boundary.outputs.events.hex,seal:boundary.context_hex};
// Schema7 paid-rule UI fixture, used only in the standalone orbit browser.
const context=JSON.parse(fs.readFileSync(new URL('../../tests/fixtures/context-structures-v13.json',import.meta.url))).rows[0];
const orbit=decodeWorld(unhex(context.initial_hex));
orbit.deflectors.push({id:1,cell:4007,owner:1,orientation:'NW'});orbit.next_deflector_id=2;
const orbitHex=hex(encodeWorld(orbit));
cases.orbit={initial:orbitHex,final:orbitHex};
const scout=decodeWorld(unhex(orbitHex));
setOwner(scout,750750,0);
setOwner(scout,4014,2);
scout.balls.push({...scout.balls[0],id:scout.next_ball_id++,owner:2,cell:4013,x0:13824n,y0:4608n});
const scoutLife=scout.playability.lifecycle.find(c=>c.cannon===2);
delete scoutLife.dormant_since_ns;
delete scoutLife.deadline_ns;
const scoutHex=hex(encodeWorld(scout));
cases.orbitScout={initial:scoutHex,final:scoutHex};
const reservoir=migrateReservoirs(orbit);
for(const cell of [6005,6006,7005,7006])reservoir.reservoirs=reservoirPut(reservoir.reservoirs,cell);
const reservoirHex=hex(encodeWorld(reservoir));
cases.reservoir={initial:reservoirHex,final:reservoirHex};
const midnight=20_000n*DAY_NS;
const economy=migrateEconomy(reservoir,midnight-1n,sha256(encodeWorld(reservoir)));
const unsignedEconomy=hex(encodeWorld(economy));
observeEconomy(economy.economy,midnight-1n,midnight,participatingPlayers(economy),sha256(encodeWorld(economy)));
economy.playability.elapsed_ns=midnight;
const economyHex=hex(encodeWorld(economy));
cases.economy={initial:economyHex,final:economyHex};
cases.economy_unannounced={initial:unsignedEconomy,final:unsignedEconomy};
const tactical=structuredClone(economy);
setOwner(tactical,500500,0);
function fixtureBall(cell,vx,vy){
  return {id:tactical.next_ball_id++,owner:1,cell,x0:BigInt(cell%1000*1024+512),y0:BigInt(Math.floor(cell/1000)*1024+512),vx,vy,den:1n};
}
for(const cell of [2004,2009,7009])tactical.balls.push(fixtureBall(cell,720,720));
const tacticalHex=hex(encodeWorld(tactical));
const retired=structuredClone(tactical);
retired.balls.pop();
const changed=structuredClone(tactical);
changed.reservoirs=reservoirPut(changed.reservoirs,4005);
cases.tactical={initial:tacticalHex,retired:hex(encodeWorld(retired)),blocked:hex(encodeWorld(changed))};
const mobile=process.env.B2Z_MOBILE_CAPTURE
 ? fs.readFileSync(process.env.B2Z_MOBILE_CAPTURE)
 : bytesHex(JSON.parse(fs.readFileSync(new URL('../../tests/fixtures/rules20-passage-public-equality.json',import.meta.url))).rows[0].initial_hex);
const mobileWorld=decodeWorld(mobile);
if(mobileWorld.version!==12||mobileWorld.width!==1000||mobileWorld.height!==1000)throw Error('Rules20 mobile fixture world');
cases.rules20Mobile={initial:hex(mobile)};
const rules20_config=hex(fs.readFileSync(new URL('../../apps/b2z-observer/configuration-rules20.bin',import.meta.url)));
fs.writeFileSync(process.argv[2],JSON.stringify({rules20_config,economy_config:hex(encodeCanonical(ECONOMY_CONFIG)),reservoir_config:hex(encodeCanonical(RESERVOIR_CONFIG)),spacing_config:hex(encodeCanonical(SPACING_CONFIG)),shout_config:hex(encodeCanonical(SHOUT_CONFIG)),qualification:'Synthetic widget/presentation data; not IC authentication or installed upgrade evidence',config:hex(encodeCanonical({...V6_POLICY,...PRICING})),entry_config:hex(encodeCanonical(ENTRY_CONFIG)),war_cry_config:hex(encodeCanonical(WAR_CRY_CONFIG)),combined_config:hex(encodeCanonical(COMBINED_CONFIG)),deflector_config:hex(encodeCanonical(DEFLECTOR_CONFIG)),cases,sequences,capacity_events}));
