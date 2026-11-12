/** Cold presentation chooses once, before exposing a world. Never simulates a head. */
import {ArtifactAssembler,verifyRetainedPredecessor} from '@dtr/timeline-runtime/client/verification';
import {prepareDerivedSegment,LIVE_BUFFER_LIMITS} from './model.mjs';
import {observationFailure} from './live-delivery.mjs';
export const STARTUP_HISTORY_MS=2000;
export async function startupPlayback(ticket,artifacts,client,{signal,budget=STARTUP_HISTORY_MS,now=()=>performance.now()}={}){
 const started=now(),head=ticket.publication.head,diagnostic={requests:0,bytes:0,outcome:'snapshot',elapsedMs:0};
 if(!head.seal||head.segment_id===null||head.segment_id===0n||head.seal.logical_end<=head.seal.logical_start)return{segment:null,diagnostic};
 const abort=new AbortController(),scoped=signal?AbortSignal.any([signal,abort.signal]):abort.signal;let timer;
 const work=(async()=>{
  diagnostic.requests++;const bytes=await client.publication(Number(head.segment_id-1n),{signal:scoped});scoped.throwIfAborted();diagnostic.bytes+=bytes.length;
  const prior=await verifyRetainedPredecessor(bytes,ticket);scoped.throwIfAborted();
  const assembler=new ArtifactAssembler(prior,'state');
  if(assembler.descriptor.length>LIVE_BUFFER_LIMITS.bytes)throw Error('startup predecessor byte capacity');
  for(let i=0;i<assembler.descriptor.chunks.length;i++){
   scoped.throwIfAborted();diagnostic.requests++;const chunk=await client.chunk(Number(prior.publication.head.segment_id),prior.root_hash,0,i,{signal:scoped});scoped.throwIfAborted();diagnostic.bytes+=chunk.length;await assembler.accept(i,chunk);
  }
  const state=await assembler.finish(),latest=await artifacts;scoped.throwIfAborted();
  const segment=await prepareDerivedSegment(state,latest.state,latest.events,ticket.publication);scoped.throwIfAborted();
  if(segment.bytes>LIVE_BUFFER_LIMITS.bytes)throw Error('startup interval byte capacity');
  return segment;
 })();
 try{
  const segment=await Promise.race([work,new Promise(resolve=>{timer=setTimeout(()=>{abort.abort();resolve(null);},budget);})]);
  diagnostic.outcome=segment?'interval':'deadline';return{segment,diagnostic};
 }catch(error){
  if(signal?.aborted)throw error;
  if(observationFailure(error)!=='delivery'&&!/publication unavailable: snapshot resync required/.test(error?.message)){
   diagnostic.outcome='invalid';diagnostic.error=String(error?.message??error).slice(0,160);
   return{segment:null,diagnostic,failure:error};
  }
  diagnostic.outcome='unavailable';return{segment:null,diagnostic};
 }finally{clearTimeout(timer);abort.abort();diagnostic.elapsedMs=now()-started;}
}
