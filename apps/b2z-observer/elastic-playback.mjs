/** UX-05/06. Advisory arrival estimate only; the pinned clock owns coverage. */
export function elasticPlayback(){
 let last=null,samples=[],deliveries=[],factor=1,nominal=null,identity=null,period=null;
 function reset(){last=null;samples=[];deliveries=[];factor=1;period=null;nominal=null;identity=null;}
 return{reset,observe({key,end,at,nominal:rate,ticks,deliverySeconds=0,identity:context=''}={}){
  if(!Number.isFinite(end)||!Number.isFinite(at)||end<0||at<0||!Number.isFinite(rate)||!Number.isFinite(ticks)||!(rate>0)||!(ticks>0))return false;
  if(nominal!==rate||identity!==context){reset();nominal=rate;identity=context;}
  if(last&&(key===last.key||end<=last.end||at<=last.at))return false;
  if(last){const elapsed=(at-last.at)/1000,progress=end-last.end; samples.push(elapsed*ticks/progress);if(samples.length>8)samples.shift();}
  deliveries.push(Number.isFinite(deliverySeconds)?Math.max(0,deliverySeconds):0);if(deliveries.length>8)deliveries.shift();last={key,end,at,ticks};const ordered=[...samples].sort((a,b)=>a-b);period=samples.length>=2?Math.max(ticks/rate,ordered[Math.floor(ordered.length/2)]):null;return true;
 },rate({now,nominal:rate,remaining,seconds,reserveTicks=0}={}){
  if(!Number.isFinite(rate)||!(rate>0))return 0;
  if(!Number.isFinite(remaining)||remaining<0||nominal!==rate||!last||!period||!Number.isFinite(now)||now<last.at||now-last.at>period*3000){factor=1;return rate;}
  const until=period-(now-last.at)/1000,horizon=until>0?until:period;
  const reserve=Math.max(Number.isFinite(reserveTicks)?Math.max(0,reserveTicks):0,rate*Math.max(0,...deliveries));
  const desired=Math.max(.5,Math.min(1.5,Math.max(0,remaining-reserve)/horizon/rate));
  const step=.12*Math.max(0,Math.min(1,Number.isFinite(seconds)?seconds:0));factor+=Math.max(-step,Math.min(step,desired-factor));return rate*factor;
 },state(){return{samples:samples.length,factor,expected_period_seconds:period,max_delivery_seconds:Math.max(0,...deliveries),last_distinct_at:last?.at??null};}};
}
