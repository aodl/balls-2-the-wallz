import {PlayoutClock} from '../../packages/client/playout.mjs';
import {PublicationSequence} from '../../packages/client/verification.mjs';
import {BtzView,SegmentPlayer,snapshot,prepareSegment,timeNumber} from './model.mjs';
import {readBytes,validateIndex,loadEntry} from './transport.mjs';
const $=id=>document.getElementById(id),canvas=$('board'),ctx=canvas.getContext('2d');
const COLORS=['#425365','#57d4b7','#709cf2','#c58df5','#ecb966'];
const color=id=>COLORS[id===0?0:1+(id-1)%4];
let bootError=null,catalog=null,session=null,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,speed=1,lastFrame=null,lastHud=0;
let deliveryPaused=false,visible=null,visibleTime=0;
function showError(error){$('error-text').textContent=String(error?.message??error);$('error').hidden=false;}
function signal(s){return AbortSignal.any([s.abort.signal,AbortSignal.timeout(10000)]);}
function active(s){return session===s&&!s.abort.signal.aborted;}
async function start(recording){
  session?.abort.abort();const s={recording,abort:new AbortController(),busy:true,ready:false,error:null,entry:1,bytes:0,
    queue:[],sequence:new PublicationSequence(),previousState:null,root:'',nextDue:0,clock:new PlayoutClock({start:0,target:Math.min(8,recording.logical_end),
      low:Math.min(2,recording.logical_end/2),max_frame_delta:1})};
  session=s;visible=null;visibleTime=0;lastFrame=null;$('error').hidden=true;
  $('scenario-title').textContent=recording.title;$('scenario-description').textContent=recording.description;
  $('timeline').max=recording.logical_end;$('pause').disabled=true;$('restart').disabled=true;
  try{
    const entry=await loadEntry(recording,0,signal(s));if(!active(s))return;
    const w=snapshot(entry.state);if(timeNumber(w.time)!==0||entry.ticket.publication.head.segment_id!==null)throw new Error('recording requires a genesis snapshot');
    s.sequence.accept(entry.ticket);s.previousState=entry.state;s.root=entry.ticket.root_hash;
    visible=new BtzView(w);s.ready=true;$('pause').disabled=false;$('restart').disabled=false;
  }catch(e){if(!active(s))return;s.error=e;showError(e);}finally{s.busy=false;updateHud();draw();}
}
async function pump(now){
  const s=session;if(!s?.ready||s.busy||s.error||deliveryPaused||s.entry>=s.recording.roots.length||now<s.nextDue
    ||s.queue.length>=4||s.clock.state().buffer>=12)return;
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
function phase(){
  const s=session;if(bootError||s?.error)return 'ERROR';if(!s?.ready)return 'LOADING';
  if(s.entry===s.recording.roots.length&&s.clock.playhead===s.recording.logical_end)return 'COMPLETE';
  return paused?'PAUSED':s.clock.phase;
}
function updateHud(){
  const s=session,state=s?.clock.state()??{playhead:0,available:0,buffer:0,rate:1};
  const p=phase();$('phase').textContent=p.replaceAll('_',' ');$('phase').dataset.state=p;document.body.dataset.phase=p;
  $('playhead').textContent=state.playhead.toFixed(2);$('available').textContent=state.available.toFixed(2);
  $('buffer').textContent=state.buffer.toFixed(2);$('rate').textContent=state.rate.toFixed(3)+'×';
  $('timeline').value=state.playhead;$('buffer-meter').value=state.buffer;
  $('segments').textContent=`${Math.max(0,(s?.entry??1)-1)} / ${s?.recording.segments??0}`;
  $('root').textContent=s?.root??'—';$('verification-label').textContent=s?.ready?'Hash-checked local content':'Waiting for hashes';
  $('pause').textContent=paused?'Resume playback':'Pause playback';
  $('delivery').textContent=deliveryPaused?'Downloads paused; an in-flight segment may finish.':p==='COMPLETE'?'End of finite recording. Restart to replay.':'Finite recording · staged local delivery.';
  $('balls').textContent=visible?.balls.size??0;$('cannons').textContent=visible?.cannons.size??0;
  const rows=[];for(const r of visible?.stats()??[]){const tr=document.createElement('tr');
    for(const [i,v] of [`#${String(r.id).padStart(2,'0')}`,r.area,r.balls].entries()){
      const td=document.createElement('td');td.textContent=v;if(i===0)td.className=`owner-${1+(r.id-1)%4}`;tr.append(td);
    }rows.push(tr);
  }$('territories').replaceChildren(...rows);$('event-label').textContent=visible?.lastEvent??'—';
}
function draw(){
  if(!ctx)return;
  const rect=canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,2);
  const width=Math.max(1,Math.round(rect.width*ratio)),height=Math.max(1,Math.round(rect.height*ratio));
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
  ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,rect.width,rect.height);
  if(!visible){ctx.fillStyle='#7892a8';ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillText('Verifying the recorded arena…',rect.width/2,rect.height/2);return;}
  const v=visible,cell=Math.min((rect.width-20)/v.width,(rect.height-20)/v.height),ox=(rect.width-cell*v.width)/2,oy=(rect.height-cell*v.height)/2;
  ctx.save();ctx.translate(ox,oy);
  for(let y=0;y<v.height;y++)for(let x=0;x<v.width;x++){
    const n=y*v.width+x,owner=v.cells[n];ctx.fillStyle=color(owner)+(owner?'29':'18');ctx.fillRect(x*cell,y*cell,cell,cell);
    ctx.strokeStyle='#31415366';ctx.lineWidth=.5;ctx.strokeRect(x*cell,y*cell,cell,cell);
    ctx.strokeStyle=color(owner)+'aa';ctx.lineWidth=1.4;
    if(x===0||v.cells[n-1]!==owner){ctx.beginPath();ctx.moveTo(x*cell,y*cell);ctx.lineTo(x*cell,(y+1)*cell);ctx.stroke();}
    if(y===0||v.cells[n-v.width]!==owner){ctx.beginPath();ctx.moveTo(x*cell,y*cell);ctx.lineTo((x+1)*cell,y*cell);ctx.stroke();}
    if(x===v.width-1){ctx.beginPath();ctx.moveTo((x+1)*cell,y*cell);ctx.lineTo((x+1)*cell,(y+1)*cell);ctx.stroke();}
    if(y===v.height-1){ctx.beginPath();ctx.moveTo(x*cell,(y+1)*cell);ctx.lineTo((x+1)*cell,(y+1)*cell);ctx.stroke();}
  }
  for(const c of v.cannons.values()){
    const x=(c.cell%v.width+.5)*cell,y=(Math.floor(c.cell/v.width)+.5)*cell,r=cell*.31;
    ctx.fillStyle='#0d1a24';ctx.strokeStyle=color(c.id);ctx.lineWidth=2;ctx.fillRect(x-r,y-r,2*r,2*r);ctx.strokeRect(x-r,y-r,2*r,2*r);
    ctx.fillStyle=color(c.id);ctx.fillRect(x-2,y-r*.85,4,r*.95);ctx.beginPath();ctx.arc(x,y,Math.max(2,cell*.10),0,Math.PI*2);ctx.fill();
  }
  for(const p of v.pending.values())if(timeNumber(p.deadline)>=visibleTime){
    const ax=(p.from%v.width+.5)*cell,ay=(Math.floor(p.from/v.width)+.5)*cell;
    const bx=(p.to%v.width+.5)*cell,by=(Math.floor(p.to/v.width)+.5)*cell;
    ctx.strokeStyle='#ffd790';ctx.lineWidth=2;ctx.beginPath();ctx.arc((ax+bx)/2,(ay+by)/2,Math.max(3,cell*.1),0,Math.PI*2);ctx.stroke();
  }
  for(const b of v.balls.values()){
    const x=(Number(b.x0)+b.vx*visibleTime)/1024*cell,y=(Number(b.y0)+b.vy*visibleTime)/1024*cell,r=Math.max(2.1,cell*.073);
    ctx.strokeStyle=color(b.owner)+'66';ctx.lineWidth=r;ctx.beginPath();ctx.moveTo(x-b.vx/1024*cell*.12,y-b.vy/1024*cell*.12);ctx.lineTo(x,y);ctx.stroke();
    ctx.shadowBlur=9;ctx.shadowColor=color(b.owner);ctx.fillStyle='#f2fbff';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  }
  for(const e of v.effects){const age=visibleTime-e.t;if(age<0||age>.9)continue;
    const x=e.cell===undefined?e.x*cell:(e.cell%v.width+.5)*cell,y=e.cell===undefined?e.y*cell:(Math.floor(e.cell/v.width)+.5)*cell;
    ctx.globalAlpha=1-age/.9;ctx.strokeStyle=e.kind==='burst'?'#ffdc9c':color(e.owner);ctx.lineWidth=1.8;
    ctx.beginPath();ctx.arc(x,y,cell*(.12+age*.7),0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
  }ctx.restore();
  canvas.setAttribute('aria-label',`Recorded board: ${v.width} by ${v.height} cells, ${v.cannons.size} cannons, ${v.balls.size} balls.`);
}
function frame(now){
  const dt=lastFrame===null?0:Math.min((now-lastFrame)/1000,.25);lastFrame=now;const s=session;
  if(s?.ready&&!s.error&&!paused){
    const current=s.clock.sample(dt*speed/s.recording.tick_seconds);visibleTime=current.playhead;
    while(s.queue.length&&visibleTime>=s.queue[0].segment.end){const q=s.queue.shift();visible=q.player.advance(q.segment.end);s.bytes-=q.segment.bytes;}
    if(s.queue.length)visible=s.queue[0].player.advance(visibleTime);
  }
  void pump(now);draw();if(now-lastHud>100){updateHud();lastHud=now;}requestAnimationFrame(frame);
}
$('pause').addEventListener('click',()=>{paused=!paused;lastFrame=null;updateHud();});
$('restart').addEventListener('click',()=>{if(session)void start(session.recording);});
$('recording').addEventListener('change',()=>{const r=catalog.recordings.find(r=>r.id===$('recording').value);if(r)void start(r);});
$('speed').addEventListener('change',()=>{const n=Number($('speed').value);if([.5,1,2].includes(n))speed=n;});
$('network-pause').addEventListener('change',()=>{deliveryPaused=$('network-pause').checked;updateHud();});
$('retry').addEventListener('click',()=>{const s=session;if(!s){void bootstrap();return;}if(s.busy)return;$('error').hidden=true;if(!s.ready){void start(s.recording);return;}s.error=null;s.nextDue=0;updateHud();});
document.addEventListener('visibilitychange',()=>{lastFrame=null;});
new ResizeObserver(draw).observe(canvas);
async function bootstrap(){
bootError=null;$('error').hidden=true;
try{
  if(!ctx||!globalThis.crypto?.subtle)throw new Error('Canvas and Web Crypto require a supported browser on localhost or HTTPS.');
  catalog=validateIndex(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await readBytes('./recordings/index.json',65536,AbortSignal.timeout(10000)))));
  $('recording').replaceChildren();for(const r of catalog.recordings){const o=document.createElement('option');o.value=r.id;o.textContent=r.title;$('recording').append(o);}
  const requested=new URLSearchParams(location.search).get('recording'),r=catalog.recordings.find(r=>r.id===requested)??catalog.recordings[0];
  $('recording').value=r.id;$('recording').disabled=false;await start(r);
}catch(e){bootError=e;showError(e);updateHud();}
}
await bootstrap();
requestAnimationFrame(frame);
