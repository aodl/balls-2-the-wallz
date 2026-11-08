/** Explicit local/replay diagnostics only; no canister update methods. Not an ordinary game UI. */
export function replayTools({session,visible,selection,pause,delivery,start,local,live,catalog}){
 return Object.freeze({
  state:()=>({mode:session()?.mode??'offline',ready:session()?.ready??false,error:session()?.error?.message??null,clock:session()?.clock.state(),recording:session()?.recording,world:visible()}),
  selection,pause,delivery,restart(){const s=session();if(s)return(s.mode==='live'?live:s.mode==='local'?local:start)(s.recording);},
  recording(id){const r=catalog()?.recordings.find(r=>r.id===id);if(!r)throw Error('Unknown recording');return start(r);}
 });
}
