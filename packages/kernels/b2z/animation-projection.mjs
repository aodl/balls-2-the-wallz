/** Shared deterministic B2Z presentation projection. Hash binding and codecs
 * remain the responsibility of the caller's environment. */
import {cmp} from './math.mjs';
import {decodeCanonical} from '../../../node_modules/@dtr/timeline-runtime/packages/runtime/canonical.mjs';

const trajectory=b=>({id:b.id,owner:b.owner,x0:b.x0,y0:b.y0,vx:b.vx,vy:b.vy});
const same=(a,b)=>a&&['id','owner','x0','y0','vx','vy'].every(k=>a[k]===b[k]);

export function projectAnimationEvents(world,sourceEvents){
  if(!world||![3,4,5,6].includes(world.version)||!Array.isArray(world.balls))throw new Error('B2Z animation initial state');
  const source=decodeCanonical(sourceEvents);
  if(source.version!==world.version||!Array.isArray(source.events)||source.events.length>131072||!Array.isArray(source.receipts))
    throw new Error('B2Z animation source version/bounds');
  const tracks=new Map(world.balls.map(b=>[b.id,trajectory(b)])),events=[];
  let prior=world.time,seq=-1,dropped=0;
  for(const e of source.events){
    if(!Number.isSafeInteger(e.sequence)||e.sequence!==seq+1||cmp(e.time,prior)<0)throw new Error('B2Z animation event order');
    prior=e.time;seq=e.sequence;
    if(e.kind==='motion'){
      const next=trajectory(e.ball_state),old=tracks.get(e.ball);
      if(!old||next.id!==e.ball||old.owner!==next.owner)throw new Error('B2Z animation unknown/changed ball');
      tracks.set(e.ball,next);
      if(same(old,next)&&!e.vertex_blocked){dropped++;continue;}
      events.push({kind:'trajectory',sequence:e.sequence,time:e.time,ball:next,vertex_blocked:e.vertex_blocked});
    }else{
      if(e.kind==='ball_spawned'||e.kind==='cannon_spawned'){
        if(tracks.has(e.ball.id))throw new Error('B2Z animation duplicate ball');
        tracks.set(e.ball.id,trajectory(e.ball));
      }
      if(world.version===6&&['capture_annihilation','annihilation_cleanup'].includes(e.kind))for(const pair of e.pairs)for(const id of pair.balls){if(!tracks.has(id))throw new Error('B2Z animation missing mutual participant');tracks.delete(id);}
      if(e.kind==='annihilation')for(const pair of e.pairs)for(const id of pair)tracks.delete(id);
      for(const id of e.destroyed_balls??[])tracks.delete(id);
      events.push(structuredClone(e));
    }
  }
  return {receipts:source.receipts,events,statistics:{source_events:source.events.length,render_events:events.length,omitted_motion_events:dropped}};
}
