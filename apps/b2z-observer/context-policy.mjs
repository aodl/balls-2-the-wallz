import {encodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {CONTEXT_CONFIGURATION_HEX} from './context-capability.generated.mjs';

const capabilities = new WeakMap();
export function contextSupported(config){
  if(!config||typeof config!=='object')return false;
  if(!capabilities.has(config)){
    const hex=Array.from(encodeCanonical(config),byte=>byte.toString(16).padStart(2,'0')).join('');
    capabilities.set(config,hex===CONTEXT_CONFIGURATION_HEX);
  }
  return capabilities.get(config);
}
