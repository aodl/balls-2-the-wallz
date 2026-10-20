import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {rat,add,sub,mulInt,cmp,validRat} from '../../packages/kernels/b2z/math.mjs';
import {B2zCursor} from '../../packages/kernels/b2z/kernel.mjs';
import {encodeCanonical,decodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';import {unhex} from '@dtr/timeline-runtime/protocol/bytes';
const load=name=>JSON.parse(fs.readFileSync(new URL(`../fixtures/${name}`,import.meta.url),'utf8'));
for(const r of load('numeric-v4.json').cases)test(`independent exact accounting ${r.id}`,()=>{
 const p=v=>rat(BigInt(v[0]),BigInt(v[1])),a=p(r.a),b=p(r.b);
 assert.deepEqual(add(a,b),p(r.sum));assert.deepEqual(sub(a,b),p(r.difference));assert.deepEqual(mulInt(a,r.scale),p(r.scaled));assert.equal(cmp(a,b),r.comparison);
 assert.deepEqual(decodeCanonical(encodeCanonical(p(r.sum))),p(r.sum));validRat(p(r.sum));
});
const golden=load('b2z-v3-golden.json').cases;
for(const [index,r] of load('cursor-v4.json').rows.entries())test(`portable cursor ${index} ${r.name}/${r.phase}`,()=>{
 const bytes=unhex(r.snapshot_hex);assert.equal(sha256(bytes),r.sha256);
 let c=B2zCursor.restore(bytes,r.sha256);assert.deepEqual(c.snapshot(),bytes);
 let slices=0,work=0;while(c.phase!=='done'){
  work+=c.step([7,31,127][slices++%3]).used;assert(work<20000000);
  if(slices%101===0){const snap=c.snapshot();c=B2zCursor.restore(snap,sha256(snap));}
 }
 const out=c.result(),expected=golden.find(g=>g.name===r.name).outputs;
 for(const k of ['state','events','scores'])assert.equal(sha256(out[k]),expected[k].sha256);
});
