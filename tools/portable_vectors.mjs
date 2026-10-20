#!/usr/bin/env node
/** Frozen source-implementation continuations: regression targets, not independent oracles. */
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {B2zCursor} from '../packages/kernels/b2z/kernel.mjs';
import {encodeWorld,B2Z_IDENTITY} from '../packages/kernels/b2z/world.mjs';
import {scenario} from '../tests/scenarios/b2z.mjs';
import {hex} from '@dtr/timeline-runtime/protocol/bytes';
import {sha256} from '@dtr/timeline-runtime/runtime/seal';
const rows=[];
for(const name of ['admission','near-impact','duel','severance','corner','wall-bounce','dense']){
  const s=scenario(name), c=new B2zCursor(encodeWorld(s.world),s.inputs??[],{...B2Z_IDENTITY,logical_start:0n,logical_end:s.ticks});
  const seen=new Set();let work=0;
  while(true){
    const phase=c.phase+(c.spawnJob?'/'+c.spawnJob.phase:c.job?'/'+c.job.phase:'');
    if(!seen.has(phase)){
      seen.add(phase);const bytes=c.snapshot();
      rows.push({name,phase,work,sha256:sha256(bytes),snapshot_hex:hex(bytes)});
    }
    if(c.phase==='done')break;
    c.step(1);if(++work>20000000)throw new Error('fixture work bound');
  }
}
const result={version:4,provenance:'JavaScript S03 cursor checkpoints; implementation-derived regression fixtures, not independent simulation proof.',rows};
const text=JSON.stringify(result,null,2)+'\n',path=fileURLToPath(new URL('../tests/fixtures/cursor-v4.json',import.meta.url));
if(process.argv[2]==='--write')fs.writeFileSync(path,text);
else if(process.argv[2]!=='--check'||fs.readFileSync(path,'utf8')!==text)throw new Error('portable cursor drift / usage: --write|--check');
console.log(`PASS: ${rows.length} portable phase/subphase cursor fixtures ${process.argv[2]}.`);
