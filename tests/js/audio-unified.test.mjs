import test from 'node:test';import assert from 'node:assert/strict';
import {audioSettings} from '../../apps/b2z-observer/audio-engine.mjs';
import {zoomGain} from '../../apps/b2z-observer/audio-policy.mjs';
test('new visitor has enabled unified intent; explicit new mute survives normalization',()=>{assert.equal(audioSettings().enabled,true);assert.equal(audioSettings({version:2,enabled:false}).enabled,false);});
test('legacy default disabled lanes are not evidence of master mute',()=>{assert.equal(audioSettings({music:false,effects:false,mute:false}).enabled,true);assert.equal(audioSettings({music:true,mute:true}).enabled,false);assert.equal(audioSettings({musicVolume:.1,effects:true}).enabled,true);});
test('medium zoom remains audible while overview is silent and close reaches designed gain',()=>{assert(zoomGain(24)>=.6&&zoomGain(24)<=.8);assert.equal(zoomGain(2),0);assert.equal(zoomGain(60),1);});
import {readAudioSettings,AUDIO_SETTINGS_KEY,LEGACY_AUDIO_SETTINGS_KEY} from '../../apps/b2z-observer/audio-engine.mjs';
test('migration is idempotent and failed persistence cannot erase a known explicit mute',()=>{
 const map=new Map([[LEGACY_AUDIO_SETTINGS_KEY,JSON.stringify({mute:true,music:true})]]),store={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};assert.equal(readAudioSettings(store).enabled,false);map.set(LEGACY_AUDIO_SETTINGS_KEY,'{}');assert.equal(readAudioSettings(store).enabled,false);assert(map.has(AUDIO_SETTINGS_KEY));
 assert.equal(readAudioSettings({getItem:k=>k===LEGACY_AUDIO_SETTINGS_KEY?'{"mute":true}':null,setItem(){throw Error('denied')}}).enabled,false);
 assert.equal(readAudioSettings({getItem(){throw Error('denied')}}).enabled,true);
});
