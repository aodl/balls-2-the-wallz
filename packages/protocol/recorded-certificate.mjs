/** Historical evidence only. Reuses the SDK verifier with an explicit recorded clock.
 * Never selected for a live observation or as a fallback after verification failure. */
import {Certificate,lookupResultToBuffer} from '@icp-sdk/core/agent';
import {Principal} from '@icp-sdk/core/principal';
import {certificateRoot} from '@dtr/timeline-runtime/client/ic-certificate';
export function recordedCertificateVerifier({network,rootKey,recordedNs}){
 const root=certificateRoot({network,rootKey});
 if(typeof recordedNs!=='bigint'||recordedNs<0n)throw Error('Recorded certificate time required');
 const virtualAgent={getTimeDiffMsecs:()=>Number(recordedNs/1000000n)-Date.now(),hasSyncedTime:()=>true,syncTime:async()=>{throw Error('Explicit recorded clock');}};
 return async(bytes,deployment)=>{
  if(deployment.network!==network)throw Error('certificate network mismatch');
  const canister=Principal.fromText(deployment.canister_id),cert=await Certificate.create({certificate:bytes,rootKey:root,principal:{canisterId:canister},maxAgeInMinutes:5,agent:virtualAgent});
  const data=lookupResultToBuffer(cert.lookup_path(['canister',canister.toUint8Array(),'certified_data'])),time=lookupResultToBuffer(cert.lookup_path(['time']));
  if(!(data instanceof Uint8Array)||data.length!==32||!(time instanceof Uint8Array)||!time.length||time.length>10)throw Error('certificate required path missing');
  let ns=0n,shift=0n,done=false;for(let i=0;i<time.length;i++){const byte=time[i];ns|=BigInt(byte&127)<<shift;if(!(byte&128)){if(i!==time.length-1)throw Error('certificate time encoding');done=true;break;}shift+=7n;}
  if(!done||ns>=1n<<64n)throw Error('certificate time encoding');
  return{network,canister_id:canister.toText(),certified_data_hex:Buffer.from(data).toString('hex'),certificate_time_ns:ns};
 };
}
