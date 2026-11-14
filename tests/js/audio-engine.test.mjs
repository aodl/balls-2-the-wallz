/** Engine faults/lifecycle with synthetic nodes. Native output has separate browser QA. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createAudioEngine} from '../../apps/b2z-observer/audio-engine.mjs';
const manifest=JSON.parse(fs.readFileSync(new URL('../../apps/b2z-observer/audio/b2z-v1/manifest.json',import.meta.url)));
const wait=async f=>{for(let until=Date.now()+10000;Date.now()<until;){if(f())return;await new Promise(r=>setTimeout(r,10));}assert(f(),'bounded load did not settle');};
function setup(t){
 const old={fetch:globalThis.fetch,location:globalThis.location,caches:globalThis.caches};
 globalThis.location={origin:new URL(import.meta.url).origin};globalThis.caches={open:async()=>{throw Error('private storage denied');}};
 let requests=0;globalThis.fetch=async url=>{requests++;return new Response(fs.readFileSync(new URL(url)));};
 const param=()=>({value:1,setValueAtTime(v){this.value=v;},linearRampToValueAtTime(){},cancelScheduledValues(){}});
 const context={sampleRate:48000,currentTime:0,state:'suspended',createGain(){return{gain:param(),connect(){},disconnect(){}};},createStereoPanner(){return{pan:param(),connect(){},disconnect(){}};},createBufferSource(){return{playbackRate:{value:1},detune:{value:0},connect(){},disconnect(){},start(){},stop(){this.onended?.();}};},async resume(){this.state='running';this.onstatechange?.();},async suspend(){this.state='suspended';this.onstatechange?.();},async close(){this.state='closed';},async decodeAudioData(bytes){const file=[...manifest.segments,...Object.values(manifest.effects)].find(s=>s.bytes===bytes.byteLength);assert(file);return{numberOfChannels:2,length:file.decodedFrames};}};
 let status;const engine=createAudioEngine({contextFactory:()=>context,storage:{getItem:()=>null,setItem(){}},onStatus:s=>status=s});
 t.after(()=>{engine.dispose();Object.assign(globalThis,old);});
 const frame=()=>engine.begin({previous:1,time:1.01,elapsed:.016,now:performance.now(),ready:true,failed:false,camera:{scale:60}});
 return{engine,context,frame,requests:()=>requests,status:()=>status};
}
test('unified default starts both lanes after activation, hidden/mute never changes preference',async t=>{
 const f=setup(t);f.frame();f.engine.gesture();await wait(()=>f.engine.inspect().fxBuffers===4&&f.engine.inspect().music.active);
 const phase=f.engine.inspect().music.phase,count=f.requests();f.engine.lifecycle(true);assert.equal(f.engine.inspect().hidden,true);assert.equal(f.frame(),null);await new Promise(r=>setTimeout(r,20));assert.equal(f.requests(),count);
 f.engine.set({enabled:false});f.engine.lifecycle(false);await new Promise(r=>setTimeout(r,20));assert.equal(f.engine.settings().enabled,false);assert.equal(f.engine.inspect().activeVoices,0);assert.equal(f.requests(),count);
 f.engine.set({enabled:true},{activate:true});await wait(()=>f.engine.inspect().music.active);assert(f.engine.inspect().music.phase>=phase);assert.equal(f.engine.settings().enabled,true);
});
test('pending native activation after explicit mute cannot load or restart output',async t=>{
 const f=setup(t);let complete;f.context.resume=()=>new Promise(r=>complete=r);f.frame();f.engine.gesture();assert(complete);f.engine.set({enabled:false});f.context.state='running';complete();await new Promise(r=>setTimeout(r,20));assert.equal(f.requests(),0);assert.equal(f.engine.inspect().music.active,false);
});
test('single gesture performs one native resume and no public repair/cache API remains',async t=>{
 const f=setup(t);let resumes=0;const resume=f.context.resume.bind(f.context);f.context.resume=()=>{resumes++;return resume()};f.frame();f.engine.gesture();await wait(()=>f.engine.inspect().music.active);assert.equal(resumes,1);assert.equal(f.engine.retry,undefined);assert.equal(f.engine.clearCache,undefined);
});
test('adversarial accepted candidates obey engine starts/voices/peak gates and all stop on hide',async t=>{
 const f=setup(t);f.frame();f.engine.set({enabled:true},{activate:true});await wait(()=>f.engine.inspect().fxBuffers===4);
 let now=1000;t.mock.method(performance,'now',()=>now);const camera={x:0,y:0,scale:60,viewport:{width:720,height:480},screen(x,y){return{x,y};}},pose='0/0/60/720/480';let priorStarts=0;const membership={pose,balls:new Map(),cannons:new Map()};
 for(let frame=0;frame<24;frame++){
  now=1000+frame*350;f.context.currentTime=now/1000;const collector=f.engine.begin({previous:frame,time:frame+.1,elapsed:.016,now,ready:true,failed:false,camera});
  for(let i=0;i<32;i++){const kind=i%6===0?'cannon':'wall',entity=frame*100+i,x=90+i%6*100,y=kind==='cannon'?71:44;membership[kind==='cannon'?'cannons':'balls'].set(entity,{x,y});collector.accept({kind,entity,x,y,torus:false,width:1000,height:1000,time:frame+.1,key:`stress/${frame}/${i}`,volley:`stress/${frame}/${i}`});}
  f.engine.flush({camera,membership,occluders:[],time:frame+.1,elapsed:.016});const state=f.engine.inspect();assert(state.stats.starts-priorStarts<=2);priorStarts=state.stats.starts;assert(state.activeVoices<=8);assert(state.cooldowns<=512);assert(state.seen<=4096);
 }
 assert(f.engine.inspect().stats.maxVoices<=8);assert(f.engine.inspect().stats.maxReservedPeak<=.200000001);f.engine.lifecycle(true);assert.equal(f.engine.inspect().activeVoices,0);
});
test('late native decode after mute remains fenced; later unified activation restores both lanes',async t=>{
 const f=setup(t),decode=f.context.decodeAudioData.bind(f.context);let release;
 f.context.decodeAudioData=bytes=>{if(!release)return new Promise(resolve=>{release=()=>resolve(decode(bytes));});return decode(bytes);};
 f.frame();f.engine.gesture();await wait(()=>Boolean(release));f.engine.set({enabled:false});release();await new Promise(r=>setTimeout(r,30));assert.equal(f.engine.inspect().music.active,false);assert.equal(f.engine.inspect().activeVoices,0);
 f.engine.set({enabled:true},{activate:true});await wait(()=>f.engine.inspect().fxBuffers===4&&f.engine.inspect().music.active);
});
test('exhausted music retries recover automatically on visible return with same enabled intent',async t=>{
 const f=setup(t),decode=f.context.decodeAudioData.bind(f.context);let unavailable=true;f.context.decodeAudioData=bytes=>{if(unavailable&&manifest.segments.some(s=>s.bytes===bytes.byteLength))throw Error('transient music unavailable');return decode(bytes)};
 f.frame();f.engine.gesture();await new Promise(r=>setTimeout(r,4200));assert.equal(f.engine.inspect().music.active,false);assert.equal(f.engine.inspect().fxBuffers,4);unavailable=false;f.engine.lifecycle(true);f.engine.lifecycle(false);await wait(()=>f.engine.inspect().music.active);assert.equal(f.engine.settings().enabled,true);assert.equal(f.engine.inspect().stats.contextCreations,1);
});
