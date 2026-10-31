/** Wire content reconstruction only. The browser/SDK gate owns IC authenticity. */
import {Cbor} from '@icp-sdk/core/agent';
import {IDL} from '@icp-sdk/core/candid';
import {decodeCanonical,encodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
import {hex} from '@dtr/timeline-runtime/protocol/bytes';
import {verifyPinnedPublication} from '@dtr/timeline-runtime/client/verification';
import {PLAYABILITY_IDENTITY} from '../../apps/b2z-observer/torus-identity.generated.mjs';
const check=(ok,s)=>{if(!ok)throw Error(s);},get=(v,k)=>v instanceof Map?v.get(k):v?.[k],blob=IDL.Vec(IDL.Nat8),observation=IDL.Record({publication:blob});
export async function capturePlayabilityHistory(index,files,seed){
 check(Array.isArray(index.errors)&&index.errors.length===0,'wire capture errors');
 check(index.capture_finalization?.status==='PASS'&&index.pending_at_index?.length===0,'capture finalisation incomplete');
 check(Number.isSafeInteger(index.complete_through)&&index.complete_through>=0,'completed publication fence required');
 check(Array.isArray(index.packets)&&index.packets.length<=4096,'capture packet bound');
 check(seed.status==='PASS'&&typeof seed.initial_world_hex==='string'&&Array.isArray(seed.inputs)&&seed.inputs.length<=4096,'explicit bounded replay seed required');
 const history=new Map(),chunks=new Map(),usedFiles=new Set(),replyErrors=[];let prior=-1,bytes=0;
 const remember=body=>{body=Uint8Array.from(body);check(body.length<=1048576,'artifact body bound');for(let offset=0;offset<body.length;offset+=16384){const part=body.slice(offset,offset+16384),hash=sha256(part),old=chunks.get(hash);if(old)check(hex(old)===hex(part),'conflicting chunk bytes');else chunks.set(hash,part);}};
 for(const packet of index.packets){
  check(Number.isSafeInteger(packet.sequence)&&packet.sequence>prior,'capture callback ordering');prior=packet.sequence;
  check(packet.file===String(packet.sequence).padStart(4,'0')+'.cbor'&&!usedFiles.has(packet.file)&&/^[0-9a-f]{64}$/.test(packet.request_sha256),'capture filename/request identity');usedFiles.add(packet.file);
  const raw=files.get(packet.file);check(raw instanceof Uint8Array&&sha256(raw)===packet.response_sha256,'wire response SHA-256');bytes+=raw.length;
  check(bytes<=128*1024*1024,'capture byte bound');
  check(packet.status===200,'unsuccessful captured HTTP response');
  const envelope=Cbor.decode(raw);check(get(envelope,'status')==='replied','captured query did not reply');
  const type=packet.method==='observation_bundle'?IDL.Record({observation,artifacts:IDL.Vec(blob)}):packet.method==='observation'?observation:packet.method==='retained_publication'?blob:packet.method==='artifact_bundle'?IDL.Vec(blob):['artifact_chunk','retained_artifact_chunk'].includes(packet.method)?blob:null;
  check(type!==null,'unsupported captured method');
  const result=IDL.decode([IDL.Variant({Ok:type,Err:IDL.Text})],Uint8Array.from(get(get(envelope,'reply'),'arg')))[0];
  if('Err'in result){replyErrors.push({sequence:packet.sequence,method:packet.method,error:result.Err});continue;}
  const value=result.Ok;
  if(['artifact_bundle','artifact_chunk','retained_artifact_chunk'].includes(packet.method)){for(const body of packet.method==='artifact_bundle'?value:[value])remember(body);continue;}
  const publicationBytes=Uint8Array.from(packet.method==='retained_publication'?value:packet.method==='observation'?value.publication:value.observation.publication),p=decodeCanonical(publicationBytes);
  check(hex(encodeCanonical(p))===hex(publicationBytes),'noncanonical captured publication');
  await verifyPinnedPublication(publicationBytes,sha256(publicationBytes)); // Content validation only, never an IC-authenticity substitute.
  if(packet.method==='observation_bundle'){check(value.artifacts.length===3&&p.artifacts.length===3,'observation artifact shape');for(let i=0;i<3;i++){const body=Uint8Array.from(value.artifacts[i]);check(body.length===p.artifacts[i].length&&sha256(body)===p.artifacts[i].sha256,'observation artifact integrity');remember(body);}}
  const segment=p.head.segment_id;if(segment===null)continue;check(segment>=0n&&segment<=BigInt(Number.MAX_SAFE_INTEGER),'publication ordinal');
  const id=Number(segment),old=history.get(id);if(old)check(hex(old.bytes)===hex(publicationBytes),'same-height conflicting capture');else history.set(id,{p,bytes:publicationBytes});
 }
 check(bytes===index.bytes&&bytes<=128*1024*1024,'capture byte accounting');
 const ordered=[...history].filter(([id])=>id<=index.complete_through).sort((a,b)=>a[0]-b[0]);
 check(ordered.length>=8&&ordered.at(-1)?.[0]===index.complete_through,'incomplete consolidated captured history');
 ordered.forEach(([id],i)=>check(id===i,'captured publication gap'));
 const events=[],metadata={...(seed.epoch_metadata??{})};
 for(const [id,{p}]of ordered){
  if(p.identity.config_hash!==PLAYABILITY_IDENTITY.config_hash&&p.version!==9)continue;
  const d=p.artifacts.find(a=>a.kind==='events');check(d&&d.length<=1048576&&p.chunk_bytes===16384,'event descriptor bounds');
  const parts=d.chunks.map(h=>{const b=chunks.get(h);check(b,'missing event bytes at '+id);return b;}),body=new Uint8Array(parts.reduce((n,b)=>n+b.length,0));let at=0;for(const part of parts){body.set(part,at);at+=part.length;}
  check(body.length===d.length&&sha256(body)===d.sha256,'complete event artifact integrity');events.push({segment_id:String(id),events_hex:hex(body)});
  if(p.head.seal===null){const e=decodeCanonical(body),context=e.events[0]?.context;check(context&&sha256(encodeCanonical(context))===p.epoch.metadata_hash,'captured context commitment');const raw=hex(encodeCanonical(context));if(metadata[p.epoch.transition_hash])check(metadata[p.epoch.transition_hash]===raw,'conflicting seed context');metadata[p.epoch.transition_hash]=raw;}
 }
 const inputs=seed.inputs.map(i=>({...i,position:BigInt(i.position)})),assigned=[];check(new Set(inputs.map(i=>String(i.position))).size===inputs.length,'duplicate source input');
 for(const[,entry]of ordered){const seal=entry.p.head.seal;if(!seal)continue;const selected=inputs.filter(i=>i.position>=seal.source_from&&i.position<seal.source_to_exclusive);check(selected.length===seal.input_count,'captured input count mismatch');assigned.push(...selected.map(i=>i.position.toString()));}
 const end=ordered.at(-1)[1].p.head.source_to_exclusive,set=new Set(assigned);check(inputs.every(i=>i.position>=end||set.has(String(i.position))),'unassigned source input before capture fence');
 return{status:'PASS',qualification:'Complete browser wire content; IC certificate/source authenticity is qualified separately by the genuine browser/SDK path',evidence_class:seed.evidence_class??'DISPOSABLE_PLAYABILITY_WIRE_CONTENT',initial_world_hex:seed.initial_world_hex,inputs:seed.inputs,assigned,publications:ordered.map(([,v])=>v.p),artifact_events:events,epoch_metadata:metadata,complete_through:index.complete_through,query_reply_errors:replyErrors,unassigned_future_input_positions:inputs.filter(i=>!set.has(String(i.position))).map(i=>String(i.position)),wire_packets:index.packets.length,wire_bytes:bytes};
}
