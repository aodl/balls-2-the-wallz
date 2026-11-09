/** UX-04/11: one verifier pipeline, due-time hidden work, no frame-owned polling. */
export function observationLoop({work,refresh,now=()=>performance.now(),schedule=setTimeout,cancel=clearTimeout,hidden=()=>document.hidden,onReturn=()=>{},interval=250,hiddenInterval=15000,hiddenRefresh=60000}){
 let timer=null,stopped=false,suspended=false,wasHidden=hidden(),hiddenAt=wasHidden?now():null;
 const busy={work:false,refresh:false},due={work:now()+interval,refresh:now()+interval};
 function launch(name,fn){if(busy[name]||stopped||suspended)return;busy[name]=true;
  // The underlying bounded observer owns abort/deadline and verification fences.
  Promise.resolve().then(()=>{if(!stopped&&!suspended)return fn(now());}).catch(()=>{}).finally(()=>{busy[name]=false;});
 }
 function arm(){cancel(timer);timer=null;if(stopped||suspended)return;timer=schedule(tick,Math.max(1,Math.min(due.work,due.refresh)-now()));}
 function tick(){timer=null;if(stopped||suspended)return;const t=now(),h=hidden();
  for(const [name,fn]of [['work',work],['refresh',refresh]])if(t>=due[name]){due[name]=t+(h?(name==='work'?hiddenInterval:hiddenRefresh):interval);launch(name,fn);}arm();
 }
 function visibility(){if(stopped)return;const h=hidden()||suspended,changed=h!==wasHidden;if(changed){wasHidden=h;if(h)hiddenAt=now();else{const gap=now()-(hiddenAt??now());hiddenAt=null;onReturn(gap);due.work=due.refresh=now();}}
  if(h&&changed){due.work=now()+hiddenInterval;due.refresh=now()+hiddenRefresh;}arm();
 }
 arm();return{visibility,suspend(){suspended=true;visibility();},resume(){suspended=false;visibility();},stop(){stopped=true;cancel(timer);timer=null;},get busy(){return busy.work||busy.refresh;}};
}
