/** Successor authorization storage draft. Historical Rules18/19 map bytes stay
 * unchanged; canonical account identifiers are values in this representation,
 * so a valid digit-leading identifier cannot become an invalid object key. */
import {canonicalAccount} from '../../protocol/account.mjs';
import {validateAuthorization} from './delegation-v18.mjs';
import {decodeAuthorization,encodeDelegatedPayment,icpAccount,DELEGATION_LIFETIME_NS} from '../../protocol/delegation.mjs';
import {U64_MAX} from '../../protocol/economy17.mjs';
import {hex,unhex} from '@dtr/timeline-runtime/protocol/bytes';

function uint(value) {
 if(typeof value!=='bigint'||value<0n||value>U64_MAX)throw Error('AUTH_INTEGER');
 return value;
}

function exactKeys(value, names) {
 if(!value || Array.isArray(value) || typeof value !== 'object' ||
    Object.keys(value).sort().join(',') !== names) throw Error('AUTH_V3_SHAPE');
}

export function authorizationV3FromV2(previous) {
 validateAuthorization(previous);
 const grants=Object.entries(previous.grants).sort(([a],[b])=>a<b?-1:a>b?1:0)
  .map(([account,grant])=>({account,...grant}));
 return validateAuthorizationV3({
  version:3,recipient:previous.recipient,ledger_time_ns:previous.ledger_time_ns,
  last_position:previous.last_position,grants,
 });
}

export function validateAuthorizationV3(registry) {
 exactKeys(registry,'grants,last_position,ledger_time_ns,recipient,version');
 if(registry.version!==3 || !Array.isArray(registry.grants)) throw Error('AUTH_V3_VERSION');
 canonicalAccount(registry.recipient);
 uint(registry.ledger_time_ns);
 if(registry.last_position!==null)uint(registry.last_position);
 let previous=null;
 for(const row of registry.grants){
  exactKeys(row,'account,activation_position,expires_at_ns,spender_principal');
  if(canonicalAccount(row.account)!==row.account ||
     previous!==null && row.account<=previous) throw Error('AUTH_V3_ORDER');
  previous=row.account;
  const principal=unhex(row.spender_principal);
  if(principal.length!==29||principal[28]!==2||hex(principal)!==row.spender_principal||
     uint(row.expires_at_ns)<DELEGATION_LIFETIME_NS||registry.last_position===null||
     uint(row.activation_position)>registry.last_position)throw Error('AUTH_GRANT');
 }
 return registry;
}

function rowIndex(rows, account) {
 let low=0,high=rows.length;
 while(low<high){const mid=(low+high)>>1;if(rows[mid].account<account)low=mid+1;else high=mid;}
 return low;
}

/** Read either the historical map or the successor sorted rows without
 * converting valid digit-leading account identifiers into object keys. */
export function grantForAccount(registry,account){
 if(registry?.version===3){
  const at=rowIndex(registry.grants,account);
  return registry.grants[at]?.account===account?registry.grants[at]:null;
 }
 return registry?.version===2?registry.grants[account]??null:null;
}

/** Ordered Ledger facts update the canonical rows directly; account bytes
 * never become canonical object keys in the successor. */
export function authorizePaymentV3(registry,payment,position) {
 encodeDelegatedPayment(payment);
 if(payment.position!==position||payment.to!==registry.recipient||
    registry.last_position!==null&&position<=registry.last_position||
    payment.ledger_time_ns<registry.ledger_time_ns)throw Error('AUTH_SOURCE_ORDER_OR_DESTINATION');
 const at=rowIndex(registry.grants,payment.from),found=registry.grants[at]?.account===payment.from;
 let setup,decision;
 try{setup=decodeAuthorization(payment.memo??new Uint8Array());}
 catch{decision='INVALID_DELEGATION';}
 if(!decision){
  if(setup&&payment.spender!==null)decision='DELEGATED_SETUP_FORBIDDEN';
  else if(setup&&payment.amount!==0n)decision='DELEGATION_SETUP_AMOUNT';
  else if(setup?.kind==='revoke'){
   if(found)registry.grants.splice(at,1);
   decision='revoked';
  }else if(setup?.kind==='grant'){
   const row={account:payment.from,spender_principal:hex(payment.memo.slice(3)),
    activation_position:position,expires_at_ns:uint(payment.ledger_time_ns+DELEGATION_LIFETIME_NS)};
   registry.grants.splice(at,found?1:0,row);
   decision='granted';
  }else{
   const grant=found?registry.grants[at]:null;
   const allowed=payment.spender===null||Boolean(grant&&grant.activation_position<position&&
      payment.ledger_time_ns<grant.expires_at_ns&&icpAccount(unhex(grant.spender_principal))===payment.spender);
   decision=allowed?'gameplay':'UNAUTHORIZED_SPENDER';
  }
 }
 registry.last_position=position;
 registry.ledger_time_ns=payment.ledger_time_ns;
 return decision;
}

function authorizationV2FromV3Unchecked(registry) {
 const grants={};
 for(const {account,...grant} of registry.grants) grants[account]=grant;
 return {version:2,recipient:registry.recipient,
  ledger_time_ns:registry.ledger_time_ns,last_position:registry.last_position,grants};
}

/** In-memory execution adapter only. Never canonically encode its grant map. */
export function authorizationV2FromV3(registry) {
 validateAuthorizationV3(registry);
 return authorizationV2FromV3Unchecked(registry);
}
