/** Integer source-frame schedule on the audio clock. Guards and file cuts never fade. */
export class AudioMusic{
 constructor(context,loader,bus,onError=()=>{},onState=()=>{}){Object.assign(this,{context,loader,bus,onError,onState});this.buffers=new Map();this.nodes=new Set();this.generation=0;this.phase=0;this.active=false;this.starting=false;this.timer=null;this.retryTimer=null;this.failures=0;this.stats={starts:0,underruns:0,maxBuffers:0,maxNodes:0,maxDecoded:0};}
 position(){return this.active?this.phase+Math.max(0,Math.min(this.context.currentTime,this.scheduledUntil??this.context.currentTime)-this.epoch)*48000:this.phase;}
 bytes(){return [...new Set([...this.buffers.values(),...[...this.nodes].map(n=>n.source.buffer).filter(Boolean)])].reduce((sum,b)=>sum+b.length*b.numberOfChannels*4,0);}
 async start(manifest){if(this.active||this.starting)return;this.manifest=manifest;const gen=++this.generation;this.starting=true;this.onState();
  try{const phase=Math.floor(((this.phase%manifest.totalFrames)+manifest.totalFrames)%manifest.totalFrames),index=manifest.segments.findIndex(s=>phase<s.startFrame+s.coreFrames);await this.fill(index,gen);await this.fill((index+1)%51,gen);if(gen!==this.generation)return;
   this.phase=phase;this.nextFrame=phase;this.index=index;this.epoch=this.context.currentTime+.08;this.first=true;this.active=true;this.tick();this.timer=setInterval(()=>this.tick(),150);
  }catch(e){if(gen===this.generation)this.recover(e);}finally{if(gen===this.generation){this.starting=false;this.onState();}}
 }
 async fill(index,gen){if(gen!==this.generation||this.buffers.has(index))return;const spec=this.manifest.segments[index],estimate=Math.ceil(spec.decodedFrames*this.context.sampleRate/48000)*8,used=this.bytes();
  if(this.buffers.size>=3||used+estimate>32*1024*1024)throw Error('Music memory budget');const buffer=await this.loader.load(spec);if(gen!==this.generation)return;this.buffers.set(index,buffer);this.stats.maxBuffers=Math.max(this.stats.maxBuffers,this.buffers.size);this.stats.maxDecoded=Math.max(this.stats.maxDecoded,this.bytes());
 }
 release(record){record.source.onended=null;record.source.disconnect();record.gain.disconnect();record.source.buffer=null;this.nodes.delete(record);if(this.buffers.get(record.index)===record.buffer&&![...this.nodes].some(n=>n.buffer===record.buffer))this.buffers.delete(record.index);record.buffer=null;}
 tick(){if(!this.active||this.ticking)return;this.ticking=true;const gen=this.generation;
  try{const now=this.context.currentTime;if(this.scheduledUntil!==undefined&&now>this.scheduledUntil+.02){this.stats.underruns++;this.recover(Error('Music underrun'));return;}
   while([...this.nodes].filter(n=>!n.ending).length<2&&this.nodes.size<4){const index=this.index,spec=this.manifest.segments[index],buffer=this.buffers.get(index);if(!buffer)break;
    const loop=Math.floor(this.nextFrame/this.manifest.totalFrames),local=this.nextFrame-loop*this.manifest.totalFrames,skip=local-spec.startFrame,frames=spec.coreFrames-skip,when=this.epoch+(this.nextFrame-this.phase)/48000;
    if(when<now-.02){this.stats.underruns++;this.recover(Error('Music underrun'));return;}
    const source=this.context.createBufferSource(),gain=this.context.createGain(),record={source,gain,buffer,index,when,fade:this.first,ending:false};source.buffer=buffer;source.playbackRate.value=1;source.detune.value=0;source.connect(gain);gain.connect(this.bus);
    if(this.first){gain.gain.setValueAtTime(0,when);gain.gain.linearRampToValueAtTime(1,when+.08);this.first=false;}
    this.nodes.add(record);source.onended=()=>{if(!record.ending)this.failures=0;this.release(record);};source.start(Math.max(now,when),(spec.coreOffsetFrames+skip)/48000,frames/48000);this.stats.starts++;this.stats.maxNodes=Math.max(this.stats.maxNodes,this.nodes.size);this.nextFrame+=frames;this.index=(index+1)%51;this.scheduledUntil=this.epoch+(this.nextFrame-this.phase)/48000;
   }
   if(this.buffers.size<3&&!this.prefetch){const index=this.buffers.has(this.index)?(this.index+1)%51:this.index;this.prefetch=this.fill(index,gen).catch(e=>{if(gen===this.generation)this.recover(e);}).finally(()=>{if(gen===this.generation)this.prefetch=null;});}
  }catch(e){this.recover(e);}finally{this.ticking=false;}
 }
 recover(error){this.stop();if(++this.failures>2){this.onError(error);return;}const gen=this.generation;this.retryTimer=setTimeout(()=>{if(gen===this.generation){this.retryTimer=null;void this.start(this.manifest);}},1000*this.failures);this.onState();}
 stop({fade=this.context.state==='running'}={}){clearTimeout(this.retryTimer);this.retryTimer=null;this.phase=Math.floor(this.position());this.active=false;this.starting=false;this.generation++;clearInterval(this.timer);this.timer=null;this.scheduledUntil=undefined;this.prefetch=null;this.buffers.clear();
  for(const record of [...this.nodes]){if(record.ending&&fade)continue;try{if(fade){record.ending=true;const now=this.context.currentTime,value=record.fade?Math.max(0,Math.min(1,(now-record.when)/.08)):1;record.gain.gain.cancelScheduledValues(now);record.gain.gain.setValueAtTime(value,now);record.gain.gain.linearRampToValueAtTime(0,now+.04);record.source.stop(now+.05);}else{record.source.stop();this.release(record);}}catch{this.release(record);}}
 }
}
