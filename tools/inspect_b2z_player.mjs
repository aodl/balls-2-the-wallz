#!/usr/bin/env node
/** Anonymous read-only example. No identity, wallet, Ledger updates or transactions. */
import {readFile} from 'node:fs/promises';
import {Actor,HttpAgent} from '@icp-sdk/core/agent';
import {IDL} from '@icp-sdk/core/candid';
import {certificateVerifier,liveClient} from '@dtr/timeline-runtime/client/ic-certificate';
import {ArtifactAssembler,verifyCertificatePublication,verifyRetainedPredecessor,sha256Web} from '@dtr/timeline-runtime/client/verification';
import {decodeCanonical,encodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {hex,unhex} from '@dtr/timeline-runtime/protocol/bytes';
import {artifactBundleClient,verifiedSourceDescriptor} from '../apps/b2z-observer/mainnet.mjs';
import {CONFIGURATION_ASSETS} from '../apps/b2z-observer/configuration.generated.mjs';
import {snapshot} from '../apps/b2z-observer/model.mjs';
import {canonicalAccount} from '../apps/b2z-observer/identity.mjs';
import {quoteV6,islandAt} from '../apps/b2z-observer/action-quote-v6.mjs';
import {encodeV6Memo,parseV6TextMemo} from '../packages/protocol/memo-v6.mjs';
const args=process.argv.slice(2),get=name=>{const i=args.indexOf(name);return i<0?null:args[i+1];};
if(args.includes('--help')){console.log('node tools/inspect_b2z_player.mjs --account <64-hex AccountIdentifier> [--quantity 1..64] [--receipt <Ledger ID>] [--local-config <pinned disposable JSON>]');process.exit(0);}
const account=canonicalAccount(get('--account')??''),quantity=Number(get('--quantity')??1);if(!Number.isInteger(quantity)||quantity<1||quantity>64)throw Error('quantity bounds');
let policy={network:'ic',host:'https://icp-api.io',canister_id:'s34gv-3qaaa-aaaar-qcifa-cai',ledger:'ryjl3-tyaaa-aaaaa-aaaba-cai',index:'qhbym-qaaaa-aaaaa-aaafq-cai'};
if(get('--local-config')){const p=JSON.parse(await readFile(get('--local-config'),'utf8'));if(p.network!=='pocketic-local'||!['127.0.0.1','localhost'].includes(new URL(p.host).hostname))throw Error('explicit disposable loopback configuration required');policy={...p,rootKey:unhex(p.root_key_hex)};}
const {rootKey,network,host,canister_id}=policy,verify=certificateVerifier({network,...(rootKey?{rootKey}:{})}),base=await liveClient({network,host,canister_id,...(rootKey?{rootKey}:{})});
// Reuse the actual browser's atomic delivery client on the explicitly pinned
// disposable network. Mainnet uses the same public chunk protocol directly.
const client=network==='pocketic-local'?await artifactBundleClient({network,host,canister_id,rootKey},base):base;
const response=await client.observation(),ticket=await verifyCertificatePublication(response.publication,response.certificate,{network,canister_id,now_ns:BigInt(Date.now())*1000000n,max_age_ns:300000000000n,max_future_ns:30000000000n},verify);
async function artifact(ticket,kind){const index=['state','events','scores'].indexOf(kind),reader=new ArtifactAssembler(ticket,kind),segment=ticket.publication.head.segment_id;for(let i=0;i<reader.descriptor.chunks.length;i++)await reader.accept(i,segment===null?await client.currentChunk(ticket.root_hash,index,i):await client.chunk(Number(segment),ticket.root_hash,index,i));return reader.finish();}
const [state,events]=await Promise.all([artifact(ticket,'state'),artifact(ticket,'events')]),world=snapshot(state,ticket.publication.identity),configName=CONFIGURATION_ASSETS[ticket.publication.identity.config_hash];if(!configName)throw Error('unsupported authenticated configuration');const configBytes=new Uint8Array(await readFile(new URL('../apps/b2z-observer/'+configName,import.meta.url)));if(await sha256Web(configBytes)!==ticket.publication.identity.config_hash)throw Error('configuration commitment mismatch');const config=decodeCanonical(configBytes);
const agent=await HttpAgent.create({host,...(rootKey?{rootKey}:{}),shouldFetchRootKey:false,shouldSyncTime:false,verifyQuerySignatures:true});
const ref=IDL.Record({publication_hash:IDL.Text,state_hash:IDL.Text,segment_id:IDL.Opt(IDL.Nat64),certified_reply:IDL.Bool});
const destination=IDL.Record({owner:IDL.Principal,ledger:IDL.Principal,index:IDL.Principal,receiving_numeric_subaccount:IDL.Nat64,icp_account:IDL.Text});
const result=t=>IDL.Variant({Ok:t,Err:IDL.Text}),action=IDL.Variant({Fire:IDL.Record({cannon:IDL.Nat32,angle:IDL.Nat16,quantity:IDL.Nat8}),New:IDL.Record({angle:IDL.Nat16,quantity:IDL.Nat8,cell:IDL.Opt(IDL.Nat32)}),Move:IDL.Record({cannon:IDL.Nat32,cell:IDL.Nat32})});
const receiptStatus=IDL.Variant(Object.fromEntries(['Pending','Applied','PartiallyApplied','Rejected','Duplicate','UnknownOrNotRetained'].map(s=>[s,IDL.Null])));
const cannonView=IDL.Record({cannon_id:IDL.Nat32,funding_account:IDL.Text,cell:IDL.Nat32,player_id:IDL.Nat32,island_id:IDL.Nat32,island_ball_ids:IDL.Vec(IDL.Nat32)});
const actor=Actor.createActor(()=>IDL.Service({source_descriptor:IDL.Func([],[result(IDL.Vec(IDL.Nat8))],['query']),game_info:IDL.Func([],[result(IDL.Record({state:ref,world_version:IDL.Nat32,width:IDL.Nat32,height:IDL.Nat32,configuration:IDL.Vec(IDL.Nat8),payments_retained:IDL.Bool,wallet_execution_available:IDL.Bool}))],['query']),player_state:IDL.Func([IDL.Text],[result(IDL.Record({state:ref,funding_account:IDL.Text,cannons:IDL.Vec(cannonView),active_balls:IDL.Nat32}))],['query']),cannon_state:IDL.Func([IDL.Nat32],[result(IDL.Record({state:ref,cannon:IDL.Opt(cannonView)}))],['query']),nearby_region:IDL.Func([IDL.Nat32,IDL.Nat8,IDL.Nat8],[result(IDL.Record({state:ref,cells:IDL.Vec(IDL.Record({cell:IDL.Nat32,island_id:IDL.Nat32,player_id:IDL.Nat32}))}))],['query']),action_quote:IDL.Func([IDL.Text,action],[result(IDL.Record({state:ref,destination,amount_e8s_excluding_fee:IDL.Nat64,memo_bytes:IDL.Vec(IDL.Nat8),text_memo:IDL.Opt(IDL.Text),requested_quantity:IDL.Nat8,maximum_fill_now:IDL.Nat8,reservation:IDL.Bool}))],['query']),payment_receipt:IDL.Func([IDL.Nat64,IDL.Opt(IDL.Nat64)],[result(IDL.Record({state:ref,status:receiptStatus,canonical_receipt:IDL.Opt(IDL.Vec(IDL.Nat8)),event_artifact_hash:IDL.Opt(IDL.Text)}))],['query'])}),{agent,canisterId:canister_id});
const unwrap=r=>{if(!r.Ok)throw Error(r.Err??'query failed');return r.Ok;};
const source=await verifiedSourceDescriptor(Uint8Array.from(unwrap(await actor.source_descriptor())),ticket,{network,canister_id,ledger:policy.ledger,index:policy.index});
const mine=world.cannons.filter(c=>c.account===account),selected=mine[0],kind=selected?'fire':'new';
const output={scope:'Anonymous read-only inspection; no payment or game command submitted',observed_head:ticket.publication.head.segment_id,publication_hash:ticket.root_hash,certificate_time_ns:ticket.certificate_time_ns,world_version:world.version,account,cannons:mine.map(c=>c.id),suggestion:selected?`Inspect cannon ${selected.id}, then choose an angle. Example prepares heading zero; strategy is not submitted.`:'First join uses the deterministic neutral-patch policy, not a promised exact cell.'};
const checkRef=value=>{if(value.certified_reply||value.publication_hash!==ticket.root_hash||value.state_hash!==ticket.publication.head.state_hash)throw Error('public reply head changed or falsely claims certification');};
const info=unwrap(await actor.game_info()),player=unwrap(await actor.player_state(account));checkRef(info.state);checkRef(player.state);
if(info.world_version!==world.version||info.width!==world.width||info.height!==world.height||await sha256Web(Uint8Array.from(info.configuration))!==ticket.publication.identity.config_hash||!info.payments_retained||info.wallet_execution_available||player.funding_account!==account||JSON.stringify(player.cannons.map(c=>c.cannon_id))!==JSON.stringify(mine.map(c=>c.id)))throw Error('public inspection differs from authenticated state/configuration');
if(world.version===6){const id=world.playability.players.find(p=>p.account===account)?.id;if(player.active_balls!==world.balls.filter(b=>b.owner===id).length)throw Error('public player ball count mismatch');}
if(selected){const reply=unwrap(await actor.cannon_state(selected.id)),region=unwrap(await actor.nearby_region(selected.cell,2,2));checkRef(reply.state);checkRef(region.state);const c=reply.cannon[0];if(!c||c.cannon_id!==selected.id||c.funding_account!==account||c.cell!==selected.cell)throw Error('public cannon mismatch');if(world.version===6){const label=islandAt(world,selected.cell),pool=world.balls.filter(b=>b.owner===c.player_id&&islandAt(world,b.cell)===label).map(b=>b.id);if(c.island_id!==label||JSON.stringify(Array.from(c.island_ball_ids))!==JSON.stringify(pool)||region.cells.length!==4||region.cells.some(cell=>cell.island_id!==islandAt(world,cell.cell)||cell.player_id!==(world.playability.territories.find(t=>t.id===cell.island_id)?.player??0)))throw Error('public island/region mismatch');}}
output.public_inspection={game_info:'independently matched',player_state:'independently matched',cannon_state:selected?'independently matched':'no cannon',nearby_region:selected?'bounded cells independently matched':'not needed',typed_replies_certified:false};
if(world.version===6){const local=quoteV6(world,config,account,{kind,cannon:selected?.id,quantity,angle:'0'}),q=unwrap(await actor.action_quote(account,selected?{Fire:{cannon:selected.id,angle:0,quantity}}:{New:{angle:0,quantity,cell:[]}}));if(q.state.publication_hash!==ticket.root_hash||q.state.state_hash!==ticket.publication.head.state_hash)throw Error('head changed between inspection and quote; obtain a fresh authenticated observation');if(q.amount_e8s_excluding_fee!==local.amount||hex(Uint8Array.from(q.memo_bytes))!==hex(local.numeric_memo_bytes)||q.reservation||q.state.certified_reply||q.maximum_fill_now!==local.maximum_fill||q.requested_quantity!==local.requested||q.text_memo.length&&hex(encodeV6Memo(parseV6TextMemo(new TextEncoder().encode(q.text_memo[0]))))!==hex(local.numeric_memo_bytes)||q.destination.owner.toText()!==source.owner||q.destination.ledger.toText()!==source.ledger||q.destination.index.toText()!==source.index||q.destination.icp_account!==source.recipient||q.destination.receiving_numeric_subaccount!==source.subaccount)throw Error('quote differs from independently verified state/source');output.payment_preparation={amount_e8s_excluding_fee:q.amount_e8s_excluding_fee,memo_hex:hex(Uint8Array.from(q.memo_bytes)),text_memo:q.text_memo[0]??null,destination:source,maximum_fill_now:q.maximum_fill_now,notice:'Not a reservation. Current Ledger wallet fee is extra. Surplus is retained, not refunded. Only the correct sending account confers authority.'};}else output.payment_preparation='V6 is not active; this example prepares no new-rule payment.';
if(get('--receipt')){
 const position=BigInt(get('--receipt'));if(position<0n||position>18446744073709551615n)throw Error('Ledger ID bounds');
 let proof=ticket,located=false;
 // Locate through authenticated predecessors; signed retention metadata is only
 // a locator. Never turn an absent old artifact into a payment rejection.
 for(let n=0;n<16;n++){
  const seal=proof.publication.head.seal;
  if(seal&&position>=seal.source_from&&position<seal.source_to_exclusive){located=true;break;}
  const segment=proof.publication.head.segment_id;
  if(position>=proof.publication.head.source_to_exclusive||segment===null||segment===0n)break;
  proof=await verifyRetainedPredecessor(await client.publication(Number(segment-1n)),proof);
 }
 const r=unwrap(await actor.payment_receipt(position,located?[proof.publication.head.segment_id]:[]));
 if(!r.canonical_receipt.length)output.receipt={status:Object.keys(r.status)[0],scope:'Operational pending/unknown reply, not proof of payment or non-payment'};
 else{
  if(!located||proof.root_hash!==r.state.publication_hash)throw Error('receipt is outside bounded authenticated retention');
  const data=proof.root_hash===ticket.root_hash?events:await artifact(proof,'events'),row=decodeCanonical(data).receipts.find(r=>r.position===position);
  if(!row||hex(encodeCanonical(row))!==hex(Uint8Array.from(r.canonical_receipt[0]))||await sha256Web(data)!==r.event_artifact_hash[0])throw Error('receipt artifact mismatch');
  const status=row.status==='applied'?'Applied':row.status==='partially_applied'?'PartiallyApplied':row.reason==='ACCEPTED'?'Applied':row.reason==='DUPLICATE'?'Duplicate':'Rejected';
  if(Object.keys(r.status)[0]!==status)throw Error('receipt outcome differs from authenticated event');
  output.receipt={status,verified_canonical_outcome:row,deduplication_key:`${proof.publication.identity.source_id}:${position}`};
 }
}
console.log(JSON.stringify(output,(_key,v)=>typeof v==='bigint'?{$integer:v.toString()}:v,2));
