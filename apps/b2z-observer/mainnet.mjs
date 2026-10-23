import {CONFIGURATION_ASSETS} from './configuration.generated.mjs';
/** B2Z deployment policy and certified source descriptor; no wallet or signing API. */
import {decodeCanonical} from '../../node_modules/@dtr/timeline-runtime/packages/runtime/canonical.mjs';
import {readBytes} from './transport.mjs';
import {Actor,HttpAgent} from '@icp-sdk/core/agent';
import {IDL} from '@icp-sdk/core/candid';
import {Principal} from '@icp-sdk/core/principal';
import {certificateVerifier,liveClient} from '../../node_modules/@dtr/timeline-runtime/packages/client/ic-certificate.mjs';
import {sha256Web} from '../../node_modules/@dtr/timeline-runtime/packages/client/verification.mjs';
export function mainnetPolicy(value){
  if(!value||Object.keys(value).sort().join(',')!=='canister_id,host,network'||value.network!=='ic'||value.host!=='https://icp-api.io')throw new Error('reviewed mainnet deployment policy required');
  const canister_id=Principal.fromText(value.canister_id).toText();
  if(canister_id==='aaaaa-aa'||canister_id==='2vxsx-fae')throw new Error('backend canister required');
  return Object.freeze({network:'ic',host:value.host,canister_id});
}
export async function mainnetConnection(policy){
  policy=mainnetPolicy(policy);
  const agent=await HttpAgent.create({host:policy.host,shouldFetchRootKey:false,shouldSyncTime:false,verifyQuerySignatures:true});
  const base=await liveClient(policy),client=artifactDeliveryClient(agent,policy.canister_id,base);
  return {verifyCertificate:certificateVerifier({network:'ic'}),client,readStatus:operationalReader(agent,policy.canister_id)};
}
function artifactBundleReader(agent,canisterId){
 const actor=Actor.createActor(({IDL})=>IDL.Service({artifact_bundle:IDL.Func([IDL.Nat64,IDL.Text],[IDL.Variant({Ok:IDL.Vec(IDL.Vec(IDL.Nat8)),Err:IDL.Text})],['query'])}),{agent,canisterId});
 return async(segment,publication)=>{const value=await actor.artifact_bundle(BigInt(segment),publication);if(!value.Ok)throw new Error(String(value.Err??'artifact bundle unavailable'));return value.Ok.map(bytes=>Uint8Array.from(bytes));};
}
function artifactDeliveryClient(agent,canisterId,base){
 const bundle=artifactBundleReader(agent,canisterId);
 const actor=Actor.createActor(({IDL})=>IDL.Service({observation_bundle:IDL.Func([],[IDL.Variant({Ok:IDL.Record({observation:IDL.Record({publication:IDL.Vec(IDL.Nat8),certificate:IDL.Opt(IDL.Vec(IDL.Nat8))}),artifacts:IDL.Vec(IDL.Vec(IDL.Nat8))}),Err:IDL.Text})],['query'])}),{agent,canisterId});
 let cached=null,atomicAvailable=true;
 return Object.freeze({...base,
  observation:async()=>{
   let failure;
   for(let attempt=0;atomicAvailable&&attempt<2;attempt++){
    try{
     const result=await actor.observation_bundle();
     if(!result.Ok){failure=new Error(String(result.Err??'observation bundle unavailable'));break;}
     const observation={publication:Uint8Array.from(result.Ok.observation.publication),certificate:result.Ok.observation.certificate.length?Uint8Array.from(result.Ok.observation.certificate[0]):null};
     cached={publication:await sha256Web(observation.publication),artifacts:result.Ok.artifacts.map(bytes=>Uint8Array.from(bytes))};
     return observation;
    }catch(error){failure=error;}
   }
   if(failure)atomicAvailable=false;
   const observation=await base.observation();cached={publication:await sha256Web(observation.publication),failure:failure??new Error('atomic artifact bundle unavailable')};return observation;
  },
  bundle:async(segment,publication)=>{
   if(cached?.publication===publication){const result=cached;cached=null;if(result.failure)throw result.failure;return result.artifacts;}
   return bundle(segment,publication);
  }
 });
}
/** Local acceptance uses the same atomic delivery query with its pinned root. */
export async function artifactBundleClient({network,rootKey,canister_id,host},base){
 if(network!=='pocketic-local'||!(rootKey instanceof Uint8Array)||rootKey.length<32||rootKey.length>1024)throw new Error('configured local bundle root required');
 const agent=await HttpAgent.create({host,rootKey,shouldFetchRootKey:false,shouldSyncTime:false,verifyQuerySignatures:true,retryTimes:1});
 return artifactDeliveryClient(agent,Principal.fromText(canister_id),base);
}
/** Operational query only: never authorizes a payment or a game outcome. */
export function operationalReader(agent,canisterId){
  const actor=Actor.createActor(({IDL})=>IDL.Service({lab_status:IDL.Func([],[IDL.Variant({Err:IDL.Text,Ok:IDL.Record({
    run:IDL.Record({completed_segments:IDL.Nat64,segment_ticks:IDL.Nat64,publication_ticks:IDL.Opt(IDL.Nat64),running:IDL.Bool,idle:IDL.Opt(IDL.Bool),world_transition:IDL.Opt(IDL.Bool),pace:IDL.Opt(IDL.Record({mode:IDL.Text,nominal_milli:IDL.Nat32,supported_milli:IDL.Opt(IDL.Nat32),performance_limited:IDL.Opt(IDL.Bool),admission_open:IDL.Bool})),last_error:IDL.Opt(IDL.Text)}),
    source:IDL.Record({binding_checked:IDL.Bool,last_error:IDL.Opt(IDL.Text),pending_records:IDL.Nat32,admitted_to_exclusive:IDL.Nat64})
  })})],['query'])}),{agent,canisterId});
  return async()=>{const r=await actor.lab_status();if(!r.Ok)throw new Error('status unavailable');r.Ok.run.idle=r.Ok.run.idle?.[0]??false;r.Ok.run.world_transition=r.Ok.run.world_transition?.[0]??false;r.Ok.run.publication_ticks=r.Ok.run.publication_ticks?.[0]??r.Ok.run.segment_ticks;r.Ok.run.pace=r.Ok.run.pace?.[0]??{mode:'Legacy',nominal_milli:500,admission_open:true};r.Ok.run.pace.supported_milli=r.Ok.run.pace.supported_milli?.[0]??r.Ok.run.pace.nominal_milli;r.Ok.run.pace.performance_limited=r.Ok.run.pace.performance_limited?.[0]??false;return r.Ok;};
}
export async function certifiedSource(policy,ticket){
  policy=mainnetPolicy(policy);
  const agent=await HttpAgent.create({host:policy.host,shouldFetchRootKey:false,shouldSyncTime:false,verifyQuerySignatures:true});
  const actor=Actor.createActor(({IDL})=>IDL.Service({source_descriptor:IDL.Func([],[IDL.Variant({Ok:IDL.Vec(IDL.Nat8),Err:IDL.Text})],['query'])}),{agent,canisterId:policy.canister_id});
  const result=await actor.source_descriptor();if(!result.Ok)throw new Error('source descriptor unavailable');
  const bytes=Uint8Array.from(result.Ok);
  return verifiedSourceDescriptor(bytes,ticket,{network:'ic',canister_id:policy.canister_id,ledger:'ryjl3-tyaaa-aaaaa-aaaba-cai',index:'qhbym-qaaaa-aaaaa-aaafq-cai'});
}
/** Same descriptor binding for the explicit local acceptance build. No root policy. */
export async function verifiedSourceDescriptor(bytes,ticket,expected){
  if(await sha256Web(bytes)!==ticket.publication.identity.source_id)throw new Error('source descriptor not bound by certified publication');
  const [domain,network,ledger,index,owner,subaccount,recipient]=IDL.decode([IDL.Text,IDL.Text,IDL.Principal,IDL.Principal,IDL.Principal,IDL.Nat64,IDL.Text],bytes);
  if(domain!=='BTZ-ICP-INDEX-01'||network!==expected.network||owner.toText()!==expected.canister_id||ledger.toText()!==expected.ledger||index.toText()!==expected.index||!/^[0-9a-f]{64}$/.test(recipient))throw new Error('source deployment mismatch');
  return Object.freeze({network,ledger:ledger.toText(),index:index.toText(),owner:owner.toText(),subaccount,recipient});
}

export async function certifiedConfiguration(ticket){
  const name=CONFIGURATION_ASSETS[ticket.publication.identity.config_hash];
  if(!name)throw new Error('configuration not bound: unsupported profile');
  const bytes=await readBytes(new URL('./'+name,import.meta.url),65536,AbortSignal.timeout(10000));
  if(await sha256Web(bytes)!==ticket.publication.identity.config_hash)throw new Error('configuration not bound by certified publication');
  return decodeCanonical(bytes);
}
