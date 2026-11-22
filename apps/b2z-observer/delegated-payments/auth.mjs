/** Optional II session. Imported only by the experimental payment boundary. */
import{AuthClient,MemoryCredentialStorage,MemoryStateStorage}from'@icp-sdk/auth/client';
import{assertSpender,ICP_LEDGER}from'./ledger.mjs';
export const DERIVATION_ORIGIN='https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io';
export function paymentSession({client=null,onChange=()=>{}}={}){
 const auth=client??new AuthClient({derivationOrigin:DERIVATION_ORIGIN,credentialStorage:new MemoryCredentialStorage(),stateStorage:new MemoryStateStorage(),agentOptions:{host:'https://icp-api.io',shouldFetchRootKey:false,verifyQuerySignatures:true}});let stopped=false,generation=0,busy=false;
 const changed=()=>{if(!stopped&&!busy)onChange({signedIn:auth.isAuthenticated(),spender:auth.getPrincipal()?.toText()??null});};const unsubscribe=auth.subscribe(()=>changed());
 async function identity(signIn){if(stopped||busy)throw Error('SIGN_IN_UNAVAILABLE');busy=true;const g=generation;
  try{const identity=await(signIn?auth.signIn({maxTimeToLive:3600000000000n,maxTimeToIdle:900000000000n}):auth.getIdentity());if(stopped||generation!==g){await auth.signOut();throw Error('STALE_SIGN_IN');}const principal=auth.getPrincipal();if(!principal)throw Error('SIGN_IN_REQUIRED');assertSpender(identity,principal.toText(),ICP_LEDGER);changed();return{identity,spender:principal.toText()};}finally{busy=false;changed();}
 }
 return{signIn:()=>identity(true),identity:()=>identity(false),status:()=>({signedIn:!stopped&&auth.isAuthenticated(),spender:stopped?null:auth.getPrincipal()?.toText()??null}),async signOut(){generation++;await auth.signOut();if(!stopped)onChange({signedIn:false,spender:null});},stop(){if(stopped)return;stopped=true;generation++;unsubscribe();auth.dispose();}};
}
