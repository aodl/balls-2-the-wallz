/** Presentation only. Inputs are provided only after the existing verifier accepts them. */
import {describeMemo} from '../../packages/protocol/memo.mjs';
export function formatIcp(e8s){
  if(typeof e8s!=='bigint'||e8s<0n)throw new Error('exact nonnegative e8s required');
  const whole=e8s/100000000n,decimal=(e8s%100000000n).toString().padStart(8,'0').replace(/0+$/,'');
  return `${whole}${decimal?'.'+decimal:''} ICP`;
}
export function transferMemo(angle){return describeMemo({kind:'angle',value:angle});}
export function createArcade(doc){
  const $=id=>doc.getElementById(id);let config=null,source=null,world=null,angle=0,available=false;
  const text=(id,value)=>$(id).textContent=value;
  function memos(){const memo=transferMemo(angle);text('numeric-memo',memo.legacy_nat64_decimal);text('hex-memo',memo.blob_hex);}
  async function copy(value){
    if(!available||!value)return;
    try{await navigator.clipboard.writeText(value);text('copy-feedback','Copied. Paste it into your own wallet. Nothing has been sent.');}
    catch{text('copy-feedback','Copy unavailable. Select and copy the exact value shown.');}
  }
  for(const b of doc.querySelectorAll('[data-angle]'))b.addEventListener('click',()=>{
    angle=Number(b.dataset.angle);for(const x of doc.querySelectorAll('[data-angle]'))x.setAttribute('aria-pressed',String(x===b));memos();
  });
  for(const b of doc.querySelectorAll('[data-copy]'))b.addEventListener('click',()=>{
    const memo=transferMemo(angle);void copy(b.dataset.copy==='recipient'?source?.recipient:b.dataset.copy==='numeric'?memo.legacy_nat64_decimal:memo.blob_hex);
  });
  function move(){
    const cannon=world?.cannons.find(c=>String(c.id)===$('selected-cannon').value);
    const n=$('move-cell').value,valid=cannon&&n!==''&&world.cells[Number(n)]===cannon.id;
    text('move-memo',valid?describeMemo({kind:'move',value:Number(n)}).legacy_nat64_decimal:'Select an owned cell');
    $('copy-move').disabled=!available||!valid;
  }
  function cells(){
    const cannon=world?.cannons.find(c=>String(c.id)===$('selected-cannon').value),prior=$('move-cell').value;
    const placeholder=doc.createElement('option');placeholder.value='';placeholder.textContent='Choose an owned cell';$('move-cell').replaceChildren(placeholder);
    if(cannon)for(let i=0;i<world.cells.length;i++)if(world.cells[i]===cannon.id){const o=doc.createElement('option');o.value=String(i);o.textContent=`Cell ${i} · row ${Math.floor(i/world.width)}, column ${i%world.width}`;$('move-cell').append(o);}
    $('move-cell').value=prior;move();
  }
  $('selected-cannon').addEventListener('change',cells);$('move-cell').addEventListener('change',move);$('copy-move').addEventListener('click',()=>void copy($('move-memo').textContent));
  return {
    render(w,c,s){
      world=w;config=c;source=s;
      if(!config||!source)return;
      text('join-price',formatIcp(config.join_e8s));text('transfer-amount',formatIcp(config.join_e8s));text('payment-address',source.recipient);text('move-price',formatIcp(config.move_e8s));memos();
      $('players-empty').hidden=w.cannons.length>0;
      const selected=$('selected-cannon').value,placeholder=doc.createElement('option');placeholder.value='';placeholder.textContent='Choose a cannon';$('selected-cannon').replaceChildren(placeholder);
      for(const c of w.cannons){const o=doc.createElement('option');o.value=String(c.id);o.textContent=`Cannon #${c.id} · ${c.account.slice(0,10)}…`;$('selected-cannon').append(o);}
      $('selected-cannon').value=selected;cells();
    },
    status({phase,live,verified,fresh,healthy,paused}){
      available=Boolean(config&&source&&live&&verified&&fresh&&healthy&&phase!=='ERROR');
      $('transfer-controls').disabled=!available;$('selected-cannon').disabled=!available;$('move-cell').disabled=!available;move();
      const label=phase==='ERROR'?'Connection error':!verified?'Waiting for verified state':!live?'Verified replay · not live':!fresh?'Temporarily behind':!healthy?'Checking live service':paused?'Playback paused':['STALLED','BUFFERING'].includes(phase)?'Temporarily behind':'Live and verified';
      text('live-status',label);$('live-status').dataset.verified=String(label==='Live and verified');
      text('payment-health',available?'Verified address and prices. Prepare your transfer below.':phase==='ERROR'?'Verification failed. Do not send a payment.':!healthy&&verified?'Gameplay paused or service unavailable. Wait before purchasing.':'Checking current prices and live service…');
      text('arena-note',label==='Live and verified'?'Authoritative game · verified playback':label==='Temporarily behind'?'Waiting for verified game data. No motion is invented.':label);
    }
  };
}
