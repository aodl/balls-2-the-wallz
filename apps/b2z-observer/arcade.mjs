/** UX-01..10/13. Local declaration and composer; no payment or game update client. */
import {describeTextMemo} from '../../packages/protocol/memo.mjs';
import {parseSendingAccount,paymentDestination,identityStore,accountColor} from './identity.mjs';
import {cannonReference} from './play-reference.mjs';
import {quoteV6,prepareQuoteV6,legalMoveDestination,legalAdjacentSites} from './action-quote-v6.mjs';
import {createHandoffs,instructionKey,receiptSummary} from './handoff.mjs';
import {encodedHeading,displayHeading,worldToScreen} from './headings.mjs';
import {experienceStatus} from './experience-status.mjs';
export function formatIcp(e8s){if(typeof e8s!=='bigint'||e8s<0n)throw Error('exact nonnegative e8s required');const d=(e8s%100000000n).toString().padStart(8,'0').replace(/0+$/,'');return `${e8s/100000000n}${d?'.'+d:''} ICP`;}
export const transferMemo=degrees=>describeTextMemo('angle',degrees);
/** UX-08/10: describe the displayed packet, including a retained copied packet. */
export function paymentWarning(q){return Number.isSafeInteger(q?.cell)&&q.cell>=0&&['move','start'].includes(q.action)?'If another player claims your chosen tile before your action is processed, the action fails and your ICP remains spent.':'Payments and unused ICP are kept; no automatic refunds.';}
export function createArcade(doc){
 const $=id=>doc.getElementById(id),text=(id,value)=>{if($(id).textContent!==value)$(id).textContent=value;};
 let intentVersion=0;
 let sitesWorld=null,sitesConfig=null,sitesAccount=null,sitesRevision=null,eligibleSites=[];
 let declaration=null,context=null,store=null,storage,history,world,config,source,destination,revision='',refs=[],id=null,mode='inspect',view=null,degrees='0',worldAngle='225',quantity=1,siteKey='',cell=null,packet=null,keepPrevious=false,quote=null,manual=null,busy=false,pending=null,warning='',status={canPrepare:false,label:'Verifying game'},receipts=[],preferences={},cameraState=null,opener=null,planningBehind=false,activityKey='',rosterKey='',waitingSince=null;
 try{storage=globalThis.localStorage;}catch{}
 const selected=()=>refs.find(c=>c.id===id),mine=()=>refs.filter(c=>c.account===declaration?.account);
 let overlayKey='';const drafts=new Map();const draftKey=value=>`${context}/${declaration?.account}/${id}/${value}`;
 const emit=()=>{const key=[view,mode,id,$('workspace').hidden,Boolean(warning),Boolean(manual)].join('/');if(key!==overlayKey){overlayKey=key;doc.dispatchEvent(new CustomEvent('b2z-overlay'));}};
 function rememberDraft(){if(view==='action')drafts.set(draftKey(mode),{cell,degrees,worldAngle,quantity});}
 function show(name,title){
  if(name!=='action')rememberDraft();if(!$('workspace').contains(doc.activeElement))opener=doc.activeElement;if(view!==name)doc.querySelector('.panel-scroll').scrollTop=0;view=name;$('workspace').hidden=false;
  for(const n of doc.querySelectorAll('.panel-view'))n.hidden=n.id!==name+'-view';
  text('panel-title',title);refresh();
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
   if(mode==='move'&&cell===c?.cell)throw Error('DIFFERENT_TILE');
   const m=mode==='move'?null:transferMemo(worldAngle===null?encodedHeading(degrees):worldAngle);const angle=m?.text.slice(6)??null;
   if(mode==='start'&&mine().length&&cell===null)return {reason:buildSites().length?'Choose an empty neighbouring tile.':buildReason()};
   const requested=mode==='ball'?quantity:1;
   let q;
   if(world.version===6)q=prepareQuoteV6(world,config,declaration.account,{kind:{start:'new',ball:'fire',move:'move'}[mode],cannon:id,angle,quantity:requested,cell});
   else{if(mode==='start'&&mine().length)throw Error('ACCOUNT_ALREADY_HAS_CANNON');if(mode==='move'&&!c.owns(cell))throw Error('ILLEGAL_MOVE');const memo=mode==='move'?describeTextMemo('move',String(cell)):m;q={amount:mode==='start'?config.join_e8s:mode==='move'?config.move_e8s:c.next_ball_e8s,memo:memo.text,memo_bytes:new TextEncoder().encode(memo.text)};if(q.amount===null)throw Error('BALL_CAPACITY');}
   return {account:declaration.account,payer:declaration.display??declaration.principal??declaration.account,network:source.network,backend:source.owner,action:mode,cannon:mode==='start'?null:id,angle:mode==='move'?null:angle,cell,requested:q.requested??requested,maximum_fill:q.maximum_fill??1,amount:q.amount,memo:q.memo,hex:Array.from(q.memo_bytes,b=>b.toString(16).padStart(2,'0')).join(''),owner:destination.primary,subaccount:String(source.subaccount),recipient:destination.legacy,rules:config.rules_version??world.version,snapshot:revision};
  }catch(error){const reasons={DIFFERENT_TILE:'Choose a different tile.',BALL_CAPACITY:'Ball capacity reached.',ILLEGAL_MOVE:'Choose a legal highlighted destination.',NOT_OWNER:'Choose one of your cannons.',NO_ADJACENT_SITE:'No adjacent site is currently available.',NO_ELIGIBLE_SPAWN:'No first site is currently available.',PLAYER_CANNON_CAPACITY:'Your cannon capacity is reached.',CANNON_CAPACITY:'Cannon capacity is reached.',QUANTITY_BOUNDS:'Choose between 1 and 64 balls.',CELL_BOUNDS:'Choose a destination cell.',ILLEGAL_ADJACENT_SITE:'That site is no longer eligible. Choose another.',ACCOUNTING_CAPACITY:'Player capacity reached.',HEADING_BOUNDS:'Heading must be between 0 and 359.99°.'};return {reason:reasons[error.message]??(mode==='move'?'Choose a legal destination.':'Enter a heading from 0 to 359.99° and a valid quantity.')};}
 }
 function renderPacket(q){
  text('transfer-amount',formatIcp(BigInt(q.amount)));text('payment-owner',q.owner);text('text-memo',q.memo);text('paying-account',q.payer??q.account);
  text('payment-risk',paymentWarning(q));$('amount-detail').hidden=q.action!=='start';text('amount-detail',q.action==='start'?'1 ball':'');
 }
 function refresh(){
  $('transfer-controls').disabled=busy||!status.canPrepare||Boolean(warning);
  const c=selected(),own=Boolean(c&&declaration&&c.account===declaration.account);
  $('join-action').hidden=!world||Boolean(declaration&&mine().length);$('centre-cannon').hidden=!mine().length;text('centre-cannon',mine().length===1?'My cannon':'My cannons');
  $('context-actions').hidden=!own;$('fire-action').hidden=!own;$('move-action').hidden=!own;$('build-action').hidden=!own||world?.version!==6;$('build-action').disabled=Boolean(own&&world?.version===6&&!buildSites().length);$('build-action').setAttribute('aria-describedby','inspect-note');$('fire-action').setAttribute('aria-label',c?.dormant?'Revive':'Fire');$('fire-action').title=c?.dormant?'Revive':'Fire';$('fire-action').dataset.revive=String(Boolean(c?.dormant));
  $('fire-action').disabled=Boolean(own&&c.next_ball_e8s===null);$('fire-action').setAttribute('aria-describedby','inspect-note');
  $('move-action').disabled=Boolean(c?.dormant);$('move-action').setAttribute('aria-describedby','inspect-note');$('move-action').title=c?.dormant?'Revive the island before moving.':'Move';
  text('cannon-life',c?`${own?'Your cannon':'Opponent cannon'} #${c.id} · ${c.dormant?'Dormant':`Island balls ${c.balls} · ${c.owned_count} tiles`}`:'Cannon no longer present.');text('inspect-note',own&&c.next_ball_e8s===null?'Ball capacity reached.':own&&c?.dormant?'Revive before moving or its on-chain expiry.':own&&world?.version===6&&!buildSites().length?buildReason():'');
  const cannonContext=Boolean(c&&['inspect','action'].includes(view));$('inspect-note').hidden=!cannonContext||!$('inspect-note').textContent;$('workspace').dataset.surface=cannonContext?'context':'global';$('workspace').dataset.expanded=view==='action'?'true':'false';$('workspace').style.setProperty('--tool-count',own?(world?.version===6?5:4):2);$('context-actions').hidden=!cannonContext||!own;
  for(const [name,value]of [['fire-action','ball'],['move-action','move'],['build-action','start']]){const active=view==='action'&&mode===value;$(name).setAttribute('aria-pressed',String(active));$(name).setAttribute('aria-expanded',String(active));}
  text('quantity-label',quantity>1?'Up to':'Balls');$('quantity-controls').hidden=mode!=='ball'||world?.version!==6;$('join-direction').hidden=mode!=='start'||Boolean(mine().length);for(const b of doc.querySelectorAll('[data-heading]'))b.setAttribute('aria-pressed',String(Number(degrees)===Number(b.dataset.heading)));
  if(view==='action'){
   text('panel-title',c?`Cannon #${c.id}`:'New cannon');text('action-prompt',mode==='move'?'Choose a Tile & Pay':mode==='start'&&mine().length?'Choose a Tile, Aim & Pay':'Aim & Pay');
   quote=candidate();if(manual&&instructionKey(manual.q)!==instructionKey(packet??quote)){manual=null;$('manual-copy').hidden=true;}const differs=Boolean(packet&&instructionKey(quote)!==instructionKey(packet)),changed=differs&&!keepPrevious;
   $('replace-choice').hidden=!changed;$('prepared-card').hidden=Boolean(changed||(!packet&&(!quote||quote.reason)));
   if(!$('prepared-card').hidden)renderPacket(packet??quote);
   $('transfer-controls').disabled=busy||!status.canPrepare||Boolean(quote?.reason)||changed||Boolean(warning);
   text('preparation-note',warning||quote?.reason||'');$('transfer-controls').setAttribute('aria-label',status.canPrepare?'Payment instructions':'Payment instructions temporarily unavailable');
   text('placement-note',planningBehind?'Preview uses the latest verified position.':mode==='start'&&!mine().length?'Automatic first site.':'');
  }
  emit();
 }
 function updateRoster(){
  const key=JSON.stringify([declaration?.account,mine().map(c=>[c.id,c.dormant,c.balls])]);if(key===rosterKey)return;rosterKey=key;
  const nodes=mine().map(c=>{const b=doc.createElement('button');b.textContent=`Cannon #${c.id} · ${c.dormant?'Dormant':`Island balls ${c.balls}`}`;b.onclick=()=>{api.selectCannon(c.id);doc.dispatchEvent(new CustomEvent('b2z-locate'));};return b;});
  $('own-cannons').replaceChildren(...nodes);$('account-cannons').replaceChildren(...nodes.map(b=>{const n=b.cloneNode(true);n.onclick=b.onclick;return n;}));
 }
 function activity(){
  if(!history)return;const key=JSON.stringify([declaration?.account,history.records(),history.cachedReceipts(),receipts],(_,v)=>typeof v==='bigint'?String(v):v);if(key===activityKey)return;activityKey=key;const saved=[];
  for(const r of history.records().filter(r=>r.account===declaration?.account)){
   const entry=doc.createElement('article'),label=doc.createElement('p'),b=doc.createElement('button');label.textContent=`${r.memo} · ${formatIcp(BigInt(r.amount))}${r.state==='unknown'?' · outcome unknown':''}`;entry.append(label);
   if(r.backend===source.owner&&r.network===source.network&&r.owner&&r.recipient&&r.hex){b.textContent='View saved instructions';b.onclick=()=>{mode=r.action;id=r.cannon;cell=r.cell;worldAngle=r.angle??worldAngle;degrees=displayHeading(worldAngle);packet=r;keepPrevious=true;warning='Saved instructions may no longer apply. Review before using.';quantity=r.requested??1;$('ball-quantity').value=quantity;show('action','Saved instructions');refresh();};entry.append(b);}saved.push(entry);
  }
  if(!saved.length){const p=doc.createElement('p');p.textContent='No saved instructions.';saved.push(p);}$('saved-list').replaceChildren(...saved);
  const outcomes=new Map(history.cachedReceipts().map(r=>[String(r.position),{...r,cached:true}]));for(const r of receipts)outcomes.set(String(r.position),r);
  const entries=[...outcomes.values()].filter(r=>r.account===declaration?.account).slice(-64).reverse().map(r=>{const e=doc.createElement('article');e.textContent=`${receiptSummary(r)}${r.cached?' · cached history':' · verified'}`;const d=doc.createElement('details'),s=doc.createElement('summary'),p=doc.createElement('p');s.textContent='Record';p.textContent=`Ledger ${r.position} · ${formatIcp(BigInt(r.amount))}${r.cached?' · not newly verified':''}`;d.append(s,p);e.append(d);return e;});
  if(!entries.length){const p=doc.createElement('p');p.textContent='No retained outcomes for this account. Missing history does not prove failure.';entries.push(p);}$('receipt-list').replaceChildren(...entries);
 }
 function buildReason(){try{quoteV6(world,config,declaration.account,{kind:'new',angle:'0',quantity:1,cell:null});return 'Choose an empty neighbouring tile.';}catch(e){return ({PLAYER_CANNON_CAPACITY:'Your cannon capacity is reached.',CANNON_CAPACITY:'Cannon capacity is reached.',BALL_CAPACITY:'Ball capacity reached.'})[e.message]??(mine().every(c=>c.dormant)?'Revive an island before building.':'No empty eligible neighbour is available.');}}
 function buildSites(){if(world?.version!==6||!declaration)return[];if(sitesWorld===world&&sitesConfig===config&&sitesAccount===declaration.account&&sitesRevision===revision)return eligibleSites;sitesWorld=world;sitesConfig=config;sitesAccount=declaration.account;sitesRevision=revision;eligibleSites=legalAdjacentSites(world,declaration.account).filter(site=>{try{quoteV6(world,config,declaration.account,{kind:'new',angle:'0',quantity:1,cell:site});return true;}catch{return false;}});return eligibleSites;}
 function action(value){
  intentVersion++;
  if(!declaration){pending=value;api.openAccount();return;}
  if(value!=='start'&&selected()?.account!==declaration.account){if(mine().length===1)id=mine()[0].id;else{api.openRoster();return;}}
  if(view==='action'&&mode===value){rememberDraft();show('inspect',`Cannon #${id}`);refresh();return;}
  rememberDraft();const previousMode=mode;clearDraft();keepPrevious=false;mode=value;siteKey='';
  const saved=drafts.get(draftKey(value));
  if(saved){({cell,degrees,worldAngle}=saved);quantity=Number(saved.quantity);$('ball-quantity').value=quantity;}
  else{cell=null;if(value!=='move'&&previousMode!==value){worldAngle=String(Math.round((value==='start'&&!mine().length?40960:selected()?.heading??40960)*360/65536*100)/100%360);degrees=displayHeading(worldAngle);}if(value==='start'){quantity=1;$('ball-quantity').value='1';}}

  show('action',id===null?'New cannon':`Cannon #${id}`);refresh();
 }
 $('identity-form').addEventListener('submit',event=>{event.preventDefault();try{const next=parseSendingAccount($('sending-account').value,$('identity-subaccount').value);if(next.account!==declaration?.account){intentVersion++;packet=null;keepPrevious=false;warning='';id=null;mode='inspect';}declaration=next;persist();if(!$('remember-account').checked)store?.forget();identityLabel();updateRoster();activity();text('identity-note','');if(pending){const p=pending;pending=null;action(p);}else{show('account','Account');refresh();}}catch(error){text('identity-note',error.message);}});
 $('change-account').onclick=$('payer-change').onclick=()=>{show('account','Sending account');$('identity-form').hidden=false;$('account-summary').hidden=true;$('sending-account').value=declaration?.display??declaration?.principal??declaration?.account??'';$('identity-subaccount').value='';$('sending-account').focus();};
 $('identity-forget').onclick=()=>{store?.forget();declaration=null;id=null;packet=null;warning='';pending=null;mode='inspect';identityLabel();activity();refresh();};
 $('cycles-display').onclick=()=>api.openStatus();
 $('identify-button').onclick=()=>api.openAccount();$('join-action').onclick=()=>action('start');$('fire-action').onclick=()=>action('ball');$('move-action').onclick=()=>action('move');$('build-action').onclick=()=>action('start');
 $('ball-quantity').addEventListener('input',()=>{quantity=Number($('ball-quantity').value);clearDraft();keepPrevious=false;refresh();});
 for(const b of doc.querySelectorAll('[data-heading]'))b.onclick=()=>api.setHeading(Number(b.dataset.heading));
 $('join-direction').addEventListener('keydown',e=>{const n={ArrowLeft:-1,ArrowRight:1,ArrowUp:-1,ArrowDown:1}[e.key];if(n){api.adjustAngle(n*(e.altKey?.01:e.shiftKey?5:1));e.preventDefault();e.stopPropagation();}});
 for(const [name,step]of [['quantity-minus',-1],['quantity-plus',1]])$(name).onclick=()=>{const n=Number($('ball-quantity').value)||1;$('ball-quantity').value=String(Math.max(1,Math.min(64,n+step)));$('ball-quantity').dispatchEvent(new Event('input',{bubbles:true}));};
 $('replace-instructions').onclick=()=>{packet=null;keepPrevious=false;warning='';manual=null;$('manual-copy').hidden=true;text('copy-feedback','');refresh();};
 $('keep-instructions').onclick=()=>{if(!packet)return;keepPrevious=true;mode=packet.action;id=packet.cannon;cell=packet.cell;worldAngle=packet.angle??worldAngle;degrees=displayHeading(worldAngle);quantity=packet.requested;$('ball-quantity').value=quantity;refresh();};
 function freeze(q,h){const saved=packet?.id&&instructionKey(packet)===instructionKey(q)?packet:h.freeze(q);if(q.backend===source?.owner&&q.account===declaration?.account){packet=saved;if(q.cannon!==null&&!refs.some(c=>c.id===q.cannon&&c.account===q.account))warning='The copied target is no longer present. Saved instructions remain in Account.';}activity();return saved;}
 function savedNote(h){return h.persisted()?'Instructions saved; no payment sent.':'Instructions kept for this visit only; device storage is unavailable. No payment sent.';}
 for(const b of doc.querySelectorAll('[data-copy]'))b.addEventListener('click',async()=>{
  refresh();if($('transfer-controls').disabled)return;const q=packet??quote,h=history,value={amount:formatIcp(BigInt(q.amount)).replace(' ICP',''),owner:q.owner,text:q.memo}[b.dataset.copy];busy=true;refresh();
  try{await navigator.clipboard.writeText(value);freeze(q,h);text('copy-feedback','Copied. '+savedNote(h));}
  catch{manual={q,h};$('manual-copy').hidden=false;$('manual-value').value=value;text('copy-feedback','Clipboard unavailable. Copy the exact value below.');$('manual-value').focus();$('manual-value').select();}
  finally{busy=false;refresh();}
 });
 // UX-08: native Copy bypasses clipboard.writeText (including the fallback).
 // Freeze conservatively on the event, without claiming that the OS write worked.
 // Keep the selected DOM intact so the browser's default copy can still complete.
 doc.addEventListener('copy',()=>{
  let q,h;if(manual&&doc.activeElement===$('manual-value')){q=manual.q;h=manual.h;}
  else if(view==='action'&&!$('prepared-card').hidden&&status.canPrepare){
   const selection=doc.getSelection();if(!selection?.rangeCount||selection.isCollapsed)return;
   const range=selection.getRangeAt(0);
   if(!['transfer-amount','payment-owner','text-memo','paying-account'].some(name=>$(name)&&range.intersectsNode($(name))))return;
   q=packet??quote;h=history;
  }
  if(!q||q.reason||!h)return;freeze(q,h);text('copy-feedback',savedNote(h));refresh();
 });
 $('manual-handoff').onclick=()=>{if(!manual||instructionKey(manual.q)!==instructionKey(packet??quote)||!status.canPrepare)return;const h=manual.h;freeze(manual.q,h);manual=null;$('manual-copy').hidden=true;text('copy-feedback',savedNote(h));refresh();};
 $('close-panel').onclick=()=>api.cancel();
 const api={
  render(w,c,s,root=''){
   const nextContext=`${s.network}:${s.owner}`;
   if(context!==nextContext){const firstContext=context===null;context=nextContext;if(!firstContext){view=null;$('workspace').hidden=true;}store=identityStore(s.network,s.owner,storage);declaration=(firstContext&&declaration)||store.read();history=createHandoffs(storage,`B2Z-activity-v1:${context}`);packet=null;keepPrevious=false;warning='';id=null;mode='inspect';try{const raw=storage?.getItem(`B2Z-view-v1:${context}`);preferences=raw&&raw.length<4096?JSON.parse(raw):{};}catch{preferences={};}cameraState=declaration?.camera?.projection==='isometric-1'?declaration.camera:null;id=Number.isSafeInteger(declaration?.cannon)?declaration.cannon:null;identityLabel();}
   world=w;config=c;source=s;revision=root;try{destination=paymentDestination(s);}catch(error){destination=null;status={canPrepare:false,label:'Unable to verify destination'};warning=error.message;}
   refs=cannonReference(w,c);
   if(id!==null&&!refs.some(c=>c.id===id)){id=null;mode='inspect';if(packet)warning='The copied target is no longer present. Saved instructions remain in Account.';else{warning='';text('copy-feedback','');}if(view==='action'||view==='inspect'){show('roster','Choose a cannon');text('roster-note','The selected cannon is no longer present. Choose another.');}}
   updateRoster();activity();refresh();
  },
  status(input){status=input.resolved??experienceStatus({...input,world});if(!destination)status={...status,canPrepare:false};const now=performance.now();const central=['connecting','catching-up','waiting','reconnecting'].includes(status.kind);if(central){waitingSince??=now;}else waitingSince=null;const waiting=central&&(status.kind==='connecting'||now-waitingSince>=350);$('motion-wait').hidden=!waiting;$('motion-wait').dataset.kind=status.kind;text('waiting-label',status.label);text('arena-note',status.label);$('status-button').title=status.label;text('status-explanation',status.detail||status.label);refresh();return{available:status.canPrepare,label:status.label};},
  action,selectCannon(n){intentVersion++;const c=refs.find(c=>c.id===n);if(!c)return false;rememberDraft();id=n;keepPrevious=false;mode='inspect';cell=null;clearDraft();persist();show('inspect',`Cannon #${n}`);refresh();return true;},
  cancel(){intentVersion++;rememberDraft();if(['inspect','action'].includes(view))id=null;view=null;mode='inspect';cell=null;pending=null;$('workspace').hidden=true;manual=null;$('manual-copy').hidden=true;if(!packet){warning='';text('copy-feedback','');}emit();(opener?.isConnected&&opener!==doc.body&&opener.getClientRects().length?opener:$('board')).focus({preventScroll:true});},
  presentation(v){const c=selected(),displayed=v?.cannons.get(id),behind=Boolean(c&&(!displayed||displayed.cell!==c.cell));if(behind!==planningBehind){planningBehind=behind;refresh();}},
  hasCannon:n=>refs.some(c=>c.id===n),selectedCannon:()=>id,account:()=>declaration?.account??null,mode:()=>mode,canPay:()=>status.canPrepare,active:()=>view!==null,selected,angle:()=>degrees,context:()=>view,anchor:()=>view==='action'&&mode==='start'&&!mine().length?null:selected(),
  intentContext:()=>[context,world?.version,declaration?.account,id,selected()?.cell,mode,intentVersion].join('/'),revision:()=>revision,

  aimAt(dx,dy){if(mode!=='ball'&&mode!=='start')return;degrees=String(Math.round(worldToScreen(Math.atan2(dy,dx)*180/Math.PI)*100)/100%360);worldAngle=null;keepPrevious=false;clearDraft();refresh();},
  setHeading(value){if(!Number.isFinite(value))return;degrees=String((value%360+360)%360);worldAngle=null;keepPrevious=false;clearDraft();refresh();},
  proposedAction:()=>Object.freeze({mode,cell,degrees,worldAngle,quantity}),
  adjustAngle(delta){degrees=((Number(degrees)+delta+360)%360).toFixed(2);worldAngle=null;keepPrevious=false;clearDraft();refresh();},
  aim(){if(view!=='action'||!['ball','start'].includes(mode)||mode==='start'&&!mine().length||mode==='start'&&mine().length&&cell===null)return null;const c=cell!==null&&mode==='start'?{id:null,cell}:selected();if(!c||mode==='start'&&mine().length&&!buildSites().includes(cell))return null;try{const m=transferMemo(worldAngle===null?encodedHeading(degrees):worldAngle);return{cannon:c,angle:m.command.value*360/65536,heading:m.command.value};}catch{return null;}},
  moveSelection(){const c=selected();if(view!=='action')return null;if(world?.version===6&&mode==='start'&&mine().length)return{kind:'new',width:world.width,height:world.height,key:revision+'/'+siteKey,cells:buildSites(),cell,anchor:selected()?.cell};return mode==='move'&&c?{key:revision+'/'+id,width:world.width,height:world.height,id,cells:[],legal:n=>world.version===6?legalMoveDestination(world,declaration.account,id,n):n!==c.cell&&c.owns(n),cell,reference:world}:null;},
  chooseCell(n){const selection=api.moveSelection();if(selection&&n===null){cell=null;keepPrevious=false;clearDraft();refresh();return true;}if(!(selection?.legal?selection.legal(n):selection?.cells.includes(n))){text('preparation-note',mode==='start'?'Choose an empty eligible neighbouring tile.':n===selected()?.cell?'Choose a different tile.':'That move is unavailable: check ownership, occupancy or dormancy.');return false;}keepPrevious=false;cell=n;clearDraft();refresh();return true;},
  selectBall(){intentVersion++;rememberDraft();id=null;view=null;mode='inspect';cell=null;pending=null;$('workspace').hidden=true;emit();},
  openAccount(){identityLabel();activity();updateRoster();show('account','Account');if(!declaration)$('sending-account').focus();},
  openRoster(){if(mine().length===1){api.selectCannon(mine()[0].id);doc.dispatchEvent(new CustomEvent('b2z-locate'));}else{updateRoster();show('roster','My cannons');}},
  openActivity(){api.openAccount();$('saved-list').scrollIntoView({block:'nearest'});},
  openStatus(){show('status','Game status');},openHelp(){show('help','How to play');},
  receipts(value){receipts=value;history?.rememberReceipts(value,revision);if(view==='account')activity();},
  preferences(value){if(value){preferences={...preferences,...value};delete preferences.paused;try{storage?.setItem(`B2Z-view-v1:${context}`,JSON.stringify(preferences));}catch{}}return preferences;},
  camera(value){if(value){cameraState=value;persist();}return cameraState;},locate:()=>null
 };return api;
}
