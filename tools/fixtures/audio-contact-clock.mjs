/** A queued RAF timestamp can precede the gesture's performance.now() sample.
 * Keep this controlled fixture inside its authenticated segment time bounds. */
export function contactFixtureTime(frameNow,startNow,segmentStart,segmentEnd){
 return Math.max(segmentStart,Math.min(segmentEnd,(frameNow-startNow)/100000));
}
