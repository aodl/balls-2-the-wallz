/** BTZ presentation projection v1. Does not alter BTZ v3 state, scores or audit events.
 * The preceding committed snapshot supplies starting positions and board ownership.
 * Sequence numbers intentionally retain gaps: these are source-event identities.
 */
import {encodeCanonical} from '../../../node_modules/@dtr/timeline-runtime/packages/runtime/canonical.mjs';
import {sha256} from '../../../node_modules/@dtr/timeline-runtime/packages/runtime/seal.mjs';
import {projectAnimationEvents} from './animation-projection.mjs';
import {decodeWorld} from './world.mjs';
export const ANIMATION_FORMAT='btz-animation-1';
export const trajectory=b=>({id:b.id,owner:b.owner,x0:b.x0,y0:b.y0,vx:b.vx,vy:b.vy});
/** Only committed, integrity-checked source records may be projected by a host. */
export function projectAnimation(initialState,sourceEvents){
  const projected=projectAnimationEvents(decodeWorld(initialState),sourceEvents);
  const data={version:1,format:ANIMATION_FORMAT,initial_state_hash:sha256(initialState),source_events_hash:sha256(sourceEvents),
    receipts:projected.receipts,events:projected.events};
  return {format:ANIMATION_FORMAT,bytes:encodeCanonical(data),statistics:projected.statistics};
}
