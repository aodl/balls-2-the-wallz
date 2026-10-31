/** Disposable UI data only. No IC calls or authenticated-fixture claim. */
import fs from 'node:fs';
import {B2zCursor} from '../../packages/kernels/b2z/kernel.mjs';
import {decodeCanonical,encodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {hex,unhex} from '@dtr/timeline-runtime/protocol/bytes';
import {decodeWorld} from '../../packages/kernels/b2z/world.mjs';
import {expireV6} from '../../packages/kernels/b2z/lifecycle-v6.mjs';
import {dueFences} from '../../packages/kernels/b2z/playability.mjs';
import {V6_POLICY} from '../../packages/kernels/b2z/playability.generated.mjs';
import {PRICING} from '../../packages/kernels/b2z/economics.generated.mjs';
const f=JSON.parse(fs.readFileSync(new URL('../../tests/fixtures/rules-v6.json',import.meta.url))),cases={};
for(const[name,row]of Object.entries(f.cases)){
 const cursor=new B2zCursor(unhex(row.state_hex),decodeCanonical(unhex(row.inputs_hex)),decodeCanonical(unhex(row.seal_hex)));let work=0;while(!cursor.step(512).complete)if(++work>10000)throw Error('fixture work bound');cursor.finalizeElapsed(BigInt(row.observed_ns));const out=cursor.result(),w=decodeWorld(out.state);
 cases[name]={initial:row.state_hex,final:hex(out.state)};
 const deadline=w.playability.lifecycle.reduce((last,l)=>l.deadline_ns!==undefined&&l.deadline_ns>last?l.deadline_ns:last,0n);
 if(deadline){const expiry=expireV6(w,deadline,dueFences(w,deadline));if(expiry)cases[name].expired=hex(expiry.output.state);}
}
fs.writeFileSync(process.argv[2],JSON.stringify({qualification:'Synthetic widget/presentation data; not IC authentication or installed upgrade evidence',config:hex(encodeCanonical({...V6_POLICY,...PRICING})),cases}));
