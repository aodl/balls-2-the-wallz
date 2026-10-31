/** Presentation only. Inputs are provided only after the existing verifier accepts them. */
import {describeTextMemo} from '../../packages/protocol/memo.mjs';
import {accountIdentifier,canonicalAccount,identityStore} from './identity.mjs';
import {heading} from '../../packages/kernels/b2z/math.mjs';
import {cannonReference} from './play-reference.mjs';
export function formatIcp(e8s){
  if(typeof e8s!=='bigint'||e8s<0n)throw new Error('exact nonnegative e8s required');
  const whole=e8s/100000000n,decimal=(e8s%100000000n).toString().padStart(8,'0').replace(/0+$/,'');
  return `${whole}${decimal?'.'+decimal:''} ICP`;
}
export function transferMemo(degrees){return describeTextMemo('angle',degrees);}
export function createArcade(doc){
  const $=id=>doc.getElementById(id),text=(id,value)=>$(id).textContent=value;
  let declaration=null,store=null,located=null,quoteQueued=false;
  let config=null,source=null,world=null,degrees='37.5',angleValid=true,available=false,prepared=null,stale=false,drag=null;
  const mode=()=>$('action-mode').value;
  const selected=()=>world&&config?cannonReference(world,config).find(c=>String(c.id)===$('selected-cannon').value):null;
  const selectedCell=()=>/^\d+$/.test($('move-cell').value)?Number($('move-cell').value):null;
  function candidate(){
    if(!config||!source||!world)return {reason:'Waiting for authenticated configuration and destination.'};
    const c=selected(),action=mode(),cell=selectedCell();
    if(!declaration)return {reason:'Identify your funding account first. This is not login.'};
    if(action!=='start'&&c?.account!==declaration.account)return {reason:'This cannon belongs to a different funding account.'};
    if(action==='start'&&world.cannons.some(c=>c.account===declaration.account))return {reason:'An existing account fires from its cannon. Additional cannons require the new rules release.'};
    if(action!=='start'&&!c)return {reason:'Choose a selected cannon to inspect.'};
    if(action==='start'&&world.cannons.length>=config.max_cannons)return {reason:'The arena is at cannon capacity.'};
    if(action==='ball'&&c.next_ball_e8s===null)return {reason:'The selected cannon or arena is at ball capacity.'};
    if(action==='move'&&!c.owns(cell))return {reason:'Choose a currently owned destination cell.'};
    if(action!=='move'&&!angleValid)return {reason:'Enter an angle from 0 to 359.99 with up to two decimal places.'};
    const memo=action==='move'?describeTextMemo('move',String(cell)):transferMemo(degrees);
    return {action,cannon:action==='start'?null:c.id,amount:action==='start'?config.join_e8s:action==='ball'?c.next_ball_e8s:config.move_e8s,
      world_key:`${world.version}/${world.width}/${world.height}`,memo:memo.text,hex:memo.blob_hex,owner:source.owner,subaccount:source.subaccount.toString(),recipient:source.recipient};
  }
  const key=c=>JSON.stringify(c,(_,v)=>typeof v==='bigint'?v.toString():v);
  function availability(){
    const current=candidate();
    if(available&&!current.reason&&prepared&&key(current)===key(prepared))stale=false;
    if(available&&!current.reason&&(!prepared||key(current)!==key(prepared))&&!quoteQueued){quoteQueued=true;queueMicrotask(()=>{quoteQueued=false;if(available&&!candidate().reason)$('prepare-transfer').click();});}
    $('prepare-transfer').disabled=!available||Boolean(current.reason);
    $('prepare-transfer').textContent=prepared?'Refresh transfer instructions':'Prepare transfer instructions';
    $('transfer-controls').disabled=!available||!prepared||stale;
    text('preparation-note',!available?'Payment preparation unavailable until live destination, prices and service are verified.':stale?'Quote changed. Checking the latest verified state before copying.':current.reason??(prepared?'Instructions prepared. Later on-chain changes can still affect eligibility.':'Choose an action; exact instructions update automatically.'));
  }
  function clearPreparation(){if(prepared)stale=true;else $('prepared-card').hidden=true;availability();}
  function aim(){
    const memo=transferMemo(degrees),[vx,vy]=heading(memo.command.value),norm=Math.hypot(vx,vy);
    // Draw the actual integer CORDIC velocity, including final quantized heading.
    $('aim-line').setAttribute('x2',String(100+vx/norm*66));$('aim-line').setAttribute('y2',String(100+vy/norm*66));
    $('aim-pad').setAttribute('aria-valuenow',degrees);$('aim-pad').setAttribute('aria-valuetext',`${degrees} degrees clockwise; right is zero`);
    $('aim-pad').dataset.heading=String(memo.command.value);text('aim-preview',memo.text);
    for(const b of doc.querySelectorAll('[data-angle]'))b.setAttribute('aria-pressed',String(Number(b.dataset.angle)===Number(degrees)));
  }
  function setAngle(value){
    try{
      // Numeric input permits precisely 360 as a local wrap. The wire parser never accepts 360.
      const raw=value==='360'?'0':value,memo=transferMemo(raw);
      degrees=memo.text.slice('ANGLE '.length);angleValid=true;$('angle-degrees').setCustomValidity('');
      $('angle-degrees').value=degrees;aim();
    }catch{angleValid=false;$('angle-degrees').setCustomValidity('Enter 0–359.99 degrees, with up to two decimal places.');}
    clearPreparation();
  }
  const pad=$('aim-pad');
  function point(e){
    const r=pad.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;
    if(Math.hypot(x,y)<5)return;
    const centidegrees=Math.round((Math.atan2(y,x)*180/Math.PI+360)%360*100)%36000;
    setAngle((centidegrees/100).toFixed(2));
  }
  pad.addEventListener('pointerdown',e=>{if(!e.isPrimary||e.button!==0)return;drag=e.pointerId;pad.setPointerCapture(drag);pad.focus({preventScroll:true});point(e);e.preventDefault();});
  pad.addEventListener('pointermove',e=>{if(e.pointerId===drag)point(e);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(event,e=>{if(e.pointerId===drag)drag=null;});
  pad.addEventListener('keydown',e=>{
    const delta={ArrowRight:1,ArrowDown:1,ArrowLeft:-1,ArrowUp:-1,PageDown:10,PageUp:-10}[e.key];
    if(delta===undefined&&e.key!=='Home'&&e.key!=='End')return;
    e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?35999:(Math.round(Number(degrees)*100)+Math.round(delta*(e.shiftKey?10:e.altKey ? .01 : 1)*100)+36000)%36000;
    setAngle((n/100).toFixed(2));
  });
  $('angle-degrees').addEventListener('input',()=>setAngle($('angle-degrees').value));
  for(const b of doc.querySelectorAll('[data-angle]'))b.addEventListener('click',()=>setAngle(b.dataset.angle));
  function cells(){
    const c=selected(),prior=$('move-cell').value,placeholder=doc.createElement('option');placeholder.value='';placeholder.textContent='Choose an owned cell';
    $('move-cell').replaceChildren(placeholder);
    if(c)for(const i of c.owned_cells){const o=doc.createElement('option');o.value=String(i);o.textContent=`Cell ${i} · row ${Math.floor(i/world.width)}, column ${i%world.width}`;$('move-cell').append(o);}
    const picked=/^\d+$/.test(prior)?Number(prior):null;
    if(c&&picked!==null&&c.owns(picked)&&![...$('move-cell').options].some(o=>o.value===prior)){
      const o=doc.createElement('option');o.value=prior;o.textContent=`Cell ${prior} · row ${Math.floor(picked/world.width)}, column ${picked%world.width}`;$('move-cell').append(o);
    }
    $('move-cell').value=prior;
  }
  function localMode(){
    $('cannon-choice').hidden=mode()==='start';$('aim-controls').hidden=mode()==='move';$('move-controls').hidden=mode()!=='move';
    cells();clearPreparation();
  }
  $('action-mode').addEventListener('change',localMode);
  $('selected-cannon').addEventListener('change',()=>{cells();clearPreparation();});
  $('move-cell').addEventListener('change',clearPreparation);
  $('prepare-transfer').addEventListener('click',()=>{
    const c=candidate();if(!available||c.reason)return;
    prepared=c;stale=false;$('prepared-card').hidden=false;
    text('prepared-action',({start:'Start a cannon',ball:'Add a ball',move:'Move cannon'})[c.action]);
    text('prepared-cannon',c.cannon===null?'New cannon, identified by your sending account':`Selected cannon #${c.cannon} · selection is local inspection`);
    text('transfer-amount',formatIcp(c.amount));text('payment-owner',c.owner);text('payment-address',c.recipient);
    text('payment-subaccount',c.subaccount==='0'?'Default subaccount · omit, or use 32 zero bytes':`Numeric subaccount ${c.subaccount} · 24 zero bytes then 8-byte big-endian integer`);
    text('text-memo',c.memo);text('hex-memo',c.hex);text('copy-feedback','');availability();
  });
  for(const b of doc.querySelectorAll('[data-copy]'))b.addEventListener('click',async()=>{
    if(!available||!prepared||stale)return;
    if(key(candidate())!==key(prepared)){clearPreparation();return;}
    const value=({recipient:prepared.recipient,owner:prepared.owner,text:prepared.memo,hex:prepared.hex,amount:formatIcp(prepared.amount).replace(' ICP','')})[b.dataset.copy];
    try{await navigator.clipboard.writeText(value);text('copy-feedback','Copied. Paste it into your own wallet. Nothing has been sent.');}
    catch{text('copy-feedback','Copy unavailable. Select and copy the exact value shown.');}
  });
  function persist(){if(declaration)store?.write({...declaration,cannon:$('selected-cannon').value});}
  function identify(){try{const principal=$('identity-principal').value.trim(),account=$('identity-account').value.trim(),sub=$('identity-subaccount').value.trim();declaration={principal:principal||null,subaccount:sub,account:account?canonicalAccount(account):accountIdentifier(principal,sub)};persist();text('identity-note','Declaration saved locally. Only a payment from this account grants authority.');$('identify-dialog').close();if(world)api.render(world,config,source);}catch(e){text('identity-note',e.message);}}
  $('identity-save').addEventListener('click',identify);$('identity-forget').addEventListener('click',()=>{store?.forget();declaration=null;$('selected-cannon').value='';text('identity-label','Identify');clearPreparation();});
  $('existing-player').addEventListener('change',()=>{if($('existing-player').value){$('identity-account').value=$('existing-player').value;$('identity-principal').value='';}});
  $('selected-cannon').addEventListener('change',persist);
  aim();localMode();
  const api={
    render(w,c,s){
      world=w;config=c;source=s;if(!config||!source)return;
      if(!store){let storage;try{storage=globalThis.localStorage;}catch{}store=identityStore(s.network,s.owner,storage);declaration=store.read();}
      text('identity-label',declaration?declaration.account.slice(0,10)+'…':'Identify');
      const people=[...new Set(w.cannons.map(c=>c.account))];$('existing-player').replaceChildren(new Option('Or select an existing player',''),...people.map(a=>new Option(a,a)));
      const known=new Set([...$('selected-cannon').options].map(o=>o.value));
      const mine=w.cannons.filter(c=>c.account===declaration?.account);
      const spawned=mine.find(c=>!known.has(String(c.id)));if(spawned){located=spawned.id;if(mode()==='start'){$('action-mode').value='ball';$('cannon-choice').hidden=false;}}

      text('join-price',formatIcp(config.join_e8s));text('empty-price',formatIcp(config.join_e8s));
      $('players-empty').hidden=w.cannons.length>0;
      const prior=$('selected-cannon').value,placeholder=doc.createElement('option');placeholder.value='';placeholder.textContent='Choose a cannon';
      $('selected-cannon').replaceChildren(placeholder);
      for(const c of mine){const o=doc.createElement('option');o.value=String(c.id);o.textContent=`Cannon #${c.id} · ${c.account.slice(0,10)}…`;$('selected-cannon').append(o);}
      $('selected-cannon').value=mine.some(c=>String(c.id)===prior)?prior:mine.some(c=>String(c.id)===declaration?.cannon)?declaration.cannon:mine.length?String(mine[0].id):'';persist();cells();
      // Requote from the new verified revision; copying independently revalidates it.
      if(prepared&&key(candidate())!==key(prepared))stale=true;availability();
    },
    status({phase,live,verified,fresh,healthy,paused,idle=false,pace=null,transitioning=false}){
      const wasAvailable=available;available=Boolean(config&&source&&live&&verified&&fresh&&healthy&&phase!=='ERROR');
      if(wasAvailable&&!available&&prepared)stale=true;availability();
      const protectedMode=pace?.admission_open===false;
      const reduced=pace&&['Cruise','Economy','Steady','Conserve','Survival','Lifeline'].includes(pace.mode);
      const label=phase==='ERROR'||!verified?'Disconnected':!live?'Verified replay':transitioning?'Catching up':protectedMode?'Reserve protection':!fresh||!healthy?'Disconnected':paused?'Catching up':idle?'Waiting for players':['STALLED','BUFFERING','DEGRADED_BUFFER'].includes(phase)?'Catching up':reduced?'Reduced speed':'Live';
      text('live-status',label);$('live-status').dataset.verified=String(['Live','Cruise','Economy','Steady','Conserve','Survival','Lifeline','Waiting for players','Reduced speed'].includes(label));
      text('payment-health',transitioning?'World transition in progress. Prepare fresh instructions after it completes.':available?'Verified address and prices. Prepare a transfer below.':phase==='ERROR'?'Verification failed. Do not send a payment.':protectedMode?'Reserve protection is active. Funding recovery continues; wait before preparing a new payment.':!healthy&&verified?'Gameplay paused or service unavailable. Wait before purchasing.':'Checking current prices and live service…');
      const actual=pace?.supported_milli??pace?.nominal_milli;
      text('arena-note',transitioning?'World transition · waiting for verified new world':protectedMode?'Gameplay paused to conserve cycles':idle?'Waiting for players · Index polling continues':pace?.performance_limited?'Performance slowdown':reduced?'Reduced speed to conserve cycles':pace?'Live':label);
    },
    action(value){$('action-mode').value=value;localMode();},
    account(){return declaration?.account??null;},
    locate(visible){if(located!==null&&visible?.cannons.has(located)){const id=located;located=null;return id;}return null;},
    selectedCannon(){return selected()?.id??null;},
    selectCannon(id){if(!world?.cannons.some(c=>c.id===id&&c.account===declaration?.account)){text('preparation-note','Opponent cannon: inspection only. Identify your own funding account to act.');return false;}$('selected-cannon').value=String(id);$('action-mode').value='ball';localMode();return true;},
    moveSelection(){const c=selected();return mode()==='move'&&c&&world?{width:world.width,height:world.height,id:c.id,cells:c.owned_cells,cell:selectedCell()}:null;},
    chooseCell(cell){const c=selected();if(mode()==='move'&&c?.owns(cell)){if(![...$('move-cell').options].some(o=>o.value===String(cell))){const o=doc.createElement('option');o.value=String(cell);o.textContent=`Cell ${cell} · row ${Math.floor(cell/world.width)}, column ${cell%world.width}`;$('move-cell').append(o);}$('move-cell').value=String(cell);clearPreparation();return true;}return false;}
  };return api;
}
