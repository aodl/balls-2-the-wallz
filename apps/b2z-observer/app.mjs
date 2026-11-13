import {zoomGain} from './audio-policy.mjs';
import {createAudioUI} from './audio-ui.mjs';
import {publicationAudioDescriptor} from './audio-events.mjs';
import {audioPose} from './audio-visibility.mjs';
import {startupPlayback} from './startup-playback.mjs';
import {elasticPlayback} from './elastic-playback.mjs';
import {publicCycleMonitor,renderCycleReadout} from './public-cycles.mjs';
import {replayTools} from './replay-tools.mjs';
import {recentPresentationPoint,retainLatestVerifiedInterval,bridgeVerifiedPresentation,resumeVerifiedClock,assertForwardPresentation,canRetainAcrossResync,freshObservation,operationalReplyCurrent} from './warm-return.mjs';
import {observationLoop} from './observation-loop.mjs';
import {experienceResolver} from './experience-status.mjs';
import {Camera} from './camera.mjs';
import {ballPresentation} from './ball-presentation.mjs';
const ballPoints=ballPresentation();
import {createShell} from './shell.mjs';
import {createArenaRenderer} from './render.mjs';
import {createArcade} from './arcade.mjs';
import deployment,{deploymentPolicy,deploymentConnection,deploymentSource} from './deployment.mjs';
import {PlayoutClock} from '../../node_modules/@dtr/timeline-runtime/packages/client/playout.mjs';
import {ArtifactAssembler,PublicationSequence,sha256Web,verifyCertificatePublication,verifyRetainedPredecessor} from '../../node_modules/@dtr/timeline-runtime/packages/client/verification.mjs';
import {B2zView,SegmentPlayer,CheckpointPlayer,prepareCheckpoint,snapshot,prepareDerivedSegment,prepareSegment,timeNumber,prepareIdlePlayout,nominalPace,publicationTicks,approachPace,approachPresentationPace,liveBufferPolicy,LIVE_BUFFER_LIMITS,liveSessionBufferPolicy} from './model.mjs';
import {readBytes,validateIndex,loadEntry,prefetchRetained} from './transport.mjs';
import {decodeCanonical} from '../../node_modules/@dtr/timeline-runtime/packages/runtime/canonical.mjs';
import {idleArena} from './play-reference.mjs';
import {observationFailure,liveDeliveryDiagnostics,liveDeliveryFailure,liveDeliverySuccess,rememberLiveAcceptance,deliveryRetryMs} from './live-delivery.mjs';
const resolveExperience=experienceResolver();
const $=id=>document.getElementById(id),canvas=$('board');
let audio;try{audio=createAudioUI(document);}catch{audio={fail(){},effectsReady:()=>false,begin:()=>null,flush(){},fence(){},lifecycle(){},dispose(){},inspect:()=>({unavailable:true})};}globalThis.__b2zAudio=()=>audio.inspect();
let audioCollector=null;
canvas.addEventListener('webglcontextlost',()=>audio.fence());
let arenaRenderer=null,renderError=null;
try{arenaRenderer=createArenaRenderer(canvas,{onError(message){renderError=message;$('render-error').hidden=false;$('render-error').textContent=message;},onRestore(){renderError=null;$('render-error').hidden=true;}});}catch(error){renderError=String(error);$('render-error').hidden=false;$('render-error').textContent='This browser could not start the 3D arena. WebGL 2 is required.';}
let cycleMonitor=null;
let bootError=null,catalog=null,session=null,paused=false,speed=1,lastFrame=null,lastHud=0;
let cameraRestored=false,lastDetailsKey='';
let deliveryPaused=false,visible=null,visibleTime=0,focusOnNextDraw=false;
const arcade=createArcade(document),camera=new Camera();
const shell=createShell(document,camera,arcade,{selected:()=>arcade.selected()??visible?.cannons.get(arcade.selectedCannon()),first:()=>visible?.cannons.values().next().value,cell:(n,p,screen)=>{
 if(arcade.moveSelection())return arcade.chooseCell(n);
 return false;
},cannons:()=>visible?.cannons??new Map()
});
globalThis.__b2zCamera=camera;
function showError(error){$('observation-error').textContent=String(error?.message??error);$('retry').hidden=false;}
function signal(s){return AbortSignal.any([s.abort.signal,AbortSignal.timeout(10000)]);}
function active(s){return session===s&&!s.abort.signal.aborted;}
async function start(recording){
  audio.fence();cycleMonitor?.stop();cycleMonitor=null;session?.abort.abort();arenaRenderer?.reset();shell.invalidateFollow();const s={recording,abort:new AbortController(),busy:true,ready:false,error:null,entry:1,bytes:0,
    queue:[],sequence:new PublicationSequence(),previousState:null,root:'',nextDue:0,clock:new PlayoutClock({start:0,target:Math.min(8,recording.logical_end),
      low:Math.min(2,recording.logical_end/2),max_frame_delta:1})};
  session=s;visible=null;visibleTime=0;lastFrame=null;
  try{
    const entry=await loadEntry(recording,0,signal(s));if(!active(s))return;
    const w=snapshot(entry.state);if(timeNumber(w.time)!==0||entry.ticket.publication.head.segment_id!==null)throw new Error('recording requires a genesis snapshot');
    s.sequence.accept(entry.ticket);s.previousState=entry.state;s.root=entry.ticket.root_hash;visible=new B2zView(w);s.ready=true;
  }catch(e){if(!active(s))return;s.error=e;s.failureKind=observationFailure(e);showError(e);}finally{s.busy=false;updateHud();draw();}
}
function localMetadata(value){
  const keys=['version','trust','network','canister_id','root_key_sha256','logical_start','logical_end','tick_seconds'];
  if(!value||Object.keys(value).sort().join(',')!==keys.sort().join(',')||value.version!==1||value.trust!=='local-ic-test-certificate'
    ||value.network!=='pocketic-local'||typeof value.canister_id!=='string'||!/^[0-9a-f]{64}$/.test(value.root_key_sha256)
    ||!Number.isSafeInteger(value.logical_start)||!Number.isSafeInteger(value.logical_end)||value.logical_start<0||value.logical_end<=value.logical_start
    ||value.logical_end>2048||!Number.isFinite(value.tick_seconds)||value.tick_seconds<.05||value.tick_seconds>10)throw new Error('local IC snapshot metadata');
  return value;
}
function liveMetadata(value){
  const keys=['version','trust','network','canister_id','root_key_sha256','tick_seconds','retained_segments','retained_bytes'];
  if(!value||Object.keys(value).sort().join(',')!==keys.sort().join(',')||value.version!==1||value.trust!=='live-local-ic-certificate'
    ||value.network!=='pocketic-local'||typeof value.canister_id!=='string'||!/^[0-9a-f]{64}$/.test(value.root_key_sha256)
    ||!Number.isFinite(value.tick_seconds)||value.tick_seconds<.05||value.tick_seconds>10
    ||!Number.isSafeInteger(value.retained_segments)||value.retained_segments<2||value.retained_segments>8
    ||!Number.isSafeInteger(value.retained_bytes)||value.retained_bytes<1||value.retained_bytes>16*1024*1024)throw new Error('live local IC metadata');
  return value;
}
async function localArtifact(ticket,kind,signal){
  const assembler=new ArtifactAssembler(ticket,kind),bytes=await readBytes(`/s09-local/${kind}.bin`,1048576,signal);
  if(bytes.length!==assembler.descriptor.length)throw new Error('local IC artifact length');
  for(let n=0;n<assembler.descriptor.chunks.length;n++)await assembler.accept(n,bytes.slice(n*16384,Math.min(bytes.length,(n+1)*16384)));
  return assembler.finish();
}
async function startLocal(recording){
  audio.fence();cycleMonitor?.stop();cycleMonitor=null;session?.abort.abort();arenaRenderer?.reset();shell.invalidateFollow();const s={mode:'local',recording,abort:new AbortController(),busy:true,ready:false,error:null,entry:2,bytes:0,
    queue:[],sequence:new PublicationSequence(),previousState:null,root:'',nextDue:0,clock:new PlayoutClock({start:recording.logical_start,
      target:Math.min(8,recording.logical_end-recording.logical_start),low:Math.min(2,(recording.logical_end-recording.logical_start)/2),max_frame_delta:1})};
  session=s;visible=null;visibleTime=0;lastFrame=null;
  try{
    const abort=signal(s),[catalogBytes,certificate,rootKey,initial]=await Promise.all([
      readBytes('/s09-local/catalog.bin',65536,abort),readBytes('/s09-local/certificate.cbor',262144,abort),
      readBytes('/s09-local/root-key.der',1024,abort),readBytes('/s09-local/initial-state.bin',1048576,abort),
    ]);if(!active(s))return;
    if(await sha256Web(rootKey)!==recording.root_key_sha256)throw new Error('configured local root fingerprint mismatch');
    const {localCertificateVerifier}=await import('/s09-assets/ic-certificate.mjs');
    const ticket=await verifyCertificatePublication(catalogBytes,certificate,{
      canister_id:recording.canister_id,network:recording.network,now_ns:BigInt(Date.now())*1000000n,
      max_age_ns:300000000000n,max_future_ns:30000000000n,
    },localCertificateVerifier(rootKey,{network:recording.network,maxAgeInMinutes:5}));if(!active(s))return;
    s.sequence.accept(ticket);
    const [state,events]=await Promise.all([localArtifact(ticket,'state',abort),localArtifact(ticket,'events',abort)]);if(!active(s))return;
    const segment=await prepareDerivedSegment(initial,state,events,ticket.publication);if(!active(s))return;
    if(segment.start!==recording.logical_start||segment.end!==recording.logical_end)throw new Error('local IC snapshot timeline');
    s.clock.append(segment.start,segment.end);s.queue.push({segment,player:new SegmentPlayer(segment,publicationAudioDescriptor(ticket,s.recording))});s.bytes=segment.bytes;
    s.previousState=state;s.root=ticket.root_hash;visible=new B2zView(segment.initial);s.ready=true;
  }catch(e){if(!active(s))return;s.error=e;s.failureKind=observationFailure(e);showError(e);}finally{s.busy=false;updateHud();draw();}
}
async function certifiedTicket(s,response){
  if(!response.certificate)throw new Error('live IC certificate missing');
  const ticket=await verifyCertificatePublication(response.publication,response.certificate,{
    canister_id:s.recording.canister_id,network:s.recording.network,now_ns:BigInt(Date.now())*1000000n,
    max_age_ns:300000000000n,max_future_ns:30000000000n,
  },s.verifyCertificate);
  s.certificateTimeNs=String(ticket.certificate_time_ns);
  s.certificateAgeMs=(Date.now()*1e6-Number(ticket.certificate_time_ns))/1e6;
  return ticket;
}
async function liveArtifacts(s,ticket){
  const segment=Number(ticket.publication.head.segment_id);if(!Number.isSafeInteger(segment)||segment<0)throw new Error('live segment id');
  const started=performance.now();
  if(typeof s.client.bundle==='function'){
    try{
      const bytes=await s.client.bundle(segment,ticket.root_hash);
      if(bytes.length!==ticket.publication.artifacts.length)throw new Error('artifact bundle shape');
      const entries=await Promise.all(bytes.map(async(value,kindIndex)=>{
        const descriptor=ticket.publication.artifacts[kindIndex],assembler=new ArtifactAssembler(ticket,descriptor.kind);
        if(value.length!==descriptor.length)throw new Error('artifact bundle shape');
        for(let index=0;index<descriptor.chunks.length;index++)await assembler.accept(index,value.slice(index*16384,(index+1)*16384));
        return [descriptor.kind,await assembler.finish()];
      }));
      s.artifactMs=performance.now()-started;s.bundleUsed=true;s.bundleError=null;return Object.fromEntries(entries);
    }catch(error){
      // An unavailable optional query can use the existing chunk ABI. Invalid
      // returned bytes must never be erased by a successful second download.
      if(/integrity|shape|mismatch|signature|certificate/i.test(String(error?.message??error)))throw error;
      s.bundleFallbacks=(s.bundleFallbacks??0)+1;s.bundleError=String(error?.message??error).slice(0,160);
      if(observationFailure(error)==='delivery')throw error;
    }
  }
  const results=await Promise.allSettled(['state','events','scores'].map(async(kind,kindIndex)=>{
    const assembler=new ArtifactAssembler(ticket,kind);
    for(let index=0;index<assembler.descriptor.chunks.length;index++){
      if(!active(s))throw new DOMException('Aborted','AbortError');
      await assembler.accept(index,await s.client.chunk(segment,ticket.root_hash,kindIndex,index));
    }
    return [kind,await assembler.finish()];
  }));
  s.artifactMs=performance.now()-started;const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;const artifacts=Object.fromEntries(results.map(r=>r.value));
  return artifacts;
}
function rememberHead(head){const heads=globalThis.__dtrLive.heads;heads.push(head);if(heads.length>4096)heads.splice(0,heads.length-4096);}
function presentationPace(s){return nominalPace(s.operational??s.lastPaceStatus);}
function observePresentation(s,ticket,deliverySeconds=0){
 const h=ticket.publication.head,ticks=h.seal?Number(h.seal.logical_end-h.seal.logical_start):publicationTicks(s.operational??s.lastPaceStatus);
 s.elastic.observe({key:ticket.root_hash,end:timeNumber(s.referenceWorld.time),at:performance.now(),nominal:presentationPace(s),ticks,deliverySeconds,identity:JSON.stringify(ticket.publication.identity)});
}
function targetPresentationRate(s,now,seconds){
 const base=presentationPace(s);return s.idleDrain?base:s.elastic.rate({now,nominal:base,remaining:s.clock.available-s.clock.playhead,seconds,reserveTicks:Math.max(0,s.clock.target-publicationTicks(s.operational??s.lastPaceStatus))});
}
function resetLiveClock(s,time){
  audio.fence();
  s.queue=[];s.bytes=0;s.largestSegmentBytes=0;s.idleDrain=false;s.elastic=elasticPlayback();delete s.presentationFence;s.presentationSkip=false;visibleTime=time;
  s.clock=new PlayoutClock({start:time,...liveSessionBufferPolicy(s),min_rate:1,max_rate:1,max_frame_delta:1});
}
async function startLive(recording,startupRetries=0,verificationFloor=null){
  audio.fence();cycleMonitor?.stop();cycleMonitor=null;session?.abort.abort();arenaRenderer?.reset();shell.invalidateFollow();const s={mode:'live',recording,abort:new AbortController(),busy:true,ready:false,error:null,bytes:0,queue:[],
    sequence:new PublicationSequence(),previousState:null,root:'',nextDue:0,clock:new PlayoutClock({start:0,target:3,low:1,max_frame_delta:1}),
    verificationFloor,client:null,verifyCertificate:null,accepted:0,resyncs:0,skipped:false,retryFailures:0,deliveryDiagnostics:liveDeliveryDiagnostics()};
  session=s;visible=null;visibleTime=0;lastFrame=null;updateHud();
  return acquireLive(s,startupRetries);
}
async function acquireLive(s,startupRetries=0){
  s.busy=true;const recording=s.recording;
  try{
    let ticket;
    if(recording.deployment){
      const module=await import('./mainnet.mjs');
      if(!s.client){const connection=await deploymentConnection(recording.deployment,{signal:s.abort.signal});
       s.verifyCertificate=connection.verifyCertificate;s.client=connection.client;s.readStatus=connection.readStatus;
       if(connection.readCycles)cycleMonitor=publicCycleMonitor({read:connection.readCycles,onState(value){if(active(s)){s.publicCycles=value;s.publicCyclesAt=performance.now();renderCycleReadout(document,value);}}});
      }
      void refreshOperational(performance.now());
      ticket=await certifiedTicket(s,await s.client.observation());
      const source=await deploymentSource(recording.deployment,ticket);
      const config=await module.certifiedConfiguration(ticket);s.certifiedAt=performance.now();
      s.config=config;s.source=source;
    }else{
      const rootKey=await readBytes('/s10-live/root-key.der',1024,signal(s));
      if(await sha256Web(rootKey)!==recording.root_key_sha256)throw new Error('configured live root fingerprint mismatch');
      const module=await import('/s09-assets/ic-certificate.mjs');
      s.verifyCertificate=module.localCertificateVerifier(rootKey,{network:recording.network,maxAgeInMinutes:5});
      const base=await module.localLiveClient(rootKey,{network:recording.network,canister_id:recording.canister_id,host:location.origin});
      const {artifactBundleClient}=await import('./mainnet.mjs');
      s.client=await artifactBundleClient({network:recording.network,rootKey,canister_id:recording.canister_id,host:location.origin},base);
      ticket=await certifiedTicket(s,await s.client.observation());
    }
    if(!active(s))return;
    const head=ticket.publication.head,segment=head.segment_id===null?null:Number(head.segment_id);
    let state,events;
    if(segment===null){
      const descriptor=ticket.publication.artifacts.find(a=>a.kind==='state'),assembler=new ArtifactAssembler(ticket,'state');
      for(let index=0;index<descriptor.chunks.length;index++)await assembler.accept(index,await s.client.currentChunk(ticket.root_hash,0,index));
      // Genesis is not in the retained segment API. A live harness starts before
      // segment zero; reject a server that cannot provide this explicit anchor.
      state=await assembler.finish();
    }else {
      const artifacts=liveArtifacts(s,ticket),history=startupPlayback(ticket,artifacts,s.client,{signal:s.abort.signal});
      // Both promises are joined even if a required artifact fails first.
      const results=await Promise.allSettled([artifacts,history]);
      for(const result of results)if(result.status==='rejected')throw result.reason;
      ({state,events}=results[0].value);s.startupHistory=results[1].value;
    }
    if(!active(s))return;
    const world=snapshot(state,ticket.publication.identity),time=timeNumber(world.time);
    if(s.verificationFloor){const floor=new PublicationSequence();floor.accept(s.verificationFloor);if(ticket.root_hash===s.verificationFloor.root_hash)floor.accept(ticket);else floor.resync(ticket);}
    s.sequence.accept(ticket);rememberLiveAcceptance(s,ticket);s.previousState=state;s.root=ticket.root_hash;
    updatePlayReference(s,world,events);
    const initialSegment=s.startupHistory?.segment,historyFailure=s.startupHistory?.failure;if(s.startupHistory)s.startupHistory=s.startupHistory.diagnostic;resetLiveClock(s,initialSegment?.start??time);
    if(initialSegment){s.clock.append(initialSegment.start,initialSegment.end);s.queue.push({segment:initialSegment,player:new SegmentPlayer(initialSegment,publicationAudioDescriptor(ticket,s.recording))});s.bytes=s.largestSegmentBytes=initialSegment.bytes;resumeVerifiedClock(s);}
    if(world.version>=5&&(!camera.initialized||camera.width!==world.width||camera.height!==world.height))focusOnNextDraw=true;visible=new B2zView(initialSegment?.initial??world);s.ready=true;s.firstWorldAt=performance.now();observePresentation(s,ticket);s.skipped=segment!==null;s.accepted=segment===null?0:1;
    globalThis.__dtrLive={connected:true,startupRetries:s.startupRetries??startupRetries,heads:segment===null?[]:[segment],resyncs:0,certificates:1,skipped:s.skipped,
      maxBufferSegments:0,maxBufferLogical:0,delivery:s.deliveryDiagnostics};
    if(historyFailure){s.error=historyFailure;s.failureKind='verification';showError(historyFailure);}
  }catch(e){
    if(!active(s))return;
    // A certified genesis can retire before its non-retained state is fetched.
    // Retry only the host's explicit moving-snapshot errors, with a fresh
    // certificate and full source/config/artifact validation on every attempt.
    if(['stale observation publication','publication unavailable: snapshot resync required'].includes(e?.message)){
      s.startupRetries=(s.startupRetries??0)+1;s.retryFailures++;
      if(s.startupRetries>2){s.deliveryError=String(e.message);s.failureKind='delivery';}
      s.nextDue=performance.now()+(s.startupRetries<=2?250:deliveryRetryMs(s.retryFailures));return;
    }
    s.failureKind=observationFailure(e);
    if(s.failureKind==='delivery'){s.deliveryError=String(e?.message??e);s.retryFailures++;s.nextDue=performance.now()+deliveryRetryMs(s.retryFailures);}
    else{s.error=e;showError(e);}
  }finally{s.busy=false;if(active(s)){if(s.ready&&!s.error){s.failureKind=null;s.deliveryError=null;s.retryFailures=0;}updateHud();draw();}}
}
async function epochConfiguration(s,ticket){
  const prior=s.sequence.last?.publication;
  const crossing=prior&&Object.keys(prior.identity).some(k=>prior.identity[k]!==ticket.publication.identity[k]);
  if(!crossing)return null;
  if(!((prior.version===6&&ticket.publication.version===7)||([7,8,9].includes(prior.version)&&[8,9].includes(ticket.publication.version))))throw new Error('unsupported world epoch');
  if(!s.config)return null; // Explicit test harness has no payment-preparation flow.
  const {certifiedConfiguration}=await import('./mainnet.mjs');
  return certifiedConfiguration(ticket);
}
function applyEpochPresentation(s,world,config){
 audio.fence();
  if(config)s.config=config;
  arenaRenderer?.reset();
  if(!visible||visible.width!==world.width||visible.height!==world.height){shell.controller.cancel({follow:true});camera.initialized=false;focusOnNextDraw=world.version>=5;}
}
async function admitLive(s,ticket,prefetched){
  const artifacts=prefetched??await liveArtifacts(s,ticket);if(!active(s))return;
  if([7,8,9].includes(ticket.publication.version)&&ticket.publication.head.seal===null){
    const config=await epochConfiguration(s,ticket);if(!active(s))return;
    const segment=await prepareCheckpoint(s.previousState,artifacts,ticket.publication,s.sequence.last.publication);if(!active(s))return;
    if(segment.start!==(s.presentationFence??s.clock.available))throw new Error('checkpoint timeline gap');
    if(segment.bytes>LIVE_BUFFER_LIMITS.bytes)throw new Error('observer checkpoint byte capacity');
    if(!document.hidden&&!s.warmRecovery&&s.presentationFence===undefined&&(s.queue.length>=LIVE_BUFFER_LIMITS.segments||s.bytes+segment.bytes>LIVE_BUFFER_LIMITS.bytes))return false;
    s.sequence.accept(ticket);rememberLiveAcceptance(s,ticket);
  if(config)s.config=config;
    // A resynchronised source may be ahead of the retained visual interval.
    // Keep its zero-time checkpoint in the authoritative anchor, not across an
    // unavailable animated gap. The cached anchor is adopted after the remainder.
    if(s.presentationFence===undefined){s.queue.push({segment,player:new CheckpointPlayer(segment),provenance:publicationAudioDescriptor(ticket,s.recording),checkpoint:true});s.bytes+=segment.bytes;}
    s.previousState=artifacts.state;s.root=ticket.root_hash;s.accepted++;updatePlayReference(s,segment.final,artifacts.events);
    if(document.hidden||s.warmRecovery)retainLatestVerifiedInterval(s,LIVE_BUFFER_LIMITS);
    globalThis.__dtrLive.checkpoints=(globalThis.__dtrLive.checkpoints??0)+1;rememberHead(Number(ticket.publication.head.segment_id));
    globalThis.__dtrLive.maxBufferSegments=Math.max(globalThis.__dtrLive.maxBufferSegments,s.queue.length);return;
  }
  const deriving=performance.now();
  const segment=await prepareDerivedSegment(s.previousState,artifacts.state,artifacts.events,ticket.publication);s.deriveMs=performance.now()-deriving;if(!active(s))return;
  if(segment.start!==(s.presentationFence??s.clock.available))throw new Error('live timeline gap');
  if(segment.bytes>LIVE_BUFFER_LIMITS.bytes)throw new Error('observer segment byte capacity');
  s.largestSegmentBytes=Math.max(s.largestSegmentBytes??0,segment.bytes);
  Object.assign(s.clock,liveSessionBufferPolicy(s));
  if(!document.hidden&&!s.warmRecovery&&s.presentationFence===undefined&&(s.queue.length>=LIVE_BUFFER_LIMITS.segments||s.bytes+segment.bytes>LIVE_BUFFER_LIMITS.bytes))return false;

  s.sequence.accept(ticket);rememberLiveAcceptance(s,ticket);bridgeVerifiedPresentation(s,segment.start);s.clock.append(segment.start,segment.end);s.queue.push({segment,player:new SegmentPlayer(segment,publicationAudioDescriptor(ticket,s.recording))});s.bytes+=segment.bytes;
  s.admittedTicks=(s.admittedTicks??0)+segment.end-segment.start;
  s.previousState=artifacts.state;s.root=ticket.root_hash;s.accepted++;
  updatePlayReference(s,segment.final,artifacts.events);
  if(document.hidden||s.warmRecovery)retainLatestVerifiedInterval(s,LIVE_BUFFER_LIMITS);
  rememberHead(Number(ticket.publication.head.segment_id));
  globalThis.__dtrLive.maxBufferSegments=Math.max(globalThis.__dtrLive.maxBufferSegments,s.queue.length);
  globalThis.__dtrLive.maxBufferLogical=Math.max(globalThis.__dtrLive.maxBufferLogical,s.clock.state().buffer);
}
async function resyncLive(s,ticket){
  const artifacts=await liveArtifacts(s,ticket);if(!active(s))return;
  const config=await epochConfiguration(s,ticket);if(!active(s))return;
  const world=snapshot(artifacts.state,ticket.publication.identity),time=timeNumber(world.time);
  assertForwardPresentation(s.clock,time);
  const retain=time>=s.clock.available&&JSON.stringify(s.sequence.last.publication.identity)===JSON.stringify(ticket.publication.identity)&&canRetainAcrossResync(s,document.hidden);
  s.sequence.resync(ticket);rememberLiveAcceptance(s,ticket);applyEpochPresentation(s,world,config);s.previousState=artifacts.state;s.root=ticket.root_hash;
  if(retain){retainLatestVerifiedInterval(s,LIVE_BUFFER_LIMITS);s.presentationFence=time;s.presentationSkip=true;}
  else{resetLiveClock(s,time);shell.invalidateFollow();visible=new B2zView(world);}
  arenaRenderer?.reset();s.resyncs++;s.skipped=true;s.accepted++;
  updatePlayReference(s,world,artifacts.events);
  globalThis.__dtrLive.resyncs=s.resyncs;globalThis.__dtrLive.skipped=true;rememberHead(Number(ticket.publication.head.segment_id));
}
function updatePlayReference(s,world,events){
  s.referenceWorld=world;
  if(!s.config)return;
  if(!document.hidden)arcade.render(world,s.config,s.source,s.root);
  s.receipts??=new Map();
  for(const r of events?decodeCanonical(events).receipts:[])s.receipts.set(String(r.position),r);
  while(s.receipts.size>100)s.receipts.delete(s.receipts.keys().next().value);
  if(!document.hidden)arcade.receipts([...s.receipts.values()]);
}
async function refreshOperational(now){
  const s=session;if(!s||s.error||!s.readStatus||s.statusBusy||deliveryPaused||now<(s.statusDue??0))return;
  s.statusBusy=true;s.statusDue=now+2000;const generation=s.lifecycleGeneration??0,started=now;
  try{const status=await s.readStatus();if(active(s)&&operationalReplyCurrent(s,generation,started,performance.now())){s.operational=s.lastPaceStatus=status;s.operationalAt=s.lastOperationalAt=started;s.statusFailures=0;if(!s.idleDrain)Object.assign(s.clock,liveSessionBufferPolicy(s));}else if(active(s))s.statusDue=0;}
  catch{if(active(s)&&(s.lifecycleGeneration??0)===generation){s.statusFailures=(s.statusFailures??0)+1;s.statusDue=performance.now()+Math.max(2000,deliveryRetryMs(s.statusFailures));}}
  finally{s.statusBusy=false;}
}
async function pumpLive(now,s){
  if(now<s.nextDue||!document.hidden&&!s.warmRecovery&&(s.queue.length>=LIVE_BUFFER_LIMITS.segments||s.clock.state().buffer>=32))return;s.busy=true;
  let observed=null;const acceptedBefore=s.sequence.last;
  try{
    const started=performance.now(),response=await s.client.observation();s.fetchMs=performance.now()-started;const verifying=performance.now();
    const current=await certifiedTicket(s,response);observed=current;s.verifyMs=performance.now()-verifying;if(!active(s))return;
    globalThis.__dtrLive.certificates++;s.certifiedAt=performance.now();
    const prior=s.sequence.last,past=prior.publication.head.segment_id,next=current.publication.head.segment_id;

    if(current.root_hash===prior.root_hash){liveDeliverySuccess(s,current,performance.now());s.nextDue=performance.now()+Math.max(0,500-s.fetchMs);return;}
    if(next===null||past!==null&&next<=past){s.sequence.accept(current);s.nextDue=performance.now()+500;return;}
    const expected=past===null?0n:past+1n;
    let deferred=false;
    if(next===expected)deferred=await admitLive(s,current)===false;
    else{
      s.catchingUp=true;const catchupStarted=performance.now();s.catchupSegments=Number(next-expected)+1;
      const reverse=[current];let successor=current,complete=next-expected<16n;
      // Fetch the bounded independent catalogs together before retention can
      // evict another predecessor. Still authenticate their chain in order.
      const catalogs=complete?await Promise.all(prefetchRetained(Array.from({length:Number(next-expected)},(_,i)=>Number(next-1n-BigInt(i))),segment=>s.client.publication(segment))):[];
      for(const result of catalogs){
        try{if(result.status==='rejected')throw result.reason;
          const predecessor=await verifyRetainedPredecessor(result.value,successor);
          reverse.push(predecessor);successor=predecessor;
        }catch(error){if(!String(error?.message??error).includes('snapshot resync required'))throw error;complete=false;break;}
      }
      if(!complete)await resyncLive(s,current);
      else{
        const ordered=reverse.reverse().slice(0,document.hidden||s.warmRecovery?LIVE_BUFFER_LIMITS.segments:LIVE_BUFFER_LIMITS.segments-s.queue.length);
        const artifacts=prefetchRetained(ordered,ticket=>liveArtifacts(s,ticket));
        for(let i=0;i<ordered.length;i++){
          const result=await artifacts[i];if(result.status==='rejected')throw result.reason;
          if(await admitLive(s,ordered[i],result.value)===false){deferred=true;break;}
        }
      }
      s.catchupMs=performance.now()-catchupStarted;
    }
    if(s.sequence.last.root_hash===current.root_hash)observePresentation(s,current,(performance.now()-started)/1000);
    // A changed head may already have a successor. Do not add a fixed rest to
    // authenticated catch-up; unchanged heads retain the bounded poll interval.
    liveDeliverySuccess(s,s.sequence.last.root_hash===current.root_hash?s.sequence.last:null,performance.now());s.nextDue=performance.now()+(deferred?250:0);
  }catch(e){
    if(!active(s))return;
    if(liveDeliveryFailure(s,e,observed,acceptedBefore,performance.now())){s.error=e;s.failureKind=observationFailure(e);showError(e);}else s.nextDue=performance.now()+deliveryRetryMs(s.retryFailures);
  }finally{s.busy=false;s.catchingUp=false;if(active(s)&&!document.hidden){warmPresentation(s);if(observed&&s.sequence.last.root_hash===observed.root_hash)s.warmRecovery=false;updateHud();}}
}
async function pump(now){
  const s=session;if(!s||s.busy||s.error||deliveryPaused)return;
  if(s.mode==='live')return s.ready?pumpLive(now,s):now>=s.nextDue?acquireLive(s):undefined;
  if(!s.ready)return;
  if(s.entry>=s.recording.roots.length||now<s.nextDue||s.queue.length>=4||s.clock.state().buffer>=12)return;
  s.busy=true;
  try{
    const next=await loadEntry(s.recording,s.entry,signal(s));if(!active(s))return;
    const segment=await prepareSegment(s.previousState,next.state,next.render,next.ticket.publication);if(!active(s))return;
    if(segment.start!==s.clock.available)throw new Error('recording timeline gap');
    if(segment.end>s.recording.logical_end||(s.entry===s.recording.roots.length-1&&segment.end!==s.recording.logical_end))throw new Error('recording end mismatch');
    if(s.bytes+segment.bytes>8*1024*1024)throw new Error('observer buffer byte capacity');
    // No public advancement until all bytes, projection bindings and final visual state passed.
    s.sequence.accept(next.ticket);s.clock.append(segment.start,segment.end);
    s.queue.push({segment,player:new SegmentPlayer(segment,publicationAudioDescriptor(next.ticket,s.recording))});s.bytes+=segment.bytes;
    s.previousState=next.state;s.root=next.ticket.root_hash;s.entry++;s.nextDue=performance.now()+600;
  }catch(e){if(!active(s))return;s.error=e;s.failureKind=observationFailure(e);showError(e);}finally{s.busy=false;if(active(s))updateHud();}
}
function idleState(s){
 return Boolean(s?.mode==='live'&&s.ready&&!s.error&&!deliveryPaused&&performance.now()-(s.operationalAt??-Infinity)<15000&&freshObservation(s,performance.now())&&idleArena(s.operational,s.referenceWorld));
}
function phase(){
  const s=session;if(bootError||s?.error)return 'ERROR';if(!s?.ready)return 'LOADING';
  if(s.mode!=='live'&&s.entry===s.recording.roots.length&&s.clock.playhead===s.recording.logical_end)return 'COMPLETE';
  return paused?'PAUSED':idleState(s)&&s.clock.available===s.clock.playhead?'IDLE':s.clock.phase;
}
function updateHud(){
 const s=session,p=phase(),now=performance.now(),operationalFresh=now-(s?.operationalAt??-Infinity)<15000,fresh=freshObservation(s,now);
 const healthy=Boolean(s?.operational?.run.running&&!s.operational.run.world_transition&&s.operational.source.binding_checked&&!s.operational.run.last_error.length&&!s.operational.source.last_error.length&&s.operational.run.pace?.admission_open!==false);
 const failure=s?.error?(s.failureKind??observationFailure(s.error)):s?.deliveryDiagnostics?.blocking?.kind==='delivery-or-verification-error'?'verification':s?.deliveryError?'delivery':null;
 const resolved=resolveExperience({failureKind:failure,trust:s?.mode==='local'?'certificate':'content',phase:p,live:s?.mode==='live',verified:Boolean(s?.ready&&!s.error),fresh,operationalFresh,healthy,operational:s?.operational,world:s?.referenceWorld??visible,advancing:!paused&&(s?.mode!=='live'||s.nominalRate>0)&&s?.clock?.started&&s?.clock?.available>s?.clock?.playhead,resynchronising:s?.returning,catchingUp:s?.catchingUp,deliveryError:s?.deliveryError,renderError,presentationLagSeconds:s?.referenceWorld&&s?.clock&&presentationPace(s)>0?Math.max(0,timeNumber(s.referenceWorld.time)-s.clock.playhead)/presentationPace(s):0},now);
 arcade.status({resolved});document.body.dataset.phase=p;$('retry').hidden=!Boolean(bootError||s?.error);$('retry').textContent='Retry verification';
 const data={trust:s?.mode==='live'?'IC certificates, catalog and artifact verification':s?.mode==='local'?'Pinned disposable IC certificate':'Offline content consistency only',backend:s?.recording.canister_id,source:s?.source,root:s?.root,head:s?.sequence.last?.publication.head,identity:s?.sequence.last?.publication.identity,producer:s?.operational,cycles:s?.publicCycles,operational_fresh:operationalFresh,operational_age_ms:Number.isFinite(s?.lastOperationalAt??s?.operationalAt)?Math.max(0,now-(s.lastOperationalAt??s.operationalAt)):null,presentation:s?.clock.state(),delivery:s?.deliveryDiagnostics};
 const detailsKey=[s?.root,p,resolved.kind,resolved.canPrepare,operationalFresh,s?.publicCyclesAt,$('status-view').hidden,$('status-view').hidden?0:Math.floor(now/1000)].join('/');
 if(detailsKey!==lastDetailsKey){lastDetailsKey=detailsKey;const details=JSON.stringify(data,(_,v)=>typeof v==='bigint'?String(v):v,2);if($('status-details').textContent!==details)$('status-details').textContent=details;}
 globalThis.__b2zExperience={composer:arcade.proposedAction(),status:resolved,clock:s?.clock,queue:s?.queue,session:s,visibleTime,visible,render:globalThis.__b2zRender};
}
function draw(){
 if(document.hidden||!arenaRenderer||!visible)return;
 const rect=canvas.getBoundingClientRect();if(rect.width<=20||rect.height<=20)return;
 const v=visible;camera.configure(v.width,v.height,rect.width,rect.height,Boolean(v.torus));
 if(!cameraRestored){const p=arcade.camera();if(p?.projection==='isometric-1'&&[p.x,p.y,p.scale].every(Number.isFinite)&&p.scale>0){camera.x=p.x;camera.y=p.y;camera.scale=p.scale;camera.constrain();focusOnNextDraw=false;}cameraRestored=true;}
 if(focusOnNextDraw){const c=v.cannons.get(arcade.selectedCannon())??v.cannons.values().next().value;if(c)camera.frameCell(c.cell);focusOnNextDraw=false;}
 arcade.presentation(v);const points=ballPoints.get(v,visibleTime);shell.advance(v,visibleTime,performance.now(),JSON.stringify(session?.sequence.last?.publication.identity??{}),points);
 try{globalThis.__b2zRender=arenaRenderer.draw(v,camera,{time:visibleTime,points,audioEligible:audio.effectsReady()&&zoomGain(camera.scale)>0,followed:shell.followedBall(),hover:shell.hover(),selection:arcade.moveSelection(),selected:arcade.selectedCannon(),guideObstacles:shell.guideObstacles(),aim:arcade.aim(),reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});if(session&&!renderError){session.lastRenderedAt=performance.now();session.lastRenderedPlayhead=visibleTime;if(session.returnStartedAt!==undefined&&session.firstWarmRenderAt===null)session.firstWarmRenderAt=session.lastRenderedAt;}}
 catch(error){renderError=String(error);$('render-error').hidden=false;$('render-error').textContent='The arena could not be rendered. '+String(error?.message??error);}
 const drawnPose=audioPose(camera);shell.update(v,arenaRenderer.surface());
 canvas.setAttribute('aria-label',`B2Z isometric arena: ${v.width} by ${v.height} cells, ${v.cannons.size} cannons, ${v.balls.size} balls.`);
 if(!renderError&&drawnPose===audioPose(camera))return {camera,canvasRect:rect,membership:arenaRenderer.audioMembership(),occluders:[]};
}
function presentVerified(s,time){
 function show(q,at){if(!q.presented){if(q.checkpoint)applyEpochPresentation(s,q.segment.final,null);q.player.view.continuePresentation(visible,time);q.presented=true;}visible=q.player.advance(at,audioCollector);}
 while(s.queue.length&&time>=s.queue[0].segment.end){const q=s.queue.shift();show(q,q.segment.end);s.bytes-=q.segment.bytes;}
 if(s.queue.length)show(s.queue[0],time);
 if(!s.queue.length&&s.presentationFence!==undefined&&time===s.clock.available){
  const at=s.presentationFence;if(timeNumber(s.referenceWorld.time)!==at)throw Error('verified presentation anchor mismatch');
  bridgeVerifiedPresentation(s,at);applyEpochPresentation(s,s.referenceWorld,null);visible=new B2zView(s.referenceWorld);time=at;
  arenaRenderer?.reset();shell.rebaseFollow();s.presentationSkip=false;
 }
 visibleTime=time;
}
function warmPresentation(s){
 if(!s?.ready||s.error||s.mode!=='live'||!s.warmRecovery&&!s.presentationSkip)return;
 audio.fence();
 const point=recentPresentationPoint(s.clock.state()),skip=s.presentationSkip;
 if(skip){if(visible)visible.effects=[];arenaRenderer?.reset();shell.rebaseFollow();const first=s.queue[0];if(first)applyEpochPresentation(s,first.segment.initial,null);}
 resumeVerifiedClock(s);s.nominalRate=targetPresentationRate(s,performance.now(),0);
 if(skip||s.warmRecovery)presentVerified(s,point);
 s.presentationSkip=false;
}
function frame(now){
 const priorAudioTime=visibleTime;audioCollector=null;
  if(document.hidden){lastFrame=null;requestAnimationFrame(frame);return;}
  const s=session,elapsed=lastFrame===null?0:(now-lastFrame)/1000,dt=Math.min(elapsed,s?.mode==='live'?1:.25);lastFrame=now;
  if(s?.ready&&!s.error&&!paused){
    if(s.mode==='live'&&s.presentationSkip)warmPresentation(s);
    // Drain a verified terminal empty segment without waiting for nonexistent
    // future empty segments. Use the existing clock API, with no extrapolation.
    prepareIdlePlayout(s,idleState(s));
    const base=s.mode==='live'?presentationPace(s):speed,target=s.mode==='live'?targetPresentationRate(s,now,dt):base;s.nominalRate=s.mode==='live'?approachPresentationPace(s.nominalRate??target,target,base,dt):approachPace(s.nominalRate??target,target,dt);
    if(s.mode==='live'){s.clock.min_rate=s.clock.max_rate=s.clock.rate=1;}
    const previous=s.clock.playhead;
    const current=s.clock.sample(dt*s.nominalRate/(s.mode==='live'?1:s.recording.tick_seconds));visibleTime=current.playhead;
    s.playedTicks=(s.playedTicks??0)+current.playhead-previous;
    try{audioCollector=audio.begin({previous,time:visibleTime,elapsed,now,ready:true,failed:!!renderError,camera});}catch(error){audio.fail(error);}
    presentVerified(s,visibleTime);

  }
  if(s?.mode==='live'&&globalThis.__dtrLive){
    const state=s.clock.state(),pace=s.operational?.run.pace;globalThis.__dtrLive.playback={wall_ms:now,frame_ms:elapsed*1000,verified_ticks:state.available,consumed_ticks:state.playhead,admitted_ticks:s.admittedTicks??0,played_ticks:s.playedTicks??0,buffer_ticks:state.buffer,buffer_target_ticks:s.clock.target,buffer_bytes:s.bytes,queue_segments:s.queue.length,certificate_time_ns:s.certificateTimeNs??null,certificate_age_ms:s.certificateAgeMs??null,catchup_segments:s.catchupSegments??0,catchup_ms:s.catchupMs??0,phase:phase(),rate:state.rate,elastic:s.elastic?.state(),presentation_lag_ticks:s.referenceWorld?Math.max(0,timeNumber(s.referenceWorld.time)-s.clock.playhead):0,nominal_rate:Number(pace?.nominal_milli??0)/1000,supported_rate:presentationPace(s),presentation_rate:s.nominalRate??0,target_rate:Number(pace?.nominal_milli??0)/1000,performance_limited:Boolean(pace?.performance_limited),fetch_ms:s.fetchMs??0,verify_ms:s.verifyMs??0,artifact_ms:s.artifactMs??0,derive_ms:s.deriveMs??0,artifact_bundle:Boolean(s.bundleUsed),artifact_bundle_fallbacks:s.bundleFallbacks??0,artifact_bundle_error:s.bundleError??null,delivery_failures:s.retryFailures,delivery_error:s.deliveryError??null,backend_segments:Number(s.operational?.run.completed_segments??0n),segment_ticks:Number(s.operational?.run.publication_ticks??s.operational?.run.segment_ticks??2n)};
  }
  if(!audioCollector)try{audio.begin({previous:priorAudioTime,time:visibleTime,elapsed,now,ready:Boolean(s?.ready&&!s.error),failed:Boolean(s?.error||renderError),camera});}catch(error){audio.fail(error);}
  const drawn=draw();if(now-lastHud>100){updateHud();lastHud=now;}try{if(drawn)audio.flush({...drawn,occluders:audio.effectsReady()?shell.audioOccluders(drawn.canvasRect):[],time:visibleTime,elapsed,continuous:elapsed>0&&elapsed<=.25,failed:Boolean(s?.error||renderError)});else{audio.flush({camera,membership:null,occluders:[],time:visibleTime,elapsed,continuous:elapsed>0&&elapsed<=.25,failed:true});audio.fence();}}catch(error){audio.fail(error);}
  requestAnimationFrame(frame);
}
$('retry').addEventListener('click',()=>{const s=session;if(!s){void bootstrap();return;}if(s.busy)return;void(s.mode==='live'?startLive(s.recording,0,s.sequence.last??s.verificationFloor):s.mode==='local'?startLocal(s.recording):start(s.recording));});
const observations=observationLoop({work:pump,refresh:refreshOperational,onReturn(gap){lastFrame=null;const s=session;if(s){s.nextDue=0;s.statusDue=0;s.lifecycleGeneration=(s.lifecycleGeneration??0)+1;s.operationalAt=-Infinity;s.warmRecovery=true;s.returnStartedAt=performance.now();s.firstWarmRenderAt=null;warmPresentation(s);if(s.referenceWorld){arcade.render(s.referenceWorld,s.config,s.source,s.root);arcade.receipts([...(s.receipts?.values()??[])]);}updateHud();draw();}}});
document.addEventListener('visibilitychange',()=>{audio.lifecycle(document.hidden);observations.visibility();cycleMonitor?.visibility();});
document.addEventListener('freeze',()=>{audio.lifecycle(true);observations.suspend();});
document.addEventListener('resume',()=>{audio.lifecycle(false);lastFrame=null;observations.resume();});
addEventListener('pagehide',event=>{audio.lifecycle(true);if(!event.persisted)audio.dispose();if(event.persisted)observations.suspend();if(!event.persisted){observations.stop();cycleMonitor?.stop();shell.dispose();arenaRenderer?.dispose();session?.abort.abort();}});
addEventListener('pageshow',event=>{if(event.persisted){audio.lifecycle(false);lastFrame=null;observations.resume();}});
new ResizeObserver(draw).observe(canvas);
async function bootstrap(){
bootError=null;
try{
  if(!globalThis.crypto?.subtle)throw new Error('Web Crypto requires a supported browser on localhost or HTTPS.');
  if(deployment!==null){
    const policy=await deploymentPolicy(deployment);
    const recording={id:'mainnet',title:'B2Z live observer',description:'Account-index payments, authoritative simulation. Automatic payouts are unavailable.',
      network:policy.network,canister_id:policy.canister_id,tick_seconds:1,deployment:policy};
    catalog={recordings:[recording]};await startLive(recording);return;
  }
  const params=new URLSearchParams(location.search);
  if(params.get('mode')==='live'){
    const metadata=liveMetadata(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await readBytes('/s10-live/metadata.json',65536,AbortSignal.timeout(10000)))));
    const recording={...metadata,id:'live-local-ic',title:'Live certified local game',description:'Autonomous runtime-lab publications retrieved while PocketIC remains running.'};
    catalog={recordings:[recording]};await startLive(recording);return;
  }
  if(params.get('mode')==='local'){
    const metadata=localMetadata(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await readBytes('/s09-local/metadata.json',65536,AbortSignal.timeout(10000)))));
    const recording={...metadata,id:'local-ic',title:'Certified local ledger slice',description:'Pinned upstream test ledger → runtime-lab → authenticated committed B2Z artifacts.',segments:1,roots:['local-predecessor','local-commit']};
    catalog={recordings:[recording]};await startLocal(recording);return;
  }
  catalog=validateIndex(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await readBytes('./recordings/index.json',65536,AbortSignal.timeout(10000)))));
  const requested=params.get('recording'),r=catalog.recordings.find(r=>r.id===requested)??catalog.recordings[0];
  await start(r);
}catch(e){bootError=e;showError(e);updateHud();}
}
if(deployment===null||deployment.network==='pocketic-local')globalThis.__b2zTools=replayTools({session:()=>session,visible:()=>visible,selection:()=>arcade.selectedCannon(),pause:value=>{paused=Boolean(value);lastFrame=null;},delivery:value=>{deliveryPaused=Boolean(value);},start,local:startLocal,live:startLive,catalog:()=>catalog});
updateHud();requestAnimationFrame(frame);
await bootstrap();
