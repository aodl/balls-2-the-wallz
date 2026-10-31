/** Independent application replay. Authentication belongs to the capture gate.
 * Expected events supply only hash-bound elapsed-time facts; gameplay is recomputed. */
import {TimelineCoordinator} from '@dtr/timeline-runtime/runtime/coordinator';
import {encodeCanonical,decodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {publication} from '@dtr/timeline-runtime/observation/publication';
import {unhex,hex} from '@dtr/timeline-runtime/protocol/bytes';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
import {stageTorusMigration,stageMillionWorld} from '../../packages/kernels/b2z/migration.mjs';
import {migratePlayability,dueFences} from '../../packages/kernels/b2z/playability.mjs';
import {expireV6} from '../../packages/kernels/b2z/lifecycle-v6.mjs';
import {decodeWorld,encodeWorld,MILLION_IDENTITY,PLAYABILITY_IDENTITY} from '../../packages/kernels/b2z/world.mjs';
import {B2zKernel} from '../../packages/kernels/b2z/kernel.mjs';
const equal=(a,b)=>hex(encodeCanonical(a))===hex(encodeCanonical(b));
const check=(ok,message)=>{if(!ok)throw Error(message);};
const emptyOutput=(state,version,events=[])=>({state,events:encodeCanonical({version,receipts:[],events}),scores:encodeCanonical({version,area_time:[]})});
export function replayHistory(trace){
 check(trace.status==='PASS'&&trace.publications?.length&&Array.isArray(trace.inputs)&&Array.isArray(trace.assigned),'complete captured history required');
 const inputs=trace.inputs.map(i=>({position:BigInt(i.position),payload_hex:i.payload_hex})),artifacts=new Map();
 check(inputs.every(i=>i.position>=0n&&i.position<=18446744073709551615n&&typeof i.payload_hex==='string'&&/^[0-9a-f]{112}$/.test(i.payload_hex))&&new Set(inputs.map(i=>String(i.position))).size===inputs.length,'bounded unique normalized inputs required');
 for(const row of trace.artifact_events??[]){const id=BigInt(row.segment_id).toString();check(!artifacts.has(id),'duplicate event artifact');artifacts.set(id,row.events_hex);}
 const eventBytes=p=>{const bytes=unhex(artifacts.get(p.head.segment_id.toString())??'');check(bytes.length>0&&bytes.length<=1048576&&sha256(bytes)===p.artifacts.find(a=>a.kind==='events')?.sha256,'missing or invalid replay event artifact at '+p.head.segment_id);return bytes;};
 let completionTime=null;
 const wrap=cursor=>({cursor,step(budget){const progress=cursor.step(budget);if(progress.complete&&cursor.needsElapsed()){check(completionTime!==null,'missing elapsed completion fact');cursor.finalizeElapsed(completionTime);}return progress;},snapshot:()=>cursor.snapshot(),result:()=>cursor.result()});
 const kernel={begin:(...args)=>wrap(B2zKernel.begin(...args)),restore:(...args)=>wrap(B2zKernel.restore(...args)),fork:c=>wrap(B2zKernel.fork(c.cursor))};
 const first=trace.publications[0];check(first.head.seal!==null,'history must start with a complete genesis segment');
 const host=TimelineCoordinator.create(unhex(trace.initial_world_hex),first.identity,{logical_start:0n,source_from:0n},kernel);
 const assigned=[];let segments=0,checkpoints=0;
 for(const p of trace.publications){
  if(p.head.seal===null){
   check([7,8,9].includes(p.version)&&p.epoch,'unsupported replay checkpoint');
   const before=unhex(host.committed().state_hex),old=decodeWorld(before);let out,metadata;
   if(p.version===7){
    const raw=trace.epoch_metadata?.[p.epoch.transition_hash]??trace.metadata_hex;check(typeof raw==='string','missing historical transition metadata');
    const proof=decodeCanonical(unhex(raw)),proposed=stageTorusMigration(before,{...proof,identity:host.publicationRecord().journal.identity});
    metadata=encodeCanonical(proposed.transition);check(hex(metadata)===raw,'application transition metadata mismatch');out=emptyOutput(proposed.state,4);
   }else if(p.version===8){
    const events=old.version===5?decodeCanonical(eventBytes(p)):null;
    const raw=events?encodeCanonical(events.events[0]?.context):unhex(trace.epoch_metadata?.[p.epoch.transition_hash]??'');
    const context=decodeCanonical(raw),isSix=old.version===5,version=isSix?6:5,id=isSix?PLAYABILITY_IDENTITY:MILLION_IDENTITY;
    check(old.version===(isSix?5:4),'unsupported rules predecessor');
    check(Object.keys(id).every(k=>p.identity[k]===id[k])&&p.identity.source_id===host.publicationRecord().journal.identity.source_id,'application transition identity');
    const state=isSix?encodeWorld(migratePlayability(old,context.observed_ns)):stageMillionWorld(before);
    const expected={version:isSix?3:2,migration:isSix?'B2Z_PLAYABILITY_FROM_V5_01':'B2Z_SCALE_32_TORUS_TO_1000_TORUS_01',old_identity:host.publicationRecord().journal.identity,new_identity:p.identity,previous_state:sha256(before),new_state:sha256(state),logical_boundary:old.time,source_cursor:host.committed().source_to_exclusive,ledger_cutover:context.ledger_cutover,account_history_complete_through:context.ledger_cutover,index_synced:context.index_synced,source_anchor:host.committed().seal?.source_anchor??host.publicationRecord().journal.epoch.source_anchor,...(isSix?{observed_ns:context.observed_ns,memo_adapter_before:3,memo_adapter_after:4}:{})};
    check(typeof context.ledger_cutover==='bigint'&&context.ledger_cutover>=expected.source_cursor&&typeof context.index_synced==='bigint'&&context.index_synced>=context.ledger_cutover&&equal(context,expected),'application cutover context mismatch');
    metadata=encodeCanonical(expected);out=emptyOutput(state,version,isSix?[{kind:'rules_activated',sequence:0,time:old.time,context:expected}]:[]);
   }else{
    const events=decodeCanonical(eventBytes(p)),context=events.events[0]?.context;
    check(old.version===6&&events.events[0]?.kind==='lifecycle_context'&&context,'missing lifecycle checkpoint context');
    check(equal(context.fences,dueFences(old,context.observed_ns)),'incomplete lifecycle due fences');
    const proposed=expireV6(old,context.observed_ns,context.fences);check(proposed&&equal(decodeCanonical(proposed.metadata),context),'lifecycle context mismatch');out=proposed.output;metadata=proposed.metadata;
    const cursor=host.committed().source_to_exclusive;check(p.epoch.source_cursor>=cursor,'checkpoint source rollback');
    if(p.epoch.source_cursor>cursor)host.ingestOrdered(cursor,p.epoch.source_cursor,[],p.epoch.source_anchor);
   }
   check(sha256(metadata)===p.epoch.metadata_hash,'checkpoint metadata commitment mismatch');
   const epoch=p.version===9?host.prepareCheckpoint(out,sha256(metadata)):host.prepareTransition(p.identity,out,sha256(metadata));check(equal(epoch,p.epoch),'recomputed epoch mismatch');
   host.apply({kind:'transition',epoch,state_hex:hex(out.state),event_hex:hex(out.events),score_hex:hex(out.scores)});checkpoints++;
  }else{
   const seal=p.head.seal,selected=inputs.filter(i=>i.position>=seal.source_from&&i.position<seal.source_to_exclusive);completionTime=null;
   if(p.identity.config_hash===PLAYABILITY_IDENTITY.config_hash){
    const event=decodeCanonical(eventBytes(p)),facts=event.events.filter(e=>e.kind==='lifecycle_time'),last=event.events.at(-1);
    check(event.version===6&&facts.length===1&&last===facts[0]&&equal(last.time,[seal.logical_end,1n])&&typeof last.observed_ns==='bigint','invalid completion fact');completionTime=last.observed_ns;
   }
   assigned.push(...selected.map(i=>i.position.toString()));
   if(selected.length===0)host.ingestOrdered(seal.source_from,seal.source_to_exclusive,[],seal.source_anchor);
   else{let start=seal.source_from;for(let offset=0;offset<selected.length;offset+=256){const part=selected.slice(offset,offset+256),end=offset+256>=selected.length?seal.source_to_exclusive:part.at(-1).position+1n;host.ingestOrdered(start,end,part,seal.source_anchor);start=end;}}
   host.seal(seal.logical_end);while(host.status().phase==='running')host.advance(23);host.publish(host.status().ready_hash);segments++;
  }
  check(equal(publication(host.publicationRecord()).data,p),'authoritative replay mismatch at '+p.head.segment_id);
 }
 check(new Set(assigned).size===assigned.length&&equal(assigned,trace.assigned.map(String)),'exactly-once assignment mismatch');
 const retired=host.committed().source_to_exclusive,set=new Set(assigned);check(inputs.every(i=>i.position>=retired||set.has(String(i.position))),'unassigned input before completed source fence');
 return{status:'PASS',segments:trace.publications.length,gameplay_segments:segments,application_checkpoints:checkpoints,assigned,comparison:'Exact canonical publication bytes and state/events/scores hashes; authentication is supplied by capture',work_budget:23};
}
