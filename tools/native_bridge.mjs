#!/usr/bin/env node
/** Resume externally produced canonical cursor bytes in the executed JS reference. */
import fs from 'node:fs';
import {B2zCursor} from '../packages/kernels/b2z/kernel.mjs';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
import {unhex} from '@dtr/timeline-runtime/protocol/bytes';
const name=process.argv[2], bytes=unhex(fs.readFileSync(0,'utf8').trim());
const rows=JSON.parse(fs.readFileSync(new URL('../tests/fixtures/b2z-v3-golden.json',import.meta.url),'utf8')).cases;
const row=rows.find(r=>r.name===name);if(!row)throw new Error('unknown scenario');
const c=B2zCursor.restore(bytes,sha256(bytes));let work=0;
while(c.phase!=='done'){work+=c.step(127).used;if(work>20000000)throw new Error('work limit');}
const out=c.result();for(const k of ['state','events','scores'])if(sha256(out[k])!==row.outputs[k].sha256)throw new Error(`foreign cursor ${k} mismatch`);
console.log(`PASS: foreign cursor ${name} resumed to expected state/event/score roots.`);
