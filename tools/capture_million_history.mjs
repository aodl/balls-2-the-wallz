/** Convert read-only browser wire captures to independent replay input.
 * This proves content consistency; IC authenticity is the browser/SDK gate. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {Cbor} from '@icp-sdk/core/agent';
import {IDL} from '@icp-sdk/core/candid';
import {decodeCanonical,encodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {hex} from '@dtr/timeline-runtime/protocol/bytes';
const dir=process.argv[2],index=JSON.parse(await readFile(`${dir}/wire-index.json`,'utf8'));
assert.deepEqual(index.errors,[]);
const catalogType=IDL.Vec(IDL.Nat8),observationType=IDL.Record({observation:IDL.Record({publication:catalogType})});
const get=(value,key)=>value instanceof Map?value.get(key):value?.[key];
const history=new Map();let successfulReplies=0;
for(const packet of index.packets){
 if(packet.status!==200)continue;
 const envelope=Cbor.decode(await readFile(`${dir}/wire-catalogs/${packet.file}`));
 if(get(envelope,'status')!=='replied')continue;
 const type=packet.method==='retained_publication'?catalogType:packet.method==='observation'?IDL.Record({publication:catalogType}):observationType;
 const result=IDL.decode([IDL.Variant({Ok:type,Err:IDL.Text})],Uint8Array.from(get(get(envelope,'reply'),'arg')))[0];
 if(!result.Ok)continue;
 const raw=packet.method==='retained_publication'?result.Ok:packet.method==='observation'?result.Ok.publication:result.Ok.observation.publication;
 const publication=decodeCanonical(raw);successfulReplies++;
 if(publication.head.seal===null)continue;
 assert.equal(publication.head.seal.input_count,0);
 const segment=Number(publication.head.segment_id),encoded=hex(encodeCanonical(publication));
 if(history.has(segment))assert.equal(history.get(segment).encoded,encoded);
 history.set(segment,{publication,encoded});
}
const ordered=[...history].sort((a,b)=>a[0]-b[0]);
assert.ok(ordered.length>=80,'sustained captured history required');
ordered.forEach(([segment],i)=>assert.equal(segment,i,'captured publication gap'));
const initial=new Uint8Array(await readFile(`${dir}/initial-world.bin`));
assert.equal(decodeCanonical(initial).version,5);
const trace={status:'PASS',initial_world_hex:hex(initial),inputs:[],assigned:[],publications:ordered.map(([,entry])=>entry.publication),qualification:'Browser wire content; certificate authenticity is qualified separately',successful_replies:successfulReplies};
await writeFile(`${dir}/history.json`,encodeCanonical(trace));
console.log(`Captured ${ordered.length} consecutive v5 publications for independent replay`);
