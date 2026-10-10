/** Standard IC certificate verification for an explicitly configured network.
 *
 * The root key is supplied by the deployment harness. This module never asks
 * an endpoint for a replacement root key and never disables time checks.
 */
import {Certificate,lookupResultToBuffer} from '@icp-sdk/core/agent';
import {Principal} from '@icp-sdk/core/principal';
import {hex} from '../protocol/bytes.mjs';

function unsignedLeb128(bytes){
  if(!(bytes instanceof Uint8Array)||bytes.length===0||bytes.length>10)throw new Error('certificate time encoding');
  let value=0n,shift=0n;
  for(let i=0;i<bytes.length;i++){
    const byte=bytes[i];value|=BigInt(byte&0x7f)<<shift;
    if((byte&0x80)===0){if(i!==bytes.length-1||value>=(1n<<64n))throw new Error('certificate time encoding');return value;}
    shift+=7n;
  }
  throw new Error('certificate time encoding');
}

export function localCertificateVerifier(rootKey,{network='pocketic-local',maxAgeInMinutes=5}={}){
  if(!(rootKey instanceof Uint8Array)||rootKey.length<32||rootKey.length>1024)throw new Error('configured root key bounds');
  const pinnedRoot=Uint8Array.from(rootKey);
  if(network!=='pocketic-local'||!Number.isFinite(maxAgeInMinutes)||maxAgeInMinutes<=0||maxAgeInMinutes>10)
    throw new Error('local certificate policy');
  return async (certificateBytes,deployment)=>{
    if(deployment.network!==network)throw new Error('certificate network mismatch');
    const canister=Principal.fromText(deployment.canister_id);
    const certificate=await Certificate.create({
      certificate:certificateBytes,
      rootKey:pinnedRoot,
      principal:{canisterId:canister},
      maxAgeInMinutes,
    });
    const certified=lookupResultToBuffer(certificate.lookup_path(['canister',canister.toUint8Array(),'certified_data']));
    const time=lookupResultToBuffer(certificate.lookup_path(['time']));
    if(!(certified instanceof Uint8Array)||certified.length!==32||!(time instanceof Uint8Array))
      throw new Error('certificate required path missing');
    return {canister_id:canister.toText(),network,certified_data_hex:hex(certified),certificate_time_ns:unsignedLeb128(time)};
  };
}
