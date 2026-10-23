/** LOCAL_DEPLOYMENT_TEST_ONLY. Included solely by explicit acceptance-build option. */
import {HttpAgent,Actor} from '@icp-sdk/core/agent';
import {IDL} from '@icp-sdk/core/candid';
import {Principal} from '@icp-sdk/core/principal';
import {certificateVerifier,liveClient} from '@dtr/timeline-runtime/client/ic-certificate';
import {verifiedSourceDescriptor,operationalReader,artifactBundleClient} from '../../apps/b2z-observer/mainnet.mjs';
export function deploymentPolicy(value){
 const endpoint=new URL(value.host);
 if(value.network!=='pocketic-local'||endpoint.protocol!=='http:'||!['localhost','127.0.0.1'].includes(endpoint.hostname)||endpoint.username||endpoint.password||!/^([0-9a-f]{2}){32,1024}$/.test(value.root_key_hex))throw new Error('explicit loopback test deployment required');
 for(const name of ['canister_id','ledger','index'])Principal.fromText(value[name]);
 return Object.freeze({...value});
}
const root=p=>Uint8Array.from(p.root_key_hex.match(/../g),x=>parseInt(x,16));
export async function deploymentConnection(value){
 const p=deploymentPolicy(value),rootKey=root(p);
 const agent=await HttpAgent.create({host:p.host,rootKey,shouldFetchRootKey:false,shouldSyncTime:false,verifyQuerySignatures:true});
 const base=await liveClient({...p,rootKey}),client=await artifactBundleClient({...p,rootKey},base);
 return {verifyCertificate:certificateVerifier({network:p.network,rootKey}),client,readStatus:operationalReader(agent,p.canister_id)};
}
export async function deploymentSource(value,ticket){
 const p=deploymentPolicy(value);
 const agent=await HttpAgent.create({host:p.host,rootKey:root(p),shouldFetchRootKey:false,shouldSyncTime:false,verifyQuerySignatures:true});
 const actor=Actor.createActor(({IDL})=>IDL.Service({source_descriptor:IDL.Func([],[IDL.Variant({Ok:IDL.Vec(IDL.Nat8),Err:IDL.Text})],['query'])}),{agent,canisterId:p.canister_id});
 const reply=await actor.source_descriptor();if(!reply.Ok)throw new Error('source descriptor unavailable');
 return verifiedSourceDescriptor(Uint8Array.from(reply.Ok),ticket,p);
}
