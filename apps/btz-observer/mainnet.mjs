/** BTZ deployment policy and certified source descriptor; no wallet or signing API. */
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
  return {verifyCertificate:certificateVerifier({network:'ic'}),client:await liveClient(policy)};
}
export async function certifiedSource(policy,ticket){
  policy=mainnetPolicy(policy);
  const agent=await HttpAgent.create({host:policy.host,shouldFetchRootKey:false,shouldSyncTime:false,verifyQuerySignatures:true});
  const actor=Actor.createActor(({IDL})=>IDL.Service({source_descriptor:IDL.Func([],[IDL.Variant({Ok:IDL.Vec(IDL.Nat8),Err:IDL.Text})],['query'])}),{agent,canisterId:policy.canister_id});
  const result=await actor.source_descriptor();if(!result.Ok)throw new Error('source descriptor unavailable');
  const bytes=Uint8Array.from(result.Ok);
  if(await sha256Web(bytes)!==ticket.publication.identity.source_id)throw new Error('source descriptor not bound by certified publication');
  const [domain,network,ledger,index,owner,subaccount,recipient]=IDL.decode([IDL.Text,IDL.Text,IDL.Principal,IDL.Principal,IDL.Principal,IDL.Nat64,IDL.Text],bytes);
  if(domain!=='BTZ-ICP-INDEX-01'||network!=='ic'||owner.toText()!==policy.canister_id||ledger.toText()!=='ryjl3-tyaaa-aaaaa-aaaba-cai'||index.toText()!=='qhbym-qaaaa-aaaaa-aaafq-cai'||!/^[0-9a-f]{64}$/.test(recipient))throw new Error('source deployment mismatch');
  return Object.freeze({network,ledger:ledger.toText(),index:index.toText(),owner:owner.toText(),subaccount,recipient});
}
