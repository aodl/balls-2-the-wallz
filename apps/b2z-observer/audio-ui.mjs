import {createAudioEngine} from './audio-engine.mjs';
export function createAudioUI(doc){const $=id=>doc.getElementById(id),button=$('audio-button'),panel=$('audio-popover');
 const audio=createAudioEngine({onStatus(s){button.setAttribute('aria-pressed',String(s.unlocked&&!s.settings.mute&&(s.settings.music||s.settings.effects)));for(const key of ['music','effects','mute','adaptive'])$('audio-'+key).checked=s.settings[key];for(const key of ['musicVolume','effectsVolume'])$('audio-'+key).value=String(s.settings[key]);$('audio-status').textContent=s.problem||(s.settings.mute?'Sound muted.':!s.settings.music&&!s.settings.effects?'Sound is off.':s.loading?'Loading sound ...':!s.unlocked&&(s.settings.music||s.settings.effects)?'Tap Resume sound.':s.unlocked?'Sound ready':'Sound is off.');}});
 button.onclick=()=>{panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));doc.dispatchEvent(new Event('b2z-audio-layout'));};
 panel.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){panel.hidden=true;button.focus();button.setAttribute('aria-expanded','false');doc.dispatchEvent(new Event('b2z-audio-layout'));}});
 for(const key of ['music','effects','mute','adaptive'])$('audio-'+key).onchange=e=>audio.set({[key]:e.target.checked},{activate:true});
 for(const key of ['musicVolume','effectsVolume'])$('audio-'+key).oninput=e=>audio.set({[key]:Number(e.target.value)});
 $('audio-resume').onclick=()=>audio.retry();$('audio-clear').onclick=()=>{void audio.clearCache().then(()=>{$('audio-status').textContent='Downloaded audio cleared.';});};audio.status();return audio;
}
