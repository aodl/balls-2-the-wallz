/** Owner-side setup instructions only. Never executes an approval or payment. */
import{Principal}from'@icp-sdk/core/principal';import{encodeAuthorization}from'../../../packages/protocol/delegation.mjs';import{explicitFunding}from'./context.mjs';import{ICP_LEDGER}from'./ledger.mjs';
const nat=n=>{if(typeof n!=='bigint'||n<0n||n>=(1n<<64n))throw Error('SETUP_INTEGER');return String(n);};
const blob=b=>'blob "'+Array.from(b,v=>'\\'+v.toString(16).padStart(2,'0')).join('')+'"';
const optional=(a,type)=>a.length?`opt (${a[0]} : ${type})`:'null';
const account=a=>`record { owner = principal "${a.owner.toText()}"; subaccount = null }`;
const warning='Each owner operation has its own Ledger fee. Approval is not restricted to B2Z. Verify the selected CLI principal equals the funding owner. Prepared commands are snapshots, not proof of an on-chain change. Run promptly; regenerate stale instructions. Never blindly retry an uncertain command or alter its original timestamp.';
const allowanceWarning='AllowanceChanged requires a new allowance query and owner review; never automatically retry with a changed expected_allowance.';
function ownerContext({network='ic',ledger=ICP_LEDGER,backend,funding,spender,fee,createdAtNs}){
 if(network!=='ic'||ledger!==ICP_LEDGER)throw Error('OWNER_SETUP_NETWORK');funding=explicitFunding(funding);if(Principal.fromText(backend).toText()!==backend)throw Error('OWNER_SETUP_BACKEND');
 encodeAuthorization({kind:'grant',spender});nat(fee);nat(createdAtNs);
 return{funding,spender,backend,fee,createdAtNs,sub:Uint8Array.from(funding.subaccount.match(/../g),h=>parseInt(h,16)),head:`dfx --identity FUNDING_IDENTITY canister --network ic call ${ledger}`};
}
function approval(c,amount,currentAllowance,expiresAtNs){
 nat(amount);nat(currentAllowance);if(expiresAtNs!==null)nat(expiresAtNs);
 return{from_subaccount:[c.sub],spender:{owner:Principal.fromText(c.spender),subaccount:[]},amount,expected_allowance:[currentAllowance],expires_at:expiresAtNs===null?[]:[expiresAtNs],fee:[c.fee],memo:[],created_at_time:[c.createdAtNs]};
}
function transfer(c,memo){return{from_subaccount:[c.sub],to:{owner:Principal.fromText(c.backend),subaccount:[]},amount:0n,fee:[c.fee],memo:[memo],created_at_time:[c.createdAtNs]};}
function command(c,method,r){
 const fields=method==='icrc2_approve'?`spender = ${account(r.spender)}; amount = ${r.amount} : nat; expected_allowance = ${optional(r.expected_allowance,'nat')}; expires_at = ${optional(r.expires_at,'nat64')}; fee = ${optional(r.fee,'nat')}; memo = null`:`to = ${account(r.to)}; amount = 0 : nat; fee = ${optional(r.fee,'nat')}; memo = opt ${blob(r.memo[0])}`;
 return`${c.head} ${method} '(record { from_subaccount = opt ${blob(r.from_subaccount[0])}; ${fields}; created_at_time = ${optional(r.created_at_time,'nat64')} })' --candid interfaces/icp-delegated-payments.did`;
}
function metadata(c){return{funding_owner:c.funding.owner,spender:c.spender,setup_amount_e8s:'0',fee_e8s:String(c.fee),created_at_ns:String(c.createdAtNs),verify_owner:'dfx --identity FUNDING_IDENTITY identity get-principal',warning};}
export function ownerSetup(options){
 const c=ownerContext(options),{currentAllowance,allowance,expiresAtNs}=options;for(const n of[currentAllowance,allowance,expiresAtNs])nat(n);
 if(allowance===0n||expiresAtNs<=c.createdAtNs||expiresAtNs-c.createdAtNs>604800000000000n)throw Error('FINITE_SETUP_EXPIRY');
 const approve_request=approval(c,allowance,currentAllowance,expiresAtNs),grant_request=transfer(c,encodeAuthorization({kind:'grant',spender:c.spender}));
 return{...metadata(c),allowance_e8s:String(allowance),expires_at_ns:String(expiresAtNs),approve:command(c,'icrc2_approve',approve_request),grant:command(c,'icrc1_transfer',grant_request),approve_request,grant_request,warning:warning+' '+allowanceWarning};
}
/** Explicit revocation preparation requires a newly queried allowance/fee and
 * creation timestamp. Never reuse the original approval's expiry or timestamp. */
export function ownerRevocation(options){
 const c=ownerContext(options);if(!['allowance','game'].includes(options.kind))throw Error('OWNER_REVOCATION_KIND');
 const request=options.kind==='allowance'?approval(c,0n,options.currentAllowance,null):transfer(c,encodeAuthorization({kind:'revoke'})),method=options.kind==='allowance'?'icrc2_approve':'icrc1_transfer';
 return{...metadata(c),kind:options.kind,command:command(c,method,request),method,request,warning:warning+(options.kind==='allowance'?' '+allowanceWarning:'')+' Signing out revokes neither permission.'};
}
