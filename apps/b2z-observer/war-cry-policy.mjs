import{DEFLECTOR_CONFIGURATION_HEX}from'./deflector-capability.generated.mjs';
/** Called only with the authenticated config; exact bytes prevent partial flag gates. */
import {encodeCanonical}from'@dtr/timeline-runtime/runtime/canonical';
import {WAR_CRY_CONFIGURATION_HEX,COMBINED_CONFIGURATION_HEX}from'./war-cry-capability.generated.mjs';
const cache=new WeakMap();
export function warCrySupported(config){
 if(!config||typeof config!=='object')return false;
 if(!cache.has(config)){const bytes=encodeCanonical(config),key=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');cache.set(config,key===WAR_CRY_CONFIGURATION_HEX||key===COMBINED_CONFIGURATION_HEX||key===DEFLECTOR_CONFIGURATION_HEX);}
 return cache.get(config);
}
