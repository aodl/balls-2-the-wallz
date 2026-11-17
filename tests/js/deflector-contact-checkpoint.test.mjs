import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
import{contact}from'../../tools/deflector_contact_checkpoint.mjs';
const vectors=JSON.parse(readFileSync(new URL('../fixtures/deflector-contact-candidate.json',import.meta.url))).vectors;
test('incoming chord geometry agrees with independent exact Fraction oracle; no integer snap',()=>{
 for(const row of vectors){const got=contact(row);for(const k of ['geometric_exit_time','contact_time','contact_position','outgoing_global_intercept'])assert.deepEqual(got[k],row[k],row.id+':'+k);}
 const r=contact(vectors.find(x=>x.id==='integer-intercept-counterexample'));assert.equal(r.outgoing_global_intercept[0],'-1/6');
});
test('tangency, corner-only touch and stationary paths are not positive interior residence',()=>{
 for(const [p,v]of [[['0','0'],['1','0']],[['1','1'],['1','-1']],[['0','1/2'],['0','0']]])assert.equal(contact({id:'touch',entry_time:'0',entry_position:p,incoming_velocity:v,outgoing_velocity:['1','0']}),null);
});
