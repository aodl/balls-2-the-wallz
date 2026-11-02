/** One shared authenticated mirror. Existing DTR verification owns every trust decision. */
import {readFile,mkdir,rename,open} from 'node:fs/promises';
import {join} from 'node:path';
import {mainnetConnection,artifactBundleClient,verifiedSourceDescriptor,operationalReader} from '../../../apps/b2z-observer/mainnet.mjs';
import {certificateVerifier,liveClient} from '@dtr/timeline-runtime/client/ic-certificate';
import {ArtifactAssembler,PublicationSequence,verifyCertificatePublication,verifyRetainedPredecessor,sha256Web} from '@dtr/timeline-runtime/client/verification';
import {Actor,HttpAgent} from '@icp-sdk/core/agent';
import {IDL} from '@icp-sdk/core/candid';
import {decodeCanonical,encodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {decodeWorld,PLAYABILITY_IDENTITY,ENTRY_IDENTITY} from '../../kernels/b2z/world.mjs';
import {liveDeliveryDiagnostics,liveDeliveryFailure,liveDeliverySuccess,rememberLiveAcceptance} from '../../../apps/b2z-observer/live-delivery.mjs';
import {recordedCertificateVerifier} from '../../protocol/recorded-certificate.mjs';
import {CONFIGURATION_ASSETS} from '../../../apps/b2z-observer/configuration.generated.mjs';
import {BoardAnalysis} from './analysis.mjs';
import {check,freeze,parse,stringify} from './common.mjs';
const certified=new WeakSet();
async function durableFile(path,contents){const temp=path+'.tmp',f=await open(temp,'w',0o600);try{await f.write(contents);await f.sync();}finally{await f.close();}await rename(temp,path);const directory=await open(join(path,'..'),'r');try{await directory.sync();}finally{await directory.close();}}
export function requireCertified(s,{freshMs=300000,nowNs=BigInt(Date.now())*1000000n}={}){check(certified.has(s),'AUTHENTICATED_MIRROR_REQUIRED');check(s.observed_ns<=nowNs+30000000000n&&s.observed_ns+BigInt(freshMs)*1000000n>=nowNs,'STALE_SNAPSHOT');return s;}
export const MAINNET=Object.freeze({network:'ic',host:'https://icp-api.io',canister_id:'s34gv-3qaaa-aaaar-qcifa-cai',ledger:'ryjl3-tyaaa-aaaaa-aaaba-cai',index:'qhbym-qaaaa-aaaaa-aaafq-cai'});
export class VerifiedObserver{
 constructor({policy=MAINNET,connection,store=null,trackAccounts=[],maxHistory=32,minRefreshMs=1000,clock=()=>BigInt(Date.now())*1000000n}={}){this.minRefreshMs=minRefreshMs;this.lastRefreshAt=0;this.clock=clock;this.policy=policy;this.connection=connection;this.store=store;this.trackAccounts=new Set(trackAccounts);check(maxHistory>=2&&maxHistory<=64,'HISTORY_BOUND');this.maxHistory=maxHistory;this.sequence=new PublicationSequence();this.history=[];this.receipts=[];this.current=null;this.delivery={sequence:this.sequence,resyncs:0,retryFailures:0,deliveryDiagnostics:liveDeliveryDiagnostics()};this.proofs=new Map();this.raw=new Map();this.metrics={queries:0,artifact_bytes:0,refreshes:0,stale_responses:0,resyncs:0};this.busy=null;}
 static async connect(options={}){
  const policy=options.policy??MAINNET;let connection;
  if(policy.network==='ic')connection=await mainnetConnection({network:policy.network,host:policy.host,canister_id:policy.canister_id});
  else{check(policy.network==='pocketic-local'&&['127.0.0.1','localhost'].includes(new URL(policy.host).hostname)&&policy.rootKey instanceof Uint8Array,'PINNED_LOCAL_POLICY_REQUIRED');const base=await liveClient(policy);connection={client:await artifactBundleClient(policy,base),verifyCertificate:certificateVerifier({network:policy.network,rootKey:policy.rootKey})};}
  const self=new VerifiedObserver({...options,policy,connection});
  self.agent=await HttpAgent.create({host:policy.host,...(policy.rootKey?{rootKey:policy.rootKey}:{}),shouldFetchRootKey:false,shouldSyncTime:false,verifyQuerySignatures:true});
  if(policy.network==='pocketic-local')connection.readStatus=operationalReader(self.agent,policy.canister_id);
  self.sourceActor=Actor.createActor(({IDL})=>IDL.Service({source_descriptor:IDL.Func([],[IDL.Variant({Ok:IDL.Vec(IDL.Nat8),Err:IDL.Text})],['query'])}),{agent:self.agent,canisterId:policy.canister_id});
  await self.restoreFloor();return self;
 }
 async verify(raw,{historicalNs=null}={}){const ticket=await verifyCertificatePublication(raw.publication,raw.certificate,{network:this.policy.network,canister_id:this.policy.canister_id,now_ns:historicalNs??this.clock(),max_age_ns:300000000000n,max_future_ns:30000000000n},historicalNs===null?this.connection.verifyCertificate:recordedCertificateVerifier({...this.policy,recordedNs:historicalNs}));check([PLAYABILITY_IDENTITY,ENTRY_IDENTITY].some(id=>['rules_hash','config_hash','schema_hash'].every(k=>ticket.publication.identity[k]===id[k])),'UNSUPPORTED_RULES_IDENTITY');return ticket;}
 async restoreFloor(){if(!this.store)return;let data;try{data=parse(await readFile(join(this.store,'floor.json'),'utf8'));}catch(e){if(e.code==='ENOENT')return;throw e;}
  check(data.policy.network===this.policy.network&&data.policy.canister_id===this.policy.canister_id,'CACHE_DEPLOYMENT_MISMATCH');const raw={publication:Buffer.from(data.publication_hex,'hex'),certificate:Buffer.from(data.certificate_hex,'hex')},ticket=await this.verify(raw,{historicalNs:BigInt(data.certificate_ns)});check(ticket.certificate_time_ns===BigInt(data.certificate_ns),'CACHE_CERTIFICATE_TIME');this.sequence.accept(ticket);rememberLiveAcceptance(this.delivery,ticket);
  // Historical authentication restores only the anti-rollback floor. No cached state is current until fresh observation.
  this.raw.set(ticket.root_hash,raw);this.metrics.restored_floor=String(ticket.publication.head.segment_id);
  try{const lines=(await readFile(join(this.store,'receipts.jsonl'),'utf8')).trim().split('\n').filter(Boolean);check(lines.length<=4096,'RECEIPT_ARCHIVE_BOUND');this.receipts=lines.map(parse);for(const row of this.receipts)await this.verifyArchivedReceipt(row);}catch(e){if(e.code!=='ENOENT')throw e;}
 }
 async refresh(){if(this.fatalError)throw this.fatalError;if(this.current&&Date.now()-this.lastRefreshAt<this.minRefreshMs)return{status:'cached',snapshot:this.current};if(this.busy)return this.busy;this.busy=this.refreshOnce();try{const r=await this.busy;this.lastRefreshAt=Date.now();return r;}finally{this.busy=null;}}
 async refreshOnce(){const started=performance.now(),raw=await this.connection.client.observation();this.metrics.queries++;const ticket=await this.verify(raw),prior=this.sequence.last;this.metrics.refreshes++;
  if(prior&&ticket.publication.head.segment_id<=prior.publication.head.segment_id){try{this.sequence.accept(ticket);}catch(error){liveDeliveryFailure(this.delivery,error,ticket,prior,performance.now());if(this.delivery.deliveryDiagnostics.active.kind!=='stale-certified-observation')throw error;this.metrics.stale_responses++;return{status:'stale_discarded',snapshot:this.current};}
   if(this.current){this.current=freeze({...this.current,observed_ns:ticket.certificate_time_ns});certified.add(this.current);this.history[this.history.length-1]=this.current;liveDeliverySuccess(this.delivery,ticket,performance.now());return{status:'unchanged',snapshot:this.current};}
  }
  this.raw.set(ticket.root_hash,{publication:Uint8Array.from(raw.publication),certificate:Uint8Array.from(raw.certificate)});
  const chain=[ticket];let gap=null;
  if(prior&&ticket.publication.head.segment_id>prior.publication.head.segment_id){
   if(ticket.publication.head.segment_id-prior.publication.head.segment_id>16n)gap={from:prior.publication.head.segment_id+1n,to:ticket.publication.head.segment_id-1n,reason:'outside bounded retained history'};
   else{
    let tip=ticket;
    while(tip.publication.head.segment_id>prior.publication.head.segment_id+1n){
     let bytes;try{bytes=await this.connection.client.publication(Number(tip.publication.head.segment_id-1n));this.metrics.queries++;}catch(e){if(!String(e.message).includes('publication unavailable: snapshot resync required'))throw e;gap={from:prior.publication.head.segment_id+1n,to:ticket.publication.head.segment_id-1n,reason:'retained publication unavailable'};break;}
     tip=await verifyRetainedPredecessor(bytes,tip);chain.push(tip);this.raw.set(tip.root_hash,{publication:bytes,certificate:null});
    }
   }
  }
  if(gap){const candidate=new PublicationSequence();candidate.last=this.sequence.last;candidate.resync(ticket);await this.load(ticket,{tip:ticket,chain:[ticket]},[gap]);this.sequence.resync(ticket);this.metrics.resyncs++;this.delivery.resyncs++;}
  else{for(const t of chain.reverse()){const candidate=new PublicationSequence();candidate.last=this.sequence.last;candidate.accept(t);await this.load(t,{tip:ticket,chain:chain.slice(chain.indexOf(t))},[]);this.sequence.accept(t);rememberLiveAcceptance(this.delivery,t);}}
  rememberLiveAcceptance(this.delivery,ticket);liveDeliverySuccess(this.delivery,ticket,performance.now());await this.persistFloor(ticket,raw);this.metrics.last_refresh_ms=performance.now()-started;return{status:gap?'resynchronised':'advanced',snapshot:this.current,gap};
 }
 async load(ticket,proof,gaps){const bundles=await this.connection.client.bundle(Number(ticket.publication.head.segment_id),ticket.root_hash),artifacts={};this.metrics.queries++;
  for(const[k,kind]of ['state','events','scores'].entries()){const a=new ArtifactAssembler(ticket,kind);for(let i=0;i<a.descriptor.chunks.length;i++)await a.accept(i,bundles[k].slice(i*16384,(i+1)*16384));artifacts[kind]=await a.finish();this.metrics.artifact_bytes+=artifacts[kind].length;}
  let source=this.current?.source;if(!source||this.current.reference.source_id!==ticket.publication.identity.source_id){const r=await this.sourceActor.source_descriptor();this.metrics.queries++;check(r.Ok,'SOURCE_UNAVAILABLE');source=await verifiedSourceDescriptor(Uint8Array.from(r.Ok),ticket,{network:this.policy.network,canister_id:this.policy.canister_id,ledger:this.policy.ledger,index:this.policy.index});}
  const configBytes=await readFile(new URL('../../../apps/b2z-observer/'+CONFIGURATION_ASSETS[ticket.publication.identity.config_hash],import.meta.url));check(await sha256Web(configBytes)===ticket.publication.identity.config_hash,'CONFIGURATION_COMMITMENT');
  const p=ticket.publication,reference={network:this.policy.network,canister:this.policy.canister_id,head:p.head.segment_id,logical_time:p.head.logical_end,root:ticket.root_hash,manifest:p.head.manifest_hash,state:p.head.state_hash,epoch:p.epoch?.transition_hash??null,epoch_index:p.epoch?.transition_index??null,source_cursor:p.head.source_to_exclusive,...p.identity};
  const world=decodeWorld(artifacts.state),events=decodeCanonical(artifacts.events);check(events.version===6,'EVENT_VERSION');
  const s=freeze({trust:'certificate-verifier',reference,observed_ns:ticket.certificate_time_ns,world,events,scores:decodeCanonical(artifacts.scores),configuration:decodeCanonical(configBytes),source,gaps,operational:null});
  this.proofs.set(ticket.root_hash,proof);if(this.proofs.size>this.maxHistory)this.proofs.delete(this.proofs.keys().next().value);
  for(const receipt of events.receipts??[]){if(this.trackAccounts.size&&!this.trackAccounts.has(receipt.account))continue;const key=reference.source_id+':'+receipt.position;if(this.receipts.some(r=>r.key===key))continue;check(this.receipts.length<4096,'RECEIPT_ARCHIVE_FULL');const row={key,reference,receipt,authenticated_at_ns:ticket.certificate_time_ns};if(this.store){await mkdir(this.store,{recursive:true,mode:0o700});const archive=join(this.store,'proofs');await mkdir(archive,{mode:0o700,recursive:true});const file=join(archive,ticket.root_hash+'.json');await durableFile(file,stringify(await this.eventProof(ticket.root_hash,artifacts.events)));const f=await open(join(this.store,'receipts.jsonl'),'a',0o600);try{await f.write(stringify(row,0)+'\n');await f.sync();}finally{await f.close();}}this.receipts.push(row);}
  certified.add(s);this.current=s;this.history.push(s);if(this.history.length>this.maxHistory)this.history.shift();
  while(this.raw.size>this.maxHistory+17)this.raw.delete(this.raw.keys().next().value);
 }
 async eventProof(root,events=null){const proof=this.proofs.get(root);check(proof&&proof.chain[0].root_hash===root,'EVENT_PROOF_UNAVAILABLE');const tipRaw=this.raw.get(proof.tip.root_hash);check(tipRaw?.certificate,'RECEIPT_TIP_CERTIFICATE');if(events===null){const s=this.history.find(s=>s.reference.root===root);check(s,'EVENT_PROOF_UNAVAILABLE');events=encodeCanonical(s.events);}check(await sha256Web(events)===proof.chain[0].publication.artifacts.find(a=>a.kind==='events').sha256,'EVENT_PROOF_ARTIFACT');return{tip:{publication_hex:Buffer.from(tipRaw.publication).toString('hex'),certificate_hex:Buffer.from(tipRaw.certificate).toString('hex')},chain:proof.chain.map(t=>{const raw=this.raw.get(t.root_hash);check(raw,'EVENT_PROOF_UNAVAILABLE');return Buffer.from(raw.publication).toString('hex');}),events_hex:Buffer.from(events).toString('hex')};}
 async verifyArchivedReceipt(row){check(/^[0-9a-f]{64}$/.test(row.reference.root),'RECEIPT_REFERENCE');const proof=parse(await readFile(join(this.store,'proofs',row.reference.root+'.json'),'utf8'));check(proof.chain.length<=16,'RECEIPT_PROOF_BOUND');let ticket=await this.verify({publication:Buffer.from(proof.tip.publication_hex,'hex'),certificate:Buffer.from(proof.tip.certificate_hex,'hex')},{historicalNs:BigInt(row.authenticated_at_ns)});for(const raw of proof.chain.slice(0,-1).reverse())ticket=await verifyRetainedPredecessor(Buffer.from(raw,'hex'),ticket);check(ticket.root_hash===row.reference.root,'RECEIPT_PROOF_ROOT');const events=Buffer.from(proof.events_hex,'hex');check(await sha256Web(events)===ticket.publication.artifacts.find(a=>a.kind==='events').sha256,'RECEIPT_EVENT_COMMITMENT');const actual=decodeCanonical(events).receipts.find(r=>r.position===row.receipt.position);check(actual&&Buffer.from(encodeCanonical(actual)).equals(Buffer.from(encodeCanonical(row.receipt))),'RECEIPT_ARCHIVE_TAMPERED');check(row.key===ticket.publication.identity.source_id+':'+actual.position,'RECEIPT_DEDUP_KEY');return row;}
 async persistFloor(ticket,raw){if(!this.store)return;await mkdir(this.store,{recursive:true,mode:0o700});await durableFile(join(this.store,'floor.json'),stringify({policy:{network:this.policy.network,canister_id:this.policy.canister_id},publication_hex:Buffer.from(raw.publication).toString('hex'),certificate_hex:Buffer.from(raw.certificate).toString('hex'),certificate_ns:ticket.certificate_time_ns}));}
 start(intervalMs=5000){check(intervalMs>=1000&&intervalMs<=15000,'OBSERVER_POLL_BOUND');if(this.timer)return;this.timer=setInterval(()=>{this.refresh().then(()=>this.operational()).catch(e=>{this.fatalError=e;this.stop();});},intervalMs);}
 stop(){if(this.timer){clearInterval(this.timer);this.timer=null;}}
 async operational(){if(this.connection.readStatus){let operational=this.operCache?.value;if(!operational||Date.now()-this.operCache.at>=15000){this.metrics.queries++;operational=await this.connection.readStatus();this.operCache={at:Date.now(),value:operational};}if(this.current){this.current=freeze({...this.current,operational,operational_observed_at_ms:this.operCache.at});certified.add(this.current);this.history[this.history.length-1]=this.current;}return operational;}return null;}
 analysis(local=null){check(this.current,'FRESH_OBSERVATION_REQUIRED');return new BoardAnalysis(this.current,{history:this.history,receipts:this.receipts,local});}
}
