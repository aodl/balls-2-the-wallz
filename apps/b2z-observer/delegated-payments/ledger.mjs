/** Signed ICP Ledger calls only. Dedicated bounded agents never touch the observer. */
import{Actor,HttpAgent}from'@icp-sdk/core/agent';import{Principal}from'@icp-sdk/core/principal';import{strategy}from'@icp-sdk/core/agent';
import{validateIntent,intentRequest}from'./intents.mjs';
export const ICP_LEDGER='ryjl3-tyaaa-aaaaa-aaaba-cai';
export const ledgerInterface=({IDL})=>{
 const account=IDL.Record({owner:IDL.Principal,subaccount:IDL.Opt(IDL.Vec(IDL.Nat8))}),nat=IDL.Nat,n64=IDL.Nat64;
 const error=IDL.Variant({BadFee:IDL.Record({expected_fee:nat}),BadBurn:IDL.Record({min_burn_amount:nat}),InsufficientFunds:IDL.Record({balance:nat}),InsufficientAllowance:IDL.Record({allowance:nat}),TooOld:IDL.Null,CreatedInFuture:IDL.Record({ledger_time:n64}),Duplicate:IDL.Record({duplicate_of:nat}),TemporarilyUnavailable:IDL.Null,GenericError:IDL.Record({error_code:nat,message:IDL.Text})});
 return IDL.Service({icrc1_fee:IDL.Func([],[nat],['query']),icrc2_allowance:IDL.Func([IDL.Record({account,spender:account})],[IDL.Record({allowance:nat,expires_at:IDL.Opt(n64)})],['query']),icrc2_transfer_from:IDL.Func([IDL.Record({spender_subaccount:IDL.Opt(IDL.Vec(IDL.Nat8)),from:account,to:account,amount:nat,fee:IDL.Opt(nat),memo:IDL.Opt(IDL.Vec(IDL.Nat8)),created_at_time:IDL.Opt(n64)})],[IDL.Variant({Ok:nat,Err:error})],[])});
};
export function assertSpender(identity,spender,ledger,now=BigInt(Date.now())*1000000n){
 const actual=identity.getPrincipal();if(actual.toText()!==spender||actual.isAnonymous())throw Error('SIGNED_SPENDER_MISMATCH');
 const chain=identity.getDelegation?.();if(chain)for(const {delegation}of chain.delegations){if(delegation.expiration<=now||delegation.targets&&!delegation.targets.some(p=>p.toText()===ledger))throw Error('SIGNING_DELEGATION_SCOPE_OR_EXPIRY');}
 return actual;
}
export function signedLedger({policy,identity,spender,checkIntent,fetch=globalThis.fetch.bind(globalThis),timeoutMs=45000,localTest=false}){
 if(policy.network==='ic'){if(policy.ledger!==ICP_LEDGER||policy.host!=='https://icp-api.io'||policy.root_key_hex!==undefined)throw Error('PAYMENT_NETWORK_POLICY');}
 else if(!localTest||policy.network!=='pocketic-local'||!/^http:\/\/(localhost|127\.0\.0\.1):[0-9]+\/?$/.test(policy.host)||!/^[0-9a-f]+$/.test(policy.root_key_hex??''))throw Error('PAYMENT_NETWORK_POLICY');
 if(!Number.isFinite(timeoutMs)||timeoutMs<=0||timeoutMs>60000)throw Error('PAYMENT_DEADLINE');
 let busy=false,active=null,cached=null;const ttl=300000;
 const keyStore={expirationTime:ttl,async get(key){return cached?.key===key&&Date.now()<cached.until?cached.value:undefined;},async set(key,value){cached={key,value,until:Date.now()+ttl};},async delete(key){if(cached?.key===key)cached=null;}};
 async function operation(run){
  if(busy)throw Error('PAYMENT_TRANSPORT_BUSY');busy=true;const controller=new AbortController();active=controller;const timer=setTimeout(()=>controller.abort(new DOMException('Optional payment transport deadline','TimeoutError')),timeoutMs);
  try{
   assertSpender(identity,spender,policy.ledger);
   const agent=HttpAgent.createSync({host:policy.host,identity,fetch,fetchOptions:{signal:controller.signal},callOptions:{signal:controller.signal},retryTimes:0,shouldFetchRootKey:false,shouldSyncTime:false,verifyQuerySignatures:true,subnetNodeKeyExpirableStore:keyStore,...(localTest?{rootKey:Uint8Array.from(policy.root_key_hex.match(/../g),h=>parseInt(h,16))}:{})});
   const actor=Actor.createActor(ledgerInterface,{agent,canisterId:policy.ledger,pollingOptions:{strategy:strategy.chain(strategy.timeout(timeoutMs),strategy.backoff(200,1.4))}});
   return await run(actor,controller.signal);
  }finally{clearTimeout(timer);controller.abort();if(active===controller)active=null;busy=false;}
 }
 return{
  read(funding){return operation(async actor=>{const account={owner:Principal.fromText(funding.owner),subaccount:[Uint8Array.from(funding.subaccount.match(/../g),h=>parseInt(h,16))]};const [fee,allowance]=await Promise.all([actor.icrc1_fee(),actor.icrc2_allowance({account,spender:{owner:Principal.fromText(spender),subaccount:[]}})]);return{fee,allowance:allowance.allowance,expires_at:allowance.expires_at[0]??null};});},
  send(intent){return operation(async actor=>{validateIntent(intent,{localLedger:localTest?policy.ledger:null});if(intent.backend!==policy.canister_id||intent.spender!==spender||intent.ledger!==policy.ledger||intent.network!==policy.network)throw Error('PAYMENT_INTENT_SCOPE');await checkIntent(intent);assertSpender(identity,spender,policy.ledger);return actor.icrc2_transfer_from(intentRequest(intent,{localLedger:localTest?policy.ledger:null}));});},
  cancel(){active?.abort();},get busy(){return busy;},
 };
}
