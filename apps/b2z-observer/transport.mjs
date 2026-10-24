/** Read-only local recording transport. No ledger, identity, wallet or certificate API. */
import {verifyPinnedPublication, ArtifactAssembler} from '../../node_modules/@dtr/timeline-runtime/packages/client/verification.mjs';
/** Bound retained catch-up RPC bursts; each result can be consumed in order
 * without waiting for an unrelated slow tail. Rejections remain explicit. */
export function prefetchRetained(values,load){
  if(values.length>16)throw new Error('retained prefetch bound');
  const lanes=Array.from({length:4},()=>Promise.resolve());
  return values.map((value,index)=>{
    const lane=index%lanes.length,task=lanes[lane].then(()=>load(value));
    lanes[lane]=task.catch(()=>{});
    return task.then(value=>({status:'fulfilled',value}),reason=>({status:'rejected',reason}));
  });
}
export function validateIndex(x){
  if(x?.version!==1||x.trust!=='offline-pinned-content'||!Array.isArray(x.recordings)||x.recordings.length<1||x.recordings.length>16)throw new Error('recording index');
  const ids=new Set();for(const r of x.recordings){
    if(!/^[-a-z0-9]{1,32}$/.test(r.id)||ids.has(r.id)||typeof r.title!=='string'||r.title.length>64||typeof r.description!=='string'||r.description.length>256
      ||!Number.isFinite(r.tick_seconds)||r.tick_seconds<0.05||r.tick_seconds>10||!Number.isInteger(r.segments)||r.segments<1||r.segments>32
      ||!Array.isArray(r.roots)||r.roots.length!==r.segments+1||r.roots.some(h=>typeof h!=='string'||!/^[0-9a-f]{64}$/.test(h))
      ||!Number.isSafeInteger(r.logical_end)||r.logical_end<1||r.logical_end>2048)throw new Error('recording metadata bounds');ids.add(r.id);
  }return x;
}
export async function readBytes(url,max,signal,fetcher=globalThis.fetch){
  const response=await fetcher(url,{signal,cache:'no-store',redirect:'error',credentials:'omit'});
  if(!response.ok)throw new Error(`download HTTP ${response.status}`);
  const declared=response.headers.get('content-length');
  if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>max))throw new Error('download byte limit');
  if(!response.body)throw new Error('download body missing');
  const reader=response.body.getReader(),parts=[];let length=0;
  try{while(true){const part=await reader.read();if(part.done)break;length+=part.value.length;if(length>max)throw new Error('download byte limit');parts.push(part.value);}}
  catch(e){await reader.cancel().catch(()=>{});throw e;}finally{reader.releaseLock();}
  const out=new Uint8Array(length);let at=0;for(const p of parts){out.set(p,at);at+=p.length;}return out;
}
export async function loadEntry(recording,index,signal,fetcher=globalThis.fetch){
  if(!Number.isInteger(index)||index<0||index>=recording.roots.length||!/^[-a-z0-9]{1,32}$/.test(recording.id))throw new Error('recording entry');
  const prefix=`./recordings/${recording.id}/${String(index).padStart(3,'0')}`;
  const ticket=await verifyPinnedPublication(await readBytes(prefix+'/catalog.bin',65536,signal,fetcher),recording.roots[index]);
  const artifacts={};
  for(const kind of ['state','render']){
    const assembler=new ArtifactAssembler(ticket,kind);
    for(let n=0;n<assembler.descriptor.chunks.length;n++)await assembler.accept(n,await readBytes(`${prefix}/${kind}-${n}.bin`,16384,signal,fetcher));
    artifacts[kind]=await assembler.finish();
  }
  return {ticket,...artifacts};
}
