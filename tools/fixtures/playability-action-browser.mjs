/** Synthetic populated journey using the actual composer, projection and renderer.
 * No certificate claim: canonical kernel outputs are integrity-checked here only. */
import {createArcade} from '../../apps/b2z-observer/arcade.mjs';
import {Camera} from '../../apps/b2z-observer/camera.mjs';
import {createShell} from '../../apps/b2z-observer/shell.mjs';
import {createArenaRenderer} from '../../apps/b2z-observer/render.mjs';
import {B2zView,SegmentPlayer,prepareDerivedSegment,liveBufferPolicy} from '../../apps/b2z-observer/model.mjs';
import {PlayoutClock} from '@dtr/timeline-runtime/client/playout';
import {accountIdentifier} from '../../apps/b2z-observer/identity.mjs';
import {decodeCanonical,encodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {sha256Web as sha256} from '@dtr/timeline-runtime/client/verification';
const data=await(await fetch('fixture.json')).json(),bytes=s=>Uint8Array.from(s.match(/../g),b=>parseInt(b,16));
const names=new Map([['01'.repeat(32),accountIdentifier('aaaaa-aa')],['02'.repeat(32),accountIdentifier('rrkah-fqaaa-aaaaa-aaaaq-cai')]]);
function accounts(v){if(Array.isArray(v))return v.map(accounts);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,v])=>[k,accounts(v)]));return names.get(v)??v;}
const config=decodeCanonical(bytes(data.config)),owner='s5ir5-gqaaa-aaaas-amyna-cai',source={network:'pocketic-local-ui-fixture',owner,subaccount:0n,recipient:accountIdentifier(owner)};
const arcade=createArcade(document),camera=new Camera(),canvas=document.getElementById('board'),renderer=createArenaRenderer(canvas);let world,view,clock=null,queue=[],time=0,rate=.1,prior=null,stats={},frames=[],drawTimes=[];
const shell=createShell(document,camera,arcade,{selected:()=>view?.cannons.get(arcade.selectedCannon()),cell:(n,p)=>{if(arcade.moveSelection())return arcade.chooseCell(n);const c=[...view.cannons.values()].find(c=>c.cell===n);return c?arcade.selectCannon(c.id):false;}});
function draw(){const began=performance.now();const rect=canvas.getBoundingClientRect();camera.configure(view.width,view.height,rect.width,rect.height,true);stats=renderer.draw(view,camera,{time,selection:arcade.moveSelection(),selected:arcade.selectedCannon(),aim:arcade.aim(),reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});drawTimes.push(performance.now()-began);if(drawTimes.length>1200)drawTimes.shift();}
function healthy(phase='PLAYING') {return {phase,live:true,verified:true,fresh:true,healthy:true,operationalFresh:true,advancing:clock?clock.started&&clock.available>clock.playhead:true,world,operational:{run:{running:true,idle:world.balls.length===0,last_error:[],pace:{mode:rate<.5?'Trickle':'Normal',nominal_milli:Math.round(rate*1000),supported_milli:Math.round(rate*1000),admission_open:true}},source:{binding_checked:true,last_error:[]}}};}
function render(name,phase='initial'){clock=null;queue=[];world=accounts(decodeCanonical(bytes(data.cases[name][phase])));view=new B2zView(world);time=Number(world.time[0])/Number(world.time[1]);renderer.reset();arcade.render(world,config,source);arcade.receipts(phase==='final'?accounts(decodeCanonical(bytes(data.cases[name].events))).receipts:[]);arcade.status(healthy());camera.configure(view.width,view.height,innerWidth,innerHeight,true);if(!camera.focused){camera.frameCell(world.cannons[0].cell);camera.focused=true;}draw();return{cannons:world.cannons.length,balls:world.balls.length};}
async function motion(name='idle',speed=.1){
 render(name);rate=speed;const row=data.cases[name],initial=encodeCanonical(world),final=encodeCanonical(accounts(decodeCanonical(bytes(row.final)))),events=encodeCanonical(accounts(decodeCanonical(bytes(row.events))));
 const seal=decodeCanonical(bytes(row.seal)),identity={config_hash:seal.config_hash,rules_hash:seal.rules_hash,schema_hash:seal.schema_hash};
 const publication={version:8,identity,render_format:null,head:{seal:{...seal,previous_state:await sha256(initial)},state_hash:await sha256(final)},artifacts:[{kind:'events',sha256:await sha256(events)}]};
 // This synthetic account substitution changes artifact hashes, never IC certificates.
 const segment=await prepareDerivedSegment(initial,final,events,publication);
 clock=new PlayoutClock({start:segment.start,...liveBufferPolicy({run:{publication_ticks:1,pace:{mode:speed<.5?'Trickle':'Normal',nominal_milli:Math.round(speed*1000),supported_milli:Math.round(speed*1000)}}})});clock.append(segment.start,segment.end);queue=[{segment,player:new SegmentPlayer(segment)}];
 world=accounts(decodeCanonical(bytes(row.final)));arcade.render(world,config,source);return true;
}
function frame(now){const dt=prior===null?0:Math.min(.1,(now-prior)/1000);if(prior!==null)frames.push(now-prior);if(frames.length>1200)frames.shift();prior=now;
 if(clock){time=clock.sample(dt*rate).playhead;while(queue.length&&time>=queue[0].segment.end){view=queue.shift().player.advance(time);}if(queue.length)view=queue[0].player.advance(time);arcade.status(healthy(clock.phase));}draw();requestAnimationFrame(frame);}
const params=new URLSearchParams(location.search);render(params.get('case')??'first',params.get('phase')??'initial');
globalThis.fixture={render,motion,status:v=>arcade.status(v),receipts:v=>arcade.receipts(v),action:k=>arcade.action(k),select:n=>arcade.selectCannon(n),choose:n=>arcade.chooseCell(n),sites:()=>arcade.moveSelection()?.cells??[],canPay:()=>arcade.canPay(),world:()=>world,draw,open:draw,point(id){const c=view.cannons.get(id);let x=c.cell%view.width+.5,y=Math.floor(c.cell/view.width)+.5;const copies=camera.copies().map(p=>camera.screen(x+p.x,y+p.y));return copies.sort((a,b)=>Math.hypot(a.x-innerWidth/2,a.y-innerHeight/2)-Math.hypot(b.x-innerWidth/2,b.y-innerHeight/2))[0];},camera,summary:()=>({account:arcade.account(),selected:arcade.selectedCannon(),cannons:world.cannons.length,balls:world.balls.length,camera:[camera.x,camera.y,camera.scale],time,queue:queue.length,clock:clock?.state(),stats}),markClock(){this.savedClock=clock;this.savedQueue=queue;},sameClock(){return clock===this.savedClock&&queue===this.savedQueue;},metricsReset(){frames=[];drawTimes=[];},metrics(){const d=drawTimes.slice().sort((a,b)=>a-b),f=frames.slice().sort((a,b)=>a-b);return{frames:f.length,p50:f[Math.floor(f.length*.5)],p95:f[Math.floor(f.length*.95)],draw_p50:d[Math.floor(d.length*.5)],draw_p95:d[Math.floor(d.length*.95)],heap:performance.memory?.usedJSHeapSize,stats};}};
requestAnimationFrame(frame);
