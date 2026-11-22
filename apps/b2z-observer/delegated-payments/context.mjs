/** Re-derive every spending field from latest verified state, never from DOM. */
import{Principal}from'@icp-sdk/core/principal';import{sha256 as sha256Bytes}from'@noble/hashes/sha2.js';import{encodeCanonical}from'@dtr/timeline-runtime/runtime/canonical';
import{DELEGATED_IDENTITY,ECONOMY_IDENTITY}from'../torus-identity.generated.mjs';import{icpAccount}from'../../../packages/protocol/delegation.mjs';import{quoteForMemo}from'./quote.mjs';
import{paymentDestination}from'../identity.mjs';import{explicitFunding}from'./funding.mjs';import{freshObservation}from'../warm-return.mjs';import{makeIntent}from'./intents.mjs';import{ICP_LEDGER}from'./ledger.mjs';
const hex=b=>Array.from(b,v=>v.toString(16).padStart(2,'0')).join('');
const sha256=b=>hex(sha256Bytes(b));
export {explicitFunding};
/** Authentication may be rehearsed on the certified Rules17 predecessor. It
 * never makes a spending control available before the exact Rules18 epoch. */
export function verifiedPaymentSource(session,{now=performance.now(),wallNow=Date.now(),localTest=false,predecessor=false}={}){
 if(!session?.ready||session.error||session.root!==session.freshnessRoot||!freshObservation(session,now,wallNow))throw Error('VERIFIED_PAYMENT_UNAVAILABLE');
 const identity=session.sequence?.last?.publication?.identity;
 const matches=expected=>Object.keys(expected).every(k=>identity?.[k]===expected[k]);
 const active=matches(DELEGATED_IDENTITY);
 if(!active&&(!predecessor||!matches(ECONOMY_IDENTITY)))throw Error('GAME_DELEGATION_NOT_ACTIVE');
 if(sha256(encodeCanonical(session.config))!==identity.config_hash)throw Error('PAYMENT_CONFIGURATION_BINDING');
 const source=session.source;
 if(!source||source.network!=='ic'&&!(localTest&&source.network==='pocketic-local')||
    source.network==='ic'&&source.ledger!==ICP_LEDGER)throw Error('PAYMENT_LEDGER_BINDING');
 const destination=paymentDestination(source);
 if(destination.primary!==source.owner||BigInt(source.subaccount)!==0n)throw Error('DEFAULT_GAME_ACCOUNT_REQUIRED');
 if(active&&session.referenceWorld?.authorization?.recipient!==destination.legacy)throw Error('AUTH_RECIPIENT_BINDING');
 return {source,destination,active};
}
export function verifiedGameAccess(session,funding,spender,{now=performance.now(),wallNow=Date.now(),localTest=false}={}){
 const {source,destination}=verifiedPaymentSource(session,{now,wallNow,localTest});
 const from=explicitFunding(funding),a=icpAccount(from.owner,Uint8Array.from(from.subaccount.match(/../g),h=>parseInt(h,16))),s=Principal.fromText(spender);if(s.toUint8Array().length!==29||s.toUint8Array()[28]!==2||s.toText()!==spender)throw Error('USER_SPENDER_REQUIRED');
 const auth=session.referenceWorld.authorization,g=auth.grants[a];
 const nowNs=BigInt(Math.floor(wallNow))*1000000n,certNs=BigInt(session.certificateTimeNs);if(!g||g.spender_principal!==hex(s.toUint8Array())||g.expires_at_ns<=nowNs||g.expires_at_ns<=certNs)throw Error('GAME_ACCESS_EXPIRED_OR_UNAUTHORIZED');
 return{from,account:a,grant:g,source,destination};
}
export function verifiedPayment(session,funding,spender,packet,{canPrepare,...options}={}){
 if(!canPrepare)throw Error('VERIFIED_PAYMENT_UNAVAILABLE');
 const{from,account:a,grant:g,source,destination}=verifiedGameAccess(session,funding,spender,options);
 if(!packet||packet.reason||packet.account!==a||packet.backend!==source.owner||packet.network!==source.network||packet.owner!==source.owner||packet.recipient!==destination.legacy||packet.subaccount!=='0'||packet.rules!==18||packet.snapshot!==session.root)throw Error('PAYMENT_PACKET_SCOPE');
 const quote=quoteForMemo(session.referenceWorld,session.config,a,packet.memo,BigInt(session.certificateTimeNs));
 if(quote.memo!==packet.memo||BigInt(packet.amount)!==quote.amount||hex(quote.memo_bytes)!==packet.hex)throw Error('PAYMENT_QUOTE_CHANGED');
 const key=sha256(encodeCanonical({network:source.network,ledger:source.ledger,backend:source.owner,from,spender,to:source.owner,amount:quote.amount,memo:hex(quote.memo_bytes)}));
 return{from,spender,to:{owner:source.owner,subaccount:'00'.repeat(32)},network:source.network,ledger:source.ledger,backend:source.owner,amount:String(quote.amount),memo:hex(quote.memo_bytes),quote:key,grant_position:String(g.activation_position),verified_root:session.root};
}
/** A quote hash is a reference, not proof that an intent body retained its payer. */
export function assertIntentAuthority(verified,intent){
 for(const key of['network','ledger','backend','spender','amount','memo','quote','grant_position'])if(verified[key]!==intent[key])throw Error('PAYMENT_INTENT_AUTHORITY_CHANGED');
 for(const key of['from','to'])if(verified[key].owner!==intent[key]?.owner||verified[key].subaccount!==intent[key]?.subaccount)throw Error('PAYMENT_INTENT_AUTHORITY_CHANGED');
 return true;
}
export function paymentIntent(verified,fee,createdAtNs,options){return makeIntent({...verified,fee:String(fee),created_at_time:String(createdAtNs)},options);}

export function verifyGameReceipt(session,intent,receipt){
 if(!session?.ready||session.error||!receipt||session.receipts?.get(String(intent.index))!==receipt)throw Error('VERIFIED_GAME_RECEIPT_REQUIRED');
 const source=session.source,a=icpAccount(intent.from.owner,Uint8Array.from(intent.from.subaccount.match(/../g),h=>parseInt(h,16))),t=receipt.transfer;
 if(source.owner!==intent.backend||source.ledger!==intent.ledger||source.network!==intent.network||String(receipt.position)!==intent.index||receipt.account!==a||receipt.spender!==icpAccount(intent.spender)||String(receipt.amount)!==intent.amount||!t||t.to!==icpAccount(intent.backend)||String(t.fee)!==intent.fee||t.memo!==intent.memo||String(t.created_at_ns)!==intent.created_at_time)throw Error('GAME_RECEIPT_INTENT_MISMATCH');
 return true;
}
