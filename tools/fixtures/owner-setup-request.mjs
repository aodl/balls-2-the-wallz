/** Test-only encoding of the exact owner-instruction request. No network calls,
 * identity files or keys. The CLI command itself is never executed here. */
import{IDL}from'@icp-sdk/core/candid';
import{ownerSetup,ownerRevocation}from'../../apps/b2z-observer/delegated-payments/setup.mjs';
const input=JSON.parse(process.argv[2]),kind=input.kind;
for(const key of['fee','currentAllowance','allowance','expiresAtNs','createdAtNs'])if(input[key]!==undefined)input[key]=BigInt(input[key]);
const result=kind==='approve'||kind==='grant'?ownerSetup(input):ownerRevocation(input);
const request=kind==='approve'?result.approve_request:kind==='grant'?result.grant_request:result.request;
const method=kind==='approve'?'icrc2_approve':kind==='grant'?'icrc1_transfer':result.method;
const account=IDL.Record({owner:IDL.Principal,subaccount:IDL.Opt(IDL.Vec(IDL.Nat8))});
const common={from_subaccount:IDL.Opt(IDL.Vec(IDL.Nat8)),amount:IDL.Nat,fee:IDL.Opt(IDL.Nat),memo:IDL.Opt(IDL.Vec(IDL.Nat8)),created_at_time:IDL.Opt(IDL.Nat64)};
const type=IDL.Record(method==='icrc2_approve'?{...common,spender:account,expected_allowance:IDL.Opt(IDL.Nat),expires_at:IDL.Opt(IDL.Nat64)}:{...common,to:account});
console.log(JSON.stringify({method,argument_hex:Buffer.from(IDL.encode([type],[request])).toString('hex'),command:kind==='approve'?result.approve:kind==='grant'?result.grant:result.command}));
