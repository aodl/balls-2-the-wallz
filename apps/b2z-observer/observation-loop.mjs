/** UX-04/11. Rendering and navigation do not own network scheduling. */
export function observationLoop({work,refresh,now=()=>performance.now(),schedule=setTimeout,cancel=clearTimeout,hidden=()=>document.hidden,onReturn=()=>{},interval=250}){
 let timer=null,stopped=false,busy=false,generation=0,suspended=false,wasHidden=hidden(),hiddenAt=wasHidden?now():null;
 const unavailable=()=>suspended||hidden();
 const arm=()=>{if(!stopped)timer=schedule(tick,interval);};
 async function tick(){
  timer=null;if(stopped||busy)return;busy=true;const fence=generation;
  try{if(!unavailable())await Promise.allSettled([work(now()),refresh(now())]);}
  finally{busy=false;if(!stopped&&generation===fence)arm();else if(!stopped&&timer===null)arm();}
 }
 function visibility(){
  const h=unavailable();if(h===wasHidden)return;wasHidden=h;
  if(h){hiddenAt=now();return;}
  const gap=now()-(hiddenAt??now());hiddenAt=null;onReturn(gap);
  if(!busy){cancel(timer);timer=null;void tick();}
 }
 arm();return {visibility,suspend(){suspended=true;visibility();},resume(){suspended=false;visibility();},stop(){stopped=true;generation++;cancel(timer);timer=null;},get busy(){return busy;}};
}
