/** Experimental rules-8 owner authorization; no allowance queries or browser trust. */
import {hex,unhex} from '@dtr/timeline-runtime/protocol/bytes';
import {canonicalAccount} from '../../protocol/account.mjs';
import {decodeAuthorization,icpAccount,DELEGATION_LIFETIME_NS,MAX_DELEGATION_ACCOUNTS} from '../../protocol/delegation.mjs';
const U64=(1n<<64n)-1n;
function uint(n){if(typeof n!=='bigint'||n<0n||n>U64)throw Error('AUTH_INTEGER');return n;}
function exactKeys(o,k){if(!o||Object.keys(o).sort().join(',')!==k.split(',').sort().join(','))throw Error('AUTH_REGISTRY');}
export function emptyAuthorization(recipient){canonicalAccount(recipient);return {version:1,recipient,ledger_time_ns:0n,last_position:null,grants:[]};}
export function validateAuthorization(s){
 exactKeys(s,'version,recipient,ledger_time_ns,last_position,grants');canonicalAccount(s.recipient);uint(s.ledger_time_ns);if(s.last_position!==null)uint(s.last_position);
 if(s.version!==1||!Array.isArray(s.grants)||s.grants.length>MAX_DELEGATION_ACCOUNTS)throw Error('AUTH_REGISTRY');
 for(let i=0;i<s.grants.length;i++){
  const g=s.grants[i];exactKeys(g,'account,spender_principal,activation_position,expires_at_ns');canonicalAccount(g.account);const p=unhex(g.spender_principal);
  if(p.length!==29||p[28]!==2||hex(p)!==g.spender_principal||uint(g.expires_at_ns)<DELEGATION_LIFETIME_NS||s.last_position===null||uint(g.activation_position)>s.last_position||i&&s.grants[i-1].account>=g.account)throw Error('AUTH_GRANT');
 }
 return s;
}
export function authorizePayment(s,p,inputPosition){
 validateAuthorization(s);if(p.position!==inputPosition||p.to!==s.recipient||s.last_position!==null&&p.position<=s.last_position||p.ledger_time_ns<s.ledger_time_ns)throw Error('AUTH_SOURCE_ORDER_OR_DESTINATION');
 let setup,decision;try{setup=decodeAuthorization(p.memo??new Uint8Array());}catch{decision='INVALID_DELEGATION';}
 if(!decision){
  if(setup&&p.spender!==null)decision='DELEGATED_SETUP_FORBIDDEN';
  else if(setup?.kind==='revoke'){s.grants=s.grants.filter(g=>g.account!==p.from);decision='revoked';}
  else if(setup?.kind==='grant'){
   const expiry=uint(p.ledger_time_ns+DELEGATION_LIFETIME_NS);s.grants=s.grants.filter(g=>g.expires_at_ns>p.ledger_time_ns);const index=s.grants.findIndex(g=>g.account===p.from);
   if(index<0&&s.grants.length===MAX_DELEGATION_ACCOUNTS)decision='DELEGATION_CAPACITY';else{const raw=p.memo.slice(3);const grant={account:p.from,spender_principal:hex(raw),activation_position:p.position,expires_at_ns:expiry};if(index<0)s.grants.push(grant);else s.grants[index]=grant;s.grants.sort((a,b)=>a.account<b.account?-1:1);decision='granted';}
  }else{let lo=0,hi=s.grants.length;while(lo<hi){const mid=(lo+hi)>>1;if(s.grants[mid].account<p.from)lo=mid+1;else hi=mid;}const g=s.grants[lo];decision=p.spender===null||g?.account===p.from&&g.activation_position<p.position&&p.ledger_time_ns<g.expires_at_ns&&icpAccount(unhex(g.spender_principal))===p.spender?'gameplay':'UNAUTHORIZED_SPENDER';}
 }
 s.last_position=p.position;s.ledger_time_ns=p.ledger_time_ns;return decision;
}
