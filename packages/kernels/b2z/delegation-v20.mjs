/** Successor authorization storage draft. Historical Rules18/19 map bytes stay
 * unchanged; canonical account identifiers are values in this representation,
 * so a valid digit-leading identifier cannot become an invalid object key. */
import {canonicalAccount} from '../../protocol/account.mjs';
import {validateAuthorization} from './delegation-v18.mjs';

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
 let previous=null;
 for(const row of registry.grants){
  exactKeys(row,'account,activation_position,expires_at_ns,spender_principal');
  if(canonicalAccount(row.account)!==row.account ||
     previous!==null && row.account<=previous) throw Error('AUTH_V3_ORDER');
  previous=row.account;
 }
 // The historical validator remains the source of the grant lifetime and
 // principal constraints until Rules20 execution is wired to this schema.
 const old=authorizationV2FromV3Unchecked(registry);
 validateAuthorization(old);
 return registry;
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
