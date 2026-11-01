/** Restricted legacy-ICP route. Private keys stay inside dfx; never exported/read here. */
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import {Actor,HttpAgent} from '@icp-sdk/core/agent';import {IDL} from '@icp-sdk/core/candid';
import {accountIdentifier,canonicalAccount} from '../../../apps/b2z-observer/identity.mjs';
import {check} from './common.mjs';
const exec=promisify(execFile),nat=s=>BigInt(String(s).replaceAll('_',''));
// Explicit trusted-launch acknowledgement is scoped to each dfx child, never inherited.
export function playerCommandEnvironment(base,root,alias,network,acknowledged=false){
 check(/^b2z-agent-(expander|defender|raider|adaptive)$/.test(alias),'PLAYER_IDENTITY_ONLY');
 const env={...base,DFX_CONFIG_ROOT:root,DFX_IDENTITY:alias};delete env.DFX_WARNING;delete env.DFX_IDENTITY_PASSPHRASE;
 if(network==='ic'&&acknowledged)env.DFX_WARNING='-mainnet_plaintext_identity';
 return env;
}
export class DfxGameLedger{
 constructor({policy,players,identityRoot,allowMainnet=false,acknowledgePlaintextMainnet=false}){
  check(policy.network==='ic'||policy.network==='pocketic-local','LEDGER_NETWORK');
  if(policy.network==='ic')check(policy.recipient==='344885ef3e3823194dbc0367cd02c4cbe69f7dca0ba764f15f2a86e70dbeca7a'&&policy.ledger==='ryjl3-tyaaa-aaaaa-aaaba-cai'&&policy.index==='qhbym-qaaaa-aaaaa-aaafq-cai'&&policy.host==='https://icp-api.io','OFFICIAL_ICP_BINDING');
  else check(['localhost','127.0.0.1'].includes(new URL(policy.host).hostname),'LOCAL_GATEWAY_REQUIRED');
  check(typeof identityRoot==='string'&&identityRoot.startsWith('/home/'),'PRIVATE_PLAYER_STORAGE_REQUIRED');this.policy=Object.freeze({...policy});this.players=new Map(players.map(p=>[p.alias,Object.freeze({...p})]));this.identityRoot=identityRoot;this.liveEnabled=allowMainnet;this.plaintextAcknowledged=allowMainnet&&acknowledgePlaintextMainnet;
 }
 async queryActor(){if(this.agent)return this.agent;this.agent=await HttpAgent.create({host:this.policy.host,...(this.policy.rootKey?{rootKey:this.policy.rootKey}:{}),shouldFetchRootKey:false,shouldSyncTime:false,verifyQuerySignatures:true});return this.agent;}
 async fee(){const agent=await this.queryActor(),actor=Actor.createActor(({IDL})=>IDL.Service({transfer_fee:IDL.Func([IDL.Record({})],[IDL.Record({transfer_fee:IDL.Record({e8s:IDL.Nat64})})],['query'])}),{agent,canisterId:this.policy.ledger});return(await actor.transfer_fee({})).transfer_fee.e8s;}
 async balance(account){canonicalAccount(account);const agent=await this.queryActor(),actor=Actor.createActor(({IDL})=>IDL.Service({account_balance:IDL.Func([IDL.Record({account:IDL.Vec(IDL.Nat8)})],[IDL.Record({e8s:IDL.Nat64})],['query'])}),{agent,canisterId:this.policy.ledger});return(await actor.account_balance({account:Buffer.from(account,'hex')})).e8s;}
 async submit(plan,{canDispatch=()=>false}={}){
  check(this.policy.network!=='ic'||this.liveEnabled,'LIVE_SIGNER_NOT_ENABLED');
  const p=this.players.get(plan.player);check(p&&/^b2z-agent-(expander|defender|raider|adaptive)$/.test(p.alias),'PLAYER_IDENTITY_ONLY');check(accountIdentifier(p.principal)===plan.account&&p.account_identifier===plan.account,'PLAYER_ACCOUNT_BINDING');check(plan.ledger===this.policy.ledger&&plan.destination===this.policy.recipient,'DESTINATION_BINDING');check(/^[0-9a-f]{16}$/.test(plan.memo_hex),'MEMO_BOUNDS');
  // The LLM supplies only plan IDs to the executor, never this call's fields.
  const env=playerCommandEnvironment(process.env,this.identityRoot,p.alias,this.policy.network,this.plaintextAcknowledged);
  const principal=(await exec('dfx',['--identity',p.alias,'identity','get-principal'],{env,timeout:15000,maxBuffer:65536})).stdout.trim();check(principal===p.principal,'SIGNER_PRINCIPAL_MISMATCH');
  const memo=BigInt('0x'+plan.memo_hex),to=Array.from(Buffer.from(plan.destination,'hex')).map(n=>n+' : nat8').join('; ');
  const arg=`(record { memo = ${memo} : nat64; amount = record { e8s = ${plan.amount_e8s} : nat64 }; fee = record { e8s = ${plan.fee_e8s} : nat64 }; from_subaccount = null; to = vec { ${to} }; created_at_time = opt record { timestamp_nanos = ${plan.created_at_time_ns} : nat64 } })`;
  if(!canDispatch())return{status:'rejected',error:'Cancelled before signing/dispatch'};
  try{const r=await exec('dfx',['--identity',p.alias,'canister','call',this.policy.ledger,'transfer',arg,'--network',this.policy.network==='ic'?'ic':this.policy.host,'--output','json','--candid',fileURLToPath(new URL('../../../interfaces/icp-game-transfer.did',import.meta.url))],{env,timeout:60000,maxBuffer:65536});const out=JSON.parse(r.stdout);
   if(out.Ok!==undefined)return{status:'accepted',block_index:nat(out.Ok)};
   if(out.Err?.TxDuplicate)return{status:'accepted',block_index:nat(out.Err.TxDuplicate.duplicate_of),duplicate:true};
   if(out.Err)return{status:'rejected',error:out.Err};
   return{status:'ambiguous',reason:'Unexpected Ledger result'};
  }catch{return{status:'ambiguous',reason:'Signed Ledger call failed or timed out; reconcile the original transaction, never replace its timestamp.'};}
 }
 async find(plan){
  const agent=await this.queryActor(),tokens=IDL.Record({e8s:IDL.Nat64}),stamp=IDL.Record({timestamp_nanos:IDL.Nat64}),operation=IDL.Variant({Transfer:IDL.Record({to:IDL.Text,from:IDL.Text,amount:tokens,fee:tokens,spender:IDL.Opt(IDL.Text)}),Mint:IDL.Reserved,Burn:IDL.Reserved,Approve:IDL.Reserved}),transaction=IDL.Record({memo:IDL.Nat64,icrc1_memo:IDL.Opt(IDL.Vec(IDL.Nat8)),operation,created_at_time:IDL.Opt(stamp),timestamp:IDL.Opt(stamp)});
  const actor=Actor.createActor(()=>IDL.Service({get_account_identifier_transactions:IDL.Func([IDL.Record({account_identifier:IDL.Text,start:IDL.Opt(IDL.Nat64),max_results:IDL.Nat64})],[IDL.Variant({Ok:IDL.Record({balance:IDL.Nat64,oldest_tx_id:IDL.Opt(IDL.Nat64),transactions:IDL.Vec(IDL.Record({id:IDL.Nat64,transaction}))}),Err:IDL.Record({message:IDL.Text})})],['query'])}),{agent,canisterId:this.policy.index});
  let start=[],scanned=0;const matches=[];
  for(let page=0;page<4;page++){
   const reply=await actor.get_account_identifier_transactions({account_identifier:plan.account,start,max_results:64n});check(reply.Ok,'INDEX_QUERY_FAILED');const rows=reply.Ok.transactions;scanned+=rows.length;
   for(const row of rows){const t=row.transaction,v=t.operation.Transfer;if(v&&v.from===plan.account&&v.to===plan.destination&&v.amount.e8s===BigInt(plan.amount_e8s)&&v.fee.e8s===BigInt(plan.fee_e8s)&&!v.spender.length&&t.memo===BigInt('0x'+plan.memo_hex)&&t.created_at_time[0]?.timestamp_nanos===BigInt(plan.created_at_time_ns))matches.push(row);}
   if(rows.length<64)break;const next=rows.at(-1).id;check(!start.length||next<start[0],'INDEX_PAGINATION');start=[next];
  }
  check(matches.length<=1,'AMBIGUOUS_DUPLICATE_LEDGER_RECORDS');return matches.length?{status:'found',block_index:matches[0].id,record:matches[0],scanned}:{status:'not_found_in_bounded_history',scanned};
 }
}
