import {parseShoutMemo} from '../../packages/protocol/shout.mjs';
import {DEFLECTOR_HEADINGS} from '../../packages/protocol/deflector-orientation.generated.mjs';

export const MAX_MANUFACTURING_SITES = 2;
const VISUAL_LIFETIME_MS = 15 * 60 * 1000;
const EMPTY = Object.freeze([]);
const pendingLabels = {
 'Submitting':'Submission in progress',
 'Outcome unknown':'Payment outcome unknown',
 'Ledger confirmed':'Payment sent, awaiting the game',
};

function placement(bytes){
 try{
  const {command}=parseShoutMemo(bytes);
  if(!Number.isSafeInteger(command.cell))return null;
  if(command.kind==='new')return {kind:'cannon',cell:command.cell,heading:command.angle};
  if(command.kind==='deflect')return {kind:'deflector',cell:command.cell,heading:DEFLECTOR_HEADINGS[command.orientation]};
 }catch{/* Saved commands can belong to older game rules. */}
 return null;
}

export function preparedConstruction(record){
 if(!['start','deflect'].includes(record.action)||record.state!=='copied'||!Number.isFinite(record.prepared_at))return null;
 const site=placement(new TextEncoder().encode(record.memo));
 return site&&{...site,key:'manual/'+record.id,account:record.account,backend:record.backend,
  at:record.prepared_at,label:'Construction planned in wallet instructions',targetId:null};
}

// The payment UI supplies a receipt only after its existing exact journal
// verification has bound the Ledger position and complete transfer tuple.
export function signedConstruction(item,account,receipt){
 const label=pendingLabels[item.state];
 if(!label&&item.state!=='Game outcome verified')return null;
 const site=placement(Uint8Array.from(item.memo.match(/../g),byte=>parseInt(byte,16)));
 if(!site||!account)return null;
 let targetId=null;
 if(receipt){
  if(!['applied','partially_applied'].includes(receipt.status))return null;
  if(site.kind==='cannon'&&receipt.kind==='purchase_completed'&&receipt.new_cannon===true)targetId=receipt.cannon;
  if(site.kind==='deflector'&&receipt.kind==='deflector_built'&&receipt.structure?.cell===site.cell&&
     DEFLECTOR_HEADINGS[receipt.structure.orientation]===site.heading)targetId=receipt.structure.id;
  if(!Number.isSafeInteger(targetId)||targetId<1)return null;
 }else if(!label)return null;
 return {...site,key:'signed/'+item.id,account,backend:item.backend,at:Number(BigInt(item.created_at_time)/1000000n),
  label:targetId===null?label:'Construction verified, awaiting playback',targetId};
}

function occupies(structures,cell){
 if(structures)for(const structure of structures.values())if(structure.cell===cell)return true;
 return false;
}

export function constructionPresentation(){
 let manual=EMPTY,signed=EMPTY;
 const dismissed=new Set();
 function dismiss(key){
  dismissed.add(key);
  if(dismissed.size>64)dismissed.delete(dismissed.values().next().value);
 }
 return {
  manual(records){manual=records.map(preparedConstruction).filter(Boolean);},
  signed(sites){signed=sites;},
  dismiss,
  hasPlan(record,now=Date.now()){
   const plan=preparedConstruction(record);
   return Boolean(plan&&now-plan.at<VISUAL_LIFETIME_MS&&!dismissed.has(plan.key));
  },
  sites(view,account,backend,now=Date.now()){
   if(!account||!view||!manual.length&&!signed.length)return EMPTY;
   const sites=[],cells=new Set(),signedCells=new Set();
   const eligible=p=>p.account===account&&p.backend===backend&&p.at<=now&&now-p.at<VISUAL_LIFETIME_MS;
   for(const plan of signed)if(eligible(plan))signedCells.add(plan.cell);
   for(const candidates of [signed,manual])for(const plan of candidates){
    if(!eligible(plan)||dismissed.has(plan.key)||cells.has(plan.cell)||candidates===manual&&signedCells.has(plan.cell))continue;
    const structures=plan.kind==='cannon'?view.cannons:view.deflectors;
    if(plan.targetId!==null&&structures?.has(plan.targetId)||occupies(view.cannons,plan.cell)||occupies(view.deflectors,plan.cell)){
     // Occupancy suppresses a local ghost. Only the verified signed receipt
     // carries an entity ID or a successful outcome.
     dismiss(plan.key);
     continue;
    }
    cells.add(plan.cell);
    sites.push(plan);
    if(sites.length===MAX_MANUFACTURING_SITES)return sites;
   }
   return sites.length?sites:EMPTY;
  },
 };
}
