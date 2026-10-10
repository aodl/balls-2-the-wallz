import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TimelineCoordinator} from '../../packages/runtime/coordinator.mjs';
import {decodeCanonical} from '../../packages/runtime/canonical.mjs';
import {sha256} from '../../packages/runtime/seal.mjs';
import {hex,unhex} from '../../packages/protocol/bytes.mjs';
import {coordinatorScenario} from '../scenarios/coordinator.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/coordinator-v5.json',import.meta.url),'utf8'));
for(const row of fixture.rows)for(let n=-1;n<row.actions.length;n++)
  test(`${row.name}: recover composite image after action ${n}`,()=>{
    const initial=unhex(n===-1?row.genesis_hex:row.actions[n].image_hex),kernel=coordinatorScenario(row.name).kernel;
    const host=TimelineCoordinator.restore(initial,sha256(initial),kernel);
    for(const step of row.actions.slice(n+1)){
      host.apply(decodeCanonical(unhex(step.action_hex)));
      assert.equal(hex(host.snapshot()),step.image_hex);
    }
    assert.equal(hex(host.snapshot()),row.actions.at(-1).image_hex);
  });
