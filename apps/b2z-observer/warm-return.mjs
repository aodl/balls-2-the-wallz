/** UX-04/05. A skip is only through retained verified coverage, never simulation. */
export function recentPresentationPoint({playhead}){return playhead;}
/** Compact only AFTER authenticated admission. Keep the latest complete useful
 * interval and trailing checkpoints, never a two-second tail. Queue/clock and
 * authoritative records retain identity; removed visual history is not replayed. */
export function retainLatestVerifiedInterval(session,limits){
 const q=session.queue;if(!q.length)return false;let first=-1;
 for(let i=q.length-1;i>=0;i--)if(q[i].segment.end>q[i].segment.start&&q[i].segment.end>session.clock.playhead){first=i;break;}
 if(first<0)first=q.length-1;
 let bytes=q.slice(first).reduce((n,x)=>n+x.segment.bytes,0);
 while(first<q.length-1&&(q.length-first>limits.segments||bytes>limits.bytes)){bytes-=q[first++].segment.bytes;}
 if(bytes>limits.bytes)throw Error('retained verified interval byte capacity');
 const at=Math.max(session.clock.playhead,q[first].segment.start),skipped=first>0||at>session.clock.playhead;
 if(first)q.splice(0,first);session.bytes=bytes;
 if(skipped){session.clock.playhead=at;session.presentationSkip=true;}
 return skipped;
}
/** A received response does not make an old certificate fresh. Use both clocks. */
export function freshObservation(s,now,wallNow=Date.now()){
 if(!Number.isFinite(s?.certifiedAt)||now<s.certifiedAt)return false;
 const monotonicAge=now-s.certifiedAt+Math.max(0,s.certificateAgeMs??0);
 const ns=s.certificateTimeNs,wallAge=typeof ns==='string'&&/^\d{1,20}$/.test(ns)?Math.max(0,wallNow-Number(BigInt(ns)/1000000n)):monotonicAge;
 return Math.max(monotonicAge,wallAge)<30000;
}
export function operationalReplyCurrent(s,generation,started,now){return(s.lifecycleGeneration??0)===generation&&now>=started&&now-started<15000;}
/** Only after authenticating the next segment against the resynchronised head. */
export function bridgeVerifiedPresentation(s,start){
 if(s.presentationFence===undefined)return;
 if(start!==s.presentationFence||!Number.isFinite(start)||start<s.clock.available||start<s.clock.playhead)throw Error('presentation source fence mismatch');
 s.queue.splice(0);s.bytes=0;s.clock.playhead=s.clock.available=start;s.presentationSkip=true;delete s.presentationFence;
}
export function resumeVerifiedClock(s){
 const point=s.clock.playhead,usable=s.clock.available>point&&s.queue.some(q=>q.segment.start<=point&&q.segment.end>point);
 if(usable){s.clock.started=true;s.clock.phase='PLAYING';}return usable;
}
/** Even a freshly authenticated resync must not reverse ordinary live presentation. */
export function assertForwardPresentation(clock,time){if(!Number.isFinite(time)||time<clock.playhead)throw Error('live presentation rollback');}
/** Warm retention must not bypass a cold foreground startup's jitter buffer. */
export function canRetainAcrossResync(s,hidden=false){return Boolean((s.clock.started||hidden||s.warmRecovery)&&s.queue.some(q=>q.segment.end>q.segment.start&&q.segment.end>s.clock.playhead));}
