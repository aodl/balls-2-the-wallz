/** UX-04/05. A skip is only through retained verified coverage, never simulation. */
export function recentPresentationPoint({playhead,available},rate,gapSeconds){
 if(![playhead,available,rate,gapSeconds].every(Number.isFinite)||available<playhead)return playhead;
 const elapsed=Math.max(0,gapSeconds)*Math.max(0,rate),recent=available-Math.max(0,rate)*2;
 return Math.min(available,Math.max(playhead,gapSeconds>2?recent:Math.min(playhead+elapsed,recent)));
}
/** A received response does not make an old certificate fresh. Use both clocks. */
export function freshObservation(s,now,wallNow=Date.now()){
 if(!Number.isFinite(s?.certifiedAt)||now<s.certifiedAt)return false;
 const monotonicAge=now-s.certifiedAt+Math.max(0,s.certificateAgeMs??0);
 const ns=s.certificateTimeNs,wallAge=typeof ns==='string'&&/^\d{1,20}$/.test(ns)?Math.max(0,wallNow-Number(BigInt(ns)/1000000n)):monotonicAge;
 return Math.max(monotonicAge,wallAge)<30000;
}
export function operationalReplyCurrent(s,generation,started,now){return(s.lifecycleGeneration??0)===generation&&now>=started&&now-started<15000;}
