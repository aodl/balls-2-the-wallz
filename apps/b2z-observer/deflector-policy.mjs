import {contextSupported} from './context-policy.mjs';
import{ORIENTATIONS,DEFLECTOR_HEADINGS}from'../../packages/protocol/deflector-orientation.generated.mjs';
/** Caller supplies certified configuration; exact bytes gate the new capability. */
import{encodeCanonical}from'@dtr/timeline-runtime/runtime/canonical';
import{DEFLECTOR_CONFIGURATION_HEX}from'./deflector-capability.generated.mjs';
const cache=new WeakMap();
export function deflectorSupported(config){
 if(!config||typeof config!=='object')return false;
 if(contextSupported(config))return true;
 if(!cache.has(config))cache.set(config,Array.from(encodeCanonical(config),b=>b.toString(16).padStart(2,'0')).join('')===DEFLECTOR_CONFIGURATION_HEX);
 return cache.get(config);
}
export function orientationFromDegrees(angle){const n=Number(angle);if(!Number.isFinite(n))throw Error('heading bounds');const target=Math.floor(((n%360+360)%360)/90)*16384+8192;return ORIENTATIONS.find(d=>DEFLECTOR_HEADINGS[d]===target);}
export const deflectorDegrees=orientation=>{if(!ORIENTATIONS.includes(orientation))throw Error('deflector orientation');return String(DEFLECTOR_HEADINGS[orientation]*360/65536);};
export const snappedDeflectorDegrees=angle=>deflectorDegrees(orientationFromDegrees(angle));
