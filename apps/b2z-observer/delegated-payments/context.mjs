/** Re-derive every spending field from latest verified state, never from DOM. */
import{Principal}from'@icp-sdk/core/principal';import{sha256 as sha256Bytes}from'@noble/hashes/sha2.js';import{encodeCanonical}from'@dtr/timeline-runtime/runtime/canonical';
import{DELEGATION_IDENTITY}from'../torus-identity.generated.mjs';import{validateAuthorization}from'../../../packages/kernels/b2z/delegation-v8.mjs';import{icpAccount}from'../../../packages/protocol/delegation.mjs';import{parseV6TextMemo}from'../../../packages/protocol/memo-v6.mjs';
import{paymentDestination}from'../identity.mjs';import{prepareQuoteV6}from'../action-quote-v6.mjs';import{freshObservation}from'../warm-return.mjs';import{makeIntent}from'./intents.mjs';import{ICP_LEDGER}from'./ledger.mjs';
const hex=b=>Array.from(b,v=>v.toString(16).padStart(2,'0')).join('');
const sha256=b=>hex(sha256Bytes(b));
export function explicitFunding(account){if(!account?.owner||Principal.fromText(account.owner).toText()!==account.owner)throw Error('FUNDING_OWNER_REQUIRED');const subaccount=account.subaccount??'00'.repeat(32);if(!/^[a-f0-9]{64}$/.test(subaccount))throw Error('FUNDING_SUBACCOUNT');return{owner:account.owner,subaccount};}
export function actionFromMemo(memo){const bytes=new TextEncoder().encode(memo),c=parseV6TextMemo(bytes),p=memo.split(' ');if(c.kind==='fire')return{kind:'fire',cannon:c.cannon,angle:p[2],quantity:c.quantity,cell:null};if(c.kind==='move_cannon')return{kind:'move',cannon:c.cannon,cell:c.cell,quantity:1};if(c.kind==='new')return{kind:'new',angle:p[1],quantity:c.quantity,cell:c.cell??null};throw Error('MODERN_GAMEPLAY_MEMO_REQUIRED');}
export function verifiedPayment(session,funding,spender,packet,{canPrepare,now=performance.now(),wallNow=Date.now(),localTest=false}={}){
 if(!canPrepare||!session?.ready||session.error||!freshObservation(session,now,wallNow))throw Error('VERIFIED_PAYMENT_UNAVAILABLE');
 const publication=session.sequence?.last?.publication,identity=publication?.identity;
 if(!identity||Object.keys(DELEGATION_IDENTITY).some(k=>identity[k]!==DELEGATION_IDENTITY[k]))throw Error('GAME_DELEGATION_NOT_ACTIVE');
 if(sha256(encodeCanonical(session.config))!==DELEGATION_IDENTITY.config_hash)throw Error('PAYMENT_CONFIGURATION_BINDING');
 const source=session.source;if(source.network!=='ic'&&!(localTest&&source.network==='pocketic-local')||source.network==='ic'&&source.ledger!==ICP_LEDGER)throw Error('PAYMENT_LEDGER_BINDING');
 const destination=paymentDestination(source);if(destination.primary!==source.owner||BigInt(source.subaccount)!==0n)throw Error('DEFAULT_GAME_ACCOUNT_REQUIRED');
 const from=explicitFunding(funding),a=icpAccount(from.owner,Uint8Array.from(from.subaccount.match(/../g),h=>parseInt(h,16))),s=Principal.fromText(spender);if(s.toUint8Array().length!==29||s.toUint8Array()[28]!==2||s.toText()!==spender)throw Error('USER_SPENDER_REQUIRED');
 const auth=session.referenceWorld?.playability?.authorization;validateAuthorization(auth);if(auth.recipient!==destination.legacy)throw Error('AUTH_RECIPIENT_BINDING');const g=auth.grants.find(g=>g.account===a&&g.spender_principal===hex(s.toUint8Array()));
 const nowNs=BigInt(Math.floor(wallNow))*1000000n,certNs=BigInt(session.certificateTimeNs);if(!g||g.expires_at_ns<=nowNs||g.expires_at_ns<=certNs)throw Error('GAME_ACCESS_EXPIRED_OR_UNAUTHORIZED');
 if(!packet||packet.reason||packet.account!==a||packet.backend!==source.owner||packet.network!==source.network||packet.owner!==source.owner||packet.recipient!==destination.legacy||packet.subaccount!=='0')throw Error('PAYMENT_PACKET_SCOPE');
 const command=actionFromMemo(packet.memo),quote=prepareQuoteV6(session.referenceWorld,session.config,a,command);
 if(quote.memo!==packet.memo||BigInt(packet.amount)!==quote.amount||hex(quote.memo_bytes)!==packet.hex)throw Error('PAYMENT_QUOTE_CHANGED');
 if(command.kind==='new'&&session.referenceWorld.cannons.some(c=>c.account===a)&&command.cell===null)throw Error('CHOOSE_BUILD_SITE');
 const key=sha256(encodeCanonical({network:source.network,ledger:source.ledger,backend:source.owner,from,spender,to:source.owner,amount:quote.amount,memo:hex(quote.memo_bytes)}));
 return{from,spender,to:{owner:source.owner,subaccount:'00'.repeat(32)},network:source.network,ledger:source.ledger,backend:source.owner,amount:String(quote.amount),memo:hex(quote.memo_bytes),quote:key,grant_position:String(g.activation_position),verified_root:session.root};
}
export function paymentIntent(verified,fee,createdAtNs,options){return makeIntent({...verified,fee:String(fee),created_at_time:String(createdAtNs)},options);}

export function verifyGameReceipt(session,intent,receipt){
 if(!session?.ready||session.error||!receipt||session.receipts?.get(String(intent.index))!==receipt)throw Error('VERIFIED_GAME_RECEIPT_REQUIRED');
 const source=session.source,a=icpAccount(intent.from.owner,Uint8Array.from(intent.from.subaccount.match(/../g),h=>parseInt(h,16))),t=receipt.transfer;
 if(source.owner!==intent.backend||source.ledger!==intent.ledger||source.network!==intent.network||String(receipt.position)!==intent.index||receipt.account!==a||receipt.spender!==icpAccount(intent.spender)||String(receipt.amount)!==intent.amount||!t||t.to!==icpAccount(intent.backend)||String(t.fee)!==intent.fee||t.memo!==intent.memo||String(t.created_at_ns)!==intent.created_at_time)throw Error('GAME_RECEIPT_INTENT_MISMATCH');
 return true;
}
