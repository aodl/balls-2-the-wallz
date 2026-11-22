/** Rules18 candidate grant state. All ordering and expiry facts come from the Ledger. */
import {hex,unhex} from '@dtr/timeline-runtime/protocol/bytes';
import {canonicalAccount} from '../../protocol/account.mjs';
import {decodeAuthorization,encodeDelegatedPayment,icpAccount,DELEGATION_LIFETIME_NS} from '../../protocol/delegation.mjs';
import {U64_MAX} from '../../protocol/economy17.mjs';

function uint(n) {
 if(typeof n!=='bigint'||n<0n||n>U64_MAX)throw Error('AUTH_INTEGER');
 return n;
}
function exactKeys(value,keys) {
 if(!value||Object.keys(value).sort().join(',')!==keys)throw Error('AUTH_REGISTRY');
}
export function emptyAuthorization(recipient) {
 return {version:2,recipient:canonicalAccount(recipient),ledger_time_ns:0n,last_position:null,grants:{}};
}
export function validateAuthorization(registry) {
 exactKeys(registry,'grants,last_position,ledger_time_ns,recipient,version');
 canonicalAccount(registry.recipient);
 uint(registry.ledger_time_ns);
 if(registry.last_position!==null)uint(registry.last_position);
 if(registry.version!==2||!registry.grants||Array.isArray(registry.grants)||
    typeof registry.grants!=='object')throw Error('AUTH_REGISTRY');
 for(const [account,grant] of Object.entries(registry.grants)){
  if(canonicalAccount(account)!==account)throw Error('AUTH_GRANT');
  exactKeys(grant,'activation_position,expires_at_ns,spender_principal');
  const principal=unhex(grant.spender_principal);
  if(principal.length!==29||principal[28]!==2||hex(principal)!==grant.spender_principal||
     uint(grant.expires_at_ns)<DELEGATION_LIFETIME_NS||
     registry.last_position===null||uint(grant.activation_position)>registry.last_position)throw Error('AUTH_GRANT');
 }
 return registry;
}
export function authorizePayment(registry,payment,position) {
 encodeDelegatedPayment(payment);
 if(payment.position!==position||payment.to!==registry.recipient||
    registry.last_position!==null&&position<=registry.last_position||
    payment.ledger_time_ns<registry.ledger_time_ns)throw Error('AUTH_SOURCE_ORDER_OR_DESTINATION');
 let setup,decision;
 try{setup=decodeAuthorization(payment.memo??new Uint8Array());}
 catch{decision='INVALID_DELEGATION';}
 if(!decision){
  if(setup&&payment.spender!==null)decision='DELEGATED_SETUP_FORBIDDEN';
  else if(setup&&payment.amount!==0n)decision='DELEGATION_SETUP_AMOUNT';
  else if(setup?.kind==='revoke'){
   delete registry.grants[payment.from];
   decision='revoked';
  }else if(setup?.kind==='grant'){
   registry.grants[payment.from]={
    spender_principal:hex(payment.memo.slice(3)),activation_position:position,
    expires_at_ns:uint(payment.ledger_time_ns+DELEGATION_LIFETIME_NS)
   };
   decision='granted';
  }else{
   const grant=registry.grants[payment.from];
   const allowed=payment.spender===null||Boolean(grant&&grant.activation_position<position&&
      payment.ledger_time_ns<grant.expires_at_ns&&icpAccount(unhex(grant.spender_principal))===payment.spender);
   decision=allowed?'gameplay':'UNAUTHORIZED_SPENDER';
  }
 }
 registry.last_position=position;
 registry.ledger_time_ns=payment.ledger_time_ns;
 return decision;
}
