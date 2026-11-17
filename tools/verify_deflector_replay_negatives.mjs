/** Independent replay negatives over complete previously authenticated wire history.
 * This script checks replay consistency; IC authenticity is supplied separately by
 * the retained strict pinned-certificate capture, never by this file alone. */
import fs from'node:fs';import assert from'node:assert/strict';import{decodeCanonical,encodeCanonical}from'@dtr/timeline-runtime/runtime/canonical';import{replayHistory}from'./lib/replay_s14_history.mjs';
const[input,output]=process.argv.slice(2),revive=(_,v)=>v?.$integer!==undefined?BigInt(v.$integer):v,trace=JSON.parse(fs.readFileSync(input,'utf8'),revive),positive=replayHistory(trace),checks=[];
function negative(name,change){const bad=structuredClone(trace);change(bad);assert.throws(()=>replayHistory(bad),undefined,name);checks.push(name);}
function alterEvent(t,predicate,change){const row=t.artifact_events.find(r=>decodeCanonical(Buffer.from(r.events_hex,'hex')).events.some(predicate));assert(row,'real target event is required');const a=decodeCanonical(Buffer.from(row.events_hex,'hex'));change(a.events.find(predicate),a);row.events_hex=Buffer.from(encodeCanonical(a)).toString('hex');}
negative('forged structure removal',t=>alterEvent(t,e=>e.removed_deflectors?.length,e=>e.removed_deflectors[0].id=4294967294));
negative('omitted committed structure removal',t=>alterEvent(t,e=>e.removed_deflectors?.length,e=>e.removed_deflectors=[]));
negative('changed purchased orientation',t=>alterEvent(t,e=>e.kind==='deflector_built',e=>e.structure.orientation=e.structure.orientation==='NE'?'SW':'NE'));
negative('missing authenticated event artifact',t=>t.artifact_events.pop());
negative('reordered source positions',t=>{assert(t.inputs.length>=2);[t.inputs[0].position,t.inputs[1].position]=[t.inputs[1].position,t.inputs[0].position];});
negative('duplicate normalized payment position',t=>{t.inputs.push(structuredClone(t.inputs[0]));});
fs.writeFileSync(output,JSON.stringify({status:'PASS',scope:'Independent exact replay of captured disposable normal-module history plus adversarial changes; certificate evidence remains separately pinned',authenticated_history:input,positive,negatives:checks},null,2)+'\n');console.log('PASS',checks.length,'Deflector replay negatives');
