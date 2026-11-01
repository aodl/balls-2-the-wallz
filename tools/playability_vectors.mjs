#!/usr/bin/env node
/** New v6 state vectors only. Existing fixtures and historical goldens are read-only. */
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {decodeWorld,encodeWorld} from '../packages/kernels/b2z/world.mjs';
import {stageMillionWorld} from '../packages/kernels/b2z/migration.mjs';
import {migratePlayability,markDormant,finalizeElapsed,clearUnsupportedPlayer,revive} from '../packages/kernels/b2z/playability.mjs';
const old=JSON.parse(await readFile('tests/fixtures/b2z-torus-v4.json','utf8'));
const base=decodeWorld(stageMillionWorld(Buffer.from(old.migration.new_hex,'hex'))),observed=9007199254740993n,completed=observed+17000000000n;
const digest=w=>createHash('sha256').update(encodeWorld(w)).digest('hex');
const next=migratePlayability(base,observed),migration=digest(next),ball=next.balls[0];
next.balls=[];next.pending=[];const fence=markDormant(next,1);clearUnsupportedPlayer(next,1);finalizeElapsed(next,completed,[fence]);
const dormant=digest(next);next.balls=[ball];revive(next,1);const revived=digest(next);
const result=JSON.stringify({qualification:'Pure state/time and ownership-metadata vector; no IC deployment or complete gameplay qualification',observed_ns:observed.toString(),completed_ns:completed.toString(),v5_sha256:digest(base),migration_sha256:migration,dormant_sha256:dormant,revived_sha256:revived},null,2)+'\n';
const path='tests/fixtures/playability-v6.json';
if(process.argv.includes('--check')){if(await readFile(path,'utf8')!==result)throw Error('v6 state vector mismatch');}else await writeFile(path,result);
console.log('PASS: explicit v6 player/lifecycle metadata vectors');
