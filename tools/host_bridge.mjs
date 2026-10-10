#!/usr/bin/env node
import fs from 'node:fs';
import {TimelineCoordinator} from '../packages/runtime/coordinator.mjs';
import {decodeCanonical} from '../packages/runtime/canonical.mjs';
import {sha256} from '../packages/runtime/seal.mjs';
import {hex,unhex} from '../packages/protocol/bytes.mjs';
import {BtzKernel} from '../packages/kernels/btz/kernel.mjs';
const rows=JSON.parse(fs.readFileSync(new URL('../tests/fixtures/coordinator-v5.json',import.meta.url),'utf8')).rows;
const [name,indexText]=process.argv.slice(2),index=Number(indexText),row=rows.find(r=>r.name===name&&r.game==='btz');
if(!row||!Number.isSafeInteger(index)||index<0||index>=row.actions.length)throw new Error('bridge arguments');
const bytes=unhex(fs.readFileSync(0,'utf8').trim());
if(hex(bytes)!==row.actions[index].image_hex)throw new Error('foreign host image mismatch');
const host=TimelineCoordinator.restore(bytes,sha256(bytes),BtzKernel);
for(const a of row.actions.slice(index+1))host.apply(decodeCanonical(unhex(a.action_hex)));
if(hex(host.snapshot())!==row.actions.at(-1).image_hex)throw new Error('foreign host final mismatch');
console.log(`PASS: native host ${name}/${index} continued in JavaScript.`);
