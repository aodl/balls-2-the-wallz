/** UX-04/11. Rendering/navigation do not own scheduling. Each worker is single-flight. */
export function observationLoop({work,refresh,now=()=>performance.now(),schedule=setTimeout,cancel=clearTimeout,hidden=()=>document.hidden,onReturn=()=>{},interval=250}){
 let timer=null,stopped=false,generation=0,suspended=false,wasHidden=hidden(),hiddenAt=wasHidden?now():null;
 const busy={work:false,refresh:false},unavailable=()=>suspended||hidden();
 function launch(name,fn){
  if(busy[name])return;busy[name]=true;const fence=generation;
  // Both callers own errors/backoff and session-generation checks. Neither a
  // health timeout nor a slow certificate request may spawn another same worker.
  Promise.resolve().then(()=>fn(now())).catch(()=>{}).finally(()=>{if(fence===generation)busy[name]=false;});
 }
 function tick(){
  timer=null;if(stopped)return;
  if(!unavailable()){launch('work',work);launch('refresh',refresh);}
  timer=schedule(tick,interval);
 }
 function visibility(){
  const h=unavailable();if(h===wasHidden)return;wasHidden=h;
  if(h){hiddenAt=now();return;}
  const gap=now()-(hiddenAt??now());hiddenAt=null;onReturn(gap);
  if(!stopped){cancel(timer);timer=null;tick();}
 }
 timer=schedule(tick,interval);
 return {visibility,suspend(){suspended=true;visibility();},resume(){suspended=false;visibility();},stop(){stopped=true;generation++;cancel(timer);timer=null;},get busy(){return busy.work||busy.refresh;}};
}
