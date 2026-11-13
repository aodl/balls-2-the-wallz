/** Native offline codec/scheduler qualification, NOT a production control path. */
import {AudioLoader,validateAudioManifest} from '../../apps/b2z-observer/audio-loader.mjs';
import {AudioMusic} from '../../apps/b2z-observer/audio-music.mjs';
const digest=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a)),b=>b.toString(16).padStart(2,'0')).join('');
export async function nativeCores(rate){const context=new OfflineAudioContext(2,1,rate),loader=new AudioLoader(context),m=await loader.manifest(),rows=[];
 for(const spec of m.segments){const b=await loader.load(spec),offset=spec.coreOffsetFrames*rate/48000,frames=spec.coreFrames*rate/48000;const pcm=new Int32Array(frames*2);for(let i=0;i<frames;i++)for(let ch=0;ch<2;ch++)pcm[i*2+ch]=Math.round(b.getChannelData(ch)[offset+i]*2147483648);rows.push({index:spec.index,rate:b.sampleRate,frames,sha256:await digest(pcm.buffer),expected:spec.corePcmInt32Sha256});}
 return{rate:context.sampleRate,rows,stats:loader.stats};}
export async function renderedCuts(rate,region='wrap'){
 const m=await(await fetch('./audio/b2z-v1/manifest.json')).json(),indices=region==='wrap'?[50,0,1]:[25,26,27],total=indices.reduce((n,i)=>n+m.segments[i].coreFrames,0),ctx=new OfflineAudioContext(2,Math.round((.08+total/48000)*rate),rate),loader=new AudioLoader(ctx),bus=ctx.createGain();bus.connect(ctx.destination);
 const starts=[],original=ctx.createBufferSource.bind(ctx);ctx.createBufferSource=()=>{const source=original(),start=source.start.bind(source);source.start=(...args)=>{starts.push({args,rate:source.playbackRate.value,detune:source.detune.value});return start(...args);};return source;};
 const music=new AudioMusic(ctx,loader,bus,e=>{throw e;});music.phase=m.segments[indices[0]].startFrame;await music.start(m);await music.prefetch;
 const suspension=ctx.suspend(.08+m.segments[indices[0]].coreFrames/48000+.05),rendering=ctx.startRendering();await suspension;await new Promise(r=>setTimeout(r,0));music.tick();await ctx.resume();const output=await rendering;music.stop({fade:false});
 const reference=await ctx.decodeAudioData(await(await fetch(`./reference-${region}.flac`)).arrayBuffer()),offset=Math.round(.08*rate),guard=Math.round(.05*rate),skip=Math.ceil(.1*rate);let maxError=0,peak=0,errorSamples=0;
 for(let ch=0;ch<2;ch++){const a=output.getChannelData(ch),b=reference.getChannelData(ch);for(let i=skip;i<Math.round(total*rate/48000);i++){const difference=Math.abs(a[offset+i]-b[guard+i]);maxError=Math.max(maxError,difference);if(difference>1e-6)errorSamples++;peak=Math.max(peak,Math.abs(a[offset+i]));}}
 return{rate:ctx.sampleRate,region,frames:output.length,coreFrames:total,starts,maxErrorAfterInitialFade:maxError,errorSamples,peak,scheduler:music.stats};
}
globalThis.audioNative={nativeCores,renderedCuts};
