/** UX-04/05. A skip is only through retained verified coverage, never simulation. */
export function recentPresentationPoint({playhead,available},rate,gapSeconds){
 if(![playhead,available,rate,gapSeconds].every(Number.isFinite)||available<playhead)return playhead;
 const elapsed=Math.max(0,gapSeconds)*Math.max(0,rate),recent=available-Math.max(0,rate)*2;
 return Math.min(available,Math.max(playhead,gapSeconds>2?recent:Math.min(playhead+elapsed,recent)));
}
