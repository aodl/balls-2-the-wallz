/** Strict supplemental event/receipt binding; no new trust source. */
import {validateCry,memoByteLength}from'../../packages/protocol/war-cry.mjs';
import {WAR_CRY_IDENTITY}from'./torus-identity.generated.mjs';
export function launchAnnotationValidator(receipts,identity){
 const seen=new Set(),supported=Object.keys(WAR_CRY_IDENTITY).every(k=>identity?.[k]===WAR_CRY_IDENTITY[k]);
 let byPosition=null;
 return e=>{
  if(e.launch_annotation===undefined)return;if(!byPosition){byPosition=new Map(receipts.map(r=>[String(r.position),r]));if(byPosition.size!==receipts.length)throw Error('observer: repeated annotation receipt');}const a=e.launch_annotation,cannon=typeof e.cannon==='object'?e.cannon.id:e.cannon,r=byPosition.get(String(a?.position));
  if(!supported||!['ball_spawned','cannon_spawned'].includes(e.kind)||!e.ball||!a||Object.keys(a).sort().join()!=='account,cry,position,version'||a.version!==1||typeof a.position!=='bigint'||a.position<0n||a.position>18446744073709551615n||!/^[0-9a-f]{64}$/.test(a.account)||typeof a.cry!=='string'||memoByteLength(a.cry)>31||!r||r.account!==a.account||r.cannon!==cannon||!Number.isSafeInteger(r.actual_quantity)||r.actual_quantity<1||r.actual_quantity>64||typeof r.position!=='bigint'||!['applied','partially_applied'].includes(r.status)||seen.has(String(a.position)))throw Error('observer: launch annotation binding');
  validateCry(a.cry);if(typeof e.cannon==='object'&&e.cannon.account!==a.account)throw Error('observer: launch annotation account');seen.add(String(a.position));
 };
}
export function validateLaunchAnnotations(events,receipts,identity){const check=launchAnnotationValidator(receipts,identity);for(const e of events)check(e);}

