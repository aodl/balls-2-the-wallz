/** Optional operational observations. Never game/payment authority or a gross cost meter. */
import {Actor,HttpAgent} from '@icp-sdk/core/agent';
import {Principal} from '@icp-sdk/core/principal';
export const statusInterface=({IDL})=>IDL.Service({canister_status:IDL.Func([IDL.Record({canister_id:IDL.Principal})],[IDL.Record({cycles:IDL.Nat,reserved_cycles:IDL.Nat,idle_cycles_burned_per_day:IDL.Nat,version:IDL.Nat64,module_hash:IDL.Opt(IDL.Vec(IDL.Nat8)),settings:IDL.Record({status_visibility:IDL.Variant({controllers:IDL.Null,public:IDL.Null,allowed_viewers:IDL.Vec(IDL.Principal)})})})],['query'])});
export function publicStatusReader(policy,{fetch=globalThis.fetch.bind(globalThis)}={}){
 if(policy.network!=='ic'||policy.host!=='https://icp-api.io')throw Error('reviewed public-status network required');
 const backend=Principal.fromText(policy.canister_id),ttl=300000;let cached=null;
 // SDK-supported store: one target, same five-minute TTL, no pending IndexedDB open.
 const store={expirationTime:ttl,async get(key){return cached?.key===key&&Date.now()<cached.until?cached.value:undefined;},async set(key,value){cached={key,value,until:Date.now()+ttl};},async delete(key){if(cached?.key===key)cached=null;}};
 return async({signal}={})=>{
  const request=new AbortController(),scoped=signal?AbortSignal.any([signal,request.signal]):request.signal;
  scoped.throwIfAborted();
  // Dedicated request agent: cancellation covers query AND certificate-key fetches,
  // never the authenticated observer's agent. Monitor owns bounded retry/backoff.
  const agent=HttpAgent.createSync({host:policy.host,fetch,fetchOptions:{signal:scoped},retryTimes:0,shouldFetchRootKey:false,shouldSyncTime:false,verifyQuerySignatures:true,subnetNodeKeyExpirableStore:store});
  const actor=Actor.createActor(statusInterface,{agent,canisterId:'aaaaa-aa',effectiveCanisterId:backend});
  try{const value=await actor.canister_status({canister_id:backend});scoped.throwIfAborted();return{...value,backend:backend.toText()};}
  finally{request.abort();} // Also cancel a parallel sibling after an SDK rejection.
 };
}
export function formatCycles(n){
 if(typeof n!=='bigint'||n<0n)return 'Unavailable';
 const digits=n.toString();if(digits.length>18)return `${digits[0]}.${digits.slice(1,3)}e${digits.length-1}`;
 const unit=n>=1000000000000n?[1000000000000n,'T']:n>=1000000000n?[1000000000n,'B']:[1000000n,'M'];return `${n/unit[0]}.${(n%unit[0]*100n/unit[0]).toString().padStart(2,'0')}${unit[1]}`;
}
export function cycleSamples({minimumMs=120000,maximumGapMs=150000,windowMs=600000}={}){
 let samples=[],last=null,reason='Waiting for enough samples';
 const reset=why=>{samples=[];last=null;reason=why;};
 return {reset,accept(s,at){
  if(!Number.isFinite(at)||typeof s.cycles!=='bigint'||s.cycles<0n||typeof s.reserved_cycles!=='bigint'||s.reserved_cycles<0n){reset('Invalid status');return;}
  if(last&&at<=last.at)return;
  const identity=s.backend+'/'+JSON.stringify(s.module_hash,(_,v)=>typeof v==='bigint'?String(v):v),row={at,version:s.version,cycles:s.cycles,reserved:s.reserved_cycles,identity,idle:s.idle_cycles_burned_per_day};
  if(last&&(identity!==last.identity||row.version<last.version||at-last.at>maximumGapMs||row.reserved!==last.reserved||row.cycles>last.cycles))reset('Balance, reserve, module, source, version or sampling gap changed');
  samples.push(row);last=row;while(samples.length>1&&at-samples[0].at>windowMs)samples.shift();while(samples.length>12)samples.shift();
 },view(at){if(!last)return{balance:null,rate:null,label:reason==='Waiting for enough samples'?'Collecting':'Unavailable',reason};if(at-last.at>maximumGapMs)return{balance:last.cycles,rate:null,label:'Stale',reason:'Last sample is too old',idle:last.idle,reserved:last.reserved,ageMs:at-last.at};const first=samples[0],elapsed=last.at-first.at,decline=first.cycles-last.cycles,ready=elapsed>=minimumMs&&decline>=0n;
  return{balance:last.cycles,rate:ready?decline*3600000n/BigInt(Math.round(elapsed)):null,label:ready?'Available':'Collecting',windowMs:elapsed,ageMs:at-last.at,idle:last.idle,reserved:last.reserved,reason:ready?'Observed net decline; hidden credits/refunds cannot be reconstructed':reason};
 }};
}
export function cycleReadout(value){
 const label=['Collecting','Unavailable','Stale','Available'].includes(value.label)?value.label:'Unavailable';
 if(value.balance==null||label==='Unavailable')return{balance:'Unavailable',burn:'Unavailable',detail:'Cycle data temporarily unavailable'};
 return{balance:formatCycles(value.balance)+(label==='Stale'?' · stale':''),burn:label==='Available'&&typeof value.rate==='bigint'&&value.rate>=0n?'~'+formatCycles(value.rate)+'/h':label,
 detail:label==='Available'?`Observed net balance decline over ${Math.round(value.windowMs/1000)} seconds; not gross gameplay cost or a runway guarantee.`:label==='Stale'?'Cycle data temporarily unavailable':'Collecting cycle samples'};
}
export function renderCycleReadout(doc,value){const v=cycleReadout(value),unavailable=value.balance==null||value.label==='Unavailable'||value.label==='Stale';doc.getElementById('cycle-unavailable').hidden=!unavailable;doc.getElementById('cycle-values').hidden=unavailable;for(const[id,key]of[['cycles-balance','balance'],['cycles-burn','burn'],['cycle-detail','detail']])doc.getElementById(id).textContent=v[key];}
export function publicCycleMonitor({read,onState,now=()=>performance.now(),hidden=()=>document.hidden,schedule=setTimeout,cancel=clearTimeout,interval=60000,timeout=12000}={}){
 const meter=cycleSamples();let timer=null,inflight=null,stopped=false,generation=0,failures=0,timerGeneration=0;
 const publish=(label,reason)=>{if(!stopped)onState({...meter.view(now()),rate:null,label,reason});};
 function disarm(){timerGeneration++;cancel(timer);timer=null;}
 function arm(delay=interval){disarm();if(!stopped&&!hidden()){const fence=timerGeneration;timer=schedule(()=>{if(fence!==timerGeneration||stopped||hidden())return;timer=null;void tick();},delay);}}
 async function tick(){
  if(stopped||hidden()||inflight)return;
  const operation={generation,controller:new AbortController(),expired:false,deadline:null};inflight=operation;
  if(meter.view(now()).balance===null)publish('Collecting','Reading optional public status');
  let expire;
  const cancelled=new Promise((_,reject)=>{expire=()=>reject(new DOMException('Telemetry unavailable','AbortError'));operation.controller.signal.addEventListener('abort',expire,{once:true});});
  operation.deadline=schedule(()=>{if(stopped||inflight!==operation)return;operation.expired=true;failures++;if(generation===operation.generation)publish('Unavailable','Cycle data temporarily unavailable');operation.controller.abort();},timeout);
  try{const s=await Promise.race([Promise.resolve().then(()=>read({signal:operation.controller.signal})),cancelled]);if(!stopped&&generation===operation.generation&&!operation.expired&&!operation.controller.signal.aborted){meter.accept(s,now());failures=0;onState(meter.view(now()));}}
  catch{if(!stopped&&generation===operation.generation&&!operation.expired){failures++;publish('Unavailable','Optional public status request failed');}}
  finally{
   operation.controller.signal.removeEventListener('abort',expire);cancel(operation.deadline);if(inflight===operation)inflight=null;
   if(!stopped&&!hidden()){if(generation!==operation.generation){publish('Collecting','Collecting after visibility change');arm(0);}else arm(Math.min(300000,interval*2**Math.min(failures,3)));}
  }
 }
 arm(0);return{visibility(){if(stopped)return;generation++;disarm();meter.reset('Visibility changed; previous window discarded');
  if(inflight)inflight.controller.abort();
  if(hidden())publish('Stale','Telemetry suspended while hidden');
  else if(inflight)publish('Unavailable','Cycle data temporarily unavailable');
  else{publish('Collecting','Collecting after visibility change');arm(0);}
 },stop(){if(stopped)return;stopped=true;generation++;disarm();if(inflight){cancel(inflight.deadline);inflight.controller.abort();}},get busy(){return Boolean(inflight);}};
}
