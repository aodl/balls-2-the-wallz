/** UX-06. Operational hints never acquire certificate authority here. */
export function experienceStatus(input={}){
 const {verified=false,fresh=false,phase='LOADING',live=true,operational,operationalFresh=false,healthy=false,world,advancing=false,resynchronising=false,renderError=false}=input;
 const run=operational?.run,pace=input.pace??run?.pace;
 const source=operational?.source;
 const sourceOk=Boolean(source?.binding_checked&&!source.last_error?.length&&!run?.last_error?.length);
 const canPrepare=Boolean(live&&verified&&fresh&&operationalFresh&&healthy&&sourceOk&&run?.running&&!run?.world_transition&&pace?.admission_open!==false&&!renderError);
 const out=(kind,label,detail='')=>({kind,label,detail,canPrepare});
 if(renderError)return out('render-error','Arena unavailable','The renderer could not display the verified game.');
 if(phase==='ERROR')return out('verification-error','Unable to verify game','Payment preparation is disabled until verification succeeds.');
 if(!verified)return out('connecting','Verifying game');
 if(live&&(!fresh||!operationalFresh||input.deliveryError))return out('reconnecting','Reconnecting','Earlier verified motion may still be visible.');
 if(run&&!run.running)return out('stopped','Game paused',advancing?'Finishing earlier verified motion.':'Paused by the operator.');
 if(run?.world_transition)return out('transition','Game paused','Verifying a rules transition.');
 if(pace?.admission_open===false||pace?.mode==='ReserveProtection'){
  // Only an explicit observed durable in-flight funding phase supports this label.
  const funding=input.fundingActive===true;
  return out(funding?'refuelling':'protection',funding?'Refuelling':'Game paused · low energy',advancing?'Finishing earlier verified motion.':'Waiting for sufficient operating resources.');
 }
 if(live&&!sourceOk)return {...out('source-error','Payment processing unavailable'),canPrepare:false};
 const balls=world?.balls?.size??world?.balls?.length;
 const cannons=world?.cannons?.size??world?.cannons?.length;
 if(balls===0&&run?.idle)return out('idle',cannons?'No active balls':'Waiting for players');
 if(resynchronising)return out('resynchronising','Reconnecting','Returning to a recent verified view.');
 const slow=Number(pace?.supported_milli??pace?.nominal_milli??1000)<500;
 if(!advancing||['BUFFERING','STALLED'].includes(phase))return out('waiting',slow?'Waiting for next update · slow mode':'Waiting for next update',slow?'Motion is limited to verified coverage. Trickle can produce one tick per 100 seconds.':'No next verified motion is available yet.');
 return out(slow?'slow':'live',slow?'Slow':'Live',phase==='DEGRADED_BUFFER'?'Verified motion continues; the buffer is low.':'');
}
