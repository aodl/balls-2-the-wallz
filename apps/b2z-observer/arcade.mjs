import {fitShout} from '../../packages/protocol/shout.mjs';
import {contextSupported,shoutSupported} from './context-policy.mjs';
import {contextReason,contextSites,firstContextDestination} from './context-sites.mjs';
import {SCREEN_ORIENTATIONS,screenDirection} from '../../packages/protocol/context-structures.mjs';
import{deflectorSupported,snappedDeflectorDegrees,orientationFromDegrees,deflectorDegrees}from'./deflector-policy.mjs';
import{deflectorSites}from'./deflector-sites.mjs';
import {paneAccent} from './theme.mjs';
import {fitCry,validateCry}from'../../packages/protocol/war-cry.mjs';
import {clearanceActive}from'../../packages/protocol/territory-clearance.mjs';
import {warCrySupported}from'./war-cry-policy.mjs';
import {shortRecipient,paymentCopyValue} from './payment-presentation.mjs';
import {MAX_QUANTITY} from '../../packages/protocol/memo-v6.mjs';
import {nearestDestination,destinationLegality,moveLegalityIdentity} from './destination-search.mjs';
import {cellDistance} from '../../packages/protocol/territory-clearance.mjs';
/** UX-01..10/13. Local declaration and composer; no payment or game update client. */
import {describeTextMemo} from '../../packages/protocol/memo.mjs';
import {parseSendingAccount,paymentDestination,identityStore,accountColor} from './identity.mjs';
import {cannonReference} from './play-reference.mjs';
import {quoteV6,prepareQuoteV6,legalMoveDestination,legalAdjacentSites} from './action-quote-v6.mjs';
import {createHandoffs,instructionKey,receiptSummary} from './handoff.mjs';
import {encodedHeading,displayHeading,worldToScreen,storedHeadingForMemo} from './headings.mjs';
import {experienceStatus} from './experience-status.mjs';
export function formatIcp(e8s){if(typeof e8s!=='bigint'||e8s<0n)throw Error('exact nonnegative e8s required');const d=(e8s%100000000n).toString().padStart(8,'0').replace(/0+$/,'');return `${e8s/100000000n}${d?'.'+d:''} ICP`;}
export const transferMemo=degrees=>describeTextMemo('angle',degrees);
/** UX-08/10: describe the displayed packet, including a retained copied packet. */
export function paymentWarning(q){return Number.isSafeInteger(q?.cell)&&q.cell>=0&&['move','start','deflect','deflector_move'].includes(q.action)?'If another player claims your chosen tile before your action is processed, the action fails and your ICP remains spent.':'Fire balls to claim territory, and combine with obstacles to orchestrate defensive shields or offensive rallies!';}
export function createArcade(doc,{paymentCurrent=()=>true}={}){
 const $=id=>doc.getElementById(id),text=(id,value)=>{if($(id).textContent!==value)$(id).textContent=value;};
 let cry='',composing=false,cryProblem='',cryBudget=null;
 let intentVersion=0,entryGeneration=0,entryPending=null,observationReady=null;
 let deflectWorld=null,deflectConfig=null,deflectKey=null,deflectSearch=null,deflectLegality=null,deflectReady=false,defaultDeflect=null;
 let moveWorld=null,moveConfig=null,moveFingerprint=null,moveKey=null,moveSearch=null,moveLegality=null,moveReady=false,defaultMove=null;
 let sitesWorld=null,sitesConfig=null,sitesAccount=null,sitesRevision=null,eligibleSites=[];
 let declaration=null,context=null,store=null,storage,history,world,config,source,destination,revision='',refs=[],id=null,mode='inspect',view=null,degrees='0',worldAngle='225',quantity=1,siteKey='',cell=null,packet=null,keepPrevious=false,quote=null,manual=null,busy=false,pending=null,warning='',status={canPrepare:false,label:'Verifying game'},receipts=[],preferences={},cameraState=null,opener=null,planningBehind=false,activityKey='',rosterKey='',announcedStatus=null;
 try{storage=globalThis.localStorage;}catch{}
 const selected=()=>refs.find(c=>c.id===id),mine=()=>refs.filter(c=>c.account===declaration?.account);
 let tileSelection=null,deflectorId=null;
 const structureContexts=()=>contextSupported(config);
 const pickedDeflector=()=>world?.deflectors?.find(d=>d.id===deflectorId);
 const tileOwn=()=>tileSelection!==null&&contextSites(world).owns(declaration?.account,tileSelection);
 const deflectorOwn=()=>{const d=pickedDeflector();return Boolean(d&&d.owner===contextSites(world).owner(declaration?.account));};
 const orientationMode=()=>['deflect','deflector_reorient'].includes(mode);
 const qtyActive=()=>view==='action'&&world?.version>=6&&(mode==='ball'&&selected()?.account===declaration?.account||mode==='start'&&structureContexts()&&tileOwn());
 const title=()=>pickedDeflector()?`Diverter #${deflectorId}`:tileSelection!==null?'Owned tile':selected()?`Cannon #${id}`:'New cannon';
 const focusTarget=()=>pickedDeflector()??(tileSelection!==null?{cell:tileSelection}:selected());
 let overlayKey='';const drafts=new Map();const draftKey=value=>`${context}/${config?.rules_version}/${declaration?.account}/${id}/${deflectorId}/${tileSelection}/${value}`;
 const emit=()=>{const key=[view,mode,id,deflectorId,tileSelection,$('workspace').hidden,Boolean(warning),Boolean(manual)].join('/');if(key!==overlayKey){overlayKey=key;doc.dispatchEvent(new CustomEvent('b2z-overlay'));}};
 function rememberDraft(){if(view==='action')drafts.set(draftKey(mode),{cell,degrees,worldAngle,quantity,cry});}
 function show(name,title){
  if(name!=='action')rememberDraft();if(!$('workspace').contains(doc.activeElement))opener=doc.activeElement;if(view!==name)doc.querySelector('.panel-scroll').scrollTop=0;view=name;$('workspace').hidden=false;
  for(const n of doc.querySelectorAll('.panel-view'))n.hidden=n.id!==name+'-view';
  text('panel-title',title);refresh();
 }
 function persist(){if(!declaration||!$('remember-account').checked)return;if(id!==null)declaration={...declaration,cannon:id};const saved=store?.write({...declaration,cannon:id??declaration.cannon,camera:cameraState});text('storage-note',saved?'':'Using this visit only; device storage is unavailable.');}
 function identityLabel(){paneAccent(doc,declaration?.account,declaration?accountColor(declaration.account):null);text('identity-label',declaration?'Account':'Account');$('identity-color').style.background=declaration?accountColor(declaration.account):'transparent';text('account-name',declaration?.display??declaration?.principal??declaration?.account??'');$('identity-form').hidden=Boolean(declaration);$('account-summary').hidden=!declaration;}
 function clearDraft(){text('roster-note','');if(!packet){warning='';text('copy-feedback','');manual=null;$('manual-copy').hidden=true;}}
 function cancelEntryNavigation(){entryGeneration++;entryPending=null;doc.dispatchEvent(new Event('b2z-entry-cancel'));}
 function enter(){cancelEntryNavigation();entryPending={generation:entryGeneration,account:declaration?.account??null};pending=null;mode='inspect';cell=null;if(!declaration){api.openAccount();return;}show('account','Checking territory');resolveEntry();}
 function resolveEntry(){
  if(!entryPending||entryPending.generation!==entryGeneration||!declaration)return;
  if(!world||observationReady===false||['connecting','verification-error','render-error'].includes(status.kind)){text('entry-note','Checking your territory ...');$('entry-note').hidden=false;return;}
  if(entryPending.account!==declaration.account)return;
  entryPending=null;$('entry-note').hidden=true;
  if(mine().length){const account=declaration.account,w=world;api.cancel({entry:false});const token=entryGeneration;doc.dispatchEvent(new CustomEvent('b2z-return-territory',{detail:{world:w,account,current:()=>entryGeneration===token&&declaration?.account===account}}));}
  else action('start');
 }
 const shoutActive=()=>mode!=='inspect'&&(shoutSupported(config)||warCrySupported(config)&&['ball','start'].includes(mode));
 function candidate(){
  if(!world||!config||!destination)return {reason:'Waiting for verified payment instructions.'};
  if(!declaration)return {reason:'Choose your sending account.'};
  if(mode==='inspect')return null;
  const c=selected(),successor=structureContexts(),rotating=mode==='deflector_reorient',movingDeflector=mode==='deflector_move';
  if((rotating||movingDeflector)&&!deflectorOwn())return {reason:'This Diverter is no longer available to your account.'};
  if(!rotating&&!movingDeflector&&!(successor&&mode==='deflect'&&tileOwn())&&mode!=='start'&&c?.account!==declaration.account)return {reason:'This cannon is no longer available to your account.'};
  try{
   if(mode==='move'&&cell===c?.cell)throw Error('DIFFERENT_TILE');
   const m=mode==='move'||movingDeflector?null:transferMemo(worldAngle===null?encodedHeading(degrees):worldAngle);const angle=m?.text.slice(6)??null;
   if(mode==='start'&&mine().length&&cell===null)return {reason:successor?'Choose an owned tile.':buildSites().length?'Choose an empty neighbouring tile.':buildReason()};
   const requested=mode==='ball'||successor&&mode==='start'&&tileOwn()?quantity:1;
   let q;
   if(world.version>=6)q=prepareQuoteV6(world,config,declaration.account,{kind:{start:'new',ball:'fire',move:'move',deflect:'deflect',deflector_move:mode,deflector_reorient:mode}[mode],cannon:id,deflector:deflectorId,angle,quantity:requested,cell});
   else{if(mode==='start'&&mine().length)throw Error('ACCOUNT_ALREADY_HAS_CANNON');if(mode==='move'&&!c.owns(cell))throw Error('ILLEGAL_MOVE');const memo=mode==='move'?describeTextMemo('move',String(cell)):m;q={amount:mode==='start'?config.join_e8s:mode==='move'?config.move_e8s:c.next_ball_e8s,memo:memo.text,memo_bytes:new TextEncoder().encode(memo.text)};if(q.amount===null)throw Error('BALL_CAPACITY');}
   let annotation={};if(shoutActive()){
    if(composing||cryProblem)return{reason:cryProblem||'Finish Shout composition before copying.'};
    const fitted=(shoutSupported(config)?fitShout:fitCry)(q.memo,cry);cryBudget=fitted.available;if(fitted.shortened){cry=fitted.cry;text('war-cry-note','Shortened to fit memo');}q={...q,memo:fitted.memo,memo_bytes:new TextEncoder().encode(fitted.memo)};
    annotation={cry,capability:shoutSupported(config)?'btz-successful-action-shout-1':'btz-war-cry-1',capability_config:config.rules_version};
   }
   return {...annotation,account:declaration.account,payer:declaration.display??declaration.principal??declaration.account,network:source.network,backend:source.owner,action:mode,cannon:mode==='start'?null:id,...(successor?{structure:deflectorId}:{}),angle:mode==='move'||movingDeflector?null:angle,cell,requested:q.requested??requested,maximum_fill:q.maximum_fill??1,amount:q.amount,memo:q.memo,hex:Array.from(q.memo_bytes,b=>b.toString(16).padStart(2,'0')).join(''),owner:destination.primary,subaccount:String(source.subaccount),recipient:destination.legacy,rules:config.rules_version??world.version,snapshot:revision};
  }catch(error){const reasons={ENEMY_TERRITORY_TOO_CLOSE:'Too close to enemy territory.',DIFFERENT_TILE:'Choose a different tile.',BALL_CAPACITY:'Ball capacity reached.',ILLEGAL_MOVE:'Choose a legal highlighted destination.',DEFLECTOR_TOO_CLOSE:'Leave one clear tile between Diverters.',ILLEGAL_DEFLECTOR_SITE:'Choose a legal owned tile for the Diverter.',UNSUPPORTED_DEFLECTOR:'Diverters are unavailable under the active verified rules.',NOT_OWNER:'Choose one of your cannons.',NO_ADJACENT_SITE:'No adjacent site is currently available.',NO_ELIGIBLE_SPAWN:'No first site is currently available.',PLAYER_CANNON_CAPACITY:'Your cannon capacity is reached.',CANNON_CAPACITY:'Cannon capacity is reached.',QUANTITY_BOUNDS:'Choose between 1 and 64 balls.',CELL_BOUNDS:'Choose a destination cell.',ILLEGAL_ADJACENT_SITE:'That site is no longer eligible. Choose another.',ACCOUNTING_CAPACITY:'Player capacity reached.',HEADING_BOUNDS:'Heading must be between 0 and 359.99°.'};return {reason:(successor?contextReason(error.message):undefined)??reasons[error.message]??(mode==='move'?'Choose a legal destination.':'Enter a heading from 0 to 359.99° and a valid quantity.')};}
 }
 function renderPacket(q){
  text('transfer-amount',formatIcp(BigInt(q.amount)));text('payment-owner',shortRecipient(q.owner));text('full-recipient',q.owner);text('text-memo',q.memo);text('paying-account',shortRecipient(q.payer??q.account));text('full-payer',q.payer??q.account);
  text('payment-risk',paymentWarning(q));$('payment-risk').title=clearanceActive(config)&&['move','start','deflect','deflector_move'].includes(q.action)&&Number.isSafeInteger(q.cell)?'A new enemy claim within four cells can also invalidate the action.':'';const launches=q.action==='ball'||q.action==='start'&&mine().length>0;$('amount-detail').hidden=!launches;text('amount-detail',launches?`${q.requested} ${q.requested===1?'ball':'balls'}`:'');
 }
 const copyControls=[...doc.querySelectorAll('[data-copy]')];
 let quoteBlocked=false;
 function paymentReadiness(){
  const controls=$('transfer-controls');
  const disabled=view!=='action'||busy||!status.canPrepare||Boolean(warning)||quoteBlocked
   ||(shoutActive()&&(composing||Boolean(cryProblem)));
  const ready=String(!disabled);
  if(controls.dataset.paymentReady!==ready)controls.dataset.paymentReady=ready;
  for(const button of copyControls)if(button.disabled!==disabled)button.disabled=disabled;
  const manualDisabled=disabled||!manual;
  for(const control of [$('manual-value'),$('manual-handoff')])if(control.disabled!==manualDisabled)control.disabled=manualDisabled;
  return !disabled;
 }
 const mayHandoff=()=>paymentReadiness()&&paymentCurrent();
 function refreshAction(){
  if(view==='action'){
    text('panel-title',title());
   text('action-prompt',mode==='deflector_reorient'?'Pay to Reorient':mode==='deflect'?'Pay to Build & Divert':['move','deflector_move'].includes(mode)?'Pay to Move':mode==='start'?(mine().length?'Pay to Build & Fire':'Pay to Join'):'Pay to Fire');
   quote=candidate();$('war-cry').disabled=cryBudget===0||!globalThis.Intl?.Segmenter;$('war-cry').title=$('war-cry').disabled?(cryBudget===0?'No space remains in this memo':'Shout requires grapheme support in this browser'):'Public on-chain text';if(!composing&&!cryProblem&&$('war-cry').value!==cry)$('war-cry').value=cry;if(manual&&instructionKey(manual.q)!==instructionKey(packet??quote)){manual=null;$('manual-copy').hidden=true;}const differs=Boolean(packet&&instructionKey(quote)!==instructionKey(packet)),changed=differs&&!keepPrevious;
   $('replace-choice').hidden=!changed;$('prepared-card').hidden=Boolean(changed||(!packet&&(!quote||quote.reason)));
   if(!$('prepared-card').hidden)renderPacket(packet??quote);
   quoteBlocked=Boolean(quote?.reason||differs);paymentReadiness();
   text('preparation-note',warning||quote?.reason||'');
   text('placement-note',planningBehind?'Preview uses the latest verified position.':mode==='start'&&!mine().length?'Automatic first site.':'');
  }
 }
 function refresh(){
  paymentReadiness();
  const c=selected(),own=Boolean(c&&declaration&&c.account===declaration.account),successor=structureContexts();
  const tile=successor&&tileOwn(),d=pickedDeflector(),ownDeflector=successor&&deflectorOwn();
  const contextual=['inspect','action'].includes(view)&&(c||d||tile);
  $('entry-note').hidden=!entryPending||!declaration;
  $('join-action').hidden=Boolean(world&&declaration&&mine().length);$('centre-cannon').hidden=!mine().length;text('centre-cannon',mine().length===1?'My cannon':'My cannons');
  const mayBuild=successor?tile:own&&world?.version>=6;
  const buildIssue=successor&&tile?tileBuildIssue('new'):mayBuild&&!buildSites().length?buildReason():'';
  const deflectorIssue=successor&&tile?tileBuildIssue('deflect'):'';
  $('build-action').hidden=!mayBuild;$('build-action').disabled=Boolean(buildIssue);
  $('build-action').setAttribute('aria-label',successor?'Build Cannon':'Build');
  $('build-action').title=buildIssue||(successor?'Build Cannon':'Build');
  $('build-action').setAttribute('aria-description',buildIssue||'Build another cannon');
  const oldDeflector=own&&!successor&&deflectorSupported(config);
  const deflect=oldDeflector?deflectorDestination():null;
  $('deflect-action').hidden=!(oldDeflector||tile);
  $('deflect-action').disabled=successor?Boolean(deflectorIssue):!oldDeflector||!deflectReady||deflect===null;
  $('deflect-action').title=successor?deflectorIssue||'Build Diverter':!deflectReady?'Checking legal Diverter destinations':deflect===null?'No legal Diverter destination':'Build Diverter';
  $('deflect-action').setAttribute('aria-description',$('deflect-action').title);
  $('fire-action').hidden=!own;
  $('fire-action').setAttribute('aria-label',c?.dormant?'Revive':successor?'Fire / Aim':'Fire');$('fire-action').title=$('fire-action').getAttribute('aria-label');$('fire-action').dataset.revive=String(Boolean(c?.dormant));
  $('fire-action').disabled=Boolean(own&&c.next_ball_e8s===null);$('fire-action').setAttribute('aria-describedby','inspect-note');
  const move=own||ownDeflector?moveDestination():null;
  $('move-action').hidden=!(own||ownDeflector);$('move-action').disabled=!(own||ownDeflector)||!moveReady||move===null;
  $('move-action').setAttribute('aria-describedby','inspect-note');
  $('move-action').title=c?.dormant?'Revive the island before moving.':!moveReady?'Checking legal destinations':move===null?(successor?'No legal tile near another friendly structure.':'No legal move destination'):'Move';
  $('move-action').setAttribute('aria-description',$('move-action').title);
  $('reorient-action').hidden=!ownDeflector;$('move-action').setAttribute('aria-label',ownDeflector?'Move Diverter':'Move');
  $('focus-cannon').setAttribute('aria-label',successor?(d?'Focus Diverter':tile?'Focus tile':'Focus cannon'):'Focus cannon');
  $('focus-cannon').title=$('focus-cannon').getAttribute('aria-label');
  text('cannon-life',c?`${own?'Your cannon':'Opponent cannon'} #${c.id} · ${c.dormant?'Dormant':`Island balls ${c.balls} · ${c.owned_count} tiles`}`:d?`Diverter #${d.id} · ${screenDirection(d.orientation)}`:'Owned territory');
  const hint=tile?[...new Set([buildIssue,deflectorIssue].filter(Boolean))].join(' '):own&&c.next_ball_e8s===null?'Ball capacity reached.':own&&c?.dormant?'Revive before moving or its on-chain expiry.':'';
  text('inspect-note',hint);$('inspect-note').hidden=!contextual||!hint||view==='action'&&tile;
  $('workspace').dataset.surface=contextual?'context':'global';$('workspace').dataset.expanded=view==='action'?'true':'false';
  $('workspace').style.setProperty('--tool-count',successor&&contextual&&(own||tile||ownDeflector)?4:own?(world?.version>=6?(deflectorSupported(config)?6:5):4):2);
  $('context-actions').hidden=!contextual||!(own||tile||ownDeflector);
  for(const [name,value]of [['fire-action','ball'],['move-action',ownDeflector?'deflector_move':'move'],['build-action','start'],['deflect-action','deflect'],['reorient-action','deflector_reorient']]){
   const active=view==='action'&&mode===value;$(name).setAttribute('aria-pressed',String(active));$(name).setAttribute('aria-expanded',String(active));
  }
  $('deflector-directions').hidden=!(view==='action'&&orientationMode()&&deflectorSupported(config));
  setDirections();
  const cryActive=view==='action'&&shoutActive();$('war-cry-editor').hidden=!cryActive;const cryInput=$('war-cry');if(!composing&&!cryProblem&&cryInput.value!==cry)cryInput.value=cry;
  text('quantity-count',String(quantity));text('quantity-description',`${quantity>1?'Up to':'Request'} ${quantity} ball${quantity===1?'':'s'}; capacity may limit fulfilment.`);$('quantity-minus').disabled=quantity<=1;$('quantity-plus').disabled=quantity>=MAX_QUANTITY;$('quantity-controls').dataset.active=String(qtyActive());$('join-direction').hidden=mode!=='start'||Boolean(mine().length);for(const b of doc.querySelectorAll('[data-heading]'))b.setAttribute('aria-pressed',String(Number(degrees)===Number(b.dataset.heading)));
  refreshAction();
  emit();
 }
 function updateRoster(){
  const key=JSON.stringify([declaration?.account,mine().map(c=>[c.id,c.dormant,c.balls])]);if(key===rosterKey)return;rosterKey=key;
  const nodes=mine().map(c=>{const b=doc.createElement('button');b.textContent=`Cannon #${c.id} · ${c.dormant?'Dormant':`Island balls ${c.balls}`}`;b.onclick=()=>{api.selectCannon(c.id);if(!structureContexts())doc.dispatchEvent(new CustomEvent('b2z-locate'));};return b;});
  $('own-cannons').replaceChildren(...nodes);$('account-cannons').replaceChildren(...nodes.map(b=>{const n=b.cloneNode(true);n.onclick=b.onclick;return n;}));
 }
 function activity(){
  if(!history)return;const key=JSON.stringify([declaration?.account,history.records(),history.cachedReceipts(),receipts],(_,v)=>typeof v==='bigint'?String(v):v);if(key===activityKey)return;activityKey=key;const saved=[];
  for(const r of history.records().filter(r=>r.account===declaration?.account)){
   const entry=doc.createElement('article'),label=doc.createElement('p'),b=doc.createElement('button');label.textContent=`${r.memo} · ${formatIcp(BigInt(r.amount))}${r.state==='unknown'?' · outcome unknown':''}`;entry.append(label);
   if(r.backend===source.owner&&r.network===source.network&&r.owner&&r.recipient&&r.hex){b.textContent='View saved instructions';b.onclick=()=>{mode=r.action;id=r.cannon;deflectorId=r.structure??null;tileSelection=structureContexts()&&['start','deflect'].includes(r.action)?r.cell:null;cell=r.cell;worldAngle=r.angle??worldAngle;degrees=displayHeading(worldAngle);packet=r;keepPrevious=true;warning='Saved instructions may no longer apply. Review before using.';quantity=r.requested??1;cry=r.cry??'';cryProblem='';show('action','Saved instructions');refresh();};entry.append(b);}saved.push(entry);
  }
  if(!saved.length){const p=doc.createElement('p');p.textContent='No saved instructions.';saved.push(p);}$('saved-list').replaceChildren(...saved);
  const outcomes=new Map(history.cachedReceipts().map(r=>[String(r.position),{...r,cached:true}]));for(const r of receipts)outcomes.set(String(r.position),r);
  const entries=[...outcomes.values()].filter(r=>r.account===declaration?.account).slice(-64).reverse().map(r=>{const e=doc.createElement('article');e.textContent=`${receiptSummary(r)}${r.cached?' · cached history':' · verified'}`;const d=doc.createElement('details'),s=doc.createElement('summary'),p=doc.createElement('p');s.textContent='Record';p.textContent=`Ledger ${r.position} · ${formatIcp(BigInt(r.amount))}${r.cached?' · not newly verified':''}`;d.append(s,p);e.append(d);return e;});
  if(!entries.length){const p=doc.createElement('p');p.textContent='No retained outcomes for this account. Missing history does not prove failure.';entries.push(p);}$('receipt-list').replaceChildren(...entries);
 }
 function setDirections(){
  const buttons=[...doc.querySelectorAll('[data-deflector-orientation]')],successor=structureContexts();
  const orders=successor?Object.entries(SCREEN_ORIENTATIONS):[['NE','NE'],['SE','SE'],['SW','SW'],['NW','NW']];
  const names={N:'Canonical North',E:'Canonical East',S:'Canonical South',W:'Canonical West',NE:'Northeast',SE:'Southeast',SW:'Southwest',NW:'Northwest'};
  const current=orientationMode()?orientationFromDegrees(worldAngle??encodedHeading(degrees)):null;
  buttons.forEach((button,i)=>{
   const [label,value]=orders[i];
   if(button.dataset.deflectorOrientation!==value||button.textContent!==label){
    button.dataset.deflectorOrientation=value;button.textContent=label;
    button.setAttribute('aria-label',`${names[label]} (${label})`);button.title=names[label];
   }
   button.setAttribute('aria-pressed',String(value===current));
  });
 }
 let tileQuotesWorld,tileQuotesConfig,tileQuotesAccount;const tileQuotes=new Map();
 function tileBuildIssue(kind,target=tileSelection){
  if(!world||!config||!declaration)return 'Waiting for verified placement.';
  if(tileQuotesWorld!==world||tileQuotesConfig!==config||tileQuotesAccount!==declaration.account){
   tileQuotes.clear();tileQuotesWorld=world;tileQuotesConfig=config;tileQuotesAccount=declaration.account;
  }
  const key=kind+'/'+target;
  if(tileQuotes.has(key))return tileQuotes.get(key);
  let issue='';
  try{quoteV6(world,config,declaration.account,{kind,angle:'225',quantity:1,cell:target});}
  catch(error){issue=contextReason(error.message)??'That tile is unavailable for construction.';}
  if(tileQuotes.size===2048)tileQuotes.delete(tileQuotes.keys().next().value);
  tileQuotes.set(key,issue);return issue;

 }
 function buildReason(){try{quoteV6(world,config,declaration.account,{kind:'new',angle:'0',quantity:1,cell:null});return 'Choose an empty neighbouring tile.';}catch(e){return ({PLAYER_CANNON_CAPACITY:'Your cannon capacity is reached.',CANNON_CAPACITY:'Cannon capacity is reached.',BALL_CAPACITY:'Ball capacity reached.'})[e.message]??(mine().every(c=>c.dormant)?'Revive an island before building.':'No empty eligible neighbour is available.');}}
 function buildSites(){if(!(world?.version>=6)||!declaration)return[];if(sitesWorld===world&&sitesConfig===config&&sitesAccount===declaration.account&&sitesRevision===revision)return eligibleSites;sitesWorld=world;sitesConfig=config;sitesAccount=declaration.account;sitesRevision=revision;eligibleSites=legalAdjacentSites(world,declaration.account,config).filter(site=>{try{quoteV6(world,config,declaration.account,{kind:'new',angle:'0',quantity:1,cell:site});return true;}catch{return false;}});return eligibleSites;}
 function moveDestination(){
  const cannon=selected(),deflector=pickedDeflector(),c=deflector??cannon,successor=structureContexts();
  const key=[context,revision,declaration?.account,id,deflectorId].join('/');
  if(key===moveKey&&moveWorld===world&&moveConfig===config)return defaultMove;
  const sites=successor&&world?contextSites(world):null,moving={kind:deflector?'deflector':'cannon',id:c?.id};
  const facts=world?moveLegalityIdentity(world,config,declaration?.account,id,Boolean(c?.dormant)):null;
  const fingerprint=sites?[facts,deflectorId,sites.occupiedKey,sites.activeKey,world.deflectors.map(d=>[d.id,d.cell,d.owner].join(':')).join(',')].join('/'):facts;
  if(fingerprint!==null&&fingerprint===moveFingerprint){moveWorld=world;moveConfig=config;moveKey=key;return defaultMove;}
  moveFingerprint=fingerprint;
  moveSearch?.cancel();moveSearch=null;moveLegality=null;moveWorld=world;moveConfig=config;moveKey=key;moveReady=false;defaultMove=null;
  if(!c||c.dormant||!declaration||!world){moveReady=true;return null;}
  if(sites){
   const account=declaration.account,w=world,cfg=config;
   const legal=n=>deflector?!sites.reason(account,n,{moving,deflector:true}):legalMoveDestination(w,account,c.id,n,cfg);
   moveLegality={test:n=>Number.isSafeInteger(n)&&n>=0&&n<w.width*w.height&&legal(n)};
   const job=moveSearch=firstContextDestination(sites.candidates(account,moving,c.cell),moveLegality.test);
   job.promise.then(cell=>{if(moveSearch!==job||moveFingerprint!==fingerprint)return;defaultMove=cell;moveReady=true;refresh();});
   return null;
  }
  const w=world,cfg=config,account=declaration.account,cannonId=c.id;
  moveLegality=destinationLegality(w.width,w.height,cell=>w.version>=6?legalMoveDestination(w,account,cannonId,cell,cfg):cell!==c.cell&&c.owns(cell));
  const job=moveSearch=nearestDestination({width:w.width,height:w.height,source:c.cell,legal:moveLegality.test});
  job.promise.then(cell=>{if(moveSearch!==job||moveFingerprint!==fingerprint)return;defaultMove=cell;moveReady=true;refresh();});return null;
 }
 function deflectorDestination(){
  const c=selected(),key=[context,revision,declaration?.account,id].join('/');if(deflectWorld===world&&deflectConfig===config&&deflectKey===key)return defaultDeflect;
  deflectSearch?.cancel();deflectSearch=null;deflectLegality=null;deflectWorld=world;deflectConfig=config;deflectKey=key;deflectReady=false;defaultDeflect=null;
  if(!world||!c||!declaration||!deflectorSupported(config)){deflectReady=true;return null;}
  const sites=deflectorSites(world,config,declaration.account);if(!sites.available){deflectReady=true;return null;}
  deflectLegality=destinationLegality(world.width,world.height,sites.test);const job=deflectSearch=nearestDestination({width:world.width,height:world.height,source:c.cell,legal:deflectLegality.test});
  job.promise.then(cell=>{if(deflectSearch!==job)return;defaultDeflect=cell;deflectReady=true;refresh();});return null;
 }
 function defaultBuild(){const c=selected(),sites=buildSites();if(!c)return sites[0]??null;const near=cell=>cellDistance(c.cell,cell,world.width,world.height)===1&&(c.cell%world.width===cell%world.width||Math.floor(c.cell/world.width)===Math.floor(cell/world.width));return [...sites].sort((a,b)=>Number(near(b))-Number(near(a))||cellDistance(c.cell,a,world.width,world.height)-cellDistance(c.cell,b,world.width,world.height)||a-b)[0]??null;}
 function action(value){
  if(structureContexts()&&(pickedDeflector()||tileOwn()||selected()?.account===declaration?.account&&['ball','move'].includes(value))){
   return contextAction(value);
  }
  if(structureContexts()&&(value==='deflect'||value==='start'&&mine().length))return;
  if(value==='deflect'&&!deflectorSupported(config))return;
  cancelEntryNavigation();intentVersion++;
  if(!declaration){pending=value;api.openAccount();return;}
  if(value!=='start'&&selected()?.account!==declaration.account){if(mine().length===1)id=mine()[0].id;else{api.openRoster();return;}}
  if(value==='deflect'&&(deflectorDestination()===null||!deflectReady)){refresh();return;}
  if(value==='move'&&(moveDestination()===null||!moveReady)||value==='start'&&mine().length&&!buildSites().length){refresh();return;}
  if(view==='action'&&mode===value){rememberDraft();show('inspect',`Cannon #${id}`);refresh();return;}
  rememberDraft();const previousMode=mode;clearDraft();keepPrevious=false;mode=value;siteKey='';
  const saved=drafts.get(draftKey(value));
  if(saved){({cell,degrees,worldAngle}=saved);quantity=Number(saved.quantity);cry=saved.cry??'';cryProblem='';}
  else{cry='';cryProblem='';cell=null;if(value!=='move'&&previousMode!==value){worldAngle=storedHeadingForMemo(value==='start'&&!mine().length?40960:selected()?.heading??40960);degrees=displayHeading(worldAngle);}if(value==='start'){quantity=1;}}

  if(value==='move'&&(cell===null||!legalMoveDestination(world,declaration.account,id,cell,config)))cell=defaultMove;
  if(value==='start'&&mine().length&&(cell===null||!buildSites().includes(cell)))cell=defaultBuild();
  if(value==='deflect'){worldAngle=snappedDeflectorDegrees(worldAngle??encodedHeading(degrees));degrees=displayHeading(worldAngle);if(cell===null||!deflectorSites(world,config,declaration.account).test(cell))cell=defaultDeflect;}
  show('action',id===null?'New cannon':`Cannon #${id}`);refresh();
 }
 function contextAction(value){
  const d=pickedDeflector(),tile=tileOwn(),c=selected(),moving=['move','deflector_move'].includes(value);
  if(d&&(!deflectorOwn()||!['deflector_move','deflector_reorient'].includes(value)))return;
  if(tile&&(!['start','deflect'].includes(value)||tileBuildIssue(value==='start'?'new':'deflect')))return;
  if(!tile&&!d&&(!c||c.account!==declaration?.account||!['ball','move'].includes(value)))return;
  if(moving&&(moveDestination()===null||!moveReady)){refresh();return;}
  cancelEntryNavigation();intentVersion++;
  if(view==='action'&&mode===value&&value!=='ball'){show('inspect',title());return;}
  rememberDraft();clearDraft();keepPrevious=false;mode=value;siteKey='';
  const saved=drafts.get(draftKey(value));
  quantity=saved?.quantity??1;cry=saved?.cry??'';cryProblem='';composing=false;
  cell=tile?tileSelection:value==='deflector_reorient'?d.cell:moving?(saved?.cell!==null&&moveLegality?.test(saved?.cell)?saved.cell:defaultMove):null;
  worldAngle=saved?saved.worldAngle:d?deflectorDegrees(d.orientation):value==='deflect'?deflectorDegrees('NW'):storedHeadingForMemo(c?.heading??40960);
  degrees=saved?.degrees??displayHeading(worldAngle);
  show('action',title());
 }
 $('identity-form').addEventListener('submit',event=>{event.preventDefault();try{const returning=Boolean(entryPending),next=parseSendingAccount($('sending-account').value,$('identity-subaccount').value);if(next.account!==declaration?.account){cancelEntryNavigation();intentVersion++;packet=null;keepPrevious=false;warning='';id=null;tileSelection=deflectorId=null;mode='inspect';}if(next.account!==declaration?.account){cry='';cryProblem='';composing=false;}declaration=next;persist();if(!$('remember-account').checked)store?.forget();identityLabel();updateRoster();activity();text('identity-note','');if(returning){entryPending={generation:entryGeneration,account:next.account};show('account','Checking territory');resolveEntry();}else if(pending){const p=pending;pending=null;action(p);}else{show('account','Account');refresh();}}catch(error){text('identity-note',error.message);}});
 $('change-account').onclick=$('payer-change').onclick=()=>{show('account','Sending account');$('identity-form').hidden=false;$('account-summary').hidden=true;$('sending-account').value=declaration?.display??declaration?.principal??declaration?.account??'';$('identity-subaccount').value='';$('sending-account').focus();};
 $('identity-forget').onclick=()=>{cancelEntryNavigation();store?.forget();declaration=null;id=null;tileSelection=deflectorId=null;packet=null;warning='';pending=null;mode='inspect';identityLabel();activity();refresh();};
 $('cycles-display').onclick=()=>api.openStatus();
 $('identify-button').onclick=()=>api.openAccount();$('join-action').onclick=enter;$('fire-action').onclick=()=>action('ball');$('move-action').onclick=()=>action(pickedDeflector()?'deflector_move':'move');$('reorient-action').onclick=()=>action('deflector_reorient');$('build-action').onclick=()=>action('start');$('deflect-action').onclick=()=>action('deflect');
 for(const b of doc.querySelectorAll('[data-deflector-orientation]'))b.onclick=()=>api.setDeflectorOrientation(b.dataset.deflectorOrientation);
 for(const b of doc.querySelectorAll('[data-heading]'))b.onclick=()=>api.setHeading(Number(b.dataset.heading));
 $('join-direction').addEventListener('keydown',e=>{const n={ArrowLeft:-1,ArrowRight:1,ArrowUp:-1,ArrowDown:1}[e.key];if(n){api.adjustAngle(n*(e.altKey?.01:e.shiftKey?5:1));e.preventDefault();e.stopPropagation();}});
 function editCry(){
  if(composing)return;const value=$('war-cry').value;
  try{if(value.length>4096)throw Error('Shout is too long');if(value)fitCry('FIRE 1 0 1',value);cry=value;cryProblem='';keepPrevious=false;clearDraft();refresh();}
  catch(e){cryProblem=String(e.message).replaceAll('War Cry','Shout');text('war-cry-note',cryProblem);paymentReadiness();}
 }
 // Validate raw paste before the single-line input can silently replace newlines.
 $('war-cry').addEventListener('paste',e=>{const raw=e.clipboardData?.getData('text/plain');if(!raw)return;try{if(raw.length>4096)throw Error('Shout is too long');validateCry(raw);}catch(error){e.preventDefault();cryProblem=error.message.replaceAll('War Cry','Shout');text('war-cry-note',cryProblem);paymentReadiness();}});
 $('war-cry').addEventListener('input',editCry);
 $('war-cry').addEventListener('compositionstart',()=>{composing=true;paymentReadiness();});
 $('war-cry').addEventListener('compositionend',()=>{composing=false;editCry();});
 $('war-cry').addEventListener('keydown',e=>{e.stopPropagation();if(e.isComposing)return;if(e.key==='Enter'||e.key==='Escape'){e.preventDefault();$('war-cry').blur();}});
 for(const [name,step]of [['quantity-minus',-1],['quantity-plus',1]])$(name).onclick=()=>api.setQuantity(quantity+step);
 $('quantity-controls').addEventListener('keydown',e=>{if(e.key==='Escape'||e.key==='Tab')return;e.stopPropagation();const step={ArrowUp:1,ArrowRight:1,'+':1,ArrowDown:-1,ArrowLeft:-1,'-':-1}[e.key];if(step){e.preventDefault();api.setQuantity(quantity+step);}});


 $('replace-instructions').onclick=()=>{packet=null;keepPrevious=false;warning='';manual=null;$('manual-copy').hidden=true;text('copy-feedback','');refresh();};
 $('keep-instructions').onclick=()=>{if(!packet)return;keepPrevious=true;mode=packet.action;id=packet.cannon;deflectorId=packet.structure??null;tileSelection=structureContexts()&&['start','deflect'].includes(packet.action)?packet.cell:null;cell=packet.cell;worldAngle=packet.angle??worldAngle;degrees=displayHeading(worldAngle);quantity=packet.requested;cry=packet.cry??'';cryProblem='';composing=false;refresh();};
 function freeze(q,h){const saved=packet?.id&&instructionKey(packet)===instructionKey(q)?packet:h.freeze(q);if(q.backend===source?.owner&&q.account===declaration?.account){packet=saved;if(q.cannon!==null&&!refs.some(c=>c.id===q.cannon&&c.account===q.account))warning='The copied target is no longer present. Saved instructions remain in Account.';}activity();return saved;}
 function savedNote(h){return h.persisted()?'Instructions saved; no payment sent.':'Instructions kept for this visit only; device storage is unavailable. No payment sent.';}
 for(const b of copyControls)b.addEventListener('click',async()=>{
  refresh();if(!mayHandoff())return;const q=packet??quote,h=history,value=paymentCopyValue(q,b.dataset.copy);let fallback=null;busy=true;refresh();
  try{await navigator.clipboard.writeText(value);freeze(q,h);text('copy-feedback','Copied. '+savedNote(h));b.dataset.copied='true';setTimeout(()=>{delete b.dataset.copied;},1500);}
  catch{if(!paymentCurrent()||view!=='action'||instructionKey(packet??quote)!==instructionKey(q))return;manual=fallback={q,h,value,field:b.dataset.copy};$('manual-copy').hidden=false;$('manual-value').value=value;text('copy-feedback','Clipboard unavailable. Copy the exact value below.');}
  finally{
   busy=false;refresh();
   if(fallback&&manual===fallback&&mayHandoff()){$('manual-value').focus();$('manual-value').select();}
  }
 });
 // UX-08: native Copy bypasses clipboard.writeText (including the fallback).
 // Freeze conservatively on the event, without claiming that the OS write worked.
 // Keep the selected DOM intact so the browser's default copy can still complete.
 doc.addEventListener('copy',event=>{
  const active=doc.activeElement,selection=doc.getSelection(),range=selection?.rangeCount?selection.getRangeAt(0):null;
  const keys=[['owner','payment-owner'],['amount','transfer-amount'],['text','text-memo'],['payer','paying-account']],hits=keys.filter(([,name])=>range&&!selection.isCollapsed&&range.intersectsNode($(name))).map(([key])=>key);
  const fallback=manual&&active===$('manual-value'),full=active===$('full-recipient')||range&&!selection.isCollapsed&&range.intersectsNode($('full-recipient')),payer=active===$('full-payer')||range&&!selection.isCollapsed&&range.intersectsNode($('full-payer'));if(!fallback&&!full&&!payer&&!hits.length)return;
  const q=fallback?manual.q:packet??quote,h=fallback?manual.h:history;
  if(!mayHandoff()||!q||q.reason||!h){event.preventDefault();event.clipboardData?.setData('text/plain','');text('copy-feedback','Payment instructions temporarily unavailable.');return;}
  const value=fallback?manual.value:full?paymentCopyValue(q,'owner'):payer?paymentCopyValue(q,'payer'):hits.length===1?paymentCopyValue(q,hits[0]):`To ${q.owner}\n${formatIcp(BigInt(q.amount))}\nMemo ${q.memo}\nFrom ${q.payer??q.account}`;
  if(!event.clipboardData)return;event.preventDefault();event.clipboardData.setData('text/plain',value);freeze(q,h);text('copy-feedback',savedNote(h));refresh();
 });
 $('manual-handoff').onclick=()=>{if(!manual||instructionKey(manual.q)!==instructionKey(packet??quote)||!mayHandoff())return;const h=manual.h;freeze(manual.q,h);manual=null;$('manual-copy').hidden=true;text('copy-feedback',savedNote(h));refresh();};
 $('close-panel').onclick=()=>api.cancel();
 const api={
  render(w,c,s,root=''){
   const nextContext=`${s.network}:${s.owner}`;
   if(context!==nextContext){const firstContext=context===null;context=nextContext;if(!firstContext){cancelEntryNavigation();view=null;$('workspace').hidden=true;}store=identityStore(s.network,s.owner,storage);declaration=(firstContext&&declaration)||store.read();history=createHandoffs(storage,`B2Z-activity-v1:${context}`);packet=null;keepPrevious=false;warning='';id=null;tileSelection=deflectorId=null;mode='inspect';try{const raw=storage?.getItem(`B2Z-view-v1:${context}`);preferences=raw&&raw.length<4096?JSON.parse(raw):{};}catch{preferences={};}cameraState=declaration?.camera?.projection==='isometric-1'?declaration.camera:null;// Remembered navigation preference is not an explicit session selection.
 id=null;identityLabel();}
   const contextChanged=world&&structureContexts()!==contextSupported(c);
   world=w;config=c;source=s;
   if(contextChanged&&['action','inspect'].includes(view)){
    rememberDraft();view=null;mode='inspect';id=null;cell=tileSelection=deflectorId=null;$('workspace').hidden=true;keepPrevious=false;
   }
   if(deflectorId!==null&&!pickedDeflector()||tileSelection!==null&&!tileOwn()){
    view=null;mode='inspect';id=null;cell=tileSelection=deflectorId=null;$('workspace').hidden=true;
   }
   revision=root;try{destination=paymentDestination(s);}catch(error){destination=null;status={canPrepare:false,label:'Unable to verify destination'};warning=error.message;}
   refs=cannonReference(w,c);
   if(id!==null&&!refs.some(c=>c.id===id)){id=null;mode='inspect';if(packet)warning='The copied target is no longer present. Saved instructions remain in Account.';else{warning='';text('copy-feedback','');}if(view==='action'||view==='inspect'){show('roster','Choose a cannon');text('roster-note','The selected cannon is no longer present. Choose another.');}}
   updateRoster();activity();refresh();resolveEntry();
  },
  status(input){
   if(typeof input.worldReady==='boolean')observationReady=input.worldReady;
   status=input.resolved??experienceStatus({...input,world});
   if(!destination)status={...status,canPrepare:false};
   const waiting=status.kind==='connecting'&&!world;
   $('motion-wait').hidden=!waiting;
   if(waiting){$('motion-wait').dataset.kind='connecting';text('waiting-label',status.label);}
   text('arena-note',status.label);
   const indicator=$('status-button');
   if(indicator.dataset.kind!==status.kind)indicator.dataset.kind=status.kind;
   if(indicator.title!==status.label)indicator.title=status.label;
   const attention=['delivery','stale','operational','stopped','transition','source-error','protection','verification-error','render-error'].includes(status.kind);
   if(attention&&announcedStatus!==status.kind){announcedStatus=status.kind;text('status-announcement',status.label);}
   if(!attention&&announcedStatus!==null){announcedStatus=null;text('status-announcement','');}
   text('status-explanation',status.detail||status.label);
   paymentReadiness();resolveEntry();
   return{available:status.canPrepare,label:status.label};
  },
  action,structureContexts,
  selectCannon(n){
   const c=refs.find(c=>c.id===n);if(!c)return false;
   intentVersion++;rememberDraft();id=n;tileSelection=deflectorId=null;keepPrevious=false;mode='inspect';cell=null;clearDraft();persist();
   if(structureContexts()&&c.account===declaration?.account)contextAction('ball');else show('inspect',`Cannon #${n}`);
   return true;
  },
  selectDeflector(n){
   if(!structureContexts()||!world?.deflectors.some(d=>d.id===n))return false;
   intentVersion++;rememberDraft();id=tileSelection=null;deflectorId=n;cell=null;keepPrevious=false;mode='inspect';clearDraft();show('inspect',title());return true;
  },
  selectTile(n){
   if(!structureContexts()||!world||!contextSites(world).owns(declaration?.account,n)||contextSites(world).hasStructure(n))return false;
   intentVersion++;rememberDraft();id=deflectorId=null;tileSelection=n;cell=null;keepPrevious=false;mode='inspect';clearDraft();show('inspect',title());return true;
  },
  tileSelectable(n){return structureContexts()&&n!==null&&world&&contextSites(world).owns(declaration?.account,n)&&!contextSites(world).hasStructure(n);},
  selectedTile:()=>tileSelection,selectedDeflector:()=>deflectorId,
  cancel({entry=true}={}){if(entry)cancelEntryNavigation();intentVersion++;rememberDraft();if(['inspect','action'].includes(view))id=null;tileSelection=deflectorId=null;view=null;mode='inspect';cell=null;pending=null;$('workspace').hidden=true;manual=null;$('manual-copy').hidden=true;if(!packet){warning='';text('copy-feedback','');}emit();(opener?.isConnected&&opener!==doc.body&&opener.getClientRects().length?opener:$('board')).focus({preventScroll:true});},
  presentation(v){const c=selected(),displayed=v?.cannons.get(id),behind=Boolean(c&&(!displayed||displayed.cell!==c.cell));if(behind!==planningBehind){planningBehind=behind;refresh();}},
  quantity:()=>({count:quantity,maximum:MAX_QUANTITY,active:qtyActive()}),setQuantity(n){if(!Number.isSafeInteger(n)||n<1||n>MAX_QUANTITY)return false;if(n===quantity)return true;quantity=n;clearDraft();keepPrevious=false;refresh();return true;},
  enter,cancelEntryNavigation,entryState:()=>({generation:entryGeneration,pending:Boolean(entryPending),account:entryPending?.account??null}),
  hasCannon:n=>refs.some(c=>c.id===n),selectedCannon:()=>id,account:()=>declaration?.account??null,mode:()=>mode,canPay:()=>status.canPrepare,active:()=>view!==null,selected,angle:()=>degrees,context:()=>view,anchor:()=>view==='action'&&mode==='start'&&!mine().length?null:focusTarget(),
  intentContext:()=>[context,world?.version,declaration?.account,id,deflectorId,tileSelection,focusTarget()?.cell,mode,intentVersion].join('/'),revision:()=>revision,

  aimAt(dx,dy){
   if(orientationMode()){
    const angle=snappedDeflectorDegrees(Math.atan2(dy,dx)*180/Math.PI);
    if(angle===worldAngle)return;
    worldAngle=angle;degrees=displayHeading(angle);
    for(const button of doc.querySelectorAll('[data-deflector-orientation]'))button.setAttribute('aria-pressed',String(button.dataset.deflectorOrientation===orientationFromDegrees(angle)));
   }else{
    if(mode!=='ball'&&mode!=='start')return;
    const next=String(Math.round(worldToScreen(Math.atan2(dy,dx)*180/Math.PI)*100)/100%360);
    if(next===degrees&&worldAngle===null)return;
    degrees=next;worldAngle=null;
   }
   if(view==='action'&&mode==='start'&&!mine().length)for(const button of doc.querySelectorAll('[data-heading]'))button.setAttribute('aria-pressed',String(Number(degrees)===Number(button.dataset.heading)));
   keepPrevious=false;clearDraft();refreshAction();emit();
  },
  setDeflectorOrientation(value){if(!orientationMode()||!deflectorSupported(config)||!['NE','SE','SW','NW'].includes(value))return false;worldAngle=deflectorDegrees(value);degrees=displayHeading(worldAngle);keepPrevious=false;clearDraft();refresh();return true;},
  setHeading(value){if(!Number.isFinite(value))return;if(orientationMode()){worldAngle=snappedDeflectorDegrees(encodedHeading(String((value%360+360)%360)));degrees=displayHeading(worldAngle);keepPrevious=false;clearDraft();refresh();return;}degrees=String((value%360+360)%360);worldAngle=null;keepPrevious=false;clearDraft();refresh();},
  destinationState:()=>({ready:moveReady,cell:defaultMove,key:moveKey,stats:moveSearch?.stats,cacheBytes:moveLegality?.bytes,cacheInspections:moveLegality?.inspected()}),
  proposedAction:()=>Object.freeze({mode,cell,degrees,worldAngle,quantity,...(warCrySupported(config)?{cry}:{} )}),
  launchEditor:()=>({active:view==='action'&&(shoutActive()||orientationMode()&&deflectorSupported(config)||['ball','start'].includes(mode)&&(mode==='ball'||warCrySupported(config))),kind:orientationMode()?'orientation':!['ball','start'].includes(mode)?'action':'launch',cryActive:view==='action'&&shoutActive(),first:mode==='start'&&!mine().length}),
  adjustAngle(delta){if(orientationMode()){worldAngle=snappedDeflectorDegrees(Number(worldAngle??encodedHeading(degrees))+Math.sign(delta)*90);degrees=displayHeading(worldAngle);keepPrevious=false;clearDraft();refresh();return;}degrees=((Number(degrees)+delta+360)%360).toFixed(2);worldAngle=null;keepPrevious=false;clearDraft();refresh();},
  aim(){
   if(view!=='action'||!['ball','start','deflect','deflector_reorient'].includes(mode)||mode==='start'&&!mine().length)return null;
   const target=cell!==null&&['start','deflect','deflector_reorient'].includes(mode)?{id:null,cell}:selected();
   if(!target||mode==='start'&&mine().length&&(structureContexts()?tileBuildIssue('new',cell):!buildSites().includes(cell)))return null;
   if(mode==='deflect'&&(!deflectorSupported(config)||cell===null||(structureContexts()?tileBuildIssue('deflect',cell):!deflectorSites(world,config,declaration.account).test(cell))))return null;
   try{
    const m=transferMemo(worldAngle===null?encodedHeading(degrees):worldAngle),orientation=orientationMode()?orientationFromDegrees(worldAngle??encodedHeading(degrees)):null;
    return {cannon:target,angle:m.command.value*360/65536,heading:m.command.value,...(orientation?{kind:'deflect',orientation,direction:structureContexts()?screenDirection(orientation):orientation}:{})};
   }catch{return null;}
  },
  moveSelection(){
   if(view!=='action'||!world)return null;
   const c=selected(),d=pickedDeflector(),dimension={width:world.width,height:world.height},legal=n=>moveLegality?.test(n)??false;
   if(structureContexts()&&['start','deflect'].includes(mode)&&tileOwn()){
    return {...dimension,kind:mode==='start'?'new':'deflect',key:revision+'/'+mode+'/tile',legal:n=>!tileBuildIssue(mode==='start'?'new':'deflect',n),cells:[],cell,anchor:tileSelection};
   }
   if(mode==='deflector_move'&&d)return {...dimension,kind:'deflector_move',key:revision+'/deflector/'+d.id,deflector:d,legal,cells:[],cell};
   if(mode==='deflect'&&deflectorSupported(config))return {...dimension,kind:'deflect',key:revision+'/deflect/'+siteKey,legal:n=>deflectLegality?.test(n)??false,cells:[],cell,anchor:c?.cell};
   if(world?.version>=6&&mode==='start'&&mine().length)return {...dimension,kind:'new',key:revision+'/'+siteKey,cells:buildSites(),cell,anchor:c?.cell};
   return mode==='move'&&c?{...dimension,key:revision+'/'+id,id,cells:[],legal,cell,reference:world}:null;
  },
  chooseCell(n){
   const selection=api.moveSelection();
   if(selection&&n===null){cell=null;keepPrevious=false;clearDraft();refresh();return true;}
   if(!(selection?.legal?selection.legal(n):selection?.cells.includes(n))){
    const pending=structureContexts()&&['start','deflect'].includes(mode)?tileBuildIssue(mode==='start'?'new':'deflect',n):null;
    text('preparation-note',pending??(mode==='start'?'Choose an empty eligible neighbouring tile.':n===selected()?.cell?'Choose a different tile.':'That move is unavailable: check ownership, occupancy or dormancy.'));return false;
   }
   keepPrevious=false;cell=n;clearDraft();refresh();return true;
  },
  selectBall(){cancelEntryNavigation();intentVersion++;rememberDraft();id=null;tileSelection=deflectorId=null;view=null;mode='inspect';cell=null;pending=null;$('workspace').hidden=true;emit();},
  openAccount(){identityLabel();activity();updateRoster();show('account','Account');if(!declaration)$('sending-account').focus();},
  openRoster(){if(mine().length===1){api.selectCannon(mine()[0].id);if(!structureContexts())doc.dispatchEvent(new CustomEvent('b2z-locate'));}else{updateRoster();show('roster','My cannons');}},
  openActivity(){api.openAccount();$('saved-list').scrollIntoView({block:'nearest'});},
  openStatus(){show('status','Game status');},openHelp(){show('help','How to play');},
  receipts(value){receipts=value;history?.rememberReceipts(value,revision);if(view==='account')activity();},
  preferences(value){if(value){preferences={...preferences,...value};delete preferences.paused;try{storage?.setItem(`B2Z-view-v1:${context}`,JSON.stringify(preferences));}catch{}}return preferences;},
  camera(value){if(value){cameraState=value;persist();}return cameraState;},locate:()=>null
 };return api;
}
