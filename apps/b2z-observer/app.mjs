import {Camera,wrap} from './camera.mjs';
import {createShell} from './shell.mjs';
import {heading} from '../../packages/kernels/b2z/math.mjs';
import {createArcade,formatIcp} from './arcade.mjs';
import deployment,{deploymentPolicy,deploymentConnection,deploymentSource} from './deployment.mjs';
import {PlayoutClock} from '../../node_modules/@dtr/timeline-runtime/packages/client/playout.mjs';
import {ArtifactAssembler,PublicationSequence,sha256Web,verifyCertificatePublication,verifyRetainedPredecessor} from '../../node_modules/@dtr/timeline-runtime/packages/client/verification.mjs';
import {B2zView,SegmentPlayer,snapshot,prepareDerivedSegment,prepareSegment,timeNumber,prepareIdlePlayout,nominalPace,approachPace,liveBufferPolicy} from './model.mjs';
import {readBytes,validateIndex,loadEntry} from './transport.mjs';
import {decodeCanonical} from '../../node_modules/@dtr/timeline-runtime/packages/runtime/canonical.mjs';
import {cannonReference,operationalText,idleArena} from './play-reference.mjs';
const $=id=>document.getElementById(id),canvas=$('board'),ctx=canvas.getContext('2d');
const COLORS=['#30415b','#54f0d2','#84b7ff','#e4a4ff','#ffc778','#ff8b9b'];
const color=id=>COLORS[id===0?0:1+(id-1)%5];
let bootError=null,catalog=null,session=null,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,speed=1,lastFrame=null,lastHud=0;
let deliveryPaused=false,visible=null,visibleTime=0;
const arcade=createArcade(document),camera=new Camera();
const shell=createShell(document,camera,arcade,{selected:()=>visible?.cannons.get(arcade.selectedCannon()),cell:(n,p)=>{
 if(arcade.moveSelection())return arcade.chooseCell(n);
 const c=[...(visible?.cannons.values()??[])].find(c=>{if(!p)return c.cell===n;let dx=c.cell%visible.width+.5-p.x,dy=Math.floor(c.cell/visible.width)+.5-p.y;if(visible.torus){dx-=Math.round(dx/visible.width)*visible.width;dy-=Math.round(dy/visible.height)*visible.height;}return Math.hypot(dx,dy)*camera.scale<=Math.max(8,camera.scale*.4);});return c?arcade.selectCannon(c.id):false;
}});
globalThis.__b2zCamera=camera;
function showError(error){$('error-text').textContent=String(error?.message??error);$('error').hidden=false;$('service-status').textContent='Observation unhealthy — wait before making purchases.';}
function signal(s){return AbortSignal.any([s.abort.signal,AbortSignal.timeout(10000)]);}
function active(s){return session===s&&!s.abort.signal.aborted;}
async function start(recording){
  session?.abort.abort();const s={recording,abort:new AbortController(),busy:true,ready:false,error:null,entry:1,bytes:0,
    queue:[],sequence:new PublicationSequence(),previousState:null,root:'',nextDue:0,clock:new PlayoutClock({start:0,target:Math.min(8,recording.logical_end),
      low:Math.min(2,recording.logical_end/2),max_frame_delta:1})};
  session=s;visible=null;visibleTime=0;lastFrame=null;$('error').hidden=true;
  $('speed').disabled=s.mode==='live';
  $('scenario-title').textContent=recording.title;$('scenario-description').textContent=recording.description;
  $('timeline').max=recording.logical_end;$('pause').disabled=true;$('restart').disabled=true;
  try{
    const entry=await loadEntry(recording,0,signal(s));if(!active(s))return;
    const w=snapshot(entry.state);if(timeNumber(w.time)!==0||entry.ticket.publication.head.segment_id!==null)throw new Error('recording requires a genesis snapshot');
    s.sequence.accept(entry.ticket);s.previousState=entry.state;s.root=entry.ticket.root_hash;
    visible=new B2zView(w);s.ready=true;$('pause').disabled=false;$('restart').disabled=false;
  }catch(e){if(!active(s))return;s.error=e;showError(e);}finally{s.busy=false;updateHud();draw();}
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
  session?.abort.abort();const s={mode:'local',recording,abort:new AbortController(),busy:true,ready:false,error:null,entry:2,bytes:0,
    queue:[],sequence:new PublicationSequence(),previousState:null,root:'',nextDue:0,clock:new PlayoutClock({start:recording.logical_start,
      target:Math.min(8,recording.logical_end-recording.logical_start),low:Math.min(2,(recording.logical_end-recording.logical_start)/2),max_frame_delta:1})};
  session=s;visible=null;visibleTime=recording.logical_start;lastFrame=null;$('error').hidden=true;
  $('scenario-title').textContent=recording.title;$('scenario-description').textContent=recording.description;
  $('timeline').min=recording.logical_start;$('timeline').max=recording.logical_end;$('pause').disabled=true;$('restart').disabled=true;
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
    s.clock.append(segment.start,segment.end);s.queue.push({segment,player:new SegmentPlayer(segment)});s.bytes=segment.bytes;
    s.previousState=state;s.root=ticket.root_hash;visible=new B2zView(segment.initial);s.ready=true;
    $('pause').disabled=false;$('restart').disabled=false;
  }catch(e){if(!active(s))return;s.error=e;showError(e);}finally{s.busy=false;updateHud();draw();}
}
async function certifiedTicket(s,response){
  if(!response.certificate)throw new Error('live IC certificate missing');
  return verifyCertificatePublication(response.publication,response.certificate,{
    canister_id:s.recording.canister_id,network:s.recording.network,now_ns:BigInt(Date.now())*1000000n,
    max_age_ns:300000000000n,max_future_ns:30000000000n,
  },s.verifyCertificate);
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
    }catch(error){s.bundleFallbacks=(s.bundleFallbacks??0)+1;s.bundleError=String(error?.message??error).slice(0,160);}
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
function resetLiveClock(s,time){
  s.clock=new PlayoutClock({start:time,...liveBufferPolicy(s.operational),max_frame_delta:1});
  s.queue=[];s.bytes=0;s.idleDrain=false;visibleTime=time;
}
async function startLive(recording,startupRetries=0){
  session?.abort.abort();const s={mode:'live',recording,abort:new AbortController(),busy:true,ready:false,error:null,bytes:0,queue:[],
    sequence:new PublicationSequence(),previousState:null,root:'',nextDue:0,clock:new PlayoutClock({start:0,target:3,low:1,max_frame_delta:1}),
    client:null,verifyCertificate:null,accepted:0,resyncs:0,skipped:false,retryFailures:0};
  session=s;visible=null;visibleTime=0;lastFrame=null;$('error').hidden=true;
  $('speed').disabled=s.mode==='live';
  $('scenario-title').textContent=recording.title;$('scenario-description').textContent=recording.description;
  $('timeline').min=0;$('timeline').max=2048;$('pause').disabled=true;$('restart').disabled=true;
  try{
    let ticket;
    if(recording.deployment){
      const module=await import('./mainnet.mjs');
      const connection=await deploymentConnection(recording.deployment);
      s.verifyCertificate=connection.verifyCertificate;s.client=connection.client;s.readStatus=connection.readStatus;
      const initial=await Promise.allSettled([s.client.observation(),s.readStatus()]);
      if(initial[0].status==='rejected')throw initial[0].reason;
      if(initial[1].status==='fulfilled'){s.operational=initial[1].value;s.operationalAt=performance.now();s.statusDue=s.operationalAt+2000;}
      ticket=await certifiedTicket(s,initial[0].value);
      const source=await deploymentSource(recording.deployment,ticket);
      $('receiving-account').textContent=source.recipient;
      $('backend-identity').textContent=source.owner;
      const config=await module.certifiedConfiguration(ticket);s.certifiedAt=performance.now();
      s.config=config;s.source=source;$('live-play-reference').hidden=false;
      $('command-prices').textContent=`Certified configuration: join ${config.join_e8s} e8s; relocation ${config.move_e8s} e8s; ball base ${config.ball_base_e8s} e8s (existing occupancy pricing applies).`;
      $('rules-identity').textContent=`Rules ${ticket.publication.identity.rules_hash}; configuration ${ticket.publication.identity.config_hash}`;
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
    }else {const artifacts=await liveArtifacts(s,ticket);state=artifacts.state;events=artifacts.events;}
    const world=snapshot(state,ticket.publication.identity),time=timeNumber(world.time);s.sequence.accept(ticket);s.previousState=state;s.root=ticket.root_hash;
    updatePlayReference(s,world,events);
    resetLiveClock(s,time);visible=new B2zView(world);s.ready=true;s.skipped=segment!==null;s.accepted=segment===null?0:1;
    $('timeline').max=Math.max(2048,time+64);$('pause').disabled=false;$('restart').disabled=false;
    globalThis.__dtrLive={connected:true,startupRetries,heads:segment===null?[]:[segment],resyncs:0,certificates:1,skipped:s.skipped,
      maxBufferSegments:0,maxBufferLogical:0};
  }catch(e){
    if(!active(s))return;
    // A certified genesis can retire before its non-retained state is fetched.
    // Retry only the host's explicit moving-snapshot errors, with a fresh
    // certificate and full source/config/artifact validation on every attempt.
    if(startupRetries<2&&['stale observation publication','publication unavailable: snapshot resync required'].includes(e?.message)){
      await startLive(recording,startupRetries+1);return;
    }
    s.error=e;showError(e);
  }finally{s.busy=false;updateHud();draw();}
}
async function epochConfiguration(s,ticket){
  const prior=s.sequence.last?.publication;
  const crossing=prior&&Object.keys(prior.identity).some(k=>prior.identity[k]!==ticket.publication.identity[k]);
  if(!crossing)return null;
  if(prior.version!==6||ticket.publication.version!==7)throw new Error('unsupported world epoch');
  if(!s.config)return null; // Explicit test harness has no payment-preparation flow.
  const {certifiedConfiguration}=await import('./mainnet.mjs');
  return certifiedConfiguration(ticket);
}
function applyEpochPresentation(s,world,config){
  if(config){s.config=config;$('rules-identity').textContent=`Rules ${s.sequence.last.publication.identity.rules_hash}; configuration ${s.sequence.last.publication.identity.config_hash}`;}
  if(visible&&(visible.version!==world.version||visible.width!==world.width||visible.height!==world.height))camera.initialized=false;
}
async function admitLive(s,ticket){
  const artifacts=await liveArtifacts(s,ticket);if(!active(s))return;
  if(ticket.publication.version===7&&ticket.publication.head.seal===null){
    const config=await epochConfiguration(s,ticket);if(!active(s))return;
    const world=snapshot(artifacts.state,ticket.publication.identity),time=timeNumber(world.time);
    s.sequence.accept(ticket);applyEpochPresentation(s,world,config);s.previousState=artifacts.state;s.root=ticket.root_hash;
    resetLiveClock(s,time);visible=new B2zView(world);s.resyncs++;s.skipped=true;s.accepted++;
    updatePlayReference(s,world,artifacts.events);
    Object.assign(globalThis.__dtrLive,{resyncs:s.resyncs,skipped:true});globalThis.__dtrLive.heads.push(Number(ticket.publication.head.segment_id));return;
  }
  const deriving=performance.now();
  const segment=await prepareDerivedSegment(s.previousState,artifacts.state,artifacts.events,ticket.publication);s.deriveMs=performance.now()-deriving;if(!active(s))return;
  if(segment.start!==s.clock.available)throw new Error('live timeline gap');
  if(s.bytes+segment.bytes>8*1024*1024)throw new Error('observer buffer byte capacity');
  s.sequence.accept(ticket);s.clock.append(segment.start,segment.end);s.queue.push({segment,player:new SegmentPlayer(segment)});s.bytes+=segment.bytes;
  s.admittedTicks=(s.admittedTicks??0)+segment.end-segment.start;
  s.previousState=artifacts.state;s.root=ticket.root_hash;s.accepted++;$('timeline').max=Math.max(Number($('timeline').max),segment.end+64);
  updatePlayReference(s,snapshot(artifacts.state),artifacts.events);
  globalThis.__dtrLive.heads.push(Number(ticket.publication.head.segment_id));
  globalThis.__dtrLive.maxBufferSegments=Math.max(globalThis.__dtrLive.maxBufferSegments,s.queue.length);
  globalThis.__dtrLive.maxBufferLogical=Math.max(globalThis.__dtrLive.maxBufferLogical,s.clock.state().buffer);
}
async function resyncLive(s,ticket){
  const artifacts=await liveArtifacts(s,ticket);if(!active(s))return;
  const config=await epochConfiguration(s,ticket);if(!active(s))return;
  const world=snapshot(artifacts.state,ticket.publication.identity),time=timeNumber(world.time);s.sequence.resync(ticket);applyEpochPresentation(s,world,config);s.previousState=artifacts.state;s.root=ticket.root_hash;
  resetLiveClock(s,time);visible=new B2zView(world);s.resyncs++;s.skipped=true;s.accepted++;
  updatePlayReference(s,world,artifacts.events);
  globalThis.__dtrLive.resyncs=s.resyncs;globalThis.__dtrLive.skipped=true;globalThis.__dtrLive.heads.push(Number(ticket.publication.head.segment_id));
}
function updatePlayReference(s,world,events){
  s.referenceWorld=world;
  if(!s.config)return;
  const row=values=>{const tr=document.createElement('tr');for(const value of values){const td=document.createElement('td');td.textContent=String(value);tr.append(td);}return tr;};
  $('live-cannons').replaceChildren(...cannonReference(world,s.config).map(c=>row([
    `#${c.id}`,`${c.owned_cells.length} cells`,c.balls,c.next_ball_e8s===null?'At capacity':formatIcp(c.next_ball_e8s)
  ])));
  [...$('live-cannons').rows].forEach((tr,i)=>{const account=document.createElement('small');account.textContent=world.cannons[i].account;tr.cells[0].append(account);tr.cells[0].className=`owner-${1+(world.cannons[i].id-1)%5}`;});
  arcade.render(world,s.config,s.source);
  s.receipts??=new Map();
  for(const r of events?decodeCanonical(events).receipts:[])s.receipts.set(String(r.position),r);
  while(s.receipts.size>100)s.receipts.delete(s.receipts.keys().next().value);
  const actionNames={cannon_spawned:'Joined arena',ball_spawned:'Launched ball',cannon_moved:'Moved cannon'};
  $('live-receipts').replaceChildren(...[...s.receipts.values()].reverse().map(r=>{
    const tr=row([r.position,r.account,r.reason==='ACCEPTED'?'Accepted':r.reason.replaceAll('_',' ').toLowerCase(),actionNames[r.kind]??r.kind??'—']);
    tr.dataset.reason=r.reason;tr.dataset.kind=r.kind??'';return tr;
  }));
  $('reference-time').textContent=`Latest certified snapshot: ${timeNumber(world.time)} logical ticks. Prices and owned cells may change before a payment is assigned; playback can lag this snapshot.`;
}
async function refreshOperational(now){
  const s=session;if(!s?.ready||s.error||!s.readStatus||s.statusBusy||deliveryPaused||now<(s.statusDue??0))return;
  s.statusBusy=true;s.statusDue=now+2000;
  try{const status=await s.readStatus();if(active(s)){s.operational=status;s.operationalAt=performance.now();if(!s.idleDrain)Object.assign(s.clock,liveBufferPolicy(status));$('service-status').textContent=operationalText(status);}}
  catch{if(active(s)){s.operational=null;$('service-status').textContent=operationalText(null);}}
  finally{s.statusBusy=false;}
}
async function pumpLive(now,s){
  if(now<s.nextDue||s.queue.length>=8||s.clock.state().buffer>=16)return;s.busy=true;
  try{
    const started=performance.now(),response=await s.client.observation();s.fetchMs=performance.now()-started;const verifying=performance.now();
    const current=await certifiedTicket(s,response);s.verifyMs=performance.now()-verifying;if(!active(s))return;
    globalThis.__dtrLive.certificates++;s.certifiedAt=performance.now();
    const prior=s.sequence.last,past=prior.publication.head.segment_id,next=current.publication.head.segment_id;
    if(current.root_hash===prior.root_hash){s.retryFailures=0;s.nextDue=performance.now()+Math.max(0,500-s.fetchMs);return;}
    if(next===null||past!==null&&next<=past){s.sequence.accept(current);s.nextDue=performance.now()+500;return;}
    const expected=past===null?0n:past+1n;
    if(next===expected)await admitLive(s,current);
    else{
      const reverse=[current];let successor=current,complete=true;
      for(let segment=next-1n;segment>=expected;segment--){
        try{const predecessor=await verifyRetainedPredecessor(await s.client.publication(Number(segment)),successor);
          reverse.push(predecessor);successor=predecessor;
        }catch(error){if(!String(error?.message??error).includes('snapshot resync required'))throw error;complete=false;break;}
        if(segment===0n)break;
      }
      if(!complete)await resyncLive(s,current);
      else for(const ticket of reverse.reverse())await admitLive(s,ticket);
    }
    s.retryFailures=0;s.nextDue=performance.now()+500;
  }catch(e){
    if(!active(s))return;s.retryFailures++;s.deliveryError=String(e?.message??e).slice(0,160);
    if(s.retryFailures>=5){s.error=e;showError(e);}else s.nextDue=performance.now()+Math.min(8000,250*2**s.retryFailures);
  }finally{s.busy=false;if(active(s))updateHud();}
}
async function pump(now){
  const s=session;if(!s?.ready||s.busy||s.error||deliveryPaused)return;
  if(s.mode==='live')return pumpLive(now,s);
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
    s.queue.push({segment,player:new SegmentPlayer(segment)});s.bytes+=segment.bytes;
    s.previousState=next.state;s.root=next.ticket.root_hash;s.entry++;s.nextDue=performance.now()+600;
  }catch(e){if(!active(s))return;s.error=e;showError(e);}finally{s.busy=false;if(active(s))updateHud();}
}
function idleState(s){
 return Boolean(s?.mode==='live'&&s.ready&&!s.error&&!deliveryPaused&&performance.now()-(s.operationalAt??-Infinity)<15000&&performance.now()-(s.certifiedAt??-Infinity)<30000&&idleArena(s.operational,s.referenceWorld));
}
function phase(){
  const s=session;if(bootError||s?.error)return 'ERROR';if(!s?.ready)return 'LOADING';
  if(s.mode!=='live'&&s.entry===s.recording.roots.length&&s.clock.playhead===s.recording.logical_end)return 'COMPLETE';
  return paused?'PAUSED':idleState(s)&&s.clock.available===s.clock.playhead?'IDLE':s.clock.phase;
}
function updateHud(){
  const s=session,state=s?.clock.state()??{playhead:0,available:0,buffer:0,rate:1};
  const p=phase();$('phase').textContent=p.replaceAll('_',' ');$('phase').dataset.state=p;document.body.dataset.phase=p;
  $('playhead').textContent=state.playhead.toFixed(2);$('available').textContent=state.available.toFixed(2);
  $('buffer').textContent=state.buffer.toFixed(2);$('rate').textContent=state.rate.toFixed(3)+'×';
  $('timeline').value=state.playhead;$('buffer-meter').value=state.buffer;
  $('segments').textContent=s?.mode==='live'?`${s.accepted} verified · ${s.resyncs} resync`:`${Math.max(0,(s?.entry??1)-1)} / ${s?.recording.segments??0}`;
  $('root').textContent=s?.root??'—';$('verification-label').textContent=s?.ready?(s.mode==='live'?'Fresh IC certificates + chained retained publications':s.mode==='local'?'IC certificate + catalog + artifacts':'Hash-checked local content'):'Waiting for verification';
  $('pause').textContent=paused?'Resume playback':'Pause playback';
  $('delivery').textContent=deliveryPaused?'Downloads paused; an in-flight segment may finish.':s?.mode==='live'?(s.skipped?'Live delivery resumed from a certified snapshot; unavailable animation was skipped.':'Live certified delivery · bounded retained catch-up.'):
    p==='COMPLETE'?'End of finite recording. Restart to replay.':s?.mode==='local'?'Authenticated local snapshot · finite playback.':'Finite recording · staged local delivery.';
  $('balls').textContent=visible?.balls.size??'—';$('cannons').textContent=visible?.cannons.size??'—';
  const claimed=visible?[...visible.cells].filter(x=>x!==0).length:0;
  $('claimed').textContent=visible?`${Math.round(claimed/visible.cells.length*100)}%`:'—';
  $('world-rules').textContent=visible?`${visible.width} × ${visible.height} cells · ${visible.torus?'wraparound world':'bounded world'}. Camera copies never add entities.`:'Waiting for a verified world.';
  const healthy=Boolean(s?.operational&&performance.now()-(s.operationalAt??0)<15000&&s.operational.run.running&&!s.operational.run.world_transition&&s.operational.source.binding_checked&&!s.operational.run.last_error.length&&!s.operational.source.last_error.length&&s.operational.run.pace?.admission_open!==false);
  arcade.status({phase:p,live:s?.mode==='live',verified:Boolean(s?.ready&&!s.error),fresh:performance.now()-(s?.certifiedAt??-Infinity)<30000,healthy,paused,idle:p==='IDLE',pace:s?.operational?.run.pace,transitioning:s?.operational?.run.world_transition});
  shell.update(visible,Boolean(s?.mode==='live'&&s.config&&s.source&&s.ready&&!s.error&&healthy));
  const rows=[];for(const r of visible?.stats()??[]){const tr=document.createElement('tr');
    for(const [i,v] of [`#${String(r.id).padStart(2,'0')}`,r.area,r.balls].entries()){
      const td=document.createElement('td');td.textContent=v;if(i===0)td.className=`owner-${1+(r.id-1)%5}`;tr.append(td);
    }rows.push(tr);
  }$('territories').replaceChildren(...rows);$('event-label').textContent=visible?.lastEvent??'—';
}
function draw(){
  if(!ctx)return;
  const rect=canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,2);
  if(rect.width<=20||rect.height<=20)return; // Hidden/transient layout has no drawable arena.
  const width=Math.max(1,Math.round(rect.width*ratio)),height=Math.max(1,Math.round(rect.height*ratio));
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
  ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,rect.width,rect.height);
  if(!visible){ctx.fillStyle='#a2b3c7';ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillText('Verifying the arena…',rect.width/2,rect.height/2);return;}
  const v=visible;camera.configure(v.width,v.height,rect.width,rect.height,Boolean(v.torus));
  const cell=camera.scale,bounds=camera.bounds();
  for(const tile of camera.copies()){
  const origin=camera.screen(tile.x,tile.y),ox=origin.x,oy=origin.y;
  ctx.save();ctx.translate(ox,oy);
  for(let y=0;y<v.height;y++)for(let x=0;x<v.width;x++){
    if(x+tile.x+1<bounds.x||x+tile.x>bounds.x+bounds.width||y+tile.y+1<bounds.y||y+tile.y>bounds.y+bounds.height)continue;
    const n=y*v.width+x,owner=v.cells[n];ctx.fillStyle=color(owner)+(owner?'66':'1d');ctx.fillRect(x*cell,y*cell,cell,cell);
    if(cell>=12){ctx.strokeStyle='#45638455';ctx.lineWidth=.5;ctx.strokeRect(x*cell,y*cell,cell,cell);}
    ctx.strokeStyle=color(owner)+'aa';ctx.lineWidth=1.4;
    if((x===0&&!v.torus)||v.cells[x?n-1:y*v.width+v.width-1]!==owner){ctx.beginPath();ctx.moveTo(x*cell,y*cell);ctx.lineTo(x*cell,(y+1)*cell);ctx.stroke();}
    if((y===0&&!v.torus)||v.cells[y?n-v.width:(v.height-1)*v.width+x]!==owner){ctx.beginPath();ctx.moveTo(x*cell,y*cell);ctx.lineTo((x+1)*cell,y*cell);ctx.stroke();}
    if(x===v.width-1&&(!v.torus||v.cells[y*v.width]!==owner)){ctx.beginPath();ctx.moveTo((x+1)*cell,y*cell);ctx.lineTo((x+1)*cell,(y+1)*cell);ctx.stroke();}
    if(y===v.height-1&&(!v.torus||v.cells[x]!==owner)){ctx.beginPath();ctx.moveTo(x*cell,(y+1)*cell);ctx.lineTo((x+1)*cell,(y+1)*cell);ctx.stroke();}
  }
  const selection=arcade.moveSelection();
  if(selection&&selection.width===v.width&&selection.height===v.height){
    // Inspection overlay from the latest certified snapshot, never an ownership repaint.
    ctx.save();ctx.setLineDash([4,3]);ctx.strokeStyle='#ffcc80';ctx.lineWidth=2;
    for(const n of selection.cells)ctx.strokeRect(n%v.width*cell+3,Math.floor(n/v.width)*cell+3,cell-6,cell-6);
    if(selection.cell!==null){ctx.setLineDash([]);ctx.lineWidth=3;const n=selection.cell;ctx.strokeRect(n%v.width*cell+5,Math.floor(n/v.width)*cell+5,cell-10,cell-10);}
    ctx.restore();
  }
  for(const c of v.cannons.values()){
    const x=(c.cell%v.width+.5)*cell,y=(Math.floor(c.cell/v.width)+.5)*cell,r=Math.max(5,cell*.28);
    const extent=r*2+6;if(x+ox+extent<0||x+ox-extent>rect.width||y+oy+extent<0||y+oy-extent>rect.height)continue;
    ctx.fillStyle='#071423';ctx.strokeStyle=color(c.id);ctx.lineWidth=2;ctx.fillRect(x-r,y-r,2*r,2*r);ctx.strokeRect(x-r,y-r,2*r,2*r);
    ctx.fillStyle=color(c.id);ctx.beginPath();ctx.arc(x,y,Math.max(2,cell*.10),0,Math.PI*2);ctx.fill();
    if(Number.isInteger(c.heading)){const [vx,vy]=heading(c.heading),d=Math.hypot(vx,vy);ctx.strokeStyle=color(c.id);ctx.lineWidth=Math.max(3,cell*.1);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+vx/d*r*1.6,y+vy/d*r*1.6);ctx.stroke();}
    if(c.id===arcade.selectedCannon()){ctx.strokeStyle='#ffcc80';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,r+5,0,Math.PI*2);ctx.stroke();}
  }
  for(const p of v.pending.values())if(timeNumber(p.deadline)>=visibleTime){
    const ax=(p.from%v.width+.5)*cell,ay=(Math.floor(p.from/v.width)+.5)*cell;
    let tx=p.to%v.width+.5,ty=Math.floor(p.to/v.width)+.5;if(v.torus){tx-=Math.round((tx-ax/cell)/v.width)*v.width;ty-=Math.round((ty-ay/cell)/v.height)*v.height;}const bx=tx*cell,by=ty*cell;
    ctx.strokeStyle='#ffd790';ctx.lineWidth=2;ctx.beginPath();ctx.arc((ax+bx)/2,(ay+by)/2,Math.max(3,cell*.1),0,Math.PI*2);ctx.stroke();
  }
  for(const b of v.balls.values()){
    let bx=(Number(b.x0)+b.vx*visibleTime)/1024,by=(Number(b.y0)+b.vy*visibleTime)/1024;
    if(v.torus){bx=wrap(bx,v.width);by=wrap(by,v.height);}
    const x=bx*cell,y=by*cell,r=Math.max(2.5,cell*.073);
    if(x+ox+r+12<0||x+ox-r-12>rect.width||y+oy+r+12<0||y+oy-r-12>rect.height)continue;
    ctx.strokeStyle=color(b.owner)+'66';ctx.lineWidth=r;ctx.beginPath();ctx.moveTo(x-b.vx/1024*cell*.12,y-b.vy/1024*cell*.12);ctx.lineTo(x,y);ctx.stroke();
    ctx.shadowBlur=9;ctx.shadowColor=color(b.owner);ctx.fillStyle='#f2fbff';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  }
  for(const e of v.effects){const age=visibleTime-e.t;if(age<0||age>.9)continue;
    const x=e.cell===undefined?e.x*cell:(e.cell%v.width+.5)*cell,y=e.cell===undefined?e.y*cell:(Math.floor(e.cell/v.width)+.5)*cell;
    ctx.globalAlpha=1-age/.9;ctx.strokeStyle=e.kind==='burst'?'#ffdc9c':color(e.owner);ctx.lineWidth=1.8;
    ctx.beginPath();ctx.arc(x,y,cell*(.12+age*.7),0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
  }ctx.restore();
  }
  drawMinimap(v);
  canvas.setAttribute('aria-label',`B2Z territory arena: ${v.width} by ${v.height} cells, ${v.cannons.size} cannons, ${v.balls.size} balls.`);
}
function drawMinimap(v){
 const map=$('minimap');const height=Math.round(map.width*v.height/v.width);if(map.height!==height)map.height=height;map.hidden=!camera.minimapUseful;if(map.hidden)return;
 const m=map.getContext('2d'),sx=map.width/v.width,sy=map.height/v.height;m.clearRect(0,0,map.width,map.height);
 for(let n=0;n<v.cells.length;n++){m.fillStyle=color(v.cells[n]);m.globalAlpha=v.cells[n]?.65:.15;m.fillRect(n%v.width*sx,Math.floor(n/v.width)*sy,sx,sy);}m.globalAlpha=1;
 for(const c of v.cannons.values()){m.fillStyle=c.id===arcade.selectedCannon()?'#ffcc80':color(c.id);m.beginPath();m.arc((c.cell%v.width+.5)*sx,(Math.floor(c.cell/v.width)+.5)*sy,3,0,Math.PI*2);m.fill();}
 m.strokeStyle='#fff';m.lineWidth=1.5;for(const r of camera.minimapRects())m.strokeRect(r.x*sx,r.y*sy,r.width*sx,r.height*sy);
}
function frame(now){
  const s=session,elapsed=lastFrame===null?0:(now-lastFrame)/1000,dt=Math.min(elapsed,s?.mode==='live'?1:.25);lastFrame=now;
  if(s?.ready&&!s.error&&!paused){
    // Drain a verified terminal empty segment without waiting for nonexistent
    // future empty segments. Use the existing clock API, with no extrapolation.
    prepareIdlePlayout(s,idleState(s));
    const target=s.mode==='live'?nominalPace(s.operational):speed;s.nominalRate=approachPace(s.nominalRate??target,target,dt);
    const previous=s.clock.playhead;
    const current=s.clock.sample(dt*s.nominalRate/(s.mode==='live'?1:s.recording.tick_seconds));visibleTime=current.playhead;
    s.playedTicks=(s.playedTicks??0)+current.playhead-previous;
    function show(q,time){
      if(!q.presented){q.player.view.continuePresentation(visible,visibleTime);q.presented=true;}
      visible=q.player.advance(time);
    }
    while(s.queue.length&&visibleTime>=s.queue[0].segment.end){const q=s.queue.shift();show(q,q.segment.end);s.bytes-=q.segment.bytes;}
    if(s.queue.length)show(s.queue[0],visibleTime);
  }
  if(s?.mode==='live'&&globalThis.__dtrLive){
    const state=s.clock.state(),pace=s.operational?.run.pace;globalThis.__dtrLive.playback={wall_ms:now,frame_ms:elapsed*1000,verified_ticks:state.available,consumed_ticks:state.playhead,admitted_ticks:s.admittedTicks??0,played_ticks:s.playedTicks??0,buffer_ticks:state.buffer,phase:phase(),rate:state.rate,nominal_rate:s.nominalRate??0,target_rate:Number(pace?.nominal_milli??0)/1000,performance_limited:Boolean(pace?.performance_limited),fetch_ms:s.fetchMs??0,verify_ms:s.verifyMs??0,artifact_ms:s.artifactMs??0,derive_ms:s.deriveMs??0,artifact_bundle:Boolean(s.bundleUsed),artifact_bundle_fallbacks:s.bundleFallbacks??0,artifact_bundle_error:s.bundleError??null,delivery_failures:s.retryFailures,delivery_error:s.deliveryError??null,backend_segments:Number(s.operational?.run.completed_segments??0n),segment_ticks:Number(s.operational?.run.publication_ticks??s.operational?.run.segment_ticks??2n)};
  }
  void pump(now);void refreshOperational(now);draw();if(now-lastHud>100){updateHud();lastHud=now;}requestAnimationFrame(frame);
}
$('pause').addEventListener('click',()=>{paused=!paused;lastFrame=null;updateHud();});
$('restart').addEventListener('click',()=>{if(session)void (session.mode==='live'?startLive(session.recording):session.mode==='local'?startLocal(session.recording):start(session.recording));});
$('recording').addEventListener('change',()=>{const r=catalog.recordings.find(r=>r.id===$('recording').value);if(r)void start(r);});
$('speed').addEventListener('change',()=>{if(session?.mode==='live'){speed=1;$('speed').value='1';return;}const n=Number($('speed').value);if([.5,1,2].includes(n))speed=n;});
$('network-pause').addEventListener('change',()=>{deliveryPaused=$('network-pause').checked;updateHud();});
$('retry').addEventListener('click',()=>{const s=session;if(!s){void bootstrap();return;}if(s.busy)return;$('error').hidden=true;if(!s.ready){void (s.mode==='live'?startLive(s.recording):s.mode==='local'?startLocal(s.recording):start(s.recording));return;}s.error=null;s.retryFailures=0;s.nextDue=0;updateHud();});
document.addEventListener('visibilitychange',()=>{lastFrame=null;});
new ResizeObserver(draw).observe(canvas);
async function bootstrap(){
bootError=null;$('error').hidden=true;
try{
  if(!ctx||!globalThis.crypto?.subtle)throw new Error('Canvas and Web Crypto require a supported browser on localhost or HTTPS.');
  if(deployment!==null){
    const policy=await deploymentPolicy(deployment);
    $('trust-title').textContent=policy.network==='ic'?'Internet Computer — certified observer':'Disposable local deployment — certified observer';
    $('trust-detail').textContent=policy.network==='ic'?'SDK mainnet root, configured backend, fresh certificates and verified publication artifacts.':'Test-only bundle, pinned disposable root, configured backend and fresh certified artifacts.';
    $('integrity-help').textContent='The configured IC trust root authenticates fresh publication catalogs. Artifact hashes and retained predecessor links bind the displayed state, audit and scores.';
    $('network-help').textContent='Read-only observation. Transfers use your existing wallet; this site never signs or sends.';
    const recording={id:'mainnet',title:'B2Z live observer',description:'Account-index payments, authoritative simulation. Automatic payouts are unavailable.',
      network:policy.network,canister_id:policy.canister_id,tick_seconds:1,deployment:policy};
    const option=document.createElement('option');option.value=recording.id;option.textContent=recording.title;
    $('recording').replaceChildren(option);$('recording').disabled=true;catalog={recordings:[recording]};await startLive(recording);return;
  }
  const params=new URLSearchParams(location.search);
  if(params.get('mode')==='live'){
    $('trust-title').textContent='Live local IC — test-network certified';$('trust-detail').textContent='Pinned PocketIC root, intended canister, fresh certificates, chained publications and artifact hashes.';
    $('integrity-help').textContent='The current head is certified by the configured local root. Retained predecessors are admitted only through exact manifest/state/time/source links to that certified head.';
    $('network-help').textContent='Read-only live observation of a disposable local IC. No wallet, gameplay command or public network.';
    const metadata=liveMetadata(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await readBytes('/s10-live/metadata.json',65536,AbortSignal.timeout(10000)))));
    const recording={...metadata,id:'live-local-ic',title:'Live certified local game',description:'Autonomous runtime-lab publications retrieved while PocketIC remains running.'};
    catalog={recordings:[recording]};const option=document.createElement('option');option.value=recording.id;option.textContent=recording.title;
    $('recording').replaceChildren(option);$('recording').value=recording.id;$('recording').disabled=true;await startLive(recording);return;
  }
  if(params.get('mode')==='local'){
    $('trust-title').textContent='Local IC / test-network certified';$('trust-detail').textContent='Pinned PocketIC root, canister identity, certificate time, catalog and artifact hashes.';
    $('integrity-help').textContent='Standard IC certificate verification binds this flat catalog to the configured local canister and root. No root is fetched from the endpoint.';
    $('network-help').textContent='Valueless PocketIC test records only. No ICP, wallet or production network.';
    const metadata=localMetadata(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await readBytes('/s09-local/metadata.json',65536,AbortSignal.timeout(10000)))));
    const recording={...metadata,id:'local-ic',title:'Certified local ledger slice',description:'Pinned upstream test ledger → runtime-lab → authenticated committed B2Z artifacts.',segments:1,roots:['local-predecessor','local-commit']};
    catalog={recordings:[recording]};const option=document.createElement('option');option.value=recording.id;option.textContent=recording.title;
    $('recording').replaceChildren(option);$('recording').value=recording.id;$('recording').disabled=true;await startLocal(recording);return;
  }
  catalog=validateIndex(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await readBytes('./recordings/index.json',65536,AbortSignal.timeout(10000)))));
  $('recording').replaceChildren();for(const r of catalog.recordings){const o=document.createElement('option');o.value=r.id;o.textContent=r.title;$('recording').append(o);}
  const requested=params.get('recording'),r=catalog.recordings.find(r=>r.id===requested)??catalog.recordings[0];
  $('recording').value=r.id;$('recording').disabled=false;await start(r);
}catch(e){bootError=e;showError(e);updateHud();}
}
await bootstrap();
requestAnimationFrame(frame);
