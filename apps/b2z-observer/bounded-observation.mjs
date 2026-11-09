/** Read-only transport deadline for the existing IC query ABI. Verification stays in DTR.
 * No global fetch changes: only this observation connection owns cancellation. */
import {Actor,HttpAgent} from '@icp-sdk/core/agent';
import {IDL} from '@icp-sdk/core/candid';
import {certificateRoot} from '@dtr/timeline-runtime/client/ic-certificate';
export function observationFetch(fetch=globalThis.fetch.bind(globalThis),signal,timeout=10000){
 return (input,init={})=>fetch(input,{...init,signal:AbortSignal.any([AbortSignal.timeout(timeout),...(signal?[signal]:[]),...(init.signal?[init.signal]:[])])});
}
export const observationInterface=()=>{const result=ok=>IDL.Variant({Ok:ok,Err:IDL.Text}),observation=IDL.Record({publication:IDL.Vec(IDL.Nat8),certificate:IDL.Opt(IDL.Vec(IDL.Nat8))});return IDL.Service({observation:IDL.Func([],[result(observation)],['query']),artifact_chunk:IDL.Func([IDL.Text,IDL.Nat8,IDL.Nat16],[result(IDL.Vec(IDL.Nat8))],['query']),retained_publication:IDL.Func([IDL.Nat64],[result(IDL.Vec(IDL.Nat8))],['query']),retained_artifact_chunk:IDL.Func([IDL.Nat64,IDL.Text,IDL.Nat8,IDL.Nat16],[result(IDL.Vec(IDL.Nat8))],['query'])});};
export async function boundedObservationClient(policy,{signal,fetch}={}){
 if(policy.network==='ic'&&policy.host!=='https://icp-api.io')throw Error('reviewed observation endpoint required');
 const agent=await HttpAgent.create({host:policy.host,rootKey:certificateRoot(policy),shouldFetchRootKey:false,shouldSyncTime:false,verifyQuerySignatures:true,retryTimes:1,fetch:observationFetch(fetch,signal)}),actor=Actor.createActor(observationInterface,{agent,canisterId:policy.canister_id});
 const unwrap=v=>{if(!Object.hasOwn(v,'Ok'))throw Error(String(v.Err));return v.Ok;},bytes=v=>Uint8Array.from(unwrap(v)),safe=n=>{if(!Number.isSafeInteger(n)||n<0)throw Error('invalid query index');return n;};
 return {async observation(){const v=unwrap(await actor.observation());return{publication:Uint8Array.from(v.publication),certificate:v.certificate.length?Uint8Array.from(v.certificate[0]):null};},async publication(n){return bytes(await actor.retained_publication(BigInt(safe(n))));},async currentChunk(hash,kind,index){return bytes(await actor.artifact_chunk(hash,safe(kind),safe(index)));},async chunk(n,hash,kind,index){return bytes(await actor.retained_artifact_chunk(BigInt(safe(n)),hash,safe(kind),safe(index)));}};
}
