// Authentication evidence for the explicitly labeled disposable PocketIC clock.
import {readFileSync} from 'node:fs';
import {certificateVerifier} from '@dtr/timeline-runtime/client/ic-certificate';
import {verifyCertificatePublication} from '@dtr/timeline-runtime/client/verification';
import {bindOperationalBurn} from '../apps/b2z-observer/operational-burn.mjs';

const fixture=JSON.parse(readFileSync(process.argv[2],'utf8'));
const now=BigInt(fixture.at);
Date.now=()=>Number(now/1_000_000n);
const deployment={network:'pocketic-local',canister_id:fixture.id};
const verify=certificateVerifier({network:deployment.network,rootKey:Buffer.from(fixture.root_key,'hex')});
const policy={...deployment,now_ns:now,max_age_ns:300_000_000_000n,max_future_ns:30_000_000_000n};
let burn=null;
const publication=Buffer.from(fixture.publication,'hex'),certificate=Buffer.from(fixture.certificate,'hex');
const record=fixture.record===null?null:Buffer.from(fixture.record,'hex');
const ticket=await verifyCertificatePublication(publication,certificate,policy,async(cert,scope)=>{
 const envelope=await bindOperationalBurn(publication,record,await verify(cert,scope));
 burn=envelope.burn;
 return envelope.claim;
});
if(record){
 const tampered=Uint8Array.from(record);
 tampered[34]^=1;
 const claim=await verify(certificate,deployment);
 let rejected=false;
 try{await bindOperationalBurn(publication,tampered,claim);}catch{rejected=true;}
 if(!rejected)throw Error('Altered operational witness accepted');
 let wrong=false;
 try{
  await verifyCertificatePublication(publication,certificate,{...policy,canister_id:'aaaaa-aa'},verify);
 }catch{wrong=true;}
 if(!wrong)throw Error('Wrong canister binding accepted');
}
console.log(JSON.stringify({publication:ticket.root_hash,burn},(_,value)=>typeof value==='bigint'?value.toString():value));
