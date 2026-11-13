/** Opt-in, hash-checked same-origin transport. No service worker or API interception. */
export const AUDIO_MANIFEST_SHA256='d26588b58524710683bd9937a45395ea232eb3a891f4d3a910e1f4283d503db7';
export const AUDIO_BASE=new URL('./audio/b2z-v1/',import.meta.url);
export async function clearAudioCache(){try{for(const key of await caches.keys())if(key.startsWith('b2z-audio-'))await caches.delete(key);}catch{}}
const CACHE='b2z-audio-v1-'+AUDIO_MANIFEST_SHA256.slice(0,16),CAP=90*1024*1024;
const hash=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),n=>n.toString(16).padStart(2,'0')).join('');
export function validateAudioManifest(m){
 if(m.schema!=='b2z-audio-1'||m.sampleRate!==48000||m.channels!==2||m.bitsPerSample!==24||m.totalFrames!==19553280||m.guardFrames!==2400||m.playbackRate!==1||m.segments?.length!==51||Object.keys(m.effects??{}).length!==6)throw Error('Audio manifest format');
 let frames=0;const paths=new Set();for(const [i,s]of m.segments.entries()){if(s.index!==i||s.startFrame!==frames||s.coreOffsetFrames!==2400||s.coreFrames!==(i===50?353280:384000)||s.decodedFrames!==s.coreFrames+4800)throw Error('Audio core bounds');frames+=s.coreFrames;}
 for(const f of [...m.segments,...Object.values(m.effects)]){if(!/^(music\/[0-9]{3}|sfx\/[a-z-]+)-[0-9a-f]{16}\.flac$/.test(f.file)||!f.file.includes(f.sha256.slice(0,16))||!/^[0-9a-f]{64}$/.test(f.sha256)||!Number.isInteger(f.bytes)||f.bytes<1||f.bytes>1700000||!Number.isInteger(f.decodedFrames)||f.decodedFrames<1||f.decodedFrames>388800||paths.has(f.file))throw Error('Audio asset bounds');paths.add(f.file);}
 if(frames!==m.totalFrames)throw Error('Audio loop length');return m;
}
async function abortable(promise,signal){signal.throwIfAborted();let reject;const stopped=new Promise((_,r)=>{reject=()=>r(signal.reason);signal.addEventListener('abort',reject,{once:true});});try{return await Promise.race([promise,stopped]);}finally{signal.removeEventListener('abort',reject);}}
async function boundedBytes(response,cap,signal){
 if(!response.ok||Number(response.headers.get('Content-Length'))>cap)throw Error('Audio response unavailable/oversized');
 const reader=response.body.getReader(),parts=[];let length=0;
 try{for(;;){signal.throwIfAborted();const {done,value}=await abortable(reader.read(),signal);if(done)break;length+=value.length;if(length>cap)throw Error('Audio response oversized');parts.push(value);}const out=new Uint8Array(length);let at=0;for(const part of parts){out.set(part,at);at+=part.length;}return out.buffer;}catch(e){void reader.cancel().catch(()=>{});throw e;}
}
export class AudioLoader{
 constructor(context,{fetcher=globalThis.fetch.bind(globalThis),base=AUDIO_BASE}={}){this.context=context;this.fetcher=fetcher;this.base=base;this.generation=0;this.pending=0;this.encoded=0;this.waiters=[];this.decodeTail=Promise.resolve();this.decodePending=0;this.controller=new AbortController();this.stats={fetches:0,cacheHits:0,decodes:0,maxFetches:0,maxEncoded:0,maxDecodes:0};this.cacheTail=Promise.resolve();this.cacheDisabled=false;this.cacheOpened=false;}
 cancel(){this.generation++;this.controller.abort();this.controller=new AbortController();for(const wake of this.waiters.splice(0))wake();}
 async slot(bytes,gen){while(this.pending>=2||this.encoded+bytes>8*1024*1024){await new Promise(r=>this.waiters.push(r));if(gen!==this.generation)throw Error('Audio cancelled');}if(gen!==this.generation)throw Error('Audio cancelled');this.pending++;this.encoded+=bytes;this.stats.maxFetches=Math.max(this.stats.maxFetches,this.pending);this.stats.maxEncoded=Math.max(this.stats.maxEncoded,this.encoded);return()=>{this.pending--;this.encoded-=bytes;for(const wake of this.waiters.splice(0))wake();};}
 async bytes(file,expected,cap){const gen=this.generation,signal=AbortSignal.any([this.controller.signal,AbortSignal.timeout(15000)]),url=new URL(file,this.base);
  if(file!=='manifest.json'&&!/^(music\/[0-9]{3}|sfx\/[a-z-]+)-[0-9a-f]{16}\.flac$/.test(file))throw Error('Audio path');
  if(url.origin!==location.origin||!url.href.startsWith(this.base.href)||file.includes('..'))throw Error('Audio URL binding');
  const release=await this.slot(cap*5,gen);try{
   let cache=null,response=null;try{cache=!this.cacheDisabled?await abortable(caches.open(CACHE),AbortSignal.timeout(1000)):null;response=cache?await abortable(cache.match(url.href),AbortSignal.timeout(1000)):null;}catch{}
   if(cache&&!this.cacheOpened){this.cacheOpened=true;try{for(const name of await abortable(caches.keys(),AbortSignal.timeout(1000)))if(name.startsWith('b2z-audio-')&&name!==CACHE)await abortable(caches.delete(name),AbortSignal.timeout(1000));}catch{this.cacheDisabled=true;}}
   if(response)this.stats.cacheHits++;else{this.stats.fetches++;response=await abortable(this.fetcher(url,{signal,credentials:'same-origin',cache:file==='manifest.json'?'no-cache':'default'}),signal);}
   const bytes=await boundedBytes(response,cap,signal);if(await hash(bytes)!==expected){if(cache)void cache.delete(url.href).catch(()=>{});throw Error('Audio hash');}if(gen!==this.generation)throw Error('Audio cancelled');
   if(cache&&!this.cacheDisabled){const copy=bytes;this.cacheTail=this.cacheTail.then(async()=>{if(gen!==this.generation)return;try{await abortable((async()=>{await cache.put(url.href,new Response(copy,{headers:{'X-Audio-Bytes':String(copy.byteLength)}}));let total=0;const entries=await cache.keys();for(const entry of entries){const response=await cache.match(entry);total+=Number(response.headers.get('Content-Length'))||Number(response.headers.get('X-Audio-Bytes'))||0;}if(entries.length>58){await caches.delete(CACHE);this.cacheDisabled=true;}else for(const entry of entries){if(total<=CAP)break;const old=await cache.match(entry);total-=Number(old.headers.get('Content-Length'))||Number(old.headers.get('X-Audio-Bytes'))||0;await cache.delete(entry);}})(),AbortSignal.timeout(1000));}catch{this.cacheDisabled=true;}});await this.cacheTail;}

   return bytes;
  }finally{release();}
 }
 async manifest(){const bytes=await this.bytes('manifest.json',AUDIO_MANIFEST_SHA256,65536);return validateAudioManifest(JSON.parse(new TextDecoder().decode(bytes)));}
 async load(spec){const gen=this.generation;
  const job=this.decodeTail.catch(()=>{}).then(async()=>{if(gen!==this.generation)throw Error('Audio cancelled');if(this.decodePending)throw Error('Audio decoder is still busy');const bytes=await this.bytes(spec.file,spec.sha256,spec.bytes);if(bytes.byteLength!==spec.bytes||gen!==this.generation)throw Error('Audio length/cancelled');this.decodePending++;this.stats.maxDecodes=Math.max(this.stats.maxDecodes,this.decodePending);try{this.stats.decodes++;let decoding;try{decoding=Promise.resolve(this.context.decodeAudioData(bytes)).finally(()=>{this.decodePending--;});}catch(error){this.decodePending--;throw error;}const buffer=await abortable(decoding,AbortSignal.any([this.controller.signal,AbortSignal.timeout(15000)]));if(gen!==this.generation)throw Error('Audio cancelled');if(buffer.numberOfChannels!==2||Math.abs(buffer.length-spec.decodedFrames*this.context.sampleRate/48000)>1)throw Error('Audio decoded format');return buffer;}finally{/* Native completion owns the decoder slot, even after cancellation. */}});this.decodeTail=job.then(()=>{},()=>{});return job;
 }
 async clearCache(){await clearAudioCache();}
}
