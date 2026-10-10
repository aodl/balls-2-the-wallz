#!/usr/bin/env node
/** Offline demonstration. No wallet, ledger, deployment, certificate or cycles claim. */
import {coordinatorScenario} from '../tests/scenarios/coordinator.mjs';
import {publication,PublicationWindow} from '../packages/observation/publication.mjs';
import {projectAnimation} from '../packages/kernels/btz/animation.mjs';
import {verifyPinnedPublication,ArtifactAssembler} from '../packages/client/verification.mjs';
import {unhex} from '../packages/protocol/bytes.mjs';
const {host,end}=coordinatorScenario('dense'),before=publication(host.publicationRecord()),initial=unhex(host.committed().state_hex);
const window=new PublicationWindow({maxSegments:2});window.retain(host.publicationRecord());host.seal(end);
host.advance(1);const stable=publication(host.publicationRecord()).sha256===before.sha256;
if(!stable)throw new Error('private step changed committed artifact identity');
while(host.status().phase==='running')host.advance(127);host.publish(host.status().ready_hash);
window.retain(host.publicationRecord());
const ticket=await verifyPinnedPublication(window.catalog(before.sha256),before.sha256),reader=new ArtifactAssembler(ticket,'state');
for(let i=0;i<reader.descriptor.chunks.length;i++)await reader.accept(i,window.chunk(before.sha256,'state',i));
const prior=await reader.finish();if(Buffer.compare(prior,initial)!==0)throw new Error('retained state changed');
const audit=unhex(host.committed().event_hex),projected=projectAnimation(initial,audit);
const renderWindow=new PublicationWindow();const root=renderWindow.retain(host.publicationRecord(),{render:{format:projected.format,bytes:projected.bytes}});
const renderTicket=await verifyPinnedPublication(renderWindow.catalog(root),root),assembler=new ArtifactAssembler(renderTicket,'render');
for(let i=0;i<assembler.descriptor.chunks.length;i++)await assembler.accept(i,renderWindow.chunk(root,'render',i));
if(Buffer.compare(await assembler.finish(),projected.bytes)!==0)throw new Error('render verification failed');
console.log(JSON.stringify({checkpoint:'S06',game_rules:'unchanged BTZ v3',private_progress_keeps_publication_stable:stable,
  preceding_snapshot_downloaded_after_next_commit:true,manifest_hash:host.committed().manifest_hash,
  animation_format:projected.format,audit_event_bytes:audit.length,animation_bytes:projected.bytes.length,
  ...projected.statistics,verification:renderTicket.mode,cycles_consumed:null,
  scope:'Synthetic local inputs; content integrity only, not an IC certificate or production host.'},null,2));
