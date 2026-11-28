/** Strict supplemental event/receipt binding; no new trust source. */
import {validateCry,memoByteLength}from'../../packages/protocol/war-cry.mjs';
import {WAR_CRY_IDENTITY,COMBINED_IDENTITY,DEFLECTOR_IDENTITY,CONTEXT_IDENTITY,SHOUT_IDENTITY,SPACING_IDENTITY,RESERVOIR_IDENTITY,ECONOMY_IDENTITY,DELEGATED_IDENTITY,COMPACT_RESERVOIR_IDENTITY,RULES20_IDENTITY}from'./torus-identity.generated.mjs';
export function launchAnnotationValidator(receipts,identity){
 const matches=expected=>Object.keys(expected).every(k=>identity?.[k]===expected[k]);
 const seen=new Set(),shout=matches(SHOUT_IDENTITY)||matches(SPACING_IDENTITY)||matches(RESERVOIR_IDENTITY)||matches(ECONOMY_IDENTITY)||matches(DELEGATED_IDENTITY)||matches(COMPACT_RESERVOIR_IDENTITY)||matches(RULES20_IDENTITY),supported=shout||[WAR_CRY_IDENTITY,COMBINED_IDENTITY,DEFLECTOR_IDENTITY,CONTEXT_IDENTITY].some(matches);
 let byPosition=null;
 return e=>{
  if(e.action_annotation!==undefined){
   if(!byPosition){byPosition=new Map(receipts.map(r=>[String(r.position),r]));if(byPosition.size!==receipts.length)throw Error('observer: repeated annotation receipt');}
   const a=e.action_annotation,r=byPosition.get(String(a?.position)),cannon=e.kind==='cannon_moved';
   const kind=cannon?'cannon':['deflector_built','deflector_moved','deflector_reoriented'].includes(e.kind)?'deflector':null;
   if(!shout||!kind||!a||Object.keys(a).sort().join()!=='account,cell,cry,id,kind,position,version'||e.launch_annotation!==undefined||
     a.version!==1||a.kind!==kind||typeof a.position!=='bigint'||a.position<0n||a.position>18446744073709551615n||
     !Number.isSafeInteger(a.id)||a.id<1||!Number.isSafeInteger(a.cell)||a.cell<0||a.cell>=1000000||
     !r||r.kind!==e.kind||r.position!==a.position||r.account!==a.account||!/^[0-9a-f]{64}$/.test(a.account)||
     r.reason!=='ACCEPTED'||r.status!=='applied'||seen.has(String(a.position))||
     (cannon?e.cannon!==a.id||r.cannon!==a.id||e.after!==a.cell||r.after!==a.cell:
      e.structure?.id!==a.id||r.structure?.id!==a.id||e.structure?.cell!==a.cell||r.structure?.cell!==a.cell)||
     typeof a.cry!=='string'||memoByteLength(a.cry)>31)throw Error('observer: action annotation binding');
   validateCry(a.cry);seen.add(String(a.position));return;
  }
  if(e.launch_annotation===undefined)return;if(!byPosition){byPosition=new Map(receipts.map(r=>[String(r.position),r]));if(byPosition.size!==receipts.length)throw Error('observer: repeated annotation receipt');}const a=e.launch_annotation,cannon=typeof e.cannon==='object'?e.cannon.id:e.cannon,r=byPosition.get(String(a?.position));
  if(!supported||!['ball_spawned','cannon_spawned'].includes(e.kind)||!e.ball||!a||Object.keys(a).sort().join()!=='account,cry,position,version'||a.version!==1||typeof a.position!=='bigint'||a.position<0n||a.position>18446744073709551615n||!/^[0-9a-f]{64}$/.test(a.account)||typeof a.cry!=='string'||memoByteLength(a.cry)>31||!r||r.account!==a.account||r.cannon!==cannon||!Number.isSafeInteger(r.actual_quantity)||r.actual_quantity<1||r.actual_quantity>64||typeof r.position!=='bigint'||!['applied','partially_applied'].includes(r.status)||seen.has(String(a.position)))throw Error('observer: launch annotation binding');
  validateCry(a.cry);if(typeof e.cannon==='object'&&e.cannon.account!==a.account)throw Error('observer: launch annotation account');seen.add(String(a.position));
 };
}
export function validateLaunchAnnotations(events,receipts,identity){const check=launchAnnotationValidator(receipts,identity);for(const e of events)check(e);}

