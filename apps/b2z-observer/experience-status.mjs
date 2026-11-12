/** UX-06. Operational hints never acquire certificate authority here. */
export function experienceStatus(input={}){
 const {verified=false,fresh=false,phase='LOADING',live=true,operational,operationalFresh=false,healthy=false,world,advancing=false,resynchronising=false,renderError=false}=input;
 const run=operational?.run,pace=input.pace??run?.pace;
 const source=operational?.source;
 const sourceOk=Boolean(source?.binding_checked&&!source.last_error?.length&&!run?.last_error?.length);
 const canPrepare=Boolean(live&&verified&&fresh&&operationalFresh&&healthy&&sourceOk&&run?.running&&!run?.world_transition&&pace?.admission_open!==false&&!renderError&&!input.deliveryError&&!input.failureKind);
 const out=(kind,label,detail='')=>({kind,label,detail,canPrepare});
 if(renderError)return out('render-error','Arena unavailable','The renderer could not display the verified game.');
 if(input.failureKind==='verification'||phase==='ERROR'&&input.failureKind!=='delivery')return out('verification-error','Unable to verify game data.','Gameplay and payment instructions cannot safely be updated. Retry verification to start a fresh authenticated session; saved instructions are retained.');
 if(input.failureKind==='delivery'||input.deliveryError||live&&verified&&!fresh)return out('reconnecting','Reconnecting','Temporarily unable to reach the game. Retrying automatically.');
 if(!verified)return out('connecting','Catching up with on-chain activity ...');
 if(!live)return input.trust==='certificate'?out('recording','Verified recording','Finite playback from a pinned disposable IC certificate.'):out('replay','Replay · offline','Content consistency only; not IC-certified.');
 if(run&&!run.running)return out('stopped','Game paused',advancing?'Finishing earlier verified motion.':'Paused by the operator.');
 if(run?.world_transition)return out('transition','Game paused','Verifying a rules transition.');
 if(live&&operational&&!sourceOk)return {...out('source-error','Payment processing unavailable','Source verification or processing needs attention.'),canPrepare:false};
 if(pace?.admission_open===false||pace?.mode==='ReserveProtection'){
  // Only an explicit observed durable in-flight funding phase supports this label.
  const funding=input.fundingActive===true;
  return out(funding?'refuelling':'protection',funding?'Refuelling':'Game paused · low energy',advancing?'Finishing earlier verified motion.':'Waiting for sufficient operating resources.');
 }
 const balls=world?.balls?.size??world?.balls?.length;
 const cannons=world?.cannons?.size??world?.cannons?.length;
 if(balls===0)return out('idle',cannons?'No active balls':'Waiting for players',advancing?'Finishing earlier verified motion.':'');
 if(resynchronising||input.catchingUp)return out('catching-up','Catching up with on-chain activity ...','Presenting available authenticated history.');
 const slow=Number(pace?.supported_milli??pace?.nominal_milli??1000)<500;
 if(phase==='PAUSED')return out('paused','Playback paused');
 if(!advancing||['BUFFERING','STALLED'].includes(phase))return out('waiting','Waiting for next on-chain update',slow?'Motion is limited to verified coverage. Trickle can produce one tick per 100 seconds.':'No next verified motion is available yet.');
 if(input.presentationLagSeconds>10)return out(slow?'slow':'live',slow?'Slow · delayed':'Live · delayed','Playing earlier verified activity. Wallet instructions use the latest authenticated state.');
 return out(slow?'slow':'live',slow?'Slow':'Live',phase==='DEGRADED_BUFFER'?'Verified motion continues; the buffer is low.':'');
}
/** Payment readiness changes immediately; brief delivery labels are debounced. */
export function experienceResolver({delayMs=700,holdMs=1200}={}){
 let previous=null,pendingAt=null,shownAt=null;
 return(input,now)=>{
  const current=experienceStatus(input);
  if(current.kind==='reconnecting'){
   pendingAt??=now;
   if(previous&&!['connecting','reconnecting','verification-error'].includes(previous.kind)&&now-pendingAt<delayMs)return{...previous,canPrepare:current.canPrepare};
   if(previous?.kind!=='reconnecting')shownAt=now;
  }else{
   pendingAt=null;
   if(previous?.kind==='reconnecting'&&current.kind!=='verification-error'&&now-(shownAt??-Infinity)<holdMs)return{...previous,canPrepare:current.canPrepare};
   shownAt=null;
  }
  previous=current;return current;
 };
}
