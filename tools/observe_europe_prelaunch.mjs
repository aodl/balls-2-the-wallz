#!/usr/bin/env node
// Bounded European prelaunch observations using anonymous signed queries and certified public data.
import fs from 'node:fs/promises';
import {parseArgs} from 'node:util';
import {freezingEstimate,prelaunchRunway} from './prelaunch_runway.mjs';
import {Actor,HttpAgent,CanisterStatus} from '@icp-sdk/core/agent';
import {Principal} from '@icp-sdk/core/principal';
import {liveClient,certificateVerifier} from '@dtr/timeline-runtime/client/ic-certificate';
import {verifyCertificatePublication,ArtifactAssembler} from '@dtr/timeline-runtime/client/verification';
import {decodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {certifiedSource,operationalReader} from '../apps/b2z-observer/mainnet.mjs';

const {values}=parseArgs({options:{output:{type:'string'},baseline:{type:'string'}}});
if(!values.output)throw Error('Use --output with a new local observation path.');
const baseline=values.baseline?JSON.parse(await fs.readFile(values.baseline,'utf8')):null;
const backend='s5ir5-gqaaa-aaaas-amyna-cai', frontend='s2jxj-liaaa-aaaas-amynq-cai';
const policy={network:'ic',canister_id:backend,host:'https://icp-api.io'};
const agent=await HttpAgent.create({host:policy.host,fetch:(url,options={})=>fetch(url,{...options,signal:options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(12000)]):AbortSignal.timeout(12000)}),shouldFetchRootKey:false,shouldSyncTime:false,verifyQuerySignatures:true,retryTimes:0});
const detail={started_at:new Date().toISOString(),scope:'Read-only certified public and signed operational queries'};
const status=async id=>{
 const target=Principal.fromText(id);
 const actor=Actor.createActor(({IDL})=>IDL.Service({canister_status:IDL.Func([IDL.Record({canister_id:IDL.Principal})],
 [IDL.Record({status:IDL.Variant({running:IDL.Null,stopping:IDL.Null,stopped:IDL.Null}),cycles:IDL.Nat,reserved_cycles:IDL.Nat,
 idle_cycles_burned_per_day:IDL.Nat,settings:IDL.Record({freezing_threshold:IDL.Nat})})],['query'])}),
 {agent,canisterId:'aaaaa-aa',effectiveCanisterId:target});
 const [module,current]=await Promise.all([CanisterStatus.request({agent,canisterId:id,paths:['module_hash']}),actor.canister_status({canister_id:target})]);
 return {id,module_sha256:module.get('module_hash'),module_certificate_verified:true,...current};
};
const state=async()=>{
 const client=await liveClient(policy), observation=await client.observation();
 const ticket=await verifyCertificatePublication(observation.publication,observation.certificate,{...policy,now_ns:BigInt(Date.now())*1000000n,max_age_ns:300000000000n,max_future_ns:30000000000n},certificateVerifier({network:'ic'}));
 const p=ticket.publication, index=p.artifacts.findIndex(a=>a.kind==='state'), assembler=new ArtifactAssembler(ticket,'state');
 for(let n=0;n<p.artifacts[index].chunks.length;n++) await assembler.accept(n,await client.chunk(Number(p.head.segment_id),ticket.root_hash,index,n));
 const w=decodeCanonical(await assembler.finish());
 const s=await certifiedSource(policy,ticket,{agent});
 return {root:ticket.root_hash,head:p.head.segment_id,logical_time:p.head.logical_end,source_cursor:p.head.source_to_exclusive,identity:p.identity,
  state_sha256:p.head.state_hash,accounts_with_cannons:new Set(w.cannons.map(c=>c.account)).size,cannons:w.cannons.length,
  balls:w.balls.length,diverters:w.deflectors.length,reservoirs:w.reservoir_ranges.reduce((n,[a,b])=>n+Number(b)-Number(a),0),
  source:{index:s.index,ledger:s.ledger,subaccount:s.subaccount,network:s.network}};
};
const healthActor=Actor.createActor(({IDL})=>IDL.Service({
 runtime_health:IDL.Func([],[IDL.Record({
  version:IDL.Nat32,observed_at_ns:IDL.Nat64,runtime_started_ns:IDL.Nat64,liquid_cycles:IDL.Nat,total_cycles:IDL.Nat,
  known_treasury_credit_delta:IDL.Nat,reservation_gap_start:IDL.Nat,reservation_gap_end:IDL.Nat,
 })],['query']),
}),{agent,canisterId:backend});
const readOperational=operationalReader(agent,backend);
const [before,f,p]=await Promise.all([status(backend),status(frontend),state()]);
const [h,o]=await Promise.all([healthActor.runtime_health(),readOperational()]);
const after=await status(backend);
if(before.module_sha256!==after.module_sha256)throw Error('Backend changed during the observation.');
const bracketingGap=before.cycles>after.cycles?before.cycles-after.cycles:after.cycles-before.cycles;
const reserveGap=h.total_cycles-h.liquid_cycles;
const freezing=freezingEstimate(after);
const extraGap=reserveGap>freezing?reserveGap-freezing:freezing-reserveGap;
// A source request may transiently reserve tens of billions of cycles.
// Keep all observations and expose projections only for a settled bracket.
const settled=h.total_cycles>=h.liquid_cycles&&extraGap<=1000000000n&&
 bracketingGap<=1000000000n&&h.total_cycles+1000000000n>=after.cycles&&after.cycles+1000000000n>=h.total_cycles;
Object.assign(detail,{observed_at:new Date().toISOString(),backend:after,frontend:f,publication:p,signed_status:o,
 health:h,settlement:{settled,management_before:before.cycles,management_after:after.cycles,
  management_gap:bracketingGap,health_gap:reserveGap,estimated_freezing:freezing,unexpected_gap:extraGap}});
const serializable=JSON.parse(JSON.stringify(detail,(_,v)=>typeof v==='bigint'?String(v):v));
serializable.runway=prelaunchRunway(baseline,serializable);
await fs.writeFile(values.output,JSON.stringify(serializable,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({observed_at:detail.observed_at,settled,publication:String(p.head),runway:serializable.runway}));
