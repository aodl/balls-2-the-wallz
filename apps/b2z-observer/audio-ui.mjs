import {createAudioEngine,AUDIO_SETTINGS_KEY} from './audio-engine.mjs';
/** One public master-intent control; browser permission is a separate state. */
export function createAudioUI(doc){const button=doc.getElementById('audio-button');
 let approaching=null,leaving=null;
 let visible=false;
 const reduced=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 function interactive(active){button.inert=!active;button.tabIndex=active?0:-1;}
 function present(value,immediate=false){
  clearTimeout(approaching);
  visible=value;
  if(!value&&doc.activeElement===button)doc.getElementById('board').focus({preventScroll:true});
  button.dataset.available=String(value);
  interactive(value&&(immediate||reduced()));
  if(value&&button.inert)approaching=setTimeout(()=>{if(visible)interactive(true);},210);
 }
 // Explicit mute keeps its action even without playback. Short scheduler
 // interruptions may recover before the available control needs to leave.
 const audio=createAudioEngine({onStatus(s){
  const muted=!s.settings.enabled;
  button.dataset.muted=String(muted);
  button.setAttribute('aria-pressed',String(!muted));
  const label=muted?'Enable sound':'Mute sound';
  button.setAttribute('aria-label',label);button.title=label;
  if(muted||s.operational){
   clearTimeout(leaving);leaving=null;
   if(!visible)present(true,muted);
  }else if(visible&&leaving===null){
   leaving=setTimeout(()=>{leaving=null;present(false);},300);
  }
 }});
 button.onclick=e=>{if(e.isTrusted&&!button.inert){const enabled=!audio.settings().enabled;audio.set({enabled},{activate:enabled});}};
 const keyRepeat=e=>{if(e.repeat&&['Enter',' '].includes(e.key))e.preventDefault();};button.addEventListener('keydown',keyRepeat);
 const unlock=e=>{if(!e.isTrusted||e.repeat||e.target?.closest?.('#audio-button')||e.type==='pointerdown'&&(e.button!==0||e.isPrimary===false)||e.type==='keydown'&&['Shift','Alt','Control','Meta','Escape'].includes(e.key))return;audio.gesture();};
 doc.addEventListener('pointerdown',unlock,{capture:true,passive:true});doc.addEventListener('keydown',unlock,{capture:true});
 const online=()=>audio.reconcile();globalThis.addEventListener?.('online',online);
 const stored=e=>{if(e.key===AUDIO_SETTINGS_KEY)try{const v=JSON.parse(e.newValue);if(v?.version===2&&typeof v.enabled==='boolean')audio.set({enabled:v.enabled});}catch{}};globalThis.addEventListener?.('storage',stored);
 const dispose=audio.dispose;audio.dispose=()=>{clearTimeout(approaching);clearTimeout(leaving);button.removeEventListener('keydown',keyRepeat);doc.removeEventListener('pointerdown',unlock,true);doc.removeEventListener('keydown',unlock,true);globalThis.removeEventListener?.('online',online);globalThis.removeEventListener?.('storage',stored);dispose();};audio.status();return audio;
}
