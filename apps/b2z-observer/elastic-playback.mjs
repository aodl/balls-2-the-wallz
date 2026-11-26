import {OBSERVATION_DEADLINE_MS} from './bounded-observation.mjs';
/** UX-05/06. Advisory arrival estimate only; the pinned clock owns coverage. */
export function elasticPlayback(){
 let last=null,samples=[],deliveries=[],factor=1,nominal=null,identity=null,period=null;
 // Confidence includes observed delivery variability: a late request must not
 // erase usable cadence evidence before the measured delivery window elapses.
 function confidence(){return period===null?null:3*period+2*Math.max(0,...deliveries);}
 function jitter(){return samples.length<2?0:Math.max(...samples)-Math.min(...samples);}
 function reset(){last=null;samples=[];deliveries=[];factor=1;period=null;nominal=null;identity=null;}
 return{reset,observe({key,end,at,nominal:rate,ticks,deliverySeconds=0,identity:context=''}={}){
  if(!Number.isFinite(end)||!Number.isFinite(at)||end<0||at<0||!Number.isFinite(rate)||!Number.isFinite(ticks)||!(rate>0)||!(ticks>0))return false;
  if(nominal!==rate||identity!==context){reset();nominal=rate;identity=context;}
  if(last&&(key===last.key||end<=last.end||at<=last.at))return false;
  if(last){const elapsed=(at-last.at)/1000,progress=end-last.end; samples.push(elapsed*ticks/progress);if(samples.length>8)samples.shift();}
  deliveries.push(Number.isFinite(deliverySeconds)?Math.max(0,deliverySeconds):0);if(deliveries.length>8)deliveries.shift();last={key,end,at,ticks};const ordered=[...samples].sort((a,b)=>a-b);period=samples.length>=2?Math.max(ticks/rate,ordered[Math.floor(ordered.length/2)]):null;return true;
 },rate({now,nominal:rate,remaining,seconds,reserveTicks=0}={}){
  if(!Number.isFinite(rate)||!(rate>0))return 0;
  if(!Number.isFinite(remaining)||remaining<0||nominal!==rate||!last||!period||!Number.isFinite(now)||now<last.at||now-last.at>confidence()*1000){factor=1;return rate;}
  const until=period-(now-last.at)/1000,horizon=until>0?until:period;
  const reserve=Math.max(Number.isFinite(reserveTicks)?Math.max(0,reserveTicks):0,rate*Math.max(jitter(),0,...deliveries));
  const desired=Math.max(.5,Math.min(1.5,Math.max(0,remaining-reserve)/horizon/rate));
  const step=.12*Math.max(0,Math.min(1,Number.isFinite(seconds)?seconds:0));factor+=Math.max(-step,Math.min(step,desired-factor));return rate*factor;
 },fastSingleTickRate({now,remaining,seconds,current,supported=1,nominalMilli=1000,ticks=1,catchingUp=false}){
  // A one-tick Normal stream can spend a whole interval fetching its next
  // verified artifact. Build a small lead while motion is still available.
  if(nominalMilli!==1000||ticks!==1||!(supported>0&&supported<=1))return null;
  const sampled=nominal===supported&&last!==null;
  const age=last===null?0:now-last.at;
  // The HTTP deadline bounds an individual request. Authenticated catch-up
  // may still need more than one bounded query before admitting its next tick.
  if(remaining<=.005||!catchingUp&&age>=OBSERVATION_DEADLINE_MS)return null;
  const horizon=sampled?Math.max(1.5,Math.min(2.5,1+Math.max(0,...deliveries))):2;
  const previous=Number.isFinite(current)?Math.max(.45*supported,Math.min(1.15*supported,current)):.5*supported;
  // Expired cadence evidence cannot justify spending the last verified
  // coverage faster. Keep the same drain cap until a new head arrives or the
  // remaining motion naturally reaches the existing exhaustion threshold.
  if(!sampled||age>1000*(confidence()??4))return Math.min(remaining/horizon,previous);
  const incoming=period?Math.min(supported,1/period):.55*supported;
  const desired=Math.max(.48*supported,Math.min(1.15*supported,incoming+.16*(remaining-horizon-1)));
  const slew=.25*Math.max(0,Math.min(1,seconds));
  return Math.min(remaining/horizon,previous+Math.max(-slew,Math.min(slew,desired-previous)));
 },state(){return{samples:samples.length,factor,expected_period_seconds:period,confidence_seconds:confidence(),arrival_jitter_seconds:jitter(),max_delivery_seconds:Math.max(0,...deliveries),last_distinct_at:last?.at??null};}};
}
