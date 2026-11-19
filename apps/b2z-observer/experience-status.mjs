/** UX-06. Operational hints never acquire certificate authority here. */
export function experienceStatus(input={}){
 const {verified=false,fresh=false,phase='LOADING',live=true,operational,operationalFresh=false,healthy=false,world,advancing=false,resynchronising=false,renderError=false}=input;
 const run=operational?.run,pace=input.pace??run?.pace;
 const source=operational?.source;
 const sourceOk=Boolean(source?.binding_checked&&!source.last_error?.length&&!run?.last_error?.length);
 const integrityFailure=input.failureKind==='verification'||phase==='ERROR'&&input.failureKind!=='delivery';
 const canPrepare=Boolean(live&&verified&&fresh&&operationalFresh&&healthy&&sourceOk&&run?.running&&!run?.world_transition
  &&pace?.admission_open!==false&&pace?.mode!=='ReserveProtection'&&!renderError&&!integrityFailure&&!input.authorityPending&&!input.deliverySustained);
 const out=(kind,label,detail='')=>({kind,label,detail,canPrepare});
 if(renderError)return out('render-error','Arena unavailable','The renderer could not display the verified game.');
 if(integrityFailure)return out('verification-error','Unable to verify game data.','Gameplay and payment instructions cannot safely be updated. Retry verification to start a fresh authenticated session; saved instructions are retained.');
 if(!verified)return input.failureKind==='delivery'
  ?out('delivery','Connection delayed · retrying','The first verified game state is still being acquired.')
  :out('connecting','Catching up with on-chain activity ...');
 if(live&&(input.deliverySustained||input.deliveryError&&!fresh))return out('delivery','Connection delayed · retrying','The last verified game remains available. Payment copying is temporarily unavailable.');
 if(live&&(!fresh||input.authorityPending))return out('stale','Verification delayed','Payment copying is unavailable until the latest game state is verified.');
 if(!live)return input.trust==='certificate'?out('recording','Verified recording','Finite playback from a pinned disposable IC certificate.'):out('replay','Replay · offline','Content consistency only; not IC-certified.');
 if(run&&!run.running)return out('stopped','Game paused',advancing?'Finishing earlier verified motion.':'Paused by the operator.');
 if(run?.world_transition)return out('transition','Game paused','Verifying a rules transition.');
 if(live&&operational&&!sourceOk)return {...out('source-error','Payment processing unavailable','Source verification or processing needs attention.'),canPrepare:false};
 if(pace?.admission_open===false||pace?.mode==='ReserveProtection'){
  // Only an explicit observed durable in-flight funding phase supports this label.
  const funding=input.fundingActive===true;
  return out(funding?'refuelling':'protection',funding?'Refuelling':'Game paused · low energy',advancing?'Finishing earlier verified motion.':'Waiting for sufficient operating resources.');
 }
 if(!operationalFresh)return out('operational','Copy unavailable','Waiting for current payment-processing status. You can inspect the world and edit your proposal.');
 const balls=world?.balls?.size??world?.balls?.length;
 const cannons=world?.cannons?.size??world?.cannons?.length;
 if(balls===0)return out('idle',cannons?'No active balls':'Waiting for players',advancing?'Finishing earlier verified motion.':'');
 if(resynchronising||input.catchingUp||input.presentationLagSeconds>10)return out('delayed','Playback delayed','Presenting earlier verified activity. Payment authority uses the latest authenticated state.');
 const slow=Number(pace?.supported_milli??pace?.nominal_milli??1000)<500;
 if(phase==='PAUSED')return out('paused','Playback paused');
 if(!advancing||['BUFFERING','STALLED'].includes(phase))return out('waiting','Waiting for next on-chain update',slow?'Motion is limited to verified coverage. Trickle can produce one tick per 100 seconds.':'No next verified motion is available yet.');
 return out(slow?'slow':'live',slow?'Slow':'Live',phase==='DEGRADED_BUFFER'?'Verified motion continues; the buffer is low.':'');
}
