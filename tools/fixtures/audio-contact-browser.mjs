/** Actual player/renderer/composer/audio integration over canonical disposable
 * kernel outputs. Content-verified fixture, never an IC certificate claim. */
import{decodeCanonical}from'@dtr/timeline-runtime/runtime/canonical';
import{sha256Web}from'@dtr/timeline-runtime/client/verification';
import{prepareDerivedSegment,SegmentPlayer,B2zView}from'../../apps/b2z-observer/model.mjs';
import{createAudioUI}from'../../apps/b2z-observer/audio-ui.mjs';
import{createArcade}from'../../apps/b2z-observer/arcade.mjs';
import{createShell}from'../../apps/b2z-observer/shell.mjs';
import{Camera}from'../../apps/b2z-observer/camera.mjs';
import{createArenaRenderer}from'../../apps/b2z-observer/render.mjs';
import{ballPresentation}from'../../apps/b2z-observer/ball-presentation.mjs';
import{accountIdentifier}from'../../apps/b2z-observer/identity.mjs';
import{contactFixtureTime}from'./audio-contact-clock.mjs';
const data=await(await fetch('./contact.json')).json(),bytes=s=>Uint8Array.from(s.match(/../g),s=>parseInt(s,16)),initial=bytes(data.initial),final=bytes(data.final),events=bytes(data.events),world=decodeCanonical(initial),seal=decodeCanonical(bytes(data.seal));
const publication={version:8,identity:{config_hash:seal.config_hash,rules_hash:seal.rules_hash,schema_hash:seal.schema_hash},render_format:null,head:{seal:{...seal,previous_state:await sha256Web(initial)},state_hash:await sha256Web(final)},artifacts:[{kind:'events',sha256:await sha256Web(events)}]};
const segment=await prepareDerivedSegment(initial,final,events,publication),player=new SegmentPlayer(segment,{namespace:'controlled-contact',identity:'content-pinned',root:await sha256Web(events),segment:'1'}),audio=createAudioUI(document),arcade=createArcade(document),canvas=document.getElementById('board'),camera=new Camera(),renderer=createArenaRenderer(canvas),points=ballPresentation();
const shell=createShell(document,camera,arcade,{selected:()=>player.view.cannons.get(arcade.selectedCannon()),cell:()=>false});
const owner='s5ir5-gqaaa-aaaas-amyna-cai';arcade.render(segment.final,decodeCanonical(bytes(data.config)),{network:'offline-contact-fixture',owner,subaccount:0n,recipient:accountIdentifier(owner)});arcade.status({resolved:{kind:'playing',label:'Controlled verified displayed contact',canPrepare:false},worldReady:true});
let start=null,last=performance.now(),time=segment.start,finished=false;const frames=[];
camera.configure(1000,1000,innerWidth,innerHeight,true);camera.scale=64;camera.centre(103.5,1);
function frame(now){const elapsed=(now-last)/1000;last=now;const previous=time;if(start!==null&&!finished)time=contactFixtureTime(now,start,segment.start,segment.end);const collector=audio.begin({account:arcade.account(),previous,time,elapsed,now,ready:true,failed:false,camera});const before=player.index;player.advance(time,collector);if(player.index>before)frames.push({previous,time,elapsed,events:segment.events.slice(before,player.index).map(e=>({kind:e.kind,time:e.time.map(String),sequence:e.sequence})),audio:audio.inspect().events});const rect=canvas.getBoundingClientRect();camera.configure(1000,1000,rect.width,rect.height,true);const p=points.get(player.view,time);shell.advance(player.view,time,now,'controlled-contact',p);renderer.draw(player.view,camera,{time,points:p,audioEligible:audio.effectsReady(),selected:arcade.selectedCannon()});shell.update(player.view,renderer.surface());audio.flush({camera,membership:renderer.audioMembership(),occluders:shell.audioOccluders(rect),time,elapsed,continuous:elapsed>0&&elapsed<=.25,failed:false});requestAnimationFrame(frame);}
globalThis.contactQA={audio:()=>audio.inspect(),start(){audio.fence();start=performance.now();},finish(){audio.fence();finished=true;time=segment.end;const starts=audio.inspect().stats.starts;player.advance(time);player.view.matches(segment.final);return{endpointEquality:true,events:player.index,expected:segment.events.length,startsBeforeSeek:starts,startsAfterSeek:audio.inspect().stats.starts};},state:()=>({time,frames,authorityTime:segment.final.time.map(String),latestBoundaryOwner:(()=>{const latest=new B2zView(segment.final);return latest.playability.players.find(p=>p.id===latest.playerForTerritory(latest.owner(1103)))?.account})(),account:arcade.account(),camera:[camera.x,camera.y,camera.scale]})};requestAnimationFrame(frame);
