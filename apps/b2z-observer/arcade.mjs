/** UX-01..10/13. Local declaration and composer; no payment or game update client. */
import {describeTextMemo} from '../../packages/protocol/memo.mjs';
import {parseSendingAccount,paymentDestination,identityStore,accountColor} from './identity.mjs';
import {cannonReference} from './play-reference.mjs';
import {quoteV6,legalMove,legalAdjacentSites} from './action-quote-v6.mjs';
import {createHandoffs,instructionKey,receiptSummary} from './handoff.mjs';
import {experienceStatus} from './experience-status.mjs';
export function formatIcp(e8s){if(typeof e8s!=='bigint'||e8s<0n)throw Error('exact nonnegative e8s required');const d=(e8s%100000000n).toString().padStart(8,'0').replace(/0+$/,'');return `${e8s/100000000n}${d?'.'+d:''} ICP`;}
export const transferMemo=degrees=>describeTextMemo('angle',degrees);
export function createArcade(doc){
 const $=id=>doc.getElementById(id),text=(id,value)=>{if($(id).textContent!==value)$(id).textContent=value;};
 let declaration=null,context=null,store=null,storage,history,world,config,source,destination,revision='',refs=[],id=null,mode='inspect',view=null,degrees='37.5',cell=null,packet=null,quote=null,manual=null,busy=false,pending=null,warning='',status={canPrepare:false,label:'Verifying game'},receipts=[],preferences={},cameraState=null,opener=null,activityKey='',rosterKey='';
 try{storage=globalThis.localStorage;}catch{}
 const selected=()=>refs.find(c=>c.id===id),mine=()=>refs.filter(c=>c.account===declaration?.account);
 const emit=()=>doc.dispatchEvent(new CustomEvent('b2z-overlay'));
 function show(name,title){
  if(view===null)opener=doc.activeElement;view=name;$('workspace').hidden=false;
  for(const n of doc.querySelectorAll('.panel-view'))n.hidden=n.id!==name+'-view';
  text('panel-title',title);emit();
 }
 function persist(){if(!declaration||!$('remember-account').checked)return;const saved=store?.write({...declaration,cannon:id,camera:cameraState});text('storage-note',saved?'':'Using this visit only; device storage is unavailable.');}
 function identityLabel(){text('identity-label',declaration?'Account':'Account');$('identity-color').style.background=declaration?accountColor(declaration.account):'transparent';text('account-name',declaration?.display??declaration?.principal??declaration?.account??'');$('identity-form').hidden=Boolean(declaration);$('account-summary').hidden=!declaration;}
 function clearDraft(){text('roster-note','');if(!packet){warning='';text('copy-feedback','');manual=null;$('manual-copy').hidden=true;}}
 function candidate(){
  if(!world||!config||!destination)return {reason:'Waiting for verified payment instructions.'};
  if(!declaration)return {reason:'Choose your sending account.'};
  if(mode==='inspect')return null;
  const c=selected();if(mode!=='start'&&c?.account!==declaration.account)return {reason:'This cannon is no longer available to your account.'};
  try{
   const m=transferMemo(degrees);const angle=m.text.slice(6);
   const quantity=mode==='start'?1:mode==='move'?1:Number($('ball-quantity').value);
   let q;
   if(world.version===6)q=quoteV6(world,config,declaration.account,{kind:{start:'new',ball:'fire',move:'move'}[mode],cannon:id,angle,quantity,cell});
   else{if(mode==='start'&&mine().length)throw Error('ACCOUNT_ALREADY_HAS_CANNON');if(mode==='move'&&!c.owns(cell))throw Error('ILLEGAL_MOVE');const memo=mode==='move'?describeTextMemo('move',String(cell)):m;q={amount:mode==='start'?config.join_e8s:mode==='move'?config.move_e8s:c.next_ball_e8s,memo:memo.text,memo_bytes:new TextEncoder().encode(memo.text)};if(q.amount===null)throw Error('BALL_CAPACITY');}
   return {account:declaration.account,payer:declaration.display??declaration.principal??declaration.account,network:source.network,backend:source.owner,action:mode,cannon:mode==='start'?null:id,angle:mode==='move'?null:angle,cell,requested:q.requested??quantity,maximum_fill:q.maximum_fill??1,amount:q.amount,memo:q.memo,hex:Array.from(q.memo_bytes,b=>b.toString(16).padStart(2,'0')).join(''),owner:destination.primary,subaccount:String(source.subaccount),recipient:destination.legacy,rules:config.rules_version??world.version,snapshot:revision};
  }catch(error){const reasons={BALL_CAPACITY:'Ball capacity reached.',ILLEGAL_MOVE:'Choose a legal highlighted destination.',NOT_OWNER:'Choose one of your cannons.',NO_ADJACENT_SITE:'No adjacent site is currently available.',NO_ELIGIBLE_SPAWN:'No first site is currently available.',PLAYER_CANNON_CAPACITY:'Your cannon capacity is reached.',CANNON_CAPACITY:'Cannon capacity is reached.',QUANTITY_BOUNDS:'Choose between 1 and 64 balls.',CELL_BOUNDS:'Choose a destination cell.'};return {reason:reasons[error.message]??'Check the heading, quantity and destination.'};}
 }
 function renderPacket(q){
  text('transfer-amount',formatIcp(BigInt(q.amount)));text('payment-owner',q.owner);text('payment-address',q.recipient);text('text-memo',q.memo);text('hex-memo',q.hex);text('paying-account',q.payer??q.account);
 }
 function refresh(){
  $('transfer-controls').disabled=busy||!status.canPrepare||Boolean(warning);
  const c=selected(),own=c?.account===declaration?.account;
  $('join-action').hidden=!world||Boolean(declaration&&mine().length);$('centre-cannon').hidden=!mine().length;text('centre-cannon',mine().length===1?'My cannon':'My cannons');
  $('context-actions').hidden=!own;$('fire-action').hidden=!own;$('move-action').hidden=!own;$('build-action').hidden=!own;text('fire-action',c?.dormant?'Revive':'Fire');
  $('move-action').disabled=Boolean(c?.dormant);$('move-action').title=c?.dormant?'Revive the island before moving.':'';
  text('cannon-life',c?`${own?'Your cannon':'Opponent cannon'} #${c.id} · ${c.dormant?'Dormant':`${c.balls} ball${c.balls===1?'':'s'}`}`:'Cannon no longer present.');text('inspect-note',own&&c?.dormant?'Revive before its on-chain expiry.':own?'Actions prepare instructions for your wallet.':'');
  $('angle-controls').hidden=mode==='move';$('quantity-controls').hidden=mode!=='ball'||world?.version!==6;$('move-controls').hidden=mode!=='move';$('new-controls').hidden=mode!=='start'||!mine().length||world?.version!==6;
  if(view==='action'){
   text('panel-title',mode==='start'?mine().length?'Build cannon':'New cannon':mode==='move'?'Move cannon':c?.dormant?'Revive cannon':'Fire balls');
   quote=candidate();const changed=Boolean(packet&&instructionKey(quote)!==instructionKey(packet));
   $('replace-choice').hidden=!changed;$('prepared-card').hidden=Boolean(!quote||quote.reason||changed);
   if(!$('prepared-card').hidden)renderPacket(packet??quote);
   $('transfer-controls').disabled=busy||!status.canPrepare||Boolean(quote?.reason)||changed||Boolean(warning);
   text('preparation-note',warning||(!status.canPrepare?status.label:quote?.reason??''));
   text('placement-note',mode==='start'?(mine().length?'Choose an adjacent site. One ball included.':'Automatic first site. One ball included.'):mode==='ball'&&Number($('ball-quantity').value)>1?'Capacity may limit fulfilment.':'');
  }
  emit();
 }
 function updateRoster(){
  const key=JSON.stringify([declaration?.account,mine().map(c=>[c.id,c.dormant,c.balls])]);if(key===rosterKey)return;rosterKey=key;
  const nodes=mine().map(c=>{const b=doc.createElement('button');b.textContent=`Cannon #${c.id} · ${c.dormant?'Dormant':`${c.balls} balls`}`;b.onclick=()=>{api.selectCannon(c.id);doc.dispatchEvent(new CustomEvent('b2z-locate'));};return b;});
  $('own-cannons').replaceChildren(...nodes);$('account-cannons').replaceChildren(...nodes.map(b=>{const n=b.cloneNode(true);n.onclick=b.onclick;return n;}));
 }
 function activity(){
  if(!history)return;const key=JSON.stringify([declaration?.account,history.records(),history.cachedReceipts(),receipts],(_,v)=>typeof v==='bigint'?String(v):v);if(key===activityKey)return;activityKey=key;const saved=[];
  for(const r of history.records().filter(r=>r.account===declaration?.account)){
   const entry=doc.createElement('article'),label=doc.createElement('p'),b=doc.createElement('button');label.textContent=`${r.memo} · ${formatIcp(BigInt(r.amount))}${r.state==='unknown'?' · outcome unknown':''}`;entry.append(label);
   if(r.backend===source.owner&&r.network===source.network&&r.owner&&r.recipient&&r.hex){b.textContent='View saved instructions';b.onclick=()=>{mode=r.action;id=r.cannon;cell=r.cell;degrees=r.angle??degrees;packet=r;warning='Saved instructions may no longer apply. Review before using.';$('angle-degrees').value=degrees;$('ball-quantity').value=r.requested??1;$('move-cell').value=cell??'';show('action','Saved instructions');refresh();};entry.append(b);}saved.push(entry);
  }
  if(!saved.length){const p=doc.createElement('p');p.textContent='No saved instructions.';saved.push(p);}$('saved-list').replaceChildren(...saved);
  const outcomes=new Map(history.cachedReceipts().map(r=>[String(r.position),{...r,cached:true}]));for(const r of receipts)outcomes.set(String(r.position),r);
  const entries=[...outcomes.values()].filter(r=>r.account===declaration?.account).slice(-64).reverse().map(r=>{const e=doc.createElement('article');e.textContent=`${receiptSummary(r)}${r.cached?' · cached history':' · verified'}`;const d=doc.createElement('details'),s=doc.createElement('summary'),p=doc.createElement('p');s.textContent='Record';p.textContent=`Ledger ${r.position} · ${formatIcp(BigInt(r.amount))}${r.cached?' · not newly verified':''}`;d.append(s,p);e.append(d);return e;});
  if(!entries.length){const p=doc.createElement('p');p.textContent='No retained outcomes for this account. Missing history does not prove failure.';entries.push(p);}$('receipt-list').replaceChildren(...entries);
 }
 function action(value){
  if(!declaration){pending=value;api.openAccount();return;}
  clearDraft();mode=value;cell=null;$('move-cell').value='';$('new-cell').value='';
  if(value!=='start'&&selected()?.account!==declaration.account){if(mine().length===1)id=mine()[0].id;else{api.openRoster();return;}}
  if(value==='start')$('ball-quantity').value='1';
  if(world?.version===6&&value==='start'){$('new-cell').replaceChildren(new Option('Choose on the board',''),...legalAdjacentSites(world,declaration.account).map(n=>new Option(`Cell ${n}`,n)));}
  show('action','Wallet instructions');refresh();
 }
 $('identity-form').addEventListener('submit',event=>{event.preventDefault();try{const next=parseSendingAccount($('sending-account').value,$('identity-subaccount').value);if(next.account!==declaration?.account){packet=null;warning='';id=null;mode='inspect';}declaration=next;persist();if(!$('remember-account').checked)store?.forget();identityLabel();updateRoster();activity();text('identity-note','');if(pending){const p=pending;pending=null;action(p);}else{show('account','Account');refresh();}}catch(error){text('identity-note',error.message);}});
 $('change-account').onclick=$('payer-change').onclick=()=>{show('account','Sending account');$('identity-form').hidden=false;$('account-summary').hidden=true;$('sending-account').value=declaration?.display??declaration?.principal??declaration?.account??'';$('identity-subaccount').value='';$('sending-account').focus();};
 $('identity-forget').onclick=()=>{store?.forget();declaration=null;id=null;packet=null;warning='';pending=null;mode='inspect';identityLabel();activity();refresh();};
 $('identify-button').onclick=()=>api.openAccount();$('join-action').onclick=()=>action('start');$('fire-action').onclick=()=>action('ball');$('move-action').onclick=()=>action('move');$('build-action').onclick=()=>action('start');
 for(const name of ['angle-degrees','ball-quantity','move-cell','new-cell'])$(name).addEventListener('input',()=>{clearDraft();degrees=$('angle-degrees').value;cell=mode==='move'?$('move-cell').value===''?null:Number($('move-cell').value):mode==='start'?$('new-cell').value===''?null:Number($('new-cell').value):cell;refresh();});
 $('replace-instructions').onclick=()=>{packet=null;warning='';manual=null;$('manual-copy').hidden=true;text('copy-feedback','');refresh();};
 $('keep-instructions').onclick=()=>{if(!packet)return;mode=packet.action;id=packet.cannon;cell=packet.cell;degrees=packet.angle??degrees;$('angle-degrees').value=degrees;$('ball-quantity').value=packet.requested;$('move-cell').value=cell??'';$('new-cell').value=cell??'';refresh();};
 function freeze(q,h){const saved=packet?.id&&instructionKey(packet)===instructionKey(q)?packet:h.freeze(q);if(q.backend===source?.owner&&q.account===declaration?.account)packet=saved;activity();return saved;}
 for(const b of doc.querySelectorAll('[data-copy]'))b.addEventListener('click',async()=>{
  refresh();if($('transfer-controls').disabled)return;const q=packet??quote,h=history,value={amount:formatIcp(BigInt(q.amount)).replace(' ICP',''),owner:q.owner,recipient:q.recipient,text:q.memo,hex:q.hex}[b.dataset.copy];busy=true;refresh();
  try{await navigator.clipboard.writeText(value);freeze(q,h);text('copy-feedback','Copied. Instructions saved; no payment sent.');}
  catch{manual={q,h};$('manual-copy').hidden=false;$('manual-value').value=value;text('copy-feedback','Clipboard unavailable. Copy the exact value below.');$('manual-value').focus();$('manual-value').select();}
  finally{busy=false;refresh();}
 });
 $('manual-handoff').onclick=()=>{if(!manual||instructionKey(manual.q)!==instructionKey(packet??quote)||!status.canPrepare)return;freeze(manual.q,manual.h);manual=null;$('manual-copy').hidden=true;text('copy-feedback','Instructions saved. No payment sent.');refresh();};
 $('close-panel').onclick=()=>api.cancel();
 const api={
  render(w,c,s,root=''){
   const nextContext=`${s.network}:${s.owner}`;
   if(context!==nextContext){const firstContext=context===null;context=nextContext;store=identityStore(s.network,s.owner,storage);declaration=(firstContext&&declaration)||store.read();history=createHandoffs(storage,`B2Z-activity-v1:${context}`);packet=null;warning='';id=null;mode='inspect';try{const raw=storage?.getItem(`B2Z-view-v1:${context}`);preferences=raw&&raw.length<4096?JSON.parse(raw):{};}catch{preferences={};}cameraState=declaration?.camera?.projection==='isometric-1'?declaration.camera:null;id=Number.isSafeInteger(declaration?.cannon)?declaration.cannon:null;identityLabel();}
   world=w;config=c;source=s;revision=root;try{destination=paymentDestination(s);}catch(error){destination=null;status={canPrepare:false,label:'Unable to verify destination'};warning=error.message;}
   refs=cannonReference(w,c);
   if(id!==null&&!refs.some(c=>c.id===id)){id=null;mode='inspect';if(packet)warning='The copied target is no longer present. Saved instructions remain in Account.';else{warning='';text('copy-feedback','');}if(view==='action'||view==='inspect'){show('roster','Choose a cannon');text('roster-note','The selected cannon is no longer present. Choose another.');}}
   updateRoster();activity();refresh();
  },
  status(input){status=input.resolved??experienceStatus({...input,world});if(!destination)status={...status,canPrepare:false};text('arena-note',status.label);text('status-explanation',status.detail||status.label);refresh();return{available:status.canPrepare,label:status.label};},
  action,selectCannon(n){const c=refs.find(c=>c.id===n);if(!c)return false;id=n;mode='inspect';cell=null;clearDraft();persist();show('inspect',`Cannon #${n}`);refresh();return true;},
  cancel(){view=null;mode='inspect';cell=null;pending=null;$('workspace').hidden=true;manual=null;$('manual-copy').hidden=true;if(!packet){warning='';text('copy-feedback','');}emit();(opener?.isConnected?opener:$('board')).focus({preventScroll:true});},
  selectedCannon:()=>id,account:()=>declaration?.account??null,mode:()=>mode,canPay:()=>status.canPrepare,active:()=>view!==null,selected,angle:()=>degrees,
  aimAt(dx,dy){if(mode!=='ball'&&mode!=='start')return;degrees=((Math.atan2(dy,dx)*180/Math.PI+360)%360).toFixed(2);$('angle-degrees').value=degrees;clearDraft();refresh();},
  adjustAngle(delta){degrees=((Number(degrees)+delta+360)%360).toFixed(2);$('angle-degrees').value=degrees;refresh();},
  aim:()=>view==='action'&&['ball','start'].includes(mode)&&selected()?{cannon:selected(),angle:degrees}:null,
  moveSelection(){const c=selected();if(view!=='action')return null;if(world?.version===6&&mode==='start'&&mine().length)return{kind:'new',width:world.width,height:world.height,cells:legalAdjacentSites(world,declaration.account),cell};return mode==='move'&&c?{key:revision+'/'+id,width:world.width,height:world.height,id,cells:[],legal:n=>world.version===6?legalMove(world,declaration.account,id,n):c.owns(n),cell,reference:world}:null;},
  chooseCell(n){const selection=api.moveSelection();if(!(selection?.legal?selection.legal(n):selection?.cells.includes(n))){text('preparation-note','That destination is unavailable.');return false;}cell=n;$(mode==='move'?'move-cell':'new-cell').value=n;clearDraft();refresh();return true;},
  openAccount(){identityLabel();activity();updateRoster();show('account','Account');if(!declaration)$('sending-account').focus();},
  openRoster(){if(mine().length===1){api.selectCannon(mine()[0].id);doc.dispatchEvent(new CustomEvent('b2z-locate'));}else{updateRoster();show('roster','My cannons');}},
  openActivity(){api.openAccount();$('saved-list').scrollIntoView({block:'nearest'});},
  openStatus(){show('status','Game status');},openHelp(){show('help','How to play');},
  receipts(value){receipts=value;history?.rememberReceipts(value,revision);if(view==='account')activity();},
  preferences(value){if(value){preferences={...preferences,...value};delete preferences.paused;try{storage?.setItem(`B2Z-view-v1:${context}`,JSON.stringify(preferences));}catch{}}return preferences;},
  camera(value){if(value){cameraState=value;persist();}return cameraState;},locate:()=>null
 };return api;
}
