import {decodeDelegatedPayment} from '../../packages/protocol/delegation.mjs';
import {untimedPayment} from '../../packages/protocol/economy17.mjs';
import {migrateEconomy} from '../../packages/kernels/b2z/economy17.mjs';
import {readReservoirPayment} from '../../packages/protocol/reservoir.mjs';
import {migrateReservoirs} from '../../packages/kernels/b2z/reservoirs.mjs';
import {readShoutPayment} from '../../packages/protocol/shout.mjs';
import {readContextPayment} from '../../packages/protocol/context-structures.mjs';
import {readDeflectorPayment}from'../../packages/protocol/deflector.mjs';
import {migrateDeflectorWorld}from'../../packages/kernels/b2z/deflectors-v12.mjs';
import {readAnnotatedPayment}from'../../packages/protocol/war-cry.mjs';
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
import {decodeWorld,encodeWorld,MILLION_IDENTITY,PLAYABILITY_IDENTITY,ENTRY_IDENTITY,CLEARANCE_IDENTITY,WAR_CRY_IDENTITY,COMBINED_IDENTITY,DEFLECTOR_IDENTITY,CONTEXT_IDENTITY,SHOUT_IDENTITY,SPACING_IDENTITY,RESERVOIR_IDENTITY,ECONOMY_IDENTITY,DELEGATED_IDENTITY,COMPACT_RESERVOIR_IDENTITY,migrateDelegation,migrateCompactReservoirs} from '../../packages/kernels/b2z/world.mjs';
import {B2zKernel} from '../../packages/kernels/b2z/kernel.mjs';
const equal=(a,b)=>hex(encodeCanonical(a))===hex(encodeCanonical(b));
const check=(ok,message)=>{if(!ok)throw Error(message);};
const emptyOutput=(state,version,events=[])=>({state,events:encodeCanonical({version,receipts:[],events}),scores:encodeCanonical({version,area_time:[]})});
export function replayHistory(trace,{diagnostic}={}){
 check(trace.status==='PASS'&&trace.publications?.length&&Array.isArray(trace.inputs)&&Array.isArray(trace.assigned),'complete captured history required');
 const inputs=trace.inputs.map(i=>({position:BigInt(i.position),payload_hex:i.payload_hex})),artifacts=new Map();
 check(inputs.every(i=>i.position>=0n&&i.position<=18446744073709551615n&&typeof i.payload_hex==='string'&&(/^[0-9a-f]{112}$/.test(i.payload_hex)||/^[0-9a-f]{114,438}$/.test(i.payload_hex)&&(()=>{try{const raw=unhex(i.payload_hex);if(i.payload_hex.startsWith("42545a5041593039"))decodeDelegatedPayment(raw);else if(i.payload_hex.startsWith("42545a5041593038"))untimedPayment(raw);else if(i.payload_hex.startsWith("42545a5041593037"))readReservoirPayment(raw);else if(i.payload_hex.startsWith("42545a5041593036"))readShoutPayment(raw);else if(i.payload_hex.startsWith("42545a5041593035"))readContextPayment(raw);else if(i.payload_hex.startsWith("42545a5041593034"))readDeflectorPayment(raw);else readAnnotatedPayment(raw);return true;}catch{return false;}})()))&&new Set(inputs.map(i=>String(i.position))).size===inputs.length,'bounded unique normalized inputs required');
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
   const spacing=p.identity.config_hash===SPACING_IDENTITY.config_hash,shout=p.identity.config_hash===SHOUT_IDENTITY.config_hash;
   if(p.version===8&&old.version===10&&p.identity.config_hash===COMPACT_RESERVOIR_IDENTITY.config_hash){
    const audit=decodeCanonical(eventBytes(p)),context=audit.events[0]?.context,kind='reservoir_encoding_compacted',prior=host.publicationRecord().journal;
    check(audit.version===11&&audit.events.length===1&&audit.events[0].kind===kind&&context,'compact Reservoir activation context');
    check(Object.keys(DELEGATED_IDENTITY).every(k=>prior.identity[k]===DELEGATED_IDENTITY[k])&&Object.keys(COMPACT_RESERVOIR_IDENTITY).every(k=>p.identity[k]===COMPACT_RESERVOIR_IDENTITY[k])&&p.identity.source_id===prior.identity.source_id,'compact Reservoir transition identity');
    const state=encodeWorld(migrateCompactReservoirs(old));
    const expected={version:15,migration:'B2Z_COMPACT_RESERVOIR_RULES_19',old_identity:prior.identity,new_identity:p.identity,previous_state:sha256(before),new_state:sha256(state),logical_boundary:old.time,source_cursor:host.committed().source_to_exclusive,ledger_cutover:context.ledger_cutover,account_history_complete_through:context.ledger_cutover,index_synced:context.index_synced,source_anchor:host.committed().seal?.source_anchor??prior.epoch?.source_anchor,memo_adapter_before:12,memo_adapter_after:12};
    check(typeof context.ledger_cutover==='bigint'&&context.ledger_cutover>=expected.source_cursor&&typeof context.index_synced==='bigint'&&context.index_synced>=context.ledger_cutover&&equal(context,expected),'compact Reservoir cutover context mismatch');
    metadata=encodeCanonical(expected);out=emptyOutput(state,11,[{kind,sequence:0,time:old.time,context:expected}]);
   }else if(p.version===8&&old.version===9&&p.identity.config_hash===DELEGATED_IDENTITY.config_hash){
    const audit=decodeCanonical(eventBytes(p)),context=audit.events[0]?.context,kind='delegated_payments_activated',prior=host.publicationRecord().journal;
    check(audit.version===10&&audit.events.length===1&&audit.events[0].kind===kind&&context,'delegation activation context');
    check(Object.keys(ECONOMY_IDENTITY).every(k=>prior.identity[k]===ECONOMY_IDENTITY[k])&&Object.keys(DELEGATED_IDENTITY).every(k=>p.identity[k]===DELEGATED_IDENTITY[k])&&p.identity.source_id===prior.identity.source_id,'delegation transition identity');
    const state=encodeWorld(migrateDelegation(old,context.recipient));
    const expected={version:14,migration:'B2Z_DELEGATED_PAYMENT_RULES_18',old_identity:prior.identity,new_identity:p.identity,previous_state:sha256(before),new_state:sha256(state),logical_boundary:old.time,source_cursor:host.committed().source_to_exclusive,ledger_cutover:context.ledger_cutover,account_history_complete_through:context.ledger_cutover,index_synced:context.index_synced,source_anchor:host.committed().seal?.source_anchor??prior.epoch?.source_anchor,memo_adapter_before:11,memo_adapter_after:12,recipient:context.recipient};
    check(typeof context.ledger_cutover==='bigint'&&context.ledger_cutover>=expected.source_cursor&&typeof context.index_synced==='bigint'&&context.index_synced>=context.ledger_cutover&&equal(context,expected),'delegation cutover context mismatch');
    metadata=encodeCanonical(expected);out=emptyOutput(state,10,[{kind,sequence:0,time:old.time,context:expected}]);
   }else if(p.version===8&&old.version===8&&p.identity.config_hash===ECONOMY_IDENTITY.config_hash){
    const audit=decodeCanonical(eventBytes(p)),context=audit.events[0]?.context,kind='economy_rules_activated',prior=host.publicationRecord().journal;
    check(audit.version===9&&audit.events.length===1&&audit.events[0].kind===kind&&context?.bootstrap,'economy activation context');
    check(Object.keys(RESERVOIR_IDENTITY).every(k=>prior.identity[k]===RESERVOIR_IDENTITY[k])&&Object.keys(ECONOMY_IDENTITY).every(k=>p.identity[k]===ECONOMY_IDENTITY[k])&&p.identity.source_id===prior.identity.source_id,'economy transition identity');
    const migrated=migrateEconomy(old,context.bootstrap.activated_ns,sha256(before)),state=encodeWorld(migrated);
    const expected={version:13,migration:'B2Z_DAILY_ECONOMY_RULES_17',old_identity:prior.identity,new_identity:p.identity,previous_state:sha256(before),new_state:sha256(state),logical_boundary:old.time,source_cursor:host.committed().source_to_exclusive,ledger_cutover:context.ledger_cutover,account_history_complete_through:context.ledger_cutover,index_synced:context.index_synced,source_anchor:host.committed().seal?.source_anchor??prior.epoch?.source_anchor,memo_adapter_before:10,memo_adapter_after:11,bootstrap:migrated.economy};
    check(typeof context.ledger_cutover==='bigint'&&context.ledger_cutover>=expected.source_cursor&&typeof context.index_synced==='bigint'&&context.index_synced>=context.ledger_cutover&&equal(context,expected),'economy cutover context mismatch');
    metadata=encodeCanonical(expected);out=emptyOutput(state,9,[{kind,sequence:0,time:old.time,context:expected}]);
   }else if(p.version===8&&old.version===7&&p.identity.config_hash===RESERVOIR_IDENTITY.config_hash){
    const audit=decodeCanonical(eventBytes(p)),context=audit.events[0]?.context,kind='reservoir_rules_activated',prior=host.publicationRecord().journal;
    check(audit.version===8&&audit.events.length===1&&audit.events[0].kind===kind&&context,'reservoir activation context');
    check(Object.keys(SPACING_IDENTITY).every(k=>prior.identity[k]===SPACING_IDENTITY[k])&&Object.keys(RESERVOIR_IDENTITY).every(k=>p.identity[k]===RESERVOIR_IDENTITY[k])&&p.identity.source_id===prior.identity.source_id,'reservoir transition identity');
    const state=encodeWorld(migrateReservoirs(old));
    const expected={version:12,migration:'B2Z_RESERVOIR_RULES_16',old_identity:prior.identity,new_identity:p.identity,previous_state:sha256(before),new_state:sha256(state),logical_boundary:old.time,source_cursor:host.committed().source_to_exclusive,ledger_cutover:context.ledger_cutover,account_history_complete_through:context.ledger_cutover,index_synced:context.index_synced,source_anchor:host.committed().seal?.source_anchor??prior.epoch?.source_anchor,memo_adapter_before:9,memo_adapter_after:10};
    check(typeof context.ledger_cutover==='bigint'&&context.ledger_cutover>=expected.source_cursor&&typeof context.index_synced==='bigint'&&context.index_synced>=context.ledger_cutover&&equal(context,expected),'reservoir cutover context mismatch');
    metadata=encodeCanonical(expected);out=emptyOutput(state,8,[{kind,sequence:0,time:old.time,context:expected}]);
   }else if([7,8].includes(p.version)&&old.version===7&&(spacing||shout||p.identity.config_hash===CONTEXT_IDENTITY.config_hash)){
    const audit=decodeCanonical(eventBytes(p)),context=audit.events[0]?.context,prior=host.publicationRecord().journal;
    const kind=spacing?'spacing_rules_activated':shout?'shout_rules_activated':'context_rules_activated',previous=spacing?SHOUT_IDENTITY:shout?CONTEXT_IDENTITY:DEFLECTOR_IDENTITY,next=spacing?SPACING_IDENTITY:shout?SHOUT_IDENTITY:CONTEXT_IDENTITY;
    check(audit.version===7&&audit.events.length===1&&audit.events[0].kind===kind&&context,'schema7 rules activation context');
    check(Object.keys(previous).every(k=>prior.identity[k]===previous[k])&&Object.keys(next).every(k=>p.identity[k]===next[k])&&p.identity.source_id===prior.identity.source_id,'schema7 rules transition identity');
    const expected={version:spacing?11:shout?10:9,migration:spacing?'B2Z_STRUCTURE_SPACING_RULES_15':shout?'B2Z_ACTION_SHOUT_RULES_14':'B2Z_CONTEXT_STRUCTURES_RULES_13',old_identity:prior.identity,new_identity:p.identity,previous_state:sha256(before),new_state:sha256(before),logical_boundary:old.time,source_cursor:host.committed().source_to_exclusive,ledger_cutover:context.ledger_cutover,account_history_complete_through:context.ledger_cutover,index_synced:context.index_synced,source_anchor:host.committed().seal?.source_anchor??prior.epoch?.source_anchor,memo_adapter_before:spacing?9:shout?8:7,memo_adapter_after:spacing||shout?9:8};
    check(typeof context.ledger_cutover==='bigint'&&context.ledger_cutover>=expected.source_cursor&&typeof context.index_synced==='bigint'&&context.index_synced>=context.ledger_cutover&&equal(context,expected),'schema7 cutover context mismatch');
    metadata=encodeCanonical(expected);out=emptyOutput(before,7,[{kind,sequence:0,time:old.time,context:expected}]);
   }else if(p.version===7&&old.version!==6){
    const raw=trace.epoch_metadata?.[p.epoch.transition_hash]??trace.metadata_hex;check(typeof raw==='string','missing historical transition metadata');
    const proof=decodeCanonical(unhex(raw)),proposed=stageTorusMigration(before,{...proof,identity:host.publicationRecord().journal.identity});
    metadata=encodeCanonical(proposed.transition);check(hex(metadata)===raw,'application transition metadata mismatch');out=emptyOutput(proposed.state,4);
   }else if(p.version===8&&old.version===6&&p.identity.config_hash===DEFLECTOR_IDENTITY.config_hash){
    const audit=decodeCanonical(eventBytes(p)),context=audit.events[0]?.context;
    check(audit.version===7&&audit.events.length===1&&audit.events[0].kind==='deflector_rules_activated'&&context,'Deflector activation context missing');
    check(Object.keys(COMBINED_IDENTITY).every(k=>host.publicationRecord().journal.identity[k]===COMBINED_IDENTITY[k])&&Object.keys(DEFLECTOR_IDENTITY).every(k=>p.identity[k]===DEFLECTOR_IDENTITY[k])&&p.identity.source_id===host.publicationRecord().journal.identity.source_id,'Deflector transition identity');
    const state=encodeWorld(migrateDeflectorWorld(old)),expected={version:8,migration:'B2Z_BOUNDARY_DEFLECTOR_RULES_12',old_identity:host.publicationRecord().journal.identity,new_identity:p.identity,previous_state:sha256(before),new_state:sha256(state),preserved_predecessor_projection:sha256(before),logical_boundary:old.time,source_cursor:host.committed().source_to_exclusive,ledger_cutover:context.ledger_cutover,account_history_complete_through:context.ledger_cutover,index_synced:context.index_synced,source_anchor:host.committed().seal?.source_anchor??host.publicationRecord().journal.epoch?.source_anchor,memo_adapter_before:6,memo_adapter_after:7};
    check(typeof context.ledger_cutover==='bigint'&&context.ledger_cutover>=expected.source_cursor&&typeof context.index_synced==='bigint'&&context.index_synced>=context.ledger_cutover&&equal(context,expected),'Deflector cutover context mismatch');
    metadata=encodeCanonical(expected);out=emptyOutput(state,7,[{kind:'deflector_rules_activated',sequence:0,time:old.time,context:expected}]);
   }else if([7,8].includes(p.version)&&old.version===6){
    const audit=decodeCanonical(eventBytes(p)),context=audit.events[0]?.context;
    check(audit.events[0]?.kind==='rules_activated'&&context,'entry activation context missing');
    const combined=context.migration==='B2Z_CLEARANCE_WAR_CRY_RULES_11',annotation=context.migration==='B2Z_WAR_CRY_RULES_10',clearance=context.migration==='B2Z_TERRITORY_CLEARANCE_RULES_09',predecessor=combined||annotation||clearance?ENTRY_IDENTITY:PLAYABILITY_IDENTITY,successor=combined?COMBINED_IDENTITY:annotation?WAR_CRY_IDENTITY:clearance?CLEARANCE_IDENTITY:ENTRY_IDENTITY;
    check(Object.keys(predecessor).every(k=>host.publicationRecord().journal.identity[k]===predecessor[k])&&Object.keys(successor).every(k=>p.identity[k]===successor[k])&&p.identity.source_id===host.publicationRecord().journal.identity.source_id,'entry transition identity');
    const expected={version:combined?7:annotation?6:clearance?5:4,migration:combined?'B2Z_CLEARANCE_WAR_CRY_RULES_11':annotation?'B2Z_WAR_CRY_RULES_10':clearance?'B2Z_TERRITORY_CLEARANCE_RULES_09':'B2Z_FARTHEST_ENTRY_RULES_07',old_identity:host.publicationRecord().journal.identity,new_identity:p.identity,previous_state:sha256(before),new_state:sha256(before),logical_boundary:old.time,source_cursor:host.committed().source_to_exclusive,ledger_cutover:context.ledger_cutover,account_history_complete_through:context.ledger_cutover,index_synced:context.index_synced,source_anchor:host.committed().seal?.source_anchor??host.publicationRecord().journal.epoch?.source_anchor,memo_adapter_before:4,memo_adapter_after:combined||annotation?6:4};
    check(typeof context.ledger_cutover==='bigint'&&context.ledger_cutover>=expected.source_cursor&&typeof context.index_synced==='bigint'&&context.index_synced>=context.ledger_cutover&&equal(context,expected),'entry cutover context mismatch');
    metadata=encodeCanonical(expected);out=emptyOutput(before,6,[{kind:'rules_activated',sequence:0,time:old.time,context:expected}]);
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
    check(old.version>=6&&events.events[0]?.kind==='lifecycle_context'&&context,'missing lifecycle checkpoint context');
    const due=dueFences(old,context.observed_ns);
    check(old.version>=9?Array.isArray(context.fences)&&context.fences.length<=due.length&&equal(context.fences,due.slice(0,context.fences.length)):equal(context.fences,due),'incomplete lifecycle due fences');
    const proposed=expireV6(old,context.observed_ns,context.fences);check(proposed&&equal(decodeCanonical(proposed.metadata),context),'lifecycle context mismatch');out=proposed.output;metadata=proposed.metadata;
    const cursor=host.committed().source_to_exclusive;check(p.epoch.source_cursor>=cursor,'checkpoint source rollback');
    if(p.epoch.source_cursor>cursor)host.ingestOrdered(cursor,p.epoch.source_cursor,[],p.epoch.source_anchor);
   }
   check(sha256(metadata)===p.epoch.metadata_hash,'checkpoint metadata commitment mismatch');
   const epoch=p.version===9?host.prepareCheckpoint(out,sha256(metadata)):host.prepareTransition(p.identity,out,sha256(metadata));check(equal(epoch,p.epoch),'recomputed epoch mismatch');
   host.apply({kind:'transition',epoch,state_hex:hex(out.state),event_hex:hex(out.events),score_hex:hex(out.scores)});checkpoints++;
  }else{
   const seal=p.head.seal,selected=inputs.filter(i=>i.position>=seal.source_from&&i.position<seal.source_to_exclusive);completionTime=null;
   if([PLAYABILITY_IDENTITY.config_hash,ENTRY_IDENTITY.config_hash,CLEARANCE_IDENTITY.config_hash,WAR_CRY_IDENTITY.config_hash,COMBINED_IDENTITY.config_hash,DEFLECTOR_IDENTITY.config_hash,CONTEXT_IDENTITY.config_hash,SHOUT_IDENTITY.config_hash,SPACING_IDENTITY.config_hash,RESERVOIR_IDENTITY.config_hash,ECONOMY_IDENTITY.config_hash,DELEGATED_IDENTITY.config_hash,COMPACT_RESERVOIR_IDENTITY.config_hash].includes(p.identity.config_hash)){
    const event=decodeCanonical(eventBytes(p)),facts=event.events.filter(e=>e.kind==='lifecycle_time'),last=event.events.at(-1);
    check(event.version===(p.identity.config_hash===COMPACT_RESERVOIR_IDENTITY.config_hash?11:p.identity.config_hash===DELEGATED_IDENTITY.config_hash?10:p.identity.config_hash===ECONOMY_IDENTITY.config_hash?9:p.identity.config_hash===RESERVOIR_IDENTITY.config_hash?8:[DEFLECTOR_IDENTITY.config_hash,CONTEXT_IDENTITY.config_hash,SHOUT_IDENTITY.config_hash,SPACING_IDENTITY.config_hash].includes(p.identity.config_hash)?7:6)&&facts.length===1&&last===facts[0]&&equal(last.time,[seal.logical_end,1n])&&typeof last.observed_ns==='bigint','invalid completion fact');completionTime=last.observed_ns;
   }
   assigned.push(...selected.map(i=>i.position.toString()));
   if(selected.length===0)host.ingestOrdered(seal.source_from,seal.source_to_exclusive,[],seal.source_anchor);
   else{let start=seal.source_from;for(let offset=0;offset<selected.length;offset+=256){const part=selected.slice(offset,offset+256),end=offset+256>=selected.length?seal.source_to_exclusive:part.at(-1).position+1n;host.ingestOrdered(start,end,part,seal.source_anchor);start=end;}}
   host.seal(seal.logical_end);while(host.status().phase==='running')host.advance(23);host.publish(host.status().ready_hash);segments++;
  }
  const actual=publication(host.publicationRecord()).data;
  if(!equal(actual,p)&&diagnostic)diagnostic({expected:p,actual,committed:host.committed(),expected_events_hex:hex(eventBytes(p))});
  check(equal(actual,p),'authoritative replay mismatch at '+p.head.segment_id);
 }
 check(new Set(assigned).size===assigned.length&&equal(assigned,trace.assigned.map(String)),'exactly-once assignment mismatch');
 const retired=host.committed().source_to_exclusive,set=new Set(assigned);check(inputs.every(i=>i.position>=retired||set.has(String(i.position))),'unassigned input before completed source fence');
 return{status:'PASS',segments:trace.publications.length,gameplay_segments:segments,application_checkpoints:checkpoints,assigned,comparison:'Exact canonical publication bytes and state/events/scores hashes; authentication is supplied by capture',work_budget:23};
}
