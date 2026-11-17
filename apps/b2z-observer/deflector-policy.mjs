/** Caller supplies certified configuration; exact bytes gate the new capability. */
import{encodeCanonical}from'@dtr/timeline-runtime/runtime/canonical';
import{DEFLECTOR_CONFIGURATION_HEX}from'./deflector-capability.generated.mjs';
const cache=new WeakMap();
export function deflectorSupported(config){
 if(!config||typeof config!=='object')return false;
 if(!cache.has(config))cache.set(config,Array.from(encodeCanonical(config),b=>b.toString(16).padStart(2,'0')).join('')===DEFLECTOR_CONFIGURATION_HEX);
 return cache.get(config);
}
export function orientationFromDegrees(angle){const n=Number(angle);if(!Number.isFinite(n))throw Error('heading bounds');return['SE','SW','NW','NE'][Math.floor(((n%360+360)%360)/90)];}
export const snappedDeflectorDegrees=angle=>String([45,135,225,315][['SE','SW','NW','NE'].indexOf(orientationFromDegrees(angle))]);
