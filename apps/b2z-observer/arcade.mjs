/** Read-only player workspace. Ledger transactions remain the only command authority. */
import {describeTextMemo} from '../../packages/protocol/memo.mjs';
import {accountIdentifier,canonicalAccount,identityStore,accountColor} from './identity.mjs';
import {heading} from '../../packages/kernels/b2z/math.mjs';
import {cannonReference} from './play-reference.mjs';
import {quoteV6,legalMove,legalAdjacentSites} from './action-quote-v6.mjs';
import {createHandoffs,instructionKey,receiptSummary} from './handoff.mjs';
export function formatIcp(e8s){if(typeof e8s!=='bigint'||e8s<0n)throw Error('exact nonnegative e8s required');const d=(e8s%100000000n).toString().padStart(8,'0').replace(/0+$/,'');return `${e8s/100000000n}${d?'.'+d:''} ICP`;}
export const transferMemo=degrees=>describeTextMemo('angle',degrees);
export function createArcade(doc){
 const $=id=>doc.getElementById(id),text=(id,v)=>{if($(id).textContent!==v)$(id).textContent=v;};
 let declaration=null,store=null,storage,context=null,history=null,world=null,config=null,source=null,refs=[],id=null,mode='inspect',cardOpen=false,degrees='37.5',angleValid=true,cell=null,available=false,quote=null,packet=null,pending=null,receipts=[],revision='',needsReview=false,restoreCamera=null,manualPacket=null,activityKey=null,rosterKey=null,preferences=null,missingSelection=false,copyBusy=false;
 const indexEdits=new Map();
 try{storage=globalThis.localStorage;}catch{}
 const selected=()=>refs.find(c=>c.id===id),mine=()=>refs.filter(c=>c.account===declaration?.account);
 function persist(){if(!declaration||!$('remember-account').checked)return;const ok=store?.write({...declaration,cannon:id,camera:restoreCamera});if(ok===false)text('identity-note','Preferences work for this visit; device storage is unavailable.');}
 function readIdentity(){const principal=$('identity-principal').value.trim(),subaccount=$('identity-subaccount').value.trim();return $('identity-mode').value==='account'?{principal:null,subaccount:'',account:canonicalAccount($('identity-account').value.trim())}:{principal,subaccount,account:accountIdentifier(principal,subaccount)};}
 function previewIdentity(){try{const d=readIdentity(),n=refs.filter(c=>c.account===d.account).length;text('identity-preview',`${d.account} · ${world?`${n} cannon${n===1?'':'s'} currently found`:'Current state unavailable'}`);$('identity-preview').style.borderColor=accountColor(d.account);}catch(e){text('identity-preview',e.message);}}
 $('identity-mode').addEventListener('change',()=>{$('principal-input').hidden=$('identity-mode').value!=='principal';$('account-input').hidden=$('identity-mode').value!=='account';previewIdentity();});
 for(const n of ['identity-principal','identity-subaccount','identity-account'])$(n).addEventListener('input',previewIdentity);
 function identityChanged(){text('identity-label',declaration?declaration.account.slice(0,8)+'…':'Identify');$('identify-button').setAttribute('aria-label',declaration?'Change identified account':'Identify');$('identity-color').style.background=declaration?accountColor(declaration.account):'transparent';}
 $('identity-save').addEventListener('click',()=>{try{const next=readIdentity();if(next.account!==declaration?.account){packet=null;id=null;cell=null;needsReview=false;mode='inspect';clearDraftFeedback();}declaration=next;id=mine()[0]?.id??null;persist();if(!$('remember-account').checked)store?.forget();identityChanged();$('identify-dialog').close();roster();if(pending){const action=pending;pending=null;api.action(action);}else refresh();}catch(e){text('identity-note',e.message);}});
 $('identity-forget').addEventListener('click',()=>{store?.forget();declaration=null;id=null;packet=null;mode='inspect';pending=null;restoreCamera=null;clearDraftFeedback();identityChanged();refresh();text('identity-note','Account preference forgotten. On-chain ownership and processing are unchanged.');});
 // Draft feedback expires with its action; frozen instructions and Activity do not.
 function clearDraftFeedback(){
  missingSelection=false;
  if(!packet){needsReview=false;text('copy-feedback','');manualPacket=null;$('manual-copy').hidden=true;}
  roster();
 }
 function candidate(){
  if(mode==='inspect')return null;
  if(!world||!config||!source)return {reason:'Waiting for authenticated configuration and destination.'};
  if(!declaration)return {reason:'Identify the account you will pay from.'};
  const c=selected();if(mode!=='start'&&c?.account!==declaration.account)return {reason:'Select one of your own cannons.'};
  if(mode!=='move'&&!angleValid)return {reason:'Enter 0–359.99 degrees with up to two decimal places.'};
  try{
   let q;if(world.version===6){if(mode==='start'&&mine().length&&cell===null)return {reason:'Choose a highlighted adjacent site on the board, or use the site list.'};q=quoteV6(world,config,declaration.account,{kind:{start:'new',ball:'fire',move:'move'}[mode],cannon:id,angle:degrees,quantity:mode==='move'?1:Number($('ball-quantity').value),cell});}
   else {if(mode==='start'&&mine().length)throw Error('Account already has a cannon');if(mode==='move'&&!c.owns(cell))throw Error('Choose an owned destination');const m=mode==='move'?describeTextMemo('move',String(cell)):transferMemo(degrees);q={amount:mode==='start'?config.join_e8s:mode==='move'?config.move_e8s:c.next_ball_e8s,memo:m.text,memo_bytes:Uint8Array.from(m.blob_hex.match(/../g),x=>parseInt(x,16))};if(q.amount===null)throw Error('Ball capacity');}
   return {account:declaration.account,network:source.network,backend:source.owner,action:mode,cannon:mode==='start'?null:id,angle:mode==='move'?null:degrees,cell,requested:q.requested??1,maximum_fill:q.maximum_fill??1,amount:q.amount,memo:q.memo,hex:Array.from(q.memo_bytes,b=>b.toString(16).padStart(2,'0')).join(''),owner:source.owner,subaccount:String(source.subaccount),recipient:source.recipient,rules:config.rules_version??world.version,snapshot:revision};
  }catch(e){return {reason:`Cannot prepare: ${e.message.replaceAll('_',' ').toLowerCase()}. Payment processing rechecks eligibility.`};}
 }
 function roster(){
  const key=JSON.stringify([declaration?.account,missingSelection,mine().map(c=>[c.id,c.dormant,c.balls])]);if(key===rosterKey)return;rosterKey=key;
  text('roster-note',missingSelection?'The previous cannon is no longer present. Choose another own cannon, check account or start a cannon.':!declaration?'Identify to find your cannons.':!world?'Current state unavailable.':mine().length?`${mine().length} cannons currently found.`:'No cannon currently found. Check account or start a cannon.');
  $('own-cannons').replaceChildren(...mine().map(c=>{const b=doc.createElement('button');b.textContent=`#${c.id} · ${c.dormant?'Dormant':'Active'} · island ${c.balls} friendly balls`;b.onclick=()=>{api.selectCannon(c.id);$('cannon-roster').hidden=true;doc.dispatchEvent(new CustomEvent('b2z-locate'));};return b;}));
 }
 function activity(){
  const key=JSON.stringify([declaration?.account,history?.records(),history?.cachedReceipts(),receipts],(_,v)=>typeof v==='bigint'?String(v):v);if(key===activityKey)return;activityKey=key;const focused=doc.activeElement?.dataset.intent,caret=doc.activeElement?.selectionStart,scroll=$('activity-drawer').scrollTop;
  const rows=[];for(const r of history?.records().filter(r=>r.account===declaration?.account)??[]){const entry=doc.createElement('article'),title=doc.createElement('strong'),p=doc.createElement('p');title.textContent=`${r.memo} · ${formatIcp(BigInt(r.amount))}`;p.textContent=`${r.state==='reported'?'Still checking this payment. Do not send it again.':'Instructions copied — complete payment in your wallet.'} ${new Date(r.prepared_at).toLocaleString()}. Outcome not independently associated; public receipts do not include original memo bytes.`;entry.append(title,p);if(!r.index){const l=doc.createElement('label'),input=doc.createElement('input'),b=doc.createElement('button');l.textContent='Optional Ledger transaction index';input.inputMode='numeric';input.dataset.intent=r.id;input.value=indexEdits.get(r.id)??'';input.oninput=()=>indexEdits.set(r.id,input.value);input.setAttribute('aria-label',l.textContent);l.append(input);b.textContent="I've sent this";b.onclick=()=>{try{history.sent(r.id,input.value.trim());activity();}catch(e){p.textContent=e.message;}};entry.append(l,b);}rows.push(entry);}
  const outcomes=new Map((history?.cachedReceipts()??[]).map(r=>[String(r.position),{...r,cached:true}]));for(const r of receipts)outcomes.set(String(r.position),r);
  for(const r of [...outcomes.values()].filter(r=>r.account===declaration?.account).slice(-64).reverse()){const e=doc.createElement('article');e.textContent=`${r.cached?'Historical cached receipt · not newly verified':'Verified Ledger transaction'} ${r.position} · ${receiptSummary(r,n=>formatIcp(BigInt(n)))}. ${formatIcp(BigInt(r.amount))}. Compare this public outcome to your wallet record; it is not automatically matched to a local instruction.`;if(refs.some(c=>c.id===r.cannon&&c.account===declaration?.account)){const locate=doc.createElement('button');locate.textContent=`Locate cannon #${r.cannon}`;locate.onclick=()=>{api.selectCannon(r.cannon);$('activity-drawer').hidden=true;doc.dispatchEvent(new CustomEvent('b2z-locate'));};e.append(locate);}rows.push(e);}
  if(!rows.length){const p=doc.createElement('p');p.textContent=declaration?'No local instructions or currently retained receipts for this account. Missing history is not proof of non-payment.':'Identify an account to view its Activity.';rows.push(p);}$('activity-list').replaceChildren(...rows);$('activity-drawer').scrollTop=scroll;if(focused){const input=[...$('activity-list').querySelectorAll('input')].find(n=>n.dataset.intent===focused);if(input){input.focus({preventScroll:true});input.setSelectionRange(caret,caret);}}
 }
 function displayQuote(q){
  $('prepared-card').hidden=!q||Boolean(q.reason);if(!q||q.reason)return;
  text('transfer-amount',formatIcp(BigInt(q.amount)));text('text-memo',q.memo);text('hex-memo',q.hex);text('payment-owner',q.owner);text('payment-address',q.recipient);text('paying-account',q.account);text('payment-subaccount',`Numeric subaccount ${q.subaccount}. Use 24 zero bytes followed by its 8-byte big-endian integer, or omit a default zero subaccount.`);
 }
 function refresh(){
  const c=selected(),active=cardOpen&&mode!=='inspect';$('action-card').hidden=!cardOpen;$('action-inputs').hidden=!active;$('angle-controls').hidden=mode==='move';$('quantity-controls').hidden=mode==='move'||world?.version!==6;$('move-controls').hidden=mode!=='move';$('new-controls').hidden=world?.version!==6||mode!=='start'||!mine().length;
  text('action-title',`${mode==='inspect'?'Inspect':mode==='start'?'New cannon':mode==='move'?'Move':c?.dormant?'Revive island':'Fire'}${mode!=='start'&&c?` · Cannon #${c.id}`:''}`);
  text('cannon-life',c?`${c.account===declaration?.account?'Your cannon':'Opponent · inspection only'} · ${c.dormant?'Dormant · paid Fire revives this island':'Active'} · ${c.balls} friendly island balls${c.dormant?' · expiry is determined on-chain':''}`:'');
  text('placement-note',mode==='start'?world?.version===6&&mine().length?'Choose a legal adjacent site. Ghosts are previews; the cannon appears only after a verified outcome.':config?.rules_version===7?'Automatic placement preview: deterministic eligible 3×3 patch farthest from existing cannons. The processed payment decides the final site. Quantity includes the cannon’s first ball.':'Automatic placement preview: deterministic placement under the authenticated rules; no exact spawn cell is promised.':mode==='move'?'Choose a legal cell on the board or enter its number. A ghost changes nothing on-chain.':'');
  quote=candidate();const changed=packet&&instructionKey(quote)!==instructionKey(packet);$('replace-choice').hidden=!active||!changed;displayQuote(active&&!changed?(packet??quote):null);
  $('transfer-controls').disabled=copyBusy||!active||!available||Boolean(quote?.reason)||Boolean(changed)||needsReview;
  text('handoff-state',packet?'Instructions copied — complete payment in your wallet':'Preview — no payment sent');
  text('preparation-note',!active?'':!available?'Payment processing status is unavailable. Check again before sending.':needsReview?'Verified state changed. Review and replace instructions before copying again.':quote?.reason??(packet?'These are frozen local instructions, not a reservation.':'Exact quote from the latest confirmed state.'));
  $('reported-sent').hidden=!packet;$('manual-handoff').disabled=$('transfer-controls').disabled;
  for(const [name,value]of[['fire-action','ball'],['move-action','move'],['join-action','start']])$(name).setAttribute('aria-pressed',String(mode===value));
  $('fire-action').querySelector('small').textContent=c?.dormant?'Revive':'Fire';
  doc.dispatchEvent(new CustomEvent('b2z-overlay'));
 }
 function edit(){clearDraftFeedback();if(mode==='move')cell=$('move-cell').value===''?null:Number($('move-cell').value);if(mode==='start')cell=$('new-cell').value===''?null:Number($('new-cell').value);refresh();}
 function setAngle(value){if(history)clearDraftFeedback();try{const m=transferMemo(value==='360'?'0':value);degrees=m.text.slice(6);angleValid=true;$('angle-degrees').setCustomValidity('');const [vx,vy]=heading(m.command.value,world?.version>=5?32000:1024),norm=Math.hypot(vx,vy);for(const [node,x,y]of[['aim-line','x2','y2'],['aim-handle','cx','cy']]){$(node).setAttribute(x,String(100+vx/norm*64));$(node).setAttribute(y,String(100+vy/norm*64));}$('aim-pad').setAttribute('aria-valuenow',degrees);$('aim-pad').setAttribute('aria-valuetext',`${degrees} degrees clockwise; east is zero`);}catch{angleValid=false;$('angle-degrees').setCustomValidity('Use 0–359.99, at most two decimal places.');}refresh();}
 $('angle-degrees').addEventListener('input',()=>setAngle($('angle-degrees').value));for(const n of ['ball-quantity','move-cell','new-cell'])$(n).addEventListener('input',edit);
 $('replace-instructions').onclick=()=>{packet=null;clearDraftFeedback();text('copy-feedback','Previous instructions remain in Activity. A new transfer is a new command.');refresh();};
 $('keep-instructions').onclick=()=>{if(!packet)return;mode=packet.action;id=packet.cannon;cell=packet.cell;degrees=packet.angle??degrees;$('angle-degrees').value=degrees;$('ball-quantity').value=packet.requested;$('move-cell').value=cell??'';$('new-cell').value=cell??'';setAngle(degrees);};
 function freeze(value){if(!packet){const saved=history.freeze(value);if(declaration?.account===value.account){packet=saved;needsReview=instructionKey(candidate())!==instructionKey(packet);}activity();}refresh();}
 for(const b of doc.querySelectorAll('[data-copy]'))b.addEventListener('click',async()=>{refresh();if($('transfer-controls').disabled)return;const q=packet??quote,value=({recipient:q.recipient,owner:q.owner,text:q.memo,hex:q.hex,amount:formatIcp(BigInt(q.amount)).replace(' ICP','')})[b.dataset.copy];copyBusy=true;refresh();try{await globalThis.navigator.clipboard.writeText(value);freeze(q);text('copy-feedback',`Copied. Instructions for ${q.account.slice(0,8)}… saved in Activity. Copying sends nothing. Complete payment in your external wallet.`);}catch{manualPacket=q;$('manual-copy').hidden=false;$('manual-value').value=value;text('copy-feedback','Clipboard unavailable. Select the exact value, then use these instructions manually.');$('manual-value').focus();$('manual-value').select();}finally{copyBusy=false;refresh();}});
 $('manual-handoff').onclick=()=>{refresh();if($('transfer-controls').disabled||instructionKey(manualPacket)!==instructionKey(packet??quote))return;freeze(manualPacket);$('manual-copy').hidden=true;text('copy-feedback','Manual handoff saved. No payment has been sent by B2Z.');};
 $('reported-sent').onclick=()=>{history.sent(packet.id);activity();text('copy-feedback','Still checking this payment. Do not send it again.');api.openActivity();};
 $('activity-button').onclick=()=>api.openActivity();$('close-activity').onclick=()=>{$('activity-drawer').hidden=true;$('activity-button').setAttribute('aria-expanded','false');$('activity-button').focus();};
 $('close-roster').onclick=()=>{$('cannon-roster').hidden=true;$('centre-cannon').focus();};
 $('close-action').onclick=()=>api.cancel();
 setAngle(degrees);
 const api={
  render(w,c,s,snapshotRef=''){const prior=world;world=w;config=c;source=s;revision=snapshotRef||`${c.rules_version}/${w.playability?.elapsed_ns??w.time}`;refs=cannonReference(w,c);
   if(!context){context=`${s.network}:${s.owner}`;store=identityStore(s.network,s.owner,storage);declaration=store.read();history=createHandoffs(storage,`B2Z-activity-v1:${context}`);try{preferences=JSON.parse(storage?.getItem(`B2Z-view-v1:${context}`))??{};}catch{preferences={};}id=declaration?.cannon===undefined?null:Number(declaration.cannon);restoreCamera=declaration?.camera??null;identityChanged();}
   if(id!==null&&!refs.some(c=>c.id===id)){id=null;missingSelection=true;cardOpen=false;mode='inspect';needsReview=Boolean(packet);text('copy-feedback','The selected cannon is no longer present. Its instructions remain in Activity.');text('roster-note','The previous cannon is no longer present. Choose another own cannon, check account or start a cannon.');$('cannon-roster').hidden=false;}
   if(id===null&&declaration&&!prior)id=mine()[0]?.id??null;
   if(packet&&instructionKey(candidate())!==instructionKey(packet))needsReview=true;
   if(w.version===6&&mode==='start'&&mine().length){const old=$('new-cell').value,sites=legalAdjacentSites(w,declaration.account);$('new-cell').replaceChildren(new Option('Choose a legal adjacent site',''),...sites.map(n=>new Option(`Cell ${n}`,String(n))));$('new-cell').value=old;}
   text('first-placement-policy',c.rules_version===7?'First cannon: automatic deterministic eligible 3×3 entry farthest from existing cannons.':'First cannon: deterministic placement under the authenticated rules.');roster();refresh();activity();},
  status({phase,live,verified,fresh,healthy,paused,idle=false,pace,transitioning=false,operational,operationalFresh=false}){
   available=Boolean(config&&source&&live&&verified&&fresh&&healthy&&!transitioning&&pace?.admission_open!==false);let label;
   if(phase==='ERROR')label='Verification failed. Payment preparation is disabled.';else if(transitioning)label='Rules transition in progress. Waiting for verified state.';else if(!verified)label='Verifying the on-chain arena…';else if(operational&&(!operational.source.binding_checked||operational.source.last_error.length||operational.run.last_error.length))label='Payment processing error. Check again before sending.';else if(live&&(!fresh||!operationalFresh))label='Payment processing status is unavailable. Check again before sending.';else if(operational&&!operational.run.running)label='Gameplay paused by the operator.';else if(pace?.admission_open===false)label='Gameplay paused to conserve cycles.';else if(phase==='DEGRADED_BUFFER')label='Catching up · network delivery is delayed.';else if(pace?.mode==='Trickle'&&!idle)label=paused?'Animation paused on this device · gameplay progressing very slowly.':'Gameplay progressing very slowly · 1 tick per 100 seconds.';else if(idle)label=world?.cannons.length?'Waiting for island revival.':'Waiting for players.';else if(paused)label='Animation paused on this device.';else if(['BUFFERING','STALLED','DEGRADED_BUFFER'].includes(phase))label='Catching up';else if(pace&&pace.mode!=='Normal')label='Reduced speed to conserve cycles.';else label=live?'Live · verified on-chain arena':'Verified recording · exploration only';
   text('arena-note',label);text('live-status',label);text('payment-health',label);refresh();return {available,label};
  },
  action(value){cardOpen=true;clearDraftFeedback();if(!declaration){pending=value;doc.dispatchEvent(new CustomEvent('b2z-identify'));return;}if(mode===value){refresh();return;}mode=value;cell=null;$('move-cell').value='';$('new-cell').value='';if(value!=='start'&&selected()?.account!==declaration.account)id=mine()[0]?.id??null;doc.dispatchEvent(new CustomEvent('b2z-plan'));refresh();if(value!=='start'&&id===null){roster();$('cannon-roster').hidden=false;}},
  selectCannon(n){const c=refs.find(c=>c.id===n);if(!c)return false;cardOpen=true;id=n;cell=null;clearDraftFeedback();if(c.account!==declaration?.account)mode='inspect';persist();refresh();return true;},
  cancel(){cardOpen=false;mode='inspect';packet=null;clearDraftFeedback();$('action-card').hidden=true;$('aim-pad').setAttribute('hidden','');text('copy-feedback','');$('board').focus();},
  selectedCannon:()=>id,account:()=>declaration?.account??null,mode:()=>mode,canPay:()=>available,active:()=>!$('action-card').hidden,selected,angle:()=>degrees,
  aimAt(x,y){const a=(Math.round((Math.atan2(y,x)*180/Math.PI+360)%360*100)%36000/100).toFixed(2);$('angle-degrees').value=a;setAngle(a);},
  adjustAngle(delta){const a=((Number(degrees)+delta+360)%360).toFixed(2);$('angle-degrees').value=a;setAngle(a);},
  moveSelection(){const c=selected();if(world?.version===6&&mode==='start'&&mine().length)return {kind:'new',width:world.width,height:world.height,cells:legalAdjacentSites(world,declaration.account),cell};return mode==='move'&&c?{width:world.width,height:world.height,id,cells:c.owned_cells.filter(n=>world.version!==6||legalMove(world,declaration.account,id,n)),cell,reference:world}:null;},
  chooseCell(n){const c=selected();if(world?.version===6&&mode==='start'&&mine().length&&legalAdjacentSites(world,declaration.account).includes(n)){cell=n;$('new-cell').value=n;refresh();return true;}if(mode==='move'&&c&&(world.version===6?legalMove(world,declaration.account,id,n):c.owns(n))){cell=n;$('move-cell').value=n;refresh();return true;}text('preparation-note','That cell is not a legal destination. Your preview has not changed.');return false;},
  cancelIdentify(){pending=null;},
  openRoster(){roster();$('cannon-roster').hidden=false;$('activity-drawer').hidden=true;},
  openActivity(){activity();$('activity-drawer').hidden=false;$('cannon-roster').hidden=true;$('activity-button').setAttribute('aria-expanded','true');},
  receipts(value){receipts=value;history?.rememberReceipts(value,revision);activity();},
  preferences(value){if(!preferences)return null;if(value){preferences={...preferences,...value};try{storage?.setItem(`B2Z-view-v1:${context}`,JSON.stringify(preferences));}catch{}}return preferences;},
  camera(value){if(value){restoreCamera=value;api.preferences({camera:value});persist();}return preferences?.camera??restoreCamera;},
  locate:()=>null
 };return api;
}
