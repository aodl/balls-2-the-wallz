// The IC certificate verifier remains responsible for the trusted network,
// delegation, time and canister path. This binds both leaves of its typed root.
const DOMAIN=new TextEncoder().encode('B2Z-CERTIFIED-OPERATIONAL-01');
const MINUTE=60_000_000_000n;
const digest=async bytes=>new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
const hex=bytes=>Array.from(bytes,value=>value.toString(16).padStart(2,'0')).join('');

export function decodeBurnRecord(record,certifiedAt){
 if(!(record instanceof Uint8Array)||record.length!==35||record[0]!==1||typeof certifiedAt!=='bigint')
  throw Error('Invalid certified operational burn record');
 const quality=record[1],sampleCount=record[2],view=new DataView(record.buffer,record.byteOffset,record.byteLength);
 const start=view.getBigUint64(3),end=view.getBigUint64(11),perDay=(view.getBigUint64(19)<<64n)+view.getBigUint64(27);
 if(quality===0&&sampleCount===0&&start===0n&&end===0n&&perDay===0n)return null;
 const span=end-start;
 if(quality<1||quality>3||sampleCount<2||sampleCount>13||start===0n||span<5n*MINUTE||span>60n*MINUTE||
    end>certifiedAt||quality===2&&span<55n*MINUTE||quality===1&&span>=55n*MINUTE)
  throw Error('Invalid certified operational burn fields');
 const stale=quality===3||certifiedAt-end>12n*MINUTE;
 const kind=stale?'stale':quality===1?'preliminary':'established';
 return {quality:kind,cyclesPerDay:perDay,sampleCount,startNs:start,endNs:end,
  detail:'Certified settled net estimate. '+(stale?'Last valid measurement is stale.':kind==='preliminary'?'Preliminary window.':'Established rolling window.')};
}

export async function bindOperationalBurn(publication,record,claim){
 if(record===null||record===undefined)return {claim,burn:null};
 const burn=decodeBurnRecord(record,claim.certificate_time_ns);
 const publicationDigest=await digest(publication),recordDigest=await digest(record);
 const envelope=new Uint8Array(DOMAIN.length+64);
 envelope.set(DOMAIN);
 envelope.set(publicationDigest,DOMAIN.length);
 envelope.set(recordDigest,DOMAIN.length+32);
 if(hex(await digest(envelope))!==claim.certified_data_hex)
  throw Error('Certified operational burn root mismatch');
 // DTR continues to verify the same canonical publication digest and chain.
 return {claim:{...claim,certified_data_hex:hex(publicationDigest)},burn};
}
