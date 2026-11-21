import {encodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {CONTEXT_CONFIGURATION_HEX,SHOUT_CONFIGURATION_HEX,SPACING_CONFIGURATION_HEX} from './context-capability.generated.mjs';

const capabilities = new WeakMap();
const toHex=bytes=>Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');
function version(config){
  if(!config||typeof config!=='object')return 0;
  if(!capabilities.has(config)){
    const hex=toHex(encodeCanonical(config));
    capabilities.set(config,hex===SPACING_CONFIGURATION_HEX?15:hex===SHOUT_CONFIGURATION_HEX?14:hex===CONTEXT_CONFIGURATION_HEX?13:0);
  }
  return capabilities.get(config);
}
export const contextSupported=config=>version(config)>=13;
export const shoutSupported=config=>version(config)>=14;
export const spacingSupported=config=>version(config)===15;
