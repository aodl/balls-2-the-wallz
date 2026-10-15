/** BTZ deployment policy and certified source descriptor; no wallet or signing API. */
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
  return {verifyCertificate:certificateVerifier({network:'ic'}),client:await liveClient(policy),readStatus:operationalReader(agent,policy.canister_id)};
}
/** Operational query only: never authorizes a payment or a game outcome. */
export function operationalReader(agent,canisterId){
  const actor=Actor.createActor(({IDL})=>IDL.Service({lab_status:IDL.Func([],[IDL.Variant({Err:IDL.Text,Ok:IDL.Record({
    run:IDL.Record({running:IDL.Bool,last_error:IDL.Opt(IDL.Text)}),
    source:IDL.Record({binding_checked:IDL.Bool,last_error:IDL.Opt(IDL.Text),pending_records:IDL.Nat32,admitted_to_exclusive:IDL.Nat64})
  })})],['query'])}),{agent,canisterId});
  return async()=>{const r=await actor.lab_status();if(!r.Ok)throw new Error('status unavailable');return r.Ok;};
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
  const bytes=await readBytes(new URL('./configuration.bin',import.meta.url),65536,AbortSignal.timeout(10000));
  if(await sha256Web(bytes)!==ticket.publication.identity.config_hash)throw new Error('configuration not bound by certified publication');
  return decodeCanonical(bytes);
}
