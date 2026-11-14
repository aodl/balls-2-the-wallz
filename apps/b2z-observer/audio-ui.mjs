import {createAudioEngine,AUDIO_SETTINGS_KEY} from './audio-engine.mjs';
/** One public master-intent control; browser permission is a separate state. */
export function createAudioUI(doc){const button=doc.getElementById('audio-button');
 const audio=createAudioEngine({onStatus(s){const muted=!s.settings.enabled,pending=!muted&&!s.usable;button.dataset.muted=String(muted);button.dataset.pending=String(pending);button.setAttribute('aria-pressed',String(!muted));const label=muted?'Enable sound':pending?'Enable sound — waiting for browser permission or automatic recovery':'Mute sound';button.setAttribute('aria-label',label);button.title=label;button.setAttribute('aria-description',muted?'Music and effects muted.':s.problem||(!s.owner?'Sound enabled; another game tab may own output.':pending?'Sound enabled; the next game interaction can activate it.':'Music and effects enabled.'));}});
 button.onclick=e=>{if(e.isTrusted)audio.toggle();};
 const keyRepeat=e=>{if(e.repeat&&['Enter',' '].includes(e.key))e.preventDefault();};button.addEventListener('keydown',keyRepeat);
 const unlock=e=>{if(!e.isTrusted||e.repeat||e.target?.closest?.('#audio-button')||e.type==='pointerdown'&&(e.button!==0||e.isPrimary===false)||e.type==='keydown'&&['Shift','Alt','Control','Meta','Escape'].includes(e.key))return;audio.gesture();};
 doc.addEventListener('pointerdown',unlock,{capture:true,passive:true});doc.addEventListener('keydown',unlock,{capture:true});
 const online=()=>audio.reconcile();globalThis.addEventListener?.('online',online);
 const stored=e=>{if(e.key===AUDIO_SETTINGS_KEY)try{const v=JSON.parse(e.newValue);if(v?.version===2&&typeof v.enabled==='boolean')audio.set({enabled:v.enabled});}catch{}};globalThis.addEventListener?.('storage',stored);
 const dispose=audio.dispose;audio.dispose=()=>{button.removeEventListener('keydown',keyRepeat);doc.removeEventListener('pointerdown',unlock,true);doc.removeEventListener('keydown',unlock,true);globalThis.removeEventListener?.('online',online);globalThis.removeEventListener?.('storage',stored);dispose();};audio.status();return audio;
}
